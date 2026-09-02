import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export const Layout: React.FC = () => {
  // This app uses plain BrowserRouter, which — unlike the newer data
  // router's <ScrollRestoration> — never resets scroll on navigation. So
  // switching tabs (e.g. Home, scrolled down, to a shorter page like Food)
  // left the window at its old scroll offset, which the browser then
  // hard-clamped to the new page's shorter max-scroll the instant its
  // content swapped in — an abrupt, visible jump. Scrolling to the top on
  // every route change (as most tab-based apps do) avoids that entirely.
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-cream flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-28 lg:pb-12">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
};
