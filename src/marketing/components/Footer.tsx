import React, { useSyncExternalStore } from "react";
import { Link, useLocation } from "react-router-dom";
import { CentiumLockup } from "../../components/icons/CentiumMark";
import { LG, reducedMotion } from "../landing/engine/env";
import { usePageLink, useMarketingNav, useSectionLink } from "../landing/navigation";

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

const WASH_BG =
  "linear-gradient(90deg,rgba(255,255,255,0) 26%,rgba(255,255,255,.28) 34%,rgba(255,255,255,.66) 40%,rgba(255,255,255,.92) 45%,#FFFFFF 50%,rgba(255,255,255,.92) 55%,rgba(255,255,255,.66) 60%,rgba(255,255,255,.28) 66%,rgba(255,255,255,0) 74%)," +
  "radial-gradient(118% 122% at 0% 100%,rgba(124,96,214,0.5000) 0.0%,rgba(124,96,214,0.4677) 4.0%,rgba(124,96,214,0.4362) 8.0%,rgba(124,96,214,0.4054) 12.0%,rgba(124,96,214,0.3754) 16.0%,rgba(124,96,214,0.3462) 20.0%,rgba(124,96,214,0.3177) 24.0%,rgba(124,96,214,0.2901) 28.0%,rgba(124,96,214,0.2633) 32.0%,rgba(124,96,214,0.2374) 36.0%,rgba(124,96,214,0.2125) 40.0%,rgba(124,96,214,0.1884) 44.0%,rgba(124,96,214,0.1654) 48.0%,rgba(124,96,214,0.1433) 52.0%,rgba(124,96,214,0.1224) 56.0%,rgba(124,96,214,0.1026) 60.0%,rgba(124,96,214,0.0840) 64.0%,rgba(124,96,214,0.0666) 68.0%,rgba(124,96,214,0.0507) 72.0%,rgba(124,96,214,0.0363) 76.0%,rgba(124,96,214,0.0236) 80.0%,rgba(124,96,214,0.0128) 84.0%,rgba(124,96,214,0.0045) 88.0%,rgba(124,96,214,0.0000) 92.0%,rgba(255,255,255,0) 100%)," +
  "radial-gradient(118% 122% at 100% 100%,rgba(62,145,132,0.4600) 0.0%,rgba(62,145,132,0.4303) 4.0%,rgba(62,145,132,0.4013) 8.0%,rgba(62,145,132,0.3730) 12.0%,rgba(62,145,132,0.3454) 16.0%,rgba(62,145,132,0.3185) 20.0%,rgba(62,145,132,0.2923) 24.0%,rgba(62,145,132,0.2669) 28.0%,rgba(62,145,132,0.2423) 32.0%,rgba(62,145,132,0.2185) 36.0%,rgba(62,145,132,0.1955) 40.0%,rgba(62,145,132,0.1734) 44.0%,rgba(62,145,132,0.1521) 48.0%,rgba(62,145,132,0.1319) 52.0%,rgba(62,145,132,0.1126) 56.0%,rgba(62,145,132,0.0944) 60.0%,rgba(62,145,132,0.0772) 64.0%,rgba(62,145,132,0.0613) 68.0%,rgba(62,145,132,0.0466) 72.0%,rgba(62,145,132,0.0334) 76.0%,rgba(62,145,132,0.0217) 80.0%,rgba(62,145,132,0.0118) 84.0%,rgba(62,145,132,0.0042) 88.0%,rgba(62,145,132,0.0000) 92.0%,rgba(255,255,255,0) 100%)," +
  "#FFFFFF";
const WEDGE_STOPS =
  "#000 0%,#000 2%,rgba(0,0,0,1.0000) 2.0%,rgba(0,0,0,0.9934) 4.7%,rgba(0,0,0,0.9745) 7.3%,rgba(0,0,0,0.9446) 10.0%,rgba(0,0,0,0.9050) 12.7%,rgba(0,0,0,0.8569) 15.3%,rgba(0,0,0,0.8017) 18.0%,rgba(0,0,0,0.7407) 20.7%,rgba(0,0,0,0.6752) 23.3%,rgba(0,0,0,0.6064) 26.0%,rgba(0,0,0,0.5357) 28.7%,rgba(0,0,0,0.4643) 31.3%,rgba(0,0,0,0.3936) 34.0%,rgba(0,0,0,0.3248) 36.7%,rgba(0,0,0,0.2593) 39.3%,rgba(0,0,0,0.1983) 42.0%,rgba(0,0,0,0.1431) 44.7%,rgba(0,0,0,0.0950) 47.3%,rgba(0,0,0,0.0554) 50.0%,rgba(0,0,0,0.0255) 52.7%,rgba(0,0,0,0.0066) 55.3%,rgba(0,0,0,0.0000) 58.0%,rgba(0,0,0,0) 62%";
const WEDGE_48 = "linear-gradient(48deg," + WEDGE_STOPS + ")";
const WEDGE_312 = "linear-gradient(312deg," + WEDGE_STOPS + ")";

const COLUMNS: { t: string; l: { t: string; section?: string; app?: boolean }[] }[] = [
  {
    t: "PRODUCT",
    l: [
      { t: "Features", section: "platform" },
      { t: "Pricing", section: "pricing" },
      { t: "Reviews", section: "reviews" },
    ],
  },
  {
    t: "FOR TEAMS",
    l: [
      { t: "Professionals", section: "everyone" },
      { t: "Businesses", section: "everyone" },
    ],
  },
  {
    t: "HELP",
    l: [
      { t: "FAQ", section: "faq" },
      { t: "Log in", app: true },
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
        left: 0,
        right: 0,
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
          <a href="/" onClick={goHomeNav} aria-label="Centium home" style={{ display: "block" }}>
            <CentiumLockup width={logoW} style={{ overflow: "visible" }} />
          </a>
          <p style={{ margin: 0, maxWidth: "340px", fontSize: "15px", lineHeight: 1.55, color: "#5B5349", textWrap: "balance" }}>
            Nutrition, training, health, coaching and community, in one place.
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
              background: "#7D67D9",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: "15px",
              whiteSpace: "nowrap",
              transition: "transform .25s cubic-bezier(.22,1,.36,1),background .2s",
              "--hbg": "#6A54C4",
            } as React.CSSProperties
          }
        >
          Contact us<span aria-hidden="true">→</span>
        </a>
        <nav
          data-ftrow="links"
          aria-label="Footer"
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
                  color: "#8C8378",
                }}
              >
                {c.t}
                <span aria-hidden="true" style={{ display: lg ? "none" : "inline", color: "#7D67D9", fontSize: "15px" }}>
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
                  "--hbg": "#5E9E95",
                  "--hbd": "#5E9E95",
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
          <span style={{ whiteSpace: "nowrap" }}>© {new Date().getFullYear()} Centium. All rights reserved.</span>
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
                "--hc": "#6A54C4",
              } as React.CSSProperties
            }
          >
            Legal
          </a>
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
