// Centium landing v29: the chapter mark above each section heading
// ("01 · Your day"), the prototype markup with its exact inline styles. The
// number starts clipped below its line (translateY 105%) and the title
// hidden; motion/chapters.ts rolls them in as the mark scrolls into view.
// Reduced motion (round 8, handoff-landing-fix SPEC F8 rule 6): rendered in
// the final state (number in place, title shown), so nothing is hidden before
// the motion chunk runs.

import React from "react";
import { reducedMotion } from "../engine/env";

export const ChapterMark: React.FC<{ n: string; t: string; size: string }> = ({ n, t: title, size }) => {
  const rm = reducedMotion();
  return (
    <div
      data-chm={n}
      style={{ display: "flex", alignItems: "baseline", gap: ".42em", justifyContent: "inherit", fontSize: size, fontWeight: "700", lineHeight: "1.25", letterSpacing: ".005em" }}
    >
      <span style={{ display: "block", overflow: "hidden", padding: "0 .04em" }}>
        <span data-chn="" style={{ display: "block", color: "#6A54C4", fontVariantNumeric: "tabular-nums", transform: rm ? "translateY(0%)" : "translateY(105%)" }}>
          {n}
        </span>
      </span>
      <span data-cht="" style={{ color: "#7A7168", opacity: rm ? "1" : "0" }}>
        · {title}
      </span>
    </div>
  );
};

/** The page mark above the Contact and Legal titles (CT1 / LG1 data-chm
 *  "CONTACT" / "LEGAL"): one word, centred, rolled in like a chapter number,
 *  with an empty title part. */
export const PageMark: React.FC<{ id: string; word: string; size: string }> = ({ id, word, size }) => {
  const rm = reducedMotion();
  return (
    <div data-chm={id} style={{ display: "flex", justifyContent: "center", fontSize: size, fontWeight: "700", lineHeight: "1.25" }}>
      <span style={{ display: "block", overflow: "hidden" }}>
        <span data-chn="" style={{ display: "block", color: "#6A54C4", transform: rm ? "translateY(0%)" : "translateY(105%)" }}>
          {word}
        </span>
      </span>
      <span data-cht="" style={{ opacity: rm ? "1" : "0" }} />
    </div>
  );
};
