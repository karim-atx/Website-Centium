import type {
  EnduranceMain,
  EndurancePlan,
  EnduranceStep,
  EnduranceTarget,
} from "../../types";

// Building and checking an endurance plan, client-side.
//
// A MIRROR OF valid_endurance_plan(), DELIBERATELY DUPLICATED. The database is
// the authority — a CHECK constraint refuses anything this misses — but a
// constraint violation arrives as a PostgREST error after a round trip, naming
// a SQL function, at the moment somebody presses Save on a form they spent a
// minute filling in. Catching it here turns that into a sentence beside the
// field that is wrong.
//
// THE DUPLICATION IS THE RISK AND IS WORTH NAMING. If the two disagree the
// database wins and the user sees the server's refusal, which the editor shows
// verbatim rather than swallowing — so a drift is visible rather than silent.
// Every rule below cites the SQL rule it mirrors.

export const emptyTarget = (): EnduranceTarget => ({ kind: "open" });

export const emptyStep = (): EnduranceStep => ({
  measure: "time",
  seconds: 600,
  target: emptyTarget(),
});

export const emptyPlan = (): EndurancePlan => ({
  version: 1,
  main: { type: "steady", step: emptyStep() },
});

/** A whole number strictly greater than zero, which is what every count is. */
const isPositiveInt = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && Number.isInteger(n) && n > 0;

/** Mirrors valid_endurance_target(). Returns the problem, or null. */
export function checkTarget(target: EnduranceTarget, where: string): string | null {
  switch (target.kind) {
    case "open":
      return null;
    case "hr_zone":
      return isPositiveInt(target.zone) && target.zone <= 5
        ? null
        : `${where}: pick a heart-rate zone from 1 to 5.`;
    case "rpe":
      return isPositiveInt(target.value) && target.value <= 10
        ? null
        : `${where}: effort runs from 1 to 10.`;
    case "pace": {
      if (!isPositiveInt(target.min_sec_per_km) || !isPositiveInt(target.max_sec_per_km)) {
        return `${where}: enter both ends of the pace range.`;
      }
      // The SQL says min <= max. Said here as "the faster end first", which is
      // what the two fields mean to somebody writing a session.
      return target.min_sec_per_km <= target.max_sec_per_km
        ? null
        : `${where}: the faster pace goes first.`;
    }
  }
}

/** Mirrors valid_endurance_step(). */
export function checkStep(step: EnduranceStep, where: string): string | null {
  if (step.measure === "time") {
    if (!isPositiveInt(step.seconds)) return `${where}: set a time longer than zero.`;
  } else {
    if (!isPositiveInt(step.meters)) return `${where}: set a distance longer than zero.`;
  }
  return checkTarget(step.target, where);
}

/**
 * Mirrors valid_endurance_plan(). Returns the first problem, or null.
 *
 * FIRST, NOT ALL. A half-filled plan produces a cascade of complaints that are
 * really one mistake, and a form that shows six messages at once teaches
 * somebody to ignore all six.
 */
export function checkPlan(plan: EndurancePlan): string | null {
  if (plan.version !== 1) return "This plan was written by a newer version of Centium.";
  if (plan.warmup) {
    const problem = checkStep(plan.warmup, "Warm-up");
    if (problem) return problem;
  }
  if (plan.main.type === "steady") {
    const problem = checkStep(plan.main.step, "Main set");
    if (problem) return problem;
  } else {
    if (!isPositiveInt(plan.main.repeats) || plan.main.repeats > 100) {
      return "Main set: repeats run from 1 to 100.";
    }
    const work = checkStep(plan.main.work, "Work");
    if (work) return work;
    const recovery = checkStep(plan.main.recovery, "Recovery");
    if (recovery) return recovery;
  }
  if (plan.cooldown) {
    const problem = checkStep(plan.cooldown, "Cool-down");
    if (problem) return problem;
  }
  return null;
}

/**
 * The document as the database wants it.
 *
 * STRIPS WHAT THE VALIDATOR COUNTS. valid_endurance_target() checks the key
 * COUNT as well as the values — `{kind:"open", zone:3}` is rejected, not
 * ignored — and an editor that keeps a zone around while the user has "None"
 * selected would send exactly that. The same goes for a step holding both
 * `seconds` and `meters` after the measure was switched.
 *
 * `main` is rebuilt rather than spread for the same reason: steady must carry
 * exactly two keys and intervals exactly four.
 */
export function serializeTarget(target: EnduranceTarget): EnduranceTarget {
  switch (target.kind) {
    case "open":
      return { kind: "open" };
    case "hr_zone":
      return { kind: "hr_zone", zone: target.zone };
    case "rpe":
      return { kind: "rpe", value: target.value };
    case "pace":
      return {
        kind: "pace",
        min_sec_per_km: target.min_sec_per_km,
        max_sec_per_km: target.max_sec_per_km,
      };
  }
}

export function serializeStep(step: EnduranceStep): EnduranceStep {
  const target = serializeTarget(step.target);
  return step.measure === "time"
    ? { measure: "time", seconds: step.seconds, target, ...(step.mode ? { mode: step.mode } : {}) }
    : { measure: "distance", meters: step.meters, target, ...(step.mode ? { mode: step.mode } : {}) };
}

export function serializeMain(main: EnduranceMain): EnduranceMain {
  return main.type === "steady"
    ? { type: "steady", step: serializeStep(main.step) }
    : {
        type: "intervals",
        repeats: main.repeats,
        work: serializeStep(main.work),
        recovery: serializeStep(main.recovery),
      };
}

export function serializePlan(plan: EndurancePlan): EndurancePlan {
  return {
    version: 1,
    // Absent rather than null, for both. The validator accepts either, and
    // absent is the smaller document.
    ...(plan.warmup ? { warmup: serializeStep(plan.warmup) } : {}),
    main: serializeMain(plan.main),
    ...(plan.cooldown ? { cooldown: serializeStep(plan.cooldown) } : {}),
  };
}

// --- the editor's own conversions ------------------------------------------

/** "4:20" and the like, from a seconds-per-km figure. */
export const secondsToClock = (total: number): { minutes: number; seconds: number } => ({
  minutes: Math.floor(total / 60),
  seconds: total % 60,
});

export const clockToSeconds = (minutes: number, seconds: number): number =>
  Math.max(0, Math.round(minutes)) * 60 + Math.max(0, Math.round(seconds));
