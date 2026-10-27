// Centium landing v29: section 07 "In their words" (RV1 v7, 02_pages/15-RV1),
// the prototype markup with its exact inline styles. One row of review cards
// slides left forever and pauses while hovered or focused (motion/reviews.ts);
// soft teal and lavender glows sit at its two ends and the row fades out
// under a 12% edge mask. Reduced motion: one copy, scrolled by hand.
// The reviews come from src/content/reviews.ts (Karim edits that file only).
// The first copy is the readable one (focusable); the repeats are
// aria-hidden and out of the tab order.

import React, { useContext, useLayoutEffect, useMemo } from "react";
import { ChapterMark } from "./ChapterMark";
import type { SectionVals } from "./sectionVals";
import { REVIEWS } from "../../../content/reviews";
import { reviewCopies, reviewTone, starCount } from "./reviewsRow";
import { SectionHostContext } from "../sectionHost";
import { ReviewsMotion } from "../motion/reviews";

const EDGE_MASK = "linear-gradient(90deg,transparent 0,#000 12%,#000 88%,transparent 100%)";

export const Reviews: React.FC<{ r: SectionVals; vw: number }> = ({ r, vw }) => {
  const host = useContext(SectionHostContext);
  const rm = host?.rm ?? false;
  const motion = useMemo(() => new ReviewsMotion(rm), [rm]);
  useLayoutEffect(() => {
    if (!host) return;
    return host.add(motion);
  }, [host, motion]);

  const copies = reviewCopies(REVIEWS.length, parseFloat(r.rvW), vw, rm);
  const pause = () => motion.setPaused(true);
  const play = () => motion.setPaused(false);

  return (
    <section id="reviews" data-screen-label="RV1 v7 Reviews" style={{ position: "relative", zIndex: "2", padding: `${r.secY} 0` }}>
      <div style={{ maxWidth: "1240px", margin: "0 auto", padding: `0 ${r.px}` }}>
        <ChapterMark n="07" t="In their words" size={r.chEy} />
        <h2 style={{ marginTop: "14px", fontWeight: "800", fontSize: r.h2, lineHeight: "1.04", letterSpacing: "-.035em" }}>Heard from the people who use it.</h2>
      </div>
      <div style={{ position: "relative", marginTop: "36px" }}>
        <div
          id="rv-row-wrap"
          onMouseEnter={pause}
          onMouseLeave={play}
          onFocus={(e) => {
            pause();
            motion.reveal(e.target);
          }}
          onBlur={play}
          style={{
            overflowX: rm ? "auto" : "hidden",
            scrollbarWidth: "none",
            padding: "14px 0 22px",
            WebkitMaskImage: EDGE_MASK,
            maskImage: EDGE_MASK,
          }}
        >
          <div data-rvrow="-1" data-n={REVIEWS.length} style={{ display: "flex", gap: "18px", width: "max-content", padding: `0 ${rm ? r.px : "0px"}`, willChange: "transform" }}>
            {Array.from({ length: copies }, (_, c) =>
              REVIEWS.map((rv, i) => {
                const tone = reviewTone(i);
                const stars = starCount(rv.rating);
                return (
                  <figure
                    key={c + "-" + i}
                    tabIndex={c === 0 ? 0 : -1}
                    aria-hidden={c === 0 ? undefined : true}
                    className="cl-fring"
                    style={{
                      margin: "0",
                      flex: `0 0 ${r.rvW}`,
                      padding: "20px 22px",
                      borderRadius: "22px",
                      background: "#FFFFFF",
                      border: "1px solid rgba(125,103,217,.14)",
                      boxShadow: "0 1px 1px rgba(72,58,130,.04),0 8px 22px rgba(72,58,130,.07)",
                      outline: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <span role="img" aria-label={stars + " out of 5"} style={{ fontSize: "14px", letterSpacing: "2px", color: tone.star }}>
                      {"★".repeat(stars)}
                      {stars < 5 && <span style={{ color: "#E0DDD6" }}>{"★".repeat(5 - stars)}</span>}
                    </span>
                    <blockquote style={{ margin: "0", fontSize: "15.5px", lineHeight: "1.5", color: "#221E1A", textWrap: "pretty" }}>{rv.quote}</blockquote>
                    <figcaption style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
                      <span
                        style={{
                          width: "40px",
                          height: "40px",
                          flexShrink: "0",
                          borderRadius: "99px",
                          background: tone.bg,
                          color: tone.ink,
                          fontWeight: "800",
                          fontSize: "13.5px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {rv.initials}
                      </span>
                      <span>
                        <span style={{ display: "block", fontWeight: "800", fontSize: "14.5px" }}>{rv.name}</span>
                        <span style={{ fontSize: "12.5px", color: "#8C8378" }}>{rv.role}</span>
                      </span>
                    </figcaption>
                  </figure>
                );
              }),
            )}
          </div>
        </div>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "0",
            top: "-20px",
            bottom: "-20px",
            width: r.glowW,
            pointerEvents: "none",
            background: "radial-gradient(60% 50% at 0% 50%,rgba(94,158,149,.20),rgba(94,158,149,0) 100%)",
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: "0",
            top: "-20px",
            bottom: "-20px",
            width: r.glowW,
            pointerEvents: "none",
            background: "radial-gradient(60% 50% at 100% 50%,rgba(125,103,217,.20),rgba(125,103,217,0) 100%)",
          }}
        />
      </div>
    </section>
  );
};
