import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import clsx from "clsx";
import { CentiumMark, CentiumWordmark } from "./CentiumLogo";
import { useNavTheme } from "../hooks/useNavTheme";

// QA - Web 2.0 §01: the nav is part of the single-page landing page, not a
// set of separate routes — every item scrolls to a section on "/" instead
// of navigating to its own page. "Contact" has no equivalent landing-page
// section, so it's kept as a real route to the existing /contact page.
const links = [
  { to: "/#platform", label: "Features" },
  { to: "/#pricing", label: "Pricing" },
  { to: "/#faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];

/** Sticky, fully transparent nav pulled over the page content (`-mt-[72px]`
 *  on the element after it) so section color and the hero canvas run behind
 *  it. Logo, link text and pill fills all flip between a dark-on-light and
 *  light-on-dark palette depending on whether a `data-nav-dark` section
 *  (see useNavTheme) currently sits behind the bar — every section that
 *  needs the dark variant carries that attribute itself. */
export const Nav: React.FC = () => {
  const [open, setOpen] = useState(false);
  const dark = useNavTheme();
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-transparent mb-[-72px]">
      <div
        className={clsx(
          "max-w-[1180px] mx-auto px-5 sm:px-10 h-[72px] flex items-center justify-between gap-6 transition-colors duration-300",
          dark ? "text-white" : "text-mkt-logo"
        )}
      >
        <Link to="/" className="group flex items-center gap-[11px] shrink-0" onClick={() => setOpen(false)}>
          <CentiumMark size={28} leafFill={dark ? "#FFFFFF" : "#8AC4BA"} />
          <CentiumWordmark height={11} />
        </Link>

        <nav
          className="hidden lg:flex items-center gap-0.5 rounded-full p-1 backdrop-blur-[22px] backdrop-saturate-[1.8]"
          aria-label="Primary"
        >
          {links.map((l) => {
            // Only "Contact" is a real route — the rest are same-page
            // anchors, so highlighting them as "active" while on "/" would
            // light up all three at once. Active state is meaningful for
            // Contact alone.
            const isActive = !l.to.includes("#") && pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={clsx(
                  "px-4 py-2 rounded-full text-[13.5px] font-semibold whitespace-nowrap transition-colors duration-200",
                  isActive
                    ? dark
                      ? "bg-white/16 text-white"
                      : "bg-mkt-accent/[.12] text-[#5C48A8]"
                    : dark
                      ? "text-white/[.82] hover:text-white"
                      : "text-mkt-soft hover:text-mkt-ink"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-3.5 shrink-0">
          <Link
            to="/app"
            className={clsx(
              "tap text-[13.5px] font-semibold whitespace-nowrap px-[17px] py-[9px] rounded-full backdrop-blur-[22px] backdrop-saturate-[1.8] border transition-[transform,background-color,color,border-color] duration-150 active:scale-[.96]",
              dark ? "text-white/[.88] border-white/[.14]" : "text-mkt-soft border-mkt-ink/[.08]"
            )}
          >
            Log in
          </Link>
          <Link
            to="/app"
            className="tap px-[19px] py-2.5 rounded-full bg-mkt-accent text-white text-[13.5px] font-semibold whitespace-nowrap hover:bg-mkt-accent-hover transition-[background-color,transform] duration-150 active:scale-[.96]"
          >
            Get Started
          </Link>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className={clsx(
            "lg:hidden tap w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-[22px] backdrop-saturate-[1.8] border transition-[transform,color,background-color,border-color] duration-150 active:scale-[.96]",
            dark ? "text-white border-white/[.14]" : "text-mkt-ink border-mkt-ink/[.08]"
          )}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div
          className={clsx(
            "lg:hidden mx-3 mb-3 p-4 rounded-[20px] border backdrop-blur-[22px] backdrop-saturate-[1.8] shadow-[0_18px_50px_rgba(34,30,26,.14)] animate-fade-slide-up",
            dark ? "bg-[#131024]/[.72] border-white/[.14]" : "bg-[#FAF9FC]/[.62] border-mkt-ink/[.08]"
          )}
        >
          <nav className="flex flex-col gap-1" aria-label="Primary">
            {links.map((l) => {
              const isActive = !l.to.includes("#") && pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    "px-3 py-2.5 rounded-xl text-sm font-semibold",
                    isActive
                      ? dark
                        ? "text-white bg-white/[.14]"
                        : "text-mkt-accent bg-mkt-tint"
                      : dark
                        ? "text-white/[.85]"
                        : "text-mkt-soft"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-mkt-line">
            <Link
              to="/app"
              onClick={() => setOpen(false)}
              className="tap flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-mkt-soft bg-mkt-wash2"
            >
              Log in
            </Link>
            <Link
              to="/app"
              onClick={() => setOpen(false)}
              className="tap flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-mkt-accent text-white"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
