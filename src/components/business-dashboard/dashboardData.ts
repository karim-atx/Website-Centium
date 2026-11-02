import { supabase } from "../../../lib/supabase/client";
import { fetchMyTeam } from "../../services/business-team";
import { fetchMyMembers } from "../../services/business-members";
import { getCalendar } from "../../services/calendar";
import { fetchClassRoster } from "../../services/venues/console";
import { fetchBusyTimes, fetchDeskEntries, fetchDeskSummary, fetchTodayHours, isMissingDesk, fetchRenewalsDue } from "../../services/front-desk";
import { toChase } from "../../services/front-desk/frontDeskLogic";
import type { DashGym } from "./gymToday";
import { localDayOf, shiftDate, todayLocal } from "../../utils/date";
import { startOfWeekISO } from "../../utils/week";
import type { ActivityRow, DashBusiness, DashClass, DashLoad, DashOrder, DashRaw, DashStore } from "./dashboardTypes";
import { kindOf, toGlance } from "./dashboardModel";
import { toAttentionRows } from "./attention";
import { ACTIVITY_PAGE, toActivityRow } from "./activityFeed";
import { LISTING_PROMO_COLS, liveOnListing, type PromotionRow } from "../../services/business-market/promoLogic";
import { t } from "../../i18n/core";

// THE DASHBOARD'S READS, all real rows on the local stack (no mock figures).
//
// Read straight from the tables the owner's policies already open:
// business_profiles (own row), business_classes, business_class_bookings
// (select_business_owner), business_members,
// membership_plans, business_offerings (the product table since B11;
// store_listings is no longer read, B16), promotions (B13: live and on the
// listing; business_discounts is no longer read, B16),
// my_business_seat_capacity(), gyms.access_qr, business_store_settings (B5),
// onboarding_progress (B5, the setup card's dismissal), venue_class_roster()
// for today's waitlists, venue_members() for renewals due.
//
// A store's orders and low stock are B11 (store_orders_page, store_low_stock,
// loadStore below), read only for a store type. A gym's entries are B10
// (desk_summary, desk_entries, venue_busy_times, gym_check_ins; loadGym
// below), read only for a gym type at the selected venue.
//
// B15 (DI-01, DI-03, DI-05): business_glance (the Today boxes, today and the
// same weekday last week), business_attention (the bell), and the activity
// feed (business_recent_activity for the first page and the 2-minute poll,
// Realtime on business_activity in useActivityFeed.ts, the totals tiles from
// the table itself). Each returns only what the caller may hold.

type Err = { message: string } | null;
type Res<T> = PromiseLike<{ data: T | null; error: Err; count?: number | null }>;
interface Q<T> extends Res<T[]> {
  select: (c: string, o?: { count?: "exact"; head?: boolean }) => Q<T>;
  eq: (col: string, v: unknown) => Q<T>;
  in: (col: string, v: unknown[]) => Q<T>;
  gte: (col: string, v: string) => Q<T>;
  lte: (col: string, v: string) => Q<T>;
  order: (col: string, o?: { ascending?: boolean }) => Q<T>;
  maybeSingle: () => Res<T>;
}
interface Loose {
  from: <T>(t: string) => Q<T> & {
    update: (row: Record<string, unknown>) => { eq: (col: string, v: string) => Res<unknown> };
    upsert: (row: Record<string, unknown>, o?: { onConflict?: string }) => Res<unknown>;
    insert: (row: Record<string, unknown>) => Res<unknown>;
  };
  rpc: <T>(fn: string, args?: Record<string, unknown>) => Res<T>;
}
const db = supabase as unknown as Loose;

export type { DashBusiness, DashBooking, DashClass, DashLoad, DashMember, DashOrder, DashRaw, DashSeats, DashStore } from "./dashboardTypes";

/** The dashboard's onboarding_progress item for the setup card (BU4-08). */
export const SETUP_ITEM = "dashboard_setup";

const ok = <T>(r: { data: T | null; error: Err }, what: string, partial: string[], fallback: T): T => {
  if (r.error) {
    console.error(`[dashboard] Could not read ${what}:`, r.error.message);
    partial.push(what);
    return fallback;
  }
  return r.data ?? fallback;
};


/**
 * Everything the Dashboard shows, in one pass. The business row and the
 * classes are required (a failure is the inline error with Retry); every other
 * read degrades on its own.
 */
export async function loadDashboard(userId: string, gymId: string | null): Promise<DashLoad> {
  const partial: string[] = [];
  const bizRes = await db
    .from<{ id: string; business_name: string; business_type: string; active: boolean }>("business_profiles")
    .select("id, business_name, business_type, active")
    .eq("profile_id", userId)
    .maybeSingle();
  if (bizRes.error) {
    console.error("[dashboard] Could not read the business:", bizRes.error.message);
    return { ok: false, message: t("Couldn't load your dashboard.") };
  }
  const b = bizRes.data;
  const business: DashBusiness | null = b ? { id: b.id, name: b.business_name, type: b.business_type, active: !!b.active } : null;
  const empty: DashRaw = {
    business,
    classes: [],
    bookings: [],
    members: [],
    plansCount: 0,
    productsCount: 0,
    liveProductsCount: 0,
    discountsCount: 0,
    seats: null,
    team: {},
    events: [],
    accessQr: false,
    storeDeliveryOrPickup: false,
    dismissed: false,
    waitlists: {},
    renewalsDue: null,
    store: null,
    gym: null,
    glance: null,
    glanceLastWeek: null,
    attention: null,
    partial,
  };
  if (!business) return { ok: true, raw: empty };
  const bid = business.id;

  type ClassRow = { id: string; title: string; event_date: string; start_time: string; end_time: string; max_capacity: number; professional_id: string | null; created_at: string };
  const classesRes = await db
    .from<ClassRow>("business_classes")
    .select("id, title, event_date, start_time, end_time, max_capacity, professional_id, created_at")
    .eq("business_id", bid)
    .order("event_date", { ascending: true });
  if (classesRes.error) {
    console.error("[dashboard] Could not read classes:", classesRes.error.message);
    return { ok: false, message: t("Couldn't load your dashboard.") };
  }
  const classes: DashClass[] = (classesRes.data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    date: r.event_date,
    start: r.start_time.slice(0, 5),
    end: r.end_time.slice(0, 5),
    cap: r.max_capacity,
    professionalId: r.professional_id,
    createdAt: r.created_at,
  }));

  // Bookings for classes from 5 weeks back to 2 weeks ahead: this week, last
  // week, the activity window (30 days) and the attention look-ahead.
  const today = todayLocal();
  const from = shiftDate(startOfWeekISO(today), -35);
  const to = shiftDate(today, 14);
  const windowIds = classes.filter((k) => k.date >= from && k.date <= to).map((k) => k.id);
  const todayIds = classes.filter((k) => k.date === today).map((k) => k.id);

  type GlanceRow = { metric: string; value: number | string | null; early: boolean | null };
  type AttentionRaw = { item: string; count: number | string | null; severity: string | null };
  const [bookingsRes, membersRes, glanceRes, glanceLastRes, attentionRes, plansRes, offeringsRes, discountsRes, seatsRes, gymsRes, storeRes, progressRes, teamRes, calRes, rosters, venueMembers, named] =
    await Promise.all([
      windowIds.length
        ? db.from<{ business_class_id: string; client_id: string; created_at: string }>("business_class_bookings").select("business_class_id, client_id, created_at").in("business_class_id", windowIds)
        : Promise.resolve({ data: [], error: null }),
      db
        .from<{ id: string; member_id: string; membership_plan_id: string | null; invited_at: string; responded_at: string | null; accepted: boolean | null; ended_at: string | null }>("business_members")
        .select("id, member_id, membership_plan_id, invited_at, responded_at, accepted, ended_at")
        .eq("business_id", bid),
      db.rpc<GlanceRow[]>("business_glance", { p_business_id: bid, p_date: today }),
      db.rpc<GlanceRow[]>("business_glance", { p_business_id: bid, p_date: shiftDate(today, -7) }),
      db.rpc<AttentionRaw[]>("business_attention", { p_business_id: bid }),
      db.from<{ id: string; name: string }>("membership_plans").select("id, name").eq("business_id", bid),
      db.from<{ id: string; visible: boolean }>("business_offerings").select("id, visible").eq("business_id", bid),
      db.from<Pick<PromotionRow, "starts_on" | "ends_on" | "paused_at" | "ended_at" | "show_on_listing">>("promotions").select(LISTING_PROMO_COLS).eq("business_id", bid),
      db.rpc<{ business_id: string; seat_blocks: number; seats_per_unit: number; seats_total: number; seats_used: number; seats_invited: number }[]>("my_business_seat_capacity"),
      db.from<{ access_qr: boolean | null }>("gyms").select("access_qr").eq("business_id", bid),
      db.from<{ delivery_enabled: boolean | null; pickup_enabled: boolean | null }>("business_store_settings").select("delivery_enabled, pickup_enabled").eq("business_id", bid),
      db.from<{ dismissed_at: string | null }>("onboarding_progress").select("dismissed_at").eq("business_id", bid).eq("item", SETUP_ITEM),
      fetchMyTeam(userId),
      getCalendar(userId),
      Promise.all(todayIds.map(async (id) => [id, await fetchClassRoster(id)] as const)),
      // B7 MB-05: the server's renewals list (venue_renewals_due), not a client filter.
      gymId ? fetchRenewalsDue(gymId, 7) : Promise.resolve(null),
      // B7 / Q-05: the gym block's entry labels (a shared first name or "Member #0042"; the table read above has ids only).
      fetchMyMembers(bid, { limit: 200 }),
    ]);
  const labels = new Map(named.ok ? named.members.map((m) => [m.id, m.label ?? null] as const) : []);

  const bookings = ok(bookingsRes, "bookings", partial, [] as { business_class_id: string; client_id: string; created_at: string }[]).map((r) => ({
    classId: r.business_class_id,
    clientId: r.client_id,
    createdAt: r.created_at,
  }));
  const members = ok(membersRes, "members", partial, []).map((r) => ({
    id: r.id,
    memberId: r.member_id,
    label: labels.get(r.id) ?? null,
    planId: r.membership_plan_id,
    invitedAt: r.invited_at,
    respondedAt: r.responded_at,
    accepted: r.accepted,
    endedAt: r.ended_at,
  }));
  // B15: a failed read stays null (pending, never zero); see classGlance / storeToday / AttentionPanel.
  const glance = glanceRes.error ? null : toGlance(glanceRes.data);
  const glanceLastWeek = glanceLastRes.error ? null : toGlance(glanceLastRes.data);
  const attention = attentionRes.error ? null : toAttentionRows(attentionRes.data);
  if (glanceRes.error) {
    console.error("[dashboard] Could not read the glance:", glanceRes.error.message);
    partial.push("today");
  }
  if (attentionRes.error) {
    console.error("[dashboard] Could not read attention:", attentionRes.error.message);
    partial.push("attention");
  }
  const plans = ok(plansRes, "membership plans", partial, []);
  const seatRow = ok(seatsRes, "seats", partial, []).find((r) => r.business_id === bid);
  const waitlists: Record<string, number> = {};
  for (const [id, r] of rosters) {
    if (r.ok) waitlists[id] = r.value.filter((e) => e.kind === "waitlist").length;
    else partial.push("waitlists");
  }
  let renewalsDue: number | null = null;
  if (venueMembers) {
    if (venueMembers.ok) {
      // Who still needs doing: already renewed and ending-at-period-end are not chased.
      renewalsDue = toChase(venueMembers.value).length;
    } else partial.push("renewals");
  }
  const store = ok(storeRes, "store settings", partial, []);

  return {
    ok: true,
    raw: {
      business,
      classes,
      bookings,
      members,
      plansCount: plans.length,
      productsCount: ok(offeringsRes, "products", partial, []).length,
      // DA3-001 #5: Live listings counts the products shown on Explore.
      liveProductsCount: ok(offeringsRes, "products", partial, [] as { visible: boolean }[]).filter((o) => o.visible).length,
      discountsCount: liveOnListing(ok(discountsRes, "promotions", partial, []), today),
      seats: seatRow ? { blocks: seatRow.seat_blocks, perUnit: seatRow.seats_per_unit, capacity: seatRow.seats_total, used: Number(seatRow.seats_used) } : null,
      team: teamRes.ok ? Object.fromEntries(teamRes.members.map((m) => [m.professionalId, m.name])) : {},
      events: calRes.ok ? calRes.events : [],
      accessQr: ok(gymsRes, "venues", partial, []).some((g) => !!g.access_qr),
      storeDeliveryOrPickup: store.some((s) => !!s.delivery_enabled || !!s.pickup_enabled),
      dismissed: ok(progressRes, "setup progress", partial, []).some((r) => !!r.dismissed_at),
      waitlists,
      renewalsDue,
      store: kindOf(business.type, classes.length > 0) === "store" ? await loadStore(bid, partial) : null,
      gym: gymId && kindOf(business.type, classes.length > 0) === "gym" ? await loadGym(gymId, today, partial) : null,
      glance,
      glanceLastWeek,
      attention,
      partial,
    },
  };
}

/** Missing on this database (B11 not shipped): the store keeps its "No orders yet" card. */
const notShipped = (e: Err & { code?: string }) => !!e && ["42883", "42P01", "PGRST202", "PGRST205"].includes(e.code ?? "");

/** B11 · the Today block's orders (labels masked by the server) and low stock (under 5 left). */
async function loadStore(bid: string, partial: string[]): Promise<DashStore | null> {
  type PageRow = { order_id: string; order_number: number; fulfilment: DashOrder["fulfilment"]; item_count: number; customer_label: string | null; status: DashOrder["status"]; placed_at: string; total_count: number };
  type LowRow = { offering_id: string; title: string; stock: number };
  const [page, low, cats] = await Promise.all([
    db.rpc<PageRow[]>("store_orders_page", { p_business_id: bid, p_status: null, p_search: null, p_limit: 200, p_offset: 0 }),
    db.rpc<LowRow[]>("store_low_stock", { p_business_id: bid, p_below: 5 }),
    db.from<{ id: string; product_categories: { name: string } | null }>("business_offerings").select("id, product_categories(name)").eq("business_id", bid),
  ]);
  if (page.error) {
    if (!notShipped(page.error)) {
      console.error("[dashboard] Could not read orders:", page.error.message);
      partial.push("orders");
    }
    return null;
  }
  const category = new Map((cats.error ? [] : cats.data ?? []).map((r) => [r.id, r.product_categories?.name ?? null]));
  if (low.error) partial.push("low stock");
  const rows = page.data ?? [];
  return {
    totalOrders: Number(rows[0]?.total_count ?? 0),
    orders: rows.map((r) => ({ id: r.order_id, number: r.order_number, fulfilment: r.fulfilment, itemCount: Number(r.item_count ?? 0), label: r.customer_label ?? t("Guest"), status: r.status, placedAt: r.placed_at })),
    lowStock: (low.error ? [] : low.data ?? []).map((r) => ({ id: r.offering_id, name: r.title, stock: Number(r.stock), category: category.get(r.offering_id) ?? null })),
  };
}

/**
 * B10 · the Gym Today block and Entries gauge at the selected venue:
 * desk_summary, desk_entries, venue_busy_times (gated front_desk / members)
 * and the venue's admitted check-ins since last Monday (gym_check_ins, the
 * desk reads its venue's rows; "at" only, counted per local day). Missing
 * B10 (or no front_desk access) keeps the drawn empty card.
 */
async function loadGym(gymId: string, today: string, partial: string[]): Promise<DashGym | null> {
  const since = shiftDate(startOfWeekISO(today), -7);
  const [sum, ent, busy, hours, days] = await Promise.all([
    fetchDeskSummary(gymId),
    fetchDeskEntries(gymId),
    fetchBusyTimes(gymId, 4),
    fetchTodayHours(gymId),
    db.from<{ at: string }>("gym_check_ins").select("at").eq("gym_id", gymId).eq("result", "in").gte("at", new Date(since + "T00:00:00").toISOString()),
  ]);
  if (isMissingDesk(sum)) return null;
  if (!sum.ok || !ent.ok || !busy.ok) {
    // ATX03: this seat has no front desk access, the block stays as drawn empty.
    if (!(!sum.ok && sum.code === "ATX03")) partial.push("entries");
    return null;
  }
  const perDay: Record<string, number> = {};
  if (days.error) partial.push("entries this week");
  else for (const r of days.data ?? []) perDay[localDayOf(r.at)] = (perDay[localDayOf(r.at)] ?? 0) + 1;
  return { summary: sum.value, entries: ent.value, busy: busy.value, days: perDay, todayHours: hours };
}

/** Hides the setup card for this business (onboarding_progress.dismissed_at, B5). */
export async function dismissSetup(businessId: string): Promise<boolean> {
  // Not an upsert: the unique index on (business_id, item) is partial (WHERE
  // business_id IS NOT NULL), which ON CONFLICT cannot name through PostgREST.
  const at = new Date().toISOString();
  const found = await db.from<{ id: string }>("onboarding_progress").select("id").eq("business_id", businessId).eq("item", SETUP_ITEM);
  if (found.error) {
    console.error("[dashboard] Could not dismiss the setup card:", found.error.message);
    return false;
  }
  const existing = found.data?.[0];
  const { error } = existing
    ? await db.from("onboarding_progress").update({ dismissed_at: at }).eq("id", existing.id)
    : await db.from("onboarding_progress").insert({ business_id: businessId, item: SETUP_ITEM, dismissed_at: at });
  if (error) console.error("[dashboard] Could not dismiss the setup card:", error.message);
  return !error;
}

// ---- B15 · the activity feed (DI-03) -------------------------------------------

export type ActivityLoad = { ok: true; rows: ActivityRow[] } | { ok: false; message: string };

/**
 * business_recent_activity(business, 200): the first page before Realtime
 * connects, and the 2-minute polling fallback. Each kind only to its
 * permission (the server filters per row, as the RLS policy does).
 */
export async function fetchRecentActivity(businessId: string): Promise<ActivityLoad> {
  const { data, error } = await db.rpc<Parameters<typeof toActivityRow>[0][]>("business_recent_activity", { p_business_id: businessId, p_limit: ACTIVITY_PAGE });
  if (error) {
    console.error("[dashboard] Could not read recent activity:", error.message);
    return { ok: false, message: t("Couldn't load recent activity.") };
  }
  return { ok: true, rows: (data ?? []).map(toActivityRow).filter((r): r is ActivityRow => r !== null) };
}

/**
 * The totals tiles' rows: every join, end and booking since last week's
 * Monday, read from business_activity itself (RLS: each kind to its
 * permission). Uncapped by the feed's 200-row page, so a busy week counts in full.
 */
export async function fetchActivityTotals(businessId: string, since: string): Promise<{ kind: ActivityRow["kind"]; at: string }[] | null> {
  const { data, error } = await db
    .from<{ kind: ActivityRow["kind"]; at: string }>("business_activity")
    .select("kind, at")
    .eq("business_id", businessId)
    .in("kind", ["join", "end", "booking"])
    .gte("at", new Date(`${since}T00:00:00`).toISOString())
    .order("at", { ascending: false });
  if (error) {
    console.error("[dashboard] Could not read this week's totals:", error.message);
    return null;
  }
  return data ?? [];
}
