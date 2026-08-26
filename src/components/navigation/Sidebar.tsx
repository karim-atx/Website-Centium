import React from "react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { sidebarNavItems, professionalSidebarNavItems, businessSidebarNavItems } from "./navItems";
import { useApp } from "../../context/AppContext";
import { CentiumLogo } from "../ui/CentiumLogo";
import { Flame } from "lucide-react";

export const Sidebar: React.FC = () => {
  const { user, t } = useApp();
  const isBusiness = user.accountType === "business";
  // V7 (QA 7.0): Employees/Classes only apply to gym-type businesses.
  const items =
    user.accountType === "professional"
      ? professionalSidebarNavItems
      : isBusiness
      ? businessSidebarNavItems.filter(
          (item) =>
            user.businessType === "gym" || (item.to !== "/business/employees" && item.to !== "/business/classes")
        )
      : sidebarNavItems;

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-charcoal/[0.06] bg-cream-card/60 px-4 py-6">
      <div className="flex items-center gap-2 px-2 mb-8">
        <CentiumLogo size={30} />
        <span className="font-display text-xl font-semibold text-charcoal tracking-tight">
          Centium
        </span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-colors duration-150",
                  isActive
                    ? "bg-primary-pale text-primary-dark"
                    : "text-charcoal-soft hover:bg-cream-soft"
                )
              }
            >
              <Icon size={19} />
              {t(item.label)}
            </NavLink>
          );
        })}
      </nav>

      {!isBusiness && (
        <div className="rounded-3xl bg-primary-pale p-4 mt-4">
          <div className="flex items-center gap-2 text-primary-dark font-semibold text-sm mb-1">
            <Flame size={16} className="text-teal" />
            7 day streak
          </div>
          <p className="text-xs text-primary-dark/70">Keep logging to unlock rewards 🎁</p>
        </div>
      )}

      <div className="flex items-center gap-2.5 mt-4 px-2">
        <div className="w-9 h-9 rounded-full bg-teal-pale flex items-center justify-center text-sm font-bold text-teal-dark">
          {user.firstName.charAt(0)}
        </div>
        <div className="text-sm">
          <p className="font-semibold text-charcoal leading-tight">{user.firstName}</p>
          <p className="text-charcoal-faint text-xs">Free plan</p>
        </div>
      </div>
    </aside>
  );
};
