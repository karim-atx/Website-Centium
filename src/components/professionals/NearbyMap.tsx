import { useEffect, useRef } from "react";
import { LocateFixed } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// The tile worker, bundled by Vite. MapLibre otherwise looks for it next to
// its own file, which Vite's optimised bundle does not serve, and the map
// stays blank.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

maplibregl.setWorkerUrl(workerUrl);
import { distanceKm, type Coords } from "../../services/geo/distance";
import { resolveCssColor } from "../../theme/cssColor";

/**
 * The map behind Professionals → Map, and the small pin map in a
 * professional's listing. Loaded on its own (React.lazy) so MapLibre is only
 * downloaded when a map is actually opened.
 *
 * TILES: OpenFreeMap vector styles, "positron" in light mode and "dark" in
 * dark mode. No colour filters: the dark map is a real dark style. The credit
 * line comes from the tile source and is kept expanded (compact: false), so it
 * is always visible.
 *
 * PINS ARE BUTTONS. Each is a real <button> in the page, reachable with Tab,
 * named for a screen reader ("Sarah, personal trainer, about 3 km away"), and
 * activated with Enter or Space like any other button. A pin standing for
 * several people shows a count and expands on activation.
 *
 * MO1.2.2 (R12): one professional is an avatar pin (photo or initials) ringed
 * in their type colour, with a small tail; the selected one is drawn larger.
 * Several at one spot keep the count pin, ringed neutrally (B19).
 */

const STYLE = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

export interface MapPin {
  key: string;
  lat: number;
  lng: number;
  count: number;
  label: string;
  /** A single professional's face: their photo, else initials, in their type colours. */
  face?: { avatarUrl: string | null; initials: string; ring: string; fill: string; ink: string };
  /** The pin of the card showing below the map. */
  selected?: boolean;
}

export interface NearbyMapProps {
  center: Coords;
  zoom?: number;
  dark: boolean;
  pins?: MapPin[];
  /** Where the user is (their location or chosen area), drawn as "You". */
  me?: Coords | null;
  onSelectPin?: (key: string) => void;
  /** After the visible area changes: its centre and the radius that covers it. */
  onViewChange?: (center: Coords, radiusKm: number) => void;
  /** Pin-dropping mode for a professional choosing their area. */
  pick?: { value: Coords | null; onPick: (c: Coords) => void };
  className?: string;
  ariaLabel: string;
  /** MO1.2.2's round recentre button (the repo's "Use my location"), top right. */
  onRecentre?: () => void;
}

export default function NearbyMap({
  center,
  zoom = 12,
  dark,
  pins = [],
  me,
  onSelectPin,
  onViewChange,
  pick,
  className,
  ariaLabel,
  onRecentre,
}: NearbyMapProps) {
  const recentreSlot = !!onRecentre;
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const meMarker = useRef<maplibregl.Marker | null>(null);
  const pickMarker = useRef<maplibregl.Marker | null>(null);
  // Callbacks change every render; the map's listeners read the latest.
  const latest = useRef({ onSelectPin, onViewChange, pick });
  useEffect(() => {
    latest.current = { onSelectPin, onViewChange, pick };
  });

  // Create the map once.
  useEffect(() => {
    if (!holder.current) return;
    const m = new maplibregl.Map({
      container: holder.current,
      style: dark ? STYLE.dark : STYLE.light,
      center: [center.lng, center.lat],
      zoom,
      attributionControl: false,
      // Keyboard panning and zooming on the focused map.
      keyboard: true,
    });
    m.addControl(new maplibregl.AttributionControl({ compact: false }), "bottom-right");
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), recentreSlot ? "top-left" : "top-right");
    m.getCanvas().setAttribute("aria-label", ariaLabel);
    m.on("moveend", () => {
      const c = m.getCenter();
      const ne = m.getBounds().getNorthEast();
      const radius = distanceKm({ lat: c.lat, lng: c.lng }, { lat: ne.lat, lng: ne.lng });
      latest.current.onViewChange?.({ lat: c.lat, lng: c.lng }, radius);
    });
    m.on("click", (e: maplibregl.MapMouseEvent) => latest.current.pick?.onPick({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // Created once; later changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Light and dark styles, switched with the app's theme. Not on the first
  // run: the map was created with the right style already.
  const styleApplied = useRef(dark);
  useEffect(() => {
    if (styleApplied.current === dark) return;
    styleApplied.current = dark;
    map.current?.setStyle(dark ? STYLE.dark : STYLE.light);
  }, [dark]);

  // Recentre when the chosen point changes (a new area, or a location found).
  useEffect(() => {
    map.current?.jumpTo({ center: [center.lng, center.lat] });
  }, [center.lat, center.lng]);

  // The professionals' pins.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    for (const mk of markers.current) mk.remove();
    markers.current = pins.map((p) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", p.label);
      if (p.selected) el.setAttribute("aria-current", "true");
      el.title = p.label;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        latest.current.onSelectPin?.(p.key);
      });
      if (p.face && p.count === 1) {
        // An avatar in a ring of the type colour, over a small tail (38 x 45;
        // 50 x 57 when selected).
        const size = p.selected ? 50 : 38;
        el.className = "centium-map-pin flex flex-col items-center focus:outline-none focus-visible:[&>span:first-child]:ring-4 focus-visible:[&>span:first-child]:ring-primary/40";
        el.style.zIndex = p.selected ? "2" : "1";
        const disc = document.createElement("span");
        disc.className = "flex items-center justify-center rounded-full overflow-hidden font-bold shadow-md";
        disc.style.width = disc.style.height = `${size}px`;
        disc.style.border = `${p.selected ? 3 : 2.5}px solid ${p.face.ring}`;
        disc.style.background = p.face.fill;
        disc.style.color = p.face.ink;
        disc.style.fontSize = p.selected ? "15px" : "12px";
        if (p.face.avatarUrl) {
          const img = document.createElement("img");
          img.src = p.face.avatarUrl;
          img.alt = "";
          img.className = "w-full h-full object-cover";
          disc.appendChild(img);
        } else {
          disc.textContent = p.face.initials;
        }
        const tail = document.createElement("span");
        tail.setAttribute("aria-hidden", "true");
        tail.style.width = "0";
        tail.style.height = "0";
        tail.style.marginTop = "-1px";
        tail.style.borderLeft = tail.style.borderRight = "6px solid transparent";
        tail.style.borderTop = `7px solid ${p.face.ring}`;
        el.append(disc, tail);
        return new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(m);
      }
      el.className =
        "centium-map-pin flex items-center justify-center rounded-full border-[2.5px] border-charcoal/25 bg-cream-card text-charcoal font-extrabold shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40";
      el.style.width = el.style.height = p.count > 1 ? "38px" : "26px";
      el.style.fontSize = "13px";
      el.textContent = p.count > 1 ? String(p.count) : "";
      return new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m);
    });
  }, [pins]);

  // "You" — drawn locally only; this position is never sent anywhere.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    meMarker.current?.remove();
    meMarker.current = null;
    if (!me) return;
    const el = document.createElement("div");
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", "You are here");
    el.className = "w-4 h-4 rounded-full bg-[#2B5C8A] border-[3px] border-white shadow";
    meMarker.current = new maplibregl.Marker({ element: el }).setLngLat([me.lng, me.lat]).addTo(m);
  }, [me]);

  // A professional's chosen point.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    pickMarker.current?.remove();
    pickMarker.current = null;
    const v = pick?.value;
    if (!v) return;
    pickMarker.current = new maplibregl.Marker({ color: resolveCssColor("rgb(var(--thi-7d6bb5))") }).setLngLat([v.lng, v.lat]).addTo(m);
  }, [pick?.value]);

  // The credit line keeps its own readable colours in both themes, rather
  // than inheriting the app's text colour onto MapLibre's pale background.
  // In dark the zoom buttons go dark too, so they are not a light patch.
  return (
    <div className={`relative ${className ?? ""}`}>
    {onRecentre && (
      <button
        type="button"
        onClick={onRecentre}
        aria-label="Use my location"
        className="tap absolute top-3 right-3 z-[3] w-11 h-11 rounded-full bg-cream-card shadow-md flex items-center justify-center text-primary-deep-text"
      >
        <LocateFixed size={17} strokeWidth={1.75} />
      </button>
    )}
    <div
      ref={holder}
      className={`h-full w-full [&_.maplibregl-ctrl-attrib]:!bg-white/85 [&_.maplibregl-ctrl-attrib]:!text-[#2B2B2B] [&_.maplibregl-ctrl-attrib_a]:!text-[#2B2B2B] dark:[&_.maplibregl-ctrl-attrib]:!bg-[#0D0B1A]/85 dark:[&_.maplibregl-ctrl-attrib]:!text-[#E8E6F0] dark:[&_.maplibregl-ctrl-attrib_a]:!text-[#E8E6F0] dark:[&_.maplibregl-ctrl-group]:!bg-[#262932] dark:[&_.maplibregl-ctrl-group_button+button]:!border-t-white/10 dark:[&_.maplibregl-ctrl-icon]:invert`}
    />
    </div>
  );
}
