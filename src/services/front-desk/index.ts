import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { fetchHoursTable, fetchMyVenues, fetchVenueMembers } from "../venues/console";
import { consoleMessage } from "../venues/consoleLogic";
import { commitmentLines } from "../venues/venueLogic";
import type { Result } from "../venues";
import {
  dayPassPlans,
  deskMessage,
  GUEST_LABEL_MAX,
  isoWeekday,
  membershipActionMessage,
  mondayOf,
  sortRenewals,
  toBusyGrid,
  toCheckIn,
  toDeskSale,
  toDeskSummary,
  toEntry,
  toPassCheck,
  toRenewalDue,
  toRenewalStats,
  toDeskMember,
  type BusyRow,
  type CheckIn,
  type CheckInMethod,
  type CheckInRow,
  type DayPassPlan,
  type DenyReason,
  type DeskMember,
  type DeskMemberRow,
  type DeskSale,
  type DeskSaleRow,
  type DeskSummary,
  type Entry,
  type EntryRow,
  type FrontDeskMember,
  type PlanRow,
  type SummaryRow,
  type PassCheck,
  type RenewalDue,
  type RenewalDueRow,
  type RenewalStats,
  type RenewalStatsRow,
  type VerifyRow,
} from "./frontDeskLogic";

// The gym Front desk (v6 Batch 4 · OP1-013…036, OURS-OP1-front-desk-scan).
// Live (HANDOVER_API stage 4b / A4, B7, B10): verify_gym_pass,
// mark_gym_membership_paid, my_venues, venue_members, desk_find_member, the
// renewals, and the B10 front desk (check-ins, guests, day pass sales,
// desk_entries / desk_summary / venue_busy_times). None of these functions
// are in the production-generated types, so the calls go through a narrow
// cast at this boundary.

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
 * paged at the server's 200 cap. Labels only (Q-05: "Member #0042" unless
 * shared); the check-in searches names through deskFindMember.
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
 * The check-in search (desk_find_member): a first name or the member number,
 * valid passes first, capped by the server at 50. Needs front_desk.
 */
export async function deskFindMember(gymId: string, search: string, limit = 6): Promise<Result<DeskMember[]>> {
  const { data, error } = await rpc<DeskMemberRow[]>("desk_find_member", { p_gym_id: gymId, p_search: search.trim(), p_limit: limit });
  if (error) {
    console.error("[front desk] Could not search members:", error.message);
    return fail(error, "Couldn't search right now. Try again.");
  }
  return { ok: true, value: (data ?? []).map(toDeskMember) };
}

/**
 * verify_gym_pass(token): the pass's state for an insider of the issuing
 * venue, and the same "unknown" row for a foreign or made-up token. It records
 * no entry: the scan records through checkInWithPass, and falls back to this
 * only on a database without B10.
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
// Front desk (B10, migration 20261121250000). Every desk function is gated on
// business_can(business, 'front_desk') (venue_busy_times also 'members');
// the writes refuse a venue whose desk check-in is off (ATXE6) and a buyer
// under the venue's minimum age (ATXE7).
//
// THE PENDING RULE: a database without these functions (PGRST202 / 42883)
// answers `missing`, and the screens keep their pre-B10 behaviour (the
// verify-only scan, the "coming soon" check-in note, the empty Entries card).

/** A Result that can also say "this database doesn't have the function yet". */
export type Desk<T> = Result<T> | { ok: false; missing: true; code?: string; message: string };

const isMissing = (e: PostgrestError) => e.code === "PGRST202" || e.code === "42883";

function deskFail<T>(error: PostgrestError, what: string, fallback: string): Desk<T> {
  if (isMissing(error)) return { ok: false, missing: true, code: error.code, message: fallback };
  console.error(`[front desk] Could not ${what}:`, error.message);
  return {
    ok: false,
    code: error.code,
    message: isOffline(error) ? OFFLINE_MESSAGE : deskMessage(error.code, consoleMessage(error.code, error.message, fallback)),
  };
}

export const isMissingDesk = <T>(r: Desk<T>): boolean => !r.ok && "missing" in r && r.missing === true;

const first = <T>(data: T[] | T | null): T | null => (Array.isArray(data) ? data[0] ?? null : data);

/** check_in_with_pass(gym, token, method): scans a pass; decides and records (denials too). */
export async function checkInWithPass(gymId: string, token: string, method: CheckInMethod = "qr"): Promise<Desk<CheckIn>> {
  const { data, error } = await rpc<CheckInRow[]>("check_in_with_pass", { p_gym_id: gymId, p_token: token, p_method: method });
  if (error) return deskFail(error, "check a pass in", "Couldn't check this pass.");
  const c = toCheckIn(first(data));
  return c ? { ok: true, value: c } : { ok: false, message: "Couldn't check this pass." };
}

/** check_in_member(gym, membership, method): the check-in from desk_find_member. */
export async function checkInMember(gymId: string, membershipId: string, method: CheckInMethod = "manual"): Promise<Desk<CheckIn>> {
  const { data, error } = await rpc<CheckInRow[]>("check_in_member", { p_gym_id: gymId, p_membership_id: membershipId, p_method: method });
  if (error) return deskFail(error, "check a member in", "Couldn't check them in. Try again.");
  const c = toCheckIn(first(data));
  return c ? { ok: true, value: c } : { ok: false, message: "Couldn't check them in. Try again." };
}

export interface GuestCheckIn {
  result: "in" | "denied";
  denyReason: DenyReason | null;
  used: number;
  allowed: number;
}

/** check_in_guest(gym, host membership, label): a guest on the host's monthly allowance. */
export async function checkInGuest(gymId: string, hostMembershipId: string, label: string): Promise<Desk<GuestCheckIn>> {
  const { data, error } = await rpc<{ result: string; deny_reason: DenyReason | null; guests_used_this_month: number | null; guests_allowed: number | null }[]>("check_in_guest", {
    p_gym_id: gymId,
    p_host_membership_id: hostMembershipId,
    p_guest_label: label.trim().slice(0, GUEST_LABEL_MAX),
  });
  if (error) {
    if (error.code === "22023") return { ok: false, code: error.code, message: `Write the guest's name, up to ${GUEST_LABEL_MAX} characters.` };
    return deskFail(error, "check a guest in", "Couldn't check the guest in. Try again.");
  }
  const row = first(data);
  if (!row) return { ok: false, message: "Couldn't check the guest in. Try again." };
  const result = row.result === "in" ? "in" : "denied";
  return {
    ok: true,
    value: { result, denyReason: result === "denied" ? row.deny_reason ?? "no_pass" : null, used: Number(row.guests_used_this_month) || 0, allowed: Number(row.guests_allowed) || 0 },
  };
}

/** sell_day_pass(gym, plan, person | null, guest label | null, method, paid) → the sale id. The sale is the entry. */
export async function sellDayPass(
  gymId: string,
  planId: string,
  buyer: { personId: string } | { guestLabel: string },
  paid: boolean
): Promise<Desk<string>> {
  const { data, error } = await rpc<string>("sell_day_pass", {
    p_gym_id: gymId,
    p_plan_id: planId,
    p_person_id: "personId" in buyer ? buyer.personId : null,
    p_guest_label: "guestLabel" in buyer ? buyer.guestLabel.trim().slice(0, GUEST_LABEL_MAX) : null,
    // Cash only at the desk today; Whish is shown as coming elsewhere (DECIDED).
    p_method: "cash",
    p_paid: paid,
  });
  if (error) {
    if (error.code === "22023")
      return {
        ok: false,
        code: error.code,
        message: "personId" in buyer ? "This person isn't one of your members. Sell to them as a guest by name." : `Write the guest's name, up to ${GUEST_LABEL_MAX} characters.`,
      };
    return deskFail(error, "sell a day pass", "Couldn't sell the day pass. Try again.");
  }
  return data ? { ok: true, value: data } : { ok: false, message: "Couldn't sell the day pass. Try again." };
}

/** mark_desk_sale_paid(sale): a day pass sold "pay later" is paid. */
export async function markDeskSalePaid(saleId: string): Promise<Desk<null>> {
  const { error } = await rpc<null>("mark_desk_sale_paid", { p_sale_id: saleId });
  if (error) return deskFail(error, "mark a desk sale paid", "Couldn't mark it as paid. Try again.");
  return { ok: true, value: null };
}

/** desk_entries(gym, day = venue today): newest first, first names (the check-in screen). */
export async function fetchDeskEntries(gymId: string, limit = 500): Promise<Desk<Entry[]>> {
  const { data, error } = await rpc<EntryRow[]>("desk_entries", { p_gym_id: gymId, p_day: null, p_limit: limit, p_offset: 0 });
  if (error) return deskFail(error, "read entries", "Couldn't load entries.");
  return { ok: true, value: (data ?? []).map(toEntry) };
}

/** desk_summary(gym): the boxes; right_now null = no history. */
export async function fetchDeskSummary(gymId: string): Promise<Desk<DeskSummary>> {
  const { data, error } = await rpc<SummaryRow[]>("desk_summary", { p_gym_id: gymId });
  if (error) return deskFail(error, "read the desk summary", "Couldn't load entries.");
  return { ok: true, value: toDeskSummary(first(data)) };
}

/** venue_busy_times(gym, weeks): 7 × 24 averages, grid[weekday - 1][hour]. */
export async function fetchBusyTimes(gymId: string, weeks = 4): Promise<Desk<number[][]>> {
  const { data, error } = await rpc<BusyRow[]>("venue_busy_times", { p_gym_id: gymId, p_weeks: weeks });
  if (error) return deskFail(error, "read busy times", "Couldn't load busy times.");
  return { ok: true, value: toBusyGrid(data ?? []) };
}

type Loose = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, v: string) => Loose2;
      in: (col: string, v: string[]) => Loose2;
    };
  };
};
type Loose2 = PromiseLike<{ data: unknown[] | null; error: PostgrestError | null }> & {
  eq: (col: string, v: string) => Loose2;
  gte: (col: string, v: string) => Loose2;
  limit: (n: number) => Loose2;
  order: (col: string, o: { ascending: boolean }) => Loose2;
};
const loose = supabase as unknown as Loose;

/** Has this venue ever recorded a check-in (OP1-016: the empty card is "never any")? Null when unreadable. */
export async function fetchEverCheckedIn(gymId: string): Promise<boolean | null> {
  const { data, error } = await loose.from("gym_check_ins").select("id").eq("gym_id", gymId).limit(1);
  if (error) return null;
  return (data ?? []).length > 0;
}

/** The business's day-pass plans that are on sale (sell_day_pass's own test). */
export async function fetchDayPassPlans(businessId: string): Promise<DayPassPlan[]> {
  const { data, error } = await loose.from("membership_plans").select("id, name, price, billing, plan_type, status, valid_for_days").eq("business_id", businessId);
  if (error) return [];
  return dayPassPlans((data ?? []) as PlanRow[]);
}

/** This week's desk sales at a venue (desk_sales, readable with front_desk or revenue), newest first. */
export async function fetchWeekDeskSales(gymId: string, now: Date = new Date()): Promise<Result<DeskSale[]>> {
  const { data, error } = await loose
    .from("desk_sales")
    .select("id, gym_id, plan_name, person_id, guest_label, amount, payment_status, sold_at, sold_on")
    .eq("gym_id", gymId)
    .gte("sold_on", mondayOf(now))
    .order("sold_at", { ascending: false });
  if (error) {
    if (!["42P01", "PGRST205"].includes(error.code)) console.error("[front desk] Could not read desk sales:", error.message);
    return fail(error, "Couldn't load day passes.");
  }
  return { ok: true, value: ((data ?? []) as DeskSaleRow[]).map(toDeskSale) };
}

/** Today's opening hours at a venue (gym_hours, ISO weekday), or null when none are published. */
export async function fetchTodayHours(gymId: string, now: Date = new Date()): Promise<{ closed: boolean; open_24h: boolean; opens_at: string | null; closes_at: string | null } | null> {
  const r = await fetchHoursTable(gymId);
  if (!r.ok) return null;
  return r.value.find((d) => Number(d.weekday) === isoWeekday(now)) ?? null;
}
