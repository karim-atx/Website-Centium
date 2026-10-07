import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  appliedLine,
  interpretRedeemReferral,
  pctLabel,
  redemptionsLine,
  REFUSAL_LINES,
  toPct,
  toReferralSummary,
  UNKNOWN_REFUSAL_LINE,
  type RedeemReferralRow,
} from "./referralLogic.ts";

const row = (over: Partial<RedeemReferralRow> = {}): RedeemReferralRow => ({
  ok: false,
  reason: null,
  message: "A server sentence that must never be shown",
  referral_id: null,
  referee_discount_pct: null,
  referrer_discount_pct: null,
  points_awarded: null,
  ...over,
});

test("redeemed: worded from the row's discount and points", () => {
  const out = interpretRedeemReferral(
    row({ ok: true, reason: "redeemed", referral_id: "r1", referee_discount_pct: "10.00", referrer_discount_pct: 15, points_awarded: 1500 })
  );
  assert.equal(out.status, "redeemed");
  if (out.status !== "redeemed") return;
  assert.equal(out.discountPct, 10);
  assert.equal(out.pointsAwarded, 1500);
  assert.equal(out.line, "Code applied. 10% off your subscription, and 1,500 points for your friend.");
});

test("each refusal reason has its own line, never the server message", () => {
  for (const reason of ["not_valid", "already_used", "own_code", "already_referred"] as const) {
    const out = interpretRedeemReferral(row({ reason }));
    assert.deepEqual(out, { status: "refused", reason, line: REFUSAL_LINES[reason] });
    assert.notEqual(out.line, "A server sentence that must never be shown");
  }
  assert.equal(REFUSAL_LINES.own_code, "You can't use your own code.");
  assert.equal(REFUSAL_LINES.already_referred, "This code has already been used on your account.");
});

test("ok and reason must agree before anything reads as applied", () => {
  assert.equal(interpretRedeemReferral(row({ ok: true, reason: "not_valid" })).status, "refused");
  assert.equal(interpretRedeemReferral(row({ ok: null, reason: "redeemed" })).status, "refused");
  assert.equal(interpretRedeemReferral(row({ ok: false, reason: "redeemed" })).line, UNKNOWN_REFUSAL_LINE);
});

test("an unknown or missing reason, or no row, is a generic refusal", () => {
  for (const r of [row({ reason: "something_new" }), row({ reason: null }), null, undefined]) {
    assert.deepEqual(interpretRedeemReferral(r), { status: "refused", reason: "unknown", line: UNKNOWN_REFUSAL_LINE });
  }
  // A prototype key is not a reason.
  assert.equal(interpretRedeemReferral(row({ reason: "toString" })).line, UNKNOWN_REFUSAL_LINE);
});

test("appliedLine: discount, points, either or neither", () => {
  assert.equal(appliedLine(10), "Code applied. 10% off your subscription.");
  assert.equal(appliedLine(12.5, 0), "Code applied. 12.5% off your subscription.");
  assert.equal(appliedLine(null, 1500), "Code applied. 1,500 points for your friend.");
  assert.equal(appliedLine(0), "Code applied.");
  assert.equal(appliedLine(null), "Code applied.");
});

test("toPct and pctLabel read PostgREST numerics", () => {
  assert.equal(toPct("10.00"), 10);
  assert.equal(toPct(15), 15);
  assert.equal(toPct(null), null);
  assert.equal(toPct(""), null);
  assert.equal(toPct("abc"), null);
  assert.equal(pctLabel(10), "10");
  assert.equal(pctLabel(12.5), "12.5");
  assert.equal(pctLabel(1 / 3), "0.33");
});

test("toReferralSummary: the always-one-row shape, nulls and zeroes", () => {
  assert.deepEqual(
    toReferralSummary({
      code: null,
      code_created_at: null,
      redemptions: 0,
      points_earned: 0,
      last_redeemed_at: null,
      i_was_referred: false,
      my_discount_pct: null,
    }),
    { code: null, redemptions: 0, pointsEarned: 0, lastRedeemedAt: null, iWasReferred: false, myDiscountPct: null }
  );
  assert.deepEqual(toReferralSummary(undefined), {
    code: null,
    redemptions: 0,
    pointsEarned: 0,
    lastRedeemedAt: null,
    iWasReferred: false,
    myDiscountPct: null,
  });
  const jpw = toReferralSummary({
    code: "JPW-4KTM",
    code_created_at: "2026-10-01T00:00:00Z",
    redemptions: 2,
    points_earned: 3000,
    last_redeemed_at: "2026-10-03T00:00:00Z",
    i_was_referred: false,
    my_discount_pct: null,
  });
  assert.equal(jpw.code, "JPW-4KTM");
  assert.equal(jpw.redemptions, 2);
  assert.equal(jpw.pointsEarned, 3000);
  const rmale = toReferralSummary({
    code: null,
    code_created_at: null,
    redemptions: 0,
    points_earned: 0,
    last_redeemed_at: null,
    i_was_referred: true,
    my_discount_pct: "10.00",
  });
  assert.equal(rmale.iWasReferred, true);
  assert.equal(rmale.myDiscountPct, 10);
});

test("redemptionsLine: nothing until somebody used the code", () => {
  assert.equal(redemptionsLine({ redemptions: 0, pointsEarned: 0 }), null);
  assert.equal(redemptionsLine({ redemptions: 1, pointsEarned: 1500 }), "1 friend joined with your code · 1,500 points earned");
  assert.equal(redemptionsLine({ redemptions: 2, pointsEarned: 3000 }), "2 friends joined with your code · 3,000 points earned");
  assert.equal(redemptionsLine({ redemptions: 2, pointsEarned: 0 }), "2 friends joined with your code");
});
