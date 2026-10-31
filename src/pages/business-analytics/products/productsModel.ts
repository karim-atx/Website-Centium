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
import { appLocale } from "../../../i18n/format";

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
  return `${MON[d.getMonth()]} ${d.getDate()}`;
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
      ? v.toLocaleString(appLocale("en-US"))
      : v.toLocaleString(appLocale("en-US"), {
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

// ---------------------------------------------------------------------------
// Discounts (AN11-009 to -020; AnStoreOfferingsV2 dInfo / ddv / mkChart):
// the B13 promotions rows, their promotion_stats uses and the
// promotion_redemptions days. Promotions are recorded against payments, not
// taken off prices, so "Discount given" stays "–" (B8_B16_REVIEW #24); there
// is no code field (#15), so the code chip never shows, and a row without a
// use limit reads "{n} used · no limit" (dInfo's own words).

/** The promotion fields the discount views read. */
export interface DiscountFacts {
  status: "scheduled" | "live" | "paused" | "ended";
  startsOn: string;
  endsOn: string | null;
  endedAt: string | null;
  useLimit: number | null;
  /** promotion_stats uses; null when the seat can't read it. */
  uses: number | null;
  showOnListing: boolean;
  audience: "new" | "everyone";
}

export type DaysLeftTone = "soon" | "normal" | "scheduled" | "ended";

export interface DiscountView {
  /** Live and ends within 7 days (the "Ends soon" flag, caution border). */
  soon: boolean;
  /** Live 30 days or more with no use in the last 30 days (the "Unused" flag). */
  unused: boolean;
  /** Days since the last use (or the start when never used); null when the last use is older than the window read. */
  idleDays: number | null;
  daysLeft: string;
  dlTone: DaysLeftTone;
  /** "1 Sep to 31 Dec" / "From 1 Sep". */
  dates: string;
  from: string;
  to: string;
  /** The real end day: the day it was ended early, else ends_on. */
  end: string | null;
  /** Validity bar fill, 0 to 100. */
  elapsed: number;
  /** The today marker (only while Active). */
  marker: boolean;
  /** "11 of 30 used" / "23 used · no limit"; null when uses are not readable. */
  use: string | null;
  /** Uses bar width, 0 to 100. */
  usePct: number;
  /** caution at 80% of the limit or more, axis once ended, else primary. */
  useTone: "primary" | "caution" | "ended";
}

const nWord = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The day it really ended: ended_at's day when earlier than ends_on. */
export function discountEnd(f: Pick<DiscountFacts, "endsOn" | "endedAt">): string | null {
  if (f.endedAt) {
    const d = dayOf(f.endedAt);
    return f.endsOn && f.endsOn < d ? f.endsOn : d;
  }
  return f.endsOn;
}

/**
 * One discount's row / detail values (dInfo). `lastUse` is the newest
 * redemption day inside the window read (null when none there);
 * `windowFrom` is that window's first day.
 */
export function discountView(f: DiscountFacts, today: string, lastUse: string | null, windowFrom: string): DiscountView {
  const end = discountEnd(f);
  const left = f.endsOn ? daysBetween(today, f.endsOn) : null;
  const soon = f.status === "live" && left !== null && left >= 0 && left <= 7;
  const age = daysBetween(f.startsOn, today);
  const idleDays = lastUse ? daysBetween(lastUse, today) : f.uses === 0 || windowFrom <= f.startsOn ? age : null;
  const unused = f.status === "live" && f.uses !== null && age >= 30 && (!lastUse || daysBetween(lastUse, today) >= 30);
  let daysLeft: string;
  let dlTone: DaysLeftTone;
  if (f.status === "scheduled") {
    daysLeft = `Starts in ${nWord(daysBetween(today, f.startsOn), "day", "days")}`;
    dlTone = "scheduled";
  } else if (f.status === "ended") {
    daysLeft = `Ended ${dm(end ?? today)}`;
    dlTone = "ended";
  } else if (left === null) {
    daysLeft = "No end date";
    dlTone = "normal";
  } else {
    daysLeft = left <= 0 ? "Ends today" : `${nWord(left, "day", "days")} left`;
    dlTone = soon ? "soon" : "normal";
  }
  let elapsed = 0;
  if (f.status === "ended") elapsed = 100;
  else if (f.status !== "scheduled" && f.endsOn) elapsed = Math.max(0, Math.min(100, (age / Math.max(1, daysBetween(f.startsOn, f.endsOn))) * 100));
  const lim = f.useLimit;
  const pctU = lim && f.uses !== null ? f.uses / lim : 0;
  return {
    soon,
    unused,
    idleDays,
    daysLeft,
    dlTone,
    dates: end ? `${dm(f.startsOn)} to ${dm(end)}` : `From ${dm(f.startsOn)}`,
    from: dm(f.startsOn),
    to: end ? dm(end) : "No end date",
    end,
    elapsed,
    marker: f.status === "live" && !!f.endsOn,
    use: f.uses === null ? null : lim ? `${f.uses} of ${lim} used` : `${f.uses} used · no limit`,
    usePct: f.uses === null ? 0 : lim ? Math.min(100, pctU * 100) : f.uses ? 100 : 0,
    useTone: f.status === "ended" ? "ended" : pctU >= 0.8 ? "caution" : "primary",
  };
}

/** "about 4 times a week" from the uses over the weeks it has run. */
export function usesPerWeek(f: Pick<DiscountFacts, "uses" | "startsOn" | "endsOn" | "endedAt">, today: string): string {
  const end = discountEnd(f);
  const last = end && end < today ? end : today;
  const weeks = Math.max(1, (daysBetween(f.startsOn, last) + 1) / 7);
  const k = Math.round((f.uses ?? 0) / weeks);
  return k < 1 ? "less than once a week" : k === 1 ? "about once a week" : `about ${k} times a week`;
}

/** The detail's lead (ddv.lead, computed). `audienceNew` is the type's "New customers only". */
export function discountLead(f: DiscountFacts, view: DiscountView, today: string, audienceNew: string): string {
  if (f.status === "ended") return `It ended on ${dm(view.end ?? today)}. Duplicate it to run it again.`;
  if (f.status === "scheduled") return f.showOnListing ? `It goes live on ${dm(f.startsOn)} and shows on your listing then.` : `It goes live on ${dm(f.startsOn)}.`;
  if (f.status === "paused") return "It's paused, so it can't be used now. Resume it in Products, Promotions.";
  if (f.uses === null) return "Uses show here for people with the Marketing or Revenue permission.";
  if (f.uses === 0)
    return f.showOnListing
      ? `No one has used it yet. It shows on your listing to ${f.audience === "new" ? audienceNew.toLowerCase() : "everyone"}.`
      : "No one has used it yet. It isn't shown on your listing.";
  const rate = usesPerWeek(f, today);
  if (view.soon) {
    const left = f.endsOn ? daysBetween(today, f.endsOn) : 0;
    return `It ends ${left <= 0 ? "today" : `in ${nWord(left, "day", "days")}`} and is used ${rate}.`;
  }
  return `Used ${rate}.`;
}

/** The `n` Mondays ending with this week's. */
export function weekStarts(today: string, n: number): string[] {
  const end = mondayOf(today);
  return Array.from({ length: n }, (_, i) => addDays(end, (i - n + 1) * 7));
}

/** Uses per week for each Monday in `weeks` (a day counts in the week it falls in). */
export function weeklyUses(days: readonly string[], weeks: readonly string[]): number[] {
  const out = weeks.map(() => 0);
  for (const d of days) {
    const i = weeks.indexOf(mondayOf(d));
    if (i >= 0) out[i] += 1;
  }
  return out;
}

export interface WeekBars {
  bars: { x: number; y: number; w: number; h: number; last: boolean }[];
  ghost: string;
  ymax: number;
  ymid: number;
}

/** mkChart: bars in a 300×118 box (plot x 24 to 300, base y 100, top y 10), the previous weeks as a dashed path. */
export function weekBars(vals: readonly number[], prev: readonly number[]): WeekBars {
  const mx = Math.max(...vals, ...prev, 1);
  const topv = Math.ceil(mx / 2) * 2;
  const n = vals.length;
  const step = 276 / n;
  const bw = step * 0.56;
  const yy = (v: number) => 100 - (v / topv) * 90;
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return {
    bars: vals.map((v, i) => ({ x: r1(24 + i * step + (step - bw) / 2), y: r1(yy(v)), w: r1(bw), h: r1(Math.max(0, 100 - yy(v))), last: i === n - 1 })),
    ghost: prev.map((v, i) => `${i ? "L" : "M"}${(24 + i * step + step / 2).toFixed(1)},${yy(v).toFixed(1)}`).join(" "),
    ymax: topv,
    ymid: topv / 2,
  };
}

/** Order (AN11-011 row 1, OURS): live by end date, then paused, scheduled by start, then ended, latest end first. */
export function sortDiscounts<T extends { f: Pick<DiscountFacts, "status" | "startsOn" | "endsOn" | "endedAt"> }>(rows: readonly T[]): T[] {
  const rank = { live: 0, paused: 1, scheduled: 2, ended: 3 } as const;
  const far = "9999-12-31";
  return [...rows].sort((a, b) => {
    const r = rank[a.f.status] - rank[b.f.status];
    if (r) return r;
    if (a.f.status === "scheduled") return a.f.startsOn.localeCompare(b.f.startsOn);
    if (a.f.status === "ended") return (discountEnd(b.f) ?? "").localeCompare(discountEnd(a.f) ?? "");
    return (a.f.endsOn ?? far).localeCompare(b.f.endsOn ?? far);
  });
}
