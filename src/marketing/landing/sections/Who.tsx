// Centium landing v29: section 05 "Built for people who show up." (WH1 v6,
// 02_pages/12-WH1), the prototype markup with its exact inline styles: four
// cards (Principled, Determined, Intentional, Proactive), a row of four on
// desktop and a swipe row on mobile. Each card's figure builds as the card
// rises into view (motion/who.ts). The id "who" is kept for later anchors.

import React from "react";
import { ChapterMark } from "./ChapterMark";
import * as D from "./data/who";
import type { SectionVals } from "./sectionVals";
import { t } from "../../../i18n/core";

export const Who: React.FC<{ r: SectionVals }> = ({ r }) => (
  <section id="who" data-screen-label="WH1 v6 Who it's for" style={{ position: "relative", zIndex: "2", padding: `${r.secY} ${r.px}` }}>
    <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <ChapterMark n="05" t={t("Who it's for")} size={r.chEy} />
        <h2 style={{ marginTop: "14px", fontWeight: "800", fontSize: r.h2, lineHeight: "1.04", letterSpacing: "-.035em" }}>
          {t("Built for people who show up.")}
        </h2>
      </div>
      <div id="who-cards" style={{ margin: r.fourM, display: "grid", gridTemplateColumns: r.four, gridAutoFlow: r.fourFlow, gridAutoColumns: r.fourAuto, gap: "16px", overflowX: r.fourOv, scrollSnapType: "x mandatory", overscrollBehaviorX: "contain", touchAction: "pan-x pan-y", scrollPadding: "0 20px", padding: r.fourP, scrollbarWidth: "none" }}>
        <div data-inst="0" style={{ scrollSnapAlign: "start", padding: "24px", borderRadius: "18px", background: "#FFFFFF", border: "1px solid rgba(125,103,217,.14)", boxShadow: "0 1px 2px rgba(72,58,130,.05),0 10px 24px rgba(72,58,130,.05)", display: r.instDisp, flexDirection: "column-reverse", justifyContent: "flex-end", gridTemplateColumns: r.instCols, gap: "18px", alignItems: r.instAlignI, textAlign: r.instAlign }}>
          <div style={{ position: "relative", width: r.instS, height: r.instS, margin: "0 auto" }}>
            <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%" }}>
              {D.dialTicks.map((dt, dtI) => (
                <g key={dtI} transform={dt.tr}>
                  <rect x="59.2" y="7" width="1.6" height="10" rx=".8" fill="#EFEAFB" />
                  {dt.on ? (
                    <>
                      <rect data-w={dt.w} data-op="" x="58" y="6" width="4" height="13" rx="2" fill="#775FD7" style={{ opacity: "0" }} />
                    </>
                  ) : null}
                </g>
              ))}
            </svg>
            <div style={{ position: "absolute", inset: "0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span data-w="0 0.9" data-cnt="18" style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-.02em", lineHeight: "1" }}>
                0
              </span>
              <span style={{ fontSize: r.eF10, fontWeight: "800", letterSpacing: ".12em", color: "#756D63" }}>
                {t("DAY STREAK")}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "19px", fontWeight: "700", color: "#6A54C4" }}>
              {t("Principled")}
            </div>
            <p style={{ marginTop: "6px", fontSize: "14px", lineHeight: "1.55", color: "#5B5349" }}>
              {t("Shows up, puts in the work, and wants a platform that keeps up.")}
            </p>
            <div style={{ marginTop: "14px", display: "flex", justifyContent: r.instJust, gap: "5px" }}>
              {D.weekChecks.map((wc, wcI) => (
                <span key={wcI} style={{ position: "relative", width: "20px", height: "20px", borderRadius: "7px", border: "1.5px solid #E4DCF8" }}>
                  {wc.on ? (
                    <>
                      <span data-w={wc.w} data-stamp="" style={{ position: "absolute", inset: "-1.5px", borderRadius: "7px", background: "#775FD7", color: "#fff", fontSize: r.eF10, fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", opacity: "0" }}>
                        ✓
                      </span>
                    </>
                  ) : null}
                </span>
              ))}
            </div>
            <div style={{ marginTop: "6px", fontSize: r.eF115, fontWeight: "700", color: "#756D63" }}>
              {t("6 of 7 days this week")}
            </div>
          </div>
        </div>
        <div data-inst="1" style={{ scrollSnapAlign: "start", padding: "24px", borderRadius: "18px", background: "#FFFFFF", border: "1px solid rgba(94,158,149,.2)", boxShadow: "0 1px 2px rgba(72,58,130,.05),0 10px 24px rgba(72,58,130,.05)", display: r.instDisp, flexDirection: "column-reverse", justifyContent: "flex-end", gridTemplateColumns: r.instCols, gap: "18px", alignItems: r.instAlignI, textAlign: r.instAlign }}>
          <div style={{ position: "relative", width: r.instS, height: r.instS, margin: "0 auto" }}>
            <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%" }}>
              <path d="M 14 78 A 46 46 0 0 1 106 78" fill="none" stroke="#EDF4F3" strokeWidth="6" strokeLinecap="round" />
              <path data-w="0.05 0.85" data-ring="0.567" d="M 14 78 A 46 46 0 0 1 106 78" fill="none" stroke="#5D9C93" strokeWidth="6" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
              <g transform="rotate(-90 60 78)">
                <g data-w="0.05 0.85" data-rot="102" style={{ transformOrigin: "60px 78px" }}>
                  <line x1="60" y1="78" x2="60" y2="42" stroke="#221E1A" strokeWidth="1.6" strokeLinecap="round" />
                </g>
              </g>
              <circle cx="60" cy="78" r="3.5" fill="#221E1A" />
              <text x="14" y="100" textAnchor="middle" fontSize="9" fontWeight="700" fill="#756D63" fontFamily='Manrope, "IBM Plex Sans Arabic"'>
                78.0
              </text>
              <text x="106" y="100" textAnchor="middle" fontSize="9" fontWeight="700" fill="#2F5F58" fontFamily='Manrope, "IBM Plex Sans Arabic"'>
                72.0
              </text>
            </svg>
            <div style={{ position: "absolute", left: "0", right: "0", bottom: "2px", textAlign: "center" }}>
              <span data-w="0.05 0.85" data-cnt="74.6" data-from="78" data-dec="1" style={{ fontSize: "20px", fontWeight: "800" }}>
                78.0
              </span>
              <span style={{ fontSize: r.eF11, fontWeight: "700", color: "#756D63" }}>
                {" "}{t("kg")}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "19px", fontWeight: "700", color: "#3D6E69" }}>
              {t("Determined")}
            </div>
            <p style={{ marginTop: "6px", fontSize: "14px", lineHeight: "1.55", color: "#5B5349" }}>
              {t("Knows where they want to go and wants everything connected to get there.")}
            </p>
            <svg viewBox="0 0 160 40" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "38px", marginTop: "14px" }}>
              <line x1="0" y1="34" x2="160" y2="34" stroke="#CFE3DF" strokeDasharray="3 4" />
              <polyline data-w="0.2 0.9" data-draw="" points="0,6 20,9 40,10 60,15 80,17 100,20 120,22 140,24 160,25" fill="none" stroke="#5D9C93" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" vectorEffect="non-scaling-stroke" />
            </svg>
            <div style={{ marginTop: "6px", display: "flex", justifyContent: "space-between", fontSize: r.eF115, fontWeight: "700", color: "#756D63" }}>
              <span>
                {t("12 weeks")}
              </span>
              <span style={{ color: "#2F5F58" }}>
                {t("Goal 72.0 kg")}
              </span>
            </div>
          </div>
        </div>
        <div data-inst="2" style={{ scrollSnapAlign: "start", padding: "24px", borderRadius: "18px", background: "#FFFFFF", border: "1px solid rgba(125,103,217,.14)", boxShadow: "0 1px 2px rgba(72,58,130,.05),0 10px 24px rgba(72,58,130,.05)", display: r.instDisp, flexDirection: "column-reverse", justifyContent: "flex-end", gridTemplateColumns: r.instCols, gap: "18px", alignItems: r.instAlignI, textAlign: r.instAlign }}>
          <div style={{ position: "relative", width: r.instS, height: r.instS, margin: "0 auto" }}>
            <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%" }}>
              <circle cx="60" cy="60" r="50" fill="none" stroke="#F1EEF8" strokeWidth="5" />
              <circle data-w="0.05 0.8" data-ring="0.776" cx="60" cy="60" r="50" fill="none" stroke="#775FD7" strokeWidth="5" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" transform="rotate(-90 60 60)" />
              <circle cx="60" cy="60" r="36" fill="none" stroke="#F1EEF8" strokeWidth="4" />
              <circle data-w="0.12 0.86" data-ring="0.75" cx="60" cy="60" r="36" fill="none" stroke="#B9A9EE" strokeWidth="4" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" transform="rotate(-90 60 60)" />
            </svg>
            <div style={{ position: "absolute", inset: "0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "22px", fontWeight: "800", lineHeight: "1" }}>
                <span data-w="0.05 0.8" data-cnt="128">
                  0
                </span>
                <span style={{ fontSize: "13px", color: "#756D63" }}>
                  {" "}/ 165
                </span>
              </span>
              <span style={{ fontSize: r.eF10, fontWeight: "800", letterSpacing: ".12em", color: "#756D63" }}>
                {t("G PROTEIN")}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "19px", fontWeight: "700", color: "#6A54C4" }}>
              {t("Intentional")}
            </div>
            <p style={{ marginTop: "6px", fontSize: "14px", lineHeight: "1.55", color: "#5B5349" }}>
              {t("Pays attention to the details that shape their health and wants them all in one place.")}
            </p>
            <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px", textAlign: "start" }}>
              {D.instMacros.map((im, imI) => (
                <div key={imI}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: r.eF115, fontWeight: "700" }}>
                    <span>
                      {t(im.k)}
                    </span>
                    <span style={{ color: "#5B5349" }}>
                      {t(im.v)}
                    </span>
                  </div>
                  <div style={{ marginTop: "3px", height: "5px", borderRadius: "9px", background: "#F1EEF8", overflow: "hidden" }}>
                    <div data-w={im.w} data-sx="" style={{ height: "100%", width: im.p, borderRadius: "9px", background: im.c, transformOrigin: "left", transform: "scaleX(0)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div data-inst="3" style={{ scrollSnapAlign: "start", padding: "24px", borderRadius: "18px", background: "#FFFFFF", border: "1px solid rgba(94,158,149,.2)", boxShadow: "0 1px 2px rgba(72,58,130,.05),0 10px 24px rgba(72,58,130,.05)", display: r.instDisp, flexDirection: "column-reverse", justifyContent: "flex-end", gridTemplateColumns: r.instCols, gap: "18px", alignItems: r.instAlignI, textAlign: r.instAlign }}>
          <div style={{ position: "relative", width: r.instS, height: r.instS, margin: "0 auto" }}>
            <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%" }}>
              <line x1="16" y1="64" x2="104" y2="64" stroke="#EDEAE4" strokeWidth="1.6" strokeLinecap="round" />
              <polyline data-w="0.05 0.85" data-draw="" points="16,82 60,64 104,44" fill="none" stroke="#5D9C93" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
              <rect x="16" y="40" width="88" height="22" rx="4" fill="#EDF4F3" opacity=".7" />
              <circle data-w="0.05 0.2" data-stamp="" cx="16" cy="82" r="6" fill="#C9A36A" style={{ opacity: "0", transformOrigin: "16px 82px" }} />
              <circle data-w="0.4 0.55" data-stamp="" cx="60" cy="64" r="6" fill="#775FD7" style={{ opacity: "0", transformOrigin: "60px 64px" }} />
              <circle data-w="0.75 0.9" data-stamp="" cx="104" cy="44" r="6" fill="#2F5F58" style={{ opacity: "0", transformOrigin: "104px 44px" }} />
              <text x="16" y="100" textAnchor="middle" fontSize="9" fontWeight="700" fill="#756D63" fontFamily='Manrope, "IBM Plex Sans Arabic"'>
                {t("Mar")}
              </text>
              <text x="60" y="100" textAnchor="middle" fontSize="9" fontWeight="700" fill="#756D63" fontFamily='Manrope, "IBM Plex Sans Arabic"'>
                {t("Jun")}
              </text>
              <text x="104" y="100" textAnchor="middle" fontSize="9" fontWeight="700" fill="#2F5F58" fontFamily='Manrope, "IBM Plex Sans Arabic"'>
                {t("Sep")}
              </text>
            </svg>
            <div style={{ position: "absolute", left: "0", right: "0", top: "4px", textAlign: "center", fontSize: r.eF10, fontWeight: "800", letterSpacing: ".1em", color: "#756D63" }}>
              {t("VITAMIN D")}
            </div>
            <div style={{ position: "absolute", left: "0", right: "0", bottom: "0", display: "flex", justifyContent: "space-between", fontSize: r.eF105, fontWeight: "800" }}>
              <span data-w="0.05 0.2" data-op="" style={{ color: "#8D6F3F", opacity: "0" }}>
                {t("24 low")}
              </span>
              <span data-w="0.4 0.55" data-op="" style={{ color: "#6A54C4", opacity: "0" }}>
                {t("retest")}
              </span>
              <span data-w="0.75 0.9" data-op="" style={{ color: "#2F5F58", opacity: "0" }}>
                {t("32 ok")}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "19px", fontWeight: "700", color: "#3D6E69" }}>
              {t("Proactive")}
            </div>
            <p style={{ marginTop: "6px", fontSize: "14px", lineHeight: "1.55", color: "#5B5349" }}>
              {t("Wants to understand their health, act on it, and keep moving forward.")}
            </p>
            <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px", alignItems: r.instItems }}>
              <span data-w="0.5 0.65" data-stamp="" style={{ padding: "4px 10px", borderRadius: "99px", background: "#F4F1FB", color: "#5C48A8", fontSize: r.eF115, fontWeight: "800", opacity: "0" }}>
                {t("Retest booked · 14 Oct")}
              </span>
              <span data-w="0.8 0.95" data-stamp="" style={{ padding: "4px 10px", borderRadius: "99px", background: "#EDF4F3", color: "#2F5F58", fontSize: r.eF115, fontWeight: "800", opacity: "0" }}>
                {t("Back in range")}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" style={{ display: r.dotsDisp, justifyContent: "center", gap: "8px", marginTop: "12px" }}>
        <span data-whodot="" style={{ width: "24px", height: "6px", borderRadius: "99px", background: "#775FD7", transition: "transform .3s,background-color .3s" }} />
        <span data-whodot="" style={{ width: "24px", height: "6px", borderRadius: "99px", background: "rgba(34,30,26,.18)", transform: "scaleX(.4)", transition: "transform .3s,background-color .3s" }} />
        <span data-whodot="" style={{ width: "24px", height: "6px", borderRadius: "99px", background: "rgba(34,30,26,.18)", transform: "scaleX(.4)", transition: "transform .3s,background-color .3s" }} />
        <span data-whodot="" style={{ width: "24px", height: "6px", borderRadius: "99px", background: "rgba(34,30,26,.18)", transform: "scaleX(.4)", transition: "transform .3s,background-color .3s" }} />
      </div>
    </div>
  </section>
);
