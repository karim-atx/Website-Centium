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
  // Allowed by the validator and carried by nothing yet. It is in the list so
  // the picker can offer it; the FILTER chips are derived from the tags the
  // data actually has, so an empty one never appears as a chip nobody can use.
  "mobility",
];

export const EXERCISE_TAG_LABEL: Record<ExerciseTag, string> = {
  olympic_weightlifting: "Olympic weightlifting",
  crossfit: "CrossFit",
  running: "Running",
  plyometric: "Plyometric",
  mobility: "Mobility",
};

/** The order chips appear in, which is the order the brief names them. */
const TAG_ORDER: ExerciseTag[] = [
  "olympic_weightlifting",
  "crossfit",
  "running",
  "plyometric",
  "mobility",
];

/**
 * The tags worth offering as filters: the ones something actually carries.
 *
 * DERIVED FROM THE DATA, NOT FROM THE VOCABULARY. `mobility` is a legal tag
 * with zero rows today, and a chip that always returns an empty list is a
 * dead control — one the user has to try before learning it does nothing.
 * When the library gains a mobility movement the chip appears on its own.
 */
export function tagsPresentIn(items: { tags?: ExerciseTag[] }[]): ExerciseTag[] {
  const seen = new Set<ExerciseTag>();
  for (const item of items) for (const tag of item.tags ?? []) seen.add(tag);
  return TAG_ORDER.filter((tag) => seen.has(tag));
}

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
