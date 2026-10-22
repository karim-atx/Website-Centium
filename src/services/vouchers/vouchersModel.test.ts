import { test } from "node:test";
import assert from "node:assert/strict";
import { daysLeft, howToUse, liveStatus, parseVouchers, tabOf, voucherRow } from "./vouchersModel.ts";

const NOW = new Date(2026, 9, 16, 12, 0);
const v = (over: Record<string, unknown> = {}) =>
  parseVouchers([{ id: "v1", code: "OUTL-7K4P-2QX9", qr_payload: "tok", offer_headline: "15% off full-price items", owner_name: "Outline Activewear", expires_at: new Date(2027, 0, 15, 23).toISOString(), status: "issued", ...over }])[0];

test("parse: a row without a code or expiry is dropped", () => {
  assert.equal(parseVouchers([{ id: "x" }]).length, 0);
  assert.equal(v().code, "OUTL-7K4P-2QX9");
});

test("rows: Active / N days / Used / Expired (C-MO.4.6 stub)", () => {
  assert.deepEqual(voucherRow(v(), NOW), { meta: "Valid until Jan 15, 2027", stub: "Active", tone: "teal" });
  assert.deepEqual(voucherRow(v({ expires_at: new Date(2026, 9, 19, 20).toISOString() }), NOW), { meta: "Valid until Oct 19, 2026", stub: "3 days", tone: "pale" });
  assert.equal(voucherRow(v({ status: "used", used_at: new Date(2026, 9, 3).toISOString() }), NOW).meta, "Used on Oct 3, 2026");
  assert.equal(voucherRow(v({ expires_at: new Date(2026, 9, 1).toISOString() }), NOW).stub, "Expired");
});

test("an issued voucher past its expiry reads as expired; tabs", () => {
  assert.equal(liveStatus({ status: "issued", expiresAt: new Date(2026, 9, 1).toISOString() }, NOW), "expired");
  assert.equal(tabOf("issued"), "active");
  assert.equal(daysLeft(new Date(2026, 9, 16, 23).toISOString(), NOW), 0);
});

test("how to use, by where", () => {
  assert.deepEqual(howToUse("both", "https://outlineactive.com/"), ["In store: show this screen at the counter.", "Online: enter the code at checkout on outlineactive.com."]);
  assert.deepEqual(howToUse("in_store", null), ["In store: show this screen at the counter."]);
});
