import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Sun, Moon, Menu, X } from "lucide-react";
import clsx from "clsx";
import { CentiumLogo } from "../../components/ui/CentiumLogo";
import { useApp } from "../../context/AppContext";

const links = [
  { to: "/product", label: "Product" },
  { to: "/pricing", label: "Pricing" },
  { to: "/business", label: "For Business" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export const Nav: React.FC = () => {
  const { theme, toggleTheme } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-cream/80 backdrop-blur-lg border-b border-charcoal/5">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <CentiumLogo size={30} />
          <span className="font-display font-extrabold tracking-tight text-charcoal text-lg">CENTIUM</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                clsx(
                  "px-3.5 py-2 rounded-full text-sm font-semibold transition-colors",
                  isActive ? "text-primary-dark bg-primary-pale" : "text-charcoal-soft hover:text-charcoal"
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-soft"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <Link
            to="/app"
            className="tap px-4 py-2 rounded-full text-sm font-semibold text-charcoal-soft hover:bg-cream-soft"
          >
            Log In
          </Link>
          <Link
            to="/app"
            className="tap px-4 py-2 rounded-full text-sm font-semibold bg-primary text-white hover:bg-primary-dark shadow-soft"
          >
            Get Started
          </Link>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="lg:hidden tap w-10 h-10 rounded-full flex items-center justify-center text-charcoal"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-charcoal/5 bg-cream px-5 py-4 animate-fade-slide-up">
          <nav className="flex flex-col gap-1" aria-label="Primary">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    "px-3 py-2.5 rounded-xl text-sm font-semibold",
                    isActive ? "text-primary-dark bg-primary-pale" : "text-charcoal-soft"
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-charcoal/5">
            <button
              onClick={toggleTheme}
              className="tap flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-charcoal-soft bg-cream-soft flex items-center justify-center gap-2"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Link
              to="/app"
              onClick={() => setOpen(false)}
              className="tap flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-charcoal-soft bg-cream-soft"
            >
              Log In
            </Link>
            <Link
              to="/app"
              onClick={() => setOpen(false)}
              className="tap flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
