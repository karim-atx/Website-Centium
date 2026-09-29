import React, { useEffect, useRef, useState } from "react";
import { BODY_FIGURES, zoneMaskUrl, type FigureKey, type ZoneKey } from "../../data/bodyZones";

/** Every figure renders 376px tall; its width follows the art's own proportions. */
export const FIGURE_HEIGHT = 376;

const SHIMMER_KEYFRAMES =
  "@keyframes body-zone-shimmer { 0% { opacity: .8 } 50% { opacity: 1 } 100% { opacity: .8 } }" +
  "@media (prefers-reduced-motion: reduce) { .body-zone-fill { animation: none !important } }";

/**
 * WO5 / WO6 body map figure. The zone highlights sit BENEATH the line art:
 * each zone is its own mask (/body/zones/<figure>-<zone>.png, traced to that
 * figure's contours and clipped to its silhouette), filled semi-transparent
 * lavender with no stroke, a soft glow just past the outline and a slow,
 * subtle shimmer. Only the selected zone is highlighted. A tap is matched
 * against the zone masks themselves, so it selects exactly the muscle under
 * the finger; tapping the selected one again clears it.
 */
export const BodyFigure: React.FC<{
  figure: FigureKey;
  zones: ZoneKey[];
  selected: ZoneKey | null;
  onSelect: (zone: ZoneKey | null) => void;
  alt: string;
  label: (zone: ZoneKey) => string;
}> = ({ figure, zones, selected, onSelect, alt, label }) => {
  const meta = BODY_FIGURES[figure];
  const width = Math.round((meta.width * FIGURE_HEIGHT) / meta.height);
  // Each zone's alpha, for hit-testing taps at the art's own resolution.
  const masks = useRef(new Map<string, Uint8ClampedArray>());
  const [, setLoaded] = useState(0);

  useEffect(() => {
    let cancelled = false;
    for (const zone of zones) {
      const key = `${figure}-${zone}`;
      if (masks.current.has(key)) continue;
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        const c = document.createElement("canvas");
        c.width = meta.width;
        c.height = meta.height;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, meta.width, meta.height).data;
        const alpha = new Uint8ClampedArray(meta.width * meta.height);
        for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
        masks.current.set(key, alpha);
        setLoaded((n) => n + 1);
      };
      img.src = zoneMaskUrl(figure, zone);
    }
    return () => {
      cancelled = true;
    };
  }, [figure, zones, meta.width, meta.height]);

  const zoneAt = (clientX: number, clientY: number, box: DOMRect): ZoneKey | null => {
    const x = Math.floor(((clientX - box.left) / box.width) * meta.width);
    const y = Math.floor(((clientY - box.top) / box.height) * meta.height);
    if (x < 0 || y < 0 || x >= meta.width || y >= meta.height) return null;
    for (const zone of zones) {
      const alpha = masks.current.get(`${figure}-${zone}`);
      if (alpha && alpha[y * meta.width + x] > 128) return zone;
    }
    return null;
  };

  return (
    <div
      className="relative"
      style={{ width, height: FIGURE_HEIGHT, cursor: "pointer" }}
      onClick={(e) => {
        const zone = zoneAt(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
        if (zone) onSelect(zone === selected ? null : zone);
      }}
      role="group"
      aria-label={alt}
    >
      <style>{SHIMMER_KEYFRAMES}</style>
      {selected && meta.zones[selected] && (
        // The glow is a filter on the wrapper, so it follows the masked shape.
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ filter: "drop-shadow(0 0 4px rgba(143,104,246,0.6))" }}
        >
          <div
            className="body-zone-fill absolute inset-0"
            style={{
              background: "rgba(143,104,246,0.6)",
              WebkitMaskImage: `url(${zoneMaskUrl(figure, selected)})`,
              maskImage: `url(${zoneMaskUrl(figure, selected)})`,
              WebkitMaskSize: "100% 100%",
              maskSize: "100% 100%",
              animation: "body-zone-shimmer 2.8s ease-in-out infinite",
            }}
          />
        </div>
      )}
      <img
        src={`/body/${figure}.png`}
        alt={alt}
        draggable={false}
        className="absolute inset-0 block w-full h-full select-none pointer-events-none"
        style={{ objectFit: "contain" }}
      />
      {/* Keyboard and screen-reader access to the same zones. */}
      <div className="sr-only">
        {zones.map((zone) => (
          <button key={zone} aria-pressed={selected === zone} onClick={() => onSelect(selected === zone ? null : zone)}>
            {label(zone)}
          </button>
        ))}
      </div>
    </div>
  );
};
