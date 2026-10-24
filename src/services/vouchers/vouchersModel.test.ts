import { test } from "node:test";
import assert from "node:assert/strict";
import { daysLeft, howToUse, liveStatus, parseVoucherRow, parseVouchers, tabOf, voucherRow, VOUCHER_SELECT } from "./vouchersModel.ts";

const NOW = new Date(2026, 9, 16, 12, 0);
// A `vouchers` row as the member's read returns it: the voucher's own snapshot of its offer (Database PR #40).
const raw = (over: Record<string, unknown> = {}) => ({
  id: "v1",
  offer_id: "o1",
  code: "HWAE-PD5G-74KM",
  status: "issued",
  points_paid: 900,
  issued_at: new Date(2026, 9, 1).toISOString(),
  expires_at: new Date(2027, 0, 15, 23).toISOString(),
  used_at: null,
  offer_title: "15% off full-price items",
  offer_owner_kind: "business",
  offer_business_id: "b1",
  offer_professional_id: null,
  offer_owner_name: "Outline Activewear",
  offer_where_used: "both",
  offer_online_url: "https://outlineactive.com/",
  ...over,
});
const v = (over: Record<string, unknown> = {}) => parseVouchers([raw(over)])[0];

test("parse: the table row with its snapshot; the QR carries the code; no offer embed", () => {
  assert.ok(!VOUCHER_SELECT.includes("offers("));
  assert.ok(VOUCHER_SELECT.includes("offer_title") && VOUCHER_SELECT.includes("offer_online_url"));
  assert.equal(parseVouchers([{ id: "x" }]).length, 0);
  const x = v();
  assert.equal(x.code, "HWAE-PD5G-74KM");
  assert.equal(x.qrPayload, "HWAE-PD5G-74KM");
  assert.equal(x.offerHeadline, "15% off full-price items");
  assert.equal(x.ownerName, "Outline Activewear");
  assert.equal(x.where, "both");
  assert.equal(x.onlineUrl, "https://outlineactive.com/");
  assert.equal(x.pointsPaid, 900);
  assert.equal(x.ownerType, "business");
  assert.equal(x.ownerId, "b1");
  assert.equal(v({ offer_where_used: "in_person" }).where, "in_store");
});

test("parse: the snapshot is the voucher's own words whatever happened to the offer since (no \"Reward\" fallback)", () => {
  // The member's read carries no offer state at all: a paused, ended, hidden or renamed offer can't change these.
  const x = v();
  assert.equal(x.offerHeadline, "15% off full-price items");
  // redeem_offer's row (the whole vouchers row, stamped by the trigger).
  const bare = parseVoucherRow({ id: "v2", offer_id: "o1", code: "AAAA-BBBB-CCCC", qr_token: "ab", status: "issued", points_paid: 50, expires_at: "2026-11-23T00:00:00+00:00", offer_title: "Free shaker", offer_owner_kind: "business", offer_owner_name: "Peak", offer_where_used: "online", offer_online_url: null });
  assert.equal(bare?.code, "AAAA-BBBB-CCCC");
  assert.equal(bare?.offerHeadline, "Free shaker");
  assert.equal(bare?.where, "online");
  // A professional's offer: their first name at issue, in person, no website.
  const p = parseVoucherRow(raw({ offer_title: "Free consult", offer_owner_kind: "professional", offer_business_id: null, offer_professional_id: "p1", offer_owner_name: "Rana", offer_where_used: "in_person", offer_online_url: null }));
  assert.equal(p?.ownerType, "professional");
  assert.equal(p?.ownerId, "p1");
  assert.equal(p?.ownerName, "Rana");
  assert.equal(p?.where, "in_person");
  assert.equal(p?.onlineUrl, null);
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
