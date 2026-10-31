// Round F2 · AB4: class attendance and the no-show booking pause (Database
// 20261226060000; the rules and states are in ./noShowModel). None of these
// functions or columns are in the production-generated types yet, so the
// client is narrowed to the exact calls made here.

import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { t } from "../../i18n/core";
import { noShowMessage, parseMemberPauses, parseMyPauses, type Attendance, type MemberPause, type MyPause, type NoShowAction } from "./noShowModel";

export * from "./noShowModel";

export type NoShowResult<T> = { ok: true; value: T } | { ok: false; message: string; code?: string };

type Rpc = <T>(fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: T | null; error: PostgrestError | null }>;
const rpc = (supabase as unknown as { rpc: (...a: unknown[]) => unknown }).rpc.bind(supabase) as unknown as Rpc;

type Res<T> = PromiseLike<{ data: T | null; error: PostgrestError | null }>;
type Loose = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, v: string) => { maybeSingle: () => Res<Record<string, unknown>> };
      in: (col: string, v: string[]) => Res<Record<string, unknown>[]>;
    };
  };
};
const db = supabase as unknown as Loose;

function fail<T>(action: NoShowAction, error: PostgrestError, fallback: string): NoShowResult<T> {
  console.error(`[no-shows] ${action} failed:`, error.code, error.message);
  if (isOffline(error)) return { ok: false, code: error.code, message: t(OFFLINE_MESSAGE) };
  return { ok: false, code: error.code, message: noShowMessage(action, error.code, error.details, fallback) };
}

/** mark_class_attendance: Attended, No-show, or null (Undo, within 24 hours). */
export async function markClassAttendance(bookingId: string, attendance: Attendance | null): Promise<NoShowResult<Attendance | null>> {
  const { data, error } = await rpc<{ attendance?: string | null }>("mark_class_attendance", { p_booking_id: bookingId, p_attendance: attendance });
  if (error) return fail("mark", error, t("Couldn't save attendance. Try again."));
  const a = data?.attendance;
  return { ok: true, value: a === "attended" || a === "no_show" ? a : null };
}

/**
 * When each booking's mark was made, for Undo's 24 hours. Readable by staff
 * with front desk (business_class_bookings' insider policy); the class's
 * instructor reads nothing, and Undo stays offered (the server says ATXS2).
 */
export async function fetchAttendanceMarks(bookingIds: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (bookingIds.length === 0) return out;
  const { data, error } = await db.from("business_class_bookings").select("id, attendance_marked_at").in("id", bookingIds);
  if (error || !data) return out;
  for (const r of data) if (typeof r.id === "string") out.set(r.id, typeof r.attendance_marked_at === "string" ? r.attendance_marked_at : null);
  return out;
}

/** business_profiles.no_show_pause (on by default; null when it couldn't be read). */
export async function fetchNoShowPause(businessId: string): Promise<NoShowResult<boolean>> {
  const { data, error } = await db.from("business_profiles").select("no_show_pause").eq("id", businessId).maybeSingle();
  if (error) return fail("policy", error, t("Couldn't load this. Try again."));
  return { ok: true, value: data?.no_show_pause !== false };
}

/** set_no_show_pause(p_business_id, p_on): staff with schedule. */
export async function setNoShowPause(businessId: string, on: boolean): Promise<NoShowResult<boolean>> {
  const { data, error } = await rpc<boolean>("set_no_show_pause", { p_business_id: businessId, p_on: on });
  if (error) return fail("policy", error, t("Couldn't save this. Try again."));
  return { ok: true, value: data !== false };
}

/** business_booking_pauses(p_business_id): the paused members (staff with members). */
export async function fetchBusinessBookingPauses(businessId: string): Promise<NoShowResult<MemberPause[]>> {
  const { data, error } = await rpc<unknown>("business_booking_pauses", { p_business_id: businessId });
  if (error) return fail("pauses", error, t("Couldn't load paused bookings."));
  return { ok: true, value: parseMemberPauses(data) };
}

/** lift_booking_pause(p_business_id, p_member_id): ends it now; the member is told. */
export async function liftBookingPause(businessId: string, memberId: string): Promise<NoShowResult<number>> {
  const { data, error } = await rpc<number>("lift_booking_pause", { p_business_id: businessId, p_member_id: memberId });
  if (error) return fail("lift", error, t("Couldn't lift the pause. Try again."));
  return { ok: true, value: typeof data === "number" ? data : 0 };
}

/** my_booking_pauses(): the caller's pauses in force, per business. */
export async function fetchMyBookingPauses(): Promise<NoShowResult<MyPause[]>> {
  const { data, error } = await rpc<unknown>("my_booking_pauses");
  if (error) return fail("book", error, t("Couldn't check your bookings."));
  return { ok: true, value: parseMyPauses(data) };
}
