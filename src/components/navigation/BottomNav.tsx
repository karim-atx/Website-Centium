import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";
import { MoreHorizontal } from "lucide-react";
import {
  primaryNavItems,
  businessTabs,
  isBusinessTabActive,
  proTabs,
  isProTabActive,
  type BusinessNavKind,
  type BusinessGlyphKey,
} from "./navItems";
import { useBusinessNavKind } from "./useBusinessNavKind";
import { useProSubtype } from "../../hooks/useProSubtype";
import type { ProLane } from "../pro/subtypeLanes";
import { CalendarNavGlyph, ClientsNavGlyph } from "../pro/ProNavGlyphs";
import { useApp } from "../../context/AppContext";
import { useUnread } from "../../context/UnreadContext";
import { UnreadDot } from "../messages/UnreadBadge";
import { CentiumMark } from "../icons/CentiumMark";
import { FoodNavGlyph, WorkoutNavGlyph } from "../icons/ClientNavGlyphs";
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

// Navbar inks (X-23): the accent follows the colour theme (#8F68F6 in
// Centium); idle is nav.idle (#9A94B3 light, #8A8698 dark) in normal mode and
// the earlier AA value in High contrast (--c-nav-idle).
const NAV_ACCENT = "rgb(var(--c-team-nav-accent))";
const NAV_IDLE = "rgb(var(--c-nav-idle))";
// NAV-001 O2: Larger text leaves the navbar alone (labels stay 10.5 for the
// fit rule at 360, glyphs stay 24), so the .larger-icons scale is undone.
const NO_ICON_SCALE: React.CSSProperties = { transform: "none" };

// The floating pill shared by the business and professional bars (the
// client bar's own values below, NAV-001 row 2): h58, r999, blur 16,
// 18 above the bottom edge plus the safe area.
const FLOATING_BAR = clsx(
  "fixed z-40 h-[58px] rounded-full bottom-[calc(env(safe-area-inset-bottom)+18px)] backdrop-blur-[16px]",
  "bg-white/[0.72] dark:bg-[#1C1F28]/[0.94]",
  "border border-team-nav-accent/[0.28] dark:border-[rgba(238,239,242,0.08)]",
  "shadow-[0_10px_28px_rgb(var(--c-primary-deep-text)/0.16)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.55)]"
);

/** 10.5 / line 1, 600 idle · 800 active, nowrap; inline so Larger text does not boost it (O2). */
const NavLabel: React.FC<{ active: boolean; children: React.ReactNode }> = ({ active, children }) => (
  <span
    className={clsx("leading-none whitespace-nowrap", active ? "font-extrabold text-nav-label-active" : "font-semibold text-nav-idle")}
    style={{ fontSize: "10.5px" }}
  >
    {children}
  </span>
);

// Wellness Service Appointments has no supplied glyph: the calendar
// (Schedule) is the closest drawn one (OURS).
const BUSINESS_GLYPHS: Record<Exclude<BusinessGlyphKey, "mark">, React.FC<BusinessNavGlyphProps>> = {
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
 * The centre Home disc (NAV-001 rows 5-6): 66 disc overflowing the bar, 2px
 * accent ring when active, 1px accent/0.28 (dark 0.42) otherwise. Shared by
 * the client, business and professional bars; each passes its own mark.
 */
const NavMarkDisc: React.FC<{ active: boolean; children: React.ReactNode }> = ({ active, children }) => (
  <span
    className={clsx(
      "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
      "w-[66px] h-[66px] rounded-full bg-white dark:bg-[#1C1F28] flex items-center justify-center",
      active
        ? "shadow-[0_0_0_2px_rgb(var(--c-team-nav-accent))]"
        : "shadow-[0_0_0_1px_rgb(var(--c-team-nav-accent)/0.28)] dark:shadow-[0_0_0_1px_rgb(var(--c-team-nav-accent)/0.42)]"
    )}
  >
    {children}
  </span>
);

const BusinessBar: React.FC<{ kind: BusinessNavKind; pathname: string; unread: boolean; t: (s: string) => string }> = ({
  kind,
  pathname,
  unread,
  t,
}) => (
  <nav
    data-bottom-nav
    aria-label={t("Business tabs")}
    className={clsx(FLOATING_BAR, "lg:hidden left-[calc(var(--app-gutter)+10px)] right-[calc(var(--app-gutter)+10px)]")}
  >
    {/* padX 0 · 5 equal columns (NAV-001 row 2). */}
    <div className="grid grid-cols-5 items-center h-full">
      {businessTabs(kind).map((tab) => {
        const active = isBusinessTabActive(tab, pathname);
        const label = t(tab.label);
        return (
          <Link
            key={tab.label}
            to={tab.to}
            aria-current={active ? "page" : undefined}
            aria-label={tab.glyph === "mark" ? label : undefined}
            className="tap relative flex items-center justify-center h-full"
          >
            {tab.glyph === "more" && <UnreadDot show={unread} />}
            {tab.glyph === "mark" ? (
              // NAV-001 rows 5-6: the 66 disc; mark 54.
              <NavMarkDisc active={active}>
                <CentiumMark height={54} className={active ? "opacity-100" : "opacity-90"} style={NO_ICON_SCALE} />
              </NavMarkDisc>
            ) : (
              <span className="flex flex-col items-center justify-center gap-[3px]">
                {React.createElement(BUSINESS_GLYPHS[tab.glyph], {
                  active,
                  size: 24,
                  color: active ? NAV_ACCENT : NAV_IDLE,
                  style: NO_ICON_SCALE,
                })}
                <NavLabel active={active}>{label}</NavLabel>
              </span>
            )}
          </Link>
        );
      })}
    </div>
  </nav>
);

// Iteration 6 "Team": Food and Workout use custom glyphs (fork and knife with
// the mark's leaf, a figure lifting a barbell) instead of lucide-react icons.
// v6 (TK 4.4, V6-98): vectors (FoodNavGlyph / WorkoutNavGlyph), filled when
// active and outlined when idle, drawn in the navbar's own inks so every
// theme and High contrast follow (they replace the six icon-* PNGs and
// ThemedMark's TintedGlyph).
const CLIENT_GLYPHS: Record<string, typeof FoodNavGlyph> = {
  "/app/food": FoodNavGlyph,
  "/app/workout": WorkoutNavGlyph,
};

// Design handoff "Health tab active state" (S3 · R2): lucide's HeartPulse
// renders the ECG squiggle as part of the same filled path as the heart
// outline, so `fill="currentColor"` on the active tab filled the ECG line
// too and it disappeared. Fixed the same way Food/Workout solve an
// equivalent problem — a dedicated active-state glyph instead of trying to
// coax the stock icon's fill behavior — but as inline SVG (lucide's own two
// paths, supplied literally by the handoff) since the fix only needs new
// stroke/fill colors per path, not new artwork.
const HEALTH_HEART_PATH =
  "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z";
const HEALTH_ECG_PATH = "M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27";

const HealthTabGlyph: React.FC<{ active: boolean; style?: React.CSSProperties }> = ({ active, style }) => (
  <svg
    style={style}
    width={24}
    height={24}
    viewBox="0 0 24 24"
    className={active ? "text-team-nav-accent" : "text-nav-idle"}
  >
    <path
      d={HEALTH_HEART_PATH}
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Same ECG path, position and stroke weight in both states — only the
        stroke color changes, knocked out white so it reads over the fill. */}
    <path
      d={HEALTH_ECG_PATH}
      fill="none"
      stroke={active ? "#FFFFFF" : "currentColor"}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Release 3 · the professional bar (HANDOVER d "Navbar per subtype", NV1):
 * the client pill exactly (22 in from the column, 58 high, padX 4, five equal
 * columns) with the Centium mark as Home in the centre. Clients, Calendar,
 * Home, slot 4 by lane (Library and Meal plans reuse the client Workout and
 * Food glyphs, Insights the client Health heart), More. Active glyphs fill
 * with the accent and white inner lines; labels 10.5, 800 active / 600 idle.
 */
const ProBar: React.FC<{ lane: ProLane; pathname: string; unread: boolean; t: (s: string) => string }> = ({ lane, pathname, unread, t }) => (
  <nav
    data-bottom-nav
    aria-label={t("Professional tabs")}
    className={clsx(FLOATING_BAR, "lg:hidden left-[calc(var(--app-gutter)+22px)] right-[calc(var(--app-gutter)+22px)]")}
  >
    <div className="grid grid-cols-5 items-center h-full px-1">
      {proTabs(lane).map((tab) => {
        const active = isProTabActive(tab, pathname);
        const label = t(tab.label);
        const color = active ? NAV_ACCENT : NAV_IDLE;
        let glyph: React.ReactNode = null;
        if (tab.glyph === "clients") glyph = <ClientsNavGlyph active={active} color={color} style={NO_ICON_SCALE} />;
        else if (tab.glyph === "calendar") glyph = <CalendarNavGlyph active={active} color={color} style={NO_ICON_SCALE} />;
        else if (tab.glyph === "workout") glyph = <WorkoutNavGlyph active={active} size={24} color={color} style={NO_ICON_SCALE} />;
        else if (tab.glyph === "food") glyph = <FoodNavGlyph active={active} size={24} color={color} style={NO_ICON_SCALE} />;
        else if (tab.glyph === "heart") glyph = <HealthTabGlyph active={active} style={NO_ICON_SCALE} />;
        else if (tab.glyph === "more")
          glyph = <MoreHorizontal size={24} strokeWidth={1.6} fill={active ? "currentColor" : "none"} style={{ ...NO_ICON_SCALE, color }} aria-hidden />;
        return (
          <Link
            key={tab.label}
            to={tab.to}
            aria-current={active ? "page" : undefined}
            className="tap relative flex items-center justify-center h-full"
          >
            {tab.glyph === "more" && <UnreadDot show={unread} />}
            {tab.glyph === "mark" ? (
              <NavMarkDisc active={active}>
                <CentiumMark height={54} label={label} className={active ? "opacity-100" : "opacity-90"} style={NO_ICON_SCALE} />
              </NavMarkDisc>
            ) : (
              <span className="flex flex-col items-center justify-center gap-[3px]">
                {glyph}
                <NavLabel active={active}>{label}</NavLabel>
              </span>
            )}
          </Link>
        );
      })}
    </div>
  </nav>
);

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user, t } = useApp();
  const unread = useUnread();
  const isProfessional = user.accountType === "professional";
  const isBusiness = user.accountType === "business";
  const businessKind = useBusinessNavKind();
  const { lane } = useProSubtype();
  const items = primaryNavItems;
  // The client bar's More. The business list lives with the business tabs
  // (navItems BUSINESS_MORE_PAGES), the professional one with proTabs
  // (PRO_MORE_PAGES).
  const isMoreActive =
    location.pathname === "/app/more" ||
    ["/app/mind", "/app/marketplace", "/app/profile", "/app/subscription", "/app/professionals", "/app/calendar", "/app/forum"].some((p) =>
      location.pathname.startsWith(p)
    );

  // v6: Health stays lit on its sub-pages (metric pages, Records, Checks,
  // Sources) and on Cycle and Contraception, which now live under Health.
  const isHealthActive =
    location.pathname === "/app/health" ||
    location.pathname.startsWith("/app/health/") ||
    location.pathname === "/app/cycle" ||
    location.pathname === "/app/contraception";

  // v6 Business UI (NAV-001 to NAV-010, X-31): ClientNavBarV3 two-tone, one
  // tab set per business type, 10 in from the column edges (V6-103).
  if (isBusiness) {
    // MA1-026: Preview as client draws no navbar (source `showNav` false).
    if (/^\/app\/business\/(marketplace|products)\/preview\/?$/.test(location.pathname)) return null;
    return <BusinessBar kind={businessKind} pathname={location.pathname} unread={unread.total > 0} t={t} />;
  }

  if (isProfessional && lane) {
    return <ProBar lane={lane} pathname={location.pathname} unread={unread.total > 0} t={t} />;
  }

  // Client nav — Iteration 6 "Team": a floating pill (not a full-width bar),
  // Home moved to the centre slot and rendered as the Centium mark instead
  // of an icon/label pair, Food/Workout carrying custom glyphs.
  // Iteration 6.1 "Team Dark": confirmed against the handoff's own dark
  // frame — ground and border shift, and the glass shadow becomes a plain
  // black one so the pill reads as raised rather than emitting light.
  return (
    <nav
      data-bottom-nav
      className={clsx(
        // Handover 2026-09-29, 01 GLOBAL: the client app keeps this nav at
        // every width (there is no client sidebar any more), inside the
        // centred 430px column — 22px in from its edges, not the window's.
        "fixed z-40 left-[calc(var(--app-gutter)+22px)] right-[calc(var(--app-gutter)+22px)] h-[58px] rounded-full",
        // 18px above the viewport edge, plus the home-indicator/gesture-bar
        // inset on notched devices — the design canvas has no device chrome
        // to account for this, but the bar this replaces did.
        "bottom-[calc(env(safe-area-inset-bottom)+18px)]",
        "backdrop-blur-[16px]",
        "bg-white/[0.72] dark:bg-[#1C1F28]/[0.94]",
        "border border-team-nav-accent/[0.28] dark:border-[rgba(238,239,242,0.08)]",
        "shadow-[0_10px_28px_rgb(var(--c-primary-deep-text)/0.16)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.55)]"
      )}
    >
      <div className="grid grid-cols-5 items-center h-full px-1 max-w-xl mx-auto">
        {items.map((item) => {
          const isHome = item.to === "/app";
          const active =
            item.to === "/app/more"
              ? isMoreActive
              : item.to === "/app/health"
                ? isHealthActive
                : location.pathname === item.to;
          const Glyph = CLIENT_GLYPHS[item.to];
          const Icon = item.icon;

          return (
            <NavLink key={item.to} to={item.to} className="tap relative flex items-center justify-center h-full">
              {/* On More, and only More — see the identical note on the
                  professional/business bar above; this dot predates the
                  Team redesign and isn't part of it. Restore round (user,
                  2026-10-07): back on the client bar as main had it. */}
              {item.to === "/app/more" && <UnreadDot show={unread.total > 0} />}

              {isHome ? (
                <NavMarkDisc active={active}>
                  {/* v6 (TK 4.1, X-24): the one vector mark, 54 tall, in the
                      theme's brand pair (#8F68F6 / #8AC4BA in Centium) in
                      light and dark alike. */}
                  <CentiumMark height={54} label={t(item.label)} className={active ? "opacity-100" : "opacity-90"} />
                </NavMarkDisc>
              ) : (
                <span className="flex flex-col items-center justify-center gap-[3px]">
                  {Glyph ? (
                    // The label's inks: accent when active, --c-nav-idle (the
                    // High contrast AA idle there) otherwise.
                    <Glyph active={active} size={24} color={active ? "rgb(var(--c-team-nav-accent))" : "rgb(var(--c-nav-idle))"} />
                  ) : item.to === "/app/health" ? (
                    <HealthTabGlyph active={active} />
                  ) : (
                    <Icon
                      size={24}
                      strokeWidth={1.6}
                      fill={active ? "currentColor" : "none"}
                      className={active ? "text-team-nav-accent" : "text-nav-idle"}
                    />
                  )}
                  <span
                    className={clsx(
                      "text-[10.5px] leading-none",
                      active ? "font-extrabold text-nav-label-active" : "font-semibold text-nav-idle"
                    )}
                  >
                    {t(item.label)}
                  </span>
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
