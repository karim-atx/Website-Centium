import { supabase } from "../../../../lib/supabase/client";
import { fetchMyTeam } from "../../../services/business-team";
import { getCalendar } from "../../../services/calendar";
import { occurrenceDates } from "../../../components/calendar/occurrences";
import { mapMetrics } from "../../../services/reputation/mapping";
import { LISTING_PROMO_COLS, liveOnListing, type PromotionRow } from "../../../services/business-market/promoLogic";
import { activeAtWeekOf, fetchBusinessDay, fetchMemberGrowth, fetchPeriodStats, mondayOf, type Read } from "../../../services/business-analytics";
import { addDays, type OvBooking, type OvClass, type OvRaw, type OvReviews, type Range } from "./overviewModel";

// AN1 Overview reads. The headline is B15's: business_period_stats (DI-02)
// for the range and business_member_growth for Active members; the Live now
// clock reads business_day (DI-04). The rest is what the owner's policies
// already open: business_profiles (own row), business_classes and
// business_class_bookings (select_business_owner, with the payment status
// for "Payment owed": Client outcomes' attendance and review list, and the
// clock only while business_day is missing), business_offerings (the product
// table since B11; store_listings is no longer read, B16),
// promotions (B13, live and on the listing; business_discounts is no longer
// read, B16), business_review_metrics() (B14: every review of the
// business, venues or none) for Reputation, the owner's calendar_events for today's events, and the team
// names for "Class with …".
//
// Realtime (B15 business_activity) feeds the dashboard's activity list; this
// page polls every 2 minutes instead (D2).

type Err = { message: string } | null;
const db = supabase;

export type OverviewLoad = { ok: true; raw: OvRaw } | { ok: false; message: string };

const fail = (what: string, e: Err): OverviewLoad => {
  console.error(`[analytics-overview] Could not read ${what}:`, e?.message);
  return { ok: false, message: "Couldn't load your numbers." };
};

/**
 * Everything the Overview and Client outcomes show for a range. Classes and
 * bookings cover the range and the last 12 weeks (Client outcomes' 21-day
 * check-in rule); the readers bring the headline and today's dial.
 */
export async function loadOverview(userId: string, range: Range, today: string): Promise<OverviewLoad> {
  const biz = await db.from("business_profiles").select("id, business_type, active, created_at").eq("profile_id", userId).maybeSingle();
  if (biz.error) return fail("the business", biz.error);
  const empty: OvRaw = {
    business: null,
    classes: [],
    anyClass: false,
    nextClass: null,
    firstClassDate: null,
    bookings: [],
    stats: null,
    activeNow: null,
    day: null,
    productsCount: 0,
    discountsCount: 0,
    team: {},
    eventsToday: [],
    reviews: null,
  };
  const b = biz.data as { id: string; business_type: string; active: boolean; created_at: string } | null;
  if (!b) return { ok: true, raw: empty };
  const bid = b.id;

  const lo = [range.from, addDays(today, -84)].sort()[0];
  const hi = [range.to, today].sort()[1];
  // Active members at the end of the range: business_member_growth's weeks end with this week.
  const end = range.to < today ? range.to : today;
  const growthWeeks = Math.round((new Date(`${mondayOf(today)}T00:00:00`).getTime() - new Date(`${mondayOf(end)}T00:00:00`).getTime()) / (7 * 86_400_000)) + 1;

  type ClassRow = { id: string; title: string; event_date: string; start_time: string; end_time: string; max_capacity: number; professional_id: string | null };
  const [classes, first, next, bookings, stats, growth, day, offerings, discounts, allTime, inRangeM, team, cal] = await Promise.all([
    db
      .from("business_classes")
      .select("id, title, event_date, start_time, end_time, max_capacity, professional_id")
      .eq("business_id", bid)
      .gte("event_date", lo)
      .lte("event_date", hi)
      .order("event_date", { ascending: true })
      .limit(5000),
    db.from("business_classes").select("event_date").eq("business_id", bid).order("event_date", { ascending: true }).limit(1),
    db
      .from("business_classes")
      .select("id, title, event_date, start_time, end_time, max_capacity, professional_id")
      .eq("business_id", bid)
      .gt("event_date", today)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(1),
    db
      .from("business_class_bookings")
      .select("business_class_id, client_id, created_at, payment_status, price_agreed, business_classes!inner(business_id, event_date)")
      .eq("business_classes.business_id", bid)
      .gte("business_classes.event_date", lo)
      .lte("business_classes.event_date", hi)
      .limit(20000),
    fetchPeriodStats(bid, range.from, range.to, range.compare),
    fetchMemberGrowth(bid, Math.min(52, Math.max(1, growthWeeks))),
    fetchBusinessDay(bid, today),
    db.from("business_offerings").select("id").eq("business_id", bid),
    // promotions is newer than the generated types.
    (db as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => PromiseLike<{ data: unknown[] | null; error: Err }> } } })
      .from("promotions")
      .select(LISTING_PROMO_COLS)
      .eq("business_id", bid),
    // B14 business_review_metrics: all time up to the range end (the rating) and the range (new reviews).
    db.rpc("business_review_metrics" as never, { p_business_id: bid, p_from: "2000-01-01", p_to: range.to } as never),
    db.rpc("business_review_metrics" as never, { p_business_id: bid, p_from: range.from, p_to: range.to } as never),
    fetchMyTeam(userId),
    getCalendar(userId),
  ]);
  if (classes.error) return fail("classes", classes.error);
  if (first.error) return fail("classes", first.error);
  if (next.error) return fail("classes", next.error);
  if (bookings.error) return fail("bookings", bookings.error);
  // A reader that refuses (no permission) means no cell, never a 0; one that is missing keeps the drawn "–".
  const broken = ([stats, growth, day] as Read<unknown>[]).find((r) => !r.ok && !r.pending && !r.denied);
  if (broken && !broken.ok) return { ok: false, message: broken.message };

  const toClass = (r: ClassRow): OvClass => ({
    id: r.id,
    title: r.title,
    date: r.event_date,
    start: r.start_time.slice(0, 5),
    end: r.end_time.slice(0, 5),
    cap: r.max_capacity,
    professionalId: r.professional_id,
  });
  const firstDate = ((first.data ?? []) as { event_date: string }[])[0]?.event_date ?? null;

  // Reputation (B14): the rating and count up to the range end, and the reviews written inside the range.
  let reviews: OvReviews | null = null;
  if (allTime.error) console.error("[analytics-overview] Could not read the review metrics:", allTime.error.message);
  else {
    const all = mapMetrics((Array.isArray(allTime.data) ? allTime.data[0] : allTime.data) as Record<string, unknown> | null);
    const cur = inRangeM.error ? null : mapMetrics((Array.isArray(inRangeM.data) ? inRangeM.data[0] : inRangeM.data) as Record<string, unknown> | null);
    reviews = { average: all.average ?? 0, total: all.reviews, inRange: cur ? cur.reviews : null };
  }

  const eventsToday =
    cal.ok
      ? cal.events
          .filter((e) => !e.allDay && e.startTime && occurrenceDates(e, today, today).includes(today))
          .map((e) => ({ id: `${e.id}:${today}`, title: e.title, start: (e.startTime as string).slice(0, 5), end: (e.endTime ?? e.startTime ?? "00:00").slice(0, 5), location: e.location?.trim() || null }))
      : [];
  if (!cal.ok) console.error("[analytics-overview] Could not read the calendar:", cal.message);

  const okCount = (r: { data: unknown[] | null; error: Err }, what: string) => {
    if (r.error) {
      console.error(`[analytics-overview] Could not read ${what}:`, r.error.message);
      return 0;
    }
    return (r.data ?? []).length;
  };

  return {
    ok: true,
    raw: {
      business: { id: bid, type: b.business_type, active: !!b.active, createdAt: b.created_at },
      classes: ((classes.data ?? []) as ClassRow[]).map(toClass),
      anyClass: !!firstDate,
      nextClass: ((next.data ?? []) as ClassRow[]).map(toClass)[0] ?? null,
      firstClassDate: firstDate,
      bookings: ((bookings.data ?? []) as { business_class_id: string; client_id: string; created_at: string; payment_status: string | null; price_agreed: number | string | null }[]).map(
        (r): OvBooking => ({ classId: r.business_class_id, clientId: r.client_id, createdAt: r.created_at, paymentStatus: r.payment_status, priceAgreed: r.price_agreed === null || r.price_agreed === "" ? null : Number(r.price_agreed) })
      ),
      stats: stats.ok ? stats.value : stats.denied ? {} : null,
      activeNow: growth.ok ? activeAtWeekOf(growth.value, end) : null,
      day: day.ok ? day.value : day.denied ? [] : null,
      productsCount: okCount(offerings, "products"),
      discountsCount: discounts.error ? (console.error("[analytics-overview] Could not read promotions:", discounts.error.message), 0) : liveOnListing((discounts.data ?? []) as unknown as Pick<PromotionRow, "starts_on" | "ends_on" | "paused_at" | "ended_at" | "show_on_listing">[], today),
      team: team.ok ? Object.fromEntries(team.members.map((m) => [m.professionalId, m.name])) : {},
      eventsToday,
      reviews,
    },
  };
}
