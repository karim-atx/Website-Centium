import type { BlockKind, Exercise } from "../../../types";
import { formatSeconds } from "../../../services/workout/prescription";
import { t, tk } from "../../../i18n/core";

// Professional handover v1, WP-LI.3 / WP-LI.3.2: a prescription split into the six columns the web
// spec strip and the client copy table show, and each block kind's one-line explanation (the same
// strings as the workout BlockCard).

export const BLOCK_LINE: Record<BlockKind, string> = {
  superset: tk("Run these together, no clock."),
  amrap: tk("As many rounds as possible in the time."),
  emom: tk("One round at the top of every interval."),
  for_time: tk("Finish the rounds as fast as you can."),
};

export type Part = { n: string; u?: string };
const EN = "–";

/** The six columns of a prescription as the strip shows them: Sets, Reps, Weight, RPE, Tempo, Rest (null = "–"). */
export function specCells(ex: Exercise): (Part[] | null)[] {
  const range = (min?: number | null, max?: number | null, one?: number | null) =>
    min && max && min !== max ? `${min}${EN}${max}` : (min ?? max ?? one) ? String(min ?? max ?? one) : null;
  const sets = range(ex.minSets, ex.maxSets, ex.sets);
  let reps: Part[] | null = null;
  if (ex.classification === "duration") {
    if (ex.durationSeconds) reps = [{ n: String(ex.durationSeconds), u: t("s hold") }];
  } else if (ex.classification !== "cardio") {
    const r = ex.minReps && !ex.maxReps ? `${ex.minReps}+` : range(ex.minReps, ex.maxReps, ex.reps);
    reps = r ? [{ n: r }] : [{ n: "AMRAP" }];
  }
  let weight: Part[] | null = null;
  if (ex.intensityPct) weight = [{ n: `${ex.intensityPct}%` }];
  else if (ex.repMaxKg) weight = [{ n: String(ex.repMaxKg), u: t("kg RM") }];
  else if (ex.weightKg === 0) weight = [{ n: t("BW") }];
  else if (ex.weightKg) weight = [{ n: String(ex.weightKg), u: "kg" }];
  const rest = ex.restSeconds
    ? formatSeconds(ex.restSeconds)
        .split(/ (?=\d)/)
        .map((seg) => {
          const m = /^(\S+)(?: (.+))?$/.exec(seg);
          return { n: m?.[1] ?? seg, u: m?.[2] };
        })
    : null;
  return [sets ? [{ n: sets }] : null, reps, weight, ex.rpe ? [{ n: String(ex.rpe) }] : null, ex.tempo ? [{ n: ex.tempo }] : null, rest];
}

