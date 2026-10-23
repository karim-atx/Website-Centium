// Market + Share 3.0 · the public share-link reader's shape (PLAN §2.2 DB13,
// api.md "Sharing"), pure so node:test checks the parse.
//
// awaiting DB stage DB13: resolve_share_link(p_slug, p_kind, p_item) (anon)
// has not landed. PLAN documents what it returns (public card data only:
// business name, logo, category, area, rating, plus the item: offer
// headline / points / validity; class title / time / instructor if Team /
// spots left; plan name / price; product name / price / photo; opening
// title) and its errors (not_found, not_public), but not the column names.
// The names below are this side's reading of that list; the lead confirms
// them against ../Database/docs/HANDOVER_API.md when DB13 lands. Anything
// the parse can't read is treated as not found, so the page never shows a
// half-read or invented card.
//
// Never on this page (B-SH.4, HANDOVER §9): member names or counts, client
// data, revenue. The parse keeps only the fields listed here.

import type { ShareLinkKind } from "./links";

export interface ShareLinkBusiness {
  name: string;
  logoUrl: string | null;
  /** "Gym", "Sportswear" ... */
  category: string | null;
  /** "Hamra, Beirut" */
  area: string | null;
  rating: { average: number; count: number } | null;
}

export type ShareLinkItem =
  | { kind: "o"; headline: string; pointsCost: number; validUntil: string | null; where: string | null }
  | { kind: "c"; title: string; date: string | null; startTime: string | null; instructor: string | null; spotsLeft: number | null }
  | { kind: "m"; name: string; price: string | null }
  | { kind: "i"; name: string; price: string | null; imageUrl: string | null; description: string | null }
  | { kind: "j"; title: string }
  | { kind: "week" }
  | { kind: null };

export interface ShareLinkCard {
  business: ShareLinkBusiness;
  item: ShareLinkItem;
}

export type ShareLinkResult =
  | { status: "found"; card: ShareLinkCard }
  /** not_found, not_public, or an answer we can't read: the same quiet page. */
  | { status: "missing" }
  /** The reader isn't on the server yet (DB13): the quiet "open in Centium" page. */
  | { status: "unavailable" }
  | { status: "error"; offline: boolean };

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** The money columns come back as numerics: "$45", "$85.50". */
export function priceText(v: unknown): string | null {
  const n = num(v);
  if (n === null) return str(v);
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

/** resolve_share_link's answer as a card, or null when it isn't one we can show. */
export function parseShareLink(data: unknown, kind: ShareLinkKind | null): ShareLinkCard | null {
  const row = obj(Array.isArray(data) ? data[0] : data);
  if (!row) return null;
  const b = obj(row.business) ?? row;
  const name = str(b.business_name ?? b.name);
  if (!name) return null;
  const avg = num(b.rating ?? b.rating_average);
  const count = num(b.review_count ?? b.rating_count);
  const business: ShareLinkBusiness = {
    name,
    logoUrl: str(b.logo_url),
    category: str(b.category),
    area: str(b.area ?? b.location),
    rating: avg !== null && count !== null && count > 0 ? { average: avg, count } : null,
  };
  const it = obj(row.item) ?? {};
  let item: ShareLinkItem | null = null;
  if (kind === null) item = { kind: null };
  else if (kind === "week") item = { kind: "week" };
  else if (kind === "o") {
    const headline = str(it.headline);
    const points = num(it.points_cost);
    item = headline && points !== null ? { kind: "o", headline, pointsCost: points, validUntil: str(it.ends_on ?? it.valid_until), where: str(it.where_used ?? it.where) } : null;
  } else if (kind === "c") {
    const title = str(it.title);
    item = title ? { kind: "c", title, date: str(it.event_date ?? it.date), startTime: str(it.start_time), instructor: str(it.instructor), spotsLeft: num(it.spots_left) } : null;
  } else if (kind === "m") {
    const n = str(it.name);
    item = n ? { kind: "m", name: n, price: priceText(it.price) } : null;
  } else if (kind === "i") {
    const n = str(it.name ?? it.title);
    item = n ? { kind: "i", name: n, price: priceText(it.price), imageUrl: str(it.image_url), description: str(it.description) } : null;
  } else if (kind === "j") {
    const t = str(it.title);
    item = t ? { kind: "j", title: t } : null;
  }
  return item ? { business, item } : null;
}

/** The documented errors (not_found, not_public) and a missing function (PostgREST PGRST202, Postgres 42883). */
export function classifyShareLinkError(e: { code?: string | null; message?: string | null }): "missing" | "unavailable" | "error" {
  const msg = `${e.code ?? ""} ${e.message ?? ""}`;
  if (/not_found|not_public/i.test(msg)) return "missing";
  if (e.code === "PGRST202" || e.code === "42883" || /could not find the function/i.test(msg)) return "unavailable";
  return "error";
}
