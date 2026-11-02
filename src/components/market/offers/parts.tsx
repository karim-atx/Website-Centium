import React, { useId } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx, linePx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../pro/proInk";
import { FOCUS_CSS } from "../usePress";
import { isRtl, t } from "../../../i18n/core";

// Market + Share 3.0 · W3 · the Offers Manager's and Redeem page's shared
// pieces, literal from Business Marketplace Screens lines 160–300 and
// Professional Marketplace Screens lines 229–340 (the same markup in both).

const FOCUS_WITHIN = ".market-focus-within:focus-within{outline:2px solid #AEA1DC;outline-offset:2px}";

/**
 * The back header (`back`): a row (gap 6) from x6, the 44 back target with
 * the 22 chevron (stroke 2.2, --ink) at x17, then the caps eyebrow 10.5 / 700
 * 0.1em --faint (line 15.75) over the title 22 / 800 (line 28); 12 above the
 * content.
 */
export const BackHeader: React.FC<{ eyebrow: string; title: string; onBack: () => void; backLabel: string }> = ({ eyebrow, title, onBack, backLabel }) => {
  const m = marketPalette(useIsDark());
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBlock: "-4px 12px", marginInline: "-10px 0", color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="market-focus"
        style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: m.ink, background: "transparent", border: 0, padding: 0, flexShrink: 0, cursor: "pointer", borderRadius: 12 }}
      >
        <ChevronLeft size={22} strokeWidth={2.2} aria-hidden style={NO_ICON_SCALE} />
      </button>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint, lineHeight: linePx(15.75) }}>{eyebrow}</p>
        <h1 style={{ margin: 0, fontSize: textPx(22), fontWeight: 800, lineHeight: linePx(28), color: m.ink }}>{title}</h1>
      </div>
    </div>
  );
};

/** A caps section label: 10.5 / 700 0.1em uppercase --faint. */
export const Caps: React.FC<{ children: React.ReactNode; id?: string; style?: React.CSSProperties }> = ({ children, id, style }) => {
  const m = marketPalette(useIsDark());
  return (
    <h2 id={id} style={{ margin: 0, fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint, lineHeight: "normal", ...style }}>
      {children}
    </h2>
  );
};

/**
 * The outlined "Create offer" button: min-height 40 + the 1px --border (42),
 * radius 12, padding 0 14, gap 6, 12.5 / 800 --pdark, the + 15 (stroke 2.4).
 * The empty state's copy has no icon.
 */
export const OutlineButton: React.FC<{ label: string; onPress: () => void; icon?: boolean; disabled?: boolean; style?: React.CSSProperties }> = ({ label, onPress, icon = true, disabled, style }) => {
  const m = marketPalette(useIsDark());
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className="market-focus hit"
      style={{
        minHeight: 40,
        boxSizing: "content-box",
        borderRadius: 12,
        border: `1px solid ${m.border}`,
        background: "transparent",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "0 14px",
        fontFamily: "inherit",
        fontSize: textPx(12.5),
        fontWeight: 800,
        color: m.pdark,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        lineHeight: "normal",
        ...style,
      }}
    >
      {icon ? <Plus size={15} strokeWidth={2.4} aria-hidden style={NO_ICON_SCALE} /> : null}
      {label}
    </button>
  );
};

/** The form's field label: 12 / 700 --ink2, 6 above its box. */
export const FieldLabel: React.FC<{ htmlFor?: string; id?: string; children: React.ReactNode; optional?: boolean; style?: React.CSSProperties }> = ({ htmlFor, id, children, optional, style }) => {
  const m = marketPalette(useIsDark());
  return (
    <label htmlFor={htmlFor} id={id} style={{ display: "block", fontSize: textPx(12), fontWeight: 700, color: m.ink2, marginBottom: 6, lineHeight: "normal", ...style }}>
      {children}
      {optional ? <span style={{ fontWeight: 500, color: m.faint }}> {t("optional")}</span> : null}
    </label>
  );
};

/** A field's error line under its box (ours): 11.5 / 16 600 --high. */
export const FieldError: React.FC<{ id: string; text?: string }> = ({ id, text }) => {
  const m = marketPalette(useIsDark());
  if (!text) return null;
  return (
    <p id={id} style={{ margin: "6px 0 0", fontSize: textPx(11.5), lineHeight: linePx(16), fontWeight: 600, color: m.high }}>
      {text}
    </p>
  );
};

/**
 * The form's 48 box (+ the 1px --border = 50, content-box), radius 14,
 * padding 0 14, 14 --ink: an <input> filling it and an optional suffix
 * ("%", "pts") in --faint. `strong` is the Points cost box: 1.5px --fill and
 * 700 (the suffix 500).
 */
export const BoxInput: React.FC<{
  id: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  strong?: boolean;
  inputMode?: "numeric" | "decimal" | "text";
  placeholder?: string;
  error?: string;
  label?: string;
  disabled?: boolean;
  maxLength?: number;
}> = ({ id, value, onChange, suffix, strong, inputMode = "text", placeholder, error, disabled, maxLength }) => {
  const m = marketPalette(useIsDark());
  const errId = `${id}-err`;
  return (
    <>
      <style>{FOCUS_WITHIN}</style>
      <div
        className="market-focus-within"
        style={{
          height: 48,
          boxSizing: "content-box",
          borderRadius: 14,
          border: error ? `1.5px solid ${m.high}` : strong ? `1.5px solid ${m.fill}` : `1px solid ${m.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "0 14px",
          fontSize: textPx(14),
          fontWeight: strong ? 700 : 400,
          color: m.ink,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={inputMode}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          style={{ flex: 1, minWidth: 0, height: "100%", border: 0, outline: "none", background: "transparent", padding: 0, font: "inherit", fontSize: textPx(14), fontWeight: "inherit", color: m.ink }}
        />
        {suffix ? (
          <span aria-hidden style={{ color: m.faint, fontWeight: strong ? 500 : 400 }}>
            {suffix}
          </span>
        ) : null}
      </div>
      <FieldError id={errId} text={error} />
    </>
  );
};

/**
 * The sub-segmented control (Type, Where it can be used): the --subtrack
 * track, radius 12, padding 4, gap 4; options 34 tall radius 9, 12 / 600
 * --subink, the active one --subactive / --onfill 700. A radio group:
 * arrows move and select.
 */
export function SubSegment<K extends string>({ labelId, options, value, onChange, grow }: { labelId: string; options: readonly { key: K; label: string }[]; value: K; onChange: (k: K) => void; grow?: Partial<Record<K, number>> }) {
  const m = marketPalette(useIsDark());
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = options.length;
    // Right to left: the next option is to the left.
    const fwd = isRtl() ? "ArrowLeft" : "ArrowRight";
    const back = isRtl() ? "ArrowRight" : "ArrowLeft";
    const j = e.key === fwd || e.key === "ArrowDown" ? (i + 1) % n : e.key === back || e.key === "ArrowUp" ? (i - 1 + n) % n : -1;
    if (j < 0) return;
    e.preventDefault();
    onChange(options[j].key);
    refs.current[j]?.focus();
  };
  return (
    <div role="radiogroup" aria-labelledby={labelId} style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: m.subtrack }}>
      {options.map((o, i) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.key)}
            onKeyDown={(e) => onKey(e, i)}
            className="market-focus"
            style={{
              flex: grow?.[o.key] ?? 1,
              minWidth: 0,
              minHeight: 34,
              borderRadius: 9,
              border: 0,
              padding: "0 4px",
              background: on ? m.subactive : "transparent",
              color: on ? m.onfill : m.subink,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "inherit",
              fontSize: textPx(12),
              fontWeight: on ? 700 : 600,
              // One line as drawn; Larger text at 360 may wrap rather than overflow the track.
              whiteSpace: "normal",
              textAlign: "center",
              cursor: "pointer",
              lineHeight: 1.15,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const FUNDING_TEXT = "You fund this discount in full. Centium does not reimburse redemptions.";

/**
 * The required funding checkbox (`offerCreate` line 63, `offerPreview` line
 * 91): a row (gap 10, align start), the 20 box radius 6 (margin-top 1) and
 * the text 12.5 / 18 700. Form: radius 16, 1px --border, padding 12 14, text
 * --ink. Preview: radius 16, --pale, padding 12 14, text --pdark. Ticked =
 * the board's --fill box with the white 12 check (stroke 3); unticked (ours)
 * = the empty box, 1.5px --border. One state on both steps.
 */
export const FundingCheck: React.FC<{ checked: boolean; onChange: (v: boolean) => void; look: "form" | "preview"; style?: React.CSSProperties }> = ({ checked, onChange, look, style }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const id = useId();
  const preview = look === "preview";
  return (
    <label
      htmlFor={id}
      className="market-focus-within"
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        borderRadius: 16,
        border: preview ? undefined : `1px solid ${m.border}`,
        background: preview ? m.pale : undefined,
        padding: "12px 14px",
        cursor: "pointer",
        lineHeight: "normal",
        ...style,
      }}
    >
      <style>{FOCUS_WITHIN}</style>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ position: "absolute", opacity: 0, width: 1, height: 1, margin: 0, pointerEvents: "none" }} />
      <span
        aria-hidden
        style={{
          width: 20,
          height: 20,
          boxSizing: "border-box",
          borderRadius: 6,
          background: checked ? m.fill : "transparent",
          border: checked ? 0 : `1.5px solid ${dark ? "rgba(245,243,250,0.4)" : "rgba(36,31,27,0.3)"}`,
          color: m.onfill,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {checked ? (
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={NO_ICON_SCALE}>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : null}
      </span>
      <span style={{ fontSize: textPx(12.5), lineHeight: linePx(18), fontWeight: 700, color: preview ? m.pdark : m.ink }}>{t("You fund this discount in full. Centium does not reimburse redemptions.")}</span>
    </label>
  );
};

/**
 * The primary CTA (Preview offer, Publish): 52 tall, radius 16, --fill /
 * --onfill, 15 / 800. Disabled = opacity 0.4 and the disabled attribute.
 */
export const PrimaryButton: React.FC<{ label: string; onPress: () => void; disabled?: boolean; busy?: boolean; style?: React.CSSProperties; describedBy?: string }> = ({ label, onPress, disabled, busy, style, describedBy }) => {
  const m = marketPalette(useIsDark());
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      aria-describedby={describedBy}
      className="market-focus"
      style={{
        width: "100%",
        height: 52,
        borderRadius: 16,
        border: 0,
        background: m.fill,
        color: m.onfill,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
        fontSize: textPx(15),
        fontWeight: 800,
        cursor: disabled || busy ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        lineHeight: "normal",
        ...style,
      }}
    >
      {busy ? t("One moment…") : label}
    </button>
  );
};
