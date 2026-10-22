// Market + Share 3.0 · W4 · B-MA.6 the Team-only instructor picker and the
// assign clash, pure (Business Hiring Screens `instrPicker`, `instrNoTeam`,
// `assignConflict`: script `fPerson`, `fNote`, the inline card and `dlg`).
// No Supabase import: node --test loads it.
//
// The rows' source (lead decision, D-35): the Team (my_team, DB8) once it
// answers; until then the live instructors the sheet uses today (accepted
// business_employees, fetchInstructors), which DB8 backfills as
// `existing_team` members, so a class never loses its instructor.

import type { TeamMember } from "../../../services/hiring/model";
import { range12, time12 } from "../../../utils/time12";
import { DAY_LONG, DAY_SHORT } from "../../../utils/week";
import { joinAnd, shortDate } from "./scheduleModel";

/** The "no one" row and the note (Business Hiring Screens instrPicker). */
export const NO_INSTRUCTOR = "No instructor named";
export const INSTRUCTOR_NOTE = "Only your Team can be named. Add people through Hiring.";

/** One row of the picker (`fPerson`): sub-line teal (a Centium hire) or muted (`subInk` var(--faint)). */
export interface PickerPerson {
  id: string;
  /** Full name in Team mode; the live first name until my_team answers. */
  name: string;
  photoUrl: string | null;
  sub: string;
  muted: boolean;
}

const dayOf = (iso: string | null | undefined): string | null => {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso ?? "");
  return m ? m[1] : null;
};

/**
 * The Team row's line. A role hire: "{specialty} · Hired via Centium" (teal).
 * Only class-slot hires: "Class slot · {Sat, Oct 24} only" (muted). An
 * existing-team member (no hire): the specialty alone, muted ("On your team"
 * without one).
 */
export function teamSubLine(t: TeamMember): { sub: string; muted: boolean } {
  const spec = t.professional.specialty?.trim() || null;
  const roles = t.hires.filter((h) => h.type === "role");
  if (roles.length) return { sub: [spec, "Hired via Centium"].filter(Boolean).join(" · "), muted: false };
  const slot = t.hires.find((h) => h.type === "class_slot");
  if (slot) {
    const d = dayOf(slot.startsOn);
    return { sub: d ? `Class slot · ${shortDate(d)} only` : "Class slot · one session only", muted: true };
  }
  return { sub: spec ?? "On your team", muted: true };
}

/** Team rows, by name. */
export function teamPeople(team: readonly TeamMember[]): PickerPerson[] {
  return team
    .filter((t) => t.professional.id)
    .map((t) => ({ id: t.professional.id, name: t.professional.name.trim() || "Unnamed", photoUrl: t.professional.photoUrl, ...teamSubLine(t) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** "No classes this week", "1 class this week", "3 classes this week" (the live Instructor menu's note). */
export const weekLoad = (n: number): string => (n === 0 ? "No classes this week" : n === 1 ? "1 class this week" : `${n} classes this week`);

/** Live rows until my_team answers: the first name and this week's load, muted (no "Hired via Centium": no hire is known). */
export function livePeople(list: readonly { professionalId: string; firstName: string }[], classesThisWeek: (id: string) => number): PickerPerson[] {
  return list.map((i) => ({ id: i.professionalId, name: i.firstName, photoUrl: null, sub: weekLoad(classesThisWeek(i.professionalId)), muted: true }));
}

/** "Rana Khoury" → "Rana". */
export const firstNameOf = (name: string): string => name.trim().split(/\s+/)[0] ?? "";

// ---------------------------------------------------------------------------
// The assign clash (`assignConflict` dlg): busy times only, never what or where.

export interface ClashClass {
  title: string;
  /** The first date the class runs (a series' first, or the one session). */
  date: string;
  startTime: string;
  endTime: string;
  /** ISO weekdays (1 = Monday) when it repeats; null for one session. */
  weekdays: number[] | null;
}

/** The instructor's other session that overlaps (this business's own schedule), or null when the server refused (ATXD9, any business). */
export interface ClashBusy {
  startTime: string | null;
  endTime: string | null;
  /** The server's day, already worded ("Wed, Oct 21"), when only that is known. */
  dayText: string | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Nov 1" */
const monthDay = (day: string) => {
  const [, mo, d] = day.split("-").map(Number);
  return `${MONTHS[(mo || 1) - 1]} ${d || 1}`;
};
const days = (w: number[], names: readonly string[], plural: boolean) => joinAnd([...w].sort((a, b) => a - b).map((x) => `${names[(x - 1 + 7) % 7]}${plural ? "s" : ""}`));
const possessive = (first: string) => (first ? `${first}'s` : "Their");

/** "Rana has a clash" (the dialog's title). */
export const clashTitle = (first: string): string => `${first || "This instructor"} has a clash`;

/**
 * The body, the board's first sentence ("Spin 45 on Sundays at 10:00
 * overlaps a time already busy on Rana's calendar."), 12-hour. The board's
 * second sentence ("Assigning still adds every session to her calendar.")
 * belongs to "Assign anyway", which the live server refuses (ATXD9), so it is
 * not shown. `dates` > 1: how many sessions of a new series clash.
 */
export function clashBody(c: ClashClass, first: string, dates = 1): string {
  const when = c.weekdays && new Set(c.weekdays).size === 7 ? `every day at ${time12(c.startTime)}` : c.weekdays && c.weekdays.length ? `on ${days(c.weekdays, DAY_LONG, true)} at ${time12(c.startTime)}` : `on ${shortDate(c.date)} at ${time12(c.startTime)}`;
  const cal = first ? `${first}'s calendar` : "their calendar";
  const more = dates > 1 ? ` ${dates} sessions clash.` : "";
  return `${c.title || "This class"} ${when} overlaps a time already busy on ${cal}.${more}`;
}

/** The two rows: "{class}" / "Sun 10:00 to 10:45 AM, from Nov 1"; "{first}'s calendar" / "Busy 10:00 to 11:00 AM". */
export function clashRows(c: ClashClass, first: string, busy: ClashBusy): { k: string; v: string }[] {
  const range = range12(c.startTime, c.endTime);
  const v1 = c.weekdays && c.weekdays.length ? `${new Set(c.weekdays).size === 7 ? "Every day" : days(c.weekdays, DAY_SHORT, false)} ${range}, from ${monthDay(c.date)}` : `${shortDate(c.date)}, ${range}`;
  const v2 = busy.startTime && busy.endTime ? `Busy ${range12(busy.startTime, busy.endTime)}` : busy.dayText ? `Busy on ${busy.dayText}` : "Busy at this time";
  return [
    { k: c.title || "This class", v: v1 },
    { k: `${possessive(first)} calendar`, v: v2 },
  ];
}

/** The day the ATXD9 line names ("… at that time on Wed, Oct 21. Choose …", scheduleRules.refusalMessage), or null. */
export function busyDayOf(message: string | null | undefined): string | null {
  const m = /at that time on ([A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2})\./.exec(message ?? "");
  return m ? m[1] : null;
}
