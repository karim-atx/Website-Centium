import React, { useEffect, useMemo, useState } from "react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { ProChart, Swatch } from "../ProChart";
import { t, tn } from "../../../i18n/core";
import { appLocale } from "../../../i18n/format";
import { formatShortDate } from "../../../utils/date";
import { fetchNutritionTrend } from "../../../services/pro/forms";
import { hasNutritionCheckIns, scaleTracks, submittedTotal, type TrendWeek } from "./nutritionTrendModel";

/** "Oct 12" for a week's Monday (YYYY-MM-DD), in the app's language. */
const weekLabel = (ymd: string) => formatShortDate(new Date(`${ymd}T12:00:00`), { month: "short", day: "numeric" }, appLocale("en-US"));

/**
 * Round F (DW4) · the "Weekly nutrition check-in" block in CL11 (OURS, in
 * CL11's chart style: ProChart flat, the question line, the pin tooltip), fed
 * by nutrition_check_in_trend(p_client_id, 12) (Karim F17):
 * - a bar per local week (Monday to Sunday): submitted, missed and still due,
 *   stacked, with the exact counts in the tooltip and the summary;
 * - "Trends start after two check-ins" until two are submitted; then a chart
 *   per scale question (eating, energy…) with each submitted answer as a dot
 *   in its week: the client's own answers, never averaged, no score, no
 *   comparison, never the weight (the reader leaves it out).
 * It fetches on its own, outside CL11's three-series cap. Forms copied before
 * F2 have no template key, so a professional without a keyed form gets only
 * empty weeks: then the block renders nothing, and says nothing.
 */
export const NutritionCheckInTrend: React.FC<{ clientId: string; firstName: string }> = ({ clientId, firstName }) => {
  const dark = useIsDark();
  const [weeks, setWeeks] = useState<{ id: string; list: TrendWeek[] } | null>(null);
  useEffect(() => {
    let live = true;
    void fetchNutritionTrend(clientId).then((r) => {
      // A failed read shows nothing: CL11's own charts carry on.
      if (live) setWeeks({ id: clientId, list: r.ok ? r.data : [] });
    });
    return () => {
      live = false;
    };
  }, [clientId]);
  const list = useMemo(() => (weeks?.id === clientId ? weeks.list : []), [weeks, clientId]);
  const tracks = useMemo(() => scaleTracks(list), [list]);
  if (!hasNutritionCheckIns(list)) return null;

  const x = list.map((w) => weekLabel(w.weekStartsOn));
  const submitted = list.map((w) => w.submitted);
  const missed = list.map((w) => w.submitted + w.missed);
  const all = list.map((w) => w.submitted + w.missed + w.due);
  const top = Math.max(1, ...all);
  const dot = dark ? "#C3B3FB" : "#5F5093";
  const colours = { submitted: INK.tealDark, missed: INK.gold, due: INK.b10 };
  const total = submittedTotal(list);
  const counts = (w: TrendWeek) => [
    tn(w.submitted, "{n} submitted", "{n} submitted"),
    tn(w.missed, "{n} missed", "{n} missed"),
    ...(w.due ? [tn(w.due, "{n} still due", "{n} still due")] : []),
  ];

  return (
    <div style={{ marginBottom: 12 }}>
      <ProChart
        flat
        title={t("Weekly nutrition check-in")}
        question={t("Did {name} send it each week?", { name: firstName })}
        questionIcon
        x={x}
        min={0}
        max={top}
        series={[
          // Stacked by drawing order: the week's total (still due) first, then submitted + missed, then submitted.
          { key: "due", label: t("Check-ins still due"), type: "bar", color: colours.due, values: all, noLegend: true },
          { key: "missed", label: t("Check-ins missed"), type: "bar", color: colours.missed, values: missed, noLegend: true },
          { key: "submitted", label: t("Check-ins submitted"), type: "bar", color: colours.submitted, values: submitted, noLegend: true },
        ]}
        tooltip={(i) => (list[i] ? { title: t("Week starting {date}", { date: x[i] }), lines: counts(list[i]) } : null)}
        summary={t("Weekly nutrition check-in: {submitted} submitted and {missed} missed in the last {weeks} weeks.", {
          submitted: list.reduce((s, w) => s + w.submitted, 0),
          missed: list.reduce((s, w) => s + w.missed, 0),
          weeks: list.length,
        })}
        scrubHint={t("Drag sideways to scrub, tap a week to pin it")}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "6px 0 10px", fontSize: textPx(11), color: INK.chF }}>
        {(
          [
            [t("Check-ins submitted"), colours.submitted],
            [t("Check-ins missed"), colours.missed],
            [t("Check-ins still due"), colours.due],
          ] as const
        ).map(([label, c]) => (
          <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Swatch kind="bar" color={c} on />
            {label}
          </span>
        ))}
      </div>
      {total < 2 ? (
        <p style={{ fontSize: textPx(12), color: INK.chF, margin: 0 }}>{t("Trends start after two check-ins.")}</p>
      ) : (
        tracks.map((tr) => {
          const answered = tr.layers.flat().filter((v): v is number => v != null);
          return (
            <div key={tr.position} style={{ marginBottom: 12 }}>
              <ProChart
                flat
                title={tr.prompt}
                question={t("{name}'s own answer each week", { name: firstName })}
                questionIcon
                x={x}
                min={tr.min}
                max={tr.max}
                series={tr.layers.map((values, k) => ({ key: `a${k}`, label: tr.prompt, type: "points" as const, filled: true, color: dot, values, noLegend: true }))}
                tooltip={(i) => {
                  const vals = tr.layers.map((l) => l[i]).filter((v): v is number => v != null);
                  return vals.length ? { title: t("Week starting {date}", { date: x[i] }), lines: vals.map((v) => t("Answered {value} of {max}", { value: v, max: tr.max })) } : null;
                }}
                summary={`${tr.prompt}: ${answered.join(", ")}.`}
                scrubHint={t("Drag sideways to scrub, tap a week to pin it")}
              />
            </div>
          );
        })
      )}
    </div>
  );
};
