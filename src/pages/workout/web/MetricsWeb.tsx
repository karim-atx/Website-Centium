import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { RECOVERY_HIDDEN_LINE, useHideNumbers } from "../../../hooks/useHideNumbers";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { OneRepMaxesSheet } from "../../../components/workout/OneRepMaxesSheet";
import { LiftDetailSheet } from "../../../components/workout/LiftDetailSheet";
import { AddMeasurementsSheet } from "../../../components/workout/AddMeasurementsSheet";
import { MeasurementHistorySheet } from "../../../components/workout/MeasurementHistorySheet";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { Toast } from "../../../components/ui/Toast";
import { kgWhole, liftMaxes, sortLifts, type LiftMax } from "../../../services/workout/oneRepMax";
import { chipColors, kiloTick, pointStats, trainingFrequency, volumePoints, volumeTicks, type VolumeMode } from "../../../services/workout/metrics";
import { countsTowardVolume } from "../../../services/workout/session";
import {
  deleteMeasurement,
  getMeasurementGoals,
  getMeasurements,
  logMeasurements,
  setMeasurementGoal,
  updateMeasurement,
  type MeasurementGoal,
  type MeasurementReading,
} from "../../../services/measurements";
import { MEASUREMENT_SITES, type MeasurementType } from "../../../services/measurements/sites";
import { todayLocal } from "../../../utils/date";
import { ProgressPhotosEntry } from "../photos/ProgressPhotosEntry";
import { useClientShare } from "../../../components/share/client/useClientShare";
import { ShareEntryButton } from "../../../components/share/client/ShareEntryButton";
import { prCard } from "../../../components/share/client/clientCardModel";
import { isNewPr, prFacts } from "../../../components/share/client/clientShareData";
import { appLocale } from "../../../i18n/format";
import { borderCard, cardTitle } from "./styles";
import { getLanguage, isRtl, t, tn, tx } from "../../../i18n/core";

// Website viewport v1 · WC-WO.4 Metrics (WC-WO Workout Web v13). A 12-column
// grid (8 beside the rail): the volume hero (8 columns, the chart with its
// axis, gridlines, points and the selected value, the six figures in the
// band) beside One-rep maxes (4), then Balance, Training frequency and Body
// measurements (4 each; one column each beside the rail). Rows 58 / 42 of the
// page's height at 1440. Reads, the sheets (One-rep maxes 440, lift detail,
// measurements) and the Undo toast on deletes (the repo change since the
// design) are the mobile tab's.

const balanceColors: Record<string, string> = {
  back: "#7D6BB5",
  chest: "#D9A441",
  shoulders: "#6F9993",
  quads: "#4C8FD1",
  hamstrings: "#9C4F7C",
  glutes: "#C97B84",
  bicep: "#8C7CC4",
  tricep: "#B58F5A",
  core: "#5FA88F",
  cardio: "#E08E6D",
  olympic: "#6B8FB5",
};

const shortDay = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric", timeZone: "UTC" });
const heroCaps: React.CSSProperties = { fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.75)" };

export default function MetricsWeb() {
  const { workoutSessions, exerciseCatalog, customExercises, authUserId, noteFeatureMilestone, refreshAchievements } = useApp();
  const { rail } = useWebLayout();
  const hideNumbers = useHideNumbers();
  useEffect(() => {
    noteFeatureMilestone("workout_metrics");
  }, [noteFeatureMilestone]);

  const [oneRmOpen, setOneRmOpen] = useState(false);
  const [liftDetail, setLiftDetail] = useState<LiftMax | null>(null);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [volumeMode, setVolumeMode] = useState<VolumeMode>("workout");
  const [heroPick, setHeroPick] = useState<number | null>(null);

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

  const [bySite, setBySite] = useState<Partial<Record<MeasurementType, MeasurementReading[]>>>({});
  const [measurementsError, setMeasurementsError] = useState<string | null>(null);
  const [addMeasurementsOpen, setAddMeasurementsOpen] = useState(false);
  const [historyType, setHistoryType] = useState<MeasurementType | null>(null);
  const [goals, setGoals] = useState<Partial<Record<MeasurementType, MeasurementGoal>>>({});
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState<{ id: string } | null>(null);
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
      if (!result.ok) setMeasurementsError(result.message ? t(result.message) : t("Couldn't delete that reading."));
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
  const visibleBySite = useMemo(() => {
    if (hiddenIds.size === 0) return bySite;
    const out: Partial<Record<MeasurementType, MeasurementReading[]>> = {};
    for (const [type, list] of Object.entries(bySite) as [MeasurementType, MeasurementReading[]][]) out[type] = list.filter((r) => !hiddenIds.has(r.id));
    return out;
  }, [bySite, hiddenIds]);
  const measuredSites = useMemo(
    () => MEASUREMENT_SITES.map((site) => ({ site, readings: visibleBySite[site.type] ?? [] })).filter((s) => s.readings.length > 0),
    [visibleBySite]
  );

  const today = todayLocal();
  const hero = useMemo(() => volumePoints(workoutSessions, volumeMode), [workoutSessions, volumeMode]);
  const heroSel = heroPick !== null && heroPick < hero.length ? heroPick : hero.length - 1;
  const stats = hero.length ? pointStats(hero[heroSel].sessions) : null;
  const lifts = useMemo(() => sortLifts(liftMaxes(workoutSessions, today), "highest"), [workoutSessions, today]);
  const share = useClientShare();
  const frequency = useMemo(() => trainingFrequency(workoutSessions, today), [workoutSessions, today]);
  const freqMax = Math.max(3, ...frequency.weeks);
  const dominant = topGroup && dominantShare > 0.45 ? topGroup[0] : null;
  const chip = dominant ? chipColors(balanceColors[dominant] ?? "#B8AFC8") : null;
  const groupLabel = (g: string) => g.charAt(0).toUpperCase() + g.slice(1).replace(/_/g, " ");
  const groupName = (g: string) => (g === "back" ? tx("Back", "muscle") : t(groupLabel(g)));
  const hasSessions = workoutSessions.length > 0;

  const muted: React.CSSProperties = { flex: "none", whiteSpace: "nowrap", fontSize: 13, lineHeight: "20px", color: "#71685E" };
  const span = (n: number): React.CSSProperties => ({ gridColumn: `span ${rail ? 8 : n}`, minWidth: 0, minHeight: 0 });

  return (
    <div className="flex flex-col" style={{ gap: 24 }}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${rail ? 8 : 12}, minmax(0,1fr))`,
          gridTemplateRows: rail ? undefined : "minmax(0,58fr) minmax(0,42fr)",
          height: rail ? undefined : "max(620px, calc(100dvh - 176px))",
          gap: 24,
        }}
      >
        {/* The volume hero. */}
        <div className="flex flex-col" style={{ ...span(8), borderRadius: 20, overflow: "hidden", height: rail ? 380 : undefined }}>
          <div className="flex flex-col" style={{ flex: 1, minHeight: 0, background: "linear-gradient(180deg,#A79AD5,#A194D1)", color: "#FFFFFF", padding: "18px 24px 12px" }}>
            <div className="flex items-center justify-between" style={{ flex: "none" }}>
              <span style={heroCaps}>{t("VOLUME")}</span>
              <div role="tablist" aria-label={t("Volume by")} className="flex" style={{ height: 36, padding: 3, gap: 2, borderRadius: 11, background: "rgba(255,255,255,0.22)", boxSizing: "border-box" }}>
                {(["workout", "week"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={volumeMode === m}
                    onClick={() => {
                      setVolumeMode(m);
                      setHeroPick(null);
                    }}
                    className="flex items-center whitespace-nowrap"
                    style={{ padding: "0 14px", borderRadius: 8, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: volumeMode === m ? "#FFFFFF" : "transparent", color: volumeMode === m ? "#463A80" : "#FFFFFF" }}
                  >
                    {m === "workout" ? t("By workout") : t("By week")}
                  </button>
                ))}
              </div>
            </div>
            {hero.length > 0 ? (
              <VolumeChart
                points={hero.map((p) => ({ label: shortDay(p.day), value: p.volumeKg }))}
                selected={heroSel}
                onSelect={setHeroPick}
                ariaLabel={volumeMode === "workout" ? t("Volume by workout") : t("Volume by week")}
              />
            ) : (
              <div className="grid place-items-center" style={{ flex: 1 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.86)" }}>{t("No sessions yet")}</span>
              </div>
            )}
          </div>
          <div className="grid" style={{ flex: "none", background: "#E4DDFD", gridTemplateColumns: "repeat(6,minmax(0,1fr))", columnGap: 12, padding: "14px 24px" }}>
            <Figure value={stats ? stats.volumeKg.toLocaleString(appLocale()) : null} unit="kg" label={t("Volume")} accent />
            <Figure value={stats?.oneRmKg != null ? kgWhole(stats.oneRmKg) : null} unit="kg" label={t("1RM")} />
            <Figure value={stats?.maxWeightKg ?? null} unit="kg" label={t("Max weight")} />
            <Figure value={stats ? stats.sets : null} label={t("Sets")} />
            <Figure value={stats ? stats.reps : null} label={t("Reps")} />
            <Figure value={stats?.seconds ?? null} label={t("Seconds")} />
          </div>
        </div>

        {/* One-rep maxes. */}
        <section className="flex flex-col" style={{ ...span(4), ...borderCard, padding: 18, gap: 14 }}>
          <CardHead
            icon="/metrics/orm-teal.png"
            title={t("One-rep maxes")}
            right={
              lifts.length === 0 ? (
                <span style={muted}>{t("None yet")}</span>
              ) : (
                <button type="button" onClick={() => setOneRmOpen(true)} className="flex items-center" style={{ gap: 3, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#3B7570", whiteSpace: "nowrap" }}>
                  {t("All {n}", { n: lifts.length })}
                  <ChevronRight size={16} />
                </button>
              )
            }
          />
          {lifts.length > 0 && (
            <div className="grid" style={{ flex: 1, minHeight: 0, gridTemplateColumns: "repeat(2,minmax(0,1fr))", gridAutoRows: "minmax(0,1fr)", gap: 8 }}>
              {lifts.slice(0, 6).map((lift) => {
                const fresh = isNewPr(lift.best.date, today);
                return (
                  <span key={lift.key} className="relative min-w-0 flex">
                    <button
                      type="button"
                      onClick={() => setLiftDetail(lift)}
                      className="flex-1 min-w-0 text-start flex flex-col justify-center hover:!bg-[#EAF2F0]"
                      style={{ borderRadius: 12, background: "#F2F7F6", padding: "10px 14px", minHeight: 64, boxShadow: fresh ? "0 0 0 1.5px #AEA1DC" : undefined }}
                    >
                      <span className="block truncate" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 500, color: "#3B7570", paddingInlineEnd: fresh ? 28 : 0 }}>
                        {lift.name}
                      </span>
                      <span style={{ fontSize: 22, lineHeight: "28px", fontWeight: 800, color: "#3B7570" }}>
                        {kgWhole(lift.oneRm)}
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#86B3AD", marginInlineStart: 2 }}>kg</span>
                      </span>
                    </button>
                    {fresh && (
                      <ShareEntryButton
                        size={28}
                        ring={false}
                        label={t("Share your {name} personal best", { name: lift.name })}
                        onPress={() => share.open(prCard(prFacts(lift, today)))}
                        style={{ position: "absolute", insetInlineEnd: 4, top: 4 }}
                      />
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </section>

        {/* Balance. */}
        <section className="flex flex-col" style={{ ...span(4), ...borderCard, padding: 18 }}>
          <CardHead
            icon="/metrics/balance.png"
            title={tx("Balance", "training")}
            right={
              totalSets === 0 ? (
                <span style={muted}>{t("No sets yet")}</span>
              ) : chip ? (
                <span style={{ ...chip, borderRadius: 6, padding: "2px 8px", fontSize: 13, lineHeight: "20px", fontWeight: 600, whiteSpace: "nowrap" }}>{t("{group}-heavy lately", { group: groupName(dominant!) })}</span>
              ) : null
            }
          />
          <div className="flex flex-col justify-center" style={{ flex: 1, minHeight: rail ? 120 : 0, gap: 16 }}>
            <div className="flex overflow-hidden" style={{ height: 12, borderRadius: 6, gap: 2, background: totalSets === 0 ? "#F2F2F2" : "transparent" }}>
              {sortedGroups.map(([group, count]) => (
                <span key={group} style={{ width: `${(count / totalSets) * 100}%`, background: balanceColors[group] ?? "#B8AFC8" }} />
              ))}
            </div>
            {totalSets > 0 && (
              <div className="grid" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
                {sortedGroups.slice(0, 4).map(([group, count]) => (
                  <div key={group} className="min-w-0">
                    <span className="flex items-center truncate" style={{ gap: 5, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
                      <span className="flex-none" style={{ width: 7, height: 7, borderRadius: 4, background: balanceColors[group] ?? "#B8AFC8" }} />
                      {groupName(group)}
                    </span>
                    <span style={{ display: "block", fontSize: 17, lineHeight: "24px", fontWeight: 800, color: "#241F1B" }}>{Math.round((count / totalSets) * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {totalSets > 0 && (
            <div className="flex justify-end" style={{ paddingTop: 12, borderTop: "1px solid rgba(36,31,27,0.07)" }}>
              <button type="button" onClick={() => setBalanceOpen(true)} className="flex items-center" style={{ gap: 3, fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#8F68F6" }}>
                {t("Full breakdown")}
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>

        {/* Training frequency. */}
        <section className="flex flex-col" style={{ ...span(4), ...borderCard, padding: 18 }}>
          <CardHead
            icon="/metrics/freq.png"
            title={t("Training frequency")}
            right={
              hasSessions ? (
                <span style={{ flex: "none", whiteSpace: "nowrap", fontSize: 24, fontWeight: 800, color: "#241F1B" }}>
                  {frequency.perWeek}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#71685E", marginInlineStart: 4 }}>{t("/ week")}</span>
                </span>
              ) : (
                <span style={muted}>{t("No sessions yet")}</span>
              )
            }
          />
          <div aria-label={t("Sessions per week, last 8 weeks")} role="img" className="flex items-end" style={{ flex: 1, minHeight: rail ? 96 : 0, gap: 8, marginTop: 16 }}>
            {frequency.weeks.map((count, i) => (
              <span
                key={i}
                style={{ flex: 1, height: count ? `${Math.max(6, Math.round((count / freqMax) * 100))}%` : 2, borderRadius: count ? 6 : 1, background: i === 7 && count ? "#8F68F6" : "#E6DEFD" }}
              />
            ))}
          </div>
          <div className="flex justify-between" style={{ marginTop: 8, fontSize: 13, lineHeight: "20px" }}>
            <span style={{ color: "#71685E", whiteSpace: "nowrap" }}>{t("8 wks ago")}</span>
            <span style={{ color: "#8F68F6", fontWeight: 700, whiteSpace: "nowrap" }}>
              {t("This week")}
              {hasSessions ? ` · ${frequency.weeks[7]}` : ""}
            </span>
          </div>
        </section>

        {/* Body measurements. */}
        <section className="flex flex-col" style={{ ...span(4), ...borderCard, padding: 18, gap: 14 }}>
          <CardHead
            icon="/metrics/body.png"
            title={t("Body measurements")}
            right={
              hideNumbers ? undefined : measuredSites.length === 0 && !measurementsError ? (
                <button type="button" onClick={() => setAddMeasurementsOpen(true)} className="flex items-center" style={{ flex: "none", height: 36, padding: "0 12px", gap: 6, borderRadius: 9, background: "#6F9993", color: "#FFFFFF", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}>
                  <Plus size={16} />
                  {t("Add")}
                </button>
              ) : (
                <button type="button" onClick={() => setAddMeasurementsOpen(true)} className="flex items-center" style={{ flex: "none", gap: 4, fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#3B7570" }}>
                  <Plus size={16} />
                  {t("Add")}
                </button>
              )
            }
          />
          {hideNumbers ? (
            <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{t(RECOVERY_HIDDEN_LINE)}</p>
          ) : measurementsError ? (
            <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#C0392B" }}>{t(measurementsError)}</p>
          ) : (
            measuredSites.length > 0 && (
              <div className="grid" style={{ flex: 1, minHeight: 0, gridTemplateColumns: "repeat(3,minmax(0,1fr))", gridAutoRows: "minmax(0,1fr)", gap: 8, overflow: "auto", scrollbarWidth: "none" }}>
                {measuredSites.map(({ site, readings }) => {
                  const latest = readings[0];
                  const change = readings.length > 1 ? Math.round((latest.value - readings[1].value) * 10) / 10 : null;
                  const unit = site.unit === "%" ? "%" : "cm";
                  const col = change != null && change < 0 ? "#3C6B65" : change != null && change > 0 ? "#7D6BB5" : "#776E64";
                  return (
                    <button
                      key={site.type}
                      type="button"
                      onClick={() => setHistoryType(site.type)}
                      aria-label={t("{name} history", { name: t(site.label) })}
                      className="text-start min-w-0 flex flex-col justify-center"
                      style={{ minHeight: 0, borderRadius: 12, background: "#F2F7F6", padding: "10px 12px", gap: 4 }}
                    >
                      <span style={{ fontSize: 17, lineHeight: "22px", fontWeight: 800, color: "#241F1B", whiteSpace: "nowrap" }}>
                        {latest.value}
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#71685E", marginInlineStart: 2 }}>{unit}</span>
                      </span>
                      <span className="block truncate" style={{ fontSize: 13, lineHeight: "18px", color: "#71685E" }}>
                        {t(site.label)}
                      </span>
                      <Spark values={readings.length >= 2 ? [...readings].reverse().map((r) => r.value) : null} color={col} />
                      <span style={{ fontSize: 11, lineHeight: "16px", fontWeight: 700, whiteSpace: "nowrap", color: col }}>
                        {change != null && change !== 0 ? `${change > 0 ? "▲" : "▼"} ${Math.abs(change)} ${unit}` : t("No change")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          )}
        </section>
      </div>

      <div style={{ maxWidth: 560 }}>
        <ProgressPhotosEntry />
      </div>

      {share.sheet}
      <OneRepMaxesSheet open={oneRmOpen} onClose={() => setOneRmOpen(false)} onSelect={setLiftDetail} />
      <LiftDetailSheet key={liftDetail?.key} lift={liftDetail} onClose={() => setLiftDetail(null)} />
      <AddMeasurementsSheet
        key={addMeasurementsOpen ? "open" : "closed"}
        open={addMeasurementsOpen && !hideNumbers}
        onClose={() => setAddMeasurementsOpen(false)}
        onSave={async (values, recordedAt) => {
          if (!authUserId) return t("You need to be signed in to save measurements.");
          const result = await logMeasurements({ userId: authUserId, values, recordedAt });
          if (result.ok) refreshAchievements();
          if (!result.ok) return result.message ? t(result.message) : t("Couldn't save that.");
          await loadMeasurements();
          return null;
        }}
      />
      <MeasurementHistorySheet
        key={historyType ?? "none"}
        open={historyType != null && !hideNumbers}
        onClose={() => setHistoryType(null)}
        type={historyType}
        readings={historyType ? visibleBySite[historyType] ?? [] : []}
        goal={historyType ? goals[historyType] ?? null : null}
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
          apply(goal);
          const result = await setMeasurementGoal(authUserId, type, goal);
          if (!result.ok) {
            apply(before);
            setMeasurementsError(result.message ? t(result.message) : t("Couldn't save that goal."));
          }
        }}
        onEdit={async (id, type, value) => {
          const result = await updateMeasurement(id, type, value);
          if (!result.ok) return result.message ? t(result.message) : t("Couldn't update that.");
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
        message={t("Reading deleted.")}
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
      <BottomSheet open={balanceOpen} onClose={() => setBalanceOpen(false)} title={t("Training balance")}>
        <div className="flex flex-col" style={{ gap: 10 }}>
          <p style={{ margin: "0 0 4px", fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{t("Completed sets by primary muscle group, all time.")}</p>
          {sortedGroups.map(([group, count]) => (
            <div key={group} className="flex items-center justify-between">
              <span className="flex items-center" style={{ gap: 8, fontSize: 15, color: "#241F1B" }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: balanceColors[group] ?? "#B8AFC8" }} />
                {getLanguage() === "en" ? group.replace(/_/g, " ") : groupName(group)}
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#5B5349" }}>
                {tn(count, "{n} set", "{n} sets")} · {Math.round((count / totalSets) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}

const CardHead: React.FC<{ icon: string; title: string; right?: React.ReactNode }> = ({ icon, title, right }) => (
  <div className="flex items-center" style={{ gap: 12, flex: "none" }}>
    <img src={icon} alt="" width={36} height={36} style={{ borderRadius: 9, display: "block" }} />
    <h3 className="flex-1 min-w-0 truncate" style={cardTitle}>
      {title}
    </h3>
    {right}
  </div>
);

/** A figure in the hero band: 20/28 800 over its 13/20 caps label; "–" when the point has none. */
const Figure: React.FC<{ value: React.ReactNode; unit?: string; label: string; accent?: boolean }> = ({ value, unit, label, accent }) => (
  <div className="min-w-0">
    <p style={{ margin: 0, fontSize: 20, lineHeight: "28px", fontWeight: 800, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: accent ? "#5B3FE4" : "#2E2560" }}>
      {value ?? "–"}
      {value != null && unit && <span style={{ fontSize: 13, fontWeight: 600, marginInlineStart: 2 }}>{unit}</span>}
    </p>
    <p className="truncate" style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: accent ? "#5B3FE4" : "#463A80" }}>
      {label}
    </p>
  </div>
);

/**
 * The volume chart (reference): the selected point's date and volume at the
 * top end (13/20 600), dashed gridlines with their kg labels (11, 600) in a
 * 40 gutter, the white line, the points (8, the selected one 12 filled) and
 * four dates under the plot. A point is picked by clicking or hovering it,
 * or with the arrow keys.
 */
const VolumeChart: React.FC<{ points: { label: string; value: number }[]; selected: number; onSelect: (i: number) => void; ariaLabel: string }> = ({ points, selected, onSelect, ariaLabel }) => {
  const n = points.length;
  const peak = Math.max(0, ...points.map((p) => p.value));
  const ticks = volumeTicks(peak);
  const top = Math.max(ticks[2], peak) * 1.12 || 1;
  // Mirrored in Arabic as the app's charts are: time runs from the right, the axis on the right.
  const rtl = isRtl();
  const X = (i: number) => {
    const x = n < 2 ? 50 : 3 + (i * 94) / (n - 1);
    return rtl ? 100 - x : x;
  };
  const Y = (v: number) => (1 - v / top) * 100;
  const dateIdx = n < 2 ? [0] : Array.from(new Set([0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1]));
  const sel = points[selected];
  return (
    <div className="flex flex-col" style={{ flex: 1, minHeight: 0, marginTop: 10 }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "rgba(255,255,255,0.9)", textAlign: "end" }}>
        {sel ? `${sel.label} · ${sel.value.toLocaleString(appLocale())} kg` : ""}
      </p>
      <div
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, n - 1)}
        aria-valuenow={selected}
        aria-valuetext={sel ? `${sel.label} · ${sel.value.toLocaleString(appLocale())} kg` : undefined}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const step = (e.key === "ArrowRight") !== rtl ? 1 : -1;
            onSelect(Math.min(n - 1, Math.max(0, selected + step)));
          }
        }}
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
        dir="ltr"
        style={{ flex: 1, minHeight: 80, position: "relative", margin: rtl ? "6px 40px 0 0" : "6px 0 0 40px" }}
      >
        {ticks.map((v) => (
          <div key={v} style={{ position: "absolute", left: 0, right: 0, top: `${Y(v)}%`, borderTop: "1px dashed rgba(255,255,255,0.25)" }}>
            <span style={{ position: "absolute", ...(rtl ? { right: -40, textAlign: "left" as const } : { left: -40, textAlign: "right" as const }), top: -9, width: 32, fontSize: 11, lineHeight: "16px", fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{kiloTick(v)}</span>
          </div>
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          {n > 1 && (
            <polyline
              points={points.map((p, i) => `${X(i)},${Y(p.value)}`).join(" ")}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
        </svg>
        {points.map((p, i) => {
          const on = i === selected;
          const s = on ? 12 : 8;
          return (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              aria-hidden
              onClick={() => onSelect(i)}
              onMouseEnter={() => onSelect(i)}
              style={{ position: "absolute", left: `${X(i)}%`, top: `${Y(p.value)}%`, width: 24, height: 24, margin: "-12px 0 0 -12px", display: "grid", placeItems: "center", background: "none" }}
            >
              <span style={{ width: s, height: s, borderRadius: 999, background: on ? "#FFFFFF" : "rgba(255,255,255,0)", boxShadow: on ? "0 0 0 3px rgba(255,255,255,0.35)" : "inset 0 0 0 1.5px rgba(255,255,255,0.9)" }} />
            </button>
          );
        })}
      </div>
      <div dir="ltr" style={{ position: "relative", height: 20, margin: rtl ? "8px 40px 0 0" : "8px 0 0 40px", flex: "none" }}>
        {dateIdx.map((i) => (
          <span key={i} style={{ position: "absolute", left: `${X(i)}%`, transform: "translateX(-50%)", fontSize: 11, lineHeight: "16px", fontWeight: 600, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap" }}>
            {points[i].label}
          </span>
        ))}
      </div>
    </div>
  );
};

/** The measurement trend (reference): 24 tall, a baseline, the line, an open first dot (6) and a filled last one (9); a dashed line with no trend yet. */
const Spark: React.FC<{ values: number[] | null; color: string }> = ({ values, color }) => {
  const box: React.CSSProperties = { position: "relative", height: 24, width: "100%", flex: "none", margin: "2px 0", display: "block" };
  if (!values) return <span aria-hidden style={box}><span style={{ position: "absolute", left: 0, right: 0, top: 11, borderTop: "1.5px dashed #BDB6AC" }} /></span>;
  const mn = Math.min(...values);
  const mx = Math.max(...values);
  const last = values.length - 1;
  const y = (v: number) => 4 + (1 - (v - mn) / (mx - mn || 1)) * 16;
  const rtl = isRtl();
  const pts = values.map((v, i) => [rtl ? 100 - (i / last) * 100 : (i / last) * 100, y(v)] as const);
  const dot = (x: number, yy: number, d: number, filled: boolean) => (
    <span style={{ position: "absolute", left: `calc(${x}% - ${d / 2}px)`, top: yy - d / 2, width: d, height: d, boxSizing: "border-box", borderRadius: 999, background: filled ? color : "#F2F7F6", border: filled ? "none" : `1.5px solid ${color}` }} />
  );
  return (
    <span aria-hidden dir="ltr" style={box}>
      <svg viewBox="0 0 100 24" preserveAspectRatio="none" width="100%" height={24} style={{ position: "absolute", inset: 0, overflow: "visible", display: "block" }}>
        <line x1={0} x2={100} y1={23} y2={23} stroke="rgba(36,31,27,0.1)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {dot(pts[0][0], pts[0][1], 6, false)}
      {dot(pts[last][0], pts[last][1], 9, true)}
    </span>
  );
};
