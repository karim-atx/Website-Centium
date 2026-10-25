// Centium landing v29: section 09 "FAQ" (FA1 v6, 02_pages/17-FA1), the
// prototype markup with its exact inline styles. Five questions, all closed
// at first (prototype state faq: null); opening one closes the others, the
// answer unfolds through a 0fr -> 1fr grid row (.3 s) and the "+" turns into
// an "x" (.34 s). The page re-measures 340 ms after a toggle, as the
// prototype does, since the section changed height. The questions and
// answers are the current site's five, word for word (the prototype's FAQ).

import React, { useContext, useState } from "react";
import { ChapterMark } from "./ChapterMark";
import type { SectionVals } from "./sectionVals";
import { SectionHostContext } from "../sectionHost";
import { FAQ } from "./data/faq";

export const Faq: React.FC<{ r: SectionVals }> = ({ r }) => {
  const host = useContext(SectionHostContext);
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (i: number) => {
    setOpen((cur) => (cur === i ? null : i));
    window.setTimeout(() => host?.measure(), 340);
  };

  return (
    <section id="faq" data-screen-label="FA1 v6 FAQ" style={{ position: "relative", zIndex: "2", padding: `${r.secY} ${r.px}` }}>
      <div style={{ maxWidth: "1240px", margin: "0 auto", display: "grid", gridTemplateColumns: r.faqCols, gap: r.gap }}>
        <div>
          <ChapterMark n="09" t="FAQ" size={r.chEy} />
          <h2 style={{ marginTop: "14px", fontWeight: "800", fontSize: r.h2, lineHeight: "1.04", letterSpacing: "-.035em" }}>Questions, answered.</h2>
          <p style={{ marginTop: "16px", maxWidth: "360px", fontSize: "13px", lineHeight: "1.6", color: "#8C8378" }}>
            Centium supports your health journey. It does not provide medical diagnosis or treatment.
          </p>
        </div>
        <div>
          {FAQ.map(([q, lead, a], i) => {
            const isOpen = open === i,
              c = i % 2 ? "#3F726D" : "#6A54C4";
            return (
              <div key={q} style={{ borderTop: "1px solid #EDEAE4" }}>
                <button
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen ? "true" : "false"}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                    padding: "20px 0",
                    minHeight: "44px",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "17px", fontWeight: "600" }}>
                    <span style={{ color: c }}>{lead}</span>
                    {q.slice(lead.length)}
                  </span>
                  <span
                    style={{
                      width: "30px",
                      height: "30px",
                      flexShrink: "0",
                      borderRadius: "99px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: c + "22",
                      color: c,
                      fontWeight: "800",
                      transform: isOpen ? "rotate(45deg)" : "none",
                      transition: "transform .34s cubic-bezier(.22,1,.36,1)",
                    }}
                  >
                    +
                  </span>
                </button>
                <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows .3s cubic-bezier(.22,1,.36,1)" }}>
                  <div style={{ overflow: "hidden" }}>
                    <p style={{ paddingBottom: "20px", fontSize: "15px", lineHeight: "1.65", color: "#5B5349", maxWidth: "600px" }}>{a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
