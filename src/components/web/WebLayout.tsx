import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { OfflineBanner } from "../navigation/OfflineBanner";
import { ErrorBoundary } from "../navigation/ErrorBoundary";
import { OutboxStatus } from "../outbox/Outbox";
import { PendingDeletionBanner } from "../navigation/PendingDeletionBanner";
import { AccountStandingNotice } from "../navigation/AccountStandingNotice";
import { ConsentReviewBanner } from "../professionals/ConsentReviewBanner";
import { UnreadProvider } from "../../context/UnreadContext";
import { CallProvider } from "../../context/CallContext";
import { CallSurface } from "../calls/CallSurface";
import { AchievementUnlockToast } from "../mind/AchievementUnlockToast";
import { MessagePopupToast } from "../messages/MessagePopupToast";
import { PromotionUsedHost } from "../promotions/PromotionUsedHost";
import { ActiveWorkoutBar } from "../workout/ActiveWorkoutBar";
import { PremiumAskHost } from "../premium/PremiumAskHost";
import { useApp } from "../../context/AppContext";
import { useWebLayout } from "./useWebLayout";
import { WebClientSidebar } from "./WebClientSidebar";
import { WebBusinessSidebar } from "./WebBusinessSidebar";
import { WebProSidebar } from "./WebProSidebar";
import { WebSecondaryHost } from "./WebSecondaryLayout";
import { secondaryLayoutFor } from "./webNav";
import { webPageFor } from "./webPages";

/** The app-wide notices (offline, outbox, pending deletion, consent review), above every page as on mobile. */
const Banners: React.FC = () => (
  <>
    <OfflineBanner />
    <OutboxStatus />
    <PendingDeletionBanner />
    <AccountStandingNotice />
    <ConsentReviewBanner />
  </>
);

/**
 * A page that has no web layout yet (no web design, or "Needs a web design;
 * wait for v2"): its mobile screen, untouched, in the 430 column the app
 * already draws on wide screens. The column is centred on the window, as the
 * mobile layout centres it, so the fixed parts of a mobile screen (pinned
 * buttons, toasts, floating buttons), which place themselves from the window's
 * --app-gutter, stay on the column. The sidebar never reaches it (the column
 * starts at 297px at 1024 and 505px at 1440).
 */
export const MobileFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main data-web-frame="mobile" className="max-w-[430px] mx-auto px-4 pt-6 pb-12">
    {children}
  </main>
);

/**
 * Website viewport v1 (handover section 4): the shell at 1024px and wider for
 * client and business accounts. The sidebar (256, or the 80 rail below 1280)
 * replaces the bottom navbar; pages with a web layout fill the content area
 * beside it, More and Settings get their secondary column, and every other
 * page shows its mobile screen in the centred column. The providers and the
 * app-wide hosts are the mobile Layout's own.
 */
export const WebLayout: React.FC = () => {
  const { user } = useApp();
  const { pathname } = useLocation();
  const { rail, sidebarW } = useWebLayout();
  const isBusiness = user.accountType === "business";
  const isPro = user.accountType === "professional";
  const secondary = secondaryLayoutFor(pathname, isBusiness, isPro);
  const webPage = !secondary && webPageFor(pathname, isBusiness, isPro);

  const page = (
    <ErrorBoundary resetKey={pathname}>
      <Outlet />
    </ErrorBoundary>
  );

  return (
    <UnreadProvider>
      <CallProvider>
        <div className="min-h-[100dvh] bg-cream" data-web-shell={rail ? "rail" : "full"}>
          {isBusiness ? (
            <WebBusinessSidebar rail={rail} width={sidebarW} />
          ) : isPro ? (
            <WebProSidebar rail={rail} width={sidebarW} />
          ) : (
            <WebClientSidebar rail={rail} width={sidebarW} />
          )}
          {secondary ? (
            <WebSecondaryHost kind={secondary} sidebarW={sidebarW} rail={rail} banners={<Banners />}>
              {page}
            </WebSecondaryHost>
          ) : webPage ? (
            <main data-web-frame="page" style={{ paddingInlineStart: sidebarW }}>
              <div className="max-w-[1600px]" style={{ paddingInline: 32 }}>
                <Banners />
              </div>
              {page}
            </main>
          ) : (
            <MobileFrame>
              <Banners />
              {page}
            </MobileFrame>
          )}
          {!isBusiness && !isPro && <ActiveWorkoutBar />}
        </div>
        <CallSurface />
        <AchievementUnlockToast />
        <MessagePopupToast />
        {(isBusiness || isPro) && <PromotionUsedHost />}
        {!isBusiness && !isPro && <PremiumAskHost />}
      </CallProvider>
    </UnreadProvider>
  );
};
