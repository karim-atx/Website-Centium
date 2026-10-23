import { test } from "node:test";
import assert from "node:assert/strict";
import { daysLeft, howToUse, liveStatus, parseVoucherRow, parseVouchers, tabOf, voucherProfessionalIds, voucherRow } from "./vouchersModel.ts";

const NOW = new Date(2026, 9, 16, 12, 0);
// A `vouchers` row as the member's read returns it (DB2), the offer and its business embedded.
const raw = (over: Record<string, unknown> = {}) => ({
  id: "v1",
  offer_id: "o1",
  code: "HWAE-PD5G-74KM",
  status: "issued",
  points_paid: 900,
  issued_at: new Date(2026, 9, 1).toISOString(),
  expires_at: new Date(2027, 0, 15, 23).toISOString(),
  used_at: null,
  offer: { title: "15% off full-price items", owner_kind: "business", business_id: "b1", professional_id: null, where_used: "both", business: { business_name: "Outline Activewear", logo_url: null, public_website: "https://outlineactive.com/" } },
  ...over,
});
const v = (over: Record<string, unknown> = {}) => parseVouchers([raw(over)])[0];

test("parse: the table row with its offer; the QR carries the code", () => {
  assert.equal(parseVouchers([{ id: "x" }]).length, 0);
  const x = v();
  assert.equal(x.code, "HWAE-PD5G-74KM");
  assert.equal(x.qrPayload, "HWAE-PD5G-74KM");
  assert.equal(x.offerHeadline, "15% off full-price items");
  assert.equal(x.ownerName, "Outline Activewear");
  assert.equal(x.where, "both");
  assert.equal(x.onlineUrl, "https://outlineactive.com/");
  assert.equal(x.pointsPaid, 900);
  assert.equal(v({ offer: { ...raw().offer, where_used: "in_person" } }).where, "in_store");
});

test("parse: the offer no longer readable (paused / ended / hidden) → Reward, no owner", () => {
  const x = v({ offer: null });
  assert.equal(x.offerHeadline, "Reward");
  assert.equal(x.ownerName, "");
  assert.equal(x.where, null);
});

test("parse: redeem_offer's bare row (no embed) and a professional's offer", () => {
  const bare = parseVoucherRow({ id: "v2", offer_id: "o1", code: "AAAA-BBBB-CCCC", qr_token: "ab", status: "issued", points_paid: 50, expires_at: "2026-11-23T00:00:00+00:00" });
  assert.equal(bare?.code, "AAAA-BBBB-CCCC");
  const pro = { title: "Free consult", owner_kind: "professional", business_id: null, professional_id: "p1", where_used: "in_person", business: null };
  const p = parseVoucherRow(raw({ offer: pro }), new Map([["p1", { first: "Rana", type: "Personal trainer" }]]));
  assert.equal(p?.ownerName, "Rana · Personal trainer");
  assert.equal(p?.where, "in_person");
  assert.deepEqual(voucherProfessionalIds([raw({ offer: pro }), raw()]), ["p1"]);
});

test("rows: Active / N days / Used / Expired / Void (C-MO.4.6 stub)", () => {
  assert.deepEqual(voucherRow(v(), NOW), { meta: "Valid until Jan 15, 2027", stub: "Active", tone: "teal" });
  assert.deepEqual(voucherRow(v({ expires_at: new Date(2026, 9, 19, 20).toISOString() }), NOW), { meta: "Valid until Oct 19, 2026", stub: "3 days", tone: "pale" });
  assert.equal(voucherRow(v({ status: "used", used_at: new Date(2026, 9, 3).toISOString() }), NOW).meta, "Used on Oct 3, 2026");
  assert.equal(voucherRow(v({ expires_at: new Date(2026, 9, 1).toISOString() }), NOW).stub, "Expired");
  assert.deepEqual(voucherRow(v({ status: "void" }), NOW), { meta: "Cancelled · points refunded", stub: "Void", tone: "muted" });
});

test("an issued voucher past its expiry reads as expired; tabs", () => {
  assert.equal(liveStatus({ status: "issued", expiresAt: new Date(2026, 9, 1).toISOString() }, NOW), "expired");
  assert.equal(liveStatus({ status: "void", expiresAt: new Date(2027, 9, 1).toISOString() }, NOW), "void");
  assert.equal(tabOf("issued"), "active");
  assert.equal(tabOf("void"), "expired");
  assert.equal(daysLeft(new Date(2026, 9, 16, 23).toISOString(), NOW), 0);
});

test("how to use, by where", () => {
  assert.deepEqual(howToUse("both", "https://outlineactive.com/"), ["In store: show this screen at the counter.", "Online: enter the code at checkout on outlineactive.com."]);
  assert.deepEqual(howToUse("in_store", null), ["In store: show this screen at the counter."]);
  assert.deepEqual(howToUse("in_person", null), ["Show this screen at your session."]);
});
