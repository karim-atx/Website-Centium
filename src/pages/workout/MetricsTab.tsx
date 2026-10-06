import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { Sparkline } from "../../components/health/Sparkline";
import { OneRepMaxesSheet } from "../../components/workout/OneRepMaxesSheet";
import { LiftDetailSheet } from "../../components/workout/LiftDetailSheet";
import { kgWhole, liftMaxes, sortLifts, type LiftMax } from "../../services/workout/oneRepMax";
import {
  chipColors,
  kiloTick,
  pointStats,
  trainingFrequency,
  volumePoints,
  volumeTicks,
  type VolumeMode,
} from "../../services/workout/metrics";
import { HeroCard } from "../../components/ui/HeroCard";
import { useIsDark } from "../../hooks/useIsDark";
import { liftTo, tintOn } from "../../data/folderColors";
import { TrendChart, type TrendGeometry } from "../../components/charts/TrendChart";
import { todayLocal } from "../../utils/date";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { ChevronRight, Plus } from "lucide-react";
import { countsTowardVolume } from "../../services/workout/session";
import {
  deleteMeasurement,
  getMeasurementGoals,
  getMeasurements,
  logMeasurements,
  setMeasurementGoal,
  updateMeasurement,
  type MeasurementGoal,
  type MeasurementReading,
} from "../../services/measurements";
import { Toast } from "../../components/ui/Toast";
import { MEASUREMENT_SITES, type MeasurementType } from "../../services/measurements/sites";
import { AddMeasurementsSheet } from "../../components/workout/AddMeasurementsSheet";
import { MeasurementHistorySheet } from "../../components/workout/MeasurementHistorySheet";
import { textPx } from "../../theme/textSize";

// Handover 2026-09-29 WO4.1: the volume hero (per workout or per week, with
// the scrubbed point's stats), One-rep maxes (the six highest; All opens
// WO18, a tile WO19), Balance, Training frequency (the last 8 weeks) and Body
// measurements (WO16). Body composition and the Adherence card are gone; no
// data is deleted by removing them.

const balanceColors: Record<string, string> = {
  back: "rgb(var(--th-7d6bb5))",
  chest: "#D9A441",
  shoulders: "rgb(var(--th-6f9993))",
  quads: "#4C8FD1",
  hamstrings: "#9C4F7C",
  glutes: "#C97B84",
  bicep: "rgb(var(--th-8c7cc4))",
  tricep: "#B58F5A",
  core: "#5FA88F",
  cardio: "#E08E6D",
  olympic: "#6B8FB5",
};

/**
 * Mobile v5.1 R3, dark mode (no light islands), as [light, dark]. The teal
 * ink and tiles take secondary.deeper / secondary.tint dark (the kg unit and
 * sparkline secondary.deep dark); the purple link and this week's bar
 * primary.deep / primary.accent dark, the other weeks' bars the lavender
 * #AEA1DC at 38% on the card (derived); the empty balance track the v5.1 dark
 * empty track; the card border the dark hairline. The change colours are
 * lifted to 4.5:1 on the dark teal tile, the hero's accent to 4.5:1 on the
 * dark hero band (derived with liftTo).
 */
const COLORS = {
  teal: ["rgb(var(--th-3b7570))", "rgb(var(--th-a3c7c0))"],
  tealTile: ["#F2F7F6", "#293339"],
  tealUnit: ["rgb(var(--th-86b3ad))", "rgb(var(--th-7fb3a9))"],
  spark: ["rgb(var(--th-6f9993))", "rgb(var(--th-7fb3a9))"],
  purple: ["rgb(var(--th-8f68f6))", "rgb(var(--th-b7abde))"],
  barNow: ["rgb(var(--th-8f68f6))", "rgb(var(--th-9a8cd6))"],
  bar: ["rgb(var(--th-e6defd))", "rgb(var(--th-53506c))" /* tintOn("#AEA1DC", 0.38) */],
  emptyTrack: ["#F2F2F2", "#262932"],
  cardBorder: ["#EEEDED", "rgba(238,239,242,0.08)"],
  up: ["#8A5878", liftTo("#8A5878", "#293339")],
  down: ["rgb(var(--th-3c6b65))", "rgb(var(--th-809f9b))" /* liftTo("#3C6B65", "#293339") */],
  heroAccent: ["rgb(var(--th-5b3fe4))", "rgb(var(--th-9d8cef))" /* liftTo("#5B3FE4", "#303141") */],
} as const;
const metricColor = (key: keyof typeof COLORS, dark: boolean): string => COLORS[key][dark ? 1 : 0];

/** The dominant-group chip: chipColors in light; in dark the hue at 20% on the card, its text lifted to 4.5:1. */
const themedChip = (hex: string, dark: boolean): { background: string; color: string } => {
  if (!dark) return chipColors(hex);
  const background = tintOn(hex, 0.2);
  return { background, color: liftTo(hex, background) };
};

export default function MetricsTab() {
  const {
    workoutSessions,
    exerciseCatalog,
    customExercises,
    authUserId,
    noteFeatureMilestone,
    refreshAchievements,
  } = useApp();

  // Explorer milestone: "By the numbers". One row per account for ever — the repeat is
  // a primary-key conflict the service treats as the success it is. 
  useEffect(() => {
    noteFeatureMilestone("workout_metrics");
  }, [noteFeatureMilestone]);

  const [oneRmOpen, setOneRmOpen] = useState(false);
  const [liftDetail, setLiftDetail] = useState<LiftMax | null>(null);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [volumeMode, setVolumeMode] = useState<VolumeMode>("workout");
  const [heroPick, setHeroPick] = useState<number | null>(null);
  const dark = useIsDark();
  const c = (key: keyof typeof COLORS) => metricColor(key, dark);

  /**
   * Completed sets per primary muscle group, across every logged session.
   *
   * MATCHED BY ID, NOT BY NAME. A logged exercise carries the library
   * reference it was performed against — catalogExerciseId or
   * customExerciseId — and matching on the NAME instead meant a movement
   * stopped counting the moment it was renamed: every set of "Sandbag Carry"
   * vanished from this chart when it became "Sandbag Shuttle Run", because
   * the log keeps the name it was logged under and the library no longer had
   * one to match. Renaming your own exercise is not a reason to lose your
   * training history.
   *
   * The name is still the LAST resort, for rows written before those
   * references existed — services/workout/log's header is explicit that they
   * were left null and are not backfilled.
   */
  const muscleGroupTally = useMemo(() => {
    const catalogById = new Map(exerciseCatalog.map((e) => [e.id, e]));
    const customById = new Map(customExercises.filter((e) => e.id).map((e) => [e.id!, e]));
    const byName = new Map(exerciseCatalog.map((e) => [e.name, e]));

    const tally: Record<string, number> = {};
    for (const session of workoutSessions) {
      for (const ex of session.exercises) {
        const definition =
          (ex.catalogExerciseId ? catalogById.get(ex.catalogExerciseId) : undefined) ??
          (ex.customExerciseId ? customById.get(ex.customExerciseId) : undefined) ??
          byName.get(ex.name);
        const group = definition?.muscleGroups?.[0];
        if (!group) continue;
        tally[group] = (tally[group] ?? 0) + ex.sets.filter(countsTowardVolume).length;
      }
    }
    return tally;
  }, [workoutSessions, exerciseCatalog, customExercises]);

  const totalSets = Object.values(muscleGroupTally).reduce((a, b) => a + b, 0);
  const sortedGroups = Object.entries(muscleGroupTally).sort((a, b) => b[1] - a[1]);
  const topGroup = sortedGroups[0];
  const dominantShare = topGroup && totalSets > 0 ? topGroup[1] / totalSets : 0;

  // Body measurements, read here rather than held in AppContext.
  //
  // THIS IS THE ONLY SCREEN THAT SHOWS THEM, and they are neither needed at
  // startup nor by anything else — unlike weight and water, which the Health
  // page, the diary and the professional roster all read. Fetching them on
  // mount keeps fourteen more metric types out of the global state every
  // account carries.
  const [bySite, setBySite] = useState<Partial<Record<MeasurementType, MeasurementReading[]>>>({});
  const [measurementsError, setMeasurementsError] = useState<string | null>(null);
  const [addMeasurementsOpen, setAddMeasurementsOpen] = useState(false);
  const [historyType, setHistoryType] = useState<MeasurementType | null>(null);
  const [goals, setGoals] = useState<Partial<Record<MeasurementType, MeasurementGoal>>>({});
  // WO16 delete: the reading is hidden at once and deleted on the server when
  // its Undo toast expires (approved decision 4), or when another toast
  // replaces it, or when this screen goes away.
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState<{ id: string } | null>(null);

  /**
   * Re-read after a write, so the card reflects what the database now holds
   * rather than what this screen hoped it would.
   *
   * A FAILED READ LEAVES THE PREVIOUS VALUES ALONE and says so. Clearing them
   * would render a dropped connection as "you have never measured yourself",
   * which is the mistake getHealthMetrics documents at length.
   */
  const loadMeasurements = useCallback(async () => {
    if (!authUserId) return;
    const result = await getMeasurements(authUserId);
    if (!result.ok) {
      setMeasurementsError(result.message);
      return;
    }
    setMeasurementsError(null);
    setBySite(result.bySite);
  }, [authUserId]);
  const pendingDelete = useRef<string | null>(null);
  const flushDelete = useCallback(() => {
    const id = pendingDelete.current;
    pendingDelete.current = null;
    if (!id) return;
    void (async () => {
      const result = await deleteMeasurement(id);
      if (!result.ok) setMeasurementsError(result.message ?? "Couldn't delete that reading.");
      await loadMeasurements();
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    })();
  }, [loadMeasurements]);
  useEffect(() => () => flushDelete(), [flushDelete]);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void (async () => {
      const goalsResult = await getMeasurementGoals(authUserId);
      if (!cancelled && goalsResult.ok) setGoals(goalsResult.goals);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void (async () => {
      const result = await getMeasurements(authUserId);
      // Nothing is set after the screen has gone, and nothing is set from a
      // response that arrived for a previous account.
      if (cancelled) return;
      if (!result.ok) {
        setMeasurementsError(result.message);
        return;
      }
      setMeasurementsError(null);
      setBySite(result.bySite);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId]);


  /** Every site's readings, less any waiting on an Undo toast. */
  const visibleBySite = useMemo(() => {
    if (hiddenIds.size === 0) return bySite;
    const out: Partial<Record<MeasurementType, MeasurementReading[]>> = {};
    for (const [type, list] of Object.entries(bySite) as [MeasurementType, MeasurementReading[]][])
      out[type] = list.filter((r) => !hiddenIds.has(r.id));
    return out;
  }, [bySite, hiddenIds]);

  /** Sites with at least one reading, in the vocabulary's own order. */
  const measuredSites = useMemo(
    () =>
      MEASUREMENT_SITES.map((site) => ({ site, readings: visibleBySite[site.type] ?? [] })).filter(
        (s) => s.readings.length > 0
      ),
    [visibleBySite]
  );


  const today = todayLocal();
  const hero = useMemo(() => volumePoints(workoutSessions, volumeMode), [workoutSessions, volumeMode]);
  const heroSel = heroPick !== null && heroPick < hero.length ? heroPick : hero.length - 1;
  const stats = hero.length ? pointStats(hero[heroSel].sessions) : null;
  const heroTicks = volumeTicks(Math.max(0, ...hero.map((p) => p.volumeKg)));
  const lifts = useMemo(() => sortLifts(liftMaxes(workoutSessions, today), "highest"), [workoutSessions, today]);
  const frequency = useMemo(() => trainingFrequency(workoutSessions, today), [workoutSessions, today]);
  const freqMax = Math.max(3, ...frequency.weeks);
  const dominant = topGroup && dominantShare > 0.45 ? topGroup[0] : null;
  const chip = dominant ? themedChip(balanceColors[dominant] ?? "#B8AFC8", dark) : null;
  const groupLabel = (g: string) => g.charAt(0).toUpperCase() + g.slice(1).replace(/_/g, " ");

  return (
    <div className="animate-fade-slide-up flex flex-col" style={{ gap: 10 }}>
      {/* WO4.1 hero: volume per workout or per Monday–Sunday week, with the
          selected point's stats in the band below. */}
      <HeroCard
        topPadding="16px 0 0"
        bottomPadding="0"
        top={
          <>
            <div className="flex items-center justify-between" style={{ padding: "0 17px", height: 26 }}>
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: textPx(9.5), fontWeight: 700, letterSpacing: "0.14em" }}>
                VOLUME
              </span>
              <div
                role="tablist"
                aria-label="Volume by"
                className="flex"
                style={{ height: 26, padding: 2, gap: 2, borderRadius: 9, background: "rgba(255,255,255,0.22)" }}
              >
                {(["workout", "week"] as const).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={volumeMode === m}
                    onClick={() => {
                      setVolumeMode(m);
                      setHeroPick(null);
                    }}
                    className="tap"
                    style={{
                      padding: "0 9px",
                      borderRadius: 7,
                      fontSize: textPx(11),
                      fontWeight: 700,
                      // Dark: the selected segment is the dark card, not a white pill.
                      background: volumeMode === m ? (dark ? "rgb(var(--c-cream-card))" : "#FFFFFF") : "transparent",
                      color: volumeMode === m ? (dark ? "rgb(var(--c-charcoal))" : "rgb(var(--thi-463a80))") : "#FFFFFF",
                    }}
                  >
                    {m === "workout" ? "By workout" : "By week"}
                  </button>
                ))}
              </div>
            </div>
            <TrendChart
              key={volumeMode}
              points={hero.map((p) => ({ t: p.t, value: p.volumeKg, label: shortDay(p.day) }))}
              color="#FFFFFF"
              unit="kg"
              formatDate={(t) => shortDay(new Date(t).toISOString().slice(0, 10))}
              ariaLabel={volumeMode === "workout" ? "Volume by workout" : "Volume by week"}
              tone="card"
              geometry={HERO_GEOMETRY}
              unitOnAxis={false}
              evenX
              dots="selected"
              ticks={heroTicks}
              formatTick={kiloTick}
              scrubText={(p) => p.label}
              dateCount={4}
              emptyText="No sessions yet"
              selected={heroPick}
              onSelect={setHeroPick}
            />
          </>
        }
        bottom={
          // Decision 10: all six stats fit without scrolling, as two rows of
          // three (one row needed 392px, more than the card at 360-430).
          <div className="grid grid-cols-3" style={{ columnGap: 12, rowGap: 10, padding: "12px 16px" }}>
            <HeroFigure value={stats ? stats.volumeKg.toLocaleString() : null} unit="kg" label="Volume" accent />
            <HeroFigure value={stats?.oneRmKg != null ? kgWhole(stats.oneRmKg) : null} unit="kg" label="1RM" />
            <HeroFigure value={stats?.maxWeightKg ?? null} unit="kg" label="Max weight" />
            <HeroFigure value={stats ? stats.sets : null} label="Sets" />
            <HeroFigure value={stats ? stats.reps : null} label="Reps" />
            <HeroFigure value={stats?.seconds ?? null} label="Seconds" />
          </div>
        }
      />

      <MetricCard
        icon="/metrics/orm-teal.png"
        title="One-rep maxes"
        right={
          lifts.length === 0 ? (
            <span style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(11) }}>None yet</span>
          ) : (
            <button
              onClick={() => setOneRmOpen(true)}
              className="tap flex items-center"
              style={{ color: c("teal"), fontSize: textPx(12.5), fontWeight: 600, gap: 3 }}
            >
              All {lifts.length} <ChevronRight size={13} />
            </button>
          )
        }
      >
        {lifts.length > 0 && (
          <div className="grid grid-cols-3" style={{ gap: "6px 7px", marginTop: 11 }}>
            {lifts.slice(0, 6).map((lift) => (
              <button
                key={lift.key}
                onClick={() => setLiftDetail(lift)}
                className="tap text-left min-w-0"
                style={{ background: c("tealTile"), borderRadius: 10, padding: "8px 9px", minHeight: 55 }}
              >
                <span className="block truncate" style={{ color: c("teal"), fontSize: textPx(11), fontWeight: 500 }}>
                  {lift.name}
                </span>
                <span className="block" style={{ color: c("teal"), fontSize: textPx(15), fontWeight: 800, marginTop: 2 }}>
                  {kgWhole(lift.oneRm)}
                  <span style={{ color: c("tealUnit"), fontSize: textPx(10), fontWeight: 600, marginLeft: 2 }}>kg</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </MetricCard>

      <MetricCard
        icon="/metrics/balance.png"
        title="Balance"
        right={
          totalSets === 0 ? (
            <span style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(11) }}>No sets yet</span>
          ) : chip ? (
            <span
              style={{ ...chip, borderRadius: 6, padding: "2px 7px", fontSize: textPx(11.5), fontWeight: 600 }}
            >
              {groupLabel(dominant!)}-heavy lately
            </span>
          ) : null
        }
      >
        <div className="flex overflow-hidden" style={{ height: 10, borderRadius: 5, gap: 2, marginTop: 12, background: totalSets === 0 ? c("emptyTrack") : undefined }}>
          {sortedGroups.map(([group, count]) => (
            <div key={group} style={{ width: `${(count / totalSets) * 100}%`, background: balanceColors[group] ?? "#B8AFC8" }} />
          ))}
        </div>
        {totalSets > 0 && (
          <>
            <div className="grid grid-cols-4" style={{ marginTop: 10, gap: 6 }}>
              {sortedGroups.slice(0, 4).map(([group, count]) => (
                <div key={group} className="min-w-0">
                  <span className="flex items-center truncate" style={{ gap: 4, color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(10.5) }}>
                    <span className="flex-none" style={{ width: 6, height: 6, borderRadius: 3, background: balanceColors[group] ?? "#B8AFC8" }} />
                    {groupLabel(group)}
                  </span>
                  <span className="block" style={{ color: "rgb(var(--c-charcoal))", fontSize: textPx(13), fontWeight: 800, marginTop: 2 }}>
                    {Math.round((count / totalSets) * 100)}%
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end" style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgb(var(--c-charcoal) / 0.07)" }}>
              <button
                onClick={() => setBalanceOpen(true)}
                className="tap flex items-center"
                style={{ color: c("purple"), fontSize: textPx(12), fontWeight: 700, gap: 3 }}
              >
                Full breakdown <ChevronRight size={13} />
              </button>
            </div>
          </>
        )}
      </MetricCard>

      <MetricCard
        icon="/metrics/freq.png"
        title="Training frequency"
        right={
          workoutSessions.length === 0 ? (
            <span style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(11) }}>No sessions yet</span>
          ) : (
            <span style={{ color: "rgb(var(--c-charcoal))", fontSize: textPx(20), fontWeight: 800 }}>
              {frequency.perWeek}
              <span style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(11), fontWeight: 500, marginLeft: 3 }}>/ week</span>
            </span>
          )
        }
      >
        <div className="flex items-end" style={{ height: 33, gap: 6, marginTop: 11 }} aria-label="Sessions per week, last 8 weeks">
          {frequency.weeks.map((count, i) => (
            <span
              key={i}
              className="flex-1"
              style={{
                height: count ? Math.max(4, Math.round((count / freqMax) * 33)) : 2,
                borderRadius: count ? 4 : 1,
                background: i === 7 && count ? c("barNow") : c("bar"),
              }}
            />
          ))}
        </div>
        <div className="flex justify-between" style={{ marginTop: 6, fontSize: textPx(9.5) }}>
          <span style={{ color: "rgb(var(--c-charcoal-muted))" }}>8 wks ago</span>
          <span style={{ color: c("purple"), fontWeight: 700 }}>
            This week{workoutSessions.length ? ` · ${frequency.weeks[7]}` : ""}
          </span>
        </div>
      </MetricCard>

      <MetricCard
        icon="/metrics/body.png"
        title="Body measurements"
        right={
          measuredSites.length === 0 && !measurementsError ? (
            <button
              onClick={() => setAddMeasurementsOpen(true)}
              className="tap flex items-center"
              style={{ height: 26, padding: "0 10px", gap: 4, borderRadius: 8, background: dark ? "rgb(var(--c-teal-fill))" : "rgb(var(--th-6f9993))", color: "rgb(var(--c-on-primary-fill))", fontSize: textPx(12), fontWeight: 700 }}
            >
              <Plus size={12} /> Add
            </button>
          ) : (
            <button
              onClick={() => setAddMeasurementsOpen(true)}
              className="tap flex items-center"
              style={{ color: c("teal"), fontSize: textPx(12.5), fontWeight: 700, gap: 4 }}
            >
              <Plus size={13} /> Add
            </button>
          )
        }
      >
        {measurementsError ? (
          <p className="text-sm text-status-high" style={{ marginTop: 10 }}>
            {measurementsError}
          </p>
        ) : (
          measuredSites.length > 0 && (
            <div className="grid grid-cols-3" style={{ gap: "6px 7px", marginTop: 11 }}>
              {measuredSites.map(({ site, readings }) => {
                const latest = readings[0];
                // Null on a first reading: there is nothing to have changed
                // from, and rendering +0.0 would claim a stability nobody
                // measured.
                const change =
                  readings.length > 1 ? Math.round((latest.value - readings[1].value) * 10) / 10 : null;
                const unit = site.unit === "%" ? "%" : "cm";
                return (
                  <button
                    key={site.type}
                    onClick={() => setHistoryType(site.type)}
                    aria-label={`${site.label} history`}
                    className="tap text-left min-w-0"
                    style={{ background: c("tealTile"), borderRadius: 10, padding: "9px 10px" }}
                  >
                    <span className="flex items-start justify-between" style={{ gap: 4 }}>
                      <span style={{ color: "rgb(var(--c-charcoal))", fontSize: textPx(16), fontWeight: 800, whiteSpace: "nowrap" }}>
                        {latest.value}
                        <span style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(10), fontWeight: 500, marginLeft: 2 }}>{unit}</span>
                      </span>
                      {/* The trend, where there is one to draw. Two points is
                          the minimum that says anything. */}
                      {readings.length >= 2 && (
                        <Sparkline values={[...readings].reverse().map((r) => r.value)} color={c("spark")} width={34} height={12} />
                      )}
                    </span>
                    <span className="block truncate" style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(10.5), marginTop: 3 }}>
                      {site.label}
                    </span>
                    {change != null && change !== 0 && (
                      <span className="block" style={{ color: change > 0 ? c("up") : c("down"), fontSize: textPx(10.5), fontWeight: 700 }}>
                        {change > 0 ? "+" : "−"}
                        {Math.abs(change)} {unit}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )
        )}
      </MetricCard>

      <OneRepMaxesSheet open={oneRmOpen} onClose={() => setOneRmOpen(false)} onSelect={setLiftDetail} />
      <LiftDetailSheet key={liftDetail?.key} lift={liftDetail} onClose={() => setLiftDetail(null)} />

      <AddMeasurementsSheet
        key={addMeasurementsOpen ? "open" : "closed"}
        open={addMeasurementsOpen}
        onClose={() => setAddMeasurementsOpen(false)}
        onSave={async (values, recordedAt) => {
          if (!authUserId) return "You need to be signed in to save measurements.";
          const result = await logMeasurements({ userId: authUserId, values, recordedAt });
          // first_measurements is earned from health_metrics, so a successful
          // save is a moment an achievement can land.
          if (result.ok) refreshAchievements();
          if (!result.ok) return result.message ?? "Couldn't save that.";
          await loadMeasurements();
          return null;
        }}
      />

      <MeasurementHistorySheet
        key={historyType ?? "none"}
        open={historyType != null}
        onClose={() => setHistoryType(null)}
        type={historyType}
        readings={historyType ? (visibleBySite[historyType] ?? []) : []}
        goal={historyType ? (goals[historyType] ?? null) : null}
        onGoalChange={async (goal) => {
          if (!authUserId || !historyType) return;
          const type = historyType;
          const before = goals[type] ?? null;
          const apply = (g: MeasurementGoal | null) =>
            setGoals((prev) => {
              const next = { ...prev };
              if (g) next[type] = g;
              else delete next[type];
              return next;
            });
          // The colour changes at once; a refused write puts it back.
          apply(goal);
          const result = await setMeasurementGoal(authUserId, type, goal);
          if (!result.ok) {
            apply(before);
            setMeasurementsError(result.message ?? "Couldn't save that goal.");
          }
        }}
        onEdit={async (id, type, value) => {
          const result = await updateMeasurement(id, type, value);
          if (!result.ok) return result.message ?? "Couldn't update that.";
          await loadMeasurements();
          return null;
        }}
        onDelete={(reading) => {
          flushDelete();
          pendingDelete.current = reading.id;
          setHiddenIds((prev) => new Set(prev).add(reading.id));
          setToast({ id: reading.id });
        }}
      />

      <Toast
        open={!!toast}
        message="Reading deleted."
        onUndo={() => {
          if (toast && pendingDelete.current === toast.id) pendingDelete.current = null;
          const id = toast?.id;
          setHiddenIds((prev) => {
            const next = new Set(prev);
            if (id) next.delete(id);
            return next;
          });
          setToast(null);
        }}
        onExpire={() => {
          if (toast && pendingDelete.current === toast.id) flushDelete();
          setToast(null);
        }}
      />

      <BottomSheet open={balanceOpen} onClose={() => setBalanceOpen(false)} title="Training balance">
        <div className="space-y-2.5 animate-fade-slide-up">
          <p className="text-xs text-charcoal-faint mb-1">Completed sets by primary muscle group, all time.</p>
          {sortedGroups.map(([group, count]) => (
            <div key={group} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-charcoal">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: balanceColors[group] ?? "#B8AFC8" }} />
                {group.replace(/_/g, " ")}
              </span>
              <span className="text-sm font-semibold text-charcoal-soft">
                {count} sets · {Math.round((count / totalSets) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}

// The hero chart's place in the purple card, measured from the WO4.1 frame.
const HERO_GEOMETRY: TrendGeometry = {
  labelX: 17,
  left: 44,
  right: 21,
  scrubY: 15,
  plotTop: 40,
  plotH: 85,
  datesY: 141,
  height: 157,
};

const shortDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** One figure in the hero's band: "—" when the point has none. */
function HeroFigure({ value, unit, label, accent }: { value: React.ReactNode; unit?: string; label: string; accent?: boolean }) {
  const dark = useIsDark();
  const accentInk = metricColor("heroAccent", dark);
  // The band's own inks (HeroCard sets them for the current mode).
  const ink = accent ? accentInk : "var(--hero-value)";
  return (
    <div className="min-w-0">
      <p style={{ color: ink, fontSize: textPx(17), fontWeight: 800, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
        {value ?? "–"}
        {value != null && unit && <span style={{ fontSize: textPx(11), fontWeight: 600, marginLeft: 2 }}>{unit}</span>}
      </p>
      <p style={{ color: accent ? accentInk : "var(--hero-label)", fontSize: textPx(9.5), fontWeight: 700, letterSpacing: "0.08em", marginTop: 2 }}>
        {label.toUpperCase()}
      </p>
    </div>
  );
}

/** A WO4.1 card: white, 1px #EEEDED border, radius 16, padding 14; icon, title and a right slot. The dark card in dark mode. */
function MetricCard({ icon, title, right, children }: { icon: string; title: string; right?: React.ReactNode; children?: React.ReactNode }) {
  const dark = useIsDark();
  return (
    <section style={{ background: "rgb(var(--c-cream-card))", border: `1px solid ${metricColor("cardBorder", dark)}`, borderRadius: 16, padding: 14 }}>
      <div className="flex items-center" style={{ gap: 10 }}>
        <img src={icon} alt="" width={30} height={30} style={{ borderRadius: 8 }} />
        <h3 className="flex-1 min-w-0 truncate" style={{ color: "rgb(var(--c-charcoal))", fontSize: textPx(14), fontWeight: 700 }}>
          {title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}
