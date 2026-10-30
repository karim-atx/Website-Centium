// Centium landing v29: section 03, pane 05 Community (PI1 v6, 02_pages/09-PI1), the
// prototype markup with its exact inline styles. Its [data-w] elements are
// animated by motion/pillars.ts through motion/anim.ts.

import React from "react";
import * as D from "../data/pillars";
import type { SectionVals } from "../sectionVals";

export const PaneCommunity: React.FC<{ r: SectionVals }> = ({ r }) => (
  <div data-pls="4" style={{ zoom: r.plZoom, maxHeight: r.plMaxH, position: r.plPanePos, left: "0", top: "0", right: "0", bottom: "0", flex: `0 0 ${r.plPaneW}`, scrollSnapAlign: "center", opacity: r.plPaneOp, borderRadius: "22px", background: "#FFFFFF", border: "1px solid rgba(125,103,217,.16)", boxShadow: r.plSh, overflow: "hidden", display: "flex", flexDirection: "column", textAlign: "start" }}>
    <div style={{ height: "36px", flexShrink: "0", display: "flex", alignItems: "center", gap: "7px", padding: "0 14px", background: "#FAF9FE", borderBottom: "1px solid rgba(125,103,217,.1)" }}>
      <span style={{ width: "8px", height: "8px", borderRadius: "9px", background: "#E4DCF8" }} />
      <span style={{ width: "8px", height: "8px", borderRadius: "9px", background: "#DDE8E5" }} />
      <span style={{ width: "8px", height: "8px", borderRadius: "9px", background: "#E7E3DC" }} />
      <span style={{ marginInlineStart: "10px", fontSize: "11.5px", fontWeight: "700", color: "#756D63" }}>
        centium.atraxia.org/app/community
      </span>
    </div>
    <div style={{ position: "relative", flex: "1", padding: r.panePad, display: "grid", gridTemplateColumns: r.paneCols, gap: r.paneGap, alignContent: "stretch", gridTemplateRows: r.cRows }}>
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
        <span style={{ fontSize: "19px", fontWeight: "800", letterSpacing: "-.02em" }}>
          Community
        </span>
        <span style={{ fontSize: "12px", fontWeight: "700", color: "#4E3894" }}>
          Professional answers
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", minHeight: "0" }}>
        <div style={{ borderRadius: "16px", border: "1px solid rgba(125,103,217,.14)", background: "#FFFFFF", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
            {D.forumCats.map((fc, fcI) => (
              <span key={fcI} style={{ padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "700", background: fc.bg, color: fc.ink }}>
                {fc.t}
              </span>
            ))}
          </div>
          {D.feedPosts.map((fp, fpI) => (
            <div key={fpI} data-w={fp.w} data-tx="-12" style={{ display: "flex", alignItems: "center", gap: "9px", padding: "7px 9px", borderRadius: "11px", background: fp.bg, border: `1px solid ${fp.bd}`, opacity: "0" }}>
              <span style={{ width: "28px", height: "28px", flexShrink: "0", borderRadius: "99px", background: fp.abg, color: fp.aink, fontSize: "10px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {fp.i}
              </span>
              <div style={{ flex: "1", minWidth: "0" }}>
                <div style={{ fontSize: "12.5px", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {fp.t}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", fontWeight: "600", color: "#6C655C", whiteSpace: "nowrap" }}>
                  {fp.m}
                  {fp.pro ? (
                    <>
                      <span style={{ padding: "0 6px", borderRadius: "99px", background: "#775FD7", color: "#FFFFFF", fontSize: "8.5px", fontWeight: "800", lineHeight: "14px" }}>
                        Professional
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
              <div style={{ textAlign: "end", flexShrink: "0" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#6A54C4" }}>
                  ♥{" "}
                  <span data-w={fp.lw} data-cnt={fp.likes} data-from={fp.from}>
                    {fp.from}
                  </span>
                </div>
                <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#6C655C" }}>
                  {fp.r}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ flex: "1", minHeight: "0", borderRadius: "16px", border: "1px solid rgba(125,103,217,.14)", background: "#FFFFFF", padding: "10px 12px", flexDirection: "column", gap: "7px", display: r.mhFlex }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ width: "44px", height: "44px", flexShrink: "0", borderRadius: "11px", background: "repeating-linear-gradient(135deg,#F4F1FB 0 8px,#ECE7F8 8px 16px)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "3px", fontFamily: "'JetBrains Mono',monospace", fontSize: "7px", color: "#6B5E94" }}>
              cover
            </span>
            <div style={{ flex: "1", minWidth: "0" }}>
              <div style={{ fontSize: "9.5px", fontWeight: "800", letterSpacing: ".12em", color: "#756D63" }}>
                COURSE
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: "800" }}>
                Mobility basics
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10.5px", fontWeight: "700", color: "#5B5349" }}>
                Maya Aoun
                <span style={{ width: "11px", height: "11px", borderRadius: "99px", background: "#5D9C93", color: "#FFFFFF", fontSize: "7px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ✓
                </span>
              </div>
            </div>
            <div style={{ position: "relative", width: "44px", height: "44px", flexShrink: "0" }}>
              <svg viewBox="0 0 44 44" style={{ width: "44px", height: "44px" }}>
                <circle cx="22" cy="22" r="18" fill="none" stroke="#EFEAFB" strokeWidth="5" />
                <circle data-w="0.3 0.85" data-ring="0.5" cx="22" cy="22" r="18" fill="none" stroke="#775FD7" strokeWidth="5" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" transform="rotate(-90 22 22)" />
              </svg>
              <span style={{ position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "800" }}>
                3/6
              </span>
            </div>
          </div>
          <div data-w="0.45 0.6" data-op="" style={{ padding: "8px 10px", borderRadius: "12px", background: "#FAF9FE", border: "1px solid rgba(125,103,217,.18)", opacity: "0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "26px", height: "26px", flexShrink: "0", borderRadius: "99px", background: "#775FD7", color: "#FFFFFF", fontSize: "9px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ❚❚
              </span>
              <div style={{ flex: "1", minWidth: "0" }}>
                <div style={{ fontSize: "11.5px", fontWeight: "800" }}>
                  4 · Daily flow
                </div>
                <div style={{ position: "relative", marginTop: "6px", height: "4px", borderRadius: "9px", background: "#E4DCF8" }}>
                  <span data-w="0.5 0.95" data-sx="" style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: "58%", borderRadius: "9px", background: "#775FD7", transformOrigin: "left", transform: "scaleX(0)" }} />
                  <span data-w="0.5 0.95" data-tkp="58" style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: "100%" }}>
                    <span style={{ position: "absolute", left: "-5px", top: "-3px", width: "10px", height: "10px", borderRadius: "99px", background: "#FFFFFF", border: "2px solid #775FD7" }} />
                  </span>
                </div>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#5B5349", whiteSpace: "nowrap" }}>
                <span data-w="0.5 0.95" data-cnt="7" data-from="0">
                  0
                </span>
                :15 / 12:30
              </span>
            </div>
          </div>
          <div style={{ flex: "1", minHeight: "0", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "2px" }}>
            {D.lessons.map((ls, lsI) => (
              <div key={lsI} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 6px", borderRadius: "8px", background: ls.bg, fontSize: "11.5px", fontWeight: "700" }}>
                <span style={{ position: "relative", width: "15px", height: "15px", flexShrink: "0", borderRadius: "99px", border: `1.5px solid ${ls.bd}` }}>
                  {ls.done ? (
                    <>
                      <span data-w={ls.w} data-stamp="" style={{ position: "absolute", inset: "-1.5px", borderRadius: "99px", background: "#775FD7", color: "#FFFFFF", fontSize: "8px", display: "flex", alignItems: "center", justifyContent: "center", opacity: "0" }}>
                        ✓
                      </span>
                    </>
                  ) : null}
                </span>
                <span style={{ flex: "1" }}>
                  {ls.t}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#6C655C" }}>
                  {ls.d}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ borderRadius: "16px", border: "1px solid rgba(125,103,217,.14)", background: "#FFFFFF", padding: "12px", display: "flex", flexDirection: "column", gap: "8px", minHeight: "0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: "9.5px", fontWeight: "800", letterSpacing: ".12em", color: "#756D63" }}>
            OPEN THREAD · RUNNING
          </span>
          <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#6A54C4" }}>
            ♥{" "}
            <span data-w="0.1 0.9" data-cnt="64" data-from="12">
              12
            </span>
          </span>
        </div>
        <div style={{ display: "flex", gap: "9px", alignItems: "center" }}>
          <span style={{ width: "32px", height: "32px", flexShrink: "0", borderRadius: "99px", background: "#EDEAE4", color: "#5B5349", fontSize: "11px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
            RH
          </span>
          <div style={{ flex: "1", minWidth: "0" }}>
            <div style={{ fontSize: "14px", fontWeight: "800" }}>
              Best pre-run breakfast?
            </div>
            <div style={{ fontSize: "10.5px", fontWeight: "600", color: "#756D63" }}>
              Rami Haddad · 2 h ago
            </div>
          </div>
        </div>
        <p style={{ fontSize: "12px", lineHeight: "1.5", color: "#3B352D" }}>
          Long run on Saturday, 16 km. What do you eat before, and how early?
        </p>
        <div style={{ flex: "1", minHeight: "0", flexDirection: "column", justifyContent: "space-between", gap: "7px", display: r.mhFlex }}>
          {D.replies.map((rp, rpI) => (
            <div key={rpI} data-w={rp.w} data-ty="14" data-op="" style={{ marginInlineStart: "14px", padding: "8px 11px", borderRadius: "12px", border: `1px solid ${rp.bd}`, background: rp.bg, opacity: "0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", fontWeight: "800" }}>
                {rp.n}
                {rp.pro ? (
                  <>
                    <span style={{ padding: "1px 6px", borderRadius: "99px", background: "#775FD7", color: "#FFFFFF", fontSize: "9px", fontWeight: "800" }}>
                      Professional
                    </span>
                  </>
                ) : null}
                <span style={{ marginInlineStart: "auto", fontSize: "11px", color: "#6A54C4" }}>
                  ♥{" "}
                  <span data-w={rp.lw} data-cnt={rp.likes}>
                    0
                  </span>
                </span>
              </div>
              <div style={{ marginTop: "2px", fontSize: "12px", color: "#3B352D", lineHeight: "1.4" }}>
                {rp.t}
              </div>
            </div>
          ))}
        </div>
        <div style={{ alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "12px", border: "1px solid #EDEAE4", background: "#FAF9F7", display: r.mhFlex }}>
          <span style={{ flex: "1", fontSize: "11.5px", fontWeight: "600", color: "#756D63" }}>
            Write a reply
          </span>
          <span style={{ padding: "4px 10px", borderRadius: "99px", background: "#775FD7", color: "#FFFFFF", fontSize: "10.5px", fontWeight: "800" }}>
            Reply
          </span>
        </div>
      </div>
    </div>
  </div>
);
