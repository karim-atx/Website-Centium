// Market + Share 3.0 · W4-B · pure rules for B-MA.8.4 Team, B-MA.8.5 Hiring
// fees, B-MA.8.8 Add your existing team, the B-MA.8.7 employee-invite guard
// and the B-MA.1 Gym card's Hiring row. No Supabase import: node:test loads
// it (teamModel.test.ts).
//
// Dates are month first ("Oct 18", "Mar 2, 2026"; D-02), times 12-hour
// (D-03, utils/time12), ISO weekdays 1 = Monday … 7 = Sunday (model.ts).

import { formatShortDate } from "../../../utils/date";
import { t } from "../../../i18n/core";
import { appLocale } from "../../../i18n/format";
import { clockParts, minutesOfDay } from "../../../utils/time12";
import { type ProfessionalType, type TeamClass, type TeamHire, type TeamMember } from "../../../services/hiring/model";

// ---------------------------------------------------------------------------
// dates

/** A Date from a bare "YYYY-MM-DD" (local day, never shifted) or a timestamp. */
export function parseDay(v: string | null | undefined): Date | null {
  if (!v) return null;
  const bare = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  const d = bare ? new Date(Number(bare[1]), Number(bare[2]) - 1, Number(bare[3])) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Oct 18, 2026" (always with the year). */
export function fullDate(v: string | null | undefined): string {
  const d = parseDay(v);
  return d ? formatShortDate(d, { month: "short", day: "numeric", year: "numeric" }, appLocale("en-US")) : "";
}

/** "Oct 18" in the current year, "Oct 18, 2025" otherwise. */
export function shortDate(v: string | null | undefined, now: Date = new Date()): string {
  const d = parseDay(v);
  if (!d) return "";
  return formatShortDate(d, { month: "short", day: "numeric", ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }) });
}

// ---------------------------------------------------------------------------
// B-MA.8.4 Team

const byHired = (a: TeamHire, b: TeamHire) => (parseDay(a.hiredAt)?.getTime() ?? 0) - (parseDay(b.hiredAt)?.getTime() ?? 0);

/**
 * The member card's hire line (the board's `M().hired`): "Hired via Centium ·
 * Mar 2, 2026", with "· rehired Oct 18" for the latest of several hires and
 * "· class slot" when the latest hire is a class slot. null with no dated hire
 * (an existing-team member shows "Free · existing team" instead).
 */
export function hireLine(hires: TeamHire[], now: Date = new Date()): string | null {
  const dated = hires.filter((h) => parseDay(h.hiredAt)).sort(byHired);
  if (!dated.length) return null;
  const first = dated[0];
  const last = dated[dated.length - 1];
  let line = `Hired via Centium · ${fullDate(first.hiredAt)}`;
  if (dated.length > 1) line += ` · rehired ${shortDate(last.hiredAt, now)}`;
  if (last.type === "class_slot") line += " · class slot";
  return line;
}

/** The B-MA.8.8 label an existing-team member carries on Team. */
export const EXISTING_TEAM_LABEL = "Free · existing team";

const DAY_CAPS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * The class row's time tile (the board's 52-wide tile: time 13 / 800, day
 * 9.5 / 700). 12-hour (D-03): the time without its meridiem on top ("6:30"),
 * the day and the meridiem under it ("FRI · PM"), as a 24-hour "18:30" would
 * not fit "6:30 PM" in the drawn 52.
 */
export function classTile(c: Pick<TeamClass, "weekday" | "startTime">): { time: string; day: string } {
  const mins = minutesOfDay(c.startTime);
  const p = mins == null ? null : clockParts(mins);
  const day = c.weekday != null && c.weekday >= 1 && c.weekday <= 7 ? DAY_CAPS[c.weekday - 1] : "";
  return {
    time: p ? `${p.hour}:${String(p.minute).padStart(2, "0")}` : "",
    day: [day, p?.meridiem ?? ""].filter(Boolean).join(" · "),
  };
}

/** The class row's second line: the reader's own label, else "Every Friday". */
export function classLine(c: Pick<TeamClass, "weekday" | "label">): string {
  if (c.label) return c.label;
  return c.weekday != null && c.weekday >= 1 && c.weekday <= 7 ? `Every ${DAY_NAMES[c.weekday - 1]}` : "";
}

/** "Sami" from "Sami Tannous" (the remove dialog's title). */
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] || name.trim();

/**
 * The first remove dialog's body (the board's teamRemove1: "Boxing Basics will
 * show Instructor not listed to clients until you name someone else."), over
 * the member's distinct class titles. null when they teach none.
 */
export function removeSentence(classes: Pick<TeamClass, "title">[]): string | null {
  const titles = [...new Set(classes.map((c) => c.title.trim()).filter(Boolean))];
  if (!titles.length) return null;
  const list = titles.length === 1 ? titles[0] : `${titles.slice(0, -1).join(", ")} and ${titles[titles.length - 1]}`;
  return `${list} will show Instructor not listed to clients until you name someone else.`;
}

/**
 * Step 2 of the remove dialog. "The hiring fee already charged isn't refunded."
 * only when a fee was charged: a Centium hire (W4 lead decision). An
 * existing-team member added free in the window has no hire, so no fee line.
 */
export function removeConfirmBody(member: { source: "existing_team" | "hire"; hires: unknown[] }): string {
  const charged = member.source === "hire" || member.hires.length > 0;
  return charged ? "This can't be undone. The hiring fee already charged isn't refunded." : "This can't be undone.";
}

// ---------------------------------------------------------------------------
// B-MA.8.5 Hiring fees

/** "Sunday Spin instructor · Role · hired Oct 18, 2026". */
export function feeRoleLine(roleTitle: string, type: "role" | "class_slot", hiredAt: string | null): string {
  const parts = [roleTitle.trim(), type === "role" ? t("Role") : t("Class slot")].filter(Boolean);
  const d = fullDate(hiredAt);
  if (d) parts.push(t("hired {date}", { date: d }));
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// B-MA.8.8 Add your existing team (D-31: the server computes the window)

/** The countdown's big figure and its unit: "24" "days left", "1" "day left"; 0 or less: "Last day". */
export function countdownParts(daysLeft: number): { figure: string; unit: string } {
  if (daysLeft <= 0) return { figure: "Last day", unit: "" };
  return { figure: String(daysLeft), unit: daysLeft === 1 ? "day left" : "days left" };
}

/** The progress bar's width: the share of the 30 days used ("24 days left" → "20%"). */
export function windowPct(used: number): string {
  return `${Math.round(Math.min(1, Math.max(0, used)) * 1000) / 10}%`;
}

/** "Add 3 professionals · free", "Add 1 professional · free". */
export const addCta = (n: number): string => `Add ${n} ${n === 1 ? "professional" : "professionals"} · free`;
/** "Add 3 professionals to your team?" */
export const addTitle = (n: number): string => `Add ${n} ${n === 1 ? "professional" : "professionals"} to your team?`;
/** "3 professionals added to your team · free" */
export const addedStrip = (n: number): string => `${n} ${n === 1 ? "professional" : "professionals"} added to your team · free`;

/** The invite note: "Free · existing team. No hiring fee. The invite must be accepted by Nov 14, 2026." */
export function inviteNote(closesAt: string | null): string {
  const d = fullDate(closesAt);
  return d ? `Free · existing team. No hiring fee. The invite must be accepted by ${d}.` : "Free · existing team. No hiring fee.";
}

export const PRO_TYPE_CHIPS: { key: ProfessionalType; label: string }[] = [
  { key: "trainer", label: "Trainer" },
  { key: "dietitian", label: "Dietitian" },
  { key: "physiotherapist", label: "Physiotherapist" },
  { key: "other", label: "Other" },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** An email, or a phone number of 7 to 15 digits (an optional leading +, spaces, dashes, dots, brackets). */
export function isEmailOrPhone(v: string): boolean {
  const t = v.trim();
  if (EMAIL.test(t)) return true;
  if (!/^\+?[\d\s\-().]+$/.test(t)) return false;
  const digits = t.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}

/** Members who joined free during the window (the closed screen's list). */
export const addedDuringWindow = (team: TeamMember[]): TeamMember[] => team.filter((t) => t.source === "existing_team");

// ---------------------------------------------------------------------------
// B-MA.8.7 the employee invite's identifier

/**
 * What the employee invite's "Email or code" field holds: an email (sent to
 * invite_employee as today), a code-shaped token (asked of classify_code
 * only, never sent: invite_employee takes an email), or neither.
 */
export function inviteIdentifierKind(v: string): "email" | "code" | "other" {
  const t = v.trim();
  if (EMAIL.test(t)) return "email";
  if (/^[A-Za-z0-9][A-Za-z0-9-]{3,31}$/.test(t) && /\d/.test(t)) return "code";
  return "other";
}

// ---------------------------------------------------------------------------
// B-MA.1 the Gym card's Hiring row

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "3 openings · 3 new applicants · Team of 3". */
export function hiringRowLine(openings: number, newApplicants: number, team: number): string {
  return `${plural(openings, "opening", "openings")} · ${plural(newApplicants, "new applicant", "new applicants")} · Team of ${team}`;
}

/** The line while Hiring hasn't landed (DB8 pending): a calm description, never zeros. */
export const HIRING_ROW_PENDING = "Post openings and build your Team";

