import React from "react";
import { useSEO } from "../useSEO";
import { PageMark } from "../landing/sections/ChapterMark";
import { usePageLink } from "../landing/navigation";
import { usePageMotion } from "../landing/pageMotion";
import { useViewportWidth } from "../landing/viewport";
import { LG, SM } from "../landing/engine/env";
import { WASH_BG, WEDGE_312, WEDGE_48 } from "../landing/wash";
import { GUIDELINES_UPDATED, guidelinesFor, type GuidelinePiece } from "../legal/guidelines";
import * as EN from "../legal/text";
import type * as ArabicText from "../legal/text.ar";
import { documentFor, t } from "../../i18n/core";
import { legalDate } from "../../pages/settings/legalCopy";

// The Community guidelines (Round C Release 2, undrawn): one document in the
// Legal page's own layout and literal values (LG1 v17, pages/Legal.tsx): the
// washed head, the 68ch column, a document's number line, h2, the group h3s
// and the dotted items, the closing card. Lavender (#775FD7) is the dot
// colour, as the Legal page's first document. The text is guidelines.ts.

function vals(vw: number) {
  const lg = vw >= LG,
    sm = vw >= SM;
  return {
    ctTop: lg ? "96px" : "80px",
    px: sm ? "40px" : "20px",
    washH: lg ? "560px" : "400px",
    headMb: lg ? "64px" : "40px",
    eyebrow: lg ? "20px" : "14px",
    h1: lg ? "56px" : "40px",
  };
}

const DOT = "#775FD7";

const Pieces: React.FC<{ parts: GuidelinePiece[] }> = ({ parts }) => (
  <>
    {parts.map((p, i) => (typeof p === "string" ? <React.Fragment key={i}>{p}</React.Fragment> : <strong key={i} style={{ fontWeight: 800, color: "#221E1A" }}>{p.b}</strong>))}
  </>
);

export const CommunityGuidelines: React.FC = () => {
  useSEO(t("Community guidelines"), t("How we keep Centium's community kind, safe, private and honest."));
  usePageMotion();
  const r = vals(useViewportWidth());
  const pageLink = usePageLink();

  const wash = (mask: string) => (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        insetInlineStart: "0",
        insetInlineEnd: "0",
        top: "0",
        height: r.washH,
        transform: "scaleY(-1)",
        pointerEvents: "none",
        background: WASH_BG,
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );

  return (
    <section
      id="guidelines-page"
      data-screen-label="Community guidelines"
      style={{ position: "relative", zIndex: "2", overflowX: "clip", padding: `${r.ctTop} ${r.px} 88px` }}
    >
      {wash(WEDGE_48)}
      {wash(WEDGE_312)}
      <div style={{ position: "relative", textAlign: "center", maxWidth: "820px", margin: `0 auto ${r.headMb}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <PageMark id="LEGAL" word={t("Legal")} size={r.eyebrow} />
        <h1 style={{ margin: "14px 0 0", fontWeight: "800", fontSize: r.h1, letterSpacing: "-.04em", lineHeight: "1.04", textWrap: "balance" }}>{t("Community guidelines")}</h1>
        <p style={{ margin: "12px 0 0", fontSize: "14px", fontWeight: "600", color: "#756D63" }}>{t("Last updated {date}", { date: legalDate(GUIDELINES_UPDATED) })}</p>
      </div>
      <div style={{ position: "relative", maxWidth: "68ch", margin: "0 auto", textAlign: "start" }}>
        <article style={{ paddingBottom: "44px", marginBottom: "44px", borderBottom: "1px solid #EDEAE4" }}>
          <p style={{ fontSize: "16.5px", lineHeight: "1.7", color: "#5B5349" }}>{guidelinesFor().intro}</p>
          {guidelinesFor().sections.map((s) => (
            <section key={s.id} id={s.id} style={{ scrollMarginTop: "96px", marginTop: "30px" }}>
              <h2 style={{ fontSize: "19px", fontWeight: "800", letterSpacing: "-.015em" }}>{s.h}</h2>
              {s.items.map((it, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                  <span style={{ width: "6px", height: "6px", marginTop: "10px", flexShrink: "0", borderRadius: "99px", background: DOT }} />
                  <p style={{ fontSize: "15.5px", lineHeight: "1.7", color: "#3B352D" }}>
                    <Pieces parts={it} />
                  </p>
                </div>
              ))}
              {s.after && (
                <p style={{ marginTop: "12px", fontSize: "15.5px", lineHeight: "1.7", color: "#3B352D" }}>
                  <Pieces parts={s.after} />
                </p>
              )}
            </section>
          ))}
        </article>
        <div style={{ padding: "24px", borderRadius: "22px", background: "#FFFFFF", border: "1px solid rgba(125,103,217,.14)" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-.028em" }}>{t("Something not right?")}</h2>
          <p style={{ marginTop: "10px", fontSize: "15.5px", lineHeight: "1.65", color: "#5B5349" }}>
            {t("Report it in the app, or tell us. Our team reads every message.")}
          </p>
          <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a
              href="/app"
              className="cl-hbg"
              style={{ padding: "13px 22px", borderRadius: "999px", background: "#775FD7", color: "#fff", fontWeight: 600, fontSize: "14.5px", "--hbg": "#6A54C4" } as React.CSSProperties}
            >
              {t("Back to the app")}
            </a>
            <a
              href="/contact"
              onClick={pageLink("/contact")}
              className="cl-hbd"
              style={{ padding: "13px 22px", borderRadius: "999px", border: "1px solid #CFC5EA", color: "#221E1A", fontWeight: 600, fontSize: "14.5px", "--hbd": "#775FD7" } as React.CSSProperties}
            >
              {t("Contact us")}
            </a>
          </div>
          {/* Round F (A11): the Legal page's language line, in its style. */}
          <p style={{ marginTop: "20px", fontSize: "12.5px", lineHeight: "1.6", color: "#5B5349" }}>{(documentFor<typeof ArabicText>("legal.text") ?? EN).LANGUAGE}</p>
        </div>
      </div>
    </section>
  );
};
