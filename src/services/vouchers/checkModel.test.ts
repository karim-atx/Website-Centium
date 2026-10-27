import { test } from "node:test";
import assert from "node:assert/strict";
import { checkView, codeChars, codeComplete, dateTimeLabel, formatCode, markRefusal, mergeMark, notACode, parseCheck, scanInput } from "./checkModel.ts";

test("codes: upper case, dashes put in, 12 characters, Crockford's O / I / L", () => {
  assert.equal(formatCode("hwaepd5g74km"), "HWAE-PD5G-74KM");
  assert.equal(formatCode("hwae-pd"), "HWAE-PD");
  assert.equal(formatCode("HWAE"), "HWAE");
  assert.equal(formatCode("hw ae_pd5g 74km extra"), "HWAE-PD5G-74KM");
  assert.equal(codeChars("HWAE-PD5G-74KM"), "HWAEPD5G74KM");
  // The alphabet has no I, L, O or U: O reads 0, I and L read 1.
  assert.equal(formatCode("o1il-0000-0000"), "0111-0000-0000");
  assert.equal(codeComplete("HWAE-PD5G-74K"), false);
  assert.equal(codeComplete("hwaepd5g74km"), true);
});

test("scan input: a code is p_code; anything else isn't a voucher (no call)", () => {
  assert.deepEqual(scanInput("hwaepd5g74km"), { p_code: "HWAE-PD5G-74KM" });
  assert.deepEqual(scanInput(" HWAE-PD5G-74KM "), { p_code: "HWAE-PD5G-74KM" });
  assert.equal(scanInput("https://centium.atraxia.org/x"), null);
  assert.equal(scanInput("  "), null);
  assert.equal(notACode().state, "not_found");
});

// check_voucher's row (DB2): voucher_id, state, offer_title, points_paid, issued_at, expires_at, used_at, used_by_name.
const base = { voucher_id: "v1", offer_title: "15% off full-price items", points_paid: 900, issued_at: "2026-10-01T10:00:00Z" };

test("parse: the six states; used / unknown states are not check states", () => {
  const ok = parseCheck([{ ...base, state: "valid", expires_at: "2027-01-15T21:59:00Z", used_at: null, used_by_name: null }], "HWAE-PD5G-74KM");
  assert.equal(ok?.expiresAt, "2027-01-15T21:59:00Z");
  assert.equal(ok?.code, "HWAE-PD5G-74KM");
  for (const s of ["already_used", "expired", "void"]) assert.equal(parseCheck({ ...base, state: s })?.state, s);
  const nf = parseCheck([{ voucher_id: null, state: "not_found", offer_title: null }], "ZZZZ-ZZZZ-ZZZZ");
  assert.deepEqual([nf?.state, nf?.voucherId, nf?.offerHeadline], ["not_found", null, ""]);
  assert.equal(parseCheck([{ state: "not_valid_here" }])?.state, "not_valid_here");
  assert.equal(parseCheck([{ state: "used" }]), null);
  assert.equal(parseCheck([{ state: "weird" }]), null);
  assert.equal(parseCheck(null), null);
});

test("views: Valid / Already used / Expired / Not valid (business copy)", () => {
  const valid = parseCheck([{ ...base, state: "valid", expires_at: new Date(2027, 0, 15, 23).toISOString() }])!;
  assert.deepEqual(checkView(valid, "business"), {
    tone: "good",
    icon: "check",
    title: "Valid voucher",
    body: "Check the member's name, then mark the voucher as used.",
    rows: [
      { k: "Offer", v: "15% off full-price items" },
      { k: "Valid until", v: "Jan 15, 2027" },
    ],
    cta: "Mark as used",
  });
  const used = parseCheck([{ ...base, state: "already_used", used_at: new Date(2026, 9, 12, 16, 18).toISOString(), used_by_name: "Karim" }])!;
  const u = checkView(used, "business");
  assert.equal(u.body, "This voucher was marked as used on Oct 12, 2026 at 4:18 PM.");
  assert.deepEqual(u.rows, [
    { k: "Offer", v: "15% off full-price items" },
    { k: "Used by staff", v: "Karim" },
  ]);
  assert.equal(u.tone, "caution");
  const exp = checkView(parseCheck([{ ...base, offer_title: "25% off summer range", state: "expired", expires_at: new Date(2026, 8, 30, 23, 59).toISOString() }])!, "business");
  assert.equal(exp.body, "This voucher expired on Sep 30, 2026 and can't be used.");
  assert.deepEqual(exp.rows[1], { k: "Expired", v: "Sep 30, 2026" });
  const bad = checkView(parseCheck([{ state: "not_valid_here" }], "PEAK-3M8C-7VA1")!, "business");
  assert.equal(bad.title, "Not valid at this business");
  assert.deepEqual(bad.rows, [{ k: "Code", v: "PEAK-3M8C-7VA1" }]);
  assert.equal(bad.cta, "Scan another");
});

test("views: not found and void (ours)", () => {
  const nf = checkView(parseCheck([{ state: "not_found" }], "ZZZZ-ZZZZ-ZZZZ")!, "business");
  assert.deepEqual([nf.title, nf.body, nf.tone, nf.cta], ["Code not found", "No voucher has this code. Check it and try again.", "high", "Scan another"]);
  assert.deepEqual(nf.rows, [{ k: "Code", v: "ZZZZ-ZZZZ-ZZZZ" }]);
  const vd = checkView(parseCheck([{ ...base, state: "void" }], "V0ID-0000-0002")!, "professional");
  assert.deepEqual([vd.title, vd.body], ["Voucher cancelled", "Centium cancelled this voucher, so it can't be used."]);
});

test("views: professional copy (client, no staff row, Not valid with you)", () => {
  const valid = checkView(parseCheck([{ ...base, state: "valid" }])!, "professional");
  assert.equal(valid.body, "Check the client's name, then mark the voucher as used.");
  const used = checkView(parseCheck([{ ...base, state: "already_used", used_at: "2026-10-12T15:10:00Z", used_by_name: "Rana" }])!, "professional");
  assert.deepEqual(used.rows.map((r) => r.k), ["Offer"]);
  const bad = checkView(parseCheck([{ state: "not_valid_here" }], "HWAE-PD5G-74KM")!, "professional");
  assert.equal(bad.title, "Not valid with you");
  assert.equal(bad.body, "This voucher was issued for another professional's or business's offer.");
});

test("mark: the first answer is used, a repeat already_used (idempotent); refusals by SQLSTATE", () => {
  const prev = parseCheck([{ ...base, state: "valid" }], "HWAE-PD5G-74KM")!;
  const at = new Date(2026, 9, 22, 9, 5).toISOString();
  // mark_voucher_used's row: voucher_id, state, already_used, used_at, used_by_name.
  const first = mergeMark(prev, [{ voucher_id: "v1", state: "used", already_used: false, used_at: at, used_by_name: "Friend" }])!;
  assert.equal(first.state, "used");
  assert.equal(first.usedBy, "Friend");
  assert.equal(checkView(first, "business").body, "Marked as used on Oct 22, 2026 at 9:05 AM.");
  assert.equal(checkView(first, "business").cta, "Scan another");
  const again = mergeMark(prev, [{ voucher_id: "v1", state: "already_used", already_used: true, used_at: at, used_by_name: "Friend" }])!;
  assert.equal(again.state, "already_used");
  assert.equal(checkView(again, "business").title, "Already used");
  assert.equal(mergeMark(prev, null), null);
  assert.equal(mergeMark(prev, [{ state: "valid" }]), null);
  assert.equal(markRefusal(prev, { code: "ATX08" })?.state, "not_found");
  assert.equal(markRefusal(prev, { code: "ATX15" })?.state, "not_valid_here");
  assert.equal(markRefusal(prev, { code: "ATX16" })?.state, "void");
  assert.equal(markRefusal(prev, { code: "ATX17" })?.state, "expired");
  assert.equal(markRefusal(prev, { code: "42501" }), null);
  assert.equal(dateTimeLabel("nope"), "");
});

test("DH: the holder's first name is the Member / Client row, between Offer and Valid until", () => {
  const withName = parseCheck([{ ...base, state: "valid", expires_at: new Date(2027, 0, 15, 23).toISOString(), member_first_name: "Maya" }])!;
  assert.deepEqual(checkView(withName, "business").rows.map((r) => r.k), ["Offer", "Member", "Valid until"]);
  assert.equal(checkView(withName, "business").rows[1].v, "Maya");
  assert.equal(checkView(withName, "professional").rows[1].k, "Client");
  // Before the stage lands: no column, no row, no note.
  const before = checkView(parseCheck([{ ...base, state: "valid" }])!, "business");
  assert.equal(before.rows.some((r) => r.k === "Member"), false);
  assert.equal(before.note, undefined);
});

test("DH: an 18+ offer whose holder isn't a confirmed adult carries the check-ID note; Mark as used stays", () => {
  const minor = checkView(parseCheck([{ ...base, state: "valid", member_first_name: "Maya", member_confirmed_adult: false }])!, "business");
  assert.equal(minor.note, "18+ offer. Maya's age isn't confirmed on Centium. Check ID before marking it as used.");
  assert.equal(minor.cta, "Mark as used");
  const adult = checkView(parseCheck([{ ...base, state: "valid", member_first_name: "Maya", member_confirmed_adult: true }])!, "business");
  assert.equal(adult.note, undefined);
  const notRestricted = checkView(parseCheck([{ ...base, state: "valid", member_confirmed_adult: null }])!, "professional");
  assert.equal(notRestricted.note, undefined);
  const noName = checkView(parseCheck([{ ...base, state: "valid", member_confirmed_adult: false }])!, "professional");
  assert.equal(noName.note, "18+ offer. The client's age isn't confirmed on Centium. Check ID before marking it as used.");
});
