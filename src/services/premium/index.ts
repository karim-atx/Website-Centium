// Round G1 · the Database calls (DB_G1_HANDOVER.md "For the Website").
//
// PENDING RULE: until the Database's G1 is on the stack, a missing function
// (PGRST202 / 42883) reads as "off", so every screen keeps today's behaviour.
// A failed read is "off" too: the switches decide whether anything new is
// shown at all, and nothing new is ever shown on a guess.
//
// Hiring credits and business plan levels are bought in the Centium app
// only (decision G10; G fixes 2). The web only records the level the owner
// will buy there (choose_business_plan_level, G fixes 3), which opens no
// charge.

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { t } from "../../i18n/core";
import {
  choiceAlreadyMade,
  choosePlanLevelArgs,
  parseCandidates,
  parseClassCredits,
  parseFreeLimits,
  parseGymPasses,
  parseHiringCredits,
  parseLevel,
  parseLevelPrices,
  parseMyPasses,
  parseMyPremium,
  parseSwitches,
  premiumCodeMessage,
  type ClassCredits,
  type FreeLimits,
  type GymPasses,
  type HiringCredits,
  type MyPasses,
  type MyPremium,
  type PassCandidate,
  type PlanLevel,
  type PlanLevelPrice,
  type PlanPeriod,
  type Switches,
} from "./model";

export * from "./model";

type Err = { code?: string; message?: string; details?: string | null; hint?: string | null };

export type Read<T> = { ok: true; value: T } | { ok: false; missing: boolean; offline: boolean; message: string };
export type Write<T> = { ok: true; value: T } | { ok: false; code?: string; offline: boolean; message: string };

const isMissing = (code: string | undefined) => code === "PGRST202" || code === "42883";

async function read<T>(run: () => PromiseLike<{ data: unknown; error: Err | null }>, parse: (data: unknown) => T, fallback: string): Promise<Read<T>> {
  try {
    const { data, error } = await run();
    if (error) return { ok: false, missing: isMissing(error.code), offline: isOffline(error), message: isOffline(error) ? OFFLINE_MESSAGE : fallback };
    return { ok: true, value: parse(data) };
  } catch (e) {
    return { ok: false, missing: false, offline: isOffline(e), message: isOffline(e) ? OFFLINE_MESSAGE : fallback };
  }
}

async function write<T>(run: () => PromiseLike<{ data: unknown; error: Err | null }>, parse: (data: unknown) => T, fallback: string): Promise<Write<T>> {
  try {
    const { data, error } = await run();
    if (error) {
      if (isOffline(error)) return { ok: false, offline: true, message: OFFLINE_MESSAGE };
      return { ok: false, code: error.code, offline: false, message: premiumCodeMessage(error.code, { detail: error.details, message: error.message }) ?? fallback };
    }
    return { ok: true, value: parse(data) };
  } catch (e) {
    return { ok: false, offline: isOffline(e), message: isOffline(e) ? OFFLINE_MESSAGE : fallback };
  }
}

const idOf = (data: unknown) => (typeof data === "string" ? data : String(data ?? ""));

// ---- member ----

export const fetchSwitches = (): Promise<Read<Switches>> => read(() => supabase.rpc("my_switches"), parseSwitches, t("Couldn't load your settings."));

export const fetchMyPremium = (): Promise<Read<MyPremium>> => read(() => supabase.rpc("my_premium"), parseMyPremium, t("Couldn't load your plan."));

export const fetchFreeLimits = (): Promise<Read<FreeLimits | null>> => read(() => supabase.rpc("free_limits"), parseFreeLimits, t("Couldn't load your plan."));

// ---- the professional's passes ----

export const fetchMyPasses = (): Promise<Read<MyPasses>> => read(() => supabase.rpc("my_premium_passes"), parseMyPasses, t("Couldn't load your Premium passes."));

export const fetchPassCandidates = (): Promise<Read<PassCandidate[]>> => read(() => supabase.rpc("premium_pass_candidates"), parseCandidates, t("Couldn't load your clients."));

export const givePremiumPass = (clientId: string): Promise<Write<string>> =>
  write(() => supabase.rpc("give_premium_pass", { p_client_id: clientId }), idOf, t("Couldn't include Premium. Try again."));

export const endPremiumPass = (clientId: string): Promise<Write<true>> =>
  write(() => supabase.rpc("end_premium_pass", { p_client_id: clientId }), () => true as const, t("Couldn't take Premium back. Try again."));

// ---- the gym's opt-in ----

export const fetchGymPasses = (businessId: string): Promise<Read<GymPasses>> =>
  read(() => supabase.rpc("business_premium_passes", { p_business_id: businessId }), parseGymPasses, t("Couldn't load this setting."));

export const setGymPremium = (businessId: string, on: boolean): Promise<Write<boolean>> =>
  write(() => supabase.rpc("set_business_premium_for_members", { p_business_id: businessId, p_on: on }), (d) => d === true, t("Couldn't save. Try again."));

// ---- business plan levels ----

export const fetchLevelPrices = (): Promise<Read<PlanLevelPrice[]>> => read(() => supabase.rpc("business_plan_level_prices"), parseLevelPrices, t("Couldn't load the prices."));

export const fetchPlanLevel = (businessId: string): Promise<Read<PlanLevel | null>> =>
  read(() => supabase.rpc("business_plan_level", { p_business_id: businessId }), parseLevel, t("Couldn't load your plan."));

/**
 * "Choose this plan" (G fixes 3): records the level the owner will buy in
 * the Centium app and returns the choice id. It opens no charge; choosing
 * again replaces the choice. ATXD7 (an older Database's "already chosen") and
 * a repeat choice both read as chosen.
 */
export async function choosePlanLevel(businessId: string, seatBlocks: number, p: PlanPeriod): Promise<Write<string>> {
  const r = await write(
    () => supabase.rpc("choose_business_plan_level", choosePlanLevelArgs(businessId, seatBlocks, p)),
    idOf,
    t("Couldn't save your plan choice. Try again.")
  );
  if (!r.ok && choiceAlreadyMade(r.code)) return { ok: true, value: "" };
  if (!r.ok && r.code === "ATX03") return { ...r, message: t("Only the business owner can choose the plan.") };
  return r;
}

// ---- hiring credits ----

export const fetchHiringCredits = (businessId: string): Promise<Read<HiringCredits>> =>
  read(() => supabase.rpc("my_hiring_credits", { p_business_id: businessId }), parseHiringCredits, t("Couldn't load your hiring credits."));

// ---- class credits (Round G5) ----

/** my_class_credits: a failed read or a database without G5 (PGRST202 / 42883) is not ok, which every caller reads as off. */
export const fetchClassCredits = (businessId: string): Promise<Read<ClassCredits>> =>
  read(() => supabase.rpc("my_class_credits", { p_business_id: businessId }), parseClassCredits, t("Couldn't load your class credits."));
