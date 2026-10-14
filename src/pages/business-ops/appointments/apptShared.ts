import { clock12 } from "../../../utils/time12";
import { shortDate } from "../../../services/store/format";
import type { Appointment } from "../../../services/appointments";

/** The client as the business sees them: the name for its own clients, else "Client #2C8E" (§4). */
export function clientLabel(a: { clientName: string | null; clientId: string | null }): string {
  if (a.clientName) return a.clientName;
  const id = (a.clientId ?? "").replace(/-/g, "");
  return id ? `Client #${id.slice(0, 4).toUpperCase()}` : "Client";
}

export const serviceTitle = (a: Pick<Appointment, "serviceName" | "durationMin">) => `${a.serviceName}, ${a.durationMin} min`;

/** "Today, Tue 14 Oct" (OP1-020 #4, OURS sub). */
export function todaySub(now = new Date()): string {
  return `Today, ${shortDate(now)}`;
}

export const time = (iso: string) => clock12(iso);
