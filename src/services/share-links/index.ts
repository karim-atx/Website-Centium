// Market + Share 3.0 · business share links: the public reader (B-SH.6,
// PLAN F35; resolve_share_link from the Database follow-up 20261212000000)
// and the few business-side reads the share cards need that the live
// services don't already return (a class's created_at for the 14-day
// "NEW CLASS" pill, a showcase item's photo).

import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";
import { hostedImageUrl, storagePath } from "../venues/venueLogic";
import { serverKind, type ShareLinkKind } from "./links";
import { ITEM_READS, classifyShareLinkError, parseBusiness, parseItem, parseResolution, type ShareLinkResult } from "./resolveModel";

export * from "./links";
export * from "./resolveModel";

type RpcResult = { data: unknown; error: PostgrestError | null };
const client = supabase as unknown as { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<RpcResult> };

type ReadResult = { data: Record<string, unknown> | null; error: { message?: string; code?: string } | null };
const db = supabase as unknown as {
  from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => PromiseLike<ReadResult> } } };
};

async function readOne(table: string, columns: string, id: string): Promise<ReadResult> {
  try {
    return await db.from(table).select(columns).eq("id", id).maybeSingle();
  } catch (e) {
    return { data: null, error: e as ReadResult["error"] };
  }
}

/** A business-logos path as its public address (the bucket is public), or a full http(s) URL as it is. */
function logoUrlOf(v: string): string | null {
  const path = storagePath(v);
  return path ? supabase.storage.from("business-logos").getPublicUrl(path).data.publicUrl : hostedImageUrl(v);
}

/**
 * The public card behind /b/{slug}[/{kind}/{item}] (works signed out).
 * resolve_share_link says whether the link is live (found / taken down / not
 * found); then the business's public head line and the item are read from
 * the rows the share cards use, and an item the reader can't see (gone, not
 * on Explore, another business's) is not found.
 */
export async function resolveShareLink(slug: string, kind: ShareLinkKind | null, item: string | null, signedIn: boolean): Promise<ShareLinkResult> {
  let res: RpcResult;
  try {
    res = await client.rpc("resolve_share_link", { p_slug: slug, p_kind: serverKind(kind), p_item_id: item });
  } catch (e) {
    return { status: "error", offline: isOffline(e) };
  }
  if (res.error) {
    return classifyShareLinkError(res.error) === "missing" ? { status: "missing" } : { status: "error", offline: isOffline(res.error) };
  }
  const link = parseResolution(res.data);
  if (link.status !== "found") return link;

  const readItem = item && (kind === "c" || kind === "m" || kind === "i" || (kind === "o" && signedIn)) ? ITEM_READS[kind] : null;
  const [biz, it] = await Promise.all([
    readOne("business_profiles", "logo_url, business_type, location", link.businessId),
    readItem && item ? readOne(readItem.table, readItem.columns, item) : Promise.resolve(undefined),
  ]);
  if (it && it.error) return { status: "error", offline: isOffline(it.error) };
  const parsed = parseItem(kind, link.businessId, it === undefined ? undefined : it.data);
  if (!parsed) return { status: "missing" };
  // The head line is extra: without it the card still has the name.
  const bizRow = biz.error ? null : biz.data;
  return { status: "found", card: { business: parseBusiness(link.businessName, bizRow, logoUrlOf), item: parsed } };
}

/**
 * When a class was created, for the 14-day "NEW CLASS" pill: a repeating
 * class counts from its series (class_series.created_at), a one-off from its
 * own row. Null when it can't be read (the pill is then left off).
 */
export async function fetchClassCreatedAt(classId: string, seriesId: string | null): Promise<string | null> {
  try {
    const r = seriesId
      ? await db.from("class_series").select("created_at").eq("id", seriesId).maybeSingle()
      : await db.from("business_classes").select("created_at").eq("id", classId).maybeSingle();
    const v = r.data?.created_at;
    return !r.error && typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}
