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

// iOS Safari's rubber-band overscroll past the very bottom of the page
// reveals the document's own background beneath the footer's colour wash —
// a plain white strip that looks out of place. overscroll-behavior on <html>
// suppresses that bounce, so it's scoped to exactly when marketing pages are
// mounted (not the app shell, which hasn't reported this) via this class.
const useNoOverscroll = () => {
  useEffect(() => {
    document.documentElement.classList.add("mkt-no-overscroll");
    return () => document.documentElement.classList.remove("mkt-no-overscroll");
  }, []);
};

export const MarketingLayout: React.FC = () => {
  useNoOverscroll();
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <ScrollToHash />
      <Nav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
