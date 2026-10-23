import { useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { fetchBusinessFull, type BusinessFull } from "../../../services/business-more";
import { fetchReviewMetrics } from "../../../services/reputation";
import { isBizSlug } from "../../../services/share-links/links";
import { initialsOf, typeLabel } from "../../business-more/kind";
import { fillOf, type BizBrand } from "./bizCardModel";

// The business on a B-SH card: name, logo, type, location and slug from the
// console's business row (fetchBusinessFull: the owned business, or the one
// this account works for), read once per account and shared by every share
// button on a page. A card needs a link, so a business without a slug
// (business_profiles.slug is null) or not shown on Explore (a link would
// lead to not_public) can't share yet: the button says why.

export type BrandState =
  | { status: "loading" }
  | { status: "ready"; brand: BizBrand; businessId: string }
  | { status: "noSlug" }
  | { status: "hidden" }
  | { status: "error" };

let cache: { uid: string; at: number; p: Promise<BusinessFull | null | "error"> } | null = null;
const TTL = 60_000;

function loadBusiness(uid: string): Promise<BusinessFull | null | "error"> {
  if (cache && cache.uid === uid && Date.now() - cache.at < TTL) return cache.p;
  const p = fetchBusinessFull(uid).then((r) => (r.ok ? r.value : ("error" as const)));
  cache = { uid, at: Date.now(), p };
  p.then((v) => {
    if (v === "error" && cache?.p === p) cache = null;
  });
  return p;
}

export function brandOf(b: BusinessFull): BizBrand | null {
  if (!isBizSlug(b.slug)) return null;
  const fill = fillOf(b.type);
  return {
    name: b.name,
    initials: initialsOf(b.name),
    category: typeLabel(b.type),
    location: b.location?.trim() || null,
    logoUrl: b.logoUrl,
    slug: b.slug,
    c1: fill.c1,
    c2: fill.c2,
  };
}

export function useBizBrand(enabled = true): BrandState {
  const { authUserId } = useApp();
  const [state, setState] = useState<BrandState>({ status: "loading" });
  useEffect(() => {
    if (!enabled || !authUserId) return;
    let live = true;
    void loadBusiness(authUserId).then((b) => {
      if (!live) return;
      if (b === "error") return setState({ status: "error" });
      if (!b) return setState({ status: "noSlug" });
      const brand = brandOf(b);
      if (!brand) return setState({ status: "noSlug" });
      if (!b.active || b.closedAt) return setState({ status: "hidden" });
      setState({ status: "ready", brand, businessId: b.id });
    });
    return () => {
      live = false;
    };
  }, [authUserId, enabled]);
  return state;
}

/** "4.8 · 212 reviews" from every review of the business, shown from 3 reviews (the live profile rule). */
export async function fetchRatingLine(businessId: string): Promise<string | null> {
  const m = await fetchReviewMetrics(businessId, "2000-01-01", null);
  if (m.status !== "ok") return null;
  const total = m.value.reviews;
  const avg = m.value.average;
  if (!avg || total < 3) return null;
  return `${avg.toFixed(1)} · ${total} reviews`;
}
