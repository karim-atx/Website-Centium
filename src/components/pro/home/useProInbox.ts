import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { supabase } from "../../../../lib/supabase/client";
import { fetchNotifications, markRead, subscribeNotifications, type ProNotification } from "../../../services/pro/notifications";
import { fetchHireInbox, type HireRequestRow } from "../../../services/hire-inbox";
import { fetchMyEmployments, type MyEmployment } from "../../../services/business-team/employment";
import { fetchPendingHires, type PendingHire } from "../../../services/hires/pro";

/**
 * Release 3 · everything the bell and the notifications hub read, in one
 * place so Home's badge and the hub agree.
 * - notifications: professional_notifications, re-read on every realtime
 *   change for this professional (DB-2);
 * - requests: pending_client_requests waiting for an answer;
 * - invitations: business team invitations not yet accepted
 *   (my_business_employments, replacing TeamInvitesNotice);
 * - hires: professional_pending_hires (Pending payment).
 * The badge is the unread notification count.
 */
export interface ProInbox {
  loading: boolean;
  error: boolean;
  offline: boolean;
  notifications: ProNotification[];
  names: Record<string, string>;
  requests: HireRequestRow[];
  invitations: MyEmployment[];
  hires: PendingHire[];
  unread: number;
  reload: () => void;
  markRead: (ids: string[]) => Promise<void>;
}

export function useProInbox(): ProInbox {
  const { authUserId, professionalClients } = useApp();
  const [state, setState] = useState<{
    loading: boolean;
    error: boolean;
    offline: boolean;
    notifications: ProNotification[];
    requests: HireRequestRow[];
    invitations: MyEmployment[];
    hires: PendingHire[];
    extraNames: Record<string, string>;
  }>({ loading: true, error: false, offline: false, notifications: [], requests: [], invitations: [], hires: [], extraNames: {} });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void (async () => {
      const [n, r, e, h] = await Promise.all([fetchNotifications(), fetchHireInbox(authUserId), fetchMyEmployments(), fetchPendingHires()]);
      if (!live) return;
      const notifications = n.ok ? n.data : [];
      // Names the roster doesn't have (a prospect asking to work with you).
      const ids = [...new Set(notifications.map((x) => x.clientId).filter((x): x is string => !!x))];
      let extraNames: Record<string, string> = {};
      if (ids.length) {
        const { data } = await supabase.from("related_profile_summary").select("id, first_name").in("id", ids);
        extraNames = Object.fromEntries((data ?? []).filter((p) => p.id && p.first_name).map((p) => [p.id as string, (p.first_name as string).trim()]));
      }
      if (!live) return;
      setState((prev) => ({
        loading: false,
        error: !n.ok && !n.offline,
        offline: !n.ok && n.offline,
        notifications: n.ok ? notifications : prev.notifications,
        requests: r.status === "ok" ? r.requests : prev.requests,
        invitations: e.ok ? e.value.filter((x) => !x.acceptedAt) : prev.invitations,
        hires: h.ok ? h.hires : prev.hires,
        extraNames,
      }));
    })();
    return () => {
      live = false;
    };
  }, [authUserId, nonce]);

  useEffect(() => {
    if (!authUserId) return;
    return subscribeNotifications(authUserId, reload);
  }, [authUserId, reload]);

  const names = useMemo(() => {
    const out: Record<string, string> = { ...state.extraNames };
    for (const c of professionalClients) if (c.clientId) out[c.clientId] = `${c.prefix ? `${c.prefix} ` : ""}${c.name}`;
    return out;
  }, [professionalClients, state.extraNames]);

  const doMarkRead = useCallback(
    async (ids: string[]) => {
      const unreadIds = ids.filter((id) => state.notifications.some((x) => x.id === id && !x.readAt));
      if (!unreadIds.length) return;
      const now = new Date().toISOString();
      setState((s) => ({ ...s, notifications: s.notifications.map((x) => (unreadIds.includes(x.id) ? { ...x, readAt: now } : x)) }));
      if (!(await markRead(unreadIds))) reload();
    },
    [state.notifications, reload]
  );

  return {
    ...state,
    names,
    unread: state.notifications.filter((x) => !x.readAt).length,
    reload,
    markRead: doMarkRead,
  };
}
