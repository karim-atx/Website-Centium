import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";

// QA - Web 2.0 §01: nav items are same-page anchors (e.g. "/#platform")
// rather than separate routes. React Router doesn't scroll to a hash on
// its own — neither on a fresh cross-page navigation nor on a same-page
// hash change — so this drives it manually, offset for the sticky nav
// (72px, plus a little breathing room) whenever the location's hash
// changes. No hash: scroll to top, matching default route-change behavior.
const ScrollToHash: React.FC = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    const id = hash.slice(1);
    // Wait a frame so the target section (possibly on a page that just
    // mounted) is actually in the DOM before measuring its position.
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash]);

  return null;
};

export const MarketingLayout: React.FC = () => (
  <div className="min-h-screen bg-cream flex flex-col">
    <ScrollToHash />
    <Nav />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);
