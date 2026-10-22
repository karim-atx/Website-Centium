// Market + Share 3.0 · business share links (PLAN F34 / F35, DB13; HANDOVER
// §12 "Deep links and QR", §13 "Public resolver /b/:slug/*"). Pure, so the
// card model, the public page and node:test share one definition.
//
// A link is the site address (config/site.ts, never centium.app) + /b/{slug}
// with an optional /{kind}/{item}:
// - week   this week's timetable (no item);
// - c      a class (business_classes.id);
// - o      a point offer (offers.id, DB2);
// - i      a showcase item (business_offerings.id);
// - m      a membership plan (membership_plans.id);
// - j      an opening (DB8, Release 2; parsed so a Release 2 link resolves, never built in Release 1);
// - none   the business itself ("Find us on Centium").
// business_profiles.slug is the slug (B5: 3 to 40 of a-z 0-9 and single
// hyphens, never all digits).

import { siteHref, siteText } from "../../config/site";

export type ShareLinkKind = "week" | "c" | "o" | "i" | "m" | "j";

export const SHARE_LINK_KINDS: readonly ShareLinkKind[] = ["week", "c", "o", "i", "m", "j"];

/** The kinds that name an item after them (all but week). */
const ITEM_KINDS: readonly ShareLinkKind[] = ["c", "o", "i", "m", "j"];

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** An item reference: a uuid (or any id of URL-safe characters). */
const ITEM_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** business_profiles_slug_check, client side. */
export function isBizSlug(slug: string | null | undefined): slug is string {
  return !!slug && slug.length >= 3 && slug.length <= 40 && SLUG_RE.test(slug) && !/^[0-9]+$/.test(slug);
}

export interface ShareLinkTarget {
  kind: ShareLinkKind | null;
  item: string | null;
}

/** "/b/flexfitness", "/b/flexfitness/week", "/b/flexfitness/c/{id}". Throws on a bad slug or a missing item. */
export function bizSharePath(slug: string, kind: ShareLinkKind | null = null, item: string | null = null): string {
  if (!isBizSlug(slug)) throw new Error("bizSharePath: not a business slug");
  if (!kind) return `/b/${slug}`;
  if (kind === "week") return `/b/${slug}/week`;
  if (!item || !ITEM_RE.test(item)) throw new Error("bizSharePath: this kind needs an item");
  return `/b/${slug}/${kind}/${encodeURIComponent(item)}`;
}

/** The link to open or share (QR value, Copy, navigator.share url). */
export const bizShareHref = (slug: string, kind: ShareLinkKind | null = null, item: string | null = null) => siteHref(bizSharePath(slug, kind, item));

/** The same link as printed on a card, without the scheme. */
export const bizShareText = (slug: string, kind: ShareLinkKind | null = null, item: string | null = null) => siteText(bizSharePath(slug, kind, item));

/**
 * The route's splat (everything after /b/:slug/) as a target, or null when it
 * isn't a link we build: "" → the business, "week", "{kind}/{item}".
 */
export function parseShareSplat(splat: string | null | undefined): ShareLinkTarget | null {
  const parts = (splat ?? "").split("/").filter(Boolean);
  if (parts.length === 0) return { kind: null, item: null };
  const kind = parts[0] as ShareLinkKind;
  if (!SHARE_LINK_KINDS.includes(kind)) return null;
  if (kind === "week") return parts.length === 1 ? { kind, item: null } : null;
  if (parts.length !== 2 || !ITEM_KINDS.includes(kind)) return null;
  let item: string;
  try {
    item = decodeURIComponent(parts[1]);
  } catch {
    return null;
  }
  return ITEM_RE.test(item) ? { kind, item } : null;
}
