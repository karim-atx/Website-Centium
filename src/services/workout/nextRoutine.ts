// Which routine the app offers next, in one place.
//
// PURE, AND ONE RULE FOR TWO SCREENS. Home's quick-start button and the Home
// workout widget both answer "what would you train now?", and they used to
// answer it differently: the button picked the last-trained routine, while the
// widget printed a hardcoded "Upper Body · 4 exercises" from
// data/mockWorkouts. One of those was the user's, the other was nobody's, and
// they sat on the same screen.
//
// NULL IS AN ANSWER. An account with no routines has no next routine, and the
// callers say so rather than falling back to an invented one — which is what
// the button did too, borrowing the same mock program the moment
// `routines[0]` was missing.

/** Only what the rule needs; both callers pass their own fuller types. */
export interface RoutineLike {
  id: string;
  name: string;
  exercises: unknown[];
  estimatedDurationMin?: number;
}

export interface SessionLike {
  routineId: string | null;
}

/**
 * The routine to offer, or null when there is none.
 *
 * MOST RECENTLY TRAINED FIRST, because "log the thing I normally log" is what
 * this button is for and the last session is the best evidence of it. Sessions
 * are oldest-first, so the search runs backwards. A session whose routine has
 * since been deleted is skipped rather than ending the search — the routine is
 * gone, the intent is not.
 *
 * Falls back to the first routine, which is the only sensible answer before
 * anything has been trained.
 */
export function nextRoutine<T extends RoutineLike>(
  routines: readonly T[],
  sessions: readonly SessionLike[]
): T | null {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const id = sessions[i].routineId;
    if (!id) continue;
    const match = routines.find((r) => r.id === id);
    if (match) return match;
  }
  return routines[0] ?? null;
}
