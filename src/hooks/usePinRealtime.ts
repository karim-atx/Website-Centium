import { useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase/client";
import { useOnline } from "./useOnline";

/**
 * Live pin changes for one conversation.
 *
 * A SEPARATE HOOK FROM useThreadRealtime, AND SIMPLER THAN IT. The mechanism is
 * the same shape — thread-scoped postgres_changes, coalesced, torn down on
 * switch — but this one returns nothing, because nothing needs to know whether
 * it is connected. The message subscription reports its status so ThreadView
 * can choose between a fast fallback poll and a slow safety poll; a pin has
 * neither, so the status would be a value with no reader.
 *
 * WHY NO POLL OF ANY KIND HERE. If this subscription silently dies, the banner
 * goes stale until the thread is reopened — which is exactly how the pin
 * behaved before this hook existed. The failure degrades to the previous
 * behaviour rather than to something broken, and the on-open fetch in
 * ThreadView remains the backstop. Messages earned a 60s safety net because a
 * dead socket there means missing a conversation; a stale banner on a rarely
 * changed pin does not justify steady traffic.
 *
 * ALL THREE EVENT TYPES MATTER, and which one arrives is not guesswork:
 *
 *   INSERT  the first pin in a thread
 *   UPDATE  the pin moved to a different message. pinned_messages is keyed by
 *           thread_id and setPin is an upsert, so replacing a pin takes the
 *           ON CONFLICT DO UPDATE path rather than deleting and reinserting
 *   DELETE  unpinned
 *
 * Verified on staging by subscribing and driving clear/pin/pin/clear from the
 * other participant's session: DELETE, INSERT, UPDATE, DELETE arrived in that
 * order. `event: "*"` covers all three, so the handler does not branch.
 *
 * THE DELETE FILTER WORKS HERE FOR A REASON WORTH KNOWING. A DELETE payload
 * carries only what REPLICA IDENTITY exposes, which for DEFAULT is the primary
 * key. pinned_messages is keyed BY thread_id, so `thread_id=eq.<id>` is testing
 * a column the payload actually has. The same filter on public.messages would
 * silently match no deletes at all, because that table is keyed by id and
 * thread_id would not be in the old record. It has never mattered there —
 * messages are never deleted — but anyone copying this filter onto another
 * table should check the key first.
 *
 * THE EVENT IS A TRIGGER, NOT THE DATA, matching useThreadRealtime. Here the
 * reason is not a view filter — pins have none — but shape: a DELETE payload
 * carries no message_id, so applying payloads directly would mean two different
 * code paths depending on which event arrived. Re-reading through fetchPin is
 * one path and one source of truth, for one round trip on a rare event.
 */

/** Changes are coalesced over this window. Matches useThreadRealtime. */
const COALESCE_MS = 250;

export function usePinRealtime(threadId: string, onChange: () => void): void {
  // Held in a ref so an inline closure from the caller does not rebuild the
  // socket on every render. Assigned in an effect rather than during render,
  // same as useThreadRealtime and usePoll.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  /** The coalesced re-read, published for the network-recovery effect below. */
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
      .channel(`thread-pin:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pinned_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        fire
      )
      .subscribe((s) => {
        // A reconnect can have missed a pin change while the socket was down,
        // and the subscription carries no backlog. Re-reading on every
        // transition to live is what makes a drop self-heal. Nothing else is
        // done with the status — there is no fallback for it to select.
        if (!cancelled && s === "SUBSCRIBED") fire();
      });

    return () => {
      cancelled = true;
      fireRef.current = null;
      if (timer !== undefined) window.clearTimeout(timer);
      // removeChannel rather than unsubscribe, so a StrictMode remount does not
      // collide with a channel of the same name still tearing down.
      void supabase.removeChannel(channel);
    };
  }, [threadId]);

  /**
   * Re-read when the browser comes back online.
   *
   * Same reasoning as useThreadRealtime: the socket re-reads when it notices a
   * reconnect, but it notices by timeout, and `online` flips at the start of
   * that window rather than the end. Transition-triggered, because `online` is
   * true on mount and firing then would duplicate the caller's on-open fetch.
   */
  const online = useOnline();
  const wasOnline = useRef(online);
  useEffect(() => {
    const recovered = online && !wasOnline.current;
    wasOnline.current = online;
    if (recovered) fireRef.current?.();
  }, [online]);
}
