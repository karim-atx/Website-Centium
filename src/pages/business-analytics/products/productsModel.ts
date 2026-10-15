import type { Product, StoreOrder } from "../../../services/store/types";
import {
  addDays,
  dateOf,
  daysBetween,
  isoOf,
  mondayOf,
  previousOf,
  type AnalyticsRange,
} from "../analyticsRange";

// AN11 numbers from real store orders (B11 store_orders / store_order_items)
// only. Until B11 is on the database the screens show their empty states,
// never a sample. An order counts once placed and not cancelled; returned
// items are part of Returns (OP1), not taken off sales here.

const MON = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const dm = (iso: string) => {
  const d = dateOf(iso);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
};
const dayOf = (ts: string) => isoOf(new Date(ts));

export interface Sold {
  units: number;
  revenue: number;
}

const counts = (o: StoreOrder) => o.status !== "cancelled";

/** Units and revenue per product (business_offerings id) in [from, to]. */
export function soldBy(
  orders: StoreOrder[],
  from: string,
  to: string,
): Map<string, Sold> {
  const m = new Map<string, Sold>();
  for (const o of orders) {
    if (!counts(o)) continue;
    const d = dayOf(o.placedAt);
    if (d < from || d > to) continue;
    for (const it of o.items) {
      if (!it.offeringId) continue;
      const cur = m.get(it.offeringId) ?? { units: 0, revenue: 0 };
      cur.units += it.qty;
      cur.revenue += it.lineTotal;
      m.set(it.offeringId, cur);
    }
  }
  return m;
}

export interface ProductRow {
  product: Product;
  units: number;
  revenue: number;
  prevUnits: number | null;
}

export interface Headline {
  live: number;
  sold: number | null;
  soldDelta: number | null;
  sales: number | null;
  salesDeltaPct: number | null;
  /** First order less than 4 weeks ago: deltas hidden, early line shown. */
  early: boolean;
  rows: ProductRow[];
  /** Top 5 by units this period (only products that sold). */
  top: ProductRow[];
  anyOrders: boolean;
}

/**
 * The index numbers. `orders` null = B11 not shipped (or not loaded): sales
 * are unknown ("–"), never 0.
 */
export function headlineOf(
  products: Product[],
  orders: StoreOrder[] | null,
  range: AnalyticsRange,
  today: string = isoOf(new Date()),
): Headline {
  const live = products.filter((p) => p.visible).length;
  if (!orders) {
    return {
      live,
      sold: null,
      soldDelta: null,
      sales: null,
      salesDeltaPct: null,
      early: false,
      rows: products.map((p) => ({
        product: p,
        units: 0,
        revenue: 0,
        prevUnits: null,
      })),
      top: [],
      anyOrders: false,
    };
  }
  const placed = orders.filter(counts);
  const first = placed.length
    ? placed.reduce(
        (m, o) => (o.placedAt < m ? o.placedAt : m),
        placed[0].placedAt,
      )
    : null;
  const early = !!first && daysBetween(dayOf(first), today) < 28;
  const now = soldBy(orders, range.from, range.to);
  const p = previousOf(range);
  const before = soldBy(orders, p.from, p.to);
  const rows = products.map((pr) => ({
    product: pr,
    units: now.get(pr.id)?.units ?? 0,
    revenue: now.get(pr.id)?.revenue ?? 0,
    prevUnits: early || !range.compare ? null : (before.get(pr.id)?.units ?? 0),
  }));
  const sum = (m: Map<string, Sold>, k: keyof Sold) =>
    [...m.values()].reduce((s, v) => s + v[k], 0);
  const sold = sum(now, "units");
  const prevSold = sum(before, "units");
  const sales = sum(now, "revenue");
  const prevSales = sum(before, "revenue");
  const showDelta = !early && range.compare;
  return {
    live,
    sold,
    soldDelta: showDelta ? sold - prevSold : null,
    sales,
    salesDeltaPct:
      showDelta && prevSales > 0
        ? Math.round(((sales - prevSales) / prevSales) * 100)
        : null,
    early,
    rows,
    top: rows
      .filter((r) => r.units > 0)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5),
    anyOrders: placed.length > 0,
  };
}

/**
 * B11's own figures for the index: store_sales_summary (units, sales) for the
 * range and the period before, and store_top_products (ranked by units, then
 * sales). They count days in the business's time zone, so they win over the
 * per-order sums for the headline and "What's selling?"; the per-product rows
 * and the detail chart stay on the order lines.
 */
export interface ServerSales {
  now: { units: number; sales: number };
  prev: { units: number; sales: number } | null;
  top: { offeringId: string | null; units: number; sales: number }[];
}

export function withServerSales(
  h: Headline,
  s: ServerSales | null,
  range: AnalyticsRange,
): Headline {
  if (!s || h.sold === null) return h;
  const showDelta = !h.early && range.compare && s.prev !== null;
  const byId = new Map(h.rows.map((r) => [r.product.id, r]));
  const top = s.top
    .filter((t) => t.units > 0 && t.offeringId && byId.has(t.offeringId))
    .slice(0, 5)
    .map((t) => ({ ...byId.get(t.offeringId!)!, units: t.units, revenue: t.sales }));
  return {
    ...h,
    sold: s.now.units,
    soldDelta: showDelta ? s.now.units - s.prev!.units : null,
    sales: s.now.sales,
    salesDeltaPct:
      showDelta && s.prev!.sales > 0
        ? Math.round(((s.now.sales - s.prev!.sales) / s.prev!.sales) * 100)
        : null,
    top,
  };
}

export function money(v: number): string {
  return (
    (v < 0 ? "−" : "") +
    "$" +
    String(Math.round(Math.abs(v))).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  );
}

/** "$29", "$42.50" (list prices keep their cents). */
export function price(v: number | null): string {
  if (v === null) return "No price";
  return (
    "$" +
    (Number.isInteger(v)
      ? v.toLocaleString("en-US")
      : v.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }))
  );
}

// ---------------------------------------------------------------------------
// Product detail chart (OURS-AN11-listing-detail row 3): 8 Monday weeks
// ending with the week of the range end, against the 8 weeks before.

export const DETAIL_WEEKS = 8;

export interface ProductSeries {
  labels: string[];
  xl: string[];
  units: number[];
  revenue: number[];
  prevUnits: number[];
  prevRevenue: number[];
  totU: number;
  totR: number;
  prevTotU: number;
  prevTotR: number;
  bestIdx: number;
  /** First sale of this product less than 2 weeks ago. */
  early: boolean;
}

export function productSeries(
  productId: string,
  orders: StoreOrder[],
  range: AnalyticsRange,
  today: string = isoOf(new Date()),
): ProductSeries {
  const last = mondayOf(range.to);
  const starts = Array.from({ length: DETAIL_WEEKS }, (_, i) =>
    addDays(last, -7 * (DETAIL_WEEKS - 1 - i)),
  );
  const week = (s: string) => {
    const m = soldBy(orders, s, addDays(s, 6)).get(productId);
    return { u: m?.units ?? 0, r: m?.revenue ?? 0 };
  };
  const cur = starts.map(week);
  const prev = starts.map((s) => week(addDays(s, -7 * DETAIL_WEEKS)));
  const units = cur.map((c) => c.u);
  const revenue = cur.map((c) => c.r);
  const totU = units.reduce((s, v) => s + v, 0);
  let bestIdx = 0;
  units.forEach((u, i) => {
    if (u > units[bestIdx]) bestIdx = i;
  });
  const firsts = orders
    .filter(
      (o) => counts(o) && o.items.some((it) => it.offeringId === productId),
    )
    .map((o) => o.placedAt)
    .sort();
  return {
    labels: starts.map((s) => "Week of " + dm(s)),
    xl: [
      dm(starts[0]),
      dm(starts[Math.floor(DETAIL_WEEKS / 2) - 1]),
      dm(starts[DETAIL_WEEKS - 1]),
    ],
    units,
    revenue,
    prevUnits: prev.map((p) => p.u),
    prevRevenue: prev.map((p) => p.r),
    totU,
    totR: revenue.reduce((s, v) => s + v, 0),
    prevTotU: prev.reduce((s, v) => s + v.u, 0),
    prevTotR: prev.reduce((s, v) => s + v.r, 0),
    bestIdx,
    early: !!firsts[0] && daysBetween(dayOf(firsts[0]), today) < 14,
  };
}

/** OURS-AN11-listing-detail row 3b: numbers only. */
export function detailLead(visible: boolean, s: ProductSeries | null): string {
  if (!visible) return "Hidden from Explore, so no new sales.";
  if (!s || s.totU === 0)
    return "No sales yet. Sales show here once it starts selling.";
  const perWeek = Math.max(1, Math.round(s.totU / DETAIL_WEEKS));
  if (s.prevTotU > 0 && s.totU > s.prevTotU)
    return `Selling about ${perWeek} a week, up on the 8 weeks before.`;
  if (s.prevTotU > 0 && s.totU < s.prevTotU)
    return `Selling about ${perWeek} a week, a little slower than the 8 weeks before.`;
  return `Selling steadily, about ${perWeek} a week.`;
}

export type SortKey = "sold" | "price" | "new";
export const SORTS: { key: SortKey; label: string }[] = [
  { key: "sold", label: "Most sold" },
  { key: "price", label: "Price, low to high" },
  { key: "new", label: "Newest first" },
];

/** `newest`: each product id to its place in the newest-first list (fetchStoreProducts order). */
export function sortRows(
  rows: ProductRow[],
  key: SortKey,
  newest: Map<string, number>,
): ProductRow[] {
  const out = rows.slice();
  if (key === "price")
    out.sort(
      (a, b) => (a.product.price ?? Infinity) - (b.product.price ?? Infinity),
    );
  else if (key === "new")
    out.sort(
      (a, b) =>
        (newest.get(a.product.id) ?? 0) - (newest.get(b.product.id) ?? 0),
    );
  else
    out.sort(
      (a, b) =>
        b.units - a.units || a.product.name.localeCompare(b.product.name),
    );
  return out;
}
