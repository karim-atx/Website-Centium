import { useMemo, useState } from "react";
import { Activity, BookOpen, CalendarDays, Plus, Trash2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { textPx, linePx } from "../../../theme/textSize";
import { localDayOf } from "../../../utils/date";
import { clock12 } from "../../../utils/time12";
import {
  CapsLabel,
  ChartCard,
  FreshnessLine,
  HistoryCard,
  MetricPage,
  OFFLINE_ACTION,
  OFFLINE_CACHED,
  SAVE_FAILED,
  useHealthMode,
  useMetricRangeState,
  type HistoryItem,
  type MetricMenuItem,
} from "../../../components/health/metric/MetricKit";
import { HealthPopup } from "../../../components/health/metric/HealthPopup";
import {
  dayLabel,
  isCurrentPeriod,
  monthLong,
  monthShort,
  periodLabel,
  periodOf,
  periodTitle,
  previousPeriod,
  relativeDayTitle,
  stepAnchor,
} from "../../../components/health/metric/periods";
import {
  BloodPressureChart,
  BloodPressureHero,
  BpReferenceCard,
  BpSafetyCard,
  BpTiles,
  bpLegend,
  rangeInk,
  type BpDayReading,
  type BpHalf,
  type BpHeroData,
} from "../../../components/health/metric/BloodPressureParts";
import { BloodPressureSheet } from "../../../components/health/BloodPressureSheet";
import { BpHowToMeasureSheet } from "../../../components/health/BpHowToMeasureSheet";
import { MeasuredOnPopup } from "../../../components/health/log/LogSheetParts";
import { HealthDisclaimer } from "../../../components/ui/HealthDisclaimer";
import { Toast } from "../../../components/ui/Toast";
import { FlagChip } from "../../../components/ui/FlagNote";
import { CheckFlagChip } from "../../../components/health-checks/CheckFlag";
import { useCheckFlags } from "../../../components/health-checks/useCheckFlags";
import { usePregnancyFlags } from "../../../components/pregnancy/usePregnancyFlags";
import { deleteBloodPressure, type BloodPressureReading } from "../../../services/blood-pressure";
import { averageReading, categoryCounts, classifyBloodPressure, isSevere, splitByTimeOfDay } from "../../../services/blood-pressure/classify";
import { BP_CATEGORY_LABEL, BP_NO_READINGS } from "../../../services/blood-pressure/guidance";
import { t, tk, tn, tx } from "../../../i18n/core";

// HE1.6 Blood pressure (opens on Week) with HE1.6.d / .m / .y and HE1.6.a.
//
// SAFETY, KEPT (HE1.6 K1-K8):
// - K1: while the newest reading is very high (isSevere, strictly above
//   180/120) and no pregnancy replaces the bands, SEVERE_READING_MESSAGE sits
//   on a card above the hero, word for word, with How to measure.
// - K2 / OURS-health-bp-pregnancy-levels: in a pregnancy the adult
//   categories, colours, counts, reference rows and severe card step aside;
//   the newest reading's PREGNANCY_FLAG_COPY level is the card and the hero
//   pill; reference lines move to 140 / 90. "Pregnancy levels" rows and "Your
//   maternity team may give you your own targets." are V6-03: hidden until
//   clinicalCopy.REVIEWED.
// - K3: the advanced-monitoring check flag chip on each reading (adult only),
//   never naming the mode.
// - V6-04: category words in green #357A4D (Normal) or red #C2453F (all
//   others), words from BP_CATEGORY_LABEL. V6-05: no category on Month / Year
//   averages. BP_DETAIL_FOOTER always shows. V6-136: morning before 12:00.
// - HE1.6.a: the log sheet (Health B, HE1.6.1) opens BpVeryHighPopup itself
//   after a save that shouldOpenBpVeryHigh() matches (adult very high or
//   pregnancy Urgent); this page only re-reads in onSaved.

// Catalogue keys, t() where shown; positions ("sitting", "standing", "lying") are keys too.
const ARM = { left: tk("left arm"), right: tk("right arm") } as const;
const ARM_CAP = { left: tk("Left arm"), right: tk("Right arm") } as const;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function BloodPressurePage() {
  const { bloodPressure, reloadBloodPressure, profileReady } = useApp();
  const { dark } = useHealthMode();
  const { range, setRange, anchor, setAnchor, openDay, today } = useMetricRangeState("week");
  const checkFlags = useCheckFlags();
  const pregnancyFlags = usePregnancyFlags();
  const inPregnancy = pregnancyFlags.replacesBpBands;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<BloodPressureReading | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [goToOpen, setGoToOpen] = useState(false);
  const [deleting, setDeleting] = useState<BloodPressureReading | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const readings: BpDayReading[] = useMemo(() => bloodPressure.map((r) => ({ ...r, day: localDayOf(r.recordedAt) })), [bloodPressure]);
  const newest = readings[0] ?? null;
  const loading = !profileReady;
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  const period = periodOf(range, anchor);
  const current = isCurrentPeriod(period, today);
  const inP = readings.filter((r) => r.day >= period.start && r.day <= period.end);
  const pAvg = averageReading(inP);
  // Tiles follow the period; the Day view keeps its week (HE1.6.d #34 "1 reading this week").
  const tilePeriod = range === "day" ? periodOf("week", anchor) : period;
  const inTile = readings.filter((r) => r.day >= tilePeriod.start && r.day <= tilePeriod.end);
  const prevTile = previousPeriod(tilePeriod);
  const inPrev = readings.filter((r) => r.day >= prevTile.start && r.day <= prevTile.end);

  const latestCategory = newest && !inPregnancy ? classifyBloodPressure(newest.systolic, newest.diastolic) : null;
  const severe = !!newest && !inPregnancy && isSevere(newest.systolic, newest.diastolic);
  const newestFlag = newest ? pregnancyFlags.bp(newest) : null;

  // --- hero -------------------------------------------------------------------
  const hero: BpHeroData | null = (() => {
    if (range === "day" || range === "week") {
      const r = inP[0] ?? (current ? newest : null);
      if (!r) return null;
      const when = `${relativeDayTitle(localDayOf(r.recordedAt), today)} ${clock12(r.recordedAt)}`;
      const where = [r.arm ? t(ARM_CAP[r.arm]) : null, r.position ? t(r.position) : null].filter(Boolean).join(" · ");
      const facts = [r.pulse != null ? t("{n} bpm pulse", { n: r.pulse }) : null, where || null, when];
      let pill: BpHeroData["pill"] = null;
      if (inPregnancy) {
        const f = pregnancyFlags.bp(r);
        pill = f ? { text: f.label, inRange: false } : null;
      } else {
        const c = classifyBloodPressure(r.systolic, r.diastolic);
        pill = { text: BP_CATEGORY_LABEL[c], inRange: c === "normal" };
      }
      return { systolic: r.systolic, diastolic: r.diastolic, facts, pill };
    }
    if (!pAvg) return null;
    const label = range === "month" ? periodLabel(period) : period.start.slice(0, 4);
    return {
      systolic: pAvg.systolic,
      diastolic: pAvg.diastolic,
      facts: [tn(inP.length, "{n} reading", "{n} readings"), pAvg.pulse !== null ? t("Avg pulse {n} bpm", { n: pAvg.pulse }) : null, label],
      // V6-05: the average is never classified.
      pill: null,
    };
  })();

  // --- tiles ------------------------------------------------------------------
  const halves = splitByTimeOfDay(inTile);
  const prevHalves = splitByTimeOfDay(inPrev);
  const prevText = (bp: string) => (range === "month" ? t("Last month {bp}", { bp }) : range === "year" ? t("Last year {bp}", { bp }) : t("Last week {bp}", { bp }));
  const half = (rs: BpDayReading[], prev: BpDayReading[]): BpHalf => {
    const a = averageReading(rs);
    const p = averageReading(prev);
    return { avg: a ? { systolic: a.systolic, diastolic: a.diastolic } : null, count: rs.length, previous: p ? prevText(`${p.systolic}/${p.diastolic}`) : null };
  };
  const countWord = (n: number) =>
    (range === "day" || range === "week") && (current || range === "day") ? tn(n, "{n} reading this week", "{n} readings this week") : tn(n, "{n} reading", "{n} readings");

  // --- foot and summary ----------------------------------------------------------
  const n = inP.length;
  const avgText = pAvg ? `${pAvg.systolic}/${pAvg.diastolic}` : "";
  const foot = (() => {
    if (range === "day") {
      if (!n) return anchor === today ? t("No readings today") : t("No readings this day");
      const { morning, evening } = splitByTimeOfDay(inP);
      const base = anchor === today ? tn(n, "{n} reading today", "{n} readings today") : tn(n, "{n} reading", "{n} readings");
      return morning.length && !evening.length ? t("{count} · an evening reading makes the day comparable", { count: base }) : base;
    }
    if (!n) return range === "week" ? t("No readings this week") : range === "month" ? t("No readings this month") : t("No readings this year");
    if (range === "week")
      return current
        ? tn(n, "{n} reading this week · average {avg}", "{n} readings this week · average {avg}", { avg: avgText })
        : tn(n, "{n} reading · average {avg}", "{n} readings · average {avg}", { avg: avgText });
    if (range === "month") return tn(n, "{n} reading · average {avg}", "{n} readings · average {avg}", { avg: avgText });
    const months = [...new Set(inP.map((r) => Number(r.day.slice(5, 7))))].sort((a, b) => a - b);
    const span = months.length === 1 ? monthShort(months[0]) : t("{start} to {end}", { start: monthShort(months[0]), end: monthShort(months[months.length - 1]) });
    return `${tn(n, "{n} reading", "{n} readings")} · ${span}`;
  })();
  const summary = (() => {
    // Whole sentences, joined by a space.
    const first =
      range === "day"
        ? anchor === today
          ? t("Blood pressure today.")
          : t("Blood pressure {day}.", { day: dayLabel(anchor) })
        : range === "week"
          ? current
            ? t("Blood pressure this week.")
            : t("Blood pressure {day}.", { day: periodLabel(period) })
          : t("Blood pressure in {period}.", { period: range === "month" ? monthLong(Number(period.start.slice(5, 7))) : periodLabel(period) });
    if (!n) return [first, t("No readings.")].join(" ");
    if (n === 1)
      return [first, t("One reading, {sys} over {dia}, {day} at {time}.", { sys: inP[0].systolic, dia: inP[0].diastolic, day: dayLabel(inP[0].day), time: clock12(inP[0].recordedAt) })].join(" ");
    return [first, tn(n, "{n} reading.", "{n} readings."), t("Average {sys} over {dia}.", { sys: pAvg?.systolic ?? "", dia: pAvg?.diastolic ?? "" })].join(" ");
  })();

  // --- history (newest first, every reading in the metric window) ---------------
  const history: HistoryItem[] = readings.map((r) => {
    const c = classifyBloodPressure(r.systolic, r.diastolic);
    const pFlag = pregnancyFlags.bp(r);
    const cFlag = inPregnancy ? null : checkFlags.bp(r);
    const when = `${relativeDayTitle(r.day, today)} ${clock12(r.recordedAt)}`;
    const where = [r.arm ? t(ARM[r.arm]) : null, r.position ? t(r.position) : null].filter(Boolean).join(", ");
    return {
      key: r.id,
      title: `${r.systolic}/${r.diastolic}`,
      meta: where ? `${when} · ${where}` : when,
      meta2: r.notes ?? undefined,
      icon: Activity,
      value: r.pulse != null ? t("{n} bpm", { n: r.pulse }) : "",
      sub: (
        <span className="inline-flex items-center justify-end flex-wrap" style={{ gap: 4 }}>
          {inPregnancy ? (pFlag ? <FlagChip tone={pFlag.level} label={pFlag.label} /> : null) : <span style={{ color: rangeInk(c === "normal", dark) }} data-bp-word>{BP_CATEGORY_LABEL[c]}</span>}
          {cFlag && <CheckFlagChip flag={cFlag} />}
        </span>
      ),
      onEdit: () => {
        if (offline) return setToast(OFFLINE_ACTION);
        setEditing(r);
        setSheetOpen(true);
      },
      onDelete: () => (offline ? setToast(OFFLINE_ACTION) : setDeleting(r)),
    };
  });

  const openLog = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const menu: MetricMenuItem[] = [
    { value: "how", label: t("How to measure"), icon: <BookOpen size={17} />, onSelect: () => setHowOpen(true) },
    { value: "date", label: t("Go to date"), icon: <CalendarDays size={17} />, onSelect: () => setGoToOpen(true) },
  ];

  const confirmDelete = async () => {
    const r = deleting;
    setDeleting(null);
    if (!r) return;
    const res = await deleteBloodPressure(r.id);
    if (!res.ok) return setToast(SAVE_FAILED);
    reloadBloodPressure();
  };

  return (
    <MetricPage metric="blood-pressure" title={t("Blood pressure")} range={range} onRangeChange={setRange} menu={menu} cta={{ label: t("Log blood pressure"), icon: <Plus size={16} />, onClick: openLog }}>
      {severe && <BpSafetyCard kind="severe" onHowToMeasure={() => setHowOpen(true)} />}
      {newestFlag && <BpSafetyCard kind={newestFlag.level === "urgent" ? "urgent" : "same-day"} flag={newestFlag} onHowToMeasure={() => setHowOpen(true)} />}
      <BloodPressureHero
        data={hero}
        loading={loading}
        ariaLabel={
          hero
            ? `${t("Blood pressure {sys} over {dia} mmHg.", { sys: hero.systolic, dia: hero.diastolic })} ${hero.facts.filter(Boolean).join(". ")}.${hero.pill ? ` ${hero.pill.text}.` : ""}`
            : t("Blood pressure, no readings")
        }
        empty={
          readings.length === 0
            ? { title: BP_NO_READINGS, hint: t("Tap to add one"), onTap: openLog }
            : {
                title: BP_NO_READINGS,
                hint:
                  range === "day"
                    ? t("Nothing logged this day")
                    : range === "week"
                      ? t("No readings this week")
                      : range === "month"
                        ? t("No readings this month")
                        : t("No readings this year"),
                onTap: openLog,
              }
        }
      />
      {offline && readings.length > 0 && <FreshnessLine offline>{t(OFFLINE_CACHED)}</FreshnessLine>}
      <ChartCard
        metric="blood-pressure"
        title={range === "month" && !current ? monthLong(Number(period.start.slice(5, 7))) : periodTitle(period, today)}
        periodLabel={periodLabel(period)}
        onPrev={() => setAnchor(stepAnchor(range, anchor, -1))}
        onNext={() => setAnchor(stepAnchor(range, anchor, 1))}
        nextDisabled={current}
        legend={bpLegend(range, dark, inPregnancy)}
        foot={foot}
        loading={loading}
        summary={summary}
      >
        <BloodPressureChart range={range} period={period} readings={inP} today={today} reference={inPregnancy ? [140, 90] : [120, 80]} average={range === "month" && pAvg ? pAvg : null} />
      </ChartCard>
      <BpTiles morning={half(halves.morning, prevHalves.morning)} evening={half(halves.evening, prevHalves.evening)} countWord={countWord} />
      {/* K6: the old count line's rule, kept as a note (V6-136). */}
      <p style={{ marginTop: 6, fontSize: textPx(9.5), lineHeight: linePx(14.3), fontWeight: 600, color: "rgb(var(--c-charcoal-faint))" }}>{t("Morning is before noon.")}</p>
      <BpReferenceCard latest={latestCategory} counts={inPregnancy || !n ? null : categoryCounts(inP)} pregnancy={inPregnancy} />
      {readings.length > 0 && (
        <>
          <CapsLabel>{t("History")}</CapsLabel>
          <HistoryCard metric="blood-pressure" icon={Activity} items={history} loading={loading} />
        </>
      )}
      <HealthDisclaimer className="mt-[18px]" />

      <BloodPressureSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        editing={editing}
        onSaved={reloadBloodPressure}
      />
      <BpHowToMeasureSheet open={howOpen} onClose={() => setHowOpen(false)} />
      <HealthPopup
        open={!!deleting}
        onClose={() => setDeleting(null)}
        tile={{ background: "#FCEDEC", darkBackground: "#3C2A30", icon: <Trash2 size={18} style={{ color: dark ? "#F09A8E" : "#B4372C" }} /> }}
        title={tx("Delete this entry?", "health")}
        meta={deleting ? `${t("{sys}/{dia} mmHg", { sys: deleting.systolic, dia: deleting.diastolic })} · ${relativeDayTitle(localDayOf(deleting.recordedAt), today)} ${clock12(deleting.recordedAt)}` : undefined}
        body={t("This removes it from your history and totals.")}
        secondary={{ label: t("Cancel"), onClick: () => setDeleting(null) }}
        primary={{ label: t("Delete"), tone: "destructive", onClick: () => void confirmDelete() }}
      />
      <MeasuredOnPopup
        open={goToOpen}
        onClose={() => setGoToOpen(false)}
        value={new Date(`${anchor}T12:00:00`)}
        today={today}
        dateOnly
        title={t("Go to date")}
        onDone={(d) => {
          setGoToOpen(false);
          openDay(iso(d));
        }}
      />
      <Toast open={!!toast} message={toast ? t(toast) : ""} onExpire={() => setToast(null)} />
    </MetricPage>
  );
}
