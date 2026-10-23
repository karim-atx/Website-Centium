import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { supabase } from "../../../../lib/supabase/client";
import {
  clearAllNotifications,
  clearMemberNotifications,
  dismissMemberNotification,
  dismissNotification,
  fetchMemberInbox,
  fetchNotifications,
  fromMemberRow,
  markMemberRead,
  markRead,
  subscribeNotifications,
  type ProNotification,
} from "../../../services/pro/notifications";
import { fetchHireInbox, type HireRequestRow } from "../../../services/hire-inbox";
import { fetchMyEmployments, type MyEmployment } from "../../../services/business-team/employment";
import { invitationState } from "../businesses/invitationLogic";
import { fetchPendingHires, type PendingHire } from "../../../services/hires/pro";
import { fetchRecentDeclines, fetchRequestDetails, undoRequestDecline, type RecentDecline } from "../../../services/pro/requests";
import { nextUndoClose, requestPlanLine, undoOpen } from "./requestModel";

/** A pending request with the plan the client chose and their message (20261124120000). */
export interface ProRequest extends HireRequestRow {
  /** "Monthly coaching · $120 a month", or null when no plan was chosen. */
  planLine: string | null;
  /** The plan's name alone (the Clients Requests card: "Asked for Monthly coaching"). */
  planName: string | null;
  message: string | null;
}

/**
 * Release 3 · everything the bell and the notifications hub read, in one
 * place so Home's badge and the hub agree.
 * - notifications: professional_notifications, re-read on every realtime
 *   change for this professional (DB-2); Clear all and dismiss delete rows;
 *   merged (newest first) with the professional kinds of the member inbox
 *   (Market + Share Release 2: my_notifications(p_kinds = PRO_KINDS), rows
 *   with `memberKind`; `notifications` is not in the realtime publication, so
 *   those refresh on each read). Mark read, dismiss and Clear all act on each
 *   row's own table;
 * - requests: pending_client_requests waiting for an answer, with plan and
 *   message;
 * - declined: requests declined in the last 5 minutes ("Declined · Undo");
 * - invitations: business team invitations not yet accepted
 *   (my_business_employments: business_employees with accepted_at null).
 *   Team invitations never come from a notification row;
 * - hires: professional_pending_hires (Pending payment).
 * The badge is the unread notification count.
 */
export interface ProInbox {
  loading: boolean;
  error: boolean;
  offline: boolean;
  notifications: ProNotification[];
  names: Record<string, string>;
  requests: ProRequest[];
  declined: RecentDecline[];
  invitations: MyEmployment[];
  hires: PendingHire[];
  unread: number;
  reload: () => void;
  markRead: (ids: string[]) => Promise<void>;
  /** clear_my_professional_notifications(); false when it failed. */
  clearAll: () => Promise<boolean>;
  /** Deletes one own notification; false when it failed. */
  dismiss: (id: string) => Promise<boolean>;
  /** undo_client_request_decline; the message is ATXH2's "too late" or another failure. */
  undoDecline: (id: string) => Promise<{ ok: true } | { ok: false; message: string; final?: boolean }>;
}

export function useProInbox(): ProInbox {
  const { authUserId, professionalClients } = useApp();
  const [state, setState] = useState<{
    loading: boolean;
    error: boolean;
    offline: boolean;
    notifications: ProNotification[];
    requests: ProRequest[];
    declined: RecentDecline[];
    invitations: MyEmployment[];
    hires: PendingHire[];
    extraNames: Record<string, string>;
  }>({ loading: true, error: false, offline: false, notifications: [], requests: [], declined: [], invitations: [], hires: [], extraNames: {} });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  // Re-renders when an undo window closes, so "Declined · Undo" goes away on time.
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void (async () => {
      const [n, r, e, h, d, mi] = await Promise.all([fetchNotifications(), fetchHireInbox(authUserId), fetchMyEmployments(), fetchPendingHires(), fetchRecentDeclines(authUserId), fetchMemberInbox()]);
      if (!live) return;
      // The member-inbox rows join the console's; a failed member read leaves them out (the console's rows still show).
      const notifications = n.ok ? [...n.data, ...(mi.ok ? mi.data.map(fromMemberRow) : [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0)) : [];
      const details = r.status === "ok" ? await fetchRequestDetails(r.requests.map((x) => x.id)) : {};
      // Names the roster doesn't have (a prospect asking to work with you).
      const ids = [...new Set(notifications.map((x) => x.clientId).filter((x): x is string => !!x))];
      let extraNames: Record<string, string> = {};
      if (ids.length) {
        const { data } = await supabase.from("related_profile_summary").select("id, first_name").in("id", ids);
        extraNames = Object.fromEntries((data ?? []).filter((p) => p.id && p.first_name).map((p) => [p.id as string, (p.first_name as string).trim()]));
      }
      if (!live) return;
      setTick(Date.now());
      setState((prev) => ({
        loading: false,
        error: !n.ok && !n.offline,
        offline: !n.ok && n.offline,
        notifications: n.ok ? notifications : prev.notifications,
        requests:
          r.status === "ok"
            ? r.requests.map((x) => {
                const dt = details[x.id];
                return { ...x, planLine: dt ? requestPlanLine(dt.planName, dt.planPrice, dt.planBilling) : null, planName: dt?.planName?.trim() || null, message: dt?.message ?? null };
              })
            : prev.requests,
        declined: d,
        // Batch 2 CO: an invitation known to be withdrawn or expired is nothing to answer here.
        invitations: e.ok ? e.value.filter((x) => !x.acceptedAt && invitationState(x.invite, null) === "open") : prev.invitations,
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

  const declined = useMemo(() => state.declined.filter((x) => undoOpen(x.resolvedAt, tick)), [state.declined, tick]);
  useEffect(() => {
    const left = nextUndoClose(
      declined.map((x) => x.resolvedAt),
      Date.now()
    );
    if (left === null) return;
    const t = window.setTimeout(() => setTick(Date.now()), left + 50);
    return () => window.clearTimeout(t);
  }, [declined]);

  const names = useMemo(() => {
    const out: Record<string, string> = { ...state.extraNames };
    for (const c of professionalClients) if (c.clientId) out[c.clientId] = `${c.prefix ? `${c.prefix} ` : ""}${c.name}`;
    return out;
  }, [professionalClients, state.extraNames]);

  const doMarkRead = useCallback(
    async (ids: string[]) => {
      const unread = state.notifications.filter((x) => ids.includes(x.id) && !x.readAt);
      if (!unread.length) return;
      const unreadIds = unread.map((x) => x.id);
      const now = new Date().toISOString();
      setState((s) => ({ ...s, notifications: s.notifications.map((x) => (unreadIds.includes(x.id) ? { ...x, readAt: now } : x)) }));
      const member = unread.filter((x) => x.memberKind).map((x) => x.id);
      const own = unread.filter((x) => !x.memberKind).map((x) => x.id);
      const [a, b] = await Promise.all([markRead(own), markMemberRead(member)]);
      if (!a || !b) reload();
    },
    [state.notifications, reload]
  );

  const clearAll = useCallback(async () => {
    const [own, member] = await Promise.all([clearAllNotifications(), clearMemberNotifications()]);
    const ok = own && member;
    if (ok) setState((s) => ({ ...s, notifications: [] }));
    reload();
    return ok;
  }, [reload]);

  const dismiss = useCallback(
    async (id: string) => {
      const row = state.notifications.find((x) => x.id === id);
      const ok = row?.memberKind ? await dismissMemberNotification(id) : await dismissNotification(id);
      if (ok) setState((s) => ({ ...s, notifications: s.notifications.filter((x) => x.id !== id) }));
      else reload();
      return ok;
    },
    [state.notifications, reload]
  );

  const undoDecline = useCallback(
    async (id: string) => {
      const r = await undoRequestDecline(id);
      if (r.ok || r.final) setState((s) => ({ ...s, declined: s.declined.filter((x) => x.id !== id) }));
      reload();
      return r;
    },
    [reload]
  );

  return {
    ...state,
    declined,
    names,
    unread: state.notifications.filter((x) => !x.readAt).length,
    reload,
    markRead: doMarkRead,
    clearAll,
    dismiss,
    undoDecline,
  };
}
