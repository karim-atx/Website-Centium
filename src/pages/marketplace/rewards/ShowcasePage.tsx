import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Globe, MapPin, ShoppingBag, Store } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useBack } from "../../../hooks/useBack";
import { useBusinessStatus } from "../../../hooks/useBusinessStatus";
import { useKnownPosition } from "../../../hooks/useKnownPosition";
import { textPx, linePx } from "../../../theme/textSize";
import { NO_ICON_SCALE } from "../../../components/pro/proInk";
import { SEGMENT_STEPS, marketPalette } from "../../../theme/marketTokens";
import { SegmentedTicketStrip } from "../../../components/market/SegmentedTicketStrip";
import { PointsFigure } from "../../../components/market/PointsFigure";
import { MarketEmptyCard, MarketError, MarketSkeleton } from "../../../components/market/MarketStates";
import { hexAlpha } from "../../../components/market/marketColor";
import { offerProgress } from "../../../components/market/pointsModel";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { GymReviews } from "../../../components/marketplace/GymReviews";
import { closedLine } from "../../../services/business-closure/logic";
import { fetchMarketplaceVenues, type MarketplaceVenue } from "../../../services/marketplace";
import { recordListingEvent } from "../../../services/marketplace/listingEvents";
import { parseListingSource } from "../../../services/marketplace/listingLogic";
import { businessHasVenue } from "../../../services/venues";
import type { Product } from "../../../services/store/products";
import { fetchShowcaseOffers, forAge, type CatalogOffer } from "../../../services/offers";
import { forumAccess } from "../../../services/forum/rules";
import type { MarketResult } from "../../../services/market/rpc";
import { formatPrice } from "../../../utils/price";
import { marketplaceCategories } from "../../../data/mockProfessionals";
import { marketplaceCategoryIcon } from "../../../utils/icons";
import type { MarketplaceCategoryId } from "../../../types";
import { TYPE_CATEGORY } from "../venueTypes";
import { distanceLine, productsNote, showcaseSegments, showcaseTypeLabel, type ShowcaseSegKey } from "./rewardsModel";
import { fetchPublicShelf, fetchShowcaseExtras, type ShowcaseExtras } from "./showcaseData";
import { BackRow, CapsLabel, OwnerTile, QuietLine, RowChevron } from "./rewardsParts";

// Market + Share 3.0 · W2 · C-MO.4.4.1 Business showcase (`showcase`,
// `showcaseLocation`, `showcaseOnline`), at /app/marketplace/business?id=…
// (it replaces the old BusinessPage). Literal values, Client Explore Screens
// lines 398–448 and the script's SEGS / shopSegs / shopPanel:
// - back + the "REWARDS" eyebrow; (margin-top 8, gap 14) the 60 owner tile
//   radius 18 (the logo, else the initials 18 / 800 --accent on --pale), the
//   name 22 / 28 800 and the type 12.5 / 600 --accent ("Clothing Store");
// - the bio (margin-top 14) 13 / 19.5 --ink2;
// - (margin-top 14) the W1 SegmentedTicketStrip "tile" drawing, Shop ·
//   Location · Online on steps 1, 2, 4 (#EEEAF8/#7D67D9, #ECEFF5/#667BB1,
//   #E6F1EF/#4F8F8A), tapping a segment selects it (the board's `tap`);
// - the panel (margin-top 10, radius 14, padding 12 14, the segment's tint):
//   the value 14 / 700, the line 12 / 17 --ink2 (margin-top 2);
// - "Offers for your points" (margin-top 18; list margin-top 8, gap 8): rows
//   radius 16, 0.5px --hair, padding 12 14, gap 12: the headline 14 / 700,
//   "You can redeem" 11 / 700 --tealink (margin-top 3) or "N to go"; the cost
//   15 / 700 + the 11 leaf. The rows open the offer. The offers are the
//   business's public_offers('business', id) (fetchShowcaseOffers; live by
//   the server's rule, nothing for a hidden or paused business); with none
//   the section stays out;
// - "Products" + "Display prices. Buy in store or online." (11 --faint,
//   baseline row, margin-top 18), then (margin-top 8) a 2-column grid, gap 10:
//   a square photo radius 16 --soft, the name 13 / 700 (margin-top 6), the
//   price 12 --ink2. The business's public shelf, public_showcase('business',
//   id) (Database 73ea87b: visible items without a takedown, in the owner's
//   order; empty for a paused or closed business); no photo is a designed
//   empty tile (a bag glyph in --tert), never "PRODUCT PHOTO".
// Segments with no data are left out (no website → no Online; no location →
// no Location), see rewardsModel.showcaseSegments.
//
// Kept from BusinessPage (PLAN §3.1), restyled here: the closed / unlisted
// lines, the upcoming class count, the perk, the bio, the in-app shop link
// (/app/store/:id: products, pickup, delivery), the listings (now the
// Products grid), Reviews for a venue-less business (GymReviews businessId),
// "Browse by category", and the profile_open analytics (recordListingEvent
// with parseListingSource(source), once per session).

type Offers = { state: "loading" } | { state: "done"; result: MarketResult<CatalogOffer[]> };
type Products = { state: "loading" } | { state: "done"; ok: boolean; list: Product[] };

export function ShowcasePage({ businessId, source }: { businessId: string; source: string | null }) {
  const { pointsSummary, refreshAchievements, user } = useApp();
  const adult = forumAccess(user.dateOfBirth) === "adult";
  const dark = useIsDark();
  const m = marketPalette(dark);
  const back = useBack("/app/marketplace?tab=rewards");
  const navigate = useNavigate();
  const here = useKnownPosition();
  const bizStatus = useBusinessStatus(businessId);
  const balance = pointsSummary?.balance ?? 0;
  const summaryKnown = !!pointsSummary;
  useEffect(() => {
    if (!summaryKnown) refreshAchievements();
  }, [summaryKnown, refreshAchievements]);

  const [venue, setVenue] = useState<MarketplaceVenue | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  const [extras, setExtras] = useState<ShowcaseExtras | null>(null);
  const [products, setProducts] = useState<Products>({ state: "loading" });
  const [offers, setOffers] = useState<Offers>({ state: "loading" });
  const [venueLess, setVenueLess] = useState(false);
  const [seg, setSeg] = useState<ShowcaseSegKey>("shop");

  const load = useCallback(() => {
    let live = true;
    setVenue(undefined);
    setLoadFailed(false);
    void (async () => {
      const v = await fetchMarketplaceVenues();
      if (!live) return;
      if (!v.ok) {
        setLoadFailed(true);
        setVenue(null);
        return;
      }
      const found = v.venues.find((x) => x.kind === "business" && x.venueId === businessId) ?? null;
      setVenue(found);
      // B13 MK-07: the profile opened, with where it was opened from (&src=…;
      // a link from anywhere else is 'direct'). Once per session.
      if (found) recordListingEvent({ businessId: found.venueId, kind: "profile_open", source: parseListingSource(source) });
    })();
    return () => {
      live = false;
    };
  }, [businessId, source]);
  useEffect(() => load(), [load]);

  const loadProducts = useCallback(() => {
    let live = true;
    setProducts({ state: "loading" });
    void fetchPublicShelf("business", businessId).then((r) => {
      if (!live) return;
      // public_showcase: visible items without a takedown, in the owner's order.
      setProducts(r.ok ? { state: "done", ok: true, list: r.value } : { state: "done", ok: false, list: [] });
    });
    return () => {
      live = false;
    };
  }, [businessId]);

  const loadOffers = useCallback(() => {
    let live = true;
    setOffers({ state: "loading" });
    void fetchShowcaseOffers("business", businessId).then((result) => {
      if (live) setOffers({ state: "done", result: result.ok ? { ok: true, value: forAge(result.value, adult) } : result });
    });
    return () => {
      live = false;
    };
  }, [businessId, adult]);

  useEffect(() => {
    if (!venue) return;
    let live = true;
    void fetchShowcaseExtras(businessId).then((x) => live && setExtras(x));
    void businessHasVenue(businessId).then((has) => live && setVenueLess(has === false));
    const stopProducts = loadProducts();
    const stopOffers = loadOffers();
    return () => {
      live = false;
      stopProducts();
      stopOffers();
    };
  }, [venue, businessId, loadProducts, loadOffers]);

  const closed = closedLine(bizStatus, "bookings");

  if (venue === undefined) {
    return (
      <div style={{ paddingBottom: 32 }}>
        <BackRow onBack={back} eyebrow="Rewards" />
        <MarketSkeleton radius={18} count={3} rows={3} label="Loading this business" style={{ marginTop: 8 }} />
      </div>
    );
  }

  if (venue === null) {
    return (
      <div style={{ paddingBottom: 32 }}>
        <BackRow onBack={back} eyebrow="Rewards" />
        <div style={{ marginTop: 8 }}>
          {loadFailed ? (
            <MarketError thing="this business" onRetry={load} />
          ) : (
            <MarketEmptyCard title="This business isn't on Explore right now" body={closed ?? "It may have paused its listing. Anything you've booked or redeemed stays in your account."} />
          )}
        </div>
      </div>
    );
  }

  const segments = showcaseSegments({ website: extras?.website ?? null, location: venue.location, distance: distanceLine(here, extras?.places ?? []) });
  const current = segments.find((s) => s.key === seg) ?? segments[0];
  const [tint, stepInk] = SEGMENT_STEPS[current.step - 1];
  const storeCategory = TYPE_CATEGORY[venue.venueType];

  // The category pages this business leads to: its own type's, then every
  // category it has a product in.
  const productList = products.state === "done" ? products.list : [];
  const categoryIds = [...new Set([...(storeCategory ? [storeCategory] : []), ...productList.map((p) => p.marketCategory)])].filter((c) => c !== "gyms" && c !== "classes");
  const categoryLabel = (c: string) => marketplaceCategories.find((x) => x.id === c)?.label ?? c;

  return (
    <div style={{ paddingBottom: 32, lineHeight: "normal", color: m.ink }}>
      <style>{FOCUS_CSS}</style>
      <BackRow onBack={back} eyebrow="Rewards" />

      {/* Identity */}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 14 }}>
        <OwnerTile name={venue.name} logoUrl={extras?.logoUrl} size={60} />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: textPx(22), lineHeight: linePx(28), fontWeight: 800 }}>{venue.name}</h1>
          <div style={{ fontSize: textPx(12.5), fontWeight: 600, color: m.accent }}>{showcaseTypeLabel(venue.venueType)}</div>
        </div>
      </div>

      {venue.bio ? <p style={{ margin: "14px 0 0", fontSize: textPx(13), lineHeight: linePx(19.5), color: m.ink2, whiteSpace: "pre-line" }}>{venue.bio}</p> : null}

      {/* Kept (B26): the upcoming class count and the perk. */}
      {venue.perk || venue.upcomingClassCount > 0 || venue.canHostClasses ? (
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          {venue.perk ? (
            <span style={{ fontSize: textPx(11), fontWeight: 700, borderRadius: 999, padding: "2px 8px", background: m.pale, color: m.pdark }}>{venue.perk}</span>
          ) : null}
          {venue.upcomingClassCount > 0 || venue.canHostClasses ? (
            <span style={{ fontSize: textPx(12), color: m.ink2 }}>
              {venue.upcomingClassCount > 0 ? `${venue.upcomingClassCount} upcoming ${venue.upcomingClassCount === 1 ? "class" : "classes"}` : "No upcoming classes"}
            </span>
          ) : null}
        </div>
      ) : null}

      {closed ? (
        <p role="status" style={{ margin: "10px 0 0", fontSize: textPx(12), lineHeight: linePx(17), fontWeight: 600, color: m.caution }}>
          {closed}
        </p>
      ) : null}

      {/* Shop · Location · Online */}
      <SegmentedTicketStrip
        variant="tile"
        label="Where to use your vouchers"
        items={segments.map((s) => ({ key: s.key, label: s.label, step: s.step, icon: s.key === "shop" ? Store : s.key === "loc" ? MapPin : Globe }))}
        active={current.key}
        onChange={setSeg}
        style={{ marginTop: 14 }}
      />
      <div role="status" aria-live="polite" style={{ marginTop: 10, borderRadius: 14, padding: "12px 14px", background: dark ? hexAlpha(stepInk, 0.16) : tint }}>
        {current.href ? (
          <a href={current.href} target="_blank" rel="noopener noreferrer" className="market-focus" style={{ display: "inline-block", fontSize: textPx(14), fontWeight: 700, color: m.ink, textDecoration: "none" }}>
            {current.value}
          </a>
        ) : (
          <div style={{ fontSize: textPx(14), fontWeight: 700 }}>{current.value}</div>
        )}
        {current.line ? <div style={{ fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2, marginTop: 2 }}>{current.line}</div> : null}
      </div>

      {/* Kept (V6-49): a store's in-app shop, cart and checkout. */}
      {storeCategory ? (
        <Link to={`/app/store/${venue.venueId}`} className="market-focus" style={{ ...rowBox(m), marginTop: 10, textDecoration: "none" }}>
          <span aria-hidden style={{ width: 36, height: 36, borderRadius: 11, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: m.pdark }}>
            <ShoppingBag size={17} strokeWidth={1.9} style={NO_ICON_SCALE} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: textPx(14), fontWeight: 700, color: m.ink }}>Shop in the app</span>
            <span style={{ display: "block", fontSize: textPx(12), color: m.ink2 }}>{venue.venueType === "wellness_service" ? "Products and appointments" : "Products, pickup and delivery"}</span>
          </span>
          <RowChevron />
        </Link>
      ) : null}

      {/* Offers for your points (public_offers) */}
      <ShowcaseOffers state={offers} balance={balance} onRetry={loadOffers} onOpen={(o) => navigate(`/app/marketplace/rewards/${encodeURIComponent(o.offerId)}`)} />

      {/* Products */}
      <section aria-labelledby="showcase-products" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <CapsLabel id="showcase-products">Products</CapsLabel>
          <span style={{ fontSize: textPx(11), color: m.faint, textAlign: "right" }}>{productsNote(extras?.website ?? null)}</span>
        </div>
        <div style={{ marginTop: 8 }}>
          {products.state === "loading" ? (
            <div aria-busy="true" aria-label="Loading products" role="status" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[0, 1].map((k) => (
                <div key={k} aria-hidden className="animate-skeleton-pulse" style={{ aspectRatio: "1 / 1", borderRadius: 16, background: m.soft }} />
              ))}
            </div>
          ) : !products.ok ? (
            <MarketError thing="products" onRetry={loadProducts} />
          ) : products.list.length === 0 ? (
            <QuietLine>No products yet.</QuietLine>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {products.list.map((p) => (
                <ProductTile key={p.id} product={p} to={storeCategory ? `/app/store/${venue.venueId}/p/${p.id}` : null} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Kept (B14 RP-01): a venue-less business's reviews. */}
      {venueLess ? (
        <section aria-label="Reviews" style={{ marginTop: 18 }}>
          <CapsLabel>Reviews</CapsLabel>
          <div style={{ marginTop: 8 }}>
            <GymReviews businessId={venue.venueId} gymName={venue.name} summary={null} onChanged={() => undefined} pinned={false} />
          </div>
        </section>
      ) : null}

      {/* Kept (decision 23, item 46): the category pages it leads to. */}
      {categoryIds.length > 0 ? (
        <section aria-labelledby="showcase-browse" style={{ marginTop: 18 }}>
          <CapsLabel id="showcase-browse">Browse by category</CapsLabel>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {categoryIds.map((c) => {
              const Icon = marketplaceCategoryIcon[c as MarketplaceCategoryId] ?? marketplaceCategoryIcon.stores;
              return (
                <Link key={c} to={`/app/marketplace/${c}`} className="market-focus" style={{ ...rowBox(m), textDecoration: "none" }}>
                  <span aria-hidden style={{ width: 36, height: 36, borderRadius: 11, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: m.pdark }}>
                    <Icon size={17} strokeWidth={1.9} style={NO_ICON_SCALE} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: textPx(14), fontWeight: 700, color: m.ink }}>{categoryLabel(c)}</span>
                  <RowChevron />
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

const rowBox = (m: ReturnType<typeof marketPalette>): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  borderRadius: 16,
  border: `0.5px solid ${m.hair}`,
  background: m.card,
  padding: "12px 14px",
  lineHeight: "normal",
});

/** "Offers for your points": the business's live offers (none: the section stays out). */
const ShowcaseOffers: React.FC<{ state: Offers; balance: number; onRetry: () => void; onOpen: (o: CatalogOffer) => void }> = ({ state, balance, onRetry, onOpen }) => {
  const m = marketPalette(useIsDark());
  if (state.state === "done" && state.result.ok && state.result.value.length === 0) return null;
  return (
    <section aria-labelledby="showcase-offers" style={{ marginTop: 18 }}>
      <CapsLabel id="showcase-offers">Offers for your points</CapsLabel>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
        {state.state === "loading" ? (
          <MarketSkeleton radius={18} count={1} rows={2} label="Loading offers" />
        ) : !state.result.ok ? (
          <MarketError thing="offers" onRetry={onRetry} />
        ) : (
          state.result.value.map((o) => {
            const prog = offerProgress(balance, o.pointsCost);
            return (
              <button
                key={o.offerId}
                type="button"
                onClick={() => onOpen(o)}
                className="market-focus"
                style={{ width: "100%", boxSizing: "border-box", borderRadius: 16, border: `0.5px solid ${m.hair}`, background: "transparent", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, font: "inherit", lineHeight: "normal", textAlign: "left", color: m.ink, cursor: "pointer" }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: textPx(14), fontWeight: 700 }}>{o.headline}</span>
                  <span style={{ display: "block", marginTop: 3, fontSize: textPx(11), fontWeight: prog.can ? 700 : 500, color: prog.can ? m.tealink : m.faint }}>{prog.note}</span>
                </span>
                <PointsFigure value={o.pointsCost} mark="leaf" size={15} />
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};

/** A product: the square photo (or the designed empty tile), the name and the display price. */
const ProductTile: React.FC<{ product: Product; to: string | null }> = ({ product: p, to }) => {
  const m = marketPalette(useIsDark());
  const [failed, setFailed] = useState(false);
  const price = formatPrice(p.price);
  const body = (
    <>
      <span style={{ display: "flex", aspectRatio: "1 / 1", borderRadius: 16, background: m.soft, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        {p.imageUrl && !failed ? (
          <img src={p.imageUrl} alt="" onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <ShoppingBag size={24} strokeWidth={1.75} color={m.tert} aria-hidden style={NO_ICON_SCALE} />
        )}
      </span>
      <span style={{ display: "block", fontSize: textPx(13), fontWeight: 700, marginTop: 6, color: m.ink }}>{p.name}</span>
      {price ? <span style={{ display: "block", fontSize: textPx(12), color: m.ink2 }}>{price}</span> : null}
    </>
  );
  return to ? (
    <Link to={to} className="market-focus" style={{ display: "block", textDecoration: "none", lineHeight: "normal", minWidth: 0 }}>
      {body}
    </Link>
  ) : (
    <div style={{ lineHeight: "normal", minWidth: 0 }}>{body}</div>
  );
};
