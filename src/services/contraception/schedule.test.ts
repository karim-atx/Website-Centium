import { strict as assert } from "node:assert";
import { test } from "node:test";
import { packDays, planRow, validatePlan } from "./schedule.ts";

const base = { startedOn: "2026-09-01" };
import {
  bmiApplies,
  expectedGainByWeek,
  gainRangeFor,
  gainSoFar,
  gainVerdict,
} from "../pregnancy/weight.ts";

// --- the pack -----------------------------------------------------------------

const pack21 = { packStartDate: "2026-09-01", activeDays: 21, breakDays: 7 };

test("a 21/7 pack is 28 days, active then break", () => {
  const p = packDays(pack21, "2026-09-01")!;
  assert.equal(p.days.length, 28);
  assert.equal(p.currentDay, 1);
  assert.equal(p.phase, "active");
  assert.equal(p.days[20].phase, "active", "day 21 is the last active one");
  assert.equal(p.days[21].phase, "break", "day 22 starts the break");
});

test("the pack REPEATS, so a pack started months ago still resolves", () => {
  // 56 days on is exactly two packs later: day 1 again.
  const p = packDays(pack21, "2026-10-27")!;
  assert.equal(p.currentDay, 1);
  assert.equal(p.phase, "active");
});

test("day 22 of a 21/7 pack is a break day", () => {
  const p = packDays(pack21, "2026-09-22")!;
  assert.equal(p.currentDay, 22);
  assert.equal(p.phase, "break");
});

test("a date BEFORE the pack started still resolves rather than going negative", () => {
  // Scrubbing backwards is a real thing to do, and a negative modulo would
  // index outside the array.
  const p = packDays(pack21, "2026-08-25")!;
  assert.ok(p.currentDay >= 1 && p.currentDay <= 28);
});

test("a continuous pack has no break days at all", () => {
  const p = packDays({ packStartDate: "2026-09-01", activeDays: 28, breakDays: 0 }, "2026-09-28")!;
  assert.equal(p.days.filter((d) => d.phase === "break").length, 0);
  assert.equal(p.phase, "active");
});

// --- the shape the CHECK constraint demands -----------------------------------

test("EVERY OTHER METHOD'S COLUMNS ARE NULLED, which the CHECK requires", () => {
  // Switching pill -> ring while leaving active_days set is refused by
  // contraception_plans_schedule_shape_check, as a 23514 the user cannot act on.
  const row = planRow({ ...base, method: "ring", insertedOn: "2026-09-01", weeksIn: 3, weeksOut: 1 });
  assert.equal(row.active_days, null);
  assert.equal(row.break_days, null);
  assert.equal(row.pack_start_date, null);
  assert.equal(row.reminder_time, null);
  assert.equal(row.inserted_on, "2026-09-01");
  assert.equal(row.weeks_in, 3);
});

test("a pill row carries only the pill columns", () => {
  const row = planRow({ ...base, method: "pill_progestin", ...camel(pack21), reminderTime: "08:00" });
  assert.equal(row.active_days, 21);
  assert.equal(row.inserted_on, null);
  assert.equal(row.last_given_on, null);
  assert.equal(row.replace_by, null);
});

test("a method with no schedule carries no schedule columns", () => {
  const row = planRow({ ...base, method: "condom" });
  for (const k of ["active_days", "pack_start_date", "inserted_on", "last_given_on", "replace_by"]) {
    assert.equal(row[k], null, `${k} should be null`);
  }
});

test("validation mirrors each branch's bounds", () => {
  assert.equal(validatePlan({ ...base, method: "pill_combined", ...camel(pack21) }), null);
  assert.match(
    validatePlan({ ...base, method: "pill_combined", packStartDate: "2026-09-01", activeDays: 10, breakDays: 7 })!,
    /between 20 and 28/
  );
  // 28 + 7 = 35 is the LARGEST legal pack, so the total check can only fail
  // on the low side: 20 active days with no break is 20, one short of 21.
  assert.equal(
    validatePlan({ ...base, method: "pill_combined", packStartDate: "2026-09-01", activeDays: 28, breakDays: 7 }),
    null,
    "35 days is legal"
  );
  assert.match(
    validatePlan({ ...base, method: "pill_combined", packStartDate: "2026-09-01", activeDays: 20, breakDays: 0 })!,
    /21 and 35 days in total/
  );
  assert.match(validatePlan({ ...base, method: "ring", insertedOn: "2026-09-01", weeksIn: 9, weeksOut: 1 })!, /1 and 4/);
  assert.match(
    validatePlan({ ...base, method: "injection", lastGivenOn: "2026-09-01", intervalWeeks: 2 })!,
    /4 and 16 weeks/
  );
  assert.match(
    validatePlan({ ...base, method: "implant", insertedOn: "2026-09-01", replaceBy: "2026-08-01" })!,
    /after it was fitted/
  );
});

// --- pregnancy weight gain ----------------------------------------------------

test("the IOM band is picked by pre-pregnancy BMI", () => {
  // 55 kg at 165 cm is BMI 20.2. (50 kg would be 18.4 — under, not within.)
  assert.equal(gainRangeFor(165, 55)!.range.label, "18.5–24.9");
  assert.equal(gainRangeFor(165, 45)!.range.label, "Under 18.5");
  assert.equal(gainRangeFor(165, 75)!.range.label, "25–29.9");
  assert.equal(gainRangeFor(165, 90)!.range.label, "30 and over");
});

test("the exact IOM ranges, in kg", () => {
  assert.deepEqual(kg(gainRangeFor(165, 45)!), { minKg: 12.5, maxKg: 18 });
  assert.deepEqual(kg(gainRangeFor(165, 60)!), { minKg: 11.5, maxKg: 16 });
  assert.deepEqual(kg(gainRangeFor(165, 75)!), { minKg: 7, maxKg: 11.5 });
  assert.deepEqual(kg(gainRangeFor(165, 90)!), { minKg: 5, maxKg: 9 });
});

test("NO HEIGHT OR NO PRE-PREGNANCY WEIGHT MEANS NO RANGE, never a default body", () => {
  assert.equal(gainRangeFor(null, 60), null);
  assert.equal(gainRangeFor(165, null), null);
  assert.equal(gainRangeFor(0, 60), null);
});

test("the first trimester is not a thirteenth of the total gain", () => {
  const range = gainRangeFor(165, 60)!;
  const week10 = expectedGainByWeek(range, 10)!;
  // Spreading 11.5-16 kg evenly over 40 weeks would expect ~3-4 kg by week 10.
  assert.ok(week10.maxKg <= 2, `expected at most 2 kg by week 10, got ${week10.maxKg}`);
});

test("expected gain reaches the band's own range at term", () => {
  const range = gainRangeFor(165, 60)!;
  const term = expectedGainByWeek(range, 40)!;
  assert.equal(term.minKg, 11.5);
  assert.equal(term.maxKg, 16);
});

test("a gain is reported against the band, never judged", () => {
  const expected = { minKg: 5, maxKg: 8 };
  assert.equal(gainVerdict(4, expected), "below");
  assert.equal(gainVerdict(6, expected), "within");
  assert.equal(gainVerdict(9, expected), "above");
  assert.equal(gainVerdict(5, expected), "within", "the bounds are inclusive");
});

test("gain so far needs both weights", () => {
  assert.equal(gainSoFar(60, 66.4), 6.4);
  assert.equal(gainSoFar(null, 66), null);
  assert.equal(gainSoFar(60, null), null);
});

// --- when a BMI means anything ------------------------------------------------

test("BMI DOES NOT APPLY DURING A PREGNANCY, which is the whole point", () => {
  assert.equal(bmiApplies({ pregnancyActive: true, postpartumUntil: null }, "2026-09-25"), false);
});

test("nor through the postpartum window, up to and including its last day", () => {
  const after = { pregnancyActive: false, postpartumUntil: "2026-12-18" };
  assert.equal(bmiApplies(after, "2026-09-25"), false);
  assert.equal(bmiApplies(after, "2026-12-18"), false, "the last day is still inside it");
  assert.equal(bmiApplies(after, "2026-12-19"), true, "the day after, it reads again");
});

test("a loss leaves no postpartum window, so BMI is not withheld", () => {
  // postpartum_until is only set for a birth — endPregnancy() nulls it
  // otherwise — so this is the shape an ended-in-loss pregnancy leaves behind.
  assert.equal(bmiApplies({ pregnancyActive: false, postpartumUntil: null }, "2026-09-25"), true);
});

test("no pregnancy at all is the ordinary case", () => {
  assert.equal(bmiApplies({ pregnancyActive: false, postpartumUntil: null }, "2026-01-01"), true);
});

function camel(p: { packStartDate: string; activeDays: number; breakDays: number }) {
  return { packStartDate: p.packStartDate, activeDays: p.activeDays, breakDays: p.breakDays };
}
function kg(g: { minKg: number; maxKg: number }) {
  return { minKg: g.minKg, maxKg: g.maxKg };
}
