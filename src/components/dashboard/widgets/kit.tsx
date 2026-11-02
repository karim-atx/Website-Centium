import React from "react";
import { Check } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useOnline } from "../../../hooks/useOnline";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { textPx, linePx } from "../../../theme/textSize";
import { clock12 } from "../../../utils/time12";
import { t } from "../../../i18n/core";
import { weekLetters } from "./weekLetters";
import { MetricWidget, type MetricWidgetProps } from "../../health/MetricWidget";

// v6 Batch 2 · Home: the parts every HO1 widget shares, on top of Health A's
// MetricWidget (preset "home", V6-56). Literal values from home-handover.md
// (HO1.W* tables) and the OURS-home-* sheets.

/** HO1 card sizes: small 175.5 x 114, large 358 x 150 (fluid width by grid span; fixed height, V6-95). */
export const CARD_HEIGHT = { small: 114, large: 150 } as const;

export function useHomeMode() {
  const { accessibility, colorTheme } = useApp();
  const dark = useIsDark();
  const reduce = useReducedMotion();
  const online = useOnline();
  return { dark, hc: !!accessibility.highContrast, reduce, online, theme: colorTheme };
}

/**
 * Colours of the Home widgets outside the HE1 metric table (Workout, Habits,
 * Journal, Meditation), light and dark, from each HO1 table. Workout, Journal
 * and Meditation are fixed in every theme (V6-60); Habits' purple follows the
 * theme primary through the th-/thi- variables (HO1.W8 OURS-themes).
 */
export function homeColors(kind: "workout" | "habits" | "journal" | "meditation", dark: boolean) {
  const tile = dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.85)";
  switch (kind) {
    case "workout":
      // HO1.W6 #0-#3: #EDEFF3, icon #5F6878, label #4E5666 / dark #262932*, #B8C0CE*.
      return dark
        ? { tint: "rgb(var(--c-widget-workout-tint))", icon: "#B8C0CE", label: "#B8C0CE", ink: "#B8C0CE", tile }
        : { tint: "#EDEFF3", icon: "#5F6878", label: "#4E5666", ink: "#4E5666", tile };
    case "habits":
      // HO1.W8 #0-#3: #F0EDF9, #5F5093 / dark #303141, #C3B3FB (theme purple).
      return dark
        ? { tint: "rgb(var(--th-303141))", icon: "rgb(var(--thi-c3b3fb))", label: "rgb(var(--thi-c3b3fb))", ink: "rgb(var(--thi-c3b3fb))", tile }
        : { tint: "rgb(var(--th-f0edf9))", icon: "rgb(var(--thi-5f5093))", label: "rgb(var(--thi-5f5093))", ink: "rgb(var(--thi-5f5093))", tile };
    case "journal":
      // HO1.W9 #0-#3: #F8F0DC, icon #8A6418, label #7A5812 / dark #3A342C*, #DCBB7F.
      return dark
        ? { tint: "#3A342C", icon: "#DCBB7F", label: "#DCBB7F", ink: "#DCBB7F", tile }
        : { tint: "#F8F0DC", icon: "#8A6418", label: "#7A5812", ink: "#7A5812", tile };
    case "meditation":
      // HO1.W10 #0-#3: #E3F0EC, icon #3F7A6B, label #346658 / dark #293339, #93C1B9.
      return dark
        ? { tint: "#293339", icon: "#93C1B9", label: "#93C1B9", ink: "#93C1B9", tile }
        : { tint: "#E3F0EC", icon: "#3F7A6B", label: "#346658", ink: "#346658", tile };
  }
}

/** One line that never wraps: the fixed card truncates under Larger text (V6-95). */
export const Line: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; className?: string }> = ({ children, style, className }) => (
  <span className={`block truncate ${className ?? ""}`} style={style}>
    {children}
  </span>
);

/** Header pill (HO1.W1-L #4): 17.5 tall, pad 4 8, r9999, 9.5/9.5 700, ink on #FFFFFF@85% (dark @8%*). */
export const HeaderPill: React.FC<{ children: React.ReactNode; ink: string; dark: boolean }> = ({ children, ink, dark }) => (
  <span
    className="shrink-0 inline-flex items-center rounded-full whitespace-nowrap"
    style={{
      padding: "4px 8px",
      fontSize: textPx(9.5),
      lineHeight: linePx(9.5),
      fontWeight: 700,
      color: ink,
      background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.85)",
    }}
  >
    {children}
  </span>
);

/** HO1.W6 #4-#5: Check 11 + "Done" 9.5/12.4 700, #357A4D / dark #7FC79C, gap 3. */
export const DoneStatus: React.FC<{ label: string; dark: boolean }> = ({ label, dark }) => {
  const ink = dark ? "#7FC79C" : "#357A4D";
  return (
    <span className="shrink-0 inline-flex items-center whitespace-nowrap" style={{ gap: 3, color: ink, fontSize: textPx(9.5), lineHeight: linePx(12.4), fontWeight: 700 }}>
      <Check size={11} strokeWidth={2} aria-hidden />
      {label}
    </span>
  );
};

/** The handover's error line under a cached value: "Updated 8:12 AM" (12-hour rule), or the OURS offline twin. */
export function staleLine(updatedAt: string | null, online: boolean): string | null {
  if (!updatedAt) return online ? null : t("Offline");
  const time = clock12(updatedAt);
  return online ? t("Updated {time}", { time }) : t("Offline · updated {time}", { time });
}

/** A value that cross-fades 300 ms when it changes (OURS-home-widget-motion #4); static under Reduce motion. */
export const FadeValue: React.FC<{ value: React.ReactNode; k: string | number }> = ({ value, k }) => (
  <span key={k} className="hw-home-fade">
    {value}
  </span>
);

/** Keyframes for the Home widgets (one style element; React hoists and dedupes it). */
export const HomeKeyframes: React.FC = () => (
  <style href="home-widget-motion" precedence="default">{`
@keyframes hw-home-fade { from { opacity: 0 } to { opacity: 1 } }
.hw-home-fade { animation: hw-home-fade 300ms cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes hw-print-in { from { fill-opacity: 0 } to { fill-opacity: 1 } }
@keyframes hw-ekg-rr { from { transform: translateX(0) } to { transform: translateX(var(--hw-rr)) } }
@keyframes hw-ring-draw { from { stroke-dashoffset: var(--hw-ring-from) } to { stroke-dashoffset: var(--hw-ring-to) } }
@media (prefers-reduced-motion: reduce) { .hw-home-fade { animation: none } }
.reduce-motion .hw-home-fade { animation: none }
`}</style>
);

/** Seven Monday-first day dots (HO1.W9 #6 / HO1.W10 #6): 8 x 8, gap 4. */
export const DayDots: React.FC<{ days: boolean[]; size: number; gap: number; fill: string; ring: string; ringWidth?: number }> = ({
  days,
  size,
  gap,
  fill,
  ring,
  ringWidth = 1,
}) => (
  <span className="flex items-center" style={{ gap }} aria-hidden>
    {days.map((on, i) => (
      <span
        key={i}
        className="block rounded-full shrink-0"
        style={{ width: size, height: size, boxSizing: "border-box", background: on ? fill : "transparent", border: on ? "none" : `${ringWidth}px solid ${ring}` }}
      />
    ))}
  </span>
);

/** Strip of seven letter + dot columns (OURS-home-large-widgets §C/§D, from HO1.W11-L #10/#11). */
export const WeekStrip: React.FC<{
  days: boolean[];
  todayIndex: number;
  fill: string;
  ring: string;
  dark: boolean;
}> = ({ days, todayIndex, fill, ring }) => (
  <span className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", columnGap: 6, width: 200 }} aria-hidden>
    {weekLetters().map((l, i) => (
      <span key={i} className="flex flex-col items-center" style={{ gap: 4 }}>
        <span
          style={{
            fontSize: textPx(8.5),
            lineHeight: linePx(11.1),
            fontWeight: i === todayIndex ? 700 : 600,
            color: i === todayIndex ? "rgb(var(--c-charcoal))" : "rgb(var(--c-charcoal-faint))",
          }}
        >
          {l}
        </span>
        <span
          className="block rounded-full"
          style={{ width: 14, height: 14, boxSizing: "border-box", background: days[i] ? fill : "transparent", border: days[i] ? "none" : `1.1px solid ${ring}` }}
        />
      </span>
    ))}
  </span>
);

/**
 * A Home widget card: MetricWidget (preset "home") at the fixed HO1 height,
 * opening its screen on tap. With inner actions (Play, Pick, + Log) the card
 * is a div with role="button" so no button sits inside a button. While the
 * board is being edited the card does nothing of its own (WidgetShell).
 */
export const HomeCard: React.FC<
  Omit<MetricWidgetProps, "preset" | "onClick"> & {
    size: "small" | "large";
    editMode: boolean;
    onOpen?: () => void;
    innerActions?: boolean;
  }
> = ({ size, editMode, onOpen, innerActions, style, ariaLabel, ...rest }) => {
  const card = (
    <MetricWidget
      {...rest}
      preset="home"
      size={size}
      ariaLabel={innerActions ? undefined : ariaLabel}
      onClick={!innerActions && !editMode ? onOpen : undefined}
      onRetry={editMode ? undefined : rest.onRetry}
      style={{ height: CARD_HEIGHT[size], minHeight: CARD_HEIGHT[size], ...style }}
    />
  );
  if (!innerActions || editMode) return card;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className="tap cursor-pointer rounded-[15px]"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.();
        }
      }}
    >
      {card}
    </div>
  );
};

/** A press inside a card that never reaches the card (and keeps a 44 x 44 hit area). */
export function stop(action: () => void) {
  return {
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      action();
    },
    onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
  };
}

/** Invisible 44 x 44 hit area centred on a smaller control (pattern from the repo's water quick add). */
export const Hit44: React.FC = () => (
  <span aria-hidden className="absolute" style={{ insetInlineStart: "50%", top: "50%", width: 44, height: 44, transform: "translate(-50%, -50%)" }} />
);

/** Loading for 8 s with no data turns into Error (handover assumption, OURS-home-widget-states L3). */
export function useLoadingTimeout(loading: boolean, ms = 8000): boolean {
  const [timedOut, setTimedOut] = React.useState(false);
  React.useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }
    const t = window.setTimeout(() => setTimedOut(true), ms);
    return () => window.clearTimeout(t);
  }, [loading, ms]);
  return timedOut;
}

export { textPx, linePx };
