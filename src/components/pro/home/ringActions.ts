import { BookOpenCheck, CalendarPlus, ClipboardCheck, ClipboardPlus, FilePenLine, ListChecks, Salad, UserPlus, type LucideIcon } from "lucide-react";
import type { ProLane } from "../subtypeLanes";
import { tk } from "../../../i18n/core";

/** CL1 lower sectors per lane (gen/hub3.js QA3). */
export const LANE_ACTION_ICONS: Record<ProLane, [LucideIcon, string][]> = {
  full_coaching: [
    [UserPlus, tk("Add client")],
    [CalendarPlus, tk("New session")],
    [ClipboardPlus, tk("New programme")],
    [ClipboardCheck, tk("Review check-ins")],
  ],
  nutrition: [
    [UserPlus, tk("Add client")],
    [CalendarPlus, tk("New session")],
    [Salad, tk("New meal plan")],
    [BookOpenCheck, tk("Review food journals")],
  ],
  clinical_overview: [
    [UserPlus, tk("Add client")],
    [CalendarPlus, tk("New appointment")],
    [FilePenLine, tk("Add note")],
    [ListChecks, tk("Review follow-ups")],
  ],
};
