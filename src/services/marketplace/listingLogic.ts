// B13 (Database docs/HANDOVER_API.md "B13 · Marketplace and promotions"): the
// pure rules the client side of the marketplace follows. No I/O here, so
// node:test covers it (listingLogic.test.ts).

import { tk } from "../../i18n/core";

/**
 * What a client may send to record_listing_event() (MK-07; offer_view since
 * Database PR #39, 20261214020000, with the offer as the item). booking /
 * order / pass are the server's (22023).
 */
export type ListingEventKind = "impression" | "profile_open" | "map_open" | "book_tap" | "offer_view";

/** What a client may send to record_professional_event() (20261214020000): the profile, or one of their offers as the item. */
export type ProfessionalEventKind = "profile_view" | "offer_view";

export interface ProfessionalEvent {
  professionalId: string;
  kind: ProfessionalEventKind;
  source: ListingSource;
  itemId?: string | null;
}

/** The once-per-session key of a professional event (its own namespace beside a business's). */
export function professionalEventKey(e: Pick<ProfessionalEvent, "professionalId" | "kind" | "itemId">): string {
  return `pro:${e.professionalId}|${e.itemId ?? ""}|${e.kind}`;
}
/** listing_event_source. */
export type ListingSource = "search" | "category" | "map" | "direct" | "featured";

export const LISTING_SOURCES: readonly ListingSource[] = ["search", "category", "map", "direct", "featured"];

export interface ListingEvent {
  businessId: string;
  kind: ListingEventKind;
  source: ListingSource;
  /** A class, plan or product id; null for the listing itself. */
  itemId?: string | null;
}

/**
 * The once-per-session key: one business, one item (or the listing), one
 * kind. The source is left out on purpose: the same card seen from search and
 * then from a category is one viewer seeing it once (the server counts a
 * signed-in viewer once a day per kind and item the same way).
 */
export function listingEventKey(e: Pick<ListingEvent, "businessId" | "kind" | "itemId">): string {
  return `${e.businessId}|${e.itemId ?? ""}|${e.kind}`;
}

/**
 * Where a card on an Explore list was seen or opened from. A typed search
 * wins (the card was found by it); otherwise a featured item is 'featured'
 * (it is on top because of its placement); otherwise the list itself, a
 * category (Classes / Businesses / Gyms and their sub-tabs).
 */
export function exploreSource({ query, featured }: { query?: string; featured?: boolean }): ListingSource {
  if (query && query.trim()) return "search";
  if (featured) return "featured";
  return "category";
}

/** The `src` a venue page was opened with (…&src=category); anything else is a direct open. */
export function parseListingSource(value: string | null | undefined): ListingSource {
  return LISTING_SOURCES.includes(value as ListingSource) ? (value as ListingSource) : "direct";
}

/**
 * Featured first, the rest in the order they came (a stable partition).
 * marketplace_classes already sorts this way; marketplace_venues does not
 * sort at all, and PostgREST does not promise a view's ORDER BY survives.
 */
export function featuredFirst<T>(rows: readonly T[], isFeatured: (r: T) => boolean): T[] {
  return [...rows.filter(isFeatured), ...rows.filter((r) => !isFeatured(r))];
}

/**
 * The spots this viewer can take (MK-04). A member of the business is not
 * limited by the class's Centium spots; anybody else takes the smaller of the
 * class's spots and its Centium spots. Null Centium spots = no separate limit.
 */
export function viewerSpotsLeft(spotsRemaining: number, centiumSpotsLeft: number | null | undefined, isMember: boolean): number {
  if (isMember || centiumSpotsLeft === null || centiumSpotsLeft === undefined) return Math.max(0, spotsRemaining);
  return Math.max(0, Math.min(spotsRemaining, centiumSpotsLeft));
}

/**
 * book_class() books as a member when the viewer holds a live venue pass of
 * the business (gym_pass_state_is_live: valid, awaiting_payment, upcoming).
 * The server also counts an accepted business membership, which the client
 * cannot see; it refuses past the Centium spots with ATXF6 either way.
 */
export function isLivePassState(state: string): boolean {
  return state === "valid" || state === "awaiting_payment" || state === "upcoming";
}

/** amenity_vocabulary(), in its own order. */
export const AMENITY_KEYS = [
  "showers",
  "lockers",
  "changing_rooms",
  "towels",
  "parking",
  "wifi",
  "water",
  "cafe",
  "sauna",
  "pool",
  "childcare",
  "accessible",
] as const;
export type AmenityKey = (typeof AMENITY_KEYS)[number];

/** The business side's labels (OURS-MA1-listing-details-sheets Amenities sheet + the lead's map). */
export const AMENITY_LABELS: Record<AmenityKey, string> = {
  showers: tk("Showers"),
  lockers: tk("Lockers"),
  changing_rooms: tk("Changing rooms"),
  towels: tk("Towels"),
  parking: tk("Parking"),
  wifi: tk("Wi-Fi"),
  water: tk("Water"),
  cafe: tk("Café"),
  sauna: tk("Sauna"),
  pool: tk("Pool"),
  childcare: tk("Child care"),
  accessible: tk("Wheelchair access"),
};

/** The venue's amenities the app can name, once each, in the vocabulary's order. */
export function knownAmenities(values: readonly string[] | null | undefined): AmenityKey[] {
  const set = new Set(values ?? []);
  return AMENITY_KEYS.filter((k) => set.has(k));
}

/** gyms.first_visit, trimmed; null when empty. */
export function firstVisitText(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

/** The hero's pictures: the cover first, then each approved photo once, in position order. */
export function heroPhotos(cover: string | null | undefined, photos: readonly { url: string; position: number }[]): string[] {
  const out: string[] = [];
  for (const u of [cover ?? null, ...[...photos].sort((a, b) => a.position - b.position).map((p) => p.url)]) {
    if (u && !out.includes(u)) out.push(u);
  }
  return out;
}

type KeyStore = { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void };

/**
 * A once-per-session gate. Keys live in memory and, when given one, in a
 * session store (sessionStorage), so a reload in the same tab doesn't count a
 * card again. A store that throws (private mode, blocked) costs only the
 * persistence. Capped so a long session can't grow it without bound.
 */
export function createSessionGate(store: KeyStore | null, storageKey = "centium.listingEvents", cap = 500) {
  let seen: string[] = [];
  try {
    const raw = store?.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed)) seen = parsed.filter((k): k is string => typeof k === "string");
  } catch {
    seen = [];
  }
  const set = new Set(seen);
  return {
    /** True the first time a key is offered this session (and remembers it). */
    first(key: string): boolean {
      if (set.has(key)) return false;
      set.add(key);
      seen.push(key);
      if (seen.length > cap) set.delete(seen.shift() as string);
      try {
        store?.setItem(storageKey, JSON.stringify(seen));
      } catch {
        // Memory still remembers it.
      }
      return true;
    },
    has: (key: string) => set.has(key),
  };
}
