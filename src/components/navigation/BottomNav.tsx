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

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user, t } = useApp();
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
              {/* On More, and only More. There is no Messages item in this bar
                  for any account type, so More is the sole route to a
                  conversation on the platform this app is built for — a badge
                  living only inside the menu would be seen by nobody who had
                  not already gone looking for it. */}
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
};
