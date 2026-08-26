import React from "react";
import { Card } from "../ui/Card";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import clsx from "clsx";

interface StatCardProps {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
  trend?: { value: string; positive: boolean; goodDirection?: "up" | "down" };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  trend,
  onClick,
}) => {
  const isGood = trend
    ? trend.goodDirection === "up"
      ? trend.positive
      : !trend.positive
    : undefined;

  return (
    <Card interactive={!!onClick} onClick={onClick} className="animate-fade-slide-up">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: iconBg }}
        >
          <Icon size={18} style={{ color: iconColor }} />
        </div>
        {trend && (
          <span
            className={clsx(
              "inline-flex items-center gap-0.5 text-xs font-semibold rounded-full px-2 py-1",
              isGood ? "text-primary-dark bg-primary-pale" : "text-teal-dark bg-teal-pale"
            )}
          >
            {trend.positive ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {trend.value}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-charcoal leading-none mb-1">{value}</p>
      <p className="text-xs text-charcoal-soft">{label}</p>
      {sub && <p className="text-[11px] text-charcoal-faint mt-1">{sub}</p>}
    </Card>
  );
};
