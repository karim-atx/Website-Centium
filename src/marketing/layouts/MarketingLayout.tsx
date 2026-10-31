import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { LoadingHost } from "../landing/loading/LoadingHost";
import { anchorHash, keepY, loaderEntryFor, pageOf } from "../landing/loading/pickLoader";
import { PageFadeContext, anchorOffset, anchorTarget } from "../landing/navigation";
import "../landing/landing.css";

// Centium landing v29: the marketing shell (Nav, page, Footer, loading).
// - Colours and type pinned to the handover's literals (#FFFFFF page, #221E1A
//   ink, Manrope, tabular figures), never theme tokens: AppContext puts the
//   app's theme and accessibility classes on <html> for these routes too.
// - JetBrains Mono (the handover's mono, 400/500) is loaded only while a
//   marketing page is mounted, never for the web app.
// - html gets overscroll-behavior-y:none (mkt-no-overscroll, kept) and the
//   prototype's overflow-x:clip (centium-site-html).
// - Scrolling on navigation, as the prototype: a new page starts at the top
//   (or at its #anchor, minus the 72px navbar, or the anchor's own larger
//   scroll-margin-top); back/forward restores the
//   position saved in history.state.cy; a reload restores the position saved
//   on pagehide (centium-landing:y). Only hashes that name an element count
//   as anchors, so an auth return (#error=..., handled by
//   ReturnedAuthErrorRoute) is never scrolled to.
// - Moving to another marketing page fades this one out (.32 s) and the new
//   one in (.35 s): PageFadeContext, used by navigation.ts.

const MONO_HREF = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap";

const useMarketingDocument = () => {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("mkt-no-overscroll", "centium-site-html");
    let link = document.head.querySelector<HTMLLinkElement>("link[data-centium-mono]");
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = MONO_HREF;
      link.setAttribute("data-centium-mono", "");
      document.head.appendChild(link);
    }
    const prevRestoration = "scrollRestoration" in history ? history.scrollRestoration : null;
    if (prevRestoration) history.scrollRestoration = "manual";
    return () => {
      html.classList.remove("mkt-no-overscroll", "centium-site-html");
      document.head.querySelector("link[data-centium-mono]")?.remove();
      if (prevRestoration) history.scrollRestoration = prevRestoration;
    };
  }, []);
};

let firstMarketingRender = true;

const ScrollOnNavigate: React.FC = () => {
  const location = useLocation();
  const navType = useNavigationType();

  useLayoutEffect(() => {
    const entry = loaderEntryFor(location.key, location.pathname, location.hash);
    const first = firstMarketingRender;
    firstMarketingRender = false;
    const id = anchorHash(location.hash);
    const anchor = id ? anchorTarget(id) : null;
    if (anchor) {
      window.scrollTo(0, anchor.getBoundingClientRect().top + window.scrollY - anchorOffset(anchor));
      return;
    }
    if (first && entry.at != null) {
      window.scrollTo(0, entry.at);
      return;
    }
    const cy = (window.history.state as { cy?: number } | null)?.cy;
    const back = first
      ? (performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined)?.type === "back_forward"
      : navType === "POP";
    if (back && typeof cy === "number") {
      window.scrollTo(0, cy);
      return;
    }
    // Only a change of page (or the first render) goes to the top; a same-page
    // hash change without a target leaves the scroll alone.
    if (first || !location.hash || navType !== "PUSH") window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // The prototype's keepY: where this page was, for a reload.
  useEffect(() => {
    const save = () => keepY(pageOf(window.location.pathname));
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    return () => {
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", save);
    };
  }, []);

  return null;
};

export const MarketingLayout: React.FC = () => {
  useMarketingDocument();
  const { pathname } = useLocation();
  const [pageOp, setPageOp] = useState(1);
  const fadeTimer = useRef(0);

  const fadeOut = useCallback(() => setPageOp(0), []);
  const fade = useMemo(() => ({ fadeOut }), [fadeOut]);

  // The new page fades in once it has rendered (prototype pageOp -> 1).
  useEffect(() => {
    fadeTimer.current = window.requestAnimationFrame(() => setPageOp(1));
    return () => window.cancelAnimationFrame(fadeTimer.current);
  }, [pathname]);
  // bfcache: a page restored from the back/forward cache comes back visible.
  useEffect(() => {
    const ps = (e: PageTransitionEvent) => {
      if (e.persisted) setPageOp(1);
    };
    window.addEventListener("pageshow", ps);
    return () => window.removeEventListener("pageshow", ps);
  }, []);

  return (
    <PageFadeContext.Provider value={fade}>
      <div
        className="centium-site"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "#FFFFFF",
          color: "#221E1A",
          fontFamily: '"Manrope","IBM Plex Sans Arabic",ui-sans-serif,system-ui,sans-serif',
          lineHeight: 1.5,
          WebkitFontSmoothing: "antialiased",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <ScrollOnNavigate />
        <div id="page" style={{ opacity: pageOp, transition: "opacity .35s cubic-bezier(.22,1,.36,1)", flex: 1, display: "flex", flexDirection: "column" }}>
          <Nav />
          <main style={{ flex: 1 }}>
            <Outlet />
          </main>
          <Footer />
        </div>
        <LoadingHost />
      </div>
    </PageFadeContext.Provider>
  );
};
