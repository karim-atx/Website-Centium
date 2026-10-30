import React, { useMemo } from "react";
import { Activity, Dumbbell, Eye, Footprints } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { signedNum } from "../proRules";
import { ProChart } from "../ProChart";
import { LeafStreak } from "../LeafStreak";
import { LockLine } from "../LockLine";
import { OfflineLine } from "../states";
import { Chip, ListCard, SectionHead } from "../client/kit";
import { fetchActivityDays, fetchActivityHours, fetchWorkouts, type Workout } from "../../../services/pro/insights";
import { DAY_LETTERS, DAY_LONG } from "../../../utils/week";
import { addDays, bucketLabel, bucketTitle, bucketsFor, dayLabel, mondayOf, RANGE_DAYS, streakOf, sumByBucket, meanByBucket, weekdayIndex, type ChartRange } from "./insightsModel";
import { InsightCard, InsightLine, NotShared, QuietLine, StatBoxes, type StatBox } from "./parts";
import { readGate, useRead } from "./reads";
import type { PanelProps } from "./panelProps";
import { appLocale } from "../../../i18n/format";

/**
 * Release 3 · W5 Insights › Activity (TR9 v3; NU14 "Client insights ›
 * Activity") and the training read-only block (TR8 v3 "Training and
 * activity", source gen/r10.js activityLayer10, heatmap10, types10, gen/
 * r11.js trActivity11, gen/r14.js streak14):
 * - Daily activity: steps as bars, active minutes as a line on the same
 *   scale (scaled, the real minutes in the tooltip), workout days as teal
 *   points, the previous period as the ghost; Activity and vitals switch
 *   (activity_daily). The steps goal lives in metric_goals, which a
 *   professional can't read, so no goal line and no "days above goal"
 *   (see the W5 report);
 * - Weekly pattern: activity_hourly over the last 4 weeks, Monday first,
 *   Morning (5 to 11), Midday (11 to 5), Evening (5 to 10), Night;
 * - Activity types: Coming soon (no activity type is stored);
 * - Activity streak: days with a workout or active minutes, LeafStreak;
 * - Training: Workouts, Volume, Average RPE this week, Training per period
 *   (volume bars, RPE scaled, PR marks, last period ghost), Recent workouts
 *   (Workout activity switch: workout_sessions + logged sets).
 * Early data: fewer than 7 days shared ("{n} days shared so far. Patterns
 * appear after a week.").
 */

const fmt = (n: number) => Math.round(n).toLocaleString(appLocale("en-GB"));
const PARTS: { label: string; from: number; to: number }[] = [
  { label: "Morning", from: 5, to: 11 },
  { label: "Midday", from: 11, to: 17 },
  { label: "Evening", from: 17, to: 22 },
  { label: "Night", from: 22, to: 29 },
];

export const ActivityPanel: React.FC<PanelProps> = (p) => {
  const { clientId, firstName, access, range, onRange, today, lane } = p;
  const vitalsOn = access.has("health_metrics");
  const workoutsOn = access.has("workout_activity");
  const span = RANGE_DAYS[range];
  const since = addDays(today, -(span * 2 - 1));
  const days = useRead(vitalsOn, () => fetchActivityDays(clientId, addDays(today, -Math.max(span * 2, 400))), [clientId, since]);
  const hours = useRead(vitalsOn, () => fetchActivityHours(clientId, addDays(mondayOf(today), -21)), [clientId, today]);
  const workouts = useRead(workoutsOn, () => fetchWorkouts(clientId, addDays(today, -Math.max(span * 2, 400))), [clientId, since]);

  if (!vitalsOn && !workoutsOn)
    return (
      <NotShared
        icon={Activity}
        title="No shared data yet"
        line={`This fills in when ${firstName} shares Activity and vitals with you.`}
        askLabel={`Ask ${firstName} to share`}
        asked={p.asked.includes("health_metrics")}
        onAsk={() => p.onAsk("health_metrics")}
      />
    );

  return (
    <>
      {(days.offline || workouts.offline) && <OfflineLine />}
      {lane === "nutrition" && (
        <div className="flex items-center" style={{ gap: 8, borderRadius: 12, background: INK.soft, padding: "9px 12px", marginBottom: 12, fontSize: textPx(12), fontWeight: 600, color: INK.chS }}>
          <Eye size={14} strokeWidth={2} aria-hidden />
          {`Read only · from what ${firstName} shares`}
        </div>
      )}
      {vitalsOn ? readGate(days) ?? <DailyActivity {...p} rows={days.data ?? []} workouts={workouts.data ?? []} range={range} onRange={onRange} /> : <div style={{ marginBottom: 12 }}><LockLine what="Activity and vitals" clientFirstName={firstName} /></div>}
      {vitalsOn && hours.data && hours.data.length > 0 && <WeeklyPattern firstName={firstName} rows={hours.data} />}
      {vitalsOn && (
        <InsightCard title="Activity types" question={`What does ${firstName} do most?`}>
          <QuietLine>Coming soon. Centium doesn't store the type of each activity yet.</QuietLine>
        </InsightCard>
      )}
      {(days.data || workouts.data) && <ActivityStreak today={today} days={days.data ?? []} workouts={workouts.data ?? []} />}
      {workoutsOn ? readGate(workouts) ?? <Training {...p} workouts={workouts.data ?? []} /> : <div style={{ marginBottom: 12 }}><LockLine what="Workout activity" clientFirstName={firstName} /></div>}
    </>
  );
};

// ---------------------------------------------------------------------------

const DailyActivity: React.FC<PanelProps & { rows: { day: string; steps: number | null; activeMinutes: number | null }[]; workouts: Workout[]; range: ChartRange; onRange: (r: ChartRange) => void }> = ({ rows, workouts, range, onRange, today, firstName }) => {
  const dark = useIsDark();
  const ink = dark ? "#F5F3FA" : "#241F1B";
  const model = useMemo(() => {
    const b = bucketsFor(range, today);
    const g = bucketsFor(range, today, 1);
    const steps = rows.filter((r) => r.steps != null).map((r) => ({ day: r.day, value: r.steps as number }));
    const mins = rows.filter((r) => r.activeMinutes != null).map((r) => ({ day: r.day, value: r.activeMinutes as number }));
    const perDay = range === "W" || range === "M";
    const s = meanByBucket(b, steps);
    const m = meanByBucket(b, mins);
    const ghost = meanByBucket(g, steps);
    const wk = b.map((x) => workouts.filter((w) => w.day >= x.start && w.day <= x.end));
    const max = Math.max(1000, ...s.map((v) => v ?? 0), ...ghost.map((v) => v ?? 0)) * 1.1;
    const mMax = Math.max(1, ...m.map((v) => v ?? 0));
    const shared = new Set([...rows.map((r) => r.day), ...workouts.map((w) => w.day)]).size;
    return { b, s, m, ghost, wk, max, mMax, perDay, shared };
  }, [rows, workouts, range, today]);

  if (model.shared < 7) {
    return (
      <InsightCard title="Daily activity" question={`Is ${firstName} moving enough on most days?`}>
        <div className="flex items-end" style={{ gap: 6, height: 80 }} aria-hidden>
          {Array.from({ length: 7 }, (_, i) => {
            const day = addDays(today, i - 6);
            const r = rows.find((x) => x.day === day);
            const has = !!r?.steps;
            const top = Math.max(1, ...rows.map((x) => x.steps ?? 0));
            return <span key={i} className="flex-1" style={{ height: has ? `${Math.max(12, ((r?.steps ?? 0) / top) * 100)}%` : "100%", borderRadius: 5, ...(has ? { background: INK.pr } : { border: `1.5px dashed ${INK.b10}` }) }} />;
          })}
        </div>
        <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 10 }}>{`${model.shared} day${model.shared === 1 ? "" : "s"} shared so far. Patterns appear after a week.`}</p>
      </InsightCard>
    );
  }

  const scaled = model.m.map((v) => (v == null ? null : (v / model.mMax) * model.max * 0.6));
  const vals = model.s.filter((v): v is number => v != null);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  return (
    <ProChart
      title={`Daily activity, last ${RANGE_DAYS[range]} days`}
      question={`Is ${firstName} moving enough on most days?`}
      range={range}
      onRangeChange={onRange}
      x={model.b.map((x) => bucketLabel(range, x))}
      min={0}
      max={model.max}
      series={[
        { key: "steps", label: "Steps", type: "bar", color: INK.pr, values: model.s },
        { key: "mins", label: "Active minutes", type: "line", color: ink, values: scaled, noPoints: true },
        { key: "wk", label: "Workout", type: "points", color: INK.tealDark, swatch: "dot", values: model.wk.map((w, i) => (w.length ? (model.s[i] ?? model.max * 0.05) : null)) },
        { key: "prev", label: "Previous period", type: "line", color: INK.chT, ghost: true, values: model.ghost, hidden: true },
      ]}
      tooltip={(i) => {
        const steps = model.s[i];
        const mins = model.m[i];
        const w = model.wk[i];
        const parts = [steps != null ? `${fmt(steps)} steps` : "No steps", mins != null ? `${fmt(mins)} active min` : null, w.length ? w.map((x) => x.name).join(", ") : null].filter(Boolean);
        return { title: bucketTitle(range, model.b[i]), lines: [parts.join(" · ")] };
      }}
      summary={avg != null ? `Steps ${fmt(avg)} a day on average over the last ${RANGE_DAYS[range]} days.` : undefined}
    />
  );
};

const WeeklyPattern: React.FC<{ firstName: string; rows: { day: string; hour: number; steps: number }[] }> = ({ firstName, rows }) => {
  const grid = useMemo(() => {
    const sum = PARTS.map(() => Array(7).fill(0) as number[]);
    for (const r of rows) {
      const h = r.hour < 5 ? r.hour + 24 : r.hour;
      const pi = PARTS.findIndex((p) => h >= p.from && h < p.to);
      if (pi < 0) continue;
      sum[pi][weekdayIndex(r.day)] += r.steps;
    }
    const max = Math.max(0, ...sum.flat());
    const level = sum.map((row) => row.map((v) => (max > 0 && v > 0 ? Math.max(1, Math.ceil((v / max) * 3)) : 0)));
    let top: { p: number; d: number } | null = null;
    sum.forEach((row, pi) => row.forEach((v, d) => (top == null || v > sum[top.p][top.d] ? (top = { p: pi, d }) : null)));
    return { level, top: max > 0 ? (top as { p: number; d: number } | null) : null };
  }, [rows]);
  return (
    <InsightCard title="Weekly pattern" question={`When is ${firstName} usually active?`}>
      <div role="img" aria-label="Steps by part of the day and weekday, last 4 weeks" className="grid items-center" style={{ gridTemplateColumns: "62px repeat(7, minmax(0, 1fr))", gap: 4 }}>
        <span />
        {DAY_LETTERS.map((d, i) => (
          <span key={i} className="text-center" style={{ fontSize: textPx(10), fontWeight: 700, color: INK.chT }}>
            {d}
          </span>
        ))}
        {PARTS.map((part, pi) => (
          <React.Fragment key={part.label}>
            <span style={{ fontSize: textPx(11), fontWeight: 600, color: INK.chS }}>{part.label}</span>
            {grid.level[pi].map((x, d) => (
              <span key={d} style={{ height: 22, borderRadius: 6, background: x ? `rgba(111,153,147,${(0.25 + x * 0.25).toFixed(2)})` : INK.soft }} />
            ))}
          </React.Fragment>
        ))}
      </div>
      {grid.top && <InsightLine>{`Most steps fall on ${DAY_LONG[grid.top.d]} ${PARTS[grid.top.p].label.toLowerCase()}s.`}</InsightLine>}
    </InsightCard>
  );
};

const ActivityStreak: React.FC<{ today: string; days: { day: string; activeMinutes: number | null }[]; workouts: Workout[] }> = ({ today, days, workouts }) => {
  const s = useMemo(() => streakOf(new Set([...days.filter((d) => (d.activeMinutes ?? 0) > 0).map((d) => d.day), ...workouts.map((w) => w.day)]), today), [days, workouts, today]);
  return <LeafStreak title="Activity streak" current={s.current} best={s.best} label="days active" days={s.days} />;
};

// ---------------------------------------------------------------------------
// TR8 v3 · Training and activity (read only for Nutrition)
// ---------------------------------------------------------------------------

function sessionRpe(w: Workout): number | null {
  const r = w.exercises.flatMap((e) => e.sets.filter((s) => s.completed && s.rpe != null).map((s) => s.rpe as number));
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null;
}
function sessionVolume(w: Workout): number {
  if (w.volumeKg != null) return w.volumeKg;
  return w.exercises.reduce((t, e) => t + e.sets.reduce((s, x) => s + (x.completed && x.kg != null && x.reps != null && x.type !== "warmup" ? x.kg * x.reps : 0), 0), 0);
}
function prOf(w: Workout): string | null {
  for (const e of w.exercises) for (const s of e.sets) if (s.pr) return `PR ${e.name.toLowerCase()} ${s.kg ?? 0} x ${s.reps ?? 0}`;
  return null;
}

export const Training: React.FC<PanelProps & { workouts: Workout[] }> = ({ workouts, range, onRange, today, firstName }) => {
  const dark = useIsDark();
  const ink = dark ? "#F5F3FA" : "#241F1B";
  const wkStart = mondayOf(today);
  const thisWeek = workouts.filter((w) => w.day >= wkStart && w.day <= today);
  const lastWeek = workouts.filter((w) => w.day >= addDays(wkStart, -7) && w.day < wkStart);
  const first = workouts[0]?.day ?? null;
  const early = !first || first > addDays(today, -7);
  const vol = (list: Workout[]) => list.reduce((a, w) => a + sessionVolume(w), 0);
  const rpes = thisWeek.map(sessionRpe).filter((x): x is number => x != null);
  const boxes: StatBox[] = early
    ? [
        { label: "Workouts", value: "–", sub: "After a week of logs" },
        { label: "Volume", value: "–", sub: "After a week of logs" },
        { label: "Average RPE", value: "–", sub: "After a week of logs" },
      ]
    : [
        { label: "Workouts", value: String(thisWeek.length), delta: thisWeek.length !== lastWeek.length ? signedNum(thisWeek.length - lastWeek.length) : null, dir: thisWeek.length > lastWeek.length ? "up" : thisWeek.length < lastWeek.length ? "down" : null, sub: "This week" },
        (() => {
          const a = vol(thisWeek);
          const b = vol(lastWeek);
          const pct = b > 0 ? Math.round(((a - b) / b) * 100) : null;
          return { label: "Volume", value: fmt(a), unit: "kg", delta: pct ? `${signedNum(pct)}%` : null, dir: pct ? (pct > 0 ? "up" : "down") : null, sub: "This week" } as StatBox;
        })(),
        { label: "Average RPE", value: rpes.length ? (Math.round((rpes.reduce((x, y) => x + y, 0) / rpes.length) * 10) / 10).toString() : "–", sub: "This week" },
      ];

  const model = useMemo(() => {
    const b = bucketsFor(range, today);
    const g = bucketsFor(range, today, 1);
    const v = sumByBucket(b, workouts.map((w) => ({ day: w.day, value: sessionVolume(w) })));
    const gv = sumByBucket(g, workouts.map((w) => ({ day: w.day, value: sessionVolume(w) })));
    const r = meanByBucket(b, workouts.map((w) => ({ day: w.day, value: sessionRpe(w) ?? NaN })).filter((x) => !Number.isNaN(x.value)));
    const ws = b.map((x) => workouts.filter((w) => w.day >= x.start && w.day <= x.end));
    const max = Math.max(100, ...v.map((x) => x ?? 0), ...gv.map((x) => x ?? 0)) * 1.15;
    return { b, v, gv, r, ws, max };
  }, [workouts, range, today]);

  const recent = [...workouts].reverse().slice(0, 3);
  return (
    <>
      <SectionHead label="Training" />
      <StatBoxes boxes={boxes} />
      {early ? (
        <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 16, marginBottom: 12 }}>
          <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>Training per week</p>
          <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 8 }}>{`${workouts.length} workout${workouts.length === 1 ? "" : "s"} so far. Trends appear after the first full week.`}</p>
        </div>
      ) : (
        <ProChart
          title="Training per week"
          question={`Is ${firstName} training as planned, and is it getting harder or easier?`}
          range={range}
          onRangeChange={onRange}
          x={model.b.map((x) => bucketLabel(range, x))}
          min={0}
          max={model.max}
          series={[
            { key: "vol", label: "Volume (kg)", type: "bar", color: INK.pr, values: model.v },
            { key: "rpe", label: "RPE, scaled", type: "line", color: ink, values: model.r.map((x) => (x == null ? null : (x / 10) * model.max)) },
            { key: "prev", label: "Last block", type: "line", color: INK.chT, ghost: true, values: model.gv, hidden: true },
          ]}
          marks={model.ws.map((list, i) => (list.some((w) => prOf(w)) ? { index: i, label: "PR" } : null)).filter((m): m is { index: number; label: string } => !!m)}
          tooltip={(i) => {
            const list = model.ws[i];
            const r = model.r[i];
            const pr = list.map(prOf).find(Boolean);
            return {
              title: bucketTitle(range, model.b[i]),
              lines: [`${fmt(model.v[i] ?? 0)} kg · ${list.length} workout${list.length === 1 ? "" : "s"}`, [r != null ? `RPE ${Math.round(r * 10) / 10}` : null, pr].filter(Boolean).join(" · ")].filter(Boolean),
            };
          }}
          summary={`Training volume ${fmt(vol(thisWeek))} kg this week, ${thisWeek.length} workouts.`}
        />
      )}
      {recent.length > 0 && (
        <>
          <SectionHead label="Recent workouts" />
          <ListCard
            rows={recent.map((w) => {
              const r = sessionRpe(w);
              const when = w.day === today ? "Today" : w.day === addDays(today, -1) ? "Yesterday" : w.day > addDays(today, -7) ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][weekdayIndex(w.day)] : dayLabel(w.day);
              return {
                key: w.id,
                icon: w.exercises.length ? Dumbbell : Footprints,
                title: w.name,
                meta: [when, w.durationMin != null ? `${w.durationMin} min` : null, sessionVolume(w) > 0 ? `${fmt(sessionVolume(w))} kg` : null, r != null ? `RPE ${Math.round(r * 10) / 10}` : null].filter(Boolean).join(" · "),
                trailing: prOf(w) ? <Chip label="PR" tone="act" /> : undefined,
              };
            })}
          />
        </>
      )}
    </>
  );
};
