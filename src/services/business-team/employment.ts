import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";

// v6 Batch 4 · the professional's side of B0 consent and B6 join requests.
//
// A business adds a professional (invite_employee, or by approving their join
// request) and the row starts UNACCEPTED: not affiliated, no seat, no access.
// my_business_employments() is how that invitation becomes visible to the
// person it names, and accept_business_employment(business) is the only way
// to accept it. A professional may work for several businesses.
//
// DECLINING AND LEAVING are the same write: the professional deletes their own
// business_employees row (policy business_employees_delete_professional,
// auth.uid() = professional_id). Always scoped to ONE business, because a
// professional may belong to several.

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- B0 / B6 functions, not in the production-generated types
const db = supabase as any;

export type Done = { ok: true } | { ok: false; message: string };

export interface MyEmployment {
  businessId: string;
  businessName: string;
  acceptedAt: string | null;
  invitedAt: string;
  /** The role they're invited as, and the owner's note (invite_message, B6 follow-up). */
  role: string | null;
  message: string | null;
}

export async function fetchMyEmployments(): Promise<{ ok: true; value: MyEmployment[] } | { ok: false; message: string }> {
  const { data, error } = await db.rpc("my_business_employments");
  if (error) {
    return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't load your businesses. Try again." };
  }
  // The role and the owner's note come from the caller's own rows
  // (business_employees_select_professional); my_business_employments() doesn't
  // return them. A failed read only loses the note, not the invitation.
  const { data: auth } = await supabase.auth.getUser();
  const own = auth.user?.id
    ? await db.from("business_employees").select("business_id, role, invite_message").eq("professional_id", auth.user.id)
    : { data: [] };
  const extra = new Map(
    ((own.data ?? []) as { business_id: string; role: string | null; invite_message: string | null }[]).map((r) => [r.business_id, r])
  );
  return {
    ok: true,
    value: ((data ?? []) as { business_id: string; business_name: string | null; accepted_at: string | null; invited_at: string }[]).map((r) => ({
      businessId: r.business_id,
      businessName: r.business_name?.trim() || "A business",
      acceptedAt: r.accepted_at,
      invitedAt: r.invited_at,
      role: extra.get(r.business_id)?.role ?? null,
      message: extra.get(r.business_id)?.invite_message ?? null,
    })),
  };
}

export async function acceptEmployment(businessId: string): Promise<Done> {
  const { error } = await db.rpc("accept_business_employment", { p_business_id: businessId });
  if (!error) return { ok: true };
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error.code === "ATXA3") return { ok: false, message: "This invitation was withdrawn." };
  // B6 follow-up: the seat cap now also holds on acceptance.
  if (`${error.message ?? ""}`.includes("ATXC0") || error.code === "23514") {
    return { ok: false, message: "This business has no free seat right now. Ask them to add one." };
  }
  console.error("[employment] accept failed:", error.code, error.message);
  return { ok: false, message: "Couldn't accept. Try again." };
}

/** Decline an invitation, or leave a team you joined: removes your own row for that business only. */
export async function removeMyEmployment(businessId: string): Promise<Done> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { ok: false, message: "Sign in again to continue." };
  const { error } = await db.from("business_employees").delete().eq("business_id", businessId).eq("professional_id", me);
  if (!error) return { ok: true };
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  console.error("[employment] remove failed:", error.code, error.message);
  return { ok: false, message: "Couldn't update that. Try again." };
}

export interface MyJoinRequest {
  id: string;
  businessId: string;
  businessName: string;
  createdAt: string;
}

/** My own pending join requests (business_join_requests_select_involved). */
export async function fetchMyJoinRequests(): Promise<{ ok: true; value: MyJoinRequest[] } | { ok: false; message: string }> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { ok: true, value: [] };
  const { data, error } = await db
    .from("business_join_requests")
    .select("id, business_id, created_at")
    .eq("professional_id", me)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't load your requests. Try again." };
  const rows = (data ?? []) as { id: string; business_id: string; created_at: string }[];
  const ids = [...new Set(rows.map((r) => r.business_id))];
  const names = ids.length ? await db.from("business_profiles").select("id, business_name").in("id", ids) : { data: [] };
  const nameById = new Map(((names.data ?? []) as { id: string; business_name: string | null }[]).map((b) => [b.id, b.business_name?.trim() || "A business"]));
  return {
    ok: true,
    value: rows.map((r) => ({ id: r.id, businessId: r.business_id, businessName: nameById.get(r.business_id) ?? "A business", createdAt: r.created_at })),
  };
}

/**
 * request_to_join_business(code). One not-found answer for a missing code, a
 * paused business and one you already work for (ATXB9); asking twice returns
 * the same request. Rate limited (ATX02).
 */
export async function requestToJoin(code: string): Promise<Done> {
  const { error } = await db.rpc("request_to_join_business", { p_code: code.trim().toUpperCase() });
  if (!error) return { ok: true };
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error.code === "ATX02") return { ok: false, message: "Too many tries in a short time. Try again in an hour." };
  if (`${error.message ?? ""}`.includes("ATXB9")) return { ok: false, message: "No business found for that ID." };
  console.error("[employment] request_to_join_business failed:", error.code, error.message);
  return { ok: false, message: "Couldn't send your request. Try again." };
}
