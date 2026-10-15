import { BookOpenCheck, CalendarPlus, ClipboardCheck, ClipboardPlus, FilePenLine, ListChecks, Salad, UserPlus, type LucideIcon } from "lucide-react";
import type { ProLane } from "../subtypeLanes";

/** CL1 lower sectors per lane (gen/hub3.js QA3). */
export const LANE_ACTION_ICONS: Record<ProLane, [LucideIcon, string][]> = {
  full_coaching: [
    [UserPlus, "Add client"],
    [CalendarPlus, "New session"],
    [ClipboardPlus, "New programme"],
    [ClipboardCheck, "Review check-ins"],
  ],
  nutrition: [
    [UserPlus, "Add client"],
    [CalendarPlus, "New session"],
    [Salad, "New meal plan"],
    [BookOpenCheck, "Review food journals"],
  ],
  clinical_overview: [
    [UserPlus, "Add client"],
    [CalendarPlus, "New appointment"],
    [FilePenLine, "Add note"],
    [ListChecks, "Review follow-ups"],
  ],
};
