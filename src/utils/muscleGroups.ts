import type { MuscleGroup } from "../types";
import { tk } from "../i18n/core";

// How each muscle group is written, in one place. Plural Biceps / Triceps
// everywhere (v6 WO1.3 D12, the Body view and the frames).
//
// Both exercise surfaces need this — the picker sheet's filter chips and the
// Exercise Database tab's grouped list — and they used to disagree about what
// they were even filtering on: the tab filtered by muscle group while the
// sheet's chips were the prototype's chest/back/arms/legs browse categories.
// public.exercises settles it, because its category column is typed
// public.muscle_group and nothing stores the old grouping any more.
export const MUSCLE_GROUP_LABEL: Record<MuscleGroup, string> = {
  // "Back" the muscle is tx("Back", "muscle") where shown (components/workout/muscleLabel), apart from the Back button.
  back: "Back",
  bicep: tk("Biceps"),
  calves: tk("Calves"),
  cardio: tk("Cardio"),
  chest: tk("Chest"),
  core: tk("Core"),
  forearms: tk("Forearms"),
  glutes: tk("Glutes"),
  hamstrings: tk("Hamstrings"),
  olympic: tk("Olympic"),
  other: tk("Other"),
  quads: tk("Quads"),
  shoulders: tk("Shoulders"),
  tricep: tk("Triceps"),
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
