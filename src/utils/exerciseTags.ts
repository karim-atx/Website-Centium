import type { ExerciseTag } from "../types";

// The disciplines a movement belongs to.
//
// ORTHOGONAL TO ANATOMY, which is the whole reason the column exists.
// `muscleGroups` answers "what does this train" and cannot answer "is this an
// Olympic lift", because the answer is not a muscle — a Snatch trains
// shoulders and so does a Lateral Raise. And it is many-to-many: a Front Squat
// is an Olympic accessory and a CrossFit staple at once.
//
// THIS LIST MIRRORS public.valid_exercise_tags, which rejects anything outside
// it. Adding a value here without adding it there produces a 23514 on save.

export const EXERCISE_TAGS: ExerciseTag[] = [
  "olympic_weightlifting",
  "crossfit",
  "running",
  "plyometric",
  // Allowed by the validator and carried by nothing yet. The picker and the
  // Library's Discipline filter (WO2.1: "All + every discipline, including
  // Mobility") both offer it.
  "mobility",
];

export const EXERCISE_TAG_LABEL: Record<ExerciseTag, string> = {
  olympic_weightlifting: "Olympic weightlifting",
  crossfit: "CrossFit",
  running: "Running",
  plyometric: "Plyometric",
  mobility: "Mobility",
};

/**
 * Whether a value from the database is one this build knows.
 *
 * A row written by a newer client carries a tag this one has no label for.
 * Dropping it on read keeps the filter honest — an unknown tag can be neither
 * shown nor filtered on — and leaves the row itself untouched, since nothing
 * here writes back what it did not understand.
 */
export const isKnownTag = (value: string): value is ExerciseTag =>
  (EXERCISE_TAGS as string[]).includes(value);

export const readTags = (raw: string[] | null | undefined): ExerciseTag[] =>
  (raw ?? []).filter(isKnownTag);
