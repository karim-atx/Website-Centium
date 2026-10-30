// Centium landing v29: section 06 "The ecosystem built around your health."
// (EC1 v6, 02_pages/13-EC1 and 13b), the prototype markup with its exact
// inline styles; the public anchor #everyone is the pinned stage, and links to
// it scroll to its track (#eco-track, navigation.ts). A Professionals /
// Businesses toggle switches between two sets of five slides; both sets stay
// mounted (the hidden one display:none), as in the prototype. Desktop: a
// 300vh track pins the stage and scrolling (or the arrows, the arrow keys, or
// a drag) moves the carousel; mobile: a swipe carousel of equal cards (432px,
// 400px under 380px) with the slide's mobile copy and graphic.
// Motion: motion/eco.ts, registered with the page's scroll engine.

import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChapterMark } from "./ChapterMark";
import { DesktopGraphic } from "./eco/DesktopGraphic";
import { MobileGraphic } from "./eco/MobileGraphic";
import { ecoSets } from "./eco/data";
import type { SectionVals } from "./sectionVals";
import { SectionHostContext } from "../sectionHost";
import { EcoMotion } from "../motion/eco";
import { t, tk } from "../../../i18n/core";

const SEGS = [tk("Professionals"), tk("Businesses")];

/** A slide kicker ("01 · CLIENTS"): the number stays, the label shows in the page language. */
const kicker = (k: string) => {
  const i = k.indexOf(" · ");
  return i < 0 ? t(k) : k.slice(0, i + 3) + t(k.slice(i + 3));
};

/** The prototype's mobile two-line clamp of the slide copy (ecoTidy), in the markup. */
const CLAMP2: React.CSSProperties = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" };

export const Ecosystem: React.FC<{ r: SectionVals; vw: number }> = ({ r, vw }) => {
  const host = useContext(SectionHostContext);
  const [seg, setSeg] = useState(0);
  const motion = useRef<EcoMotion | null>(null);
  // Pro 04 shows two chat bubbles where three would push the call card out of
  // the graphic: under 400px (prototype: under 380px; at 390 its third bubble
  // wraps and the call card ends 5px past the graphic, which the prototype
  // then hid with ecoPrune).
  const sets = useMemo(() => ecoSets(r.lg, vw < 400), [r.lg, vw]);

  useEffect(() => {
    if (!host) return;
    const m = new EcoMotion(host.rm, () => host.invalidate());
    motion.current = m;
    const off = host.add(m);
    return () => {
      off();
      motion.current = null;
    };
  }, [host]);

  // Prototype: setState({ seg }, () => this.measure()).
  const first = useRef(true);
  useLayoutEffect(() => {
    motion.current?.setSeg(seg);
    if (first.current) {
      first.current = false;
      return;
    }
    host?.measure();
  }, [seg, host]);

  const step = (d: number) => {
    const m = motion.current;
    if (m) m.go(m.cur() + d);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    }
  };
  // Mobile card height: the prototype's fitEco sets every card to
  // padding * 2 + text area + 16 + graphic area = 432px (400px under 380px).
  const cardH = r.lg ? r.slH : vw < 380 ? "400px" : "432px";

  return (
    <div id="eco-track" data-screen-label="EC1 v6 Beyond the individual" style={{ position: "relative", zIndex: "2", height: r.ecoH }}>
      <div
        id="everyone"
        style={{ position: r.pinPos, top: "0", minHeight: r.pinMin, padding: `${r.pinPad} 0`, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }}
      >
        <div style={{ maxWidth: "1240px", margin: "0 auto", width: "100%", padding: `0 ${r.px}`, textAlign: "center" }}>
          <ChapterMark n="06" t={t("Beyond the individual")} size={r.chEy} />
          <h2 style={{ marginTop: "14px", fontWeight: "800", fontSize: r.h2, lineHeight: "1.04", letterSpacing: "-.035em" }}>{t("The ecosystem built around your health.")}</h2>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
          <div
            role="tablist"
            aria-label={t("Audience")}
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              padding: "4px",
              borderRadius: "999px",
              background: "#FAF9FE",
              border: "1px solid rgba(125,103,217,.22)",
              boxShadow: r.pillSh,
            }}
          >
            <span
              id="eco-ind"
              style={{
                position: "absolute",
                left: "4px",
                top: "4px",
                bottom: "4px",
                width: "calc(50% - 4px)",
                borderRadius: "999px",
                background: "#775FD7",
                boxShadow: "0 6px 16px rgba(125,103,217,.28)",
                transform: `translateX(${seg ? "100%" : "0%"})`,
                transition: "transform .45s cubic-bezier(.22,1,.36,1)",
              }}
            />
            {SEGS.map((seg0, i) => (
              <button
                key={seg0}
                type="button"
                role="tab"
                aria-selected={seg === i ? "true" : "false"}
                onClick={() => {
                  if (seg !== i) setSeg(i);
                }}
                style={{
                  position: "relative",
                  minHeight: "44px",
                  minWidth: r.segW,
                  padding: "10px 18px",
                  borderRadius: "999px",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: seg === i ? "#fff" : "#5B5349",
                  transition: "color .3s",
                }}
              >
                {t(seg0)}
              </button>
            ))}
          </div>
        </div>
        <div
          id="eco-view"
          tabIndex={0}
          aria-roledescription={t("carousel")}
          aria-label={seg ? t("Businesses slides") : t("Professionals slides")}
          onKeyDown={onKey}
          style={{ position: "relative", marginTop: "28px", height: r.ecoViewH, outline: "none", touchAction: r.ecoTouch, cursor: r.ecoCursor }}
        >
          {sets.map((slides, esI) => (
            <div
              key={esI}
              data-eset={esI}
              style={{
                position: r.esPos,
                inset: "0",
                display: seg === esI ? (r.lg ? "block" : "flex") : "none",
                gap: "14px",
                overflowX: r.esOver,
                scrollSnapType: "x mandatory",
                overscrollBehaviorX: "contain",
                touchAction: "pan-x pan-y",
                scrollbarWidth: "none",
                padding: r.esPad,
              }}
            >
              {slides.map((sl) => (
                <div
                  key={sl.i}
                  data-sl={sl.i}
                  style={{
                    position: r.slPos,
                    left: r.slLeft,
                    top: "0",
                    width: r.slW,
                    height: cardH,
                    marginInlineStart: r.slML,
                    flex: `0 0 ${r.slW}`,
                    scrollSnapAlign: "center",
                    transformOrigin: "50% 50%",
                  }}
                >
                  <div
                    data-slc=""
                    style={{
                      height: "100%",
                      display: "grid",
                      gridTemplateColumns: r.slCols,
                      gridTemplateRows: r.slRows,
                      gap: r.slGap,
                      padding: r.slPad,
                      borderRadius: "28px",
                      background: sl.bg,
                      border: "1px solid rgba(125,103,217,.16)",
                      boxShadow: r.slSh,
                      textAlign: "start",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: r.slTxtJ, minHeight: "0", height: r.slTxtH, position: "relative", zIndex: "1" }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: r.eF11, color: sl.c }}>{kicker(sl.k)}</span>
                      <div style={{ marginTop: "8px", fontSize: r.slT, fontWeight: "800", letterSpacing: "-.025em", lineHeight: r.slTL }}>{t(sl.t)}</div>
                      <p style={{ marginTop: "8px", fontSize: r.slP, lineHeight: r.slPL, color: "#5B5349", ...(r.lg ? null : CLAMP2) }}>{t(sl.d)}</p>
                    </div>
                    {r.lg ? <DesktopGraphic sl={sl} r={r} /> : <MobileGraphic sl={sl} r={r} />}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ maxWidth: r.ecoCtlW, width: "100%", margin: "22px auto 0", padding: `0 ${r.px}`, display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={t("Previous slide")}
            className="cl-hbg"
            style={
              {
                width: "44px",
                height: "44px",
                flexShrink: "0",
                borderRadius: "99px",
                border: "1px solid rgba(125,103,217,.22)",
                background: "#FFFFFF",
                fontSize: "16px",
                "--hbg": "#F4F1FB",
              } as React.CSSProperties
            }
          >
            ←
          </button>
          <div style={{ flex: "1", height: "3px", borderRadius: "9px", background: "#EFEAFB", overflow: "hidden" }}>
            <div id="eco-prog" style={{ height: "100%", width: "100%", background: "#775FD7", transformOrigin: "left", transform: "scaleX(.2)" }} />
          </div>
          <span id="eco-count" aria-live="polite" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "13px", color: "#5B5349", minWidth: "62px", textAlign: "center" }}>
            01 / 05
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={t("Next slide")}
            className="cl-hbg"
            style={
              {
                width: "44px",
                height: "44px",
                flexShrink: "0",
                borderRadius: "99px",
                border: "1px solid rgba(125,103,217,.22)",
                background: "#FFFFFF",
                fontSize: "16px",
                "--hbg": "#F4F1FB",
              } as React.CSSProperties
            }
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
};
