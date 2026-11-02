// What the Dashboard shows, derived from the real rows (dashboardData.ts).
// Pure: everything takes `now` so the rules can be tested without a clock.
//
// Strings are the handover's (COPY / BizSummaryV27 / BizTypeKit) unless the
// row is marked OURS in the checklists; every OURS string is listed in the
// Batch 3 report.

import type { DashRaw, DashClass, GlanceFigure } from "./dashboardTypes";
import { gymEntriesGauge, gymHasEntries, gymTodayModel, type GymTodayModel } from "./gymToday";
import type { GaugeSpec } from "./clusterGeometry";
import type { DashPalette } from "./palette";
import { occurrenceDates } from "../calendar/occurrences";
import { localDayOf, shiftDate } from "../../utils/date";
import { DAY_LONG, DAY_SHORT, mondayFirstWeek, mondayIndex } from "../../utils/week";
import { minutesOfDay, time12 } from "../../utils/time12";
import { ARABIC_LOCALE } from "../../i18n/format";
import { getLanguage, t, tk, tn, tx } from "../../i18n/core";

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

/** "Monday, October 5" (DA1-015 #2). */
export function dateKicker(now: Date): string {
  // Round G (EH5): Arabic day and month names (F9); English unchanged.
  if (getLanguage() === "ar") return now.toLocaleDateString(ARABIC_LOCALE, { weekday: "long", month: "long", day: "numeric" });
  return `${DAY_LONG[mondayIndex(now.getDay())]}, ${MONTHS_LONG[now.getMonth()]} ${now.getDate()}`;
}

/** DA1-015 #3: "Good evening" (COPY); morning and afternoon are OURS. */
export function greeting(now: Date): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return t("Good morning");
  if (h >= 12 && h < 17) return t("Good afternoon");
  return t("Good evening");
}

const parseDay = (iso: string) => new Date(`${iso}T00:00:00`);
/** "Sat, Oct 3". */
export const shortDay = (iso: string) => {
  const d = parseDay(iso);
  if (getLanguage() === "ar") return d.toLocaleDateString(ARABIC_LOCALE, { weekday: "short", month: "short", day: "numeric" });
  return `${DAY_SHORT[mondayIndex(d.getDay())]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
};
/** "Today", "Yesterday", "Tomorrow" or "Sat 3 Oct". */
export function dayLabel(iso: string, today: string): string {
  if (iso === today) return t("Today");
  if (iso === shiftDate(today, -1)) return t("Yesterday");
  if (iso === shiftDate(today, 1)) return t("Tomorrow");
  return shortDay(iso);
}

/** A weekday's short name ("Sat"; the Arabic day name in Arabic). */
const weekdayShort = (iso: string) => (getLanguage() === "ar" ? parseDay(iso).toLocaleDateString(ARABIC_LOCALE, { weekday: "long" }) : DAY_SHORT[mondayIndex(parseDay(iso).getDay())]);

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
    label: t("Net members"),
    sub: empty ? t("No members yet") : t("{joined} joined · {ended} ended", { joined: j, ended: e }),
    subTone: empty ? "faint" : "good",
    target: empty ? null : j - e,
    format: signed,
  };
}

function seatsUsed(raw: DashRaw): GaugeModel {
  const s = raw.seats;
  if (!s || s.capacity === 0) {
    return { spec: { kind: "nodes", used: 0, total: 0 }, empty: true, label: t("Seats used"), sub: t("No seat blocks"), subTone: "faint", target: null, format: String };
  }
  const free = Math.max(0, s.capacity - s.used);
  return {
    spec: { kind: "nodes", used: s.used, total: s.capacity },
    empty: false,
    label: t("Seats used"),
    sub: `${tx("{n} free", "seats", { n: free })} · ${tn(s.blocks, "{n} block", "{n} blocks")}`,
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
        label: t("New members"),
        sub: newEmpty ? t("No members yet") : early ? t("This week") : diff === 0 ? t("Same as last wk") : t("{delta} vs last wk", { delta: `${diff > 0 ? "+" : "−"}${Math.abs(diff)}` }),
        subTone: newEmpty ? "faint" : "good",
        target: newEmpty ? null : n,
        format: String,
      },
      { spec: { kind: "blank" }, empty: raw.liveProductsCount === 0, label: t("Live listings"), sub: t("On Explore"), subTone: "faint", target: raw.liveProductsCount === 0 ? null : raw.liveProductsCount, format: String },
      { spec: { kind: "blank" }, empty: raw.discountsCount === 0, label: t("Live discounts"), sub: t("On listing"), subTone: "faint", target: raw.discountsCount === 0 ? null : raw.discountsCount, format: String },
    ];
  }

  if (kind === "gym") {
    // OURS-DA-gym-gauges: Entries (B10: unlit until the venue has an entry), Renewals due, Net members, Seats used.
    const r = raw.renewalsDue;
    return [
      raw.gym && gymHasEntries(raw.gym) ? gymEntriesGauge(raw.gym, k.week, k.lastWeek, k.today) : { spec: { kind: "petals", vals: [0, 0, 0, 0, 0, 0, 0], last: [0, 0, 0, 0, 0, 0, 0], today: k.week.indexOf(k.today) }, empty: true, label: t("Entries"), sub: t("No entries yet"), subTone: "faint", target: null, format: String },
      { spec: { kind: "blank" }, empty: r === null, label: t("Renewals due"), sub: t("In the next 7 days"), subTone: r === null ? "faint" : "warn", target: r, format: String },
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
    ? { spec: { kind: "ring", fills: Array(12).fill(0), pct: 0 }, empty: true, label: t("Fill rate"), sub: t("No classes yet"), subTone: "faint", target: null, format: String }
    : weekClasses.length === 0
      ? { spec: { kind: "ring", fills: Array(12).fill(0), pct: 0 }, empty: true, label: t("Fill rate"), sub: t("No classes this week"), subTone: "faint", target: null, format: String }
      : { spec: { kind: "ring", fills, pct }, empty: false, label: t("Fill rate"), sub: t("{n} under 70%", { n: under }), subTone: "good", target: Math.round(pct * 100), format: String, unit: "%" };

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
      label: t("Booked"),
      sub: firstUpcoming ? t("First class {day}", { day: weekdayShort(firstUpcoming.date) }) : t("No bookings yet"),
      subTone: "faint",
      target: null,
      format: String,
    };
  } else {
    const delta = lastTotal > 0 ? Math.round(((total - lastTotal) / lastTotal) * 100) : null;
    booked = {
      spec: { kind: "petals", vals, last, today: k.week.indexOf(k.today) },
      empty: false,
      label: t("Booked"),
      sub: early || delta === null ? t("This week") : t("{delta} vs last wk", { delta: `${delta >= 0 ? "+" : "−"}${Math.abs(delta)}%` }),
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
      kind: "store";
      boxes: NumberBox[];
      /** Orders to fulfil, newest first, cap 3 (DA1-011 #3). */
      orders: { id: string; glyph: "package" | "truck"; title: string; detail: string; pill: { text: string; tone: "good" | "warn" | "pale" } }[];
      openCount: number;
      /** Under 5 left (DA1-011 #4), cap 3. */
      low: { id: string; title: string; detail: string; value: string }[];
      lowCount: number;
      tip: string | null;
    }
  | {
      kind: "classes";
      boxes: NumberBox[];
      bars: { h: number; label: string }[];
      hi: number;
      next: { id: string; title: string; detail: string; pill: { text: string; tone: "good" | "pale" | "soft" } }[];
      tip: string | null;
    }
  | GymTodayModel;

export interface NumberBox {
  value: string;
  label: string;
  delta?: string;
  tone?: "good" | "warn" | "bad" | "faint";
}

export function todayBlock(kind: DashKind, raw: DashRaw, now: Date): TodayBlock {
  const k = counts(raw, now);
  if (kind === "store") return storeToday(raw);
  if (kind === "gym") {
    const r = raw.renewalsDue;
    // B10 (DA1-007 / 009): the venue has entries; DA1-010 empty otherwise.
    if (raw.gym && gymHasEntries(raw.gym)) {
      const labels = new Map(raw.members.filter((m) => m.label).map((m) => [m.memberId, m.label as string]));
      return gymTodayModel(raw.gym, r, (id) => labels.get(id) ?? null, now);
    }
    return {
      kind: "empty",
      icon: "scan-line",
      title: t("No entries yet"),
      body: t("Entries show here once members start checking in."),
      boxes: [
        { value: "–", label: t("Entries today") },
        { value: "–", label: t("Right now") },
        r === null ? { value: "–", label: t("Renewals due") } : { value: String(r), label: t("Renewals due"), delta: t("In the next 7 days"), tone: "warn" },
      ],
    };
  }
  if (raw.classes.length === 0) {
    return { kind: "empty", icon: "calendar-plus", title: t("No classes yet"), body: t("Add your first class and bookings show here.") };
  }
  const g = classGlance(raw);
  const todays = k.byDate[k.today] ?? [];
  const fillOf = (c: DashClass) => (c.cap > 0 ? (k.booked[c.id] ?? 0) / c.cap : 0);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const upcoming = todays.filter((c) => (minutesOfDay(c.end) ?? 0) > nowMin);
  const hiClass = upcoming[0];
  return {
    kind: "classes",
    boxes: g.boxes,
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
        pill: b >= c.cap ? { text: t("Full"), tone: "good" as const } : w > 0 ? { text: t("{n} on waitlist", { n: w }), tone: "pale" as const } : { text: `${Math.round(fillOf(c) * 100)}%`, tone: "soft" as const },
      };
    }),
    // B15 follow-up: business_glance's early flag only (under 14 days old, or
    // under 10 classes held in the 28 days before).
    tip: g.early ? t(EARLY_TIP) : null,
  };
}

/** B15 · business_glance rows (PostgREST numerics may arrive as strings), by metric. */
export function toGlance(rows: { metric: string; value: number | string | null; early: boolean | null }[] | null | undefined): Record<string, GlanceFigure> {
  const out: Record<string, GlanceFigure> = {};
  for (const r of rows ?? []) out[r.metric] = { value: r.value === null || r.value === undefined ? null : Number(r.value), early: r.early === true };
  return out;
}

/**
 * B15 · the class Today boxes (DA1-003 #5) from business_glance: Classes
 * today, Average fill (delta against the same weekday last week, the glance
 * for that date), On waitlists. Only the metrics returned get a box (no
 * `schedule` permission: no box, not an error). `early` (the business is under
 * 14 days old or the figure rests on under 10 records) is DA1-005's state: no
 * delta, and the tip. A failed read keeps the three boxes pending ("–"), never 0.
 */
export function classGlance(raw: Pick<DashRaw, "glance" | "glanceLastWeek">): { boxes: NumberBox[]; early: boolean } {
  const g = raw.glance;
  if (!g) return { boxes: [{ value: "–", label: t("Classes today") }, { value: "–", label: t("Average fill") }, { value: "–", label: t("On waitlists") }], early: false };
  const boxes: NumberBox[] = [];
  const n = (f: GlanceFigure) => (f.value === null ? "–" : String(Math.round(f.value)));
  if (g.classes_today) boxes.push({ value: n(g.classes_today), label: t("Classes today") });
  const fill = g.average_fill_pct;
  if (fill) {
    const avg = fill.value === null ? null : Math.round(fill.value);
    const lw = raw.glanceLastWeek?.average_fill_pct?.value;
    const last = lw === null || lw === undefined ? null : Math.round(lw);
    const delta = !fill.early && avg !== null && last !== null ? avg - last : null;
    boxes.push({ value: avg === null ? "–" : `${avg}%`, label: t("Average fill"), delta: delta === null ? undefined : t("{delta} vs last week", { delta: `${delta >= 0 ? "+" : "−"}${Math.abs(delta)}%` }), tone: delta !== null && delta < 0 ? "warn" : "good" });
  }
  if (g.on_waitlists) boxes.push({ value: n(g.on_waitlists), label: t("On waitlists") });
  return { boxes, early: !!(fill ?? g.classes_today)?.early };
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
        status: e.invite ? (e.invite.status === "accepted" ? t("Going") : e.invite.status === "pending" ? t("Invitation") : "") : "",
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

// ---- Recent activity (rows: activityFeed.ts, B15) ------------------------------

/** "25 min ago", "2h ago" today; "7:12 PM" before today (12-hour, D5). */
export function whenLabel(at: string, now: Date): string {
  const d = new Date(at);
  if (localDayOf(d) === localDayOf(now)) {
    const mins = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60000));
    if (mins < 1) return t("Just now");
    if (mins < 60) return t("{n} min ago", { n: mins });
    return t("{n}h ago", { n: Math.floor(mins / 60) });
  }
  return time12(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
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
  const profile: SetupStep = { key: "profile", label: t("Business profile saved"), action: t("Set up"), done: !!raw.business, to: "profile" };
  const listing: SetupStep = { key: "listing", label: t("Turn your listing on"), action: t("Turn on"), done: !!raw.business?.active, to: "listing" };
  const firstMember: SetupStep = { key: "member", label: t("Get your first member"), action: t("Invite"), done: raw.members.some((m) => m.accepted === true), to: "members" };
  const plan: SetupStep = { key: "plan", label: t("Add a membership plan"), action: t("Add"), done: raw.plansCount > 0, to: "plans" };
  if (kind === "store") {
    return [
      profile,
      listing,
      { key: "product", label: t("Add your first product"), action: t("Add"), done: raw.productsCount > 0, to: "products" },
      { key: "delivery", label: t("Set delivery or pickup"), action: t("Set up"), done: raw.storeDeliveryOrPickup, to: "delivery" },
      // First order: B11 store_orders_page total_count (open while B11 is not on the database).
      { key: "order", label: t("Get your first order"), action: t("View"), done: (raw.store?.totalOrders ?? 0) > 0, to: "orders" },
    ];
  }
  if (kind === "gym") {
    return [profile, listing, plan, { key: "checkin", label: t("Set up check-in"), action: t("Set up"), done: raw.accessQr, to: "checkin" }, firstMember];
  }
  return [profile, listing, { key: "class", label: t("Create your first class"), action: t("Create"), done: raw.classes.length > 0, to: "classes" }, plan, firstMember];
}

export const isClassBased = (kind: DashKind) => kind === "classes";

export { DAY_SHORT, DAY_LONG };

// ---- the store Today block (DA1-011 / DA1-013 / DA1-014, B11) ----------------

const OPEN_ORDER = new Set(["placed", "packed", "out_for_delivery", "ready_for_pickup"]);
const ORDER_PILL: Record<string, { text: string; tone: "good" | "warn" | "pale" }> = {
  placed: { text: tk("To pack"), tone: "warn" },
  packed: { text: tk("Packed"), tone: "pale" },
  out_for_delivery: { text: "Out", tone: "pale" },
  ready_for_pickup: { text: tk("Ready"), tone: "good" },
};
/** The order pill in the app's language ("Out" is "out for delivery": its own context). */
const orderPill = (status: string) => {
  const p = ORDER_PILL[status];
  if (!p) return p;
  return { ...p, text: status === "out_for_delivery" ? tx("Out", "out for delivery") : t(p.text) };
};
/**
 * The early tip (DA1-005 #3 / DA1-013 #2 position), shown when business_glance
 * says the figure rests on thin history (B15 follow-up: the business is under
 * 14 days old, or the source has under 10 records in the 28 days before).
 */
export const EARLY_TIP = tk("Early days: not enough history yet");

/**
 * DA1-011: Orders today, To pack or deliver, Low stock (under 5 left); the
 * open orders (newest first) and the low-stock products. The drawn "+3 vs
 * usual" delta has no definition of "usual" (UNSPECIFIED), so it is not
 * shown. No order ever (or B11 not on the database) = the DA1-014 empty card.
 */
export function storeToday(raw: DashRaw): TodayBlock {
  const s = raw.store;
  if (!s || s.totalOrders === 0) {
    return { kind: "empty", icon: "package", title: t("No orders yet"), body: t("Orders show here as soon as your first product is listed.") };
  }

  const open = s.orders.filter((o) => OPEN_ORDER.has(o.status));
  const items = (n: number) => tn(n, "{n} item", "{n} items");
  // B15: Orders today and Low stock are business_glance's (orders_today on the
  // business's own day; low_stock under 5 left). "To pack or deliver" is
  // glance's orders_open (placed, packed, out for delivery, ready for pickup:
  // what the drawn label counts; orders_to_pack is placed + packed only), else
  // the open-order count of the list below it.
  const g = raw.glance;
  const fig = (f: GlanceFigure | undefined) => (f && f.value !== null ? Math.round(f.value) : null);
  const boxes: NumberBox[] = [];
  if (!g || g.orders_today) boxes.push({ value: fig(g?.orders_today) === null ? "–" : String(fig(g?.orders_today)), label: t("Orders today") });
  boxes.push({ value: String(fig(g?.orders_open) ?? open.length), label: t("To pack or deliver") });
  if (!g || g.low_stock) {
    const low = fig(g?.low_stock);
    boxes.push(low === null ? { value: "–", label: t("Low stock") } : low > 0 ? { value: String(low), label: t("Low stock"), delta: t("Under 5 left"), tone: "warn" } : { value: "0", label: t("Low stock") });
  }
  return {
    kind: "store",
    boxes,
    orders: open.slice(0, 3).map((o) => ({
      id: o.id,
      glyph: o.fulfilment === "delivery" ? "truck" : "package",
      title: t("Order #{number}", { number: o.number }),
      detail: `${o.fulfilment === "delivery" ? t("Delivery") : t("Pickup")} · ${items(o.itemCount)} · ${o.label}`,
      pill: orderPill(o.status),
    })),
    openCount: open.length,
    low: s.lowStock.slice(0, 3).map((p) => ({ id: p.id, title: p.name, detail: p.category ?? t("Other"), value: t("{n} left", { n: p.stock }) })),
    lowCount: s.lowStock.length,
    // The server's early flag only (orders in the 28 days before, B15 follow-up).
    tip: g?.orders_open?.early || g?.orders_today?.early ? t(EARLY_TIP) : null,
  };
}
