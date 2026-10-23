// Market + Share 3.0 · the public share-link page's data (B-SH.6), pure so
// node:test checks the parse.
//
// The resolver is the Database follow-up's resolve_share_link(p_slug text,
// p_kind text default 'profile', p_item_id uuid default null) (20261212000000,
// STABLE, SECURITY DEFINER, granted to anon). It returns ONE row:
//   found boolean, business_id uuid, business_name text, kind text,
//   item_id uuid, target_url text, disabled boolean.
// - found: the business is active and not closed, and the link isn't
//   disabled. It doesn't look at the item: an item link resolves for any
//   uuid, so the page reads the item itself (below) and only draws a card for
//   one it can see.
// - a bad slug, a closed business and a hidden one: found = false with
//   nothing else (never told apart, by design).
// - disabled = true (with found = false): an admin took this (slug, kind,
//   item) link down; the page says so.
// - 22023 "unknown link kind": our kinds are mapped, so only a hand-made URL
//   could reach it; it reads as not found, as does 22P02 (not a uuid).
//
// The card's other fields come from the anon-readable rows the share cards
// already use: business_profiles (logo_url, business_type, location),
// business_classes, membership_plans, business_offerings; offers only when
// signed in (offers has no anon grant). Never on this page (B-SH.4,
// HANDOVER §9): member names or counts, client data, revenue. The parse keeps
// only the fields listed here.

import type { ServerLinkKind, ShareLinkKind } from "./links";

/** resolve_share_link's row, as the page uses it. */
export type ShareLinkResolution =
  | { status: "found"; businessId: string; businessName: string; kind: ServerLinkKind; itemId: string | null }
  /** A bad slug, a closed or hidden business, or a link we can't read. */
  | { status: "missing" }
  /** An admin took this link down (disabled_share_links). */
  | { status: "disabled" }
  | { status: "error"; offline: boolean };

export interface ShareLinkBusiness {
  name: string;
  logoUrl: string | null;
  /** business_profiles.business_type ("gym", "studio", "clothing_store" ...). */
  type: string | null;
  /** business_profiles.location: "Hamra, Beirut". */
  area: string | null;
}

export interface ShareLinkOffer {
  headline: string;
  pointsCost: number;
  validUntil: string | null;
  where: string | null;
}

export type ShareLinkItem =
  /** offer null: the offer can't be read signed out (offers has no anon grant). */
  | { kind: "o"; offer: ShareLinkOffer | null }
  | { kind: "c"; title: string; date: string | null; startTime: string | null }
  | { kind: "m"; name: string; price: string | null }
  | { kind: "i"; name: string; price: string | null; imageUrl: string | null; description: string | null }
  /** Openings are Release 2; no reader here, so the card names the business only. */
  | { kind: "j" }
  | { kind: "week" }
  | { kind: null };

export interface ShareLinkCard {
  business: ShareLinkBusiness;
  item: ShareLinkItem;
}

export type ShareLinkResult =
  | { status: "found"; card: ShareLinkCard }
  | { status: "missing" }
  | { status: "disabled" }
  | { status: "error"; offline: boolean };

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const KINDS: readonly string[] = ["week", "class", "offer", "item", "membership", "opening", "profile"];

/** The money columns come back as numerics: "$45", "$85.50". */
export function priceText(v: unknown): string | null {
  const n = num(v);
  if (n === null) return str(v);
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

/** resolve_share_link's answer (a one-row set) as what the page should do. */
export function parseResolution(data: unknown): ShareLinkResolution {
  const row = obj(Array.isArray(data) ? data[0] : data);
  if (!row) return { status: "missing" };
  if (row.found === true) {
    const businessId = str(row.business_id);
    const businessName = str(row.business_name);
    const kind = str(row.kind);
    if (!businessId || !businessName || !kind || !KINDS.includes(kind)) return { status: "missing" };
    return { status: "found", businessId, businessName, kind: kind as ServerLinkKind, itemId: str(row.item_id) };
  }
  return row.disabled === true ? { status: "disabled" } : { status: "missing" };
}

/** A refusal from resolve_share_link: a link we can't resolve, or a real failure. */
export function classifyShareLinkError(e: { code?: string | null; message?: string | null }): "missing" | "error" {
  return e.code === "22023" || e.code === "22P02" ? "missing" : "error";
}

/**
 * business_profiles (anon: active rows): the card's head line. Null fields
 * are left off. logo_url holds a business-logos storage path (or, on older
 * rows, a full URL): `logoUrlOf` turns it into an address to draw.
 */
export function parseBusiness(name: string, row: unknown, logoUrlOf: (v: string) => string | null = () => null): ShareLinkBusiness {
  const r = obj(row) ?? {};
  const logo = str(r.logo_url);
  return { name, logoUrl: logo ? logoUrlOf(logo) : null, type: str(r.business_type), area: str(r.location) };
}

/**
 * The item row the page read for this link, as the card's item; null when
 * there's nothing public to show (no row, another business's row, or one
 * that isn't on Explore), which the page shows as not found. An offer row
 * that wasn't read (undefined: signed out, offers has no anon grant) gives
 * the offer card without its details.
 */
export function parseItem(kind: ShareLinkKind | null, businessId: string, row: unknown): ShareLinkItem | null {
  if (kind === null) return { kind: null };
  if (kind === "week") return { kind: "week" };
  if (kind === "j") return { kind: "j" };
  const r = obj(Array.isArray(row) ? row[0] : row);
  if (kind === "o" && row === undefined) return { kind: "o", offer: null };
  if (!r || r.business_id !== businessId) return null;
  switch (kind) {
    case "o": {
      const headline = str(r.title);
      const points = num(r.points_cost);
      return headline && points !== null ? { kind: "o", offer: { headline, pointsCost: points, validUntil: str(r.ends_on), where: str(r.where_used) } } : null;
    }
    case "c": {
      const title = str(r.title);
      if (!title || r.cancelled_at || r.listed_on_explore === false) return null;
      return { kind: "c", title, date: str(r.event_date), startTime: str(r.start_time) };
    }
    case "m": {
      const name = str(r.name);
      if (!name || r.visible_on_explore === false || (r.status != null && r.status !== "active")) return null;
      return { kind: "m", name, price: priceText(r.price) };
    }
    case "i": {
      const name = str(r.title);
      if (!name || r.hidden_at || r.visible === false) return null;
      const img = str(r.image_url);
      return { kind: "i", name, price: priceText(r.price), imageUrl: img && /^https?:\/\//i.test(img) ? img : null, description: str(r.description) };
    }
  }
}

/** The columns each item read selects (only what the card shows, plus its gates). */
export const ITEM_READS: Record<"o" | "c" | "m" | "i", { table: string; columns: string }> = {
  o: { table: "offers", columns: "business_id, title, points_cost, ends_on, where_used" },
  c: { table: "business_classes", columns: "business_id, title, event_date, start_time, cancelled_at, listed_on_explore" },
  m: { table: "membership_plans", columns: "business_id, name, price, visible_on_explore, status" },
  i: { table: "business_offerings", columns: "business_id, title, price, description, image_url, visible, hidden_at" },
};
