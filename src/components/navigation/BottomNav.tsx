import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";
import { primaryNavItems } from "./navItems";

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const isMoreActive =
    location.pathname === "/more" ||
    ["/mind", "/professionals", "/marketplace", "/profile", "/subscription"].some((p) =>
      location.pathname.startsWith(p)
    );

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-cream-card/95 backdrop-blur-md border-t border-charcoal/[0.06] pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 max-w-xl mx-auto">
        {primaryNavItems.map((item) => {
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
