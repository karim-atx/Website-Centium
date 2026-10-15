import { clock12 } from "../../../utils/time12";
import { shortDate } from "../../../services/store/format";
import type { DiaryAppt } from "../../../services/appointments";

// The client is the server's label (business_appointments.client_label:
// "Member #0042" unless the client shared their name). Render it as is.

export const serviceTitle = (a: Pick<DiaryAppt, "serviceName" | "durationMin">) => `${a.serviceName}, ${a.durationMin} min`;

/** "Today, Tue 14 Oct" (OP1-020 #4, OURS sub). */
export function todaySub(now = new Date()): string {
  return `Today, ${shortDate(now)}`;
}

export const time = (iso: string) => clock12(iso);
