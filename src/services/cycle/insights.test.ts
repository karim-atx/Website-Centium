import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  cycleLengths,
  cycleStats,
  hasEnoughForInsights,
  periodLengths,
  periodStarts,
  symptomGrid,
} from "./insights.ts";
import type { CycleDayLog, Symptom } from "./types.ts";

/** A logged day, with only what a test cares about. */
const day = (date: string, extra: Partial<CycleDayLog> = {}): CycleDayLog => ({
  date,
  flow: null,
  isPeriod: false,
  symptoms: [],
  mood: [],
  energy: null,
  cervicalMucus: null,
  bbtCelsius: null,
  lhTest: null,
  pregnancyTest: null,
  sexActivity: null,
  notes: null,
  ...extra,
});

const period = (date: string, extra: Partial<CycleDayLog> = {}) =>
  day(date, { isPeriod: true, ...extra });

// --- finding the starts -------------------------------------------------------

test("a start is a period day whose previous day was not one", () => {
  const logs = [
    period("2026-01-01"),
    period("2026-01-02"),
    period("2026-01-03"),
    period("2026-01-29"),
    period("2026-01-30"),
  ];
  assert.deepEqual(periodStarts(logs), ["2026-01-01", "2026-01-29"]);
});

test("five period days are ONE start, not five", () => {
  const logs = ["01", "02", "03", "04", "05"].map((d) => period(`2026-03-${d}`));
  assert.equal(periodStarts(logs).length, 1);
});

test("a one-day period is still a start", () => {
  assert.deepEqual(periodStarts([period("2026-05-04")]), ["2026-05-04"]);
});

test("starts come back oldest first whatever order they were logged in", () => {
  const logs = [period("2026-02-10"), period("2026-01-01"), period("2026-03-05")];
  assert.deepEqual(periodStarts(logs), ["2026-01-01", "2026-02-10", "2026-03-05"]);
});

// --- cycle lengths ------------------------------------------------------------

test("a cycle is the GAP BETWEEN two starts, so one period is no cycle", () => {
  assert.deepEqual(cycleLengths([period("2026-01-01")]), []);
  assert.equal(hasEnoughForInsights([period("2026-01-01")]), false);
});

test("two starts make one cycle length", () => {
  const logs = [period("2026-01-01"), period("2026-01-29")];
  assert.deepEqual(cycleLengths(logs), [{ startDate: "2026-01-01", days: 28 }]);
  assert.equal(hasEnoughForInsights(logs), true);
});

test("the history keeps the most recent six and drops older ones", () => {
  // Eight starts, 30 days apart, is seven cycles; the chart shows six.
  const logs = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 0, 1 + i * 30));
    return period(d.toISOString().slice(0, 10));
  });
  const stats = cycleStats(logs);
  assert.equal(stats.history.length, 6);
  assert.equal(stats.history[stats.history.length - 1].days, 30, "the newest is last");
});

test("cycle lengths cross a month and a year boundary correctly", () => {
  const logs = [period("2025-12-20"), period("2026-01-17")];
  assert.equal(cycleLengths(logs)[0].days, 28);
});

// --- period lengths -----------------------------------------------------------

test("a period is measured only once it has ENDED", () => {
  // Three period days with nothing logged after them: still in progress, so
  // reporting "3 days" would be reporting a period on its third morning.
  assert.deepEqual(periodLengths([period("2026-01-01"), period("2026-01-02"), period("2026-01-03")]), []);
});

test("a period followed by a logged non-period day has a length", () => {
  const logs = [period("2026-01-01"), period("2026-01-02"), day("2026-01-03")];
  assert.deepEqual(periodLengths(logs), [2]);
});

test("an earlier period is complete once a later day exists at all", () => {
  const logs = [period("2026-01-01"), period("2026-01-02"), period("2026-01-29")];
  assert.deepEqual(periodLengths(logs), [2], "the January 29th one is still open");
});

// --- the statistics -----------------------------------------------------------

test("averages are over what exists, and are null when nothing does", () => {
  const empty = cycleStats([]);
  assert.equal(empty.averageCycle, null, "never 0 — a zero-day cycle is not a cycle");
  assert.equal(empty.averagePeriod, null);
  assert.equal(empty.variationDays, null);
  assert.deepEqual(empty.history, []);
});

test("one cycle has an average and NO variation", () => {
  const stats = cycleStats([period("2026-01-01"), period("2026-01-29")]);
  assert.equal(stats.averageCycle, 28);
  assert.equal(stats.variationDays, null, "a single length varies from nothing");
});

test("variation is the spread between the shortest and longest cycle", () => {
  const logs = [period("2026-01-01"), period("2026-01-26"), period("2026-03-02")];
  const stats = cycleStats(logs);
  assert.deepEqual(cycleLengths(logs).map((c) => c.days), [25, 35]);
  assert.equal(stats.variationDays, 10);
  assert.equal(stats.averageCycle, 30);
});

// --- the symptom grid ---------------------------------------------------------

test("symptoms are counted in the phase of the day they were logged", () => {
  // A 28-day cycle with a 14-day luteal phase ovulates on day 14.
  const logs: CycleDayLog[] = [
    period("2026-01-01", { symptoms: ["cramps"] as Symptom[] }),
    period("2026-01-02", { symptoms: ["cramps"] as Symptom[] }),
    day("2026-01-07", { symptoms: ["acne"] as Symptom[] }),
    day("2026-01-14", { symptoms: ["bloating"] as Symptom[] }),
    day("2026-01-24", { symptoms: ["bloating", "fatigue"] as Symptom[] }),
    period("2026-01-29"),
  ];
  const grid = symptomGrid(logs, 14);
  assert.equal(grid.counts.cramps.menstrual, 2);
  assert.equal(grid.counts.acne.follicular, 1);
  assert.equal(grid.counts.bloating.ovulatory, 1, "day 14 of a 28-day cycle");
  assert.equal(grid.counts.bloating.luteal, 1, "day 24");
  assert.equal(grid.counts.fatigue.luteal, 1);
});

test("the most-logged symptom is listed first", () => {
  const logs: CycleDayLog[] = [
    period("2026-01-01", { symptoms: ["headache"] as Symptom[] }),
    period("2026-01-02", { symptoms: ["cramps"] as Symptom[] }),
    period("2026-01-03", { symptoms: ["cramps"] as Symptom[] }),
    period("2026-01-29"),
  ];
  assert.deepEqual(symptomGrid(logs, 14).symptoms, ["cramps", "headache"]);
});

test("a day BEFORE any known period has no phase and is skipped", () => {
  // Bucketing it into follicular would invent the most common answer.
  const logs: CycleDayLog[] = [
    day("2025-12-20", { symptoms: ["nausea"] as Symptom[] }),
    period("2026-01-01"),
    period("2026-01-29"),
  ];
  const grid = symptomGrid(logs, 14);
  assert.equal(grid.counts.nausea, undefined, "not counted anywhere");
  assert.deepEqual(grid.symptoms, []);
});

test("a non-period day in the OPEN final cycle is skipped, not guessed", () => {
  // Its cycle has no closing start, so there is no ovulation day to place it
  // against — and a phase without one would be a guess.
  const logs: CycleDayLog[] = [
    period("2026-01-01"),
    period("2026-01-29"),
    day("2026-02-10", { symptoms: ["cravings"] as Symptom[] }),
  ];
  assert.equal(symptomGrid(logs, 14).counts.cravings, undefined);
});

test("a period day in the open final cycle IS counted — it needs no ovulation day", () => {
  const logs: CycleDayLog[] = [
    period("2026-01-01"),
    period("2026-01-29", { symptoms: ["cramps"] as Symptom[] }),
  ];
  assert.equal(symptomGrid(logs, 14).counts.cramps.menstrual, 1);
});

test("nothing logged produces an empty grid, not a grid of zeroes", () => {
  const grid = symptomGrid([], 14);
  assert.deepEqual(grid.symptoms, []);
  assert.deepEqual(grid.daysInPhase, { menstrual: 0, follicular: 0, ovulatory: 0, luteal: 0 });
});

test("the phase denominators count logged days, so a rate can be honest", () => {
  const logs: CycleDayLog[] = [
    period("2026-01-01"),
    period("2026-01-02"),
    day("2026-01-08"),
    day("2026-01-20"),
    period("2026-01-29"),
  ];
  const grid = symptomGrid(logs, 14);
  assert.equal(grid.daysInPhase.menstrual, 3, "two in January plus the 29th");
  assert.equal(grid.daysInPhase.follicular, 1);
  assert.equal(grid.daysInPhase.luteal, 1);
});
