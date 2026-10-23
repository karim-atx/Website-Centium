import { useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase/client";
import { useOnline } from "./useOnline";
import { inboxChangeShown, toInboxChange, type InboxChange } from "../services/notifications/notificationsModel";

/**
 * Market + Share 3.0 · live member inbox (Database 73ea87b, 20261211400000:
 * public.notifications joined the supabase_realtime publication).
 *
 * One channel per mounted screen (`member-inbox:<screen>:<user>`), INSERT and
 * UPDATE on the caller's own rows (`recipient_id=eq.<user>`; RLS
 * notifications_select_own scopes delivery as well). The same shape as
 * useUnreadRealtime / useThreadRealtime:
 * - the event is a TRIGGER: the caller re-reads (the bell its count, the open
 *   page its first page); only an UPDATE's read_at is applied as is;
 * - changes are coalesced over 250 ms and handed over together, filtered to
 *   the screen's `kinds` (a client never re-reads for an owner's row);
 * - a reconnect (SUBSCRIBED after the first) and the browser coming back
 *   online call `onChange([], true)`: the socket carries no backlog, so the
 *   screen re-reads once;
 * - torn down with removeChannel on unmount or when the user changes.
 * The first SUBSCRIBED does not fire: the screen has just read on mount.
 */

const COALESCE_MS = 250;

export function useInboxRealtime(
  userId: string | null,
  screen: string,
  kinds: readonly string[] | null,
  onChange: (changes: InboxChange[], resync: boolean) => void
): void {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const kindsRef = useRef(kinds);
  useEffect(() => {
    kindsRef.current = kinds;
  });
  const resyncRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) {
      resyncRef.current = null;
      return;
    }
    let cancelled = false;
    let timer: number | undefined;
    let queued: InboxChange[] = [];
    let resync = false;
    let joined = false;

    const flush = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = undefined;
        if (cancelled) return;
        const changes = queued;
        const again = resync;
        queued = [];
        resync = false;
        if (changes.length || again) onChangeRef.current(changes, again);
      }, COALESCE_MS);
    };
    const take = (payload: unknown) => {
      const c = toInboxChange(payload);
      if (!c || !inboxChangeShown(c, kindsRef.current)) return;
      queued.push(c);
      flush();
    };
    resyncRef.current = () => {
      resync = true;
      flush();
    };

    const filter = `recipient_id=eq.${userId}`;
    const channel = supabase
      .channel(`member-inbox:${screen}:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter }, take)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter }, take)
      .subscribe((s) => {
        if (cancelled || s !== "SUBSCRIBED") return;
        if (joined) resyncRef.current?.();
        joined = true;
      });

    return () => {
      cancelled = true;
      resyncRef.current = null;
      if (timer !== undefined) window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [userId, screen]);

  // Back online: the socket notices by timeout, so re-read once on the transition.
  const online = useOnline();
  const wasOnline = useRef(online);
  useEffect(() => {
    const recovered = online && !wasOnline.current;
    wasOnline.current = online;
    if (recovered) resyncRef.current?.();
  }, [online]);
}
