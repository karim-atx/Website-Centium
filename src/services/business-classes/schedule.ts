import { supabase } from "../../../lib/supabase/client";
import { prepareForumPhoto } from "../forum/photo";
import {
  classCoverPath,
  refusalMessage,
  refusalOf,
  type BookingPolicy,
  type ClassLevel,
  type DbError,
  type PolicyField,
  type RepeatRule,
  type ScheduleAction,
  type ScheduleRefusal,
} from "./scheduleRules";

// B9 · Classes and schedule, the business side (HANDOVER_API "B9 · Classes
// and schedule"). Every function here is gated `schedule` on the server
// (business_can(…, 'schedule')); the refusal codes are mapped to one line
// each in ./scheduleRules (refusalMessage). The member booking path
// (book_class, cancel_class_booking, pending_policies) is not here.
//
// The functions are newer than database.types.ts, so the client is narrowed
// to a typed rpc / from rather than the generated file being hand-edited.

type RpcResult<T> = PromiseLike<{ data: T | null; error: DbError | null }>;
const rpc = <T>(fn: string, args: Record<string, unknown>): RpcResult<T> =>
  (supabase as unknown as { rpc: (f: string, a: Record<string, unknown>) => RpcResult<T> }).rpc(fn, args);

export type Done<T> = { ok: true; value: T } | { ok: false; refusal: ScheduleRefusal; message: string };

const fail = <T>(action: ScheduleAction, error: DbError | null, people?: "clients" | "members"): Done<T> => {
  console.error(`[business-classes] ${action} refused:`, error?.code, error?.message);
  return { ok: false, refusal: refusalOf(error), message: refusalMessage(action, error, people) };
};

/** save_class_series / edit_class field keys (class_fields_check refuses any other key with 22023). */
export interface ClassFields {
  title?: string;
  class_type?: string | null;
  gym_id?: string | null;
  start_time?: string;
  end_time?: string;
  max_capacity?: number;
  professional_id?: string | null;
  price?: number;
  payment_type?: string | null;
  notes?: string | null;
  about?: string | null;
  level?: ClassLevel | null;
  what_to_bring?: string[];
  cover_url?: string | null;
  cancellation_hours?: number | null;
}

// ---------------------------------------------------------------------------
// Repeating classes (CL-01)

/** Creates a series and its classes 12 weeks ahead; ATXD9 refuses the whole save and names the date. */
export async function saveClassSeries(businessId: string, fields: ClassFields, rule: RepeatRule): Promise<Done<string>> {
  const { data, error } = await rpc<string>("save_class_series", {
    p_business_id: businessId,
    p_fields: fields,
    p_weekdays: rule.weekdays,
    p_starts_on: rule.startsOn,
    p_until_on: rule.untilOn,
    p_occurrence_count: rule.count,
    p_interval_weeks: rule.intervalWeeks,
  });
  if (error || !data) return fail("save", error);
  return { ok: true, value: data };
}

/** `this` edits one class (and marks it an exception); `future` splits the series here. Returns the classes changed. */
export async function editClass(classId: string, scope: "this" | "future", fields: ClassFields): Promise<Done<number>> {
  const { data, error } = await rpc<number>("edit_class", { p_class_id: classId, p_scope: scope, p_fields: fields });
  if (error) return fail("edit", error);
  return { ok: true, value: data ?? 0 };
}

/** Ends a series after `lastDate`: later classes nobody booked are removed; booked ones stay and are counted. */
export async function endClassSeries(seriesId: string, lastDate: string): Promise<Done<{ removed: number; keptWithBookings: number }>> {
  const { data, error } = await rpc<{ removed: number; kept_with_bookings: number }[]>("end_class_series", { p_series_id: seriesId, p_last_date: lastDate });
  if (error) return fail("end", error);
  const row = data?.[0];
  return { ok: true, value: { removed: row?.removed ?? 0, keptWithBookings: row?.kept_with_bookings ?? 0 } };
}

export interface SeriesRow extends RepeatRule {
  id: string;
  startTime: string;
}

/** This business's series (class_series_select_insider); written only through the functions above. */
export async function fetchSeries(businessId: string): Promise<{ ok: true; series: SeriesRow[] } | { ok: false }> {
  const db = supabase as unknown as {
    from: (t: "class_series") => {
      select: (c: string) => {
        eq: (k: string, v: string) => PromiseLike<{ data: Record<string, unknown>[] | null; error: DbError | null }>;
      };
    };
  };
  const { data, error } = await db.from("class_series").select("id, weekdays, interval_weeks, starts_on, until_on, occurrence_count, start_time").eq("business_id", businessId);
  if (error) {
    console.error("[business-classes] Could not read series:", error.message);
    return { ok: false };
  }
  return {
    ok: true,
    series: (data ?? []).map((r) => ({
      id: String(r.id),
      weekdays: ((r.weekdays as number[] | null) ?? []).map(Number),
      intervalWeeks: Number(r.interval_weeks ?? 1),
      startsOn: String(r.starts_on),
      untilOn: (r.until_on as string | null) ?? null,
      count: (r.occurrence_count as number | null) ?? null,
      startTime: String(r.start_time ?? "").slice(0, 5),
    })),
  };
}

// ---------------------------------------------------------------------------
// Cancel, move, assign (CL-03, CL-04)

export interface CancelResult {
  membersTold: number;
  bookingsCancelled: number;
  paidToRefund: number;
  waitlistReleased: number;
}

/** Cancels one session: bookings released and recorded as a venue cancellation, members told at once. */
export async function cancelClassSession(classId: string, reason: string | null, people: "clients" | "members"): Promise<Done<CancelResult>> {
  const { data, error } = await rpc<{ members_told: number; bookings_cancelled: number; paid_to_refund: number; waitlist_released: number }[]>("cancel_class_session", {
    p_class_id: classId,
    p_reason: reason?.trim() || null,
  });
  if (error) return fail("cancel", error, people);
  const r = data?.[0];
  return {
    ok: true,
    value: { membersTold: r?.members_told ?? 0, bookingsCancelled: r?.bookings_cancelled ?? 0, paidToRefund: r?.paid_to_refund ?? 0, waitlistReleased: r?.waitlist_released ?? 0 },
  };
}

/** Moves one session; members' calendar entries and money owed move with it. Returns the members told. */
export async function moveClassSession(classId: string, date: string, startTime: string, endTime: string): Promise<Done<number>> {
  const { data, error } = await rpc<number>("move_class_session", { p_class_id: classId, p_event_date: date, p_start_time: startTime, p_end_time: endTime });
  if (error) return fail("move", error);
  return { ok: true, value: data ?? 0 };
}

/** Names (or clears, null) who teaches one session; the server re-checks team and overlap (ATX76, ATXD9). Returns the members told. */
export async function assignClassInstructor(classId: string, professionalId: string | null, tellMembers: boolean): Promise<Done<number>> {
  const { data, error } = await rpc<number>("assign_class_instructor", { p_class_id: classId, p_professional_id: professionalId, p_tell_members: tellMembers });
  if (error) return fail("assign", error);
  return { ok: true, value: data ?? 0 };
}

export interface FreeInstructor {
  professionalId: string;
  firstName: string;
  role: string;
  isCurrent: boolean;
  /** False when no availability is set too ("No availability set"). */
  withinAvailability: boolean;
  markedUnavailable: boolean;
  /** Teaching at that time anywhere; never says where. */
  isBusy: boolean;
}

/** Who on the team could take this session (CL-04). */
export async function instructorsFreeFor(classId: string): Promise<Done<FreeInstructor[]>> {
  const { data, error } = await rpc<
    { professional_id: string; first_name: string | null; role: string | null; is_current: boolean; within_availability: boolean; marked_unavailable: boolean; is_busy: boolean }[]
  >("instructors_free_for", { p_class_id: classId });
  if (error) return fail("free", error);
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      professionalId: r.professional_id,
      firstName: (r.first_name ?? "").trim() || "Unnamed",
      role: r.role ?? "",
      isCurrent: !!r.is_current,
      withinAvailability: !!r.within_availability,
      markedUnavailable: !!r.marked_unavailable,
      isBusy: !!r.is_busy,
    })),
  };
}

export interface InstructorConflict {
  classId: string;
  otherClassId: string;
  professionalId: string;
  date: string;
}

/** Existing overlaps within this business, today to +84 days by default (the AN5 "Fix" list). */
export async function classInstructorConflicts(businessId: string, from?: string, to?: string): Promise<Done<InstructorConflict[]>> {
  const { data, error } = await rpc<{ class_id: string; other_class_id: string; professional_id: string; event_date: string }[]>("class_instructor_conflicts", {
    p_business_id: businessId,
    p_from: from ?? null,
    p_to: to ?? null,
  });
  if (error) return fail("conflicts", error);
  return { ok: true, value: (data ?? []).map((r) => ({ classId: r.class_id, otherClassId: r.other_class_id, professionalId: r.professional_id, date: r.event_date })) };
}

// ---------------------------------------------------------------------------
// Class covers (EX-01): public bucket class-covers, <uid>/<business_id>/<file>

/** Uploads a cover (re-encoded as JPEG, metadata dropped) and returns its public URL for cover_url. */
export async function uploadClassCover(uid: string, businessId: string, file: File): Promise<{ ok: true; url: string; path: string } | { ok: false; message: string }> {
  const prepared = await prepareForumPhoto(file);
  if (!prepared.ok) return { ok: false, message: prepared.message };
  if (prepared.file.size > 5 * 1024 * 1024) return { ok: false, message: "This photo is too large. Choose one under 5 MB." };
  const path = classCoverPath(uid, businessId, crypto.randomUUID());
  const up = await supabase.storage.from("class-covers").upload(path, prepared.file, { contentType: "image/jpeg", upsert: false });
  if (up.error) {
    console.warn("[business-classes] cover upload refused:", up.error.message);
    return { ok: false, message: "Couldn't upload the photo. Check your connection and try again." };
  }
  return { ok: true, path, url: supabase.storage.from("class-covers").getPublicUrl(path).data.publicUrl };
}

/** Removes a cover this account uploaded (own-prefix delete policy); anything else is left alone. */
export async function removeClassCover(uid: string, url: string | null | undefined): Promise<void> {
  const m = /\/class-covers\/(.+)$/.exec(url ?? "");
  const path = m ? decodeURIComponent(m[1].split("?")[0]) : null;
  if (!path || path.split("/")[0] !== uid) return;
  await supabase.storage.from("class-covers").remove([path]);
}

// ---------------------------------------------------------------------------
// Booking rules (CL-05): business_booking_policies

type PolicyRow = {
  id: string;
  class_type: string | null;
  cancellation_hours: number | null;
  booking_window_days: number | null;
  closes_minutes_before: number | null;
  default_capacity: number | null;
  waitlist_cap: number | null;
};
const POLICY_COLUMNS = "id, class_type, cancellation_hours, booking_window_days, closes_minutes_before, default_capacity, waitlist_cap";
const COLUMN_OF: Record<PolicyField, keyof PolicyRow> = {
  cancellationHours: "cancellation_hours",
  bookingWindowDays: "booking_window_days",
  closesMinutesBefore: "closes_minutes_before",
  defaultCapacity: "default_capacity",
  waitlistCap: "waitlist_cap",
};
const toPolicy = (r: PolicyRow): BookingPolicy => ({
  id: r.id,
  classType: r.class_type,
  cancellationHours: r.cancellation_hours,
  bookingWindowDays: r.booking_window_days,
  closesMinutesBefore: r.closes_minutes_before,
  defaultCapacity: r.default_capacity,
  waitlistCap: r.waitlist_cap,
});

type PolicyTable = {
  select: (c: string) => { eq: (k: string, v: string) => PromiseLike<{ data: PolicyRow[] | null; error: DbError | null }> };
  insert: (row: Record<string, unknown>) => { select: (c: string) => { single: () => PromiseLike<{ data: PolicyRow | null; error: DbError | null }> } };
  update: (row: Record<string, unknown>) => { eq: (k: string, v: string) => { select: (c: string) => { maybeSingle: () => PromiseLike<{ data: PolicyRow | null; error: DbError | null }> } } };
  delete: () => { eq: (k: string, v: string) => PromiseLike<{ error: DbError | null }> };
};
const policies = () => (supabase as unknown as { from: (t: "business_booking_policies") => PolicyTable }).from("business_booking_policies");

/** The business default (class_type null) and any per-type rows. */
export async function fetchBookingPolicies(businessId: string): Promise<{ ok: true; value: BookingPolicy[] } | { ok: false; message: string }> {
  const { data, error } = await policies().select(POLICY_COLUMNS).eq("business_id", businessId);
  if (error) {
    console.error("[business-classes] Could not read booking policies:", error.message);
    return { ok: false, message: "Couldn't load this. Try again." };
  }
  return { ok: true, value: (data ?? []).map(toPolicy) };
}

/**
 * Sets one rule for the default (classType null) or a class type: updates the
 * row that exists, else inserts one. Writing needs `schedule` (RLS); the
 * CHECK ranges are in POLICY_RANGE.
 */
export async function setBookingPolicy(
  businessId: string,
  existing: BookingPolicy | null,
  classType: string | null,
  field: PolicyField,
  value: number | null
): Promise<Done<BookingPolicy>> {
  const col = COLUMN_OF[field];
  if (existing) {
    // Every rule column by name (all granted for UPDATE), the changed one new
    // and the rest as read, so the grant audit can see the payload.
    const pick = (f: PolicyField) => (f === field ? value : existing[f]);
    const patch = {
      cancellation_hours: pick("cancellationHours"),
      booking_window_days: pick("bookingWindowDays"),
      closes_minutes_before: pick("closesMinutesBefore"),
      default_capacity: pick("defaultCapacity"),
      waitlist_cap: pick("waitlistCap"),
    };
    const { data, error } = await policies().update(patch).eq("id", existing.id).select(POLICY_COLUMNS).maybeSingle();
    if (error || !data) return fail("policy", error ?? { code: "ATX03" });
    return { ok: true, value: toPolicy(data) };
  }
  const { data, error } = await policies()
    .insert({ business_id: businessId, class_type: classType?.trim() || null, [col]: value })
    .select(POLICY_COLUMNS)
    .single();
  if (error || !data) return fail("policy", error);
  return { ok: true, value: toPolicy(data) };
}
