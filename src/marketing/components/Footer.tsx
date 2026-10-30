import React, { useSyncExternalStore } from "react";
import { Link, useLocation } from "react-router-dom";
import { CentiumLockup } from "../../components/icons/CentiumMark";
import { LG, reducedMotion } from "../landing/engine/env";
import { usePageLink, useMarketingNav, useSectionLink } from "../landing/navigation";
import { WASH_BG, WEDGE_312, WEDGE_48 } from "../landing/wash";
import { LanguageSwitch } from "./LanguageSwitch";
import { isRtl, t, tk } from "../../i18n/core";

// Centium landing v29: FO1 v17, the centred footer (02_pages/22-FO1 and the
// prototype markup, exact inline styles), replacing the previous footer.
// Link set per the lead's decision F (the handover's: Product, For teams,
// Help, a "Contact us" button and Legal in the copyright row), keeping the
// Instagram link (new tab, noreferrer noopener), the non-navigating "#"
// socials and the computed copyright year.
//
// The colour wash is two elements, one per diagonal mask (48deg, 312deg), as
// in the prototype: they union by plain stacking, with no mask-composite
// (which real iOS Safari resolved differently, see the git history of this file).
//
// Logo: the official lockup (CentiumMark.tsx CentiumLockup) instead of the
// prototype's traced one, sized so the mark draws at the prototype's size
// (prototype: viewBox 700 wide x 1.00331; lockup: 687 wide).

const COLUMNS: { t: string; l: { t: string; section?: string; app?: boolean }[] }[] = [
  {
    t: tk("PRODUCT"),
    l: [
      { t: tk("Features"), section: "platform" },
      { t: tk("Pricing"), section: "pricing" },
      { t: tk("Reviews"), section: "reviews" },
    ],
  },
  {
    t: tk("FOR TEAMS"),
    l: [
      { t: tk("Professionals"), section: "everyone" },
      { t: tk("Businesses"), section: "everyone" },
    ],
  },
  {
    t: tk("HELP"),
    l: [
      { t: tk("FAQ"), section: "faq" },
      { t: tk("Log in"), app: true },
    ],
  },
];

const SOCIALS = [
  {
    t: "Instagram",
    h: "https://www.instagram.com/centium.app/?utm_source=ig_web_button_share_sheet",
    external: true,
    fill: "none",
    stroke: "currentColor",
    d: "M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5z M12 8.4a3.6 3.6 0 1 0 0 7.2a3.6 3.6 0 1 0 0-7.2z M17.4 6.6h.01",
  },
  {
    t: "Discord",
    h: "#",
    external: false,
    fill: "currentColor",
    stroke: "none",
    d: "M19.3 5.6A16.2 16.2 0 0 0 15.4 4.4l-.3.6a12.3 12.3 0 0 1 3.4 1.1 11.6 11.6 0 0 0-9-.1c-.4.1-.9.3-1.4.5A12.5 12.5 0 0 1 8.9 5l-.3-.6A16.2 16.2 0 0 0 4.7 5.6C2.2 9.3 1.5 13 1.9 16.6a16.4 16.4 0 0 0 4.9 2.5l.6-1a10.7 10.7 0 0 1-1.7-.8l.4-.3a11.7 11.7 0 0 0 9.8 0l.4.3a10.7 10.7 0 0 1-1.7.8l.6 1a16.4 16.4 0 0 0 4.9-2.5c.5-4.2-.6-7.9-2.8-11zM8.7 14.4c-1 0-1.7-.9-1.7-1.9s.8-1.9 1.7-1.9 1.8.9 1.7 1.9-.7 1.9-1.7 1.9zm6.6 0c-1 0-1.7-.9-1.7-1.9s.8-1.9 1.7-1.9 1.8.9 1.7 1.9-.7 1.9-1.7 1.9z",
  },
  {
    t: "X",
    h: "#",
    external: false,
    fill: "currentColor",
    stroke: "none",
    d: "M17.4 3h3.3l-7.1 8.1L21.6 21h-6l-4.2-5.5L6.5 21H3.2l7.4-8.5L2.8 3h6.1l3.9 5.2zm-1.1 16h1.8L7.5 4.9H5.6z",
  },
  {
    t: "YouTube",
    h: "#",
    external: false,
    fill: "none",
    stroke: "currentColor",
    d: "M6.5 6h11a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4h-11a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4z M11 10l4 2-4 2z",
  },
];

const UNDERLINE = "linear-gradient(#6A54C4,#6A54C4) 0 calc(100% - 3px) / 0 1px no-repeat";

const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const getVw = () => window.innerWidth;

export const Footer: React.FC = () => {
  const vw = useSyncExternalStore(subscribeResize, getVw, getVw);
  const lg = vw >= LG;
  const { pathname } = useLocation();
  const go = useMarketingNav();
  const sectionLink = useSectionLink();
  const pageLink = usePageLink();
  const logoW = (lg ? 88 : 76) * (687 / 700) * 1.00331; // r.ftLogoW, mark-matched

  const goHomeNav = (e: React.MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (pathname === "/") window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    else go("/");
  };

  const wash = (mask: string) => (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        insetInlineStart: 0,
        insetInlineEnd: 0,
        bottom: 0,
        top: lg ? "-620px" : "-420px",
        pointerEvents: "none",
        background: WASH_BG,
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );

  return (
    <footer
      id="site-footer"
      style={{
        position: "relative",
        zIndex: 1,
        padding: lg ? "104px 40px 48px" : "72px 20px 32px",
        paddingBottom: "calc(" + (lg ? "48px" : "32px") + " + env(safe-area-inset-bottom))",
      }}
    >
      {wash(WEDGE_48)}
      {wash(WEDGE_312)}
      <div
        id="ft-stack"
        style={{
          position: "relative",
          maxWidth: "1240px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: lg ? "32px" : "26px",
        }}
      >
        <div data-ftrow="logo" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <a href="/" onClick={goHomeNav} aria-label={t("Centium home")} style={{ display: "block" }}>
            <CentiumLockup width={logoW} style={{ overflow: "visible" }} />
          </a>
          <p style={{ margin: 0, maxWidth: "340px", fontSize: "15px", lineHeight: 1.55, color: "#5B5349", textWrap: "balance" }}>
            {t("Nutrition, training, health, coaching and community, in one place.")}
          </p>
        </div>
        <a
          data-ftrow="cta"
          href="/contact"
          onClick={pageLink("/contact")}
          className="cl-lift cl-hbg"
          style={
            {
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              minHeight: "48px",
              padding: "0 26px",
              borderRadius: "999px",
              background: "#775FD7",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: "15px",
              whiteSpace: "nowrap",
              transition: "transform .25s cubic-bezier(.22,1,.36,1),background .2s",
              "--hbg": "#6A54C4",
            } as React.CSSProperties
          }
        >
          {t("Contact us")}
          {/* Round F (AV): the arrow points the way the text reads (Arabic only; English unchanged). */}
          <span aria-hidden="true">{isRtl() ? "←" : "→"}</span>
        </a>
        <nav
          data-ftrow="links"
          aria-label={t("Footer")}
          style={{
            display: "grid",
            gridTemplateColumns: lg ? "repeat(3,160px)" : "minmax(0,1fr)",
            justifyContent: "center",
            gap: lg ? "0 48px" : "0",
            width: lg ? "auto" : "min(100%,320px)",
          }}
        >
          {COLUMNS.map((c) => (
            <details key={c.t + (lg ? "-lg" : "")} data-ftcat="" open={lg ? true : undefined} style={{ borderBottom: lg ? "0" : "1px solid rgba(34,30,26,.1)" }}>
              <summary
                style={{
                  listStyle: "none",
                  cursor: lg ? "default" : "pointer",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "8px",
                  minHeight: "40px",
                  fontSize: "10.5px",
                  fontWeight: 800,
                  letterSpacing: ".22em",
                  color: "#6C655C",
                }}
              >
                {c.t}
                <span aria-hidden="true" style={{ display: lg ? "none" : "inline", color: "#775FD7", fontSize: "15px" }}>
                  +
                </span>
              </summary>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", paddingBottom: "10px" }}>
                {c.l.map((ln) => {
                  const style = {
                    padding: "6px 0",
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#3B352D",
                    whiteSpace: "nowrap",
                    background: UNDERLINE,
                    transition: "background-size .3s cubic-bezier(.22,1,.36,1),color .2s",
                    "--hc": "#6A54C4",
                  } as React.CSSProperties;
                  return ln.app ? (
                    <Link key={ln.t} to="/app" className="cl-hc cl-uline" style={style}>
                      {ln.t}
                    </Link>
                  ) : (
                    <a key={ln.t} href={"/#" + ln.section} onClick={sectionLink(ln.section!)} className="cl-hc cl-uline" style={style}>
                      {ln.t}
                    </a>
                  );
                })}
              </div>
            </details>
          ))}
        </nav>
        <div data-ftrow="social" style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
          {SOCIALS.map((so) => (
            <a
              key={so.t}
              href={so.h}
              target={so.external ? "_blank" : "_self"}
              rel={so.external ? "noreferrer noopener" : undefined}
              onClick={so.external ? undefined : (e) => e.preventDefault()}
              aria-label={so.t}
              className="cl-hbg cl-hbd cl-hc cl-lift"
              style={
                {
                  width: "40px",
                  height: "40px",
                  borderRadius: "99px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(125,103,217,.24)",
                  background: "rgba(255,255,255,.7)",
                  color: "#6A54C4",
                  transition: "transform .2s cubic-bezier(.22,1,.36,1)",
                  "--hbg": "#5D9C93",
                  "--hbd": "#5D9C93",
                  "--hc": "#FFFFFF",
                } as React.CSSProperties
              }
            >
              <svg
                viewBox="0 0 24 24"
                style={{ width: "16px", height: "16px" }}
                fill={so.fill}
                stroke={so.stroke}
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={so.d} />
              </svg>
            </a>
          ))}
        </div>
        <div
          data-ftrow="legal"
          style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "6px 16px", fontSize: "13px", color: "#5B5349" }}
        >
          <span style={{ whiteSpace: "nowrap" }}>{t("© {year} Centium. All rights reserved.", { year: new Date().getFullYear() })}</span>
          <span aria-hidden="true" style={{ width: "3px", height: "3px", borderRadius: "99px", background: "#B9B2A8" }} />
          <a
            href="/legal"
            onClick={pageLink("/legal")}
            className="cl-hc cl-uline"
            style={
              {
                fontWeight: 700,
                color: "#3B352D",
                background: UNDERLINE,
                transition: "background-size .3s cubic-bezier(.22,1,.36,1),color .2s",
                "--hc": "#5C48A8",
              } as React.CSSProperties
            }
          >
            {t("Legal")}
          </a>
          {/* Round F (AV): the language switch lives here (and in the phone
              menu), so the nav keeps the handoff's measured layout. */}
          <span aria-hidden="true" style={{ width: "3px", height: "3px", borderRadius: "99px", background: "#B9B2A8" }} />
          <LanguageSwitch style={{ fontSize: "13px", fontWeight: 700, color: "#3B352D", padding: "0" }} />
        </div>
      </div>
      {/* Kept from the previous footer (audit 2.C): iOS Safari's rubber-band
          bounce past the document's end reveals the page's own white under the
          wash, and overscroll-behavior on <html> does not stop it for the main
          scroller there. This bounce-sized buffer of the same wash keeps what
          the bounce reveals coloured. */}
      <div aria-hidden="true" style={{ position: "relative", height: "220px" }} />
    </footer>
  );
};
