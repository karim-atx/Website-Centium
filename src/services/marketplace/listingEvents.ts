import { useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase/client";
import { createSessionGate, listingEventKey, professionalEventKey, type ListingEvent, type ProfessionalEvent } from "./listingLogic";

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
//
// DB5 (Database PR #39, 20261214020000): offer_view joins the kinds a client
// reports (the offer as p_item_id; offer_performance counts it), and a
// professional has their own recorder, record_professional_event(
// p_professional_id, p_kind profile_view | offer_view, p_source, p_item_id),
// sharing the same once-a-day dedupe; it ignores the professional's own look
// and an unlisted professional, silently. professional_performance and
// professional_overview count those.

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
  fire("record_listing_event", { p_business_id: e.businessId, p_kind: e.kind, p_source: e.source, p_item_id: e.itemId ?? null });
}

/** Records one professional event (a profile or an offer seen), once per session; never throws, never blocks. */
export function recordProfessionalEvent(e: ProfessionalEvent): void {
  if (!e.professionalId) return;
  if (!gate.first(professionalEventKey(e))) return;
  fire("record_professional_event", { p_professional_id: e.professionalId, p_kind: e.kind, p_source: e.source, p_item_id: e.itemId ?? null });
}

function fire(fn: string, args: Record<string, unknown>): void {
  try {
    // Not in the generated types (newer than the last regeneration).
    const rpc = (supabase as unknown as { rpc: (...a: unknown[]) => unknown }).rpc.bind(supabase) as unknown as (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>;
    void Promise.resolve(rpc(fn, args)).then(
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
