import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dayHeading,
  earnedToday,
  expiringLine,
  groupLedger,
  ledgerCursor,
  ledgerLines,
  nextMilestone,
  nextRewardLine,
  parseLedgerRows,
  parsePointsExtras,
  parsePointsRules,
  signedPoints,
  streakDays,
  todayLine,
  type LedgerEntry,
} from "./pointsModel.ts";

const NOW = new Date(2026, 9, 16, 15, 0); // Fri Oct 16 2026, local

test("summary extras: my_points_summary's last four columns; a row without them is null", () => {
  assert.equal(parsePointsExtras({ balance: 10, tier_name: "Bronze" }), null);
  // Nothing lapsing: both expiring columns null.
  assert.deepEqual(parsePointsExtras({ earned_today: 0, daily_cap: 30, expiring_soon: 0, expiring_soon_date: null }), { earnedToday: 0, dailyCap: 30, expiringSoon: 0, expiringSoonDate: null });
  // The cap is the server's, never a client default.
  assert.equal(parsePointsExtras({ earned_today: 5, daily_cap: 40, expiring_soon: 0, expiring_soon_date: null })?.dailyCap, 40);
  assert.deepEqual(parsePointsExtras({ earned_today: 20, daily_cap: 30, expiring_soon: 180, expiring_soon_date: "2026-11-14" }), {
    earnedToday: 20,
    dailyCap: 30,
    expiringSoon: 180,
    expiringSoonDate: "2026-11-14",
  });
});

test("todayLine: 20 of 30, and the cap reads limit reached", () => {
  assert.equal(todayLine({ earnedToday: 20, dailyCap: 30 }), "20 of 30 today");
  assert.equal(todayLine({ earnedToday: 30, dailyCap: 30 }), "30 of 30 today · limit reached");
  assert.equal(todayLine({ earnedToday: 45, dailyCap: 30 }), "30 of 30 today · limit reached");
  assert.equal(todayLine({ earnedToday: 20, dailyCap: 40 }), "20 of 40 today");
});

test("expiring line, month first", () => {
  assert.equal(expiringLine({ earnedToday: 0, dailyCap: 30, expiringSoon: 180, expiringSoonDate: "2026-11-14" }), "180 points expire on Nov 14, 2026");
  assert.equal(expiringLine({ earnedToday: 0, dailyCap: 30, expiringSoon: 0, expiringSoonDate: null }), null);
});

test("next reward: the cheapest offer out of reach (TV.silver), all reachable, or the tier fallback", () => {
  const offers = [
    { headline: "15% off", ownerName: "Outline Activewear", pointsCost: 900 },
    { headline: "$25 off", ownerName: "Ironworks", pointsCost: 1500 },
    { headline: "Massage", ownerName: "Still Studio", pointsCost: 3000 },
  ];
  assert.deepEqual(nextRewardLine(1240, offers, { nextTierName: null, pointsToNextTier: null, progress: 0 }), { lead: "260 to your next reward", detail: "$25 off at Ironworks", pct: 82.7 });
  assert.equal(nextRewardLine(3420, offers, { nextTierName: null, pointsToNextTier: null, progress: 0 }).lead, "You can redeem every reward");
  assert.deepEqual(nextRewardLine(1240, null, { nextTierName: "Gold", pointsToNextTier: 1760, progress: 0.12 }), { lead: "1,760 to Gold", detail: "", pct: 12 });
  assert.equal(nextRewardLine(20000, [], { nextTierName: null, pointsToNextTier: null, progress: 1 }).lead, "Highest tier");
});

const e = (id: string, source: string, amount: number, createdAt: string, description: string | null = null): LedgerEntry => ({
  id,
  source,
  amount,
  description,
  refLabel: null,
  day: null,
  createdAt,
  expiresAt: null,
  reversedSource: null,
});

test("ledger lines are the server's words: ref_label over description; achievements by title", () => {
  const t = (k: string) => (k === "full_day" ? "First full day" : null);
  const w = (x: LedgerEntry, refLabel: string | null, more: Partial<LedgerEntry> = {}): LedgerEntry => ({ ...x, refLabel, ...more });
  assert.deepEqual(ledgerLines(w(e("1", "water_goal", 5, "x", "Daily logging"), "Water goal"), t), { title: "Water goal", kind: "Daily logging" });
  assert.deepEqual(ledgerLines(w(e("2", "achievement", 50, "x", "streak_7"), "Achievement"), t), { title: "7-day streak", kind: "Earned · Achievement" });
  assert.deepEqual(ledgerLines(w(e("3", "achievement", 50, "x", "full_day"), "Achievement"), t), { title: "First full day", kind: "Earned · Achievement" });
  // A reversal is labelled with the kind it reversed (the server's ref_label).
  assert.deepEqual(ledgerLines(w(e("4", "reversal", -10, "x", "Reversed · Logging"), "Workout", { reversedSource: "log_workout" }), t), { title: "Workout", kind: "Reversed · Logging" });
  assert.deepEqual(ledgerLines(w(e("5", "expiry", -40, "x"), "Expired"), t), { title: "Expired", kind: "Spent" });
  assert.deepEqual(ledgerLines(w(e("6", "referral", 1500, "x", "Referral redeemed by a new member"), "Referral"), t), { title: "Referral", kind: "Referral redeemed by a new member" });
  assert.deepEqual(ledgerLines(e("7", "manual_adjustment", 20, "x"), t), { title: "Points", kind: "Earned" });
  assert.equal(streakDays("streak_365"), 365);
  assert.equal(streakDays("first_pr"), null);
});

test("signed points use a true minus", () => {
  assert.equal(signedPoints(5), "+5");
  assert.equal(signedPoints(-800), "−800");
  assert.equal(signedPoints(1500), "+1,500");
});

test("groupLedger: Today / Yesterday / Oct 14 headings, newest first, balance after each row", () => {
  const list = [
    e("a", "log_food", 10, new Date(2026, 9, 16, 9).toISOString()),
    e("b", "water_goal", 5, new Date(2026, 9, 16, 12).toISOString()),
    e("c", "redemption", -800, new Date(2026, 9, 15, 18).toISOString()),
    e("d", "achievement", 50, new Date(2026, 9, 14, 8).toISOString(), "streak_7"),
  ];
  const g = groupLedger(list, 1240, NOW);
  assert.deepEqual(
    g.map((x) => (x.kind === "head" ? x.label : `${x.entry.id}:${x.balanceAfter}`)),
    ["Today", "b:1240", "a:1235", "Yesterday", "c:1225", "Oct 14", "d:2025"]
  );
  assert.equal(dayHeading("2025-08-16", NOW), "Aug 16, 2025");
});

test("earnedToday: logging sources with a net positive today (a reversal cancels)", () => {
  const list = [
    e("a", "log_food", 10, new Date(2026, 9, 16, 9).toISOString()),
    e("b", "log_workout", 10, new Date(2026, 9, 16, 10).toISOString()),
    { ...e("c", "reversal", -10, new Date(2026, 9, 16, 11).toISOString()), reversedSource: "log_workout" },
    e("f", "log_metric", 5, new Date(2026, 9, 15, 9).toISOString()),
  ];
  assert.deepEqual([...earnedToday(list, NOW)].sort(), ["log_food"]);
});

test("next streak milestone (32-day streak → 100, 68 to go, 32%)", () => {
  assert.deepEqual(nextMilestone(32, (d) => ({ 7: 50, 30: 200, 100: 750, 365: 3000 })[d] ?? null), { days: 100, toGo: 68, points: 750, pct: 32 });
  assert.equal(nextMilestone(400, () => null), null);
});

test("ledger rows parse from my_points_ledger", () => {
  const rows = parseLedgerRows([
    { id: "1", amount: -10, source: "reversal", reversed_source: "log_food", ref_label: "Food log", description: "Reversed · Logging", day: "2026-10-16", expires_at: null, created_at: "2026-10-16T10:00:00.093963+00:00" },
    { id: null },
  ]);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { id: "1", source: "reversal", amount: -10, description: "Reversed · Logging", refLabel: "Food log", day: "2026-10-16", createdAt: "2026-10-16T10:00:00.093963+00:00", expiresAt: null, reversedSource: "log_food" });
});

test("ledgerCursor is the last row shown, its created_at kept to the microsecond", () => {
  assert.equal(ledgerCursor([]), null);
  const tie = "2026-10-21T01:15:00.093963+00:00";
  const c = ledgerCursor([e("a", "achievement", 100, "2026-10-22T08:00:00.5+00:00"), e("b", "achievement", 25, tie), e("c", "achievement", 25, tie)]);
  assert.deepEqual(c, { before: tie, beforeId: "c" });
});

test("points rules parse from platform_settings, all or nothing", () => {
  assert.deepEqual(parsePointsRules({ points_value_food: 10, points_value_workout: 10, points_value_metric: 5, points_value_water_goal: 5, points_daily_cap: 30, points_expiry_months: 12 }), {
    values: { log_food: 10, log_workout: 10, log_metric: 5, water_goal: 5 },
    dailyCap: 30,
    expiryMonths: 12,
  });
  assert.equal(parsePointsRules({ points_value_food: 10 }), null);
  assert.equal(parsePointsRules(null), null);
});

test("recovery-sensitive mode: a streak rung is a neutral logging bonus, other rows unchanged", () => {
  const t = (k: string) => (k === "streak_7" ? "A full week" : k === "full_day" ? "First full day" : null);
  const ach = (key: string): LedgerEntry => ({ ...e("s", "achievement", 100, "x", key), refLabel: "Achievement" });
  assert.deepEqual(ledgerLines(ach("streak_7"), t, true), { title: "Logging bonus", kind: "Earned · Achievement" });
  assert.deepEqual(ledgerLines(ach("streak_365"), t, true), { title: "Logging bonus", kind: "Earned · Achievement" });
  assert.deepEqual(ledgerLines(ach("streak_7"), t), { title: "A full week", kind: "Earned · Achievement" });
  assert.deepEqual(ledgerLines(ach("full_day"), t, true), { title: "First full day", kind: "Earned · Achievement" });
});
