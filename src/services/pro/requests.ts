// Release 3 · declining with a reason (DB-2 "Request decline with reason").
//
// - reject_client_request_with_reason(p_request_id, p_reason, p_message): the
//   client sees the reason and message. It keeps every check of the old
//   reject_client_request (ATX08, ATX09, ATX10, the cooldown). A reason is
//   required, and Other requires a message (22023).
// - decline_hire(p_hire_id, p_reason, p_message): wraps cancel_hire for a
//   pending hire.
// With no reason chosen, the existing reject_client_request / cancel_hire
// (services/hire-inbox, services/hires/pro) are used, as before.
// A declined request (not a hire) can be undone for 5 minutes
// (undo_client_request_decline; ATXH2 after that).
// Accepting stays accept_client_request (services/hire-inbox): the database
// starts the client in Onboarding and asks for the default data
// (professional_clients_ask_default_access).

import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { rpc } from "./rpc";
import { t, tk } from "../../i18n/core";

export type DeclineReason = "fully_booked" | "outside_specialty" | "location" | "other";

/** HO18 reason menu, in the frame's order. */
export const DECLINE_REASONS: { value: DeclineReason; label: string }[] = [
  { value: "fully_booked", label: tk("Fully booked") },
  { value: "outside_specialty", label: tk("Outside my specialty") },
  { value: "location", label: tk("Location doesn't suit") },
  { value: "other", label: tk("Other") },
];

export const DECLINE_MESSAGE_MAX = 280;

export type DeclineResult = { ok: true } | { ok: false; message: string; gone?: boolean };

function describe(error: { code?: string; message?: string }): DeclineResult {
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error.code === "ATX10" || error.code === "ATX08" || error.code === "ATXA1") return { ok: false, message: t("This request was already answered."), gone: true };
  if (error.code === "22023") return { ok: false, message: t("Add a short message when the reason is Other.") };
  return { ok: false, message: t("Couldn't decline. Try again.") };
}

export async function declineRequestWithReason(requestId: string, reason: DeclineReason, message: string): Promise<DeclineResult> {
  const { error } = await rpc("reject_client_request_with_reason", { p_request_id: requestId, p_reason: reason, p_message: message.trim() || null });
  return error ? describe(error) : { ok: true };
}

export async function declineHireWithReason(hireId: string, reason: DeclineReason, message: string): Promise<DeclineResult> {
  const { error } = await rpc("decline_hire", { p_hire_id: hireId, p_reason: reason, p_message: message.trim() || null });
  return error ? describe(error) : { ok: true };
}

// ---- Release 3 follow-up (20261124120000) ----
// pending_client_requests.plan_id, plan_price (stamped by the database from
// the plan) and message (the client's, at most 500). The columns aren't in
// the generated types yet, so the read is cast at this boundary.

export interface RequestDetails {
  planName: string | null;
  planPrice: number | null;
  planBilling: string | null;
  message: string | null;
}

type DetailRow = { id: string; plan_price: number | string | null; message: string | null; professional_plans: { name: string | null; billing: string | null } | null };

const table = (name: string) =>
  (supabase as unknown as { from: (t: string) => { select: (cols: string) => Query } }).from(name);
type Query = PromiseLike<{ data: unknown; error: PostgrestError | null }> & {
  in: (col: string, v: string[]) => Query;
  eq: (col: string, v: string) => Query;
  gte: (col: string, v: string) => Query;
  order: (col: string, o: { ascending: boolean }) => Query;
};

/** The plan and message of these requests, by request id. A failed read leaves the rows as they were. */
export async function fetchRequestDetails(ids: string[]): Promise<Record<string, RequestDetails>> {
  if (!ids.length) return {};
  const { data, error } = await table("pending_client_requests").select("id, plan_price, message, professional_plans(name, billing)").in("id", ids);
  if (error) return {};
  return Object.fromEntries(
    ((data ?? []) as DetailRow[]).map((r) => [
      r.id,
      {
        planName: r.professional_plans?.name ?? null,
        planPrice: r.plan_price === null ? null : Number(r.plan_price),
        planBilling: r.professional_plans?.billing ?? null,
        message: r.message?.trim() || null,
      },
    ])
  );
}

export interface RecentDecline {
  id: string;
  customerId: string;
  name: string;
  avatarUrl: string | null;
  resolvedAt: string;
}

/** Requests this professional declined in the last 5 minutes (still undoable). */
export async function fetchRecentDeclines(professionalId: string): Promise<RecentDecline[]> {
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await table("pending_client_requests")
    .select("id, customer_id, resolved_at")
    .eq("professional_id", professionalId)
    .eq("status", "rejected")
    .gte("resolved_at", since)
    .order("resolved_at", { ascending: false });
  if (error) return [];
  const rows = (data ?? []) as { id: string; customer_id: string; resolved_at: string }[];
  if (!rows.length) return [];
  const { data: people } = await supabase.from("related_profile_summary").select("id, first_name, avatar_url").in("id", rows.map((r) => r.customer_id));
  const by = new Map((people ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({
    id: r.id,
    customerId: r.customer_id,
    name: by.get(r.customer_id)?.first_name?.trim() || t("Name unavailable"),
    avatarUrl: by.get(r.customer_id)?.avatar_url ?? null,
    resolvedAt: r.resolved_at,
  }));
}

export const UNDO_TOO_LATE = tk("It's too late to undo this decline.");

/** undo_client_request_decline: back to pending within 5 minutes; ATXH2 after that. */
export async function undoRequestDecline(requestId: string): Promise<{ ok: true } | { ok: false; message: string; final?: boolean }> {
  const { error } = await rpc("undo_client_request_decline", { p_request_id: requestId });
  if (!error) return { ok: true };
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error.code === "ATXH2") return { ok: false, message: t(UNDO_TOO_LATE), final: true };
  if (error.code === "ATX10" || error.code === "ATX08") return { ok: false, message: t("This request was already answered."), final: true };
  return { ok: false, message: t("Couldn't undo. Try again.") };
}
