import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typed } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";

/**
 * Database stage B5 (HANDOVER_API.md "B5 · Onboarding drafts"):
 * onboarding_drafts(profile_id, lane, business_id, step_key, payload).
 *
 * One draft per profile and lane (the unique index coalesces business_id, so
 * two client drafts collide). The payload is opaque jsonb, an object, at most
 * 64 KB. Own rows only (RLS onboarding_drafts_all_own). A business draft must
 * name its business (CHECK lane = 'business' <=> business_id not null), so a
 * business lane without a business row yet stays on the device only.
 *
 * This replaces the localStorage record `centium-onboarding:state` as the
 * home of a signed-in account's draft: "Save and exit" now survives another
 * device, cleared site data and a sign-in redirect. The device copy stays as
 * the signed-out (pre-account) draft and as the offline cache.
 */

// B5 is newer than lib/supabase/database.types.ts (generated from production): untyped here.
const supabase = typed as unknown as SupabaseClient;

export type DraftLane = "client" | "professional" | "business";

export interface ServerDraft {
  lane: DraftLane;
  businessId: string | null;
  stepKey: string;
  payload: Record<string, unknown>;
  updatedAt: string;
}

export type DraftResult<T> = { ok: true; value: T } | { ok: false; offline: boolean; message: string };

const fail = (error: unknown): { ok: false; offline: boolean; message: string } => ({
  ok: false,
  offline: isOffline(error),
  message: error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "error",
});

/** Every draft this account has, newest first. */
export async function listDrafts(profileId: string): Promise<DraftResult<ServerDraft[]>> {
  try {
    const { data, error } = await supabase
      .from("onboarding_drafts")
      .select("lane, business_id, step_key, payload, updated_at")
      .eq("profile_id", profileId)
      .order("updated_at", { ascending: false });
    if (error) return fail(error);
    const rows = (data ?? []) as {
      lane: DraftLane;
      business_id: string | null;
      step_key: string;
      payload: Record<string, unknown>;
      updated_at: string;
    }[];
    return {
      ok: true,
      value: rows.map((r) => ({ lane: r.lane, businessId: r.business_id, stepKey: r.step_key, payload: r.payload ?? {}, updatedAt: r.updated_at })),
    };
  } catch (e) {
    return fail(e);
  }
}

/** The 64 KB cap is on the stored jsonb; this is the same limit on the JSON text, a little stricter. */
export const DRAFT_MAX_BYTES = 64 * 1024;

/**
 * Writes this lane's draft: update the existing row, insert when none
 * matched. Not an upsert: the unique index is an expression index
 * (coalesce(business_id, zero-uuid)), which ON CONFLICT cannot name.
 */
export async function saveDraft(
  profileId: string,
  lane: DraftLane,
  stepKey: string,
  payload: Record<string, unknown>,
  businessId: string | null = null
): Promise<DraftResult<true>> {
  if (lane === "business" && !businessId) return { ok: false, offline: false, message: "no business yet" };
  const text = JSON.stringify(payload);
  if (new Blob([text]).size > DRAFT_MAX_BYTES) return { ok: false, offline: false, message: "draft too large" };
  const key = stepKey.trim().slice(0, 60) || "welcome";
  try {
    let q = supabase.from("onboarding_drafts").update({ step_key: key, payload }).eq("profile_id", profileId).eq("lane", lane);
    q = businessId ? q.eq("business_id", businessId) : q.is("business_id", null);
    const { data, error } = await q.select("id");
    if (error) return fail(error);
    if (data && data.length > 0) return { ok: true, value: true };
    const ins = await supabase
      .from("onboarding_drafts")
      .insert({ profile_id: profileId, lane, business_id: businessId, step_key: key, payload });
    if (ins.error) {
      // Lost a race with another tab's insert: the row exists now, so update it.
      if (ins.error.code === "23505") return saveDraft(profileId, lane, stepKey, payload, businessId);
      return fail(ins.error);
    }
    return { ok: true, value: true };
  } catch (e) {
    return fail(e);
  }
}

/** Removes the account's drafts (all lanes, or one), once onboarding is finished. */
export async function deleteDrafts(profileId: string, lane?: DraftLane): Promise<DraftResult<true>> {
  try {
    let q = supabase.from("onboarding_drafts").delete().eq("profile_id", profileId);
    if (lane) q = q.eq("lane", lane);
    const { error } = await q;
    if (error) return fail(error);
    return { ok: true, value: true };
  } catch (e) {
    return fail(e);
  }
}
