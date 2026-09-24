import React from "react";
import { sheetChipStyle } from "../ui/sheetChip";
import type {
  EnduranceMode,
  EndurancePlan,
  EnduranceStep,
  EnduranceTarget,
} from "../../types";
import { clockToSeconds, emptyStep, secondsToClock } from "../../services/workout/endurance";

// The structured cardio prescription, as a form.
//
// WHAT THIS REPLACED. Five loose numbers — duration, distance, incline, pace,
// average heart rate — which between them could not say "6 × 800 m at
// 4:20–4:30 with 2 minutes' jog", the single most ordinary thing a running
// coach writes. They also could not say it BADLY: there was nowhere to put
// the repeats. Average heart rate was the clearest sign the shape was wrong —
// it is a RESULT, and it sat in the prescription.
//
// SHAPED BY valid_endurance_plan(), not by what looked tidy. Every control
// here exists because the schema has a place for what it produces, and the
// controls the schema has no place for are absent: there is no incline field,
// because version 1 has no incline — it is a treadmill setting rather than a
// prescription.

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#5B5349",
  marginBottom: 6,
  display: "block",
};

const numberInputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 10,
  background: "#FFFFFF",
  border: "1px solid rgba(36,31,27,0.1)",
  padding: "9px 11px",
  fontSize: 14,
  color: "#241F1B",
  textAlign: "center",
};

const cardStyle: React.CSSProperties = {
  background: "#F2F3F5",
  borderRadius: 14,
  padding: "12px 14px",
};

/** Digits only, and empty means "not set yet" rather than zero. */
const digits = (raw: string): number | undefined => {
  const cleaned = raw.replace(/[^\d]/g, "");
  return cleaned === "" ? undefined : Number(cleaned);
};

const NumberField: React.FC<{
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  ariaLabel: string;
}> = ({ label, value, onChange, placeholder, ariaLabel }) => (
  <label className="block" style={{ flex: 1, minWidth: 0 }}>
    <span style={{ ...labelStyle, fontSize: 11 }}>{label}</span>
    <input
      value={value === undefined ? "" : String(value)}
      onChange={(e) => onChange(digits(e.target.value))}
      placeholder={placeholder}
      inputMode="numeric"
      aria-label={ariaLabel}
      className="placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
      style={numberInputStyle}
    />
  </label>
);

const Segmented = <T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) => (
  <div className="flex no-scrollbar" role="group" aria-label={ariaLabel} style={{ gap: 6, overflowX: "auto" }}>
    {options.map((o) => (
      <button
        key={o.value}
        onClick={() => onChange(o.value)}
        aria-pressed={value === o.value}
        className="tap transition-colors"
        style={sheetChipStyle(value === o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
);

/**
 * One step: how far or how long, and what to hold while doing it.
 *
 * THE MEASURE SWITCH REBUILDS THE STEP rather than adding a field, because a
 * step carrying both `seconds` and `meters` is rejected by the validator — it
 * would be ambiguous about which one the athlete stops on.
 */
const StepEditor: React.FC<{
  step: EnduranceStep;
  onChange: (step: EnduranceStep) => void;
  /** Recovery steps offer jog/walk/rest; work steps assume running. */
  withMode?: boolean;
  idPrefix: string;
}> = ({ step, onChange, withMode, idPrefix }) => {
  const time = step.measure === "time" ? secondsToClock(step.seconds) : { minutes: 0, seconds: 0 };
  const target = step.target;

  const setMeasure = (measure: "time" | "distance") => {
    if (measure === step.measure) return;
    onChange(
      measure === "time"
        ? { measure: "time", seconds: 300, target, ...(step.mode ? { mode: step.mode } : {}) }
        : { measure: "distance", meters: 400, target, ...(step.mode ? { mode: step.mode } : {}) }
    );
  };

  const setTarget = (next: EnduranceTarget) => onChange({ ...step, target: next } as EnduranceStep);

  const paceLo = target.kind === "pace" ? secondsToClock(target.min_sec_per_km) : { minutes: 5, seconds: 0 };
  const paceHi = target.kind === "pace" ? secondsToClock(target.max_sec_per_km) : { minutes: 5, seconds: 30 };

  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      <div>
        <span style={labelStyle}>Measured by</span>
        <Segmented
          ariaLabel={`${idPrefix} measure`}
          value={step.measure}
          onChange={setMeasure}
          options={[
            { value: "time", label: "Time" },
            { value: "distance", label: "Distance" },
          ]}
        />
      </div>

      {step.measure === "time" ? (
        <div className="flex" style={{ gap: 8 }}>
          <NumberField
            label="Minutes"
            ariaLabel={`${idPrefix} minutes`}
            value={time.minutes}
            onChange={(v) => onChange({ ...step, measure: "time", seconds: clockToSeconds(v ?? 0, time.seconds) })}
          />
          <NumberField
            label="Seconds"
            ariaLabel={`${idPrefix} seconds`}
            value={time.seconds}
            onChange={(v) => onChange({ ...step, measure: "time", seconds: clockToSeconds(time.minutes, v ?? 0) })}
          />
        </div>
      ) : (
        <NumberField
          label="Metres"
          ariaLabel={`${idPrefix} metres`}
          value={step.meters}
          onChange={(v) => onChange({ ...step, measure: "distance", meters: v ?? 0 })}
          placeholder="800"
        />
      )}

      {withMode && (
        <div>
          <span style={labelStyle}>Recovery</span>
          <Segmented
            ariaLabel={`${idPrefix} mode`}
            value={step.mode ?? "jog"}
            onChange={(mode: EnduranceMode) => onChange({ ...step, mode })}
            options={[
              { value: "jog", label: "Jog" },
              { value: "walk", label: "Walk" },
              { value: "rest", label: "Rest" },
            ]}
          />
        </div>
      )}

      <div>
        <span style={labelStyle}>Target</span>
        <Segmented
          ariaLabel={`${idPrefix} target kind`}
          value={target.kind}
          onChange={(kind) => {
            if (kind === target.kind) return;
            // A fresh target per kind — never a spread. valid_endurance_target
            // counts keys, so a leftover `zone` on an open target is a refusal.
            setTarget(
              kind === "open"
                ? { kind: "open" }
                : kind === "hr_zone"
                  ? { kind: "hr_zone", zone: 2 }
                  : kind === "rpe"
                    ? { kind: "rpe", value: 6 }
                    : { kind: "pace", min_sec_per_km: 300, max_sec_per_km: 330 }
            );
          }}
          options={[
            { value: "open", label: "None" },
            { value: "pace", label: "Pace" },
            { value: "hr_zone", label: "HR zone" },
            { value: "rpe", label: "Effort" },
          ]}
        />
      </div>

      {target.kind === "pace" && (
        <div>
          <span style={{ ...labelStyle, fontSize: 11 }}>Per km, faster end first</span>
          <div className="flex items-end" style={{ gap: 8 }}>
            <NumberField
              label="Min"
              ariaLabel={`${idPrefix} pace fast minutes`}
              value={paceLo.minutes}
              onChange={(v) => setTarget({ ...target, min_sec_per_km: clockToSeconds(v ?? 0, paceLo.seconds) })}
            />
            <NumberField
              label="Sec"
              ariaLabel={`${idPrefix} pace fast seconds`}
              value={paceLo.seconds}
              onChange={(v) => setTarget({ ...target, min_sec_per_km: clockToSeconds(paceLo.minutes, v ?? 0) })}
            />
            <span style={{ paddingBottom: 10, color: "#8C8378" }}>–</span>
            <NumberField
              label="Min"
              ariaLabel={`${idPrefix} pace slow minutes`}
              value={paceHi.minutes}
              onChange={(v) => setTarget({ ...target, max_sec_per_km: clockToSeconds(v ?? 0, paceHi.seconds) })}
            />
            <NumberField
              label="Sec"
              ariaLabel={`${idPrefix} pace slow seconds`}
              value={paceHi.seconds}
              onChange={(v) => setTarget({ ...target, max_sec_per_km: clockToSeconds(paceHi.minutes, v ?? 0) })}
            />
          </div>
        </div>
      )}

      {target.kind === "hr_zone" && (
        <Segmented
          ariaLabel={`${idPrefix} heart-rate zone`}
          value={String(target.zone)}
          onChange={(z) => setTarget({ kind: "hr_zone", zone: Number(z) })}
          options={[1, 2, 3, 4, 5].map((z) => ({ value: String(z), label: `Zone ${z}` }))}
        />
      )}

      {target.kind === "rpe" && (
        <Segmented
          ariaLabel={`${idPrefix} effort`}
          value={String(target.value)}
          onChange={(v) => setTarget({ kind: "rpe", value: Number(v) })}
          options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => ({ value: String(v), label: String(v) }))}
        />
      )}
    </div>
  );
};

/** An optional section — warm-up and cool-down — with its own on/off. */
const OptionalStep: React.FC<{
  title: string;
  step: EnduranceStep | null | undefined;
  onChange: (step: EnduranceStep | null) => void;
  idPrefix: string;
}> = ({ title, step, onChange, idPrefix }) => (
  <div style={cardStyle}>
    <div className="flex items-center justify-between" style={{ marginBottom: step ? 10 : 0 }}>
      <span style={{ ...labelStyle, marginBottom: 0 }}>{title}</span>
      <button
        onClick={() => onChange(step ? null : emptyStep())}
        aria-pressed={!!step}
        className="tap text-[11.5px] font-semibold text-primary-dark"
      >
        {step ? "Remove" : "Add"}
      </button>
    </div>
    {step && <StepEditor step={step} onChange={onChange} idPrefix={idPrefix} />}
  </div>
);

export const EndurancePlanBuilder: React.FC<{
  plan: EndurancePlan;
  onChange: (plan: EndurancePlan) => void;
}> = ({ plan, onChange }) => {
  const main = plan.main;

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <OptionalStep
        title="Warm-up"
        step={plan.warmup}
        onChange={(warmup) => onChange({ ...plan, warmup })}
        idPrefix="Warm-up"
      />

      <div style={cardStyle}>
        <span style={labelStyle}>Main set</span>
        <Segmented
          ariaLabel="Main set type"
          value={main.type}
          onChange={(type) => {
            if (type === main.type) return;
            onChange({
              ...plan,
              main:
                type === "steady"
                  ? { type: "steady", step: main.type === "intervals" ? main.work : emptyStep() }
                  : {
                      type: "intervals",
                      repeats: 6,
                      work: main.type === "steady" ? main.step : emptyStep(),
                      recovery: { measure: "time", seconds: 120, target: { kind: "open" }, mode: "jog" },
                    },
            });
          }}
          options={[
            { value: "steady", label: "Steady" },
            { value: "intervals", label: "Intervals" },
          ]}
        />

        <div style={{ marginTop: 12 }}>
          {main.type === "steady" ? (
            <StepEditor
              step={main.step}
              onChange={(step) => onChange({ ...plan, main: { type: "steady", step } })}
              idPrefix="Main set"
            />
          ) : (
            <div className="flex flex-col" style={{ gap: 12 }}>
              <div className="flex" style={{ gap: 8 }}>
                <NumberField
                  label="Repeats"
                  ariaLabel="Interval repeats"
                  value={main.repeats}
                  onChange={(v) => onChange({ ...plan, main: { ...main, repeats: v ?? 1 } })}
                  placeholder="6"
                />
                <div style={{ flex: 2 }} />
              </div>
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 12,
                  padding: "10px 12px",
                  border: "1px solid rgba(36,31,27,0.07)",
                }}
              >
                <span style={labelStyle}>Work</span>
                <StepEditor
                  step={main.work}
                  onChange={(work) => onChange({ ...plan, main: { ...main, work } })}
                  idPrefix="Work"
                />
              </div>
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 12,
                  padding: "10px 12px",
                  border: "1px solid rgba(36,31,27,0.07)",
                }}
              >
                <span style={labelStyle}>Recovery</span>
                <StepEditor
                  step={main.recovery}
                  onChange={(recovery) => onChange({ ...plan, main: { ...main, recovery } })}
                  withMode
                  idPrefix="Recovery"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <OptionalStep
        title="Cool-down"
        step={plan.cooldown}
        onChange={(cooldown) => onChange({ ...plan, cooldown })}
        idPrefix="Cool-down"
      />
    </div>
  );
};
