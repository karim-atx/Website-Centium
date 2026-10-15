import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useBusiness } from "../../components/business-more/useBusiness";
import type { BizKind } from "../../components/business-more/kind";
import { useMyVenues } from "../../hooks/useMyVenues";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import type { ConsolePermission } from "../../services/business-console";
import { useBusinessNavKind } from "../../components/navigation/useBusinessNavKind";
import { useBusinessClasses, useBusinessDiscounts, useBusinessOfferings, useMembershipPlans } from "../../hooks/useBusinessCatalog";
import type { BusinessFull } from "../../services/business-more";
import { fetchPolicy, fetchStoreSettings, type StoreSettings } from "../../services/business-more";
import { fetchClassBookings, fetchInstructors } from "../../services/business-classes";
import { fetchHoursTable } from "../../services/venues/console";
import type { GymHoursTableRow, MyVenue } from "../../services/venues/consoleLogic";
import {
  ALL_PENDING,
  fetchFeaturePrice,
  fetchPerk,
  probeMarketBackend,
  type FeaturePrice,
  type MarketBackend,
} from "../../services/business-market";
import { fetchBusinessPhotos, fetchStrength, fetchVenueDetails, type VenueDetails } from "../../services/business-market/listing";
import type { BusinessPhoto, ServerStrength } from "../../services/business-market/listingLogic";
import { useMarketPalette } from "./kit";
import type { MarketPalette } from "./palette";
import { vocabOf, type Vocab } from "./vocab";

// One load for the four MA1 tabs (and the Store Products sub-tabs): the B5
// business row, the perk, the venue and its hours, the catalog hooks, the
// class bookings, and the B13 / B7 probes. Mounted once per page so switching
// tabs never reloads.

export interface MarketData {
  c: MarketPalette;
  kind: BizKind;
  kindKnown: boolean;
  v: Vocab;
  business: BusinessFull | null;
  setBusiness: (b: BusinessFull) => void;
  loading: boolean;
  error: string | null;
  reload: () => void;
  perk: string | null;
  setPerk: (p: string | null) => void;
  venue: MyVenue | null;
  /**
   * The business's owner. Since B7 this is only what stays the owner's:
   * business_profiles writes (Show on Explore, categories, perk, the cover
   * and logo). Everything else asks `can`.
   */
  isOwner: boolean;
  /** B7 business_can(): marketing (offerings, discounts, promotions), schedule (opening hours), … */
  can: (p: ConsolePermission) => boolean;
  hours: GymHoursTableRow[] | null;
  setHours: (rows: GymHoursTableRow[]) => void;
  discounts: ReturnType<typeof useBusinessDiscounts>;
  offerings: ReturnType<typeof useBusinessOfferings>;
  plans: ReturnType<typeof useMembershipPlans>;
  classes: ReturnType<typeof useBusinessClasses>;
  /** Bookings per class id (all of this business's classes). Null while loading or after a failed read. */
  booked: Map<string, number> | null;
  /** Instructor first names by professional id. */
  instructors: Map<string, string>;
  backend: MarketBackend;
  /** B13 listing_strength() done flags; null when absent or not readable (the client derivation stands). */
  strength: ServerStrength | null;
  refreshStrength: () => void;
  /** B13 gyms.amenities / first_visit of the selected venue; null until read (or absent). */
  details: VenueDetails | null;
  setDetails: (d: VenueDetails) => void;
  /** B13 business_photos, every status (the business sees all of its own); null until read (or absent). */
  photos: BusinessPhoto[] | null;
  setPhotos: (p: BusinessPhoto[]) => void;
  featurePrice: FeaturePrice | null;
  store: StoreSettings | null;
  returnsSet: boolean;
  /** Paths for this type: Marketplace for Classes / Gym, Products for Store. */
  base: string;
  tabHref: (tab: "listing" | "spots" | "perf" | "promo") => string;
}

const Ctx = createContext<MarketData | null>(null);

export function useMarket(): MarketData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMarket outside MarketProvider");
  return v;
}

export function MarketProvider({ children, forceKind }: { children: React.ReactNode; forceKind?: BizKind }) {
  const { authUserId } = useApp();
  const c = useMarketPalette();
  const biz = useBusiness();
  // The lane: the forced one (Store Products), else the loaded row, else the
  // navbar's answer (it never falls back to a stale onboarding type).
  const nav = useBusinessNavKind();
  const navKind: BizKind | null = nav === "store" || nav === "appointments" ? "store" : nav === "gym" ? "gym" : nav === "classes" ? "classes" : null;
  const kind: BizKind = forceKind ?? (biz.business ? biz.kind : navKind ?? biz.kind);
  const { venues, selected } = useMyVenues();
  const access = useConsoleAccess();
  const discounts = useBusinessDiscounts();
  const offerings = useBusinessOfferings();
  const plans = useMembershipPlans();
  const classes = useBusinessClasses();
  const businessId = biz.business?.id ?? null;
  const owner = !!biz.business && biz.business.ownerId === authUserId;

  const venue = useMemo(() => {
    if (!businessId) return null;
    const mine = venues.filter((x) => x.businessId === businessId);
    return mine.find((x) => x.gymId === selected?.gymId) ?? mine[0] ?? null;
  }, [venues, selected, businessId]);

  const [perk, setPerk] = useState<string | null>(null);
  const [hours, setHours] = useState<GymHoursTableRow[] | null>(null);
  const [booked, setBooked] = useState<Map<string, number> | null>(null);
  const [instructors, setInstructors] = useState<Map<string, string>>(new Map());
  const [backend, setBackend] = useState<MarketBackend>(ALL_PENDING);
  const [featurePrice, setFeaturePrice] = useState<FeaturePrice | null>(null);
  const [strength, setStrength] = useState<ServerStrength | null>(null);
  const [details, setDetails] = useState<VenueDetails | null>(null);
  const [photos, setPhotos] = useState<BusinessPhoto[] | null>(null);
  const [strengthTick, setStrengthTick] = useState(0);
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [returnsSet, setReturnsSet] = useState(false);
  const [extraError, setExtraError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    void (async () => {
      const [p, probes] = await Promise.all([fetchPerk(businessId), probeMarketBackend(businessId)]);
      if (!alive) return;
      if (p.ok) setPerk(p.value);
      else setExtraError(p.message);
      setBackend(probes);
      if (probes.photos === "live") {
        const ph = await fetchBusinessPhotos(businessId);
        if (alive && ph.ok) setPhotos(ph.value);
      }
      if (probes.featurePrices === "live") {
        const price = await fetchFeaturePrice(vocabOf(kind).featureArea);
        if (alive) setFeaturePrice(price);
      }
      if (kind === "store") {
        const [s, r] = await Promise.all([fetchStoreSettings(businessId), fetchPolicy(businessId, "returns")]);
        if (!alive) return;
        if (s.ok) setStore(s.value);
        setReturnsSet((r.ok && r.value.currentVersion !== null) || (s.ok && !!s.value.returnsPolicy?.trim()));
      }
      const team = await fetchInstructors(businessId);
      if (alive && team.ok) setInstructors(new Map(team.instructors.map((i) => [i.professionalId, i.firstName])));
    })();
    return () => {
      alive = false;
    };
  }, [businessId, kind, tick]);

  const gymId = venue?.gymId ?? null;
  useEffect(() => {
    if (!gymId) return;
    let alive = true;
    void fetchHoursTable(gymId).then((r) => {
      if (alive && r.ok) setHours(r.value);
    });
    return () => {
      alive = false;
    };
  }, [gymId, tick]);

  const detailsLive = backend.details === "live";
  useEffect(() => {
    if (!gymId || !detailsLive) return;
    let alive = true;
    void fetchVenueDetails(gymId).then((r) => {
      if (alive && r.ok) setDetails(r.value);
    });
    return () => {
      alive = false;
    };
  }, [gymId, detailsLive, tick]);

  // listing_strength() is derived on the server: re-read after any listing
  // change (refreshStrength). Absent or refused = null.
  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    void fetchStrength(businessId).then((r) => {
      if (alive) setStrength(r.ok ? r.value : null);
    });
    return () => {
      alive = false;
    };
  }, [businessId, tick, strengthTick]);
  const refreshStrength = useCallback(() => setStrengthTick((t) => t + 1), []);

  const classIds = useMemo(() => classes.classes.map((x) => x.id).join(","), [classes.classes]);
  useEffect(() => {
    if (!classIds) return;
    let alive = true;
    void fetchClassBookings(classIds.split(",")).then((r) => {
      if (!alive) return;
      if (!r.ok) {
        setBooked(null);
        return;
      }
      const m = new Map<string, number>();
      for (const b of r.bookings) m.set(b.classId, (m.get(b.classId) ?? 0) + 1);
      setBooked(m);
    });
    return () => {
      alive = false;
    };
  }, [classIds, tick]);

  const reload = useCallback(() => {
    setExtraError(null);
    biz.reload();
    setTick((t) => t + 1);
  }, [biz]);

  const base = kind === "store" ? "/app/business/products" : "/app/business/marketplace";
  const tabHref = useCallback(
    (tab: "listing" | "spots" | "perf" | "promo") => {
      if (kind === "store") return `${base}?tab=${tab === "perf" ? "performance" : tab === "promo" ? "promotions" : "listing"}`;
      return tab === "listing" ? base : `${base}?tab=${tab}`;
    },
    [kind, base]
  );

  const value: MarketData = {
    c,
    kind,
    // Known from the forced lane, the row, the navbar's row-based answer, or
    // (no row yet) the onboarding type `kind` already falls back to. Until
    // then `kind` is bizKindOf's "store" fallback and pages hold their
    // per-type wording.
    kindKnown: !!forceKind || !!biz.business || !!navKind || biz.kindKnown,
    v: vocabOf(kind),
    business: biz.business,
    setBusiness: biz.setBusiness,
    loading: biz.loading && !biz.business,
    error: (!biz.business && biz.error) || extraError,
    reload,
    perk,
    setPerk,
    venue,
    isOwner: owner,
    // A business account before its row exists is its own owner-to-be; the
    // writes then fail on the missing business, as before.
    can: (p: ConsolePermission) => owner || access.can(p),
    hours,
    setHours,
    discounts,
    offerings,
    plans,
    classes,
    booked: classIds ? booked : new Map(),
    instructors,
    backend,
    strength,
    refreshStrength,
    details,
    setDetails,
    photos,
    setPhotos,
    featurePrice,
    store,
    returnsSet,
    base,
    tabHref,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
