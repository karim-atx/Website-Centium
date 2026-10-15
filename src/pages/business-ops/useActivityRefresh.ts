import { useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase/client";

// B15 DI-03 realtime for the Operations lists (OP1-001 S7, OP1-020 S3,
// OP1-074 S9): one business_id-filtered channel on business_activity, the
// pattern of components/business-dashboard/useActivityFeed.ts. A new row of
// one of the given kinds (order, appointment, booking, cancel) asks the
// screen for a quiet re-read; the screens keep their 2-minute poll while
// visible, which also catches what the socket can't carry (business_activity
// is written on INSERT only, so a status change arrives with the poll).
// Realtime honours the table's RLS: a seat without the kind's permission
// never hears it, and its screen simply polls.

let seq = 0;

/** Bursts (a class filling up) collapse into one re-read. */
const SETTLE_MS = 800;

export function useActivityRefresh(businessId: string | null | undefined, kinds: readonly string[], onChange: () => void): void {
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  const key = kinds.join(",");
  useEffect(() => {
    if (!businessId || !key) return;
    const wanted = new Set(key.split(","));
    let timer: number | null = null;
    let cancelled = false;
    // A name per subscriber: two screens on the same business must not share
    // (and so remove) one channel object.
    const channel = supabase
      .channel(`ops-activity:${businessId}:${++seq}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "business_activity", filter: `business_id=eq.${businessId}` }, (payload) => {
        if (cancelled) return;
        const kind = (payload.new as { kind?: string } | null)?.kind;
        if (!kind || !wanted.has(kind)) return;
        if (timer !== null) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          timer = null;
          if (!cancelled) cb.current();
        }, SETTLE_MS);
      })
      .subscribe();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [businessId, key]);
}
