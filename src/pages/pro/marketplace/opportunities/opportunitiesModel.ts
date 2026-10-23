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
  /** openings.schedule_label: the gym's chosen classes in words (opportunities returns no times). */
  scheduleLabel?: string | null;
  startsAt: string | null;
  weekdays: number[];
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

const WEEKDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_PLURAL = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];

/** ISO weekday (1 = Monday … 7 = Sunday) → "Mon". */
export const weekdayShort = (iso: number): string => WEEKDAY[(((Math.round(iso) - 1) % 7) + 7) % 7];

/** "Sun", "Tue and Thu", "Mon, Wed and Fri" (Monday first). */
export function dayList(days: readonly number[], plural = false): string {
  const names = [...new Set(days.filter((d) => d >= 1 && d <= 7))].sort((a, b) => a - b).map((d) => (plural ? WEEKDAY_PLURAL[d - 1] : WEEKDAY[d - 1]));
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// ---------------------------------------------------------------------------
// P-MA.5.1 Openings: filter (FG), count line, gym cards, class tickets

/** The board's filter groups (FG). The Type rows map to the opening type. */
export const TYPE_OPTION: Record<OpeningType, string> = { role: "Role · ongoing", class_slot: "Class slot · one-off" };
const DISTANCE_KM: Record<string, number> = { "Within 2 km": 2, "Within 5 km": 5, "Within 10 km": 10 };
export const OP_FILTER_GROUPS = [
  { heading: "Type", options: [TYPE_OPTION.role, TYPE_OPTION.class_slot] },
  { heading: "Specialty", options: ["Cycling", "HIIT", "Strength", "Boxing"] },
  { heading: "Distance", options: Object.keys(DISTANCE_KM) },
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
  if (n === 0) return tab === "gyms" ? "0 openings" : "0 class slots";
  const noun = tab === "gyms" ? (n === 1 ? "opening" : "openings") : n === 1 ? "class slot" : "class slots";
  return `${n} ${noun}${filtered ? "" : " near you"} · ${tab === "gyms" ? "sorted by distance" : "soonest first"}`;
}

/** "0.8 km", "12 km". */
export const kmText = (km: number): string => `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;

/** The gym card's line under the title: rating (with the star) and distance. */
export function ratingDistance(o: Pick<Opportunity, "businessRating" | "distanceKm">): { rating: string | null; distance: string | null } {
  return { rating: o.businessRating != null ? o.businessRating.toFixed(1) : null, distance: o.distanceKm != null ? kmText(o.distanceKm) : null };
}

/** "Role · ongoing" / "Class slot · one-off". */
export const typeText = (t: OpeningType): string => TYPE_OPTION[t];

/** "$80 per class · set by the gym" / "$70 per class · open to proposals". */
export function payLine(o: Pick<Opportunity, "pay" | "payUnit" | "allowPayProposals">): string {
  const how = o.allowPayProposals ? "open to proposals" : "set by the gym";
  return o.pay != null ? `${payText(o.pay, o.payUnit)} · ${how}` : how[0].toUpperCase() + how.slice(1);
}

const classesAMonth = (n: number | null) => (n != null && n > 0 ? `${n} ${n === 1 ? "class" : "classes"} a month` : null);

/**
 * "Sun 10:00 AM · 4 classes a month", "Tue and Thu 7:00 PM", a slot's "Sat,
 * Oct 24 · 9:00 AM"; opportunities() returns no times, so the gym's own
 * schedule_label stands in ("Spin 45 · Sun 10:00 AM · 4 classes a month");
 * null when the opening names neither.
 */
export function scheduleLine(o: Pick<Opportunity, "type" | "weekdays" | "startsAt" | "classesPerMonth" | "scheduleLabel">): string | null {
  const at = toDate(o.startsAt);
  if (!at && !o.weekdays.length && o.scheduleLabel) return [o.scheduleLabel, o.type === "role" ? classesAMonth(o.classesPerMonth) : null].filter(Boolean).join(" · ");
  if (o.type === "class_slot") return at ? `${dayDate(at)} · ${clockOf(at)}` : null;
  const days = dayList(o.weekdays);
  const when = [days, at ? clockOf(at) : null].filter(Boolean).join(" ");
  const parts = [when || null, classesAMonth(o.classesPerMonth)].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** "Posted today · 1 position", "Posted 2 days ago · 2 positions", "Posted Oct 2 · 1 position". */
export function postedLine(postedAt: string | null, positions: number, now: Date): string {
  const d = toDate(postedAt);
  const ago = d ? -daysFrom(d, now) : null;
  const when = ago == null ? null : ago <= 0 ? "Posted today" : ago === 1 ? "Posted yesterday" : ago < 7 ? `Posted ${ago} days ago` : `Posted ${shortDate(d!, now)}`;
  const n = Math.max(1, positions);
  return [when, `${n} ${n === 1 ? "position" : "positions"}`].filter(Boolean).join(" · ");
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
  const spots = o.capacity != null && o.capacity > 0 ? `${o.capacity} ${o.capacity === 1 ? "spot" : "spots"}` : null;
  return {
    time: at ? clockSplit(clockOf(at)) : null,
    dur: o.durationMin != null && o.durationMin > 0 ? `${o.durationMin} min` : null,
    eyebrow: o.specialty?.trim() || o.className?.trim() || null,
    title: o.title,
    place: [o.businessName, at ? dayDate(at) : null].filter(Boolean).join(" · "),
    spots: ["Class slot", spots, o.type === "class_slot" ? "one-off" : "ongoing"].filter(Boolean).join(" · "),
    pay: o.pay != null ? payMoney(o.pay) : null,
  };
}

// ---------------------------------------------------------------------------
// P-MA.5.2 Apply sheet

/** "Apply to Hamra Strength Club". */
export const applyTitle = (o: Pick<Opportunity, "businessName">): string => (o.businessName ? `Apply to ${o.businessName}` : "Apply");

/** The ticket's sub line: "Hamra Strength Club · Role". */
export const openingSub = (o: Pick<Opportunity, "businessName" | "type">): string => [o.businessName || null, o.type === "role" ? "Role" : "Class slot"].filter(Boolean).join(" · ");

/** The availability checkbox: "I'm available Sundays at 10:00 AM", "I'm available Tue and Thu at 7:00 PM", "I'm available Sat, Oct 24 at 9:00 AM". */
export function availabilityLabel(o: Pick<Opportunity, "type" | "weekdays" | "startsAt">): string {
  const at = toDate(o.startsAt);
  const time = at ? ` at ${clockOf(at)}` : "";
  if (o.type === "class_slot") return at ? `I'm available ${dayDate(at)}${time}` : "I'm available for this class";
  const days = dayList(o.weekdays, o.weekdays.length === 1);
  if (days) return `I'm available ${days}${time}`;
  return at ? `I'm available from ${dayDate(at)}${time}` : "I'm available for this schedule";
}

/** The proposal hint: "This gym takes proposals. Their posted pay is $70 per class." */
export const proposalHint = (o: Pick<Opportunity, "pay" | "payUnit">): string =>
  o.pay != null ? `This gym takes proposals. Their posted pay is ${payText(o.pay, o.payUnit)}.` : "This gym takes proposals.";

/** The unit after the rate field: "per class", "a month", "for the slot". */
export const unitWord = (u: PayUnit): string => (u === "per_class" ? "per class" : u === "per_month" ? "a month" : "for the slot");

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
export const roleLine = (a: Pick<MyApplication, "title" | "type">): string => [a.title || null, a.type === "role" ? "Role" : "Class slot"].filter(Boolean).join(" · ");

/** The card's meta line, per status and path. */
export function applicationMeta(a: MyApplication, now: Date): string {
  const pay = a.pay != null ? payText(a.pay, a.payUnit) : null;
  const created = toDate(a.createdAt);
  const starts = toDate(a.startsOn);
  const applied = created ? (daysFrom(created, now) === 0 ? "Applied today" : `Applied ${shortDate(created, now)}`) : "Applied";
  switch (a.status) {
    case "OFFERED":
      return a.path === "direct"
        ? ["Direct offer", pay, starts ? `from ${dayDate(starts)}` : null].filter(Boolean).join(" · ")
        : ["Offer after your application", pay].filter(Boolean).join(" · ");
    case "HIRED":
      return starts && daysFrom(starts, now) > 0 ? `Hired · starts ${dayDate(starts)}` : "Hired · in My work";
    case "DECLINED":
      return `${applied} · closed`;
    default:
      return [applied, a.type === "class_slot" && starts ? dayDate(starts) : null, pay].filter(Boolean).join(" · ");
  }
}

/** The OFFERED card's note: the start, the classes a month, then the gym's own words. */
export function offerNote(a: MyApplication): string {
  const starts = toDate(a.startsOn);
  const parts = [starts ? `Starts ${dayDate(starts)}.` : null, classesAMonth(a.classesPerMonth) ? `${classesAMonth(a.classesPerMonth)}.` : null, a.note?.trim() || null];
  return parts.filter(Boolean).join(" ");
}

/** Count of offers waiting (the My applications badge, the Overview OFFERED badge). */
export const offeredCount = (apps: readonly MyApplication[]): number => apps.filter((a) => a.status === "OFFERED").length;

/** The Accept dialog (apOffer) rows and body. */
export function acceptRows(a: MyApplication): [string, string][] {
  const starts = toDate(a.startsOn);
  const rows: [string, string][] = [["Gym", a.businessName], [a.type === "role" ? "Role" : "Class slot", a.title]];
  if (a.pay != null) rows.push(["Pay", payText(a.pay, a.payUnit)]);
  if (starts) rows.push(["Starts", fullDate(starts)]);
  const sched = classesAMonth(a.classesPerMonth);
  if (sched) rows.push(["Schedule", sched]);
  return rows.filter(([, v]) => !!v);
}
export const acceptBody = (gym: string): string => `Pay is arranged between you and ${gym || "the gym"}. Centium charges you nothing.`;

/** The hired strip: "You're hired · Cedar Fitness, HIIT instructor". */
export const hiredStrip = (a: Pick<MyApplication, "businessName" | "title">): string => `You're hired · ${[a.businessName, a.title].filter(Boolean).join(", ")}`;

/** The clash dialog (P-CA.5.5 copy): "HIIT instructor at Cedar Fitness clashes with 2 sessions you already have." */
export function clashBody(a: Pick<MyApplication, "businessName" | "title">, n: number): string {
  const what = [a.title, a.businessName].filter(Boolean).join(" at ") || "This offer";
  return `${what} clashes with ${n === 1 ? "1 session" : `${n} sessions`} you already have.`;
}

/** A clash's time line: "Mon 7:00 to 8:00 AM" (one day) or both ends in full. */
export function clashTime(start: string, end: string): string {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return "";
  const day = weekdayShort(((s.getDay() + 6) % 7) + 1);
  if (dayStart(s) !== dayStart(e)) return `${dayDate(s)} ${clockOf(s)} to ${dayDate(e)} ${clockOf(e)}`;
  const a = clockOf(s);
  const b = clockOf(e);
  const sameHalf = a.slice(-2) === b.slice(-2);
  return `${day} ${sameHalf ? a.slice(0, -3) : a} to ${b}`;
}

// ---------------------------------------------------------------------------
// P-MA.5.3 My work (W(), myWork)

/** "Role · starts Mon, Nov 2", "Role · since Mar 2026", "Class slot · Sat, Oct 24". */
export function sinceLine(w: Pick<WorkItem, "type" | "since">, now: Date): string {
  const d = toDate(w.since);
  if (w.type === "class_slot") return d ? `Class slot · ${dayDate(d)}` : "Class slot";
  if (!d) return "Role";
  return daysFrom(d, now) > 0 ? `Role · starts ${dayDate(d)}` : `Role · since ${monthYear(d)}`;
}

/** "In your Calendar · 3 sessions a week" (a slot: its day). */
export function calendarLine(w: Pick<WorkItem, "type" | "since" | "sessionsAWeek">): string {
  if (w.type === "class_slot") {
    const d = toDate(w.since);
    return d ? `In your Calendar · ${dayDate(d)}` : "In your Calendar";
  }
  const n = w.sessionsAWeek;
  return `In your Calendar · ${n === 1 ? "1 session" : `${n} sessions`} a week`;
}

/** The class row: the tile (time + day) and its two lines. */
export function workClassRow(c: WorkClass, w: Pick<WorkItem, "type" | "since">): { time: { time: string; meridiem: string } | null; day: string | null; title: string; sub: string } {
  const slotDay = w.type === "class_slot" ? toDate(w.since) : null;
  const day = c.weekday != null ? weekdayShort(c.weekday).toUpperCase() : slotDay ? weekdayShort(((slotDay.getDay() + 6) % 7) + 1).toUpperCase() : null;
  const fallback = c.weekday != null ? `Every ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][c.weekday - 1] ?? ""}`.trim() : slotDay ? dayDate(slotDay) : "";
  return { time: clockSplit(clockOfTime(c.startTime)), day, title: c.title, sub: c.label?.trim() || fallback };
}

/** "$70 per class", or "–". */
export const workPay = (w: Pick<WorkItem, "pay" | "payUnit">): string => (w.pay != null ? payText(w.pay, w.payUnit) : "–");

/** The strip on My work after a hire: "You're hired · Cedar Fitness starts Mon, Nov 2". */
export function hiredWorkStrip(gym: string, startsOn: string | null, now: Date): string {
  const d = toDate(startsOn);
  return d && daysFrom(d, now) >= 0 ? `You're hired · ${gym} starts ${dayDate(d)}` : `You're hired · ${gym}`;
}

// ---------------------------------------------------------------------------
// P-MA.1 Opportunities card (ov.links)

/** "2 waiting · Hamra Strength Club, Cedar Fitness" / "None waiting". */
export function offersSub(apps: readonly MyApplication[]): string {
  const offered = apps.filter((a) => a.status === "OFFERED");
  if (!offered.length) return "None waiting";
  const names = [...new Set(offered.map((a) => a.businessName).filter(Boolean))];
  return [`${offered.length} waiting`, names.join(", ") || null].filter(Boolean).join(" · ");
}

/** "6 roles and class slots" / "1 role or class slot" / "None near you right now". */
export const openingsSub = (n: number): string => (n === 0 ? "None near you right now" : n === 1 ? "1 role or class slot" : `${n} roles and class slots`);

/** "Hamra Strength Club · 2 classes a week", "2 gyms · 3 classes a week", the board's empty line when there's no work. */
export function workSub(work: readonly WorkItem[]): string {
  if (!work.length) return "When a gym hires you, it shows here";
  const total = work.reduce((s, w) => s + (w.sessionsAWeek || 0), 0);
  const classes = total > 0 ? `${total} ${total === 1 ? "class" : "classes"} a week` : null;
  const gyms = new Set(work.map((w) => w.businessId || w.businessName)).size;
  const head = gyms === 1 ? work[0].businessName : `${gyms} gyms`;
  return [head || null, classes ?? (work.length === 1 ? work[0].roleTitle : `${work.length} roles`)].filter(Boolean).join(" · ");
}

// ---------------------------------------------------------------------------
// P-MA.5.4 Existing-team invite (etInvite, etInviteExpired)

/** Expired when the server says so, or the accept-by date has passed. */
export function inviteExpired(inv: Pick<ExistingTeamInvite, "expiresAt">, now: Date): boolean {
  const d = toDate(inv.expiresAt);
  return !!d && d.getTime() < now.getTime();
}

export const inviteTitle = (business: string): string => `Join ${business || "this gym"}'s team?`;
export const inviteBody = (business: string): string =>
  `${business || "This gym"} added you as part of the team you already work with. You join free and they can name you as the instructor on their classes.`;
export function inviteRows(inv: ExistingTeamInvite): [string, string][] {
  const sent = toDate(inv.sentAt);
  const by = toDate(inv.expiresAt);
  const rows: [string, string][] = [["Gym", inv.businessName], ["Hiring fee", "None"]];
  if (sent) rows.push(["Invited", longDate(sent)]);
  if (by) rows.push(["Accept by", longDate(by)]);
  return rows.filter(([, v]) => !!v);
}
export function expiredBody(inv: ExistingTeamInvite): string {
  const by = toDate(inv.expiresAt);
  const who = inv.businessName || "The gym";
  return `${who}'s free window to add their existing team ${by ? `closed on ${longDate(by)}` : "has closed"}. You can still work with them through an opening or a direct offer.`;
}
export function expiredRows(inv: ExistingTeamInvite): [string, string][] {
  const by = toDate(inv.expiresAt);
  const rows: [string, string][] = [["Gym", inv.businessName]];
  if (by) rows.push(["Expired", longDate(by)]);
  return rows.filter(([, v]) => !!v);
}
