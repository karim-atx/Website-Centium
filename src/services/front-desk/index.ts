import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { fetchMyVenues, fetchVenueMembers } from "../venues/console";
import { consoleMessage } from "../venues/consoleLogic";
import type { Result } from "../venues";
import { toPassCheck, type Entry, type FrontDeskMember, type PassCheck, type VerifyRow } from "./frontDeskLogic";

// The gym Front desk (v6 Batch 4 · OP1-013…036, OURS-OP1-front-desk-scan).
// Live today (HANDOVER_API stage 4b / A4): verify_gym_pass, mark_gym_membership_paid,
// my_venues, venue_members. Pending until their stage is on the local stack:
// check-ins (B10), renewal reminders and end at period end (B9), day pass
// sales (BU2-10). None of these functions are in the production-generated
// types, so the calls go through a narrow cast at this boundary.

type Rpc = <T>(fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: T | null; error: PostgrestError | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

const fail = <T>(error: PostgrestError, fallback: string): Result<T> => ({
  ok: false,
  code: error.code,
  message: isOffline(error) ? OFFLINE_MESSAGE : consoleMessage(error.code, error.message, fallback),
});

export interface FrontDeskVenue {
  gymId: string;
  name: string;
}

/** The business's venues (my_venues(): every venue the caller is an insider of). */
export async function fetchFrontDeskVenues(): Promise<Result<FrontDeskVenue[]>> {
  const r = await fetchMyVenues();
  if (!r.ok) return r;
  return { ok: true, value: r.value.map((v) => ({ gymId: v.gymId, name: v.name })) };
}

const PAGE = 200;

/**
 * Every membership at the business's venues (venue_members(), all statuses),
 * paged at the server's 200 cap. First names only: the venue is told nothing
 * else about who a member is.
 */
export async function fetchFrontDeskMembers(venues: FrontDeskVenue[]): Promise<Result<FrontDeskMember[]>> {
  const out: FrontDeskMember[] = [];
  for (const v of venues) {
    let offset = 0;
    for (;;) {
      const r = await fetchVenueMembers(v.gymId, null, PAGE, offset);
      if (!r.ok) return r;
      out.push(...r.value.members.map((m) => ({ ...m, gymId: v.gymId })));
      offset += r.value.members.length;
      if (r.value.members.length < PAGE || offset >= r.value.total) break;
    }
  }
  return { ok: true, value: out };
}

/**
 * verify_gym_pass(token): the pass's state for an insider of the issuing
 * venue, and the same "unknown" row for a foreign or made-up token. It records
 * no entry (B10 adds that).
 */
export async function verifyPass(token: string): Promise<Result<PassCheck>> {
  const { data, error } = await rpc<VerifyRow[] | VerifyRow>("verify_gym_pass", { p_token: token });
  if (error) {
    console.error("[front desk] Could not verify a pass:", error.message);
    return fail(error, "Couldn't check this pass.");
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, value: toPassCheck(row) };
}

/** mark_gym_membership_paid(id): idempotent; the desk's action for a pass awaiting payment. */
export async function markMembershipPaid(membershipId: string): Promise<Result<null>> {
  const { error } = await rpc<null>("mark_gym_membership_paid", { p_membership_id: membershipId });
  if (error) {
    console.error("[front desk] Could not mark a membership paid:", error.message);
    return fail(error, "Couldn't mark it as paid. Try again.");
  }
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// Check-ins (B10 · BU2-07): not on the stack. `available: false` is the
// honest answer the Entries tab turns into its empty state (OP1-016) and the
// Check in button into its pending note. When B10 lands, read today's
// check_ins here and flip CHECK_INS_LIVE.

export const CHECK_INS_LIVE = false;

export type EntriesResult = { available: false } | { available: true; entries: Entry[]; everAny: boolean; hours: { hour: number; count: number }[] };

/**
 * Development only: a check-in list to lay out the drawn Entries screen
 * (OP1-013) before B10 exists. Set from the console as
 * `window.__frontDeskEntries = {...}`; never read in a production build.
 */
function devEntries(): EntriesResult | null {
  if (!import.meta.env.DEV) return null;
  const v = (globalThis as { __frontDeskEntries?: EntriesResult }).__frontDeskEntries;
  return v ?? null;
}

export async function fetchTodayEntries(): Promise<Result<EntriesResult>> {
  const dev = devEntries();
  if (dev) return { ok: true, value: dev };
  return { ok: true, value: { available: false } };
}
