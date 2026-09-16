import { supabase } from "../../../lib/supabase/client";

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
//   create_business_member_code(business, plan, validity) mints a redeemable
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
// MEMBER NAMES ARE NOT AVAILABLE TO THE BUSINESS, same structural reason. A
// roster can show status, plan and dates, and cannot show who. Fixing that
// needs a view or a widened grant — a schema decision, not something this file
// can reach for.

/** Where a membership row sits. Derived, not stored — see toMembership. */
export type MembershipStatus = "pending" | "active" | "declined" | "ended";

export interface Membership {
  id: string;
  businessId: string;
  memberId: string;
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
  redeemed: boolean;
  expiresAt: string;
  createdAt: string;
}

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
type MembersTable = {
  select: (columns: string) => {
    eq: (
      column: string,
      value: string
    ) => {
      order: (
        column: string,
        options: { ascending: boolean }
      ) => PromiseLike<{ data: Row[] | null; error: PgError }>;
    };
  };
};

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
        data:
          | {
              id: string;
              code: string;
              membership_plan_id: string | null;
              redeemed: boolean;
              expires_at: string;
              created_at: string;
            }[]
          | null;
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

const membersTable = (): MembersTable =>
  (supabase as unknown as { from: (t: "business_members") => MembersTable }).from("business_members");

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
      return "You've done that a few times just now — wait a minute and try again.";
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
 * Plan names for the plans actually on screen, batched.
 *
 * STILL HERE, AND ONLY FOR THE BUSINESS'S OWN ROSTER. The member side reads
 * my_business_memberships instead, which carries plan_name already — but
 * membership_plans_select_public is
 * `business_is_listed(business_id) OR is_business_insider(business_id)`, and
 * an owner satisfies the second half whatever their listing is set to. So
 * this read works for fetchMyMembers and would not have worked for a member
 * looking at a delisted business. businessNames() is gone entirely: nothing
 * calls it now.
 */
async function planNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data } = await supabase.from("membership_plans").select("id, name").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id as string, p.name as string]));
}

/**
 * The business's own roster, every state included.
 *
 * NOT FILTERED TO ACTIVE. An owner needs to see that an invitation is still
 * unanswered and that somebody declined — a roster showing only the people who
 * said yes cannot explain why the person they invited is missing.
 */
export async function fetchMyMembers(
  businessId: string
): Promise<{ ok: true; members: Membership[] } | { ok: false; message: string }> {
  const { data, error } = await membersTable()
    .select(MEMBER_COLUMNS)
    .eq("business_id", businessId)
    .order("invited_at", { ascending: false });

  if (error) {
    console.error("[members] Could not read the member roster:", error.message);
    return { ok: false, message: "Couldn't load your members. Try again." };
  }
  const rows = data ?? [];
  const plans = await planNames(rows.map((r) => r.membership_plan_id).filter((x): x is string => !!x));
  return {
    ok: true,
    members: rows.map((r) => toMembership(r, r.membership_plan_id ? plans.get(r.membership_plan_id) ?? null : null)),
  };
}

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
    return { ok: false, message: describe(error, "Couldn't send that invitation. Try again.") };
  }
  return { ok: true };
}

/** Mints a code for a walk-in to redeem. */
export async function createMemberCode(
  businessId: string,
  membershipPlanId: string | null
): Promise<{ ok: true; code: MemberCode } | { ok: false; message: string }> {
  const { data, error } = await rpc().rpc("create_business_member_code", {
    p_business_id: businessId,
    p_membership_plan_id: membershipPlanId,
    // Left at the function's own default rather than restated here, so the
    // validity window lives in one place.
    p_valid_for: null,
  });

  if (error || !data) {
    console.error("[members] Could not create a member code:", error?.message);
    return { ok: false, message: describe(error ?? {}, "Couldn't create a code. Try again.") };
  }
  const row = data as {
    id: string;
    code: string;
    membership_plan_id: string | null;
    redeemed: boolean;
    expires_at: string;
    created_at: string;
  };
  return {
    ok: true,
    code: {
      id: row.id,
      code: row.code,
      membershipPlanId: row.membership_plan_id,
      redeemed: row.redeemed,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    },
  };
}

/** Codes this business has issued, newest first. */
export async function fetchMyMemberCodes(
  businessId: string
): Promise<{ ok: true; codes: MemberCode[] } | { ok: false; message: string }> {
  const { data, error } = await codesTable()
    .select("id, code, membership_plan_id, redeemed, expires_at, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[members] Could not read member codes:", error.message);
    return { ok: false, message: "Couldn't load your codes. Try again." };
  }
  return {
    ok: true,
    codes: (data ?? []).map((c) => ({
      id: c.id,
      code: c.code,
      membershipPlanId: c.membership_plan_id,
      redeemed: c.redeemed,
      expiresAt: c.expires_at,
      createdAt: c.created_at,
    })),
  };
}

/**
 * Redeems a member code.
 *
 * THE RESULT IS A ROW, NOT AN EXCEPTION, for the ordinary refusals — a wrong,
 * used or expired code comes back as `success: false` with its own sentence,
 * the same shape redeem_client_code uses. Only the structural failures (no
 * session, rate limit) raise, and describe() handles those.
 */
export async function redeemMemberCode(
  code: string
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, message: "Enter the code first." };

  const { data, error } = await rpc().rpc("redeem_business_member_code", { p_code: trimmed });
  if (error) {
    console.error("[members] Could not redeem:", error.message);
    return { ok: false, message: describe(error, "Couldn't redeem that code. Try again.") };
  }
  const result = data as { success: boolean; message: string } | null;
  if (!result?.success) {
    return { ok: false, message: result?.message ?? "Couldn't redeem that code." };
  }
  return { ok: true, message: result.message };
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
