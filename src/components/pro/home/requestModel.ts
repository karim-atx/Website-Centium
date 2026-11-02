// Release 3 follow-up (20261124120000): the pure rules behind a request row.
// - A request carries the plan the client chose (pending_client_requests
//   plan_id, with plan_price stamped by the database) and their message.
//   HO7 / HO11 draw the plan as "Monthly coaching · $120 a month".
// - After a decline, "Declined · Undo" shows for up to 5 minutes
//   (undo_client_request_decline; ATXH2 once the window has passed).

import { formatPrice } from "../../../utils/price";
import { t, tk } from "../../../i18n/core";

export const UNDO_WINDOW_MS = 5 * 60 * 1000;

/** The billing words after a plan price. HO7 draws "$120 a month"; the others follow it. */
const PER: Record<string, string> = {
  daily: tk("{price} a day"),
  monthly: tk("{price} a month"),
  quarterly: tk("{price} every 3 months"),
  semiannually: tk("{price} every 6 months"),
  annually: tk("{price} a year"),
};

/** "Monthly coaching · $120 a month", or null when the request names no plan. */
export function requestPlanLine(planName: string | null, price: number | null, billing: string | null): string | null {
  const name = planName?.trim();
  if (!name) return null;
  if (price === null || !Number.isFinite(price)) return name;
  const amount = formatPrice(price) || "$0";
  const per = billing ? PER[billing] : undefined;
  return `${name} · ${per ? t(per, { price: amount }) : amount}`;
}

/** Whether a decline at `resolvedAt` can still be undone at `now`. */
export function undoOpen(resolvedAt: string, now: number): boolean {
  const t = Date.parse(resolvedAt);
  return Number.isFinite(t) && now - t < UNDO_WINDOW_MS;
}

/** Milliseconds until the first open undo window closes, or null when none is open. */
export function nextUndoClose(resolvedAts: string[], now: number): number | null {
  let best: number | null = null;
  for (const r of resolvedAts) {
    const t = Date.parse(r);
    if (!Number.isFinite(t)) continue;
    const left = t + UNDO_WINDOW_MS - now;
    if (left > 0 && (best === null || left < best)) best = left;
  }
  return best;
}
