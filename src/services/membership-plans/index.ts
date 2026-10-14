import { supabase } from "../../../lib/supabase/client";
import { resolveMyBusinessId } from "../business-profile";
import { formatPrice, parsePrice } from "../../utils/price";
import { fetchMyVenues, fetchVenueMembers } from "../venues/console";

// A business's membership plans: the real membership_plans rows.
//
// WHAT THIS REPLACES. `businessListing.membershipPlans` was an array inside a
// usePersistentState object, SEEDED WITH TWO FAKE PLANS — "Monthly Membership
// $45" and "Day Pass $8" — that every business account has been showing since
// onboarding without anyone having created them. The old Gym tab let an owner
// list, add, edit and delete them; none of it left the device, so the plans a
// gym actually sells and the plans Explore could read had never been the same
// thing.
//
// THE ONLY ONE OF THE FOUR CATALOG TABLES WITH A REAL EDIT PATH. Classes,
// offerings and discounts are create-and-delete on every screen that touches
// them today; the plan sheet (pages/business-ops/plans) edits, so this service
// is the only one that needs updatePlan. The UPDATE grant covers exactly
// name, price, billing and payment_type — id, business_id, created_at and
// updated_at are not in it, and are never in a payload here.

import type { MembershipBilling, MembershipPlanRow, PlanKind } from "./types";
export type { MembershipBilling, MembershipPlanRow, PlanKind, PlanStatus } from "./types";

export interface PlanDraft {
  name: string;
  price: string;
  billing: MembershipBilling;
  paymentType: string;
}

export type PlansResult =
  | { ok: true; businessId: string | null; plans: MembershipPlanRow[] }
  | { ok: false; message: string };

export type WriteResult = { ok: true; plan: MembershipPlanRow } | { ok: false; message: string };

const COLUMNS = "id, name, price, billing, payment_type";

type Row = {
  id: string;
  name: string;
  /** PostgREST returns `numeric` as a string on the way out. */
  price: number | string;
  billing: MembershipBilling;
  payment_type: string | null;
};

/**
 * What goes INTO the column, which is not what comes out of it: a write sends
 * a number, a read receives a string. One shared Row type for both would make
 * the insert accept a string the column will not take.
 */
type WriteRow = {
  name: string;
  price: number;
  billing: MembershipBilling;
  payment_type: string | null;
};

/** V6-46: "Card" and empty payment types read (and save) as Cash. */
export function normalisePaymentType(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v || /^card$/i.test(v)) return "Cash";
  return v;
}

export const planKindOf = (billing: MembershipBilling): PlanKind => (billing === "daily" ? "day_pass" : "membership");

const toPlan = (r: Row): MembershipPlanRow => ({
  id: r.id,
  name: r.name,
  price: formatPrice(r.price),
  priceValue: Number(r.price) || 0,
  billing: r.billing,
  paymentType: normalisePaymentType(r.payment_type),
  kind: planKindOf(r.billing),
  status: "active",
});

/**
 * The content columns, or a message saying why the draft cannot be written.
 *
 * PRICE IS NOT NULLABLE HERE, unlike the other three tables: the column is
 * NOT NULL with a `>= 0` check, and the plan sheet already refuses to save a
 * plan without one. An unparseable price is refused with something an owner
 * can act on instead of being coerced to zero — a plan silently priced at
 * nothing is worse than a plan that would not save.
 */
function toRow(draft: PlanDraft): { ok: true; row: WriteRow } | { ok: false; message: string } {
  const name = draft.name.trim();
  if (!name) return { ok: false, message: "Give the plan a name." };

  const price = parsePrice(draft.price);
  if (!price.ok || price.value === null) {
    return { ok: false, message: "Enter the price as a number, for example 45 or $45." };
  }

  return {
    ok: true,
    row: { name, price: price.value, billing: draft.billing, payment_type: normalisePaymentType(draft.paymentType) },
  };
}

/** Every plan this account's business sells. */
export async function fetchMyPlans(userId: string): Promise<PlansResult> {
  const business = await resolveMyBusinessId(userId);
  if (!business.ok) {
    return { ok: false, message: "Couldn't load your plans. Check your connection and try again." };
  }
  if (!business.id) return { ok: true, businessId: null, plans: [] };

  const { data, error } = await supabase
    .from("membership_plans")
    .select(COLUMNS)
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[membership-plans] Could not read plans:", error.message);
    return { ok: false, message: "Couldn't load your plans. Check your connection and try again." };
  }
  return { ok: true, businessId: business.id, plans: (data ?? []).map((r) => toPlan(r as Row)) };
}

export async function createPlan(businessId: string, draft: PlanDraft): Promise<WriteResult> {
  const built = toRow(draft);
  if (!built.ok) return built;

  const { data, error } = await supabase
    .from("membership_plans")
    .insert({ business_id: businessId, ...built.row })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    console.error("[membership-plans] Could not create the plan:", error?.message);
    return { ok: false, message: "Couldn't add the plan. Try again." };
  }
  return { ok: true, plan: toPlan(data as Row) };
}

/**
 * Edits a plan in place.
 *
 * FILTERED BY id ALONE, and that is not a gap: the UPDATE policy already
 * requires the row's business to belong to auth.uid(), so a plan that is not
 * this owner's matches nothing and changes nothing. Adding business_id to the
 * filter would read as the thing keeping it safe, which it is not.
 */
export async function updatePlan(planId: string, draft: PlanDraft): Promise<WriteResult> {
  const built = toRow(draft);
  if (!built.ok) return built;

  const { data, error } = await supabase
    .from("membership_plans")
    .update(built.row)
    .eq("id", planId)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    console.error("[membership-plans] Could not update the plan:", error?.message);
    return { ok: false, message: "Couldn't save the plan. Try again." };
  }
  return { ok: true, plan: toPlan(data as Row) };
}

/**
 * Deletes a plan. gym_memberships.plan_id is ON DELETE RESTRICT, so a plan
 * somebody has bought cannot be deleted: that refusal (23503) comes back as
 * `inUse` so the screen can say why. Archive (B7) replaces delete once the
 * status column exists.
 */
export async function deletePlan(planId: string): Promise<{ ok: boolean; message?: string; inUse?: boolean }> {
  const { error } = await supabase.from("membership_plans").delete().eq("id", planId);
  if (error) {
    console.error("[membership-plans] Could not delete the plan:", error.message);
    if (error.code === "23503") {
      return { ok: false, inUse: true, message: "People have bought this plan, so it can't be deleted." };
    }
    return { ok: false, message: "Couldn't delete the plan. Try again." };
  }
  return { ok: true };
}

/** One active member of a plan, as the venue readers return them (first name only). */
export interface PlanMember {
  membershipId: string;
  firstName: string;
  isMinor: boolean;
  startedOn: string;
  expiresOn: string | null;
}

/**
 * Active members per plan name across the business's venues (my_venues and
 * venue_members, the venue console readers; insiders only). venue_members
 * names the plan, not its id, so plans are matched by name; a name two plans
 * share is ambiguous and left out by the caller. Null when no venue could be
 * read (the figures then show "–"). Per-plan figures by id, bookings and
 * deltas are BU2-12 (B7).
 */
export async function fetchMembersByPlanName(businessId: string): Promise<Map<string, PlanMember[]> | null> {
  const venues = await fetchMyVenues();
  if (!venues.ok) return null;
  const ids = venues.value.filter((v) => v.businessId === businessId).map((v) => v.gymId);
  const pages = await Promise.all(ids.map((id) => fetchVenueMembers(id, "active", 200, 0)));
  const byName = new Map<string, PlanMember[]>();
  let read = ids.length === 0;
  for (const page of pages) {
    if (!page.ok) continue;
    read = true;
    for (const m of page.value.members) {
      const list = byName.get(m.planName) ?? [];
      list.push({ membershipId: m.membershipId, firstName: m.firstName, isMinor: m.isMinor, startedOn: m.startedOn, expiresOn: m.expiresOn });
      byName.set(m.planName, list);
    }
  }
  return read ? byName : null;
}
