// Round F2 · AB4 (Karim F20–F22): class attendance and the no-show booking
// pause, pure (no Supabase, so node --test loads it).
//
// Contract (Database 20261226060000, HANDOVER_API "No-shows (AB4)"):
// - mark_class_attendance(p_booking_id, p_attendance 'attended' | 'no_show' |
//   null): staff with schedule or front_desk, once the class has started
//   (ATXS1); clearing (null, our Undo) within 24 hours of the mark (ATXS2).
//   A desk check-in that day marks the booking attended by itself.
// - business_profiles.no_show_pause (on by default), set_no_show_pause(
//   p_business_id, p_on): staff with schedule.
// - Three no-shows at a business in 30 days pause the member's NEW class
//   bookings there for 7 days; book_class refuses with ATXS0, DETAIL = the end
//   (ISO, UTC). Existing bookings stay. Correcting a mark lifts the pause.
// - my_booking_pauses() → business_id, business_name, paused_until;
//   business_booking_pauses(p_business_id) → member_id, member_label,
//   paused_until, no_shows (staff with members); lift_booking_pause(
//   p_business_id, p_member_id) (members).
// - Notices no_show_warning (payload business_id, no_shows), booking_paused
//   (business_id, until), booking_pause_lifted (business_id).
// Classes only: appointments keep their own no-show fee (the migration).

import { t, tk, tn } from "../../i18n/core";
import { appLocale } from "../../i18n/format";

export type Attendance = "attended" | "no_show";

/** Karim's numbers, as the migration has them (booking_pause_evaluate). */
export const NO_SHOWS_TO_PAUSE = 3;
export const PAUSE_DAYS = 7;
export const NO_SHOW_WINDOW_DAYS = 30;
/** A mark can be cleared for this long after it was made (ATXS2). */
export const UNDO_HOURS = 24;

export const ATTENDANCE_LABEL: Record<Attendance, string> = {
  attended: tk("Attended"),
  no_show: tk("No-show"),
};

/** The roster's menu and its lines. */
export const ROSTER_COPY = {
  markAttended: tk("Mark attended"),
  markNoShow: tk("Mark no-show"),
  undo: tk("Undo mark"),
  markedAttended: tk("Marked attended."),
  markedNoShow: tk("Marked as a no-show."),
  undone: tk("Mark undone."),
} as const;

/** The policy toggle (Booking policies › Late cancels and no-shows). */
export const POLICY_COPY = {
  title: tk("Pause bookings after 3 no-shows"),
  desc: tk("Members who miss 3 classes in 30 days can't book new classes here for 7 days."),
  on: tk("No-show pause turned on."),
  off: tk("No-show pause turned off."),
  lateSoon: tk("Late-cancel counting and fees are coming soon."),
  section: tk("No-shows"),
  summaryOff: tk("Bookings don't pause after no-shows"),
} as const;

/** The business's paused members (Members, and the venue roster). */
export const PAUSES_COPY = {
  heading: tk("Paused bookings"),
  lift: tk("Lift pause"),
  lifted: tk("Pause lifted. They can book classes again."),
  foot: tk("Booking pauses end by themselves after 7 days."),
} as const;

/** "Nov 7, 6:40 PM" in the app's language (a pause ends at a time, not a day). */
export function formatPauseEnd(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(appLocale("en-US"), { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** The chip on a paused member's row. */
export function pausedChip(iso: string): string {
  const date = formatPauseEnd(iso);
  return date ? t("Paused until {date}", { date }) : t("Bookings paused");
}

/** "{n} no-shows in 30 days" under a paused member. */
export function noShowsLine(n: number): string {
  return tn(n, "{n} no-show in 30 days", "{n} no-shows in 30 days");
}

/**
 * The member's sentence, on the class page in place of Book and in the
 * booking_paused notice (PLAN AB4, the 3rd no-show).
 */
export function pausedSentence(gym: string | null, untilIso: string | null): string {
  const date = untilIso ? formatPauseEnd(untilIso) : null;
  if (gym && date)
    return t("You missed 3 classes at {gym} in 30 days, so new bookings there are paused until {date}. Your existing bookings are kept.", { gym, date });
  if (date) return t("You missed 3 classes here in 30 days, so new bookings here are paused until {date}. Your existing bookings are kept.", { date });
  if (gym) return t("You missed 3 classes at {gym} in 30 days, so new bookings there are paused for 7 days. Your existing bookings are kept.", { gym });
  return t("You missed 3 classes in 30 days, so new class bookings there are paused for 7 days. Your existing bookings are kept.");
}

/** The no_show_warning notice (the 2nd no-show). */
export function warningSentence(gym: string | null): string {
  return gym
    ? t("You missed 2 classes at {gym} in the last 30 days. After 3, new bookings there pause for 7 days.", { gym })
    : t("You missed 2 classes in the last 30 days. After 3, new bookings there pause for 7 days.");
}

/** The booking_pause_lifted notice. */
export function liftedSentence(gym: string | null): string {
  return gym ? t("You can book classes at {gym} again.", { gym }) : t("You can book classes there again.");
}

/** The three notices' lines without a payload (the business name comes from the subject). */
export const NO_SHOW_NOTICE_COPY = {
  no_show_warning: { title: tk("You missed 2 classes"), body: tk("You missed 2 classes in the last 30 days. After 3, new bookings there pause for 7 days.") },
  booking_paused: { title: tk("Class bookings paused"), body: tk("You missed 3 classes in 30 days, so new class bookings there are paused for 7 days. Your existing bookings are kept.") },
  booking_pause_lifted: { title: tk("Bookings open again"), body: tk("You can book classes there again.") },
} as const;

/** The class's start on this device's clock ("2026-11-07" + "18:00[:00]"); null when unreadable. */
export function classStart(date: string, startTime: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{1,2}):(\d{2})/.exec(startTime);
  if (!d || !tm) return null;
  return new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(tm[1]), Number(tm[2]));
}

/**
 * Whether the roster offers the marks: once the class has started. Unknown
 * (no session given) offers them, and the server answers ATXS1 if it is early.
 */
export function attendanceOpen(session: { date: string; startTime: string } | null | undefined, now: Date = new Date()): boolean {
  if (!session) return true;
  const s = classStart(session.date, session.startTime);
  return !s || s.getTime() <= now.getTime();
}

/**
 * Undo is offered within 24 hours of the mark. `markedAt` unknown (the
 * class's instructor can't read it): offered, and ATXS2 says when it's late.
 */
export function canUndo(markedAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!markedAt) return true;
  const at = new Date(markedAt).getTime();
  return Number.isNaN(at) || now.getTime() - at < UNDO_HOURS * 3_600_000;
}

export type NoShowAction = "mark" | "policy" | "lift" | "pauses" | "book";

/** The F2 refusals in words (ATXS0–ATXS2) and each writer's permission line. */
export function noShowMessage(action: NoShowAction, code: string | undefined, detail: string | null | undefined, fallback: string): string {
  switch (code) {
    case "ATXS0": {
      const date = detail ? formatPauseEnd(detail) : null;
      return date ? t("Your new class bookings here are paused until {date}.", { date }) : t("Your new class bookings here are paused for now.");
    }
    case "ATXS1":
      return t("Attendance can be marked once the class starts.");
    case "ATXS2":
      return t("A mark can only be undone within 24 hours.");
    case "ATX08":
      return action === "mark" ? t("That booking couldn't be found. Reload the roster.") : fallback;
    case "ATX09":
      if (action === "mark") return t("Marking attendance needs Schedule or Front desk access. Ask the owner.");
      if (action === "policy") return t("Only staff who manage the schedule can change this.");
      return t("Lifting a pause needs Members access. Ask the owner.");
    default:
      return fallback;
  }
}

/** One of the caller's own pauses (my_booking_pauses). */
export interface MyPause {
  businessId: string;
  businessName: string | null;
  pausedUntil: string;
}

/** A paused member, for staff (business_booking_pauses). */
export interface MemberPause {
  memberId: string;
  label: string;
  pausedUntil: string;
  noShows: number;
}

const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export function parseMyPauses(data: unknown): MyPause[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((r: Record<string, unknown>) => {
    const businessId = s(r?.business_id);
    const pausedUntil = s(r?.paused_until);
    return businessId && pausedUntil ? [{ businessId, businessName: s(r.business_name), pausedUntil }] : [];
  });
}

export function parseMemberPauses(data: unknown): MemberPause[] {
  if (!Array.isArray(data)) return [];
  return data
    .flatMap((r: Record<string, unknown>) => {
      const memberId = s(r?.member_id);
      const pausedUntil = s(r?.paused_until);
      const n = Number(r?.no_shows);
      return memberId && pausedUntil ? [{ memberId, label: s(r.member_label) ?? t("Member"), pausedUntil, noShows: Number.isFinite(n) ? n : 0 }] : [];
    })
    .sort((a, b) => a.pausedUntil.localeCompare(b.pausedUntil));
}

/** The caller's pause at a business now in force, or null. */
export function pauseAt(pauses: readonly MyPause[], businessId: string | null | undefined, now: Date = new Date()): MyPause | null {
  if (!businessId) return null;
  return pauses.find((p) => p.businessId === businessId && new Date(p.pausedUntil).getTime() > now.getTime()) ?? null;
}
