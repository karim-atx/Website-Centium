import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  appliedLine,
  interpretPreviewReferral,
  isOwnReferralCode,
  PREVIEW_REFUSAL_LINES,
  previewOfferLine,
  interpretRedeemReferral,
  pctLabel,
  pendingFriendLines,
  redemptionsLine,
  REFERRAL_RULE_LINE,
  REFUSAL_LINES,
  rewardLine,
  STANDARD_REFERRER_POINTS,
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

test("redeemed: worded from the points only (the row's discount is kept, never promised)", () => {
  const out = interpretRedeemReferral(
    row({ ok: true, reason: "redeemed", referral_id: "r1", referee_discount_pct: "10.00", referrer_discount_pct: 15, points_awarded: 1500 })
  );
  assert.equal(out.status, "redeemed");
  if (out.status !== "redeemed") return;
  assert.equal(out.discountPct, 10);
  assert.equal(out.pointsAwarded, 1500);
  assert.equal(out.line, "Code applied. Your friend gets 1,500 points once you've set up your account and used Centium on 3 different days.");
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

test("appliedLine: points or nothing, never a discount", () => {
  // Round F (AB1): the referrer's points wait for the friend, so nothing promises them now.
  assert.equal(appliedLine(1500), "Code applied. Your friend gets 1,500 points once you've set up your account and used Centium on 3 different days.");
  assert.equal(appliedLine(0), "Code applied.");
  assert.equal(appliedLine(), "Code applied.");
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
    { code: null, redemptions: 0, pointsEarned: 0, lastRedeemedAt: null, iWasReferred: false, myDiscountPct: null, isAmbassador: false, referrerPoints: null, pending: 0, pendingPoints: 0, pendingFriends: [] }
  );
  assert.deepEqual(toReferralSummary(undefined), {
    code: null,
    redemptions: 0,
    pointsEarned: 0,
    lastRedeemedAt: null,
    iWasReferred: false,
    myDiscountPct: null,
    isAmbassador: false,
    referrerPoints: null,
    pending: 0,
    pendingPoints: 0,
    pendingFriends: [],
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

test("toReferralSummary: B3's is_ambassador and referrer_points; friend_discount_pct is not carried", () => {
  const base = { code: "AMB-1234", code_created_at: null, redemptions: 3, points_earned: 4500, last_redeemed_at: null, i_was_referred: false, my_discount_pct: null };
  const amb = toReferralSummary({ ...base, is_ambassador: true, referrer_points: 2000, friend_discount_pct: "10.00" });
  assert.equal(amb.isAmbassador, true);
  assert.equal(amb.referrerPoints, 2000);
  assert.ok(!("friendDiscountPct" in amb));
  const std = toReferralSummary({ ...base, is_ambassador: false, referrer_points: 1500, friend_discount_pct: 10 });
  assert.equal(std.isAmbassador, false);
  assert.equal(std.referrerPoints, 1500);
  // A pre-B3 row (no new columns) or a nonsense figure: not an ambassador, no figure.
  assert.deepEqual([toReferralSummary(base).isAmbassador, toReferralSummary(base).referrerPoints], [false, null]);
  assert.equal(toReferralSummary({ ...base, referrer_points: 0 }).referrerPoints, null);
  assert.equal(toReferralSummary({ ...base, is_ambassador: null }).isAmbassador, false);
});

test("rewardLine: points per friend from the server, never a discount", () => {
  assert.equal(rewardLine(2000), "2,000 points per friend, once they're set up and active");
  assert.equal(rewardLine(1500), "1,500 points per friend, once they're set up and active");
  assert.equal(rewardLine(2000, true), "2,000 points per colleague or client, once they're set up and active");
  // Before the summary answers: the standard figure.
  assert.equal(rewardLine(null), `${STANDARD_REFERRER_POINTS.toLocaleString("en-US")} points per friend, once they're set up and active`);
  assert.equal(rewardLine(undefined, true), "1,500 points per colleague or client, once they're set up and active");
  // Round F (AB1): the rule as the Database built it (F18; 10 rewarded a month).
  assert.match(REFERRAL_RULE_LINE, /3 different days within 14 days/);
  assert.match(REFERRAL_RULE_LINE, /Up to 10 friends a month/);
  for (const n of [null, 1500, 2000]) assert.doesNotMatch(rewardLine(n), /%|off/);
});

test("redemptionsLine: nothing until somebody used the code", () => {
  assert.equal(redemptionsLine({ redemptions: 0, pointsEarned: 0 }), null);
  assert.equal(redemptionsLine({ redemptions: 1, pointsEarned: 1500 }), "1 friend joined · 1,500 points earned");
  assert.equal(redemptionsLine({ redemptions: 2, pointsEarned: 3000 }), "2 friends joined · 3,000 points earned");
  assert.equal(redemptionsLine({ redemptions: 2, pointsEarned: 0 }), "2 friends joined");
  // Round F (AB1): the pending count between, only when there is one.
  assert.equal(redemptionsLine({ redemptions: 3, pointsEarned: 1500, pending: 2 }), "3 friends joined · 2 pending · 1,500 points earned");
  assert.equal(redemptionsLine({ redemptions: 1, pointsEarned: 0, pending: 1 }), "1 friend joined · 1 pending");
  assert.equal(redemptionsLine({ redemptions: 1, pointsEarned: 0, pending: 0 }), "1 friend joined");
});

test("summary: Round F pending, pending points and the pending friends, read as sent", () => {
  const base = { code: "AB12CD34", code_created_at: null, redemptions: 3, points_earned: 1500, last_redeemed_at: null, i_was_referred: false, my_discount_pct: null };
  const s = toReferralSummary({
    ...base,
    pending: 2,
    pending_points: 3000,
    lapsed: 1,
    pending_friends: [
      { first_name: "Rana", redeemed_at: "2026-10-30T10:00:00Z", lapses_at: "2026-11-13T10:00:00Z", waiting_for: "active_days" },
      { first_name: null, redeemed_at: "2026-10-31T10:00:00Z", lapses_at: null, waiting_for: "monthly_cap" },
      { first_name: "  ", redeemed_at: null, lapses_at: null, waiting_for: "something_new" },
      "junk",
    ],
  });
  assert.equal(s.pending, 2);
  assert.equal(s.pendingPoints, 3000);
  assert.deepEqual(
    s.pendingFriends.map((f) => [f.firstName, f.waitingFor, f.lapsesAt]),
    [
      ["Rana", "active_days", "2026-11-13T10:00:00Z"],
      [null, "monthly_cap", null],
      [null, "active_days", null],
    ]
  );
  // A pre-F2 row: nothing pending.
  const old = toReferralSummary(base);
  assert.deepEqual([old.pending, old.pendingPoints, old.pendingFriends], [0, 0, []]);
});

test("pendingFriendLines: pending until the lapse date, and why, by waiting_for", () => {
  const now = new Date(2026, 9, 31, 12, 0);
  const at = new Date(2026, 10, 13, 10, 0).toISOString();
  assert.deepEqual(pendingFriendLines({ firstName: "Rana", redeemedAt: null, lapsesAt: at, waitingFor: "active_days" }, now), {
    title: "Rana · Pending until Nov 13",
    reason: "Waiting for them to use Centium on 3 different days.",
  });
  assert.equal(pendingFriendLines({ firstName: "Rana", redeemedAt: null, lapsesAt: at, waitingFor: "onboarding" }, now).reason, "Waiting for them to finish setting up their account.");
  // Qualified, waiting for a month with room: no lapse date.
  assert.deepEqual(pendingFriendLines({ firstName: null, redeemedAt: null, lapsesAt: null, waitingFor: "monthly_cap" }, now), {
    title: "A friend · Pending",
    reason: "10 friends have earned you points this month. These points arrive next month.",
  });
});

test("preview: found carries the first name and both rates", () => {
  const out = interpretPreviewReferral({ ok: true, reason: "found", referrer_first_name: "Jpw", referee_discount_pct: "10.00", referrer_discount_pct: 15 });
  assert.deepEqual(out, { status: "found", referrerFirstName: "Jpw", refereeDiscountPct: 10, referrerDiscountPct: 15 });
  assert.equal(previewOfferLine(out as Extract<typeof out, { status: "found" }>), "Jpw earns points when you join with their code.");
});

test("preview: not_valid and already_referred are refusals with their own lines, never redeem's", () => {
  const bad = interpretPreviewReferral({ ok: false, reason: "not_valid", referrer_first_name: null, referee_discount_pct: null, referrer_discount_pct: null });
  assert.deepEqual(bad, { status: "refused", reason: "not_valid", line: PREVIEW_REFUSAL_LINES.not_valid });
  assert.doesNotMatch(PREVIEW_REFUSAL_LINES.not_valid, /own|used|expired/i);
  const done = interpretPreviewReferral({ ok: false, reason: "already_referred", referrer_first_name: null, referee_discount_pct: null, referrer_discount_pct: null });
  assert.equal(done.status, "refused");
});

test("preview: ok without a name, or an unknown reason, is not treated as found", () => {
  assert.equal(interpretPreviewReferral({ ok: true, reason: "found", referrer_first_name: null, referee_discount_pct: 10, referrer_discount_pct: 15 }).status, "refused");
  assert.equal(interpretPreviewReferral({ ok: true, reason: "weird", referrer_first_name: "A", referee_discount_pct: 10, referrer_discount_pct: 15 }).status, "refused");
  assert.equal(interpretPreviewReferral(null).status, "refused");
});

test("isOwnReferralCode: the server's upper(btrim()) comparison, never without a code", () => {
  assert.equal(isOwnReferralCode("maya-7k4p", "MAYA-7K4P"), true);
  assert.equal(isOwnReferralCode("  MAYA-7K4P ", "MAYA-7K4P"), true);
  assert.equal(isOwnReferralCode("RAMI-2QX9", "MAYA-7K4P"), false);
  assert.equal(isOwnReferralCode("MAYA-7K4P", null), false);
  assert.equal(isOwnReferralCode("   ", "MAYA-7K4P"), false);
});
