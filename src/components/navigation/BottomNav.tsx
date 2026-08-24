import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";
import { primaryNavItems, professionalPrimaryNavItems } from "./navItems";
import { useApp } from "../../context/AppContext";

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user } = useApp();
  const isProfessional = user.accountType === "professional";
  const items = isProfessional ? professionalPrimaryNavItems : primaryNavItems;
  const isMoreActive =
    location.pathname === "/more" ||
    ["/mind", "/marketplace", "/profile", "/subscription", ...(isProfessional ? [] : ["/professionals"])].some(
      (p) => location.pathname.startsWith(p)
    );

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-cream-card/95 backdrop-blur-md border-t border-charcoal/[0.06] pb-[env(safe-area-inset-bottom)]">
      <div className={clsx("grid max-w-xl mx-auto", isProfessional ? "grid-cols-2" : "grid-cols-5")}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.to === "/more" ? isMoreActive : location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="tap flex flex-col items-center justify-center gap-1 py-2.5"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.4 : 2}
                className={clsx(active ? "text-sohati" : "text-charcoal-faint")}
              />
              <span
                className={clsx(
                  "text-[11px] font-semibold",
                  active ? "text-sohati" : "text-charcoal-faint"
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
