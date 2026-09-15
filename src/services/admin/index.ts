import { supabase } from "../../../lib/supabase/client";

// Asking whether the signed-in account is an administrator.
//
// This is the consumer app, and it has no admin features — which is exactly
// why it needs the answer. An admin signing in here was treated as a brand-new
// user and walked into onboarding, because nothing on this side knew what it
// was looking at.
//
// THE TABLE CANNOT BE READ, AND THAT IS THE DESIGN. admin_users has RLS on,
// no policies and no client grants, so a select returns nothing to anyone
// holding an anon or authenticated JWT. is_admin() is the sanctioned way
// through: SECURITY DEFINER, no arguments, resolving the caller from
// auth.uid() so a client cannot ask about somebody else.

/**
 * Whether the account behind the current session is an administrator.
 *
 * ONLY CALL THIS WITH A SESSION IN HAND. The EXECUTE grant covers
 * `authenticated` and `service_role` and deliberately excludes `anon`, so a
 * signed-out call returns `42501 permission denied for function is_admin`
 * rather than `false` — measured against a real client, not inferred.
 *
 * A FAILURE ANSWERS "no". The consequence of a wrong `false` is an admin
 * seeing the consumer app, which is where they already were; the consequence
 * of leaving it unresolved is every caller waiting forever on a question the
 * server just refused to answer.
 */
export async function isAdminAccount(): Promise<boolean> {
  // is_admin() is not in database.types.ts, and neither are admin_users or
  // admin_actions. That file is current — it carries adopt_workout_template,
  // added the same week — so the omission is not staleness: the admin surface
  // is simply not part of the schema the consumer client is described by. The
  // function is still callable, so the name is cast rather than the generated
  // file being hand-edited, which the next regeneration would undo.
  //
  // THE CLIENT IS CAST, NOT THE METHOD, and the difference is not stylistic.
  // Pulling `supabase.rpc` out into a local first detaches it from the client
  // it belongs to, and it throws on `this.rest` the moment it is called —
  // which, in a route guard waiting on the answer, showed up as the whole app
  // stuck on "Loading…" rather than as an error anyone could read.
  const client = supabase as unknown as {
    rpc: (
      fn: "is_admin"
    ) => PromiseLike<{ data: boolean | null; error: { message: string } | null }>;
  };

  const { data, error } = await client.rpc("is_admin");

  if (error) {
    console.warn("[admin] Could not check administrator status:", error.message);
    return false;
  }
  return data === true;
}
