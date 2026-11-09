// Centium landing v29: the closing call to action (CA1 v12, 02_pages/18-CA1),
// the prototype markup with its exact inline styles. Get Started opens the
// web app (/app); beside it, Task O's download button (download/
// DownloadButton.tsx) takes the slot and styles of the former "Request a
// Demo" button, with "Other platforms" under it. The "Coming soon" store
// chips are gone (Task O decision 1); the official store badges come once
// the apps are live (decision 7).

import React from "react";
import { Link } from "react-router-dom";
import type { SectionVals } from "./sectionVals";
import { DownloadButton } from "../../download/DownloadButton";
import { t } from "../../../i18n/core";

export const ClosingCta: React.FC<{ r: SectionVals }> = ({ r }) => {
  const btn: React.CSSProperties = {
    width: r.ctaW,
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
        <div id="cta-btns" style={{ display: "flex", flexDirection: r.ctaDir, justifyContent: "center", alignItems: "stretch", gap: "12px", marginTop: "32px", width: r.ctaBoxW }}>
          <Link to="/app" className="cl-lift" style={{ ...btn, background: "#775FD7", color: "#fff" }}>
            {t("Get Started")}
          </Link>
          <DownloadButton width={r.ctaW} btnStyle={{ ...btn, width: undefined, background: "#FFFFFF", border: "1px solid rgba(125,103,217,.22)", color: "#221E1A" }} />
        </div>
      </div>
    </section>
  );
};
