import React from "react";
import { Link } from "react-router-dom";
import { CentiumMark, CentiumWordmark } from "./CentiumLogo";

// QA - Web 2.0 §01/§06: nav's "Product"/"Pricing" are now same-page anchors
// on "/" rather than separate routes, and "About" is renamed to "FAQ" and
// points at the new FAQ section (the standalone About page is deleted) —
// mirrored here so the footer doesn't link anywhere the nav no longer does.
const columns: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { to: "/#platform", label: "Features" },
      { to: "/#pricing", label: "Pricing" },
      { to: "/app", label: "Log in" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/business", label: "For Business" },
      { to: "/#faq", label: "FAQ" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/legal/privacy", label: "Privacy Policy" },
      { to: "/legal/terms", label: "Terms of Service" },
    ],
  },
];

export const Footer: React.FC = () => (
  <footer className="border-t border-mkt-line bg-white">
    <div className="max-w-[1180px] mx-auto px-5 sm:px-10 pt-16 sm:pt-[72px] pb-8">
      <div className="grid grid-cols-2 sm:grid-cols-[1.6fr_1fr_1fr_1fr] gap-10 sm:gap-12">
        <div className="col-span-2 sm:col-span-1">
          <Link to="/" className="group flex items-center gap-[11px] text-mkt-logo">
            <CentiumMark size={26} />
            <CentiumWordmark height={10} />
          </Link>
          <p className="text-[14.5px] leading-relaxed text-mkt-faint mt-4 max-w-[250px]">
            One place to understand, manage and improve your health.
          </p>
          <div className="flex gap-2.5 mt-[22px]">
            <span className="px-4 py-2.5 border border-mkt-line rounded-xl text-xs font-semibold text-mkt-faint">
              App Store — soon
            </span>
            <span className="px-4 py-2.5 border border-mkt-line rounded-xl text-xs font-semibold text-mkt-faint">
              Google Play — soon
            </span>
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="font-semibold text-[10.5px] tracking-[.2em] text-mkt-faint/80">{col.title.toUpperCase()}</p>
            <ul className="flex flex-col gap-3 mt-[18px]">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-[14.5px] text-mkt-soft hover:text-mkt-accent-hover transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-14 pt-6 border-t border-mkt-line">
        <span className="text-[12.5px] text-mkt-faint/80">© {new Date().getFullYear()} Centium. All rights reserved.</span>
        <div className="flex items-center gap-2.5">
          {/* QA - Web 2.0 §12: language shown as "EN - AR". Both remain
              inert labels, same as the existing EN badge — full Arabic
              copy/RTL support is a separate i18n effort, not a content
              edit; see summary. */}
          <span className="flex items-center rounded-full border border-mkt-line text-xs font-semibold text-mkt-faint overflow-hidden">
            <span className="px-3.5 py-[7px] bg-mkt-tint text-mkt-ink">EN</span>
            <span className="px-3.5 py-[7px]">AR</span>
          </span>
          <span className="px-3.5 py-[7px] border border-mkt-line rounded-full text-xs font-semibold text-mkt-faint">
            Dark mode — in the app
          </span>
        </div>
      </div>
    </div>
  </footer>
);
