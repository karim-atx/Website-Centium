import { test } from "node:test";
import assert from "node:assert/strict";
import { checkView, codeChars, codeComplete, dateTimeLabel, formatCode, mergeMark, parseCheck, scanInput } from "./checkModel.ts";

test("codes: upper case, dashes put in, 12 characters", () => {
  assert.equal(formatCode("outl7k4p2qx9"), "OUTL-7K4P-2QX9");
  assert.equal(formatCode("outl-7k"), "OUTL-7K");
  assert.equal(formatCode("OUTL"), "OUTL");
  assert.equal(formatCode("ou tl_7k4p 2qx9 extra"), "OUTL-7K4P-2QX9");
  assert.equal(codeChars("OUTL-7K4P-2QX9"), "OUTL7K4P2QX9");
  assert.equal(codeComplete("OUTL-7K4P-2QX"), false);
  assert.equal(codeComplete("outl7k4p2qx9"), true);
});

test("scan input: a printed code is p_code, a token is p_qr_payload", () => {
  assert.deepEqual(scanInput("outl7k4p2qx9"), { p_code: "OUTL-7K4P-2QX9" });
  assert.deepEqual(scanInput(" OUTL-7K4P-2QX9 "), { p_code: "OUTL-7K4P-2QX9" });
  assert.deepEqual(scanInput("CENTIUM:v1.abc.def"), { p_qr_payload: "CENTIUM:v1.abc.def" });
  assert.equal(scanInput("  "), null);
});

const base = { voucher_id: "v1", code: "OUTL-7K4P-2QX9", offer_headline: "15% off full-price items", member_first_name: "Maya" };

test("parse: the four states; unknown states are dropped", () => {
  assert.equal(parseCheck([{ ...base, state: "valid", expires_at: "2027-01-15T21:59:00Z" }])?.validUntil, "2027-01-15T21:59:00Z");
  assert.equal(parseCheck({ ...base, state: "already_used" })?.state, "already_used");
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
      { k: "Member", v: "Maya" },
      { k: "Valid until", v: "Jan 15, 2027" },
    ],
    cta: "Mark as used",
  });
  const used = parseCheck([{ ...base, state: "already_used", used_at: new Date(2026, 9, 12, 16, 18).toISOString(), used_by_first_name: "Karim" }])!;
  const u = checkView(used, "business");
  assert.equal(u.body, "This voucher was marked as used on Oct 12, 2026 at 4:18 PM.");
  assert.deepEqual(u.rows, [
    { k: "Offer", v: "15% off full-price items" },
    { k: "Used by staff", v: "Karim" },
  ]);
  assert.equal(u.tone, "caution");
  const exp = checkView(parseCheck([{ ...base, offer_headline: "25% off summer range", state: "expired", expired_at: new Date(2026, 8, 30, 23, 59).toISOString() }])!, "business");
  assert.equal(exp.body, "This voucher expired on Sep 30, 2026 and can't be used.");
  assert.deepEqual(exp.rows[1], { k: "Expired", v: "Sep 30, 2026" });
  const bad = checkView(parseCheck([{ code: "PEAK-3M8C-7VA1", state: "not_valid_here" }])!, "business");
  assert.equal(bad.title, "Not valid at this business");
  assert.deepEqual(bad.rows, [{ k: "Code", v: "PEAK-3M8C-7VA1" }]);
  assert.equal(bad.cta, "Scan another");
});

test("views: professional copy (client, no staff row, Not valid with you)", () => {
  const valid = checkView(parseCheck([{ ...base, state: "valid" }])!, "professional");
  assert.equal(valid.body, "Check the client's name, then mark the voucher as used.");
  assert.equal(valid.rows[1].k, "Client");
  const used = checkView(parseCheck([{ ...base, state: "already_used", used_at: "2026-10-12T15:10:00Z", used_by_first_name: "Rana" }])!, "professional");
  assert.deepEqual(used.rows.map((r) => r.k), ["Offer"]);
  const bad = checkView(parseCheck([{ code: "OUTL-7K4P-2QX9", state: "not_valid_here" }])!, "professional");
  assert.equal(bad.title, "Not valid with you");
  assert.equal(bad.body, "This voucher was issued for another professional's or business's offer.");
});

test("mark: first answer flips to used, a repeat reads already_used; nothing else changes", () => {
  const prev = parseCheck([{ ...base, state: "valid" }])!;
  const now = new Date(2026, 9, 22, 9, 5);
  const first = mergeMark(prev, [{ voucher_id: "v1", state: "used", used_at: now.toISOString(), used_by_first_name: "Karim" }], now)!;
  assert.equal(first.state, "used");
  assert.equal(first.memberFirstName, "Maya");
  assert.equal(checkView(first, "business").body, "Marked as used on Oct 22, 2026 at 9:05 AM.");
  assert.equal(checkView(first, "business").cta, "Scan another");
  const again = mergeMark(prev, [{ voucher_id: "v1", state: "already_used", used_at: now.toISOString(), used_by_first_name: "Karim" }], now)!;
  assert.equal(again.state, "already_used");
  assert.equal(checkView(again, "business").title, "Already used");
  assert.equal(mergeMark(prev, null), null);
  assert.equal(dateTimeLabel("nope"), "");
});
