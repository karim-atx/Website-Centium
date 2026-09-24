import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  contractionDurationSeconds,
  contractionSpacingSeconds,
  daysBetween,
  dueDateFromLmp,
  dueLabel,
  formatDuration,
  gestationOn,
  lmpFromDueDate,
  trimesterOf,
} from "./weeks.ts";

// --- dating -------------------------------------------------------------------

test("a due date is the last period plus 280 days", () => {
  assert.equal(dueDateFromLmp("2026-01-01"), "2026-10-08");
  assert.equal(daysBetween("2026-01-01", "2026-10-08"), 280);
});

test("the rule read backwards gives the last period", () => {
  assert.equal(lmpFromDueDate("2026-10-08"), "2026-01-01");
});

test("dating from an LMP and from the matching due date agree exactly", () => {
  const fromLmp = gestationOn("2026-04-01", { lmpDate: "2026-01-01" });
  const fromDue = gestationOn("2026-04-01", { dueDate: "2026-10-08" });
  assert.deepEqual(fromLmp, fromDue);
});

test("A DUE DATE WINS WHEN BOTH ARE PRESENT is NOT the rule — lmp is the basis", () => {
  // Both stored: the LMP is what the weeks are counted from, and the due date
  // is carried as given. A scan-corrected due date is stored by rewriting the
  // LMP, which is why lmpFromDueDate exists.
  const g = gestationOn("2026-04-01", { lmpDate: "2026-01-01", dueDate: "2026-10-15" })!;
  assert.equal(g.week, 12, "counted from the period, not from the later due date");
  assert.equal(g.daysUntilDue, daysBetween("2026-04-01", "2026-10-15"), "but the due date is its own");
});

test("week and day count from the last period, 0-based", () => {
  assert.deepEqual(pick(gestationOn("2026-01-01", { lmpDate: "2026-01-01" })!), { week: 0, day: 0 });
  assert.deepEqual(pick(gestationOn("2026-01-07", { lmpDate: "2026-01-01" })!), { week: 0, day: 6 });
  assert.deepEqual(pick(gestationOn("2026-01-08", { lmpDate: "2026-01-01" })!), { week: 1, day: 0 });
});

test("a pregnancy is about 4 weeks at the first missed period, not 2", () => {
  // The most common misunderstanding of gestational age, and the reason this
  // is counted from the LMP rather than from conception.
  const g = gestationOn("2026-01-29", { lmpDate: "2026-01-01" })!;
  assert.equal(g.week, 4);
});

test("neither date means no dating at all, rather than a guess", () => {
  assert.equal(gestationOn("2026-04-01", {}), null);
  assert.equal(gestationOn("2026-04-01", { lmpDate: null, dueDate: null }), null);
});

// --- trimesters ---------------------------------------------------------------

test("trimester boundaries are 14 and 28 weeks", () => {
  assert.equal(trimesterOf(0), 1);
  assert.equal(trimesterOf(13), 1);
  assert.equal(trimesterOf(14), 2, "the first day of the second trimester");
  assert.equal(trimesterOf(27), 2);
  assert.equal(trimesterOf(28), 3, "the first day of the third");
  assert.equal(trimesterOf(41), 3);
});

// --- progress and the due date ------------------------------------------------

test("progress is capped at 1 — past term is not 103% done", () => {
  const g = gestationOn("2026-10-20", { lmpDate: "2026-01-01" })!;
  assert.ok(g.daysUntilDue < 0);
  assert.equal(g.progress, 1);
});

test("a date before the last period is flagged rather than counted", () => {
  const g = gestationOn("2025-12-25", { lmpDate: "2026-01-01" })!;
  assert.equal(g.week, 0, "clamped, so nothing downstream divides by a negative");
  assert.equal(g.implausible, true);
});

test("past 42 weeks the dating is wrong, and says so", () => {
  assert.equal(gestationOn("2026-10-14", { lmpDate: "2026-01-01" })!.implausible, false);
  assert.equal(gestationOn("2026-11-01", { lmpDate: "2026-01-01" })!.implausible, true);
});

test("the due-date line reads plainly on both sides of the date", () => {
  assert.equal(dueLabel(gestationOn("2026-10-08", { lmpDate: "2026-01-01" })!), "Due today");
  assert.equal(dueLabel(gestationOn("2026-10-07", { lmpDate: "2026-01-01" })!), "Due in 1 day");
  assert.equal(dueLabel(gestationOn("2026-09-30", { lmpDate: "2026-01-01" })!), "Due in 8 days");
  assert.equal(
    dueLabel(gestationOn("2026-10-11", { lmpDate: "2026-01-01" })!),
    "3 days past your due date",
    "not a negative countdown, and not an alarm"
  );
});

// --- contractions -------------------------------------------------------------

test("SPACING IS START TO START, which is what 'five minutes apart' means", () => {
  // The gap between the END of one and the start of the next is a different,
  // longer number — and it is the measurement people use to decide when to go in.
  const spacing = contractionSpacingSeconds("2026-09-24T10:05:00Z", "2026-09-24T10:00:00Z");
  assert.equal(spacing, 300);
});

test("a contraction still running has no duration yet", () => {
  assert.equal(contractionDurationSeconds("2026-09-24T10:00:00Z", null), null);
  assert.equal(contractionDurationSeconds("2026-09-24T10:00:00Z", "2026-09-24T10:00:45Z"), 45);
});

test("durations read as seconds under a minute and as minutes above it", () => {
  assert.equal(formatDuration(45), "45s");
  assert.equal(formatDuration(60), "1m 00s");
  assert.equal(formatDuration(65), "1m 05s");
  assert.equal(formatDuration(125), "2m 05s");
});

function pick(g: { week: number; day: number }) {
  return { week: g.week, day: g.day };
}
