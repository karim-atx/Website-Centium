import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { effectivePlanLabel } from "./pricing";
import type { Enums } from "../../../lib/supabase/database.types";

// The subscription tiers, read from the table that defines them.
//
// THIS REPLACES TWO HAND-WRITTEN COPIES — src/data/professionalTiers.ts and
// src/data/businessTiers.ts — and the reason is not tidiness. The same eight
// numbers lived in three places: those two files, which the client rendered
// to users, and `subscription_tiers`, which Admin-Centium reads and which the
// database itself enforces through professional_clients_enforce_tier_cap and
// business_employees_enforce_tier_cap. The database copy was seeded with
// placeholders that said, in their own migration, that they were "almost
// certainly wrong" — and six of the eight were. Migration 20260923060000
// corrected them to match the client files.
//
// That made the numbers agree. It did not make them one number. A cap that
// the UI advertises and a cap that the database enforces have to be the same
// fact, or the next QA round moves one and users are told they may add
// clients the server will refuse. So the client files are gone and this reads
// the enforcing table directly.
//
// PUBLIC REFERENCE DATA. `grant select ... to anon, authenticated` with a
// `using (true)` policy: the tiers are the same for everyone, signed in or
// not, which is what makes the module-level cache below correct rather than
// merely convenient.

export type TierType = Enums<"subscription_tier_type">;

export interface SubscriptionTier {
  /**
   * The row uuid, used for ONE thing: joining subscription_states.tier_id.
   *
   * Not the key. gen_random_uuid() differs per environment, which is why `id`
   * below is derived from the name instead — but subscription_states points
   * here by uuid, so resolving which plan an account holds needs it.
   */
  rowId: string;
  /**
   * The app's own stable key for a tier — "starter", "growth", "pro",
   * "unlimited" — derived from the name rather than from the row's uuid.
   *
   * IT HAS TO BE THE NAME, because these strings are already persisted: a
   * professional's tier lives in localStorage under `centium-state:
   * professionalTier` and a business's on its directory row, both written
   * before any of this read from the database. The uuids are
   * gen_random_uuid() and differ per environment, so they could never have
   * been the key and cannot become it without migrating what is already
   * stored.
   *
   * The consequence worth knowing: renaming a tier in the database orphans
   * every value stored against the old name. A rename is therefore a data
   * migration, not an edit.
   */
  id: string;
  name: string;
  /** Professional tiers only; null means unlimited. */
  maxClients: number | null;
  /** Business tiers only; null means unlimited. */
  maxEmployees: number | null;
  /** 0 for the free tier — the column is NOT NULL, so absence is not a case. */
  monthlyPrice: number;
  /**
   * The yearly price, or null when the row has none.
   *
   * NULL IS NOT ZERO AND NOT TWELVE MONTHLIES. Only the free tiers leave it
   * null, and a yearly view of a free plan says "Free" rather than "$0/year".
   * Nothing derives it: $9.99 x 12 is $119.88 and the row says $99.99, so a
   * computed yearly price would be wrong by the exact amount of the discount.
   */
  yearlyPrice: number | null;
  /**
   * An add-on bought in units rather than a plan somebody is on — the seat
   * block. It never appears in a "which plan am I on" list, and its price is
   * per unit, not per account.
   */
  isAddon: boolean;
  /** How many professionals one unit of an add-on covers. Null unless isAddon. */
  seatsPerUnit: number | null;
  /**
   * The plan a professional gets from a business seat.
   *
   * A FLAG ON THE ROW, not the name "Starter". A business buying seat blocks
   * entitles each seated professional to whichever tier carries this, and
   * effective_professional_tier resolves it server-side from the same column
   * — so naming it here would be a second opinion that goes wrong the first
   * time the seat plan changes.
   */
  isBusinessSeatPlan: boolean;

  /**
   * The plan an account with no active subscription falls back to.
   *
   * A FLAG, NOT A NAME OR A PRICE. Database-Atraxia 20260924240000 added it
   * and a partial unique index making "at most one per tier_type" a
   * constraint; the client-cap trigger reads the same column. Inferring it
   * from name = "Starter" or monthly_price = 0 would be a guess that happens
   * to be right today and silently wrong after a rename or a paid entry tier.
   */
  isDefault: boolean;
}

export type TiersResult = { ok: true; tiers: SubscriptionTier[] } | { ok: false; message: string };

interface Row {
  id: string;
  name: string;
  max_clients: number | null;
  max_employees: number | null;
  monthly_price: number | string;
  yearly_price: number | string | null;
  is_addon: boolean;
  seats_per_unit: number | null;
  is_business_seat_plan: boolean;
  is_default: boolean;
}

const toTier = (row: Row): SubscriptionTier => ({
  rowId: row.id,
  id: row.name.trim().toLowerCase(),
  name: row.name,
  maxClients: row.max_clients,
  maxEmployees: row.max_employees,
  // numeric(10,2) arrives as a number over PostgREST and as a string through
  // some drivers. Coerced either way rather than trusted to be one of them.
  monthlyPrice: Number(row.monthly_price),
  yearlyPrice: row.yearly_price == null ? null : Number(row.yearly_price),
  isAddon: row.is_addon,
  seatsPerUnit: row.seats_per_unit,
  isBusinessSeatPlan: row.is_business_seat_plan,
  isDefault: row.is_default,
});

async function load(tierType: TierType): Promise<TiersResult> {
  try {
    const { data, error } = await supabase
      .from("subscription_tiers")
      // ONE STRING, NOT A CONCATENATION. postgrest-js infers the row type
      // from this literal, and splitting it across lines makes it opaque —
      // the result then types as GenericStringError and every field read is
      // a cast into the dark.
      // prettier-ignore
      .select("id, name, max_clients, max_employees, monthly_price, yearly_price, is_default, is_addon, seats_per_unit, is_business_seat_plan")
      .eq("tier_type", tierType)
      // ORDER IS SEMANTIC HERE, not cosmetic. Subscription.tsx decides whether
      // a change is an upgrade or a downgrade by comparing positions in this
      // array, and the old hand-written files encoded that by being written in
      // order. Price ascending reproduces it — 0, 14.99, 29.99, 49.99 — and is
      // the better rule anyway: it cannot drift out of step with the prices
      // the same rows carry.
      .order("monthly_price", { ascending: true });

    if (error) {
      return {
        ok: false,
        message: isOffline(error) ? OFFLINE_MESSAGE : "Could not load subscription plans. Try again.",
      };
    }
    return { ok: true, tiers: (data ?? []).map((row) => toTier(row as Row)) };
  } catch (e) {
    return {
      ok: false,
      message: isOffline(e) ? OFFLINE_MESSAGE : "Could not load subscription plans. Try again.",
    };
  }
}

/**
 * One request per tier type per session, shared by every caller.
 *
 * The subscription screen and the add-client sheet both need the professional
 * tiers, and they are reference data that cannot change under a running
 * session — so two screens asking is two round trips for one answer.
 *
 * A FAILURE IS NEVER CACHED. Caching the promise is what makes the sharing
 * work, but a dropped connection answering for the rest of the session would
 * turn one bad moment into a screen that stays broken until reload. The entry
 * is dropped on the way out when the result is an error, so the next caller
 * genuinely retries.
 */
const inFlight = new Map<TierType, Promise<TiersResult>>();

export function fetchSubscriptionTiers(tierType: TierType): Promise<TiersResult> {
  const cached = inFlight.get(tierType);
  if (cached) return cached;

  const request = load(tierType).then((result) => {
    if (!result.ok) inFlight.delete(tierType);
    return result;
  });
  inFlight.set(tierType, request);
  return request;
}

/**
 * Which plan an account actually holds — the answer, not a default the UI
 * invented.
 *
 * "NO SUBSCRIPTION" IS NOT A STATE ANYONE IS IN. subscription_states is empty
 * for every account that has never been given a plan, because it is written
 * only by a payment process that does not exist yet — it is READ-ONLY to every
 * client role, with no write policy or grant at all. So an empty read is the
 * ordinary case, not a missing record, and the account is on the free plan.
 *
 * WHICH free plan comes from is_default, not from this file. Database-Atraxia
 * 20260924240000 marks it and the client-cap trigger reads the same column, so
 * the plan this screen names and the cap the database enforces are the same
 * row. A hardcoded "starter" here would be a second opinion, and the two would
 * disagree the first time anyone renamed a tier.
 *
 * A NON-ACTIVE ROW COUNTS AS NO ROW. status is 'active' | 'cancelled' |
 * 'expired'; only the first entitles anyone to anything, and a cancelled
 * subscription falls back to the free plan exactly as a missing one does.
 */
export interface ResolvedTier {
  tier: SubscriptionTier;
  /** True when this is the free fallback rather than a held subscription. */
  fromDefault: boolean;
}

export type MyTierResult =
  | { ok: true; resolved: ResolvedTier | null }
  | { ok: false; message: string };

export async function fetchMySubscriptionTier(
  userId: string,
  tierType: TierType
): Promise<MyTierResult> {
  const tiers = await fetchSubscriptionTiers(tierType);
  if (!tiers.ok) return { ok: false, message: tiers.message };

  // owner_id is UNIQUE on this table, so there is at most one row per account
  // and maybeSingle is the honest shape rather than a limit(1).
  let held: { tier_id: string | null; status: string | null } | null = null;
  try {
    const { data, error } = await supabase
      .from("subscription_states")
      .select("tier_id, status")
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) {
      return {
        ok: false,
        message: isOffline(error) ? OFFLINE_MESSAGE : "Could not load your plan. Try again.",
      };
    }
    held = data;
  } catch (e) {
    return {
      ok: false,
      message: isOffline(e) ? OFFLINE_MESSAGE : "Could not load your plan. Try again.",
    };
  }

  if (held?.status === "active" && held.tier_id) {
    const active = tiers.tiers.find((t) => t.rowId === held!.tier_id);
    // A tier_id pointing at a row this type's list does not contain means the
    // account holds a plan of the OTHER type, or one that has since been
    // deleted (tier_id is ON DELETE SET NULL, so that is rare but possible).
    // Falling through to the default is the safe reading: it is what the cap
    // trigger will do too.
    if (active) return { ok: true, resolved: { tier: active, fromDefault: false } };
  }

  const fallback = tiers.tiers.find((t) => t.isDefault) ?? null;
  // Null only when no tier of this type carries the flag, which is a
  // misconfiguration the database logs and allows rather than enforces. The
  // caller shows nothing instead of naming a plan nobody is on.
  return { ok: true, resolved: fallback ? { tier: fallback, fromDefault: true } : null };
}


// ---------------------------------------------------------------------------
// The marketplace revenue share
// ---------------------------------------------------------------------------

export type RevenueShareResult = { ok: true; pct: number } | { ok: false; message: string };

let revenueShare: Promise<RevenueShareResult> | null = null;

/**
 * The percentage a business pays on marketplace sales.
 *
 * ONE ROW, ENFORCED BY THE TABLE. platform_settings has a boolean primary key
 * defaulting to true, which is how the schema says "there is exactly one of
 * these" — so this reads the single row rather than picking one.
 *
 * Cached and shared like the tiers, and a failure is never cached, for the
 * same reasons fetchSubscriptionTiers gives.
 */
export function fetchRevenueSharePct(): Promise<RevenueShareResult> {
  if (revenueShare) return revenueShare;
  const request = (async (): Promise<RevenueShareResult> => {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("marketplace_revenue_share_pct")
        .maybeSingle();
      if (error) {
        return {
          ok: false,
          message: isOffline(error) ? OFFLINE_MESSAGE : "Could not load pricing. Try again.",
        };
      }
      if (!data) return { ok: false, message: "Could not load pricing. Try again." };
      return { ok: true, pct: Number(data.marketplace_revenue_share_pct) };
    } catch (e) {
      return {
        ok: false,
        message: isOffline(e) ? OFFLINE_MESSAGE : "Could not load pricing. Try again.",
      };
    }
  })().then((result) => {
    if (!result.ok) revenueShare = null;
    return result;
  });
  revenueShare = request;
  return request;
}

// ---------------------------------------------------------------------------
// Which plan a professional is actually on
// ---------------------------------------------------------------------------

/** Where a professional's plan comes from. Mirrors public.professional_plan_source. */
export type PlanSource = Enums<"professional_plan_source">;

export interface EffectiveProfessionalTier {
  tier: SubscriptionTier;
  source: PlanSource;
  /** The business whose seat this is, when the plan came from one. */
  viaBusinessName?: string;
}

export type EffectiveTierResult =
  | { ok: true; effective: EffectiveProfessionalTier | null }
  | { ok: false; message: string };

/**
 * A professional's plan, resolved the way the database resolves it.
 *
 * THREE WAYS TO HOLD ONE, and the order between them is not this client's to
 * decide: an own subscription, a seat in a business that bought seat blocks,
 * or the free default. effective_professional_tier(uuid) answers it in SQL —
 * the same function the client-cap trigger consults — so a professional with
 * both an own Pro plan and a business seat is told Pro by the one authority
 * that also decides how many clients they may add.
 *
 * Reimplementing that precedence here would be a second opinion, and the two
 * would disagree the first time somebody bought a plan while seated.
 */
export async function fetchEffectiveProfessionalTier(
  professionalId: string
): Promise<EffectiveTierResult> {
  const tiers = await fetchSubscriptionTiers("professional");
  if (!tiers.ok) return { ok: false, message: tiers.message };

  try {
    const { data, error } = await supabase.rpc("effective_professional_tier", {
      p_professional_id: professionalId,
    });
    if (error) {
      return {
        ok: false,
        message: isOffline(error) ? OFFLINE_MESSAGE : "Could not load your plan. Try again.",
      };
    }
    // A set-returning function comes back as an array of at most one row.
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { ok: true, effective: null };

    const tier = tiers.tiers.find((t) => t.rowId === row.tier_id);
    if (!tier) return { ok: true, effective: null };

    const effective: EffectiveProfessionalTier = { tier, source: row.source };
    if (row.source !== "business_seat") return { ok: true, effective };

    // WHOSE SEAT, named. "Starter (via Iron Works)" is a different sentence
    // from "Starter": one of them tells a professional that losing the
    // affiliation costs them the plan. The function returns the tier, not the
    // business, so this is a second read — and a failure to name the business
    // is not a failure to resolve the plan.
    const { data: seat } = await supabase
      .from("business_employees")
      .select("business_profiles(business_name)")
      .eq("professional_id", professionalId)
      .limit(1)
      .maybeSingle();
    const name = (seat as { business_profiles?: { business_name?: string } } | null)
      ?.business_profiles?.business_name;
    return { ok: true, effective: name ? { ...effective, viaBusinessName: name } : effective };
  } catch (e) {
    return {
      ok: false,
      message: isOffline(e) ? OFFLINE_MESSAGE : "Could not load your plan. Try again.",
    };
  }
}

/** "Starter (via Iron Works)", or just the plan name when it is their own. */
export function effectiveTierLabel(effective: EffectiveProfessionalTier): string {
  return effectivePlanLabel(effective.tier.name, effective.source, effective.viaBusinessName);
}

// ---------------------------------------------------------------------------
// A business's own plan: the base, plus however many seat blocks it bought
// ---------------------------------------------------------------------------

export interface BusinessPlan {
  base: SubscriptionTier | null;
  seatAddon: SubscriptionTier | null;
  /** How many blocks are held. Zero is the ordinary case. */
  seatBlocks: number;
  /** Blocks x seats per block. The denominator of "N of M seats used". */
  totalSeats: number;
  /** base + blocks x seat price, for the period being shown. */
  monthlyTotal: number;
}

export type BusinessPlanResult =
  | { ok: true; plan: BusinessPlan }
  | { ok: false; message: string };

export async function fetchBusinessPlan(ownerId: string): Promise<BusinessPlanResult> {
  const tiers = await fetchSubscriptionTiers("business");
  if (!tiers.ok) return { ok: false, message: tiers.message };

  const base = tiers.tiers.find((t) => !t.isAddon) ?? null;
  const seatAddon = tiers.tiers.find((t) => t.isAddon) ?? null;

  let seatBlocks = 0;
  try {
    const { data, error } = await supabase
      .from("subscription_states")
      .select("seat_blocks, status")
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (error) {
      return {
        ok: false,
        message: isOffline(error) ? OFFLINE_MESSAGE : "Could not load your plan. Try again.",
      };
    }
    // Only an active subscription entitles anyone to seats, exactly as
    // fetchMySubscriptionTier treats a cancelled row as no row.
    if (data?.status === "active") seatBlocks = data.seat_blocks ?? 0;
  } catch (e) {
    return {
      ok: false,
      message: isOffline(e) ? OFFLINE_MESSAGE : "Could not load your plan. Try again.",
    };
  }

  const perBlock = seatAddon?.seatsPerUnit ?? 0;
  return {
    ok: true,
    plan: {
      base,
      seatAddon,
      seatBlocks,
      totalSeats: seatBlocks * perBlock,
      monthlyTotal:
        Math.round(((base?.monthlyPrice ?? 0) + seatBlocks * (seatAddon?.monthlyPrice ?? 0)) * 100) / 100,
    },
  };
}


/**
 * "1 of 1 clients used", or "3 clients" when the plan has no cap.
 *
 * The noun differs by tier type because the cap does: professionals are capped
 * on clients and businesses on employees, and the two columns are never both
 * set on one row.
 */
export function capLabel(tier: SubscriptionTier, used: number): string {
  const max = tier.maxClients ?? tier.maxEmployees;
  const noun = tier.maxEmployees !== null ? "professionals" : "clients";
  if (max === null || max === undefined) {
    return `${used} ${used === 1 ? noun.replace(/s$/, "") : noun} · unlimited`;
  }
  return `${used} of ${max} ${max === 1 ? noun.replace(/s$/, "") : noun} used`;
}
