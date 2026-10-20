import { SUBTYPE_SINGULAR } from "../../professionals/subtypeLabels";
import { LANE_LABEL, laneForType } from "../subtypeLanes";
import type { ProfessionalSubtype } from "../../../types";

/** "Personal trainer", "Dietitian", "Coach or instructor": the type as MO14 / MO26 write it. */
export function typeLabel(t: ProfessionalSubtype | null | undefined): string {
  const s = SUBTYPE_SINGULAR[t ?? "other"] ?? SUBTYPE_SINGULAR.other;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Personal trainer · Full coaching" (MO26 v2). */
export function typeAndLane(t: ProfessionalSubtype | null | undefined): string {
  return `${typeLabel(t)} · ${LANE_LABEL[laneForType(t)]}`;
}
