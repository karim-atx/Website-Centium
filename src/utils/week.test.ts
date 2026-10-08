import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  DAY_LETTERS,
  MONDAY_FIRST_JS_WEEKDAYS,
  dayLetter,
  jsWeekdayOfColumn,
  mondayFirstWeek,
  mondayIndex,
  monthLeadingBlanks,
  startOfWeek,
  startOfWeekISO,
} from "./week.ts";

test("X-13: the week runs Monday to Sunday", () => {
  // Thursday 8 October 2026.
  assert.deepEqual(mondayFirstWeek("2026-10-08"), [
    "2026-10-05",
    "2026-10-06",
    "2026-10-07",
    "2026-10-08",
    "2026-10-09",
    "2026-10-10",
    "2026-10-11",
  ]);
  // A Sunday belongs to the week that started six days earlier.
  assert.equal(mondayFirstWeek("2026-10-11")[0], "2026-10-05");
  // A Monday starts its own week.
  assert.equal(mondayFirstWeek("2026-10-12")[0], "2026-10-12");
  // Across a month and a year end.
  assert.equal(startOfWeekISO("2027-01-01"), "2026-12-28");
});

test("startOfWeek returns local midnight on the Monday", () => {
  const m = startOfWeek(new Date(2026, 9, 11, 22, 30));
  assert.equal(m.getDay(), 1);
  assert.equal(m.getDate(), 5);
  assert.equal(m.getHours(), 0);
});

test("stored weekdays are only reordered (0 = Sunday stays 0)", () => {
  assert.equal(mondayIndex(1), 0);
  assert.equal(mondayIndex(0), 6);
  assert.equal(mondayIndex(6), 5);
  for (let c = 0; c < 7; c++) assert.equal(mondayIndex(jsWeekdayOfColumn(c)), c);
  assert.deepEqual(MONDAY_FIRST_JS_WEEKDAYS, [0, 1, 2, 3, 4, 5, 6].map(jsWeekdayOfColumn));
});

test("month grids lead with the right number of blanks", () => {
  // June 2026 starts on a Monday, February 2026 on a Sunday, October 2026 on a Thursday.
  assert.equal(monthLeadingBlanks(2026, 5), 0);
  assert.equal(monthLeadingBlanks(2026, 1), 6);
  assert.equal(monthLeadingBlanks(2026, 9), 3);
});

test("letters follow the Monday-first order", () => {
  assert.deepEqual(DAY_LETTERS, ["M", "T", "W", "T", "F", "S", "S"]);
  assert.equal(dayLetter("2026-10-11"), "S");
  assert.equal(dayLetter("2026-10-05"), "M");
});
