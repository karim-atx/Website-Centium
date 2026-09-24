// What a blood-pressure reading IS, with no database attached.
//
// SEPARATE FROM ./index.ts SO IT CAN BE IMPORTED ANYWHERE. That module opens a
// Supabase client, which reaches `document` and `import.meta.env`; importing it
// from src/types pulled the browser into the type-checking pass the node test
// runner uses, and broke a build that has nothing to do with blood pressure.
// A shape is not a dependency on a database.

export type BpArm = "left" | "right";
export type BpPosition = "sitting" | "standing" | "lying";

/** Matches the table's CHECKs, so a typo becomes a sentence rather than a 23514. */
export const BP_LIMITS = {
  systolic: { min: 50, max: 300 },
  diastolic: { min: 30, max: 200 },
  pulse: { min: 25, max: 250 },
  notesMaxLength: 500,
} as const;

export const BP_ARMS: readonly BpArm[] = ["left", "right"];
export const BP_POSITIONS: readonly BpPosition[] = ["sitting", "standing", "lying"];

export interface BloodPressureInput {
  systolic: number;
  diastolic: number;
  /** Not every cuff reports one. */
  pulse?: number | null;
  arm?: BpArm | null;
  position?: BpPosition | null;
  notes?: string | null;
}

export interface BloodPressureReading extends BloodPressureInput {
  id: string;
  /** ISO timestamp of the measurement itself, not of the row. */
  recordedAt: string;
}
