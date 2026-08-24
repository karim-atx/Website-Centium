import React from "react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { sidebarNavItems, professionalSidebarNavItems } from "./navItems";
import { useApp } from "../../context/AppContext";
import { CentiumLogo } from "../ui/CentiumLogo";
import { Flame } from "lucide-react";

export const Sidebar: React.FC = () => {
  const { user } = useApp();
  const items = user.accountType === "professional" ? professionalSidebarNavItems : sidebarNavItems;

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
                    ? "bg-sohati-pale text-sohati-dark"
                    : "text-charcoal-soft hover:bg-cream-soft"
                )
              }
            >
              <Icon size={19} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="rounded-3xl bg-sohati-pale p-4 mt-4">
        <div className="flex items-center gap-2 text-sohati-dark font-semibold text-sm mb-1">
          <Flame size={16} className="text-ember" />
          7 day streak
        </div>
        <p className="text-xs text-sohati-dark/70">Keep logging to unlock rewards 🎁</p>
      </div>

      <div className="flex items-center gap-2.5 mt-4 px-2">
        <div className="w-9 h-9 rounded-full bg-ember-pale flex items-center justify-center text-sm font-bold text-ember-dark">
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
