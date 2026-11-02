import React, { useMemo, useState } from "react";
import { CalendarRange, Clock, Dumbbell, FlaskConical, LineChart, ListOrdered, ThumbsDown, ThumbsUp, UtensilsCrossed } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useClientAccess } from "../../../hooks/useClientAccess";
import { textPx } from "../../../theme/textSize";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { INK, NO_ICON_SCALE } from "../proInk";
import { ProChart } from "../ProChart";
import { LockLine } from "../LockLine";
import { OfflineLine, ProCardSkeleton } from "../states";
import { Chip, ListCard, SectionHead } from "../client/kit";
import type { ProLane } from "../subtypeLanes";
import { fetchFoodEntries, fetchInsightTargets, fetchMetricRows, localMinute, type FoodEntry } from "../../../services/pro/insights";
import { sumNutrientMaps } from "../../../services/nutrition";
import { localIso } from "../../../services/pro/home";
import { NUTRIENT_SECTIONS, type NutrientRow } from "../../../data/nutrientSchema";
import { formatMinutes12, hourLabel12, rangeMinutes12 } from "../../../utils/time12";
import {
  addDays,
  bestWorst,
  bucketLabel,
  bucketTitle,
  bucketsFor,
  calorieBand,
  hm,
  inBandLine,
  macroGrams,
  macroSplit,
  mealClockOf,
  meanByBucket,
  mondayOf,
  RANGE_DAYS,
  tipDay,
  topFoods,
  type ChartRange,
  type DayTotals,
  type MealClock,
  type MealSlot,
} from "./insightsModel";
import { DetailHead, Group, InsightLine, QuietLine, RangeTabs } from "./parts";
import { readGate, useRead } from "./reads";
import { PAGE_RANGE_DAYS, type PageRange } from "./panelProps";
import { appLocale } from "../../../i18n/format";
import { isRtl, t, tk, tn, tx } from "../../../i18n/core";

/**
 * Release 3 · W5 NU7 Nutrient analysis (NU7 v3 Macros, best and worst days,
 * Intake fibre / sugar / sodium; NU7 v4 Intake meal timing clock; source
 * gen/r13.js analysis13, gen/r14.js mealClock14 and analysis14, gen/r6
 * nuAnalysis6 for Micros). Exported for the client page's Plan tab too:
 * `<NutrientAnalysis clientId lane />` (`onBack` adds the back button).
 *
 * Lanes (HANDOVER d): macro analysis Full coaching and Nutrition, read only
 * for Clinical overview (nothing here edits); micronutrient analysis
 * (the Micros tab, and Fibre, sugar and sodium) Nutrition only; for the
 * others not rendered and not computed. Food diary switch: off is a
 * LockLine and nothing is fetched.
 *
 * Numbers (HANDOVER i): macro split by kcal (4, 4, 9); macro grams = target
 * kcal × split ÷ 4 or 9; protein per kg against the latest shared weight;
 * best and worst days by the mean share off the three macro targets; the
 * meal timing clock only from rows with eaten_at (J8), fewer than 3 days:
 * early data; nutrient targets from the app's nutrient schema
 * (data/nutrientSchema.ts: fibre 28 g, added sugars 50 g, sodium 2,300 mg).
 */

type Tab = "macros" | "intake" | "micros";
const fmt = (n: number) => Math.round(n).toLocaleString(appLocale("en-GB"));
const MACRO_COLOURS = ["#7D6BB5", "#AEA1DC", "#A2C8C2"];
const SLOT_LABEL: Record<MealSlot, string> = { breakfast: tk("Breakfast"), lunch: tk("Lunch"), snack: tk("Snacks"), dinner: tk("Dinner") };
/** A list separator: "; " in English, the Arabic semicolon in Arabic. */
const semi = () => (isRtl() ? "؛ " : "; ");
/** "Protein up", "carbs steady"… one whole phrase per macro and direction. */
const MACRO_TREND: Record<string, Record<"up" | "down" | "steady", string>> = {
  Protein: { up: tk("Protein up"), down: tk("Protein down"), steady: tk("Protein steady") },
  carbs: { up: tk("carbs up"), down: tk("carbs down"), steady: tk("carbs steady") },
  fat: { up: tk("fat up"), down: tk("fat down"), steady: tk("fat steady") },
};

function totals(entries: FoodEntry[]): DayTotals[] {
  const m = new Map<string, DayTotals & { slots: Set<string> }>();
  for (const e of entries) {
    const d = m.get(e.day) ?? { day: e.day, kcal: 0, p: 0, c: 0, f: 0, meals: 0, slots: new Set<string>() };
    d.kcal += e.kcal;
    d.p += e.p;
    d.c += e.c;
    d.f += e.f;
    d.slots.add(e.meal);
    m.set(e.day, d);
  }
  return [...m.values()].map((d) => ({ day: d.day, kcal: d.kcal, p: d.p, c: d.c, f: d.f, meals: d.slots.size })).sort((a, b) => (a.day < b.day ? -1 : 1));
}

export const NutrientAnalysis: React.FC<{ clientId: string; lane: ProLane; onBack?: () => void }> = ({ clientId, lane, onBack }) => {
  const { professionalClients } = useApp();
  const rel = professionalClients.find((c) => c.clientId === clientId) ?? null;
  const name = rel ? `${rel.prefix ? `${rel.prefix} ` : ""}${rel.name}` : "";
  const firstName = rel?.name.split(" ")[0] ?? "";
  const access = useClientAccess(clientId);
  const deep = lane === "nutrition";
  const [tab, setTab] = useState<Tab>("macros");
  const [range, setRange] = useState<PageRange>("month");
  const [chartRange, setChartRange] = useState<ChartRange>("M");
  const [open, setOpen] = useState<string | null>(null);
  const today = localIso(new Date());
  const on = access.has("food_diary");
  const span = Math.max(RANGE_DAYS[chartRange] * 2, 56);
  const since = addDays(today, -span);
  const food = useRead(on, () => fetchFoodEntries(clientId, since), [clientId, since]);
  const targets = useRead(on, () => fetchInsightTargets(clientId, access.has("progress")), [clientId, access.access]);
  const weightOn = access.has("weight");
  const weight = useRead(on && weightOn, () => fetchMetricRows(clientId, ["weight"], addDays(today, -365)), [clientId, today]);

  const days = useMemo(() => totals(food.data ?? []), [food.data]);
  const n = PAGE_RANGE_DAYS[range];
  const windowStart = addDays(today, -(n - 1));
  const inWindow = days.filter((d) => d.day >= windowStart && d.day <= today);
  const entriesInWindow = (food.data ?? []).filter((e) => e.day >= windowStart && e.day <= today);

  const header = (
    <>
      {onBack ? (
        <DetailHead eyebrow={t("Nutrient analysis")} title={name} onBack={onBack} />
      ) : (
        <div style={{ marginBottom: 13 }}>
          <p style={{ fontSize: textPx(10.5), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.11em", color: INK.chF, marginBottom: 2 }}>{t("Nutrient analysis")}</p>
          <h2 style={{ fontSize: textPx(19), fontWeight: 700, letterSpacing: "-0.03em", color: INK.ch }}>{name}</h2>
        </div>
      )}
      <SegmentedTabs
        className="mb-[10px]"
        items={[{ key: "macros", label: t("Macros") }, { key: "intake", label: tx("Intake", "nutrition tab") }, ...(deep ? [{ key: "micros", label: t("Micros") }] : [])]}
        activeKey={tab}
        onChange={(k) => setTab(k as Tab)}
        tabHeight={36}
        labelSize={12}
      />
      <div className="flex justify-end" style={{ marginBottom: 10 }}>
        <RangeTabs value={range} onChange={setRange} />
      </div>
    </>
  );

  if (access.loading) return (<>{header}<ProCardSkeleton lines={4} height={200} /></>);
  if (!on) return (<>{header}<LockLine what={t("Food diary")} clientFirstName={firstName} /></>);
  const gate = readGate(food, 4);
  if (gate) return (<>{header}{gate}</>);

  const tgt = targets.data;
  const pct = tgt?.pct ?? null;
  const tGrams = tgt?.kcal && pct ? macroGrams(tgt.kcal, pct) : null;
  const latestKg = weight.data?.length ? weight.data[weight.data.length - 1].value : null;
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));

  return (
    <>
      {header}
      {food.offline && <OfflineLine />}
      {tab === "macros" && <Macros days={days} inWindow={inWindow} today={today} n={n} pct={pct} tGrams={tGrams} kg={latestKg} weightOn={weightOn} open={open} toggle={toggle} />}
      {tab === "intake" && (
        <Intake
          days={days}
          entries={entriesInWindow}
          allEntries={food.data ?? []}
          today={today}
          target={tgt?.kcal ?? null}
          firstName={firstName}
          range={chartRange}
          onRange={setChartRange}
          pageRange={range}
          fss={lane !== "clinical_overview"}
          deep={deep}
          open={open}
          toggle={toggle}
        />
      )}
      {tab === "micros" && deep && <Micros entries={entriesInWindow} loggedDays={inWindow.length} n={n} firstName={firstName} />}
    </>
  );
};

// ---------------------------------------------------------------------------
// Macros
// ---------------------------------------------------------------------------

const SplitBar: React.FC<{ label: string; split: [number, number, number] | null; faded?: boolean }> = ({ label, split, faded }) => (
  <div className="grid items-center" style={{ gridTemplateColumns: "76px minmax(0, 1fr)", gap: 8, marginTop: 10 }}>
    <span style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS }}>{label}</span>
    {split ? (
      <span className="flex overflow-hidden" style={{ height: 14, borderRadius: 9999, gap: 2, opacity: faded ? 0.55 : 1 }}>
        {split.map((v, i) => (
          <span key={i} className="flex items-center justify-center" style={{ flex: Math.max(v, 1), background: MACRO_COLOURS[i], fontSize: 9, fontWeight: 800, color: "#FFFFFF" }}>
            {v >= 8 ? `${v}%` : ""}
          </span>
        ))}
      </span>
    ) : (
      <span style={{ fontSize: textPx(11.5), color: INK.chF }}>{t("Nothing logged")}</span>
    )}
  </div>
);

const Macros: React.FC<{
  days: DayTotals[];
  inWindow: DayTotals[];
  today: string;
  n: number;
  pct: [number, number, number] | null;
  tGrams: [number, number, number] | null;
  kg: number | null;
  weightOn: boolean;
  open: string | null;
  toggle: (k: string) => void;
}> = ({ days, inWindow, today, n, pct, tGrams, kg, weightOn, open, toggle }) => {
  const dark = useIsDark();
  const sum = (list: DayTotals[]) => list.reduce((a, d) => ({ p: a.p + d.p, c: a.c + d.c, f: a.f + d.f }), { p: 0, c: 0, f: 0 });
  const td = days.find((d) => d.day === today);
  const avg = sum(inWindow);
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const start = addDays(mondayOf(today), -7 * (3 - i));
    return { start, end: addDays(start, 6) };
  });
  const prevWeeks = weeks.map((w) => ({ start: addDays(w.start, -28), end: addDays(w.end, -28) }));
  const weekly = (ws: { start: string; end: string }[], k: "p" | "c" | "f") =>
    ws.map((w) => {
      const l = days.filter((d) => d.day >= w.start && d.day <= w.end);
      return l.length ? l.reduce((a, d) => a + d[k], 0) / l.length : null;
    });
  const pW = weekly(weeks, "p");
  const cW = weekly(weeks, "c");
  const fW = weekly(weeks, "f");
  const pPrev = weekly(prevWeeks, "p");
  const gkg = kg ? pW.map((v) => (v == null ? null : Math.round((v / kg) * 100) / 100)) : null;
  const gkgPrev = kg ? pPrev.map((v) => (v == null ? null : Math.round((v / kg) * 100) / 100)) : null;
  const avgP = inWindow.length ? avg.p / inWindow.length : null;
  const targetGkg = kg && tGrams ? Math.round((tGrams[0] / kg) * 10) / 10 : null;
  const dirWord = (a: (number | null)[]) => {
    const v = a.filter((x): x is number => x != null);
    if (v.length < 2) return null;
    const d = (v[v.length - 1] - v[0]) / (v[0] || 1);
    return Math.abs(d) <= 0.05 ? "steady" : d > 0 ? "up" : "down";
  };
  const trendLine = ([["Protein", dirWord(pW)], ["carbs", dirWord(cW)], ["fat", dirWord(fW)]] as const)
    .filter((x) => x[1])
    .map((x) => t(MACRO_TREND[x[0]][x[1] as "up" | "down" | "steady"]))
    .join(isRtl() ? "، " : ", ");
  const bw = tGrams ? bestWorst(inWindow, tGrams) : null;
  const ink = dark ? "#C3B3FB" : "#7D6BB5";

  return (
    <>
      <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 14, marginBottom: 12 }}>
        <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>{t("Split vs target")}</p>
        <p style={{ fontSize: textPx(11.5), color: INK.chF }}>{n > 1 ? t("Today and {n}-day average", { n }) : t("Today")}</p>
        <SplitBar label={t("Today")} split={td ? macroSplit(td.p, td.c, td.f) : null} />
        {n > 1 && <SplitBar label={t("{n}-day avg", { n })} split={macroSplit(avg.p, avg.c, avg.f)} />}
        {pct ? <SplitBar label={t("Target")} split={pct.map((x) => Math.round(x)) as [number, number, number]} faded /> : <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 10 }}>{t("No macro targets set yet.")}</p>}
        <div className="flex" style={{ gap: 12, marginTop: 10, fontSize: textPx(10.5), color: INK.chF }}>
          <span>{t("Protein")}</span>
          <span>{t("Carbs")}</span>
          <span>{t("Fat")}</span>
        </div>
      </div>
      <Group
        id="pkg"
        icon={Dumbbell}
        title={t("Protein per kg")}
        line={
          !weightOn
            ? t("Weight isn't shared, so protein per kg can't be worked out.")
            : kg == null || avgP == null
              ? t("Needs a shared weigh-in and logged meals.")
              : targetGkg
                ? t("{gkg} g/kg; target {target} g/kg (weight {kg} kg, shared)", { gkg: Math.round((avgP / kg) * 10) / 10, target: targetGkg, kg })
                : t("{gkg} g/kg (weight {kg} kg, shared)", { gkg: Math.round((avgP / kg) * 10) / 10, kg })
        }
        open={open === "pkg"}
        onToggle={() => toggle("pkg")}
      >
        {gkg && gkg.some((v) => v != null) ? (
          <ProChart
            flat
            title={t("Protein per kg body weight")}
            x={[1, 2, 3, 4].map((n) => t("W{n}", { n }))}
            min={0}
            max={Math.max(targetGkg ?? 0, ...gkg.map((v) => v ?? 0), ...(gkgPrev ?? []).map((v) => v ?? 0)) * 1.3 || 2}
            goal={targetGkg ?? undefined}
            goalLegend={targetGkg ? t("Target {n}", { n: targetGkg }) : undefined}
            series={[
              { key: "g", label: t("g per kg"), type: "line", color: ink, values: gkg },
              { key: "l", label: t("Last month"), type: "line", color: INK.chT, ghost: true, values: gkgPrev ?? [] },
            ]}
            tooltip={(i) => (gkg[i] == null ? null : { title: t("Week {n}", { n: i + 1 }), lines: [t("{gkg} g/kg · {g} g a day", { gkg: gkg[i] as number, g: fmt(pW[i] ?? 0) })] })}
            summary={t("Protein {n} g per kg in the latest week.", { n: String(gkg[3] ?? gkg.filter((v) => v != null).pop()) })}
          />
        ) : (
          <div style={{ paddingBottom: 10 }}>
            <QuietLine>{t("Nothing to chart yet.")}</QuietLine>
          </div>
        )}
      </Group>
      <Group id="trend" icon={LineChart} title={t("Trends per macro")} line={trendLine || t("Needs two weeks of logs.")} open={open === "trend"} onToggle={() => toggle("trend")}>
        <ProChart
          flat
          title={t("Grams per day")}
          x={[1, 2, 3, 4].map((n) => t("W{n}", { n }))}
          min={0}
          max={Math.max(50, ...[...pW, ...cW, ...fW].map((v) => v ?? 0)) * 1.15}
          series={[
            { key: "p", label: t("Protein"), type: "line", color: MACRO_COLOURS[0], values: pW },
            { key: "c", label: t("Carbs"), type: "line", color: MACRO_COLOURS[1], values: cW },
            { key: "f", label: t("Fat"), type: "line", color: MACRO_COLOURS[2], values: fW },
          ]}
          tooltip={(i) => ({ title: t("Week {n}", { n: i + 1 }), lines: [t("Protein {p} g · carbs {c} g · fat {f} g", { p: fmt(pW[i] ?? 0), c: fmt(cW[i] ?? 0), f: fmt(fW[i] ?? 0) })] })}
          summary={trendLine ? t("{trends}, grams a day over 4 weeks.", { trends: trendLine }) : undefined}
        />
      </Group>
      <Group id="days" icon={CalendarRange} title={t("Best and worst days")} line={bw ? t("Best {best}, worst {worst}", { best: tipDay(bw.best.day), worst: tipDay(bw.worst.day) }) : tGrams ? t("Needs two logged days.") : t("Needs macro targets.")} open={open === "days"} onToggle={() => toggle("days")}>
        {bw ? (
          <ListCard
            rows={[
              {
                key: "b",
                icon: ThumbsUp,
                title: tipDay(bw.best.day),
                meta: bw.bestOnTarget
                  ? t("On target for all three macros · {kcal} kcal", { kcal: fmt(bw.best.kcal) })
                  : t("Protein {p} g, carbs {c} g, fat {f} g · {kcal} kcal", { p: fmt(bw.best.p), c: fmt(bw.best.c), f: fmt(bw.best.f), kcal: fmt(bw.best.kcal) }),
                trailing: <Chip label={t("Best")} tone="act" />,
              },
              { key: "w", icon: ThumbsDown, title: tipDay(bw.worst.day), meta: t("Fat {f} g, protein {p} g · {kcal} kcal", { f: fmt(bw.worst.f), p: fmt(bw.worst.p), kcal: fmt(bw.worst.kcal) }), trailing: <Chip label={t("Worst")} tone="att" /> },
            ]}
          />
        ) : (
          <div style={{ paddingBottom: 10 }}>
            <QuietLine>{tGrams ? t("Best and worst days appear once two days are logged.") : t("Best and worst days compare each day with the macro targets, and none are set yet.")}</QuietLine>
          </div>
        )}
      </Group>
    </>
  );
};

// ---------------------------------------------------------------------------
// Intake
// ---------------------------------------------------------------------------

const nutrientRow = (key: string): NutrientRow | undefined => NUTRIENT_SECTIONS.flatMap((s) => s.rows).find((r) => r.key === key);

const Intake: React.FC<{
  days: DayTotals[];
  entries: FoodEntry[];
  allEntries: FoodEntry[];
  today: string;
  target: number | null;
  firstName: string;
  range: ChartRange;
  onRange: (r: ChartRange) => void;
  pageRange: PageRange;
  fss: boolean;
  deep: boolean;
  open: string | null;
  toggle: (k: string) => void;
}> = ({ days, entries, allEntries, today, target, firstName, range, onRange, pageRange, fss, open, toggle }) => {
  const b = bucketsFor(range, today);
  const g = bucketsFor(range, today, 1);
  const kcal = meanByBucket(b, days.map((d) => ({ day: d.day, value: d.kcal })));
  const ghost = meanByBucket(g, days.map((d) => ({ day: d.day, value: d.kcal })));
  const band = target ? calorieBand(target) : null;
  const all = [...kcal, ...ghost, target].filter((x): x is number => x != null && x > 0);
  const lo = all.length ? Math.max(0, Math.floor((Math.min(...all) * 0.8) / 100) * 100) : 0;
  const hi = all.length ? Math.ceil((Math.max(...all) * 1.1) / 100) * 100 : 3000;
  const inRange = days.filter((d) => d.day >= b[0].start && d.day <= today);

  const clock = useMemo(
    () =>
      mealClockOf(
        entries
          .filter((e) => e.eatenAt)
          .map((e) => ({ day: e.day, minute: localMinute(e.eatenAt as string), meal: e.meal, kcal: e.kcal }))
      ),
    [entries]
  );
  const afterPct = Math.round(clock.afterSixShare * 100);
  const timingLine = clock.early ? t("Early data") : afterPct > 50 ? t("Most calories after {time}", { time: hourLabel12(18) }) : t("{pct}% of calories after {time}", { pct: afterPct, time: hourLabel12(18) });
  const tops = topFoods(entries.map((e) => ({ name: e.name, p: e.p, c: e.c, f: e.f })));
  // Food names are catalogue content (F13): they stay as logged.
  const topsLine = tops.fat && tops.protein ? t("{fat} tops fat; {protein} tops protein", { fat: tops.fat.name, protein: tops.protein.name }) : t("Nothing logged in this range.");

  const loggedDays = new Set(entries.map((e) => e.day)).size;
  const nt = sumNutrientMaps(entries.map((e) => e.nutrients));
  const perDay = (k: string) => (nt.present[k] && loggedDays ? nt.totals[k] / loggedDays : null);
  const fibre = perDay("dietary_fiber");
  const sugar = perDay("added_sugars");
  const sodium = perDay("sodium");
  const fT = nutrientRow("dietary_fiber")?.target ?? null;
  const sT = nutrientRow("added_sugars")?.target ?? null;
  const naT = nutrientRow("sodium")?.target ?? null;
  const fLow = fibre != null && fT != null && fibre < fT * 0.7;
  const naHigh = sodium != null && naT != null && sodium > naT;
  const sHigh = sugar != null && sT != null && sugar > sT;
  const fssLine =
    fibre == null && sugar == null && sodium == null
      ? t("No nutrient detail in the foods logged yet.")
      : [naHigh ? t("Sodium high") : null, sHigh ? t("sugar high") : null, fLow ? t("fibre low") : null].filter(Boolean).join(semi()).replace(/^./, (c) => c.toUpperCase()) || t("Within the limits");
  const late = clock.late;

  return (
    <>
      <ProChart
        title={t("Calories in vs target")}
        question={t("How do {firstName}'s logged days compare with the target?", { firstName })}
        range={range}
        onRangeChange={onRange}
        x={b.map((x) => bucketLabel(range, x))}
        min={lo}
        max={hi}
        band={band ? { ...band, label: t("On target") } : undefined}
        goal={target ?? undefined}
        series={[
          { key: "k", label: t("Calories"), type: "line", color: "#7D6BB5", values: kcal },
          { key: "g", label: t("Last period"), type: "line", color: INK.chT, ghost: true, values: ghost },
        ]}
        tooltip={(i) => {
          const v = kcal[i];
          if (v == null) return { title: bucketTitle(range, b[i]), lines: [t("Nothing logged")] };
          const diff = target ? Math.round(v - target) : null;
          return { title: bucketTitle(range, b[i]), lines: [`${t("{n} kcal", { n: fmt(v) })}${diff ? ` · ${diff > 0 ? t("{n} over", { n: fmt(Math.abs(diff)) }) : t("{n} under", { n: fmt(Math.abs(diff)) })}` : ""}`] };
        }}
        insight={band ? inBandLine(inRange.map((d) => ({ day: d.day, kcal: d.kcal })), band) ?? undefined : undefined}
        summary={target ? tn(inRange.length, "Calories on {n} logged day, target {target} kcal.", "Calories on {n} logged days, target {target} kcal.", { target: fmt(target) }) : tn(inRange.length, "Calories on {n} logged day.", "Calories on {n} logged days.")}
      />
      <Group id="time" icon={Clock} title={t("Meal timing")} line={timingLine} open={open === "time"} onToggle={() => toggle("time")}>
        {clock.early ? (
          <div style={{ paddingBottom: 10 }}>
            <QuietLine>{t("Early data. The meal timing clock needs 3 days logged with the time eaten; {n} so far.", { n: clock.days })}</QuietLine>
          </div>
        ) : (
          <MealClockView clock={clock} late={late} pageRange={pageRange} />
        )}
      </Group>
      <Group id="foods" icon={ListOrdered} title={t("Top foods per macro")} line={topsLine} open={open === "foods"} onToggle={() => toggle("foods")}>
        <ListCard
          rows={(
            [
              [tk("Protein"), tops.protein, tk("{pct}% of protein")],
              [tk("Carbs"), tops.carbs, tk("{pct}% of carbs")],
              [tk("Fat"), tops.fat, tk("{pct}% of fat")],
            ] as const
          )
            .filter((r) => r[1])
            .map((r) => ({ key: r[0], icon: UtensilsCrossed, title: t("{macro}: {food}", { macro: t(r[0]), food: r[1]!.name }), meta: t(r[2], { pct: Math.round(r[1]!.share * 100) }) }))}
        />
      </Group>
      {fss && (
        <Group id="fss" icon={FlaskConical} title={t("Fibre, sugar and sodium")} line={fssLine} open={open === "fss"} onToggle={() => toggle("fss")}>
          <ListCard
            rows={[
              { key: "fi", icon: FlaskConical, title: t("Fibre"), meta: fibre == null ? t("No data in the foods logged") : t("{n} g · target {target} g", { n: fmt(fibre), target: fT ?? "" }), trailing: fLow ? <Chip label={tx("Low", "intake")} tone="req" /> : undefined },
              { key: "su", icon: FlaskConical, title: t("Sugar"), meta: sugar == null ? t("No data in the foods logged") : t("{n} g · under {limit} g", { n: fmt(sugar), limit: sT ?? "" }), trailing: sHigh ? <Chip label={t("High")} tone="att" /> : undefined },
              { key: "na", icon: FlaskConical, title: t("Sodium"), meta: sodium == null ? t("No data in the foods logged") : t("{n} mg · limit {limit} mg", { n: fmt(sodium), limit: fmt(naT ?? 0) }), trailing: naHigh ? <Chip label={t("High")} tone="att" /> : undefined },
            ]}
          />
          {allEntries.length > 0 && <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5, paddingBottom: 10 }}>{t("Daily average over the days logged. Only foods with a full nutrient profile count.")}</p>}
        </Group>
      )}
    </>
  );
};

const MealClockView: React.FC<{ clock: MealClock; late: number; pageRange: PageRange }> = ({ clock, late, pageRange }) => {
  const dark = useIsDark();
  const S = 236;
  const c = S / 2;
  const R = 92;
  const P = (min: number, r: number): [number, number] => {
    const a = ((min / 1440) * 360 - 90) * (Math.PI / 180);
    return [c + r * Math.cos(a), c + r * Math.sin(a)];
  };
  const arc = (m0: number, m1: number, r: number) => {
    const a = P(m0, r);
    const b = P(m1, r);
    const big = (m1 - m0 + 1440) % 1440 > 720 ? 1 : 0;
    return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} A ${r} ${r} 0 ${big} 1 ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  };
  const colour: Record<MealSlot, string> = { breakfast: "#AEA1DC", lunch: "#7D6BB5", snack: "#A2C8C2", dinner: dark ? "#C3B3FB" : "#5F5093" };
  const fastMid = (clock.windowEnd + clock.fastMinutes / 2) % 1440;
  const np = P(fastMid, R + 24);
  const biggest = [...clock.meals].sort((a, b) => b.share - a.share)[0];
  const latest = [...clock.meals].sort((a, b) => b.minute - a.minute)[0];
  const after = Math.round(clock.afterSixShare * 100);
  return (
    <div style={{ paddingBottom: 6 }}>
      <div className="flex justify-center" style={{ margin: "2px 0 6px" }}>
        <div className="relative" style={{ width: S, height: S }}>
          <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ overflow: "visible", ...NO_ICON_SCALE }} role="img" aria-label={t("Average meal times on a 24-hour clock. Eating window {window}, {range}.", { window: hm(clock.windowMinutes), range: rangeMinutes12(clock.windowStart, clock.windowEnd) })}>
            <circle cx={c} cy={c} r={R} fill="none" stroke={INK.soft} strokeWidth={16} />
            <path d={arc(clock.windowStart, clock.windowEnd, R)} fill="none" stroke={dark ? "rgba(169,145,254,0.28)" : "#E4DEF6"} strokeWidth={16} strokeLinecap="round" />
            <path d={arc(clock.windowEnd, clock.windowStart, R + 14)} fill="none" stroke={INK.tealDark} strokeWidth={1.6} strokeDasharray="3 3" />
            {Array.from({ length: 24 }, (_, h) => {
              const a = P(h * 60, R - 12);
              const b2 = P(h * 60, R - (h % 6 === 0 ? 18 : 15));
              return <line key={h} x1={a[0]} y1={a[1]} x2={b2[0]} y2={b2[1]} stroke={INK.chT} strokeWidth={h % 6 === 0 ? 1.6 : 1} />;
            })}
            {[0, 6, 12, 18].map((h) => {
              const p = P(h * 60, R - 30);
              return (
                <text key={h} x={p[0]} y={p[1] + 3.5} textAnchor="middle" fontSize={9} fontWeight={800} fill={INK.chF}>
                  {hourLabel12(h)}
                </text>
              );
            })}
            {clock.points.map((e, i) => {
              const p = P(e.minute, R);
              const isLate = e.minute >= 22 * 60;
              return <circle key={i} cx={p[0]} cy={p[1]} r={isLate ? 2.4 : 1.7} fill={isLate ? INK.hi : colour[e.meal]} opacity={isLate ? 1 : 0.65} />;
            })}
            {clock.meals.map((m) => {
              const p = P(m.minute, R);
              return <circle key={m.meal} cx={p[0]} cy={p[1]} r={5 + (m.share * 100) / 6} fill={colour[m.meal]} stroke={INK.card} strokeWidth={2.4} />;
            })}
            <text x={np[0]} y={np[1]} textAnchor="middle" fontSize={9} fontWeight={800} fill={INK.tealDark}>
              {t("Fast {time}", { time: hm(clock.fastMinutes) })}
            </text>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span style={{ fontSize: textPx(24), fontWeight: 800, letterSpacing: "-0.03em", color: INK.ch, lineHeight: 1 }}>{hm(clock.windowMinutes)}</span>
            <span style={{ fontSize: textPx(10.5), color: INK.chF, marginTop: 4 }}>{t("eating window")}</span>
            <span style={{ fontSize: textPx(10.5), fontWeight: 700, color: INK.chS }}>{rangeMinutes12(clock.windowStart, clock.windowEnd)}</span>
          </div>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "6px 12px", fontSize: textPx(12), color: INK.ch, marginBottom: 8 }}>
        {clock.meals.map((m) => (
          <span key={m.meal} className="flex items-center" style={{ gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 9999, background: colour[m.meal], flexShrink: 0 }} />
            <span className="flex-1">{`${t(SLOT_LABEL[m.meal])} ${Math.round(m.share * 100)}%`}</span>
            <span style={{ color: INK.chF, fontVariantNumeric: "tabular-nums" }}>{formatMinutes12(m.minute)}</span>
          </span>
        ))}
      </div>
      <p className="flex items-center" style={{ gap: 6, fontSize: textPx(11), color: INK.chF, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: 9999, background: INK.hi }} />
        {pageRange === "month"
          ? t("Late snacks after {time} · {n} this month", { time: formatMinutes12(22 * 60), n: late })
          : pageRange === "week"
            ? t("Late snacks after {time} · {n} this week", { time: formatMinutes12(22 * 60), n: late })
            : t("Late snacks after {time} · {n} today", { time: formatMinutes12(22 * 60), n: late })}
      </p>
      <InsightLine top={0}>
        {biggest && latest && biggest.meal === latest.meal
          ? t("{pct}% of calories after {time}; {meal} is the biggest meal and the latest.", { pct: after, time: formatMinutes12(18 * 60), meal: t(SLOT_LABEL[biggest.meal]).toLowerCase() })
          : t("{pct}% of calories after {time}.", { pct: after, time: formatMinutes12(18 * 60) })}
      </InsightLine>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Micros (Nutrition only)
// ---------------------------------------------------------------------------

const MICRO_KEYS = ["sodium", "saturated_fat", "iron", "calcium", "vitamin_d", "potassium", "dietary_fiber", "vitamin_c", "vitamin_a", "added_sugars"];

export const Micros: React.FC<{ entries: FoodEntry[]; loggedDays: number; n: number; firstName: string }> = ({ entries, loggedDays, n, firstName }) => {
  const nt = sumNutrientMaps(entries.map((e) => e.nutrients));
  const rows = MICRO_KEYS.map((k) => nutrientRow(k))
    .filter((r): r is NutrientRow => !!r && r.target != null && (r.kind === "goal" || r.kind === "limit"))
    .map((r) => {
      const per = nt.present[r.key] && loggedDays ? nt.totals[r.key] / loggedDays : null;
      const pctOf = per != null ? Math.round((per / (r.target as number)) * 100) : null;
      const flag = pctOf == null ? null : r.kind === "limit" ? (pctOf > 100 ? "high" : null) : pctOf < 70 ? "low" : null;
      return { r, per, pctOf, flag };
    });
  const below = rows.filter((x) => x.flag === "low").length;
  const any = rows.some((x) => x.per != null);
  return (
    <>
      <SectionHead label={t("Micronutrients · % of target")} />
      {!any ? (
        <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 16, marginBottom: 12 }}>
          <QuietLine>{t("No nutrient detail in the foods logged yet.")}</QuietLine>
        </div>
      ) : (
        <>
          <p style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.ch, marginBottom: 8 }}>{t("Micronutrient highlights · {n} below target", { n: below })}</p>
          <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "6px 14px", marginBottom: 12 }}>
            {rows.map((x, i) => (
              <div key={x.r.key} className="flex justify-between" style={{ padding: "9px 0", borderTop: i ? `1px solid ${INK.b06}` : "none", fontSize: textPx(12.5), gap: 8 }}>
                <span style={{ fontWeight: 600, color: INK.ch }}>{x.r.name}</span>
                <span className="whitespace-nowrap" style={{ color: INK.chF }}>
                  {x.per == null ? t("No data") : `${x.per >= 100 ? fmt(x.per) : Math.round(x.per * 10) / 10} ${x.r.unit} · `}
                  {x.pctOf != null && <b style={{ color: x.flag ? INK.hi : INK.chS }}>{`${x.pctOf}%`}</b>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5 }}>{t("From {logged} of {n} days {firstName} logged. Micronutrients only count foods with a full nutrient profile.", { logged: loggedDays, n, firstName })}</p>
    </>
  );
};
