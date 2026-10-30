import React, { useMemo, useState } from "react";
import { INK } from "../proInk";
import { ProChart } from "../ProChart";
import { ProCardSkeleton, ProError } from "../states";
import { fetchFoodEntries, fetchInsightTargets, fetchMetricRows, fetchWorkouts, type Workout } from "../../../services/pro/insights";
import { textPx } from "../../../theme/textSize";
import { addDays, bucketLabel, bucketTitle, bucketsFor, calorieBand, macroGrams, meanByBucket, RANGE_DAYS, sumByBucket, type ChartRange } from "./insightsModel";
import { Micros } from "./NutrientAnalysis";
import { WeightView } from "./VitalsPanel";
import { useRead, type ReadState } from "./reads";
import { appLocale } from "../../../i18n/format";

/**
 * Release 3 · W5 the charts the client page's Progress tab (W3, CL2 v5)
 * held Coming soon for, each read only when its switch is on (the tab
 * gates them with LockLine first):
 * - Strength (Full coaching): the heaviest working set per period of the
 *   client's most-logged exercises, PR marks (logged_sets.is_pr);
 * - Volume: working sets per period (bars) with the kg moved in the tooltip;
 * - RPE: the average logged RPE per period (rpeOptions 6 to 10);
 * - Weight trend: Insights › Vitals › Weight (weigh-ins, EWMA trend, goal);
 * - Calories and macros over time: calories against the target band, and
 *   protein, carbs and fat in grams;
 * - Micronutrients (Nutrition only): % of the app's nutrient targets.
 * Working sets exclude warm-ups and sets not completed.
 */

const fmt = (n: number) => Math.round(n).toLocaleString(appLocale("en-GB"));

const gate = <T,>(r: ReadState<T>) => (r.data !== undefined ? null : r.error ? <ProError onRetry={r.retry} /> : <ProCardSkeleton lines={3} height={150} />);

function useWorkouts(clientId: string, range: ChartRange, today: string) {
  const since = addDays(today, -(RANGE_DAYS[range] * 2));
  return useRead(true, () => fetchWorkouts(clientId, since), [clientId, since]);
}

const working = (w: Workout) => w.exercises.flatMap((e) => e.sets.filter((s) => s.completed && s.type !== "warmup").map((s) => ({ ...s, exercise: e.name, day: w.day })));

export const StrengthChart: React.FC<{ clientId: string; today: string; initial: ChartRange }> = ({ clientId, today, initial }) => {
  const [range, setRange] = useState<ChartRange>(initial === "W" ? "M" : initial);
  const r = useWorkouts(clientId, range, today);
  const sets = useMemo(() => (r.data ?? []).flatMap(working), [r.data]);
  const top = useMemo(() => {
    const n = new Map<string, number>();
    for (const s of sets) if (s.kg != null && s.kg > 0) n.set(s.exercise, (n.get(s.exercise) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);
  }, [sets]);
  const [pick, setPick] = useState<string | null>(null);
  const g = gate(r);
  if (g) return g;
  const ex = pick && top.includes(pick) ? pick : top[0];
  if (!ex) return <p style={{ fontSize: textPx(12), color: INK.chF }}>No weighted sets logged in this range.</p>;
  const b = bucketsFor(range, today);
  const best = b.map((x) => {
    const v = sets.filter((s) => s.exercise === ex && s.day >= x.start && s.day <= x.end && s.kg != null).map((s) => s.kg as number);
    return v.length ? Math.max(...v) : null;
  });
  const prs = b.map((x) => sets.some((s) => s.exercise === ex && s.pr && s.day >= x.start && s.day <= x.end));
  const vals = best.filter((v): v is number => v != null);
  return (
    <>
      {top.length > 1 && (
        <div className="flex flex-wrap" style={{ gap: 6, marginBottom: 8 }} role="group" aria-label="Exercise">
          {top.map((t) => (
            <button key={t} type="button" aria-pressed={t === ex} onClick={() => setPick(t)} className="tap relative before:absolute before:inset-x-0 before:-inset-y-[9px] before:content-['']" style={{ borderRadius: 10, padding: "6px 11px", fontSize: textPx(12), fontWeight: t === ex ? 700 : 600, background: t === ex ? INK.fill : INK.card, color: t === ex ? INK.onFill : INK.chS, border: `1px solid ${t === ex ? INK.fill : "rgb(var(--c-charcoal) / 0.11)"}` }}>
              {t}
            </button>
          ))}
        </div>
      )}
      <ProChart
        flat
        title={`${ex}, heaviest set`}
        range={range}
        onRangeChange={setRange}
        x={b.map((x) => bucketLabel(range, x))}
        min={vals.length ? Math.max(0, Math.floor(Math.min(...vals) * 0.8)) : 0}
        max={vals.length ? Math.ceil(Math.max(...vals) * 1.1) : 10}
        series={[{ key: "kg", label: "Heaviest set (kg)", type: "line", color: INK.pr, values: best }]}
        marks={prs.map((p, i) => (p ? { index: i, label: "PR" } : null)).filter((m): m is { index: number; label: string } => !!m)}
        tooltip={(i) => ({ title: bucketTitle(range, b[i]), lines: [best[i] != null ? `${best[i]} kg${prs[i] ? " · PR" : ""}` : "Not logged"] })}
        summary={vals.length ? `${ex}: heaviest set ${Math.max(...vals)} kg in this range.` : undefined}
      />
    </>
  );
};

export const VolumeChart: React.FC<{ clientId: string; today: string; initial: ChartRange }> = ({ clientId, today, initial }) => {
  const [range, setRange] = useState<ChartRange>(initial === "W" ? "M" : initial);
  const r = useWorkouts(clientId, range, today);
  const g = gate(r);
  if (g) return g;
  const b = bucketsFor(range, today);
  const gb = bucketsFor(range, today, 1);
  const rows = (r.data ?? []).flatMap(working);
  const sets = sumByBucket(b, rows.map((s) => ({ day: s.day, value: 1 })));
  const ghost = sumByBucket(gb, rows.map((s) => ({ day: s.day, value: 1 })));
  const kg = sumByBucket(b, rows.map((s) => ({ day: s.day, value: (s.kg ?? 0) * (s.reps ?? 0) })));
  if (!rows.length) return <p style={{ fontSize: textPx(12), color: INK.chF }}>No sets logged in this range.</p>;
  return (
    <ProChart
      flat
      title="Working sets"
      range={range}
      onRangeChange={setRange}
      x={b.map((x) => bucketLabel(range, x))}
      min={0}
      max={Math.max(4, ...sets.map((v) => v ?? 0), ...ghost.map((v) => v ?? 0)) * 1.15}
      series={[
        { key: "s", label: "Sets", type: "bar", color: INK.pr, values: sets },
        { key: "g", label: "Previous period", type: "line", color: INK.chT, ghost: true, values: ghost },
      ]}
      tooltip={(i) => ({ title: bucketTitle(range, b[i]), lines: [sets[i] ? `${sets[i]} sets · ${fmt(kg[i] ?? 0)} kg` : "No sets"] })}
      summary={`${rows.filter((s) => s.day >= b[0].start).length} working sets in this range.`}
    />
  );
};

export const RpeChart: React.FC<{ clientId: string; today: string; initial: ChartRange }> = ({ clientId, today, initial }) => {
  const [range, setRange] = useState<ChartRange>(initial === "W" ? "M" : initial);
  const r = useWorkouts(clientId, range, today);
  const g = gate(r);
  if (g) return g;
  const b = bucketsFor(range, today);
  const rows = (r.data ?? []).flatMap(working).filter((s) => s.rpe != null);
  if (!rows.length) return <p style={{ fontSize: textPx(12), color: INK.chF }}>No RPE logged in this range.</p>;
  const v = meanByBucket(b, rows.map((s) => ({ day: s.day, value: s.rpe as number })));
  return (
    <ProChart
      flat
      title="Average RPE"
      range={range}
      onRangeChange={setRange}
      x={b.map((x) => bucketLabel(range, x))}
      min={5}
      max={10.5}
      series={[{ key: "r", label: "RPE", type: "line", color: INK.pr, values: v.map((x) => (x == null ? null : Math.round(x * 10) / 10)) }]}
      tooltip={(i) => ({ title: bucketTitle(range, b[i]), lines: [v[i] != null ? `RPE ${Math.round((v[i] as number) * 10) / 10}` : "No RPE logged"] })}
      summary="Average RPE of working sets per period."
    />
  );
};

export const WeightTrendChart: React.FC<{ clientId: string; today: string; initial: ChartRange; bodyOn: boolean; progressOn: boolean }> = ({ clientId, today, initial, bodyOn, progressOn }) => {
  const [range, setRange] = useState<ChartRange>(initial);
  const w = useRead(true, () => fetchMetricRows(clientId, ["weight"], "2000-01-01"), [clientId]);
  const body = useRead(bodyOn, () => fetchMetricRows(clientId, ["waist", "body_fat_pct"], addDays(today, -400)), [clientId, today]);
  const t = useRead(progressOn, () => fetchInsightTargets(clientId, true), [clientId]);
  const g = gate(w);
  if (g) return g;
  if (!w.data?.length) return <p style={{ fontSize: textPx(12), color: INK.chF }}>No weigh-ins yet.</p>;
  return <WeightView rows={w.data} body={body.data ?? []} bodyOn={bodyOn} goalKg={t.data?.goalWeightKg ?? null} range={range} onRange={setRange} today={today} />;
};

export const CaloriesMacrosChart: React.FC<{ clientId: string; today: string; initial: ChartRange; progressOn: boolean }> = ({ clientId, today, initial, progressOn }) => {
  const [range, setRange] = useState<ChartRange>(initial);
  const since = addDays(today, -(RANGE_DAYS[range] - 1));
  const food = useRead(true, () => fetchFoodEntries(clientId, since), [clientId, since]);
  const t = useRead(true, () => fetchInsightTargets(clientId, progressOn), [clientId, progressOn]);
  const g = gate(food);
  if (g) return g;
  const b = bucketsFor(range, today);
  const perDay = new Map<string, { k: number; p: number; c: number; f: number }>();
  for (const e of food.data ?? []) {
    const d = perDay.get(e.day) ?? { k: 0, p: 0, c: 0, f: 0 };
    d.k += e.kcal;
    d.p += e.p;
    d.c += e.c;
    d.f += e.f;
    perDay.set(e.day, d);
  }
  if (!perDay.size) return <p style={{ fontSize: textPx(12), color: INK.chF }}>Nothing logged in this range.</p>;
  const list = [...perDay.entries()].map(([day, v]) => ({ day, ...v }));
  const k = meanByBucket(b, list.map((d) => ({ day: d.day, value: d.k })));
  const p = meanByBucket(b, list.map((d) => ({ day: d.day, value: d.p })));
  const c = meanByBucket(b, list.map((d) => ({ day: d.day, value: d.c })));
  const f = meanByBucket(b, list.map((d) => ({ day: d.day, value: d.f })));
  const target = t.data?.kcal ?? null;
  const band = target ? calorieBand(target) : null;
  const grams = target && t.data?.pct ? macroGrams(target, t.data.pct) : null;
  const all = [...k, target].filter((x): x is number => x != null && x > 0);
  return (
    <>
      <ProChart
        flat
        title="Calories"
        range={range}
        onRangeChange={setRange}
        x={b.map((x) => bucketLabel(range, x))}
        min={Math.max(0, Math.floor((Math.min(...all) * 0.8) / 100) * 100)}
        max={Math.ceil((Math.max(...all) * 1.1) / 100) * 100}
        band={band ? { ...band, label: "On target" } : undefined}
        goal={target ?? undefined}
        goalLegend={target ? `Target ${fmt(target)}` : undefined}
        series={[{ key: "k", label: "Calories", type: "line", color: "#7D6BB5", values: k }]}
        tooltip={(i) => ({ title: bucketTitle(range, b[i]), lines: [k[i] != null ? `${fmt(k[i] as number)} kcal` : "Nothing logged"] })}
        summary={`Calories on ${list.length} logged days${target ? `, target ${fmt(target)} kcal` : ""}.`}
      />
      <div style={{ height: 12 }} />
      <ProChart
        flat
        title="Protein, carbs and fat"
        x={b.map((x) => bucketLabel(range, x))}
        min={0}
        max={Math.max(50, ...[...p, ...c, ...f].map((v) => v ?? 0), ...(grams ?? [])) * 1.15}
        series={[
          { key: "p", label: "Protein (g)", type: "line", color: "#7D6BB5", values: p },
          { key: "c", label: "Carbs (g)", type: "line", color: "#AEA1DC", values: c },
          { key: "f", label: "Fat (g)", type: "line", color: "#A2C8C2", values: f },
        ]}
        tooltip={(i) => ({ title: bucketTitle(range, b[i]), lines: p[i] != null ? [`Protein ${fmt(p[i] as number)} g · carbs ${fmt(c[i] ?? 0)} g · fat ${fmt(f[i] ?? 0)} g`, ...(grams ? [`Target ${fmt(grams[0])} g · ${fmt(grams[1])} g · ${fmt(grams[2])} g`] : [])] : ["Nothing logged"] })}
        summary="Protein, carbs and fat in grams a day."
      />
    </>
  );
};

export const MicronutrientsBlock: React.FC<{ clientId: string; today: string; days: number; firstName: string }> = ({ clientId, today, days, firstName }) => {
  const since = addDays(today, -(days - 1));
  const food = useRead(true, () => fetchFoodEntries(clientId, since), [clientId, since]);
  const g = gate(food);
  if (g) return g;
  const entries = food.data ?? [];
  return <Micros entries={entries} loggedDays={new Set(entries.map((e) => e.day)).size} n={days} firstName={firstName} />;
};
