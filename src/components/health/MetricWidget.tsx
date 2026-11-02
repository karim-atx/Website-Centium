import React from "react";
import { ChevronRight, Plus } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { textPx, linePx } from "../../theme/textSize";
import { heroPatternUrl, type HeroPatternMetric } from "../../utils/assetUrls";
import { t } from "../../i18n/core";

// V6-56: ONE metric widget for Home and Health, with two literal presets.
//
//   preset "health"  HE1 #5-#78 (health-handover.md): 175 x 173.7 (small) /
//                    358 x 163.7 (large, Weight trend), pad 16 26 16 16, gap 8,
//                    r15; tile 28 r9 #FFFFFF@80% with a 16 icon at 1.25; caps
//                    label 9/13.5 700 ls1.4; value 34/34 600 ls-1.2 tnum
//                    (large: 40/40 ls-1.4); unit 15/15 600; graphic row 40;
//                    context 10.5/15.8 600; everything centred under the
//                    header; plain chevron 16 at the right edge, centred;
//                    identity pattern under content.
//   preset "home"    home-handover.md HO1.W*: small 175.5 x 114 pad 11 12,
//                    large 358 x 150 pad 13 16 14, r15; tile 20 r6
//                    #FFFFFF@85% with a 12 icon; caps label 9/9 700 ls1.4;
//                    value 24/24 600 ls-0.8 (large 34/34 ls-1.2); unit 12/12
//                    (large 15/15) 600; context 10/12 600; left aligned; no
//                    chevron, no pattern; `aside` for the large right graphic.
//
// DARK: the HE1 table's dark values on BOTH presets (V6-56): tint = metric
// dark tint, icon = metric dark main, label / unit / context #B8B3C7, value
// #F5F3FA, tile #FFFFFF@8% (derived *).
//
// Colours come from the --metric-<key>-* variables (index.css, V6-60: fixed in
// every theme; Weight follows the theme). A widget outside that table (Home's
// Workout, Habits, Journal, Meditation, Food) passes `colors`.

export type MetricKey = "water" | "steps" | "sleep" | "calories" | "heart-rate" | "blood-pressure" | "weight" | "cycle";

export interface MetricWidgetColors {
  /** Card background. */
  tint: string;
  /** Tile icon ink. */
  icon: string;
  /** Caps label ink. */
  label: string;
  /** Unit and context-line ink. */
  ink: string;
  /** Icon tile fill. */
  tile: string;
}

const PATTERN_OF: Partial<Record<MetricKey, HeroPatternMetric>> = {
  water: "water",
  steps: "steps",
  sleep: "sleep",
  calories: "cal",
  "heart-rate": "hr",
  "blood-pressure": "bp",
  weight: "wt",
};

/** The HE1 widget colours of a metric, light or dark (V6-56: one table for both presets). */
export function metricWidgetColors(metric: MetricKey, dark: boolean, preset: "health" | "home" = "health"): MetricWidgetColors {
  const v = (part: string) => `rgb(var(--metric-${metric}-${part}))`;
  if (dark) {
    return { tint: v("tint"), icon: v("main"), label: "#B8B3C7", ink: "#B8B3C7", tile: "rgba(255,255,255,0.08)" };
  }
  return {
    tint: v("tint"),
    icon: v("accent"),
    label: v("ink"),
    ink: v("ink"),
    tile: preset === "home" ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.8)",
  };
}

type IconLike = React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties; "aria-hidden"?: boolean }>;

/** "offline" (Batch 2 Home, OURS-home-widget-states O2): no cache while offline; not tappable. */
export type MetricWidgetState = "ready" | "empty" | "loading" | "error" | "offline";

export interface MetricWidgetProps {
  preset: "health" | "home";
  /** small = one grid cell; large = full width (HE1 Weight trend, Home large). */
  size?: "small" | "large";
  metric?: MetricKey;
  /** Overrides any of the resolved colours (Home widgets outside the metric table). */
  colors?: Partial<MetricWidgetColors>;
  /** Tile icon: a lucide icon or one with the same props (WeightScaleIcon). */
  icon: IconLike;
  label: string;
  /** Right side of the header row (Home: pill / status / legend). */
  headerRight?: React.ReactNode;
  value?: React.ReactNode;
  unit?: string;
  /** Health: the 40 px graphic row (Weight: 24). Home: the bar row. */
  graphic?: React.ReactNode;
  /** Graphic row height; health default 40, home default 20. */
  graphicHeight?: number;
  /** The context line(s) under the graphic. */
  context?: React.ReactNode;
  /** Home large: the graphic on the right of the value column. */
  aside?: React.ReactNode;
  /** Identity pattern URL; health default heroPatternUrl(metric); null = none. */
  pattern?: string | null;
  /** Plain chevron at the right edge (health default true). */
  chevron?: boolean;
  state?: MetricWidgetState;
  /** Empty state: title (default "No readings yet") and hint. */
  emptyTitle?: string;
  emptyHint?: React.ReactNode;
  /** Error state (no cache): title and hint; tapping calls onRetry when given. */
  errorTitle?: string;
  errorHint?: string;
  onRetry?: () => void;
  onClick?: () => void;
  /** One sentence for screen readers (HE1: "Water, 1.6 of 2.5 litres today"). */
  ariaLabel?: string;
  /** Extra layout (grid span, stretch). */
  className?: string;
  style?: React.CSSProperties;
  /** Any extra layer drawn inside the card, under content (e.g. a custom pattern). */
  children?: React.ReactNode;
  /**
   * Batch 2 Home (backward compatible; default = the preset's gap): the space
   * between the header row and the body. The HO1 tables place each widget's
   * value at its own y (Steps 36, Heart rate 38, Sleep 43 ...).
   */
  bodyGap?: number;
  /**
   * Batch 2 Home (backward compatible): header geometry overrides. The HO1.W11
   * Cycle states other than Default draw a 22 r7 tile, gap 6, a 9/13.5 label.
   */
  headerGeometry?: { tile?: number; tileRadius?: number; gap?: number; labelLine?: number };
  /** state "offline" (no cache): title and hint (Home OURS "You're offline" / "Shows when you reconnect"). */
  offlineTitle?: string;
  offlineHint?: string;
}

const GEOMETRY = {
  health: {
    small: { pad: "16px 26px 16px 16px", minHeight: 173.7, value: 34, valueLs: -1.2, unit: 15 },
    large: { pad: "16px 26px 16px 16px", minHeight: 163.7, value: 40, valueLs: -1.4, unit: 15 },
    tile: 28, tileRadius: 9, icon: 16, gap: 8, label: 9, labelLine: 13.5, context: 10.5, contextLine: 15.8, graphic: 40,
  },
  home: {
    small: { pad: "11px 12px", minHeight: 114, value: 24, valueLs: -0.8, unit: 12 },
    large: { pad: "13px 16px 14px", minHeight: 150, value: 34, valueLs: -1.2, unit: 15 },
    tile: 20, tileRadius: 6, icon: 12, gap: 7, label: 9, labelLine: 9, context: 10, contextLine: 12, graphic: 20,
  },
} as const;

/** Skeleton bar (#FFFFFF@60%, r6; dark #FFFFFF@6% per HO1), pulse 1.2 s, static under Reduce motion (.rm-fade / reduce-motion). */
const Skeleton: React.FC<{ width: string | number; height: number; radius: number; dark: boolean }> = ({ width, height, radius, dark }) => (
  <span
    className="block animate-skeleton-pulse"
    style={{ width, height, borderRadius: radius, background: dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.6)" }}
    aria-hidden
  />
);

export const MetricWidget: React.FC<MetricWidgetProps> = ({
  preset,
  size = "small",
  metric,
  colors,
  icon: Icon,
  label,
  headerRight,
  value,
  unit,
  graphic,
  graphicHeight,
  context,
  aside,
  pattern,
  chevron,
  state = "ready",
  emptyTitle = t("No readings yet"),
  emptyHint,
  errorTitle = t("Couldn't update"),
  errorHint = t("Tap to retry"),
  onRetry,
  onClick,
  ariaLabel,
  className,
  style,
  children,
  bodyGap,
  headerGeometry,
  offlineTitle = t("You're offline"),
  offlineHint = t("Shows when you reconnect"),
}) => {
  const { theme, accessibility } = useApp();
  const dark = theme === "dark";
  const hc = !!accessibility.highContrast;
  const g = GEOMETRY[preset];
  const s = g[size];
  const base: MetricWidgetColors = metric
    ? metricWidgetColors(metric, dark, preset)
    : { tint: "transparent", icon: "rgb(var(--c-charcoal))", label: "rgb(var(--c-charcoal))", ink: "rgb(var(--c-charcoal-soft))", tile: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.8)" };
  const c = { ...base, ...colors };
  const centred = preset === "health";
  const showChevron = chevron ?? preset === "health";
  const patternUrl =
    pattern === null ? null : pattern ?? (preset === "health" && metric && PATTERN_OF[metric] ? heroPatternUrl(PATTERN_OF[metric]!, dark) : null);
  const rowH = graphicHeight ?? g.graphic;
  const bodyTop = bodyGap ?? g.gap;
  const tileSize = headerGeometry?.tile ?? g.tile;
  const tileRadius = headerGeometry?.tileRadius ?? g.tileRadius;
  const headerGap = headerGeometry?.gap ?? g.gap;
  const labelLine = headerGeometry?.labelLine ?? g.labelLine;
  const valueInk = "rgb(var(--c-charcoal))";

  const interactive = !!onClick || (state === "error" && !!onRetry);
  const handle = state === "error" && onRetry ? onRetry : onClick;
  const Tag = interactive ? "button" : "div";

  const body = (() => {
    if (state === "loading") {
      return (
        <div className={`flex flex-col ${centred ? "items-center" : "items-start"}`} style={{ gap: 8, marginTop: bodyTop }}>
          {preset === "health" ? (
            <>
              <Skeleton width="60%" height={20} radius={6} dark={dark} />
              <Skeleton width="40%" height={12} radius={6} dark={dark} />
            </>
          ) : size === "small" ? (
            <>
              <Skeleton width={64} height={22} radius={6} dark={dark} />
              <Skeleton width={96} height={10} radius={5} dark={dark} />
            </>
          ) : (
            <>
              <Skeleton width={120} height={30} radius={8} dark={dark} />
              <Skeleton width={160} height={10} radius={5} dark={dark} />
            </>
          )}
        </div>
      );
    }
    if (state === "empty" || state === "error" || state === "offline") {
      const title = state === "empty" ? emptyTitle : state === "offline" ? offlineTitle : errorTitle;
      const hint = state === "empty" ? emptyHint : state === "offline" ? offlineHint : errorHint;
      if (preset === "home" && state === "error") {
        // OURS-home-widget-states E2: "Couldn't update" 12/700 #5B5349 (dark
        // #B8B3C7) and "Tap to retry" 10/600 in the metric ink, centred.
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ gap: 2 }}>
            <span style={{ fontSize: textPx(12), lineHeight: linePx(16), fontWeight: 700, color: dark ? "#B8B3C7" : "rgb(var(--c-charcoal-soft))" }}>
              {title}
            </span>
            {hint && <span style={{ fontSize: textPx(10), lineHeight: linePx(12), fontWeight: 600, color: c.ink }}>{hint}</span>}
          </div>
        );
      }
      if (preset === "home") {
        // HO1.W*.e: + in a 26 disc, "No readings yet" 11.5/15 700 #5B5349, hint 9.5/12.4 500 #8C8378 (dark #B8B3C7).
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ gap: 4 }}>
            {state === "empty" && (
              <span className="grid place-items-center rounded-full" style={{ width: 26, height: 26, background: c.tile }} aria-hidden>
                <Plus size={13} strokeWidth={2} style={{ color: c.icon }} />
              </span>
            )}
            <span style={{ fontSize: textPx(11.5), lineHeight: linePx(15), fontWeight: 700, color: dark ? "#B8B3C7" : "rgb(var(--c-charcoal-soft))" }}>
              {title}
            </span>
            {hint && (
              <span style={{ fontSize: textPx(9.5), lineHeight: linePx(12.4), fontWeight: 500, color: dark ? "#B8B3C7" : "rgb(var(--c-charcoal-faint))" }}>
                {hint}
              </span>
            )}
          </div>
        );
      }
      // OURS-health-empty-he1-widgets: title 12/700 ink (line height
      // UNSPECIFIED, 18), hint 10.5/15.8 600 in the metric ink; graphic row
      // hidden, height kept (the card's min height).
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ marginTop: g.gap }}>
          <span style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: valueInk }}>{title}</span>
          {hint && (
            <span style={{ fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: c.ink }}>{hint}</span>
          )}
        </div>
      );
    }
    const valueRow = value !== undefined && (
      <span className={`flex items-baseline ${centred ? "justify-center" : ""}`} style={{ gap: preset === "health" ? 4 : 3 }}>
        <span
          style={{
            fontSize: textPx(s.value),
            lineHeight: linePx(s.value),
            fontWeight: 600,
            letterSpacing: s.valueLs,
            fontVariantNumeric: "tabular-nums",
            color: valueInk,
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: textPx(s.unit), lineHeight: linePx(s.unit), fontWeight: 600, color: c.ink, whiteSpace: "nowrap" }}>{unit}</span>
        )}
      </span>
    );
    const column = (
      <div className={`flex flex-col min-w-0 ${centred ? "items-center text-center" : "items-start"}`} style={{ gap: preset === "health" ? 8 : 6 }}>
        {valueRow}
        {graphic && (
          <div className={`flex items-center ${centred ? "justify-center" : ""} w-full`} style={{ height: rowH }}>
            {graphic}
          </div>
        )}
        {context && (
          <div
            className="min-w-0"
            // Health: the context line is centred under the value and may
            // spread 11 into each side's padding (a 12-hour time, "mmHg ·
            // Very high · 9:00 AM", is wider than the board's 24-hour one).
            style={{
              fontSize: textPx(g.context),
              lineHeight: linePx(g.contextLine),
              fontWeight: 600,
              color: c.ink,
              ...(centred ? { margin: "0 -11px", maxWidth: "calc(100% + 22px)" } : { maxWidth: "100%" }),
            }}
          >
            {context}
          </div>
        )}
      </div>
    );
    return (
      <div className={aside ? "flex items-start justify-between gap-2.5" : ""} style={{ marginTop: bodyTop }}>
        {column}
        {aside}
      </div>
    );
  })();

  return (
    <Tag
      {...(interactive ? { type: "button" as const, onClick: handle } : {})}
      aria-label={ariaLabel ?? (state === "loading" ? t("Loading {label}", { label }) : undefined)}
      aria-busy={state === "loading" ? true : undefined}
      className={`tap relative overflow-hidden text-start flex flex-col ${className ?? ""}`}
      style={{
        background: c.tint,
        borderRadius: 15,
        padding: s.pad,
        minHeight: s.minHeight,
        width: "100%",
        ...style,
      }}
      data-metric-widget={metric ?? label}
    >
      {patternUrl && (
        // Identity pattern: static, under content. "Masked out behind the
        // number and the graphic" gives no mask geometry (UNSPECIFIED): a
        // centred ellipse fades the layer where the content column sits.
        // High contrast: patterns at 50% (HE1 States).
        <img
          src={patternUrl}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          style={{
            objectFit: "cover",
            opacity: hc ? 0.5 : 1,
            WebkitMaskImage: "radial-gradient(ellipse 46% 40% at 50% 52%, transparent 55%, #000 100%)",
            maskImage: "radial-gradient(ellipse 46% 40% at 50% 52%, transparent 55%, #000 100%)",
          }}
        />
      )}
      {children}
      <div className="relative flex items-center min-w-0" style={{ gap: headerGap }}>
        <span
          className="shrink-0 grid place-items-center"
          style={{ width: tileSize, height: tileSize, borderRadius: tileRadius, background: c.tile }}
          aria-hidden
        >
          <Icon size={g.icon} strokeWidth={preset === "home" ? 1.5 : 1.25} style={{ color: c.icon }} aria-hidden />
        </span>
        <span
          className="min-w-0 flex-1 line-clamp-2 break-words uppercase"
          // HE1 #39 / #59: "Calories burned" (103 wide at 251.5) and "Blood
          // pressure" run into the 26 right padding, past the chevron's
          // column; the label may use 16 of it (10 from the card edge, the
          // chevron's inset) before it ellipses.
          style={{
            fontSize: textPx(g.label),
            lineHeight: linePx(labelLine),
            fontWeight: 700,
            letterSpacing: 1.4,
            color: c.label,
            marginInlineEnd: preset === "health" && !headerRight ? -16 : undefined,
          }}
        >
          {label}
        </span>
        {headerRight}
      </div>
      <div className="relative flex-1 flex flex-col">{body}</div>
      {showChevron && (
        <ChevronRight
          size={16}
          aria-hidden
          className="absolute"
          style={{ insetInlineEnd: 9.9, top: "50%", marginTop: -8, color: "rgb(var(--c-charcoal-faint))" }}
        />
      )}
    </Tag>
  );
};
