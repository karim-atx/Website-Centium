import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { CentiumLogo } from "../../components/ui/CentiumLogo";

const links = [
  { to: "/product", label: "Product" },
  { to: "/pricing", label: "Pricing" },
  { to: "/business", label: "For Business" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export const Nav: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-lg border-b border-mkt-line">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-10 h-[72px] flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setOpen(false)}>
          <CentiumLogo size={26} />
          <span className="font-display font-extrabold tracking-[.16em] text-mkt-ink text-[15px]">CENTIUM</span>
        </Link>

        <nav
          className="hidden lg:flex items-center gap-0.5 bg-mkt-capsule rounded-full p-1"
          aria-label="Primary"
        >
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className="relative px-4 py-2 rounded-full text-[13.5px] font-semibold whitespace-nowrap"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 bg-white rounded-full shadow-[0_1px_2px_rgba(34,30,26,.06)]"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <span className={clsx("relative", isActive ? "text-mkt-ink" : "text-mkt-soft")}>{l.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3.5 shrink-0">
          <Link
            to="/app"
            className="tap text-[13.5px] font-semibold text-mkt-soft hover:text-mkt-ink whitespace-nowrap"
          >
            Log in
          </Link>
          <Link
            to="/app"
            className="tap px-[19px] py-2.5 rounded-full bg-mkt-accent text-white text-[13.5px] font-semibold whitespace-nowrap hover:bg-mkt-accent-hover transition-colors"
          >
            Get Started
          </Link>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="lg:hidden tap w-10 h-10 rounded-full flex items-center justify-center text-mkt-ink"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-mkt-line bg-white px-5 py-4 animate-fade-slide-up">
          <nav className="flex flex-col gap-1" aria-label="Primary">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    "px-3 py-2.5 rounded-xl text-sm font-semibold",
                    isActive ? "text-mkt-accent bg-mkt-tint" : "text-mkt-soft"
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
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
