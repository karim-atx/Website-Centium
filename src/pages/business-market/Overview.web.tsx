import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { RedeemVoucherTile } from "../../components/market/RedeemVoucherTile";
import { ListingToggleTile } from "../../components/market/ListingToggleTile";
import { HeroStatCard } from "../../components/market/HeroStatCard";
import { MarketWebType } from "../../components/market/webType";
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
import { fetchMayHire, fetchMyOpenings, fetchMyTeam } from "../../services/hiring";
import { useMarket } from "./MarketContext";
import { CapsLabel, CategoriesCard, OutlineButton, PhotosCard, RatingCard, StrengthCard, YourCard, px, lh, useMarketColors, useStrip, type CardModel } from "./listingParts";
import { hoursSummary, notEnded, strengthItems, strengthPct, type StrengthInput, type StrengthItem } from "./model";
import { useListingSwitch } from "./useListingSwitch";
import { AmenitiesSheet, FirstVisitSheet } from "./DetailsSheets";
import { TagChip } from "./hiring/hiringParts";
import { HIRING_ROW_PENDING, hiringRowLine } from "./hiring/teamModel";
import { REVIEWS_ROUTE } from "./Overview";
import { t, tk, tn } from "../../i18n/core";

// Website viewport v1 · WB-MA.1 Marketplace › Overview (WB-MA Marketplace Web
// v2), from 1024px wide: the mobile Overview's blocks in columns. At 1440,
// 5 | 4 | 4: Redeem voucher with the Listing toggle, the rating, Clients
// reached and the ledger | the Gym rows (or the studio's Hiring) and Listing
// strength | Your card, Photos and Activities. On the rail, 2 columns with
// Your card, Photos and Activities in a row below.
// reading, the listing switch, the strength items and every sheet (Hours,
// Amenities, First visit: 440 side sheets from 1024, WB-MA.5) are the mobile
// Overview's, copied here so the mobile tab stays untouched. The shared
// blocks take the board's web type through MarketWebType (13/20 captions,
// 15–17 titles, the 40/48 Clients reached figure, ledger rows 10 / 8 tall,
// Listing strength open); the voucher row is 1fr | 112; the columns are 24
// apart (20 on the rail), and on the rail Your card, Photos and Activities
// sit in a row of three below. The board's fill-the-viewport height for
// Clients reached is not built (the page scrolls).

export function OverviewWeb({ rail }: { rail: boolean }) {
  const m = useMarket();
  const c = useMarketColors();
  const { kind, business } = m;
  const navigate = useNavigate();
  const online = useOnline();
  const sw = useListingSwitch();
  const businessId = business?.id ?? null;

  const marketing = m.can("marketing");
  // The read, keyed by what it was for: a new business or Retry shows "loading" until its answer lands; no marketing permission reads nothing ("none").
  const [read, setRead] = useState<{ key: string; state: OverviewState } | null>(null);
  const [tick, setTick] = useState(0);
  const retry = useCallback(() => setTick((x) => x + 1), []);
  const readKey = `${businessId}:${tick}`;
  const ov: OverviewState = !marketing ? { status: "none" } : read && read.key === readKey ? read.state : { status: "loading" };
  useEffect(() => {
    if (!businessId || !marketing) return;
    let alive = true;
    const key = `${businessId}:${tick}`;
    void fetchMarketplaceOverview(businessId).then((r) => {
      if (!alive) return;
      setRead({ key, state: r.ok ? { status: "ok", value: r.value } : { status: "error" } });
    });
    return () => {
      alive = false;
    };
  }, [businessId, marketing, tick]);

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
    kind === "gym" ? { activeMemberships: d ? d.activeMembers : null, classBookingsThisWeek: d ? d.bookingsThisWeek : null, sessionsThisWeek: d ? d.classesThisWeek : null, plans: plansCount } : null;

  const listing = useListingModel();

  const cols = rail ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,5fr) minmax(0,4fr) minmax(0,4fr)";
  const column: React.CSSProperties = { minWidth: 0, display: "flex", flexDirection: "column", gap: 12 };

  if (m.error && !business) return <MarketError thing={tk("your marketplace")} onRetry={m.reload} />;
  if (m.loading) {
    return (
      <div aria-busy="true" aria-label={t("Loading your marketplace")} style={{ display: "grid", gridTemplateColumns: cols, gap: 24 }}>
        <MarketSkeleton radius={24} rows={3} height={165} label={t("Loading")} />
        <MarketSkeleton radius={24} rows={3} height={165} label={t("Loading")} />
        {!rail && <MarketSkeleton radius={24} rows={3} height={165} label={t("Loading")} />}
      </div>
    );
  }
  if (!business) {
    return (
      <div style={{ maxWidth: 560, borderRadius: 20, background: c.card, border: `1px solid ${c.border}`, padding: 16, color: c.ink, lineHeight: "normal" }}>
        <div style={{ fontSize: px(13.5), fontWeight: 800 }}>{t("Save your business profile first")}</div>
        <div style={{ fontSize: px(12.5), lineHeight: lh(18), color: c.ink2, marginTop: 4 }}>{t("Listings are published under it.")}</div>
        <OutlineButton onClick={() => navigate("/app/business/profile")} style={{ marginTop: 12 }}>
          {t("Set up business profile")}
        </OutlineButton>
      </div>
    );
  }

  const closed = !!business.closedAt;
  const canSwitch = online && m.isOwner && !sw.busy && !closed;
  const switchNote = closed ? t("Your business is closed, so it can't be listed.") : !m.isOwner ? t("Only the owner can show or hide your listing.") : null;
  const hero = heroView(ov);

  const colA = (
    <div data-ma-col="a" style={column}>
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 112px", gap: 12 }}>
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
      {listing?.rating}
      {ov.status === "loading" ? (
        <MarketSkeleton radius={24} rows={3} height={165} label={t("Loading members reached")} />
      ) : (
        <HeroStatCard label={t("Clients reached")} value={hero.value} delta={hero.delta} sub={hero.sub} series={hero.series} />
      )}
      <StatLedger rows={ledgerRows(ov, gym)} />
      {ov.status === "error" ? <MarketError thing={tk("your offer figures")} onRetry={retry} /> : null}
    </div>
  );
  const colB = (
    <div data-ma-col="b" style={column}>
      {kind === "gym" && gym ? (
        <>
          <CapsLabel style={{ marginTop: 4 }}>{t("Gym")}</CapsLabel>
          <div style={{ borderRadius: 24, background: c.card, border: `1px solid ${c.border}`, overflow: "hidden" }}>
            <GymRow title={t("Memberships")} sub={membershipsLine(gym.plans, gym.activeMemberships)} onOpen={() => navigate("/app/business/gym")} />
            <div style={{ height: 1, background: c.div, marginInlineStart: 16 }} />
            <GymRow title={t("Classes")} sub={classesLine(gym.sessionsThisWeek, gym.classBookingsThisWeek)} onOpen={() => navigate("/app/business/classes")} />
            <div style={{ height: 1, background: c.div, marginInlineStart: 16 }} />
            <HiringRow businessId={business.id} tick={tick} />
          </div>
        </>
      ) : kind === "classes" ? (
        <StudioHiring businessId={business.id} tick={tick} />
      ) : null}
      {listing && (
        <section aria-label={t("Listing")} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <CapsLabel style={{ marginTop: 4 }}>{t("Listing")}</CapsLabel>
          {listing.strength}
        </section>
      )}
    </div>
  );
  const colC = listing && (
    <div data-ma-col="c" style={rail ? { gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, alignItems: "start" } : column}>
      {listing.yourCard}
      {listing.photos}
      {listing.categories}
    </div>
  );

  return (
    <MarketWebType.Provider value={rail ? "rail" : "wide"}>
    <div data-ma-overview style={{ color: c.ink, paddingBottom: 32 }}>
      <style>{FOCUS_CSS}</style>
      <MarketOffline loaded />
      <div style={{ display: "grid", gridTemplateColumns: cols, columnGap: rail ? 20 : 24, rowGap: rail ? 20 : 24, alignItems: "start" }}>
        {colA}
        {colB}
        {colC}
      </div>
      {listing?.sheets}
      {sw.popup}
      {sw.toast}
    </div>
    </MarketWebType.Provider>
  );
}

/** The studio's Hiring card, shown only when business_may_hire answers true (the mobile Overview's). */
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
      <CapsLabel style={{ marginTop: 4 }}>{t("Studio")}</CapsLabel>
      <div style={{ borderRadius: 24, background: c.card, border: `1px solid ${c.border}`, overflow: "hidden" }}>
        <HiringRow businessId={businessId} tick={tick} />
      </div>
    </>
  );
}

function HiringRow({ businessId, tick }: { businessId: string; tick: number }) {
  const navigate = useNavigate();
  const [state, setState] = useState<{ key: string; sub: string; isNew: boolean } | null>(null);
  const key = `${businessId}:${tick}`;
  useEffect(() => {
    let alive = true;
    void Promise.all([fetchMyOpenings(businessId, "open"), fetchMyTeam(businessId)]).then(([o, tr]) => {
      if (!alive) return;
      if (o.ok && tr.ok) {
        const fresh = o.value.reduce((n, x) => n + x.newApplicantCount, 0);
        setState({ key, sub: hiringRowLine(o.value.length, fresh, tr.value.length), isNew: fresh > 0 });
      } else if ((!o.ok && o.pending) || (!tr.ok && tr.pending)) setState({ key, sub: t(HIRING_ROW_PENDING), isNew: false });
      else setState({ key, sub: t("Couldn't load your hiring figures."), isNew: false });
    });
    return () => {
      alive = false;
    };
  }, [businessId, key]);
  const s = state && state.key === key ? state : null;
  return <GymRow title={t("Hiring")} sub={s?.sub ?? ""} badge={s?.isNew ? <TagChip tag="NEW" /> : null} onOpen={() => navigate("/app/business/hiring")} />;
}

function GymRow({ title, sub, onOpen, badge }: { title: string; sub: string; onOpen: () => void; badge?: React.ReactNode }) {
  const c = useMarketColors();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="market-focus hover:!bg-[#FAF8FE]"
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", width: "100%", background: "transparent", border: 0, textAlign: "start", color: c.ink, fontFamily: "inherit", lineHeight: "normal", cursor: "pointer", minHeight: 64, boxSizing: "border-box" }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: px(15), lineHeight: lh(24), fontWeight: 700 }}>{title}</span>
        {sub ? <span style={{ display: "block", fontSize: px(13), lineHeight: lh(20), color: c.faint }}>{sub}</span> : null}
      </span>
      {badge}
      <ChevronRight size={16} strokeWidth={2} color={c.faint} aria-hidden className="rtl:-scale-x-100" style={{ flexShrink: 0 }} />
    </button>
  );
}

/** The mobile ListingSection's reads and handlers, its blocks handed out separately for the columns. */
function useListingModel(): { rating: React.ReactNode; strength: React.ReactNode; yourCard: React.ReactNode; photos: React.ReactNode; categories: React.ReactNode; sheets: React.ReactNode } | null {
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
    void fetchReviewMetrics(businessId, "2000-01-01", null).then((r) => {
      if (alive && r.status === "ok") setMetrics({ businessId, average: r.value.average, count: r.value.reviews });
    });
    return () => {
      alive = false;
    };
  }, [businessId]);
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
  const reviews = metrics && metrics.businessId === businessId ? { average: metrics.average, count: metrics.count } : { average: m.venue?.reviewsAverage ?? null, count: m.venue?.reviewsCount ?? 0 };
  const gallery = sortPhotos(m.photos ?? []);
  const counts = photoCounts(gallery);
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
    categories: business.categories.map((k) => t(CATEGORY_LABEL[k] ?? k)),
    address: business.location,
    hoursSummary: hours,
    amenities: amenities.map((k) => (isAmenityKey(k) ? t(AMENITY_LABEL[k]) : k)),
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
      ? tn(m.offerings.offerings.length, "{n} product", "{n} products")
      : kind === "gym"
        ? tn(m.plans.plans.length, "{n} pass or plan", "{n} passes and plans")
        : upcoming === 0
          ? t("No upcoming classes")
          : tn(upcoming, "{n} upcoming class", "{n} upcoming classes");
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
  const catSub = kind === "store" ? t("Customers filter Explore by these.") : kind === "gym" ? t("People filter Explore by these.") : t("Clients filter Explore by these.");

  return {
    rating: <RatingCard average={reviews.average} count={reviews.count} onOpen={() => navigate(REVIEWS_ROUTE)} />,
    strength: <StrengthCard items={items} emptyLine={v.strengthEmpty} highlight={highlight} onItem={onItem} />,
    yourCard: (
      <YourCard
        m={card}
        active={business.active}
        emptyBusiness={isEmpty}
        listedSub={v.listed}
        listedEmptySub={v.listedEmpty}
        hiddenSub={business.closedAt ? t("Your business is closed, so it can't be listed.") : v.hiddenSub}
        onPreview={() => navigate(`${m.base}/preview`)}
        emptyAddress={t("Add your address")}
        emptyBio={v.emptyBio}
      />
    ),
    photos: <PhotosCard photos={thumbs} line={photoLine} onOpen={() => navigate(`${m.base}/photos`)} />,
    categories: (
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
    ),
    sheets: (
      <>
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
              showStrip(!wasDone && hoursSummary(rows) ? t("Opening hours added. Listing strength is now {pct}%.", { pct: strengthPct(next) }) : t("Opening hours saved."));
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
              showStrip(t("Amenities saved."));
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
              showStrip(t("First visit info saved."));
            }}
          />
        )}
        {strip}
      </>
    ),
  };
}
