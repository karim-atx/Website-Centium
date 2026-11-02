// Market + Share 3.0 · W2 · the live parts of a business showcase that no
// existing client reader returns (C-MO.4.4.1): the business's public website
// (the Online segment) and logo (the 60 owner tile) from business_profiles,
// and its places' coordinates (the Location segment's device distance) from
// gyms. Both tables are publicly readable for a listed business
// (business_profiles_select_public: active; gyms_select_public: not hidden and
// the business listed). The rest of the showcase reads the live services
// (marketplace_venues), the business's DB2 offers (services/offers) and its
// public shelf (fetchPublicShelf below, DB3 public_showcase).

import { supabase } from "../../../../lib/supabase/client";
import { storagePath } from "../../../services/venues/venueLogic";
import { marketRpc, type MarketResult } from "../../../services/market/rpc";
import type { Product } from "../../../services/store/types";
import { parseShelf } from "./rewardsModel";
import { t } from "../../../i18n/core";

export interface ShowcaseExtras {
  website: string | null;
  logoUrl: string | null;
  places: { lat: number | null; lng: number | null }[];
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** The website, logo and place coordinates; a failed read gives nulls (the segments then hide, the tile shows initials). */
export async function fetchShowcaseExtras(businessId: string): Promise<ShowcaseExtras> {
  const db = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => { eq: (k: string, v: string) => PromiseLike<{ data: unknown; error: { message: string } | null }> & { maybeSingle: () => PromiseLike<{ data: unknown; error: { message: string } | null }> } };
    };
  };
  const [biz, gyms] = await Promise.all([
    db.from("business_profiles").select("public_website, logo_url").eq("id", businessId).maybeSingle(),
    db.from("gyms").select("lat, lng").eq("business_id", businessId),
  ]);
  if (biz.error) console.warn("[showcase] Could not read the business's website and logo:", biz.error.message);
  if (gyms.error) console.warn("[showcase] Could not read the business's places:", gyms.error.message);
  const b = (biz.data ?? null) as { public_website?: string | null; logo_url?: string | null } | null;
  const path = storagePath(b?.logo_url ?? null);
  return {
    website: b?.public_website?.trim() || null,
    logoUrl: path ? supabase.storage.from("business-logos").getPublicUrl(path).data.publicUrl : null,
    places: Array.isArray(gyms.data) ? (gyms.data as { lat: unknown; lng: unknown }[]).map((g) => ({ lat: num(g.lat), lng: num(g.lng) })) : [],
  };
}

/**
 * One owner's public shelf (Database 73ea87b, 20261211400000):
 * public_showcase(p_owner_kind, p_owner_id), the visible items without an
 * admin takedown, in the owner's order (sort, then newest first, then id).
 * Empty for a paused or closed business or an unlisted professional (not an
 * error). Rows are mapped as products (title → name, image_url → imageUrl;
 * the projection has no stock and no store category).
 */
export function fetchPublicShelf(ownerKind: "business" | "professional", ownerId: string): Promise<MarketResult<Product[]>> {
  return marketRpc("public_showcase", { p_owner_kind: ownerKind, p_owner_id: ownerId }, t("Couldn't load the products."), parseShelf);
}

