import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
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
}

export type TiersResult = { ok: true; tiers: SubscriptionTier[] } | { ok: false; message: string };

interface Row {
  name: string;
  max_clients: number | null;
  max_employees: number | null;
  monthly_price: number | string;
}

const toTier = (row: Row): SubscriptionTier => ({
  id: row.name.trim().toLowerCase(),
  name: row.name,
  maxClients: row.max_clients,
  maxEmployees: row.max_employees,
  // numeric(10,2) arrives as a number over PostgREST and as a string through
  // some drivers. Coerced either way rather than trusted to be one of them.
  monthlyPrice: Number(row.monthly_price),
});

async function load(tierType: TierType): Promise<TiersResult> {
  try {
    const { data, error } = await supabase
      .from("subscription_tiers")
      .select("name, max_clients, max_employees, monthly_price")
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
