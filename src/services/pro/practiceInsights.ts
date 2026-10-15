// Release 3 · W6 MO19 v3 Practice insights: the documented readers.
// - practice_insights() (DB-3; HANDOVER_API "Release 3"): clients_coached,
//   active_clients, sessions_delivered, average_rating, review_count,
//   retention_90d_pct (null below 5 starts) with retention_note,
//   years_on_centium;
// - professional_client_stage_history (select own) for the roster over time;
// - pending_client_requests (select involved) for enquiries and hires;
// - professional_reviews (select own, not deleted) for ratings by month;
// - professional_profiles.created_at (own) for "You started {n} weeks ago";
// - sessions and outcomes come from the calendar readers (services/pro/home
//   fetchSessions, services/pro/clientPage fetchEventOutcomes).
// Every number is the professional's own practice; no client health data.

import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";
import { rpc } from "./rpc";
import type { Read } from "./clients";
import type { ClientStage, StageChange } from "../../components/pro/insights/practice/practiceModel";

const from = (table: string) => supabase.from(table as never);
const readFail = (error: unknown) => ({ ok: false as const, offline: isOffline(error) });

export interface PracticeTotals {
  clientsCoached: number;
  activeClients: number;
  sessionsDelivered: number;
  averageRating: number | null;
  reviewCount: number;
  retention90: number | null;
  yearsOnCentium: number | null;
}

export async function fetchPracticeTotals(): Promise<Read<PracticeTotals | null>> {
  const { data, error } = await rpc("practice_insights");
  if (error) return readFail(error);
  const r = (Array.isArray(data) ? data[0] : data) as
    | { clients_coached: number; active_clients: number; sessions_delivered: number; average_rating: number | string | null; review_count: number; retention_90d_pct: number | null; years_on_centium: number | null }
    | undefined;
  if (!r) return { ok: true, data: null };
  return {
    ok: true,
    data: {
      clientsCoached: r.clients_coached ?? 0,
      activeClients: r.active_clients ?? 0,
      sessionsDelivered: r.sessions_delivered ?? 0,
      averageRating: r.average_rating == null ? null : Number(r.average_rating),
      reviewCount: r.review_count ?? 0,
      retention90: r.retention_90d_pct,
      yearsOnCentium: r.years_on_centium,
    },
  };
}

export async function fetchStageHistory(me: string): Promise<Read<StageChange[]>> {
  const { data, error } = await from("professional_client_stage_history").select("client_id, to_stage, changed_at").eq("professional_id", me).order("changed_at");
  if (error) return readFail(error);
  return { ok: true, data: ((data ?? []) as unknown as { client_id: string; to_stage: ClientStage; changed_at: string }[]).map((r) => ({ clientId: r.client_id, toStage: r.to_stage, changedAt: r.changed_at })) };
}

export interface Enquiry {
  clientId: string;
  status: "pending" | "accepted" | "rejected";
  requestedAt: string;
  resolvedAt: string | null;
}

export async function fetchEnquiries(me: string, sinceIso: string): Promise<Read<Enquiry[]>> {
  const { data, error } = await from("pending_client_requests").select("customer_id, status, requested_at, resolved_at").eq("professional_id", me).gte("requested_at", sinceIso);
  if (error) return readFail(error);
  return { ok: true, data: ((data ?? []) as unknown as { customer_id: string; status: Enquiry["status"]; requested_at: string; resolved_at: string | null }[]).map((r) => ({ clientId: r.customer_id, status: r.status, requestedAt: r.requested_at, resolvedAt: r.resolved_at })) };
}

export async function fetchMyReviews(me: string, sinceIso: string): Promise<Read<{ rating: number; createdAt: string }[]>> {
  const { data, error } = await from("professional_reviews").select("rating, created_at").eq("professional_id", me).is("deleted_at", null).gte("created_at", sinceIso);
  if (error) return readFail(error);
  return { ok: true, data: ((data ?? []) as unknown as { rating: number; created_at: string }[]).map((r) => ({ rating: r.rating, createdAt: r.created_at })) };
}

export async function fetchPracticeStart(me: string): Promise<string | null> {
  const { data, error } = await from("professional_profiles").select("created_at").eq("profile_id", me).maybeSingle();
  if (error || !data) return null;
  return (data as unknown as { created_at: string }).created_at;
}
