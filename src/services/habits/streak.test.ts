import { strict as assert } from "node:assert";
import { test } from "node:test";
import { habitStreak, isDoneOn, shiftDay } from "./streak.ts";

const TODAY = "2026-09-29";
const back = (n: number) => shiftDay(TODAY, -n);

test("no completions is no streak", () => {
  assert.equal(habitStreak([], TODAY), 0);
});

test("done today alone is a one-day streak", () => {
  assert.equal(habitStreak([TODAY], TODAY), 1);
});

test("a run counts back through consecutive days", () => {
  assert.equal(habitStreak([TODAY, back(1), back(2), back(3)], TODAY), 4);
});

test("TODAY NOT DONE YET DOES NOT BREAK THE RUN", () => {
  // 9am, box unticked: the streak is yesterday's run, not zero.
  assert.equal(habitStreak([back(1), back(2), back(3)], TODAY), 3);
});

test("a whole missed day does end it", () => {
  // Nothing today and nothing yesterday — the run is over.
  assert.equal(habitStreak([back(2), back(3), back(4)], TODAY), 0);
});

test("a gap stops the count where the gap is", () => {
  // back(2) is missing, so the run is today + yesterday only.
  assert.equal(habitStreak([TODAY, back(1), back(3), back(4)], TODAY), 2);
});

test("order and duplicates do not matter", () => {
  // Rows come back ordered by the database, but nothing should depend on it,
  // and a date arriving twice must not count twice.
  assert.equal(habitStreak([back(2), TODAY, back(1), TODAY], TODAY), 3);
});

test("the run crosses a month boundary", () => {
  assert.equal(
    habitStreak(["2026-10-01", "2026-09-30", "2026-09-29"], "2026-10-01"),
    3
  );
});

test("the run crosses a leap day", () => {
  assert.equal(
    habitStreak(["2028-03-01", "2028-02-29", "2028-02-28"], "2028-03-01"),
    3
  );
});

test("future dates are not counted into the run", () => {
  // A row dated tomorrow cannot extend a streak that ends today; the walk
  // only ever goes backwards.
  assert.equal(habitStreak([shiftDay(TODAY, 1), TODAY], TODAY), 1);
});

test("done is about today and nothing else", () => {
  assert.equal(isDoneOn([TODAY], TODAY), true);
  assert.equal(isDoneOn([back(1)], TODAY), false);
  assert.equal(isDoneOn([], TODAY), false);
});

test("shiftDay is UTC arithmetic across a DST change", () => {
  // Europe springs forward on 2026-03-29; a local-time implementation would
  // land on the wrong day here.
  assert.equal(shiftDay("2026-03-29", -1), "2026-03-28");
  assert.equal(shiftDay("2026-03-28", 1), "2026-03-29");
});
