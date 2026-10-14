import { supabase } from "../../../../lib/supabase/client";
import { lookbackFrom, type RawData, type RangeIn } from "./classesModel";

// AN3 Classes section reads (client side until the B15 / BU5-01 reader
// exists). Only what the owner's RLS already allows: business_classes
// (select_public covers insiders), business_class_bookings
// (select_business_owner), business_employees (select_business_owner) and
// public_profile_summary (first names). business_class_cancellations and
// business_class_waitlist have no owner policy, so nothing here reads them.

const db = supabase;

type ClassRow = {
  id: string;
  title: string;
  class_type: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  professional_id: string | null;
};
type BookingRow = { business_class_id: string; client_id: string; created_at: string; business_classes: { event_date: string } | null };

export async function fetchClassesRaw(businessId: string, range: RangeIn): Promise<{ ok: true; raw: RawData } | { ok: false }> {
  const from = lookbackFrom(range);
  const [classes, first, bookings, team] = await Promise.all([
    db
      .from("business_classes")
      .select("id, title, class_type, event_date, start_time, end_time, max_capacity, professional_id")
      .eq("business_id", businessId)
      .gte("event_date", from)
      .lte("event_date", range.to)
      .order("event_date", { ascending: true })
      .limit(5000),
    db.from("business_classes").select("event_date").eq("business_id", businessId).order("event_date", { ascending: true }).limit(1),
    db
      .from("business_class_bookings")
      .select("business_class_id, client_id, created_at, business_classes!inner(business_id, event_date)")
      .eq("business_classes.business_id", businessId)
      .lte("business_classes.event_date", range.to)
      .limit(20000),
    db.from("business_employees").select("professional_id, accepted_at").eq("business_id", businessId).not("accepted_at", "is", null),
  ]);
  if (classes.error || first.error || bookings.error || team.error) {
    console.error("[analytics-classes] Could not read the class numbers:", (classes.error ?? first.error ?? bookings.error ?? team.error)?.message);
    return { ok: false };
  }

  const ids: string[] = ((team.data ?? []) as { professional_id: string }[]).map((r) => r.professional_id);
  const names: Record<string, string> = {};
  if (ids.length) {
    const p = await db.from("public_profile_summary").select("id, first_name").in("id", ids);
    if (!p.error) for (const r of (p.data ?? []) as { id: string; first_name: string | null }[]) if (r.first_name?.trim()) names[r.id] = r.first_name.trim();
  }

  const bookingDates: Record<string, string> = {};
  const rows = (bookings.data ?? []) as BookingRow[];
  for (const b of rows) if (b.business_classes?.event_date) bookingDates[b.business_class_id] = b.business_classes.event_date;

  return {
    ok: true,
    raw: {
      sessions: ((classes.data ?? []) as ClassRow[]).map((c) => ({
        id: c.id,
        title: c.title,
        type: c.class_type,
        date: c.event_date,
        start: c.start_time,
        end: c.end_time,
        cap: c.max_capacity,
        proId: c.professional_id,
      })),
      bookings: rows.map((b) => ({ classId: b.business_class_id, clientId: b.client_id, createdAt: b.created_at })),
      bookingDates,
      firstEver: ((first.data ?? []) as { event_date: string }[])[0]?.event_date ?? null,
      names,
    },
  };
}
