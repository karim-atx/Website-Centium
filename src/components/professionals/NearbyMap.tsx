import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// The tile worker, bundled by Vite. MapLibre otherwise looks for it next to
// its own file, which Vite's optimised bundle does not serve, and the map
// stays blank.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

maplibregl.setWorkerUrl(workerUrl);
import { distanceKm, type Coords } from "../../services/geo/distance";

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
}: NearbyMapProps) {
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
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
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
      el.title = p.label;
      el.className =
        "centium-map-pin flex items-center justify-center rounded-full border-2 border-white dark:border-[#0D0B1A] bg-primary text-white dark:text-[#0D0B1A] font-extrabold shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40";
      el.style.width = el.style.height = p.count > 1 ? "34px" : "26px";
      el.style.fontSize = "13px";
      el.textContent = p.count > 1 ? String(p.count) : "";
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        latest.current.onSelectPin?.(p.key);
      });
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
    pickMarker.current = new maplibregl.Marker({ color: "#7D6BB5" }).setLngLat([v.lng, v.lat]).addTo(m);
  }, [pick?.value]);

  // The credit line keeps its own readable colours in both themes, rather
  // than inheriting the app's text colour onto MapLibre's pale background.
  return (
    <div
      ref={holder}
      className={`${className ?? ""} [&_.maplibregl-ctrl-attrib]:!bg-white/85 [&_.maplibregl-ctrl-attrib]:!text-[#2B2B2B] [&_.maplibregl-ctrl-attrib_a]:!text-[#2B2B2B] dark:[&_.maplibregl-ctrl-attrib]:!bg-[#0D0B1A]/85 dark:[&_.maplibregl-ctrl-attrib]:!text-[#E8E6F0] dark:[&_.maplibregl-ctrl-attrib_a]:!text-[#E8E6F0]`}
    />
  );
}
