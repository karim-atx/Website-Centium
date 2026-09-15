import { supabase } from "../../../lib/supabase/client";

// Asking whether an account carries Centium Ambassador status.
//
// WHAT THIS REPLACES. The badge rendered on
// `referralNextMonthDiscountPct > 0` — the referrer-side reward, set when
// somebody else redeems your code. So a single successful referral minted an
// ambassador, permanently, on that device's local state. Ambassador is now a
// granted status with a reason and a revocation, held in ambassador_grants,
// and this is how the app asks about it.
//
// GRANTED, AND REVOCABLE, WHICH THE OLD PREDICATE HAD NO WAY TO EXPRESS.
// is_ambassador() tests `revoked_at is null`, so a withdrawn grant answers
// false on the next check. A number that only ever went up could not.
//
// IT TAKES AN ARGUMENT, UNLIKE is_admin(). is_admin() resolves the caller
// from auth.uid() internally, so it can only ever answer about you;
// is_ambassador(p_profile_id) is SECURITY DEFINER over an explicit id and
// will answer about anybody an authenticated caller names. That is
// reasonable for what it is — the badge is a public marker, not a secret —
// but it does mean this file has to be deliberate about whose id it passes,
// rather than treating the two functions as interchangeable.

/**
 * Whether the account behind `userId` is a Centium Ambassador.
 *
 * ONLY CALL THIS WITH A SESSION IN HAND. The EXECUTE grant covers
 * `authenticated` and `service_role` and excludes `anon` — the same shape
 * is_admin() has — so a signed-out call is refused with 42501 rather than
 * answered false.
 *
 * A FAILURE ANSWERS "no", and the asymmetry is the point: a wrong false hides
 * a badge, while a wrong true would have the app award somebody a status the
 * server never granted them.
 */
export async function isAmbassadorAccount(userId: string): Promise<boolean> {
  // Neither is_ambassador() nor ambassador_grants is in database.types.ts —
  // the same situation services/admin documents for is_admin() and
  // admin_users. The function is callable regardless, so the name is cast
  // here rather than hand-editing a generated file that the next
  // regeneration would overwrite.
  //
  // THE CLIENT IS CAST, NOT THE METHOD. Pulling `supabase.rpc` out into a
  // local detaches it from the client it belongs to and it throws on
  // `this.rest` when called — the failure that once left the whole app
  // sitting on "Loading…". See the same note in services/admin.
  const client = supabase as unknown as {
    rpc: (
      fn: "is_ambassador",
      args: { p_profile_id: string }
    ) => PromiseLike<{ data: boolean | null; error: { message: string } | null }>;
  };

  const { data, error } = await client.rpc("is_ambassador", { p_profile_id: userId });

  if (error) {
    console.warn("[ambassador] Could not check ambassador status:", error.message);
    return false;
  }
  return data === true;
}
