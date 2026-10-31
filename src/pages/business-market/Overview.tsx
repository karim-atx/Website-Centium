import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { RedeemVoucherTile } from "../../components/market/RedeemVoucherTile";
import { ListingToggleTile } from "../../components/market/ListingToggleTile";
import { HeroStatCard } from "../../components/market/HeroStatCard";
import { StatLedger } from "../../components/market/StatLedger";
import { MarketError, MarketOffline, MarketSkeleton } from "../../components/market/MarketStates";
import { FOCUS_CSS } from "../../components/market/usePress";
import { VenueHoursSheet } from "../../components/marketplace/VenueHoursSheet";
import { CATEGORY_LABEL } from "../../components/business-more/kind";
import { useOnline } from "../../hooks/useOnline";
import { fetchReviewMetrics } from "../../services/reputation";
import { saveCategories } from "../../services/business-market";
import { AMENITY_LABEL, isAmenityKey, photoCounts, photoLine as galleryLine, sortPhotos } from "../../services/business-market/listingLogic";
import { fetchMarketplaceOverview } from "../../services/business-market/overview";
import { classesLine, heroView, ledgerRows, membershipsLine, type GymFigures, type OverviewState } from "../../services/business-market/overviewModel";
import { fetchVenueDashboard } from "../../services/venues/console";
import { fetchOwnPhotoImages, type OwnPhotoImage } from "../../services/business-market/listing";
import { useOwnImage } from "../../components/moderation/ImageApproval";
import type { VenueDashboard } from "../../services/venues/consoleLogic";
import { useMarket } from "./MarketContext";
import { CapsLabel, CategoriesCard, OutlineButton, PhotosCard, RatingCard, StrengthCard, YourCard, px, lh, useMarketColors, useStrip, type CardModel } from "./listingParts";
import { hoursSummary, notEnded, strengthItems, strengthPct, type StrengthInput, type StrengthItem } from "./model";
import { useListingSwitch } from "./useListingSwitch";
import { AmenitiesSheet, FirstVisitSheet } from "./DetailsSheets";
import { fetchMayHire, fetchMyOpenings, fetchMyTeam } from "../../services/hiring";
import { TagChip } from "./hiring/hiringParts";
import { HIRING_ROW_PENDING, hiringRowLine } from "./hiring/teamModel";

// Market + Share 3.0 · W3 · B-MA.1 Listing Overview (HANDOVER §4 "B-MA.1
// Listing Overview"; Business Marketplace Screens lines 51–98 and the `biz`,
// `spark`, `rv`, `lt` script; frame-check B-MA.1: overviewGym, overviewStore,
// overviewPressed, overviewPaused). Top to bottom, padding 0 16 32 (the app
// column gives the 16), column gap 12:
// 1. the top row, grid minmax(0,4fr) minmax(0,1fr) gap 12: RedeemVoucherTile
//    (→ /app/business/redeem; pressed state `rv` in the component) and the
//    ListingToggleTile over business_profiles.active (useListingSwitch: the
//    owner alone switches it, a closed business can't be listed, and hiding
//    asks first, all KEPT);
// 2. HeroStatCard "Clients reached" (Karim; the board drew "Members reached") over the measured
//    clients_reached of business_marketplace_overview (Database PR #40:
//    profile_open + offer_view this month in the business's own days, its
//    change against last month, the 30-day sparkline; heroView), never the
//    self-reported business_profiles.members_reached. Staff without
//    `marketing` aren't asked: "–" and the flat line;
// 3. StatLedger: Active offers · Redemptions this month · Points redeemed
//    (DB5 business_marketplace_overview, the `marketing` permission: staff
//    without it aren't asked and see "–") and, for a gym, Active memberships ·
//    Class bookings this week (live venue_dashboard, no change: "–");
// 4. gym only: caps "Gym" and the card with Memberships (→ /app/business/gym)
//    and Classes (→ /app/business/classes), live counts, and (W4, B-MA.1
//    "Gym · Hiring row") Hiring (→ /app/business/hiring): "{n} openings · {n}
//    new applicants · Team of {n}" from my_openings('open') and my_team (DB8),
//    with the NEW chip while there are new applicants. Studios have no Gym
//    card (W3); since W5 (lead decision) they get the same Hiring row alone
//    in that card's chrome under a caps "Studio", only while
//    business_may_hire says so (gyms and studios since Database #38).
// Below the drawn blocks, under a caps "Listing" section, every live Listing
// tab feature, restyled as handover cards (PLAN §3.4): Listing strength and
// its sheets (hours, amenities, first visit, categories, policies), "Your
// card" + Preview, Photos + PhotosPage, the categories multi-select, the
// rating card (→ Reputation). The Offerings card is the Showcase tab now.

export const REVIEWS_ROUTE = "/app/business/analytics/reputation";

export function Overview() {
  const m = useMarket();
  const c = useMarketColors();
  const { kind, business } = m;
  const navigate = useNavigate();
  const online = useOnline();
  const sw = useListingSwitch();
  const businessId = business?.id ?? null;

  // business_marketplace_overview (the `marketing` permission): the hero and the ledger.
  const marketing = m.can("marketing");
  const [ov, setOv] = useState<OverviewState>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const retry = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    if (!marketing) {
      setOv({ status: "none" });
      return () => {
        alive = false;
      };
    }
    setOv({ status: "loading" });
    void fetchMarketplaceOverview(businessId).then((r) => {
      if (!alive) return;
      setOv(r.ok ? { status: "ok", value: r.value } : { status: "error" });
    });
    return () => {
      alive = false;
    };
  }, [businessId, marketing, tick]);

  // Gym figures (live venue_dashboard of the selected venue).
  const gymId = kind === "gym" ? (m.venue?.gymId ?? null) : null;
  const [dash, setDash] = useState<{ gymId: string; value: VenueDashboard | null } | null>(null);
  useEffect(() => {
    if (!gymId) return;
    let alive = true;
    void fetchVenueDashboard(gymId).then((r) => alive && setDash({ gymId, value: r.ok ? r.value : null }));
    return () => {
      alive = false;
    };
  }, [gymId, tick]);
  const d = dash && dash.gymId === gymId ? dash.value : null;
  const plansCount = m.plans.loading ? null : m.plans.plans.filter((p) => p.dbStatus !== "archived").length;
  const gym: GymFigures | null =
    kind === "gym"
      ? { activeMemberships: d ? d.activeMembers : null, classBookingsThisWeek: d ? d.bookingsThisWeek : null, sessionsThisWeek: d ? d.classesThisWeek : null, plans: plansCount }
      : null;

  if (m.error && !business) return <MarketError thing="your marketplace" onRetry={m.reload} />;
  if (m.loading) {
    return (
      <div aria-busy="true" aria-label="Loading your marketplace" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,4fr) minmax(0,1fr)", gap: 12 }}>
          <MarketSkeleton radius={20} rows={2} height={96} label="Loading" />
          <MarketSkeleton radius={20} rows={1} height={96} label="Loading" />
        </div>
        <MarketSkeleton radius={24} rows={3} height={165} label="Loading" />
        <MarketSkeleton radius={20} rows={3} height={148} label="Loading" />
      </div>
    );
  }
  if (!business) {
    // The read answered with no business_profiles row: listings are published
    // under it, so the owner saves the profile first (kept from the Listing tab).
    return (
      <div style={{ borderRadius: 20, background: c.card, border: `1px solid ${c.border}`, padding: 16, color: c.ink, lineHeight: "normal" }}>
        <div style={{ fontSize: px(13.5), fontWeight: 800 }}>Save your business profile first</div>
        <div style={{ fontSize: px(12.5), lineHeight: lh(18), color: c.ink2, marginTop: 4 }}>Listings are published under it.</div>
        <OutlineButton onClick={() => navigate("/app/business/profile")} style={{ marginTop: 12 }}>
          Set up business profile
        </OutlineButton>
      </div>
    );
  }

  const closed = !!business.closedAt;
  const canSwitch = online && m.isOwner && !sw.busy && !closed;
  const switchNote = closed ? "Your business is closed, so it can't be listed." : !m.isOwner ? "Only the owner can show or hide your listing." : null;
  const hero = heroView(ov);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 32, color: c.ink }}>
      <style>{FOCUS_CSS}</style>
      <MarketOffline loaded />
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,4fr) minmax(0,1fr)", gap: 12 }}>
          <RedeemVoucherTile onPress={() => navigate("/app/business/redeem")} />
          <ListingToggleTile variant="biz" on={business.active} disabled={!canSwitch} onChange={(on) => (on ? void sw.turnOn() : sw.requestOff())} />
        </div>
        {switchNote ? <p style={{ fontSize: px(11.5), color: c.faint, lineHeight: "normal", margin: "8px 2px 0", textAlign: "end" }}>{switchNote}</p> : null}
        {sw.error ? (
          <p role="alert" style={{ fontSize: px(11.5), fontWeight: 700, color: c.high, lineHeight: "normal", margin: "8px 2px 0", textAlign: "end" }}>
            {sw.error}
          </p>
        ) : null}
      </div>
      {ov.status === "loading" ? (
        <MarketSkeleton radius={24} rows={3} height={165} label="Loading members reached" />
      ) : (
        <HeroStatCard label="Clients reached" value={hero.value} delta={hero.delta} sub={hero.sub} series={hero.series} />
      )}
      <StatLedger rows={ledgerRows(ov, gym)} />
      {ov.status === "error" ? <MarketError thing="your offer figures" onRetry={retry} /> : null}
      {kind === "gym" && gym ? (
        <>
          <CapsLabel style={{ marginTop: 4 }}>Gym</CapsLabel>
          <div style={{ borderRadius: 24, background: c.card, border: `1px solid ${c.border}`, overflow: "hidden" }}>
            <GymRow title="Memberships" sub={membershipsLine(gym.plans, gym.activeMemberships)} onOpen={() => navigate("/app/business/gym")} />
            <div style={{ height: 1, background: c.div, marginInlineStart: 16 }} />
            <GymRow title="Classes" sub={classesLine(gym.sessionsThisWeek, gym.classBookingsThisWeek)} onOpen={() => navigate("/app/business/classes")} />
            <div style={{ height: 1, background: c.div, marginInlineStart: 16 }} />
            <HiringRow businessId={business.id} tick={tick} />
          </div>
        </>
      ) : kind === "classes" ? (
        // Studios (W4 lead decision): the same Hiring row in the Gym card's
        // chrome, alone, ONLY when the server lets this business hire
        // (business_may_hire: gyms and studios since Database #38).
        <StudioHiring businessId={business.id} tick={tick} />
      ) : null}
      <ListingSection />
      {sw.popup}
      {sw.toast}
    </div>
  );
}

/** The studio's Hiring card, shown only when business_may_hire answers true. */
function StudioHiring({ businessId, tick }: { businessId: string; tick: number }) {
  const c = useMarketColors();
  const [may, setMay] = useState<{ id: string; ok: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    void fetchMayHire(businessId).then((r) => alive && setMay({ id: businessId, ok: r.ok && r.value }));
    return () => {
      alive = false;
    };
  }, [businessId]);
  if (!may || may.id !== businessId || !may.ok) return null;
  return (
    <>
      <CapsLabel style={{ marginTop: 4 }}>Studio</CapsLabel>
      <div style={{ borderRadius: 24, background: c.card, border: `1px solid ${c.border}`, overflow: "hidden" }}>
        <HiringRow businessId={businessId} tick={tick} />
      </div>
    </>
  );
}

/**
 * The Gym card's Hiring row (Business Marketplace Screens line 94; frame-check
 * B-MA.1 "Gym · Hiring row"): GymRow with the NEW chip (10 / 800, 0.08em,
 * #EEEAF8 / #7D67D9, padding 3 8) while there are new applicants. Counts from
 * my_openings('open') (openings, new applicants) and my_team (Team of n),
 * Database Release 2. An error: its own line.
 */
function HiringRow({ businessId, tick }: { businessId: string; tick: number }) {
  const navigate = useNavigate();
  const [state, setState] = useState<{ key: string; sub: string; isNew: boolean } | null>(null);
  const key = `${businessId}:${tick}`;
  useEffect(() => {
    let alive = true;
    void Promise.all([fetchMyOpenings(businessId, "open"), fetchMyTeam(businessId)]).then(([o, t]) => {
      if (!alive) return;
      if (o.ok && t.ok) {
        const fresh = o.value.reduce((n, x) => n + x.newApplicantCount, 0);
        setState({ key, sub: hiringRowLine(o.value.length, fresh, t.value.length), isNew: fresh > 0 });
      } else if ((!o.ok && o.pending) || (!t.ok && t.pending)) setState({ key, sub: HIRING_ROW_PENDING, isNew: false });
      else setState({ key, sub: "Couldn't load your hiring figures.", isNew: false });
    });
    return () => {
      alive = false;
    };
  }, [businessId, key]);
  const s = state && state.key === key ? state : null;
  return <GymRow title="Hiring" sub={s?.sub ?? ""} badge={s?.isNew ? <TagChip tag="NEW" /> : null} onOpen={() => navigate("/app/business/hiring")} />;
}

/** A Gym card row (lines 60 / 62 / 94): padding 14 16, gap 12, 14 / 700 title, 11.5 --faint sub, an optional chip, 16 chevron --faint. */
function GymRow({ title, sub, onOpen, badge }: { title: string; sub: string; onOpen: () => void; badge?: React.ReactNode }) {
  const c = useMarketColors();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="market-focus"
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", width: "100%", background: "transparent", border: 0, textAlign: "start", color: c.ink, fontFamily: "inherit", lineHeight: "normal", cursor: "pointer", minHeight: 62, boxSizing: "border-box" }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: px(14), fontWeight: 700 }}>{title}</span>
        {sub ? <span style={{ display: "block", fontSize: px(11.5), color: c.faint }}>{sub}</span> : null}
      </span>
      {badge}
      <ChevronRight size={16} strokeWidth={2} color={c.faint} aria-hidden style={{ flexShrink: 0 }} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Listing (kept from the MA1 Listing tab, PLAN §3.4): MA1-001 / 024 / 031 /
// 037 / 062 / 078, OURS-MA1-gym-listing, MA1-067. Live data only: the B5
// business row, the perk and the live promotions shown on the listing, the
// venue's hours (one shared hours sheet), its rating (B14
// business_review_metrics over all time; the venue's my_venues figures until
// that answers), B13's gallery, amenities, first-visit text and
// listing_strength(), whose done flags win.

function ListingSection() {
  const m = useMarket();
  const { v, kind, business } = m;
  const navigate = useNavigate();
  const online = useOnline();
  const [strip, showStrip] = useStrip();
  const [hoursOpen, setHoursOpen] = useState(false);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  const [firstVisitOpen, setFirstVisitOpen] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [catSignal, setCatSignal] = useState(0);
  const [now] = useState(() => Date.now());

  const businessId = business?.id ?? null;
  const [metrics, setMetrics] = useState<{ businessId: string; average: number | null; count: number } | null>(null);
  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    // All time: from a date before any review could exist, to the business's today.
    void fetchReviewMetrics(businessId, "2000-01-01", null).then((r) => {
      if (alive && r.status === "ok") setMetrics({ businessId, average: r.value.average, count: r.value.reviews });
    });
    return () => {
      alive = false;
    };
  }, [businessId]);
  // Round C Release 2: the viewer's own cover and photos waiting for approval
  // show in the Photos thumbnails (from image-staging); the client card and
  // the strength stay on the approved ones, which is what clients see.
  const ownCover = useOwnImage("business_cover", businessId);
  const [ownPhotos, setOwnPhotos] = useState<Map<string, OwnPhotoImage>>(new Map());
  useEffect(() => {
    let alive = true;
    void fetchOwnPhotoImages().then((map) => alive && setOwnPhotos(map));
    return () => {
      alive = false;
    };
  }, [m.photos]);
  if (!business) return null;
  const reviews =
    metrics && metrics.businessId === businessId
      ? { average: metrics.average, count: metrics.count }
      : { average: m.venue?.reviewsAverage ?? null, count: m.venue?.reviewsCount ?? 0 };
  const gallery = sortPhotos(m.photos ?? []);
  const counts = photoCounts(gallery);
  // The cover first, then the approved photos; in-review photos are counted on the line, not shown yet.
  const photos = [...(business.coverUrl ? [business.coverUrl] : []), ...gallery.filter((p) => p.status === "approved").map((p) => p.url)];
  const pendingUrl = (own: OwnPhotoImage | null | undefined) => (own?.status === "pending" ? own.url : null);
  const coverThumb = pendingUrl(ownCover.image) ?? business.coverUrl;
  const thumbs = [...(coverThumb ? [coverThumb] : []), ...gallery.filter((p) => p.status !== "rejected").map((p) => pendingUrl(ownPhotos.get(p.id)) ?? p.url)];
  const amenities = m.details?.amenities ?? [];
  const amenitiesDone = m.strength?.amenities ?? amenities.length > 0;
  const firstVisitDone = m.strength?.first_visit ?? !!m.details?.firstVisit;
  const summary = hoursSummary(m.hours);
  const inputFor = (hours: string | null): StrengthInput => ({
    store: kind === "store",
    logo: !!business.logoUrl,
    cover: !!business.coverUrl,
    photos: photos.length,
    photosDone: m.strength?.photos,
    description: !!business.bio?.trim(),
    categories: business.categories.map((k) => CATEGORY_LABEL[k] ?? k),
    address: business.location,
    hoursSummary: hours,
    amenities: amenities.map((k) => (isAmenityKey(k) ? AMENITY_LABEL[k] : k)),
    amenitiesDone,
    delivery: !!m.store && (m.store.deliveryEnabled || m.store.pickupEnabled),
    contact: !!(business.publicEmail || business.publicPhone || business.publicWebsite || business.instagram),
    firstVisit: firstVisitDone,
    returns: m.returnsSet,
    reviews,
  });
  const items = strengthItems(inputFor(summary));
  const isEmpty = items.every((x) => !x.done);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = m.classes.classes.filter((x) => x.date >= today && notEnded(x, now)).length;
  const meta =
    kind === "store"
      ? `${m.offerings.offerings.length} product${m.offerings.offerings.length === 1 ? "" : "s"}`
      : kind === "gym"
        ? `${m.plans.plans.length} passes and plans`
        : upcoming === 0
          ? "No upcoming classes"
          : `${upcoming} upcoming class${upcoming === 1 ? "" : "es"}`;
  const card: CardModel = {
    name: business.name,
    type: business.type,
    categories: business.categories,
    location: business.location,
    bio: business.bio,
    logoUrl: business.logoUrl,
    coverUrl: business.coverUrl,
    meta,
    chips: [...(m.perk ? [m.perk] : []), ...m.listingPromos.map((p) => p.name)],
    rating: reviews.count >= 3 && reviews.average !== null ? { average: reviews.average, count: reviews.count } : null,
  };

  const flash = (key: string) => {
    setHighlight(key);
    window.setTimeout(() => setHighlight((h) => (h === key ? null : h)), 3000);
  };

  const onItem = (it: StrengthItem) => {
    switch (it.key) {
      case "logo":
      case "cover":
      case "description":
      case "contact":
        navigate("/app/business/profile");
        break;
      case "photos":
        navigate(`${m.base}/photos`);
        break;
      case "categories":
        setCatSignal((s) => s + 1);
        break;
      case "address":
        navigate("/app/business/more/locations");
        break;
      case "hours":
        if (m.venue && m.can("schedule")) setHoursOpen(true);
        else navigate("/app/business/more/locations");
        break;
      case "amenities":
        setAmenitiesOpen(true);
        break;
      case "firstVisit":
        setFirstVisitOpen(true);
        break;
      case "delivery":
      case "returns":
        navigate("/app/business/more/store-policies");
        break;
      case "reviews":
        navigate(REVIEWS_ROUTE);
        break;
    }
  };

  const photoLine = galleryLine(photos.length, counts.inReview);
  const catSub = kind === "store" ? "Customers filter Explore by these." : kind === "gym" ? "People filter Explore by these." : "Clients filter Explore by these.";

  return (
    <section aria-label="Listing" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <CapsLabel style={{ marginTop: 4 }}>Listing</CapsLabel>
      <StrengthCard items={items} emptyLine={v.strengthEmpty} highlight={highlight} onItem={onItem} />
      <YourCard
        m={card}
        active={business.active}
        emptyBusiness={isEmpty}
        listedSub={v.listed}
        listedEmptySub={v.listedEmpty}
        hiddenSub={business.closedAt ? "Your business is closed, so it can't be listed." : v.hiddenSub}
        onPreview={() => navigate(`${m.base}/preview`)}
        emptyAddress="Add your address"
        emptyBio={`Add a short description so ${v.people} know what you're about.`}
      />
      <PhotosCard photos={thumbs} line={photoLine} onOpen={() => navigate(`${m.base}/photos`)} />
      <CategoriesCard
        kind={kind}
        title={v.catTitle}
        sub={catSub}
        value={business.categories}
        canEdit={online && m.isOwner}
        openSignal={catSignal}
        onApply={async (next) => {
          const r = await saveCategories(business.id, next);
          if (!r.ok) return r.message;
          m.setBusiness({ ...business, categories: r.value });
          return null;
        }}
      />
      <RatingCard average={reviews.average} count={reviews.count} onOpen={() => navigate(REVIEWS_ROUTE)} />

      {m.venue && m.hours && hoursOpen && (
        <VenueHoursSheet
          open={hoursOpen}
          onClose={() => setHoursOpen(false)}
          gymId={m.venue.gymId}
          timezone={m.venue.timezone}
          rows={m.hours}
          onSaved={(rows) => {
            const wasDone = !!summary;
            m.setHours(rows);
            setHoursOpen(false);
            const next = strengthItems(inputFor(hoursSummary(rows)));
            m.refreshStrength();
            flash("hours");
            showStrip(!wasDone && hoursSummary(rows) ? `Opening hours added. Listing strength is now ${strengthPct(next)}%.` : "Opening hours saved.");
          }}
        />
      )}
      {amenitiesOpen && (
        <AmenitiesSheet
          open
          onClose={() => setAmenitiesOpen(false)}
          onSaved={() => {
            setAmenitiesOpen(false);
            flash("amenities");
            showStrip("Amenities saved.");
          }}
        />
      )}
      {firstVisitOpen && (
        <FirstVisitSheet
          open
          onClose={() => setFirstVisitOpen(false)}
          onSaved={() => {
            setFirstVisitOpen(false);
            flash("firstVisit");
            showStrip("First visit info saved.");
          }}
        />
      )}
      {strip}
    </section>
  );
}

