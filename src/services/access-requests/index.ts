import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { AccessCategory } from "../consent";

// Release 3 · DB-2 "Asking for data": a professional asks a client to share one
// data type (request_client_access); only the client answers, with
// answer_access_request(id, grant). A "yes" turns the switch on in the
// database (client_access_grants) and notifies the professional; a "no"
// records the decline. RLS (access_requests_select_involved) lets the client
// read the requests naming them.

export interface AccessRequest {
  id: string;
  professionalId: string;
  category: AccessCategory;
  message: string | null;
  createdAt: string;
}

export type AccessRequestsResult =
  | { ok: true; requests: AccessRequest[]; message?: undefined }
  | { ok: false; requests: AccessRequest[]; message: string };

/** The signed-in client's pending requests, newest first. */
export async function getMyAccessRequests(): Promise<AccessRequestsResult> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const me = auth.user?.id;
    if (!me) return { ok: true, requests: [] };
    const { data, error } = await supabase
      .from("access_requests")
      .select("id, professional_id, category, message, created_at")
      .eq("client_id", me)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) {
      return { ok: false, requests: [], message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't load requests. Try again." };
    }
    return {
      ok: true,
      requests: (data ?? []).map((r) => ({
        id: r.id,
        professionalId: r.professional_id,
        category: r.category,
        message: r.message,
        createdAt: r.created_at,
      })),
    };
  } catch (e) {
    return { ok: false, requests: [], message: isOffline(e) ? OFFLINE_MESSAGE : "Couldn't load requests. Try again." };
  }
}

export type AnswerResult = { ok: true } | { ok: false; message: string };

/**
 * Answers one request. ATX10 (already answered) counts as done: the request is
 * no longer pending either way, so the notice can go.
 */
export async function answerAccessRequest(id: string, grant: boolean): Promise<AnswerResult> {
  try {
    const { error } = await supabase.rpc("answer_access_request", { p_request_id: id, p_grant: grant });
    if (!error || error.code === "ATX10") return { ok: true };
    if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
    if (error.code === "ATX12") return { ok: false, message: "You're no longer connected with this professional." };
    return { ok: false, message: "Couldn't save your answer. Try again." };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : "Couldn't save your answer. Try again." };
  }
}

export { requestBody, requestSummary, requestTitle, joinWithAnd, firstNameOf } from "./copy";
