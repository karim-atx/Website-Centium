import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { NO_ICON_SCALE } from "../../../components/pro/proInk";
import { marketPalette } from "../../../theme/marketTokens";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { OfferCard } from "../../../components/market/OfferCard";
import { MarketEmptyCard, MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { FeaturedChip } from "../../../components/marketplace/FeaturedChip";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import {
  REWARD_CATEGORIES,
  REWARD_SORTS,
  arrangeOffers,
  fetchRewardCatalog,
  forAge,
  ownerInitials,
  type CatalogOffer,
  type RewardCategory,
  type RewardSort,
} from "../../../services/offers";
import type { MarketResult } from "../../../services/market/rpc";
import { forumAccess } from "../../../services/forum/rules";
import { fetchMarketplaceVenues, type MarketplaceVenue } from "../../../services/marketplace";
import { useImpression } from "../../../services/marketplace/listingEvents";
import { exploreSource, type ListingEvent } from "../../../services/marketplace/listingLogic";
import { typeLabel } from "../venueTypes";
import { businessesForCategory } from "./rewardsModel";
import { CapsLabel, OwnerTile, RowChevron } from "./rewardsParts";

// Market + Share 3.0 · W2 · C-MO.4.4 Rewards (`rewards`, `rewardsPros`): what
// sits under Explore's Gyms · Classes · Rewards track when Rewards is on (the
// header, the balance and the track are Discover's). Literal values, Client
// Explore Screens lines 372–394 and the script's `cats` / `offers`:
// - the category chips: a track (margin-top 10) --subtrack, radius 12,
//   padding 4, gap 4, scrolling sideways; each chip 32 tall, padding 0 12,
//   radius 9, 12; on --subactive / --onfill 700, off transparent / --subink
//   600 (REWARD_CATEGORIES);
// - the controls row (margin-top 10, space-between): "Sort: Featured" (32
//   tall, padding 0 8 0 12, radius 10, 0.5px --border, 12 / 700 --ink2, the
//   13 chevron stroke 2.2, gap 3) opening the sort menu (REWARD_SORTS), and
//   "Affordable now" 12.5 / 700 --ink2 with the 42 × 26 switch (radius 999,
//   off --swoff, on --segactive; the 22 white knob at 2 with
//   0 1px 3px rgba(0,0,0,0.18));
// - the offers (margin-top 12, gap 10): the W1 client OfferCard, opening the
//   offer (/app/marketplace/rewards/{offerId}).
// The offers are offer_catalogue() (fetchRewardCatalog: live by the server's
// offer_is_live(), cheapest first, Database PR #40); supplement offers are
// left out for an under-18 or a member without a date of birth (forAge, lead
// Q3: the reader has no age rule).
//
// D-21 (not drawn): under the offers, a "Businesses" section keeps the old
// Businesses tab's rows (marketplace_venues kind "business") filtered by the
// chip, so a business without offers stays findable: the row opens its
// showcase (/app/marketplace/business?id=…&src=…) with the Featured chip and
// the impression analytics as Discover had them. In the board's row style
// (the `list` plain row, line 584): radius 18, --card, 0.5px --hair, padding
// 12 14, gap 12; the 44 tile radius 12 --pale with the initials 13 / 800
// --accent; the name 14 / 700, the type 12 / 600 --accent, the place 11.5
// --faint; the chevron. Professionals has no business rows: it offers "Find a
// professional" (/app/professionals) instead.

type Load<T> = { state: "loading" } | { state: "done"; result: MarketResult<T> };

export default function RewardsTab() {
  const { pointsSummary, refreshAchievements, user } = useApp();
  const adult = forumAccess(user.dateOfBirth) === "adult";
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const balance = pointsSummary?.balance ?? 0;
  // The balance drives "You can redeem" / "N to go" and Affordable now; read it if nothing has yet.
  const summaryKnown = !!pointsSummary;
  useEffect(() => {
    if (!summaryKnown) refreshAchievements();
  }, [summaryKnown, refreshAchievements]);

  const [category, setCategory] = useState<RewardCategory>("all");
  const [sort, setSort] = useState<RewardSort>("featured");
  const [affordable, setAffordable] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortEl, setSortEl] = useState<HTMLButtonElement | null>(null);

  const [catalog, setCatalog] = useState<Load<CatalogOffer[]>>({ state: "loading" });
  const [venues, setVenues] = useState<{ state: "loading" } | { state: "done"; ok: boolean; list: MarketplaceVenue[] }>({ state: "loading" });

  const loadCatalog = useCallback((c: RewardCategory) => {
    let live = true;
    setCatalog({ state: "loading" });
    void fetchRewardCatalog(c).then((result) => {
      if (live) setCatalog({ state: "done", result });
    });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => loadCatalog(category), [category, loadCatalog]);

  const loadVenues = useCallback(() => {
    let live = true;
    setVenues({ state: "loading" });
    void fetchMarketplaceVenues().then((r) => {
      if (live) setVenues(r.ok ? { state: "done", ok: true, list: r.venues.filter((v) => v.kind === "business") } : { state: "done", ok: false, list: [] });
    });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => loadVenues(), [loadVenues]);

  // The selected chip stays in view when the track scrolls.
  const chipRefs = useRef<Partial<Record<RewardCategory, HTMLButtonElement | null>>>({});
  const pick = (c: RewardCategory) => {
    setCategory(c);
    chipRefs.current[c]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
  };

  const sortLabel = REWARD_SORTS.find((s) => s.key === sort)?.label ?? "Featured";
  const shownBusinesses = venues.state === "done" ? businessesForCategory(venues.list, category) : [];

  return (
    <div style={{ lineHeight: "normal", color: m.ink }}>
      <style>{FOCUS_CSS + ".rewards-chips{scrollbar-width:none}.rewards-chips::-webkit-scrollbar{display:none}"}</style>

      {/* Category chips */}
      <div
        role="group"
        aria-label="Reward categories"
        className="rewards-chips"
        style={{ marginTop: 10, display: "flex", gap: 4, padding: 4, borderRadius: 12, background: m.subtrack, overflowX: "auto" }}
      >
        {REWARD_CATEGORIES.map((c) => {
          const on = c.key === category;
          return (
            <button
              key={c.key}
              ref={(el) => {
                chipRefs.current[c.key] = el;
              }}
              type="button"
              aria-pressed={on}
              onClick={() => pick(c.key)}
              className="hit market-focus"
              style={{
                flex: "none",
                height: 32,
                padding: "0 12px",
                borderRadius: 9,
                border: 0,
                display: "flex",
                alignItems: "center",
                font: "inherit",
                fontSize: textPx(12),
                fontWeight: on ? 700 : 600,
                background: on ? m.subactive : "transparent",
                color: on ? m.onfill : m.subink,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Sort · Affordable now */}
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button
          ref={setSortEl}
          type="button"
          aria-haspopup="menu"
          aria-expanded={sortOpen}
          onClick={() => setSortOpen((o) => !o)}
          className="hit market-focus"
          style={{
            height: 32,
            padding: "0 8px 0 12px",
            borderRadius: 10,
            border: `0.5px solid ${m.border}`,
            background: "transparent",
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            font: "inherit",
            fontSize: textPx(12),
            fontWeight: 700,
            color: m.ink2,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Sort: {sortLabel}
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <PopupMenu
          open={sortOpen}
          onClose={() => setSortOpen(false)}
          anchor={sortEl}
          align="left"
          options={REWARD_SORTS.map((s) => ({ value: s.key, label: s.label }))}
          selected={sort}
          onSelect={(v) => {
            setSort(v);
            setSortOpen(false);
          }}
        />
        <button
          type="button"
          role="switch"
          aria-checked={affordable}
          onClick={() => setAffordable((a) => !a)}
          className="hit market-focus"
          style={{ display: "flex", alignItems: "center", gap: 8, font: "inherit", fontSize: textPx(12.5), fontWeight: 700, color: m.ink2, background: "none", border: 0, padding: 0, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Affordable now
          <span aria-hidden style={{ width: 42, height: 26, borderRadius: 999, background: affordable ? m.segactive : m.swoff, position: "relative", flexShrink: 0, transition: reduce ? undefined : "background 140ms ease" }}>
            <span
              style={{
                position: "absolute",
                left: affordable ? 18 : 2,
                top: 2,
                width: 22,
                height: 22,
                borderRadius: 999,
                background: "#FFFFFF",
                boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
                transition: reduce ? undefined : "left 140ms ease",
              }}
            />
          </span>
        </button>
      </div>

      {/* Offers */}
      <div style={{ marginTop: 12 }}>
        <OffersList state={catalog} adult={adult} sort={sort} affordable={affordable} balance={balance} onRetry={() => loadCatalog(category)} onOpen={(o) => navigate(`/app/marketplace/rewards/${encodeURIComponent(o.offerId)}`)} />
      </div>

      {/* D-21: business sections */}
      {category === "professionals" ? (
        <section aria-labelledby="rewards-pros-heading" style={{ marginTop: 18 }}>
          <CapsLabel id="rewards-pros-heading">Professionals</CapsLabel>
          <button type="button" onClick={() => navigate("/app/professionals")} className="market-focus" style={rowStyle(m, 8)}>
            <span aria-hidden style={{ width: 44, height: 44, borderRadius: 12, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", color: m.accent, flexShrink: 0 }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={NO_ICON_SCALE}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: textPx(14), fontWeight: 700 }}>Find a professional</span>
              <span style={{ display: "block", fontSize: textPx(12), fontWeight: 600, color: m.accent }}>Trainers, dietitians and more</span>
            </span>
            <RowChevron />
          </button>
        </section>
      ) : (
        <section aria-labelledby="rewards-biz-heading" style={{ marginTop: 18 }}>
          <CapsLabel id="rewards-biz-heading">Businesses</CapsLabel>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
            {venues.state === "loading" ? (
              <MarketSkeleton radius={18} count={2} rows={2} label="Loading businesses" />
            ) : !venues.ok ? (
              <MarketError thing="businesses" onRetry={loadVenues} />
            ) : shownBusinesses.length === 0 ? (
              <MarketEmptyCard
                title={venues.list.length === 0 ? "No businesses yet" : "No businesses here yet"}
                body={venues.list.length === 0 ? "Shops and studios near you will show here." : "Try another category, or All."}
              />
            ) : (
              shownBusinesses.map((v) => <BusinessRow key={v.venueId} venue={v} onOpen={() => navigate(`/app/marketplace/business?id=${encodeURIComponent(v.venueId)}&src=${exploreSource({ featured: v.isFeatured })}`)} />)
            )}
          </div>
        </section>
      )}
    </div>
  );
}

const rowStyle = (m: ReturnType<typeof marketPalette>, marginTop = 0): React.CSSProperties => ({
  marginTop,
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 18,
  background: m.card,
  border: `0.5px solid ${m.hair}`,
  padding: "12px 14px",
  display: "flex",
  alignItems: "center",
  gap: 12,
  font: "inherit",
  lineHeight: "normal",
  textAlign: "left",
  color: m.ink,
  cursor: "pointer",
});

/** The offers list and its states. */
const OffersList: React.FC<{
  state: Load<CatalogOffer[]>;
  adult: boolean;
  sort: RewardSort;
  affordable: boolean;
  balance: number;
  onRetry: () => void;
  onOpen: (o: CatalogOffer) => void;
}> = ({ state, adult, sort, affordable, balance, onRetry, onOpen }) => {
  if (state.state === "loading") return <MarketSkeleton radius={18} count={3} rows={2} label="Loading rewards" />;
  const r = state.result;
  if (!r.ok) {
    if (r.offline) return <MarketOffline loaded={false} onRetry={onRetry} force />;
    return <MarketError thing="rewards" onRetry={onRetry} />;
  }
  const list = forAge(r.value, adult);
  if (list.length === 0) return <MarketEmptyCard title="No rewards here yet" body="New offers show here as businesses add them. Try another category." />;
  const shown = arrangeOffers(list, sort, affordable, balance);
  if (shown.length === 0) return <MarketEmptyCard title="Nothing you can redeem yet" body="Turn off Affordable now to see every reward and how many points each needs." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {shown.map((o) => (
        <OfferCard
          key={o.offerId}
          variant="client"
          headline={o.headline}
          cost={o.pointsCost}
          owner={o.ownerSubtitle}
          ownerInitials={ownerInitials(o.ownerName)}
          ownerLogoUrl={o.ownerLogoUrl}
          balance={balance}
          onPress={() => onOpen(o)}
        />
      ))}
    </div>
  );
};

/** A business row (D-21), with its impression (B13 MK-07) once half on screen. */
const BusinessRow: React.FC<{ venue: MarketplaceVenue; onOpen: () => void }> = ({ venue: v, onOpen }) => {
  const m = marketPalette(useIsDark());
  const event: ListingEvent = { businessId: v.venueId, kind: "impression", source: exploreSource({ featured: v.isFeatured }) };
  const ref = useImpression<HTMLDivElement>(event);
  return (
    <div ref={ref} data-impression="">
      <button type="button" onClick={onOpen} className="market-focus" style={rowStyle(m)}>
        <OwnerTile name={v.name} size={44} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ minWidth: 0, fontSize: textPx(14), fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</span>
            {v.isFeatured ? <FeaturedChip /> : null}
          </span>
          <span style={{ display: "block", fontSize: textPx(12), fontWeight: 600, color: m.accent }}>{typeLabel(v.venueType)}</span>
          {v.location ? <span style={{ display: "block", fontSize: textPx(11.5), color: m.faint, marginTop: 1 }}>{v.location}</span> : null}
        </span>
        <RowChevron />
      </button>
    </div>
  );
};
