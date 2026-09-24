import React from "react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { sidebarNavItems, professionalSidebarNavItems, businessSidebarNavItems } from "./navItems";
import { useApp } from "../../context/AppContext";
import { Flame } from "lucide-react";
import { useUnread } from "../../context/UnreadContext";
import { UnreadBadge } from "../messages/UnreadBadge";
import { PlanLine } from "./PlanLine";
import { currentDayStreak, dayStreakLabel } from "../../services/streaks/dayStreak";

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
  // V7 (QA 7.0): Employees/Classes only apply to gym-type businesses.
  const items =
    user.accountType === "professional"
      ? professionalSidebarNavItems
      : isBusiness
      ? businessSidebarNavItems.filter(
          (item) =>
            user.businessType === "gym" || (item.to !== "/app/business/employees" && item.to !== "/app/business/classes")
        )
      : sidebarNavItems;

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-charcoal/[0.06] bg-cream-card/60 px-4 py-6">
      {/* Design refinement §3c "Placements": the redrawn-SVG mark is
          replaced with the real brand asset wherever it appears. */}
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <img src="/centium-mark.png" alt="" className="w-[30px] h-[30px] object-contain" />
        <span className="font-display text-xl font-bold text-charcoal tracking-tight">
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
              <span className="flex-1 min-w-0 truncate">{t(item.label)}</span>
              {/* Keyed on the route, not the label: the label is translated
                  and would stop matching in another language. */}
              {item.to === "/app/messages" && <UnreadBadge count={unread.total} />}
            </NavLink>
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
          <p className="text-xs text-primary-dark/70">
            {dayStreak > 0
              ? "Keep logging to unlock rewards 🎁"
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
