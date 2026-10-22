import { test } from "node:test";
import assert from "node:assert/strict";
import { FEE_NOTICE, feeBase, feeCalcLine, feeMoney, feeRows, minimumSentence, payMoney, payText, quoteHiringFee } from "./fee.ts";

// HANDOVER §14 "Hiring" fee examples, every one.
test("§14: a role with a $1,000 base → $80.00", () => {
  const q = quoteHiringFee("role", 1000);
  assert.equal(q.fee, 80);
  assert.equal(q.minimumApplied, false);
  assert.equal(feeMoney(q.fee), "$80.00");
});

test("§14: a role with a $320 base → $25.60", () => {
  const q = quoteHiringFee("role", 320);
  assert.equal(q.fee, 25.6);
  assert.equal(q.minimumApplied, false);
  assert.equal(feeMoney(q.fee), "$25.60");
});

test("§14: a role with a $100 base → $25.00 (minimum applied)", () => {
  const q = quoteHiringFee("role", 100);
  assert.equal(q.percentAmount, 8);
  assert.equal(q.fee, 25);
  assert.equal(q.minimumApplied, true);
});

test("§14: a role with a $240 base → $25.00 (minimum applied)", () => {
  const q = quoteHiringFee("role", 240);
  assert.equal(q.percentAmount, 19.2);
  assert.equal(q.fee, 25);
  assert.equal(q.minimumApplied, true);
});

test("§14: a class slot paying $60 → $4.80", () => {
  const q = quoteHiringFee("class_slot", 60);
  assert.equal(q.fee, 4.8);
  assert.equal(q.minimumApplied, false);
  assert.equal(q.basis, "slot_total_pay");
});

test("§14: a class slot paying $25 → $3.00 (minimum applied)", () => {
  const q = quoteHiringFee("class_slot", 25);
  assert.equal(q.percentAmount, 2);
  assert.equal(q.fee, 3);
  assert.equal(q.minimumApplied, true);
});

test("§14: a class slot paying $37.50 → $3.00 (8% equals the minimum, not flagged)", () => {
  const q = quoteHiringFee("class_slot", 37.5);
  assert.equal(q.percentAmount, 3);
  assert.equal(q.fee, 3);
  assert.equal(q.minimumApplied, false);
});

test("rounds to the cent", () => {
  assert.equal(quoteHiringFee("role", 333.33).percentAmount, 26.67);
  assert.equal(quoteHiringFee("role", 560).fee, 44.8);
});

test("feeBase: role per class × classes a month; monthly pay; slot total", () => {
  assert.equal(feeBase("role", 80, "per_class", 4), 320);
  assert.equal(feeBase("role", 70, "per_class", 8), 560);
  assert.equal(feeBase("role", 900, "per_month", null), 900);
  assert.equal(feeBase("class_slot", 60, "per_slot", null), 60);
  assert.equal(feeBase("role", 80, "per_class", null), null);
  assert.equal(feeBase("role", null, "per_class", 4), null);
  assert.equal(feeBase("role", 0, "per_month", null), null);
});

test("board strings: calculation lines, minimum, rows, notice", () => {
  assert.equal(feeCalcLine(quoteHiringFee("role", 320)), "8% of $320, the first month's pay");
  assert.equal(feeCalcLine(quoteHiringFee("role", 240)), "8% of $240, the first month's pay, is $19.20");
  assert.equal(feeCalcLine(quoteHiringFee("role", 560)), "8% of $560, the first month's pay");
  assert.equal(minimumSentence("role"), "The minimum for a role is $25.");
  assert.equal(minimumSentence("class_slot"), "The minimum for a class slot is $3.");
  assert.deepEqual(feeRows(quoteHiringFee("role", 320)), [
    ["Base used", "$320 · first month's pay"],
    ["8% of base", "$25.60"],
    ["Minimum applied", "No · minimum $25"],
  ]);
  assert.deepEqual(feeRows(quoteHiringFee("class_slot", 60)), [
    ["Base used", "$60 · total pay for the slot"],
    ["8% of base", "$4.80"],
    ["Minimum applied", "No · minimum $3"],
  ]);
  assert.deepEqual(feeRows(quoteHiringFee("role", 240))[2], ["Minimum applied", "Yes · $25"]);
  assert.equal(FEE_NOTICE, "One-time 8% hiring fee (min. $25 per role, $3 per class slot) when you hire");
});

test("money and pay text", () => {
  assert.equal(payMoney(320), "$320");
  assert.equal(payMoney(37.5), "$37.50");
  assert.equal(payMoney(1200), "$1,200");
  assert.equal(feeMoney(1234.5), "$1,234.50");
  assert.equal(payText(80, "per_class"), "$80 per class");
  assert.equal(payText(900, "per_month"), "$900 a month");
  assert.equal(payText(60, "per_slot"), "$60 for the slot");
});
