import type { Exercise } from "../../types";
import { formatCompactDuration } from "./index";
import { formatMeters, formatStep, formatTarget, isRepBased } from "./prescription";

// WO21: an exercise row in a starter program is a split card, the name on the
// left and a value block on the right. 03 "WO21" gives three shapes:
//   strength -> "{sets} × {reps}" over "sets × reps"
//   timed    -> compact duration over "duration"
//   interval -> "{rounds}" over "rounds", with the interval described under the name
// Anything else the prescription says moves under the name.

export interface ProgramRow {
  value: string;
  label: string;
  /** Extra detail under the name (qualifiers, the interval, the set count of a hold). */
  detail: string;
}

const EN = "–";

/**
 * The compact duration format (02), extended below a minute: it counts whole
 * minutes, so a 45-second hold would read "0m". Seconds under an hour with a
 * remainder keep it ("1m 30s").
 */
export function compactSeconds(total: number): string {
  if (total < 60) return `${total}s`;
  if (total < 3600 && total % 60 !== 0) return `${Math.floor(total / 60)}m ${total % 60}s`;
  return formatCompactDuration(total);
}

function setsValue(ex: Exercise): string {
  if (ex.minSets && ex.maxSets && ex.minSets !== ex.maxSets) return `${ex.minSets}${EN}${ex.maxSets}`;
  const one = ex.minSets ?? ex.maxSets ?? ex.sets;
  return one ? String(one) : "";
}

function repsValue(ex: Exercise): string {
  if (ex.minReps && ex.maxReps) return ex.minReps === ex.maxReps ? `${ex.minReps}` : `${ex.minReps}${EN}${ex.maxReps}`;
  if (ex.minReps) return `${ex.minReps}+`;
  if (ex.maxReps) return `≤${ex.maxReps}`;
  if (ex.reps) return `${ex.reps}`;
  return "AMRAP";
}

/** Load and execution qualifiers, in the order the prescription line uses. */
function qualifiers(ex: Exercise): string[] {
  const out: string[] = [];
  if (ex.intensityPct) out.push(`@ ${ex.intensityPct}%`);
  if (ex.repMaxKg) out.push(`${ex.repMaxKg} kg rep max`);
  else if (ex.weightKg === 0) out.push("Bodyweight");
  else if (ex.weightKg) out.push(`${ex.weightKg} kg`);
  if (ex.rpe) out.push(`RPE ${ex.rpe}`);
  if (ex.tempo) out.push(`Tempo ${ex.tempo}`);
  return out;
}

export function programRow(ex: Exercise): ProgramRow {
  const sets = setsValue(ex);

  if (ex.classification === "cardio") {
    const plan = ex.endurancePlan;
    const around = [
      plan?.warmup ? `Warm-up ${formatStep(plan.warmup)}` : "",
      plan?.cooldown ? `Cool-down ${formatStep(plan.cooldown)}` : "",
    ].filter(Boolean);
    if (plan?.main.type === "intervals") {
      return {
        value: String(plan.main.repeats),
        label: "rounds",
        detail: [`${formatStep(plan.main.work)} / ${formatStep(plan.main.recovery)}`, ...around].join(" · "),
      };
    }
    if (plan?.main.type === "steady") {
      const step = plan.main.step;
      const repeats = Number(sets) || 1;
      if (repeats > 1) return { value: String(repeats), label: "rounds", detail: [formatStep(step), ...around].join(" · ") };
      const target = formatTarget(step.target);
      return step.measure === "time"
        ? { value: compactSeconds(step.seconds), label: "duration", detail: [target, ...around].filter(Boolean).join(" · ") }
        : { value: formatMeters(step.meters), label: "distance", detail: [target, ...around].filter(Boolean).join(" · ") };
    }
    if (ex.cardioDurationMin) return { value: compactSeconds(ex.cardioDurationMin * 60), label: "duration", detail: "" };
    return { value: "", label: "", detail: "" };
  }

  if (ex.classification === "duration" && ex.durationSeconds) {
    const n = Number(sets);
    return {
      value: compactSeconds(ex.durationSeconds),
      label: "duration",
      detail: [n > 1 || sets.includes(EN) ? `${sets} sets` : "", ...qualifiers(ex)].filter(Boolean).join(" · "),
    };
  }

  if (isRepBased(ex.classification) || ex.reps || ex.minReps || ex.maxReps) {
    const reps = repsValue(ex);
    return sets
      ? { value: `${sets} × ${reps}`, label: "sets × reps", detail: qualifiers(ex).join(" · ") }
      : { value: reps, label: "reps", detail: qualifiers(ex).join(" · ") };
  }

  return { value: sets, label: sets ? "sets" : "", detail: qualifiers(ex).join(" · ") };
}
