// AN1 Overview · the pure model: headline numbers, today's day-clock items,
// the insight cards and the Client outcomes aggregates, all from rows the
// owner can already read (no mock figures, HANDOVER §1). Readers that do not
// exist yet (B10 check-ins, B7 consent, B15 aggregate readers; Revenue reads
// the recorded payments through services/business-revenue, as its page does)
// leave their figure as null: the screen shows the drawn "–" / empty state.

import type { ClockItem } from "./clockModel";
import { f12, hoursOf } from "./clockModel";
import { figuresFromRecords, isOwed, money, pctDelta, type PaymentRecord, type RevenueFigures } from "../../../services/business-revenue/model";

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
export interface OvMember {
  accepted: boolean | null;
  invitedAt: string;
  respondedAt: string | null;
  endedAt: string | null;
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
  members: OvMember[];
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
/** Local calendar day of an ISO instant. */
const dayOfInstant = (at: string) => isoDay(new Date(at));
const MINUS = "−";
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `${MINUS}${Math.abs(n)}` : "0");

// ---- headline numbers (AN1-034 #9, AN1-061, AN1-063) ---------------------------

export interface HeadCell {
  label: string;
  /** "–" when there is nothing to show. */
  value: string;
  delta: string | null;
  dir: "up" | "down" | "none";
}

export const NOTHING_TO_COMPARE = "Nothing to compare yet";

function activeAt(members: OvMember[], day: string): number {
  return members.filter((m) => m.accepted === true && m.respondedAt && dayOfInstant(m.respondedAt) <= day && (!m.endedAt || dayOfInstant(m.endedAt) > day)).length;
}

/** Early data (HANDOVER §3 states, AN1-034 #9c): under 14 days of activity, deltas are hidden. */
export function isEarly(raw: OvRaw, today: string): boolean {
  const starts: string[] = [];
  if (raw.firstClassDate) starts.push(raw.firstClassDate);
  for (const m of raw.members) if (m.respondedAt) starts.push(dayOfInstant(m.respondedAt));
  if (!starts.length) return true;
  const first = starts.sort()[0];
  return first > addDays(today, -14);
}

export function headline(kind: OverviewKind, raw: OvRaw, range: Range, today: string): HeadCell[] {
  const early = isEarly(raw, today);
  const prev = previousRange(range);
  const end = range.to < today ? range.to : today;
  const prevEnd = prev.to;
  const showDelta = range.compare;
  const dash = (label: string, sub: string): HeadCell => ({ label, value: "–", delta: sub, dir: "none" });
  const cmp = (now: number, before: number, fmt: (d: number) => string, possible: boolean): Pick<HeadCell, "delta" | "dir"> => {
    if (!showDelta) return { delta: null, dir: "none" };
    if (early || !possible) return { delta: NOTHING_TO_COMPARE, dir: "none" };
    const d = now - before;
    return { delta: `${fmt(d)} vs prev.`, dir: d > 0 ? "up" : d < 0 ? "down" : "none" };
  };

  const noMembers = raw.members.length === 0;
  const active: HeadCell = noMembers
    ? dash("Active members", "No data yet")
    : { label: "Active members", value: String(activeAt(raw.members, end)), ...cmp(activeAt(raw.members, end), activeAt(raw.members, prevEnd), signed, true) };

  const inR = (iso: string | null, f: string, t: string) => !!iso && iso >= f && iso <= t;
  const joined = raw.members.filter((m) => m.accepted === true && inR(m.respondedAt ? dayOfInstant(m.respondedAt) : null, range.from, range.to)).length;
  const ended = raw.members.filter((m) => inR(m.endedAt ? dayOfInstant(m.endedAt) : null, range.from, range.to)).length;
  const net: HeadCell = noMembers
    ? dash("Net members", "No data yet")
    : { label: "Net members", value: signed(joined - ended), delta: `${joined} joined, ${ended} ended`, dir: "none" };

  if (kind === "store") {
    return [
      active,
      net,
      { label: "Live listings", value: String(raw.productsCount), delta: "On Explore now", dir: "none" },
      { label: "Live discounts", value: String(raw.discountsCount), delta: "On your listing", dir: "none" },
    ];
  }

  const byClass = new Map<string, number>();
  for (const b of raw.bookings) byClass.set(b.classId, (byClass.get(b.classId) ?? 0) + 1);
  const classesIn = (f: string, t: string) => raw.classes.filter((k) => k.date >= f && k.date <= t);
  const cur = classesIn(range.from, range.to);
  const before = classesIn(prev.from, prev.to);
  const sumB = (ks: OvClass[]) => ks.reduce((a, k) => a + (byClass.get(k.id) ?? 0), 0);
  const sumC = (ks: OvClass[]) => ks.reduce((a, k) => a + Math.max(0, k.cap), 0);

  let booked: HeadCell;
  if (!raw.anyClass) booked = dash("Booked spots", "No data yet");
  else {
    const n = sumB(cur);
    const p = sumB(before);
    booked = {
      label: "Booked spots",
      value: n.toLocaleString("en-US"),
      ...cmp(n, p, () => {
        const pct = Math.round(((n - p) / p) * 100);
        return pct > 0 ? `+${pct}%` : pct < 0 ? `${MINUS}${Math.abs(pct)}%` : "0%";
      }, p > 0),
    };
  }

  let fill: HeadCell;
  if (!raw.anyClass) fill = dash("Class fill rate", "No classes yet");
  else if (!cur.length || sumC(cur) === 0) fill = dash("Class fill rate", "No classes in this range");
  else {
    const pct = Math.round((sumB(cur) / sumC(cur)) * 100);
    const prevPct = sumC(before) > 0 ? Math.round((sumB(before) / sumC(before)) * 100) : null;
    fill = { label: "Class fill rate", value: `${pct}%`, ...cmp(pct, prevPct ?? 0, (d) => `${signed(d)} pts`, prevPct !== null) };
  }
  return [active, booked, fill, net];
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

export function dayItems(kind: OverviewKind, raw: OvRaw, today: string): ClockItem[] {
  const byClass = new Map<string, number>();
  for (const b of raw.bookings) byClass.set(b.classId, (byClass.get(b.classId) ?? 0) + 1);
  const out: ClockItem[] = [];
  if (kind !== "store")
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

/** AN1-060: "Next: Tue 6 Oct · Morning Mobility 6:30 AM". */
export function emptyNextLine(raw: OvRaw, is24: boolean): string {
  const k = raw.nextClass;
  if (!k) return "";
  const d = dateOf(k.date);
  return `Next: ${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} · ${k.title} ${is24 ? k.start : f12(k.start)}`;
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

/** The Shared progress empty body: the DI-07 count when there is one (below 5 the outcomes reader shows nothing). */
export function shareBody(n: number | null): string {
  const need = "Outcomes appear once 5 or more clients choose to share their progress with you.";
  if (!n) return need;
  // 5 or more share, but the outcomes reader (B15) is not built yet.
  if (n >= 5) return `${n} clients share their progress with you. Their group outcomes are coming soon.`;
  return `${n} ${n === 1 ? "client shares" : "clients share"} their progress with you so far. ${need}`;
}
