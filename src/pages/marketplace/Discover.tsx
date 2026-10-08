import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { useIsDark } from "../../hooks/useIsDark";
import { initials } from "../../components/professionals/typeColour";
import { useApp } from "../../context/AppContext";
import { BUSINESS_TYPES, typeLabel } from "./venueTypes";
import {
  fetchMarketplaceClasses,
  fetchMarketplaceVenues,
  fetchMyBookedClassIds,
  type MarketplaceClass,
  type MarketplaceVenue,
} from "../../services/marketplace";
import { fetchMyGymMemberships, fetchPlansFor, fetchVenues, type GymMembership, type Venue, type VenuePlan } from "../../services/venues";
import { currentMembership, memberTag, membershipFromLine } from "../../services/venues/venueLogic";
import { MemberTag } from "../../components/marketplace/MemberTag";
import { VenueImage } from "../../components/marketplace/VenueImage";
import { CalendarDays, Search, Store, Dumbbell, ChevronRight } from "lucide-react";
import { ClassCard, ExploreEmptyState, RetryLine, isOffline } from "../../components/marketplace/ClassCard";
import { useReducedMotion } from "../../hooks/useReducedMotion";

// Marketplace discovery: real classes, real venues, real bookings.
//
// WHAT THIS REPLACED. The browse screen listed `mockGyms` and `mockClasses`
// — invented venues with invented star ratings and offers — and the category
// pages listed `mockMarketplaceListings`, more of the same. None of it was
// bookable and none of it was real; a "4.7" next to a gym that does not exist
// is a claim about a business, and the app was making several.
//
// THE VIEWS DECIDE WHAT IS VISIBLE, not this screen. marketplace_classes is
// already filtered to listed businesses and to classes that have not happened
// yet, so there is no date check and no listing check here — writing one would
// be a second copy of a rule the database owns.
//
// MO1.4 – MO1.4.3 (R14, existing data only): one header (Marketplace's);
// Classes / Businesses / Gyms as segmented tabs; FO3 sub-tabs for price and,
// on Businesses, the type; class cards with a date block, a price tag and an
// inline Book (the class page needs a backend, B24); empty states in the
// Foundations block. No distances (venues have no coordinates, B25), no
// logos, covers or ratings (B26, B27).
//
// Decision 23 (kept list): one price rail (the class-type rail is gone; the
// search matches the type instead), a borderless search, a 24-hour date block
// that carries the date for a class a week or more out, and Businesses rows
// that open the business's page (bio, classes, perk and listings moved there).
//
// Handover-complete pass (2026-10-07): Book opens the class page (MO1.4.4,
// ClassPage.tsx), where booking, the booked state and cancelling now live; a
// booked class reads "Booked" in the Book slot and opens the same page. The
// Info button and its popup are gone (the class page shows those details).
// A gym card opens the gym page (MO1.4.2.1, GymPage.tsx); its bio and perk
// lines are gone (the bio is on the gym page). The active sub-tab is the
// frame's #9A8CD6 in light.
//
// GYMS (backend stage 4a / 4b): the cards read public.gyms itself (the
// Explore view predates 4a), "Membership from $X/month" comes from the
// venue's business's membership_plans, and the Member / "Pay on your first
// visit" tag from my_gym_memberships(). Stage A4: the cover photo
// (gyms.cover_url) and logo (gyms.logo_url, else business_profiles.logo_url),
// each falling back to the tint / initials when missing or not loadable.
// Distances have no data yet. An empty table is a state, not a bug: the
// section says so.
//
// v6 MO1.4 / MO1.4.s: the tabs and the rail are one pinned group (S2) under
// Marketplace's fixed header; the class card is the shared ClassCard
// (components/marketplace, also the gym page's Classes tab); 0.5px hairlines
// (X-09); 12-hour date block (V6-148); "Under $15" strictly less (V6-148);
// errors as our own line with Retry. Distances stay BACKEND (PB-O-50, B9).

const priceCeilings = [
  { label: "Any price", value: null },
  { label: "Free", value: 0 },
  { label: "Under $15", value: 15 },
  { label: "Under $30", value: 30 },
];

type Tab = "classes" | "businesses" | "gyms";
const TABS: { key: Tab; label: string }[] = [
  { key: "classes", label: "Classes" },
  { key: "businesses", label: "Businesses" },
  { key: "gyms", label: "Gyms" },
];

/** MO1.4 #28: the pinned group's top spacer (border-top 9.9), which slides under the header once pinned (MO1.4.s #6). */
const PIN_SPACER = 9.9;

export default function Discover({ onPinnedChange }: { onPinnedChange?: (pinned: boolean) => void } = {}) {
  const { authUserId, profileReady } = useApp();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const [classes, setClasses] = useState<MarketplaceClass[]>([]);
  const [venues, setVenues] = useState<MarketplaceVenue[]>([]);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [gyms, setGyms] = useState<Venue[]>([]);
  const [gymPlans, setGymPlans] = useState<VenuePlan[]>([]);
  const [gymMemberships, setGymMemberships] = useState<GymMembership[]>([]);
  const [loading, setLoading] = useState(true);
  // K15 / O-ERR / O-OFF: one line per tab, our own words.
  const [errors, setErrors] = useState<Partial<Record<Tab, string>>>({});
  const [reload, setReload] = useState(0);

  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  // The tab lives in the URL (K9), so coming back from a business's page
  // lands on Businesses again rather than on Classes.
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "businesses" ? "businesses" : params.get("tab") === "gyms" ? "gyms" : "classes";
  const [businessType, setBusinessType] = useState<string | null>(null);
  const dark = useIsDark();
  // S7 / S8: the card and Book open the class page.
  const openClass = (c: MarketplaceClass) => navigate(`/app/marketplace/class?id=${encodeURIComponent(c.classId)}`);

  useEffect(() => {
    if (!profileReady) return;
    let cancelled = false;
    void (async () => {
      const [cls, vns, mine, gyms, memberships] = await Promise.all([
        fetchMarketplaceClasses(),
        fetchMarketplaceVenues(),
        fetchMyBookedClassIds(),
        fetchVenues(),
        fetchMyGymMemberships(),
      ]);
      if (cancelled) return;
      const offline = isOffline();
      const failed = (what: string) => (offline ? "You're offline. Showing what was loaded." : `Couldn't load ${what}.`);
      const next: Partial<Record<Tab, string>> = {};
      if (gyms.ok) {
        setGyms(gyms.value);
        const plans = await fetchPlansFor(gyms.value.flatMap((g) => (g.businessId ? [g.businessId] : [])));
        if (cancelled) return;
        if (plans.ok) setGymPlans(plans.value);
      } else next.gyms = failed("gyms");
      if (memberships.ok) setGymMemberships(memberships.value);
      if (cls.ok) {
        setClasses(cls.classes);
        setBooked(mine);
      } else next.classes = failed("classes");
      if (vns.ok) setVenues(vns.venues);
      else next.businesses = failed("businesses");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return classes.filter((c) => {
      // V6-148: "Under $15" is strictly less; "Free" keeps free classes only
      // (a free class has a null price).
      const price = c.priceValue ?? 0;
      if (maxPrice === 0 && price !== 0) return false;
      if (maxPrice !== null && maxPrice > 0 && !(price < maxPrice)) return false;
      if (!q) return true;
      // K11: title, business, location and the class type.
      return [c.title, c.businessName, c.location ?? "", c.classType ?? ""].some((f) => f.toLowerCase().includes(q));
    });
  }, [classes, query, maxPrice]);

  const businesses = venues.filter((v) => v.kind === "business");
  // MO1.4.1's sub-tabs, plus any other business type actually listed, except
  // a gym (gyms have their own tab; a gym-type business still shows under All).
  const businessTypes = useMemo(() => {
    const present = [...new Set(businesses.map((b) => b.venueType))].filter(
      (t) => t !== "gym" && !BUSINESS_TYPES.some((x) => x.key === t)
    );
    return [...BUSINESS_TYPES, ...present.map((t) => ({ key: t, label: typeLabel(t) }))];
  }, [businesses]);
  const shownBusinesses = businessType ? businesses.filter((b) => b.venueType === businessType) : businesses;

  // ---- S2: the two-step pin. The header (Marketplace's FixedHeader) pins
  // first; this group (tabs + rail) pins directly under it once the points
  // card and search have scrolled away. Its 9.9 top spacer slides under the
  // header, so the tabs meet the header with no gap and no hairline; the one
  // hairline then sits under the rail. Detected with a sentinel (no scroll
  // math). O2 (Larger text): if header + group would pass 40% of the
  // viewport, only the header pins.
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
      io = new IntersectionObserver(
        ([entry]) => setPinned(!entry.isIntersecting && entry.boundingClientRect.top < top + 1),
        { rootMargin: `${-Math.round(top)}px 0px 0px 0px`, threshold: [0, 1] }
      );
      io.observe(sentinel);
    };
    observe();
    // The header publishes its measured bottom on <html> (Larger text, rotation).
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

  // MO1.4.s O1: switching tab while pinned keeps the pin and brings the new
  // list to its top under the fixed area (no jump to the page top).
  const setTab = (t: Tab) => {
    const wasStuck = stuck;
    setParams(t === "classes" ? {} : { tab: t }, { replace: true });
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

  /** MO1.4 #32-#36 (and K12's type rail): FO3 sub-tabs, 32 in a 40 rail. */
  const subTabs = (items: { key: string; label: string }[], activeKey: string, onChange: (k: string) => void, label: string) => (
    <div className="mt-2.5" role="group" aria-label={label}>
      <SegmentedTabs
        scroll
        items={items}
        activeKey={activeKey}
        onChange={onChange}
        labelSize={12}
        tabHeight={32}
        // #33-#36: natural width, 14 each side, r9, idle 600.
        idleWeight={600}
        scrollTabPadding="0 14px"
        scrollMinWidth={0}
        tabRadius={9}
        // #32: pad 4, gap 4, r12, #F4F3F9 (dark #242730: the drawn #F4F3F9* is a light leak, V6-93).
        trackStyle={{ padding: 4, gap: 4, borderRadius: 12, background: dark ? "rgb(var(--c-seg-track))" : "rgb(var(--th-f4f3f9))" }}
        // #33: active #9A8CD6 with white (High contrast #5B48B8 through
        // --c-fill-pinned; dark #A991FE with #0D0B1A, the SegmentedTabs
        // default); idle transparent #5B5349 / #B8B3C7 (#34).
        light={{ activeFill: "rgb(var(--c-fill-pinned))", activeInk: "#FFFFFF", idleFill: "transparent", idleInk: "rgb(var(--c-charcoal-soft))" }}
        idleFillDark="transparent"
        idleInkDark="rgb(var(--c-charcoal-soft))"
      />
    </div>
  );

  const error = errors[tab] ?? null;

  return (
    <div className="mb-6">
      {/* #25-#27: borderless search 46 tall, r14, #F5F5F6 / #242730, Search 16
          at 14, the text at 38. 12 under the points card (its mb). */}
      <div className="relative mb-1">
        <Search size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search classes, places or a location"
          aria-label="Search classes, places or a location"
          className="w-full h-[46px] rounded-[14px] bg-cream-soft pl-[38px] pr-[14px] text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* #28 / MO1.4.s #6: the pin group, full bleed, 4 under the search plus
          its 9.9 top spacer (14 in all), holding the tabs and the rail. The
          spacer is see-through so, once pinned, it sits over the header's
          fill and the tabs meet the header's bottom edge. */}
      <div ref={sentinelRef} aria-hidden style={{ height: 1, marginBottom: -1 }} />
      <div
        ref={groupRef}
        data-pin-group=""
        data-pinned={stuck ? "true" : "false"}
        className={`${pinnable ? "sticky" : "relative"} z-20 -mx-4 px-4`}
        style={{ top: `calc(var(--fixed-header-bottom, 0px) - ${PIN_SPACER}px)`, paddingTop: PIN_SPACER }}
      >
        <div className="relative bg-cream -mx-4 px-4">
          {/* #29-#31: 40 tabs in a 52 track, 13/19.5 700; active #A79AD5
              white (High contrast #5B48B8; dark #A991FE / #0D0B1A); idle
              #6D50D3 on #F5F4FE; dark track and idle #303141 with #B7ABDE
              (the drawn #6D50D3* reads 2.2:1, V6-92 keeps the app ink). */}
          <SegmentedTabs
            items={TABS}
            activeKey={tab}
            onChange={(k) => setTab(k as Tab)}
            labelSize={13}
            tabHeight={40}
            darkTone="partB"
            idleInkDark="rgb(var(--th-b7abde))"
          />
          {tab === "classes" &&
            subTabs(
              priceCeilings.map((p) => ({ key: String(p.value), label: p.label })),
              String(maxPrice),
              (k) => setMaxPrice(k === "null" ? null : Number(k)),
              "Price"
            )}
          {tab === "businesses" &&
            subTabs([{ key: "", label: "All" }, ...businessTypes], businessType ?? "", (k) => setBusinessType(k || null), "Business type")}
          {/* S1 / S2: the one hairline, under the rail (or the tabs on Gyms)
              once the group is pinned; 120 ms, none under Reduce motion. */}
          <span
            aria-hidden
            data-pin-hairline=""
            className="absolute inset-x-0 -bottom-px h-px bg-hair-08 dark:bg-hair-10 pointer-events-none"
            style={{ opacity: stuck ? 1 : 0, transition: reduced ? "none" : "opacity 120ms ease" }}
          />
        </div>
      </div>

      {/* K15 / O-ERR / O-OFF (OURS): under the tabs, in the content (not
          pinned); what was loaded stays listed. */}
      {error && <RetryLine className="mt-2.5" message={error} onRetry={retry} />}

      {tab === "classes" && (
        // 14 from the rail to the first card; cards 10 apart (#37).
        <div className="space-y-2.5 mt-[14px]">
          {filtered.map((c) => (
            <ClassCard key={c.classId} c={c} booked={booked.has(c.classId)} onOpen={openClass} />
          ))}

          {/* K14 / O-EMPTY: no classes, or none matching the filters. */}
          {filtered.length === 0 && !loading && !errors.classes && (
            classes.length === 0 ? (
              <ExploreEmptyState icon={<CalendarDays size={24} strokeWidth={1.75} />} title="No classes yet" body="Classes from gyms and studios near you will show here." />
            ) : (
              <ExploreEmptyState
                icon={<CalendarDays size={24} strokeWidth={1.75} />}
                title="No classes match"
                body={query.trim() ? "Try another price or search." : "Try another price."}
              />
            )
          )}
        </div>
      )}

      {tab === "businesses" && (
        <div className="space-y-2.5 mt-[14px]">
          {shownBusinesses.map((v) => (
            // K12: the row opens the business's page; 0.5px hairline; the
            // initials tile and type line in #7D67D9 / #9A8CD6.
            <button
              key={v.venueId}
              type="button"
              onClick={() => navigate(`/app/marketplace/business?id=${encodeURIComponent(v.venueId)}`)}
              className="tap w-full text-left rounded-[18px] bg-cream-card border-[0.5px] border-hair-08 p-3 flex items-center gap-3 animate-fade-slide-up"
            >
              <span className="w-12 h-12 rounded-[14px] bg-primary-pale flex items-center justify-center shrink-0 text-[15px] font-extrabold text-th-7d67d9 dark:text-primary-accent">
                {initials(v.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-charcoal truncate">{v.name}</span>
                <span className="block text-[12px] font-semibold text-th-7d67d9 dark:text-primary-accent truncate">{typeLabel(v.venueType)}</span>
                {v.location && <span className="block text-[11.5px] text-charcoal-faint truncate">{v.location}</span>}
              </span>
              <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-charcoal-faint" aria-hidden />
            </button>
          ))}
          {shownBusinesses.length === 0 && !loading && !errors.businesses && (
            businesses.length === 0 ? (
              <ExploreEmptyState icon={<Store size={24} strokeWidth={1.75} />} title="No businesses yet" body="Shops and studios near you will show here." />
            ) : (
              <ExploreEmptyState icon={<Store size={24} strokeWidth={1.75} />} title="None of this kind yet" body="Try another type, or All." />
            )
          )}
        </div>
      )}

      {tab === "gyms" && (
        <div className="space-y-2.5 mt-[14px]">
          {gyms.map((v) => {
            const from = v.businessId ? membershipFromLine(gymPlans.filter((p) => p.businessId === v.businessId)) : null;
            const mine = currentMembership(gymMemberships, v.id);
            const tag = mine ? memberTag(mine.passState) : null;
            return (
              // K13: the card opens the gym page; 0.5px hairline; cover (A4)
              // or the tint with the logo / initials; the Member tag on the
              // cover; "Membership from $X/month" #7D67D9 / #9A8CD6.
              <button
                key={v.id}
                type="button"
                onClick={() => navigate(`/app/marketplace/gym?id=${encodeURIComponent(v.id)}`)}
                className="tap block w-full text-left rounded-[18px] bg-cream-card border-[0.5px] border-hair-08 overflow-hidden animate-fade-slide-up"
              >
                <span className="relative h-[84px] bg-primary-pale flex items-center justify-center overflow-hidden">
                  <VenueImage
                    srcs={[v.coverUrl]}
                    className="absolute inset-0 w-full h-full"
                    fallback={
                      <span className="relative w-11 h-11 rounded-[12px] overflow-hidden bg-cream-card flex items-center justify-center text-[14px] font-extrabold text-th-7d67d9 dark:text-primary-accent">
                        <VenueImage srcs={v.logoUrls} className="absolute inset-0 w-full h-full" fallback={initials(v.name)} />
                      </span>
                    }
                  />
                  {tag && <MemberTag label={tag.label} tone={tag.tone} className="absolute top-2.5 right-2.5" />}
                </span>
                <span className="px-4 py-3 flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold text-charcoal truncate">{v.name}</span>
                    {v.location && <span className="block text-[11.5px] text-charcoal-faint truncate">{v.location}</span>}
                    {from && <span className="block text-[12.5px] font-bold text-th-7d67d9 dark:text-primary-accent truncate">{from}</span>}
                  </span>
                  <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-charcoal-faint" aria-hidden />
                </span>
              </button>
            );
          })}
          {gyms.length === 0 && !loading && !errors.gyms && (
            <ExploreEmptyState icon={<Dumbbell size={24} strokeWidth={1.75} />} title="No gyms yet" body="Gyms near you will show here." />
          )}
        </div>
      )}

      {/* K16 / O-LOAD: skeletons where the cards will be (class 117, business
          81, gym 172), #F5F5F6 / #242730, pulse 1.2 s, static under Reduce
          motion (X-32). */}
      {loading && (
        <div className="space-y-2.5 mt-[14px]" aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="animate-skeleton-pulse rounded-[18px] bg-cream-soft"
              style={{ height: tab === "gyms" ? 172 : tab === "businesses" ? 81 : 117 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
