import type { Exercise, LoggedExercise, LoggedSet, SetOutcome } from "../../types";

// Turning a prescription into the rows an athlete fills in, and turning those
// rows back into what actually happened.
//
// THE ROW COUNT IS THE PRESCRIPTION'S UPPER BOUND, not its lower one. A
// coach who writes "3–5 sets" is offering five and asking for three, and the
// session should show all five — an athlete who has to press "Add set" twice
// to do what was prescribed has been given the wrong screen. The two beyond
// the ask are marked optional and treated differently at the end.
//
// NOTHING IS INVENTED. Until 20260924 the routine reader substituted three
// sets and ten reps for a prescription that left them null, so a session
// against a deliberately open exercise seeded five rows of ten. Absent is now
// absent all the way through: no prescription means ONE row, empty, with the
// Add-set button doing the rest.

/**
 * How many rows to offer, and how many of them were actually asked for.
 *
 * `offered` never goes below `asked`, and never below 1: a screen with no
 * rows has nowhere to log anything, and the Add-set button cannot be the only
 * way to start.
 */
export function setRowCount(ex: Exercise): { offered: number; asked: number } {
  const asked = ex.minSets ?? ex.sets ?? 0;
  // maxSets first: it is the offer. Then the fixed count, then the floor.
  const offered = ex.maxSets ?? ex.sets ?? ex.minSets ?? 0;
  return { offered: Math.max(1, offered, asked), asked };
}

/**
 * The reps to pre-fill, or 0 for "you tell me".
 *
 * A RANGE PRE-FILLS NOTHING. "8–12 reps" has no single right answer, and
 * putting 8 in the box quietly turns the bottom of the range into the target
 * — the prescription belongs in the placeholder, where it reads as guidance
 * rather than as something already logged. Only a single prescribed number
 * is a fact the athlete can be handed.
 */
export function seedReps(ex: Exercise): number {
  if (ex.minReps != null && ex.maxReps != null) return 0;
  return ex.reps ?? 0;
}

/**
 * The set rows a session starts with for one exercise.
 *
 * `weightKg` carries the prescribed load when there is one; the caller
 * substitutes last session's weight when there is not, because only it can
 * see the history.
 */
export function seedSets(ex: Exercise): LoggedSet[] {
  const { offered, asked } = setRowCount(ex);
  const reps = seedReps(ex);
  return Array.from({ length: offered }).map((_, i) => ({
    setNumber: i + 1,
    reps,
    weightKg: ex.weightKg ?? 0,
    completed: false,
    // Rows past what was asked for are an offer, not an expectation.
    ...(asked > 0 && i >= asked ? { optional: true } : {}),
  }));
}

export function initLoggedExercises(exercises: Exercise[]): LoggedExercise[] {
  return exercises.map((ex) => ({
    exerciseId: ex.id,
    // The library reference travels from the routine into the log, which is
    // what lets logged_exercises name what was actually trained.
    ...(ex.exerciseId ? { catalogExerciseId: ex.exerciseId } : {}),
    ...(ex.customExerciseId ? { customExerciseId: ex.customExerciseId } : {}),
    ...(ex.blockId ? { blockResultId: ex.blockId } : {}),
    name: ex.name,
    sets: seedSets(ex),
  }));
}

/** Whether a row has been touched at all — logged, edited, or annotated. */
export function isTouched(s: LoggedSet): boolean {
  return (
    s.outcome != null ||
    s.completed ||
    !!s.isPr ||
    s.reps > 0 ||
    s.weightKg > 0 ||
    !!s.notes ||
    s.rpe != null ||
    !!s.setType
  );
}

/**
 * What to save: every row that happened, and nothing that was only offered.
 *
 * AN UNTOUCHED OPTIONAL ROW IS DROPPED, NOT SKIPPED. "3–5 sets" asks for
 * three; doing three is doing what was prescribed, and recording the fourth
 * and fifth as skipped would file a complete session as two-fifths abandoned.
 * A row the athlete *asked for* (Add set) is never optional and so is never
 * dropped — leaving one blank is a real skip.
 *
 * Every remaining row gets an outcome, because a saved session has no
 * "not yet": the ones nobody touched are the ones that were skipped.
 */
export function finalizeSets(sets: LoggedSet[]): LoggedSet[] {
  return sets
    .filter((s) => !(s.optional && !isTouched(s)))
    .map((s, i) => ({
      ...s,
      setNumber: i + 1,
      outcome: s.outcome ?? (s.completed ? "completed" : "skipped"),
      // `completed` is derived from the outcome by a database trigger; doing
      // the same here keeps the object the UI holds consistent with the row
      // that will come back, rather than letting the two drift for a render.
      completed: (s.outcome ?? (s.completed ? "completed" : "skipped")) !== "skipped",
    }));
}

export function finalizeExercises(exercises: LoggedExercise[]): LoggedExercise[] {
  return exercises.map((ex) => ({ ...ex, sets: finalizeSets(ex.sets) }));
}

/**
 * Whether a set counts toward volume.
 *
 * A SKIPPED SET CONTRIBUTES NOTHING — it did not happen. A FAILED ONE
 * CONTRIBUTES WHAT WAS ACTUALLY DONE: someone who was asked for eight and
 * ground out five lifted five sets' worth of weight, and zeroing it would
 * tell them their hardest set was worth nothing. The reps in the box are
 * already the reps done, which is what makes this a filter and not a
 * calculation.
 */
export function countsTowardVolume(s: LoggedSet): boolean {
  if (s.outcome) return s.outcome !== "skipped";
  return s.completed;
}

/** The outcome a row displays, treating an unlogged row as nothing yet. */
export function outcomeOf(s: LoggedSet): SetOutcome | null {
  if (s.outcome) return s.outcome;
  return s.completed ? "completed" : null;
}
