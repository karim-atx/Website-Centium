import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LocateFixed, MapPin } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { BottomSheet } from "../ui/BottomSheet";
import { AreaPicker } from "./AreaPicker";
import { DirectoryCard } from "./DirectoryCard";
import { initials, typeColours } from "./typeColour";
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
 * first; tapping a count pin loads its members into the card (B20). Below the
 * map, kept (B17): "Change area", the nearest-first list (also the map's
 * accessible alternative) and "Not on the map nearby".
 *
 * SEARCHES are kept well inside the database's 60-an-hour limit: one on
 * opening, then one only when the visible area moves to a different coarse
 * cell or a larger radius (debounced), and never twice for the same cell.
 */
export const NearbyView: React.FC<{
  authUserId: string | null;
  dark: boolean;
  subtype: DirectoryListing["subtype"];
  directory: DirectoryListing[];
}> = ({ authUserId, dark, subtype, directory }) => {
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

  // Listed professionals not on the map near here: either they have not
  // shared an area, or theirs is outside what has been searched. The database
  // cannot tell the two apart for us, so the label says both.
  const notOnMap = useMemo(() => {
    const shown = new Set(nearby.map((n) => n.p.profileId));
    return directory.filter((d) => (!subtype || d.subtype === subtype) && !shown.has(d.profileId));
  }, [directory, nearby, subtype]);

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
      face: { avatarUrl: first.avatarUrl, initials: initials(first.name), ring: t.main, fill: t.pill, ink: t.deep },
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

  if (!authUserId) {
    return (
      <Card className="text-center py-8">
        <p className="text-sm font-semibold text-charcoal">Sign in to see professionals near you</p>
        <p className="text-xs text-charcoal-faint mt-1">The list of professionals stays open to everyone.</p>
        <Button size="sm" className="mt-3" onClick={() => navigate("/app/onboarding")}>
          Sign in
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {(phase === "checking" || phase === "locating") && (
        <Card className="text-center py-8">
          <p className="text-sm text-charcoal-faint" role="status">
            {phase === "locating" ? "Finding your location…" : "Getting the map ready…"}
          </p>
        </Card>
      )}

      {phase === "ask" && (
        <Card className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-charcoal">See professionals near you</p>
          <p className="text-xs text-charcoal-soft leading-relaxed">
            Use your location, or choose an area. Your location stays on this device: Centium only uses a
            rough area (about 10 km) to find who's nearby, and never saves it.
          </p>
          {locError && <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3 py-2">{locError}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={() => void locateMe()}>
              <LocateFixed size={15} /> Use my location
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
              <MapPin size={15} /> Choose an area
            </Button>
          </div>
        </Card>
      )}

      {phase === "ready" && origin && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-charcoal-soft min-w-0 truncate">
              Near <span className="font-semibold text-charcoal">{origin.label}</span>
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="tap min-h-[44px] text-[13px] font-bold text-primary-deep-text shrink-0"
            >
              Change area
            </button>
          </div>
          <div className="relative">
            <Suspense
              fallback={<div className="h-[560px] rounded-[20px] bg-cream-soft flex items-center justify-center text-sm text-charcoal-faint">Loading map…</div>}
            >
              <NearbyMap
                center={origin.coords}
                zoom={origin.source === "device" ? 12 : 12}
                dark={dark}
                pins={pins}
                me={origin.coords}
                onSelectPin={onSelectPin}
                onViewChange={onViewChange}
                onRecentre={() => void locateMe()}
                className="h-[560px] rounded-[20px] overflow-hidden border border-charcoal/10"
                ariaLabel="Map of professionals near you. Use the list below for the same results."
              />
            </Suspense>
            {/* THE FLOATING CARD (MO1.2.2): swipe for the next nearest; it is a
                scroll-snap strip, so a keyboard or a mouse wheel moves it too. */}
            {cards.length > 0 && (
              // Sits above the tile credit line, which must stay visible.
              // MO1.2.2 #10: the card is 358 wide, flush with the map's edges.
              <div className="absolute inset-x-0 bottom-[30px] z-[3]">
                {cards.length > 1 && (
                  <p className="text-center text-[11px] font-semibold text-charcoal-soft mb-1" aria-live="polite">
                    <span className="inline-block rounded-full bg-cream-card/90 px-2 py-0.5 shadow-sm">
                      {Math.min(active, cards.length - 1) + 1} of {cards.length}
                      {cardSet ? " here" : " nearby"}
                    </span>
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
          {searchError && <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3 py-2">{searchError}</p>}
          {searching && <p className="text-xs text-charcoal-faint" role="status">Searching this area…</p>}
          {truncated && (
            <p className="text-xs text-charcoal-soft bg-cream-soft rounded-xl px-3 py-2">
              There are a lot of professionals around here, so not all are shown. Zoom in for the nearest.
            </p>
          )}

          <h2 className="section-label text-charcoal-soft mt-1">
            Nearest first{nearby.length > 0 ? ` · ${nearby.length}` : ""}
          </h2>
          {nearby.length === 0 && !searching && (
            <p className="text-sm text-charcoal-faint text-center py-4">
              No professionals have shared an area near {origin.label} yet. Try zooming out or another area.
            </p>
          )}
          <div className="space-y-3">
            {nearby.map(({ p }) => (
              <DirectoryCard key={p.profileId} listing={p} distance={`${distanceOf(p)}${placeOf(p)}`} />
            ))}
            {notOnMap.length > 0 && (
              <>
                <h2 className="section-label text-charcoal-soft pt-2">Not on the map nearby</h2>
                <p className="text-xs text-charcoal-faint -mt-2">
                  They haven't shared an area, or theirs is outside what you're looking at.
                </p>
                {notOnMap.map((d) => (
                  <DirectoryCard key={d.profileId} listing={d} distance={null} />
                ))}
              </>
            )}
          </div>
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
