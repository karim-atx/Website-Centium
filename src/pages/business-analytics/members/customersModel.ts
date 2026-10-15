import type { CustomerOrder } from "../../../services/store/types";
import { isoOf, mondayOf, type AnalyticsRange } from "../analyticsRange";

// AN4-045 row 13 · the Store "Customers" index (COPY.md l.481): Customers
// (with an order in the range), Ordered again (customers with 2+ orders /
// customers, HANDOVER §3.10, shown from 10 orders), New this week (first
// order this week, Monday start), and the Top customers list. Counted from
// B11 store_orders (placed, not cancelled); who they are is
// business_people(…, 'customers')'s label, never a name formatted here.

export type { CustomerOrder };

/** §3.10: "Ordered again" needs 10 orders before it means anything. */
export const ORDERED_AGAIN_MIN = 10;

export interface CustomersIndex {
  inRange: number;
  /** null until ORDERED_AGAIN_MIN orders. */
  orderedAgainPct: number | null;
  newThisWeek: number;
  orders: number;
}

const counted = (o: CustomerOrder) => o.status !== "cancelled" && !!o.customerId;
const dayOf = (ts: string) => isoOf(new Date(ts));

export function customersIndex(orders: CustomerOrder[], range: AnalyticsRange, today: string = isoOf(new Date())): CustomersIndex {
  const list = orders.filter(counted);
  const inRange = new Set(list.filter((o) => { const d = dayOf(o.placedAt); return d >= range.from && d <= range.to; }).map((o) => o.customerId!));
  const per = new Map<string, { n: number; first: string }>();
  for (const o of list) {
    const cur = per.get(o.customerId!) ?? { n: 0, first: o.placedAt };
    cur.n += 1;
    if (o.placedAt < cur.first) cur.first = o.placedAt;
    per.set(o.customerId!, cur);
  }
  const monday = mondayOf(today);
  const again = [...per.values()].filter((v) => v.n >= 2).length;
  return {
    inRange: inRange.size,
    orderedAgainPct: list.length >= ORDERED_AGAIN_MIN && per.size > 0 ? Math.round((again / per.size) * 100) : null,
    newThisWeek: [...per.values()].filter((v) => dayOf(v.first) >= monday).length,
    orders: list.length,
  };
}

export interface TopCustomer {
  customerId: string;
  orders: number;
  lastAt: string;
}

/** Most orders first, then the most recent. */
export function topCustomers(orders: CustomerOrder[]): TopCustomer[] {
  const per = new Map<string, TopCustomer>();
  for (const o of orders.filter(counted)) {
    const cur = per.get(o.customerId!) ?? { customerId: o.customerId!, orders: 0, lastAt: o.placedAt };
    cur.orders += 1;
    if (o.placedAt > cur.lastAt) cur.lastAt = o.placedAt;
    per.set(o.customerId!, cur);
  }
  return [...per.values()].sort((a, b) => b.orders - a.orders || (a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0));
}
