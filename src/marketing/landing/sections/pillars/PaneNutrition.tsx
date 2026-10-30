// Centium landing v29: section 03, pane 01 Nutrition (PI1 v6, 02_pages/09-PI1), the
// prototype markup with its exact inline styles. Its [data-w] elements are
// animated by motion/pillars.ts through motion/anim.ts.

import React from "react";
import * as D from "../data/pillars";
import type { SectionVals } from "../sectionVals";

export const PaneNutrition: React.FC<{ r: SectionVals }> = ({ r }) => (
  <div data-pls="0" style={{ zoom: r.plZoom, maxHeight: r.plMaxH, position: r.plPanePos, left: "0", top: "0", right: "0", bottom: "0", flex: `0 0 ${r.plPaneW}`, scrollSnapAlign: "center", opacity: r.plPaneOp, borderRadius: "22px", background: "#FFFFFF", border: "1px solid rgba(125,103,217,.16)", boxShadow: r.plSh, overflow: "hidden", display: "flex", flexDirection: "column", textAlign: "start" }}>
    <div style={{ height: "36px", flexShrink: "0", display: "flex", alignItems: "center", gap: "7px", padding: "0 14px", background: "#FAF9FE", borderBottom: "1px solid rgba(125,103,217,.1)" }}>
      <span style={{ width: "8px", height: "8px", borderRadius: "9px", background: "#E4DCF8" }} />
      <span style={{ width: "8px", height: "8px", borderRadius: "9px", background: "#DDE8E5" }} />
      <span style={{ width: "8px", height: "8px", borderRadius: "9px", background: "#E7E3DC" }} />
      <span style={{ marginInlineStart: "10px", fontSize: "11.5px", fontWeight: "700", color: "#756D63" }}>
        centium.atraxia.org/app/food
      </span>
    </div>
    <div style={{ position: "relative", flex: "1", padding: "18px", display: "grid", gridTemplateColumns: r.paneCols, gridTemplateRows: "auto 1fr auto", gap: "12px" }}>
      <div style={{ gridColumn: "1 / -1", position: "relative", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
        <span style={{ fontSize: "19px", fontWeight: "800", letterSpacing: "-.02em" }}>
          Food diary
        </span>
        <span style={{ fontSize: "12px", fontWeight: "700", color: "#4E3894" }}>
          Tuesday
        </span>
      </div>
      <div style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(125,103,217,.14)", display: "flex", gap: "14px", alignItems: "center" }}>
        <div style={{ position: "relative", width: "128px", height: "128px", flexShrink: "0" }}>
          <svg viewBox="0 0 120 120" style={{ width: "128px", height: "128px" }}>
            <circle cx="60" cy="60" r="52" fill="none" stroke="#F1EEF8" strokeWidth="9" />
            <circle data-w="0.05 0.6" data-ring="0.78" cx="60" cy="60" r="52" fill="none" stroke="#775FD7" strokeWidth="9" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" transform="rotate(-90 60 60)" />
            <circle cx="60" cy="60" r="39" fill="none" stroke="#F1EEF8" strokeWidth="9" />
            <circle data-w="0.12 0.66" data-ring="0.75" cx="60" cy="60" r="39" fill="none" stroke="#B9A9EE" strokeWidth="9" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" transform="rotate(-90 60 60)" />
            <circle cx="60" cy="60" r="26" fill="none" stroke="#F1EEF8" strokeWidth="9" />
            <circle data-w="0.18 0.72" data-ring="0.74" cx="60" cy="60" r="26" fill="none" stroke="#5D9C93" strokeWidth="9" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" transform="rotate(-90 60 60)" />
          </svg>
        </div>
        <div style={{ flex: "1", minWidth: "0" }}>
          <div style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#756D63" }}>
            TODAY
          </div>
          <div style={{ fontSize: "26px", fontWeight: "800", letterSpacing: "-.02em", lineHeight: "1.1" }}>
            <span data-w="0.05 0.6" data-cnt="1410">
              0
            </span>
          </div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#756D63" }}>
            of 2,340 kcal
          </div>
          <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "5px" }}>
            {D.macroLegend.map((ml, mlI) => (
              <div key={mlI} style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", fontWeight: "700" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "3px", background: ml.c }} />
                <span style={{ flex: "1" }}>
                  {ml.k}
                </span>
                <span style={{ color: "#5B5349", whiteSpace: "nowrap" }}>
                  {ml.v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: "relative", padding: "14px 14px 10px", borderRadius: "16px", border: "1px solid rgba(125,103,217,.14)", display: r.mhBlock }}>
        <div style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#756D63" }}>
          MEALS
        </div>
        <svg viewBox="0 0 4 100" preserveAspectRatio="none" style={{ position: "absolute", left: "24px", top: "40px", width: "4px", height: "calc(100% - 64px)" }}>
          <line data-w="0.1 0.8" data-draw="" x1="2" y1="0" x2="2" y2="100" stroke="#D9D2EE" strokeWidth="2" pathLength="1" strokeDasharray="1" strokeDashoffset="1" vectorEffect="non-scaling-stroke" />
        </svg>
        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {D.mealLine.map((me, meI) => (
            <div key={meI} data-w={me.w} data-tx="-14" style={{ position: "relative", display: "flex", gap: "12px", alignItems: "center", paddingInlineStart: "2px", opacity: "0" }}>
              <span style={{ width: "12px", height: "12px", flexShrink: "0", borderRadius: "99px", background: "#fff", border: `3px solid ${me.c}` }} />
              <div style={{ flex: "1", minWidth: "0", padding: "8px 10px", borderRadius: "12px", background: "#FAF9FE" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {me.t}
                  </span>
                  <span style={{ fontSize: "12.5px", fontWeight: "800", color: "#4E3894" }}>
                    {me.k}
                  </span>
                </div>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "#756D63" }}>
                  {me.m}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ gridColumn: "1 / -1", gridTemplateColumns: r.scanCols, gap: "12px", alignItems: "stretch", display: r.mhGrid }}>
        <div style={{ position: "relative", padding: "12px", borderRadius: "16px", background: "repeating-linear-gradient(135deg,#FBFAF7 0 10px,#F5F2EC 10px 20px)", border: "1px solid #EDEAE4", overflow: "hidden" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#6C655C" }}>
            LABNEH · 200 g
          </div>
          <div style={{ marginTop: "8px", display: "flex", gap: "2px", height: "40px" }}>
            {D.barcodeL.map((bc, bcI) => (
              <span key={bcI} style={{ width: bc, background: "#3B352D" }} />
            ))}
          </div>
          <div style={{ marginTop: "4px", fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", color: "#6C655C", letterSpacing: ".2em" }}>
            5 281027 410036
          </div>
          <span data-w="0.4 0.75" data-sweep="200" style={{ position: "absolute", left: "10px", top: "8px", bottom: "8px", width: "2px", background: "#775FD7", boxShadow: "0 0 0 3px rgba(125,103,217,.16)", opacity: "0" }} />
        </div>
        <div data-w="0.72 0.9" data-op="" style={{ padding: "10px 14px", borderRadius: "16px", border: "1px solid rgba(125,103,217,.16)", background: "#FFFFFF", opacity: "0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "800", letterSpacing: ".04em", whiteSpace: "nowrap" }}>
              Nutrition facts
            </span>
            <span data-w="0.85 0.98" data-stamp="" style={{ padding: "2px 8px", borderRadius: "99px", background: "#EDF4F3", color: "#2F5F58", fontSize: "10.5px", fontWeight: "800", opacity: "0" }}>
              Added to breakfast
            </span>
          </div>
          <div style={{ marginTop: "4px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px" }}>
            {D.facts.map((fa, faI) => (
              <div key={faI} style={{ borderTop: "2px solid #221E1A", paddingTop: "4px" }}>
                <div style={{ fontSize: "10px", fontWeight: "700", color: "#756D63" }}>
                  {fa.k}
                </div>
                <div style={{ fontSize: "15px", fontWeight: "800" }}>
                  {fa.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
