// Centium landing v29: section 03, pane 02 Training (PI1 v6, 02_pages/09-PI1), the
// prototype markup with its exact inline styles. Its [data-w] elements are
// animated by motion/pillars.ts through motion/anim.ts.

import React from "react";
import * as D from "../data/pillars";
import type { SectionVals } from "../sectionVals";

export const PaneTraining: React.FC<{ r: SectionVals }> = ({ r }) => (
  <div data-pls="1" style={{ zoom: r.plZoom, maxHeight: r.plMaxH, position: r.plPanePos, left: "0", top: "0", right: "0", bottom: "0", flex: `0 0 ${r.plPaneW}`, scrollSnapAlign: "center", opacity: r.plPaneOp, borderRadius: "22px", background: "#FFFFFF", border: "1px solid rgba(94,158,149,.2)", boxShadow: r.plSh, overflow: "hidden", display: "flex", flexDirection: "column", textAlign: "left" }}>
    <div style={{ height: "36px", flexShrink: "0", display: "flex", alignItems: "center", gap: "7px", padding: "0 14px", background: "#F6FAF9", borderBottom: "1px solid rgba(94,158,149,.14)" }}>
      <span style={{ width: "8px", height: "8px", borderRadius: "9px", background: "#E4DCF8" }} />
      <span style={{ width: "8px", height: "8px", borderRadius: "9px", background: "#DDE8E5" }} />
      <span style={{ width: "8px", height: "8px", borderRadius: "9px", background: "#E7E3DC" }} />
      <span style={{ marginLeft: "10px", fontSize: "11.5px", fontWeight: "700", color: "#8C8378" }}>
        centium.atraxia.org/app/workout
      </span>
    </div>
    <div style={{ position: "relative", flex: "1", padding: r.panePad, display: "grid", gridTemplateColumns: r.paneCols, gap: r.paneGap, alignContent: "stretch", gridTemplateRows: r.tRows }}>
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
        <span style={{ fontSize: "19px", fontWeight: "800", letterSpacing: "-.02em" }}>
          Push day
        </span>
        <span style={{ fontSize: "12px", fontWeight: "700", color: "#2F5F58" }}>
          Folder: Strength
        </span>
      </div>
      <div style={{ borderRadius: "16px", border: "1px solid rgba(94,158,149,.18)", background: "#FFFFFF", padding: "12px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#8C8378" }}>
            MUSCLES WORKED
          </span>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#2F5F58" }}>
            Front · Back
          </span>
        </div>
        <div style={{ flex: "1", display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "18px", paddingTop: "8px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <div style={{ position: "relative", display: "inline-block", height: r.figH }}>
              <div data-w="0.15 0.3" data-op="" style={{ position: "absolute", inset: "0", opacity: "0", filter: "drop-shadow(0 0 4px rgba(143,104,246,.6))" }}>
                <div style={{ position: "absolute", inset: "0", background: "rgba(143,104,246,.6)", WebkitMaskImage: "url(/body/zones/male-front-chest.png)", maskImage: "url(/body/zones/male-front-chest.png)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }} />
              </div>
              <div data-w="0.3 0.45" data-op="" style={{ position: "absolute", inset: "0", opacity: "0", filter: "drop-shadow(0 0 4px rgba(143,104,246,.6))" }}>
                <div style={{ position: "absolute", inset: "0", background: "rgba(143,104,246,.6)", WebkitMaskImage: "url(/body/zones/male-front-shoulders.png)", maskImage: "url(/body/zones/male-front-shoulders.png)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }} />
              </div>
              <div data-w="0.6 0.75" data-op="" style={{ position: "absolute", inset: "0", opacity: "0", filter: "drop-shadow(0 0 4px rgba(143,104,246,.6))" }}>
                <div style={{ position: "absolute", inset: "0", background: "rgba(143,104,246,.6)", WebkitMaskImage: "url(/body/zones/male-front-core.png)", maskImage: "url(/body/zones/male-front-core.png)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }} />
              </div>
              <img src="/body/male-front.png" alt="Front body" style={{ position: "relative", display: "block", height: "100%", width: "auto" }} />
            </div>
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#A9A29A" }}>
              Front
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <div style={{ position: "relative", display: "inline-block", height: r.figH }}>
              <div data-w="0.42 0.57" data-op="" style={{ position: "absolute", inset: "0", opacity: "0", filter: "drop-shadow(0 0 4px rgba(143,104,246,.6))" }}>
                <div style={{ position: "absolute", inset: "0", background: "rgba(143,104,246,.6)", WebkitMaskImage: "url(/body/zones/male-back-triceps.png)", maskImage: "url(/body/zones/male-back-triceps.png)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }} />
              </div>
              <div data-w="0.5 0.65" data-op="" style={{ position: "absolute", inset: "0", opacity: "0", filter: "drop-shadow(0 0 4px rgba(143,104,246,.6))" }}>
                <div style={{ position: "absolute", inset: "0", background: "rgba(143,104,246,.6)", WebkitMaskImage: "url(/body/zones/male-back-shoulders.png)", maskImage: "url(/body/zones/male-back-shoulders.png)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }} />
              </div>
              <img src="/body/male-back.png" alt="Back body" style={{ position: "relative", display: "block", height: "100%", width: "auto" }} />
            </div>
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#A9A29A" }}>
              Back
            </span>
          </div>
        </div>
        <div style={{ marginTop: "8px", flexWrap: "wrap", gap: "5px", display: r.mhFlex }}>
          {D.worked.map((wk, wkI) => (
            <span key={wkI} data-w={wk.w} data-op="" style={{ padding: "3px 8px", borderRadius: "99px", background: "#F4F1FB", color: "#5C48A8", fontSize: "10.5px", fontWeight: "800", opacity: "0" }}>
              {wk.t}
            </span>
          ))}
        </div>
      </div>
      <div style={{ flexDirection: "column", gap: "10px", display: r.mhFlex }}>
        <div style={{ borderRadius: "16px", border: "1px solid rgba(94,158,149,.18)", background: "#FFFFFF", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#F3F9F7", fontSize: "10px", fontWeight: "800", letterSpacing: ".1em", color: "#2F5F58" }}>
            <span>
              BENCH PRESS
            </span>
            <span>
              SET MARKS
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "34px 1fr 1fr 64px", padding: "6px 12px 0", fontSize: "9.5px", fontWeight: "800", letterSpacing: ".08em", color: "#A9A29A" }}>
            <span>
              SET
            </span>
            <span>
              KG
            </span>
            <span>
              REPS
            </span>
            <span />
          </div>
          {D.plSets.map((ps, psI) => (
            <div key={psI} style={{ position: "relative", display: "grid", gridTemplateColumns: "34px 1fr 1fr 64px", alignItems: "center", padding: "5px 12px", fontSize: "13px", fontWeight: "700" }}>
              <span style={{ position: "absolute", inset: "1px 6px", borderRadius: "8px", background: ps.bg }} />
              <span style={{ position: "relative" }}>
                {ps.n}
              </span>
              <span style={{ position: "relative" }}>
                <span data-w={ps.w} data-cnt={ps.kg}>
                  0
                </span>
              </span>
              <span style={{ position: "relative" }}>
                {ps.reps}
              </span>
              <span style={{ position: "relative", display: "flex", justifyContent: "flex-end" }}>
                <span data-w={ps.mw} data-stamp="" style={{ padding: "1px 7px", borderRadius: "99px", fontSize: "10px", fontWeight: "800", background: ps.mb, color: ps.mc, opacity: "0" }}>
                  {ps.mark}
                </span>
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "84px 1fr", gap: "10px" }}>
          <div style={{ borderRadius: "16px", border: "1px solid rgba(94,158,149,.18)", background: "#FFFFFF", padding: "8px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative", width: "52px", height: "52px" }}>
              <svg viewBox="0 0 60 60" style={{ width: "52px", height: "52px" }}>
                <circle cx="30" cy="30" r="24" fill="none" stroke="#EDF4F3" strokeWidth="6" />
                <circle data-w="0.45 0.95" data-ringd="0.62" cx="30" cy="30" r="24" fill="none" stroke="#5E9E95" strokeWidth="6" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="0" transform="rotate(-90 30 30)" />
              </svg>
              <span style={{ position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800" }}>
                <span data-w="0.45 0.95" data-cnt="34" data-from="90">
                  90
                </span>
                s
              </span>
            </div>
            <div style={{ fontSize: "9.5px", fontWeight: "800", color: "#2F5F58", marginTop: "3px" }}>
              REST
            </div>
          </div>
          <div style={{ borderRadius: "16px", border: "1px solid rgba(94,158,149,.18)", background: "#FFFFFF", padding: "9px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#8C8378" }}>
              <span>
                HEART RATE · THIS SESSION
              </span>
              <span style={{ color: "#2F5F58" }}>
                52 min
              </span>
            </div>
            <div style={{ position: "relative", marginTop: "6px" }}>
              <svg viewBox="0 0 200 64" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "60px" }}>
                <rect x="0" y="0" width="200" height="10" fill="#F3E9EE" />
                <rect x="0" y="10" width="200" height="13" fill="#EEF0F7" />
                <rect x="0" y="23" width="200" height="14" fill="#E6F1EE" />
                <rect x="0" y="37" width="200" height="14" fill="#EFF6F4" />
                <rect x="0" y="51" width="200" height="13" fill="#F8FAF9" />
                <polyline data-w="0.45 0.95" data-draw="" points={D.hrCurve} fill="none" stroke="#2F5F58" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="30" x2="200" y2="30" stroke="#5E9E95" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              </svg>
              <span data-w="0.8 0.92" data-stamp="" style={{ position: "absolute", left: "58%", top: "-4px", padding: "1px 6px", borderRadius: "99px", background: "#2F5F58", color: "#fff", fontSize: "9px", fontWeight: "800", opacity: "0" }}>
                Peak 171
              </span>
              <span data-w="0.86 0.96" data-op="" style={{ position: "absolute", right: "2px", top: "20px", fontSize: "9px", fontWeight: "800", color: "#2F5F58", opacity: "0" }}>
                Avg 138
              </span>
            </div>
            <div style={{ marginTop: "4px", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "4px", fontSize: "9px", fontWeight: "700", color: "#8C8378", textAlign: "center" }}>
              {D.zoneTime.map((zt, ztI) => (
                <span key={ztI}>
                  {zt.z}
                  <br />
                  <span style={{ color: "#221E1A", fontWeight: "800" }}>
                    {zt.m}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ gridColumn: "1 / -1", borderRadius: "16px", border: "1px solid rgba(94,158,149,.18)", background: "#FFFFFF", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px", minHeight: r.ormMin }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px 12px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#8C8378" }}>
            ESTIMATED ONE-REP MAX · 16 WEEKS
          </span>
          <div role="tablist" aria-label="Lift" style={{ display: "flex", gap: "2px", padding: "3px", borderRadius: "99px", background: "#F3F9F7", border: "1px solid rgba(94,158,149,.18)" }}>
            {D.ormLifts.map((lf, lfI) => (
              <span key={lfI} role="tab" aria-selected={lf.on === "true"} style={{ padding: "4px 11px", borderRadius: "99px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap", background: lf.bg, color: lf.ink }}>
                {lf.t}
              </span>
            ))}
          </div>
        </div>
        <div style={{ flex: "1", minHeight: "0", display: "grid", gridTemplateColumns: r.ormCols, gap: "14px" }}>
          <div style={{ display: "flex", flexDirection: r.ormNowDir, justifyContent: "center", alignItems: r.ormNowAlign, gap: "4px 12px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#8C8378" }}>
                Current estimate
              </div>
              <div style={{ fontSize: r.ormBig, fontWeight: "800", letterSpacing: "-.03em", lineHeight: "1.05" }}>
                <span data-w="0.1 0.95" data-cnt="88.5" data-from="76" data-dec="1">
                  76.0
                </span>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#5B5349" }}>
                  {" "}kg
                </span>
              </div>
            </div>
            <span data-w="0.7 0.9" data-stamp="" style={{ alignSelf: r.ormChipSelf, padding: "3px 9px", borderRadius: "99px", background: "#2F5F58", color: "#FFFFFF", fontSize: "11px", fontWeight: "800", whiteSpace: "nowrap", opacity: "0" }}>
              +12.5 kg since 2 Jul
            </span>
            <span style={{ fontSize: "10.5px", fontWeight: "600", color: "#8C8378" }}>
              Bench press · 32 sessions
            </span>
          </div>
          <div style={{ minHeight: r.ormPlotMin, display: "grid", gridTemplateColumns: "34px minmax(0,1fr)", gridTemplateRows: "minmax(0,1fr) 14px", columnGap: "6px" }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: "9.5px", fontWeight: "700", color: "#A9A29A", textAlign: "right", margin: "-5px 0" }}>
              <span>
                90 kg
              </span>
              <span>
                85
              </span>
              <span>
                80
              </span>
              <span>
                75
              </span>
            </div>
            <div style={{ position: "relative", borderLeft: "1px solid #E1ECEA", borderBottom: "1px solid #E1ECEA" }}>
              <span style={{ position: "absolute", left: D.ormBand.l, right: "0", top: D.ormBand.t, height: D.ormBand.h, background: "#EDF4F3", borderRadius: "4px" }} />
              <span style={{ position: "absolute", right: "4px", top: D.ormBand.lt, fontSize: "9px", fontWeight: "700", color: "#3F726D" }}>
                Recent range
              </span>
              <svg viewBox="0 0 300 100" preserveAspectRatio="none" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", overflow: "visible" }}>
                {D.ormGrid.map((og, ogI) => (
                  <line key={ogI} x1="0" y1={og} x2="300" y2={og} stroke="#EFF3F2" vectorEffect="non-scaling-stroke" />
                ))}
                <polyline data-w="0.12 0.95" data-draw="" points={D.ormTrend} fill="none" stroke="#2F5F58" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" vectorEffect="non-scaling-stroke" />
              </svg>
              {D.ormDots.map((od, odI) => (
                <span key={odI} data-w={od.w} data-stamp="" style={{ position: "absolute", left: od.x, top: od.y, width: "6px", height: "6px", margin: "-3px 0 0 -3px", borderRadius: "99px", background: "#8FC3BA", opacity: "0" }} />
              ))}
              {D.ormPRs.map((op, opI) => (
                <span key={opI} data-w={op.w} data-stamp="" style={{ position: "absolute", left: op.x, top: op.y, opacity: "0", transformOrigin: "0 100%" }}>
                  <span style={{ position: "absolute", left: "-6px", top: "-6px", width: "12px", height: "12px", borderRadius: "99px", background: "#2F5F58", border: "2px solid #FFFFFF", boxShadow: "0 0 0 1px #2F5F58" }} />
                  <span style={{ position: "absolute", left: op.lx, bottom: "9px", padding: "2px 6px", borderRadius: "6px", background: "#FFFFFF", border: "1px solid rgba(47,95,88,.28)", fontSize: "9px", fontWeight: "800", color: "#2F5F58", whiteSpace: "nowrap" }}>
                    PR ·{" "}{op.kg}{" "}kg ·{" "}{op.d}
                  </span>
                </span>
              ))}
            </div>
            <span />
            <div style={{ position: "relative", fontSize: "9.5px", fontWeight: "700", color: "#A9A29A" }}>
              {D.ormX.map((ox, oxI) => (
                <span key={oxI} style={{ position: "absolute", left: ox.x, top: "2px", transform: `translateX(${ox.tx})` }}>
                  {ox.t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ fontSize: "10px", fontWeight: "600", color: "#8C8378" }}>
          Estimated from your top sets
        </div>
      </div>
    </div>
  </div>
);
