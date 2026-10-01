import type { ClientWorkoutActivity } from "../types";
import { formatDisplayDate } from "./date";

// How a client's training activity is worded to their professional.
//
// The sibling of utils/nutritionDisplay, deliberately shaped the same way and
// deliberately a separate file: the two answer different questions and the
// recovery-sensitive rules differ between them. Kept adjacent so the four
// states stay in step.
//
// THE FOUR STATES, and why none may borrow another's wording:
//
//   not shared   The professional was never granted workout activity. Saying
//                "no workout" here reports the client's behaviour to someone
//                with no right to it, and is a guess stated as fact.
//   loading      Shared, not yet fetched. Must not read as an absence.
//   empty        Shared, nothing logged in the lookback window.
//   figures      Shared, with a real session on a named day.

export type WorkoutAccess = { workoutActivity: boolean };

export type WorkoutState = "not_shared" | "loading" | "empty" | "trained";

export function workoutState(
  access: WorkoutAccess,
  workout: ClientWorkoutActivity | null | undefined
): WorkoutState {
  if (!access.workoutActivity) return "not_shared";
  if (workout === undefined) return "loading";
  if (workout === null) return "empty";
  return "trained";
}

/**
 * The roster badge.
 *
 * Returns null when there is nothing honest to show, so the caller renders no
 * badge at all rather than an empty one.
 *
 * "No workout" as a standing label is gone. A client who trained yesterday and
 * one who has never trained both used to get it, which made it a judgement
 * rather than a fact. The date says the same thing without the verdict.
 */
export function workoutBadge(
  access: WorkoutAccess,
  workout: ClientWorkoutActivity | null | undefined
): { label: string; trained: boolean } | null {
  switch (workoutState(access, workout)) {
    case "not_shared":
    case "loading":
      return null;
    case "empty":
      return { label: "No sessions yet", trained: false };
    case "trained":
      if (workout!.trainedToday) return { label: "Trained", trained: true };
      return { label: `Last trained ${formatDisplayDate(workout!.lastSessionDate)}`, trained: false };
  }
}

/**
 * Whether this client may be counted in the hero's "N of M trained".
 *
 * Clients who have not shared workout activity are excluded: counting them
 * in the denominator states that they did not train, about someone who simply
 * withheld the data — the same error as a measured-looking zero.
 *
 * Task X: recovery-sensitive clients are no longer excluded. The mode is the
 * client's private setting and a professional never learns of it, so no
 * client is treated differently because of it.
 */
export function countsTowardTrainedTally(
  access: WorkoutAccess,
  workout: ClientWorkoutActivity | null | undefined
): boolean {
  return workoutState(access, workout) === "empty" || workoutState(access, workout) === "trained";
}
