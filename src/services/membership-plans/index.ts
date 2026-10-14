import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { resolveMyBusinessId } from "../business-profile";
import { formatPrice, parsePrice } from "../../utils/price";
import { fetchMyVenues, fetchVenueMembers } from "../venues/console";
import type { MembershipBilling, MembershipPlanRow, PlanDbStatus, PlanKind, PlanPayment, PlanStatus } from "./types";
export type { MembershipBilling, MembershipPlanRow, PlanDbStatus, PlanKind, PlanPayment, PlanStatus } from "./types";

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
// B7 MB-03 (v6 Batch 4 · Plans): plan_type, status (active / paused /
// archived), visible_on_explore, show_on_card, the limits (visits per period,
// sessions in a pack, valid for days, minimum term, notice), the class-type
// set, payment_methods (cash | whish) and converts_to_plan_id, all in the
// INSERT and UPDATE grants; billing gains quarterly and semiannually. The
// columns are newer than lib/supabase/database.types.ts (generated from
// production), so reads and writes go through an untyped view of the client.
// id, business_id, created_at and updated_at are never in a payload.
const db = supabase as unknown as SupabaseClient;

/** Everything the plan sheet writes. Fields left undefined are not sent. */
export interface PlanDraft {
  name: string;
  price: string;
  billing: MembershipBilling;
  /** Legacy text column, kept in step with payment_methods ("Cash" / "Whish Money" / "Cash or Whish Money"). */
  paymentType: string;
  kind?: PlanKind;
  paymentMethods?: PlanPayment[];
  visitsPerPeriod?: number | null;
  sessionsInPack?: number | null;
  validForDays?: number | null;
  minimumTermMonths?: number | null;
  noticeDays?: number | null;
  allowedClassTypes?: string[] | null;
  convertsToPlanId?: string | null;
}

export type PlansResult =
  | { ok: true; businessId: string | null; plans: MembershipPlanRow[] }
  | { ok: false; message: string };

export type WriteResult = { ok: true; plan: MembershipPlanRow } | { ok: false; message: string };

const COLUMNS =
  "id, name, price, billing, payment_type, plan_type, status, visits_per_period, sessions_in_pack, valid_for_days, minimum_term_months, notice_days, allowed_class_types, includes, payment_methods, visible_on_explore, show_on_card, converts_to_plan_id";

type Row = {
  id: string;
  name: string;
  /** PostgREST returns `numeric` as a string on the way out. */
  price: number | string;
  billing: MembershipBilling;
  payment_type: string | null;
  plan_type: PlanKind | null;
  status: PlanDbStatus | null;
  visits_per_period: number | null;
  sessions_in_pack: number | null;
  valid_for_days: number | null;
  minimum_term_months: number | null;
  notice_days: number | null;
  allowed_class_types: string[] | null;
  includes: string[] | null;
  payment_methods: PlanPayment[] | null;
  visible_on_explore: boolean | null;
  show_on_card: boolean | null;
  converts_to_plan_id: string | null;
};

/** V6-46: "Card" and empty payment types read (and save) as Cash. */
export function normalisePaymentType(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v || /^card$/i.test(v)) return "Cash";
  return v;
}

/** The label for a payment-method set ("Cash", "Whish Money", "Cash or Whish Money"). */
export function paymentLabel(methods: PlanPayment[]): string {
  const cash = methods.includes("cash");
  const whish = methods.includes("whish");
  return cash && whish ? "Cash or Whish Money" : whish ? "Whish Money" : "Cash";
}

/** payment_methods, or the legacy text read as a set (Card and empty = cash, V6-46). */
function methodsOf(r: Pick<Row, "payment_methods" | "payment_type">): PlanPayment[] {
  const set = (r.payment_methods ?? []).filter((m): m is PlanPayment => m === "cash" || m === "whish");
  if (set.length) return set;
  const t = normalisePaymentType(r.payment_type).toLowerCase();
  return t.includes("whish") && t.includes("cash") ? ["cash", "whish"] : t.includes("whish") ? ["whish"] : ["cash"];
}

/** Rows written before plan_type existed: billing "daily" was a Day pass. */
export const planKindOf = (billing: MembershipBilling): PlanKind => (billing === "daily" ? "day_pass" : "membership");

const toPlan = (r: Row): MembershipPlanRow => {
  const dbStatus: PlanDbStatus = r.status ?? "active";
  const visible = r.visible_on_explore !== false;
  const methods = methodsOf(r);
  const status: PlanStatus = dbStatus === "archived" ? "archived" : dbStatus === "paused" ? "paused" : visible ? "active" : "hidden";
  return {
    id: r.id,
    name: r.name,
    price: formatPrice(r.price),
    priceValue: Number(r.price) || 0,
    billing: r.billing,
    paymentType: paymentLabel(methods),
    paymentMethods: methods,
    kind: r.plan_type ?? planKindOf(r.billing),
    status,
    dbStatus,
    visibleOnExplore: visible,
    showOnCard: r.show_on_card !== false,
    visitsPerPeriod: r.visits_per_period,
    sessionsInPack: r.sessions_in_pack,
    validForDays: r.valid_for_days,
    minimumTermMonths: r.minimum_term_months,
    noticeDays: r.notice_days,
    allowedClassTypes: r.allowed_class_types && r.allowed_class_types.length ? r.allowed_class_types : null,
    includes: r.includes,
    convertsToPlanId: r.converts_to_plan_id,
  };
};

/**
 * Class-type set rules (membership_plans_text_sets_check): no blanks, no
 * repeats, at most 24 entries, each at most 60 characters. Checked here with
 * copy, so the database never has to refuse it.
 */
export function classTypesProblem(set: string[] | null | undefined): string | null {
  if (!set) return null;
  if (set.some((x) => !x.trim())) return "A class type can't be blank.";
  if (new Set(set.map((x) => x.trim().toLowerCase())).size !== set.length) return "Each class type can only be picked once.";
  if (set.some((x) => x.trim().length > 60)) return "Class type names can be 60 characters at most.";
  if (set.length > 24) return "Pick 24 class types at most.";
  return null;
}

/**
 * The content columns, or a message saying why the draft cannot be written.
 * PRICE IS NOT NULLABLE: an unparseable price is refused with something an
 * owner can act on instead of being coerced to zero.
 */
function toRow(draft: PlanDraft): { ok: true; row: Record<string, unknown> } | { ok: false; message: string } {
  const name = draft.name.trim();
  if (!name) return { ok: false, message: "Give the plan a name." };

  const price = parsePrice(draft.price);
  if (!price.ok || price.value === null) {
    return { ok: false, message: "Enter the price as a number, for example 45 or $45." };
  }
  const classes = classTypesProblem(draft.allowedClassTypes);
  if (classes) return { ok: false, message: classes };
  // Limits: NULL is "no limit"; the database refuses 0, so a 0 never leaves here.
  const limit = (n: number | null | undefined) => (n && n > 0 ? Math.round(n) : null);

  const row: Record<string, unknown> = {
    name,
    price: price.value,
    billing: draft.billing,
    payment_type: draft.paymentMethods ? paymentLabel(draft.paymentMethods) : normalisePaymentType(draft.paymentType),
  };
  if (draft.kind !== undefined) row.plan_type = draft.kind;
  if (draft.paymentMethods !== undefined) row.payment_methods = draft.paymentMethods;
  if (draft.visitsPerPeriod !== undefined) row.visits_per_period = limit(draft.visitsPerPeriod);
  if (draft.sessionsInPack !== undefined) row.sessions_in_pack = limit(draft.sessionsInPack);
  if (draft.validForDays !== undefined) row.valid_for_days = limit(draft.validForDays);
  if (draft.minimumTermMonths !== undefined) row.minimum_term_months = draft.minimumTermMonths || null;
  if (draft.noticeDays !== undefined) row.notice_days = draft.noticeDays || null;
  if (draft.allowedClassTypes !== undefined) {
    row.allowed_class_types = draft.allowedClassTypes && draft.allowedClassTypes.length ? draft.allowedClassTypes.map((x) => x.trim()) : null;
  }
  if (draft.convertsToPlanId !== undefined) row.converts_to_plan_id = draft.convertsToPlanId;
  return { ok: true, row };
}

/** A write refusal in words an owner can act on. */
function writeMessage(error: { code?: string; message: string }, fallback: string): string {
  if (error.code === "ATX25") return "Converts to must be another plan of your business.";
  if (error.code === "23514") return "Some of these values aren't allowed. Check the limits and class types.";
  return fallback;
}

/** Every plan this account's business sells. */
export async function fetchMyPlans(userId: string): Promise<PlansResult> {
  const business = await resolveMyBusinessId(userId);
  if (!business.ok) {
    return { ok: false, message: "Couldn't load your plans. Check your connection and try again." };
  }
  if (!business.id) return { ok: true, businessId: null, plans: [] };

  const { data, error } = await db
    .from("membership_plans")
    .select(COLUMNS)
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[membership-plans] Could not read plans:", error.message);
    return { ok: false, message: "Couldn't load your plans. Check your connection and try again." };
  }
  return { ok: true, businessId: business.id, plans: ((data ?? []) as Row[]).map(toPlan) };
}

async function insertRow(businessId: string, row: Record<string, unknown>, fallback: string): Promise<WriteResult> {
  const { data, error } = await db
    .from("membership_plans")
    .insert({ business_id: businessId, ...row })
    .select(COLUMNS)
    .single();
  if (error || !data) {
    console.error("[membership-plans] Could not create the plan:", error?.message);
    return { ok: false, message: error ? writeMessage(error, fallback) : fallback };
  }
  return { ok: true, plan: toPlan(data as Row) };
}

export async function createPlan(businessId: string, draft: PlanDraft): Promise<WriteResult> {
  const built = toRow(draft);
  if (!built.ok) return built;
  return insertRow(businessId, built.row, "Couldn't add the plan. Try again.");
}

/**
 * Writes to one plan. FILTERED BY id ALONE, and that is not a gap: the UPDATE
 * policy already requires the row's business to belong to auth.uid().
 */
async function updateRow(planId: string, row: Record<string, unknown>, fallback: string): Promise<WriteResult> {
  const { data, error } = await db.from("membership_plans").update(row).eq("id", planId).select(COLUMNS).single();
  if (error || !data) {
    console.error("[membership-plans] Could not update the plan:", error?.message);
    return { ok: false, message: error ? writeMessage(error, fallback) : fallback };
  }
  return { ok: true, plan: toPlan(data as Row) };
}

export async function updatePlan(planId: string, draft: PlanDraft): Promise<WriteResult> {
  const built = toRow(draft);
  if (!built.ok) return built;
  return updateRow(planId, built.row, "Couldn't save the plan. Try again.");
}

/** Pause, resume, archive or restore (status only). */
export function setPlanStatus(planId: string, status: PlanDbStatus): Promise<WriteResult> {
  return updateRow(planId, { status }, "Couldn't change the plan. Try again.");
}

/** Hide from Explore / show on Explore (visible_on_explore only). */
export function setPlanVisible(planId: string, visible: boolean): Promise<WriteResult> {
  return updateRow(planId, { visible_on_explore: visible }, "Couldn't change the plan. Try again.");
}

/**
 * Duplicate (OP1-050): "{name} (copy)" with every field copied, hidden from
 * Explore and active; members are not copied.
 */
export function duplicatePlan(businessId: string, p: MembershipPlanRow): Promise<WriteResult> {
  return insertRow(
    businessId,
    {
      name: `${p.name} (copy)`,
      price: p.priceValue,
      billing: p.billing,
      payment_type: p.paymentType,
      plan_type: p.kind,
      status: "active",
      visible_on_explore: false,
      show_on_card: p.showOnCard,
      payment_methods: p.paymentMethods,
      visits_per_period: p.visitsPerPeriod,
      sessions_in_pack: p.sessionsInPack,
      valid_for_days: p.validForDays,
      minimum_term_months: p.minimumTermMonths,
      notice_days: p.noticeDays,
      allowed_class_types: p.allowedClassTypes,
      includes: p.includes,
      converts_to_plan_id: p.convertsToPlanId,
    },
    "Couldn't duplicate the plan. Try again."
  );
}

/**
 * The plan types offered for a business type (plan_types_for_business_type,
 * V6-47: offered, not enforced). Null when it could not be read.
 */
export async function fetchPlanTypesFor(businessType: string): Promise<PlanKind[] | null> {
  const { data, error } = await db.rpc("plan_types_for_business_type", { p_type: businessType });
  if (error) {
    console.error("[membership-plans] Could not read the plan types:", error.message);
    return null;
  }
  return (data ?? []) as PlanKind[];
}

/** The plan types offered to this business (its business_type through plan_types_for_business_type). */
export async function fetchOfferedPlanTypes(businessId: string): Promise<{ businessType: string | null; types: PlanKind[] | null }> {
  const { data, error } = await db.from("business_profiles").select("business_type").eq("id", businessId).maybeSingle();
  if (error || !data) return { businessType: null, types: null };
  const businessType = (data as { business_type: string | null }).business_type;
  if (!businessType) return { businessType: null, types: null };
  return { businessType, types: await fetchPlanTypesFor(businessType) };
}

/**
 * Deletes a plan (kept for archived plans). A plan with live members is
 * refused (ATXA4), one with past members by the gym_memberships FK (23503):
 * both come back as `inUse` so the screen can say why.
 */
export async function deletePlan(planId: string): Promise<{ ok: boolean; message?: string; inUse?: boolean }> {
  const { error } = await supabase.from("membership_plans").delete().eq("id", planId);
  if (error) {
    console.error("[membership-plans] Could not delete the plan:", error.message);
    if (error.code === "23503" || error.code === "ATXA4") {
      return { ok: false, inUse: true, message: "People have bought this plan, so it can't be deleted." };
    }
    return { ok: false, message: "Couldn't delete the plan. Try again." };
  }
  return { ok: true };
}

/** One active member of a plan, as the venue readers return them (first name only). */
export interface PlanMember {
  membershipId: string;
  /** Q-05: masked ("Member #0042") unless shared. */
  label: string;
  isMinor: boolean;
  startedOn: string;
  expiresOn: string | null;
}

/**
 * Active members per plan name across the business's venues (my_venues and
 * venue_members, the venue console readers; insiders only). venue_members
 * names the plan, not its id, so plans are matched by name; a name two plans
 * share is ambiguous and left out by the caller. Null when no venue could be
 * read (the figures then show "–"). Bookings and deltas are BU2-12.
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
      list.push({ membershipId: m.membershipId, label: m.label, isMinor: m.isMinor, startedOn: m.startedOn, expiresOn: m.expiresOn });
      byName.set(m.planName, list);
    }
  }
  return read ? byName : null;
}
