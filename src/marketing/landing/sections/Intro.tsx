// Centium landing v29: IN1 v25 Intro + HE1 v18 Hero (02_pages/04-IN1 and
// 05-HE1), the markup with the prototype's exact inline styles. It is in the
// eager landing chunk so the intro title renders on the first React frame;
// all motion is applied by the code-split engine (motion/intro.ts), which
// finds these elements by id / data attribute exactly as the prototype does.

import React from "react";
import { Link } from "react-router-dom";
import { LEAF_TEAL, MARK_LEAF_PATH } from "../paths";
import { SCREENS, screenBackground } from "../assets/dashboard";
import type { IntroVals } from "./introVals";
import { t, tk } from "../../../i18n/core";

// The two intro lines are split into words for their reveals (never into
// letters, so Arabic stays joined); t() runs at render. In Arabic there is no
// "lives", so no leaf dot: the page gets LO2 instead of LO1 (pickLoader.ts).
const TITLE = tk("Your health lives in a lot of places.");
const WORDS = tk("Your food. Your training. Your health. Your coach. Your people.");
const PILL_TOP = [tk("NUTRITION"), tk("TRAINING"), tk("HEALTH")];
const PILL_BOT = [tk("COACHING"), tk("COMMUNITY")];

const FRAG_SHADOW = "0 1px 1px rgba(34,30,26,.05),0 8px 18px rgba(34,30,26,.07),0 22px 44px rgba(72,58,130,.08)";

interface IntroProps {
  r: IntroVals;
  /** Initial transform of the title words: 10% under LO1, 130% under LO2, 0% otherwise (prototype twY). */
  twY: string;
  /** Initial opacity of the leaf dot: 0 under LO1 (prototype dotOp). */
  dotOp: string;
  /** Initial opacity of the scroll cue and Skip intro: 0 while a loader runs (the engine's
   *  first pass would set the same; this keeps them hidden until it arrives). */
  readyOp: string;
  onPillar: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onContact: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onSkip: () => void;
}

const Frag: React.FC<{ i: number; r: IntroVals; skin: { size: string; pos: string }; children: React.ReactNode }> = ({ i, r, skin, children }) => (
  <div
    aria-hidden="true"
    data-frag={i}
    style={{ position: "absolute", left: 0, top: 0, width: r.fragW, opacity: 0, transformOrigin: "0 0", textAlign: "start" }}
  >
    {children}
    <div
      data-skin=""
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: screenBackground(SCREENS.empty01),
        backgroundRepeat: "no-repeat",
        backgroundSize: skin.size,
        backgroundPosition: skin.pos,
        opacity: 0,
      }}
    />
  </div>
);

const appIcon = (style: React.CSSProperties) => (
  <span style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center", ...style }} />
);

export const Intro: React.FC<IntroProps> = ({ r, twY, dotOp, readyOp, onPillar, onContact, onSkip }) => {
  const pill = (label: string, mobile: boolean, id?: string) => (
    <a
      key={label}
      id={id}
      href="#platform"
      onClick={onPillar}
      className="cl-hc"
      style={
        {
          fontSize: r.pillSize,
          fontWeight: 700,
          letterSpacing: r.pillLs,
          marginRight: r.pillLsNeg,
          color: "#5B5349",
          ...(mobile ? { minHeight: "36px", display: "flex", alignItems: "center" } : { padding: "12px 0", display: "block" }),
          "--hc": mobile ? "#5B5349" : "#6A54C4",
        } as unknown as React.CSSProperties
      }
    >
      {t(label)}
    </a>
  );
  const title = t(TITLE);
  return (
    <>
      <div id="intro-track" style={{ position: "relative", zIndex: 2, height: r.introH }}>
        <div id="intro-stage" style={{ position: r.stagePos, top: 0, height: r.VH, overflowX: "clip", overflowY: "visible" }}>
          <div id="stm0" style={{ position: "absolute", left: "50%", top: r.stmTop, transform: "translate(-50%,-50%)", width: r.stmW, textAlign: "center" }}>
            <h2
              aria-label={title}
              style={{ fontWeight: 800, fontSize: r.stmSize, lineHeight: 1.04, letterSpacing: "-.04em", color: "#221E1A", textWrap: "balance" }}
            >
              {title.split(" ").map((w, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: ".16em 0 .1em", marginBlock: "-.16em -.1em", marginInline: "0 .24em" }}
                >
                  <span data-tw="" style={{ display: "inline-block", transform: "translateY(" + twY + ")" }}>
                    {w === "lives" ? (
                      <>
                        {/* i18n-ignore: the English title only */}
                        l
                        <span id="i-wrap" style={{ position: "relative", display: "inline-block" }}>
                          ı
                          <span
                            id="i-dot"
                            aria-hidden="true"
                            style={{ position: "absolute", left: 0, top: 0, width: ".2em", height: ".2em", opacity: dotOp, transformOrigin: "50% 100%" }}
                          >
                            <svg viewBox="556 526 380 368" style={{ display: "block", width: "100%", height: "100%", overflow: "visible" }}>
                              <path d={MARK_LEAF_PATH} fill={LEAF_TEAL} />
                            </svg>
                          </span>
                        </span>
                        {/* i18n-ignore */}
                        ves
                      </>
                    ) : (
                      w
                    )}
                  </span>
                </span>
              ))}
            </h2>
          </div>
          <div
            id="stm1"
            style={{ position: "absolute", left: "50%", top: r.stmTop, transform: "translate(-50%,-50%)", width: r.stmW, textAlign: "center", opacity: 0 }}
          >
            <h2 style={{ fontWeight: 800, fontSize: r.stmSize, lineHeight: 1.04, letterSpacing: "-.04em", color: "#221E1A", textWrap: "balance" }}>
              {t(WORDS).split(" ").map((w, i) => (
                <span key={i} data-wd="" style={{ opacity: 0.14 }}>
                  {w + " "}
                </span>
              ))}
            </h2>
          </div>

          <Frag i={0} r={r} skin={{ size: "108.736% 879.121%", pos: "50.000% 82.863%" }}>
            <div data-chrome="" style={{ borderRadius: "14px", background: "#FFFFFF", border: "1px solid #E7E3EE", boxShadow: FRAG_SHADOW, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 12px", background: "#F6F4FA", borderBottom: "1px solid #EEEAF4" }}>
                {appIcon({ background: "#EDE9F6", boxShadow: "inset 0 0 0 4px #EDE9F6,inset 0 0 0 6px #9C8FC4" })}
                <span style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: ".02em", color: "#5C5470" }}>{t("Calories")}</span>
              </div>
              <div style={{ margin: "9px 10px 0", padding: "7px 9px", borderRadius: "9px", background: "#F2EFF8", display: "flex", alignItems: "center", gap: "7px" }}>
                <span style={{ width: "6px", height: "6px", flexShrink: 0, borderRadius: "99px", background: "#775FD7" }} />
                <span style={{ flex: 1, fontSize: "11px", fontWeight: 700, color: "#3E2C80" }}>{t("You haven't logged lunch")}</span>
                <span style={{ fontSize: "9.5px", fontWeight: 600, color: "#6C655C" }}>{t("2h ago")}</span>
              </div>
              <div style={{ padding: "8px 12px 11px", display: "flex", flexDirection: "column", gap: "5px", fontSize: "11px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, color: "#221E1A" }}>{t("Breakfast")}</span>
                  <span style={{ color: "#5B5349" }}>{t("460 kcal")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#756D63" }}>
                  <span>{t("Lunch")}</span>
                  <span>{t("Add food")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#756D63" }}>
                  <span>{t("Dinner")}</span>
                  <span>{t("Add food")}</span>
                </div>
                <div style={{ marginTop: "2px", height: "5px", borderRadius: "9px", background: "#EEEAF4", overflow: "hidden" }}>
                  <span style={{ display: "block", width: "22%", height: "100%", background: "#9C8FC4" }} />
                </div>
              </div>
            </div>
          </Frag>

          <Frag i={1} r={r} skin={{ size: "109.745% 879.121%", pos: "50.000% 69.394%" }}>
            <div
              data-chrome=""
              style={{
                borderRadius: "6px",
                background: "#FBFAF7",
                border: "1px solid #E9E5DC",
                boxShadow: FRAG_SHADOW,
                padding: "10px 12px 12px",
                fontFamily: "'JetBrains Mono',ui-monospace,monospace",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "7px", fontFamily: 'Manrope,"IBM Plex Sans Arabic",sans-serif', marginBottom: "8px" }}>
                {appIcon({ background: "#EFEBE2", boxShadow: "inset 0 -6px 0 #FBFAF7,inset 0 0 0 1px #CFC8B8" })}
                <span style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: ".02em", color: "#6B6356" }}>{t("Notes")}</span>
              </div>
              <div style={{ fontSize: "11.5px", fontWeight: 500, lineHeight: 1.55, color: "#3B352D", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {t("push day?? upper\nbench 80x8, 85x6, 85x5\n")}
                <span style={{ color: "#756D63" }}>{t("rows 3x10 (60? 62.5?)")}</span>
                {t("\nohp 40 x 8 x 3\n")}
                <span style={{ color: "#756D63" }}>{t("felt heavy. try 87.5 next wk")}</span>
              </div>
            </div>
          </Frag>

          <Frag i={2} r={r} skin={{ size: "222.066% 1151.079%", pos: "7.692% 47.228%" }}>
            <div data-chrome="" style={{ borderRadius: "22px", background: "#2A2633", boxShadow: FRAG_SHADOW, padding: "12px 14px 13px", color: "#FFFFFF" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
                {appIcon({ background: "#3A3546", boxShadow: "inset 0 0 0 5px #3A3546,inset 0 0 0 7px #D9CFF5" })}
                <span style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: ".02em", color: "#D9D3E6" }}>{t("Heart")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                <span style={{ fontSize: r.fragBig, fontWeight: 700, letterSpacing: "-.02em" }}>58</span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#B8B0C9" }}>{t("bpm resting")}</span>
              </div>
              <svg viewBox="0 0 140 24" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "20px", margin: "4px 0 6px" }}>
                <polyline
                  points="0,14 18,14 22,8 26,20 30,4 34,16 38,14 70,14 74,8 78,20 82,4 86,16 90,14 140,14"
                  fill="none"
                  stroke="#B9A9EE"
                  strokeWidth="1.6"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 8px",
                  borderRadius: "99px",
                  background: "#3A3546",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "#D9D3E6",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "99px", border: "1.5px solid #B8B0C9" }} />
                {t("Not shared with your other apps")}
              </div>
            </div>
          </Frag>

          <Frag i={3} r={r} skin={{ size: "109.238% 1290.323%", pos: "50.000% 10.434%" }}>
            <div data-chrome="" style={{ borderRadius: "18px", background: "#F3F4F6", boxShadow: FRAG_SHADOW, padding: "10px 11px 11px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
                {appIcon({ background: "#E3E6EB", boxShadow: "inset 3px 3px 0 #F3F4F6,inset -3px -6px 0 #F3F4F6,inset 0 0 0 9px #8C93A0" })}
                <span style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: ".02em", color: "#5F6672" }}>{t("Messages")}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <span
                  style={{
                    alignSelf: "flex-end",
                    maxWidth: "80%",
                    padding: "6px 9px",
                    borderRadius: "12px 12px 3px 12px",
                    background: "#DDE1E7",
                    fontSize: "11px",
                    color: "#3B352D",
                  }}
                >
                  {t("Sorry, crazy week")}
                </span>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      flexShrink: 0,
                      borderRadius: "99px",
                      background: "#DAEAE7",
                      color: "#2F5F58",
                      fontSize: "8.5px",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/* i18n-ignore: initials */}
                    LK
                  </span>
                  <span
                    style={{
                      maxWidth: "80%",
                      padding: "6px 9px",
                      borderRadius: "12px 12px 12px 3px",
                      background: "#FFFFFF",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#221E1A",
                    }}
                  >
                    {t("Did you fill in your weekly check-in?")}
                  </span>
                </div>
                <span style={{ alignSelf: "flex-start", marginInlineStart: "26px", fontSize: "9.5px", color: "#666E7C" }}>{t("Lara · 9:02 AM")}</span>
              </div>
            </div>
          </Frag>

          <Frag i={4} r={r} skin={{ size: "109.238% 1290.323%", pos: "50.000% 10.434%" }}>
            <div data-chrome="" style={{ borderRadius: "4px", background: "#FFFFFF", border: "1px solid #E6E3DF", boxShadow: FRAG_SHADOW, overflow: "hidden" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 11px",
                  background: "#FAF9F7",
                  borderBottom: "1px solid #EEEBE6",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <span
                    style={{
                      width: "18px",
                      height: "14px",
                      flexShrink: 0,
                      borderRadius: "3px",
                      border: "1.5px solid #756D63",
                      boxShadow: "inset 0 5px 0 -3px #FAF9F7",
                    }}
                  />
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#5B5349" }}>{t("Mail")}</span>
                </div>
                <span style={{ fontSize: "9.5px", color: "#756D63" }}>{t("Promotions · 14")}</span>
              </div>
              <div style={{ padding: "8px 11px 10px", display: "flex", flexDirection: "column", gap: "3px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", fontSize: "10px", color: "#756D63" }}>
                  <span style={{ overflowWrap: "anywhere" }}>{t("Weekend offers inside")}</span>
                  <span>{t("Fri")}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#221E1A",
                    padding: "4px 0",
                    borderTop: "1px solid #F1EEEA",
                    borderBottom: "1px solid #F1EEEA",
                  }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t("Booking confirmed: Vinyasa Flow")}</span>
                  <span style={{ fontWeight: 600, color: "#756D63" }}>{t("Sun")}</span>
                </div>
                <span style={{ fontSize: "10px", color: "#5B5349", overflowWrap: "anywhere" }}>{t("With Lara · today 6:30 PM · Studio One")}</span>
              </div>
            </div>
          </Frag>

          <div
            id="hero-copy"
            style={{ position: "absolute", left: 0, right: 0, top: r.heroTop, padding: "0 " + r.px, textAlign: "center", opacity: 0, pointerEvents: "none" }}
          >
            <nav
              id="pillar-row"
              aria-label={t("Pillars")}
              style={{ display: r.pillDesk, gridTemplateColumns: "1fr auto 1fr", columnGap: r.pillGap, alignItems: "center", width: "max-content", margin: "0 auto" }}
            >
              <span style={{ display: "flex", justifyContent: "flex-end", gap: r.pillGap }}>
                {pill(PILL_TOP[0], false)}
                {pill(PILL_TOP[1], false)}
              </span>
              {pill(PILL_TOP[2], false, "pill-health")}
              <span style={{ display: "flex", justifyContent: "flex-start", gap: r.pillGap }}>
                {pill(PILL_BOT[0], false)}
                {pill(PILL_BOT[1], false)}
              </span>
            </nav>
            <nav id="pillar-rows-m" aria-label={t("Pillars")} style={{ display: r.pillMob, flexDirection: "column", alignItems: "center", rowGap: 0 }}>
              <span style={{ display: "flex", gap: r.pillGap }}>{PILL_TOP.map((p) => pill(p, true))}</span>
              <span style={{ display: "flex", gap: r.pillGap }}>{PILL_BOT.map((p) => pill(p, true))}</span>
            </nav>
            <h1
              id="hero-title"
              style={{ marginTop: r.h1Mt, fontWeight: 800, fontSize: r.display, lineHeight: 0.98, letterSpacing: "-.045em", color: "#221E1A" }}
            >
              <span id="ht1" style={{ display: "inline-block" }}>
                {t("Your health,")}
              </span>
              <br />
              <span id="ht2" style={{ display: "inline-block" }}>
                {t("all in one place")}
              </span>
            </h1>
            <p style={{ margin: r.subMt + " auto 0", maxWidth: "560px", fontSize: r.subSize, lineHeight: 1.5, color: "#5B5349" }}>
              {t("More clarity. More control. More you.")}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: r.ctaMt, flexWrap: "wrap" }}>
              <Link
                to="/app"
                className="cl-lift"
                style={{
                  width: r.ctaW,
                  padding: "15px 0",
                  borderRadius: "999px",
                  background: "#775FD7",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "15px",
                  transition: "transform .25s cubic-bezier(.22,1,.36,1)",
                }}
              >
                {t("Get Started")}
              </Link>
              <a
                href="/contact"
                onClick={onContact}
                className="cl-lift"
                style={{
                  width: r.ctaW,
                  padding: "15px 0",
                  borderRadius: "999px",
                  background: "#FFFFFF",
                  border: "1px solid rgba(125,103,217,.22)",
                  color: "#221E1A",
                  fontWeight: 600,
                  fontSize: "15px",
                  transition: "transform .25s cubic-bezier(.22,1,.36,1)",
                }}
              >
                {t("Request a Demo")}
              </a>
            </div>
          </div>

          <div
            id="scroll-cue"
            style={{
              transition: "opacity .5s cubic-bezier(.22,1,.36,1)",
              position: "absolute",
              left: "50%",
              bottom: r.cueB,
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: ".24em",
              color: "#756D63",
              opacity: readyOp,
            }}
          >
            <span>{t("SCROLL")}</span>
            <span style={{ width: "1px", height: "28px", background: "linear-gradient(#775FD7,rgba(125,103,217,0))" }} />
          </div>
          <button
            id="skip-intro"
            type="button"
            onClick={onSkip}
            className="cl-hc"
            style={
              {
                position: "absolute",
                right: r.px,
                bottom: r.cueB,
                minHeight: "44px",
                padding: "10px 16px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: ".06em",
                whiteSpace: "nowrap",
                color: "#5B5349",
                background: "#FFFFFF",
                border: "1px solid rgba(125,103,217,.18)",
                opacity: readyOp,
                pointerEvents: readyOp === "0" ? "none" : "auto",
                "--hc": "#221E1A",
              } as React.CSSProperties
            }
          >
            {t("Skip intro")}
          </button>
        </div>
        <div id="hero" style={{ position: "absolute", left: 0, top: r.heroAnchor, height: "1px", width: "1px" }} />
      </div>
      <div id="hero-tail" aria-hidden="true" style={{ height: r.heroTail }} />
    </>
  );
};
