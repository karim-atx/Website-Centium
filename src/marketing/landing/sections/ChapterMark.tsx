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
