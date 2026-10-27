// Centium landing v29: a WK1 v23 band between chapters (02_pages/07-WK1),
// the prototype markup with its exact inline styles: a full-width canvas
// 120px taller than its box at both ends, faded in and out by a CSS mask so
// no line is cut off. motion/bands.ts draws it (lines/bands.ts Band).

import React from "react";
import type { SectionVals } from "./sectionVals";

const MASK = "linear-gradient(to bottom,transparent 0,#000 30%,#000 70%,transparent 100%)";

export const Band: React.FC<{ id: "wk-a" | "wk-m" | "wk-b"; r: SectionVals }> = ({ id, r }) => (
  <section id={id} data-screen-label="WK1 v23 Band" aria-hidden="true" style={{ position: "relative", zIndex: "2", overflowX: "clip", padding: r.wkPad }}>
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
          WebkitMaskImage: MASK,
          maskImage: MASK,
        }}
      />
    </div>
  </section>
);
