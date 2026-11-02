import { SUBTYPE_SINGULAR } from "../../professionals/subtypeLabels";
import { LANE_LABEL, laneForType } from "../subtypeLanes";
import type { ProfessionalSubtype } from "../../../types";
import { t as tr, tk } from "../../../i18n/core";

/** "Personal trainer", "Dietitian", "Coach or instructor": the type as MO14 / MO26 write it. */
export function typeLabel(t: ProfessionalSubtype | null | undefined): string {
  const s = SUBTYPE_SINGULAR[t ?? "other"] ?? SUBTYPE_SINGULAR.other;
  return tr(s.charAt(0).toUpperCase() + s.slice(1));
}

// The capitalised type names, as catalogue keys (shown through tr()).
void [tk("Personal trainer"), tk("Dietitian"), tk("Physiotherapist"), tk("Doctor"), tk("Nutritionist"), tk("Coach or instructor"), tk("Health professional")];

/** "Personal trainer · Full coaching" (MO26 v2). */
export function typeAndLane(t: ProfessionalSubtype | null | undefined): string {
  return `${typeLabel(t)} · ${tr(LANE_LABEL[laneForType(t)])}`;
}
