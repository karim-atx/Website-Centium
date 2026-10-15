import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { fetchLinkedProfessionals } from "../consent";
import { professionalRole } from "../connected-professional";
import { fromLine } from "../care-plan/logic";
import { shareRow, type ResultShare, type ShareScope, type ShareSubject } from "./logic";

// Release 3 · DB-6 "Share one result (client)": insert a result_shares row (a
// marker or a panel); delete it to stop sharing. Available whatever the Lab
// results switch says. RLS: result_shares_insert_own (the caller is the
// client, the professional is connected, the result or panel is theirs),
// result_shares_delete_own, result_shares_select_involved. INSERT is granted
// on client_id, professional_id, blood_marker_id, blood_panel_id and note
// only; id and shared_at are the database's. An insert notifies the
// professional (trigger result_shares_notify); a delete is silent.

export * from "./logic";

export interface ShareTarget {
  professionalId: string;
  name: string;
  firstName: string;
  avatarUrl: string | null;
  /** "Karam, doctor" / "Alex Morgan, GP". */
  line: string;
}

export type SharesResult = { ok: true; shares: ResultShare[] } | { ok: false; message: string };
export type ShareWriteResult = { ok: true } | { ok: false; message: string };

const offlineOr = (e: unknown, fallback: string) => (isOffline(e) ? OFFLINE_MESSAGE : fallback);

/** Every single-result share the signed-in client has made. */
export async function getMyResultShares(): Promise<SharesResult> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const me = auth.user?.id;
    if (!me) return { ok: true, shares: [] };
    const { data, error } = await supabase
      .from("result_shares")
      .select("id, professional_id, blood_marker_id, blood_panel_id, note, shared_at")
      .eq("client_id", me)
      .order("shared_at", { ascending: false });
    if (error) return { ok: false, message: offlineOr(error, "Couldn't load your shared results.") };
    return {
      ok: true,
      shares: (data ?? []).map((r) => ({
        id: r.id,
        professionalId: r.professional_id,
        bloodMarkerId: r.blood_marker_id,
        bloodPanelId: r.blood_panel_id,
        note: r.note,
        sharedAt: r.shared_at,
      })),
    };
  } catch (e) {
    return { ok: false, message: offlineOr(e, "Couldn't load your shared results.") };
  }
}

/** Shares one result, or every result of its test, with one connected professional. */
export async function shareResult(professionalId: string, scope: ShareScope, subject: ShareSubject, note: string): Promise<ShareWriteResult> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const me = auth.user?.id;
    if (!me) return { ok: false, message: "You need to be signed in to share." };
    const row = shareRow(me, professionalId, scope, subject, note);
    if (!row) return { ok: false, message: "Couldn't share. Try again." };
    const { error } = await supabase.from("result_shares").insert(row);
    if (!error || error.code === "23505") return { ok: true };
    if (error.code === "42501") return { ok: false, message: "You're no longer connected with this professional." };
    return { ok: false, message: offlineOr(error, "Couldn't share. Try again.") };
  } catch (e) {
    return { ok: false, message: offlineOr(e, "Couldn't share. Try again.") };
  }
}

/** Stops one share (deletes the row). Already gone counts as done. */
export async function stopSharingResult(shareId: string): Promise<ShareWriteResult> {
  try {
    const { error } = await supabase.from("result_shares").delete().eq("id", shareId);
    if (!error) return { ok: true };
    return { ok: false, message: offlineOr(error, "Couldn't save. Try again.") };
  } catch (e) {
    return { ok: false, message: offlineOr(e, "Couldn't save. Try again.") };
  }
}

/**
 * The professionals a result can be shared with: only those the client is
 * connected to now (active_professional_clients), each with the role line
 * ("Karam, doctor") from connected_professional_summary.
 */
export async function getShareTargets(): Promise<{ ok: true; targets: ShareTarget[] } | { ok: false; message: string }> {
  const linked = await fetchLinkedProfessionals();
  if (linked.status === "error") return { ok: false, message: linked.message };
  const ids = linked.professionals.map((p) => p.professionalId);
  const roles = new Map<string, { role: string | null; specialty: boolean }>();
  if (ids.length) {
    const { data } = await supabase
      .from("connected_professional_summary")
      .select("id, professional_subtype, specialty")
      .in("id", ids);
    for (const r of data ?? []) {
      if (!r.id) continue;
      roles.set(r.id, {
        role: professionalRole({ specialty: r.specialty, subtype: r.professional_subtype }),
        specialty: !!r.specialty?.trim(),
      });
    }
  }
  return {
    ok: true,
    targets: linked.professionals.map((p) => {
      const role = roles.get(p.professionalId);
      return {
        professionalId: p.professionalId,
        name: p.name,
        firstName: p.name.trim().split(/\s+/)[0] || p.name,
        avatarUrl: p.avatarUrl,
        line: fromLine(p.name, role?.role ?? null, role?.specialty ?? false),
      };
    }),
  };
}
