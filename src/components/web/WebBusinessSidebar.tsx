import React from "react";
import { useLocation } from "react-router-dom";
import { Building2, CalendarDays, MessageCircle, Settings, UserPlus, Users } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useUnread } from "../../context/UnreadContext";
import { useBusinessNavKind } from "../navigation/useBusinessNavKind";
import { businessTabs, isBusinessTabActive, type BusinessGlyphKey, type BusinessNavKind } from "../navigation/navItems";
import {
  AnalyticsNavGlyph,
  FrontDeskNavGlyph,
  MarketplaceNavGlyph,
  OperationsNavGlyph,
  OrdersNavGlyph,
  ProductsNavGlyph,
  ScheduleNavGlyph,
  type BusinessNavGlyphProps,
} from "../icons/BusinessNavGlyphs";
import { SidebarFrame, SidebarLogo, SidebarRow, SidebarRule, SidebarScrollList } from "./SidebarParts";
import { businessShortcutActive, navInk, type BusinessShortcut as Shortcut } from "./webNav";
import { DashboardGlyph, MoreDotsGlyph } from "./webGlyphs";


const GLYPHS: Partial<Record<BusinessGlyphKey, React.FC<BusinessNavGlyphProps>>> = {
  analytics: AnalyticsNavGlyph,
  operations: OperationsNavGlyph,
  schedule: ScheduleNavGlyph,
  "front-desk": FrontDeskNavGlyph,
  orders: OrdersNavGlyph,
  appointments: ScheduleNavGlyph,
  marketplace: MarketplaceNavGlyph,
  products: ProductsNavGlyph,
};

const TEAM_LABEL: Record<BusinessNavKind, string> = {
  classes: "Instructors",
  gym: "Team",
  store: "Staff",
  appointments: "Staff",
  unknown: "Team",
};

/**
 * The Business UI's web sidebar (WB Sidebar, dash 2): Dashboard · Analytics ·
 * slot 2 (Front desk, Schedule, Orders or Appointments) · slot 4 (Marketplace
 * or Products), a rule, Messages · Calendar · Members · Team (Instructors,
 * Staff) · Settings · More, and Business Profile pinned. Rows 44 (the lower
 * rows 40 at the rail), rule 16 above and below.
 */
export const WebBusinessSidebar: React.FC<{ rail: boolean; width: number }> = ({ rail, width }) => {
  const { t } = useApp();
  const { pathname } = useLocation();
  const unread = useUnread();
  const kind = useBusinessNavKind();
  const shortcut = businessShortcutActive(pathname);
  // The bar's four tabs without More (it closes the list), Dashboard first.
  const tabs = businessTabs(kind).filter((tab) => tab.glyph !== "more");
  const ordered = [tabs.find((tab) => tab.glyph === "mark")!, ...tabs.filter((tab) => tab.glyph !== "mark")];
  const lowH = rail ? 40 : 44;

  const row = (key: Shortcut, to: string, label: string, Icon: typeof Users, badge?: number) => {
    const on = shortcut === key;
    return (
      <SidebarRow
        key={key}
        to={to}
        label={t(label)}
        active={on}
        rail={rail}
        height={lowH}
        padX={15}
        box={26}
        icon={<Icon size={24} strokeWidth={1.6} style={{ color: navInk(on) }} aria-hidden />}
        badge={badge}
      />
    );
  };

  return (
    <SidebarFrame width={width} label={t("Business tabs")}>
      <SidebarLogo rail={rail} />
      <nav aria-label={t("Business tabs")} className="flex flex-col shrink-0" style={{ gap: 2 }}>
        {ordered.map((tab) => {
          const on = !shortcut && isBusinessTabActive(tab, pathname);
          const Glyph = GLYPHS[tab.glyph];
          return (
            <SidebarRow
              key={tab.to + tab.label}
              to={tab.to}
              label={t(tab.label)}
              active={on}
              rail={rail}
              height={44}
              padX={14}
              box={28}
              icon={tab.glyph === "mark" || !Glyph ? <DashboardGlyph active={on} color={navInk(on)} /> : <Glyph active={on} size={24} color={navInk(on)} />}
            />
          );
        })}
      </nav>
      <SidebarRule margin="16px 0" />
      <SidebarScrollList label={t("More")} rail={rail}>
        {row("messages", "/app/messages", "Messages", MessageCircle, unread.total)}
        {row("calendar", "/app/business/calendar", "Calendar", CalendarDays)}
        {row("members", "/app/business/members", "Members", UserPlus)}
        {row("team", "/app/business/employees", TEAM_LABEL[kind], Users)}
        {row("settings", "/app/settings", "Settings", Settings)}
        <SidebarRow
          to="/app/more"
          label={t("More")}
          active={shortcut === "more"}
          rail={rail}
          height={lowH}
          padX={15}
          box={26}
          icon={<MoreDotsGlyph active={shortcut === "more"} color={navInk(shortcut === "more")} />}
        />
      </SidebarScrollList>
      <nav aria-label={t("Account")} className="flex flex-col shrink-0" style={{ gap: 2, marginTop: "auto", paddingTop: 24 }}>
        {row("profile", "/app/business/profile", "Business Profile", Building2)}
      </nav>
    </SidebarFrame>
  );
};
