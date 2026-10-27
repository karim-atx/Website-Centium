// Centium landing v29: section 02 "One hub, not another app to manage." (PR1
// v6, 02_pages/08-PR1), the prototype markup with its exact inline styles.
// The five legacy apps are struck through one by one as they enter the
// screen, then the "Centium is the solution" bar rises with a single teal
// sheen; motion/problem.ts (probScroll, probDrain, applyProb, sheen).

import React from "react";
import { ChapterMark } from "./ChapterMark";
import * as D from "./data/problem";
import type { SectionVals } from "./sectionVals";

export const Problem: React.FC<{ r: SectionVals }> = ({ r }) => (
  <section id="problem" data-screen-label="PR1 v6 Problem" style={{ position: "relative", zIndex: "2", padding: `${r.secY} ${r.px}` }}>
    <div style={{ maxWidth: "1240px", margin: "0 auto", display: "grid", gridTemplateColumns: r.two, gap: r.gap, alignItems: "center" }}>
      <div>
        <ChapterMark n="02" t="The problem" size={r.chEy} />
        <h2 style={{ marginTop: "16px", fontWeight: "800", fontSize: r.h2, lineHeight: "1.04", letterSpacing: "-.035em" }}>
          One hub, not another app to manage.
        </h2>
        <p style={{ marginTop: "20px", maxWidth: "520px", fontSize: "17px", lineHeight: "1.65", color: "#5B5349" }}>
          Health shouldn't feel like a chore. No more jumping between apps, subscriptions and platforms just to keep track of your progress. Centium brings it all together in one place, so you can spend less time managing your health and more time improving it.
        </p>
      </div>
      <div id="prob-list" style={{ display: "flex", flexDirection: "column" }}>
        {D.probs.map((pb, pbI) => (
          // B4 QA: flexWrap + the tag's marginLeft auto (not in the prototype).
          // Under about 400px "A spreadsheet you stopped filling" and its
          // "Inconsistency" tag are wider than the row (the tag ended 20px past
          // the screen at 360, 10px past the gutter at 390, prototype too); the
          // tag now drops under the title, right-aligned. Rows that fit are unchanged.
          <div key={pbI} data-prow="" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", padding: "15px 0", borderTop: "1px solid #EDEAE4" }}>
            <span style={{ position: "relative", display: "block", whiteSpace: "nowrap", fontSize: "17.5px", paddingRight: "14px" }}>
              <span data-pink="" style={{ display: "block", color: "#221E1A", transition: "opacity .7s ease-out" }}>
                {pb.t}
              </span>
              <span data-pfaint="" aria-hidden="true" style={{ position: "absolute", left: "0", top: "0", color: "#A9A29A", opacity: "0", transition: "opacity .7s ease-out" }}>
                {pb.t}
              </span>
              <span data-pstrike="" aria-hidden="true" style={{ position: "absolute", left: "0", right: "14px", top: "54%", height: "2px", marginTop: "-1px", background: "#8C8378", transformOrigin: "left", transform: "scaleX(0)", transition: "transform .5s cubic-bezier(.3,0,.2,1)" }} />
            </span>
            <span style={{ fontSize: "12px", color: "#C3BCB2", whiteSpace: "nowrap", flexShrink: "0", marginLeft: "auto" }}>
              {pb.tag}
            </span>
          </div>
        ))}
        <div id="prob-bar-wrap" style={{ position: "relative", marginTop: "22px", opacity: "0", transform: "translateY(14px) scale(.98)", transition: "opacity .6s cubic-bezier(.22,1,.36,1),transform .6s cubic-bezier(.22,1,.36,1)" }}>
          <span id="prob-ring" aria-hidden="true" style={{ position: "absolute", inset: "-5px", borderRadius: "21px", background: "rgba(94,158,149,1)", opacity: "0" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px", borderRadius: "16px", overflow: "hidden", background: "#E6DFF7", border: "3px solid #7D67D9", boxShadow: "0 14px 32px rgba(72,58,130,.14)" }}>
            <span style={{ position: "relative", zIndex: "1", fontWeight: "700", fontSize: "17px", letterSpacing: "-.01em", color: "#7D67D9" }}>
              Centium is the solution
            </span>
            <span style={{ position: "relative", zIndex: "1", fontWeight: "600", fontSize: "12px", letterSpacing: ".14em", whiteSpace: "nowrap", color: "#7D67D9" }}>
              ONE PLACE
            </span>
            <span id="prob-wipe" aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", top: "0", height: "100%", pointerEvents: "none", borderRadius: "inherit", opacity: "0", background: "linear-gradient(rgba(94,158,149,0) 0%,rgba(94,158,149,.34) 38%,rgba(120,190,180,.72) 50%,rgba(94,158,149,.3) 62%,rgba(94,158,149,0) 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.5),inset 0 -1px 0 rgba(47,95,88,.18)" }} />
            <span id="prob-gloss" aria-hidden="true" style={{ position: "absolute", left: "0", width: "34%", top: "-20%", bottom: "-20%", pointerEvents: "none", opacity: "0", background: "linear-gradient(100deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.42) 42%,rgba(214,240,235,.7) 52%,rgba(255,255,255,0) 100%)", filter: "blur(1px)" }} />
          </div>
        </div>
      </div>
    </div>
  </section>
);
