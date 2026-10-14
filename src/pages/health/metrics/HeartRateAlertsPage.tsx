import React, { useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { Toast } from "../../../components/ui/Toast";
import { loadHrAlertSettings, saveHrAlertSettings } from "../../../services/health-metrics/b1";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowDownToLine, ArrowUpToLine, Bell, ChevronLeft, ChevronRight, Clock, HeartPulse, Info, RefreshCw } from "lucide-react";
import { useBack } from "../../../hooks/useBack";
import { textPx, linePx } from "../../../theme/textSize";
import { FixedHeader } from "../../../components/ui/FixedHeader";
import { Toggle } from "../../../components/ui/Toggle";
import { WheelPicker, type WheelOption } from "../../../components/ui/WheelPicker";
import { HealthPopup } from "../../../components/health/metric/HealthPopup";
import { hairline, mc, metricIconInk, useHealthMode } from "../../../components/health/metric/MetricKit";
import { HR_ALERT_COPY, HR_ALERT_DEFAULTS, REVIEWED } from "../../../services/health-metrics/clinicalCopy";

// OURS-health-hr-alert-settings (/app/health/heart-rate/alerts), from the
// HE1.5.a "Alert settings" action and the HE1.5 ⋮ menu.
//
// V6-03: every sentence on this screen is new clinical copy
// (clinicalCopy.HR_ALERT_COPY). While REVIEWED is false the route sends the
// visitor back to Heart rate and no entry point renders; the screen is built
// in full so it ships the day the copy is signed off.
// Web: detection needs a connected device (native, B1 events + B4 push), so
// the screen says so; the settings still save. STORAGE: Database B1
// heart_rate_alert_settings (one row, owner only, never shared with a
// professional): enabled, high_bpm 100-150, low_bpm 30-50 (step 5), minutes
// 10 (V6-23 defaults until the row exists). The table has no "off" for the
// low alert, so the low wheel is 30 to 50 (the earlier device-only "Off" is
// gone; the Alerts switch turns both off).

type Settings = { enabled: boolean; high: number; low: number };
const DEFAULTS: Settings = { enabled: HR_ALERT_DEFAULTS.enabled, high: HR_ALERT_DEFAULTS.high, low: HR_ALERT_DEFAULTS.low };

const steps = (from: number, to: number): WheelOption<number>[] => {
  const out: WheelOption<number>[] = [];
  for (let v = from; v <= to; v += HR_ALERT_DEFAULTS.step) out.push({ value: v, label: String(v) });
  return out;
};
const HIGH_OPTIONS = steps(HR_ALERT_DEFAULTS.highRange[0], HR_ALERT_DEFAULTS.highRange[1]);
// Low: 30 to 50 plus Off (value 0).
const LOW_OPTIONS: WheelOption<number>[] = steps(HR_ALERT_DEFAULTS.lowRange[0], HR_ALERT_DEFAULTS.lowRange[1]);

export default function HeartRateAlertsPage() {
  if (!REVIEWED) return <Navigate to="/app/health/heart-rate" replace />;
  return <HeartRateAlertsScreen />;
}

function HeartRateAlertsScreen() {
  const back = useBack();
  const navigate = useNavigate();
  const { dark, hc } = useHealthMode();
  const { authUserId } = useApp();
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void loadHrAlertSettings(authUserId).then((r) => {
      if (!cancelled && r) setS({ enabled: r.enabled, high: r.highBpm, low: r.lowBpm });
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);
  const [editing, setEditing] = useState<"high" | "low" | null>(null);
  const [draft, setDraft] = useState(0);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  const save = (next: Settings) => {
    const before = s;
    setS(next);
    if (!authUserId) return;
    void saveHrAlertSettings(authUserId, { enabled: next.enabled, highBpm: next.high, lowBpm: next.low, minutes: HR_ALERT_DEFAULTS.minutes }).then((ok) => {
      if (!ok) {
        setS(before);
        setToast("Couldn't save. Try again.");
      }
    });
  };

  const sep = hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.05)" : "rgba(36,31,27,0.05)";
  const card: React.CSSProperties = { borderRadius: 18, background: dark ? "#1C1F28" : "#FFFFFF", border: `0.5px solid ${hairline(dark, hc)}`, overflow: "hidden" };
  const title: React.CSSProperties = { fontSize: textPx(13.5), lineHeight: linePx(18), fontWeight: 600, color: "rgb(var(--c-charcoal))" };
  const meta: React.CSSProperties = { marginTop: 2, fontSize: textPx(11), lineHeight: linePx(15), fontWeight: 400, color: "rgb(var(--c-charcoal-faint))" };
  const tile = (Icon: typeof HeartPulse) => (
    <span className="shrink-0 grid place-items-center" style={{ width: 32, height: 32, borderRadius: 10, background: mc("heart-rate", "tint") }} aria-hidden>
      <Icon size={17} strokeWidth={1.5} style={{ color: metricIconInk("heart-rate", dark) }} />
    </span>
  );
  const valueRow = (key: "high" | "low" | "for", Icon: typeof HeartPulse, label: string, value: string, unit: string) => {
    const tappable = key !== "for" && s.enabled;
    const inner = (
      <>
        {tile(Icon)}
        <span className="flex-1 min-w-0 text-left" style={title}>
          {label}
        </span>
        <span className="shrink-0 flex flex-col items-end">
          <span style={{ fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "rgb(var(--c-charcoal))" }}>{value}</span>
          {unit && <span style={{ marginTop: 1, fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: "rgb(var(--c-charcoal-faint))" }}>{unit}</span>}
        </span>
      </>
    );
    const style: React.CSSProperties = { minHeight: 60, padding: "9px 14px", gap: 11, borderTop: `0.5px solid ${sep}`, opacity: s.enabled ? 1 : 0.45 };
    return tappable ? (
      <button
        key={key}
        type="button"
        className="tap w-full flex items-center"
        style={style}
        onClick={() => {
          setDraft(key === "high" ? s.high : s.low);
          setEditing(key as "high" | "low");
        }}
      >
        {inner}
      </button>
    ) : (
      <div key={key} className="flex items-center" style={style}>
        {inner}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 96 }} data-hr-alerts>
      <FixedHeader paddingBottom={14} fillClassName="bg-cream dark:bg-[#1C1F28]">
        <div className="flex items-center" style={{ gap: 4, height: 36, marginLeft: -8 }}>
          <button type="button" onClick={back} aria-label="Back" className="tap shrink-0 grid place-items-center rounded-full relative before:absolute before:-inset-1 before:content-['']" style={{ width: 36, height: 36 }}>
            <ChevronLeft size={20} style={{ color: "rgb(var(--c-charcoal-soft))" }} aria-hidden />
          </button>
          <h1 className="flex-1 min-w-0 line-clamp-2" style={{ fontSize: textPx(24), lineHeight: linePx(30), fontWeight: 700, letterSpacing: -0.5, color: "rgb(var(--c-charcoal))" }}>
            {HR_ALERT_COPY.settingsTitle}
          </h1>
        </div>
      </FixedHeader>

      <p style={{ margin: "0 0 12px", fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 400, color: "rgb(var(--c-charcoal-soft))" }}>{HR_ALERT_COPY.settingsIntro}</p>
      {/* Web: no device can raise an alert yet (OURS #8). */}
      <p className="flex items-center" style={{ margin: "0 0 12px", gap: 5, fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }} data-hr-web-note>
        <RefreshCw size={11} aria-hidden />
        {HR_ALERT_COPY.web}
      </p>

      <section style={card} aria-label={HR_ALERT_COPY.settingsTitle}>
        <div className="flex items-center" style={{ minHeight: 60, padding: "9px 14px", gap: 11 }}>
          {tile(HeartPulse)}
          <span className="flex-1 min-w-0">
            <span className="block" style={title}>
              Alerts
            </span>
            <span className="block" style={meta}>
              {s.enabled ? "On" : "Off"}
            </span>
          </span>
          <Toggle checked={s.enabled} onChange={(v) => save({ ...s, enabled: v })} label="Alerts" disabled={offline} />
        </div>
        {valueRow("high", ArrowUpToLine, "High alert", String(s.high), "bpm")}
        {valueRow("low", ArrowDownToLine, "Low alert", String(s.low), "bpm")}
        {valueRow("for", Clock, "For at least", `${HR_ALERT_DEFAULTS.minutes} min`, "")}
      </section>

      <button
        type="button"
        onClick={() => navigate("/app/settings/notifications")}
        className="tap w-full flex items-center"
        style={{ ...card, marginTop: 12, minHeight: 60, padding: "0 14px", gap: 12 }}
      >
        <span className="shrink-0 grid place-items-center bg-th-f0edf9 dark:bg-th-303141" style={{ width: 40, height: 40, borderRadius: 12 }} aria-hidden>
          <Bell size={21} strokeWidth={1.5} style={{ color: hc && !dark ? "#4B3BA0" : dark ? "rgb(var(--thi-c3b3fb))" : "rgb(var(--thi-7d6bb5))" }} />
        </span>
        <span className="flex-1 text-left" style={{ fontSize: textPx(14), lineHeight: linePx(19), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>
          Notifications
        </span>
        <ChevronRight size={17} style={{ color: "rgb(var(--c-charcoal-faint))" }} aria-hidden />
      </button>
      <p style={{ marginTop: 6, fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 400, color: "rgb(var(--c-charcoal-soft))" }}>{HR_ALERT_COPY.quietHours}</p>

      <div className="flex" style={{ marginTop: 12, gap: 8, borderRadius: 18, padding: 14, background: dark ? "#262932" : "#FAFAFB", border: `0.5px solid ${hairline(dark, hc)}` }}>
        <Info size={15} className="shrink-0" style={{ marginTop: 1, color: "rgb(var(--c-charcoal-soft))" }} aria-hidden />
        <p style={{ fontSize: textPx(11.5), lineHeight: linePx(17.3), fontWeight: 400, color: "rgb(var(--c-charcoal-faint))" }}>{HR_ALERT_COPY.disclaimer}</p>
      </div>

      <HealthPopup
        open={editing !== null}
        onClose={() => setEditing(null)}
        tile={{
          background: mc("heart-rate", "tint"),
          darkBackground: mc("heart-rate", "tint"),
          icon: editing === "low" ? <ArrowDownToLine size={18} strokeWidth={1.5} style={{ color: metricIconInk("heart-rate", dark) }} /> : <ArrowUpToLine size={18} strokeWidth={1.5} style={{ color: metricIconInk("heart-rate", dark) }} />,
        }}
        title={editing === "low" ? "Low alert" : "High alert"}
        secondary={{ label: "Cancel", onClick: () => setEditing(null) }}
        primary={{
          label: "Save",
          onClick: () => {
            if (editing === "high") save({ ...s, high: draft });
            if (editing === "low") save({ ...s, low: draft });
            setEditing(null);
          },
        }}
      >
        <div style={{ marginTop: 14 }}>
          <WheelPicker
            variant="partB"
            columns={[{ label: editing === "low" ? "Low alert in bpm" : "High alert in bpm", options: editing === "low" ? LOW_OPTIONS : HIGH_OPTIONS, value: draft, bandWidth: 120, unit: "bpm", onChange: (v) => setDraft(Number(v)) }]}
          />
        </div>
      </HealthPopup>
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
}
