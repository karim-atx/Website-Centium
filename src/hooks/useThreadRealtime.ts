import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase/client";
import { useOnline } from "./useOnline";

/**
 * Live message changes for one conversation.
 *
 * WHY THIS CAN EXIST NOW, WHEN IT COULD NOT BEFORE. Subscribing to
 * `postgres_changes` used to report `SUBSCRIBED` and then deliver nothing:
 * `public.messages` was not a member of the `supabase_realtime` publication, so
 * no change was ever published. The Database migration
 * `realtime_message_publication` added it. Until that shipped, polling was the
 * delivery mechanism rather than a placeholder for one — see usePoll.
 *
 * THE EVENT IS A TRIGGER, NEVER THE DATA, and this is the one thing here that
 * must not be "simplified" later. Realtime publishes `public.messages`, the raw
 * table. The app reads `public.messages_visible`, a view that subtracts the rows
 * this viewer has flagged hidden. Applying a payload straight into state would
 * therefore walk round the hide filter — an UPDATE on a message you hid (a read
 * receipt landing on it, say) would put it back on your screen, and nothing
 * would look wrong until someone noticed a message they had dismissed had
 * returned. So the payload is discarded and the caller re-reads through the
 * view. One extra round trip per change, in exchange for one source of truth.
 *
 * IT ALSO KEEPS RLS HONEST. The same re-read is what applies
 * `messages_select_participant` a second time. Realtime does enforce RLS on
 * INSERT and UPDATE — verified on staging with three signed-in subscribers,
 * where a participant of a different thread and an outsider both received
 * nothing — but the view is a filter the publication does not know about, and
 * trusting a payload to have been through it would be trusting the wrong layer.
 *
 * SCOPED BY FILTER AS WELL AS BY POLICY. `thread_id=eq.<id>` is a bandwidth
 * decision, not a security one: RLS already prevents a subscriber from seeing
 * another thread's rows. Without the filter this socket would wake on every
 * message in every conversation the viewer is part of, and re-read this one for
 * each.
 */
export type RealtimeStatus = "connecting" | "live" | "unavailable";

/**
 * Changes are coalesced over this window before the caller is told.
 *
 * A single `load()` marks messages read, which is itself an UPDATE, which comes
 * straight back as another event. Without coalescing that is a round trip per
 * message per open thread, for a state the caller already has. It also covers
 * the ordinary burst — someone sending three messages quickly should cost one
 * re-read, not three.
 *
 * Short enough to stay imperceptible: the whole point is that a message appears
 * to arrive instantly.
 */
const COALESCE_MS = 250;

export function useThreadRealtime(threadId: string, onChange: () => void): RealtimeStatus {
  /**
   * The status is STAMPED WITH THE THREAD IT DESCRIBES, and read back by
   * comparison rather than reset in an effect.
   *
   * Resetting to "connecting" from inside the effect would be a synchronous
   * setState in an effect — an extra render, and flagged by the linter for a
   * real reason. It is also subtly wrong in the window before that effect runs:
   * opening thread B straight after thread A would briefly report A's "live"
   * status as if it were B's, which is exactly when the caller is deciding
   * whether to poll.
   */
  const [state, setState] = useState<{ id: string; status: RealtimeStatus }>({
    id: threadId,
    status: "connecting",
  });
  const status: RealtimeStatus = state.id === threadId ? state.status : "connecting";

  // Held in a ref so a caller passing an inline closure does not tear down and
  // rebuild the socket on every render. Same reasoning as usePoll, and the same
  // effect-not-render assignment, for the same reason.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  /**
   * The coalesced re-read, published for the network-recovery effect below.
   *
   * It lives in a ref because the socket effect owns it and the recovery effect
   * must not re-run when the socket is rebuilt — reaching across with a ref is
   * what keeps those two lifecycles independent.
   */
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
      .channel(`thread-messages:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${threadId}`,
        },
        fire
      )
      .subscribe((s) => {
        if (cancelled) return;
        if (s === "SUBSCRIBED") {
          setState({ id: threadId, status: "live" });
          // A reconnect can have missed changes while the socket was down, and
          // the subscription itself carries no backlog. Re-reading on every
          // transition to live is what makes a dropped connection self-heal
          // rather than leaving a silently stale conversation.
          fire();
          return;
        }
        // CHANNEL_ERROR, TIMED_OUT and CLOSED all mean the same thing to the
        // caller: this is not delivering, fall back to polling. They are not
        // distinguished because there is nothing different to do about them.
        if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          setState({ id: threadId, status: "unavailable" });
        }
      });

    return () => {
      cancelled = true;
      fireRef.current = null;
      if (timer !== undefined) window.clearTimeout(timer);
      // removeChannel rather than unsubscribe: it also drops the channel from
      // the client's registry, so remounting with the same name (StrictMode in
      // development does exactly this) does not collide with a channel that is
      // still tearing down.
      void supabase.removeChannel(channel);
    };
  }, [threadId]);

  /**
   * Re-read when the browser comes back online.
   *
   * WHY THIS RATHER THAN A RECONNECT HANDLER OF ITS OWN. The socket already
   * re-reads on every transition to SUBSCRIBED, which covers a reconnect it
   * notices. What it does not cover is the gap before it notices: a dropped
   * connection is detected by timeout, so between the network returning and the
   * channel re-establishing there is a window where the conversation is stale
   * and nothing has fired. `online` flips at the start of that window rather
   * than the end of it.
   *
   * It reuses the SAME coalesced fire as the socket, so a recovery that
   * arrives alongside a re-SUBSCRIBED event costs one re-read, not two.
   *
   * TRANSITION-TRIGGERED, NOT LEVEL-TRIGGERED. `online` is true on mount, and
   * firing then would duplicate the initial load the caller has already done.
   * Only false → true is a recovery.
   *
   * `useOnline` is honest about being a weak signal — true means "not obviously
   * offline", never "requests will succeed" — and that asymmetry is fine here.
   * A spurious true costs one re-read; the direction it is reliable in (false
   * means offline) is the one that makes this worth having.
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
