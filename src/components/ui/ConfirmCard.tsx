import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { useIsDark } from "../../hooks/useIsDark";
import { linePx, textPx } from "../../theme/textSize";
import { useBackCloses } from "../../hooks/useBackCloses";

/**
 * The shared confirmation. Three layouts:
 *
 * "row" (default, unchanged): handover 2026-09-29 02 "Compact confirmation":
 * a white card, radius 20, padding 20, shadow 0 16px 40px rgba(0,0,0,0.2).
 * Row 1: a 40px red-tinted trash chip (#FCEDEC / #B4372C) with the title
 * (16px/700) and sub-line (12.5px muted) stacked to its right. Row 2: Cancel
 * (white, #E4E4E9 border) and Delete (#C0392B), 44px, equal width. Dark: the
 * card and Cancel take cream-card, the chip danger.tint #3C2A30 with #FF6B5E,
 * the Cancel border rgba(238,239,242,0.10). The Delete fill is status-high
 * (#C0392B light, #F09A8E dark) with on-destructive ink (white light, #0D0B1A
 * dark: v6 X-11 / V6-02; white on #F09A8E is 2.2:1).
 *
 * "stacked" (v6 X-22, Business UI central pop-up; OP1-085 / OpsTabsV4 and
 * OP1-019 / BizTypeKit): centred card left / right 24, centred text; a 44
 * icon disc (primary.tint with primary.deep glyph, or highBg / high for a
 * destructive tone); title 17 / 22 800 10 below the disc; body 13 / 19 inkSoft
 * 6 below; buttons in a column 18 below, gap 8: the primary 48 tall r14 14/800
 * (primary fill, or for a destructive tone the highBg tint with high ink), an
 * optional outlined secondary 48, and a 44 text cancel (14/700 inkSoft). No
 * scrim blur. `frame="ops"` (default): r20, padding 22 20 18, shadow
 * 0 20px 50px rgba(36,31,27,0.28). `frame="kit"`: r24, padding 22 20 16,
 * shadow 0 20px 48px rgba(36,31,27,0.28).
 *
 * "decision" (AN3-066 / AN3-070, ClassFlowsV7): no icon disc; r24, padding
 * 22 20 16, shadow 0 16px 40px rgba(0,0,0,0.25), no blur; title 17 / 22 800;
 * body 12.5 / 18 inkSoft 8 below; two equal buttons side by side 18 below,
 * gap 10, 46 tall r14 14/700: the safe action (cancelLabel) outlined with a
 * 1px rgba(36,31,27,0.11) / rgba(245,243,250,0.08) border and inkSoft label,
 * focused on open with a 3px #7D6BB5 / #C3B3FB ring; the confirm filled
 * primary (or destructive: status-high with on-destructive ink).
 *
 * Every layout: scrim rgba(36,31,27,0.4) (X-07), Back and Escape cancel,
 * tapping the scrim cancels.
 */
export type ConfirmLayout = "row" | "stacked" | "decision";

export const ConfirmCard: React.FC<{
  open: boolean;
  title: string;
  subtitle?: string;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** "row" (default), "stacked" or "decision". */
  layout?: ConfirmLayout;
  /**
   * The confirm action's tone in "stacked" / "decision". "primary" (default)
   * is the primary fill; "destructive" is the red treatment of each layout.
   * "row" is always destructive.
   */
  tone?: "primary" | "destructive";
  /** The stacked disc's glyph (lucide at 20 / 2.2). None: no disc. */
  icon?: React.ReactNode;
  /** The cancel / safe action's label (stacked text button, decision outlined button). */
  cancelLabel?: string;
  /** Stacked only: an outlined second action between confirm and cancel (OP1-085). */
  secondary?: { label: string; onClick: () => void };
  /** Stacked only: which source's card values (see above). */
  frame?: "ops" | "kit";
  /**
   * Stacked only (OpsTabsV4 plan confirms, OP1-048 / 049 / 051):
   * - `cancelVariant` "outlined": the safe action is a 48 tall r14 button with
   *   a 1px rgba(36,31,27,0.11) / rgba(245,243,250,0.08) border, 14/800 ink
   *   (pixels), instead of the 44 text cancel ("text", default).
   * - `disc`: the icon disc's own fill and glyph colours (pause caution,
   *   hide soft / inkSoft), instead of the tone's.
   * - `destructiveFill` "solid": the destructive confirm is status-high with
   *   on-destructive ink (#C0392B / white, dark #F09A8E / #0D0B1A, V6-02)
   *   instead of the BizTypeKit tint ("tint", default).
   * - `initialFocus` "cancel": focus the safe action on open (OP1-048 A3).
   */
  cancelVariant?: "text" | "outlined";
  disc?: { bg: string; ink: string };
  destructiveFill?: "tint" | "solid";
  initialFocus?: "confirm" | "cancel";
  /** Stacked / decision: the scrim's 2px blur (OpsTabsV4 draws it, OP1-048 row 1). Off by default. */
  scrimBlur?: boolean;
  /** Stacked only (v6 Batch 4, front desk scan results): extra content under the body (a chip, an error line). */
  extra?: React.ReactNode;
  /** Stacked only (v6 Batch 4): the confirm is drawn but not available yet (a pending backend stage). */
  confirmDisabled?: boolean;
  /** Stacked (v6 Batch 4, BizTypeKit pops OP1-004): the title's line height when a frame draws other than 22 (17 × 1.5 = 25.5). */
  titleLineHeight?: number;
  /**
   * Every layout (v6 Batch 4, Classes; row since the Release 2 gate): the
   * confirm button's own fill and ink when a frame draws other than the tone
   * (OP1-086 O1: #C0392B with white in dark too; AN3-070: dark #E0786A with
   * #0D0B1A; AN13-028 Discard #C0392B / white in both modes). Unset: unchanged.
   */
  confirmStyle?: React.CSSProperties;
}> = ({
  open,
  title,
  subtitle,
  confirmLabel = "Delete",
  busy,
  onCancel,
  onConfirm,
  layout = "row",
  tone = "primary",
  icon,
  cancelLabel = "Cancel",
  secondary,
  frame = "ops",
  cancelVariant = "text",
  disc,
  destructiveFill = "tint",
  initialFocus = "confirm",
  scrimBlur,
  extra,
  confirmDisabled,
  titleLineHeight,
  confirmStyle: confirmOverride,
}) => {
  // Batch E (E5): the phone's back closes this first.
  useBackCloses(open, onCancel);
  const dark = useIsDark();
  const firstRef = useRef<HTMLButtonElement | null>(null);
  const safeRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  });
  useEffect(() => {
    if (!open || layout === "row") return;
    // Stacked focuses the primary action, decision the safe one (OP1-085 O3,
    // AN3-066 row 7).
    (layout === "stacked" && initialFocus === "cancel" ? safeRef : firstRef).current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, layout, initialFocus]);
  if (!open) return null;

  const ink = "rgb(var(--c-charcoal))";
  const inkSoft = "rgb(var(--c-charcoal-soft))";
  const outline = dark ? "rgba(245,243,250,0.08)" : "rgba(36,31,27,0.11)";
  // AN3-066 O7: under High contrast the decision layout's outlined safe action
  // takes a faint-ink border (#8C8378; dark #B8B3C7, the OpsTabsV4 dark faint).
  const hc = typeof document !== "undefined" && document.documentElement.classList.contains("high-contrast");
  const decisionOutline = hc ? (dark ? "#B8B3C7" : "#8C8378") : outline;
  const destructive = tone === "destructive";

  if (layout === "row") {
    return createPortal(
      <div className="fixed inset-0 z-[80] flex items-center justify-center px-6">
        <div
          className="absolute inset-0 backdrop-blur-[2px] animate-fade-in"
          style={{ background: "rgba(36,31,27,0.4)" }}
          onClick={onCancel}
        />
        <div
          role="alertdialog"
          aria-label={title}
          className="relative w-full max-w-[340px] bg-cream-card animate-pop"
          style={{ borderRadius: 20, padding: 20, boxShadow: "0 16px 40px rgba(0,0,0,0.2)" }}
        >
          <div className="flex items-center" style={{ gap: 12 }}>
            <span
              className="flex-none flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 12, background: dark ? "#3C2A30" : "#FCEDEC", color: dark ? "#FF6B5E" : "#B4372C" }}
            >
              <Trash2 size={18} />
            </span>
            <div className="min-w-0">
              <p style={{ margin: 0, fontSize: textPx(16), fontWeight: 700, color: ink }}>{title}</p>
              {subtitle && <p style={{ margin: "2px 0 0", fontSize: textPx(12.5), color: "rgb(var(--c-charcoal-muted))" }}>{subtitle}</p>}
            </div>
          </div>
          <div className="flex" style={{ gap: 10, marginTop: 18 }}>
            <button
              onClick={onCancel}
              className="tap flex-1"
              style={{ height: 44, borderRadius: 12, background: "rgb(var(--c-cream-card))", border: `1px solid ${dark ? "rgba(238,239,242,0.10)" : "#E4E4E9"}`, color: ink, fontSize: textPx(14), fontWeight: 700 }}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="tap flex-1 disabled:opacity-60"
              style={{ height: 44, borderRadius: 12, background: "rgb(var(--c-status-high))", color: "rgb(var(--c-on-destructive))", fontSize: textPx(14), fontWeight: 700, ...confirmOverride }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const decision = layout === "decision";
  const kit = !decision && frame === "kit";
  const card: React.CSSProperties = decision
    ? { borderRadius: 24, padding: "22px 20px 16px", boxShadow: "0 16px 40px rgba(0,0,0,0.25)" }
    : kit
      ? { borderRadius: 24, padding: "22px 20px 16px", boxShadow: "0 20px 48px rgba(36,31,27,0.28)" }
      : { borderRadius: 20, padding: "22px 20px 18px", boxShadow: "0 20px 50px rgba(36,31,27,0.28)" };

  // Confirm fills. Stacked destructive is the BizTypeKit tint (highBg / high);
  // decision destructive is the solid red with on-destructive ink (V6-02).
  const confirmStyle: React.CSSProperties = destructive
    ? decision || destructiveFill === "solid"
      ? { background: "rgb(var(--c-status-high))", color: "rgb(var(--c-on-destructive))" }
      : { background: "rgb(var(--c-status-high-bg))", color: "rgb(var(--c-status-high))" }
    : { background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))" };
  if (confirmOverride) Object.assign(confirmStyle, confirmOverride);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-6">
      <div className={`absolute inset-0 animate-fade-in ${scrimBlur ? "backdrop-blur-[2px]" : ""}`} style={{ background: "rgba(36,31,27,0.4)" }} onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-[342px] max-h-full overflow-y-auto bg-cream-card text-center animate-popup-in"
        style={card}
      >
        {!decision && icon && (
          <span
            aria-hidden
            className="mx-auto flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background: disc?.bg ?? (destructive ? "rgb(var(--c-status-high-bg))" : "rgb(var(--c-primary-pale))"),
              color: disc?.ink ?? (destructive ? "rgb(var(--c-status-high))" : dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-7d6bb5))"),
            }}
          >
            {icon}
          </span>
        )}
        <p
          style={{
            margin: !decision && icon ? "10px 0 0" : 0,
            fontSize: textPx(17),
            lineHeight: linePx(titleLineHeight ?? 22),
            fontWeight: 800,
            color: ink,
            textWrap: "balance",
          }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            style={{
              margin: decision ? "8px 0 0" : "6px 0 0",
              fontSize: textPx(decision ? 12.5 : 13),
              lineHeight: linePx(decision ? 18 : 19),
              color: inkSoft,
            }}
          >
            {subtitle}
          </p>
        )}
        {!decision && extra}
        {decision ? (
          <div className="grid grid-cols-2" style={{ gap: 10, marginTop: 18 }}>
            <button
              ref={firstRef}
              onClick={onCancel}
              className="tap min-w-0 focus:outline-none focus-visible:shadow-[0_0_0_3px_#7D6BB5] dark:focus-visible:shadow-[0_0_0_3px_#C3B3FB]"
              style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${decisionOutline}`, background: "transparent", color: inkSoft, fontSize: textPx(14), fontWeight: 700, padding: "0 10px" }}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="tap min-w-0 disabled:opacity-60"
              style={{ minHeight: 46, borderRadius: 14, fontSize: textPx(14), fontWeight: 700, padding: "0 10px", ...confirmStyle }}
            >
              {confirmLabel}
            </button>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8, marginTop: 18 }}>
            <button
              ref={firstRef}
              onClick={onConfirm}
              disabled={busy || confirmDisabled}
              className={confirmDisabled ? "w-full opacity-50" : "tap w-full disabled:opacity-60"}
              style={{ minHeight: 48, borderRadius: 14, fontSize: textPx(14), fontWeight: 800, padding: "0 12px", ...confirmStyle }}
            >
              {confirmLabel}
            </button>
            {secondary && (
              <button
                onClick={secondary.onClick}
                className="tap w-full"
                style={{ minHeight: 48, borderRadius: 14, border: `1px solid ${outline}`, background: "transparent", color: ink, fontSize: textPx(14), fontWeight: 800, padding: "0 12px" }}
              >
                {secondary.label}
              </button>
            )}
            <button
              ref={safeRef}
              onClick={onCancel}
              className="tap w-full"
              style={
                cancelVariant === "outlined"
                  ? { minHeight: 48, borderRadius: 14, border: `1px solid ${outline}`, background: "transparent", color: ink, fontSize: textPx(14), fontWeight: 800, padding: "0 12px" }
                  : { minHeight: 44, background: "transparent", color: inkSoft, fontSize: textPx(14), fontWeight: 700 }
              }
            >
              {cancelLabel}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
