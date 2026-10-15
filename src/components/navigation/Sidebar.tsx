import React from "react";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import {
  businessTabs,
  businessSidebarShortcuts,
  isBusinessTabActive,
  proTabs,
  isProTabActive,
  proSidebarShortcuts,
  type BusinessGlyphKey,
  type ProGlyphKey,
} from "./navItems";
import { useProSubtype } from "../../hooks/useProSubtype";
import { CalendarNavGlyph, ClientsNavGlyph } from "../pro/ProNavGlyphs";
import { FoodNavGlyph, WorkoutNavGlyph } from "../icons/ClientNavGlyphs";
import { useBusinessNavKind } from "./useBusinessNavKind";
import { SectionLabel } from "../ui/SectionLabel";
import {
  AnalyticsNavGlyph,
  FrontDeskNavGlyph,
  MarketplaceNavGlyph,
  MoreNavGlyph,
  OperationsNavGlyph,
  OrdersNavGlyph,
  ProductsNavGlyph,
  ScheduleNavGlyph,
  type BusinessNavGlyphProps,
} from "../icons/BusinessNavGlyphs";
import { useApp } from "../../context/AppContext";
import { Flame, HeartPulse } from "lucide-react";
import { useUnread } from "../../context/UnreadContext";
import { UnreadBadge } from "../messages/UnreadBadge";
import { PlanLine } from "./PlanLine";
import { currentDayStreak, dayStreakLabel } from "../../services/streaks/dayStreak";
import { forumAccess } from "../../services/forum/rules";
import { CentiumMark } from "../icons/CentiumMark";

const NAV_ACCENT = "rgb(var(--c-team-nav-accent))";
const NAV_IDLE = "rgb(var(--c-nav-idle))";

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(base + "/");

const SIDEBAR_GLYPHS: Record<Exclude<BusinessGlyphKey, "mark">, React.FC<BusinessNavGlyphProps>> = {
  analytics: AnalyticsNavGlyph,
  operations: OperationsNavGlyph,
  schedule: ScheduleNavGlyph,
  "front-desk": FrontDeskNavGlyph,
  orders: OrdersNavGlyph,
  appointments: ScheduleNavGlyph,
  marketplace: MarketplaceNavGlyph,
  products: ProductsNavGlyph,
  more: MoreNavGlyph,
};

/**
 * OURS-NAV-desktop-sidebar row 3: the navbar SVGs at 22 (two-tone when
 * active, idle #9A94B3); Dashboard is the mark at 19 in the same 22 box.
 */
const BusinessSidebarGlyph: React.FC<{ glyph: BusinessGlyphKey; active: boolean }> = ({ glyph, active }) => {
  if (glyph === "mark") {
    return (
      <span className="w-[22px] h-[22px] flex items-center justify-center shrink-0">
        <CentiumMark height={19} className={active ? undefined : "opacity-90"} />
      </span>
    );
  }
  const Glyph = SIDEBAR_GLYPHS[glyph];
  return <Glyph active={active} size={22} color={active ? NAV_ACCENT : NAV_IDLE} />;
};

/**
 * Release 3 · the professional rows' glyphs, the bar's own (NV1) at 22 in the
 * same inks; Home is the mark at 19 in the 22 box, as Dashboard is.
 */
const ProSidebarGlyph: React.FC<{ glyph: ProGlyphKey; active: boolean }> = ({ glyph, active }) => {
  const color = active ? NAV_ACCENT : NAV_IDLE;
  switch (glyph) {
    case "mark":
      return <BusinessSidebarGlyph glyph="mark" active={active} />;
    case "clients":
      return <ClientsNavGlyph active={active} size={22} color={color} />;
    case "calendar":
      return <CalendarNavGlyph active={active} size={22} color={color} />;
    case "workout":
      return <WorkoutNavGlyph active={active} size={22} color={color} />;
    case "food":
      return <FoodNavGlyph active={active} size={22} color={color} />;
    case "heart":
      return <HeartPulse size={22} strokeWidth={active ? 2.2 : 1.6} style={{ color }} aria-hidden />;
    case "more":
      return <MoreNavGlyph active={active} size={22} color={color} />;
  }
};

/**
 * One sidebar row. Primary: h44 r16 pad 0 14 gap 12, label 14/700, idle ink
 * #5B5349; active fill #F0EDF9 (dark #303141), label #7D6BB5 (dark #C3B3FB)
 * (primary-pale / primary-dark, so other themes follow). Compact (the More
 * shortcuts, row 5): h40, label 13.5/600.
 */
const SidebarRow: React.FC<{
  to: string;
  active: boolean;
  label: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  compact?: boolean;
}> = ({ to, active, label, icon, badge, compact }) => (
  <Link
    to={to}
    aria-current={active ? "page" : undefined}
    className={clsx(
      "flex items-center gap-3 px-3.5 rounded-2xl transition-colors duration-150 shrink-0",
      compact ? "h-10 text-[13.5px] font-semibold" : "h-11 text-sm font-bold",
      active ? "bg-primary-pale text-primary-dark" : "text-charcoal-soft hover:bg-cream-soft"
    )}
  >
    {icon}
    <span className="flex-1 min-w-0 truncate">{label}</span>
    {badge}
  </Link>
);

export const Sidebar: React.FC = () => {
  const { user, t, today, foodLog, waterByDate, workoutLog, journalEntries } = useApp();
  const unread = useUnread();
  const isBusiness = user.accountType === "business";
  // The SAME walk the Home board runs, not a second opinion about it — see
  // services/streaks/dayStreak.
  const dayStreak = currentDayStreak(
    { foodLog, waterByDate, workoutLog, journalEntries },
    today
  );
  const { pathname } = useLocation();
  const businessKind = useBusinessNavKind();
  const { lane } = useProSubtype();
  // The forum is for adults (Database ATX55): no entry for anyone the app
  // cannot confirm is 18 or over.
  const forumAllowed = forumAccess(user.dateOfBirth) === "adult";

  // OURS-NAV-desktop-sidebar row 5: the More shortcuts. Employees and
  // Classes fold into the Operations slot and Team (both stay reachable).
  // Release 3: professionals get the same shape, their five tabs and the
  // More rows (proSidebarShortcuts).
  const shortcuts = isBusiness
    ? businessSidebarShortcuts(businessKind)
    : proSidebarShortcuts().filter((s) => forumAllowed || s.to !== "/app/forum");
  const shortcutActive = shortcuts.find((s) => under(pathname, s.to))?.to;
  // The lit tab or shortcut row: one at a time, a shortcut's own page first.
  const tabs = isBusiness
    ? [...businessTabs(businessKind)].sort((a, b) => Number(b.glyph === "mark") - Number(a.glyph === "mark")).map((tab) => ({
        key: tab.label,
        to: tab.to,
        label: tab.label,
        active: !shortcutActive && isBusinessTabActive(tab, pathname),
        icon: (on: boolean) => <BusinessSidebarGlyph glyph={tab.glyph} active={on} />,
      }))
    : lane
      ? [...proTabs(lane)].sort((a, b) => Number(b.glyph === "mark") - Number(a.glyph === "mark")).map((tab) => ({
          key: tab.label,
          to: tab.to,
          label: tab.label,
          active: !shortcutActive && isProTabActive(tab, pathname),
          icon: (on: boolean) => <ProSidebarGlyph glyph={tab.glyph} active={on} />,
        }))
      : [];

  return (
    // OURS-NAV-desktop-sidebar row 1: w256, #FFFFFF (dark #121317), right
    // hairline charcoal 6%, pad 24 16.
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-[100dvh] sticky top-0 border-r border-charcoal/[0.06] bg-white dark:bg-cream px-4 py-6 overflow-y-auto">
      {/* v6 (TK 4.1, X-24): the one vector mark in the theme's brand pair,
          framed as the PNG it replaces (30 tall, centium-mark.png's canvas).
          Row 2: + Centium 20/700, mb 32. */}
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <span className="w-[30px] h-[30px] flex items-center justify-center shrink-0">
          <CentiumMark height={30} framing="png" />
        </span>
        <span className="font-display text-xl font-bold text-charcoal tracking-tight">
          Centium
        </span>
      </div>

      <nav aria-label={t(isBusiness ? "Business tabs" : "Professional tabs")} className="flex flex-col gap-1 flex-1">
        {/* Row 3: the bar's five destinations, Dashboard (Home) first. */}
        {tabs.map((tab) => (
          <SidebarRow key={tab.key} to={tab.to} active={tab.active} label={t(tab.label)} icon={tab.icon(tab.active)} />
        ))}
        {/* Row 4: section label More, 11/600 0.14em uppercase #8C8378
            with the 1.5px primary rule, mt 20 mb 8. */}
        <SectionLabel as="p" className="mt-5 mb-2 mx-3.5">
          <span style={{ color: "rgb(var(--c-charcoal-faint))" }}>{t("More")}</span>
        </SectionLabel>
        {shortcuts.map((s) => {
          const Icon = s.icon;
          const active = shortcutActive === s.to;
          return (
            <SidebarRow
              key={s.to}
              to={s.to}
              active={active}
              label={t(s.label)}
              compact
              icon={<Icon size={18} strokeWidth={1.75} style={{ color: "rgb(var(--c-primary-accent))" }} />}
              badge={s.unread ? <UnreadBadge count={unread.total} /> : null}
            />
          );
        })}
      </nav>

      {/* CUSTOMERS ONLY, not "everyone who isn't a business". The four
          sub-goals a streak is made of — food logged, water logged, a workout
          completed, a journal entry written — are logged from Home/Food/
          Workout/Mind, and navItems documents that professionals have none of
          those tabs. A professional's streak can therefore only ever be zero,
          and "Start a streak today" would be an invitation to screens their
          account does not have. */}
      {user.accountType === "customer" && (
        <div className="rounded-3xl bg-primary-pale p-4 mt-4">
          <div className="flex items-center gap-2 text-primary-dark font-semibold text-sm mb-1">
            <Flame size={16} className="text-teal" />
            {dayStreakLabel(dayStreak)}
          </div>
          {/* "Keep logging to unlock rewards 🎁" PROMISED A REWARD, and there
              is not one to unlock. Logging does earn something real now — the
              consistency ladder runs 3 / 7 / 14 / 30 / 60 / 100 / 365 days and
              credits points at every rung — so the line names that instead. */}
          <p className="text-xs text-primary-dark/70">
            {dayStreak > 0
              ? "Keep logging to earn achievements 🏆"
              : "Log two of food, water, a workout or a journal entry."}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2.5 mt-4 px-2">
        <div className="w-9 h-9 rounded-full bg-teal-pale flex items-center justify-center text-sm font-bold text-charcoal-soft dark:text-teal-deep-text">
          {user.firstName.charAt(0)}
        </div>
        <div className="text-sm">
          <p className="font-semibold text-charcoal leading-tight">{user.firstName}</p>
          <PlanLine />
        </div>
      </div>
    </aside>
  );
};
