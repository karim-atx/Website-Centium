import type { MuscleGroup } from "../types";

// How each muscle group is written, in one place.
//
// Both exercise surfaces need this — the picker sheet's filter chips and the
// Exercise Database tab's grouped list — and they used to disagree about what
// they were even filtering on: the tab filtered by muscle group while the
// sheet's chips were the prototype's chest/back/arms/legs browse categories.
// public.exercises settles it, because its category column is typed
// public.muscle_group and nothing stores the old grouping any more.
export const MUSCLE_GROUP_LABEL: Record<MuscleGroup, string> = {
  back: "Back",
  bicep: "Bicep",
  calves: "Calves",
  cardio: "Cardio",
  chest: "Chest",
  core: "Core",
  forearms: "Forearms",
  glutes: "Glutes",
  hamstrings: "Hamstrings",
  olympic: "Olympic",
  other: "Other",
  quads: "Quads",
  shoulders: "Shoulders",
  tricep: "Tricep",
};

/**
 * The groups a user may pick or filter by.
 *
 * WITHOUT `olympic`, which was never a muscle. It got into public.muscle_group
 * as a browse category and Database 20260924330000 emptied it: every row that
 * carried it now has real movers and an `olympic_weightlifting` TAG instead,
 * which is the axis people were actually filtering on. The enum value stays
 * for any row written before that, which is why MUSCLE_GROUP_LABEL above
 * still has a label for it — a legacy value must render, it just must not be
 * offered.
 */
export const SELECTABLE_MUSCLE_GROUPS: MuscleGroup[] = (
  Object.keys(MUSCLE_GROUP_LABEL) as MuscleGroup[]
).filter((mg) => mg !== "olympic");
