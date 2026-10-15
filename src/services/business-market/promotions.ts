import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typed } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { Result } from "./index";
import { promoErrorMessage, toPromotion, toStats, type DbPromoTarget, type DbPromoType, type PromoAudience, type PromoStatRow, type PromoStats, type Promotion, type PromotionRow } from "./promoLogic";

export * from "./promoLogic";

// B13 MK-05 promotions (HANDOVER_API "Promotions (MK-05)"). Checked on the
// local stack:
//   promotions: RLS select = insiders see every row; write = business_can marketing.
//     INSERT grant: business_id, name, target_kind, target_id, type, value, code,
//     use_limit, starts_on, ends_on, audience, show_on_listing.
//     UPDATE grant: the same minus business_id, plus paused_at, ended_at. DELETE granted.
//   promotions_guard: ATX10 when a started promotion's offer changes; code uppercased.
//   promotion_stats(p_business_id) gate marketing or revenue.
//   record_promotion_redemption(p_promotion_id, p_payment_id) gate revenue / front_desk / store; ATXF8.
// Not in the generated types yet: the untyped client view at this boundary.

const db = typed as unknown as SupabaseClient;

type Err = { code?: string; message?: string };

const fail = <T>(e: Err, fallback: string): Result<T> => ({
  ok: false,
  code: e.code,
  message: isOffline(e) ? OFFLINE_MESSAGE : promoErrorMessage(e, fallback),
});

const COLS = "id, business_id, name, target_kind, target_id, type, value, code, use_limit, starts_on, ends_on, audience, show_on_listing, paused_at, ended_at, created_at";

export async function fetchPromotions(businessId: string): Promise<Result<Promotion[]>> {
  try {
    const { data, error } = await db.from("promotions").select(COLS).eq("business_id", businessId).order("starts_on", { ascending: false }).order("created_at", { ascending: false });
    if (error) return fail(error, "Couldn't load your promotions.");
    return { ok: true, value: ((data ?? []) as PromotionRow[]).map(toPromotion) };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : "Couldn't load your promotions." };
  }
}

export async function fetchPromotionStats(businessId: string): Promise<Result<Map<string, PromoStats>>> {
  try {
    const { data, error } = await db.rpc("promotion_stats", { p_business_id: businessId });
    if (error) return fail(error, "Couldn't load your promotions.");
    return { ok: true, value: toStats((data ?? []) as PromoStatRow[]) };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : "Couldn't load your promotions." };
  }
}

export interface PromotionInput {
  name: string;
  targetKind: DbPromoTarget;
  targetId: string | null;
  type: DbPromoType;
  value: number | null;
  startsOn: string;
  endsOn: string | null;
  audience: PromoAudience;
}

async function one(q: PromiseLike<{ data: unknown; error: Err | null }>, fallback: string): Promise<Result<Promotion>> {
  try {
    const { data, error } = await q;
    if (error) {
      console.error("[promotions]", error.code, error.message);
      return fail(error, fallback);
    }
    return { ok: true, value: toPromotion(data as PromotionRow) };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : fallback };
  }
}

export function createPromotion(businessId: string, p: PromotionInput): Promise<Result<Promotion>> {
  return one(
    db
      .from("promotions")
      .insert({
        business_id: businessId,
        name: p.name,
        target_kind: p.targetKind,
        target_id: p.targetId,
        type: p.type,
        value: p.value,
        starts_on: p.startsOn,
        ends_on: p.endsOn,
        audience: p.audience,
      })
      .select(COLS)
      .single(),
    "Couldn't save your promotion. Try again."
  );
}

/** Only the changed columns. A started promotion's offer is refused by the server (ATX10). */
export type PromotionPatch = Partial<{
  name: string;
  target_kind: DbPromoTarget;
  target_id: string | null;
  type: DbPromoType;
  value: number | null;
  starts_on: string;
  ends_on: string | null;
  audience: PromoAudience;
  show_on_listing: boolean;
  paused_at: string | null;
  ended_at: string | null;
}>;

export function updatePromotion(id: string, patch: PromotionPatch, fallback = "Couldn't save your changes. Try again."): Promise<Result<Promotion>> {
  return one(db.from("promotions").update(patch).eq("id", id).select(COLS).single(), fallback);
}

export const pausePromotion = (id: string, paused: boolean) => updatePromotion(id, { paused_at: paused ? new Date().toISOString() : null }, paused ? "Couldn't pause it. Try again." : "Couldn't resume it. Try again.");
export const endPromotion = (id: string) => updatePromotion(id, { ended_at: new Date().toISOString() }, "Couldn't end it. Try again.");
export const setPromotionOnListing = (id: string, on: boolean) => updatePromotion(id, { show_on_listing: on }, "Couldn't change your listing. Try again.");

/** Cancel a scheduled promotion (it never started, so nothing was recorded against it). */
export async function cancelPromotion(id: string): Promise<Result<null>> {
  try {
    const { error } = await db.from("promotions").delete().eq("id", id);
    if (error) return fail(error, "Couldn't cancel it. Try again.");
    return { ok: true, value: null };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : "Couldn't cancel it. Try again." };
  }
}

/**
 * record_promotion_redemption: "this payment used that offer" (one per
 * payment). The price stays what the business charged. No caller in the
 * Marketplace slice: payments are recorded at the front desk, store and
 * revenue screens.
 */
export async function recordPromotionRedemption(promotionId: string, paymentId: string): Promise<Result<string>> {
  try {
    const { data, error } = await db.rpc("record_promotion_redemption", { p_promotion_id: promotionId, p_payment_id: paymentId });
    if (error) return fail(error, "Couldn't record the promotion. Try again.");
    return { ok: true, value: String(data) };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : "Couldn't record the promotion. Try again." };
  }
}
