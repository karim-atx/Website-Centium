import { supabase } from "../../../../lib/supabase/client";
import { fetchMyTeam } from "../../../services/business-team";
import { getCalendar } from "../../../services/calendar";
import { occurrenceDates } from "../../../components/calendar/occurrences";
import { addDays, previousRange, type OvBooking, type OvClass, type OvRaw, type OvReviews, type Range } from "./overviewModel";

// AN1 Overview reads, client side until the B15 readers exist (DI-01 / DI-04:
// business_period_stats, business_day). Only what the owner's policies
// already open: business_profiles (own row), business_classes,
// business_class_bookings (select_business_owner, with the payment status for
// "Payment owed"), business_members, business_offerings, store_listings,
// business_discounts, gyms + gym_review_summary() / gym_reviews_page() for
// Reputation, the owner's calendar_events for today's events, and the team
// names for "Class with …".
//
// NOT READ (no table or no owner policy yet): payments (B8: Revenue shows its
// drawn empty state), check-ins (B10), business_class_cancellations (no owner
// policy), client consent (B7). Realtime (B15 business_activity) is not on
// the stack: the page polls every 2 minutes instead (D2).

type Err = { message: string } | null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- embedded !inner filters and newer RPCs are not in the generated types
const db = supabase as any;

export type OverviewLoad = { ok: true; raw: OvRaw } | { ok: false; message: string };

const fail = (what: string, e: Err): OverviewLoad => {
  console.error(`[analytics-overview] Could not read ${what}:`, e?.message);
  return { ok: false, message: "Couldn't load your numbers." };
};

/**
 * Everything the Overview and Client outcomes show for a range. Classes and
 * bookings cover the previous period (deltas), the last 12 weeks (21-day
 * check-in rule) and today (the dial).
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
    members: [],
    productsCount: 0,
    discountsCount: 0,
    team: {},
    eventsToday: [],
    reviews: null,
  };
  const b = biz.data as { id: string; business_type: string; active: boolean; created_at: string } | null;
  if (!b) return { ok: true, raw: empty };
  const bid = b.id;

  const prev = previousRange(range);
  const lo = [prev.from, addDays(today, -84)].sort()[0];
  const hi = [range.to, today].sort()[1];

  type ClassRow = { id: string; title: string; event_date: string; start_time: string; end_time: string; max_capacity: number; professional_id: string | null };
  const [classes, first, next, bookings, members, offerings, listings, discounts, gyms, team, cal] = await Promise.all([
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
    db.from("business_members").select("accepted, invited_at, responded_at, ended_at").eq("business_id", bid),
    db.from("business_offerings").select("id").eq("business_id", bid),
    db.from("store_listings").select("id").eq("business_id", bid),
    db.from("business_discounts").select("id").eq("business_id", bid),
    db.from("gyms").select("id").eq("business_id", bid),
    fetchMyTeam(userId),
    getCalendar(userId),
  ]);
  if (classes.error) return fail("classes", classes.error);
  if (first.error) return fail("classes", first.error);
  if (next.error) return fail("classes", next.error);
  if (bookings.error) return fail("bookings", bookings.error);
  if (members.error) return fail("members", members.error);

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

  // Reputation: per venue (gym_review_summary), weighted; "new this period" from the newest reviews.
  let reviews: OvReviews | null = null;
  const gymIds = gyms.error ? [] : ((gyms.data ?? []) as { id: string }[]).map((g) => g.id);
  if (gyms.error) console.error("[analytics-overview] Could not read venues:", gyms.error.message);
  if (gymIds.length) {
    const sums = await Promise.all(gymIds.map((id) => db.rpc("gym_review_summary", { p_gym_id: id })));
    let total = 0;
    let weighted = 0;
    let failed = false;
    for (const s of sums) {
      if (s.error) {
        failed = true;
        continue;
      }
      const row = (Array.isArray(s.data) ? s.data[0] : s.data) as { average: number | string | null; total: number } | undefined;
      if (!row || !row.total) continue;
      total += row.total;
      weighted += Number(row.average ?? 0) * row.total;
    }
    if (!failed || total) {
      let inRange: number | null = 0;
      if (total) {
        const pages = await Promise.all(gymIds.map((id) => db.rpc("gym_reviews_page", { p_gym_id: id, p_sort: "recent", p_limit: 100, p_offset: 0 })));
        for (const pg of pages) {
          if (pg.error) {
            inRange = null;
            break;
          }
          for (const r of (pg.data ?? []) as { created_at: string }[]) {
            const d = r.created_at.slice(0, 10);
            if (d >= range.from && d <= range.to) inRange += 1;
          }
        }
      }
      reviews = { average: total ? weighted / total : 0, total, inRange };
    }
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
      members: ((members.data ?? []) as { accepted: boolean | null; invited_at: string; responded_at: string | null; ended_at: string | null }[]).map((m) => ({
        accepted: m.accepted,
        invitedAt: m.invited_at,
        respondedAt: m.responded_at,
        endedAt: m.ended_at,
      })),
      productsCount: okCount(offerings, "products") + okCount(listings, "listings"),
      discountsCount: okCount(discounts, "discounts"),
      team: team.ok ? Object.fromEntries(team.members.map((m) => [m.professionalId, m.name])) : {},
      eventsToday,
      reviews,
    },
  };
}
