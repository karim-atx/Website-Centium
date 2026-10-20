import React, { useEffect } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, type LucideIcon } from "lucide-react";
import { textPx } from "../../../theme/textSize";
import { useIsDark } from "../../../hooks/useIsDark";
import { INK } from "../proInk";

/**
 * Release 3 · W6 the More pages' own pieces (Forms, Care network, Practice
 * insights, Note templates, Templates, Consent), literal values from the
 * board (source/gen):
 * - CHead (r15.js cHead15): back 36 at -7, gap 6, title 24 / 700 -0.03em
 *   line 1.25 at m-top 3, sub 13 text.faint m-top 4, m-bottom 16;
 * - FieldLabel (r18.js lbl18): 12 / 600 text.soft, margin {top} 0 6;
 * - RadioRows (r18.js radio18): gap 8; row pad 11 12, r14, 1px border (the
 *   primary when chosen, 10% otherwise), primary.pale fill when chosen; the
 *   20 ring (2px, primary.deep when chosen) with a 10 dot; title 14 / 700,
 *   line 12 text.faint 1.4;
 * - ChoiceChips (r18.js chips18): 32 high, pad 0 12, r10, 12.5 / 700; fill
 *   and on-fill when chosen, soft and text.soft otherwise;
 * - NumBox (r16.js nbox16): two a row, the odd one centred; r18, pad 12 12
 *   10; label 11 / 600 text.faint; value 26 / 800 -0.03em (the "–" in
 *   text.tertiary), unit 12 / 700, delta 11.5 / 800 with the arrow (good up,
 *   high down); line 10.5 text.faint; the 64 × 22 spark (1.8, last point
 *   r2.6) in #7D6BB5 (dark #C3B3FB);
 * - RangeTrack (r16.js rng16): soft r9 track, pad 2, gap 2; 24 high, min 28,
 *   pad 0 7, r7, 10.5 / 800; the chosen one a card chip with a 1px shadow;
 * - TopToast (r15.js toast15): 16 from the top and sides, r16, card fill,
 *   the sheet shadow, pad 12 14, icon 18, 13 / 600 line 1.4.
 */

export const CHead: React.FC<{ title: string; sub?: string; onBack: () => void; right?: React.ReactNode }> = ({ title, sub, onBack, right }) => (
  <div className="flex items-start" style={{ gap: 6, marginBottom: 16 }}>
    <button type="button" onClick={onBack} aria-label="Back" className="tap flex items-center justify-center shrink-0 relative before:absolute before:-inset-1 before:content-['']" style={{ width: 36, height: 36, marginLeft: -7, borderRadius: 9999 }}>
      <ChevronLeft size={18} strokeWidth={2} aria-hidden style={{ color: INK.chS }} />
    </button>
    <div className="flex-1 min-w-0" style={{ marginTop: 3 }}>
      <h1 style={{ fontSize: textPx(24), fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.25, color: INK.ch, overflowWrap: "anywhere" }}>{title}</h1>
      {sub && <p style={{ marginTop: 4, fontSize: textPx(13), color: INK.chF }}>{sub}</p>}
    </div>
    {right}
  </div>
);

export const FieldLabel: React.FC<{ children: React.ReactNode; top?: number; htmlFor?: string }> = ({ children, top = 14, htmlFor }) =>
  htmlFor ? (
    <label htmlFor={htmlFor} className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, margin: `${top}px 0 6px` }}>
      {children}
    </label>
  ) : (
    <p style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, margin: `${top}px 0 6px` }}>{children}</p>
  );

export interface RadioRow<V extends string> {
  value: V;
  title: string;
  line?: string;
  disabled?: boolean;
  trailing?: React.ReactNode;
}

export function RadioRows<V extends string>({ rows, value, onChange, label }: { rows: RadioRow<V>[]; value: V | null; onChange: (v: V) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col" style={{ gap: 8 }}>
      {rows.map((r) => {
        const on = r.value === value;
        return (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={r.disabled || undefined}
            onClick={() => !r.disabled && onChange(r.value)}
            className="tap w-full flex items-center text-left"
            style={{ gap: 12, padding: "11px 12px", borderRadius: 14, border: `1px solid ${on ? INK.pr : INK.b10}`, background: on ? INK.prPale : INK.card, minHeight: 44, opacity: r.disabled ? 0.55 : 1 }}
          >
            <span className="flex items-center justify-center shrink-0" style={{ width: 20, height: 20, borderRadius: 9999, border: `2px solid ${on ? INK.prDeep : "rgb(var(--c-charcoal) / 0.11)"}` }}>
              {on && <span style={{ width: 10, height: 10, borderRadius: 9999, background: INK.prDeep }} />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block" style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>
                {r.title}
              </span>
              {r.line && (
                <span className="block" style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.4 }}>
                  {r.line}
                </span>
              )}
            </span>
            {r.trailing}
          </button>
        );
      })}
    </div>
  );
}

export function ChoiceChips<V extends string>({ items, value, onChange, label }: { items: { value: V; label: string; disabled?: boolean }[]; value: V; onChange: (v: V) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap" style={{ gap: 6 }}>
      {items.map((c) => {
        const on = c.value === value;
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={c.disabled || undefined}
            onClick={() => !c.disabled && onChange(c.value)}
            className="tap inline-flex items-center relative before:absolute before:inset-x-0 before:-inset-y-[6px] before:content-['']"
            style={{ height: 32, padding: "0 12px", borderRadius: 10, fontSize: textPx(12.5), fontWeight: 700, background: on ? INK.fill : INK.soft, color: on ? INK.onFill : INK.chS, opacity: c.disabled ? 0.5 : 1 }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

export const Spark: React.FC<{ values: number[] }> = ({ values }) => {
  const dark = useIsDark();
  if (values.length < 2) return null;
  const W = 64;
  const H = 22;
  const mx = Math.max(...values);
  const mn = Math.min(...values);
  const X = (i: number) => 2 + (i * (W - 4)) / (values.length - 1);
  const Y = (v: number) => 2 + ((mx - v) / (mx - mn || 1)) * (H - 4);
  const col = dark ? "#C3B3FB" : "#7D6BB5";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="shrink-0">
      <path d={`M${values.map((v, i) => `${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" L")}`} fill="none" stroke={col} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={X(values.length - 1)} cy={Y(values[values.length - 1])} r={2.6} fill={col} />
    </svg>
  );
};

export interface NumBoxData {
  label: string;
  value: string;
  unit?: string;
  delta?: string | null;
  dir?: "up" | "down" | null;
  line: string;
  spark?: number[] | null;
}

export const NumBoxes: React.FC<{ boxes: NumBoxData[] }> = ({ boxes }) => (
  <div className="flex flex-wrap justify-center" style={{ gap: 8, marginBottom: 12 }}>
    {boxes.map((b) => {
      const dc = b.dir === "up" ? INK.good : b.dir === "down" ? INK.hi : INK.chF;
      const Arrow = b.dir === "down" ? ArrowDown : ArrowUp;
      return (
        <div key={b.label} className="min-w-0" style={{ flex: "0 0 calc(50% - 4px)", background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, padding: "12px 12px 10px" }}>
          <p style={{ fontSize: textPx(11), fontWeight: 600, color: INK.chF, lineHeight: 1.35 }}>{b.label}</p>
          <p className="flex flex-wrap items-baseline" style={{ gap: "2px 5px", marginTop: 4 }}>
            <span style={{ fontSize: textPx(26), fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: b.value === "–" ? INK.chT : INK.ch, fontVariantNumeric: "tabular-nums" }}>{b.value}</span>
            {b.unit && <span style={{ fontSize: textPx(12), fontWeight: 700, color: INK.chF }}>{b.unit}</span>}
            {b.delta && (
              <span className="inline-flex items-center whitespace-nowrap" style={{ fontSize: textPx(11.5), fontWeight: 800, color: dc }}>
                {b.dir && <Arrow size={11} strokeWidth={2.6} aria-hidden />}
                {b.delta}
              </span>
            )}
          </p>
          <div className="flex items-end justify-between" style={{ gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: textPx(10.5), color: INK.chF, lineHeight: 1.3 }}>{b.line}</span>
            {b.spark && <Spark values={b.spark} />}
          </div>
        </div>
      );
    })}
  </div>
);

export function RangeTrack<V extends string>({ items, value, onChange, label }: { items: readonly V[]; value: V; onChange: (v: V) => void; label: string }) {
  return (
    <span role="radiogroup" aria-label={label} className="flex shrink-0" style={{ gap: 2, padding: 2, borderRadius: 9, background: INK.soft }}>
      {items.map((r) => {
        const on = r === value;
        return (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(r)}
            className="tap flex items-center justify-center whitespace-nowrap relative before:absolute before:inset-x-0 before:-inset-y-[10px] before:content-['']"
            style={{ height: 24, minWidth: 28, padding: "0 7px", borderRadius: 7, fontSize: textPx(10.5), fontWeight: 800, background: on ? INK.card : "transparent", color: on ? INK.ch : INK.chF, boxShadow: on ? "0 1px 2px rgba(0,0,0,0.08)" : undefined }}
          >
            {r}
          </button>
        );
      })}
    </span>
  );
}

export const TopToast: React.FC<{ icon: LucideIcon; text: string | null; tone?: "good" | "pr"; onDone: () => void }> = ({ icon: Icon, text, tone = "good", onDone }) => {
  useEffect(() => {
    if (!text) return;
    const t = window.setTimeout(onDone, 4000);
    return () => window.clearTimeout(t);
  }, [text, onDone]);
  if (!text) return null;
  return (
    <div role="status" className="fixed z-40 flex items-center" style={{ left: "calc(var(--app-gutter, 0px) + 16px)", right: "calc(var(--app-gutter, 0px) + 16px)", top: 16, gap: 10, borderRadius: 16, background: INK.card, boxShadow: "0 10px 40px rgba(36,31,27,0.18)", padding: "12px 14px" }}>
      <Icon size={18} strokeWidth={2} aria-hidden style={{ color: tone === "good" ? INK.good : INK.prDeep, flexShrink: 0 }} />
      <span className="flex-1" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch, lineHeight: 1.4 }}>
        {text}
      </span>
    </div>
  );
};

/** The soft field look of the board's field(): 40 high, r12, soft fill, 1px 10% border (the primary on focus), 14 text. */
export const fieldStyle = (focus = false): React.CSSProperties => ({
  width: "100%",
  minHeight: 40,
  borderRadius: 12,
  background: INK.soft,
  border: `1px solid ${focus ? INK.pr : INK.b10}`,
  padding: "0 12px",
  fontSize: textPx(14),
  color: INK.ch,
});
