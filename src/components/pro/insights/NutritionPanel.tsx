import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Eye, Lock, UtensilsCrossed, Target } from "lucide-react";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { ProChart } from "../ProChart";
import { LeafStreak } from "../LeafStreak";
import { OfflineLine, ListSkeleton } from "../states";
import { Chip, ListCard, SectionHead } from "../client/kit";
import { fetchFoodEntries, fetchInsightTargets, localDay, localMinute, type FoodEntry } from "../../../services/pro/insights";
import { fetchClientAccess } from "../../../services/pro/access";
import { formatMinutes12, hourLabel12 } from "../../../utils/time12";
import { addDays, bucketLabel, bucketTitle, bucketsFor, calorieBand, fewestMealsLine, meanByBucket, onPlanLine, RANGE_DAYS, streakOf } from "./insightsModel";
import { InsightCard, InsightLine, NotShared, type PickerClient } from "./parts";
import { readGate, useRead } from "./reads";
import type { PanelProps } from "./panelProps";
import { appLocale } from "../../../i18n/format";

/**
 * Release 3 · W5 Insights › Nutrition (TR9 v5 "leaf streak, one fixed
 * drawing", NU14 v2 "Client insights › Nutrition"; source gen/r11.js
 * insights11 Nutrition, gen/r14.js streak14), Food diary switch only:
 * - Logging: the Logging streak (days with any food logged);
 * - Logging consistency: meals logged per day (distinct meal slots), the
 *   tooltip lists the times each was eaten (eaten_at, 12-hour);
 * - When {name} logs: every entry's eaten time on a 6 AM to 12 AM strip,
 *   red when it was added a day or more after the day it belongs to;
 * - Intake vs targets: calories per day, the target line and the on-plan
 *   band (calorieBand) when a target is readable (the targets this
 *   professional set, else the client's own with Progress shared), last
 *   period as the ghost; "On plan {n} of {n} logged days.";
 * - Nutrient analysis (NU7): the row that opens it.
 * Clinical overview (NU10): "All patients" lists every patient's food diary
 * read only (kcal average, days logged, salt over the 5 g limit).
 */

const fmt = (n: number) => Math.round(n).toLocaleString(appLocale("en-GB"));
/** Salt (g) from sodium (mg): × 2.5 ÷ 1000. */
const saltOf = (sodiumMg: number) => (sodiumMg * 2.5) / 1000;

interface DayAgg {
  day: string;
  kcal: number;
  p: number;
  meals: number;
  sodium: number | null;
  times: string[];
}

function byDay(entries: FoodEntry[]): Map<string, DayAgg> {
  const m = new Map<string, DayAgg & { slots: Set<string>; first: Map<string, number> }>();
  for (const e of entries) {
    const d = m.get(e.day) ?? { day: e.day, kcal: 0, p: 0, meals: 0, sodium: null, times: [], slots: new Set<string>(), first: new Map<string, number>() };
    d.kcal += e.kcal;
    d.p += e.p;
    d.slots.add(e.meal);
    const na = e.nutrients?.sodium;
    if (typeof na === "number") d.sodium = (d.sodium ?? 0) + na;
    if (e.eatenAt) {
      const min = localMinute(e.eatenAt);
      const was = d.first.get(e.meal);
      if (was == null || min < was) d.first.set(e.meal, min);
    }
    m.set(e.day, d);
  }
  const out = new Map<string, DayAgg>();
  for (const [k, d] of m) out.set(k, { day: d.day, kcal: d.kcal, p: d.p, meals: d.slots.size, sodium: d.sodium, times: [...d.first.values()].sort((a, b) => a - b).map(formatMinutes12) });
  return out;
}

export const NutritionPanel: React.FC<PanelProps & { onAnalysis: () => void; onTargets?: () => void }> = (p) => {
  const { clientId, firstName, access, range, onRange, today, onAnalysis } = p;
  const on = access.has("food_diary");
  const span = RANGE_DAYS[range];
  const since = addDays(today, -Math.max(span * 2, 90));
  const food = useRead(on, () => fetchFoodEntries(clientId, since), [clientId, since]);
  const targets = useRead(on, () => fetchInsightTargets(clientId, access.has("progress")), [clientId, access.access]);

  const days = useMemo(() => byDay(food.data ?? []), [food.data]);

  if (!on)
    return (
      <NotShared
        icon={UtensilsCrossed}
        title="No shared data yet"
        line={`This fills in when ${firstName} shares their food diary with you.`}
        askLabel={`Ask ${firstName} to share`}
        asked={p.asked.includes("food_diary")}
        onAsk={() => p.onAsk("food_diary")}
      />
    );
  const gate = readGate(food);
  if (gate) return <>{gate}</>;

  const logged = [...days.keys()].filter((d) => d <= today);
  const analysisRow = (
    <ListCard
      rows={[
        { key: "na", icon: BarChart3, title: "Nutrient analysis", meta: p.lane === "clinical_overview" ? "Macros and intake, read only" : "Macros, intake and meal timing", onClick: onAnalysis },
        // NU8 v3 Clinical overview: the professional-set targets, read only.
        ...(p.onTargets ? [{ key: "nt", icon: Target, title: "Nutrition targets", meta: "Read only", onClick: p.onTargets }] : []),
      ]}
    />
  );
  if (logged.length < 7) {
    return (
      <>
        {food.offline && <OfflineLine />}
        <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 16, marginBottom: 12 }}>
          <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>Logging</p>
          <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 6 }}>{`${logged.length} day${logged.length === 1 ? "" : "s"} logged. Streaks and trends appear after a week.`}</p>
        </div>
        {analysisRow}
      </>
    );
  }

  const streak = streakOf(new Set(logged), today);
  const b = bucketsFor(range, today);
  const g = bucketsFor(range, today, 1);
  const dayList = [...days.values()];
  const meals = meanByBucket(b, dayList.map((d) => ({ day: d.day, value: d.meals })));
  const kcal = meanByBucket(b, dayList.map((d) => ({ day: d.day, value: d.kcal })));
  const kcalGhost = meanByBucket(g, dayList.map((d) => ({ day: d.day, value: d.kcal })));
  const perDay = range === "W" || range === "M";
  const target = targets.data?.kcal ?? null;
  const band = target ? calorieBand(target) : null;
  const inRange = dayList.filter((d) => d.day >= b[0].start && d.day <= today);
  const allK = [...kcal, ...kcalGhost, target ?? 0].filter((x): x is number => x != null && x > 0);
  const kMin = allK.length ? Math.max(0, Math.floor((Math.min(...allK) * 0.8) / 100) * 100) : 0;
  const kMax = allK.length ? Math.ceil((Math.max(...allK) * 1.1) / 100) * 100 : 3000;
  const timed = (food.data ?? []).filter((e) => e.eatenAt && e.day >= b[0].start);
  const late = timed.filter((e) => localDay(e.createdAt) > e.day);

  return (
    <>
      {food.offline && <OfflineLine />}
      {p.lane === "clinical_overview" && <ReadOnlyLine text={`Read only · from what ${firstName} shares`} />}
      <SectionHead label="Logging" />
      <LeafStreak title="Logging streak" current={streak.current} best={streak.best} label="days logged" days={streak.days} />
      <ProChart
        title="Logging consistency"
        question="Can the food diary be trusted day to day?"
        range={range}
        onRangeChange={onRange}
        x={b.map((x) => bucketLabel(range, x))}
        min={0}
        max={Math.max(4, ...meals.map((v) => v ?? 0)) + 1}
        series={[{ key: "m", label: "Meals logged", type: "bar", color: INK.pr, values: meals }]}
        tooltip={(i) => {
          const v = meals[i];
          if (!perDay) return { title: bucketTitle(range, b[i]), lines: [v != null ? `${Math.round(v * 10) / 10} meals logged a day` : "Nothing logged"] };
          const d = days.get(b[i].start);
          return { title: bucketTitle(range, b[i]), lines: d ? [`${d.meals} meal${d.meals === 1 ? "" : "s"} logged`, ...(d.times.length ? [`Logged ${d.times.join(", ")}`] : [])] : ["Nothing logged"] };
        }}
        insight={fewestMealsLine(inRange.map((d) => ({ day: d.day, meals: d.meals }))) ?? undefined}
        summary={`Logged on ${inRange.length} of ${RANGE_DAYS[range]} days.`}
      />
      {timed.length > 0 && (
        <InsightCard title={`When ${firstName} logs`}>
          <div className="relative" style={{ height: 34, borderRadius: 10, background: INK.soft }} role="img" aria-label={`${timed.length} entries by the time they were eaten`}>
            {timed.map((e, i) => {
              const m = localMinute(e.eatenAt as string);
              const h = m / 60 < 6 ? m / 60 + 24 : m / 60;
              const isLate = localDay(e.createdAt) > e.day;
              return <span key={i} className="absolute" style={{ top: 11, left: `calc(${(((h - 6) / 18) * 100).toFixed(1)}% - 6px)`, width: 12, height: 12, borderRadius: 9999, background: isLate ? INK.hi : INK.pr, opacity: 0.85 }} />;
            })}
          </div>
          <div aria-hidden className="flex justify-between" style={{ fontSize: textPx(9.5), color: INK.chT, marginTop: 4 }}>
            {[6, 12, 18, 24].map((h) => (
              <span key={h}>{hourLabel12(h % 24)}</span>
            ))}
          </div>
          {late.length > 0 && <InsightLine top={8}>{`${late.length} of ${timed.length} entries were added a day or more after they were eaten (red).`}</InsightLine>}
        </InsightCard>
      )}
      <ProChart
        title="Intake vs targets"
        question={`Is ${firstName} eating to the care plan?`}
        range={range}
        onRangeChange={onRange}
        x={b.map((x) => bucketLabel(range, x))}
        min={kMin}
        max={kMax}
        band={band ? { ...band, label: "On-plan range" } : undefined}
        goal={target ?? undefined}
        goalLegend={target ? `Target ${fmt(target)}` : undefined}
        series={[
          { key: "k", label: "Calories", type: "line", color: INK.pr, values: kcal },
          { key: "g", label: "Last period", type: "line", color: INK.chT, ghost: true, values: kcalGhost },
        ]}
        tooltip={(i) => {
          const v = kcal[i];
          if (v == null) return { title: bucketTitle(range, b[i]), lines: ["Nothing logged"] };
          const d = perDay ? days.get(b[i].start) : null;
          const diff = target ? Math.round(v - target) : null;
          return {
            title: bucketTitle(range, b[i]),
            lines: [
              `${fmt(v)} kcal${diff != null && diff !== 0 ? ` · ${fmt(Math.abs(diff))} ${diff > 0 ? "over" : "under"}` : ""}`,
              ...(d ? [[d.sodium != null ? `Salt ${Math.round(saltOf(d.sodium) * 10) / 10} g` : null, `protein ${fmt(d.p)} g`].filter(Boolean).join(" · ")] : []),
            ],
          };
        }}
        insight={band ? onPlanLine(inRange.map((d) => ({ day: d.day, kcal: d.kcal })), band) ?? undefined : undefined}
        summary={`Calories ${inRange.length ? fmt(inRange.reduce((a, d) => a + d.kcal, 0) / inRange.length) : 0} kcal a day on logged days${target ? `, target ${fmt(target)}` : ""}.`}
      />
      {analysisRow}
    </>
  );
};

const ReadOnlyLine: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center" style={{ gap: 8, borderRadius: 12, background: INK.soft, padding: "9px 12px", marginBottom: 12, fontSize: textPx(12), fontWeight: 600, color: INK.chS }}>
    <Eye size={14} strokeWidth={2} aria-hidden />
    {text}
  </div>
);

// ---------------------------------------------------------------------------
// NU10 · Clinical overview, every patient's food diary, read only
// ---------------------------------------------------------------------------

interface RosterRow {
  clientId: string;
  shared: boolean;
  avg: number | null;
  logged: number;
  saltDays: number;
  sodiumDays: number;
}

export const NutritionRoster: React.FC<{ clients: PickerClient[]; today: string; onPick: (id: string) => void }> = ({ clients, today, onPick }) => {
  const [rows, setRows] = useState<RosterRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const key = clients.map((c) => c.clientId).join(",");
  useEffect(() => {
    let live = true;
    setRows(null);
    setFailed(false);
    void (async () => {
      const out: RosterRow[] = [];
      for (const c of clients) {
        const a = await fetchClientAccess(c.clientId);
        if (!a.ok) {
          if (live) setFailed(true);
          continue;
        }
        const shared = !!a.data?.categories.includes("food_diary");
        if (!shared) {
          out.push({ clientId: c.clientId, shared, avg: null, logged: 0, saltDays: 0, sodiumDays: 0 });
          continue;
        }
        const f = await fetchFoodEntries(c.clientId, addDays(today, -6));
        const d = f.ok ? [...byDay(f.data).values()] : [];
        const withNa = d.filter((x) => x.sodium != null);
        out.push({ clientId: c.clientId, shared, avg: d.length ? d.reduce((s, x) => s + x.kcal, 0) / d.length : null, logged: d.length, saltDays: withNa.filter((x) => saltOf(x.sodium as number) > 5).length, sodiumDays: withNa.length });
      }
      if (live) setRows(out);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, today]);

  return (
    <>
      <ReadOnlyLine text="Read only · from patients who share their food diary" />
      {failed && <OfflineLine />}
      {!rows ? (
        <ListSkeleton rows={3} />
      ) : (
        <ListCard
          rows={rows.map((r) => {
            const c = clients.find((x) => x.clientId === r.clientId) as PickerClient;
            const saltHigh = r.sodiumDays > 0 && r.saltDays * 2 >= r.sodiumDays;
            return {
              key: r.clientId,
              icon: r.shared ? UtensilsCrossed : Lock,
              title: c.name,
              meta: !r.shared
                ? "Food diary not shared"
                : r.avg == null
                  ? "Logged 0 of 7 days"
                  : saltHigh
                    ? `${fmt(r.avg)} kcal avg · salt over limit ${r.saltDays} of ${r.sodiumDays} days`
                    : r.logged < 7
                      ? `Logged ${r.logged} of 7 days`
                      : `${fmt(r.avg)} kcal avg · logged 7 of 7 days`,
              trailing: r.shared && saltHigh ? <Chip label="Salt high" tone="att" /> : undefined,
              onClick: () => onPick(r.clientId),
            };
          })}
        />
      )}
    </>
  );
};
