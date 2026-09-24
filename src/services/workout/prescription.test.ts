import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  blockHeading,
  formatEndurancePlan,
  formatPace,
  formatSeconds,
  isRoundBased,
  prescriptionLine,
} from "./prescription.ts";
import type { EndurancePlan, Exercise, WorkoutBlock } from "../../types";

// A TABLE, NOT A SCRIPT. Every rule in the formatter is one row, so a rule
// that changes shows up as one failing case naming itself rather than as a
// diff in a wall of assertions.
//
// Run with `npm test` — node:test, no framework, using Node's own TypeScript
// stripping. The formatter imports nothing but types, which is what makes that
// possible and is worth keeping true.

/** The fields every case shares, so each row states only what it is about. */
const base: Exercise = {
  id: "e1",
  name: "Back Squat",
  sets: 0,
  reps: 0,
  weightKg: 0,
  classification: "barbell",
};

const ex = (patch: Partial<Exercise>): Exercise => ({ ...base, ...patch });

const cases: { name: string; exercise: Exercise; perRound?: boolean; expect: string }[] = [
  // --- sets -----------------------------------------------------------------
  { name: "min+max sets is a range", exercise: ex({ minSets: 3, maxSets: 5, reps: 8 }), expect: "3–5 sets · 8 reps" },
  { name: "min only is one figure", exercise: ex({ minSets: 3, reps: 8 }), expect: "3 sets · 8 reps" },
  { name: "max only is one figure", exercise: ex({ maxSets: 4, reps: 8 }), expect: "4 sets · 8 reps" },
  { name: "equal min and max collapse", exercise: ex({ minSets: 3, maxSets: 3, reps: 8 }), expect: "3 sets · 8 reps" },
  { name: "plain sets when no range", exercise: ex({ sets: 4, reps: 8 }), expect: "4 sets · 8 reps" },
  { name: "one set is singular", exercise: ex({ sets: 1, reps: 5 }), expect: "1 set · 5 reps" },

  // --- reps, and the AMRAP rules -------------------------------------------
  { name: "min+max reps is a range", exercise: ex({ sets: 3, minReps: 8, maxReps: 12 }), expect: "3 sets · 8–12 reps" },
  { name: "min reps only is AMRAP", exercise: ex({ sets: 3, minReps: 8 }), expect: "3 sets · 8+ reps (AMRAP)" },
  { name: "max reps only is a ceiling", exercise: ex({ sets: 3, maxReps: 12 }), expect: "3 sets · up to 12 reps" },
  { name: "equal min and max reps collapse", exercise: ex({ sets: 3, minReps: 10, maxReps: 10 }), expect: "3 sets · 10 reps" },
  { name: "nothing at all is AMRAP", exercise: ex({ sets: 3 }), expect: "3 sets · AMRAP" },
  { name: "one rep is singular", exercise: ex({ sets: 5, reps: 1 }), expect: "5 sets · 1 rep" },

  // --- rep-based only -------------------------------------------------------
  {
    name: "reps_only counts reps",
    exercise: ex({ classification: "reps_only", sets: 3, minReps: 8 }),
    expect: "3 sets · 8+ reps (AMRAP)",
  },
  {
    name: "duration is a hold, never reps",
    exercise: ex({ classification: "duration", sets: 3, durationSeconds: 45 }),
    expect: "3 sets · 45 s hold",
  },
  {
    name: "a long hold reads in minutes",
    exercise: ex({ classification: "duration", sets: 2, durationSeconds: 90 }),
    expect: "2 sets · 1 min 30 s hold",
  },

  // --- qualifiers -----------------------------------------------------------
  {
    name: "the full strength line",
    exercise: ex({
      minSets: 3, maxSets: 5, minReps: 8, maxReps: 12,
      intensityPct: 75, rpe: 8, tempo: "3-1-1-0", restSeconds: 90,
    }),
    expect: "3–5 sets · 8–12 reps · @ 75% · RPE 8 · Tempo 3-1-1-0 · Rest 1 min 30 s",
  },
  {
    name: "rep max wins over working weight",
    exercise: ex({ sets: 3, reps: 5, repMaxKg: 140, weightKg: 100 }),
    expect: "3 sets · 5 reps · 140 kg rep max",
  },
  {
    name: "working weight when there is no rep max",
    exercise: ex({ sets: 3, reps: 5, weightKg: 100 }),
    expect: "3 sets · 5 reps · 100 kg",
  },
  {
    name: "a zero weight is not a prescription",
    exercise: ex({ sets: 3, reps: 8, weightKg: 0 }),
    expect: "3 sets · 8 reps",
  },

  // --- per round ------------------------------------------------------------
  {
    name: "inside a block the reps are per round",
    exercise: ex({ minReps: 8, maxReps: 12 }),
    perRound: true,
    expect: "8–12 reps per round",
  },
  {
    // The block counts the rounds, so a set count here would contradict the
    // heading right above it.
    name: "a set count is dropped inside a round-based block",
    exercise: ex({ sets: 4, reps: 8, weightKg: 60 }),
    perRound: true,
    expect: "8 reps per round · 60 kg",
  },
  {
    name: "per round applies to AMRAP reps too",
    exercise: ex({ minReps: 8 }),
    perRound: true,
    expect: "8+ reps (AMRAP) per round",
  },

  // --- nothing --------------------------------------------------------------
  { name: "an empty prescription renders nothing", exercise: ex({ classification: "cardio" }), expect: "" },
];

for (const c of cases) {
  test(`prescriptionLine: ${c.name}`, () => {
    assert.equal(prescriptionLine(c.exercise, { perRound: c.perRound }), c.expect);
  });
}

// ---------------------------------------------------------------------------
// Endurance plans.
// ---------------------------------------------------------------------------

const plan = (p: Partial<EndurancePlan> & Pick<EndurancePlan, "main">): EndurancePlan => ({
  version: 1,
  ...p,
});

const planCases: { name: string; plan: EndurancePlan; expect: string }[] = [
  {
    name: "a steady run by time, open target",
    plan: plan({ main: { type: "steady", step: { measure: "time", seconds: 1800, target: { kind: "open" } } } }),
    expect: "30 min",
  },
  {
    name: "a steady run by distance in a heart-rate zone",
    plan: plan({
      main: { type: "steady", step: { measure: "distance", meters: 5000, target: { kind: "hr_zone", zone: 2 } } },
    }),
    expect: "5 km Zone 2",
  },
  {
    name: "a steady effort at an RPE",
    plan: plan({
      main: { type: "steady", step: { measure: "time", seconds: 1200, target: { kind: "rpe", value: 6 } } },
    }),
    expect: "20 min RPE 6",
  },
  {
    name: "the 6 × 800 m session, warm-up and cool-down",
    plan: plan({
      warmup: { measure: "time", seconds: 600, target: { kind: "open" } },
      main: {
        type: "intervals",
        repeats: 6,
        work: { measure: "distance", meters: 800, target: { kind: "pace", min_sec_per_km: 260, max_sec_per_km: 270 } },
        recovery: { measure: "time", seconds: 120, target: { kind: "open" }, mode: "jog" },
      },
      cooldown: { measure: "time", seconds: 600, target: { kind: "open" } },
    }),
    expect: "Warm-up 10 min · 6 × 800 m @ 4:20–4:30 /km, 2 min jog · Cool-down 10 min",
  },
  {
    name: "a pace band with equal ends is one figure",
    plan: plan({
      main: {
        type: "steady",
        step: { measure: "distance", meters: 3000, target: { kind: "pace", min_sec_per_km: 300, max_sec_per_km: 300 } },
      },
    }),
    expect: "3 km @ 5:00 /km",
  },
  {
    name: "a walking recovery says so",
    plan: plan({
      main: {
        type: "intervals",
        repeats: 4,
        work: { measure: "time", seconds: 60, target: { kind: "rpe", value: 9 } },
        recovery: { measure: "time", seconds: 90, target: { kind: "open" }, mode: "walk" },
      },
    }),
    expect: "4 × 1 min RPE 9, 1 min 30 s walk",
  },
  {
    name: "a distance that is not whole km stays in metres",
    plan: plan({ main: { type: "steady", step: { measure: "distance", meters: 1500, target: { kind: "open" } } } }),
    expect: "1500 m",
  },
];

for (const c of planCases) {
  test(`formatEndurancePlan: ${c.name}`, () => {
    assert.equal(formatEndurancePlan(c.plan), c.expect);
  });
  test(`prescriptionLine carries the plan: ${c.name}`, () => {
    assert.equal(
      prescriptionLine(ex({ classification: "cardio", endurancePlan: c.plan })),
      c.expect
    );
  });
}

test("legacy cardio columns are used only when there is no plan", () => {
  const legacy = ex({ classification: "cardio", cardioDurationMin: 30, cardioDistanceKm: 5 });
  assert.equal(prescriptionLine(legacy), "30 min · 5 km");
  assert.equal(
    prescriptionLine({
      ...legacy,
      endurancePlan: plan({
        main: { type: "steady", step: { measure: "time", seconds: 1800, target: { kind: "open" } } },
      }),
    }),
    "30 min",
    "a plan supersedes the legacy columns rather than joining them"
  );
});

test("rest is shown for cardio, which has no other qualifier", () => {
  assert.equal(
    prescriptionLine(
      ex({
        classification: "cardio",
        restSeconds: 60,
        endurancePlan: plan({
          main: { type: "steady", step: { measure: "time", seconds: 600, target: { kind: "open" } } },
        }),
      })
    ),
    "10 min · Rest 1 min"
  );
});

test("formatSeconds and formatPace", () => {
  assert.equal(formatSeconds(45), "45 s");
  assert.equal(formatSeconds(60), "1 min");
  assert.equal(formatSeconds(90), "1 min 30 s");
  assert.equal(formatSeconds(3600), "60 min");
  assert.equal(formatPace(260), "4:20");
  assert.equal(formatPace(300), "5:00");
  assert.equal(formatPace(65), "1:05");
});

// ---------------------------------------------------------------------------
// Block headings. The header text is what makes a block accessible — colour
// alone never carries the meaning — so it is worth a table of its own.
// ---------------------------------------------------------------------------

const headingCases: { name: string; block: WorkoutBlock; ordinal?: number; expect: string }[] = [
  { name: "the first superset", block: { id: "b", kind: "superset" }, expect: "Superset A" },
  { name: "the second superset", block: { id: "b", kind: "superset" }, ordinal: 1, expect: "Superset B" },
  { name: "an AMRAP names its window", block: { id: "b", kind: "amrap", timeCapSeconds: 720 }, expect: "AMRAP · 12 min" },
  {
    name: "an EMOM names its interval and rounds",
    block: { id: "b", kind: "emom", intervalSeconds: 60, rounds: 10 },
    expect: "EMOM · every 1:00 × 10",
  },
  {
    name: "a 90-second EMOM is a clock, not prose",
    block: { id: "b", kind: "emom", intervalSeconds: 90, rounds: 8 },
    expect: "EMOM · every 1:30 × 8",
  },
  {
    name: "For Time with a cap",
    block: { id: "b", kind: "for_time", rounds: 5, timeCapSeconds: 1200 },
    expect: "For Time · 5 rounds (cap 20 min)",
  },
  {
    name: "For Time without a cap",
    block: { id: "b", kind: "for_time", rounds: 3 },
    expect: "For Time · 3 rounds",
  },
  {
    name: "one round is singular",
    block: { id: "b", kind: "for_time", rounds: 1 },
    expect: "For Time · 1 round",
  },
  {
    name: "a label the coach wrote wins outright",
    block: { id: "b", kind: "amrap", timeCapSeconds: 720, label: "Finisher" },
    expect: "Finisher",
  },
];

for (const c of headingCases) {
  test(`blockHeading: ${c.name}`, () => {
    assert.equal(blockHeading(c.block, c.ordinal ?? 0), c.expect);
  });
}

test("only a superset is not round-based", () => {
  assert.equal(isRoundBased("superset"), false);
  for (const kind of ["amrap", "emom", "for_time"] as const) {
    assert.equal(isRoundBased(kind), true, kind);
  }
});
