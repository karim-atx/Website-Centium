import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { OfflineBanner } from "./OfflineBanner";
import { PendingDeletionBanner } from "./PendingDeletionBanner";
import { ConsentReviewBanner } from "../professionals/ConsentReviewBanner";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { UnreadProvider } from "../../context/UnreadContext";

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
    // Wrapping the shell rather than the app: this is the smallest scope that
    // covers both navs AND every route, which is what a badge visible from the
    // dashboard requires. Outside RequireOnboarded there is no session to count
    // for anyway.
    <UnreadProvider>
      <div className="min-h-screen bg-cream flex">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-28 lg:pb-12">
            {/* First, because it explains why the other two might not be able to
                act. A pending deletion cannot be cancelled and consent cannot be
                answered without a connection, so the reason belongs above the
                controls it affects. */}
            <OfflineBanner />
            <PendingDeletionBanner />
            <ConsentReviewBanner />
            <Outlet />
          </main>
        </div>
        <BottomNav />
      </div>
    </UnreadProvider>
  );
};
