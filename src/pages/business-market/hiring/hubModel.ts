// Market + Share 3.0 · W4 · the B-MA.8 business Hiring pages' pure rules
// (Business Hiring Screens script: `O`, `hubCount`, `P`, `R`, `dlg`, `sheet`),
// with D-02 / D-03 applied: month-first dates ("Sat, Oct 24", "Sep 14, 2026"),
// 12-hour times ("10:00 AM"), Monday-first week days. No Supabase import, so
// node --test loads it (hubModel.test.ts).

import { clock12, rangeClock12, time12 } from "../../../utils/time12";
import { getLanguage, t } from "../../../i18n/core";
import { appLocale } from "../../../i18n/format";
import { feeMoney, payMoney, payText, minimumSentence, type OpeningType, type PayUnit } from "../../../services/hiring/fee";
import { hiredText, ratingLine } from "../../../components/market/peopleModel";
import type { Application, Opening, OpeningStatus, ProCard } from "../../../services/hiring/model";
import type { BusinessClassRow } from "../../../services/business-classes/types";

/** Business Hiring Screens `tag()` labels (hiringParts colours them). */
export type HiringTag = "ROLE" | "CLASS SLOT" | "FILLED" | "CLOSED" | "NEW" | "APPLIED" | "SHORTLISTED" | "OFFERED" | "HIRED" | "DECLINED" | "DUE" | "PAID";

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---------------------------------------------------------------------------
// dates

/** A Date from "YYYY-MM-DD" (local midnight) or an ISO timestamp; null when unreadable. */
export function dateOf(v: string | null | undefined): Date | null {
  if (!v) return null;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  const d = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ISO weekday of a date, 1 = Monday … 7 = Sunday. */
export const isoDay = (d: Date): number => ((d.getDay() + 6) % 7) + 1;

/** "YYYY-MM-DD" of a local date. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "Oct 3"; the year is added when it isn't `now`'s ("Oct 3, 2025"). */
export function monthDay(d: Date, now: Date = new Date()): string {
  const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base}, ${d.getFullYear()}`;
}

/** "Sep 14, 2026" (the board's "14 Sep 2026"). */
export const monthDayYear = (d: Date): string => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

/** "Sat, Oct 24" (the board's "Sat 24 Oct"). */
export const weekdayMonthDay = (d: Date): string => `${DAY_SHORT[isoDay(d) - 1]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;

/** "Sun, Nov 1, 2026" (the board's "Sun 1 Nov 2026"). */
export const weekdayMonthDayYear = (d: Date): string => `${weekdayMonthDay(d)}, ${d.getFullYear()}`;

/** "Mon to Fri" for a run of three or more days in a row; else "Sun", "Mon and Wed", "Mon, Wed and Fri". */
export function daysLabel(weekdays: number[]): string {
  const ws = [...new Set(weekdays)].filter((w) => w >= 1 && w <= 7).sort((a, b) => a - b);
  if (!ws.length) return "";
  const run = ws.length >= 3 && ws.every((w, i) => i === 0 || w === ws[i - 1] + 1);
  if (run) return `${DAY_SHORT[ws[0] - 1]} to ${DAY_SHORT[ws[ws.length - 1] - 1]}`;
  const names = ws.map((w) => DAY_SHORT[w - 1]);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// ---------------------------------------------------------------------------
// the hub (B-MA.8)

export type HubTab = OpeningStatus;
export const HUB_TABS: { key: HubTab; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "filled", label: "Filled" },
  { key: "closed", label: "Closed" },
];

/** `?tab=filled|closed`; anything else is Open. */
export const tabOf = (v: string | null): HubTab => (v === "filled" || v === "closed" ? v : "open");

/** The caps count line: "3 open", "2 filled", "1 closed", "No openings". */
export function countLine(tab: HubTab, n: number): string {
  return n > 0 ? `${n} ${tab}` : "No openings";
}

export const typeLabel = (t: OpeningType): string => (t === "class_slot" ? "Class slot · one-off" : "Role · ongoing");

/** The card's tag: FILLED / CLOSED by status, else ROLE / CLASS SLOT by type. */
export function openingTag(o: Pick<Opening, "status" | "type">): HiringTag {
  if (o.status === "filled") return "FILLED";
  if (o.status === "closed") return "CLOSED";
  return o.type === "class_slot" ? "CLASS SLOT" : "ROLE";
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The schedule line: role "Spin 45 · Sun 10:00 AM · 4 classes a month";
 * class slot "Spin 45 · Sat, Oct 24, 9:00 AM · one-off".
 */
export function scheduleLine(o: Pick<Opening, "type" | "className" | "startsAt" | "weekdays" | "classesPerMonth">): string {
  const parts: string[] = [];
  if (o.className) parts.push(o.className);
  const at = dateOf(o.startsAt);
  if (o.type === "class_slot") {
    if (at) parts.push(`${weekdayMonthDay(at)}, ${clock12(at)}`);
    parts.push("one-off");
  } else {
    const days = o.weekdays.length ? daysLabel(o.weekdays) : at ? DAY_SHORT[isoDay(at) - 1] : "";
    const when = [days, at ? clock12(at) : ""].filter(Boolean).join(" ");
    if (when) parts.push(when);
    if (o.classesPerMonth && o.classesPerMonth > 0) parts.push(`${plural(o.classesPerMonth, "class", "classes")} a month`);
  }
  return parts.join(" · ");
}

/** The pay line: "$80 per class · 1 position" while open; the pay alone once filled or closed. */
export function payLine(o: Pick<Opening, "pay" | "payUnit" | "positions" | "status">): string {
  const parts: string[] = [];
  if (o.pay != null && o.pay > 0) parts.push(payText(o.pay, o.payUnit));
  if (o.status === "open") parts.push(plural(Math.max(1, o.positions), "position"));
  return parts.join(" · ");
}

export type FootTone = "pdark" | "faint" | "teal";

/** The card footer and its ink (`O().foot` / `footInk`). */
export function footLine(
  o: Pick<Opening, "status" | "applicantCount" | "newApplicantCount" | "hiredName" | "hiredAt" | "hiredPath" | "closedAt">,
  justPosted: boolean,
  now: Date = new Date(),
): { text: string; tone: FootTone } {
  if (o.status === "filled") {
    const at = dateOf(o.hiredAt);
    const parts = [o.hiredName ? `Hired ${o.hiredName}` : "Hired"];
    if (at) parts.push(monthDayYear(at));
    if (o.hiredPath === "direct") parts.push("direct offer");
    return { text: parts.join(" · "), tone: "teal" };
  }
  if (o.status === "closed") {
    const at = dateOf(o.closedAt);
    return { text: `${at ? `Closed ${monthDay(at, now)}` : "Closed"} · no hire`, tone: "faint" };
  }
  if (o.applicantCount <= 0) return justPosted ? { text: "Posted just now · no applicants yet", tone: "pdark" } : { text: "No applicants yet", tone: "faint" };
  const n = plural(o.applicantCount, "applicant");
  return { text: o.newApplicantCount > 0 ? `${n} · ${o.newApplicantCount} new` : n, tone: "pdark" };
}

/** The existing-team banner's stub: "24" / "days left", "1" / "day left", "Last" / "day". */
export function bannerStub(daysLeft: number): { n: string; unit: string } {
  if (daysLeft <= 0) return { n: "Last", unit: "day" };
  return { n: String(daysLeft), unit: daysLeft === 1 ? "day left" : "days left" };
}

/** "Team · 3"; "Team" alone while the count is pending or unknown. */
export const teamButtonText = (n: number | null): string => (n == null ? "Team" : `Team · ${n}`);

// ---------------------------------------------------------------------------
// people (B-MA.8.2 applicants, B-MA.8.6 results)

/**
 * "4.8 · 38 reviews · on your Team" / "4.6 · 12 reviews · 3.1 km" / "New ·
 * 4.0 km". Applicants (B-MA.8.2) name the Team; search results (B-MA.8.6)
 * always show the distance (`teamFirst` false).
 */
export function personRating(p: Pick<ProCard, "rating" | "reviewCount" | "onTeam" | "distanceKm">, teamFirst = true): string {
  const extra = teamFirst && p.onTeam ? "on your Team" : p.distanceKm != null && Number.isFinite(p.distanceKm) ? `${p.distanceKm.toFixed(1)} km` : null;
  return ratingLine(p.rating, p.reviewCount, extra);
}

/** The business wording of the hired line: "Hired via Centium · 2 roles" (teal) or "New to Centium" (faint). */
export function hiredLine(roles: number): { text: string; hired: boolean } {
  return roles > 0 ? { text: hiredText(roles), hired: true } : { text: "New to Centium", hired: false };
}

/** The applicant's tag: an unseen application reads NEW. */
export function applicantTag(a: Pick<Application, "status" | "isNew">): HiringTag {
  if (a.status === "APPLIED") return a.isNew ? "NEW" : "APPLIED";
  return a.status;
}

/** "Rana" from "Rana Khoury". */
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

/** "Hired · starts Sun, Nov 1 · on your Team". */
export function hiredState(startsOn: string | null): string {
  const d = dateOf(startsOn);
  return d ? `Hired · starts ${weekdayMonthDay(d)} · on your Team` : "Hired · on your Team";
}

// ---------------------------------------------------------------------------
// offer and hire (B-MA.8.3, B-MA.8.6)

/** The dialog's Pay row: "$80 per class · 4 a month", "$900 a month", "$60 for the slot". */
export function offerPayText(type: OpeningType, pay: number, unit: PayUnit, classesPerMonth: number | null): string {
  const price = payMoney(pay);
  if (type === "class_slot") return t("{price} for the slot", { price });
  if (unit === "per_month") return t("{price} a month", { price });
  return classesPerMonth && classesPerMonth > 0 ? t("{price} per class · {n} a month", { price, n: classesPerMonth }) : t("{price} per class", { price });
}

/**
 * The start date an opening's offer carries: its first session when that is
 * today or later; else the next listed weekday after today; else today.
 */
export function offerStartDate(o: Pick<Opening, "startsAt" | "weekdays">, today: Date = new Date()): string {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const at = dateOf(o.startsAt);
  if (at) {
    const day = new Date(at.getFullYear(), at.getMonth(), at.getDate());
    if (day >= t) return dayKey(day);
  }
  const days = new Set(o.weekdays.length ? o.weekdays : at ? [isoDay(at)] : []);
  if (days.size) {
    for (let i = 1; i <= 7; i++) {
      const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i);
      if (days.has(isoDay(d))) return dayKey(d);
    }
  }
  return dayKey(t);
}

/** "Sun, Nov 1, 2026" for the Starts row; "" when unreadable. */
export function startsText(day: string | null): string {
  const d = dateOf(day);
  if (!d) return "";
  // Arabic: the same parts in the app's locale (Arabic day and month names).
  return getLanguage() === "ar" ? d.toLocaleDateString(appLocale(), { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : weekdayMonthDayYear(d);
}

export const offerTitle = (name: string, direct: boolean): string => (direct ? t("Send this offer?") : t("Offer {name} the role?", { name: firstName(name) }));

/** We store no pronouns: the board's "when she does" reads "when they do". */
export const offerBody = (name: string): string => t("{name} accepts in Opportunities. The hire is confirmed when they do.", { name: firstName(name) });

/**
 * The note under the fee ticket: the minimum sentence when the minimum
 * applied; the charge sentence; then the rehire sentence for someone already
 * on the Team, or (a direct offer) "Nothing recurring."
 */
export function feeNote(o: { type: OpeningType; minimum: number; minimumApplied: boolean; onTeam: boolean; name: string; direct: boolean }): string {
  const parts: string[] = [];
  if (o.minimumApplied) parts.push(minimumSentence(o));
  parts.push(t("Charged once when the hire is confirmed and added to your Centium bill."));
  if (o.onTeam) parts.push(t("{name} is already on your Team: a new opening is a new hire.", { name: firstName(o.name) }));
  else if (o.direct) parts.push(t("Nothing recurring."));
  return parts.join(" ");
}

export const sentStrip = (name: string): string => `Offer sent to ${name}. ${firstName(name)} accepts in Opportunities.`;

export const hiredStrip = (fee: number): string => `Hired · one-time fee ${feeMoney(fee)} added to your Centium bill`;

/** A busy time returned with an offer (start / end only, no titles): "Sun, Nov 1, 10:00 to 11:00 AM". */
export function busyText(b: { start: string; end: string }): string {
  const s = dateOf(b.start);
  return s ? `${weekdayMonthDay(s)}, ${rangeClock12(b.start, b.end)}` : "";
}

// ---------------------------------------------------------------------------
// the opening form (B-MA.8.1 Post opening, B-MA.8.6 Offer to …)

export type FormPayUnit = "per_class" | "per_month";

export interface OpeningFormState {
  type: OpeningType;
  title: string;
  seriesIds: string[];
  sessionId: string | null;
  pay: string;
  payUnit: FormPayUnit;
  positions: string;
  classesPerMonth: string;
  requirements: string[];
  allowProposals: boolean;
  /** The direct offer's Starts (a role); a class slot starts on its session. */
  startsOn: string | null;
}

export const emptyForm = (): OpeningFormState => ({
  type: "role",
  title: "",
  seriesIds: [],
  sessionId: null,
  pay: "",
  payUnit: "per_class",
  positions: "1",
  classesPerMonth: "",
  requirements: [],
  allowProposals: false,
  startsOn: null,
});

/** The board's Requirements chips (B-MA.8.1 `postRole` / `postSlot`), offered as the choices. */
export const REQUIREMENTS: Record<OpeningType, string[]> = {
  role: ["Cycling certificate", "First aid", "2 years"],
  class_slot: ["Cycling certificate", "First aid"],
};

export const PROPOSALS_HINT = { off: "Off: applicants see your pay as fixed", on: "On: applicants can propose their own rate" } as const;

const money = (s: string): number | null => {
  const t = s.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 && n <= 100000 ? n : null;
};
const count = (s: string, max: number): number | null => {
  const t = s.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= max ? n : null;
};

export interface ParsedForm {
  type: OpeningType;
  title: string;
  seriesIds: string[];
  sessionId: string | null;
  pay: number;
  payUnit: PayUnit;
  positions: number;
  classesPerMonth: number | null;
  requirements: string[];
  allowProposals: boolean;
  startsOn: string | null;
}

/**
 * The form when it can be sent, else null (the CTA stays at 0.4). A role
 * needs a title, the pay and, paid per class, the classes a month; a class
 * slot needs its class and the pay. Posting needs positions; a direct offer
 * needs a start date for a role.
 */
export function parseForm(f: OpeningFormState, mode: "post" | "offer", slotTitle: string | null): ParsedForm | null {
  const pay = money(f.pay);
  if (pay == null) return null;
  const positions = mode === "post" ? count(f.positions, 50) : 1;
  if (positions == null) return null;
  if (f.type === "class_slot") {
    if (!f.sessionId || !slotTitle) return null;
    return { type: "class_slot", title: slotTitle, seriesIds: [], sessionId: f.sessionId, pay, payUnit: "per_slot", positions, classesPerMonth: null, requirements: f.requirements, allowProposals: f.allowProposals, startsOn: null };
  }
  const title = f.title.trim();
  if (!title || title.length > 80) return null;
  const cpmText = f.classesPerMonth.trim();
  const cpm = cpmText ? count(cpmText, 100) : null;
  if (cpmText && cpm == null) return null;
  if (f.payUnit === "per_class" && cpm == null) return null;
  if (mode === "offer" && !f.startsOn) return null;
  return { type: "role", title, seriesIds: f.seriesIds, sessionId: null, pay, payUnit: f.payUnit, positions, classesPerMonth: cpm, requirements: f.requirements, allowProposals: f.allowProposals, startsOn: f.startsOn };
}

// ---------------------------------------------------------------------------
// the business's live classes (read-only, services/business-classes)

export interface SeriesOption {
  id: string;
  label: string;
  title: string;
  /** Sessions a week (the listed weekdays). */
  perWeek: number;
}

const live = (c: BusinessClassRow, today: string) => !c.cancelledAt && c.date >= today;

/** The Role "Classes" chooser: one row per live repeating series, "Spin 45 · Sun 10:00 AM". */
export function seriesOptions(classes: BusinessClassRow[], today: string): SeriesOption[] {
  const by = new Map<string, { title: string; days: Set<number>; time: string }>();
  for (const c of classes) {
    if (!c.seriesId || !live(c, today)) continue;
    const d = dateOf(c.date);
    if (!d) continue;
    const s = by.get(c.seriesId) ?? { title: c.title, days: new Set<number>(), time: c.startTime };
    s.days.add(isoDay(d));
    by.set(c.seriesId, s);
  }
  return [...by.entries()]
    .map(([id, s]) => ({ id, title: s.title, perWeek: s.days.size, label: `${s.title} · ${daysLabel([...s.days])} ${time12(s.time)}` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export interface SessionOption {
  id: string;
  label: string;
  /** "Saturday Spin 45 cover": a class slot's opening title (the slot form has no title field). */
  slotTitle: string;
  date: string;
}

/** The Class slot "Linked class": the next live sessions, "Spin 45 · Sat, Oct 24, 9:00 AM". */
export function sessionOptions(classes: BusinessClassRow[], today: string, nowTime = "00:00", limit = 40): SessionOption[] {
  return classes
    .filter((c) => live(c, today) && !(c.date === today && c.startTime.slice(0, 5) <= nowTime))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, limit)
    .flatMap((c) => {
      const d = dateOf(c.date);
      if (!d) return [];
      return [{ id: c.id, date: c.date, label: `${c.title} · ${weekdayMonthDay(d)}, ${time12(c.startTime)}`, slotTitle: `${DAY_LONG[isoDay(d) - 1]} ${c.title} cover` }];
    });
}

/**
 * openings.schedule_label: the chosen classes in words, as the form lists
 * them ("Spin 45 · Sun 10:00 AM and HIIT 30 · Mon 7:00 AM"; a slot: its
 * session). A professional can't read the gym's class series, so this is
 * what the opportunities board shows of the schedule. null with none chosen.
 */
export function scheduleLabelOf(p: Pick<ParsedForm, "type" | "seriesIds" | "sessionId">, series: readonly Pick<SeriesOption, "id" | "label">[], sessions: readonly Pick<SessionOption, "id" | "label">[]): string | null {
  const labels = p.type === "class_slot" ? sessions.filter((x) => x.id === p.sessionId).map((x) => x.label) : series.filter((x) => p.seriesIds.includes(x.id)).map((x) => x.label);
  return labels.length ? labels.join(" and ").slice(0, 200) : null;
}

/**
 * The edit sheet's starting form (B-MA.8.1 reused for Edit, Database #38
 * edit_opening): the opening's own values. The type is shown but locked (the
 * server can't change it). A per-slot pay reads as the slot's pay; any other
 * unit as the role's.
 */
export function formOfOpening(o: Pick<Opening, "type" | "title" | "classSeriesIds" | "classSessionId" | "pay" | "payUnit" | "positions" | "classesPerMonth" | "requirements" | "allowPayProposals">): OpeningFormState {
  const amount = o.pay != null && o.pay > 0 ? (Number.isInteger(o.pay) ? String(o.pay) : o.pay.toFixed(2)) : "";
  return {
    type: o.type,
    title: o.type === "role" ? o.title : "",
    seriesIds: [...o.classSeriesIds],
    sessionId: o.classSessionId,
    pay: amount,
    payUnit: o.payUnit === "per_month" ? "per_month" : "per_class",
    positions: String(Math.max(1, o.positions)),
    classesPerMonth: o.classesPerMonth != null ? String(o.classesPerMonth) : "",
    requirements: [...o.requirements],
    allowProposals: o.allowPayProposals,
    startsOn: null,
  };
}

/**
 * The opening menu's Delete dialog (Database #38 delete_opening; ours, the
 * board draws the menu row only). delete_opening refuses once somebody has
 * applied (ATXH26: their applications would go with it), so an opening with
 * applicants offers Pause instead (set_opening_status 'closed', reopenable).
 */
export function deleteDialogOf(o: Pick<Opening, "title" | "applicantCount">): { title: string; body: string; action: string; pauseInstead: boolean } {
  if (o.applicantCount > 0) {
    return {
      title: `Pause ${o.title} instead?`,
      body: `${plural(o.applicantCount, "person has", "people have")} applied, so it can't be deleted. Pausing closes it and keeps their applications. You can reopen it later.`,
      action: "Pause",
      pauseInstead: true,
    };
  }
  return { title: `Delete ${o.title}?`, body: "It comes off Hiring and the opportunities board. This can't be undone.", action: "Delete", pauseInstead: false };
}

/** Classes a month suggested from the chosen series (sessions a week × 4), as the board's 1 weekly class → 4. */
export const suggestedPerMonth = (perWeek: number): string => (perWeek > 0 ? String(perWeek * 4) : "");
