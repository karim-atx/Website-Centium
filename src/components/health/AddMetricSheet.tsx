import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { getBloodPressureForDay, type BloodPressureReading } from "../../services/blood-pressure";
import { classifyBloodPressure } from "../../services/blood-pressure/classify";
import { BP_CATEGORY_LABEL } from "../../services/blood-pressure/guidance";
import { BloodPressureSheet } from "./BloodPressureSheet";
import { LogWaterSheet } from "./log/LogWaterSheet";
import { LogWeightSheet } from "./log/LogWeightSheet";
import { X, Camera, ChevronRight } from "lucide-react";
import { useIsDark } from "../../hooks/useIsDark";
import { useOnline } from "../../hooks/useOnline";
import { textPx, linePx } from "../../theme/textSize";
import { useBackCloses } from "../../hooks/useBackCloses";
import { clock12 } from "../../utils/time12";
import { supabase } from "../../../lib/supabase/client";
import { t } from "../../i18n/core";
import { appLocale } from "../../i18n/format";

// HO1.1 "Add metric popup" (home-handover.md, HO1.1; checklist
// design-handover/v5-partB/frame-check/HO1.1.md). A centred card over Home.
//
// A CHOOSER (V6-129): nothing is saved from this card any more. The inline
// water tiles and the autosaving weight field are gone; each row opens the
// shared log sheet from Health B (HE1.1.1 Log water, HE1.7.1 Log weight,
// HE1.6.1 Log blood pressure), stacked over this card so the card shows the
// new value when the sheet saves. Add records goes to Medical Records.

/**
 * The card's colours that are not a shared token, as [light, dark]. Light
 * values are the handover's light column; the lavender ones follow the colour
 * theme through the th-/thi- variables (Centium values unchanged). Dark values
 * are the handover's dark column (shell #1C1F28, border #A991FE, title and
 * icons #C3B3FB, strip #303141 with #C3B3FB ink). Greys go through the
 * charcoal tokens in dark so High contrast lifts them; light greys are swapped
 * for the ink in High contrast below.
 */
const AM_COLORS = {
  shell: ["rgb(var(--th-ecebfe))", "#1C1F28"],
  shellBorder: ["rgb(var(--th-b2a9f4))", "rgb(var(--th-a991fe))"],
  title: ["rgb(var(--thi-9c7ef8))", "rgb(var(--thi-c3b3fb))"],
  label: ["#655B69", "rgb(var(--c-charcoal-soft))"],
  caption: ["rgb(var(--thi-827c9c))", "rgb(var(--c-charcoal-soft))"],
  card: ["#FFFDF9", "#1C1F28"],
  row: ["#F3F3F4", "#242730"],
  icon: ["rgb(var(--thi-4a22ce))", "rgb(var(--thi-c3b3fb))"],
  strip: ["rgb(var(--th-f0f0fd))", "rgb(var(--th-303141))"],
  stripInk: ["rgb(var(--thi-1a00e0))", "rgb(var(--thi-c3b3fb))"],
  alertStrip: ["#FBE7E4", "#3C2A30"],
  alertInk: ["#C0392B", "#F09A8E"],
} as const;
type AmKey = keyof typeof AM_COLORS;

const INK = "rgb(var(--c-charcoal))";

const WeightGlyph: React.FC = () => (
  <svg width={28} height={26} viewBox="0 0 93 85" fill="none" style={{ display: "block", flex: "none", color: "var(--am-icon)" }}>
    <rect x={1.5} y={1.5} width={90} height={82} rx={13} fill="none" stroke="currentColor" strokeWidth={3} />
    <path d="M18 24 C30 13 62 13 72 24 L63 40 C52 34 38 34 28 40 Z" fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="round" />
    <path d="M30.5 17.5 L33 24 M44 16 L44 24 M58.5 17.5 L56 24" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    <path d="M50 22 L41.5 37.5" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
  </svg>
);

const CuffGlyph: React.FC = () => (
  <svg width={27} height={24} viewBox="-1 -1 92 83" fill="none" style={{ display: "block", flex: "none", color: "var(--am-icon)" }}>
    <path
      d="M1.5 16 L1.5 50 C1.5 55 5 58.5 9.5 58.5 L37.5 58.5 C42 58.5 45.5 55 45.5 50 L45.5 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <ellipse cx={23.5} cy={16} rx={22} ry={6} fill="none" stroke="currentColor" strokeWidth={4} />
    <path
      d="M23 58.5 L23 70 C23 76 27 79.5 33 79.5 L57 79.5 C63 79.5 67.5 76 67.5 70 L67.5 44"
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <rect x={65} y={38.5} width={6} height={6} rx={1.5} fill="none" stroke="currentColor" strokeWidth={4} />
    <ellipse cx={73} cy={19} rx={13} ry={16} fill="none" stroke="currentColor" strokeWidth={4} />
  </svg>
);

// OURS (V6-129): the water row's glyph, a line glass with its water level, in
// the cuff glyph's 27 x 24 box and the same line weight and ink.
const WaterRowGlyph: React.FC = () => (
  <svg width={27} height={24} viewBox="0 0 27 24" fill="none" style={{ display: "block", flex: "none", color: "var(--am-icon)" }}>
    <path d="M6.5 2.5 H20.5 L18.6 21.5 H8.4 Z" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />
    <path d="M7.6 10 C9.6 11 11.4 9 13.5 10 C15.6 11 17.4 9 19.4 10" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
  </svg>
);

const CheckCircleGlyph: React.FC = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "block", flex: "none", color: "var(--am-strip-ink)" }}
  >
    <circle cx={12} cy={12} r={9.2} />
    <path d="M7.8 12.3 10.6 15l5.6-5.8" />
  </svg>
);


/** "Today · 7:05 AM", or "Thu, Oct 1 · 7:12 AM" for another day (12-hour rule). */
function readingTime(recordedAt: string, isToday: boolean): string {
  const d = new Date(recordedAt);
  const clock = clock12(d);
  if (isToday) return t("Today · {date}", { date: clock });
  return `${d.toLocaleDateString(appLocale("en-US"), { weekday: "short", month: "short", day: "numeric" })} · ${clock}`;
}

/** The local day's [start, end) as ISO instants. */
function dayBounds(day: string): [string, string] {
  const [y, m, d] = day.split("-").map(Number);
  return [new Date(y, m - 1, d).toISOString(), new Date(y, m - 1, d + 1).toISOString()];
}

type WeightReading = { value: number; recordedAt: string | null };

export const AddMetricSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  // Batch E (E5): the phone's back closes this first.
  useBackCloses(open, onClose);
  const {
    water,
    waterGoalMl,
    weightByDate,
    selectedDate,
    today,
    authUserId,
    recoverySensitive,
    recoveryModePending,
    accessibility,
  } = useApp();
  const dark = useIsDark();
  const hc = !!accessibility.highContrast;
  const online = useOnline();
  const am = (key: AmKey): string => {
    // High contrast: the light greys (label, captions) become the ink.
    if (hc && !dark && (key === "label" || key === "caption")) return INK;
    return AM_COLORS[key][dark ? 1 : 0];
  };
  const isToday = selectedDate === today;
  // KEEP-SAFETY K3: weight is never shown, nor read, while recovery-sensitive
  // mode is on or not yet known.
  const weightHidden = recoverySensitive || recoveryModePending;
  const dayWeight = weightByDate[selectedDate];

  // Blood pressure, in public.blood_pressure_readings: the day's latest
  // reading, or nothing.
  const [bpLatest, setBpLatest] = useState<BloodPressureReading | null>(null);
  const [bpSheetOpen, setBpSheetOpen] = useState(false);
  const [waterSheetOpen, setWaterSheetOpen] = useState(false);
  const [weightSheetOpen, setWeightSheetOpen] = useState(false);

  // The selected day's weigh-in with its recorded_at (health_metrics, owner
  // SELECT). undefined = loading; null = none for the day.
  const [weight, setWeight] = useState<WeightReading | null | undefined>(undefined);
  const [weightReload, setWeightReload] = useState(0);

  useEffect(() => {
    if (!open || !authUserId) return;
    let cancelled = false;
    void getBloodPressureForDay(authUserId, selectedDate).then((result) => {
      if (cancelled || !result.ok) return;
      setBpLatest(result.reading);
    });
    return () => {
      cancelled = true;
      setBpLatest(null);
    };
  }, [open, authUserId, selectedDate]);

  useEffect(() => {
    if (!open || weightHidden || !authUserId) return;
    let cancelled = false;
    const [from, to] = dayBounds(selectedDate);
    void supabase
      .from("health_metrics")
      .select("value, recorded_at")
      .eq("user_id", authUserId)
      .eq("metric_type", "weight")
      .gte("recorded_at", from)
      .lt("recorded_at", to)
      .order("recorded_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        const row = data?.[0];
        if (row) setWeight({ value: Number(row.value), recordedAt: row.recorded_at });
        // A failed read (or a reading the app holds that the query missed)
        // never reads as "no weigh-in": the day's value from the app's own
        // history stands, without a time.
        else setWeight(dayWeight !== undefined ? { value: dayWeight, recordedAt: null } : null);
      });
    return () => {
      cancelled = true;
      setWeight(undefined);
    };
  }, [open, weightHidden, authUserId, selectedDate, dayWeight, weightReload]);

  // Lock background scroll while the card is open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Add records: Medical Records (HE1.9 / HE1.9.2 live there).
  const navigate = useNavigate();
  const handleAddRecords = () => {
    onClose();
    navigate("/app/health/records");
  };

  if (!open) return null;

  const labelStyle: React.CSSProperties = {
    margin: "0 0 6px",
    fontSize: textPx(12),
    lineHeight: linePx(18),
    fontWeight: 400,
    letterSpacing: "0.2px",
    color: am("label"),
  };
  const rowTitle: React.CSSProperties = { display: "block", fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 600, color: INK };
  const rowCaption: React.CSSProperties = { display: "block", fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 400, color: am("caption") };
  const chevron = <ChevronRight size={12} strokeWidth={2.2} className="rtl:-scale-x-100" style={{ color: am("icon"), flex: "none" }} />;

  const weightLoading = !weightHidden && weight === undefined && !!authUserId;
  const weightValue = !weightHidden && weight ? weight : null;

  // The card saves nothing itself any more (V6-129), so the strip has no
  // failed save of its own to report: each log sheet reports its own. Offline,
  // the sheets queue an entry and send it when the connection is back.
  const offline = !online;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* X-07: the same scrim in light and dark. */}
      <div
        className="absolute inset-0 backdrop-blur-[3px] animate-fade-in"
        style={{ background: "rgba(36,31,27,0.4)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-metric-title"
        className="relative w-full sm:max-w-md rounded-[20px] overflow-hidden animate-popup-in flex flex-col max-h-[calc(100dvh-32px)]"
        style={{
          background: am("shell"),
          // Hairlines as inset shadows, not borders: Chromium snaps a border under
          // 1 px (and 1.09545) to whole pixels; a shadow keeps the literal width.
          // The padding keeps the content inside the hairline. Light keeps the
          // lift shadow; dark has none.
          padding: 0.547723,
          boxShadow: `inset 0 0 0 0.547723px ${am("shellBorder")}${dark ? "" : ", 0 16px 40px rgb(0 0 0 / 0.20)"}`,
          // The line glyphs above (weight, cuff, water, check) read these.
          ["--am-icon" as string]: am("icon"),
          ["--am-strip-ink" as string]: am("stripInk"),
        }}
      >
        <div className="relative shrink-0 flex items-center justify-center" style={{ height: 42 }}>
          <p
            id="add-metric-title"
            style={{
              margin: 0,
              fontSize: textPx(20),
              lineHeight: linePx(30),
              fontWeight: 800,
              letterSpacing: "-0.3px",
              color: am("title"),
              whiteSpace: "nowrap",
            }}
          >
            {t("Add Metric")}
          </p>
          {/* 26 ring inside a 44 x 44 target, the ring where the handover draws it. */}
          <button
            onClick={onClose}
            aria-label={t("Close")}
            className="tap absolute flex items-center justify-center"
            style={{ insetInlineEnd: 3, top: -1, width: 44, height: 44, background: "none", border: "none", padding: 0 }}
          >
            <span
              className="flex items-center justify-center rounded-full box-border"
              style={{ width: 26, height: 26, boxShadow: `inset 0 0 0 1.09545px ${am("title")}` }}
            >
              <X size={12} strokeWidth={2.4} style={{ color: am("title") }} />
            </span>
          </button>
        </div>

        {/* Scrolls only on a screen too short to fit the card. */}
        <div className="min-h-0 overflow-y-auto" style={{ background: am("card"), borderRadius: 18, padding: 14 }}>
          <div className="flex items-start justify-between gap-3" style={{ marginBottom: 9 }}>
            <p style={{ ...labelStyle, margin: 0 }}>{t("WATER")}</p>
            <div style={{ textAlign: "end" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: textPx(22),
                  lineHeight: linePx(22),
                  fontWeight: 800,
                  letterSpacing: "-0.4px",
                  color: INK,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {t("{n}L", { n: (water / 1000).toFixed(2) })}
              </p>
              <p style={{ margin: "3px 0 0", fontSize: textPx(10), lineHeight: linePx(15), fontWeight: 400, color: am("caption") }}>
                {t("of {n}L goal", { n: (waterGoalMl / 1000).toFixed(1) })}
              </p>
            </div>
          </div>

          {/* OURS (V6-129): the water tiles' place, one row in the drawn grey-row
              pattern, opening the shared Log water sheet. */}
          <button
            onClick={() => setWaterSheetOpen(true)}
            className="tap w-full flex items-center gap-[9px] text-start"
            style={{ background: am("row"), border: "none", borderRadius: 12, padding: "9px 11px", marginBottom: 14 }}
          >
            <WaterRowGlyph />
            <span className="flex-1 min-w-0">
              <span style={rowTitle}>{t("Log water")}</span>
              <span style={rowCaption}>{t("Add a drink to this day")}</span>
            </span>
            {chevron}
          </button>

          <div className="grid grid-cols-2 gap-[10px]" style={{ marginBottom: 13 }}>
            <div className="min-w-0">
              <p style={labelStyle}>{isToday ? t("WEIGHT TODAY") : t("WEIGHT FOR THIS DAY")}</p>
              <button
                onClick={() => setWeightSheetOpen(true)}
                // LogWeightSheet renders nothing in recovery-sensitive mode
                // (HE1.7.1 K1), so the box does not pretend to open it.
                disabled={weightHidden}
                aria-label={weightValue ? undefined : t("Log weight")}
                className="tap flex items-center w-full text-start box-border"
                style={{ background: am("row"), border: "none", borderRadius: 12, padding: "0 10px", height: 42, gap: 8 }}
              >
                <WeightGlyph />
                <span className="flex-1 min-w-0">
                  {weightLoading ? (
                    <span
                      aria-hidden="true"
                      className="block animate-pulse"
                      style={{ width: 40, height: 16, borderRadius: 4, background: "rgb(var(--c-charcoal) / 0.1)" }}
                    />
                  ) : weightValue ? (
                    <>
                      <span
                        className="truncate"
                        style={{
                          display: "block",
                          fontSize: textPx(15),
                          lineHeight: linePx(18),
                          fontWeight: 700,
                          color: INK,
                          whiteSpace: "nowrap",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {weightValue.value.toFixed(1)}
                        <span style={{ fontSize: textPx(11), fontWeight: 400, color: am("caption"), marginInlineStart: 2 }}>{t("kg")}</span>
                      </span>
                      {weightValue.recordedAt && (
                        <span
                          className="truncate"
                          style={{
                            display: "block",
                            fontSize: textPx(7.5),
                            lineHeight: linePx(10),
                            fontWeight: 400,
                            color: am("caption"),
                            whiteSpace: "nowrap",
                          }}
                        >
                          {readingTime(weightValue.recordedAt, isToday)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="truncate" style={{ display: "block", fontSize: textPx(15), lineHeight: linePx(18), fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>
                      {t("Log weight")}
                    </span>
                  )}
                </span>
                {!weightHidden && chevron}
              </button>
            </div>
            <div className="min-w-0">
              <p style={labelStyle}>{t("ADD RECORDS")}</p>
              <button
                onClick={handleAddRecords}
                aria-label={t("Add records")}
                className="tap flex items-center w-full text-start box-border"
                style={{ background: am("row"), border: "none", borderRadius: 12, padding: "0 8px", height: 42, gap: 7 }}
              >
                <Camera size={21} strokeWidth={1.8} style={{ color: am("icon"), flex: "none" }} />
                <span className="flex-1 min-w-0">
                  <span className="truncate" style={{ display: "block", fontSize: textPx(8.5), lineHeight: linePx(12.8), fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>
                    {t("Add Photo / Upload File")}
                  </span>
                  <span className="truncate" style={{ display: "block", fontSize: textPx(7.5), fontWeight: 400, color: am("caption"), whiteSpace: "nowrap" }}>
                    {t("Lab results, reports, etc.")}
                  </span>
                </span>
                <ChevronRight size={12} strokeWidth={2.2} className="rtl:-scale-x-100" style={{ color: am("icon"), flex: "none" }} />
              </button>
            </div>
          </div>

          <p style={labelStyle}>{t("BLOOD PRESSURE")}</p>
          <button
            onClick={() => setBpSheetOpen(true)}
            className="tap w-full flex items-center gap-[9px] text-start"
            style={{ background: am("row"), border: "none", borderRadius: 12, padding: "9px 11px", marginBottom: 13 }}
          >
            <CuffGlyph />
            <span className="flex-1 min-w-0">
              {bpLatest ? (
                <>
                  {/* V6-140: the logged state keeps the repo copy (category + pulse). */}
                  <span style={{ display: "block", fontSize: textPx(15), fontWeight: 700, color: INK }}>
                    {bpLatest.systolic}/{bpLatest.diastolic}
                    <span style={{ fontSize: textPx(11), fontWeight: 500, color: am("caption") }}> {t("mmHg")}</span>
                  </span>
                  <span style={{ display: "block", fontSize: textPx(10.5), lineHeight: linePx(15.8), color: am("label") }}>
                    {BP_CATEGORY_LABEL[classifyBloodPressure(bpLatest.systolic, bpLatest.diastolic)]}
                    {bpLatest.pulse != null && ` · ${t("{n} bpm", { n: bpLatest.pulse })}`}
                  </span>
                </>
              ) : (
                <>
                  <span style={rowTitle}>{t("Add a reading")}</span>
                  <span style={rowCaption}>{t("Nothing recorded for this day")}</span>
                </>
              )}
            </span>
            {chevron}
          </button>

          <div
            className="flex items-center gap-[9px]"
            style={{ background: am(offline ? "alertStrip" : "strip"), borderRadius: 12, padding: "11px 13px" }}
            role={offline ? "status" : undefined}
          >
            {!offline && <CheckCircleGlyph />}
            <span style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: am(offline ? "alertInk" : "stripInk") }}>
              {offline ? t("You're offline. Entries save when you reconnect.") : t("Your entries are saved automatically.")}
            </span>
          </div>

          {/* Steps, sleep and calories burned are not manually loggable and
              nothing syncs them either: device sync is not built. */}
          <p style={{ margin: "13px 4px 2px", fontSize: textPx(10), lineHeight: linePx(15), fontWeight: 400, color: am("caption"), textAlign: "center" }}>
            {t("Steps, sleep and calories burned would come from a connected device. Device sync isn't available yet.")}
          </p>
        </div>
      </div>

      <LogWaterSheet open={waterSheetOpen} onClose={() => setWaterSheetOpen(false)} />
      <LogWeightSheet
        open={weightSheetOpen}
        onClose={() => setWeightSheetOpen(false)}
        onSaved={() => setWeightReload((n) => n + 1)}
      />
      <BloodPressureSheet
        open={bpSheetOpen}
        onClose={() => setBpSheetOpen(false)}
        // ALWAYS ADDS, never edits: the row shows the day's latest reading as
        // information; tapping it records a new one.
        editing={null}
        onSaved={() => {
          if (!authUserId) return;
          void getBloodPressureForDay(authUserId, selectedDate).then((r) => {
            if (r.ok) setBpLatest(r.reading);
          });
        }}
      />
    </div>,
    document.body
  );
};
