// Market + Share 3.0 · W2 · the live parts of a business showcase that no
// existing client reader returns (C-MO.4.4.1): the business's public website
// (the Online segment) and logo (the 60 owner tile) from business_profiles,
// and its places' coordinates (the Location segment's device distance) from
// gyms. Both tables are publicly readable for a listed business
// (business_profiles_select_public: active; gyms_select_public: not hidden and
// the business listed). The Products grid is DB3's public_showcase
// (fetchShowcaseItems below); the offers are DB2 `offers`
// (services/offers fetchShowcaseOffers).

import { supabase } from "../../../../lib/supabase/client";
import { storagePath } from "../../../services/venues/venueLogic";
import { marketRpc } from "../../../services/market/rpc";
import { num as numOf, rows, str } from "../../../services/market/parse";
import type { OfferingCategory, Product } from "../../../services/store/types";

export interface ShowcaseExtras {
  website: string | null;
  logoUrl: string | null;
  places: { lat: number | null; lng: number | null }[];
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * public_showcase(p_owner_kind, p_owner_id) (Database 20261210900000,
 * HANDOVER_API Release 1 "Showcase"): the owner's visible, unhidden shelf
 * items in the owner's order (sort, then created_at); nothing for a paused
 * listing, a closed business or an unlisted professional. Read here as the
 * grid's Product shape (no stock or store group in this projection). Null
 * when the read fails.
 */
export async function fetchShowcaseItems(ownerKind: "business" | "professional", ownerId: string): Promise<Product[] | null> {
  const r = await marketRpc("public_showcase", { p_owner_kind: ownerKind, p_owner_id: ownerId }, "Couldn't load the products.", (data) =>
    rows(data).flatMap((x): Product[] => {
      const id = str(x.id);
      if (!id) return [];
      return [
        {
          id,
          name: str(x.title) ?? "",
          price: numOf(x.price),
          description: str(x.description) ?? "",
          marketCategory: x.category as OfferingCategory,
          stock: null,
          visible: true,
          categoryId: null,
          category: null,
          categoryGlyph: null,
          imageUrl: str(x.image_url),
        },
      ];
    })
  );
  return r.ok ? r.value : null;
}

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
