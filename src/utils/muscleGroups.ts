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
