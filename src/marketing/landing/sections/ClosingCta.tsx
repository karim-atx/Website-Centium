// Centium landing v29: the closing call to action (CA1 v12, 02_pages/18-CA1),
// the prototype markup with its exact inline styles. Get Started opens the
// web app (/app); beside it, the "Download the app" button (Task O, FM:
// download/DownloadButton.tsx) takes the slot and styles of the former
// "Request a Demo" button, with "Other platforms" under it; the buttons share
// one width, the wider label's and at least ctaW (ctaGrid). Where there is no
// download the button is not drawn and Get Started, held in the first cell,
// stands alone. The "Coming soon" store chips are gone (Task O decision 1);
// the official store badges come once the apps are live (decision 7).

import React from "react";
import { Link } from "react-router-dom";
import type { SectionVals } from "./sectionVals";
import { DownloadButton } from "../../download/DownloadButton";
import { ctaGrid } from "../../download/ctaGrid";
import { t } from "../../../i18n/core";

export const ClosingCta: React.FC<{ r: SectionVals }> = ({ r }) => {
  const stack = r.ctaDir === "column";
  const btn: React.CSSProperties = {
    minHeight: "52px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    padding: "0 20px",
    borderRadius: "999px",
    fontWeight: "600",
    fontSize: "15px",
    transition: "transform .25s cubic-bezier(.22,1,.36,1)",
  };
  return (
    <section id="cta" data-screen-label="CA1 v12 Closing CTA" style={{ position: "relative", zIndex: "3", padding: `${r.ctaY} ${r.px} ${r.ctaYb}`, textAlign: "center" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h2 style={{ fontWeight: "800", fontSize: r.ctaH, lineHeight: "1.02", letterSpacing: "-.04em" }}>{t("Ready to bring it all together?")}</h2>
        <div id="cta-btns" style={{ ...ctaGrid(stack, r.ctaW), marginTop: "32px", width: stack ? r.ctaBoxW : "fit-content" }}>
          <Link to="/app" className="cl-lift" style={{ ...btn, gridRow: 1, gridColumn: 1, background: "#775FD7", color: "#fff" }}>
            {t("Get Started")}
          </Link>
          <DownloadButton stack={stack} room={parseFloat(r.ctaYb) - 24} btnStyle={{ ...btn, background: "#FFFFFF", border: "1px solid rgba(125,103,217,.22)", color: "#221E1A" }} />
        </div>
      </div>
    </section>
  );
};
