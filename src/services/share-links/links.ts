// Market + Share 3.0 · business share links (PLAN F34 / F35; HANDOVER §12
// "Deep links and QR", §13 "Public resolver /b/:slug/*"; the Database
// follow-up 20261212000000 resolve_share_link). Pure, so the card model, the
// public page and node:test share one definition.
//
// A link is the site address (config/site.ts, never centium.app) + /b/{slug}
// with an optional /{kind word}/{item}: exactly the shape of
// resolve_share_link's target_url (Karim, #33: print the server's words).
// - week        this week's timetable (no item);
// - class       a class (business_classes.id);            internal kind "c"
// - offer       a point offer (offers.id, DB2);           internal kind "o"
// - item        a showcase item (business_offerings.id);  internal kind "i"
// - membership  a membership plan (membership_plans.id);  internal kind "m"
// - opening     an opening (DB8, Release 2; parsed so a Release 2 link
//               resolves, never built in Release 1);       internal kind "j"
// - none        the business itself ("Find us on Centium"; server "profile").
// business_profiles.slug is the slug (B5: 3 to 40 of a-z 0-9 and single
// hyphens, never all digits). Items are uuids (resolve_share_link p_item_id).
//
// The single letters are the handover's (api.md "Deep links") and stay the
// app's internal kind names. Links printed before this change used them
// (/b/{slug}/c/{id}), so the route still reads both letters and words;
// every link built now prints the word.

import { siteHref, siteText } from "../../config/site";

export type ShareLinkKind = "week" | "c" | "o" | "i" | "m" | "j";

export const SHARE_LINK_KINDS: readonly ShareLinkKind[] = ["week", "c", "o", "i", "m", "j"];

/** The kinds that name an item after them (all but week). */
const ITEM_KINDS: readonly ShareLinkKind[] = ["c", "o", "i", "m", "j"];

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** An item reference: a uuid (resolve_share_link takes p_item_id uuid). */
const ITEM_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** resolve_share_link's p_kind (disabled_share_links_kind_check). */
export type ServerLinkKind = "week" | "class" | "offer" | "item" | "membership" | "opening" | "profile";

const TO_SERVER: Record<ShareLinkKind, ServerLinkKind> = { week: "week", c: "class", o: "offer", i: "item", m: "membership", j: "opening" };
const FROM_SERVER: Record<string, ShareLinkKind> = { class: "c", offer: "o", item: "i", membership: "m", opening: "j" };

/** The word the server uses for a link kind (null = the business itself = "profile"). */
export const serverKind = (kind: ShareLinkKind | null): ServerLinkKind => (kind ? TO_SERVER[kind] : "profile");

/** business_profiles_slug_check, client side. */
export function isBizSlug(slug: string | null | undefined): slug is string {
  return !!slug && slug.length >= 3 && slug.length <= 40 && SLUG_RE.test(slug) && !/^[0-9]+$/.test(slug);
}

export interface ShareLinkTarget {
  kind: ShareLinkKind | null;
  item: string | null;
}

/** "/b/flexfitness", "/b/flexfitness/week", "/b/flexfitness/class/{id}" (the server's words). Throws on a bad slug or a missing item. */
export function bizSharePath(slug: string, kind: ShareLinkKind | null = null, item: string | null = null): string {
  if (!isBizSlug(slug)) throw new Error("bizSharePath: not a business slug");
  if (!kind) return `/b/${slug}`;
  if (kind === "week") return `/b/${slug}/week`;
  if (!item || !ITEM_RE.test(item)) throw new Error("bizSharePath: this kind needs an item");
  return `/b/${slug}/${serverKind(kind)}/${item.toLowerCase()}`;
}

/** The link to open or share (QR value, Copy, navigator.share url). */
export const bizShareHref = (slug: string, kind: ShareLinkKind | null = null, item: string | null = null) => siteHref(bizSharePath(slug, kind, item));

/** The same link as printed on a card, without the scheme. */
export const bizShareText = (slug: string, kind: ShareLinkKind | null = null, item: string | null = null) => siteText(bizSharePath(slug, kind, item));

/**
 * The route's splat (everything after /b/:slug/) as a target, or null when it
 * isn't a link: "" → the business, "week", "{kind}/{item}" with the kind as
 * a word (what we print; the server's target_url) or a letter (links printed
 * before the switch to words).
 */
export function parseShareSplat(splat: string | null | undefined): ShareLinkTarget | null {
  const parts = (splat ?? "").split("/").filter(Boolean);
  if (parts.length === 0) return { kind: null, item: null };
  const kind = (Object.prototype.hasOwnProperty.call(FROM_SERVER, parts[0]) ? FROM_SERVER[parts[0]] : parts[0]) as ShareLinkKind;
  if (!SHARE_LINK_KINDS.includes(kind)) return null;
  if (kind === "week") return parts.length === 1 ? { kind, item: null } : null;
  if (parts.length !== 2 || !ITEM_KINDS.includes(kind)) return null;
  let item: string;
  try {
    item = decodeURIComponent(parts[1]);
  } catch {
    return null;
  }
  return ITEM_RE.test(item) ? { kind, item: item.toLowerCase() } : null;
}

/** The business's public page (More › Business card, MO1B-026): href + printed text, or null without a valid slug (no dead link). */
export function bizProfileLink(slug: string | null | undefined): { href: string; text: string } | null {
  return isBizSlug(slug) ? { href: bizShareHref(slug), text: bizShareText(slug) } : null;
}
