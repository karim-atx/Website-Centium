import type {
  BlockKind,
  EnduranceMode,
  EndurancePlan,
  EnduranceStep,
  EnduranceTarget,
  Exercise,
  ExerciseClassification,
  WorkoutBlock,
} from "../../types";

// ONE FORMATTER, FOR EVERY PLACE A PRESCRIPTION IS SHOWN.
//
// WHAT THIS REPLACED. The routine list rendered `{sets} × {reps} · {weightKg}kg`
// and the session sheet rendered `Rest 90s · RPE 8 · Tempo 3-1-1-0`, and those
// were the only two. Between them they showed three of the twenty columns a
// prescription actually carries: a coach who wrote 3–5 sets of 8–12 at 75%
// saw "3 × 8 · 0kg", and the min/max fields the editor had been saving since
// they existed appeared nowhere at all.
//
// Two renderers drifting is how that happened, so there is one. The routine
// view, the template and curated-program views, the professional side and
// (part 2) the session all call this, which is also what makes "a missing max
// is AMRAP" a single rule rather than four opinions.
//
// METRIC, BECAUSE THE APP IS METRIC. There is no unit preference to respect:
// the only kg/lb control in the codebase is local state inside the plate
// calculator, `app_preferences` has no unit column, and every stored figure —
// weight_kg, meters, sec_per_km — is metric. When a preference arrives it
// belongs here, converting on the way out and never on the way in.

/**
 * Classifications whose prescription is counted in REPS.
 *
 * `cardio` is described by an endurance plan and `duration` by a hold, so
 * neither takes a rep range — and a rep field rendered for them would invite
 * one to be typed.
 */
export const REP_BASED_CLASSIFICATIONS: ExerciseClassification[] = [
  "barbell",
  "dumbbell",
  "machine_other",
  "weighted_bodyweight",
  "assisted_bodyweight",
  "reps_only",
];

export const isRepBased = (c: ExerciseClassification | undefined): boolean =>
  !!c && REP_BASED_CLASSIFICATIONS.includes(c);

/** An en dash, which is what a range takes. Not a hyphen. */
const EN = "–";

/** Seconds as the shortest honest thing: "45 s", "10 min", "1 min 30 s". */
export function formatSeconds(total: number): string {
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}

/** Metres as "800 m" or "5 km" — km only when it divides exactly. */
export function formatMeters(meters: number): string {
  return meters >= 1000 && meters % 1000 === 0 ? `${meters / 1000} km` : `${meters} m`;
}

/** Seconds per km as a pace clock: 260 -> "4:20". */
export function formatPace(secPerKm: number): string {
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.round(secPerKm % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * A step's target, as the athlete reads it.
 *
 * `open` renders as nothing rather than as a word. The schema has no "easy" or
 * "steady" — an open target means the plan asks for no particular intensity,
 * and inventing an adverb for it would be the formatter making up prescription.
 */
export function formatTarget(target: EnduranceTarget): string {
  switch (target.kind) {
    case "pace": {
      const lo = formatPace(target.min_sec_per_km);
      const hi = formatPace(target.max_sec_per_km);
      return lo === hi ? `@ ${lo} /km` : `@ ${lo}${EN}${hi} /km`;
    }
    case "hr_zone":
      return `Zone ${target.zone}`;
    case "rpe":
      return `RPE ${target.value}`;
    case "open":
      return "";
  }
}

const MODE_LABEL: Record<EnduranceMode, string> = {
  run: "run",
  jog: "jog",
  walk: "walk",
  rest: "rest",
};

/** One step: amount, then how it is covered, then what to hold. */
export function formatStep(step: EnduranceStep): string {
  const amount = step.measure === "time" ? formatSeconds(step.seconds) : formatMeters(step.meters);
  return [amount, step.mode ? MODE_LABEL[step.mode] : "", formatTarget(step.target)]
    .filter(Boolean)
    .join(" ");
}

/**
 * A whole endurance plan on one line:
 *   "Warm-up 10 min · 6 × 800 m @ 4:20–4:30 /km, 2 min jog · Cool-down 10 min"
 */
export function formatEndurancePlan(plan: EndurancePlan): string {
  const parts: string[] = [];
  if (plan.warmup) parts.push(`Warm-up ${formatStep(plan.warmup)}`);
  parts.push(
    plan.main.type === "steady"
      ? formatStep(plan.main.step)
      : `${plan.main.repeats} × ${formatStep(plan.main.work)}, ${formatStep(plan.main.recovery)}`
  );
  if (plan.cooldown) parts.push(`Cool-down ${formatStep(plan.cooldown)}`);
  return parts.join(" · ");
}

/**
 * The legacy cardio columns, used ONLY when a row carries no plan.
 *
 * Superseded by endurance_plan and backfilled into it by 20260924270000, so
 * this is for rows written by a client version that predates the backfill.
 * Nothing writes these any more.
 */
function formatLegacyCardio(ex: Exercise): string {
  const parts: string[] = [];
  if (ex.cardioDurationMin) parts.push(`${ex.cardioDurationMin} min`);
  if (ex.cardioDistanceKm) parts.push(`${ex.cardioDistanceKm} km`);
  if (ex.cardioPaceMinPerKm) parts.push(`@ ${ex.cardioPaceMinPerKm} min/km`);
  if (ex.cardioInclinePct) parts.push(`${ex.cardioInclinePct}% incline`);
  if (ex.cardioAvgHeartRate) parts.push(`${ex.cardioAvgHeartRate} bpm`);
  return parts.join(" · ");
}

/** "3–5 sets", "3 sets", or nothing when no count was prescribed. */
function formatSets(ex: Exercise): string {
  const min = ex.minSets;
  const max = ex.maxSets;
  if (min && max && min !== max) return `${min}${EN}${max} sets`;
  const one = min ?? max ?? ex.sets;
  if (!one) return "";
  return `${one} ${one === 1 ? "set" : "sets"}`;
}

/**
 * The rep prescription, including the AMRAP rules.
 *
 * A MISSING MAX IS THE POINT. "8+ reps (AMRAP)" and a bare "AMRAP" are the two
 * states that used to render as nothing at all — the editor saved a min with
 * no max and the routine showed `3 × 8`, which is a different instruction.
 */
function formatReps(ex: Exercise): string {
  const min = ex.minReps;
  const max = ex.maxReps;
  if (min && max) return min === max ? `${min} reps` : `${min}${EN}${max} reps`;
  if (min) return `${min}+ reps (AMRAP)`;
  if (max) return `up to ${max} reps`;
  if (ex.reps) return `${ex.reps} ${ex.reps === 1 ? "rep" : "reps"}`;
  return "AMRAP";
}

export interface PrescriptionOptions {
  /**
   * Inside an AMRAP, EMOM or For Time block, where the prescription is what
   * one ROUND asks for rather than the whole exercise.
   */
  perRound?: boolean;
}

/**
 * The one line that describes what to do, for any exercise.
 *
 * Returns "" only for an exercise with nothing prescribed at all, which a
 * caller should render as nothing rather than as an empty bullet.
 */
export function prescriptionLine(ex: Exercise, options: PrescriptionOptions = {}): string {
  const parts: string[] = [];

  // NO SET COUNT INSIDE A ROUND-BASED BLOCK. What repeats there is the ROUND,
  // counted by the block — an AMRAP that also said "4 sets" would contradict
  // its own heading, and an EMOM fixes its rounds by the interval count.
  const setsClause = options.perRound ? "" : formatSets(ex);

  if (ex.classification === "cardio") {
    const plan = ex.endurancePlan
      ? formatEndurancePlan(ex.endurancePlan)
      : formatLegacyCardio(ex);
    if (plan) parts.push(plan);
  } else if (ex.classification === "duration") {
    if (setsClause) parts.push(setsClause);
    if (ex.durationSeconds) parts.push(`${formatSeconds(ex.durationSeconds)} hold`);
  } else {
    if (setsClause) parts.push(setsClause);
    if (isRepBased(ex.classification)) {
      const reps = formatReps(ex);
      parts.push(options.perRound ? `${reps} per round` : reps);
    }
  }

  // The qualifiers, in the order a coach writes them. Intensity and rep max
  // describe the load; RPE and tempo describe the execution; rest is what
  // happens after. None of them applies to an endurance plan, which carries
  // its own targets per step.
  if (ex.classification !== "cardio") {
    if (ex.intensityPct) parts.push(`@ ${ex.intensityPct}%`);
    if (ex.repMaxKg) parts.push(`${ex.repMaxKg} kg rep max`);
    else if (ex.weightKg) parts.push(`${ex.weightKg} kg`);
    if (ex.rpe) parts.push(`RPE ${ex.rpe}`);
    if (ex.tempo) parts.push(`Tempo ${ex.tempo}`);
  }
  if (ex.restSeconds) parts.push(`Rest ${formatSeconds(ex.restSeconds)}`);

  return parts.join(" · ");
}

// --- blocks ----------------------------------------------------------------

/**
 * A clock as coaches write it: 60 -> "1:00", 90 -> "1:30", 3725 -> "1:02:05".
 *
 * Distinct from formatSeconds, which reads as prose ("1 min 30 s"). An EMOM
 * interval is a clock face — "every 1:00" — and writing it as "every 1 min"
 * loses the thing that makes it an EMOM.
 *
 * THE HOUR CASE IS NOT DECORATION. This is also the face on the session's For
 * Time stopwatch, where a long chipper genuinely passes an hour; the earlier
 * version had no hours branch and read 3661 as "61:01". Floored at zero so a
 * countdown that overshoots shows 0:00 rather than a minus sign.
 */
export function formatClock(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** A, B, C… for supersets, which are told apart by letter rather than number. */
export const supersetLetter = (index: number): string =>
  String.fromCharCode(65 + (index % 26));

/**
 * The heading a block carries, which is also what makes it accessible.
 *
 * THE TEXT CARRIES THE MEANING, NOT THE COLOUR. Each kind gets its own rail
 * colour in the card, but "AMRAP · 12 min" says what it is without any of
 * them — so the grouping survives a screenshot in greyscale, a colour-blind
 * reader and a screen reader, which reads this string and nothing else.
 *
 * `ordinal` is the block's position among the blocks of its own kind, used
 * only to letter supersets. A user's own label wins outright when they wrote
 * one: "Finisher" is more use than "Superset B".
 */
export function blockHeading(block: WorkoutBlock, ordinal = 0): string {
  if (block.label?.trim()) return block.label.trim();
  switch (block.kind) {
    case "superset":
      return `Superset ${supersetLetter(ordinal)}`;
    case "amrap":
      return `AMRAP · ${block.timeCapSeconds ? formatSeconds(block.timeCapSeconds) : "no cap set"}`;
    case "emom": {
      const every = block.intervalSeconds ? formatClock(block.intervalSeconds) : "?";
      return `EMOM · every ${every}${block.rounds ? ` × ${block.rounds}` : ""}`;
    }
    case "for_time": {
      const rounds = block.rounds ? `${block.rounds} ${block.rounds === 1 ? "round" : "rounds"}` : "for time";
      return block.timeCapSeconds
        ? `For Time · ${rounds} (cap ${formatSeconds(block.timeCapSeconds)})`
        : `For Time · ${rounds}`;
    }
  }
}

/** Whether a block's members are prescribed per round rather than outright. */
export const isRoundBased = (kind: BlockKind): boolean => kind !== "superset";
