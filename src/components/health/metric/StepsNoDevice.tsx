import React from "react";
import type { MetricKey } from "../MetricWidget";
import { ChartCard, NoDeviceCard, noDeviceBody } from "./MetricKit";
import { periodLabel, periodOf, periodTitle, type MetricRange } from "./periods";
import { GoalBarChart, buildGoalBars } from "./StepsBarChart";

// OURS-health-no-device-web on the HE1.2.e layout (#8-#22), shared by Steps,
// Sleep and Calories burned: the metric-tint card (pad 22 18, tile 48 r14,
// icon 24, title 17/25.5 800, body 12.5/18.8 400) with the web copy, then
// the ghost period card (title + period label, no chevrons, ghost bars,
// foot "Your week fills in once <metric> sync."). The access-off card
// (#13-#17) is native only. The page pins "Connect a source" (#23).

const WORD: Record<MetricRange, string> = { day: "day", week: "week", month: "month", year: "year" };

export const SyncedNoDevice: React.FC<{
  metric: MetricKey;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  /** "Steps" / "Sleep data" / "Calories burned" (body), "steps" / "sleep" / "calories" (foot). */
  bodyName: string;
  footName: string;
  range: MetricRange;
  today: string;
}> = ({ metric, icon, bodyName, footName, range, today }) => {
  const p = periodOf(range === "day" ? "week" : range, today);
  const bars = buildGoalBars(p, {}, today).map((b) => ({ ...b, value: null, ghost: true }));
  return (
    <>
      <NoDeviceCard metric={metric} icon={icon} body={noDeviceBody(bodyName)} literal />
      <ChartCard
        metric={metric}
        title={periodTitle(p, today)}
        periodLabel={periodLabel(p)}
        onPrev={() => {}}
        onNext={() => {}}
        nextDisabled
        hideNav
        foot={<span style={{ color: "rgb(var(--c-charcoal-soft))" }}>{`Your ${WORD[p.range]} fills in once ${footName} sync.`}</span>}
        summary={`No ${footName} yet. Your ${WORD[p.range]} fills in once ${footName} sync.`}
      >
        <GoalBarChart metric={metric} mode={p.range === "day" ? "week" : (p.range as "week" | "month" | "year")} bars={bars} goal={null} ghostValue={1} />
      </ChartCard>
    </>
  );
};
