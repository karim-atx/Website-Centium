import React from "react";
import { ChevronDown, ChevronLeft, ChevronUp, CircleAlert, type LucideIcon } from "lucide-react";
import { textPx } from "../../../theme/textSize";
import { useIsDark } from "../../../hooks/useIsDark";
import { INK } from "../proInk";
import { fieldBox } from "./courseStyles";

/**
 * Release 3 · W6 Courses: the board's pieces for MO18 v3 and MO28, literal
 * values from source/gen (r15.js, r18.js, r16.js, ui.js):
 * - PageHead (r15 cHead15): back 36 (ml -7, chevron 18 / 2 text.soft), gap 6,
 *   m-bottom 16; title 24 / 700 -0.03em line 1.25 (Community: 27); subtitle
 *   13 text.faint, m-top 4;
 * - StepBar (r18 stepBar18): gap 6, m-bottom 14; bar 4 r9999 primary.deep up
 *   to the step, soft after; label 10.5 / 700 m-top 5, primary.deep on the
 *   step, text.faint otherwise, "{n} · {step}";
 * - Label (r18 lbl18): 12 / 600 text.soft, margin 14 0 6;
 * - Field (ui.js field): label 12 / 600 text.soft m-bottom 6; box 40 r12 soft
 *   fill, 1px 10% border (primary when focused), pad 0 12, 14; note 11
 *   text.faint m-top 6;
 * - ChipRow (r18 chips18): 32 high, pad 0 12, r10, 12.5 / 700, fill / soft;
 * - RadioRows (r18 radio18): gap 8; pad 11 12, r14, 1px 10% border or
 *   primary; card or primary.pale; ring 20 (2px), dot 10; 14 / 700 and 12
 *   text.faint 1.4;
 * - FieldError (r18): 11.5 / 600 status.high with circle-alert 12;
 * - Group (r10 grp10): r20 card, m-bottom 10; head pad 14 16 gap 12, tile 36
 *   r11 lavender, icon 17 / 1.75 primary.accent, 14 / 700 and 12 text.soft
 *   1.4, chevron 16; body 1px 6% rule, pad 12 12 4;
 * - NumBox (r16 nbox16): half width less 4, r18, pad 12 12 10; label 11 /
 *   600 text.faint; value 26 / 800 -0.03em line 1 ("–" in text.tertiary);
 *   unit 12 / 700; sub 10.5 text.faint 1.3.
 */

export const PageHead: React.FC<{ title: string; sub?: string; onBack: () => void; size?: number }> = ({ title, sub, onBack, size = 24 }) => (
  <div className="flex items-start" style={{ gap: 6, marginBottom: 16 }}>
    <button
      type="button"
      onClick={onBack}
      aria-label="Back"
      className="tap flex items-center justify-center shrink-0 relative before:absolute before:-inset-1 before:content-['']"
      style={{ width: 36, height: 36, marginInlineStart: -7, borderRadius: 9999 }}
    >
      <ChevronLeft size={18} strokeWidth={2} aria-hidden style={{ color: INK.chS }} />
    </button>
    <div className="min-w-0" style={{ marginTop: 3 }}>
      <h1 style={{ fontSize: textPx(size), fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.25, color: INK.ch }}>{title}</h1>
      {sub && <p style={{ marginTop: 4, fontSize: textPx(13), color: INK.chF }}>{sub}</p>}
    </div>
  </div>
);

export const StepBar: React.FC<{ steps: readonly string[]; at: number; onStep?: (i: number) => void }> = ({ steps, at, onStep }) => (
  <div className="flex" style={{ gap: 6, marginBottom: 14 }} role="list" aria-label="Steps">
    {steps.map((s, i) => {
      const body = (
        <>
          <span className="block" style={{ height: 4, borderRadius: 9999, background: i <= at ? INK.prDeep : INK.soft }} />
          <span
            className="block whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ fontSize: textPx(10.5), fontWeight: 700, color: i === at ? INK.prDeep : INK.chF, marginTop: 5 }}
          >
            {i + 1} · {s}
          </span>
        </>
      );
      return (
        <span key={s} role="listitem" aria-current={i === at ? "step" : undefined} className="flex-1 min-w-0">
          {onStep && i < at ? (
            <button type="button" onClick={() => onStep(i)} className="tap block w-full text-start">
              {body}
            </button>
          ) : (
            body
          )}
        </span>
      );
    })}
  </div>
);

export const Label: React.FC<{ children: React.ReactNode; mt?: number; htmlFor?: string }> = ({ children, mt = 14, htmlFor }) =>
  htmlFor ? (
    <label htmlFor={htmlFor} className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, margin: `${mt}px 0 6px` }}>
      {children}
    </label>
  ) : (
    <p style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, margin: `${mt}px 0 6px` }}>{children}</p>
  );

export const Field: React.FC<{
  id: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  note?: string;
  invalid?: boolean;
  lead?: React.ReactNode;
  inputMode?: "numeric" | "decimal" | "url";
  ariaLabel?: string;
}> = ({ id, label, value, onChange, placeholder, maxLength, disabled, note, invalid, lead, inputMode, ariaLabel }) => {
  const [focus, setFocus] = React.useState(false);
  return (
    <div className="min-w-0">
      {label && (
        <label htmlFor={id} className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
          {label}
        </label>
      )}
      <span className="flex items-center" style={{ ...fieldBox(focus || invalid), gap: 8, borderColor: invalid ? INK.hi : focus ? INK.pr : INK.b10, opacity: disabled ? 0.6 : 1 }}>
        {lead}
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          inputMode={inputMode}
          aria-label={label ? undefined : ariaLabel}
          aria-invalid={invalid || undefined}
          className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-charcoal-faint"
          style={{ height: 38, fontSize: textPx(14), color: INK.ch }}
        />
      </span>
      {note && <span className="block" style={{ marginTop: 6, fontSize: textPx(11), color: INK.chF }}>{note}</span>}
    </div>
  );
};

export const TextBox: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; rows?: number; maxLength?: number; disabled?: boolean; placeholder?: string }> = ({
  id,
  label,
  value,
  onChange,
  rows = 6,
  maxLength,
  disabled,
  placeholder,
}) => (
  <div>
    <label htmlFor={id} className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
      {label}
    </label>
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      maxLength={maxLength}
      disabled={disabled}
      placeholder={placeholder}
      className="block w-full outline-none resize-y focus:border-primary placeholder:text-charcoal-faint disabled:opacity-60"
      style={{ borderRadius: 14, border: `1px solid rgb(var(--c-charcoal) / 0.11)`, background: INK.card, padding: 12, fontSize: textPx(13.5), lineHeight: 1.6, color: INK.ch }}
    />
  </div>
);

export const ChipRow: React.FC<{ items: { key: string; label: string }[]; on: string; onPick: (k: string) => void; disabled?: boolean }> = ({ items, on, onPick, disabled }) => (
  <div className="flex flex-wrap" style={{ gap: 6 }} role="radiogroup">
    {items.map((x) => {
      const a = x.key === on;
      return (
        <button
          key={x.key}
          type="button"
          role="radio"
          aria-checked={a}
          disabled={disabled}
          onClick={() => onPick(x.key)}
          className="tap inline-flex items-center relative before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-[''] disabled:opacity-60"
          style={{ height: 32, padding: "0 12px", borderRadius: 10, fontSize: textPx(12.5), fontWeight: 700, background: a ? INK.fill : INK.soft, color: a ? INK.onFill : INK.chS }}
        >
          {x.label}
        </button>
      );
    })}
  </div>
);

export interface RadioRow {
  key: string;
  title: string;
  sub?: string;
  trailing?: React.ReactNode;
  disabled?: boolean;
}

export const RadioRows: React.FC<{ rows: RadioRow[]; on: string | null; onPick: (k: string) => void; name: string; locked?: boolean }> = ({ rows, on, onPick, name, locked }) => (
  <div className="flex flex-col" style={{ gap: 8 }} role="radiogroup" aria-label={name}>
    {rows.map((r) => {
      const a = r.key === on;
      return (
        <button
          key={r.key}
          type="button"
          role="radio"
          aria-checked={a}
          disabled={r.disabled || locked}
          onClick={() => onPick(r.key)}
          className="tap flex items-center text-start disabled:cursor-default"
          style={{ gap: 12, padding: "11px 12px", borderRadius: 14, border: `1px solid ${a ? INK.pr : INK.b10}`, background: a ? INK.prPale : INK.card, opacity: r.disabled ? 0.6 : 1 }}
        >
          <span className="flex items-center justify-center shrink-0" style={{ width: 20, height: 20, borderRadius: 9999, border: `2px solid ${a ? INK.prDeep : "rgb(var(--c-charcoal) / 0.11)"}` }}>
            {a && <span style={{ width: 10, height: 10, borderRadius: 9999, background: INK.prDeep }} />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block" style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>
              {r.title}
            </span>
            {r.sub && (
              <span className="block" style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.4 }}>
                {r.sub}
              </span>
            )}
          </span>
          {r.trailing}
        </button>
      );
    })}
  </div>
);

export const FieldError: React.FC<{ children: React.ReactNode; mt?: number }> = ({ children, mt = 4 }) => (
  <p role="alert" className="flex" style={{ gap: 5, fontSize: textPx(11.5), fontWeight: 600, color: INK.hi, marginTop: mt }}>
    <CircleAlert size={12} strokeWidth={2} aria-hidden className="shrink-0" style={{ marginTop: 2 }} />
    <span>{children}</span>
  </p>
);

export const Note: React.FC<{ children: React.ReactNode; icon?: LucideIcon; iconColour?: string; mt?: number }> = ({ children, icon: Icon, iconColour, mt = 8 }) => (
  <p className="flex" style={{ gap: 6, fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5, marginTop: mt }}>
    {Icon && <Icon size={13} strokeWidth={2} aria-hidden className="shrink-0" style={{ color: iconColour ?? INK.chF, marginTop: 2 }} />}
    <span>{children}</span>
  </p>
);

export const Group: React.FC<{ icon: LucideIcon; title: string; insight: string; open: boolean; onToggle: () => void; children?: React.ReactNode }> = ({
  icon: Icon,
  title,
  insight,
  open,
  onToggle,
  children,
}) => {
  const dark = useIsDark();
  const Chev = open ? ChevronUp : ChevronDown;
  return (
    <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, marginBottom: 10, overflow: "hidden" }}>
      <button type="button" aria-expanded={open} onClick={onToggle} className="tap w-full flex items-center text-start" style={{ gap: 12, padding: "14px 16px" }}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 11, background: dark ? "rgba(174,161,220,0.14)" : "#F0EDF9" }}>
          <Icon size={17} strokeWidth={1.75} aria-hidden style={{ color: INK.prAccent }} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>
            {title}
          </span>
          <span className="block" style={{ fontSize: textPx(12), color: INK.chS, lineHeight: 1.4 }}>
            {insight}
          </span>
        </span>
        <Chev size={16} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
      </button>
      {open && <div style={{ borderTop: `1px solid ${INK.b06}`, padding: "12px 12px 4px" }}>{children}</div>}
    </div>
  );
};

export const NumBox: React.FC<{ label: string; value: string; unit?: string; sub: string }> = ({ label, value, unit, sub }) => (
  <div className="min-w-0" style={{ flex: "0 0 calc(50% - 4px)", background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, padding: "12px 12px 10px" }}>
    <p style={{ fontSize: textPx(11), fontWeight: 600, color: INK.chF }}>{label}</p>
    <p className="flex items-baseline whitespace-nowrap" style={{ gap: 5, marginTop: 4 }}>
      <span style={{ fontSize: textPx(26), fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: value === "–" ? INK.chT : INK.ch, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      {unit && value !== "–" && <span style={{ fontSize: textPx(12), fontWeight: 700, color: INK.chF }}>{unit}</span>}
    </p>
    <p style={{ marginTop: 6, fontSize: textPx(10.5), color: INK.chF, lineHeight: 1.3 }}>{sub}</p>
  </div>
);

