// Centium landing v29: the chapter mark above each section heading
// ("01 · Your day"), the prototype markup with its exact inline styles. The
// number starts clipped below its line (translateY 105%) and the title
// hidden; motion/chapters.ts rolls them in as the mark scrolls into view.

import React from "react";

export const ChapterMark: React.FC<{ n: string; t: string; size: string }> = ({ n, t, size }) => (
  <div
    data-chm={n}
    style={{ display: "flex", alignItems: "baseline", gap: ".42em", justifyContent: "inherit", fontSize: size, fontWeight: "700", lineHeight: "1.25", letterSpacing: ".005em" }}
  >
    <span style={{ display: "block", overflow: "hidden", padding: "0 .04em" }}>
      <span data-chn="" style={{ display: "block", color: "#6A54C4", fontVariantNumeric: "tabular-nums", transform: "translateY(105%)" }}>
        {n}
      </span>
    </span>
    <span data-cht="" style={{ color: "#7A7168", opacity: "0" }}>
      · {t}
    </span>
  </div>
);

/** The page mark above the Contact and Legal titles (CT1 / LG1 data-chm
 *  "CONTACT" / "LEGAL"): one word, centred, rolled in like a chapter number,
 *  with an empty title part. */
export const PageMark: React.FC<{ id: string; word: string; size: string }> = ({ id, word, size }) => (
  <div data-chm={id} style={{ display: "flex", justifyContent: "center", fontSize: size, fontWeight: "700", lineHeight: "1.25" }}>
    <span style={{ display: "block", overflow: "hidden" }}>
      <span data-chn="" style={{ display: "block", color: "#6A54C4", transform: "translateY(105%)" }}>
        {word}
      </span>
    </span>
    <span data-cht="" style={{ opacity: "0" }} />
  </div>
);
