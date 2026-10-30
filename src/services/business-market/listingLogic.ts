import { appLocale } from "../../i18n/format";
// Pure B13 listing rules (node --test loads this file; no client imports):
// amenity keys and labels, listing_strength rows, the photo gallery, and the
// listing-performance readers mapped onto the MA1 Performance tab.

// ---------------------------------------------------------------------------
// MK-02 amenities: amenity_vocabulary() is the fixed list, in its order.

export const AMENITY_KEYS = ["showers", "lockers", "changing_rooms", "towels", "parking", "wifi", "water", "cafe", "sauna", "pool", "childcare", "accessible"] as const;
export type AmenityKey = (typeof AMENITY_KEYS)[number];

/** The sheet's words for the server's keys (OURS-MA1-listing-details-sheets row 1; Café, Sauna and Pool are B13's additions). */
export const AMENITY_LABEL: Record<AmenityKey, string> = {
  showers: "Showers",
  lockers: "Lockers",
  changing_rooms: "Changing rooms",
  towels: "Towels",
  parking: "Parking",
  wifi: "Wi-Fi",
  water: "Water",
  cafe: "Café",
  sauna: "Sauna",
  pool: "Pool",
  childcare: "Child care",
  accessible: "Wheelchair access",
};

export const isAmenityKey = (k: string): k is AmenityKey => (AMENITY_KEYS as readonly string[]).includes(k);

/** Known keys only, in vocabulary order, once each. */
export function cleanAmenities(keys: readonly string[]): AmenityKey[] {
  const set = new Set(keys);
  return AMENITY_KEYS.filter((k) => set.has(k));
}


export const FIRST_VISIT_MAX = 300;

/** gyms.first_visit: trimmed, at most 300, empty = null. */
export function cleanFirstVisit(text: string): string | null {
  const t = text.trim().slice(0, FIRST_VISIT_MAX);
  return t ? t : null;
}

// ---------------------------------------------------------------------------
// MK-02 listing_strength(): eleven derived items.

export type ServerStrengthItem =
  | "logo"
  | "cover"
  | "description"
  | "hours"
  | "contact"
  | "location"
  | "photos"
  | "amenities"
  | "first_visit"
  | "plans"
  | "something_to_book";

export type ServerStrength = Partial<Record<ServerStrengthItem, boolean>>;

export function parseStrength(rows: readonly { item: string; done: boolean | null }[]): ServerStrength {
  const out: ServerStrength = {};
  for (const r of rows) out[r.item as ServerStrengthItem] = !!r.done;
  return out;
}

// ---------------------------------------------------------------------------
// MK-03 photos

export type PhotoStatus = "in_review" | "approved" | "rejected";

export interface BusinessPhoto {
  id: string;
  gymId: string | null;
  path: string;
  url: string;
  caption: string | null;
  position: number;
  status: PhotoStatus;
  rejectReason: string | null;
}

export const PHOTO_LIMIT = 20;

/** Position order, then oldest id as the tie-break the reorder never leaves. */
export const sortPhotos = (p: readonly BusinessPhoto[]): BusinessPhoto[] => [...p].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));

export function photoCounts(p: readonly BusinessPhoto[]): { approved: number; inReview: number; rejected: number; total: number } {
  return {
    approved: p.filter((x) => x.status === "approved").length,
    inReview: p.filter((x) => x.status === "in_review").length,
    rejected: p.filter((x) => x.status === "rejected").length,
    total: p.length,
  };
}

/** The ids after moving one a step left (-1) or right (+1); unchanged at an edge. */
export function moveId(ids: readonly string[], id: string, dir: -1 | 1): string[] {
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return [...ids];
  const out = [...ids];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** The ids after dragging one to index `to`. */
export function moveTo(ids: readonly string[], id: string, to: number): string[] {
  const out = ids.filter((x) => x !== id);
  if (out.length === ids.length) return [...ids];
  out.splice(Math.max(0, Math.min(to, out.length)), 0, id);
  return out;
}

/** "{n} of 6 recommended · {k} in review" (MA1-001 row 8c); n counts the cover and approved photos. */
export function photoLine(shown: number, inReview: number): string {
  if (shown === 0 && inReview === 0) return "No photos yet. Add at least 6 of your real space.";
  return `${shown} of 6 recommended${inReview ? ` · ${inReview} in review` : ""}`;
}

/** Only the uploader may remove an object (the bucket policy keys on the first folder). */
export const ownsObject = (path: string, uid: string): boolean => path.split("/")[0] === uid;

export function photoError(code: string | undefined): string {
  if (code === "ATXF5") return "You've reached 20 photos. Remove a photo to add another.";
  if (code === "ATX03" || code === "42501") return "You need the Marketing permission to change photos. Ask the owner.";
  return "Couldn't save the photo. Try again.";
}

// ---------------------------------------------------------------------------
// MK-07 listing performance (always the last 12 weeks)

export interface PerfWeek {
  weekStart: string;
  impressions: number;
  profileOpens: number;
  mapOpens: number;
  bookTaps: number;
  bookings: number;
  orders: number;
  passes: number;
}

export interface Funnel {
  seen: number;
  opened: number;
  tappedBook: number;
  booked: number;
  bySource: Partial<Record<ListingSource, number>>;
}

export interface TopItem {
  itemId: string;
  kind: "class" | "plan" | "product" | "other";
  title: string | null;
  impressions: number;
  bookTaps: number;
  bookings: number;
}

export interface NewClientsWeek {
  weekStart: string;
  n: number;
}

export type ListingSource = "search" | "category" | "map" | "direct" | "featured";

/** The funnel chips' order and words (MA1-005 row 6a); Featured is B13's fifth source. */
export const SOURCE_ORDER: ListingSource[] = ["search", "category", "map", "direct", "featured"];
export const SOURCE_LABEL: Record<ListingSource, string> = {
  search: "Search",
  category: "Category browsing",
  map: "Map",
  direct: "Direct link",
  featured: "Featured",
};

export type MarketKind = "classes" | "gym" | "store";

/** The third box and the chart's second mode: bookings (Classes), passes (Gym), orders (Store). */
export const doneOf = (w: PerfWeek, kind: MarketKind): number => (kind === "store" ? w.orders : kind === "gym" ? w.passes : w.bookings);

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export function parsePerfWeek(r: Record<string, unknown>): PerfWeek {
  return {
    weekStart: String(r.week_start ?? ""),
    impressions: n(r.impressions),
    profileOpens: n(r.profile_opens),
    mapOpens: n(r.map_opens),
    bookTaps: n(r.book_taps),
    bookings: n(r.bookings),
    orders: n(r.orders),
    passes: n(r.passes),
  };
}

export function parseFunnel(r: Record<string, unknown> | null | undefined): Funnel {
  const raw = (r?.by_source ?? {}) as Record<string, unknown>;
  const bySource: Partial<Record<ListingSource, number>> = {};
  for (const s of SOURCE_ORDER) if (raw[s] !== undefined) bySource[s] = n(raw[s]);
  return { seen: n(r?.seen), opened: n(r?.opened), tappedBook: n(r?.tapped_book), booked: n(r?.booked), bySource };
}

export function parseTopItem(r: Record<string, unknown>): TopItem {
  const k = String(r.item_kind ?? "other");
  return {
    itemId: String(r.item_id ?? ""),
    kind: k === "class" || k === "plan" || k === "product" ? k : "other",
    title: typeof r.title === "string" && r.title.trim() ? r.title : null,
    impressions: n(r.impressions),
    bookTaps: n(r.book_taps),
    bookings: n(r.bookings),
  };
}

export interface PerfSummary {
  /** No listing event at all in the 12 weeks: the drawn no-data state (MA1-065). */
  empty: boolean;
  /** Data only in this week and the last: the early state (MA1-060). */
  early: boolean;
  views: number;
  taps: number;
  done: number;
  viewsPerWeek: number[];
  tapsPerWeek: number[];
  donePerWeek: number[];
}

export function summarize(weeks: readonly PerfWeek[], kind: MarketKind): PerfSummary {
  const sum = (f: (w: PerfWeek) => number) => weeks.reduce((a, w) => a + f(w), 0);
  const any = (w: PerfWeek) => w.impressions + w.profileOpens + w.mapOpens + w.bookTaps + w.bookings + w.orders + w.passes > 0;
  const first = weeks.findIndex(any);
  const empty = first < 0;
  return {
    empty,
    early: !empty && first >= weeks.length - 2,
    views: sum((w) => w.impressions),
    taps: sum((w) => w.profileOpens + w.mapOpens),
    done: sum((w) => doneOf(w, kind)),
    viewsPerWeek: weeks.map((w) => w.impressions),
    tapsPerWeek: weeks.map((w) => w.profileOpens + w.mapOpens),
    donePerWeek: weeks.map((w) => doneOf(w, kind)),
  };
}

/** "1,240" */
export const num = (v: number): string => v.toLocaleString(appLocale("en-US"));

/** One decimal under 10%, whole above (MA1-096 row 6e DEFECT fix). */
export function pctOf(part: number, whole: number): string {
  if (!whole) return "0%";
  const v = (part / whole) * 100;
  return v < 10 ? `${v.toFixed(1)}%` : `${Math.round(v)}%`;
}

/** The top item by Centium bookings (passes / orders), then views. Null when nothing was booked. */
export function topBooked(items: readonly TopItem[]): TopItem | null {
  const s = [...items].filter((x) => x.bookings > 0).sort((a, b) => b.bookings - a.bookings || b.impressions - a.impressions);
  return s[0] ?? null;
}

/** The number card's insight line (MA1-005 row 5b). */
export function perfLine(s: PerfSummary, top: TopItem | null, kind: MarketKind, people: string): string {
  if (s.empty) return `Numbers start once ${people} see your listing.`;
  if (s.early) return "Changes show after 2 weeks on Explore.";
  const what = kind === "store" ? "Orders" : kind === "gym" ? "Passes" : "Bookings";
  if (!top?.title) return `${what} from Centium this period.`;
  return kind === "store" ? `${what} from Centium this period. ${top.title} leads.` : `${what} from Centium this period. ${top.title} brings the most.`;
}

export interface FunnelStage {
  t: string;
  v: number;
  /** Width of the bar, % of the first stage (min 14). */
  w: number;
  /** "{p}% go on to {stage}", empty on the first. */
  conv: string;
  /** Only the first stage has a source split (by_source counts impressions). */
  segs: { source: ListingSource; v: number }[] | null;
}

/** Seen, opened, booked (MA1-005 row 6b): the stage titles come from the type's vocabulary; a source filter narrows the first stage only. */
export function funnelStages(f: Funnel, titles: readonly string[], src: ListingSource | null): FunnelStage[] {
  const seen = src ? f.bySource[src] ?? 0 : f.seen;
  const vals = [seen, f.opened, f.booked];
  const segs = SOURCE_ORDER.filter((s) => (f.bySource[s] ?? 0) > 0).map((s) => ({ source: s, v: f.bySource[s] ?? 0 }));
  return titles.slice(0, 3).map((t, i) => ({
    t,
    v: vals[i],
    w: Math.max(14, vals[0] ? (vals[i] / vals[0]) * 100 : 14),
    conv: i ? `${vals[i - 1] ? Math.round((vals[i] / vals[i - 1]) * 100) : 0}% go on to ${t.toLowerCase()}` : "",
    segs: i === 0 ? segs : null,
  }));
}

/** The funnel's insight line (MA1-005 row 6e). */
export function funnelLine(f: Funnel, src: ListingSource | null, emptyLine: string, doneWord: string): string {
  if (!f.seen) return emptyLine;
  if (src) return `${SOURCE_LABEL[src]}: ${pctOf(f.bySource[src] ?? 0, f.seen)} of your views came from here.`;
  const lead = SOURCE_ORDER.filter((s) => (f.bySource[s] ?? 0) > 0).sort((a, b) => (f.bySource[b] ?? 0) - (f.bySource[a] ?? 0))[0];
  const first = lead ? `${SOURCE_LABEL[lead]} brings the most views. ` : "";
  return `${first}${pctOf(f.booked, f.seen)} of views became ${doneWord}.`;
}

/** The 12-week total of people whose first booking came through Centium. */
export const newClientsTotal = (w: readonly NewClientsWeek[]): number => w.reduce((a, x) => a + x.n, 0);

// ---------------------------------------------------------------------------
// MK-04 Centium spots. business_classes.centium_spots is the total places
// people from Centium may take (null = no separate limit); book_class counts
// every booking with source "centium" against it (ATXF6).

/** Spots open on Centium right now (MA1-003 row 7d): never more than the free spots. */
export function openOnCentium(capacity: number, booked: number, centiumSpots: number | null, centiumBooked: number): number {
  const free = Math.max(0, capacity - booked);
  if (centiumSpots === null) return free;
  return Math.max(0, Math.min(free, centiumSpots - centiumBooked));
}

