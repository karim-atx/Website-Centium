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
 * dark mode, recoloured to MO1.2.2's muted lavender at load (tintMap). No
 * colour filters: the dark map is a real dark style. The credit
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

/**
 * MO1.2.2: a muted lavender map, not positron's grey. The handover draws land
 * #F3F3FD with lavender areas, white roads and a pale teal park (sampled from
 * the frame: land 243,242,247, area 228,224,244, park 226,239,236). The
 * OpenFreeMap style's own land, water, park and road layers are recoloured at
 * load from theme tokens, so the map follows the colour theme; dark mode tints
 * the dark style from the dark primary / teal tints the same way. Labels keep
 * the style's own colours and halos, which are made to read on these grounds.
 */
const MAP_TINTS = {
  light: {
    // Revision round (decision 22, new element): the sampled values exactly.
    land: "rgb(var(--th-f3f2f7))",
    area: "rgb(var(--th-e4e0f4))",
    water: "rgb(var(--th-e9e5f6))",
    park: "rgb(var(--th-e1eeeb))",
    road: "rgb(var(--c-cream-card))",
    casing: "rgb(var(--th-ebeaf6))",
  },
  dark: {
    land: "rgb(var(--th-2b2c3a))",
    area: "rgb(var(--th-303141))",
    water: "rgb(var(--th-27273d))",
    park: "rgb(var(--th-283838))",
    road: "rgb(var(--th-3a3547))",
    casing: "rgb(var(--th-303141))",
  },
} as const;

function tintMap(m: maplibregl.Map, dark: boolean) {
  const raw = MAP_TINTS[dark ? "dark" : "light"];
  const t = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, resolveCssColor(v)])) as Record<keyof typeof raw, string>;
  let layers: maplibregl.LayerSpecification[];
  try {
    layers = m.getStyle().layers ?? [];
  } catch {
    return;
  }
  for (const l of layers) {
    const id = l.id;
    const set = (prop: "background-color" | "fill-color" | "line-color", value: string) => {
      try {
        m.setPaintProperty(id, prop, value);
      } catch {
        /* a layer without that property: leave it */
      }
    };
    if (l.type === "background") set("background-color", t.land);
    else if (l.type === "fill") {
      if (/water/.test(id)) set("fill-color", t.water);
      else if (/park|wood|grass/.test(id)) set("fill-color", t.park);
      else if (/pier/.test(id)) set("fill-color", t.land);
      else if (/aeroway/.test(id)) set("fill-color", t.road);
      else set("fill-color", t.area);
    } else if (l.type === "line") {
      if (/boundary/.test(id)) continue;
      if (/water/.test(id)) set("line-color", t.water);
      else if (/dashline|pier/.test(id)) set("line-color", t.land);
      else if (/casing|subtle|rail/.test(id)) set("line-color", t.casing);
      else if (/highway|road|aeroway|tunnel|bridge|path/.test(id)) set("line-color", t.road);
    }
  }
}

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
  const darkRef = useRef(dark);
  useEffect(() => {
    latest.current = { onSelectPin, onViewChange, pick };
    darkRef.current = dark;
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
    // MO1.2.2's lavender tint, on every style load (the first, and each
    // light / dark switch), and again when the colour theme changes.
    m.on("style.load", () => tintMap(m, darkRef.current));
    const themeWatch = new MutationObserver(() => {
      if (m.isStyleLoaded()) tintMap(m, darkRef.current);
    });
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-accent"] });
    map.current = m;
    return () => {
      themeWatch.disconnect();
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
        // The focus mark is an outline: the disc's box-shadow carries the type ring.
        el.className = "centium-map-pin flex flex-col items-center focus:outline-none focus-visible:[&>span:first-child]:outline focus-visible:[&>span:first-child]:outline-4 focus-visible:[&>span:first-child]:outline-offset-2 focus-visible:[&>span:first-child]:outline-primary/40";
        el.style.zIndex = p.selected ? "2" : "1";
        const disc = document.createElement("span");
        disc.className = "flex items-center justify-center rounded-full overflow-hidden font-bold";
        disc.style.width = disc.style.height = `${size}px`;
        // Measured on MO1.2.2: a 2 px white (card) ring inside the disc's
        // size, then the type colour outside it, 1.5 (3 when selected).
        disc.style.border = "2px solid rgb(var(--c-cream-card))";
        disc.style.boxShadow = `0 0 0 ${p.selected ? 3 : 1.5}px ${p.face.ring}, 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`;
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
        // MO1.2.2 #9: 40 x 40, white, round; the glyph #7D6BB5 (sampled; new
        // in the redesign, so the handover's colour, decision 22).
        className="tap absolute top-3 right-3 z-[3] w-10 h-10 rounded-full bg-cream-card shadow-md flex items-center justify-center text-th-7d6bb5 dark:text-primary-deep-text"
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
