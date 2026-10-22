import { test } from "node:test";
import assert from "node:assert/strict";
import { pickAchievements, streakNow, type EarnAchievement } from "./howToEarnModel.ts";

const a = (key: string, over: Partial<EarnAchievement> = {}): EarnAchievement => ({
  key,
  title: key,
  points: 25,
  groupKey: null,
  threshold: 10,
  currentValue: 0,
  sortOrder: 0,
  earnedAt: null,
  ...over,
});

test("the streak is the server's (streak achievements), else the Home logging streak", () => {
  assert.equal(streakNow([a("streak_7", { groupKey: "logging_streak", currentValue: 32 })], []), 32);
  assert.equal(streakNow(null, [{ category: "logging", days: 5 }]), 5);
  assert.equal(streakNow([a("first_workout")], [{ category: "movement", days: 3 }]), null);
});

test("two closest locked, then two most recent unlocked; never the streak ladder", () => {
  const list = [
    a("streak_7", { groupKey: "logging_streak", currentValue: 6, threshold: 7 }),
    a("far", { currentValue: 1, sortOrder: 1 }),
    a("near", { currentValue: 9, sortOrder: 2 }),
    a("mid", { currentValue: 5, sortOrder: 3 }),
    a("old", { earnedAt: "2026-01-01T00:00:00Z" }),
    a("new", { earnedAt: "2026-10-01T00:00:00Z" }),
    a("newer", { earnedAt: "2026-10-10T00:00:00Z" }),
  ];
  assert.deepEqual(pickAchievements(list).map((x) => x.key), ["near", "mid", "newer", "new"]);
});

test("fills from the other side when one runs short", () => {
  const list = [a("l1", { currentValue: 2 }), a("u1", { earnedAt: "2026-10-01" }), a("u2", { earnedAt: "2026-10-02" }), a("u3", { earnedAt: "2026-10-03" })];
  assert.deepEqual(pickAchievements(list).map((x) => x.key), ["l1", "u3", "u2", "u1"]);
  assert.deepEqual(pickAchievements([a("x")]).map((x) => x.key), ["x"]);
});
