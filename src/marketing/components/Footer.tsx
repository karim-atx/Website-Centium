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
        top: -560,
        background:
          "linear-gradient(90deg,#8E71DE 0%,#A88FE6 12%,#C6B5F0 22%,#E6DFF8 32%,#F7F4FD 41%,#FFFFFF 50%,#F1F8F5 59%,#DCEDE8 68%,#B5D8D0 78%,#7CBBAF 88%,#4F9E91 100%)",
        maskImage:
          "radial-gradient(ellipse 470px 1120px at -4% 118%,#000 0%,#000 40%,rgba(0,0,0,.72) 60%,rgba(0,0,0,.34) 76%,rgba(0,0,0,.08) 90%,rgba(0,0,0,0) 100%)," +
          "radial-gradient(ellipse 470px 1120px at 104% 118%,#000 0%,#000 40%,rgba(0,0,0,.72) 60%,rgba(0,0,0,.34) 76%,rgba(0,0,0,.08) 90%,rgba(0,0,0,0) 100%)," +
          "radial-gradient(ellipse 620px 900px at 50% 112%,#000 0%,#000 58%,rgba(0,0,0,.7) 78%,rgba(0,0,0,.24) 92%,rgba(0,0,0,0) 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 470px 1120px at -4% 118%,#000 0%,#000 40%,rgba(0,0,0,.72) 60%,rgba(0,0,0,.34) 76%,rgba(0,0,0,.08) 90%,rgba(0,0,0,0) 100%)," +
          "radial-gradient(ellipse 470px 1120px at 104% 118%,#000 0%,#000 40%,rgba(0,0,0,.72) 60%,rgba(0,0,0,.34) 76%,rgba(0,0,0,.08) 90%,rgba(0,0,0,0) 100%)," +
          "radial-gradient(ellipse 620px 900px at 50% 112%,#000 0%,#000 58%,rgba(0,0,0,.7) 78%,rgba(0,0,0,.24) 92%,rgba(0,0,0,0) 100%)",
        maskComposite: "add,add,subtract",
        WebkitMaskComposite: "source-over,source-over,destination-out",
      }}
    />
    <div className="relative max-w-[1180px] mx-auto px-5 sm:px-10 pt-16 pb-8">
      <div className="flex flex-col items-center gap-[26px]">
        <Link to="/" id="footer-logo" className="flex items-center gap-[9.9px]" style={{ color: "#5C48A8" }}>
          <CentiumMark size={26} />
          <CentiumWordmarkCropped height={10} />
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
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center border-[#C6B9EE] bg-[#F4F1FB] text-[#7D67D9] transition-[color,background-color,border-color,transform] duration-200 hover:bg-[#5E9E95] hover:border-[#5E9E95] hover:text-white hover:-translate-y-0.5"
              style={{ borderWidth: 1, borderStyle: "solid" }}
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
