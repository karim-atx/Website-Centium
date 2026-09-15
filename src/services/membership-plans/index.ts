import { supabase } from "../../../lib/supabase/client";
import type { Database } from "../../../lib/supabase/database.types";
import { resolveMyBusinessId } from "../business-profile";
import { formatPrice, parsePrice } from "../../utils/price";

// A business's membership plans: the real membership_plans rows.
//
// WHAT THIS REPLACES. `businessListing.membershipPlans` was an array inside a
// usePersistentState object, SEEDED WITH TWO FAKE PLANS — "Monthly Membership
// $45" and "Day Pass $8" — that every business account has been showing since
// onboarding without anyone having created them. BusinessGymTab let an owner
// list, add, edit and delete them; none of it left the device, so the plans a
// gym actually sells and the plans Explore could read had never been the same
// thing.
//
// THE ONLY ONE OF THE FOUR CATALOG TABLES WITH A REAL EDIT PATH. Classes,
// offerings and discounts are create-and-delete on every screen that touches
// them today; BusinessGymTab has a genuine "Edit Plan" sheet, so this service
// is the only one that needs updatePlan. The UPDATE grant covers exactly
// name, price, billing and payment_type — id, business_id, created_at and
// updated_at are not in it, and are never in a payload here.

export type MembershipBilling = Database["public"]["Enums"]["billing_period"];

export interface MembershipPlanRow {
  id: string;
  name: string;
  /** Formatted for display ("$45"); the column is numeric. */
  price: string;
  billing: MembershipBilling;
  paymentType: string;
}

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

const toPlan = (r: Row): MembershipPlanRow => ({
  id: r.id,
  name: r.name,
  price: formatPrice(r.price),
  billing: r.billing,
  paymentType: r.payment_type ?? "Card",
});

/**
 * The content columns, or a message saying why the draft cannot be written.
 *
 * PRICE IS NOT NULLABLE HERE, unlike the other three tables: the column is
 * NOT NULL with a `>= 0` check, and BusinessGymTab already refuses to save a
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
    row: { name, price: price.value, billing: draft.billing, payment_type: draft.paymentType },
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

export async function deletePlan(planId: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from("membership_plans").delete().eq("id", planId);
  if (error) {
    console.error("[membership-plans] Could not delete the plan:", error.message);
    return { ok: false, message: "Couldn't delete the plan. Try again." };
  }
  return { ok: true };
}
