// Centium landing v29: section 03 "Five pillars, one history." (PI1 v6,
// 02_pages/09-PI1), the prototype markup with its exact inline styles; the
// public anchor #platform is the pinned stage, and links to it scroll to its
// track (#pl-track, navigation.ts). Desktop: a 650vh track pins the stage;
// the index on the left lights one pillar at a time (its 3px bar fills) while
// the five app panes cross-fade on the right and each pane's widgets build
// in (motion/pillars.ts). Mobile: the panes are a swipe carousel with dots;
// each pane builds as it comes into view and centre.

import React from "react";
import { ChapterMark } from "./ChapterMark";
import * as D from "./data/pillars";
import { PaneCoaching } from "./pillars/PaneCoaching";
import { PaneCommunity } from "./pillars/PaneCommunity";
import { PaneHealth } from "./pillars/PaneHealth";
import { PaneNutrition } from "./pillars/PaneNutrition";
import { PaneTraining } from "./pillars/PaneTraining";
import type { SectionVals } from "./sectionVals";

export const Pillars: React.FC<{ r: SectionVals }> = ({ r }) => (
  <div id="pl-track" data-screen-label="PI1 v6 Platform" style={{ position: "relative", zIndex: "2", height: r.plH }}>
    <div id="platform" style={{ position: r.pinPos, top: "0", minHeight: r.pinMin, padding: `${r.pinPad} ${r.px}`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ maxWidth: "1240px", margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <ChapterMark n="03" t="Pillars" size={r.chEy} />
          <h2 style={{ marginTop: "14px", fontWeight: "800", fontSize: r.h2, lineHeight: "1.04", letterSpacing: "-.035em" }}>
            Five pillars, one history.
          </h2>
          <p style={{ marginTop: "14px", fontSize: "17px", color: "#5B5349" }}>
            Nutrition, training, health, coaching and community, each with its own tools and one shared record.
          </p>
        </div>
        <div style={{ marginTop: r.plMt, display: "grid", gridTemplateColumns: r.plCols, gap: "48px", alignItems: "center" }}>
          <div style={{ display: r.plIdx, flexDirection: "column", gap: "6px" }}>
            {D.pls.map((pp, ppI) => (
              <div key={ppI} data-pli="" style={{ position: "relative", padding: "14px 18px 14px 22px", borderRadius: "16px", opacity: ".82", transition: "opacity .3s" }}>
                <span style={{ position: "absolute", left: "0", top: "14px", bottom: "14px", width: "3px", borderRadius: "3px", background: "rgba(125,103,217,.15)", overflow: "hidden" }}>
                  <span data-plf="" style={{ display: "block", width: "100%", height: "100%", background: pp.c, transformOrigin: "top", transform: "scaleY(0)" }} />
                </span>
                <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: ".22em", color: pp.c }}>
                  {pp.n}
                </span>
                {/* Active state (not in the handover; added once AA left the
                    inactive rows at .82): motion/pillars.ts sets the current
                    title to 800 with a teal underline, the others to 600. */}
                <div data-plt="" style={{ fontSize: "22px", fontWeight: "600", letterSpacing: "-.02em", marginTop: "2px", textDecorationLine: "none", textDecorationColor: "#4A7D76", textDecorationThickness: "2px", textUnderlineOffset: "5px" }}>
                  {pp.t}
                </div>
                <div style={{ fontSize: "14px", color: "#5B5349", marginTop: "2px" }}>
                  {pp.line}
                </div>
              </div>
            ))}
          </div>
          <div>
            <div id="pl-panes" style={{ position: "relative", height: r.plPaneH, display: r.plDisp, alignItems: r.plAlign, gap: "14px", overflowX: r.plOver, scrollSnapType: "x mandatory", overscrollBehaviorX: "contain", touchAction: "pan-x pan-y", margin: r.plM, padding: r.plPad, scrollbarWidth: "none" }}>
            <PaneNutrition r={r} />
            <PaneTraining r={r} />
            <PaneHealth r={r} />
            <PaneCoaching r={r} />
            <PaneCommunity r={r} />
            </div>
            <div style={{ display: r.dotsDisp, justifyContent: "center", gap: "8px", marginTop: "12px" }}>
              {D.pls.map((_pp, ppI) => (
                <span key={ppI} data-dot="" style={{ width: "20px", height: "6px", borderRadius: "9px", background: "rgba(34,30,26,.18)", transformOrigin: "center", transform: "scaleX(.3)" }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
