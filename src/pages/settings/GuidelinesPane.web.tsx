import React from "react";
import { guidelinesFor, guidelinesUpdated, type GuidelinePiece } from "../../marketing/legal/guidelines";
import { useApp } from "../../context/AppContext";

/**
 * Addendum A (WC-SE · Community guidelines, A.3): the real guidelines text in
 * the Settings pane, the same words as the public page (/legal/community-
 * guidelines) in the active language. Body 15/24, section titles 17/24 700.
 */
export const GuidelinesPane: React.FC = () => {
  const { t } = useApp();
  const { intro, sections } = guidelinesFor();
  const piece = (p: GuidelinePiece, i: number) => (typeof p === "string" ? <React.Fragment key={i}>{p}</React.Fragment> : <strong key={i}>{p.b}</strong>);
  return (
    <div className="flex flex-col" style={{ gap: 24, color: "#241F1B" }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{t("Last updated {date}", { date: guidelinesUpdated() })}</p>
      <p style={{ margin: 0, fontSize: 15, lineHeight: "24px" }}>{intro}</p>
      {sections.map((s) => (
        <section key={s.id} aria-labelledby={`gl-${s.id}`} className="flex flex-col" style={{ gap: 8 }}>
          <h3 id={`gl-${s.id}`} style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 700 }}>
            {s.h}
          </h3>
          <ul className="flex flex-col" style={{ margin: 0, paddingInlineStart: 20, gap: 6, listStyle: "disc" }}>
            {s.items.map((line, i) => (
              <li key={i} style={{ fontSize: 15, lineHeight: "24px" }}>
                {line.map(piece)}
              </li>
            ))}
          </ul>
          {s.after && <p style={{ margin: 0, fontSize: 15, lineHeight: "24px" }}>{s.after.map(piece)}</p>}
        </section>
      ))}
    </div>
  );
};
