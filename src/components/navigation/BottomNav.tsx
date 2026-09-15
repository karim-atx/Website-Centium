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
        "lg:hidden fixed z-40 left-[28px] right-[28px] h-12 rounded-full",
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
                    "w-14 h-14 rounded-full bg-white dark:bg-[#2A2338] flex items-center justify-center",
                    active
                      ? "shadow-[0_0_0_2px_rgb(var(--c-team-nav-accent))]"
                      : "shadow-[0_0_0_1px_rgb(var(--c-team-nav-accent)/0.28)] dark:shadow-[0_0_0_1px_rgb(var(--c-team-nav-accent)/0.42)]"
                  )}
                >
                  <img
                    src={dark ? "/centium-mark-dark.png" : "/centium-mark-trimmed.png"}
                    alt={t(item.label)}
                    className={clsx("w-[46px] h-[46px] object-cover rounded-full", active ? "opacity-100" : "opacity-90")}
                  />
                </span>
              ) : (
                <span className="flex flex-col items-center justify-center gap-0.5">
                  {glyph ? (
                    <img
                      src={active ? glyph.active : dark ? glyph.idleDark : glyph.idle}
                      alt=""
                      className="w-5 h-5 object-contain"
                    />
                  ) : (
                    <Icon
                      size={20}
                      strokeWidth={1.6}
                      fill={active ? "currentColor" : "none"}
                      className={active ? "text-team-nav-accent" : "text-team-nav-idle"}
                    />
                  )}
                  <span
                    className={clsx(
                      "text-[9px] leading-none",
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
