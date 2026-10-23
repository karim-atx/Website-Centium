// Market + Share 3.0 · business share links: the public reader (B-SH.6,
// PLAN F35 / DB13) and the few business-side reads the share cards need that
// the live services don't already return (a class's created_at for the
// 14-day "NEW CLASS" pill, a showcase item's photo).

import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";
import type { ShareLinkKind } from "./links";
import { classifyShareLinkError, parseShareLink, type ShareLinkResult } from "./resolveModel";

export * from "./links";
export * from "./resolveModel";

type RpcResult = { data: unknown; error: PostgrestError | null };
const client = supabase as unknown as { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<RpcResult> };

/**
 * The public card behind /b/{slug}[/{kind}/{item}] (anon).
 * awaiting DB stage DB13: resolve_share_link is not on the server yet; until
 * it is, PostgREST answers PGRST202 and the page shows its quiet
 * "open in Centium" state. Errors not_found / not_public read as missing.
 */
export async function resolveShareLink(slug: string, kind: ShareLinkKind | null, item: string | null): Promise<ShareLinkResult> {
  let res: RpcResult;
  try {
    // awaiting DB stage DB13
    res = await client.rpc("resolve_share_link", { p_slug: slug, p_kind: kind, p_item: item });
  } catch (e) {
    return { status: "error", offline: isOffline(e) };
  }
  if (res.error) {
    const k = classifyShareLinkError(res.error);
    if (k === "error") return { status: "error", offline: isOffline(res.error) };
    return { status: k };
  }
  const card = parseShareLink(res.data, kind);
  return card ? { status: "found", card } : { status: "missing" };
}

type DbError = { message?: string } | null;
const db = supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => PromiseLike<{ data: Record<string, unknown> | null; error: DbError }> } };
  };
};

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
