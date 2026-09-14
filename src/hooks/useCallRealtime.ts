import { useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase/client";
import type { CallRow } from "../services/calling";

/**
 * Live `calls` rows for one signed-in account, in both directions.
 *
 * THE PAYLOAD IS THE DATA HERE, WHICH IS THE OPPOSITE OF EVERY OTHER
 * SUBSCRIPTION IN THIS APP. useThreadRealtime, usePinRealtime and
 * useUnreadRealtime all discard the payload and re-read, because each reads
 * through a view (`messages_visible`) that the publication does not know
 * about, so a payload would walk round the hide filter. `calls` has no such
 * view: the client reads the table itself, `calls_select_participant` is the
 * only filter, and Realtime applies that policy per subscriber. So the row
 * that arrives IS the row a re-read would return, and re-reading would spend a
 * round trip to learn what is already in hand — on the one event in this app
 * where latency is the entire product.
 *
 * NOT FILTERED, BY NECESSITY. The other thread-scoped hooks use
 * `thread_id=eq.<id>`; a postgres_changes filter can only compare one column to
 * one literal, and "rows where I am caller_id OR callee_id" is two columns and
 * a disjunction. RLS is what scopes this — the same thing that scopes
 * useUnreadRealtime, which is unfiltered for the same structural reason.
 *
 * USER-KEYED CHANNEL NAME, matching useUnreadRealtime: it must distinguish one
 * signed-in account from the next so a channel cannot survive a sign-out and
 * deliver a previous user's calls into a new session.
 *
 * EVERY EVENT, NOT JUST INSERT. An INSERT is a call beginning; the UPDATEs are
 * the entire rest of the story — answered, declined, completed, cap_ended. A
 * hook that watched inserts alone would ring correctly and then never notice
 * the call had ended.
 */
export function useCallRealtime(
  userId: string | null,
  onCall: (row: CallRow) => void
): void {
  // Held in a ref so a caller passing an inline closure does not tear down and
  // rebuild the channel on every render — the same reason usePoll does it.
  const handler = useRef(onCall);
  useEffect(() => {
    handler.current = onCall;
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-calls:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        (payload) => {
          // DELETE carries only the primary key in `old`, and nothing in this
          // app deletes a call — rows are kept as history. Ignored rather than
          // half-applied.
          const row = payload.new as CallRow | Record<string, never>;
          if (!row || typeof row !== "object" || !("id" in row)) return;
          handler.current(row as CallRow);
        }
      )
      .subscribe();

    return () => {
      // removeChannel rather than unsubscribe, so the channel also leaves the
      // client's registry — a StrictMode remount would otherwise leak one.
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
