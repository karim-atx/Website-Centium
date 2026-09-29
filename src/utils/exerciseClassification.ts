import type { ExerciseClassification } from "../types";

/** The classifications in the order the pickers list them (WO11 / WO12). */
export const classificationOptions: { value: ExerciseClassification; label: string }[] = [
  { value: "barbell", label: "Barbell" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "machine_other", label: "Machine / Other" },
  { value: "weighted_bodyweight", label: "Weighted Bodyweight" },
  { value: "assisted_bodyweight", label: "Assisted Bodyweight" },
  { value: "reps_only", label: "Reps Only" },
  { value: "cardio", label: "Cardio" },
  { value: "duration", label: "Duration" },
];

export const classificationLabel = (c: ExerciseClassification): string =>
  classificationOptions.find((o) => o.value === c)?.label ?? c;
