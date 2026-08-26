import React from "react";
import { Link } from "react-router-dom";
import { CentiumLogo } from "../../components/ui/CentiumLogo";

const columns: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { to: "/product", label: "Features" },
      { to: "/pricing", label: "Pricing" },
      { to: "/app", label: "Log In" },
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
  <footer className="border-t border-charcoal/5 bg-cream">
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">
        <div className="col-span-2 sm:col-span-1">
          <Link to="/" className="flex items-center gap-2">
            <CentiumLogo size={26} />
            <span className="font-display font-extrabold tracking-tight text-charcoal">CENTIUM</span>
          </Link>
          <p className="text-sm text-charcoal-faint mt-3 max-w-[220px]">
            One place to understand, manage and improve your health.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-bold uppercase tracking-wide text-charcoal-faint mb-3">{col.title}</p>
            <ul className="flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-charcoal-soft hover:text-primary-dark transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-12 pt-6 border-t border-charcoal/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-xs text-charcoal-faint">© {new Date().getFullYear()} Centium. All rights reserved.</p>
        <p className="text-xs text-charcoal-faint">A product prototype — not yet available for download.</p>
      </div>
    </div>
  </footer>
);
