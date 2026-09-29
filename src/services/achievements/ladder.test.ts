import test from "node:test";
import assert from "node:assert/strict";
import {
  toBadges,
  nextRungLabel,
  categoriesPresent,
  recentlyUnlocked,
  tierProgress,
  tierReached,
  earnedCount,
  type Achievement,
  type PointsSummary,
} from "./ladder";

function row(over: Partial<Achievement> & { key: string }): Achievement {
  return {
    category: "nutrition",
    title: over.key,
    description: "",
    icon: "🍎",
    points: 50,
    groupKey: null,
    level: null,
    threshold: 1,
    currentValue: 0,
    sortOrder: 1,
    earnedAt: null,
    newlyEarned: false,
    ...over,
  };
}

/** The food_logs ladder: 50 / 250 / 1000, bronze / silver / gold. */
function foodLadder(current: number, earnedThrough: number): Achievement[] {
  return [
    ["food_logs_bronze", "bronze", 50, 50, 3],
    ["food_logs_silver", "silver", 250, 150, 4],
    ["food_logs_gold", "gold", 1000, 400, 5],
  ].map(([key, level, threshold, points, sortOrder]) =>
    row({
      key: key as string,
      title: key as string,
      groupKey: "food_logs",
      level: level as Achievement["level"],
      threshold: threshold as number,
      points: points as number,
      sortOrder: sortOrder as number,
      currentValue: current,
      earnedAt: (threshold as number) <= earnedThrough ? "2026-09-01T00:00:00Z" : null,
    })
  );
}

test("a one-off becomes a badge of one rung", () => {
  const [badge] = toBadges([row({ key: "first_food_log", currentValue: 0 })]);
  assert.equal(badge.rungs.length, 1);
  assert.equal(badge.id, "first_food_log");
  assert.equal(badge.earned, null);
  assert.equal(badge.next?.key, "first_food_log");
  assert.equal(badge.remaining, 1);
  assert.equal(badge.progress, 0);
});

test("an earned one-off is finished, not partway", () => {
  const [badge] = toBadges([
    row({ key: "first_food_log", currentValue: 1, earnedAt: "2026-09-01T00:00:00Z" }),
  ]);
  assert.equal(badge.next, null);
  assert.equal(badge.earned?.key, "first_food_log");
  assert.equal(badge.progress, 1);
  assert.equal(badge.remaining, null);
  assert.equal(badge.pointsEarned, 50);
});

test("a ladder collapses into one badge, ordered by threshold", () => {
  const badges = toBadges(foodLadder(0, 0));
  assert.equal(badges.length, 1);
  assert.deepEqual(
    badges[0].rungs.map((r) => r.key),
    ["food_logs_bronze", "food_logs_silver", "food_logs_gold"]
  );
});

test("rows arriving out of order still ladder in threshold order", () => {
  const shuffled = [foodLadder(0, 0)[2], foodLadder(0, 0)[0], foodLadder(0, 0)[1]];
  const [badge] = toBadges(shuffled);
  assert.deepEqual(
    badge.rungs.map((r) => r.threshold),
    [50, 250, 1000]
  );
});

test("PROGRESS MEASURES FROM THE RUNG BELOW, NOT FROM ZERO", () => {
  // 120 logs: bronze (50) earned, silver (250) next. Measured from 50, that is
  // 70 of the 200 between the rungs — not 120/250.
  const [badge] = toBadges(foodLadder(120, 50));
  assert.equal(badge.earned?.key, "food_logs_bronze");
  assert.equal(badge.next?.key, "food_logs_silver");
  assert.equal(badge.remaining, 130);
  assert.equal(Math.round(badge.progress * 1000) / 1000, 0.35);
});

test("the first rung measures from zero", () => {
  const [badge] = toBadges(foodLadder(25, 0));
  assert.equal(badge.progress, 0.5);
  assert.equal(badge.remaining, 25);
});

test("a finished ladder displays its top rung and shows no remainder", () => {
  const [badge] = toBadges(foodLadder(1200, 1000));
  assert.equal(badge.next, null);
  assert.equal(badge.display.key, "food_logs_gold");
  assert.equal(badge.progress, 1);
  assert.equal(badge.remaining, null);
  assert.equal(badge.pointsEarned, 600);
});

test("an unfinished ladder displays the rung being chased", () => {
  const [badge] = toBadges(foodLadder(120, 50));
  assert.equal(badge.display.key, "food_logs_silver");
});

test("THE SEVEN-RUNG STREAK LADDER HAS NO LEVELS AND NEEDS NO SPECIAL CASE", () => {
  const rungs = [3, 7, 14, 30, 60, 100, 365].map((t, i) =>
    row({
      key: `streak_${t}`,
      title: `Streak ${t}`,
      category: "consistency",
      groupKey: "logging_streak",
      level: null,
      threshold: t,
      sortOrder: i + 1,
      currentValue: 20,
      earnedAt: t <= 14 ? "2026-09-01T00:00:00Z" : null,
    })
  );
  const [badge] = toBadges(rungs);
  assert.equal(badge.rungs.length, 7);
  assert.equal(badge.earned?.key, "streak_14");
  assert.equal(badge.next?.key, "streak_30");
  assert.equal(badge.remaining, 10);
  // Measured from 14, so 6 of the 16 between the rungs.
  assert.equal(Math.round(badge.progress * 100) / 100, 0.38);
});

test("A BROKEN STREAK SHOWS A BAR THAT WENT DOWN BESIDE A BADGE THAT DID NOT", () => {
  // Earned streak_30 in the past; current_days has since fallen to 2.
  const rungs = [3, 7, 14, 30].map((t) =>
    row({
      key: `streak_${t}`,
      category: "consistency",
      groupKey: "logging_streak",
      threshold: t,
      currentValue: 2,
      earnedAt: "2026-08-01T00:00:00Z",
    })
  );
  const [badge] = toBadges(rungs);
  assert.equal(badge.earned?.key, "streak_30", "the badge stays earned");
  assert.equal(badge.next, null, "nothing left to chase on this ladder");
  assert.equal(badge.progress, 1);
});

test("progress never goes below 0 or above 1", () => {
  const [under] = toBadges(foodLadder(-5, 0));
  assert.equal(under.progress, 0);
  const [over] = toBadges(foodLadder(900, 250));
  assert.ok(over.progress <= 1);
});

test("nextRungLabel names the LEVEL when the rung has one", () => {
  const [badge] = toBadges(foodLadder(120, 50));
  assert.equal(nextRungLabel(badge), "130 more to reach Silver");
});

test("nextRungLabel names the TITLE when the rung has no level", () => {
  const rungs = [3, 7].map((t) =>
    row({
      key: `streak_${t}`,
      title: t === 7 ? "A full week" : "Three in a row",
      category: "consistency",
      groupKey: "logging_streak",
      threshold: t,
      currentValue: 4,
      earnedAt: t === 3 ? "2026-09-01T00:00:00Z" : null,
    })
  );
  assert.equal(nextRungLabel(toBadges(rungs)[0]), "3 more to reach A full week");
});

test("nextRungLabel is null once a ladder is finished", () => {
  assert.equal(nextRungLabel(toBadges(foodLadder(1200, 1000))[0]), null);
});

test("nextRungLabel groups thousands", () => {
  const [badge] = toBadges(foodLadder(0, 0));
  assert.equal(nextRungLabel(toBadges(foodLadder(250, 250))[0]), "750 more to reach Gold");
  assert.equal(badge.remaining, 50);
});

test("badges come back in the catalogue's category order", () => {
  const badges = toBadges([
    row({ key: "app_review_left", category: "community", sortOrder: 3 }),
    row({ key: "onboarded", category: "getting_started", sortOrder: 1 }),
    row({ key: "first_workout", category: "training", sortOrder: 1 }),
  ]);
  assert.deepEqual(
    badges.map((b) => b.category),
    ["getting_started", "training", "community"]
  );
});

test("within a category, badges keep sort_order", () => {
  const badges = toBadges([
    row({ key: "recipe_created", sortOrder: 6 }),
    row({ key: "first_food_log", sortOrder: 1 }),
    row({ key: "full_day", sortOrder: 2 }),
  ]);
  assert.deepEqual(
    badges.map((b) => b.id),
    ["first_food_log", "full_day", "recipe_created"]
  );
});

test("a ladder sits where its LOWEST rung sits", () => {
  const badges = toBadges([
    row({ key: "recipe_created", sortOrder: 6 }),
    ...foodLadder(0, 0), // sort orders 3, 4, 5
    row({ key: "first_food_log", sortOrder: 1 }),
  ]);
  assert.deepEqual(
    badges.map((b) => b.id),
    ["first_food_log", "food_logs", "recipe_created"]
  );
});

test("categoriesPresent lists only what is there, in catalogue order", () => {
  const badges = toBadges([
    row({ key: "app_review_left", category: "community" }),
    row({ key: "onboarded", category: "getting_started" }),
  ]);
  assert.deepEqual(categoriesPresent(badges), ["getting_started", "community"]);
});

test("categoriesPresent is empty for no badges", () => {
  assert.deepEqual(categoriesPresent([]), []);
});

test("recentlyUnlocked is newest first and ignores the locked", () => {
  const rows = [
    row({ key: "a", earnedAt: "2026-09-01T00:00:00Z" }),
    row({ key: "b", earnedAt: null }),
    row({ key: "c", earnedAt: "2026-09-20T00:00:00Z" }),
    row({ key: "d", earnedAt: "2026-09-10T00:00:00Z" }),
  ];
  assert.deepEqual(
    recentlyUnlocked(rows).map((r) => r.key),
    ["c", "d", "a"]
  );
});

test("recentlyUnlocked honours its limit", () => {
  const rows = ["a", "b", "c", "d"].map((k, i) =>
    row({ key: k, earnedAt: `2026-09-0${i + 1}T00:00:00Z` })
  );
  assert.equal(recentlyUnlocked(rows, 2).length, 2);
  assert.equal(recentlyUnlocked([], 3).length, 0);
});

function summary(over: Partial<PointsSummary>): PointsSummary {
  return {
    balance: 0,
    tierName: "Bronze",
    tierMinPoints: 0,
    nextTierName: "Silver",
    nextTierMinPoints: 1000,
    pointsToNextTier: 1000,
    achievementPoints: 0,
    referralPoints: 0,
    otherPoints: 0,
    achievementsEarned: 0,
    ...over,
  };
}

test("tierProgress measures across the current tier's span", () => {
  // Silver 1000 -> Gold 3000, balance 2000: halfway.
  assert.equal(
    tierProgress(
      summary({
        balance: 2000,
        tierName: "Silver",
        tierMinPoints: 1000,
        nextTierName: "Gold",
        nextTierMinPoints: 3000,
      })
    ),
    0.5
  );
});

test("tierProgress is 1 at the top of the ladder", () => {
  assert.equal(
    tierProgress(
      summary({
        balance: 20000,
        tierName: "Diamond",
        tierMinPoints: 15000,
        nextTierName: null,
        nextTierMinPoints: null,
        pointsToNextTier: null,
      })
    ),
    1
  );
});

test("tierProgress is 0 for a brand-new account", () => {
  assert.equal(tierProgress(summary({})), 0);
});

test("tierReached lights a pip only once its floor is reached", () => {
  const s = summary({ balance: 1000, tierName: "Silver", tierMinPoints: 1000 });
  assert.equal(tierReached({ name: "Bronze", minPoints: 0, sortOrder: 1 }, s), true);
  assert.equal(tierReached({ name: "Silver", minPoints: 1000, sortOrder: 2 }, s), true);
  assert.equal(tierReached({ name: "Gold", minPoints: 3000, sortOrder: 3 }, s), false);
});

test("earnedCount counts the whole active catalogue", () => {
  const rows = [
    row({ key: "a", earnedAt: "2026-09-01T00:00:00Z" }),
    row({ key: "b" }),
    row({ key: "c", earnedAt: "2026-09-02T00:00:00Z" }),
  ];
  assert.deepEqual(earnedCount(rows), { earned: 2, total: 3 });
  assert.deepEqual(earnedCount([]), { earned: 0, total: 0 });
});
