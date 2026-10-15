import { useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase/client";
import { createSessionGate, listingEventKey, type ListingEvent } from "./listingLogic";

// B13 MK-07: record_listing_event(p_business_id, p_kind, p_source, p_item_id),
// signed out or in. Only counts are stored, never a viewer; the server counts
// a signed-in viewer once a day per kind and item and ignores a business's own
// insiders and unlisted businesses.
//
// FIRE AND FORGET: nothing waits on it, nothing on screen depends on it, and a
// failure is logged once and otherwise swallowed. SPARING: each business +
// item + kind goes at most once per browser-tab session (the session gate),
// so a list re-rendering, a card scrolling back into view or a page remounting
// after Back sends nothing more.

const gate = createSessionGate(
  (() => {
    try {
      return typeof sessionStorage === "undefined" ? null : sessionStorage;
    } catch {
      return null;
    }
  })()
);

let warned = false;

/** Records one listing event, once per session; never throws, never blocks. */
export function recordListingEvent(e: ListingEvent): void {
  if (!e.businessId) return;
  if (!gate.first(listingEventKey(e))) return;
  try {
    // Not in the generated types (B13 is newer than the last regeneration).
    const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>;
    void Promise.resolve(
      rpc("record_listing_event", {
        p_business_id: e.businessId,
        p_kind: e.kind,
        p_source: e.source,
        p_item_id: e.itemId ?? null,
      })
    ).then(
      (r) => {
        if (r?.error && !warned) {
          warned = true;
          console.warn("[marketplace] Could not record a listing event:", r.error.message);
        }
      },
      (err: unknown) => {
        if (!warned) {
          warned = true;
          console.warn("[marketplace] Could not record a listing event:", err);
        }
      }
    );
  } catch (err) {
    if (!warned) {
      warned = true;
      console.warn("[marketplace] Could not record a listing event:", err);
    }
  }
}

/**
 * An impression: the element was at least half on screen. One
 * IntersectionObserver per element, disconnected after the first sighting;
 * the session gate keeps a remount from counting it again. `event` null (an
 * unclaimed venue, no business) records nothing.
 */
export function useImpression<T extends Element>(event: ListingEvent | null) {
  const ref = useRef<T | null>(null);
  const key = event ? listingEventKey(event) : null;
  const latest = useRef(event);
  useEffect(() => {
    latest.current = event;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el || !key || gate.has(key) || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((x) => x.isIntersecting)) return;
        io.disconnect();
        if (latest.current) recordListingEvent(latest.current);
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [key]);
  return ref;
}
