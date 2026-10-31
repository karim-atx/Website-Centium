import { supabase } from "../../../lib/supabase/client";
import { CLOSED_INVITE_MEMBER, CLOSED_MEMBER_CODE, CLOSED_REDEEM_CODE, closureMessage, isBusinessClosedError } from "../business-closure/logic";
import { isOffline } from "../network-error";
import {
  describeCreateRefusal,
  describePreviewError,
  describeRedeemError,
  describeRedeemRefusal,
  redeemOutcome,
  type CodePreview,
  type RedeemOutcome,
} from "./codeLogic";
import { CODE_COPY, codeActionMessage, redeemReasonLine } from "./codeCopy";
import type { PlanKind } from "../membership-plans/types";

export * from "./codeLogic";
export * from "./codeCopy";

// Business memberships: the walk-in relationship business_members holds.
//
// WHAT THIS CLOSES. can_enroll_client_in_class admitted two kinds of person —
// a client of a professional the business employs, and somebody already booked
// onto one of its classes. A walk-in is neither, so a gym had no way to put a
// person who simply turns up onto a class. Membership is the third disjunct,
// and this is the client side of it.
//
// EVERY WRITE IS AN RPC, because `authenticated` holds SELECT on
// business_members and nothing else — no INSERT, no UPDATE, no DELETE. That is
// not an oversight to work around: each transition has a rule that a column
// grant cannot express (only the owner invites, only the invited person
// answers, either side may end it), so each one is a SECURITY DEFINER function
// that checks its own caller.
//
// TWO INVITE PATHS EXIST AND THEY ARE NOT INTERCHANGEABLE, which is the thing
// to understand before reading the UI:
//
//   business_invite_member(business, member, plan) needs the person's account
//   uuid. It creates a PENDING row the invitee must answer.
//
//   create_business_member_code(business, plan, validity, gym) mints a redeemable
//   code. redeem_business_member_code(code) creates the membership ALREADY
//   ACCEPTED — redeeming is the consent, so there is nothing left to answer.
//
// THE CODE PATH IS THE WALK-IN PATH, and the direct invite is close to
// unusable from this app today. A business has no way to find a person's
// account uuid: `profiles` is own-row only, public_profile_summary covers
// professional and business accounts and excludes customers, and
// related_profile_summary answers only for a professional's own clients. There
// is no user search anywhere in the schema. So a business cannot look somebody
// up to invite them — it can hand them a code, which is exactly what a walk-in
// desk does anyway. inviteMember is still exported, because the function is
// real and a caller holding a uuid (a future admin tool, a deep link) can use
// it; nothing in this UI can currently produce that uuid.
//
// MEMBER NAMES (B7): `profiles` is own-row only, so the business's roster is
// read through list_business_members(business, state, limit, offset), the
// business-level counterpart of venue_members(): a FIRST NAME and a minor
// flag, never a date of birth, pending first, with total_count for paging.
// It needs business_can(members) and returns nothing (not an error) without
// it.

/** Where a membership row sits. Derived, not stored — see toMembership. */
export type MembershipStatus = "pending" | "active" | "declined" | "ended";

export interface Membership {
  id: string;
  businessId: string;
  /** The member's account. Null on the business's roster: list_business_members never hands it out. */
  memberId: string | null;
  /** The server's label (list_business_members, Q-05): a shared first name or "Member #0042"; null on the member's own side. */
  label?: string | null;
  /** Under 18 (a flag, never an age). */
  isMinor?: boolean;
  membershipPlanId: string | null;
  status: MembershipStatus;
  invitedAt: string;
  respondedAt: string | null;
  endedAt: string | null;
  /** Null when the row carries no plan, or the plan is unreadable. */
  planName: string | null;
  /**
   * Resolved by my_business_memberships on the member side, and null on the
   * business's own roster, which never needed it.
   *
   * IT DOES NOT "ALWAYS RESOLVE", which this comment used to claim.
   * business_profiles stopped being unconditionally readable when its SELECT
   * policy became `active OR is_business_insider(id)` — a member is neither,
   * so a delisted business used to come back as null here.
   */
  businessName: string | null;
}

export interface MemberCode {
  id: string;
  code: string;
  membershipPlanId: string | null;
  /** CN: the gym a granted membership belongs to (null for a code with no plan). */
  gymId: string | null;
  /** True once every use is taken (Round F2: uses reached max_uses). */
  redeemed: boolean;
  expiresAt: string;
  createdAt: string;
  /** Round F2 AB6 (20261226050000): how many may join (1–50) and how many have; 1 / 0 on an older reader. */
  maxUses: number;
  uses: number;
  /** Revoked or replaced: it stops working, and who joined keeps their membership. */
  revokedAt: string | null;
}

/** business_member_codes' row as read and as the code writers return it. */
type CodeRow = {
  id: string;
  code: string;
  membership_plan_id: string | null;
  gym_id: string | null;
  redeemed: boolean;
  expires_at: string;
  created_at: string;
  max_uses?: number | null;
  uses?: number | null;
  revoked_at?: string | null;
};

const toMemberCode = (c: CodeRow): MemberCode => ({
  id: c.id,
  code: c.code,
  membershipPlanId: c.membership_plan_id,
  gymId: c.gym_id ?? null,
  redeemed: c.redeemed,
  expiresAt: c.expires_at,
  createdAt: c.created_at,
  maxUses: typeof c.max_uses === "number" && c.max_uses > 0 ? c.max_uses : 1,
  uses: typeof c.uses === "number" && c.uses > 0 ? c.uses : c.redeemed ? 1 : 0,
  revokedAt: c.revoked_at ?? null,
});

type Row = {
  id: string;
  business_id: string;
  member_id: string;
  membership_plan_id: string | null;
  invited_at: string;
  responded_at: string | null;
  accepted: boolean | null;
  ended_at: string | null;
};

/**
 * FOUR STATES FROM THREE COLUMNS, and the order of these tests is the whole
 * definition. `ended_at` wins over everything: a membership that was accepted
 * and then ended is ended, not active. A declined invitation is an answer, so
 * it is not pending. Anything still unanswered is pending.
 *
 * This mirrors calendar_event_invitees, where `accepted IS NULL` means nobody
 * has said yes or no yet — the same shape, so the same reading.
 */
function statusOf(r: Row): MembershipStatus {
  if (r.ended_at) return "ended";
  if (r.accepted === false) return "declined";
  if (r.accepted === true) return "active";
  return "pending";
}

const toMembership = (
  r: Row,
  planName: string | null = null,
  businessName: string | null = null
): Membership => ({
  id: r.id,
  businessId: r.business_id,
  memberId: r.member_id,
  membershipPlanId: r.membership_plan_id,
  status: statusOf(r),
  invitedAt: r.invited_at,
  respondedAt: r.responded_at,
  endedAt: r.ended_at,
  planName,
  businessName,
});

const MEMBER_COLUMNS =
  "id, business_id, member_id, membership_plan_id, invited_at, responded_at, accepted, ended_at";

type PgError = { message: string; code?: string } | null;

// business_members, business_member_codes and the five RPCs are all absent
// from database.types.ts — newer than the last regeneration, as
// professional_reviews_readable and my_class_schedule were. Cast to the exact
// call shapes this file makes rather than hand-editing a generated file.
type CodesTable = {
  select: (columns: string) => {
    eq: (
      column: string,
      value: string
    ) => {
      order: (
        column: string,
        options: { ascending: boolean }
      ) => PromiseLike<{
        data: CodeRow[] | null;
        error: PgError;
      }>;
    };
  };
};

/** The member's own side, with the two names already joined on. */
type MembershipsView = {
  select: (columns: string) => {
    order: (
      column: string,
      options: { ascending: boolean }
    ) => PromiseLike<{
      data: (Row & { business_name: string | null; plan_name: string | null })[] | null;
      error: PgError;
    }>;
  };
};

const membershipsView = (): MembershipsView =>
  (supabase as unknown as { from: (v: "my_business_memberships") => MembershipsView }).from(
    "my_business_memberships"
  );

const codesTable = (): CodesTable =>
  (supabase as unknown as { from: (t: "business_member_codes") => CodesTable }).from(
    "business_member_codes"
  );

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: PgError }>;
};
const rpc = (): Rpc => supabase as unknown as Rpc;

/**
 * Turns an RPC's SQLSTATE into something an owner or a member can act on.
 *
 * The custom codes are this schema's own vocabulary and are used consistently:
 * ATX08 is "the row you named is not there", ATX09 is "you are not the one who
 * may do this", ATX10 is "the row is not in a state where this makes sense",
 * ATX02 is the rate limiter.
 */
function describe(error: { message?: string; code?: string }, fallback: string): string {
  switch (error.code ?? "") {
    case "ATX02":
      return "You've done that a few times just now. Wait a minute and try again.";
    case "ATX08":
      return "That membership no longer exists.";
    case "ATX09":
      return "You're not allowed to do that.";
    case "ATX10":
      return "That's already been answered or ended.";
    case "ATX25":
      return "That membership plan belongs to a different business.";
    default:
      if (/jwt|not authenticated|authentication required/i.test(error.message ?? "")) {
        return "Your session expired. Sign in again.";
      }
      return fallback;
  }
}

/**
 * The business's own roster, every state included (B7 list_business_members).
 *
 * NOT FILTERED TO ACTIVE. An owner needs to see that an invitation is still
 * unanswered and that somebody declined — a roster showing only the people who
 * said yes cannot explain why the person they invited is missing. The reader
 * sorts pending first, then newest; `total` is the full count for "See all".
 *
 * Staff holding `members` read the same roster; without it the reader
 * returns no rows rather than an error, so an empty list is all they see.
 */
export async function fetchMyMembers(
  businessId: string,
  opts: { state?: MembershipStatus | null; limit?: number; offset?: number } = {}
): Promise<{ ok: true; members: Membership[]; total: number } | { ok: false; message: string }> {
  const { data, error } = await rpc().rpc("list_business_members", {
    p_business_id: businessId,
    p_state: opts.state ?? null,
    p_limit: opts.limit ?? 200,
    p_offset: opts.offset ?? 0,
  });

  if (error) {
    console.error("[members] Could not read the member roster:", error.message);
    return { ok: false, message: "Couldn't load your members. Try again." };
  }
  const rows = (data ?? []) as ListedMember[];
  return { ok: true, members: rows.map((r) => listedToMembership(r, businessId)), total: Number(rows[0]?.total_count ?? 0) };
}

type ListedMember = {
  membership_id: string;
  /** Q-05 (Database 0587c8a): masked ("Member #0042") unless shared. */
  member_label: string | null;
  member_is_minor: boolean | null;
  plan_name: string | null;
  plan_price: number | string | null;
  state: string;
  invited_at: string;
  responded_at: string | null;
  ended_at: string | null;
  total_count: number | string;
};

const STATES: MembershipStatus[] = ["pending", "active", "declined", "ended"];

/** The reader's row in the shape the screens already use. */
export function listedToMembership(r: ListedMember, businessId: string): Membership {
  return {
    id: r.membership_id,
    businessId,
    memberId: null,
    label: r.member_label?.trim() || null,
    isMinor: !!r.member_is_minor,
    membershipPlanId: null,
    status: STATES.includes(r.state as MembershipStatus) ? (r.state as MembershipStatus) : "pending",
    invitedAt: r.invited_at,
    respondedAt: r.responded_at,
    endedAt: r.ended_at,
    planName: r.plan_name,
    businessName: null,
  };
}

/** "Member #4F2A" where the reader gives no first name (the masking rule, HANDOVER §4). */
export const maskedMemberLabel = (membershipId: string) => `Member #${membershipId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

/**
 * The signed-in person's own memberships and invitations.
 *
 * ONE READ FROM A VIEW, replacing a table read plus two lookups that had both
 * gone quiet. When the listing policies tightened, business_profiles became
 * `active OR is_business_insider(id)` and membership_plans became
 * `business_is_listed(business_id) OR is_business_insider(...)` — and
 * is_business_insider covers the owner and the professionals a business
 * employs, NOT its members. So the moment a business delisted, a member's own
 * membership card lost both the business name and the plan name and fell back
 * to "A business", with no error anywhere to say why: the rows were simply
 * filtered out, which reads as "no match" rather than "not allowed".
 *
 * my_business_memberships resolves both server-side. It is
 * security_invoker = false and owned by postgres, so the join happens with the
 * definer's reach rather than the member's, and its WHERE is
 * `member_id = auth.uid()` — self-scoping by construction, which is why no
 * filter is passed from here. It carries no `active` condition on the
 * business, so a delisted business's membership keeps its name.
 *
 * NO RESHAPING IN toMembership, checked rather than assumed: the view's first
 * eight columns are MEMBER_COLUMNS verbatim, same names and same order, so the
 * Row type still describes them. Only the two extras are new, and they arrive
 * as plain columns instead of map lookups.
 */
export async function fetchMyMemberships(
  userId: string
): Promise<{ ok: true; memberships: Membership[] } | { ok: false; message: string }> {
  // userId is unused as a filter — the view scopes itself — but is kept in the
  // signature because every caller has it and dropping it would make the
  // "whose memberships?" question invisible at the call site.
  void userId;

  const { data, error } = await membershipsView()
    .select(`${MEMBER_COLUMNS}, business_name, plan_name`)
    .order("invited_at", { ascending: false });

  if (error) {
    console.error("[members] Could not read your memberships:", error.message);
    return { ok: false, message: "Couldn't load your memberships. Try again." };
  }
  return {
    ok: true,
    memberships: (data ?? []).map((r) => toMembership(r, r.plan_name, r.business_name)),
  };
}

/**
 * Invites somebody by account id.
 *
 * EXPORTED BUT UNREACHABLE FROM THIS UI, and the header explains why: nothing
 * a business can read yields another person's uuid. Kept because the function
 * is real and correct, so a caller that does hold one works without a second
 * implementation appearing later.
 */
export async function inviteMember(
  businessId: string,
  memberId: string,
  membershipPlanId: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await rpc().rpc("business_invite_member", {
    p_business_id: businessId,
    p_member_id: memberId,
    p_membership_plan_id: membershipPlanId,
  });
  if (error) {
    console.error("[members] Could not invite:", error.message);
    if (isBusinessClosedError(error)) return { ok: false, message: closureMessage(CLOSED_INVITE_MEMBER, error.message) };
    return { ok: false, message: describe(error, "Couldn't send that invitation. Try again.") };
  }
  return { ok: true };
}

/**
 * Mints a code for a walk-in to redeem. With a plan the code also grants that
 * membership or pass when redeemed (CN), and must know its gym: p_gym_id is
 * sent only when the caller names one (a business with several gyms); a
 * single gym is resolved by the server, and none raises ATXAC.
 *
 * Round F2 AB6: always create_business_member_code_with_uses(…, p_max_uses)
 * (1–50; a new function, as an optional fifth argument on the old one would
 * make its four-argument call ambiguous in PostgREST). Its five arguments
 * have no defaults, so p_valid_for and p_gym_id go as null: the old
 * function's 7 days and gym resolution apply inside it.
 */
export async function createMemberCode(
  businessId: string,
  membershipPlanId: string | null,
  gymId: string | null = null,
  maxUses = 1
): Promise<{ ok: true; code: MemberCode } | { ok: false; message: string; code?: string }> {
  const { data, error } = await rpc().rpc("create_business_member_code_with_uses", {
    p_business_id: businessId,
    p_membership_plan_id: membershipPlanId,
    p_valid_for: null,
    p_gym_id: gymId,
    p_max_uses: maxUses,
  });

  if (error || !data) {
    console.error("[members] Could not create a member code:", error?.message);
    if (isBusinessClosedError(error)) return { ok: false, message: closureMessage(CLOSED_MEMBER_CODE, error?.message), code: error?.code };
    return { ok: false, message: describeCreateRefusal(error ?? {}, !!error && isOffline(error)), code: error?.code };
  }
  return { ok: true, code: toMemberCode(data as CodeRow) };
}

/** Round F2 AB6: revoke_business_member_code(p_code_id); who joined keeps their membership. */
export async function revokeMemberCode(codeId: string): Promise<{ ok: true; code: MemberCode } | { ok: false; message: string }> {
  const { data, error } = await rpc().rpc("revoke_business_member_code", { p_code_id: codeId });
  if (error || !data) {
    console.error("[members] Could not revoke a member code:", error?.message);
    if (error && isOffline(error)) return { ok: false, message: describeCreateRefusal(error, true) };
    return { ok: false, message: codeActionMessage(error?.code, CODE_COPY.revokeFailed) };
  }
  return { ok: true, code: toMemberCode(data as CodeRow) };
}

/** Round F2 AB6: replace_business_member_code(p_code_id) → the new code (same plan, gym, uses and validity). */
export async function replaceMemberCode(codeId: string): Promise<{ ok: true; code: MemberCode } | { ok: false; message: string }> {
  const { data, error } = await rpc().rpc("replace_business_member_code", { p_code_id: codeId });
  if (error || !data) {
    console.error("[members] Could not replace a member code:", error?.message);
    if (error && isOffline(error)) return { ok: false, message: describeCreateRefusal(error, true) };
    if (isBusinessClosedError(error)) return { ok: false, message: closureMessage(CLOSED_MEMBER_CODE, error?.message) };
    // The new code is minted by the create function, so its refusals (20 an hour, ATXAC) read the same.
    if (error?.code === "ATX02" || error?.code === "ATXAC" || error?.code === "ATX25") return { ok: false, message: describeCreateRefusal(error, false) };
    return { ok: false, message: codeActionMessage(error?.code, CODE_COPY.replaceFailed) };
  }
  return { ok: true, code: toMemberCode(data as CodeRow) };
}

/** Codes this business has issued, newest first. */
export async function fetchMyMemberCodes(
  businessId: string
): Promise<{ ok: true; codes: MemberCode[] } | { ok: false; message: string }> {
  const { data, error } = await codesTable()
    .select("id, code, membership_plan_id, gym_id, redeemed, expires_at, created_at, max_uses, uses, revoked_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[members] Could not read member codes:", error.message);
    return { ok: false, message: "Couldn't load your codes. Try again." };
  }
  return { ok: true, codes: (data ?? []).map(toMemberCode) };
}

/**
 * Redeems a member code.
 *
 * THE RESULT IS A ROW, NOT AN EXCEPTION, for the ordinary refusals: a wrong,
 * used or expired code, the person's own business, an existing membership,
 * the gym's minimum age, an archived plan (CN) come back as `success: false`
 * with a sentence, which describeRedeemRefusal rewords (server copy is never
 * shown). Only the structural failures (no session, rate limit 5 per 15
 * minutes, network) raise. A refused code is NOT used up.
 *
 * On success the server's sentence says what happened (redeemOutcome): a
 * membership granted, none granted because one is already held at that gym,
 * or a plain member code. The caller names what was granted by re-reading
 * my_gym_memberships after.
 */
export async function redeemMemberCode(
  code: string
): Promise<{ ok: true; businessId: string | null; outcome: RedeemOutcome } | { ok: false; message: string }> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, message: "Enter the code first." };

  const { data, error } = await rpc().rpc("redeem_business_member_code", { p_code: trimmed });
  if (error) {
    console.error("[members] Could not redeem:", error.message);
    if (isBusinessClosedError(error)) return { ok: false, message: closureMessage(CLOSED_REDEEM_CODE, error.message) };
    return { ok: false, message: describeRedeemError(error, isOffline(error)) };
  }
  const result = data as { success: boolean; message: string; membership: { business_id?: string } | null; reason?: string | null } | null;
  // Round F2 AB6: the stable reason first; the older message matching for a reader without it.
  if (!result?.success) return { ok: false, message: redeemReasonLine(result?.reason, result?.message) ?? describeRedeemRefusal(result?.message) };
  return { ok: true, businessId: result.membership?.business_id ?? null, outcome: redeemOutcome(result.message) };
}

/** preview_business_member_code(p_code) row (20261203000000). */
interface PreviewRow {
  code: string;
  business_id: string;
  business_name: string | null;
  gym_id: string | null;
  gym_name: string | null;
  plan_id: string | null;
  plan_name: string | null;
  plan_type: PlanKind | null;
  grants_membership: boolean | null;
  min_entry_age: number | null;
  expires_at: string;
}

/**
 * What a member code grants, before redeeming it. `value: null` = no row:
 * the code can't be used, and the server deliberately doesn't say why
 * (unknown, used, lapsed and a closed or paused business look the same).
 * Rate limited 20 per 15 minutes (ATX02): every call files a rate-limit
 * row, which is why the function is VOLATILE since Database PR #40
 * (20261215040000; it was STABLE and failed 25006 read-only under
 * PostgREST). supabase-js rpc() POSTs, so the call needed no change.
 */
export async function previewMemberCode(
  code: string
): Promise<{ ok: true; value: CodePreview | null } | { ok: false; message: string }> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, message: "Enter the code first." };
  try {
    const { data, error } = await rpc().rpc("preview_business_member_code", { p_code: trimmed });
    if (error) {
      console.error("[members] Could not preview a code:", error.code, error.message);
      return { ok: false, message: describePreviewError(error, isOffline(error)) };
    }
    const row = (Array.isArray(data) ? data[0] : data) as PreviewRow | null | undefined;
    if (!row) return { ok: true, value: null };
    return {
      ok: true,
      value: {
        businessName: row.business_name?.trim() || "A business",
        gymName: row.gym_name ?? null,
        planName: row.plan_name ?? null,
        planType: row.plan_type ?? null,
        grantsMembership: row.grants_membership === true,
        minEntryAge: row.min_entry_age == null ? null : Number(row.min_entry_age),
        expiresAt: row.expires_at,
      },
    };
  } catch (e) {
    return { ok: false, message: describePreviewError({ message: String(e) }, isOffline(e)) };
  }
}

/** Accepts or declines an invitation. Only the invited person may call this. */
export async function respondToMembership(
  membershipId: string,
  accept: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await rpc().rpc("respond_to_business_membership", {
    p_membership_id: membershipId,
    p_accept: accept,
  });
  if (error) {
    console.error("[members] Could not answer the invitation:", error.message);
    return { ok: false, message: describe(error, "Couldn't record your answer. Try again.") };
  }
  return { ok: true };
}

/**
 * Ends a membership. Either side may call it.
 *
 * The function checks that the caller is the member OR the business owner, so
 * one call serves both screens rather than two that could drift.
 */
export async function endMembership(
  membershipId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await rpc().rpc("end_business_membership", { p_membership_id: membershipId });
  if (error) {
    console.error("[members] Could not end the membership:", error.message);
    return { ok: false, message: describe(error, "Couldn't end that membership. Try again.") };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// B7 MB-01: one people reader, member numbers, the member's own name switch
// ---------------------------------------------------------------------------
//
// business_people() is the de-duplicated person list (business_members,
// live gym memberships, class clients). `label` is the server's decision:
// the first name when the person shared it with this business, otherwise
// "Member #0042". RENDER THE LABEL; never build one from first_name.
// Search matches a shared first name or the member number ("42", "0042",
// "#42"); a masked name is never searchable, on purpose.

export type PeopleSegment = "all" | "active" | "members" | "class_clients" | "customers" | "appointment_clients";

export interface BusinessPerson {
  personId: string;
  label: string;
  nameIsShared: boolean;
  isMinor: boolean;
  memberNumber: number | null;
  isActive: boolean;
  isMember: boolean;
  isClassClient: boolean;
  firstSeen: string | null;
  lastSeen: string | null;
}

/** The function is missing (stage not on this database): the screens keep their pending state. */
const isMissingFunction = (e: { code?: string }) => e.code === "PGRST202" || e.code === "42883";

export async function fetchBusinessPeople(
  businessId: string,
  opts: { segment?: PeopleSegment; search?: string | null; limit?: number; offset?: number } = {}
): Promise<{ ok: true; people: BusinessPerson[]; total: number } | { ok: false; pending: boolean; message: string }> {
  const { data, error } = await rpc().rpc("business_people", {
    p_business_id: businessId,
    p_segment: opts.segment ?? "all",
    p_search: opts.search?.trim() || null,
    p_limit: opts.limit ?? 50,
    p_offset: opts.offset ?? 0,
  });
  if (error) {
    if (isMissingFunction(error)) return { ok: false, pending: true, message: "" };
    console.error("[members] Could not read people:", error.message);
    return { ok: false, pending: false, message: "Couldn't load your members. Try again." };
  }
  type Row = {
    person_id: string; label: string; name_is_shared: boolean; is_minor: boolean; member_number: number | null;
    is_active: boolean; is_member: boolean; is_class_client: boolean; first_seen: string | null; last_seen: string | null; total_count: number | string;
  };
  const rows = (data ?? []) as Row[];
  return {
    ok: true,
    total: Number(rows[0]?.total_count ?? 0),
    people: rows.map((r) => ({
      personId: r.person_id,
      label: r.label,
      nameIsShared: !!r.name_is_shared,
      isMinor: !!r.is_minor,
      memberNumber: r.member_number,
      isActive: !!r.is_active,
      isMember: !!r.is_member,
      isClassClient: !!r.is_class_client,
      firstSeen: r.first_seen,
      lastSeen: r.last_seen,
    })),
  };
}

/** How the member's own number reads, the same shape the server's label uses. */
export const memberNumberLabel = (n: number) => `Member #${String(n).padStart(4, "0")}`;

export interface MyNameSharing {
  businessId: string;
  memberNumber: number;
  shared: boolean;
}

/**
 * The member's side: every business that has numbered them, and whether they
 * show it their first name. Own rows of business_person_numbers and
 * profiles_shared_with_business (a revoked share keeps its row).
 */
export async function fetchMyNameSharing(userId: string): Promise<{ ok: true; rows: MyNameSharing[] } | { ok: false; pending: boolean }> {
  const db = supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => Promise<{ data: unknown; error: { code?: string; message: string } | null }> } } };
  const [nums, shares] = await Promise.all([
    db.from("business_person_numbers").select("business_id, member_number").eq("person_id", userId),
    db.from("profiles_shared_with_business").select("business_id, revoked_at").eq("profile_id", userId),
  ]);
  const err = nums.error ?? shares.error;
  if (err) return { ok: false, pending: err.code === "42P01" || err.code === "PGRST205" };
  const live = new Set(((shares.data ?? []) as { business_id: string; revoked_at: string | null }[]).filter((s) => !s.revoked_at).map((s) => s.business_id));
  return {
    ok: true,
    rows: ((nums.data ?? []) as { business_id: string; member_number: number }[]).map((n) => ({ businessId: n.business_id, memberNumber: n.member_number, shared: live.has(n.business_id) })),
  };
}

/** The member's own switch: show (or stop showing) their first name to one business. */
export async function shareMyNameWithBusiness(businessId: string, share: boolean): Promise<{ ok: true; shared: boolean } | { ok: false; message: string }> {
  const { data, error } = await rpc().rpc("share_my_profile_with_business", { p_business_id: businessId, p_share: share });
  if (error) {
    console.error("[members] Could not change name sharing:", error.message);
    return { ok: false, message: describe(error, "Couldn't save that. Try again.") };
  }
  return { ok: true, shared: typeof data === "boolean" ? data : share };
}

// ---------------------------------------------------------------------------
// B7 DI-07: the client's own switch for health figures in aggregate reports
// ---------------------------------------------------------------------------
//
// SEPARATE FROM THE NAME SWITCH, by rule (the Database guard fails a
// migration that makes one read the other): showing a gym your first name
// never hands it your progress, and the reverse. The business only ever
// learns a count (business_client_share_count), never who shared.

/** Every business the member shares progress with (own rows; a revoked share keeps its row). */
export async function fetchMyOutcomeShares(userId: string): Promise<{ ok: true; businessIds: Set<string> } | { ok: false }> {
  const db = supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => Promise<{ data: unknown; error: { message: string } | null }> } } };
  const r = await db.from("business_client_shares").select("business_id, revoked_at").eq("client_id", userId);
  if (r.error) return { ok: false };
  return { ok: true, businessIds: new Set(((r.data ?? []) as { business_id: string; revoked_at: string | null }[]).filter((x) => !x.revoked_at).map((x) => x.business_id)) };
}

export async function shareMyOutcomesWithBusiness(businessId: string, share: boolean): Promise<{ ok: true; shared: boolean } | { ok: false; message: string }> {
  const { data, error } = await rpc().rpc("share_my_outcomes_with_business", { p_business_id: businessId, p_share: share });
  if (error) {
    console.error("[members] Could not change progress sharing:", error.message);
    return { ok: false, message: describe(error, "Couldn't save that. Try again.") };
  }
  return { ok: true, shared: typeof data === "boolean" ? data : share };
}

/** How many clients share progress with the business; null while the stage is missing or unreadable. */
export async function fetchOutcomeShareCount(businessId: string): Promise<number | null> {
  const { data, error } = await rpc().rpc("business_client_share_count", { p_business_id: businessId });
  if (error || data === null || data === undefined) return null;
  return Number(data);
}
