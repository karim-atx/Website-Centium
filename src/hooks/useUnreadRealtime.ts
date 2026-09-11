import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase/client";
import { useOnline } from "./useOnline";
import type { RealtimeStatus } from "./useThreadRealtime";

/**
 * Live unread-count changes, across every conversation the caller is in.
 *
 * UNFILTERED, AND THAT IS THE DESIGN RATHER THAN AN OMISSION. The two existing
 * subscriptions scope themselves with `thread_id=eq.<id>` because each watches
 * one open conversation. A badge counts across ALL of them, and there is no
 * column to filter on that would express "threads I am in": messages carries no
 * user_id, and no thread-participants table exists to join against. A
 * postgres_changes filter can only compare a column on the changed row to a
 * literal, so there is nothing to write here.
 *
 * WHAT SCOPES IT IS RLS, WHICH IS THE SAME THING SCOPING EVERY OTHER READ.
 * Realtime applies messages_select_participant per subscriber, so a message in
 * a conversation the caller is not part of is never delivered to them -- already
 * verified on staging with three signed-in subscribers, where a participant of
 * an unrelated thread and an outsider both received nothing. The absent filter
 * costs bandwidth in principle, never disclosure.
 *
 * INSERT ONLY, NOT "*", AND THIS IS THE ONE PLACE THIS PROJECT NARROWS THE
 * EVENT. The other two hooks listen to everything because a read receipt or a
 * pin move changes what they render. Here the only event that can change a
 * count from outside is a message arriving. Marking messages read is an UPDATE,
 * and it is already handled directly: ThreadView calls the context's refresh()
 * after marking. Subscribing to UPDATE as well would mean every read receipt in
 * every open thread waking this subscription to re-count something the open
 * thread had just corrected.
 *
 * ITS REAL JOB IS THE THREADS YOU DO NOT HAVE OPEN. An open conversation
 * already keeps its own count current through ThreadView's subscription and its
 * refresh() call. The gap this closes is a message landing somewhere you are
 * not looking, which until now waited up to thirty seconds for a poll.
 *
 * ONE INSTANCE APP-WIDE, keyed on the user rather than a thread. It lives in
 * UnreadProvider, which is mounted once in the authenticated shell, so the
 * channel name only has to distinguish one signed-in account from the next --
 * which matters on sign-out and sign-in-as-someone-else, where a channel from
 * the previous session must not survive.
 *
 * THE EVENT IS A TRIGGER, NEVER THE DATA, matching the other two hooks. The
 * payload is discarded and the caller re-reads through fetchUnreadCounts. That
 * is not fastidiousness here: Realtime publishes public.messages, the count is
 * computed from public.messages_visible, and a payload applied directly would
 * count a message the viewer has hidden.
 */

/** Changes are coalesced over this window. Matches the other two hooks. */
const COALESCE_MS = 250;

export function useUnreadRealtime(
  userId: string | null,
  onChange: () => void
): RealtimeStatus {
  /**
   * Stamped with the user it describes, and read back by comparison.
   *
   * Same reasoning as useThreadRealtime stamping by thread: resetting inside
   * the effect would be a synchronous setState in an effect, and in the window
   * before that effect runs it would report the PREVIOUS session's "live" as if
   * it were this one's -- exactly when the caller is deciding how fast to poll.
   */
  const [state, setState] = useState<{ id: string | null; status: RealtimeStatus }>({
    id: userId,
    status: "connecting",
  });
  const status: RealtimeStatus = state.id === userId ? state.status : "connecting";

  // Held in a ref so an inline closure from the caller does not tear down and
  // rebuild the socket on every render.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  /** The coalesced re-read, published for the network-recovery effect below. */
  const fireRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Signed out: nothing to subscribe to, and any previous channel has already
    // been torn down by this effect's cleanup. Status stays "connecting", which
    // keeps the caller on its fallback interval -- correct, and moot, since the
    // caller also disables its poll without a user.
    if (!userId) {
      fireRef.current = null;
      return;
    }

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
      .channel(`user-unread:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        fire
      )
      .subscribe((s) => {
        if (cancelled) return;
        if (s === "SUBSCRIBED") {
          setState({ id: userId, status: "live" });
          // A reconnect can have missed arrivals while the socket was down, and
          // the subscription carries no backlog. Re-counting on every transition
          // to live is what makes a drop self-heal rather than leaving a badge
          // understating what is waiting.
          fire();
          return;
        }
        if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          setState({ id: userId, status: "unavailable" });
        }
      });

    return () => {
      cancelled = true;
      fireRef.current = null;
      if (timer !== undefined) window.clearTimeout(timer);
      // removeChannel rather than unsubscribe, so the channel also leaves the
      // client registry -- signing back in as the same user must not collide
      // with a channel of the same name still tearing down.
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  /**
   * Re-count when the browser comes back online.
   *
   * Same reasoning as the other two hooks: the socket re-reads once it notices
   * a reconnect, but it notices by timeout, and `online` flips at the start of
   * that window rather than the end. Transition-triggered, because `online` is
   * true on mount and firing then would duplicate the provider's initial load.
   */
  const online = useOnline();
  const wasOnline = useRef(online);
  useEffect(() => {
    const recovered = online && !wasOnline.current;
    wasOnline.current = online;
    if (recovered) fireRef.current?.();
  }, [online]);

  return status;
}
