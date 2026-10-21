import type { PlanKind } from "../membership-plans/types";
import { KIND_LABEL } from "../../pages/business-ops/plans/planModel";

// CN (Batch 2, migration 20261203000000): a member code can grant a
// membership or pass. The pure part, free of Supabase so node tests can
// import it: the words for every refusal of create_business_member_code and
// redeem_business_member_code, what a code grants, and which membership
// appeared after a redemption.
//
// SERVER COPY IS NEVER SHOWN. Both functions answer in sentences meant for a
// log ("-- say which one the membership is for"), so each one is matched and
// replaced by our own words; anything unmatched gets the plain fallback.

/** Plan types as a reader says them inside a sentence ("a day pass"). */
export const KIND_WORD: Record<PlanKind, string> = {
  membership: "membership",
  day_pass: "day pass",
  class_pack: "class pack",
  intro_offer: "intro offer",
  drop_in: "drop-in",
};

export const OFFLINE_LINE = "You're offline. Connect and try again.";
const SESSION_LINE = "Your session expired. Sign in again.";

type Err = { code?: string | null; message?: string | null };

/** "in 12 minutes" from check_rate_limit's "Please try again in N minute(s)." */
function waitPhrase(message: string | null | undefined): string {
  const m = /in (\d+) minute/i.exec(message ?? "");
  if (!m) return "in a few minutes";
  const n = Number(m[1]);
  return `in ${n} ${n === 1 ? "minute" : "minutes"}`;
}

/**
 * create_business_member_code's refusals (HANDOVER_API Batch 2, CN):
 * no code 'authentication required'; ATX02 (20 an hour); ATX09; ATX08;
 * ATX25; ATXAC 'no gym' / 'N gyms' / 'different business'.
 */
export function describeCreateRefusal(error: Err, offline: boolean): string {
  if (offline) return OFFLINE_LINE;
  const message = error.message ?? "";
  switch (error.code ?? "") {
    case "ATX02":
      return `You can create 20 codes an hour. Try again ${waitPhrase(message)}.`;
    case "ATX09":
      return "You need Members access to create member codes. Ask the owner.";
    case "ATX08":
      return "We couldn't find your business. Refresh and try again.";
    case "ATX25":
      return "That plan belongs to another business. Choose another plan.";
    case "ATXAC": {
      if (/no gym/i.test(message)) return "A membership or pass needs a gym. Add a gym first, or create a code with no plan.";
      const n = /has (\d+) gyms/i.exec(message);
      if (n) return `Choose which of your ${n[1]} gyms this membership is for.`;
      if (/different business/i.test(message)) return "That gym isn't one of yours. Choose another gym.";
      return "Couldn't create a code. Try again.";
    }
    default:
      if (/jwt|not authenticated|authentication required/i.test(message)) return SESSION_LINE;
      return "Couldn't create a code. Try again.";
  }
}

/**
 * redeem_business_member_code's success=false sentences, in our words. A
 * refused code is NOT used up (the function returns before marking it), so
 * none of these may say or imply that it was spent.
 */
export function describeRedeemRefusal(serverMessage: string | null | undefined): string {
  const m = (serverMessage ?? "").trim();
  if (/^that code is not valid/i.test(m)) return "That code isn't valid. Check it and try again.";
  if (/^that code has already been used/i.test(m)) return "That code has already been used. Ask the business for a new one.";
  if (/^that code has expired/i.test(m)) return "That code has expired. Ask the business for a new one.";
  if (/^you cannot join your own business/i.test(m)) return "That code is for your own business, so you can't join with it.";
  if (/^you are already a member of this business/i.test(m)) return "You're already a member of this business.";
  const age = /admits members aged (\d+) and over/i.exec(m);
  if (age) return `This gym admits members aged ${age[1]} and over.`;
  if (/^that plan is no longer available/i.test(m)) return "That plan is no longer available. Ask the business for a new code.";
  return "Couldn't redeem that code. Try again.";
}

/** redeem_business_member_code raised instead of answering (rate limit, session, network). */
export function describeRedeemError(error: Err, offline: boolean): string {
  if (offline) return OFFLINE_LINE;
  if (error.code === "ATX02") return `Too many tries. Wait ${waitPhrase(error.message).replace(/^in /, "")} and try again.`;
  if (/jwt|not authenticated|authentication required/i.test(error.message ?? "")) return SESSION_LINE;
  return "Couldn't redeem that code. Try again.";
}

export interface GrantPlan {
  id: string;
  name: string;
  kind: PlanKind;
}
export interface GrantGym {
  gymId: string;
  name: string;
}

/**
 * What a code grants, for the business's list: "No plan", or the plan and
 * its type, with the gym only when the business has several (a single-gym
 * business has nowhere else for it to be).
 */
export function grantsLine(
  code: { membershipPlanId: string | null; gymId: string | null },
  plans: GrantPlan[],
  gyms: GrantGym[],
): string {
  if (!code.membershipPlanId) return "No plan";
  const plan = plans.find((p) => p.id === code.membershipPlanId);
  const what = plan ? `${plan.name} (${KIND_LABEL[plan.kind]})` : "A plan";
  if (gyms.length < 2 || !code.gymId) return what;
  const gym = gyms.find((g) => g.gymId === code.gymId);
  return gym ? `${what} at ${gym.name}` : what;
}

/** Which create inputs the sheet still needs before Create can be pressed. */
export type CreateBlock = null | "choose-gym" | "no-gym" | "gyms-loading" | "gyms-error";

export function createBlock(input: {
  planId: string | null;
  gymId: string | null;
  gymCount: number;
  gymsLoading: boolean;
  gymsError: boolean;
}): CreateBlock {
  // A plain member code needs no gym (the server only resolves one for a plan).
  if (!input.planId) return null;
  if (input.gymsLoading) return "gyms-loading";
  if (input.gymsError) return "gyms-error";
  if (input.gymCount === 0) return "no-gym";
  if (input.gymCount > 1 && !input.gymId) return "choose-gym";
  return null;
}

/**
 * p_gym_id goes to the server ONLY for a business with several gyms. With one
 * gym the server resolves it; with none it raises ATXAC 'no gym' (shown).
 */
export function gymArg(planId: string | null, gymId: string | null, gymCount: number): string | null {
  return planId && gymCount > 1 ? gymId : null;
}

export interface HeldMembership {
  id: string;
  gymName: string;
  planName: string;
}

/**
 * After a successful redemption: the memberships that appeared. The server
 * grants nothing when the code has no plan, or when the person already holds
 * an active membership at that gym, so an empty answer is ordinary.
 */
export function newMemberships<T extends { id: string }>(before: T[], after: T[]): T[] {
  const had = new Set(before.map((m) => m.id));
  return after.filter((m) => !had.has(m.id));
}

/**
 * The line shown after a successful redemption. Never implies a pass that did
 * not appear. `unknown`: the memberships could not be re-read, so whether
 * anything came with the code is not known yet.
 */
export function redeemedLine(granted: HeldMembership[], businessName: string | null, unknown = false): string {
  const joined = businessName ? `You've joined ${businessName}.` : "You've joined the business.";
  if (unknown) return `${joined} Reload to see any membership or pass that came with the code.`;
  if (granted.length === 1) {
    const g = granted[0];
    return `${joined} Your ${g.planName} at ${g.gymName} is now in your memberships.`;
  }
  if (granted.length > 1) return `${joined} ${granted.length} new memberships are now in your memberships.`;
  return joined;
}
