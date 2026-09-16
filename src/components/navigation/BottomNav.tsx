import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";
import { primaryNavItems, professionalPrimaryNavItems, businessPrimaryNavItems } from "./navItems";
import { useApp } from "../../context/AppContext";
import { useUnread } from "../../context/UnreadContext";
import { UnreadDot } from "../messages/UnreadBadge";

const gridColsForCount: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  5: "grid-cols-5",
};

// Iteration 6 "Team": Food and Workout use custom glyphs (bowl-with-leaf,
// plate barbell) instead of lucide-react icons — the design handoff's own
// note that Food's leaf must match the Centium mark's leaf silhouette
// (lavender, not green) isn't something an existing lucide icon can do.
const TEAM_GLYPHS: Record<string, { active: string; idle: string; idleDark: string }> = {
  "/app/food": { active: "/icon-foodFilled-lav.png", idle: "/icon-foodOutline-muted.png", idleDark: "/icon-foodOutline-dark.png" },
  "/app/workout": { active: "/icon-workFilled-lav.png", idle: "/icon-workOutline-muted.png", idleDark: "/icon-workOutline-dark.png" },
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

const HealthTabGlyph: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    className={active ? "text-team-nav-accent" : "text-team-nav-idle"}
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

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user, t, theme } = useApp();
  const dark = theme === "dark";
  const unread = useUnread();
  const isProfessional = user.accountType === "professional";
  const isBusiness = user.accountType === "business";
  const items = isProfessional ? professionalPrimaryNavItems : isBusiness ? businessPrimaryNavItems : primaryNavItems;
  // V6 (QA 6.0): professionals now have their own richer sub-nav
  // (Calendar/Templates/Messages get their own bottom-nav tab; Meal Plans
  // and Health Metrics live under More instead, alongside Explore/Profile).
  // Businesses get the same "remove everything that doesn't pertain" trim.
  const isMoreActive =
    location.pathname === "/app/more" ||
    (isProfessional
      ? [
          "/app/marketplace",
          "/app/profile",
          "/app/subscription",
          "/app/settings",
          "/app/professionals/messages",
          "/app/messages",
          "/app/professionals/health-metrics",
        ]
      : isBusiness
      ? ["/app/profile", "/app/subscription", "/app/settings", "/app/business/profile", "/app/business/messages", "/app/business/calendar"]
      : ["/app/mind", "/app/marketplace", "/app/profile", "/app/subscription", "/app/professionals", "/app/calendar", "/app/forum"]
    ).some((p) => location.pathname.startsWith(p));

  // Professional and Business keep the pre-Team bar exactly as it was: the
  // "Team" handoff explicitly calls both out as DO NOT TOUCH (different tab
  // sets, not part of this pass).
  if (isProfessional || isBusiness) {
    return (
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-cream-card/95 backdrop-blur-md border-t border-charcoal/[0.06] pb-[env(safe-area-inset-bottom)]">
        <div className={clsx("grid max-w-xl mx-auto", gridColsForCount[items.length] ?? "grid-cols-5")}>
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.to === "/app/more" ? isMoreActive : location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="tap relative flex flex-col items-center justify-center gap-1 py-2.5"
              >
                {item.to === "/app/more" && <UnreadDot show={unread.total > 0} />}
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 2}
                  className={clsx(active ? "text-primary" : "text-charcoal-faint")}
                />
                <span
                  className={clsx(
                    "text-[11px] font-semibold",
                    active ? "text-primary" : "text-charcoal-faint"
                  )}
                >
                  {t(item.label)}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    );
  }

  // Client nav — Iteration 6 "Team": a floating pill (not a full-width bar),
  // Home moved to the centre slot and rendered as the Centium mark instead
  // of an icon/label pair, Food/Workout carrying custom glyphs.
  // Iteration 6.1 "Team Dark": confirmed against the handoff's own dark
  // frame — ground and border shift, and the glass shadow becomes a plain
  // black one so the pill reads as raised rather than emitting light.
  return (
    <nav
      className={clsx(
        "lg:hidden fixed z-40 left-[22px] right-[22px] h-[58px] rounded-full",
        // 18px above the viewport edge, plus the home-indicator/gesture-bar
        // inset on notched devices — the design canvas has no device chrome
        // to account for this, but the bar this replaces did.
        "bottom-[calc(env(safe-area-inset-bottom)+18px)]",
        "backdrop-blur-[16px]",
        "bg-white/[0.72] dark:bg-[#2A2338]/[0.72]",
        "border border-team-nav-accent/[0.28] dark:border-team-nav-accent/[0.42]",
        "shadow-[0_10px_28px_rgb(var(--c-primary-deep-text)/0.16)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.55)]"
      )}
    >
      <div className="grid grid-cols-5 items-center h-full px-1 max-w-xl mx-auto">
        {items.map((item) => {
          const isHome = item.to === "/app";
          const active = item.to === "/app/more" ? isMoreActive : location.pathname === item.to;
          const glyph = TEAM_GLYPHS[item.to];
          const Icon = item.icon;

          return (
            <NavLink key={item.to} to={item.to} className="tap relative flex items-center justify-center h-full">
              {/* On More, and only More — see the identical note on the
                  professional/business bar above; this dot predates the
                  Team redesign and isn't part of it. */}
              {item.to === "/app/more" && <UnreadDot show={unread.total > 0} />}

              {isHome ? (
                <span
                  className={clsx(
                    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                    "w-[66px] h-[66px] rounded-full bg-white dark:bg-[#2A2338] flex items-center justify-center",
                    active
                      ? "shadow-[0_0_0_2px_rgb(var(--c-team-nav-accent))]"
                      : "shadow-[0_0_0_1px_rgb(var(--c-team-nav-accent)/0.28)] dark:shadow-[0_0_0_1px_rgb(var(--c-team-nav-accent)/0.42)]"
                  )}
                >
                  <img
                    src={dark ? "/centium-mark-dark.png" : "/centium-mark-trimmed.png"}
                    alt={t(item.label)}
                    className={clsx("w-[54px] h-[54px] object-cover rounded-full", active ? "opacity-100" : "opacity-90")}
                  />
                </span>
              ) : (
                <span className="flex flex-col items-center justify-center gap-[3px]">
                  {glyph ? (
                    <img
                      src={active ? glyph.active : dark ? glyph.idleDark : glyph.idle}
                      alt=""
                      className="w-6 h-6 object-contain"
                    />
                  ) : item.to === "/app/health" ? (
                    <HealthTabGlyph active={active} />
                  ) : (
                    <Icon
                      size={24}
                      strokeWidth={1.6}
                      fill={active ? "currentColor" : "none"}
                      className={active ? "text-team-nav-accent" : "text-team-nav-idle"}
                    />
                  )}
                  <span
                    className={clsx(
                      "text-[10.5px] leading-none",
                      active ? "font-extrabold text-team-nav-accent" : "font-semibold text-team-nav-idle"
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
