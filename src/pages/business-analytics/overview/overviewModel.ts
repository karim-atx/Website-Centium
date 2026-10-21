// AN1 Overview · the pure model: headline numbers, today's day-clock items,
// the insight cards and the Client outcomes aggregates. The headline comes
// from the B15 readers (business_period_stats DI-02, business_member_growth
// for Active members) and the day clock from business_day (DI-04); a metric
// the caller may not hold is absent, so its cell is not drawn (never a 0).
// Revenue reads the recorded payments through services/business-revenue, as
// its page does. No mock figures (HANDOVER §1).

import type { ClockItem } from "./clockModel";
import { f12, hoursOf } from "./clockModel";
import { figuresFromRecords, isOwed, money, pctDelta, type PaymentRecord, type RevenueFigures } from "../../../services/business-revenue/model";
import { pctChange, signed, type ClientOutcomes, type DayItem, type PeriodStat, type PeriodStats } from "../../../services/business-analytics/model";

export type OverviewKind = "classes" | "gym" | "store";

export interface OvClass {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  cap: number;
  professionalId: string | null;
}
export interface OvBooking {
  classId: string;
  clientId: string;
  createdAt: string;
  /** venue_payment_status: pending / paid / refunded (null: no payment taken). */
  paymentStatus: string | null;
  /** price_agreed (null: no price agreed, so nothing is owed). */
  priceAgreed: number | null;
}
export interface OvEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string | null;
}
export interface OvReviews {
  average: number;
  total: number;
  /** Reviews written inside the range (null: could not count). */
  inRange: number | null;
}
export interface OvRaw {
  business: { id: string; type: string; active: boolean; createdAt: string } | null;
  classes: OvClass[];
  /** Any class ever (a new business has none: AN1-061). */
  anyClass: boolean;
  /** The first class on or after tomorrow (AN1-060 summary). */
  nextClass: OvClass | null;
  firstClassDate: string | null;
  bookings: OvBooking[];
  /** B15 business_period_stats for the range (null: the reader is not on this database). */
  stats: PeriodStats | null;
  /** Members at the end of the range, from business_member_growth (null: not readable). */
  activeNow: number | null;
  /** B15 business_day for today (null: the reader is not on this database; the class rows are drawn instead). */
  day: DayItem[] | null;
  productsCount: number;
  discountsCount: number;
  team: Record<string, string>;
  /** Today's calendar events of the owner, timed (all-day events are not on the dial). */
  eventsToday: OvEvent[];
  /** Null: the business has no venue (reviews are per venue). */
  reviews: OvReviews | null;
}

export interface Range {
  from: string;
  to: string;
  compare: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (iso: string, n: number) => {
  const d = dateOf(iso);
  d.setDate(d.getDate() + n);
  return isoDay(d);
};
const daysBetween = (a: string, b: string) => Math.round((dateOf(b).getTime() - dateOf(a).getTime()) / 86_400_000);
export function previousRange(r: Range): { from: string; to: string } {
  const len = daysBetween(r.from, r.to) + 1;
  return { from: addDays(r.from, -len), to: addDays(r.from, -1) };
}

// ---- headline numbers (AN1-034 #9, AN1-061, AN1-063) ---------------------------

export interface HeadCell {
  label: string;
  /** "–" when there is nothing to show. */
  value: string;
  delta: string | null;
  dir: "up" | "down" | "none";
}

export const NOTHING_TO_COMPARE = "Nothing to compare yet";

/** A cell's delta: hidden with compare off; "Nothing to compare yet" while the metric is early (B15 `early`) or nothing came before. */
function deltaOf(st: PeriodStat | undefined, compare: boolean, text: (now: number, before: number) => { t: string; d: number } | null): Pick<HeadCell, "delta" | "dir"> {
  if (!compare) return { delta: null, dir: "none" };
  if (!st || st.early || st.value === null || st.previous === null) return { delta: NOTHING_TO_COMPARE, dir: "none" };
  const r = text(st.value, st.previous);
  if (!r) return { delta: NOTHING_TO_COMPARE, dir: "none" };
  return { delta: `${r.t} vs prev.`, dir: r.d > 0 ? "up" : r.d < 0 ? "down" : "none" };
}

/**
 * The headline cells (AN1-034 #9d, AN1-063 #2) from business_period_stats.
 * A metric the caller may not hold is absent from the reader, and so is its
 * cell (never a 0). Before the reader is on the database every cell reads "–".
 */
export function headline(kind: OverviewKind, raw: OvRaw, range: Range): HeadCell[] {
  const s = raw.stats;
  const cmp = range.compare;
  const dash = (label: string, sub: string): HeadCell => ({ label, value: "–", delta: sub, dir: "none" });

  let active: HeadCell | null = dash("Active members", "No data yet");
  let net: HeadCell | null = dash("Net members", "No data yet");
  if (s) {
    const n = s.members_net;
    // Active now against the end of the previous period is this period's net change.
    active = !n ? null : raw.activeNow === null ? active : { label: "Active members", value: raw.activeNow.toLocaleString("en-US"), ...deltaOf(n, cmp, (v) => ({ t: signed(v), d: v })) };
    net = !n || n.value === null ? null : { label: "Net members", value: signed(n.value), delta: `${s.members_joined?.value ?? 0} joined, ${s.members_ended?.value ?? 0} ended`, dir: "none" };
  }

  if (kind === "store") {
    return [
      active,
      net,
      { label: "Live listings", value: String(raw.productsCount), delta: "On Explore now", dir: "none" },
      { label: "Live discounts", value: String(raw.discountsCount), delta: "On your listing", dir: "none" },
    ].filter((c): c is HeadCell => !!c);
  }

  let booked: HeadCell | null = dash("Booked spots", "No data yet");
  let fill: HeadCell | null = dash("Class fill rate", "No classes yet");
  if (s && raw.anyClass) {
    const b = s.class_bookings;
    booked = !b
      ? null
      : b.value === null
        ? booked
        : {
            label: "Booked spots",
            value: b.value.toLocaleString("en-US"),
            ...deltaOf(b, cmp, (v, p) => {
              const t = pctChange(v, p);
              return t ? { t, d: v - p } : null;
            }),
          };
    const f = s.average_fill_pct;
    fill = !f
      ? null
      : f.value === null
        ? dash("Class fill rate", "No classes in this range")
        : {
            label: "Class fill rate",
            value: `${Math.round(f.value)}%`,
            ...deltaOf(f, cmp, (v, p) => {
              const d = Math.round(v) - Math.round(p);
              return { t: `${signed(d)} pts`, d };
            }),
          };
  } else if (s && !s.class_bookings) {
    // Not the caller's to see (schedule): no cells, even before the first class.
    booked = null;
    fill = null;
  }
  return [active, booked, fill, net].filter((c): c is HeadCell => !!c);
}

/** AN1-034 #9b: size = max(base − 12, base − max(0, len − 4) · base / 12), base 36. */
export function headlineSize(value: string): number {
  const len = value.replace(/[^0-9A-Za-z%.+–-]/g, "").length;
  return +Math.max(24, 36 - Math.max(0, len - 4) * 3).toFixed(1);
}

// ---- today's dial items (AN1-034 #12, BU4-12 from raw rows) ----------------------

const firstName = (name: string | undefined) => (name ? name.trim().split(/\s+/)[0] : null);
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "HH:MM" on this device's clock (the dial's own clock) for an instant. */
const hhmmOf = (at: string) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function dayItems(kind: OverviewKind, raw: OvRaw, today: string): ClockItem[] {
  const out: ClockItem[] = [];
  if (kind !== "store" && raw.day) {
    // B15 business_day (DI-04): the day's classes with booked / capacity and
    // the staff first name, cancelled classes left off the dial. Appointments
    // have no drawn arc on the AN1 clock, so they are not placed on it.
    for (const k of raw.day.filter((x) => x.kind === "class" && !x.cancelled)) {
      const ss = hhmmOf(k.startsAt);
      const es0 = hhmmOf(k.endsAt);
      const s = hoursOf(ss);
      let e = hoursOf(es0);
      if (e <= s) e = 24;
      out.push({ key: `c:${k.refId}`, classId: k.refId, s, e, ss, es: e === 24 ? "24:00" : es0, t: k.title, who: k.staffFirstName, bk: k.booked, cap: k.capacity, ev: false, loc: null });
    }
  }
  const byClass = new Map<string, number>();
  for (const b of raw.bookings) byClass.set(b.classId, (byClass.get(b.classId) ?? 0) + 1);
  if (kind !== "store" && !raw.day)
    for (const k of raw.classes.filter((x) => x.date === today)) {
      const s = hoursOf(k.start);
      let e = hoursOf(k.end);
      if (e <= s) e = 24; // runs past midnight: drawn to the end of the day
      out.push({ key: `c:${k.id}`, classId: k.id, s, e, ss: k.start, es: e === 24 ? "24:00" : k.end, t: k.title, who: firstName(k.professionalId ? raw.team[k.professionalId] : undefined), bk: byClass.get(k.id) ?? 0, cap: k.cap, ev: false, loc: null });
    }
  for (const ev of raw.eventsToday) {
    const s = hoursOf(ev.start);
    let e = hoursOf(ev.end);
    if (e <= s) e = Math.min(24, s + 0.25);
    out.push({ key: `e:${ev.id}`, s, e, ss: ev.start, es: ev.end, t: ev.title, who: null, bk: 0, cap: 0, ev: true, loc: ev.location });
  }
  return out;
}

/** AN1-060: "Next: Tue, Oct 6 · Morning Mobility 6:30 AM". */
export function emptyNextLine(raw: OvRaw, is24: boolean): string {
  const k = raw.nextClass;
  if (!k) return "";
  const d = dateOf(k.date);
  return `Next: ${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()} · ${k.title} ${is24 ? k.start : f12(k.start)}`;
}

// ---- More insights (AN1-034 #19) -----------------------------------------------------

export interface Insight {
  key: "reputation" | "revenue";
  value: string;
  delta: string;
  sub: string;
  up: boolean;
}

/**
 * The Revenue card reads what Revenue › Overview reads, so the card and the
 * page it opens agree (V6-43, recorded payments only): `figures` from the B8
 * RV-01 readers (useRecordedRevenue: recorded_revenue_by_stream, net of
 * refunds), or the records' sums while those readers are missing. Null:
 * not loaded, the drawn "–".
 */
export interface RevenueIn {
  records: PaymentRecord[] | null;
  range: Range;
  today: string;
  /** The readers' figures for this range (B8 RV-01); absent: the records' sums. */
  figures?: RevenueFigures | null;
}

export function revenueInsight(rev: RevenueIn | null): Insight {
  const none: Insight = { key: "revenue", value: "–", delta: "", sub: "No transactions yet.", up: false };
  if (!rev) return none;
  const { records, range, today } = rev;
  const f = rev.figures ?? (records ? figuresFromRecords(records, range, previousRange(range)) : null);
  // As Revenue › Overview: nothing recorded until a paid payment exists.
  if (!f || !f.anyPaid) return none;
  const early = !!f.first && daysBetween(f.first, today) < 28;
  const d = range.compare && !early ? pctDelta(f.tot, f.totP) : null;
  const sub = f.undated.n > 0 ? `Collected this period. ${money(f.undated.amount)} not counted yet.` : "Collected this period";
  return { key: "revenue", value: money(f.tot), delta: d ?? "", sub, up: !!d && d.startsWith("+") };
}

export function insights(raw: OvRaw, rev: RevenueIn | null = null): Insight[] {
  const r = raw.reviews;
  const rep: Insight =
    r && r.total > 0
      ? {
          key: "reputation",
          value: r.average.toFixed(1),
          delta: `★ ${r.total.toLocaleString("en-US")}`,
          sub: r.inRange === null ? "Average rating" : `Average rating · ${r.inRange} new this period`,
          up: false,
        }
      : { key: "reputation", value: "–", delta: "", sub: "No reviews yet. Reviews arrive after members book.", up: false };
  return [rep, revenueInsight(rev)];
}

// ---- Client outcomes (OURS-AN1-client-outcomes) -----------------------------------------

/** "Client #2C8E": clients are masked unless they shared their profile (B7). */
export const maskedClient = (id: string) => `Client #${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

export interface OutcomesModel {
  /** Clients with a booking in the range. */
  clients: number;
  /** Bookings a week per client (null: no clients in range). */
  perWeek: number | null;
  /** No booking in 21 days (null: under 21 days of data). */
  needCheckIn: number | null;
  review: { id: string; label: string; detail: string; pill: { text: string; tone: "pale" | "warn" } }[];
  early: boolean;
}

export function outcomes(raw: OvRaw, range: Range, today: string): OutcomesModel {
  const dateOfClass = new Map(raw.classes.map((k) => [k.id, k.date]));
  const inRange = raw.bookings.filter((b) => {
    const d = dateOfClass.get(b.classId);
    return !!d && d >= range.from && d <= range.to && d <= today;
  });
  const clients = new Set(inRange.map((b) => b.clientId));
  const days = daysBetween(range.from, range.to < today ? range.to : today) + 1;
  const weeks = Math.max(1, days / 7);
  const perWeek = clients.size ? +(inRange.length / clients.size / weeks).toFixed(1) : null;

  const enough = !!raw.firstClassDate && raw.firstClassDate <= addDays(today, -21);
  const cutoff = addDays(today, -21);
  const last = new Map<string, string>();
  for (const b of raw.bookings) {
    const d = dateOfClass.get(b.classId);
    if (!d) continue;
    const prevD = last.get(b.clientId);
    if (!prevD || d > prevD) last.set(b.clientId, d);
  }
  const lapsed = [...last.entries()].filter(([, d]) => d < cutoff).map(([id]) => id);
  // Revenue's own rule (isOwed): pending and an agreed price above zero.
  const owed = new Set(
    raw.bookings
      .filter((b) => isOwed({ kind: "class", status: b.paymentStatus as PaymentRecord["status"], amount: b.priceAgreed, membershipStatus: null }))
      .map((b) => b.clientId),
  );
  const ids = [...new Set([...(enough ? lapsed : []), ...owed])];
  const review = ids
    .map((id) => {
      const noBooking = enough && lapsed.includes(id);
      const pay = owed.has(id);
      const detail = [noBooking ? "No booking in 21 days" : null, pay ? "Payment owed" : null].filter(Boolean).join(" · ");
      return { id, label: maskedClient(id), detail, pill: pay ? { text: "Payment", tone: "warn" as const } : { text: "Check in", tone: "pale" as const } };
    })
    .sort((a, b) => (a.pill.tone === b.pill.tone ? a.label.localeCompare(b.label) : a.pill.tone === "warn" ? -1 : 1));

  return {
    clients: clients.size,
    perWeek,
    needCheckIn: enough ? lapsed.length : null,
    review,
    early: !raw.firstClassDate || raw.firstClassDate > addDays(today, -14),
  };
}

/** The Overview's CSV rows (Export CSV, BU4-14): real values only, "–" exports as an empty cell. */
export function overviewCsv(cells: HeadCell[], ins: Insight[]): (string | number | null)[][] {
  const v = (s: string) => (s === "–" ? null : s);
  return [
    ["Figure", "Value", "Note"],
    ...cells.map((c) => [c.label, v(c.value), c.delta]),
    ["Reputation", v(ins[0].value), ins[0].value === "–" ? null : ins[0].sub],
    ["Revenue", v(ins[1].value), null],
  ];
}

/**
 * Shared progress (DI-07, B15 business_client_outcomes) once 5 or more share:
 * the cohort's 28-day averages, never a person's. Null below 5 (the reader
 * sends nulls then, and the empty card with the count shows instead).
 */
export function sharedProgress(o: ClientOutcomes, kind: OverviewKind): { boxes: { value: string; label: string }[]; note: string } | null {
  if (!o.enough) return null;
  const books = kind !== "store" && o.bookingsPerWeek !== null ? ` They book ${o.bookingsPerWeek.toFixed(1)} ${o.bookingsPerWeek === 1 ? "class" : "classes"} a week.` : "";
  return {
    boxes: [
      { value: o.workoutsPerWeek === null ? "–" : o.workoutsPerWeek.toFixed(1), label: "Workouts a week" },
      { value: o.dailySteps === null ? "–" : Math.round(o.dailySteps).toLocaleString("en-US"), label: "Daily steps" },
      { value: o.restingBpm === null ? "–" : `${Math.round(o.restingBpm)} bpm`, label: "Resting heart rate" },
    ],
    note: `Averages of the ${o.sharing} clients who share their progress with you, over the last 28 days.${books}`,
  };
}

/** The Shared progress empty body: the DI-07 count when there is one (below 5 the outcomes reader shows nothing). */
export function shareBody(n: number | null): string {
  const need = "Outcomes appear once 5 or more clients choose to share their progress with you.";
  if (!n) return need;
  // 5 or more share but the outcomes reader (B15) is not on this database: only the B7 count is known.
  if (n >= 5) return `${n} clients share their progress with you. Their group outcomes are coming soon.`;
  return `${n} ${n === 1 ? "client shares" : "clients share"} their progress with you so far. ${need}`;
}
