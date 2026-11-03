import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Brain, CalendarDays, MessageCircle, Settings, User as UserIcon, Users } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useUnread } from "../../context/UnreadContext";
import { forumAccess } from "../../services/forum/rules";
import { FoodNavGlyph, WorkoutNavGlyph } from "../icons/ClientNavGlyphs";
import { CommunityLeafIcon, ExploreLeafIcon, PremiumLeafIcon, ReferralLeafIcon } from "../icons/MoreLeafIcons";
import { ReferralPopup } from "../profile/ReferralPopup";
import { SidebarFrame, SidebarLogo, SidebarRow, SidebarRule, SidebarScrollList } from "./SidebarParts";
import { clientSidebarActive, navInk, type ClientNavKey as Key } from "./webNav";
import { HealthGlyph, HomeGlyph, MoreDotsGlyph } from "./webGlyphs";

/**
 * The Client UI's web sidebar (Web Sidebar v7): Home · Food · Workout ·
 * Health, a rule, Mind · Professionals · Community · Explore · Calendar ·
 * Messages · Referral · Centium Premium · Settings · More, and Profile pinned
 * at the bottom. Rows 40, rule 12 above and below, icons 24. Community is left
 * out for anyone the app cannot confirm is 18 or over, as on mobile.
 */
export const WebClientSidebar: React.FC<{ rail: boolean; width: number }> = ({ rail, width }) => {
  const { t, user } = useApp();
  const { pathname } = useLocation();
  const unread = useUnread();
  const [referralOpen, setReferralOpen] = useState(false);
  const active = clientSidebarActive(pathname);
  const forumAllowed = forumAccess(user.dateOfBirth) === "adult";

  const main = (key: Key, to: string, label: string, glyph: (on: boolean) => React.ReactNode) => {
    const on = active === key;
    return <SidebarRow key={key} to={to} label={t(label)} active={on} rail={rail} height={40} padX={14} box={28} icon={glyph(on)} tightLabel />;
  };
  const lucide = (I: typeof Users) => (on: boolean) => <I size={24} strokeWidth={1.6} style={{ color: navInk(on) }} aria-hidden />;
  const leaf = (I: typeof CommunityLeafIcon) => (on: boolean) => <I size={24} style={{ color: navInk(on) }} />;
  const item = (key: Key, label: string, glyph: (on: boolean) => React.ReactNode, to?: string, badge?: number) => {
    const on = active === key;
    return (
      <SidebarRow
        key={key}
        to={to}
        onClick={to ? undefined : () => setReferralOpen(true)}
        label={t(label)}
        active={on}
        rail={rail}
        height={40}
        padX={15}
        box={26}
        icon={glyph(on)}
        badge={badge}
      />
    );
  };

  return (
    <SidebarFrame width={width} label={t("Main navigation")}>
      <SidebarLogo rail={rail} />
      <nav aria-label={t("Main navigation")} className="flex flex-col shrink-0" style={{ gap: 2 }}>
        {main("home", "/app", "Home", (on) => <HomeGlyph active={on} color={navInk(on)} />)}
        {main("food", "/app/food", "Food", (on) => <FoodNavGlyph active={on} size={24} color={navInk(on)} />)}
        {main("workout", "/app/workout", "Workout", (on) => <WorkoutNavGlyph active={on} size={24} color={navInk(on)} />)}
        {main("health", "/app/health", "Health", (on) => <HealthGlyph active={on} color={navInk(on)} />)}
      </nav>
      <SidebarRule margin="12px 0" />
      <SidebarScrollList label={t("Explore and connect")} rail={rail}>
        {item("mind", "Mind", lucide(Brain), "/app/mind")}
        {item("professionals", "Professionals", lucide(Users), "/app/professionals")}
        {forumAllowed && item("community", "Community", leaf(CommunityLeafIcon), "/app/forum")}
        {item("explore", "Explore", leaf(ExploreLeafIcon), "/app/marketplace")}
        {item("calendar", "Calendar", lucide(CalendarDays), "/app/calendar")}
        {item("messages", "Messages", lucide(MessageCircle), "/app/messages", unread.total)}
        {item("referral", "Referral", leaf(ReferralLeafIcon))}
        {item("premium", "Centium Premium", leaf(PremiumLeafIcon), "/app/subscription")}
        {item("settings", "Settings", lucide(Settings), "/app/settings")}
        {item("more", "More", (on) => <MoreDotsGlyph active={on} color={navInk(on)} />, "/app/more")}
      </SidebarScrollList>
      <nav aria-label={t("Account")} className="flex flex-col shrink-0" style={{ gap: 2, marginTop: "auto", paddingTop: 12 }}>
        {item("profile", "Profile", lucide(UserIcon), "/app/profile")}
      </nav>
      <ReferralPopup open={referralOpen} onClose={() => setReferralOpen(false)} />
    </SidebarFrame>
  );
};
