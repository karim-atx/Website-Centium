// Centium landing v29: the closing call to action (CA1 v12, 02_pages/18-CA1),
// the prototype markup with its exact inline styles. Get Started opens the
// web app (/app), Request a Demo goes to /contact through the page fade; the
// two store badges say "Coming soon", as on the current site.

import React from "react";
import { Link } from "react-router-dom";
import type { SectionVals } from "./sectionVals";
import { usePageLink } from "../navigation";

const BADGE: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "12px",
  border: "1px solid rgba(34,30,26,.1)",
  background: "#FFFFFF",
  fontSize: "12.5px",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

export const ClosingCta: React.FC<{ r: SectionVals }> = ({ r }) => {
  const pageLink = usePageLink();
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
        <h2 style={{ fontWeight: "800", fontSize: r.ctaH, lineHeight: "1.02", letterSpacing: "-.04em" }}>Ready to bring it all together?</h2>
        <div id="cta-btns" style={{ display: "flex", flexDirection: r.ctaDir, justifyContent: "center", alignItems: "stretch", gap: "12px", marginTop: "32px", width: r.ctaBoxW }}>
          <Link to="/app" className="cl-lift" style={{ ...btn, background: "#775FD7", color: "#fff" }}>
            Get Started
          </Link>
          <a
            href="/contact"
            onClick={pageLink("/contact")}
            className="cl-lift"
            style={{ ...btn, background: "#FFFFFF", border: "1px solid rgba(125,103,217,.22)", color: "#221E1A" }}
          >
            Request a Demo
          </a>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
          <span style={BADGE}>App Store · Coming soon</span>
          <span style={BADGE}>Google Play · Coming soon</span>
        </div>
      </div>
    </section>
  );
};
