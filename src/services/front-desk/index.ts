import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { fetchMyVenues, fetchVenueMembers } from "../venues/console";
import { consoleMessage } from "../venues/consoleLogic";
import { commitmentLines } from "../venues/venueLogic";
import type { Result } from "../venues";
import {
  membershipActionMessage,
  sortRenewals,
  toPassCheck,
  toRenewalDue,
  toRenewalStats,
  type Entry,
  type FrontDeskMember,
  type PassCheck,
  type RenewalDue,
  type RenewalDueRow,
  type RenewalStats,
  type RenewalStatsRow,
  type VerifyRow,
} from "./frontDeskLogic";

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
  businessId?: string;
}

/** The business's venues (my_venues(): every venue the caller is an insider of). */
export async function fetchFrontDeskVenues(): Promise<Result<FrontDeskVenue[]>> {
  const r = await fetchMyVenues();
  if (!r.ok) return r;
  return { ok: true, value: r.value.map((v) => ({ gymId: v.gymId, name: v.name, businessId: v.businessId })) };
}

/**
 * Each plan's commitment lines by plan name (minimum_term_months, notice_days),
 * information only: not enforced, never blocks ending (MB-05 follow-up 5). A
 * name two plans share is left out. Empty on a failed read.
 */
export async function fetchPlanTerms(venues: FrontDeskVenue[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  const ids = [...new Set(venues.map((v) => v.businessId).filter((b): b is string => !!b))];
  if (ids.length === 0) return out;
  type Loose = { from: (t: string) => { select: (c: string) => { in: (col: string, v: string[]) => PromiseLike<{ data: unknown[] | null; error: PostgrestError | null }> } } };
  const { data, error } = await (supabase as unknown as Loose).from("membership_plans").select("name, minimum_term_months, notice_days").in("business_id", ids);
  if (error) return out;
  const rows = (data ?? []) as { name: string; minimum_term_months: number | null; notice_days: number | null }[];
  const seen = new Map<string, number>();
  for (const r of rows) seen.set(r.name, (seen.get(r.name) ?? 0) + 1);
  for (const r of rows) {
    if (seen.get(r.name) !== 1) continue;
    const lines = commitmentLines(r.minimum_term_months, r.notice_days);
    if (lines.length) out.set(r.name, lines);
  }
  return out;
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
// Renewals and ending (B7 MB-05, migration 20261121000000): venue_renewals_due,
// venue_renewal_stats, renew_gym_membership, end_gym_membership. All four are
// gated on business_can(business, 'members'); a reader returns no rows to
// anybody else.

export async function fetchRenewalsDue(gymId: string, days: number): Promise<Result<RenewalDue[]>> {
  const { data, error } = await rpc<RenewalDueRow[]>("venue_renewals_due", { p_gym_id: gymId, p_days: days });
  if (error) {
    console.error("[front desk] Could not read renewals:", error.message);
    return fail(error, "Couldn't load renewals.");
  }
  return { ok: true, value: (data ?? []).map((r) => toRenewalDue(r, gymId)) };
}

/** Every venue's renewals due within `days`, soonest first, already renewed last (the reader's order per venue). */
export async function fetchAllRenewalsDue(venues: FrontDeskVenue[], days: number): Promise<Result<RenewalDue[]>> {
  const out: RenewalDue[] = [];
  for (const v of venues) {
    const r = await fetchRenewalsDue(v.gymId, days);
    if (!r.ok) return r;
    out.push(...r.value);
  }
  return { ok: true, value: sortRenewals(out) };
}

export async function fetchRenewalStats(gymId: string, from: string, to: string): Promise<Result<RenewalStats | null>> {
  const { data, error } = await rpc<RenewalStatsRow[] | RenewalStatsRow>("venue_renewal_stats", { p_gym_id: gymId, p_from: from, p_to: to });
  if (error) {
    console.error("[front desk] Could not read renewal stats:", error.message);
    return fail(error, "Couldn't load renewals.");
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, value: row ? toRenewalStats(row) : null };
}

/** renew_gym_membership(id) → the new period's id. It starts where the old one ends and arrives payment pending. */
export async function renewMembership(membershipId: string): Promise<Result<string>> {
  const { data, error } = await rpc<string>("renew_gym_membership", { p_membership_id: membershipId });
  if (error || !data) {
    if (error) console.error("[front desk] Could not renew:", error.message);
    return { ok: false, code: error?.code, message: error && isOffline(error) ? OFFLINE_MESSAGE : membershipActionMessage(error?.code, "renew") };
  }
  return { ok: true, value: data };
}

/** end_gym_membership(id, reason, at_period_end) → the resulting status ('active' = ends on the date, 'cancelled' = ended now). */
export async function endGymMembership(membershipId: string, atPeriodEnd: boolean, reason: string | null): Promise<Result<string>> {
  const { data, error } = await rpc<string>("end_gym_membership", {
    p_membership_id: membershipId,
    p_reason: reason?.trim() ? reason.trim() : null,
    p_at_period_end: atPeriodEnd,
  });
  if (error || !data) {
    if (error) console.error("[front desk] Could not end a membership:", error.message);
    return { ok: false, code: error?.code, message: error && isOffline(error) ? OFFLINE_MESSAGE : membershipActionMessage(error?.code, "end") };
  }
  return { ok: true, value: data };
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
