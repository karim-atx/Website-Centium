// Centium landing v29: section 03, pane 03 Health (PI1 v6, 02_pages/09-PI1), the
// prototype markup with its exact inline styles. Its [data-w] elements are
// animated by motion/pillars.ts through motion/anim.ts.

import React from "react";
import * as D from "../data/pillars";
import type { SectionVals } from "../sectionVals";

export const PaneHealth: React.FC<{ r: SectionVals }> = ({ r }) => (
  <div data-pls="2" style={{ zoom: r.plZoom, maxHeight: r.plMaxH, position: r.plPanePos, left: "0", top: "0", right: "0", bottom: "0", flex: `0 0 ${r.plPaneW}`, scrollSnapAlign: "center", opacity: r.plPaneOp, borderRadius: "22px", background: "#FFFFFF", border: "1px solid rgba(125,103,217,.16)", boxShadow: r.plSh, overflow: "hidden", display: "flex", flexDirection: "column", textAlign: "left" }}>
    <div style={{ height: "36px", flexShrink: "0", display: "flex", alignItems: "center", gap: "7px", padding: "0 14px", background: "#FAF9FE", borderBottom: "1px solid rgba(125,103,217,.1)" }}>
      <span style={{ width: "8px", height: "8px", borderRadius: "9px", background: "#E4DCF8" }} />
      <span style={{ width: "8px", height: "8px", borderRadius: "9px", background: "#DDE8E5" }} />
      <span style={{ width: "8px", height: "8px", borderRadius: "9px", background: "#E7E3DC" }} />
      <span style={{ marginLeft: "10px", fontSize: "11.5px", fontWeight: "700", color: "#756D63" }}>
        centium.atraxia.org/app/health
      </span>
    </div>
    <div style={{ position: "relative", flex: "1", padding: r.panePad, display: "grid", gridTemplateColumns: r.paneCols, gap: r.paneGap, alignContent: "stretch", gridTemplateRows: r.hRows }}>
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
        <span style={{ fontSize: "19px", fontWeight: "800", letterSpacing: "-.02em" }}>
          Health records
        </span>
        <span style={{ fontSize: "12px", fontWeight: "700", color: "#4E3894", whiteSpace: "nowrap" }}>
          Updated today
        </span>
      </div>
      <div style={{ gridColumn: "1 / -1", borderRadius: "16px", border: "1px solid rgba(125,103,217,.14)", background: "#FFFFFF", padding: "10px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#756D63" }}>
            RECORDS TIMELINE
          </span>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#4E3894" }}>
            5 documents
          </span>
        </div>
        <div style={{ position: "relative", marginTop: "10px", display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: "8px" }}>
          <span style={{ position: "absolute", left: "4%", right: "4%", top: "6px", height: "2px", background: "#EFEAFB" }} />
          <span data-w="0.05 0.5" data-sx="" style={{ position: "absolute", left: "4%", right: "4%", top: "6px", height: "2px", background: "#B9A9EE", transformOrigin: "left", transform: "scaleX(0)" }} />
          {D.recTimeline.map((rt, rtI) => (
            <div key={rtI} data-w={rt.w} data-ty="10" data-op="" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", opacity: "0" }}>
              <span style={{ width: "14px", height: "14px", borderRadius: "99px", background: rt.dot, border: "3px solid #fff", boxShadow: "0 0 0 1px #D9D2EE" }} />
              <div style={{ width: "100%", padding: "7px 8px", borderRadius: "10px", border: `1px solid ${rt.bd}`, background: rt.bg, textAlign: "left" }}>
                <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#756D63" }}>
                  {rt.d}
                </div>
                <div style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.25" }}>
                  {rt.t}
                </div>
                <div style={{ fontSize: "9.5px", fontWeight: "600", color: "#5B5349" }}>
                  {rt.m}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ borderRadius: "16px", border: "1px solid rgba(94,158,149,.18)", background: "#FFFFFF", padding: "10px 14px", flexDirection: "column", gap: "6px", display: r.mhFlex }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#756D63" }}>
            LAB RESULTS · 14 OCT
          </span>
          <span style={{ fontSize: "11px", fontWeight: "800", color: "#2F5F58" }}>
            18 in range ·{" "}
            <span style={{ color: "#6A54C4" }}>
              2 to review
            </span>
          </span>
        </div>
        {D.labPanels.map((lp, lpI) => (
          <div key={lpI}>
            <div style={{ fontSize: "9.5px", fontWeight: "800", letterSpacing: ".12em", color: "#756D63", margin: "2px 0 3px" }}>
              {lp.t}
            </div>
            {lp.rows.map((lr, lrI) => (
              <div key={lrI} style={{ padding: "3px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", fontWeight: "800" }}>
                  <span style={{ width: "14px", height: "14px", flexShrink: "0", borderRadius: "99px", background: lr.sbg, color: lr.sc, fontSize: "8.5px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {lr.icon}
                  </span>
                  <span style={{ flex: "1" }}>
                    {lr.k}
                  </span>
                  <span>
                    {lr.v}
                  </span>
                  <span style={{ fontSize: "9.5px", fontWeight: "700", color: lr.sc, width: "50px", textAlign: "right" }}>
                    {lr.st}
                  </span>
                </div>
                {lr.track ? (
                  <>
                    <div style={{ position: "relative", margin: "4px 0 0 20px", height: "5px", display: "flex", gap: "2px" }}>
                      <span style={{ flex: lr.lo, borderRadius: "3px 0 0 3px", background: "#EFEAFB" }} />
                      <span style={{ flex: lr.mid, background: "#CFE3DF" }} />
                      <span style={{ flex: lr.hi, borderRadius: "0 3px 3px 0", background: "#EFEAFB" }} />
                      {lr.prev.map((pv, pvI) => (
                        <span key={pvI} style={{ position: "absolute", left: pv, top: "0", width: "5px", height: "5px", marginLeft: "-2.5px", borderRadius: "99px", background: "#C3BCB2" }} />
                      ))}
                      <span data-w={lr.w} data-tkp={lr.x} style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: "100%" }}>
                        <span style={{ position: "absolute", left: "-5px", top: "-3px", width: "11px", height: "11px", borderRadius: "99px", background: lr.sc, border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
                      </span>
                    </div>
                  </>
                ) : null}
                {lr.open ? (
                  <>
                    <div data-w="0.7 0.85" data-op="" style={{ margin: "6px 0 2px 20px", padding: "6px 8px", borderRadius: "10px", background: "#FAF9FE", opacity: "0" }}>
                      <svg viewBox="0 0 160 36" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "30px" }}>
                        <rect x="0" y="16" width="160" height="20" fill="#E6F1EE" />
                        <polyline data-w="0.72 0.92" data-draw="" points="0,24 53,20 106,12 160,6" fill="none" stroke="#6A54C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" vectorEffect="non-scaling-stroke" />
                      </svg>
                      <div style={{ fontSize: "10px", fontWeight: "600", color: "#5B5349", lineHeight: "1.35" }}>
                        Higher than your last two tests. Worth talking through with your doctor.
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderRadius: "16px", border: "1px solid rgba(125,103,217,.14)", background: "#FFFFFF", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "7px", minHeight: "0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
          <span style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#756D63" }}>
            CYCLE · OCTOBER
          </span>
          <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#4E3894", whiteSpace: "nowrap" }}>
            Next period in about 19 days
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `${r.cycRing} minmax(0,1fr)`, gap: "16px", alignItems: "center" }}>
          <div style={{ position: "relative", width: r.cycRing, height: r.cycRing }}>
            <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%" }}>
              {D.cycSeg.map((cs, csI) => (
                <path key={csI} d={cs.d} fill="none" stroke={cs.c} strokeWidth="10" data-w={cs.w} data-op="" style={{ opacity: "0" }} />
              ))}
              <g data-w="0.35 0.8" data-rot={D.cycTodayDeg} style={{ transformOrigin: "60px 60px" }}>
                <circle cx="60" cy="14" r="6.5" fill="#FFFFFF" stroke="#4E3894" strokeWidth="2.2" />
              </g>
            </svg>
            <div style={{ position: "absolute", inset: "0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "9.5px", fontWeight: "800", letterSpacing: ".12em", color: "#756D63" }}>
                DAY
              </span>
              <span style={{ fontSize: "26px", fontWeight: "800", lineHeight: "1" }}>
                <span data-w="0.35 0.8" data-cnt="9" data-from="1">
                  1
                </span>
              </span>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "#756D63" }}>
                of 28
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: "0" }}>
            {D.cycPhases.map((cp, cpI) => (
              <div key={cpI} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 8px", borderRadius: "9px", background: cp.bg }}>
                <span style={{ width: "9px", height: "9px", flexShrink: "0", borderRadius: "3px", background: cp.c }} />
                <span style={{ flex: "1", fontSize: "12px", fontWeight: cp.fw, color: "#221E1A" }}>
                  {cp.t}
                </span>
                <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#6C655C", whiteSpace: "nowrap" }}>
                  {cp.d}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: "3px", fontSize: "9.5px", fontWeight: "700", color: "#756D63", textAlign: "center" }}>
          {D.calHead.map((ch, chI) => (
            <span key={chI}>
              {ch}
            </span>
          ))}
          {D.cycCal.map((cd, cdI) => (
            <span key={cdI} data-w={cd.w} data-op="" style={{ position: "relative", height: r.calCell, borderRadius: "6px", background: cd.bg, color: cd.ink, fontWeight: cd.fw, fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", opacity: "0", boxShadow: cd.ring }}>
              {cd.d}
            </span>
          ))}
        </div>
        <div style={{ alignItems: "center", gap: "6px", flexWrap: "wrap", display: r.mhFlex }}>
          <span style={{ fontSize: "9.5px", fontWeight: "800", letterSpacing: ".12em", color: "#756D63", marginRight: "2px" }}>
            TODAY
          </span>
          {D.cycLogs.map((lg, lgI) => (
            <span key={lgI} data-w={lg.w} data-ty="8" data-op="" style={{ padding: "3px 9px", borderRadius: "99px", background: lg.bg, color: lg.ink, fontSize: "10.5px", fontWeight: "700", opacity: "0" }}>
              {lg.t}
            </span>
          ))}
        </div>
        <div style={{ flex: "1", minHeight: "48px", flexDirection: "column", gap: "3px", display: r.mhFlex }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", fontWeight: "800", letterSpacing: ".1em", color: "#756D63" }}>
            <span>
              CYCLE LENGTH · 6 MONTHS
            </span>
            <span style={{ color: "#4E3894" }}>
              avg 28 d
            </span>
          </div>
          <div style={{ flex: "1", display: "grid", gridTemplateColumns: "26px minmax(0,1fr)", gridTemplateRows: "minmax(0,1fr) 12px", columnGap: "6px" }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: "9px", fontWeight: "700", color: "#756D63", textAlign: "right" }}>
              <span>
                30 d
              </span>
              <span>
                28 d
              </span>
              <span>
                26 d
              </span>
            </div>
            <div style={{ position: "relative", borderLeft: "1px solid #E6E1F1", borderBottom: "1px solid #E6E1F1" }}>
              <svg viewBox="0 0 200 100" preserveAspectRatio="none" style={{ position: "absolute", inset: "0", width: "100%", height: "100%" }}>
                <line x1="0" y1="0" x2="200" y2="0" stroke="#F1EEF8" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="50" x2="200" y2="50" stroke="#E4DCF8" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                <polyline data-w="0.6 0.95" data-draw="" points={D.cycLenPts} fill="none" stroke="#775FD7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" vectorEffect="non-scaling-stroke" />
              </svg>
              {D.cycLenDots.map((dt, dtI) => (
                <span key={dtI} data-w={dt.w} data-stamp="" style={{ position: "absolute", left: dt.x, top: dt.y, width: "7px", height: "7px", margin: "-3.5px 0 0 -3.5px", borderRadius: "99px", background: "#FFFFFF", border: "1.5px solid #775FD7", opacity: "0" }} />
              ))}
            </div>
            <span />
            <div style={{ position: "relative", fontSize: "9px", fontWeight: "700", color: "#756D63" }}>
              {D.cycLenLab.map((cll, cllI) => (
                <span key={cllI} style={{ position: "absolute", left: cll.x, top: "1px", transform: "translateX(-50%)" }}>
                  {cll.t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
