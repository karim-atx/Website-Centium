import { supabase } from "../../../lib/supabase/client";
import { fetchMyTeam } from "../../services/business-team";
import { getCalendar } from "../../services/calendar";
import { fetchClassRoster, fetchVenueMembers } from "../../services/venues/console";
import { shiftDate, todayLocal } from "../../utils/date";
import { startOfWeekISO } from "../../utils/week";
import type { DashBusiness, DashClass, DashLoad, DashRaw } from "./dashboardTypes";

// THE DASHBOARD'S READS, all real rows on the local stack (no mock figures).
//
// Read straight from the tables the owner's policies already open:
// business_profiles (own row), business_classes, business_class_bookings
// (select_business_owner), business_members, business_member_codes,
// membership_plans, business_offerings, store_listings, business_discounts,
// my_business_seat_capacity(), gyms.access_qr, business_store_settings (B5),
// onboarding_progress (B5, the setup card's dismissal), venue_class_roster()
// for today's waitlists, venue_members() for renewals due.
//
// NOT HERE, because the tables do not exist yet (BACKEND_REQUIREMENTS-v6):
// check-ins (BU4-04), orders / stock (BU4-05), renewal linkage (BU4-06),
// payments ledger (BU4-07), realtime publication for the activity feed
// (BU4-09), the attention RPC (BU4-10). Those blocks show their drawn pending
// state instead.

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

export type { DashBusiness, DashBooking, DashClass, DashCode, DashLoad, DashMember, DashRaw, DashSeats } from "./dashboardTypes";

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
    .from<{ id: string; business_name: string; business_type: string; active: boolean; perk: string | null }>("business_profiles")
    .select("id, business_name, business_type, active, perk")
    .eq("profile_id", userId)
    .maybeSingle();
  if (bizRes.error) {
    console.error("[dashboard] Could not read the business:", bizRes.error.message);
    return { ok: false, message: "Couldn't load your dashboard." };
  }
  const b = bizRes.data;
  const business: DashBusiness | null = b ? { id: b.id, name: b.business_name, type: b.business_type, active: !!b.active, perk: b.perk } : null;
  const empty: DashRaw = {
    business,
    classes: [],
    bookings: [],
    members: [],
    planNames: {},
    codes: [],
    plansCount: 0,
    productsCount: 0,
    discountsCount: 0,
    seats: null,
    team: {},
    events: [],
    accessQr: false,
    storeDeliveryOrPickup: false,
    dismissed: false,
    waitlists: {},
    renewalsDue: null,
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
    return { ok: false, message: "Couldn't load your dashboard." };
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

  const [bookingsRes, membersRes, codesRes, plansRes, offeringsRes, listingsRes, discountsRes, seatsRes, gymsRes, storeRes, progressRes, teamRes, calRes, rosters, venueMembers] =
    await Promise.all([
      windowIds.length
        ? db.from<{ business_class_id: string; client_id: string; created_at: string }>("business_class_bookings").select("business_class_id, client_id, created_at").in("business_class_id", windowIds)
        : Promise.resolve({ data: [], error: null }),
      db
        .from<{ id: string; member_id: string; membership_plan_id: string | null; invited_at: string; responded_at: string | null; accepted: boolean | null; ended_at: string | null }>("business_members")
        .select("id, member_id, membership_plan_id, invited_at, responded_at, accepted, ended_at")
        .eq("business_id", bid),
      db.from<{ redeemed: boolean; redeemed_by: string | null; expires_at: string }>("business_member_codes").select("redeemed, redeemed_by, expires_at").eq("business_id", bid),
      db.from<{ id: string; name: string }>("membership_plans").select("id, name").eq("business_id", bid),
      db.from<{ id: string }>("business_offerings").select("id").eq("business_id", bid),
      db.from<{ id: string }>("store_listings").select("id").eq("business_id", bid),
      db.from<{ id: string }>("business_discounts").select("id").eq("business_id", bid),
      db.rpc<{ business_id: string; seat_blocks: number; seats_per_unit: number; capacity: number; seats_used: number }[]>("my_business_seat_capacity"),
      db.from<{ access_qr: boolean | null }>("gyms").select("access_qr").eq("business_id", bid),
      db.from<{ delivery_enabled: boolean | null; pickup_enabled: boolean | null }>("business_store_settings").select("delivery_enabled, pickup_enabled").eq("business_id", bid),
      db.from<{ dismissed_at: string | null }>("onboarding_progress").select("dismissed_at").eq("business_id", bid).eq("item", SETUP_ITEM),
      fetchMyTeam(userId),
      getCalendar(userId),
      Promise.all(todayIds.map(async (id) => [id, await fetchClassRoster(id)] as const)),
      gymId ? fetchVenueMembers(gymId, "active", 200, 0) : Promise.resolve(null),
    ]);

  const bookings = ok(bookingsRes, "bookings", partial, [] as { business_class_id: string; client_id: string; created_at: string }[]).map((r) => ({
    classId: r.business_class_id,
    clientId: r.client_id,
    createdAt: r.created_at,
  }));
  const members = ok(membersRes, "members", partial, []).map((r) => ({
    id: r.id,
    memberId: r.member_id,
    planId: r.membership_plan_id,
    invitedAt: r.invited_at,
    respondedAt: r.responded_at,
    accepted: r.accepted,
    endedAt: r.ended_at,
  }));
  const codes = ok(codesRes, "member codes", partial, []).map((r) => ({ redeemed: !!r.redeemed, redeemedBy: r.redeemed_by, expiresAt: r.expires_at }));
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
      const limit = shiftDate(today, 7);
      renewalsDue = venueMembers.value.members.filter((m) => m.expiresOn && m.expiresOn >= today && m.expiresOn <= limit).length;
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
      planNames: Object.fromEntries(plans.map((p) => [p.id, p.name])),
      codes,
      plansCount: plans.length,
      productsCount: ok(offeringsRes, "products", partial, []).length + ok(listingsRes, "listings", partial, []).length,
      discountsCount: ok(discountsRes, "discounts", partial, []).length,
      seats: seatRow ? { blocks: seatRow.seat_blocks, perUnit: seatRow.seats_per_unit, capacity: seatRow.capacity, used: Number(seatRow.seats_used) } : null,
      team: teamRes.ok ? Object.fromEntries(teamRes.members.map((m) => [m.professionalId, m.name])) : {},
      events: calRes.ok ? calRes.events : [],
      accessQr: ok(gymsRes, "venues", partial, []).some((g) => !!g.access_qr),
      storeDeliveryOrPickup: store.some((s) => !!s.delivery_enabled || !!s.pickup_enabled),
      dismissed: ok(progressRes, "setup progress", partial, []).some((r) => !!r.dismissed_at),
      waitlists,
      renewalsDue,
      partial,
    },
  };
}

/** business_profiles.active: the Explore listing switch (owner's UPDATE grant). */
export async function saveListingActive(businessId: string, active: boolean): Promise<{ ok: boolean; message?: string }> {
  const { error } = await db.from("business_profiles").update({ active }).eq("id", businessId);
  if (error) {
    console.error("[dashboard] Could not change the listing:", error.message);
    return { ok: false, message: "Couldn't change your listing. Try again." };
  }
  return { ok: true };
}

/** business_profiles.perk: the perk on the Explore listing (V6-88: moves to MA1 Offers). */
export async function saveListingPerk(businessId: string, perk: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await db.from("business_profiles").update({ perk: perk.trim() || null }).eq("id", businessId);
  if (error) {
    console.error("[dashboard] Could not save the perk:", error.message);
    return { ok: false, message: "Couldn't save the perk. Try again." };
  }
  return { ok: true };
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
