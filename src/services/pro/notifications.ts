// Release 3 · the professional's inbox (DB-2 "Professional inbox":
// professional_notifications, select own, realtime, mark read by update).
// Rows are written only by the database (notify_professional); the website
// reads them, marks read_at, and subscribes to changes for the signed-in
// professional. There is no delete policy, so nothing here removes a row.

import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";

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
