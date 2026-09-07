import React from "react";
import { Link } from "react-router-dom";
import { CentiumMark, CentiumWordmarkCropped } from "./CentiumLogo";

// v3 Centium landing handoff: footer simplified to a plain white band — the
// lavender-gradient CTA band, decorative orbs and store buttons are gone
// (the store buttons moved to the closing CTA section instead), and the
// four-column layout (Brand/Product/Company/Legal) collapsed to three, with
// a single "Legal" link folded into Company rather than its own column.
const columns: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { to: "/#platform", label: "Features" },
      { to: "/#pricing", label: "Pricing" },
      { to: "/app", label: "Log in" },
      { to: "/contact", label: "Request a Demo" },
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

const socials = [
  {
    label: "Instagram",
    path: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="17.4" cy="6.6" r=".8" fill="currentColor" />
      </>
    ),
    fill: false,
  },
  {
    label: "LinkedIn",
    path: (
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3.2 9.2h3.6V21H3.2zM9.2 9.2h3.45v1.6h.05c.5-.9 1.73-1.85 3.6-1.85 3.85 0 4.55 2.35 4.55 5.45V21h-3.6v-5.4c0-1.3-.03-2.95-1.85-2.95-1.85 0-2.15 1.4-2.15 2.86V21H9.2z" />
    ),
    fill: true,
  },
  {
    label: "X",
    path: (
      <path d="M17.4 3h3.3l-7.1 8.1L21.6 21h-6l-4.2-5.5L6.5 21H3.2l7.4-8.5L2.8 3h6.1l3.9 5.2zm-1.1 16h1.8L7.5 4.9H5.6z" />
    ),
    fill: true,
  },
  {
    label: "YouTube",
    path: (
      <>
        <rect x="2.5" y="6" width="19" height="12" rx="4" />
        <path d="M11 10l4 2-4 2z" fill="currentColor" />
      </>
    ),
    fill: false,
  },
];

export const Footer: React.FC = () => (
  <footer className="relative bg-white border-t border-mkt-line">
    <div className="max-w-[1180px] mx-auto px-5 sm:px-10 pt-16 pb-8">
      <div className="grid gap-10" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))" }}>
        <div>
          <Link to="/" id="footer-logo" className="flex items-center gap-[9.9px]" style={{ color: "#5C48A8" }}>
            <CentiumMark size={26} />
            <CentiumWordmarkCropped height={10} />
          </Link>
          <div className="flex gap-2 mt-[22px]">
            {socials.map((s) => (
              <a
                key={s.label}
                href="#"
                onClick={(e) => e.preventDefault()}
                aria-label={s.label}
                className="w-[34px] h-[34px] rounded-full flex items-center justify-center border-[#C6B9EE] bg-[#F4F1FB] text-[#7D67D9] transition-[color,background-color,border-color,transform] duration-200 hover:bg-[#5E9E95] hover:border-[#5E9E95] hover:text-white hover:-translate-y-0.5"
                style={{ borderWidth: 1, borderStyle: "solid" }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill={s.fill ? "currentColor" : "none"}
                  stroke={s.fill ? "none" : "currentColor"}
                  strokeWidth={s.fill ? undefined : "1.9"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {s.path}
                </svg>
              </a>
            ))}
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p
              className="font-bold text-[17px] tracking-[.02em] pb-3.5"
              style={{ color: "#7D67D9", borderBottom: "1px solid #EDEAE4" }}
            >
              {col.title}
            </p>
            <ul className="flex flex-col gap-[13px] mt-5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-[12.5px] font-semibold transition-colors" style={{ color: "#5E9E95" }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center mt-[52px] pt-[22px] border-t border-mkt-ink/[.09]">
        <span className="text-[12.5px] text-mkt-faint text-center">© {new Date().getFullYear()} Centium. All rights reserved.</span>
      </div>
    </div>
  </footer>
);
