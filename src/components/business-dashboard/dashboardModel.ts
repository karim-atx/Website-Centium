// What the Dashboard shows, derived from the real rows (dashboardData.ts).
// Pure: everything takes `now` so the rules can be tested without a clock.
//
// Strings are the handover's (COPY / BizSummaryV27 / BizTypeKit) unless the
// row is marked OURS in the checklists; every OURS string is listed in the
// Batch 3 report.

import type { DashRaw, DashClass } from "./dashboardData";
import type { GaugeSpec } from "./clusterGeometry";
import type { DashPalette } from "./palette";
import { occurrenceDates } from "../calendar/occurrences";
import { localDayOf, shiftDate } from "../../utils/date";
import { DAY_LONG, DAY_SHORT, mondayFirstWeek, mondayIndex } from "../../utils/week";
import { minutesOfDay, time12 } from "../../utils/time12";

export type DashKind = "classes" | "gym" | "store";

const STORE_TYPES = new Set(["store", "supplement_store", "equipment_seller", "wellness_service", "clothing_store", "meal_prep_service"]);

/**
 * The per-type set (V6-52): a store type gets the Store set (DA3), a gym that
 * runs no classes the OURS gym set (OURS-DA-gym-gauges), every other business
 * (a studio, a gym that runs classes) the class-based set (DA1-015).
 */
export function kindOf(type: string | null | undefined, hasClasses: boolean): DashKind {
  if (type && STORE_TYPES.has(type)) return "store";
  if ((type ?? "gym") === "gym" && !hasClasses) return "gym";
  return "classes";
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Monday, 5 October" (DA1-015 #2). */
export function dateKicker(now: Date): string {
  return `${DAY_LONG[mondayIndex(now.getDay())]}, ${now.getDate()} ${MONTHS_LONG[now.getMonth()]}`;
}

/** DA1-015 #3: "Good evening" (COPY); morning and afternoon are OURS. */
export function greeting(now: Date): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  return "Good evening";
}

const parseDay = (iso: string) => new Date(`${iso}T00:00:00`);
/** "Sat 3 Oct". */
export const shortDay = (iso: string) => {
  const d = parseDay(iso);
  return `${DAY_SHORT[mondayIndex(d.getDay())]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};
/** "Today", "Yesterday", "Tomorrow" or "Sat 3 Oct". */
export function dayLabel(iso: string, today: string): string {
  if (iso === today) return "Today";
  if (iso === shiftDate(today, -1)) return "Yesterday";
  if (iso === shiftDate(today, 1)) return "Tomorrow";
  return shortDay(iso);
}

/** "Member #4F2A": members are masked unless they shared their profile (HANDOVER §4). */
export const maskedMember = (id: string) => `Member #${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

const firstName = (name: string | undefined) => (name ? name.trim().split(/\s+/)[0] : "");

/** "7a", "12p", "6p": the bars' short 12-hour labels (DA1-003 #6a). */
export function shortHour(hhmm: string): string {
  const m = minutesOfDay(hhmm) ?? 0;
  const h = Math.floor(m / 60);
  return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`;
}

// ---- shared counts ----------------------------------------------------------

export interface Counts {
  today: string;
  week: string[];
  lastWeek: string[];
  booked: Record<string, number>;
  byDate: Record<string, DashClass[]>;
}

export function counts(raw: DashRaw, now: Date): Counts {
  const today = localDayOf(now);
  const week = mondayFirstWeek(today);
  const lastWeek = week.map((d) => shiftDate(d, -7));
  const booked: Record<string, number> = {};
  for (const b of raw.bookings) booked[b.classId] = (booked[b.classId] ?? 0) + 1;
  const byDate: Record<string, DashClass[]> = {};
  for (const k of raw.classes) (byDate[k.date] ??= []).push(k);
  for (const d of Object.keys(byDate)) byDate[d].sort((a, b) => a.start.localeCompare(b.start));
  return { today, week, lastWeek, booked, byDate };
}

/**
 * Early data (HANDOVER §3 states): fewer than two weeks or 10 records. Trend
 * deltas are hidden and the tip shows.
 */
export function isEarly(raw: DashRaw, k: Counts): boolean {
  const first = raw.classes[0]?.date;
  if (!first) return true;
  const twoWeeks = shiftDate(k.today, -14);
  return first > twoWeeks || raw.bookings.length < 10;
}

// ---- gauges ------------------------------------------------------------------

export interface GaugeModel {
  spec: GaugeSpec;
  empty: boolean;
  label: string;
  sub: string;
  subTone: "good" | "faint" | "warn" | "high";
  target: number | null;
  format: (n: number) => string;
  display?: string;
  unit?: string;
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

function monthOf(iso: string) {
  return iso.slice(0, 7);
}

function netMembers(raw: DashRaw, now: Date): GaugeModel {
  const today = localDayOf(now);
  const month = monthOf(today);
  const prev = monthOf(localDayOf(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
  const joinedOn = raw.members.filter((m) => m.accepted === true && m.respondedAt).map((m) => localDayOf(m.respondedAt as string));
  const endedOn = raw.members.filter((m) => m.endedAt).map((m) => localDayOf(m.endedAt as string));
  const W = Math.max(1, Math.ceil(now.getDate() / 7));
  const weeks = (days: string[]) => {
    const arr = Array.from({ length: W }, () => 0);
    for (const d of days) if (monthOf(d) === month) arr[Math.min(W - 1, Math.floor((Number(d.slice(8, 10)) - 1) / 7))] += 1;
    return arr;
  };
  const WJ = weeks(joinedOn);
  const WE = weeks(endedOn);
  const j = WJ.reduce((a, b) => a + b, 0);
  const e = WE.reduce((a, b) => a + b, 0);
  const prevNet = joinedOn.filter((d) => monthOf(d) === prev).length - endedOn.filter((d) => monthOf(d) === prev).length;
  const empty = raw.members.length === 0;
  return {
    spec: { kind: "balance", weeksJoined: WJ, weeksEnded: WE, joined: j, ended: e, prevNet },
    empty,
    label: "Net members",
    sub: empty ? "No members yet" : `${j} joined · ${e} ended`,
    subTone: empty ? "faint" : "good",
    target: empty ? null : j - e,
    format: signed,
  };
}

function seatsUsed(raw: DashRaw): GaugeModel {
  const s = raw.seats;
  if (!s || s.capacity === 0) {
    return { spec: { kind: "nodes", used: 0, total: 0 }, empty: true, label: "Seats used", sub: "No seat blocks", subTone: "faint", target: null, format: String };
  }
  const free = Math.max(0, s.capacity - s.used);
  return {
    spec: { kind: "nodes", used: s.used, total: s.capacity },
    empty: false,
    label: "Seats used",
    sub: `${free} free · ${s.blocks} ${s.blocks === 1 ? "block" : "blocks"}`,
    subTone: "faint",
    target: s.used,
    format: String,
    unit: `/${s.capacity}`,
  };
}

export function gaugeModels(kind: DashKind, raw: DashRaw, now: Date): GaugeModel[] {
  const k = counts(raw, now);
  const early = isEarly(raw, k);
  const net = netMembers(raw, now);
  const seats = seatsUsed(raw);

  if (kind === "store") {
    // DA3-001: Net members, New members, Live listings, Live discounts.
    const joinsOn = (d: string) => raw.members.filter((m) => m.accepted === true && m.respondedAt && localDayOf(m.respondedAt) === d).length;
    const vals = k.week.map(joinsOn);
    const last = k.lastWeek.map(joinsOn);
    const todayIdx = k.week.indexOf(k.today);
    const n = vals.slice(0, todayIdx + 1).reduce((a, b) => a + b, 0);
    const p = last.slice(0, todayIdx + 1).reduce((a, b) => a + b, 0);
    const diff = n - p;
    const newEmpty = raw.members.length === 0;
    return [
      net,
      {
        spec: { kind: "petals", vals, last, today: todayIdx },
        empty: newEmpty,
        label: "New members",
        sub: newEmpty ? "No members yet" : early ? "This week" : diff === 0 ? "Same as last wk" : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} vs last wk`,
        subTone: newEmpty ? "faint" : "good",
        target: newEmpty ? null : n,
        format: String,
      },
      { spec: { kind: "blank" }, empty: raw.productsCount === 0, label: "Live listings", sub: "On Explore", subTone: "faint", target: raw.productsCount === 0 ? null : raw.productsCount, format: String },
      { spec: { kind: "blank" }, empty: raw.discountsCount === 0, label: "Live discounts", sub: "On listing", subTone: "faint", target: raw.discountsCount === 0 ? null : raw.discountsCount, format: String },
    ];
  }

  if (kind === "gym") {
    // OURS-DA-gym-gauges: Entries (BU4-04 pending), Renewals due, Net members, Seats used.
    const r = raw.renewalsDue;
    return [
      { spec: { kind: "petals", vals: [0, 0, 0, 0, 0, 0, 0], last: [0, 0, 0, 0, 0, 0, 0], today: k.week.indexOf(k.today) }, empty: true, label: "Entries", sub: "No entries yet", subTone: "faint", target: null, format: String },
      { spec: { kind: "blank" }, empty: r === null, label: "Renewals due", sub: "In the next 7 days", subTone: r === null ? "faint" : "warn", target: r, format: String },
      net,
      seats,
    ];
  }

  // Class-based (DA1-015): Fill rate, Booked, Net members, Seats used.
  const weekClasses = k.week.flatMap((d) => k.byDate[d] ?? []);
  const fills = weekClasses.map((c) => (c.cap > 0 ? (k.booked[c.id] ?? 0) / c.cap : 0));
  const sumB = weekClasses.reduce((a, c) => a + (k.booked[c.id] ?? 0), 0);
  const sumC = weekClasses.reduce((a, c) => a + c.cap, 0);
  const noClasses = raw.classes.length === 0;
  const pct = sumC > 0 ? sumB / sumC : 0;
  const under = fills.filter((f) => f < 0.7).length;
  const fill: GaugeModel = noClasses
    ? { spec: { kind: "ring", fills: Array(12).fill(0), pct: 0 }, empty: true, label: "Fill rate", sub: "No classes yet", subTone: "faint", target: null, format: String }
    : weekClasses.length === 0
      ? { spec: { kind: "ring", fills: Array(12).fill(0), pct: 0 }, empty: true, label: "Fill rate", sub: "No classes this week", subTone: "faint", target: null, format: String }
      : { spec: { kind: "ring", fills, pct }, empty: false, label: "Fill rate", sub: `${under} under 70%`, subTone: "good", target: Math.round(pct * 100), format: String, unit: "%" };

  const perDay = (dates: string[]) => dates.map((d) => (k.byDate[d] ?? []).reduce((a, c) => a + (k.booked[c.id] ?? 0), 0));
  const vals = perDay(k.week);
  const last = perDay(k.lastWeek);
  const total = vals.reduce((a, b) => a + b, 0);
  const lastTotal = last.reduce((a, b) => a + b, 0);
  const anyBookings = raw.bookings.length > 0;
  let booked: GaugeModel;
  if (noClasses || !anyBookings) {
    const firstUpcoming = raw.classes.find((c) => c.date >= k.today);
    booked = {
      spec: { kind: "petals", vals: [0, 0, 0, 0, 0, 0, 0], last: [0, 0, 0, 0, 0, 0, 0], today: k.week.indexOf(k.today) },
      empty: true,
      label: "Booked",
      sub: firstUpcoming ? `First class ${DAY_SHORT[mondayIndex(parseDay(firstUpcoming.date).getDay())]}` : "No bookings yet",
      subTone: "faint",
      target: null,
      format: String,
    };
  } else {
    const delta = lastTotal > 0 ? Math.round(((total - lastTotal) / lastTotal) * 100) : null;
    booked = {
      spec: { kind: "petals", vals, last, today: k.week.indexOf(k.today) },
      empty: false,
      label: "Booked",
      sub: early || delta === null ? "This week" : `${delta >= 0 ? "+" : "−"}${Math.abs(delta)}% vs last wk`,
      subTone: "good",
      target: total,
      format: String,
    };
  }
  return [fill, booked, net, seats];
}

export const toneColour = (c: DashPalette, t: GaugeModel["subTone"]) => (t === "good" ? c.good : t === "warn" ? c.warn : t === "high" ? c.high : c.faint);

// ---- the per-type Today block (BizTypeKit glance, DA1-003..014) --------------

export type TodayBlock =
  | { kind: "empty"; icon: "calendar-plus" | "scan-line" | "package"; title: string; body: string; boxes?: NumberBox[] }
  | {
      kind: "classes";
      boxes: NumberBox[];
      bars: { h: number; label: string }[];
      hi: number;
      next: { id: string; title: string; detail: string; pill: { text: string; tone: "good" | "pale" | "soft" } }[];
      tip: string | null;
    };

export interface NumberBox {
  value: string;
  label: string;
  delta?: string;
  tone?: "good" | "warn" | "bad";
}

export function todayBlock(kind: DashKind, raw: DashRaw, now: Date): TodayBlock {
  const k = counts(raw, now);
  if (kind === "store") {
    return { kind: "empty", icon: "package", title: "No orders yet", body: "Orders show here as soon as your first product is listed." };
  }
  if (kind === "gym") {
    const r = raw.renewalsDue;
    return {
      kind: "empty",
      icon: "scan-line",
      title: "No entries yet",
      body: "Entries show here once members start checking in.",
      boxes: [
        { value: "–", label: "Entries today" },
        { value: "–", label: "Right now" },
        r === null ? { value: "–", label: "Renewals due" } : { value: String(r), label: "Renewals due", delta: "In the next 7 days", tone: "warn" },
      ],
    };
  }
  if (raw.classes.length === 0) {
    return { kind: "empty", icon: "calendar-plus", title: "No classes yet", body: "Add your first class and bookings show here." };
  }
  const early = isEarly(raw, k);
  const todays = k.byDate[k.today] ?? [];
  const fillOf = (c: DashClass) => (c.cap > 0 ? (k.booked[c.id] ?? 0) / c.cap : 0);
  const sumB = todays.reduce((a, c) => a + (k.booked[c.id] ?? 0), 0);
  const sumC = todays.reduce((a, c) => a + c.cap, 0);
  const avg = sumC > 0 ? Math.round((sumB / sumC) * 100) : null;
  // Same weekday last week, for the Average fill delta.
  const lastSame = k.byDate[shiftDate(k.today, -7)] ?? [];
  const lb = lastSame.reduce((a, c) => a + (k.booked[c.id] ?? 0), 0);
  const lc = lastSame.reduce((a, c) => a + c.cap, 0);
  const lastAvg = lc > 0 ? Math.round((lb / lc) * 100) : null;
  const delta = !early && avg !== null && lastAvg !== null ? avg - lastAvg : null;
  const waitTotal = todays.every((c) => c.id in raw.waitlists) ? todays.reduce((a, c) => a + (raw.waitlists[c.id] ?? 0), 0) : null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const upcoming = todays.filter((c) => (minutesOfDay(c.end) ?? 0) > nowMin);
  const hiClass = upcoming[0];
  return {
    kind: "classes",
    boxes: [
      { value: String(todays.length), label: "Classes today" },
      { value: avg === null ? "–" : `${avg}%`, label: "Average fill", delta: delta === null ? undefined : `${delta >= 0 ? "+" : "−"}${Math.abs(delta)}% vs last week`, tone: delta !== null && delta < 0 ? "warn" : "good" },
      { value: waitTotal === null ? "–" : String(waitTotal), label: "On waitlists" },
    ],
    bars: todays.map((c) => ({ h: Math.round(fillOf(c) * 100), label: shortHour(c.start) })),
    hi: hiClass ? todays.indexOf(hiClass) : -1,
    next: upcoming.slice(0, 3).map((c) => {
      const b = k.booked[c.id] ?? 0;
      const w = raw.waitlists[c.id] ?? 0;
      const who = firstName(c.professionalId ? raw.team[c.professionalId] : undefined);
      return {
        id: c.id,
        title: c.title,
        detail: who ? `${time12(c.start)} · ${raw.team[c.professionalId as string]}` : time12(c.start),
        pill: b >= c.cap ? { text: "Full", tone: "good" as const } : w > 0 ? { text: `${w} on waitlist`, tone: "pale" as const } : { text: `${Math.round(fillOf(c) * 100)}%`, tone: "soft" as const },
      };
    }),
    tip: early ? "Trends appear after your first two weeks of classes." : null,
  };
}

// ---- Schedule (week strip + today card) -------------------------------------

export interface DayItem {
  ev: boolean;
  id: string;
  title: string;
  time: string;
  end: string;
  who: string;
  b: number;
  cap: number;
  loc: string;
  status: string;
}

export function weekItems(raw: DashRaw, now: Date): { dates: string[]; items: DayItem[][] } {
  const k = counts(raw, now);
  const from = k.week[0];
  const to = k.week[6];
  const evs: DayItem[][] = k.week.map(() => []);
  for (const e of raw.events) {
    for (const d of occurrenceDates(e, from, to)) {
      const i = k.week.indexOf(d);
      if (i < 0) continue;
      evs[i].push({
        ev: true,
        id: `${e.id}:${d}`,
        title: e.title,
        time: e.allDay ? "00:00" : e.startTime ?? "00:00",
        end: e.allDay ? "23:59" : e.endTime ?? e.startTime ?? "00:00",
        who: "",
        b: 0,
        cap: 0,
        loc: e.location ?? "",
        status: e.invite ? (e.invite.status === "accepted" ? "Going" : e.invite.status === "pending" ? "Invitation" : "") : "",
      });
    }
  }
  const items = k.week.map((d, i) =>
    [
      ...(k.byDate[d] ?? []).map((c) => ({
        ev: false,
        id: c.id,
        title: c.title,
        time: c.start,
        end: c.end,
        who: firstName(c.professionalId ? raw.team[c.professionalId] : undefined),
        b: k.booked[c.id] ?? 0,
        cap: c.cap,
        loc: "",
        status: "",
      })),
      ...evs[i],
    ].sort((a, b) => a.time.localeCompare(b.time))
  );
  return { dates: k.week, items };
}

// ---- Recent activity ----------------------------------------------------------

export type ActivityType = "joined" | "ended" | "booked" | "created";

export interface ActivityEvent {
  key: string;
  type: ActivityType;
  at: string;
  day: string;
  title: string;
  sub: string;
  /** Staff initial for a named row (created by the business); null = masked member. */
  initial: string | null;
}

/** "25 min ago", "2h ago" today; "7:12 PM" before today (12-hour, D5). */
export function whenLabel(at: string, now: Date): string {
  const d = new Date(at);
  if (localDayOf(d) === localDayOf(now)) {
    const mins = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60000));
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }
  return time12(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
}

export function activityEvents(raw: DashRaw, now: Date, days = 30): ActivityEvent[] {
  const k = counts(raw, now);
  const since = shiftDate(k.today, -(days - 1));
  const out: ActivityEvent[] = [];
  const classById = Object.fromEntries(raw.classes.map((c) => [c.id, c]));
  const inWindow = (at: string) => localDayOf(at) >= since;
  for (const b of raw.bookings) {
    const c = classById[b.classId];
    if (!c || !inWindow(b.createdAt)) continue;
    out.push({
      key: `b-${b.classId}-${b.clientId}`,
      type: "booked",
      at: b.createdAt,
      day: localDayOf(b.createdAt),
      title: `${maskedMember(b.clientId)} booked ${c.title}`,
      sub: `${dayLabel(c.date, k.today)} ${time12(c.start)} · ${k.booked[c.id] ?? 0} of ${c.cap} now booked`,
      initial: null,
    });
  }
  for (const m of raw.members) {
    if (m.accepted === true && m.respondedAt && inWindow(m.respondedAt)) {
      const plan = m.planId ? raw.planNames[m.planId] : undefined;
      const viaCode = raw.codes.some((x) => x.redeemedBy === m.memberId);
      out.push({
        key: `j-${m.id}`,
        type: "joined",
        at: m.respondedAt,
        day: localDayOf(m.respondedAt),
        title: `${maskedMember(m.memberId)} joined`,
        sub: viaCode ? `Redeemed a code · ${plan ?? "no plan"}` : plan ?? "No plan",
        initial: null,
      });
    }
    if (m.endedAt && inWindow(m.endedAt)) {
      const since0 = m.respondedAt ?? m.invitedAt;
      const d = new Date(since0);
      const sinceLabel = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : ""}`;
      out.push({
        key: `e-${m.id}`,
        type: "ended",
        at: m.endedAt,
        day: localDayOf(m.endedAt),
        title: `${maskedMember(m.memberId)} ended their membership`,
        sub: `Member since ${sinceLabel}`,
        initial: null,
      });
    }
  }
  for (const c of raw.classes) {
    if (!inWindow(c.createdAt)) continue;
    const name = c.professionalId ? raw.team[c.professionalId] : undefined;
    const who = firstName(name);
    out.push({
      key: `c-${c.id}`,
      type: "created",
      at: c.createdAt,
      day: localDayOf(c.createdAt),
      title: `${c.title} scheduled`,
      sub: `${DAY_SHORT[mondayIndex(parseDay(c.date).getDay())]} ${time12(c.start)}${who ? ` with ${who}` : ""} · ${c.cap} spots`,
      initial: who ? who[0].toUpperCase() : null,
    });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export interface WeekTotal {
  type: ActivityType;
  label: string;
  n: number;
  prev: number;
  days: number[];
}

export function weekTotals(kind: DashKind, raw: DashRaw, now: Date): WeekTotal[] {
  const k = counts(raw, now);
  const all = activityEvents(raw, now, 14);
  const perDay = (type: ActivityType, dates: string[]) => dates.map((d) => all.filter((e) => e.type === type && e.day === d).length);
  const mk = (type: ActivityType, label: string): WeekTotal => {
    const days = perDay(type, k.week);
    const prev = perDay(type, k.lastWeek);
    return { type, label, n: days.reduce((a, b) => a + b, 0), prev: prev.reduce((a, b) => a + b, 0), days };
  };
  const base = [mk("joined", "Joined"), mk("ended", "Ended")];
  return kind === "classes" ? [...base, mk("booked", "Booked"), mk("created", "Classes")] : base;
}

// ---- Needs your attention (BU4-10, derived until the RPC exists) ------------

export interface AttentionItem {
  key: string;
  icon: "eye-off" | "ticket" | "calendar-clock" | "users";
  tone: "high" | "caution" | "primary";
  title: string;
  sub: string;
  action: string;
  to: "listing" | "members" | "classes" | "employees";
}

export function attentionItems(raw: DashRaw, now: Date): AttentionItem[] {
  const out: AttentionItem[] = [];
  const k = counts(raw, now);
  if (raw.business && !raw.business.active) {
    out.push({ key: "hidden", icon: "eye-off", tone: "high", title: "Your listing is hidden", sub: "Clients can't find you on Explore", action: "Turn on", to: "listing" });
  }
  const nowIso = now.toISOString();
  const waiting = raw.codes.filter((c) => !c.redeemed && c.expiresAt > nowIso).length;
  if (waiting > 0) {
    out.push({ key: "codes", icon: "ticket", tone: "caution", title: "Member invites waiting", sub: `${waiting} ${waiting === 1 ? "code" : "codes"} not redeemed`, action: "View", to: "members" });
  }
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const d of [k.today, shiftDate(k.today, 1)]) {
    for (const c of k.byDate[d] ?? []) {
      if (d === k.today && (minutesOfDay(c.start) ?? 0) <= nowMin) continue;
      const b = k.booked[c.id] ?? 0;
      const f = c.cap > 0 ? b / c.cap : 1;
      if (f >= 0.5) continue;
      out.push({
        key: `u-${c.id}`,
        icon: "calendar-clock",
        tone: "caution",
        title: `${c.title} is ${Math.round(f * 100)}% booked`,
        sub: `${dayLabel(d, k.today)} ${time12(c.start)} · ${b} of ${c.cap} spots`,
        action: "Open",
        to: "classes",
      });
    }
  }
  const s = raw.seats;
  if (s && s.capacity > s.used) {
    const free = s.capacity - s.used;
    out.push({ key: "seats", icon: "users", tone: "primary", title: `${free} ${free === 1 ? "seat" : "seats"} unfilled`, sub: `${s.used} of ${s.capacity} seats used`, action: "Add", to: "employees" });
  }
  return out;
}

// ---- Finish setting up (DA2-003, OURS-DA-get-set-up-per-type) ---------------

export interface SetupStep {
  key: string;
  label: string;
  action: string;
  done: boolean;
  to: "profile" | "listing" | "classes" | "plans" | "members" | "checkin" | "products" | "delivery" | "orders";
}

export function setupSteps(kind: DashKind, raw: DashRaw): SetupStep[] {
  const profile: SetupStep = { key: "profile", label: "Business profile saved", action: "Set up", done: !!raw.business, to: "profile" };
  const listing: SetupStep = { key: "listing", label: "Turn your listing on", action: "Turn on", done: !!raw.business?.active, to: "listing" };
  const firstMember: SetupStep = { key: "member", label: "Get your first member", action: "Invite", done: raw.members.some((m) => m.accepted === true), to: "members" };
  const plan: SetupStep = { key: "plan", label: "Add a membership plan", action: "Add", done: raw.plansCount > 0, to: "plans" };
  if (kind === "store") {
    return [
      profile,
      listing,
      { key: "product", label: "Add your first product", action: "Add", done: raw.productsCount > 0, to: "products" },
      { key: "delivery", label: "Set delivery or pickup", action: "Set up", done: raw.storeDeliveryOrPickup, to: "delivery" },
      // First order: orders are BU4-05 (not on the stack), so it stays open.
      { key: "order", label: "Get your first order", action: "View", done: false, to: "orders" },
    ];
  }
  if (kind === "gym") {
    return [profile, listing, plan, { key: "checkin", label: "Set up check-in", action: "Set up", done: raw.accessQr, to: "checkin" }, firstMember];
  }
  return [profile, listing, { key: "class", label: "Create your first class", action: "Create", done: raw.classes.length > 0, to: "classes" }, plan, firstMember];
}

export const isClassBased = (kind: DashKind) => kind === "classes";

export { DAY_SHORT, DAY_LONG };
