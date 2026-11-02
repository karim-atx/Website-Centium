// Release 3 · W6 Care network (MO7 v3) on the Database HANDOVER_API.md DB-6
// contract (20261124060200):
// - care_network_links (requested_by, requested_of, status pending /
//   accepted / declined / removed): request_care_link, respond_care_link,
//   remove_care_link; both sides read their own links;
// - care_referrals (from_professional, to_professional, client_id, reason,
//   status awaiting_client → sent → accepted / declined, or
//   declined_by_client, withdrawn, disputed, closed): refer_client (only to
//   a linked colleague, only a current client), respond_care_referral,
//   withdraw_care_referral, dispute_care_referral. Release A: a decline may
//   carry a reason (p_reason), kept in care_referral_declines, a side table
//   only the two professionals read (Database #41 7ea8d57: a column on
//   care_referrals would be readable by the client, so there is none);
//   accepting connects nobody, the client
//   connects themselves (connect_from_referral). The receiver reads nothing
//   until the client agreed (the select policy hides awaiting_client and
//   declined_by_client); disputes go to support as "Care network disputes".
// Names: a colleague's name is read from public_professional_directory
// (listed professionals only); a client's from the professional's own roster.
// There's no other reader, so an unlisted colleague or a referred client who
// isn't yet your client shows without a name (reported).

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { rpc } from "./rpc";
import type { Read, Write } from "./clients";
import { t } from "../../i18n/core";

const from = (table: string) => supabase.from(table as never);
const readFail = (error: unknown) => ({ ok: false as const, offline: isOffline(error) });

function message(error: unknown, fallback: string): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  const e = error as { code?: string; message?: string } | null;
  if (e?.code === "ATX12") return t("That person isn't your client any more.");
  if (e?.code === "ATX09") return t("Refer only to colleagues in your care network.");
  if (e?.code === "ATX08") return t("This has already been answered.");
  // 22023: the function's own raised text is not shown (a raw server message); logged, and the fallback said.
  if (e?.code === "22023") console.warn("[care-network] refused:", e.message);
  return fallback;
}

export const REASON_MAX = 500;

export interface Colleague {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  /** professional_subtype enum value (trainer, dietitian, doctor, …). */
  type: string | null;
  specialty: string | null;
}

export async function fetchColleagues(ids: string[]): Promise<Record<string, Colleague>> {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return {};
  const { data, error } = await from("public_professional_directory").select("profile_id, first_name, avatar_url, professional_subtype, specialty").in("profile_id", uniq);
  if (error) return {};
  const out: Record<string, Colleague> = {};
  for (const r of (data ?? []) as unknown as { profile_id: string; first_name: string | null; avatar_url: string | null; professional_subtype: string | null; specialty: string | null }[])
    out[r.profile_id] = { id: r.profile_id, name: r.first_name, avatarUrl: r.avatar_url, type: r.professional_subtype, specialty: r.specialty };
  return out;
}

/** Listed professionals by first name, for "Add a colleague". */
export async function searchColleagues(me: string, q: string): Promise<Read<Colleague[]>> {
  let req = from("public_professional_directory").select("profile_id, first_name, avatar_url, professional_subtype, specialty").neq("profile_id", me).order("first_name").limit(20);
  const term = q.trim().replace(/[%_,()]/g, "");
  if (term) req = req.ilike("first_name", `%${term}%`);
  const { data, error } = await req;
  if (error) return readFail(error);
  return {
    ok: true,
    data: ((data ?? []) as unknown as { profile_id: string; first_name: string | null; avatar_url: string | null; professional_subtype: string | null; specialty: string | null }[]).map((r) => ({
      id: r.profile_id,
      name: r.first_name,
      avatarUrl: r.avatar_url,
      type: r.professional_subtype,
      specialty: r.specialty,
    })),
  };
}

// ---------------------------------------------------------------------------
// W6B-5 "Nearby" (Release B 20261217020000)
// ---------------------------------------------------------------------------

export interface NearbyColleague extends Colleague {
  /** band_rank: 1 under 2 km … 6 over 50 km (never the colleague's point). */
  band: number;
  areaLabel: string | null;
}

export type NearbyRead =
  | { ok: true; data: NearbyColleague[] }
  | { ok: false; reason: "no_area" | "rate_limited" | "offline" | "failed" };

/**
 * colleagues_near_me(p_radius_km 25, p_subtype, p_before_band, p_before_id,
 * p_limit, p_any_country): listed colleagues whose in-person reach covers the
 * caller's OWN published area, nearest band first, never the caller. It
 * takes no point, so nothing about where the caller is leaves the device.
 * ATXH4 when the caller has set no area; metered on nearby_list (ATX02,
 * 240 an hour shared with the professionals list), so it's read once per
 * sheet, when the chip is chosen. Its own country unless p_any_country.
 */
export async function fetchNearbyColleagues(): Promise<NearbyRead> {
  try {
    const { data, error } = await rpc("colleagues_near_me", { p_limit: 30 });
    if (error) {
      if (error.code === "ATXH4") return { ok: false, reason: "no_area" };
      if (error.code === "ATX02") return { ok: false, reason: "rate_limited" };
      return { ok: false, reason: isOffline(error) ? "offline" : "failed" };
    }
    const rows = (data ?? []) as {
      professional_id: string;
      first_name: string | null;
      avatar_url: string | null;
      professional_subtype: string | null;
      specialty: string | null;
      area_label: string | null;
      band_rank: number;
    }[];
    return {
      ok: true,
      data: rows.map((r) => ({ id: r.professional_id, name: r.first_name, avatarUrl: r.avatar_url, type: r.professional_subtype, specialty: r.specialty, band: r.band_rank, areaLabel: r.area_label })),
    };
  } catch (e) {
    return { ok: false, reason: isOffline(e) ? "offline" : "failed" };
  }
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export interface CareLink {
  id: string;
  other: string;
  /** I asked (true) or they asked me (false). */
  mine: boolean;
  status: "pending" | "accepted";
  createdAt: string;
}

export async function fetchLinks(me: string): Promise<Read<CareLink[]>> {
  const { data, error } = await from("care_network_links").select("id, requested_by, requested_of, status, created_at").in("status", ["pending", "accepted"]).or(`requested_by.eq.${me},requested_of.eq.${me}`).order("created_at", { ascending: false });
  if (error) return readFail(error);
  return {
    ok: true,
    data: ((data ?? []) as unknown as { id: string; requested_by: string; requested_of: string; status: CareLink["status"]; created_at: string }[]).map((r) => ({
      id: r.id,
      other: r.requested_by === me ? r.requested_of : r.requested_by,
      mine: r.requested_by === me,
      status: r.status,
      createdAt: r.created_at,
    })),
  };
}

export async function requestLink(professionalId: string): Promise<Write> {
  const { error } = await rpc("request_care_link", { p_professional: professionalId });
  return error ? { ok: false, message: message(error, t("Couldn't send the request. Try again.")) } : { ok: true };
}

export async function respondLink(linkId: string, accept: boolean): Promise<Write> {
  const { error } = await rpc("respond_care_link", { p_link_id: linkId, p_accept: accept });
  return error ? { ok: false, message: message(error, t("Couldn't answer. Try again.")) } : { ok: true };
}

export async function removeLink(linkId: string): Promise<Write> {
  const { error } = await rpc("remove_care_link", { p_link_id: linkId });
  return error ? { ok: false, message: message(error, t("Couldn't remove it. Try again.")) } : { ok: true };
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

import type { ReferralStatus } from "../../components/pro/care/careModel";
export type { ReferralStatus };

export interface Referral {
  id: string;
  fromId: string;
  toId: string;
  clientId: string;
  reason: string;
  status: ReferralStatus;
  createdAt: string;
  clientAnsweredAt: string | null;
  respondedAt: string | null;
  disputedAt: string | null;
  /** Release A: why the receiving professional declined (optional, at most 500), read by both professionals. */
  declineReason: string | null;
}

export async function fetchReferrals(me: string): Promise<Read<{ received: Referral[]; sent: Referral[] }>> {
  const { data, error } = await from("care_referrals")
    .select("id, from_professional, to_professional, client_id, reason, status, created_at, client_answered_at, responded_at, disputed_at")
    .or(`from_professional.eq.${me},to_professional.eq.${me}`)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return readFail(error);
  // The reasons for this page's declined referrals (both professionals read them).
  const declinedIds = ((data ?? []) as unknown as { id: string; status: ReferralStatus }[]).filter((r) => r.status === "declined").map((r) => r.id);
  const reasons = new Map<string, string>();
  if (declinedIds.length) {
    const d = await from("care_referral_declines").select("referral_id, reason").in("referral_id", declinedIds);
    if (d.error) return readFail(d.error);
    for (const r of (d.data ?? []) as unknown as { referral_id: string; reason: string }[]) {
      if (r.reason?.trim()) reasons.set(r.referral_id, r.reason.trim());
    }
  }
  const all = ((data ?? []) as unknown as {
    id: string;
    from_professional: string;
    to_professional: string;
    client_id: string;
    reason: string;
    status: ReferralStatus;
    created_at: string;
    client_answered_at: string | null;
    responded_at: string | null;
    disputed_at: string | null;
  }[]).map((r) => ({
    id: r.id,
    fromId: r.from_professional,
    toId: r.to_professional,
    clientId: r.client_id,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
    clientAnsweredAt: r.client_answered_at,
    respondedAt: r.responded_at,
    disputedAt: r.disputed_at,
    declineReason: reasons.get(r.id) ?? null,
  }));
  return { ok: true, data: { received: all.filter((r) => r.toId === me), sent: all.filter((r) => r.fromId === me) } };
}

export async function referClient(clientId: string, toProfessional: string, reason: string): Promise<Write> {
  const { error } = await rpc("refer_client", { p_client_id: clientId, p_to_professional: toProfessional, p_reason: reason.trim() });
  return error ? { ok: false, message: message(error, t("Couldn't send the referral. Try again.")) } : { ok: true };
}

/**
 * respond_care_referral(p_referral_id, p_accept, p_reason) (Release A,
 * 20261216060000): a decline may say why (at most 500, 22023 past that); an
 * accept never keeps one. Accepting does NOT connect the client: that is
 * their own second decision (connect_from_referral).
 */
export async function respondReferral(id: string, accept: boolean, reason?: string | null): Promise<Write> {
  const why = !accept ? (reason ?? "").trim() : "";
  const { error } = await rpc("respond_care_referral", { p_referral_id: id, p_accept: accept, p_reason: why || null });
  return error ? { ok: false, message: message(error, t("Couldn't answer the referral. Try again.")) } : { ok: true };
}

export async function withdrawReferral(id: string): Promise<Write> {
  const { error } = await rpc("withdraw_care_referral", { p_referral_id: id });
  return error ? { ok: false, message: message(error, t("Couldn't withdraw it. Try again.")) } : { ok: true };
}

export async function disputeReferral(id: string, reason: string): Promise<Write> {
  const { error } = await rpc("dispute_care_referral", { p_referral_id: id, p_reason: reason.trim() });
  return error ? { ok: false, message: message(error, t("Couldn't send it to support. Try again.")) } : { ok: true };
}

/** Received items that need my answer: referrals the client agreed to, and colleagues asking to connect. */
export async function fetchPendingCount(me: string): Promise<number | null> {
  const [r, l] = await Promise.all([
    from("care_referrals").select("id", { count: "exact", head: true }).eq("to_professional", me).eq("status", "sent"),
    from("care_network_links").select("id", { count: "exact", head: true }).eq("requested_of", me).eq("status", "pending"),
  ]);
  if (r.error || l.error) return null;
  return (r.count ?? 0) + (l.count ?? 0);
}

/** Re-read the badge when the inbox changes (its own channel, so the hub's subscription is untouched). */
export function subscribeCareChanges(me: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`care-network-pending:${me}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "professional_notifications", filter: `professional_id=eq.${me}` }, () => onChange())
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
