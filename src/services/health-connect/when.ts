import { clock12 } from "../../utils/time12";
import { localDay, whenText } from "../health-metrics/b1";

/** "8:05 AM" today, else the day: Health's own "Synced {when}" rule. */
export function syncedWhen(iso: string, today: string): string {
  return localDay(iso) === today ? clock12(iso) : whenText(iso, today);
}
