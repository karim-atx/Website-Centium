import { supabase } from "../../../lib/supabase/client";
import { resolveMyBusinessId } from "../business-profile";
import { formatPrice, parsePrice } from "../../utils/price";

// A business's scheduled classes: the real business_classes rows.
//
// WHAT THIS REPLACES. `businessClasses` was a localStorage array with ids
// minted as `bc` plus a timestamp. Two business screens wrote to it
// (BusinessClassesTab and BusinessCalendarTab) and the affiliated
// professional's own calendar read it — from their own device, where a
// business's array is empty. So the feature's whole point, "a class a business
// schedules shows on the professional's calendar too", worked only if both
// accounts were the same browser profile. It never crossed a device.
//
// THE PROFESSIONAL ID IS A REAL FOREIGN KEY NOW, which is the change that
// makes that work: business_classes.professional_id references profiles(id)
// ON DELETE SET NULL, and the ids come from services/business-team, which
// reads business_employees. The old code compared against the string "me",
// the stand-in the local affiliation system used — no real uuid will ever
// equal it, so every one of those comparisons had to be replaced rather than
// left to quietly match nothing.
//
// WHAT HAS NO HOME HERE, measured rather than assumed: BusinessClass.clientIds.
// The table for it exists — business_class_bookings — but its INSERT policy is
// `auth.uid() = client_id`, and `authenticated` is granted only DELETE and
// SELECT on it, no INSERT at all. A booking is something a client makes; a
// business owner can see and cancel bookings but cannot create one. The
// "add clients to this class" picker in BusinessCalendarTab was therefore
// never going to persist from that side, and is removed rather than left
// writing to nothing.

export interface BusinessClassRow {
  id: string;
  title: string;
  classType: string;
  /** `YYYY-MM-DD`, from the `event_date` column. */
  date: string;
  /** `HH:MM`, trimmed from the `time` column's `HH:MM:SS`. */
  startTime: string;
  endTime: string;
  maxCapacity: number;
  professionalId: string | null;
  notes: string | null;
  /** Formatted for display, empty when the column is null. */
  price: string;
  paymentType: string | null;
}

export interface ClassDraft {
  title: string;
  classType: string;
  date: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  professionalId?: string;
  notes?: string;
  price?: string;
  paymentType?: string;
}

export type ClassesResult =
  | { ok: true; businessId: string | null; classes: BusinessClassRow[] }
  | { ok: false; message: string };

const COLUMNS =
  "id, title, class_type, event_date, start_time, end_time, max_capacity, professional_id, notes, price, payment_type";

type Row = {
  id: string;
  title: string;
  class_type: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  professional_id: string | null;
  notes: string | null;
  price: number | string | null;
  payment_type: string | null;
};

/**
 * What goes INTO the columns, which is not what comes out of them: a write
 * sends price as a number, a read receives PostgREST's string. One shared Row
 * type for both directions would let the insert offer the column a string it
 * will not take.
 */
type WriteRow = {
  title: string;
  class_type: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  professional_id: string | null;
  notes: string | null;
  price: number | null;
  payment_type: string | null;
};

// Times arrive as HH:MM:SS from a `time` column; every input and comparison in
// these screens is HH:MM. Trimmed once here, the same way services/calendar
// does it, rather than at each of the call sites.
const toHHMM = (t: string) => t.slice(0, 5);

const toClass = (r: Row): BusinessClassRow => ({
  id: r.id,
  title: r.title,
  classType: r.class_type ?? "",
  date: r.event_date,
  startTime: toHHMM(r.start_time),
  endTime: toHHMM(r.end_time),
  maxCapacity: r.max_capacity,
  professionalId: r.professional_id,
  notes: r.notes,
  price: formatPrice(r.price),
  paymentType: r.payment_type,
});

/**
 * The content columns, or a message saying why the draft cannot be written.
 *
 * THREE CHECK CONSTRAINTS LIVE ON THIS TABLE and all three are reachable from
 * the compose sheet: `max_capacity > 0` (the capacity box accepts an empty
 * string, which became 0), `start_time <= end_time` (nothing stopped an owner
 * picking 10:00 to 09:00), and `price >= 0`. Caught here so they read as form
 * errors instead of a 23514 the screen would have to translate.
 */
function toRow(draft: ClassDraft): { ok: true; row: WriteRow } | { ok: false; message: string } {
  const title = draft.title.trim();
  if (!title) return { ok: false, message: "Give the class a name." };
  if (!Number.isFinite(draft.maxCapacity) || draft.maxCapacity < 1) {
    return { ok: false, message: "Max capacity has to be at least 1." };
  }
  if (draft.startTime > draft.endTime) {
    return { ok: false, message: "The class can't end before it starts." };
  }

  const price = parsePrice(draft.price ?? "");
  if (!price.ok) return { ok: false, message: "Enter the price as a number, for example 15 or $15." };

  return {
    ok: true,
    row: {
      title,
      class_type: draft.classType.trim() || null,
      event_date: draft.date,
      start_time: draft.startTime,
      end_time: draft.endTime,
      max_capacity: draft.maxCapacity,
      professional_id: draft.professionalId || null,
      notes: draft.notes?.trim() || null,
      price: price.value,
      // Only meaningful alongside a price, and both screens already treat it
      // that way — a payment type on a free class is noise in the column.
      payment_type: price.value === null ? null : draft.paymentType ?? null,
    },
  };
}

/** Every class this account's business has scheduled. */
export async function fetchMyClasses(userId: string): Promise<ClassesResult> {
  const business = await resolveMyBusinessId(userId);
  if (!business.ok) {
    return { ok: false, message: "Couldn't load your classes. Check your connection and try again." };
  }
  if (!business.id) return { ok: true, businessId: null, classes: [] };

  const { data, error } = await supabase
    .from("business_classes")
    .select(COLUMNS)
    .eq("business_id", business.id)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("[business-classes] Could not read classes:", error.message);
    return { ok: false, message: "Couldn't load your classes. Check your connection and try again." };
  }
  return { ok: true, businessId: business.id, classes: (data ?? []).map((r) => toClass(r as Row)) };
}

/**
 * Classes a business has put this professional on.
 *
 * THE OTHER DIRECTION THROUGH THE SAME TABLE, and the reason it works at all
 * is that business_classes_select_public is `USING (true)` — a professional
 * does not own these rows and has no policy granting them anything else. They
 * read their own assignments by filtering on professional_id; they cannot edit
 * or delete them, which is what the calendar already assumed and can now
 * actually rely on.
 *
 * The business's name is embedded so the professional's calendar can say who
 * scheduled it, the way it used to read from the local businessDirectory.
 */
export async function fetchClassesAssignedToMe(
  userId: string
): Promise<{ ok: true; classes: (BusinessClassRow & { businessName: string })[] } | { ok: false }> {
  const { data, error } = await supabase
    .from("business_classes")
    .select(COLUMNS + ", business_profiles!inner(business_name)")
    .eq("professional_id", userId)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("[business-classes] Could not read assigned classes:", error.message);
    return { ok: false };
  }

  const rows = (data ?? []) as unknown as (Row & {
    business_profiles: { business_name: string } | null;
  })[];

  return {
    ok: true,
    classes: rows.map((r) => ({
      ...toClass(r),
      businessName: r.business_profiles?.business_name ?? "your affiliated business",
    })),
  };
}

export async function createClass(
  businessId: string,
  draft: ClassDraft
): Promise<{ ok: true; created: BusinessClassRow } | { ok: false; message: string }> {
  const built = toRow(draft);
  if (!built.ok) return built;

  const { data, error } = await supabase
    .from("business_classes")
    .insert({ business_id: businessId, ...built.row })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    console.error("[business-classes] Could not create the class:", error?.message);
    return { ok: false, message: "Couldn't save the class. Try again." };
  }
  return { ok: true, created: toClass(data as Row) };
}

export async function deleteClass(classId: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from("business_classes").delete().eq("id", classId);
  if (error) {
    console.error("[business-classes] Could not delete the class:", error.message);
    return { ok: false, message: "Couldn't delete the class. Try again." };
  }
  return { ok: true };
}
