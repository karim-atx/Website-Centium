import React from "react";
import { useApp } from "../../context/AppContext";

// R20 (batch D, D10): the in-app Centium mark outside the Centium theme. The
// C is drawn in the theme primary and the leaf in its secondary (Foundations
// 2.1 theme rule 4), by masking the brand's own C and leaf artwork
// (public/centium-logo-c.png and -leaf.png, which share one 648 x 701 canvas)
// with a solid colour, so no new artwork is needed. The Centium theme keeps
// its PNG exactly as before; callers render this only for the other four.
// The app icon and splash stay brand.

const LAYER: React.CSSProperties = {
  position: "absolute",
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
};
const C_MASK = "url(/centium-logo-c.png)";
const LEAF_MASK = "url(/centium-logo-leaf.png)";

/** The two tinted layers, placed over the C-and-leaf canvas box given in px. */
const Layers: React.FC<{ x: number; y: number; w: number; h: number; leaf?: boolean }> = ({ x, y, w, h, leaf = true }) => (
  <>
    <span
      aria-hidden
      style={{ ...LAYER, left: x, top: y, width: w, height: h, maskImage: C_MASK, WebkitMaskImage: C_MASK, background: "rgb(var(--c-brand-c))" }}
    />
    {leaf && (
      <span
        aria-hidden
        style={{ ...LAYER, left: x, top: y, width: w, height: h, maskImage: LEAF_MASK, WebkitMaskImage: LEAF_MASK, background: "rgb(var(--c-brand-leaf))" }}
      />
    )}
  </>
);

/**
 * In place of `<img src="/centium-mark.png">` at width x height (the image's
 * artwork sits at 6,6 on a 687 x 713 canvas, drawn `object-contain`).
 */
export const ThemedMark: React.FC<{ width: number; height: number; label?: string; className?: string }> = ({
  width,
  height,
  label,
  className,
}) => {
  const s = Math.min(width / 687, height / 713);
  const x = (width - 687 * s) / 2 + 6 * s;
  const y = (height - 713 * s) / 2 + 6 * s;
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
      style={{ position: "relative", display: "inline-block", width, height }}
    >
      <Layers x={x} y={y} w={648 * s} h={701 * s} />
    </span>
  );
};

/**
 * In place of the navbar's 54 px `centium-mark-trimmed.png` disc (artwork at
 * 48,16 - 804,836 on 854 x 854), on the disc's own ground.
 */
export const ThemedNavMark: React.FC<{ label: string; className?: string }> = ({ label, className }) => (
  <span role="img" aria-label={label} className={className} style={{ position: "relative", display: "inline-block", width: 54, height: 54 }}>
    {/* The 645 x 699 artwork fills 756 x 820 there, so the 648 x 701 canvas
        is 759.5 x 822.3. */}
    <Layers x={(48 / 854) * 54} y={(16 / 854) * 54} w={(759.5 / 854) * 54} h={(822.3 / 854) * 54} />
  </span>
);

/** The C alone (the achievement toast's `centium-logo-c.png`), at width x height. */
export const ThemedC: React.FC<{ width: number; height: number; className?: string }> = ({ width, height, className }) => (
  <span aria-hidden className={className} style={{ position: "relative", display: "inline-block", width, height }}>
    <Layers x={0} y={0} w={width} h={height} leaf={false} />
  </span>
);

/** A one-colour PNG glyph (the navbar's filled Food and Workout icons) in a theme colour. */
export const TintedGlyph: React.FC<{ src: string; colour: string; className?: string }> = ({ src, colour, className }) => (
  <span
    aria-hidden
    className={className}
    style={{
      display: "inline-block",
      background: colour,
      maskImage: `url(${src})`,
      WebkitMaskImage: `url(${src})`,
      maskSize: "contain",
      WebkitMaskSize: "contain",
      maskRepeat: "no-repeat",
      WebkitMaskRepeat: "no-repeat",
      maskPosition: "center",
      WebkitMaskPosition: "center",
    }}
  />
);

/**
 * The Centium mark in whichever theme is on: the brand PNG in the Centium
 * theme (as Sidebar and the forum rules card do), the tinted mask elsewhere.
 * For screens that just want "the mark" without choosing.
 */
export const BrandMark: React.FC<{ width: number; height: number; className?: string }> = ({ width, height, className }) => {
  const { colorTheme } = useApp();
  return colorTheme === "centium" ? (
    <img src="/centium-mark.png" alt="" aria-hidden="true" className={`object-contain ${className ?? ""}`} style={{ width, height }} />
  ) : (
    <ThemedMark width={width} height={height} className={className} />
  );
};
