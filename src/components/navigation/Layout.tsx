import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { OfflineBanner } from "./OfflineBanner";
import { PendingDeletionBanner } from "./PendingDeletionBanner";
import { ConsentReviewBanner } from "../professionals/ConsentReviewBanner";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { UnreadProvider } from "../../context/UnreadContext";
import { CallProvider } from "../../context/CallContext";
import { CallSurface } from "../calls/CallSurface";
import { AchievementUnlockToast } from "../mind/AchievementUnlockToast";
import { MessagePopupToast } from "../messages/MessagePopupToast";
import { PromotionUsedHost } from "../promotions/PromotionUsedHost";
import { ActiveWorkoutBar } from "../workout/ActiveWorkoutBar";
import { useApp } from "../../context/AppContext";

/**
 * Handover 2026-09-29, 01 GLOBAL (f): the on-screen keyboard. Publishes the
 * height it covers as --kb-inset (read by BottomSheet so its pinned footer
 * rides above the keyboard), and scrolls a newly focused field into view
 * once the keyboard has opened.
 */
function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--kb-inset", `${Math.round(inset)}px`);
    };
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el.isContentEditable)) return;
      // After the keyboard's own open animation, so the visual viewport has
      // already shrunk to the space the field must fit in.
      window.setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    document.addEventListener("focusin", onFocus);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.removeEventListener("focusin", onFocus);
      root.style.setProperty("--kb-inset", "0px");
    };
  }, []);
}

/**
 * --app-gutter from the real content width. The CSS default is based on
 * 100vw, which on a desktop browser includes the page scrollbar and so puts
 * fixed UI a few pixels off the column; clientWidth excludes it.
 */
function useAppGutter() {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const w = root.clientWidth;
      root.style.setProperty("--app-gutter", `${Math.max(0, (w - Math.min(w, 430)) / 2)}px`);
    };
    update();
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(document.body);
    return () => {
      window.removeEventListener("resize", update);
      ro.disconnect();
      root.style.removeProperty("--app-gutter");
    };
  }, []);
}

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
  useKeyboardInset();
  useAppGutter();

  // Handover 2026-09-29, 01 GLOBAL: the client app is a single phone-width
  // column — at most 430px, centred, no desktop sidebar — on every screen
  // size. Professional and Business accounts keep the desktop sidebar, with
  // the same 430 column beside it.
  const { user } = useApp();
  const isClient = user.accountType !== "professional" && user.accountType !== "business";

  return (
    // Wrapping the shell rather than the app: this is the smallest scope that
    // covers both navs AND every route, which is what a badge visible from the
    // dashboard requires. Outside RequireOnboarded there is no session to count
    // for anyway.
    <UnreadProvider>
      {/* Nested inside rather than beside: a call belongs to the same
          authenticated shell UnreadProvider already scopes itself to, and
          nesting leaves one provider order to reason about rather than two
          independent mounts. It holds call state only; nothing is rendered
          for it yet. */}
      <CallProvider>
      <div className="min-h-[100dvh] bg-cream flex">
        {!isClient && <Sidebar />}
        <div className="flex-1 min-w-0">
          <main
            className={
              isClient
                ? // Notch / Dynamic Island above, home indicator plus the
                  // floating nav below, plus the WO17 bar while it shows
                  // (--active-bar is its height + gap, else 0).
                  "max-w-[430px] mx-auto px-4 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+112px+var(--active-bar,0px))]"
                : // OURS-NAV-desktop-sidebar row 7: business pages keep the
                  // 430 phone column (the frames are phone-only), centred
                  // beside the sidebar at lg. Release 3 (FINAL_PLAN, Karim's
                  // answer 5): professionals use the same column.
                  "max-w-[430px] mx-auto px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+112px)] lg:pb-12"
            }
          >
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
        {isClient && <ActiveWorkoutBar />}
      </div>
      {/* Outside the layout div and portaled from there: a call must cover the
          navs too, and must not be clipped by any transformed ancestor. */}
      <CallSurface />
      {/* HERE RATHER THAN IN Mind, because an achievement is earned where the
          thing that earned it happened. Finishing a workout, saving a food log
          or writing a journal entry can all unlock one, and the celebration
          belongs on that screen rather than waiting for somebody to next open
          the Mind tab. Renders nothing while the queue is empty. */}
      <AchievementUnlockToast />
      {/* AX: a new chat or support message while you're elsewhere in the app. */}
      <MessagePopupToast />
      {/* The optional "Promotion used" picker after a payment is recorded (business consoles: owners and staff). */}
      {!isClient && <PromotionUsedHost />}
      </CallProvider>
    </UnreadProvider>
  );
};
