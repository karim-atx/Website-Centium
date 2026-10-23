// Release 3 · the professional's inbox (DB-2 "Professional inbox":
// professional_notifications, select own, realtime, mark read by update).
// Rows are written only by the database (notify_professional); the website
// reads them, marks read_at, and subscribes to changes for the signed-in
// professional. Release 3 follow-up (20261124120000): Clear all is
// clear_my_professional_notifications() (returns the count), and dismissing
// one deletes the own row (professional_notifications_delete_own).

//
// Market + Share 3.0 Release 2: the professional kinds of the MEMBER inbox
// (Database 20261210600000: `notifications`, member_notification_kind; the
// professional_notifications table is not migrated and its enum is only
// request / to_review / update) are read here too, with
// my_notifications(p_kinds) through services/notifications, and carry
// `memberKind` so every caller marks, dismisses and opens them on the right
// table: mark_notifications_read([ids]) to read, a delete of the own row
// (notifications_delete_own) to dismiss.

import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";
import { fetchMyNotifications, markNotificationsRead, proHubKind, PRO_KINDS, type MemberNotification } from "../notifications";
import { rpc } from "./rpc";

export type ProNotificationKind = "request" | "to_review" | "update";

export interface ProNotification {
  id: string;
  kind: ProNotificationKind;
  subjectType: string;
  subjectId: string | null;
  clientId: string | null;
  titleKey: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  /** Set on a member-inbox row (`notifications`): its member_notification_kind. */
  memberKind?: string;
}

/** A member-inbox row in the hub's shape (offers and invites under Requests, the rest under Updates). */
export function fromMemberRow(n: MemberNotification): ProNotification {
  return {
    id: n.id,
    kind: proHubKind(n.kind),
    subjectType: n.subjectType ?? "",
    subjectId: n.subjectId,
    clientId: null,
    titleKey: n.titleKey,
    payload: n.payload,
    readAt: n.readAt,
    createdAt: n.createdAt,
    memberKind: n.kind,
  };
}

/**
 * The professional's member-inbox rows of `kinds` (default PRO_KINDS), newest
 * first, at most `limit` (my_notifications(p_kinds)).
 */
export async function fetchMemberInbox(kinds: readonly string[] = PRO_KINDS, limit = 100): Promise<{ ok: true; data: MemberNotification[] } | { ok: false; offline: boolean }> {
  const r = await fetchMyNotifications(null, limit, kinds);
  return r.ok ? { ok: true, data: r.value.items } : { ok: false, offline: !!r.offline };
}

/** mark_notifications_read(ids): member-inbox rows only (a professional_notifications id moves nothing there). */
export async function markMemberRead(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const r = await markNotificationsRead(ids);
  return r.ok;
}

/** Dismisses one member-inbox row (notifications_delete_own). */
export async function dismissMemberNotification(id: string): Promise<boolean> {
  const { error } = await supabase.from("notifications" as never).delete().eq("id", id);
  return !error;
}

/** Clear all's member half: deletes the caller's own PRO_KINDS rows (the hub shows no other kind). */
export async function clearMemberNotifications(): Promise<boolean> {
  const { error } = await supabase
    .from("notifications" as never)
    .delete()
    .in("kind", [...PRO_KINDS]);
  return !error;
}

export async function fetchNotifications(): Promise<{ ok: true; data: ProNotification[] } | { ok: false; offline: boolean }> {
  const { data, error } = await supabase
    .from("professional_notifications")
    .select("id, kind, subject_type, subject_id, client_id, title_key, payload, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { ok: false, offline: isOffline(error) };
  return {
    ok: true,
    data: (data ?? []).map((r) => ({
      id: r.id,
      kind: r.kind as ProNotificationKind,
      subjectType: r.subject_type,
      subjectId: r.subject_id,
      clientId: r.client_id,
      titleKey: r.title_key,
      payload: (r.payload && typeof r.payload === "object" && !Array.isArray(r.payload) ? r.payload : {}) as Record<string, unknown>,
      readAt: r.read_at,
      createdAt: r.created_at,
    })),
  };
}

/** Marks these rows read (the owner may update read_at only). */
export async function markRead(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const { error } = await supabase.from("professional_notifications").update({ read_at: new Date().toISOString() }).in("id", ids).is("read_at", null);
  return !error;
}

/** Clear all: deletes every one of the caller's hub notifications. */
export async function clearAllNotifications(): Promise<boolean> {
  const { error } = await rpc("clear_my_professional_notifications", {});
  return !error;
}

/** Dismisses one notification (own rows only). */
export async function dismissNotification(id: string): Promise<boolean> {
  const { error } = await supabase.from("professional_notifications").delete().eq("id", id);
  return !error;
}

/** Any change to this professional's rows re-reads the inbox (the 20260911230000 realtime pattern). */
export function subscribeNotifications(professionalId: string, onChange: () => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`pro-notifications:${professionalId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "professional_notifications", filter: `professional_id=eq.${professionalId}` }, () => onChange())
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
