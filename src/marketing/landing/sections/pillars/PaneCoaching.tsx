// Centium landing v29: section 03, pane 04 Coaching (PI1 v6, 02_pages/09-PI1), the
// prototype markup with its exact inline styles. Its [data-w] elements are
// animated by motion/pillars.ts through motion/anim.ts.

import React from "react";
import * as D from "../data/pillars";
import type { SectionVals } from "../sectionVals";
import { t } from "../../../../i18n/core";

export const PaneCoaching: React.FC<{ r: SectionVals }> = ({ r }) => (
  <div data-pls="3" style={{ zoom: r.plZoom, maxHeight: r.plMaxH, position: r.plPanePos, left: "0", top: "0", right: "0", bottom: "0", flex: `0 0 ${r.plPaneW}`, scrollSnapAlign: "center", opacity: r.plPaneOp, borderRadius: "22px", background: "#FFFFFF", border: "1px solid rgba(94,158,149,.2)", boxShadow: r.plSh, overflow: "hidden", display: "flex", flexDirection: "column", textAlign: "start" }}>
    <div style={{ height: "36px", flexShrink: "0", display: "flex", alignItems: "center", gap: "7px", padding: "0 14px", background: "#F6FAF9", borderBottom: "1px solid rgba(94,158,149,.14)" }}>
      <span style={{ width: "8px", height: "8px", borderRadius: "9px", background: "#E4DCF8" }} />
      <span style={{ width: "8px", height: "8px", borderRadius: "9px", background: "#DDE8E5" }} />
      <span style={{ width: "8px", height: "8px", borderRadius: "9px", background: "#E7E3DC" }} />
      <span style={{ marginInlineStart: "10px", fontSize: "11.5px", fontWeight: "700", color: "#756D63" }}>
        {/* i18n-ignore: URL */}
        centium.atraxia.org/app/coaching
      </span>
    </div>
    <div style={{ position: "relative", flex: "1", padding: r.panePad, display: "grid", gridTemplateColumns: r.paneCols, gap: r.paneGap, alignContent: "stretch", gridTemplateRows: r.cRows }}>
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
        <span style={{ fontSize: "19px", fontWeight: "800", letterSpacing: "-.02em" }}>
          {t("Find your team")}
        </span>
        <span style={{ fontSize: "12px", fontWeight: "700", color: "#2F5F58" }}>
          {t("Verified professionals")}
        </span>
      </div>
      <div style={{ borderRadius: "16px", border: "1px solid rgba(94,158,149,.18)", background: "#FFFFFF", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {D.proFilters.map((pf, pfI) => (
            <span key={pfI} style={{ padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "700", background: pf.bg, color: pf.ink, border: `1px solid ${pf.bd}` }}>
              {t(pf.t)}
            </span>
          ))}
        </div>
        {D.proList.map((pr, prI) => (
          <div key={prI} data-w={pr.w} data-tx="-12" style={{ position: "relative", display: "flex", alignItems: "center", gap: "9px", padding: "8px 10px", borderRadius: "12px", border: `1px solid ${pr.bd}`, background: pr.bg, opacity: "0" }}>
            <span style={{ width: "30px", height: "30px", flexShrink: "0", borderRadius: "99px", background: pr.abg, color: pr.aink, fontSize: "10.5px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {pr.i}
            </span>
            <div style={{ flex: "1", minWidth: "0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12.5px", fontWeight: "800", whiteSpace: "nowrap" }}>
                {t(pr.n)}
                <span style={{ width: "12px", height: "12px", borderRadius: "99px", background: "#5D9C93", color: "#fff", fontSize: "7.5px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ✓
                </span>
              </div>
              <div style={{ fontSize: "10.5px", fontWeight: "600", color: "#756D63", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {t(pr.m)}
              </div>
            </div>
          </div>
        ))}
        <div data-w="0.25 0.45" data-ty="14" data-op="" style={{ marginTop: "2px", padding: "10px 12px", borderRadius: "14px", background: "linear-gradient(160deg,#F3F9F7,#FFFFFF)", border: "1px solid rgba(94,158,149,.24)", opacity: "0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: "800" }}>
              {t("Lara Khoury")}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", paddingBlock: "2px", paddingInline: "2px 7px", borderRadius: "99px", background: "#2F5F58", color: "#fff", fontSize: "9.5px", fontWeight: "800" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "99px", background: "#8AC4BA", color: "#1E3F3A", fontSize: "7.5px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✓
              </span>
              {t("Verified")}
            </span>
          </div>
          <div style={{ marginTop: "6px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px", lineHeight: "1.4" }}>
            <div>
              <div style={{ fontSize: "9.5px", fontWeight: "800", letterSpacing: ".1em", color: "#756D63" }}>
                {t("CERTIFICATIONS")}
              </div>
              {t("MSc Clinical Nutrition, LDA registered")}
            </div>
            <div>
              <div style={{ fontSize: "9.5px", fontWeight: "800", letterSpacing: ".1em", color: "#756D63" }}>
                {t("EXPERIENCE")}
              </div>
              {t("Sports nutrition, 8 years in clinic")}
            </div>
          </div>
          <div style={{ position: "relative", marginTop: "8px", height: "32px" }}>
            <span data-w="0.42 0.52" data-out="" style={{ position: "absolute", inset: "0", borderRadius: "99px", background: "#775FD7", color: "#fff", fontSize: "12.5px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {t("Hire Lara")}
            </span>
            <span data-w="0.46 0.56" data-op="" style={{ position: "absolute", inset: "0", borderRadius: "99px", background: "#2F5F58", color: "#fff", fontSize: "12.5px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", opacity: "0" }}>
              {t("✓ Hired")}
            </span>
          </div>
        </div>
        <div data-w="0.56 0.68" data-ty="12" data-op="" style={{ padding: "10px 12px", borderRadius: "14px", background: "#EDF4F3", display: "flex", alignItems: "center", gap: "10px", opacity: "0" }}>
          <div style={{ width: "40px", flexShrink: "0", borderRadius: "9px", overflow: "hidden", border: "1px solid rgba(94,158,149,.3)", textAlign: "center", background: "#FFFFFF" }}>
            <div style={{ background: "#2F5F58", color: "#FFFFFF", fontSize: "8.5px", fontWeight: "800", padding: "1px 0" }}>
              {t("THU")}
            </div>
            <div style={{ fontSize: "15px", fontWeight: "800", lineHeight: "1.3" }}>
              22
            </div>
          </div>
          <div style={{ flex: "1", minWidth: "0" }}>
            <div style={{ fontSize: "9.5px", fontWeight: "800", letterSpacing: ".12em", color: "#3D6E69" }}>
              {t("NEXT SESSION")}
            </div>
            <div style={{ fontSize: "12.5px", fontWeight: "800" }}>
              {t("First check-in with Lara")}
            </div>
            <div style={{ fontSize: "10.5px", fontWeight: "600", color: "#3D6E69" }}>
              {t("18:00 · video call · 30 min")}
            </div>
          </div>
          <span data-w="0.64 0.74" data-stamp="" style={{ padding: "3px 9px", borderRadius: "99px", background: "#2F5F58", color: "#FFFFFF", fontSize: "10px", fontWeight: "800", opacity: "0" }}>
            {t("Booked")}
          </span>
        </div>
        <div data-w="0.68 0.78" data-op="" style={{ flex: "1", minHeight: "0", padding: "10px 12px", borderRadius: "14px", border: "1px solid rgba(94,158,149,.24)", background: "#FFFFFF", flexDirection: "column", gap: "6px", opacity: "0", display: r.mhFlex }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "9.5px", fontWeight: "800", letterSpacing: ".12em", color: "#3D6E69" }}>
              {t("PLAN LARA SHARED")}
            </span>
            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#756D63", whiteSpace: "nowrap" }}>
              {t("Mobility and strength · week 1")}
            </span>
          </div>
          {D.laraPlan.map((lp, lpI) => (
            <div key={lpI} data-w={lp.w} data-tx="-10" style={{ flex: "1 1 0", minHeight: "26px", display: "flex", alignItems: "center", gap: "9px", padding: "0 9px", borderRadius: "10px", background: "#F6FAF9", opacity: "0" }}>
              <span style={{ width: "20px", height: "20px", flexShrink: "0", borderRadius: "99px", background: "#DAEAE7", color: "#2F5F58", fontSize: "10px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {lp.n}
              </span>
              <span style={{ flex: "1", minWidth: "0", fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {t(lp.t)}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono','IBM Plex Sans Arabic',monospace", fontSize: "11px", color: "#2F5F58", whiteSpace: "nowrap" }}>
                {lp.sr}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flexDirection: "column", gap: "10px", display: r.mhFlex }}>
        <div data-w="0.55 0.68" data-op="" style={{ borderRadius: "16px", border: "1px solid rgba(125,103,217,.14)", background: "#FFFFFF", padding: "10px 12px", opacity: "0" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".12em", color: "#756D63" }}>
              {t("NUTRITION PLAN")}
            </span>
            <span data-w="0.66 0.76" data-stamp="" style={{ padding: "1px 7px", borderRadius: "99px", background: "#EDF4F3", color: "#2F5F58", fontSize: "9.5px", fontWeight: "800", opacity: "0" }}>
              {t("Updated")}
            </span>
          </div>
          <div style={{ marginTop: "4px", fontSize: "13px", fontWeight: "800" }}>
            {t("High protein · week 3")}
          </div>
          <div style={{ marginTop: "4px", display: "flex", justifyContent: "space-between", fontSize: "11.5px", fontWeight: "700", color: "#5B5349" }}>
            <span>
              {t("Protein target")}
            </span>
            <span>
              <span data-w="0.6 0.75" data-cnt="165" data-from="150">
                150
              </span>
              {" "}{t("g")}
            </span>
          </div>
        </div>
        <div style={{ flexShrink: "0", padding: "10px 12px", borderRadius: "16px", background: "#FAF9FE", border: "1px solid rgba(125,103,217,.12)", display: "flex", flexDirection: "column", gap: "6px" }}>
          {D.coachChat.map((cc, ccI) => (
            <div key={ccI} data-w={cc.w} data-op="" style={{ alignSelf: cc.side, maxWidth: "88%", padding: "7px 11px", borderRadius: "13px", fontSize: "12px", fontWeight: "600", background: cc.bg, color: cc.ink, opacity: "0" }}>
              {t(cc.t)}
            </div>
          ))}
        </div>
        <div data-w="0.86 0.95" data-op="" style={{ position: "relative", flex: "1", borderRadius: "16px", overflow: "hidden", background: "repeating-linear-gradient(135deg,#EEF4F2 0 10px,#E5EEEB 10px 20px)", minHeight: r.vidH, flexDirection: "column", justifyContent: "space-between", padding: "9px 12px", opacity: "0", display: r.mhBlock }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'JetBrains Mono','IBM Plex Sans Arabic',monospace", fontSize: "10px", color: "#516E6A" }}>
              {t("video call")}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono','IBM Plex Sans Arabic',monospace", fontSize: "11px", color: "#2F5F58" }}>
              00:42
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ padding: "3px 9px", borderRadius: "99px", background: "#FFFFFF", fontSize: "11px", fontWeight: "800", color: "#2F5F58" }}>
              {t("Lara Khoury")}
            </span>
            <div style={{ flex: "1", display: "flex", alignItems: "center", gap: "3px", height: "20px" }}>
              {D.voice.map((vc, vcI) => (
                <span key={vcI} data-w={vc.w2} data-sy="" style={{ flex: "1", height: vc.h, borderRadius: "2px", background: "#5D9C93", transformOrigin: "center", transform: "scaleY(0)" }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
