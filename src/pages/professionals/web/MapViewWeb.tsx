import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, MapPin, Navigation } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import type { DirectoryListing } from "../../../services/directory";
import { fetchNearby, type NearbyCursor, type NearbyProfessional, type ReachedProfessional } from "../../../services/nearby";
import { countryNear, countryOfArea } from "../../../services/geo/country";
import { coarsePoint, describeDistance, distanceKm, groupByPoint, locationPermission, requestPosition, saveArea, savedArea, type Coords } from "../../../services/geo";
import type { Area } from "../../../services/geo/areas";
import type { MapPin as Pin } from "../../../components/professionals/NearbyMap";
import { AreaPicker } from "../../../components/professionals/AreaPicker";
import { initials, pinGround, typeColours } from "../../../components/professionals/typeColour";
import { SUBTYPE_SINGULAR } from "../../../components/professionals/subtypeLabels";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { abroadLabel, keptByWhere, type WhereChoice } from "../directoryFilterModel";
import { GoldStar, PrAvatar } from "./WebParts";
import { famOf, HAIR, prCaps, proHref, ratingShort } from "./prWebStyles";
import { t, tx } from "../../../i18n/core";

// MapLibre is only downloaded here, when the map is opened (as on mobile).
const NearbyMap = lazy(() => import("../../../components/professionals/NearbyMap"));

type Origin = { coords: Coords; label: string; source: "device" | "area"; areaId?: string };
type Row = { p: NearbyProfessional; km: number } | { p: ReachedProfessional; km: null };

const RADII = [5, 10, 25, 50, 100];
const radiusBucket = (km: number) => RADII.find((r) => r >= km) ?? 100;
const SEARCH_DEBOUNCE_MS = 900;
const MAX_PAGES = 4;

/**
 * Website viewport v1, WC-PR.2 Map (WC-PR Professionals Web v3, `isMap`): in
 * the list column the caps "Nearest first · {place}" and the 64 rows (r16,
 * 0.5px, padding 8 14: the 40 avatar, the name 15 700 in the family's deep,
 * the distance 13 #8C8378, the gold rating); in the profile's place the map
 * (r20, #EEF1F0, 0.5px) with the 44 round "Use my location" at 14 / 14. Not
 * located yet (location not shared, nothing remembered): the map card holds
 * the 56 white tile, "See professionals near you", its line and the two 40
 * buttons; "Choose an area" opens the area picker in the 440 side sheet.
 *
 * The behaviour is the mobile map's (NearbyView), ported whole: location is
 * asked for only here (a silent check first, then a remembered area), what
 * leaves the device is a point rounded to ~10 km, distances are measured here
 * and the list is nearest first, searches are debounced, never twice for the
 * same cell and at most 4 pages, the Distance / Where / Country choices and
 * the category apply, online professionals follow the pins, a pin selects its
 * row (a count pin its members), and a row opens the profile. The map itself
 * is the repo's NearbyMap (MapLibre, its own avatar pins).
 */
export const MapViewWeb: React.FC<{
  top: React.ReactNode;
  subtype: DirectoryListing["subtype"];
  maxKm: number | null;
  where: WhereChoice;
  anyCountry: boolean;
  listings: DirectoryListing[] | null;
}> = ({ top, subtype, maxKm, where, anyCountry, listings }) => {
  const navigate = useNavigate();
  const { authUserId } = useApp();
  const [phase, setPhase] = useState<"checking" | "ask" | "locating" | "ready">("checking");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [found, setFound] = useState<Map<string, NearbyProfessional>>(new Map());
  const [online, setOnline] = useState<Map<string, ReachedProfessional>>(new Map());
  const searcherCountry = origin ? (origin.source === "area" ? countryOfArea(origin.areaId ? { id: origin.areaId } : null) : countryNear(origin.coords)) : null;
  const countryOpts = useRef({ countryCode: searcherCountry, anyCountry });
  countryOpts.current = { countryCode: searcherCountry, anyCountry };
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [truncated, setTruncated] = useState(false);
  /** The rows a pin selected (one, or a count pin's members); null = none. */
  const [picked, setPicked] = useState<string[] | null>(null);
  const searched = useRef<Map<string, number>>(new Map());
  const timer = useRef<number | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);

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
      setOrigin({ coords: r.coords, label: t("your location"), source: "device" });
      setPhase("ready");
      return;
    }
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

  const search = async (center: Coords, radiusKm: number) => {
    const point = coarsePoint(center);
    const radius = radiusBucket(radiusKm);
    const key = `${point.lat},${point.lng}`;
    const before = searched.current.get(key);
    if (before !== undefined && before >= radius) return;
    searched.current.set(key, radius);
    setSearching(true);
    const all: NearbyProfessional[] = [];
    const remote: ReachedProfessional[] = [];
    let cursor: NearbyCursor | undefined;
    let pages = 0;
    let failure: { message: string; rateLimited?: boolean } | null = null;
    const opts = countryOpts.current;
    do {
      const r = await fetchNearby(point, radius, cursor, opts);
      pages += 1;
      if (!r.ok) {
        failure = r;
        break;
      }
      all.push(...r.professionals);
      remote.push(...r.online);
      cursor = r.next ?? undefined;
    } while (cursor && pages < MAX_PAGES);
    setSearching(false);
    if (opts.anyCountry !== countryOpts.current.anyCountry) return;
    if (failure && all.length === 0 && remote.length === 0) {
      setSearchError(failure.message);
      if (!failure.rateLimited) {
        if (before === undefined) searched.current.delete(key);
        else searched.current.set(key, before);
      }
      return;
    }
    setSearchError(failure ? failure.message : null);
    if (cursor || failure) setTruncated(true);
    setFound((prev) => {
      const next = new Map(prev);
      for (const p of all) next.set(p.profileId, p);
      return next;
    });
    setOnline((prev) => {
      const next = new Map(prev);
      for (const p of remote) next.set(p.profileId, p);
      return next;
    });
  };

  const lastAny = useRef(anyCountry);
  useEffect(() => {
    if (lastAny.current !== anyCountry) {
      lastAny.current = anyCountry;
      searched.current.clear();
      setFound(new Map());
      setOnline(new Map());
      setPicked(null);
    }
    if (origin) void search(origin.coords, maxKm ?? 25);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.coords.lat, origin?.coords.lng, maxKm, anyCountry]);

  const onViewChange = (center: Coords, radiusKm: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void search(center, radiusKm), SEARCH_DEBOUNCE_MS);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const nearby = useMemo(() => {
    if (!origin) return [];
    return [...found.values()]
      .filter((p) => (!subtype || p.subtype === subtype) && keptByWhere(p, where))
      .map((p) => ({ p, km: distanceKm(origin.coords, { lat: p.lat, lng: p.lng }) }))
      .filter((n) => maxKm == null || n.km <= maxKm)
      .sort((a, b) => a.km - b.km);
  }, [found, origin, subtype, maxKm, where]);
  const remote = useMemo(() => {
    if (where.inPerson && !where.online) return [];
    return [...online.values()].filter((p) => (!subtype || p.subtype === subtype) && !found.has(p.profileId));
  }, [online, found, subtype, where]);
  const rows: Row[] = [...nearby, ...remote.map((p) => ({ p, km: null as null }))];

  const distanceOf = (p: NearbyProfessional) => (origin ? describeDistance(distanceKm(origin.coords, { lat: p.lat, lng: p.lng })) : "");
  const placeOf = (p: NearbyProfessional) => (p.areaLabel ? ` · ${t("near {area}", { area: p.areaLabel })}` : "");
  const abroadOf = (p: ReachedProfessional) => {
    const c = abroadLabel(p.countryCode, searcherCountry, anyCountry);
    return c ? ` · ${c}` : "";
  };
  const rowPlace = (r: Row) => (r.km == null ? `${tx("Online", "session format")}${abroadOf(r.p)}` : `${distanceOf(r.p)}${placeOf(r.p)}${abroadOf(r.p)}`);
  const noun = (s: NearbyProfessional["subtype"] | null | undefined) => (s ? t(SUBTYPE_SINGULAR[s]) : t("professional"));

  const groups = useMemo(() => groupByPoint(nearby.map((n) => ({ ...n.p, lat: n.p.lat, lng: n.p.lng }))), [nearby]);
  const keyOf = (lat: number, lng: number) => `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const pins: Pin[] = groups.map((g) => {
    const first = g.items[0];
    const label =
      g.items.length === 1
        ? `${first.name}, ${noun(first.subtype)}, ${distanceOf(first)}`
        : first.areaLabel
          ? t("{n} professionals near {area}, {distance}", { n: g.items.length, area: first.areaLabel, distance: distanceOf(first) })
          : t("{n} professionals here, {distance}", { n: g.items.length, distance: distanceOf(first) });
    const tc = typeColours(first.subtype, false);
    return {
      key: keyOf(g.lat, g.lng),
      lat: g.lat,
      lng: g.lng,
      count: g.items.length,
      label,
      face: { avatarUrl: first.avatarUrl, initials: initials(first.name), ring: tc.main, fill: pinGround(first.subtype, false), ink: tc.deep },
      selected: !!picked && g.items.some((i) => picked.includes(i.profileId)),
    };
  });
  const onSelectPin = (key: string) => {
    const g = groups.find((x) => keyOf(x.lat, x.lng) === key);
    if (!g) return;
    const ids = g.items.map((i) => i.profileId);
    setPicked(ids);
    window.setTimeout(() => listRef.current?.querySelector(`[data-pr-near="${CSS.escape(ids[0])}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 0);
  };

  // Not located (or signed out): the live directory in the list column, without distances.
  const plain = (listings ?? []).filter((l) => !subtype || l.subtype === subtype);
  const located = phase === "ready" && !!origin;
  const head = located ? t("Nearest first · {place}", { place: origin!.label }) : t("Professionals");

  const row = (key: string, name: string, photo: string | null, sub: DirectoryListing["subtype"], line: string, rating: string, on: boolean) => {
    const fam = famOf(sub);
    return (
      <button
        key={key}
        type="button"
        data-pr-near={key}
        aria-current={on ? "true" : undefined}
        onClick={() => navigate(proHref(key))}
        className="pr-web-hover flex items-center text-start"
        style={{ flex: "none", width: "100%", gap: 12, minHeight: 64, borderRadius: 16, border: HAIR, padding: "8px 14px", boxSizing: "border-box", background: on ? "#FAF9FD" : "#FFFFFF" }}
      >
        <PrAvatar name={name} photoUrl={photo} fam={fam} size={40} fontSize={15} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="block truncate" style={{ fontSize: 15, fontWeight: 700, color: fam.deep }}>
            {name}
          </span>
          <span className="block truncate" style={{ fontSize: 13, color: "#71685E" }}>
            {line}
          </span>
        </span>
        <span className="inline-flex items-center whitespace-nowrap" style={{ gap: 4, fontSize: 13, fontWeight: 700, color: "#9A7424" }}>
          <GoldStar />
          {rating}
        </span>
      </button>
    );
  };

  const firstId = rows[0]?.p.profileId;
  return (
    <>
      <div data-pr-list-col className="flex flex-col" style={{ minWidth: 0, minHeight: 0, gap: 12 }}>
        {top}
        <div ref={listRef} data-pr-near-list className="pr-web-noscroll flex flex-col" style={{ flex: 1, minHeight: 0, overflow: "auto", gap: 8 }}>
          <p style={{ ...prCaps, color: "#71685E", flex: "none" }}>{head}</p>
          {located
            ? rows.map((r) => row(r.p.profileId, r.p.name, r.p.avatarUrl, r.p.subtype, rowPlace(r), ratingShort(r.p.averageRating, r.p.reviewCount), picked ? picked.includes(r.p.profileId) : r.p.profileId === firstId))
            : plain.map((l) => row(l.profileId, l.name, l.avatarUrl, l.subtype, l.location?.trim() || t("Not on the map nearby"), ratingShort(l.averageRating, l.reviewCount), false))}
          {located && (
            <p role="status" className="sr-only">
              {searching
                ? t("Searching this area…")
                : `${t("{n} near {place}", { n: nearby.length, place: origin!.label })}${remote.length ? t(", {n} online", { n: remote.length }) : ""}${truncated ? t(". Not all are shown here; zoom in for the nearest.") : ""}`}
            </p>
          )}
          {located && searchError && (
            <p role="alert" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#C0392B" }}>
              {t(searchError)}
            </p>
          )}
          {located && nearby.length === 0 && !searching && !searchError && (
            <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{t("No professionals have shared an area near {place} yet. Try zooming out.", { place: origin!.label })}</p>
          )}
        </div>
      </div>

      <section data-pr-right className="flex flex-col" style={{ minWidth: 0, minHeight: 0, gap: 16 }}>
        <div data-pr-map className="relative" style={{ flex: 1, minHeight: 0, borderRadius: 20, overflow: "hidden", background: "#EEF1F0", border: HAIR }}>
          {!authUserId ? (
            <MapNotice icon={<LogIn size={26} strokeWidth={1.5} color="#7D6BB5" aria-hidden />} title={t("Sign in to see professionals near you")} line={t("The list of professionals stays open to everyone.")}>
              <div className="flex" style={{ gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => navigate("/app/onboarding")} className="pr-web-press" style={mapBtn(true)}>
                  {t("Sign in")}
                </button>
              </div>
            </MapNotice>
          ) : phase === "ask" ? (
            <MapNotice icon={<MapPin size={26} strokeWidth={1.5} color="#7D6BB5" aria-hidden />} title={t("See professionals near you")} line={t("Share your location once, or pick an area.")}>
              {locError && (
                <p role="alert" style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 600, color: "#C0392B", maxWidth: 360 }}>
                  {t(locError)}
                </p>
              )}
              <div className="flex" style={{ gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => void locateMe()} className="pr-web-press" style={mapBtn(true)}>
                  {t("Use my location")}
                </button>
                <button type="button" onClick={() => setPickerOpen(true)} className="pr-web-press" style={mapBtn(false)}>
                  {t("Choose an area")}
                </button>
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: "20px", color: "#71685E", maxWidth: 420 }}>
                {t("Your location stays on this device: Centium only uses a rough area (about 10 km) to find who's nearby, and never saves it.")}
              </p>
            </MapNotice>
          ) : located ? (
            <>
              <Suspense fallback={null}>
                <NearbyMap
                  center={origin!.coords}
                  zoom={12}
                  dark={false}
                  pins={pins}
                  me={origin!.coords}
                  onSelectPin={onSelectPin}
                  onViewChange={onViewChange}
                  hideControls
                  className="h-full w-full"
                  ariaLabel={t("Map of professionals near {place}. A list of the same results follows.", { place: origin!.label })}
                />
              </Suspense>
              <button
                type="button"
                onClick={() => void locateMe()}
                aria-label={t("Use my location")}
                title={t("Use my location")}
                className="pr-web-press grid place-items-center"
                style={{ position: "absolute", insetInlineEnd: 14, top: 14, zIndex: 3, width: 44, height: 44, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 4px 12px rgba(36,31,27,0.14)" }}
              >
                <Navigation size={18} color="#5F5093" aria-hidden />
              </button>
            </>
          ) : (
            <div aria-busy="true" className="absolute inset-0">
              <span className="sr-only" role="status">
                {phase === "locating" ? t("Finding your location…") : t("Getting the map ready…")}
              </span>
            </div>
          )}
        </div>
      </section>

      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)} title={t("Choose an area")}>
        <div className="animate-fade-slide-up">
          <AreaPicker selectedId={origin?.areaId} onPick={chooseArea} />
        </div>
      </BottomSheet>
    </>
  );
};

/** The 40 map buttons: primary #9A8CD6, secondary white with a 1px #E0D5FC border (15/24 600, r12). */
const mapBtn = (primary: boolean): React.CSSProperties => ({
  height: 40,
  padding: "0 16px",
  borderRadius: 12,
  border: primary ? "none" : "1px solid #E0D5FC",
  background: primary ? "#9A8CD6" : "#FFFFFF",
  color: primary ? "#FFFFFF" : "#5F5093",
  fontSize: 15,
  lineHeight: "24px",
  fontWeight: 600,
  whiteSpace: "nowrap",
});

/** The map card's notice (`mapSignin`): centred, 6 apart, padding 24; the 56 white tile, the title 17/24 700, the line 15/24 #5B5349. */
const MapNotice: React.FC<{ icon: React.ReactNode; title: string; line: string; children?: React.ReactNode }> = ({ icon, title, line, children }) => (
  <div data-pr-map-notice className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ gap: 6, padding: 24 }}>
    <span className="grid place-items-center" style={{ width: 56, height: 56, borderRadius: 16, background: "#FFFFFF" }}>
      {icon}
    </span>
    <p style={{ margin: "8px 0 0", fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{title}</p>
    <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#5B5349" }}>{line}</p>
    {children}
  </div>
);
