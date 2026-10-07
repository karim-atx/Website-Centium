import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LocateFixed, LogIn, MapPin } from "lucide-react";
import { Button } from "../ui/Button";
import { BottomSheet } from "../ui/BottomSheet";
import { AreaPicker } from "./AreaPicker";
import { DirectoryCard } from "./DirectoryCard";
import { initials, pinGround, typeColours } from "./typeColour";
import { SUBTYPE_SINGULAR } from "./subtypeLabels";
import type { MapPin as Pin } from "./NearbyMap";
import type { DirectoryListing } from "../../services/directory";
import { fetchNearby, type NearbyCursor, type NearbyProfessional } from "../../services/nearby";
import {
  coarsePoint,
  describeDistance,
  distanceKm,
  groupByPoint,
  locationPermission,
  requestPosition,
  saveArea,
  savedArea,
  type Coords,
} from "../../services/geo";
import type { Area } from "../../services/geo/areas";

// MapLibre is only downloaded here, when the map is opened.
const NearbyMap = lazy(() => import("./NearbyMap"));

type Origin = { coords: Coords; label: string; source: "device" | "area"; areaId?: string };

/** Search radii, so a small pan or zoom does not count as a new search. */
const RADII = [5, 10, 25, 50, 100];
const radiusBucket = (km: number) => RADII.find((r) => r >= km) ?? 100;
const SEARCH_DEBOUNCE_MS = 900;
/**
 * Pages fetched per search, at most. The server orders by distance BAND and
 * then by id, so within a band a later page can hold someone nearer than this
 * one; nearest-first is only right once the whole result is in. Each page is
 * one of the 60 searches an hour, so a busy area stops here and says so.
 */
const MAX_PAGES = 4;

/**
 * Professionals → Map (Task F).
 *
 * LOCATION IS ASKED FOR ONLY HERE, after the user chose Map. The permission is
 * checked silently first; if it is not already granted the user is told why
 * and offered "Use my location" or "Choose an area". A refusal, a timeout or
 * no location service lead to the area picker. There is no default position.
 *
 * WHAT LEAVES THE DEVICE: a point rounded to one decimal place, sent to
 * professionals_in_area. The user's position is never stored on the server; a
 * chosen AREA is remembered on this device only.
 *
 * DISTANCES ARE COMPUTED HERE, from the user's position (or the chosen area's
 * centre) to each professional's approximate area (~1 km), and the list is
 * sorted nearest first. The server's distance bands are not shown.
 *
 * MO1.2.2 (R12): a 560-tall map with avatar pins and a recentre button, and a
 * floating card over its foot that swipes between the professionals nearest
 * first; tapping a count pin loads its members into the card (B20).
 * Handover-complete pass: nothing is drawn around the map any more. The
 * "Change area" row, the "N of M nearby" counter, the
 * "You are here" dot, the visible nearest-first list, "Not on the map nearby"
 * and the too-many-results note are gone. The nearest-first list stays as the
 * map's screen-reader and keyboard alternative, visually hidden until a link
 * in it takes focus. Restore round 2 (user, 2026-10-07): the floating card's
 * distance pill is back, as on main. Another area: the recentre button runs "Use my
 * location", and where that is refused or unavailable it opens the area
 * picker, as before.
 *
 * SEARCHES are kept well inside the database's 60-an-hour limit: one on
 * opening, then one only when the visible area moves to a different coarse
 * cell or a larger radius (debounced), and never twice for the same cell.
 */
export const NearbyView: React.FC<{
  authUserId: string | null;
  dark: boolean;
  subtype: DirectoryListing["subtype"];
}> = ({ authUserId, dark, subtype }) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"checking" | "ask" | "locating" | "ready">("checking");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [found, setFound] = useState<Map<string, NearbyProfessional>>(new Map());
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  /** A search stopped at MAX_PAGES: the order past what loaded may be off. */
  const [truncated, setTruncated] = useState(false);
  /** The card strip's members when a count pin was tapped; null = everyone nearby. */
  const [cardSet, setCardSet] = useState<string[] | null>(null);
  /** Which card the strip is showing. */
  const [active, setActive] = useState(0);
  const strip = useRef<HTMLDivElement | null>(null);
  /** The largest radius already searched around each coarse point. */
  const searched = useRef<Map<string, number>>(new Map());
  const timer = useRef<number | undefined>(undefined);

  // On opening: a silent permission check. Granted → find the position;
  // a remembered area → use it; otherwise explain and ask.
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void (async () => {
      const state = await locationPermission();
      if (cancelled) return;
      if (state === "granted") {
        await locateMe();
        return;
      }
      const remembered = savedArea();
      if (remembered) {
        chooseArea(remembered);
        return;
      }
      setPhase("ask");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId]);

  async function locateMe() {
    setLocError(null);
    setPhase("locating");
    const r = await requestPosition();
    if (r.ok) {
      setOrigin({ coords: r.coords, label: "your location", source: "device" });
      setPhase("ready");
      return;
    }
    // Refused, timed out or unavailable: say so, and offer areas instead.
    setLocError(r.message);
    setPhase("ask");
    setPickerOpen(true);
  }

  function chooseArea(area: Area) {
    saveArea(area.id);
    setOrigin({ coords: { lat: area.lat, lng: area.lng }, label: area.name, source: "area", areaId: area.id });
    setPickerOpen(false);
    setLocError(null);
    setPhase("ready");
  }

  // Never twice for the same coarse point, and never for a smaller radius
  // than one already searched there: those results are already in hand.
  const search = async (center: Coords, radiusKm: number) => {
    const point = coarsePoint(center);
    const radius = radiusBucket(radiusKm);
    const key = `${point.lat},${point.lng}`;
    const before = searched.current.get(key);
    if (before !== undefined && before >= radius) return;
    searched.current.set(key, radius);
    setSearching(true);
    // EVERY PAGE BEFORE ANY OF IT IS SHOWN, so the local nearest-first sort
    // is over a complete result rather than a partial one.
    const all: NearbyProfessional[] = [];
    let cursor: NearbyCursor | undefined;
    let pages = 0;
    let failure: { message: string; rateLimited?: boolean } | null = null;
    do {
      const r = await fetchNearby(point, radius, cursor);
      pages += 1;
      if (!r.ok) {
        failure = r;
        break;
      }
      all.push(...r.professionals);
      cursor = r.next ?? undefined;
    } while (cursor && pages < MAX_PAGES);
    setSearching(false);
    if (failure && all.length === 0) {
      setSearchError(failure.message);
      if (!failure.rateLimited) {
        if (before === undefined) searched.current.delete(key);
        else searched.current.set(key, before);
      }
      return;
    }
    setSearchError(failure ? failure.message : null);
    // Stopped early (page cap, or a later page failed): the tail is incomplete.
    if (cursor || failure) setTruncated(true);
    setFound((prev) => {
      const next = new Map(prev);
      for (const p of all) next.set(p.profileId, p);
      return next;
    });
  };

  // The first search, once there is an origin.
  useEffect(() => {
    if (origin) void search(origin.coords, 25);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.coords.lat, origin?.coords.lng]);

  const onViewChange = (center: Coords, radiusKm: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void search(center, radiusKm), SEARCH_DEBOUNCE_MS);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Nearest first, measured here.
  const nearby = useMemo(() => {
    if (!origin) return [];
    return [...found.values()]
      .filter((p) => !subtype || p.subtype === subtype)
      .map((p) => ({ p, km: distanceKm(origin.coords, { lat: p.lat, lng: p.lng }) }))
      .sort((a, b) => a.km - b.km);
  }, [found, origin, subtype]);

  const distanceOf = (p: NearbyProfessional) =>
    origin ? describeDistance(distanceKm(origin.coords, { lat: p.lat, lng: p.lng })) : "";
  const placeOf = (p: NearbyProfessional) => (p.areaLabel ? ` · near ${p.areaLabel}` : "");

  const groups = useMemo(() => groupByPoint(nearby.map((n) => ({ ...n.p, lat: n.p.lat, lng: n.p.lng }))), [nearby]);
  const keyOf = (lat: number, lng: number) => `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cards = cardSet ? nearby.filter((n) => cardSet.includes(n.p.profileId)) : nearby;
  const current = cards[Math.min(active, cards.length - 1)]?.p;
  const currentKey = current ? groups.find((g) => g.items.some((i) => i.profileId === current.profileId)) : undefined;
  const pins: Pin[] = groups.map((g) => {
    const first = g.items[0];
    const label =
      g.items.length === 1
        ? `${first.name}, ${first.subtype ? SUBTYPE_SINGULAR[first.subtype] : "professional"}, ${distanceOf(first)}`
        : `${g.items.length} professionals${first.areaLabel ? ` near ${first.areaLabel}` : " here"}, ${distanceOf(first)}`;
    const t = typeColours(first.subtype, dark);
    return {
      key: keyOf(g.lat, g.lng),
      lat: g.lat,
      lng: g.lng,
      count: g.items.length,
      label,
      face: { avatarUrl: first.avatarUrl, initials: initials(first.name), ring: t.main, fill: pinGround(first.subtype, dark), ink: t.deep },
      selected: currentKey === g,
    };
  });

  /** Brings card `i` into view, without animating when `instant`. */
  const showCard = (i: number, instant = false) => {
    setActive(i);
    const el = strip.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: instant ? "auto" : "smooth" });
  };
  // A pin: one professional moves the strip to them among everyone nearby;
  // several load just them, first one showing.
  const onSelectPin = (key: string) => {
    const g = groups.find((x) => keyOf(x.lat, x.lng) === key);
    if (!g) return;
    if (g.items.length > 1) {
      setCardSet(g.items.map((i) => i.profileId));
      window.setTimeout(() => showCard(0, true), 0);
      return;
    }
    setCardSet(null);
    const i = nearby.findIndex((n) => n.p.profileId === g.items[0].profileId);
    window.setTimeout(() => showCard(Math.max(0, i)), 0);
  };

  // Foundations › Empty state: a 56 primary.tint tile with a 26 thin-stroke
  // icon in primary.accent, title 15/700, one line 12.5/500 muted, max 260.
  const emptyState = (icon: React.ReactNode, title: string, line: string, extra?: React.ReactNode) => (
    <div className="flex flex-col items-center text-center py-8">
      <span className="w-14 h-14 rounded-2xl bg-th-f0edf9 dark:bg-primary/15 flex items-center justify-center text-th-7d67d9 dark:text-primary-accent">
        {icon}
      </span>
      <p className="text-[15px] font-bold text-charcoal mt-3">{title}</p>
      <p className="text-[12.5px] font-medium text-charcoal-faint mt-1 leading-relaxed max-w-[260px]">{line}</p>
      {extra}
    </div>
  );

  if (!authUserId) {
    // An account state the frame doesn't draw: the Foundations empty state
    // with the Sign in button under it (handover-complete pass, no card).
    return emptyState(
      <LogIn size={26} strokeWidth={1.5} aria-hidden />,
      "Sign in to see professionals near you",
      "The list of professionals stays open to everyone.",
      <Button size="sm" className="mt-3" onClick={() => navigate("/app/onboarding")}>
        Sign in
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {(phase === "checking" || phase === "locating") && (
        // MO1.2.2 States, Loading: a skeleton block where the map goes
        // (surface.soft, the map's 560 / r20).
        <div aria-busy="true">
          <span className="sr-only" role="status">
            {phase === "locating" ? "Finding your location…" : "Getting the map ready…"}
          </span>
          <div aria-hidden className="h-[560px] rounded-[20px] bg-cream-soft" />
        </div>
      )}

      {phase === "ask" &&
        // Decision 23 (kept-list 240): Foundations › Empty state; the two
        // actions and the location note (privacy: what leaves the device) are
        // kept under it.
        emptyState(
          <LocateFixed size={26} strokeWidth={1.5} aria-hidden />,
          "See professionals near you",
          "Use your location, or choose an area. Your location stays on this device: Centium only uses a rough area (about 10 km) to find who's nearby, and never saves it.",
          <>
            {locError && (
              <p role="alert" className="mt-3 w-full text-[12.5px] font-medium text-status-high">
                {locError}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4 w-full">
              <Button size="sm" onClick={() => void locateMe()}>
                <LocateFixed size={15} /> Use my location
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
                <MapPin size={15} /> Choose an area
              </Button>
            </div>
          </>
        )}

      {phase === "ready" && origin && (
        <>
          <div className="relative">
            <Suspense fallback={<div aria-hidden className="h-[560px] rounded-[20px] bg-cream-soft" />}>
              <NearbyMap
                center={origin.coords}
                zoom={12}
                dark={dark}
                pins={pins}
                onSelectPin={onSelectPin}
                onViewChange={onViewChange}
                onRecentre={() => void locateMe()}
                // MO1.2.2 #4: 358 × 560, r20, no visible border.
                className="h-[560px] rounded-[20px] overflow-hidden"
                ariaLabel={`Map of professionals near ${origin.label}. A list of the same results follows.`}
              />
            </Suspense>
            {/* THE FLOATING CARD (MO1.2.2): swipe for the next nearest; it is a
                scroll-snap strip, so a keyboard or a mouse wheel moves it too. */}
            {cards.length > 0 && (
              // MO1.2.2 #10: 358 wide, flush with the map's edges, its foot 40
              // above the map's (the tile credit line stays visible under it).
              <div className="absolute inset-x-0 bottom-10 z-[3]">
                {cards.length > 1 && (
                  <p className="sr-only" aria-live="polite">
                    {Math.min(active, cards.length - 1) + 1} of {cards.length}
                    {cardSet ? " here" : " nearby"}
                  </p>
                )}
                <div
                  ref={strip}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
                    if (i !== active) setActive(i);
                  }}
                  className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory py-2 -my-2"
                  aria-label="Professionals on the map, nearest first"
                >
                  {cards.map(({ p }) => (
                    <div key={p.profileId} className="w-full shrink-0 snap-center">
                      <DirectoryCard listing={p} distance={`${distanceOf(p)}${placeOf(p)}`} hideBio className="shadow-[0_6px_20px_rgba(36,31,27,0.14)]" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* States, Error: an inline line in danger under the map. */}
          {searchError && (
            <p role="alert" className="text-[12.5px] font-medium text-status-high text-center">
              {searchError}
            </p>
          )}
          {/* States, Empty: nobody nearby is not drawn; one muted line. */}
          {nearby.length === 0 && !searching && !searchError && (
            <p className="text-[12.5px] font-medium text-charcoal-faint text-center leading-relaxed">
              No professionals have shared an area near {origin.label} yet. Try zooming out.
            </p>
          )}

          {/* THE MAP'S ACCESSIBLE ALTERNATIVE: the same results as links,
              nearest first. Visually hidden (MO1.2.2 draws nothing under the
              map); a link that takes keyboard focus shows the list. */}
          <nav aria-label="Professionals near you, nearest first" className="sr-only focus-within:not-sr-only">
            <p role="status">
              {searching
                ? "Searching this area…"
                : `${nearby.length} near ${origin.label}${truncated ? ". Not all are shown here; zoom in for the nearest." : ""}`}
            </p>
            <ul className="flex flex-col gap-1 mt-1">
              {nearby.map(({ p }) => (
                <li key={p.profileId}>
                  <button
                    type="button"
                    onClick={() => navigate(`/app/professionals/${p.profileId}`)}
                    className="tap min-h-[44px] text-left text-[13px] font-semibold text-primary-deep-text"
                  >
                    {p.name}, {p.subtype ? SUBTYPE_SINGULAR[p.subtype] : "professional"}, {distanceOf(p)}
                    {placeOf(p)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}

      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose an area">
        <div className="animate-fade-slide-up">
          <AreaPicker selectedId={origin?.areaId} onPick={chooseArea} />
        </div>
      </BottomSheet>

    </div>
  );
};
