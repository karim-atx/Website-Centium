import React from "react";
import type { MetricKey } from "../MetricWidget";
import { ChartCard, NoDeviceCard, noDeviceBody } from "./MetricKit";
import { periodLabel, periodOf, periodTitle, type MetricRange } from "./periods";
import { GoalBarChart, buildGoalBars } from "./StepsBarChart";
import { t, tk } from "../../../i18n/core";

// OURS-health-no-device-web on the HE1.2.e layout (#8-#22), shared by Steps,
// Sleep and Calories burned: the metric-tint card (pad 22 18, tile 48 r14,
// icon 24, title 17/25.5 800, body 12.5/18.8 400) with the web copy, then
// the ghost period card (title + period label, no chevrons, ghost bars,
// foot "Your week fills in once <metric> sync."). The access-off card
// (#13-#17) is native only. The page pins "Connect a source" (#23).

type Ghost = "week" | "month" | "year";
// Whole sentences per metric and period (catalogue keys), so Arabic can word each one.
const FOOT: Record<string, Record<Ghost, string>> = {
  steps: {
    week: tk("Your week fills in once steps sync."),
    month: tk("Your month fills in once steps sync."),
    year: tk("Your year fills in once steps sync."),
  },
  sleep: {
    week: tk("Your week fills in once sleep sync."),
    month: tk("Your month fills in once sleep sync."),
    year: tk("Your year fills in once sleep sync."),
  },
  calories: {
    week: tk("Your week fills in once calories sync."),
    month: tk("Your month fills in once calories sync."),
    year: tk("Your year fills in once calories sync."),
  },
};
const SUMMARY: Record<string, Record<Ghost, string>> = {
  steps: {
    week: tk("No steps yet. Your week fills in once steps sync."),
    month: tk("No steps yet. Your month fills in once steps sync."),
    year: tk("No steps yet. Your year fills in once steps sync."),
  },
  sleep: {
    week: tk("No sleep yet. Your week fills in once sleep sync."),
    month: tk("No sleep yet. Your month fills in once sleep sync."),
    year: tk("No sleep yet. Your year fills in once sleep sync."),
  },
  calories: {
    week: tk("No calories yet. Your week fills in once calories sync."),
    month: tk("No calories yet. Your month fills in once calories sync."),
    year: tk("No calories yet. Your year fills in once calories sync."),
  },
};

export const SyncedNoDevice: React.FC<{
  metric: MetricKey;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  /** "Steps" / "Sleep data" / "Calories burned" (body, translated here), "steps" / "sleep" / "calories" (foot: picks the sentence). */
  bodyName: string;
  footName: string;
  range: MetricRange;
  today: string;
}> = ({ metric, icon, bodyName, footName, range, today }) => {
  const p = periodOf(range === "day" ? "week" : range, today);
  const bars = buildGoalBars(p, {}, today).map((b) => ({ ...b, value: null, ghost: true }));
  const g = p.range as Ghost;
  const foot = t(FOOT[footName]?.[g] ?? `Your ${g} fills in once ${footName} sync.`);
  const summary = t(SUMMARY[footName]?.[g] ?? `No ${footName} yet. Your ${g} fills in once ${footName} sync.`);
  return (
    <>
      <NoDeviceCard metric={metric} icon={icon} body={noDeviceBody(t(bodyName))} literal />
      <ChartCard
        metric={metric}
        title={periodTitle(p, today)}
        periodLabel={periodLabel(p)}
        onPrev={() => {}}
        onNext={() => {}}
        nextDisabled
        hideNav
        foot={<span style={{ color: "rgb(var(--c-charcoal-soft))" }}>{foot}</span>}
        summary={summary}
      >
        <GoalBarChart metric={metric} mode={p.range === "day" ? "week" : (p.range as "week" | "month" | "year")} bars={bars} goal={null} ghostValue={1} />
      </ChartCard>
    </>
  );
};
