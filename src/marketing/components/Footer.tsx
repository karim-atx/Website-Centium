import React from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { CentiumMark, CentiumWordmarkCropped } from "./CentiumLogo";

// v4 Centium landing handoff: footer restructured to a centred vertical
// stack (logo → socials → link columns) instead of the v3 left-aligned
// brand column beside two link columns. Discord replaces LinkedIn (there is
// no LinkedIn icon in this handoff), column titles/links go grey instead of
// purple/teal, and a peaked "colour wash" gradient layer sits behind the
// whole thing.
//
// v5 landing handoff: the colour-wash layer itself was replaced wholesale —
// a horizontal rainbow sweep (purple → white → teal) masked by three
// elliptical radial masks composited add/add/subtract, superseded by two
// bottom-corner radial colour pools (purple bottom-left, teal bottom-right)
// over a white base, clipped by a symmetric V-shaped wedge made of two
// diagonal (48deg/312deg) linear-gradient masks. This is a full replacement
// of that div's `background`/mask properties, not an addition alongside the
// old ones — see CLAUDE.md's "footer double-gradient" regression.
const columns: { title: string; links: { to: string; label: string; tealHover?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { to: "/#platform", label: "Features" },
      { to: "/#pricing", label: "Pricing" },
      { to: "/app", label: "Log in" },
      // Only this link carries a hover color in the handoff (style-hover:
      // color:#2F5F58) — the rest of the footer links have none.
      { to: "/contact", label: "Request a Demo", tealHover: true },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/#faq", label: "FAQ" },
      { to: "/contact", label: "Contact" },
      { to: "/legal", label: "Legal" },
    ],
  },
];

const socials: { label: string; href: string; external?: boolean; path: React.ReactNode }[] = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/centium.app/?utm_source=ig_web_button_share_sheet",
    external: true,
    path: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="17.4" cy="6.6" r=".8" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "Discord",
    href: "#",
    path: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.3 5.6A16.2 16.2 0 0 0 15.4 4.4l-.3.6a12.3 12.3 0 0 1 3.4 1.1 11.6 11.6 0 0 0-9-.1c-.4.1-.9.3-1.4.5A12.5 12.5 0 0 1 8.9 5l-.3-.6A16.2 16.2 0 0 0 4.7 5.6C2.2 9.3 1.5 13 1.9 16.6a16.4 16.4 0 0 0 4.9 2.5l.6-1a10.7 10.7 0 0 1-1.7-.8l.4-.3a11.7 11.7 0 0 0 9.8 0l.4.3a10.7 10.7 0 0 1-1.7.8l.6 1a16.4 16.4 0 0 0 4.9-2.5c.5-4.2-.6-7.9-2.8-11zM8.7 14.4c-1 0-1.7-.9-1.7-1.9s.8-1.9 1.7-1.9 1.8.9 1.7 1.9-.7 1.9-1.7 1.9zm6.6 0c-1 0-1.7-.9-1.7-1.9s.8-1.9 1.7-1.9 1.8.9 1.7 1.9-.7 1.9-1.7 1.9z" />
      </svg>
    ),
  },
  {
    label: "X",
    href: "#",
    path: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.4 3h3.3l-7.1 8.1L21.6 21h-6l-4.2-5.5L6.5 21H3.2l7.4-8.5L2.8 3h6.1l3.9 5.2zm-1.1 16h1.8L7.5 4.9H5.6z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "#",
    path: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2.5" y="6" width="19" height="12" rx="4" />
        <path d="M11 10l4 2-4 2z" fill="currentColor" />
      </svg>
    ),
  },
];

export const Footer: React.FC = () => (
  <footer className="relative bg-white">
    <div
      aria-hidden="true"
      className="absolute left-0 right-0 bottom-0 pointer-events-none z-0"
      style={{
        top: -660,
        background:
          "linear-gradient(90deg,rgba(255,255,255,0) 26%,rgba(255,255,255,.28) 34%,rgba(255,255,255,.66) 40%,rgba(255,255,255,.92) 45%,#FFFFFF 50%,rgba(255,255,255,.92) 55%,rgba(255,255,255,.66) 60%,rgba(255,255,255,.28) 66%,rgba(255,255,255,0) 74%)," +
          "radial-gradient(118% 122% at 0% 100%,rgba(124,96,214,0.5000) 0.0%,rgba(124,96,214,0.4677) 4.0%,rgba(124,96,214,0.4362) 8.0%,rgba(124,96,214,0.4054) 12.0%,rgba(124,96,214,0.3754) 16.0%,rgba(124,96,214,0.3462) 20.0%,rgba(124,96,214,0.3177) 24.0%,rgba(124,96,214,0.2901) 28.0%,rgba(124,96,214,0.2633) 32.0%,rgba(124,96,214,0.2374) 36.0%,rgba(124,96,214,0.2125) 40.0%,rgba(124,96,214,0.1884) 44.0%,rgba(124,96,214,0.1654) 48.0%,rgba(124,96,214,0.1433) 52.0%,rgba(124,96,214,0.1224) 56.0%,rgba(124,96,214,0.1026) 60.0%,rgba(124,96,214,0.0840) 64.0%,rgba(124,96,214,0.0666) 68.0%,rgba(124,96,214,0.0507) 72.0%,rgba(124,96,214,0.0363) 76.0%,rgba(124,96,214,0.0236) 80.0%,rgba(124,96,214,0.0128) 84.0%,rgba(124,96,214,0.0045) 88.0%,rgba(124,96,214,0.0000) 92.0%,rgba(255,255,255,0) 100%)," +
          "radial-gradient(118% 122% at 100% 100%,rgba(62,145,132,0.4600) 0.0%,rgba(62,145,132,0.4303) 4.0%,rgba(62,145,132,0.4013) 8.0%,rgba(62,145,132,0.3730) 12.0%,rgba(62,145,132,0.3454) 16.0%,rgba(62,145,132,0.3185) 20.0%,rgba(62,145,132,0.2923) 24.0%,rgba(62,145,132,0.2669) 28.0%,rgba(62,145,132,0.2423) 32.0%,rgba(62,145,132,0.2185) 36.0%,rgba(62,145,132,0.1955) 40.0%,rgba(62,145,132,0.1734) 44.0%,rgba(62,145,132,0.1521) 48.0%,rgba(62,145,132,0.1319) 52.0%,rgba(62,145,132,0.1126) 56.0%,rgba(62,145,132,0.0944) 60.0%,rgba(62,145,132,0.0772) 64.0%,rgba(62,145,132,0.0613) 68.0%,rgba(62,145,132,0.0466) 72.0%,rgba(62,145,132,0.0334) 76.0%,rgba(62,145,132,0.0217) 80.0%,rgba(62,145,132,0.0118) 84.0%,rgba(62,145,132,0.0042) 88.0%,rgba(62,145,132,0.0000) 92.0%,rgba(255,255,255,0) 100%)," +
          "#FFFFFF",
        maskImage:
          "linear-gradient(48deg,#000 0%,#000 2%,rgba(0,0,0,1.0000) 2.0%,rgba(0,0,0,0.9934) 4.7%,rgba(0,0,0,0.9745) 7.3%,rgba(0,0,0,0.9446) 10.0%,rgba(0,0,0,0.9050) 12.7%,rgba(0,0,0,0.8569) 15.3%,rgba(0,0,0,0.8017) 18.0%,rgba(0,0,0,0.7407) 20.7%,rgba(0,0,0,0.6752) 23.3%,rgba(0,0,0,0.6064) 26.0%,rgba(0,0,0,0.5357) 28.7%,rgba(0,0,0,0.4643) 31.3%,rgba(0,0,0,0.3936) 34.0%,rgba(0,0,0,0.3248) 36.7%,rgba(0,0,0,0.2593) 39.3%,rgba(0,0,0,0.1983) 42.0%,rgba(0,0,0,0.1431) 44.7%,rgba(0,0,0,0.0950) 47.3%,rgba(0,0,0,0.0554) 50.0%,rgba(0,0,0,0.0255) 52.7%,rgba(0,0,0,0.0066) 55.3%,rgba(0,0,0,0.0000) 58.0%,rgba(0,0,0,0) 62%)," +
          "linear-gradient(312deg,#000 0%,#000 2%,rgba(0,0,0,1.0000) 2.0%,rgba(0,0,0,0.9934) 4.7%,rgba(0,0,0,0.9745) 7.3%,rgba(0,0,0,0.9446) 10.0%,rgba(0,0,0,0.9050) 12.7%,rgba(0,0,0,0.8569) 15.3%,rgba(0,0,0,0.8017) 18.0%,rgba(0,0,0,0.7407) 20.7%,rgba(0,0,0,0.6752) 23.3%,rgba(0,0,0,0.6064) 26.0%,rgba(0,0,0,0.5357) 28.7%,rgba(0,0,0,0.4643) 31.3%,rgba(0,0,0,0.3936) 34.0%,rgba(0,0,0,0.3248) 36.7%,rgba(0,0,0,0.2593) 39.3%,rgba(0,0,0,0.1983) 42.0%,rgba(0,0,0,0.1431) 44.7%,rgba(0,0,0,0.0950) 47.3%,rgba(0,0,0,0.0554) 50.0%,rgba(0,0,0,0.0255) 52.7%,rgba(0,0,0,0.0066) 55.3%,rgba(0,0,0,0.0000) 58.0%,rgba(0,0,0,0) 62%)",
        WebkitMaskImage:
          "linear-gradient(48deg,#000 0%,#000 2%,rgba(0,0,0,1.0000) 2.0%,rgba(0,0,0,0.9934) 4.7%,rgba(0,0,0,0.9745) 7.3%,rgba(0,0,0,0.9446) 10.0%,rgba(0,0,0,0.9050) 12.7%,rgba(0,0,0,0.8569) 15.3%,rgba(0,0,0,0.8017) 18.0%,rgba(0,0,0,0.7407) 20.7%,rgba(0,0,0,0.6752) 23.3%,rgba(0,0,0,0.6064) 26.0%,rgba(0,0,0,0.5357) 28.7%,rgba(0,0,0,0.4643) 31.3%,rgba(0,0,0,0.3936) 34.0%,rgba(0,0,0,0.3248) 36.7%,rgba(0,0,0,0.2593) 39.3%,rgba(0,0,0,0.1983) 42.0%,rgba(0,0,0,0.1431) 44.7%,rgba(0,0,0,0.0950) 47.3%,rgba(0,0,0,0.0554) 50.0%,rgba(0,0,0,0.0255) 52.7%,rgba(0,0,0,0.0066) 55.3%,rgba(0,0,0,0.0000) 58.0%,rgba(0,0,0,0) 62%)," +
          "linear-gradient(312deg,#000 0%,#000 2%,rgba(0,0,0,1.0000) 2.0%,rgba(0,0,0,0.9934) 4.7%,rgba(0,0,0,0.9745) 7.3%,rgba(0,0,0,0.9446) 10.0%,rgba(0,0,0,0.9050) 12.7%,rgba(0,0,0,0.8569) 15.3%,rgba(0,0,0,0.8017) 18.0%,rgba(0,0,0,0.7407) 20.7%,rgba(0,0,0,0.6752) 23.3%,rgba(0,0,0,0.6064) 26.0%,rgba(0,0,0,0.5357) 28.7%,rgba(0,0,0,0.4643) 31.3%,rgba(0,0,0,0.3936) 34.0%,rgba(0,0,0,0.3248) 36.7%,rgba(0,0,0,0.2593) 39.3%,rgba(0,0,0,0.1983) 42.0%,rgba(0,0,0,0.1431) 44.7%,rgba(0,0,0,0.0950) 47.3%,rgba(0,0,0,0.0554) 50.0%,rgba(0,0,0,0.0255) 52.7%,rgba(0,0,0,0.0066) 55.3%,rgba(0,0,0,0.0000) 58.0%,rgba(0,0,0,0) 62%)",
        // Order matters: -webkit-mask-composite and mask-composite alias to
        // the same underlying value in this engine, so whichever is set
        // last wins. The handoff's own markup writes -webkit- first, then
        // the standard property last (so "add" wins over the legacy
        // "source-over" keyword) -- this object mirrors that literal order.
        // Reversed, the invalid "source-over" value wins for both, which
        // blanks out most of the mask instead of unioning the two wedges.
        WebkitMaskComposite: "source-over",
        maskComposite: "add",
      }}
    />
    <div className="relative max-w-[1180px] mx-auto px-5 sm:px-10 pt-9 pb-8">
      <div className="flex flex-col items-center gap-[26px]">
        <Link
          to="/"
          id="footer-logo"
          className="flex items-center gap-[15.2px]"
          style={{ color: "#5C48A8", transform: "translateX(-3px)" }}
        >
          <CentiumMark size={40} />
          <CentiumWordmarkCropped height={15.4} />
        </Link>

        <div className="flex gap-2 justify-center">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              onClick={s.external ? undefined : (e) => e.preventDefault()}
              target={s.external ? "_blank" : undefined}
              rel={s.external ? "noreferrer noopener" : undefined}
              aria-label={s.label}
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center border-[#C6B9EE] bg-[#F4F1FB] transition-[color,background-color,border-color,transform] duration-200 hover:bg-[#5E9E95] hover:border-[#5E9E95] hover:text-white hover:-translate-y-0.5"
              style={{ borderWidth: 1, borderStyle: "solid", color: "#7D67D9" }}
            >
              {s.path}
            </a>
          ))}
        </div>

        <div
          className="self-stretch grid justify-center gap-[clamp(28px,4vw,64px)] mt-1.5"
          style={{ gridTemplateColumns: "repeat(2,minmax(0,124px))" }}
        >
          {columns.map((col) => (
            <div key={col.title}>
              <p className="font-bold text-[17px] tracking-[.02em] pb-3.5 text-center" style={{ color: "#6B6358", borderBottom: "1px solid #EDEAE4" }}>
                {col.title}
              </p>
              <ul className="flex flex-col gap-[13px] mt-5 text-center">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className={clsx("text-[12.5px] font-semibold transition-colors", l.tealHover && "hover:text-[#2F5F58]")}
                      style={{ color: "#A9A29A" }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center mt-[52px] pt-[22px] border-t border-mkt-ink/[.14]">
        <span className="text-[12.5px] text-[#5B5349] text-center">© {new Date().getFullYear()} Centium. All rights reserved.</span>
      </div>
    </div>
  </footer>
);
