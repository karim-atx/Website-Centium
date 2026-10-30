// Centium landing v29: the DOM of the two loading sequences, from the
// prototype markup (02_pages/02-LO1 and 03-LO2, exact inline styles). The
// motion is in loader.ts; these only render the starting state.

import React from "react";
import { LG } from "../engine/env";
import { ENTIUM_LETTERS, LEAF_TEAL, LEAF_VEIN_PATH, LOGO_LAVENDER, MARK_C_PATH, MARK_LEAF_PATH } from "../paths";
import { LOCKUP_RATIO, LETTER_BASE } from "./loaderChoice";
import { t } from "../../../i18n/core";

const leafGradientStops = (edge: string) => (
  <>
    <stop offset="0" stopColor={edge} stopOpacity="0" />
    <stop offset=".5" stopColor="#EAF7F3" stopOpacity="1" />
    <stop offset="1" stopColor={edge} stopOpacity="0" />
  </>
);

/** LO1 v16: the leaf becomes the dot of the i in "lives". */
export const Lo1: React.FC<{ vw: number }> = ({ vw }) => {
  const leaf = vw >= LG ? "58px" : "42px"; // r.lo1Leaf
  return (
    <div
      id="lo1"
      role="progressbar"
      aria-label={t("Loading Centium")}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ position: "fixed", inset: 0, zIndex: 90, pointerEvents: "none" }}
    >
      <span
        id="lo1-sh"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "60px",
          height: "12px",
          borderRadius: "50%",
          background: "radial-gradient(closest-side,rgba(47,95,88,.24),rgba(47,95,88,.1) 50%,rgba(47,95,88,0))",
          opacity: 0,
          willChange: "transform,opacity",
        }}
      />
      <span id="lo1-leaf" aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, width: leaf, height: leaf, opacity: 0, willChange: "transform" }}>
        <svg viewBox="556 526 380 368" style={{ display: "block", width: "100%", height: "100%", overflow: "visible" }}>
          <defs>
            <clipPath id="lo1-clip">
              <path d={MARK_LEAF_PATH} />
            </clipPath>
            <linearGradient id="lo1-sg" x1="0" y1="0" x2="1" y2="0">
              {leafGradientStops("#EAF7F3")}
            </linearGradient>
          </defs>
          <path id="lo1-path" d={MARK_LEAF_PATH} fill={LEAF_TEAL} />
          <g clipPath="url(#lo1-clip)">
            <rect id="lo1-sheen" x="520" y="500" width="140" height="420" fill="url(#lo1-sg)" style={{ opacity: 0 }} />
          </g>
        </svg>
      </span>
    </div>
  );
};

/** LO2 v17: leaf, the C, the wordmark. Sizes from r12 with k = 3.6 desktop,
 *  2.1 below 380px, 2.3 otherwise. The word is the official "entium" placed
 *  with the navbar's own geometry (see LOCKUP_RATIO in loader.ts). */
export const Lo2: React.FC<{ vw: number }> = ({ vw }) => {
  const lg = vw >= LG,
    k = lg ? 3.6 : vw < 380 ? 2.1 : 2.3;
  const px = (v: number) => (v * k).toFixed(1) + "px";
  const markW = Math.min(30 * k, (vw * (lg ? 0.6 : 0.76)) / LOCKUP_RATIO); // r.lfMark
  const mark = markW.toFixed(1) + "px";
  const unit = markW / 28; // the navbar's 28px mark as the unit
  return (
    <div
      id="loader"
      role="progressbar"
      aria-label={t("Loading Centium")}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ position: "fixed", inset: 0, zIndex: 90, pointerEvents: "none" }}
    >
      <div id="lo-veil" style={{ position: "absolute", inset: 0, background: "#FFFFFF" }} />
      <div
        id="lf-shs"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: px(36),
          height: px(7),
          borderRadius: "50%",
          background: "radial-gradient(closest-side,rgba(47,95,88,.16),rgba(47,95,88,.08) 52%,rgba(47,95,88,0))",
          opacity: 0,
          willChange: "transform,opacity",
        }}
      />
      <div
        id="lf-sht"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: px(36),
          height: px(7),
          borderRadius: "50%",
          background: "radial-gradient(closest-side,rgba(47,95,88,.26),rgba(47,95,88,.12) 40%,rgba(47,95,88,0) 72%)",
          opacity: 0,
          willChange: "transform,opacity",
        }}
      />
      <div
        id="lf-lock"
        aria-hidden="true"
        style={{ position: "absolute", left: 0, top: 0, display: "block", transformOrigin: "0 0", opacity: 0, willChange: "transform", color: LOGO_LAVENDER }}
      >
        <span id="lf-mark" style={{ position: "relative", display: "block", flexShrink: 0, width: mark, height: mark }}>
          <svg viewBox="270 180 690 730" fill="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
            <defs>
              <mask id="lf-cm" maskUnits="userSpaceOnUse" x="200" y="100" width="860" height="900">
                <path
                  id="lf-carc"
                  d="M 590.8 804.8 A 265 265 0 1 1 840.2 428"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="230"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1 1"
                  strokeDashoffset="1"
                />
              </mask>
            </defs>
            <path id="lf-cfill" d={MARK_C_PATH} fill={LOGO_LAVENDER} mask="url(#lf-cm)" />
          </svg>
          <svg
            id="lf-leafsvg"
            viewBox="270 180 690 730"
            fill="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", transformOrigin: "68.8% 72.9%", willChange: "transform" }}
          >
            <defs>
              <clipPath id="lf-clip">
                <path d={MARK_LEAF_PATH} />
              </clipPath>
              <linearGradient id="lf-sg" x1="0" y1="0" x2="1" y2="0">
                {leafGradientStops("#D8F1EB")}
              </linearGradient>
            </defs>
            <path id="lf-leaf" d={MARK_LEAF_PATH} fill={LEAF_TEAL} fillOpacity=".72" stroke={LEAF_TEAL} strokeWidth="5" strokeLinejoin="round" />
            <g clipPath="url(#lf-clip)">
              <rect id="lf-sheen" x="520" y="520" width="150" height="390" fill="url(#lf-sg)" style={{ opacity: 0 }} />
            </g>
            <path
              id="lf-vein"
              d={LEAF_VEIN_PATH}
              fill="none"
              stroke="#5D9C93"
              strokeWidth="7"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset="1"
            />
          </svg>
        </span>
        <svg
          id="lf-word"
          viewBox="204 44 849 93"
          aria-hidden="true"
          style={{
            position: "absolute",
            left: (unit * 38.9).toFixed(2) + "px",
            top: (unit * 8.5).toFixed(2) + "px",
            width: (unit * 100.42).toFixed(2) + "px",
            height: (unit * 11).toFixed(2) + "px",
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          <defs>
            {ENTIUM_LETTERS.map((l, i) => (
              <clipPath key={i} id={"lfm" + (i + 1)}>
                <rect data-lfl={i + 1} x={l.clip[0]} y={LETTER_BASE} width={l.clip[1]} height="0" />
              </clipPath>
            ))}
          </defs>
          <g fill="none" stroke={LOGO_LAVENDER} strokeWidth="17" strokeLinecap="butt" strokeLinejoin="miter">
            {ENTIUM_LETTERS.map((l, i) => (
              <path key={i} clipPath={"url(#lfm" + (i + 1) + ")"} d={l.d} />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
};
