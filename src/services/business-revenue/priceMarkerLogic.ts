// CQ (Batch 2): plan price changes as markers on the Revenue chart. Pure
// logic only (no Supabase client), so the node tests can import it. The
// reader is priceMarkers.ts; the start of the history is
// plan_price_tracking_since(), read there and passed in here as a day.

import { formatPrice } from "../../utils/price";

/** plan_price_markers(p_business_id, p_from, p_to) row, as PostgREST returns it (numeric as text). */
export interface PriceMarkerRow {
  changed_on: string;
  plan_id: string;
  plan_name: string | null;
  old_price: number | string;
  new_price: number | string;
  changed_at: string;
}

export interface PriceChange {
  /** The day in the business's timezone (the reader already dates it so). */
  on: string;
  planId: string;
  /** NULL for a plan deleted since: the change still happened. */
  planName: string | null;
  oldPrice: number;
  newPrice: number;
  at: string;
}

export function toPriceChange(r: PriceMarkerRow): PriceChange {
  return {
    on: String(r.changed_on).slice(0, 10),
    planId: r.plan_id,
    planName: r.plan_name && r.plan_name.trim() ? r.plan_name.trim() : null,
    oldPrice: Number(r.old_price),
    newPrice: Number(r.new_price),
    at: r.changed_at,
  };
}

/** "$40 to $45" (the handoff's price tag, AnInsightsV3 chA; the app's plan price format). */
export const priceStep = (c: Pick<PriceChange, "oldPrice" | "newPrice">) =>
  `${formatPrice(c.oldPrice)} to ${formatPrice(c.newPrice)}`;

const NAME_MAX = 22;
/** The plan as the tooltip names it; a deleted plan gets a neutral name. */
export function planLabel(name: string | null): string {
  if (!name) return "A removed plan's price";
  const short = name.length > NAME_MAX ? name.slice(0, NAME_MAX - 1).trimEnd() + "…" : name;
  return `${short} price`;
}

export interface PriceBucket {
  /** The chart bucket (index into its days or week starts). */
  i: number;
  /** The tag on the chart: the step when one change, else a count. */
  t: string;
  /** One tooltip row per change, in the order they happened. */
  rows: { l: string; v: string }[];
}

/**
 * Price changes grouped onto the chart's buckets, the way promoStartMarkers
 * places promotions: `buckets` are the chart's days or week starts
 * (YYYY-MM-DD, ascending), `last` the last day the final bucket covers. Every
 * change in a bucket stays readable: the tag counts them and the tooltip
 * lists each one.
 */
export function priceBuckets(
  changes: readonly PriceChange[],
  buckets: readonly string[],
  last: string,
): PriceBucket[] {
  if (!buckets.length) return [];
  const by = new Map<number, PriceChange[]>();
  for (const c of changes) {
    if (c.on < buckets[0] || c.on > last) continue;
    let i = 0;
    while (i + 1 < buckets.length && buckets[i + 1] <= c.on) i++;
    const list = by.get(i) ?? [];
    list.push(c);
    by.set(i, list);
  }
  return [...by.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([i, list]) => {
      const sorted = [...list].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
      return {
        i,
        t: sorted.length === 1 ? priceStep(sorted[0]) : `${sorted.length} price changes`,
        rows: sorted.map((c) => ({ l: planLabel(c.planName), v: priceStep(c) })),
      };
    });
}

/**
 * A row for each price tag so tags don't sit on top of each other. Tags
 * already on the chart (`taken`, the promotions' buckets) keep row 0; each
 * price tag takes the first row (0 to 2) with no tag within `gap` buckets, a
 * tag being about a quarter of the plot wide. Row 0 when all three are busy.
 */
export function tagRows(taken: readonly number[], price: readonly number[], n: number): number[] {
  const gap = Math.max(1, Math.ceil((n - 1) * 0.28));
  const rows: number[][] = [[...taken], [], []];
  return price.map((i) => {
    const r = rows.findIndex((list) => list.every((j) => Math.abs(j - i) >= gap));
    const row = r < 0 ? 0 : r;
    rows[row].push(i);
    return row;
  });
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Oct 21", or "Oct 21, 2026" when the year differs from today's. */
export function monDay(iso: string, today: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = `${MON[m - 1]} ${d}`;
  return today.slice(0, 4) === String(y) ? base : `${base}, ${y}`;
}

/**
 * plan_price_tracking_since()'s timestamptz as the device's day
 * ("2026-10-21"); null when the server has no date (nothing recorded yet).
 */
export function sinceDay(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * The line under the chart. History starts at `since` with no backfill, so
 * the line always names that day, and says so outright when the window
 * reaches back before it: an empty stretch there means "not recorded", never
 * "no price changed".
 */
export function priceSinceLine(from: string, since: string, today: string): string {
  const head = `Plan price changes are marked since ${monDay(since, today)}.`;
  return from < since ? `${head} Earlier changes weren't recorded.` : head;
}
