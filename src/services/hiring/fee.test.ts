import { test } from "node:test";
import assert from "node:assert/strict";
import { FEE_NOTICE_PLAIN, feeCalcLine, feeExplanation, feeMoney, feeNotice, feeRows, minimumSentence, parseFeeQuote, parseFeeRules, payMoney, payText, ratePercent } from "./fee.ts";

// HANDOVER_API Release 2 "The fee": the four worked examples, as
// quote_hiring_fee returns them (the arithmetic is the server's; these check
// the reading and the words).
const Q = {
  role320: { base: "320.00", basis: "first_month_pay", percent_amount: "25.60", minimum: "25.00", fee: "25.60", minimum_applied: false },
  slot60: { base: "60.00", basis: "slot_total_pay", percent_amount: "4.80", minimum: "3.00", fee: "4.80", minimum_applied: false },
  month100: { base: "100.00", basis: "first_month_pay", percent_amount: "8.00", minimum: "25.00", fee: "25.00", minimum_applied: true },
  slot10: { base: "10.00", basis: "slot_total_pay", percent_amount: "0.80", minimum: "3.00", fee: "3.00", minimum_applied: true },
};
const RULES = { hiring_fee_pct: "0.08", hiring_fee_min_role: "25", hiring_fee_min_class: "3" };

test("$80 × 4 = $320 → $25.60, floor not applied", () => {
  const q = parseFeeQuote("role", Q.role320)!;
  assert.equal(q.fee, 25.6);
  assert.equal(q.minimumApplied, false);
  assert.equal(feeMoney(q.fee), "$25.60");
  assert.equal(feeCalcLine(q, 0.08), "8% of $320, the first month's pay");
});

test("$60 slot → $4.80, floor not applied", () => {
  const q = parseFeeQuote("class_slot", Q.slot60)!;
  assert.equal(q.fee, 4.8);
  assert.equal(q.basis, "slot_total_pay");
  assert.deepEqual(feeRows(q, 0.08), [
    ["Base used", "$60 · total pay for the slot"],
    ["8% of base", "$4.80"],
    ["Minimum applied", "No · minimum $3"],
  ]);
});

test("$100 a month → 8% is $8.00, so the $25 floor wins", () => {
  const q = parseFeeQuote("role", Q.month100)!;
  assert.equal(q.percentAmount, 8);
  assert.equal(q.fee, 25);
  assert.equal(q.minimumApplied, true);
  assert.equal(feeCalcLine(q, 0.08), "8% of $100, the first month's pay, is $8.00");
  assert.equal(minimumSentence(q), "The minimum for a role is $25.");
  assert.deepEqual(feeRows(q, 0.08)[2], ["Minimum applied", "Yes · $25"]);
});

test("$10 slot → the $3 floor wins", () => {
  const q = parseFeeQuote("class_slot", Q.slot10)!;
  assert.equal(q.fee, 3);
  assert.equal(q.minimumApplied, true);
  assert.equal(minimumSentence(q), "The minimum for a class slot is $3.");
});

test("my_hiring_fees rows read `amount`; the rate falls back to the row's own figures", () => {
  const q = parseFeeQuote("role", { base: 320, basis: "first_month_pay", percent_amount: 25.6, minimum: 25, amount: 25.6, minimum_applied: false })!;
  assert.equal(q.fee, 25.6);
  assert.equal(feeRows(q, null)[1][0], "8% of base");
  assert.equal(parseFeeQuote("role", { base: 320 }), null);
  assert.equal(parseFeeQuote("role", null), null);
});

test("the notice and the explanation use platform_settings' numbers", () => {
  const r = parseFeeRules(RULES)!;
  assert.equal(feeNotice(r), "One-time 8% hiring fee (min. $25 per role, $3 per class slot) when you hire");
  assert.equal(feeNotice({ rate: 0.075, minimumRole: 30, minimumClass: 2.5 }), "One-time 7.5% hiring fee (min. $30 per role, $2.50 per class slot) when you hire");
  assert.match(feeExplanation(r), /^Each hire through Centium has one fee: 8% of the base, or the minimum \(\$25 per role, \$3 per class slot\)/);
  assert.equal(FEE_NOTICE_PLAIN, "One-time hiring fee when you hire");
  assert.equal(parseFeeRules({ hiring_fee_pct: "1.5", hiring_fee_min_role: 25, hiring_fee_min_class: 3 }), null);
  assert.equal(parseFeeRules({ hiring_fee_pct: 0.08 }), null);
  assert.equal(ratePercent(0.08), "8%");
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
