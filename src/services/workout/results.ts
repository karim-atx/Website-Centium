import type { BlockResult, EnduranceResult, WorkoutBlock } from "../../types";
import { blockHeading, formatClock, formatPace, formatSeconds } from "./prescription";

// What a block scored, and what an endurance effort produced, in one line each.
//
// THE COUNTERPART OF prescription.ts, deliberately shaped the same way and
// deliberately a separate file: that one says what was ASKED FOR, this one
// says what HAPPENED. The routine editor, the history list and the
// professional's view all read from here, so "7 rounds + 5 reps" is worded
// once rather than three times.
//
// WHICH FIELDS MEAN ANYTHING IS PER KIND, and it is the database's rule, not
// a display preference — workout_block_results' kind/score CHECK refuses an
// AMRAP carrying a time, or a For Time carrying leftover reps. Reading a
// field the kind does not own would be reading a column that is always null.

/** A block's score, as a sentence: "AMRAP · 12 min: 7 rounds + 5 reps". */
export function blockResultLine(result: BlockResult, ordinal = 0): string {
  const heading = blockHeading(result as WorkoutBlock, ordinal);
  const score = blockScore(result);
  return score ? `${heading}: ${score}` : heading;
}

/**
 * Just the score, with no heading.
 *
 * Returns "" for a superset, which scores nothing at all — it is a way of
 * arranging work, not a thing you win, and the database gives it no score
 * columns to fill.
 */
export function blockScore(result: BlockResult): string {
  switch (result.kind) {
    case "superset":
      return "";
    case "amrap": {
      const rounds = roundWord(result.roundsCompleted ?? 0);
      return result.extraReps ? `${rounds} + ${result.extraReps} reps` : rounds;
    }
    case "emom": {
      const done = result.roundsCompleted ?? 0;
      // OUT OF HOW MANY, when the plan said. An EMOM's whole shape is a fixed
      // number of rounds, so "8 rounds" alone hides whether that was all of
      // them or two thirds of them.
      return result.rounds ? `${done} of ${result.rounds} rounds` : roundWord(done);
    }
    case "for_time": {
      const time = formatClock(result.timeSeconds ?? 0);
      if (!result.capped) return time;
      // THE CAP STOPPED IT, which is a different fact from finishing in that
      // time, and has to read as one. How far they got is rounds — leftover
      // reps are a column this kind does not own.
      const got = result.roundsCompleted != null
        ? result.rounds
          ? `, ${result.roundsCompleted} of ${result.rounds} rounds`
          : `, ${roundWord(result.roundsCompleted)}`
        : "";
      return `capped at ${time}${got}`;
    }
  }
}

const roundWord = (n: number): string => `${n} ${n === 1 ? "round" : "rounds"}`;

/**
 * A distance somebody COVERED, which is not the same problem as a distance
 * somebody was ASKED for.
 *
 * prescription.formatMeters keeps "800 m" as 800 m and only says km for an
 * exact multiple, which is right for an interval nobody writes as 0.8 km. A
 * result is almost never a round number — 6400 m off a watch — so the same
 * rule would print every run of any length in metres.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  // One decimal, and no trailing ".0" on the rare exact one.
  return `${Number(km.toFixed(1))} km`;
}

/**
 * An endurance result: "38:10 · 6.4 km · avg 5:58 /km · avg 148 bpm".
 *
 * Every field is optional in the column and every field is optional here — a
 * treadmill gives a duration and nothing else — so this drops what is absent
 * rather than printing a zero for it.
 */
export function enduranceResultLine(result: EnduranceResult): string {
  const parts: string[] = [];
  if (result.duration_seconds) parts.push(formatClock(result.duration_seconds));
  if (result.distance_meters) parts.push(formatDistance(result.distance_meters));
  if (result.intervals_completed) {
    parts.push(`${result.intervals_completed} ${result.intervals_completed === 1 ? "interval" : "intervals"}`);
  }
  if (result.avg_pace_sec_per_km) parts.push(`avg ${formatPace(result.avg_pace_sec_per_km)} /km`);
  if (result.avg_hr) parts.push(`avg ${result.avg_hr} bpm`);
  return parts.join(" · ");
}

/**
 * Average pace, derived rather than asked for.
 *
 * Nobody types their average pace — they have a time and a distance, and the
 * pace follows. Returns undefined when either is missing or zero, so the
 * column stays null instead of holding an Infinity rounded to something
 * plausible.
 */
export function averagePace(
  durationSeconds: number | undefined,
  distanceMeters: number | undefined
): number | undefined {
  if (!durationSeconds || !distanceMeters) return undefined;
  return Math.round(durationSeconds / (distanceMeters / 1000));
}

/**
 * Drops empty fields and rounds what is left to whole numbers.
 *
 * valid_endurance_result() rejects an empty object, an unknown key, a
 * negative and a non-integer, so a result that fails any of those has to be
 * caught here rather than at the insert — a 23514 at the end of a session
 * costs the whole workout. Returns null when there is nothing to record,
 * which the caller writes as a null column rather than as `{}`.
 */
export function serializeEnduranceResult(result: EnduranceResult): EnduranceResult | null {
  const out: EnduranceResult = {};
  for (const key of [
    "duration_seconds",
    "distance_meters",
    "avg_pace_sec_per_km",
    "avg_hr",
    "intervals_completed",
  ] as const) {
    const value = result[key];
    if (value == null || !Number.isFinite(value) || value <= 0) continue;
    out[key] = Math.round(value);
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Whether a block result is one the database will accept.
 *
 * Mirrors workout_block_results_kind_score_check, so the UI can refuse before
 * the insert does. The message is what the athlete sees, so it says what is
 * missing rather than naming a constraint.
 */
export function checkBlockResult(result: BlockResult): string | null {
  switch (result.kind) {
    case "superset":
      return null;
    case "amrap":
      return result.roundsCompleted == null ? "How many rounds did you get?" : null;
    case "emom":
      return result.roundsCompleted == null ? "How many rounds did you hold?" : null;
    case "for_time":
      // time_seconds is NOT NULL for this kind AND must be > 0, so a For Time
      // that was never started cannot be recorded at all.
      return result.timeSeconds ? null : "Start the clock before finishing this block.";
  }
}

/** The prose under a block's own heading while it is being run. */
export function blockRunHint(block: WorkoutBlock): string {
  switch (block.kind) {
    case "superset":
      return "One set of each, in order, then rest.";
    case "amrap":
      return `As many rounds as possible in ${block.timeCapSeconds ? formatSeconds(block.timeCapSeconds) : "the time"}.`;
    case "emom":
      return `One round at the top of every ${block.intervalSeconds ? formatClock(block.intervalSeconds) : "interval"}.`;
    case "for_time":
      return block.timeCapSeconds
        ? `Finish as fast as you can — cap ${formatSeconds(block.timeCapSeconds)}.`
        : "Finish as fast as you can.";
  }
}


/**
 * What a block still needs before the session can be saved.
 *
 * Exported so the sheet can refuse to finish rather than discovering the
 * database's CHECK at the end of a workout, which costs the whole session.
 */
export function blockProblems(
  blocks: WorkoutBlock[],
  results: Record<string, BlockResult>
): { heading: string; message: string }[] {
  return blocks.flatMap((block, i) => {
    const result = results[block.id];
    // A block nobody touched at all is not an error — they may simply not
    // have done it, and the sets underneath already say so.
    if (!result) return [];
    const message = checkBlockResult(result);
    return message ? [{ heading: blockHeading(block, i), message }] : [];
  });
}