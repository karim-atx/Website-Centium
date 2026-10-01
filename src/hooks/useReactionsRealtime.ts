import { useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase/client";
import { useOnline } from "./useOnline";

/**
 * Live reaction changes while a conversation is open.
 *
 * THE SAME SHAPE AS usePinRealtime, with one difference: message_reactions has
 * no thread_id to filter on, so the subscription is not thread-scoped. Row
 * security still decides which rows reach this client (only reactions in
 * threads the caller is part of), and each event is a trigger to re-read the
 * loaded messages' reactions rather than data to apply — the same rule the
 * message subscription follows.
 *
 * NO POLL. If the socket dies, reactions go stale until the next message
 * arrives or the thread is reopened; both re-read them.
 */
const COALESCE_MS = 250;

export function useReactionsRealtime(threadId: string, onChange: () => void): void {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const fireRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;

    const fire = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = undefined;
        if (!cancelled) onChangeRef.current();
      }, COALESCE_MS);
    };
    fireRef.current = fire;

    const channel = supabase
      .channel(`thread-reactions:${threadId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, fire)
      .subscribe((s) => {
        if (!cancelled && s === "SUBSCRIBED") fire();
      });

    return () => {
      cancelled = true;
      fireRef.current = null;
      if (timer !== undefined) window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [threadId]);

  const online = useOnline();
  const wasOnline = useRef(online);
  useEffect(() => {
    const recovered = online && !wasOnline.current;
    wasOnline.current = online;
    if (recovered) fireRef.current?.();
  }, [online]);
}
