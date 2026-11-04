// Centium landing v29: a WK1 v23 band between chapters (02_pages/07-WK1),
// the prototype markup with its exact inline styles: a full-width canvas
// 120px taller than its box at both ends, so no line is cut off.
// motion/bands.ts draws it (lines/bands.ts Band).
// Round 6 (F3, handoff-landing-fix SPEC F3): the soft top and bottom are
// drawn into the canvas (lines/bands.ts), not a CSS mask, and the section
// clips only horizontally (clip-path inset -200px top and bottom; the bowl
// enters from off-screen), never vertically: a browser that clipped both axes
// for overflow-x: clip, or skipped the mask, cut the waves at the section
// edge at about 70% strength on phones.
// Round 7 (F6): the band's still image with Tio ([data-band-still], no source
// until motion/bands.ts finds the canvas cannot draw), with the canvas's
// geometry, mirrored in Arabic except the symmetric meditating one.
//
// Landing update (WK1 v2 / v6, C17, centium/WK1-tio-dividers.md): Tio sits on
// each band, above its canvas: surfing on the first (#wk-a), meditating on
// the second (#wk-m), holding a bowl that fills with food on the third
// (#wk-b; eight layers of one frame, drawn in this order). Decorative: the
// band is aria-hidden and every image has alt="". No image has a source
// until the band is near (motion/tio.ts sets them, AVIF, then WebP, then
// PNG), so the landing's first download carries none. All placement is
// transform and opacity, from motion/tio.ts.
// Right to left (C6): the canvas is mirrored, so its lines draw right to left.

import React from "react";
import type { SectionVals } from "./sectionVals";
import { isRtl } from "../../../i18n/core";
import { BOWL_LAYERS, type TioKind } from "../tioLayers";

const TIO: Record<"wk-a" | "wk-m" | "wk-b", TioKind> = { "wk-a": "surf", "wk-m": "meditate", "wk-b": "bowl" };
/** The still's file name (assets/dividers/<name>-{desktop,phone}.{webp,png}). */
const STILL: Record<"wk-a" | "wk-m" | "wk-b", string> = { "wk-a": "divider-1-surf", "wk-m": "divider-2-meditate", "wk-b": "divider-3-bowl" };

const IMG: React.CSSProperties = { position: "absolute", inset: "0", width: "100%", height: "100%", maxWidth: "none", display: "block", pointerEvents: "none", userSelect: "none" };

/** One image, its sources set later (data-tio-img names the file). */
const TioImage: React.FC<{ name: string; style?: React.CSSProperties }> = ({ name, style }) => (
  <picture>
    <source type="image/avif" data-tio-src="avif" />
    <source type="image/webp" data-tio-src="webp" />
    <img data-tio-img={name} alt="" draggable={false} decoding="async" style={{ ...IMG, ...style }} />
  </picture>
);

export const Band: React.FC<{ id: "wk-a" | "wk-m" | "wk-b"; r: SectionVals }> = ({ id, r }) => {
  const kind = TIO[id];
  return (
    <section id={id} data-screen-label="WK1 v23 Band" aria-hidden="true" style={{ position: "relative", zIndex: "2", overflow: "visible", clipPath: "inset(-200px 0px -200px 0px)", padding: r.wkPad }}>
      <div style={{ position: "relative", height: r.wkH }}>
        <canvas
          data-band={id}
          style={{
            position: "absolute",
            left: "0",
            width: "100%",
            top: "-120px",
            height: "calc(100% + 240px)",
            display: "block",
            pointerEvents: "none",
            transform: isRtl() ? "scaleX(-1)" : undefined,
          }}
        />
        <img
          data-band-still={STILL[id]}
          alt=""
          draggable={false}
          decoding="async"
          style={{
            position: "absolute",
            left: "0",
            top: "-120px",
            width: "100%",
            height: "calc(100% + 240px)",
            maxWidth: "none",
            objectFit: "fill",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: "0",
            opacity: "0",
            transition: "opacity .3s ease",
            transform: isRtl() && kind !== "meditate" ? "scaleX(-1)" : undefined,
          }}
        />
        <span
          data-tio={kind}
          style={{
            position: "absolute",
            left: "0",
            top: "0",
            zIndex: "1",
            display: "block",
            pointerEvents: "none",
            userSelect: "none",
            willChange: "transform, opacity",
            transformOrigin: kind === "surf" ? "50% 92%" : "50% 50%",
            opacity: "0",
          }}
        >
          {kind === "bowl" ? (
            BOWL_LAYERS.map((n, i) => (
              // The base (Tio with the empty bowl) and the rim are always shown; the food arrives.
              <TioImage key={n} name={"bowl/tio-bowl-" + n} style={i === 0 || i === BOWL_LAYERS.length - 1 ? undefined : { opacity: "0", willChange: "transform, opacity" }} />
            ))
          ) : (
            <TioImage name={"tio-" + kind} />
          )}
        </span>
      </div>
    </section>
  );
};
