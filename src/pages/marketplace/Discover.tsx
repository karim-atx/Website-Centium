import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, CalendarDays, Dumbbell } from "lucide-react";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useKnownPosition } from "../../hooks/useKnownPosition";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../components/pro/proInk";
import { initials } from "../../components/professionals/typeColour";
import { fetchMarketplaceClasses, fetchMyBookedClassIds, type MarketplaceClass } from "../../services/marketplace";
import { fetchGymPointsNear, fetchMyGymMemberships, fetchPlansFor, fetchReviewSummary, fetchVenues, type GymMembership, type Venue, type VenuePlan } from "../../services/venues";
import type { Coords } from "../../services/geo/distance";
import { currentMembership, memberTag, membershipFromLine } from "../../services/venues/venueLogic";
import { distanceKm } from "../../services/geo/distance";
import { distanceText } from "../../services/marketplace/classBooking";
import { MemberTag } from "../../components/marketplace/MemberTag";
import { VenueImage } from "../../components/marketplace/VenueImage";
import { ClassCard, ExploreEmptyState, RetryLine, isOffline } from "../../components/marketplace/ClassCard";
import { FeaturedChip } from "../../components/marketplace/FeaturedChip";
import { useFilter } from "../../components/market/useFilter";
import { matchesFilter } from "../../components/market/filterModel";
import { FOCUS_CSS, usePress } from "../../components/market/usePress";
import { fillUnder } from "../../components/market/marketColor";
import { formatShortDate } from "../../utils/date";
import { useImpression } from "../../services/marketplace/listingEvents";
import { exploreSource, isLivePassState, viewerSpotsLeft, type ListingEvent } from "../../services/marketplace/listingLogic";
import { ClassFilterPopup } from "./ClassFilterPopup";
import { classCountLine, classFilterGroups, gymFilterGroups, stripDays } from "./classFilterModel";
import { FilterPopup, FilterSummary, FilterTrigger } from "../../components/market/FilterPopup";
import RewardsTab from "./rewards/RewardsTab";

// Market + Share 3.0 · W2 · Explore's search, tracks and lists (C-MO.4.1 /
// C-MO.4.2 Gyms, C-MO.4.3 Classes, C-MO.4.4 Rewards; Client Explore Screens
// lines 55–111, 204–273, 360–396).
//
// - Search (D-20, kept): a 44-tall field above the track ("Search classes,
//   places or a location"), filtering gyms and classes; hidden on Rewards.
// - The Gyms · Classes · Rewards track (margin-top 14 under My bookings / My
//   rewards; --segtrack radius 16 padding 6 gap 5; 40-tall tabs radius 12
//   13 / 700, active --segactive / --onfill, idle --segidle / --segink) is the
//   pinned group under the FixedHeader (the live two-step pin, S2, with the
//   Larger text 40% rule and the one hairline). `?tab=gyms|classes|rewards`
//   (the board lands on Gyms; the old `?tab=businesses` opens Rewards, where
//   the businesses now live, D-21).
// - Gyms: "Sorted by rating and distance" 11.5 --faint (margin-top 12), cards
//   (gap 10, margin-top 10): radius 18, --card, 0.5px --hair; the 84-tall
//   cover (the real cover, else the logo / initials on --soft); padding 12 16,
//   gap 12: the name 15 / 700, the rating · distance line 11.5 --faint with the
//   12 --gold star (gap 4, margin-top 1), "From $45/month" 12.5 / 700 --accent
//   (margin-top 2), the 16 chevron. Featured venues stay first (B13 MK-06),
//   then by rating, then by distance from the device's known position.
//   Release B: with a known position (never prompted from a list), the gyms
//   near it come from venues_in_area (a rounded point leaves the device; the
//   distance is worked out here) and a filter beside the line offers the
//   classes filter's Distance group ("Under 1 km / 3 km / 5 km").
// - Classes: the day strip (margin 12 −16 0, padding 0 16, gap 8, scrolls;
//   each day flex 0 0 calc((100% − 32px) / 5), min 56, 64 tall, radius 14:
//   the weekday 12 / 16 500, the date 18 / 22 700, a 4 dot when the day has
//   classes; the chosen day #AEA1DC with white, the others --soft), the count
//   line + filter (ClassFilterPopup: Type, Time, Gym, Distance, and Price for
//   the live price ceiling, D-20), the class tickets (gap 16, margin-top 14).
//   A search looks across every day.
// - Rewards: RewardsTab (W2-C).
// Kept live (PLAN §3.1): featured chips, the impression / book_tap analytics
// (Seen; book_tap now fires on the class page's Book), the member / spots
// rules for this viewer, RetryLine and the offline wording, empty states.

type Tab = "gyms" | "classes" | "rewards";
const TABS: { key: Tab; label: string }[] = [
  { key: "gyms", label: "Gyms" },
  { key: "classes", label: "Classes" },
  { key: "rewards", label: "Rewards" },
];

/** The pinned group's top spacer, which slides under the header once pinned (MO1.4.s #6). */
const PIN_SPACER = 9.9;

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const atNoon = (key: string) => new Date(`${key}T12:00:00`);

export default function Discover({ onPinnedChange }: { onPinnedChange?: (pinned: boolean) => void } = {}) {
  const { authUserId, profileReady } = useApp();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const dark = useIsDark();
  const m = marketPalette(dark);
  const here = useKnownPosition();

  const [classes, setClasses] = useState<MarketplaceClass[]>([]);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [gyms, setGyms] = useState<Venue[]>([]);
  const [gymPlans, setGymPlans] = useState<VenuePlan[]>([]);
  const [gymMemberships, setGymMemberships] = useState<GymMembership[]>([]);
  const [ratings, setRatings] = useState<Map<string, { average: number; total: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<Tab, string>>>({});
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: Tab = raw === "classes" ? "classes" : raw === "rewards" || raw === "businesses" ? "rewards" : "gyms";
  const filter = useFilter();
  const gymFilter = useFilter();
  const [gymAnchor, setGymAnchor] = useState<HTMLButtonElement | null>(null);
  const [day, setDay] = useState<string | null>(null);
  // venues_in_area's gyms within 100 km of the known position (null until read, or when it failed).
  const [gymPoints, setGymPoints] = useState<Map<string, Coords> | null>(null);

  const openClass = (c: MarketplaceClass) => navigate(`/app/marketplace/class?id=${encodeURIComponent(c.classId)}&src=${exploreSource({ query, featured: c.isFeatured })}`);

  useEffect(() => {
    if (!profileReady) return;
    let cancelled = false;
    void (async () => {
      const [cls, mine, gymsR, memberships] = await Promise.all([fetchMarketplaceClasses(), fetchMyBookedClassIds(), fetchVenues(), fetchMyGymMemberships()]);
      if (cancelled) return;
      const offline = isOffline();
      const failed = (what: string) => (offline ? "You're offline. Showing what was loaded." : `Couldn't load ${what}.`);
      const next: Partial<Record<Tab, string>> = {};
      if (gymsR.ok) {
        setGyms(gymsR.value);
        const [plans, sums] = await Promise.all([
          fetchPlansFor(gymsR.value.flatMap((g) => (g.businessId ? [g.businessId] : []))),
          Promise.all(gymsR.value.map(async (g) => [g.id, await fetchReviewSummary(g.id)] as const)),
        ]);
        if (cancelled) return;
        if (plans.ok) setGymPlans(plans.value);
        setRatings(new Map(sums.flatMap(([id, r]) => (r.ok ? [[id, { average: r.value.average, total: r.value.total }] as const] : []))));
      } else next.gyms = failed("gyms");
      if (memberships.ok) setGymMemberships(memberships.value);
      if (cls.ok) {
        setClasses(cls.classes);
        setBooked(mine);
      } else next.classes = failed("classes");
      setErrors(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [profileReady, authUserId, reload]);
  const retry = () => {
    setErrors({});
    setReload((n) => n + 1);
  };

  // Release B: only once a position is already known; unmetered, so read for real.
  useEffect(() => {
    if (!here) return;
    let live = true;
    void fetchGymPointsNear(here).then((r) => live && setGymPoints(r.ok ? r.value : null));
    return () => {
      live = false;
    };
  }, [here, reload]);

  // B13 MK-04: the businesses whose classes this viewer books as a member.
  const memberOf = useMemo(() => {
    const bizOf = new Map(gyms.map((g) => [g.id, g.businessId]));
    return new Set(gymMemberships.filter((x) => isLivePassState(x.passState)).flatMap((x) => (bizOf.get(x.gymId) ? [bizOf.get(x.gymId) as string] : [])));
  }, [gyms, gymMemberships]);
  const forViewer = (c: MarketplaceClass): MarketplaceClass => {
    if (c.centiumSpotsLeft == null || memberOf.has(c.businessId)) return c;
    const left = viewerSpotsLeft(c.spotsRemaining, c.centiumSpotsLeft, false);
    return { ...c, spotsRemaining: left, isFull: c.isFull || left <= 0 };
  };

  // ---- Classes: the day strip, the search, the filter.
  const today = dayKey(new Date());
  const days = useMemo(() => stripDays(new Date(), classes.map((c) => c.date)), [classes]);
  const classDays = useMemo(() => new Set(classes.map((c) => c.date)), [classes]);
  // The first day with classes (else today) until the member picks one.
  const chosenDay = day ?? days.find((d) => classDays.has(d)) ?? today;
  const q = query.trim().toLowerCase();
  const withKm = useMemo(
    () => classes.map((c) => ({ c, km: here && c.venueLat != null && c.venueLng != null ? distanceKm(here, { lat: c.venueLat, lng: c.venueLng }) : null })),
    [classes, here]
  );
  const groups = useMemo(() => classFilterGroups(withKm.map(({ c, km }) => ({ ...c, km })), !!here), [withKm, here]);
  const shownClasses = withKm
    .map(({ c, km }) => ({ ...c, km }))
    .filter((c) => (q ? [c.title, c.businessName, c.location ?? "", c.classType ?? "", c.venueName ?? ""].some((f) => f.toLowerCase().includes(q)) : c.date === chosenDay))
    .filter((c) => matchesFilter(groups, filter.selected, c));
  const dayLabel = q ? "Matching your search" : formatShortDate(atNoon(chosenDay), { weekday: "long", month: "long", day: "numeric" });

  // ---- Gyms: featured first, then rating, then distance; the Distance filter.
  // A gym venues_in_area placed is measured from its returned point; if that
  // read failed, from the gym row's own coordinates as before; outside its
  // 100 km, no distance.
  const gymKm = (g: Venue) => {
    if (!here) return null;
    const p = gymPoints ? gymPoints.get(g.id) : g.lat != null && g.lng != null ? { lat: g.lat, lng: g.lng } : undefined;
    return p ? distanceKm(here, p) : null;
  };
  const gymGroups = gymFilterGroups<{ km: number | null }>(!!here);
  const shownGyms = (() => {
    const list = gyms.filter((g) => (!q || [g.name, g.location].some((f) => f.toLowerCase().includes(q))) && matchesFilter(gymGroups, gymFilter.selected, { km: gymKm(g) }));
    return list
      .map((g, i) => ({ g, i, r: ratings.get(g.id)?.total ? (ratings.get(g.id)?.average ?? 0) : 0, km: gymKm(g) }))
      .sort((a, b) => Number(b.g.isFeatured) - Number(a.g.isFeatured) || b.r - a.r || (a.km ?? Infinity) - (b.km ?? Infinity) || a.i - b.i)
      .map((x) => x.g);
  })();

  // ---- S2: the two-step pin (unchanged mechanics): a sentinel before the
  // group, the header's published bottom, the Larger text 40% rule.
  const groupRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [pinned, setPinned] = useState(false);
  const [pinnable, setPinnable] = useState(true);
  useEffect(() => {
    const group = groupRef.current;
    const sentinel = sentinelRef.current;
    if (!group || !sentinel) return;
    let io: IntersectionObserver | null = null;
    const observe = () => {
      io?.disconnect();
      const headerBottom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--fixed-header-bottom")) || 0;
      const top = Math.max(0, headerBottom - PIN_SPACER);
      setPinnable(headerBottom + group.offsetHeight - PIN_SPACER <= window.innerHeight * 0.4);
      io = new IntersectionObserver(([entry]) => setPinned(!entry.isIntersecting && entry.boundingClientRect.top < top + 1), {
        rootMargin: `${-Math.round(top)}px 0px 0px 0px`,
        threshold: [0, 1],
      });
      io.observe(sentinel);
    };
    observe();
    const mo = new MutationObserver(observe);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    window.addEventListener("resize", observe);
    return () => {
      mo.disconnect();
      window.removeEventListener("resize", observe);
      io?.disconnect();
    };
  }, []);
  const stuck = pinned && pinnable;
  useEffect(() => {
    onPinnedChange?.(stuck);
  }, [stuck, onPinnedChange]);
  useEffect(() => () => onPinnedChange?.(false), [onPinnedChange]);

  // MO1.4.s O1: switching tab while pinned keeps the pin and shows the new list's top.
  const setTab = (t: Tab) => {
    const wasStuck = stuck;
    const next = new URLSearchParams(params);
    if (t === "gyms") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
    if (wasStuck) {
      requestAnimationFrame(() => {
        const s = sentinelRef.current;
        const g = groupRef.current;
        if (!s || !g) return;
        const top = parseFloat(getComputedStyle(g).top) || 0;
        window.scrollTo({ top: window.scrollY + s.getBoundingClientRect().top - top + 2 });
      });
    }
  };

  const error = tab === "rewards" ? null : (errors[tab] ?? null);

  return (
    <div className="mb-6" style={{ lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      {tab !== "rewards" && (
        <div className="relative" style={{ marginTop: 14 }}>
          <Search size={16} strokeWidth={1.75} className="absolute start-3.5 top-1/2 -translate-y-1/2" style={{ color: m.faint }} aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search classes, places or a location"
            aria-label="Search classes, places or a location"
            className="w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={{ height: 44, borderRadius: 14, background: m.soft, paddingInlineStart: 38, paddingInlineEnd: 14, fontSize: textPx(14), color: m.ink, border: 0 }}
          />
        </div>
      )}

      <div ref={sentinelRef} aria-hidden style={{ height: 1, marginBottom: -1, marginTop: tab === "rewards" ? 14 - PIN_SPACER : 10 - PIN_SPACER }} />
      <div
        ref={groupRef}
        data-pin-group=""
        data-pinned={stuck ? "true" : "false"}
        className={`${pinnable ? "sticky" : "relative"} z-20 -mx-4 px-4`}
        style={{ top: `calc(var(--fixed-header-bottom, 0px) - ${PIN_SPACER}px)`, paddingTop: PIN_SPACER }}
      >
        <div className="relative bg-cream -mx-4 px-4">
          <SegmentedTabs items={TABS} activeKey={tab} onChange={(k) => setTab(k as Tab)} labelSize={13} tabHeight={40} darkTone="partB" idleInkDark="rgb(var(--th-b7abde))" />
          <span
            aria-hidden
            data-pin-hairline=""
            className="absolute inset-x-0 -bottom-px h-px bg-hair-08 dark:bg-hair-10 pointer-events-none"
            style={{ opacity: stuck ? 1 : 0, transition: reduced ? "none" : "opacity 120ms ease" }}
          />
        </div>
      </div>

      {error && <RetryLine className="mt-2.5" message={error} onRetry={retry} />}

      {tab === "gyms" && (
        <>
          {gymGroups.length ? (
            <>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <p style={{ margin: 0, fontSize: textPx(11.5), color: m.faint, minWidth: 0 }}>Sorted by rating and distance</p>
                <FilterTrigger ref={setGymAnchor} active={gymFilter.active} open={gymFilter.open} onPress={gymFilter.toggleFilter} label="Filter gyms" />
              </div>
              {gymFilter.active ? <FilterSummary summary={gymFilter.summary} onShowAll={gymFilter.clearFilter} style={{ marginTop: 10 }} /> : null}
              <FilterPopup open={gymFilter.open} anchor={gymAnchor} groups={gymGroups} selected={gymFilter.selected} onToggle={gymFilter.toggleOption} onClose={gymFilter.closeFilter} />
            </>
          ) : (
            <p style={{ margin: "12px 0 0", fontSize: textPx(11.5), color: m.faint }}>Sorted by rating and distance</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {shownGyms.map((v) => (
              <GymCard
                key={v.id}
                v={v}
                from={v.businessId ? membershipFromLine(gymPlans.filter((p) => p.businessId === v.businessId)) : null}
                mine={currentMembership(gymMemberships, v.id)}
                rating={ratings.get(v.id) ?? null}
                km={gymKm(v)}
                query={query}
              />
            ))}
            {shownGyms.length === 0 && !loading && !errors.gyms && (
              <ExploreEmptyState
                icon={<Dumbbell size={24} strokeWidth={1.75} />}
                title={gyms.length === 0 ? "No gyms yet" : "No gyms match"}
                body={gyms.length === 0 ? "Gyms near you will show here." : gymFilter.active ? "Try other filters, or Show all." : "Try another search."}
              />
            )}
          </div>
        </>
      )}

      {tab === "classes" && (
        <>
          {!q && <DayStrip days={days} chosen={chosenDay} withClasses={classDays} onPick={setDay} />}
          <ClassFilterPopup countLine={classCountLine(dayLabel, shownClasses.length)} groups={groups} filter={filter} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 14 }}>
            {shownClasses.map((c) => (
              <Seen key={c.classId} event={{ businessId: c.businessId, kind: "impression", source: exploreSource({ query, featured: c.isFeatured }), itemId: c.classId }}>
                <ClassCard c={forViewer(c)} booked={booked.has(c.classId)} onOpen={openClass} />
              </Seen>
            ))}
            {shownClasses.length === 0 && !loading && !errors.classes && (
              <ExploreEmptyState
                icon={<CalendarDays size={24} strokeWidth={1.75} />}
                title={classes.length === 0 ? "No classes yet" : "No classes match"}
                body={classes.length === 0 ? "Classes from gyms and studios near you will show here." : filter.active ? "Try other filters, or Show all." : q ? "Try another search." : "Try another day."}
              />
            )}
          </div>
        </>
      )}

      {tab === "rewards" && <RewardsTab />}

      {loading && tab !== "rewards" && (
        <div style={{ display: "flex", flexDirection: "column", gap: tab === "gyms" ? 10 : 16, marginTop: 14 }} aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <div key={i} aria-hidden="true" className="animate-skeleton-pulse" style={{ height: tab === "gyms" ? 166 : 117, borderRadius: 18, background: m.soft }} />
          ))}
        </div>
      )}
    </div>
  );
}

/** C-MO.4.2 gym card (lines 96–107). */
function GymCard({ v, from, mine, rating, km, query }: { v: Venue; from: string | null; mine: GymMembership | null; rating: { average: number; total: number } | null; km: number | null; query: string }) {
  const navigate = useNavigate();
  const m = marketPalette(useIsDark());
  const press = usePress();
  const tag = mine ? memberTag(mine.passState) : null;
  const source = exploreSource({ query, featured: v.isFeatured });
  const rated = rating && rating.total > 0 ? rating.average.toFixed(1) : null;
  const where = distanceText(km) ?? v.location;
  const line = [rated ?? "New", where].filter(Boolean).join(" · ");
  return (
    <Seen event={v.businessId ? { businessId: v.businessId, kind: "impression", source } : null}>
      <button
        type="button"
        onClick={() => navigate(`/app/marketplace/gym?id=${encodeURIComponent(v.id)}&src=${source}`)}
        className="market-focus"
        {...press.handlers}
        aria-label={`${v.name}. ${rated ? `Rated ${rated}` : "No reviews yet"}${where ? `, ${where}` : ""}${from ? `. ${from}` : ""}`}
        style={{ display: "block", width: "100%", textAlign: "start", borderRadius: 18, background: m.card, border: `0.5px solid ${m.hair}`, overflow: "hidden", padding: 0, font: "inherit", color: m.ink, cursor: "pointer", ...press.style }}
      >
        <span style={{ position: "relative", height: 84, background: m.soft, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <VenueImage
            srcs={[v.coverUrl]}
            className="absolute inset-0 w-full h-full"
            fallback={
              <span className="relative overflow-hidden flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 12, background: m.card, fontSize: textPx(14), fontWeight: 800, color: m.accent }}>
                <VenueImage srcs={v.logoUrls} className="absolute inset-0 w-full h-full" fallback={initials(v.name)} />
              </span>
            }
          />
          {tag && <MemberTag label={tag.label} tone={tag.tone} className="absolute top-2.5 end-2.5" />}
        </span>
        <span style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: textPx(15), fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</span>
              {v.isFeatured && <FeaturedChip />}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: textPx(11.5), color: m.faint, marginTop: 1, minWidth: 0 }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill={m.gold} stroke={m.gold} strokeWidth={1.5} strokeLinejoin="round" aria-hidden style={{ flex: "none", ...NO_ICON_SCALE }}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{line}</span>
            </span>
            {from && <span style={{ display: "block", fontSize: textPx(12.5), fontWeight: 700, color: m.accent, marginTop: 2 }}>{from.replace(/^Membership from/, "From")}</span>}
          </span>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={m.faint} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none", ...NO_ICON_SCALE }}>
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
      </button>
    </Seen>
  );
}

/** C-MO.4.3 day strip (lines 215–223). The selected fill is lifted to 4.5:1 under white (fillUnder; the W3 lead decision for the week-day tile). */
function DayStrip({ days, chosen, withClasses, onPick }: { days: string[]; chosen: string; withClasses: Set<string>; onPick: (d: string) => void }) {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[aria-pressed=true]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [chosen]);
  return (
    <div ref={ref} role="group" aria-label="Day" className="no-scrollbar" style={{ margin: "12px -16px 0", padding: "0 16px", display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
      {days.map((d) => {
        const on = d === chosen;
        const date = atNoon(d);
        const has = withClasses.has(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            aria-label={`${formatShortDate(date, { weekday: "long", month: "long", day: "numeric" })}${has ? "" : ", no classes"}`}
            onClick={() => onPick(d)}
            className="market-focus"
            style={{
              flex: "0 0 calc((100% - 32px) / 5)",
              minWidth: 56,
              height: 64,
              boxSizing: "border-box",
              borderRadius: 14,
              border: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              background: on ? fillUnder(m.fill, m.onfill) : m.soft,
              color: on ? m.onfill : m.ink,
              font: "inherit",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: textPx(12), lineHeight: linePx(16), fontWeight: 500, color: on ? m.onfill : m.ink2 }}>{formatShortDate(date, { weekday: "short" })}</span>
            <span style={{ fontSize: textPx(18), lineHeight: linePx(22), fontWeight: 700 }}>{date.getDate()}</span>
            <span aria-hidden style={{ marginTop: 3, width: 4, height: 4, borderRadius: 999, background: has ? (on ? m.onfill : m.fill) : "transparent" }} />
          </button>
        );
      })}
    </div>
  );
}

/** B13 MK-07: an Explore card's impression, once per session when half on screen. */
function Seen({ event, children }: { event: ListingEvent | null; children: React.ReactNode }) {
  const ref = useImpression<HTMLDivElement>(event);
  return (
    <div ref={ref} data-impression="">
      {children}
    </div>
  );
}
