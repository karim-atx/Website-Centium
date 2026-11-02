// Market + Share 3.0 · W4 · P-MA.5 Opportunities: the pure rules behind the
// professional's Openings, Apply sheet, My applications, My work, the
// existing-team invite and the P-MA.1 Opportunities card (Professional
// Marketplace Screens' script: `op`, `opTabs`, `FG`, `gymOpen`, `classOpen`,
// `A()` / `apps`, `W()` / `myWork`, `sheet` (apSheet / apSheetRate), `dlg`
// (apOffer / etInvite / etInviteExpired), `ov.links`). Values come from the
// DB8 readers in services/team-hiring; the board's sample rows never ship
// (D-52). Dates are month first (D-02), times 12-hour (D-03), weeks start on
// Monday. No Supabase import (type-only imports are erased): testable under
// node:test.

import type { ApplicationStatus, ExistingTeamInvite, OpeningType, PayUnit } from "../../../../services/hiring/model.ts";

// The fields read here, structurally as services/team-hiring declares them
// (Opportunity, MyApplication, WorkItem, WorkClass, OpportunityFilters). Not
// imported from there: that module imports the Supabase client, which the
// node test build can't type-check.
export interface Opportunity {
  id: string;
  type: OpeningType;
  title: string;
  className: string | null;
  /** openings.schedule_label: the gym's chosen classes in words. */
  scheduleLabel?: string | null;
  startsAt: string | null;
  /** ISO weekdays of the series the opening names (opportunities.weekdays, Database #38). */
  weekdays: number[];
  /** "HH:MM": the earliest start of those series (opportunities.start_time, Database #38); null for a slot or a role naming none. */
  startTime?: string | null;
  pay: number | null;
  payUnit: PayUnit;
  classesPerMonth: number | null;
  allowPayProposals: boolean;
  positions: number;
  postedAt: string | null;
  businessName: string;
  businessRating: number | null;
  distanceKm: number | null;
}
export interface OpportunityFilters {
  type: OpeningType | null;
  specialty: string | null;
  distanceKm: number | null;
}
export interface MyApplication {
  status: ApplicationStatus;
  path: "opening" | "direct";
  businessName: string;
  title: string;
  type: OpeningType;
  pay: number | null;
  payUnit: PayUnit;
  classesPerMonth: number | null;
  startsOn: string | null;
  note: string | null;
  createdAt: string | null;
}
export interface WorkClass {
  title: string;
  weekday: number | null;
  startTime: string | null;
  label: string | null;
}
export interface WorkItem {
  businessId: string;
  businessName: string;
  roleTitle: string;
  type: OpeningType;
  since: string | null;
  sessionsAWeek: number;
  pay: number | null;
  payUnit: PayUnit;
}
import { payMoney, payText } from "../../../../services/hiring/fee.ts";
import { formatShortDate } from "../../../../utils/date.ts";
import { formatMinutes12 } from "../../../../utils/time12.ts";
import { t, tk, tn, tx } from "../../../../i18n/core.ts";
import { weekdayLong, weekdayShort as dayShort } from "../../../../components/pro/proDates.ts";

// ---------------------------------------------------------------------------
// dates and times

/** A Date from an ISO instant, or local midnight for a date-only "YYYY-MM-DD". */
export function toDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
/** Whole local days from `now` to `d` (negative in the past). */
export const daysFrom = (d: Date, now: Date): number => Math.round((dayStart(d) - dayStart(now)) / 86_400_000);

/** "Sat, Oct 24". */
export const dayDate = (d: Date): string => formatShortDate(d, { weekday: "short", month: "short", day: "numeric" });
/** "Mon, Nov 2, 2026". */
export const fullDate = (d: Date): string => formatShortDate(d, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
/** "Nov 14, 2026". */
export const longDate = (d: Date): string => formatShortDate(d, { month: "short", day: "numeric", year: "numeric" });
/** "Oct 12" this year, "Oct 12, 2025" another. */
export const shortDate = (d: Date, now: Date): string =>
  formatShortDate(d, d.getFullYear() === now.getFullYear() ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
/** "Mar 2026". */
export const monthYear = (d: Date): string => formatShortDate(d, { month: "short", year: "numeric" });

/** "10:00 AM" from an instant. */
export const clockOf = (d: Date): string => formatMinutes12(d.getHours() * 60 + d.getMinutes());

/** "10:00 AM" from "HH:MM" / "HH:MM:SS". */
export function clockOfTime(hhmm: string | null | undefined): string | null {
  const m = hhmm ? /^(\d{1,2}):(\d{2})/.exec(hhmm) : null;
  return m ? formatMinutes12(Number(m[1]) * 60 + Number(m[2])) : null;
}

/** The time column of a class ticket: "9:00" + "AM" (the meridiem drawn smaller, as the W2 ClassCard). */
export function clockSplit(text: string | null): { time: string; meridiem: string } | null {
  if (!text) return null;
  const i = text.lastIndexOf(" ");
  return i > 0 ? { time: text.slice(0, i), meridiem: text.slice(i + 1) } : { time: text, meridiem: "" };
}

// "Mondays" (a role's one day, "I'm available Sundays"): English keys, shown through t().
const WEEKDAY_PLURAL = [tk("Mondays"), tk("Tuesdays"), tk("Wednesdays"), tk("Thursdays"), tk("Fridays"), tk("Saturdays"), tk("Sundays")];

/** ISO weekday (1 = Monday … 7 = Sunday) → "Mon" (in the app's language). */
export const weekdayShort = (iso: number): string => dayShort((((Math.round(iso) - 1) % 7) + 7) % 7);

/** "Sun", "Tue and Thu", "Mon, Wed and Fri" (Monday first). */
export function dayList(days: readonly number[], plural = false): string {
  const names = [...new Set(days.filter((d) => d >= 1 && d <= 7))].sort((a, b) => a - b).map((d) => (plural ? t(WEEKDAY_PLURAL[d - 1]) : weekdayShort(d)));
  if (names.length <= 1) return names[0] ?? "";
  return t("{list} and {last}", { list: names.slice(0, -1).join(t(", ")), last: names[names.length - 1] });
}

// ---------------------------------------------------------------------------
// P-MA.5.1 Openings: filter (FG), count line, gym cards, class tickets

/** The board's filter groups (FG). The Type rows map to the opening type. */
// The headings and options stay English values (compared here and in the filter state); FilterPopup shows them through t().
export const TYPE_OPTION: Record<OpeningType, string> = { role: tk("Role · ongoing"), class_slot: tk("Class slot · one-off") };
const DISTANCE_KM: Record<string, number> = { [tk("Within 2 km")]: 2, [tk("Within 5 km")]: 5, [tk("Within 10 km")]: 10 };
export const OP_FILTER_GROUPS = [
  { heading: tk("Type"), options: [TYPE_OPTION.role, TYPE_OPTION.class_slot] },
  { heading: tk("Specialty"), options: [tk("Cycling"), tk("HIIT"), tk("Strength"), tk("Boxing")] },
  { heading: tk("Distance"), options: Object.keys(DISTANCE_KM) },
] as const;

/**
 * The `opportunities()` calls for a selection: one per chosen specialty (the
 * function takes one; checkbox rows mean "any of these", so the answers are
 * merged), the one chosen type (both or none = every type) and the widest
 * chosen distance.
 */
export function filterQueries(selected: readonly string[]): OpportunityFilters[] {
  const types = (Object.keys(TYPE_OPTION) as OpeningType[]).filter((t) => selected.includes(TYPE_OPTION[t]));
  const type = types.length === 1 ? types[0] : null;
  const kms = selected.map((s) => DISTANCE_KM[s]).filter((k): k is number => k != null);
  const distanceKm = kms.length ? Math.max(...kms) : null;
  const specialties = OP_FILTER_GROUPS[1].options.filter((s) => selected.includes(s));
  return (specialties.length ? specialties : [null]).map((specialty) => ({ type, specialty, distanceKm }));
}

/** Merged answers, each opening once: gyms nearest first, class slots soonest first. */
export function mergeOpportunities<T extends Pick<Opportunity, "id" | "distanceKm" | "startsAt">>(lists: readonly T[][], tab: "gyms" | "classes"): T[] {
  const seen = new Map<string, T>();
  for (const l of lists) for (const o of l) if (!seen.has(o.id)) seen.set(o.id, o);
  const all = [...seen.values()];
  if (lists.length <= 1) return all; // one answer keeps the server's order
  const big = Number.POSITIVE_INFINITY;
  return tab === "gyms"
    ? all.sort((a, b) => (a.distanceKm ?? big) - (b.distanceKm ?? big))
    : all.sort((a, b) => (toDate(a.startsAt)?.getTime() ?? big) - (toDate(b.startsAt)?.getTime() ?? big));
}

/** "6 openings near you · sorted by distance", "2 openings · sorted by distance", "4 class slots near you · soonest first", "0 openings". */
export function countLine(tab: "gyms" | "classes", n: number, filtered: boolean): string {
  if (n === 0) return tab === "gyms" ? t("0 openings") : t("0 class slots");
  const count = tab === "gyms" ? tn(n, "{n} opening", "{n} openings") : tn(n, "{n} class slot", "{n} class slots");
  const order = tab === "gyms" ? t("sorted by distance") : t("soonest first");
  return filtered ? t("{count} · {order}", { count, order }) : t("{count} near you · {order}", { count, order });
}

/** "0.8 km", "12 km". */
export const kmText = (km: number): string => t("{n} km", { n: km < 10 ? km.toFixed(1) : Math.round(km) });

/** The gym card's line under the title: rating (with the star) and distance. */
export function ratingDistance(o: Pick<Opportunity, "businessRating" | "distanceKm">): { rating: string | null; distance: string | null } {
  return { rating: o.businessRating != null ? o.businessRating.toFixed(1) : null, distance: o.distanceKm != null ? kmText(o.distanceKm) : null };
}

/** "Role · ongoing" / "Class slot · one-off". */
export const typeText = (type: OpeningType): string => t(TYPE_OPTION[type]);

/** "$80 per class · set by the gym" / "$70 per class · open to proposals". */
export function payLine(o: Pick<Opportunity, "pay" | "payUnit" | "allowPayProposals">): string {
  if (o.pay == null) return o.allowPayProposals ? t("Open to proposals") : t("Set by the gym");
  return o.allowPayProposals ? t("{pay} · open to proposals", { pay: payText(o.pay, o.payUnit) }) : t("{pay} · set by the gym", { pay: payText(o.pay, o.payUnit) });
}

const classesAMonth = (n: number | null) => (n != null && n > 0 ? tn(n, "{n} class a month", "{n} classes a month") : null);

/**
 * "Sun 10:00 AM · 4 classes a month", "Tue and Thu 7:00 PM", a slot's "Sat,
 * Oct 24 · 9:00 AM". A role's days and time are its series' (opportunities
 * weekdays / start_time, Database #38); without them the gym's own
 * schedule_label stands in ("Spin 45 · Sun 10:00 AM · 4 classes a month");
 * null when the opening names neither.
 */
export function scheduleLine(o: Pick<Opportunity, "type" | "weekdays" | "startsAt" | "classesPerMonth" | "scheduleLabel" | "startTime">): string | null {
  const at = toDate(o.startsAt);
  if (!at && !o.weekdays.length && o.scheduleLabel) return [o.scheduleLabel, o.type === "role" ? classesAMonth(o.classesPerMonth) : null].filter(Boolean).join(" · ");
  if (o.type === "class_slot") return at ? `${dayDate(at)} · ${clockOf(at)}` : null;
  const days = dayList(o.weekdays);
  const when = [days, at ? clockOf(at) : clockOfTime(o.startTime)].filter(Boolean).join(" ");
  const parts = [when || null, classesAMonth(o.classesPerMonth)].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** "Posted today · 1 position", "Posted 2 days ago · 2 positions", "Posted Oct 2 · 1 position". */
export function postedLine(postedAt: string | null, positions: number, now: Date): string {
  const d = toDate(postedAt);
  const ago = d ? -daysFrom(d, now) : null;
  const when = ago == null ? null : ago <= 0 ? t("Posted today") : ago === 1 ? t("Posted yesterday") : ago < 7 ? tn(ago, "Posted {n} day ago", "Posted {n} days ago") : t("Posted {date}", { date: shortDate(d!, now) });
  const n = Math.max(1, positions);
  return [when, tn(n, "{n} position", "{n} positions")].filter(Boolean).join(" · ");
}

/**
 * Fields the class ticket draws that `opportunities()` doesn't name yet (the
 * class's length, its specialty and capacity: backend gap, W4 report). When
 * the reader gains them under these names they show; until then the ticket
 * leaves them out.
 */
export interface OpportunityExtras {
  durationMin?: number | null;
  specialty?: string | null;
  capacity?: number | null;
}

/** The class ticket (classOpen): time column, eyebrow, title, "gym · day", the slot line and the pay stub. */
export function classTicket(o: Opportunity & OpportunityExtras): { time: { time: string; meridiem: string } | null; dur: string | null; eyebrow: string | null; title: string; place: string; spots: string; pay: string | null } {
  const at = toDate(o.startsAt);
  const spots = o.capacity != null && o.capacity > 0 ? tn(o.capacity, "{n} spot", "{n} spots") : null;
  return {
    time: at ? clockSplit(clockOf(at)) : null,
    dur: o.durationMin != null && o.durationMin > 0 ? t("{n} min", { n: o.durationMin }) : null,
    eyebrow: o.specialty?.trim() || o.className?.trim() || null,
    title: o.title,
    place: [o.businessName, at ? dayDate(at) : null].filter(Boolean).join(" · "),
    spots: [t("Class slot"), spots, o.type === "class_slot" ? t("one-off") : t("ongoing")].filter(Boolean).join(" · "),
    pay: o.pay != null ? payMoney(o.pay) : null,
  };
}

// ---------------------------------------------------------------------------
// P-MA.5.2 Apply sheet

/** "Apply to Hamra Strength Club". */
export const applyTitle = (o: Pick<Opportunity, "businessName">): string => (o.businessName ? t("Apply to {name}", { name: o.businessName }) : tx("Apply", "job"));

/** The ticket's sub line: "Hamra Strength Club · Role". */
export const openingSub = (o: Pick<Opportunity, "businessName" | "type">): string => [o.businessName || null, o.type === "role" ? t("Role") : t("Class slot")].filter(Boolean).join(" · ");

/** The availability checkbox: "I'm available Sundays at 10:00 AM", "I'm available Tue and Thu at 7:00 PM", "I'm available Sat, Oct 24 at 9:00 AM". */
export function availabilityLabel(o: Pick<Opportunity, "type" | "weekdays" | "startsAt" | "startTime">): string {
  const at = toDate(o.startsAt);
  const clock = at ? clockOf(at) : clockOfTime(o.startTime);
  const avail = (when: string) => (clock ? t("I'm available {when} at {time}", { when, time: clock }) : t("I'm available {when}", { when }));
  if (o.type === "class_slot") return at ? avail(dayDate(at)) : t("I'm available for this class");
  const days = dayList(o.weekdays, o.weekdays.length === 1);
  if (days) return avail(days);
  if (!at) return t("I'm available for this schedule");
  return clock ? t("I'm available from {date} at {time}", { date: dayDate(at), time: clock }) : t("I'm available from {date}", { date: dayDate(at) });
}

/** The proposal hint: "This gym takes proposals. Their posted pay is $70 per class." */
export const proposalHint = (o: Pick<Opportunity, "pay" | "payUnit">): string =>
  o.pay != null ? t("This gym takes proposals. Their posted pay is {pay}.", { pay: payText(o.pay, o.payUnit) }) : t("This gym takes proposals.");

/** The unit after the rate field: "per class", "a month", "for the slot". */
export const unitWord = (u: PayUnit): string => (u === "per_class" ? t("per class") : u === "per_month" ? t("a month") : t("for the slot"));

/** A typed rate: a positive amount with at most two decimals, else null. */
export function parseRate(text: string): number | null {
  const t = text.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? n : null;
}

export interface CredentialLike {
  id: string;
  name: string | null;
  expires: string | null;
  noExpiry: boolean;
  showWhenExpired: boolean;
}

/** The credentials a professional can attach: named, and not expired unless they show expired ones. `nowMonth` "YYYY-MM". */
export function attachableCredentials(list: readonly CredentialLike[], nowMonth: string): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const l of list) {
    const name = l.name?.trim();
    if (!name) continue;
    const expired = !l.noExpiry && !!l.expires && l.expires < nowMonth;
    if (expired && !l.showWhenExpired) continue;
    out.push({ id: l.id, label: name });
  }
  return out;
}

// ---------------------------------------------------------------------------
// P-MA.5.2 My applications (A(), apps)

/** STATUS_STEPS order → the TicketStub tone (DECLINED muted). */
export const STATUS_TONE: Record<ApplicationStatus, 1 | 2 | 3 | 4 | "muted"> = { APPLIED: 1, SHORTLISTED: 2, OFFERED: 3, HIRED: 4, DECLINED: "muted" };

/** "Sunday Spin instructor · Role". */
export const roleLine = (a: Pick<MyApplication, "title" | "type">): string => [a.title || null, a.type === "role" ? t("Role") : t("Class slot")].filter(Boolean).join(" · ");

/** The card's meta line, per status and path. */
export function applicationMeta(a: MyApplication, now: Date): string {
  const pay = a.pay != null ? payText(a.pay, a.payUnit) : null;
  const created = toDate(a.createdAt);
  const starts = toDate(a.startsOn);
  const applied = created ? (daysFrom(created, now) === 0 ? t("Applied today") : t("Applied {date}", { date: shortDate(created, now) })) : tx("Applied", "application");
  switch (a.status) {
    case "OFFERED":
      return a.path === "direct"
        ? [t("Direct offer"), pay, starts ? t("from {date}", { date: dayDate(starts) }) : null].filter(Boolean).join(" · ")
        : [t("Offer after your application"), pay].filter(Boolean).join(" · ");
    case "HIRED":
      return starts && daysFrom(starts, now) > 0 ? t("Hired · starts {date}", { date: dayDate(starts) }) : t("Hired · in My work");
    case "DECLINED":
      return t("{applied} · closed", { applied });
    default:
      return [applied, a.type === "class_slot" && starts ? dayDate(starts) : null, pay].filter(Boolean).join(" · ");
  }
}

/** The OFFERED card's note: the start, the classes a month, then the gym's own words. */
export function offerNote(a: MyApplication): string {
  const starts = toDate(a.startsOn);
  const month = classesAMonth(a.classesPerMonth);
  const parts = [starts ? t("Starts {date}.", { date: dayDate(starts) }) : null, month ? t("{sentence}.", { sentence: month }) : null, a.note?.trim() || null];
  return parts.filter(Boolean).join(" ");
}

/** Count of offers waiting (the My applications badge, the Overview OFFERED badge). */
export const offeredCount = (apps: readonly MyApplication[]): number => apps.filter((a) => a.status === "OFFERED").length;

/** The Accept dialog (apOffer) rows and body. */
export function acceptRows(a: MyApplication): [string, string][] {
  const starts = toDate(a.startsOn);
  const rows: [string, string][] = [[t("Gym"), a.businessName], [a.type === "role" ? t("Role") : t("Class slot"), a.title]];
  if (a.pay != null) rows.push([t("Pay"), payText(a.pay, a.payUnit)]);
  if (starts) rows.push([t("Starts"), fullDate(starts)]);
  const sched = classesAMonth(a.classesPerMonth);
  if (sched) rows.push([t("Schedule"), sched]);
  return rows.filter(([, v]) => !!v);
}
export const acceptBody = (gym: string): string => t("Pay is arranged between you and {gym}. Centium charges you nothing.", { gym: gym || t("the gym") });

/** The hired strip: "You're hired · Cedar Fitness, HIIT instructor". */
export const hiredStrip = (a: Pick<MyApplication, "businessName" | "title">): string => t("You're hired · {details}", { details: [a.businessName, a.title].filter(Boolean).join(t(", ")) });

/** The clash dialog (P-CA.5.5 copy): "HIIT instructor at Cedar Fitness clashes with 2 sessions you already have." */
export function clashBody(a: Pick<MyApplication, "businessName" | "title">, n: number): string {
  const what = a.title && a.businessName ? t("{title} at {gym}", { title: a.title, gym: a.businessName }) : a.title || a.businessName || t("This offer");
  return t("{what} clashes with {sessions} you already have.", { what, sessions: tn(n, "{n} session", "{n} sessions") });
}

/** A clash's time line: "Mon 7:00 to 8:00 AM" (one day) or both ends in full. */
export function clashTime(start: string, end: string): string {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return "";
  const day = weekdayShort(((s.getDay() + 6) % 7) + 1);
  if (dayStart(s) !== dayStart(e)) return t("{start} to {end}", { start: `${dayDate(s)} ${clockOf(s)}`, end: `${dayDate(e)} ${clockOf(e)}` });
  const a = clockOf(s);
  const b = clockOf(e);
  const sameHalf = a.slice(-2) === b.slice(-2);
  return `${day} ${t("{start} to {end}", { start: sameHalf ? a.slice(0, -3) : a, end: b })}`;
}

// ---------------------------------------------------------------------------
// P-MA.5.3 My work (W(), myWork)

/** "Role · starts Mon, Nov 2", "Role · since Mar 2026", "Class slot · Sat, Oct 24". */
export function sinceLine(w: Pick<WorkItem, "type" | "since">, now: Date): string {
  const d = toDate(w.since);
  if (w.type === "class_slot") return d ? t("Class slot · {date}", { date: dayDate(d) }) : t("Class slot");
  if (!d) return t("Role");
  return daysFrom(d, now) > 0 ? t("Role · starts {date}", { date: dayDate(d) }) : t("Role · since {date}", { date: monthYear(d) });
}

/** "In your Calendar · 3 sessions a week" (a slot: its day). */
export function calendarLine(w: Pick<WorkItem, "type" | "since" | "sessionsAWeek">): string {
  if (w.type === "class_slot") {
    const d = toDate(w.since);
    return d ? t("In your Calendar · {date}", { date: dayDate(d) }) : t("In your Calendar");
  }
  const n = w.sessionsAWeek;
  return t("In your Calendar · {sessions} a week", { sessions: tn(n, "{n} session", "{n} sessions") });
}

/** The class row: the tile (time + day) and its two lines. */
export function workClassRow(c: WorkClass, w: Pick<WorkItem, "type" | "since">): { time: { time: string; meridiem: string } | null; day: string | null; title: string; sub: string } {
  const slotDay = w.type === "class_slot" ? toDate(w.since) : null;
  const day = c.weekday != null ? weekdayShort(c.weekday).toUpperCase() : slotDay ? weekdayShort(((slotDay.getDay() + 6) % 7) + 1).toUpperCase() : null;
  const fallback = c.weekday != null ? (c.weekday >= 1 && c.weekday <= 7 ? t("Every {day}", { day: weekdayLong(c.weekday - 1) }) : t("Every")) : slotDay ? dayDate(slotDay) : "";
  return { time: clockSplit(clockOfTime(c.startTime)), day, title: c.title, sub: c.label?.trim() || fallback };
}

/** "$70 per class", or "–". */
export const workPay = (w: Pick<WorkItem, "pay" | "payUnit">): string => (w.pay != null ? payText(w.pay, w.payUnit) : "–");

/** The strip on My work after a hire: "You're hired · Cedar Fitness starts Mon, Nov 2". */
export function hiredWorkStrip(gym: string, startsOn: string | null, now: Date): string {
  const d = toDate(startsOn);
  return d && daysFrom(d, now) >= 0 ? t("You're hired · {gym} starts {date}", { gym, date: dayDate(d) }) : t("You're hired · {details}", { details: gym });
}

// ---------------------------------------------------------------------------
// P-MA.1 Opportunities card (ov.links)

/** "2 waiting · Hamra Strength Club, Cedar Fitness" / "None waiting". */
export function offersSub(apps: readonly MyApplication[]): string {
  const offered = apps.filter((a) => a.status === "OFFERED");
  if (!offered.length) return tx("None waiting", "offers");
  const names = [...new Set(offered.map((a) => a.businessName).filter(Boolean))];
  return [t("{n} waiting", { n: offered.length }), names.join(t(", ")) || null].filter(Boolean).join(" · ");
}

/** "6 roles and class slots" / "1 role or class slot" / "None near you right now". */
export const openingsSub = (n: number): string => (n === 0 ? t("None near you right now") : n === 1 ? t("1 role or class slot") : t("{n} roles and class slots", { n }));

/** "Hamra Strength Club · 2 classes a week", "2 gyms · 3 classes a week", the board's empty line when there's no work. */
export function workSub(work: readonly WorkItem[]): string {
  if (!work.length) return t("When a gym hires you, it shows here");
  const total = work.reduce((s, w) => s + (w.sessionsAWeek || 0), 0);
  const classes = total > 0 ? (total === 1 ? t("1 class a week") : t("{n} classes a week", { n: total })) : null;
  const gyms = new Set(work.map((w) => w.businessId || w.businessName)).size;
  const head = gyms === 1 ? work[0].businessName : tn(gyms, "{n} gym", "{n} gyms");
  return [head || null, classes ?? (work.length === 1 ? work[0].roleTitle : tn(work.length, "{n} role", "{n} roles"))].filter(Boolean).join(" · ");
}

// ---------------------------------------------------------------------------
// P-MA.5.4 Existing-team invite (etInvite, etInviteExpired)

/** Expired when the server says so, or the accept-by date has passed. */
export function inviteExpired(inv: Pick<ExistingTeamInvite, "expiresAt">, now: Date): boolean {
  const d = toDate(inv.expiresAt);
  return !!d && d.getTime() < now.getTime();
}

export const inviteTitle = (business: string): string => (business ? t("Join {business}'s team?", { business }) : t("Join this gym's team?"));
export const inviteBody = (business: string): string =>
  t("{business} added you as part of the team you already work with. You join free and they can name you as the instructor on their classes.", { business: business || t("This gym") });
export function inviteRows(inv: ExistingTeamInvite): [string, string][] {
  const sent = toDate(inv.sentAt);
  const by = toDate(inv.expiresAt);
  const rows: [string, string][] = [[t("Gym"), inv.businessName], [t("Hiring fee"), t("None")]];
  if (sent) rows.push([t("Invited"), longDate(sent)]);
  if (by) rows.push([t("Accept by"), longDate(by)]);
  return rows.filter(([, v]) => !!v);
}
export function expiredBody(inv: ExistingTeamInvite): string {
  const by = toDate(inv.expiresAt);
  const who = inv.businessName || t("The gym");
  return by
    ? t("{who}'s free window to add their existing team closed on {date}. You can still work with them through an opening or a direct offer.", { who, date: longDate(by) })
    : t("{who}'s free window to add their existing team has closed. You can still work with them through an opening or a direct offer.", { who });
}
export function expiredRows(inv: ExistingTeamInvite): [string, string][] {
  const by = toDate(inv.expiresAt);
  const rows: [string, string][] = [[t("Gym"), inv.businessName]];
  if (by) rows.push([t("Expired"), longDate(by)]);
  return rows.filter(([, v]) => !!v);
}
