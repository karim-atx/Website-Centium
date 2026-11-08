import React from "react";
import { useLocation } from "react-router-dom";
import { Building2, MessageCircle, MessageSquare, Settings, Store, TrendingUp, User as UserIcon } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useUnread } from "../../context/UnreadContext";
import { useProSubtype } from "../../hooks/useProSubtype";
import { forumAccess } from "../../services/forum/rules";
import { FoodNavGlyph, WorkoutNavGlyph } from "../icons/ClientNavGlyphs";
import { ClientsNavGlyph, CalendarNavGlyph } from "../pro/ProNavGlyphs";
import { PRO_ROUTES, SLOT4, type ProLane } from "../pro/subtypeLanes";
import { SidebarFrame, SidebarLogo, SidebarRow, SidebarRule, SidebarScrollList } from "./SidebarParts";
import { navInk, proSidebarActive, type ProNavKey as Key } from "./webNav";
import { HealthGlyph, HomeGlyph, MoreDotsGlyph } from "./webGlyphs";

/**
 * The Professional UI's web sidebar (WP Sidebar, handover section 4): Home ·
 * Clients · Calendar · slot 4 by lane (Library, Meal plans or Insights), a
 * rule, the MORE caps label, Messages (unread) · Explore · Community ·
 * Practice insights · Businesses · Settings · More, and Profile pinned at the
 * bottom. Rows 44 (40 in the 80 rail, where the labels are hover titles),
 * icons 24, active #8F68F6 800, idle #9A94B3 600. Search is left out until
 * Global search exists (Karim's decision on item 15). Explore opens the
 * Professional Marketplace, as More › Explore does in the app (7.2).
 * Community is left out for anyone the app cannot confirm is 18 or over, as
 * on mobile.
 */
export const WebProSidebar: React.FC<{ rail: boolean; width: number }> = ({ rail, width }) => {
  const { t, user } = useApp();
  const { pathname } = useLocation();
  const unread = useUnread();
  const { lane } = useProSubtype();
  const active = proSidebarActive(pathname);
  const forumAllowed = forumAccess(user.dateOfBirth) === "adult";
  const slot = SLOT4[(lane ?? "full_coaching") as ProLane];

  const primary = (key: Key, to: string, label: string, glyph: (on: boolean) => React.ReactNode) => {
    const on = active === key;
    return <SidebarRow key={key} to={to} label={label} active={on} rail={rail} height={44} padX={14} box={28} icon={glyph(on)} />;
  };
  const lucide = (I: typeof Settings) => (on: boolean) => <I size={24} strokeWidth={1.6} style={{ color: navInk(on) }} aria-hidden />;
  const item = (key: Key, to: string, label: string, glyph: (on: boolean) => React.ReactNode, badge?: number) => {
    const on = active === key;
    return <SidebarRow key={key} to={to} label={label} active={on} rail={rail} height={rail ? 40 : 44} padX={15} box={26} icon={glyph(on)} badge={badge} />;
  };
  const slotGlyph = (on: boolean) => {
    const color = navInk(on);
    if (slot.glyph === "food") return <FoodNavGlyph active={on} size={24} color={color} />;
    if (slot.glyph === "heart") return <HealthGlyph active={on} color={color} />;
    return <WorkoutNavGlyph active={on} size={24} color={color} />;
  };

  return (
    <SidebarFrame width={width} label={t("Professional tabs")}>
      <SidebarLogo rail={rail} />
      <nav aria-label={t("Professional tabs")} className="flex flex-col shrink-0" style={{ gap: 2 }}>
        {primary("home", PRO_ROUTES.home, t("Home"), (on) => <HomeGlyph active={on} color={navInk(on)} />)}
        {primary("clients", PRO_ROUTES.clients, t("Clients"), (on) => <ClientsNavGlyph active={on} size={24} color={navInk(on)} />)}
        {primary("calendar", PRO_ROUTES.calendar, t("Calendar"), (on) => <CalendarNavGlyph active={on} size={24} color={navInk(on)} />)}
        {primary("slot4", slot.to, t(slot.label), slotGlyph)}
      </nav>
      <SidebarRule margin="16px 0 12px" />
      {!rail && (
        <p
          className="shrink-0 uppercase rtl:tracking-normal"
          style={{ margin: "0 0 6px", padding: "0 15px", fontSize: 12, lineHeight: "16px", fontWeight: 700, letterSpacing: ".08em", color: "#71685E" }}
        >
          {t("More")}
        </p>
      )}
      <SidebarScrollList label={t("More")} rail={rail}>
        {item("messages", "/app/messages", t("Messages"), lucide(MessageCircle), unread.total)}
        {item("explore", "/app/pro/marketplace", t("Explore"), lucide(Store))}
        {forumAllowed && item("community", "/app/forum", t("Community"), lucide(MessageSquare))}
        {item("insights", `${PRO_ROUTES.more}/practice-insights`, t("Practice insights"), lucide(TrendingUp))}
        {item("businesses", `${PRO_ROUTES.more}/businesses`, t("Businesses"), lucide(Building2))}
        {item("settings", "/app/settings", t("Settings"), lucide(Settings))}
        {item("more", PRO_ROUTES.more, t("More"), (on) => <MoreDotsGlyph active={on} color={navInk(on)} />)}
      </SidebarScrollList>
      <nav aria-label={t("Account")} className="flex flex-col shrink-0" style={{ gap: 2, marginTop: "auto", paddingTop: 24 }}>
        {item("profile", "/app/profile", t("Profile"), lucide(UserIcon))}
      </nav>
    </SidebarFrame>
  );
};
