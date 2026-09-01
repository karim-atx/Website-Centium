import React from "react";
import { Link } from "react-router-dom";
import { CentiumMark, CentiumWordmark } from "./CentiumLogo";

const columns: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { to: "/product", label: "Features" },
      { to: "/pricing", label: "Pricing" },
      { to: "/app", label: "Log in" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/business", label: "For Business" },
      { to: "/about", label: "About" },
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
          <span className="px-3.5 py-[7px] border border-mkt-line rounded-full text-xs font-semibold text-mkt-faint">
            EN
          </span>
          <span className="px-3.5 py-[7px] border border-mkt-line rounded-full text-xs font-semibold text-mkt-faint">
            Dark mode — in the app
          </span>
        </div>
      </div>
    </div>
  </footer>
);
