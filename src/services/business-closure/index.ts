import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { businessStatusOf, closureReason, type BusinessStatus } from "./logic";
import { t, tk } from "../../i18n/core";

export * from "./logic";

// CP (Database 20261130000000, HANDOVER_API "Batch 2 · A business is closed,
// never deleted"): close_business(business_id, reason) and
// business_accepts(business_id, kind). Neither is in the production-generated
// types, so the calls go through one narrow cast at this boundary.

type Rpc = <T>(fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>;
const rpc = (supabase as unknown as { rpc: (...a: unknown[]) => unknown }).rpc.bind(supabase) as unknown as Rpc;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- closed_at is not in the production-generated types
const db = supabase as any;

export type CloseResult = { ok: true; closedAt: string } | { ok: false; message: string };

/** Only the owner may close (42501 "only the owner can close the business"). */
export const CLOSE_OWNER_ONLY = tk("Only the owner can close the business.");

/**
 * close_business(): owner only, idempotent (closing twice returns the first
 * closed_at). No reopen and no delete. Nothing is destroyed.
 */
export async function closeBusiness(businessId: string, reason: string): Promise<CloseResult> {
  const { data, error } = await rpc<string>("close_business", { p_business_id: businessId, p_reason: closureReason(reason) });
  if (error || !data) {
    if (error) console.error("[business-closure] Could not close the business:", error.code, error.message);
    if (error && isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
    if (error?.code === "42501") return { ok: false, message: t(CLOSE_OWNER_ONLY) };
    return { ok: false, message: t("Couldn't close your business. Nothing changed. Try again.") };
  }
  return { ok: true, closedAt: data };
}

/**
 * Whether a business takes new bookings and sales, as this viewer can tell
 * (see logic.ts BusinessStatus): business_accepts(id, 'new'), granted to signed-in
 * accounts only; signed out, or on any failure, the answer is "unknown" and
 * the page keeps its actions (the tables refuse with ATXAB regardless).
 */
export async function fetchBusinessStatus(businessId: string): Promise<BusinessStatus> {
  if (!businessId) return "unknown";
  const { data: auth } = await supabase.auth.getSession();
  const signedIn = !!auth.session;
  const [open, row] = await Promise.all([
    signedIn ? rpc<boolean>("business_accepts", { p_business_id: businessId, p_kind: "new" }) : Promise.resolve({ data: null, error: null }),
    db.from("business_profiles").select("closed_at, deactivated_at").eq("id", businessId).maybeSingle(),
  ]);
  const isOpen = open.error || typeof open.data !== "boolean" ? null : open.data;
  const r = row.error ? null : ((row.data as { closed_at: string | null; deactivated_at: string | null } | null) ?? null);
  return businessStatusOf(isOpen, r);
}
