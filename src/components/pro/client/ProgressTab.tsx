import React, { useEffect, useState } from "react";
import { BarChart3, CalendarCheck, ChevronDown, ClipboardCheck, FlaskConical, Gauge, HeartPulse, Moon, Scale, TrendingUp, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { INK } from "../proInk";
import { ProChart } from "../ProChart";
import { LockLine } from "../LockLine";
import { ProCardSkeleton } from "../states";
import { fmtDay } from "./clientFormat";
import type { ClientPageData } from "./useClientPage";
import type { ProLane } from "../subtypeLanes";
import { fetchAdherenceRow, fetchBiomarkerFlags, fetchDayItems, fetchLoggedDays, type BiomarkerFlag } from "../../../services/pro/clientPage";
import { shiftIso } from "../../../services/pro/home";
import { mondayIndex } from "../../../utils/week";
import { weekdayNarrow } from "../proDates";
import { BP_NONE_LOGGED } from "../../../services/blood-pressure/guidance";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { proClientPath, PRO_ROUTES } from "../subtypeLanes";
import { CaloriesMacrosChart, MicronutrientsBlock, RpeChart, StrengthChart, VolumeChart, WeightTrendChart } from "../insights/ProgressCharts";
import { SleepTrendChart } from "../insights/SleepCharts";
import type { AccessCategory } from "../../../services/pro/access";
import { CheckInsProgress, checkInsSummary, useClientCheckIns } from "../forms/CheckInsProgress";
import { ClientWinsCard } from "../../share/ClientWinsCard";
import { appLocale } from "../../../i18n/format";
import { t, tk, tn } from "../../../i18n/core";

/**
 * Release 3 · CL2 v5 Progress (Full coaching, Nutrition) and Trends
 * (Clinical overview): the range row ("Last 7 days" with Today / Week /
 * Month) and the collapsible groups (source gen/board10.js: each a card,
 * r20, pad 14, the 36 lavender tile, title 15 / 700, the one-line summary
 * 12.5 text.soft, the chevron; open shows the group's chart).
 *
 * Groups are built from what the database can answer today:
 * - Workouts vs planned / Meal-plan adherence: client_adherence and the
 *   per-day items (pro_client_day_items);
 * - Body: the latest shared weight; Vitals: shared blood pressure, steps
 *   and sleep averages; Biomarkers: client_biomarker_flags;
 * - W5: Strength, Volume, RPE, the weight trend, Calories and macros over
 *   time and Micronutrients are the Insights charts (insights/
 *   ProgressCharts.tsx);
 * - W9: Sleep (Clinical overview) is CL2 v5 "Sleep per night (h)" from
 *   sleep_details (else the health_metrics duration) with the average
 *   stage split (insights/SleepCharts.tsx SleepTrendChart);
 * - W6: Check-ins (Full coaching and Nutrition; HANDOVER d "Check-ins: Full")
 *   is CL11, the client's check-in answers over time with the safety flag
 *   banner (forms/CheckInsProgress.tsx); not fetched for Clinical overview;
 * - W5: the top row opens Client insights (Full coaching, Nutrition) or
 *   this patient in Insights (Clinical overview).
 * Each group is gated by its switch: LockLine when off.
 */

type Range = "today" | "week" | "month";
const RANGE_DAYS: Record<Range, number> = { today: 1, week: 7, month: 28 };
const RANGE_LINE: Record<Range, string> = { today: tk("Today"), week: tk("Last 7 days"), month: tk("Last 4 weeks") };

interface Group {
  key: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  body: React.ReactNode;
}

export const ProgressTab: React.FC<{ data: ClientPageData; lane: ProLane; onAsk: (c: AccessCategory) => void }> = ({ data, lane, onAsk }) => {
  const [range, setRange] = useState<Range>("week");
  const navigate = useNavigate();
  const chartInitial = range === "month" ? "M" : "W";
  const [open, setOpen] = useState<string | null>(null);
  const { access, clientId, today, firstName, rel, stage } = data;
  const days = Array.from({ length: RANGE_DAYS[range] }, (_, i) => shiftIso(today, -(RANGE_DAYS[range] - 1 - i)));
  const joined = (stage?.joinedAt ?? rel?.joinedAt ?? "").slice(0, 10);
  const early = !!joined && joined > shiftIso(today, -7);

  const counted: AccessCategory = lane === "nutrition" ? "food_diary" : "workout_activity";
  const [adh, setAdh] = useState<{ planned: number; completed: number; pct: number | null } | null | undefined>(undefined);
  const [perDay, setPerDay] = useState<{ day: string; planned: number; completed: number }[] | null | undefined>(undefined);
  const [flags, setFlags] = useState<BiomarkerFlag[] | null | undefined>(undefined);
  const [loggedDays, setLoggedDays] = useState<string[] | null | undefined>(undefined);
  const [chkNonce, setChkNonce] = useState(0);
  // Round D: every lane sends check-ins (clinical included, can_write_form).
  const checkIns = useClientCheckIns(clientId, true, chkNonce);
  const checkInsGroup: Group = { key: "chk", icon: ClipboardCheck, title: t("Check-ins"), summary: checkInsSummary(checkIns), body: <CheckInsProgress data={checkIns} clientId={clientId} firstName={firstName} onRetry={() => setChkNonce((n) => n + 1)} /> };
  const labsVisible = access.has("lab_results") || (access.access?.resultSharedCount ?? 0) > 0;

  useEffect(() => {
    if (lane === "clinical_overview" || !access.has(counted)) return;
    let live = true;
    setAdh(undefined);
    setPerDay(undefined);
    void fetchAdherenceRow(clientId, RANGE_DAYS[range], today).then((r) => live && setAdh(r.ok ? r.data : null));
    void fetchDayItems(clientId, days).then((r) => live && setPerDay(r.ok ? r.data : null));
    if (lane === "nutrition") void fetchLoggedDays(clientId, days[0]).then((r) => live && setLoggedDays(r.ok ? r.data : null));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, lane, range, today, access.access]);
  useEffect(() => {
    if (lane !== "clinical_overview" || !labsVisible) return;
    let live = true;
    void fetchBiomarkerFlags(clientId).then((r) => live && setFlags(r.ok ? r.data : null));
    return () => {
      live = false;
    };
  }, [clientId, lane, labsVisible]);

  const lock = (what: string, c: AccessCategory) => (
    <LockLine
      what={what}
      clientFirstName={firstName}
      action={
        <button type="button" onClick={() => onAsk(c)} className="tap shrink-0 relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(11.5), fontWeight: 700, color: INK.prDeep }}>{t("Ask to share")}</button>
      }
    />
  );

  const adherenceGroup = (title: string, unit: string): Group => {
    const shared = access.has(counted);
    const summary = !shared ? t("Not shared") : adh === undefined ? t("Loading…") : !adh ? t("No shared data yet") : adh.pct != null ? t("{completed} of {planned} done, {pct}%", { completed: adh.completed, planned: adh.planned, pct: adh.pct }) : t("{completed} of {planned} done", { completed: adh.completed, planned: adh.planned });
    let body: React.ReactNode;
    if (!shared) body = lock(lane === "nutrition" ? t("Food diary") : t("Workout activity"), counted);
    else if (perDay === undefined) body = <ProCardSkeleton lines={3} />;
    else if (!perDay || perDay.every((d) => d.planned === 0)) body = <p style={{ fontSize: textPx(12), color: INK.chF }}>{t("No {unit} planned in this range.", { unit })}</p>;
    else {
      const x = perDay.map((d) => (range === "month" ? fmtDay(d.day) : weekdayNarrow(mondayIndex(new Date(`${d.day}T00:00:00`).getDay()))));
      body = (
        <ProChart
          x={x}
          min={0}
          max={Math.max(1, ...perDay.map((d) => d.planned))}
          series={[
            { key: "c", label: t("Done"), type: "bar", color: INK.pr, values: perDay.map((d) => d.completed) },
            { key: "p", label: t("Planned"), type: "line", color: INK.tealDark, dashed: true, values: perDay.map((d) => d.planned) },
          ]}
          tooltip={(i) => ({ title: fmtDay(perDay[i].day), lines: [t("{completed} of {planned} {unit}", { completed: perDay[i].completed, planned: perDay[i].planned, unit })] })}
          summary={`${title}: ${summary}.`}
        />
      );
    }
    return { key: "adh", icon: CalendarCheck, title, summary, body };
  };

  const bodyGroup: Group = {
    key: "body",
    icon: Scale,
    title: t("Body"),
    summary: !access.has("weight") ? t("Not shared") : rel?.lastWeightKg != null ? rel.weightTrend ? (rel.weightTrend > 0 ? t("Latest weight {kg} kg, up {change} kg", { kg: rel.lastWeightKg, change: Math.abs(rel.weightTrend) }) : t("Latest weight {kg} kg, down {change} kg", { kg: rel.lastWeightKg, change: Math.abs(rel.weightTrend) })) : t("Latest weight {kg} kg", { kg: rel.lastWeightKg }) : t("No weigh-ins yet"),
    body: !access.has("weight") ? lock(t("Weight"), "weight") : <WeightTrendChart clientId={clientId} today={today} initial={chartInitial} bodyOn={access.has("body_measurements")} progressOn={access.has("progress")} />,
  };

  let groups: Group[];
  if (lane === "full_coaching") {
    groups = [
      { key: "str", icon: TrendingUp, title: t("Strength"), summary: access.has("workout_activity") ? t("Best sets and PRs") : t("Not shared"), body: access.has("workout_activity") ? <StrengthChart clientId={clientId} today={today} initial={chartInitial} /> : lock(t("Workout activity"), "workout_activity") },
      { key: "vol", icon: BarChart3, title: t("Volume"), summary: access.has("workout_activity") ? t("Sets a week") : t("Not shared"), body: access.has("workout_activity") ? <VolumeChart clientId={clientId} today={today} initial={chartInitial} /> : lock(t("Workout activity"), "workout_activity") },
      adherenceGroup(t("Workouts vs planned"), t("workouts")),
      { key: "rpe", icon: Gauge, title: "RPE", summary: access.has("workout_activity") ? t("Effort per session") : t("Not shared"), body: access.has("workout_activity") ? <RpeChart clientId={clientId} today={today} initial={chartInitial} /> : lock(t("Workout activity"), "workout_activity") },
      bodyGroup,
      checkInsGroup,
    ];
    if (stage?.nutritionCoaching !== false)
      groups.push({
        key: "nut",
        icon: UtensilsCrossed,
        title: t("Nutrition"),
        summary: !access.has("food_diary") ? t("Not shared") : rel?.nutrition ? t("{kcal} kcal on {date}", { kcal: Math.round(rel.nutrition.calories).toLocaleString(appLocale("en-GB")), date: fmtDay(rel.nutrition.lastLoggedDate) }) : t("Nothing logged yet"),
        body: !access.has("food_diary") ? lock(t("Food diary"), "food_diary") : <CaloriesMacrosChart clientId={clientId} today={today} initial={chartInitial} progressOn={access.has("progress")} />,
      });
  } else if (lane === "nutrition") {
    const logged = loggedDays ? days.filter((d) => loggedDays.includes(d)).length : null;
    groups = [
      adherenceGroup(t("Meal-plan adherence"), t("days on target")),
      {
        key: "mac",
        icon: UtensilsCrossed,
        title: t("Calories and macros"),
        summary: !access.has("food_diary") ? t("Not shared") : rel?.nutrition ? t("{kcal} kcal on {date}", { kcal: Math.round(rel.nutrition.calories).toLocaleString(appLocale("en-GB")), date: fmtDay(rel.nutrition.lastLoggedDate) }) : t("Nothing logged yet"),
        body: !access.has("food_diary") ? lock(t("Food diary"), "food_diary") : <CaloriesMacrosChart clientId={clientId} today={today} initial={chartInitial} progressOn={access.has("progress")} />,
      },
      { key: "mic", icon: FlaskConical, title: t("Micronutrients"), summary: access.has("food_diary") ? t("Fibre, salt, iron and more") : t("Not shared"), body: access.has("food_diary") ? <MicronutrientsBlock clientId={clientId} today={today} days={RANGE_DAYS[range]} firstName={firstName} /> : lock(t("Food diary"), "food_diary") },
      {
        key: "log",
        icon: CalendarCheck,
        title: t("Logging consistency"),
        summary: !access.has("food_diary") ? t("Not shared") : logged == null ? t("Loading…") : tn(days.length, "Logged on {logged} of {n} day", "Logged on {logged} of {n} days", { logged }),
        body: !access.has("food_diary") ? lock(t("Food diary"), "food_diary") : <p style={{ fontSize: textPx(13), color: INK.ch }}>{logged == null ? t("Loading…") : t("Logged food on {logged} of {n} days.", { logged, n: days.length })}</p>,
      },
      bodyGroup,
      checkInsGroup,
    ];
  } else {
    const bp = rel?.bloodPressure ?? [];
    const v = rel?.vitals;
    const outOf = flags ? flags.filter((f) => f.status === "out_of_range").length : null;
    groups = [
      {
        key: "vit",
        icon: HeartPulse,
        title: t("Vitals"),
        summary: !access.has("blood_pressure") && !access.has("health_metrics") ? t("Not shared") : bp[0] ? t("BP {systolic}/{diastolic} on {date}", { systolic: bp[0].systolic, diastolic: bp[0].diastolic, date: fmtDay(bp[0].recordedAt) }) : v?.stepsAvg != null ? t("{v} steps a day", { v: v.stepsAvg.toLocaleString(appLocale("en-GB")) }) : t("No readings yet"),
        body:
          !access.has("blood_pressure") && !access.has("health_metrics") ? (
            lock(t("Blood pressure and Activity & vitals"), "blood_pressure")
          ) : (
            <div className="flex flex-col" style={{ gap: 6 }}>
              {access.has("blood_pressure") ? (
                bp.length ? (
                  bp.slice(0, 5).map((r) => (
                    <p key={r.id} style={{ fontSize: textPx(13), color: INK.ch }}>
                      {`${fmtDay(r.recordedAt)} · ${r.systolic}/${r.diastolic}`}
                    </p>
                  ))
                ) : (
                  <p style={{ fontSize: textPx(12), color: INK.chF }}>{BP_NONE_LOGGED}</p>
                )
              ) : (
                lock(t("Blood pressure"), "blood_pressure")
              )}
              {access.has("health_metrics") && v?.stepsAvg != null && <p style={{ fontSize: textPx(13), color: INK.ch }}>{t("Steps: {v} a day on average", { v: v.stepsAvg.toLocaleString(appLocale("en-GB")) })}</p>}
            </div>
          ),
      },
      {
        key: "bio",
        icon: FlaskConical,
        title: t("Biomarkers"),
        summary: !labsVisible ? t("Not shared") : flags === undefined ? t("Loading…") : !flags ? t("Couldn't load") : flags.length === 0 ? t("No results shared") : outOf ? tn(flags.length, "{n} marker, {out} out of range", "{n} markers, {out} out of range", { out: outOf }) : tn(flags.length, "{n} marker", "{n} markers"),
        body: !labsVisible ? lock(t("Lab results"), "lab_results") : <FlagList flags={flags} />,
      },
      {
        key: "slp",
        icon: Moon,
        title: t("Sleep"),
        summary: !access.has("health_metrics") ? t("Not shared") : v?.sleepHours != null ? t("{h}h {m}m a night", { h: Math.floor(v.sleepHours), m: Math.round((v.sleepHours % 1) * 60) }) : t("Sleep per night and stages"),
        body: !access.has("health_metrics") ? lock(t("Activity & vitals"), "health_metrics") : <SleepTrendChart clientId={clientId} today={today} initial={chartInitial} />,
      },
      checkInsGroup,
    ];
  }

  return (
    <>
      {/* W8 SH4: the client's wins with Share, above the range row (Full coaching and Nutrition). */}
      {lane !== "clinical_overview" && <ClientWinsCard clientId={clientId} name={data.name} firstName={firstName} today={today} lane={lane} winSharing={stage?.winSharing} />}
      <div className="flex items-center justify-between" style={{ gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: textPx(12.5), fontWeight: 500, color: INK.chS }}>{t(RANGE_LINE[range])}</span>
        <SegmentedTabs
          items={[
            { key: "today", label: t("Today") },
            { key: "week", label: t("Week") },
            { key: "month", label: t("Month") },
          ]}
          activeKey={range}
          onChange={(k) => setRange(k as Range)}
          size="compact"
          tabHeight={32}
          trackStyle={{ padding: 4, gap: 4, borderRadius: 12, minWidth: 196 }}
          tabRadius={9}
          labelSize={12}
        />
      </div>
      {early && <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 10 }}>{t("Early data: trends start after the first full week.")}</p>}
      <button
        type="button"
        onClick={() => navigate(lane === "clinical_overview" ? `${PRO_ROUTES.insights}/vitals?client=${encodeURIComponent(clientId)}` : proClientPath(clientId, "insights"))}
        className="tap w-full flex items-center text-start"
        style={{ gap: 12, minHeight: 52, padding: "12px 16px", borderRadius: 20, background: INK.card, border: `1px solid ${INK.bCard}`, marginBottom: 10 }}
      >
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>
            {lane === "clinical_overview" ? t("Open in Insights") : t("Client insights")}
          </span>
          <span className="block" style={{ fontSize: textPx(12), color: INK.chS }}>
            {lane === "full_coaching" ? t("Activity, nutrition, vitals") : t("Activity, nutrition, vitals and biomarkers")}
          </span>
        </span>
        <ChevronRight size={16} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
      </button>
      <div className="flex flex-col" style={{ gap: 10 }}>
        {groups.map((g) => (
          <GroupCard key={g.key} group={g} open={open === g.key} onToggle={() => setOpen((o) => (o === g.key ? null : g.key))} />
        ))}
      </div>
    </>
  );
};

const GroupCard: React.FC<{ group: Group; open: boolean; onToggle: () => void }> = ({ group, open, onToggle }) => {
  const dark = useIsDark();
  const id = `grp-${group.key}`;
  return (
    <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20 }}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle} className="tap w-full flex items-center text-start" style={{ gap: 12, padding: 14, minHeight: 64 }}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 11, background: dark ? "rgba(174,161,220,0.14)" : "#F0EDF9" }}>
          <group.icon size={17} strokeWidth={1.75} aria-hidden style={{ color: INK.prAccent }} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: textPx(15), fontWeight: 700, color: INK.ch }}>
            {group.title}
          </span>
          <span className="block" style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.4 }}>
            {group.summary}
          </span>
        </span>
        <ChevronDown size={16} strokeWidth={2} aria-hidden style={{ color: INK.chF, transform: open ? "rotate(180deg)" : undefined, transition: "transform 160ms" }} />
      </button>
      {open && (
        <div id={id} style={{ padding: "0 14px 14px" }}>
          {group.body}
        </div>
      )}
    </div>
  );
};

const FlagList: React.FC<{ flags: BiomarkerFlag[] | null | undefined }> = ({ flags }) => {
  if (flags === undefined) return <ProCardSkeleton lines={3} />;
  if (!flags) return <p style={{ fontSize: textPx(12), color: INK.chF }}>{t("Couldn't load results.")}</p>;
  if (!flags.length) return <p style={{ fontSize: textPx(12), color: INK.chF }}>{t("No results shared yet.")}</p>;
  return (
    <div>
      {flags.map((f, i) => {
        const out = f.status === "out_of_range";
        const col = out ? INK.hi : f.status === "borderline" ? INK.goldInk : f.status === "normal" ? INK.good : INK.chF;
        const word = out ? (f.rangeHigh != null && f.latestValue > f.rangeHigh ? t("Above range") : t("Below range")) : f.status === "borderline" ? t("Borderline") : f.status === "normal" ? t("In range") : t("No range");
        return (
          <div key={`${f.markerKey ?? f.name}`} className="flex items-center" style={{ gap: 10, padding: "9px 0", borderBottom: i < flags.length - 1 ? `1px solid ${INK.b06}` : "none" }}>
            <span className="flex-1 min-w-0">
              <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 700, color: INK.ch }}>
                {f.name}
              </span>
              <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>
                {fmtDay(f.resultDate, true)}
              </span>
            </span>
            <span style={{ textAlign: "end" }}>
              <span className="block" style={{ fontSize: textPx(14), fontWeight: 800, color: INK.ch, whiteSpace: "nowrap" }}>
                {`${f.latestValue} `}
                <span style={{ fontSize: textPx(10.5), fontWeight: 600, color: INK.chF }}>{f.unit}</span>
              </span>
              <span className="block" style={{ fontSize: textPx(10.5), fontWeight: 700, color: col }}>
                {word}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
};
