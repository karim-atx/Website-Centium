import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  currentDayStreak,
  dayEarned,
  dayStreakLabel,
  subGoalsMet,
  type DayGoalSources,
} from "./dayStreak.ts";

const EMPTY: DayGoalSources = {
  foodLog: [],
  waterByDate: {},
  workoutLog: [],
  journalEntries: [],
};

/** A source where each listed day met exactly the sub-goals named. */
function on(days: Record<string, Array<"food" | "water" | "workout" | "journal">>): DayGoalSources {
  const entries = Object.entries(days);
  return {
    foodLog: entries.filter(([, g]) => g.includes("food")).map(([date]) => ({ date })),
    waterByDate: Object.fromEntries(
      entries.filter(([, g]) => g.includes("water")).map(([date]) => [date, 1.5])
    ),
    workoutLog: entries
      .filter(([, g]) => g.includes("workout"))
      .map(([date]) => ({ date, completed: true })),
    journalEntries: entries.filter(([, g]) => g.includes("journal")).map(([date]) => ({ date })),
  };
}

// --- the four sub-goals -------------------------------------------------------

test("each of the four counts once, and an unlogged day counts none", () => {
  assert.equal(subGoalsMet(EMPTY, "2026-09-24"), 0);
  assert.equal(subGoalsMet(on({ "2026-09-24": ["food"] }), "2026-09-24"), 1);
  assert.equal(
    subGoalsMet(on({ "2026-09-24": ["food", "water", "workout", "journal"] }), "2026-09-24"),
    4
  );
});

test("water counts only when some was actually logged", () => {
  const none: DayGoalSources = { ...EMPTY, waterByDate: { "2026-09-24": 0 } };
  assert.equal(subGoalsMet(none, "2026-09-24"), 0, "a zero-litre day is not a logged day");
});

test("an abandoned workout does not count — only a completed one", () => {
  const abandoned: DayGoalSources = {
    ...EMPTY,
    workoutLog: [{ date: "2026-09-24", completed: false }],
  };
  assert.equal(subGoalsMet(abandoned, "2026-09-24"), 0);
});

test("two of four earns the day; one does not", () => {
  assert.equal(dayEarned(on({ "2026-09-24": ["food"] }), "2026-09-24"), false);
  assert.equal(dayEarned(on({ "2026-09-24": ["food", "water"] }), "2026-09-24"), true);
});

// --- the walk backwards -------------------------------------------------------

test("consecutive earned days count, and the gap before them stops the walk", () => {
  const s = on({
    "2026-09-24": ["food", "water"],
    "2026-09-23": ["food", "workout"],
    "2026-09-22": ["water", "journal"],
    // 09-21 missing entirely
    "2026-09-20": ["food", "water"],
  });
  assert.equal(currentDayStreak(s, "2026-09-24"), 3, "the 20th is cut off by the 21st");
});

test("TODAY NOT YET EARNED does not zero a streak that is otherwise intact", () => {
  // The bug this guards: most of the day, today has nothing logged yet.
  const s = on({
    "2026-09-23": ["food", "water"],
    "2026-09-22": ["food", "water"],
  });
  assert.equal(currentDayStreak(s, "2026-09-24"), 2);
});

test("today half-logged is still not earned, and still does not break the run", () => {
  const s = on({
    "2026-09-24": ["food"],
    "2026-09-23": ["food", "water"],
  });
  assert.equal(currentDayStreak(s, "2026-09-24"), 1);
});

test("a completed past day that was not earned DOES end it", () => {
  const s = on({
    "2026-09-24": ["food", "water"],
    "2026-09-23": ["food"],
    "2026-09-22": ["food", "water"],
  });
  assert.equal(currentDayStreak(s, "2026-09-24"), 1);
});

test("nothing logged, ever, is a streak of zero rather than a crash", () => {
  assert.equal(currentDayStreak(EMPTY, "2026-09-24"), 0);
});

test("the walk crosses a month boundary rather than stopping at the 1st", () => {
  const s = on({
    "2026-09-01": ["food", "water"],
    "2026-08-31": ["food", "water"],
    "2026-08-30": ["food", "water"],
  });
  assert.equal(currentDayStreak(s, "2026-09-01"), 3);
});

// --- what the sidebar prints --------------------------------------------------

test("a real streak is named by its length", () => {
  assert.equal(dayStreakLabel(1), "1 day streak");
  assert.equal(dayStreakLabel(7), "7 day streak");
});

test('no streak says so honestly, never "0 day streak" and never a made-up 7', () => {
  // The literal this replaces: the sidebar printed "7 day streak" to every
  // account on every page, including ones that had logged nothing at all.
  assert.equal(dayStreakLabel(0), "Start a streak today");
  assert.notEqual(dayStreakLabel(0), "7 day streak");
});
