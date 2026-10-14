import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, MoreVertical, Pencil, RefreshCw, Trash2, WifiOff } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useBack } from "../../../hooks/useBack";
import { textPx, linePx } from "../../../theme/textSize";
import { FixedHeader } from "../../ui/FixedHeader";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { PopupMenu, type PopupMenuOption } from "../../ui/PopupMenu";
import { PinnedCta } from "../../ui/PinnedCta";
import { SwipeActions, type SwipeAction } from "../../ui/SwipeActions";
import { heroPatternGenericUrl } from "../../../utils/assetUrls";
import { syncState, useHealthSources, whenText } from "../../../services/health-metrics/b1";
import type { MetricKey } from "../MetricWidget";
import { RANGE_TABS, type MetricRange } from "./periods";

// The shared metric-page kit (health-handover.md "Shared rules (all metric
// pages)" and the HE1.1-HE1.7 layout tables). Every value below is the
// handover's literal; dark values from the Dark column (* = derived).

/** dark / high contrast, read once per component. */
export function useHealthMode() {
  const { theme, accessibility } = useApp();
  return { dark: theme === "dark", hc: !!accessibility.highContrast };
}

/**
 * The health_metrics read state (AppContext metricsLoadedAt / metricsError /
 * reloadMetrics): loading until the first answer, the error until a read
 * succeeds; retry re-reads. Never inferred from a null value.
 */
export function useMetricsLoad() {
  const { metricsLoadedAt, metricsError, reloadMetrics } = useApp();
  return { loading: metricsLoadedAt === null && !metricsError, error: metricsError, retry: reloadMetrics };
}

/** 0.5px card hairline: #241F1B@8% (dark #F5F3FA@8%); High contrast 30% of ink (X-09). */
export function hairline(dark: boolean, hc: boolean, alpha = 0.08): string {
  if (hc) return "rgb(var(--c-charcoal) / 0.3)";
  return dark ? `rgba(245,243,250,${alpha})` : `rgba(36,31,27,${alpha})`;
}

/** Metric colour helpers (--metric-<key>-*, fixed in every theme; Weight follows the theme). */
export const mc = (metric: MetricKey, part: "main" | "tint" | "accent" | "ink" | "pattern", alpha?: number) =>
  alpha === undefined ? `rgb(var(--metric-${metric}-${part}))` : `rgb(var(--metric-${metric}-${part}) / ${alpha})`;

/** Icons: light = dark accent, dark = metric dark main (every table's icon rows). */
export const metricIconInk = (metric: MetricKey, dark: boolean) => (dark ? mc(metric, "main") : mc(metric, "accent"));
/** Metric text ink: light = text ink, dark = #B8B3C7 (tables' "ink #B8B3C7"). */
export const metricTextInk = (metric: MetricKey, dark: boolean) => (dark ? "#B8B3C7" : mc(metric, "ink"));

/**
 * Part B pinned CTA / popup primary (HE1.2 #60, HE1.6.a #59): --c-fill-pinned
 * #9A8CD6 (dark the primary fill, High contrast #5B48B8) with on-primary-fill
 * ink, 14/21 700. Inline so it wins over the shared CtaButton classes
 * (bg-primary-fill, leading-none).
 */
export const PINNED_FILL_STYLE: React.CSSProperties = {
  background: "rgb(var(--c-fill-pinned))",
  color: "rgb(var(--c-on-primary-fill))",
  fontSize: textPx(14),
  lineHeight: linePx(21),
};

// ---------------------------------------------------------------------------
// Page shell

export interface MetricMenuItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export interface MetricPageProps {
  metric: MetricKey;
  title: string;
  range: MetricRange;
  onRangeChange: (r: MetricRange) => void;
  /** ⋮ items (OURS-health-overflow-menus). */
  menu?: MetricMenuItem[];
  /** Source tag right of the title (native; hidden on the web). */
  sourceTag?: string | null;
  onSourceTag?: () => void;
  /** Pinned CTA (manual metrics and Steps). */
  cta?: { label: string; icon?: React.ReactNode; onClick: () => void; disabled?: boolean };
  children: React.ReactNode;
}

/**
 * Fixed area (HE1.2 #1-#9): 390 × 136, pad 24 16 14 16, white (dark #1C1F28)
 * with the hairline only once content passes under (HE1.2.s); back and ⋮
 * 36 r9999 (hit 44), title 24/30 700 ls-0.5, source tag, Day/Week/Month/Year
 * 358 × 50 r16 pad 6 #F3F3FD (dark #303141), tabs 38 r12 12.5/18.8 700, idle
 * #F5F4FE ink #5B5349 (dark #303141 / #B8B3C7), active #A79AD5 white (dark
 * #A991FE / #0D0B1A). Content gets 176 bottom padding when a CTA is pinned.
 */
export const MetricPage: React.FC<MetricPageProps> = ({ metric, title, range, onRangeChange, menu, sourceTag, onSourceTag, cta, children }) => {
  const back = useBack();
  const { dark } = useHealthMode();
  const [menuBtn, setMenuBtn] = useState<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const options: PopupMenuOption[] = (menu ?? []).map((m) => ({ value: m.value, label: m.label, icon: m.icon }));

  return (
    <div style={{ paddingBottom: cta ? 176 : 96 }} data-metric-page={metric}>
      <FixedHeader paddingBottom={14} fillClassName="bg-cream dark:bg-[#1C1F28]">
        <div className="flex items-center" style={{ gap: 4, height: 36, marginLeft: -8 }}>
          <button
            type="button"
            onClick={back}
            aria-label="Back"
            className="tap shrink-0 grid place-items-center rounded-full relative before:absolute before:-inset-1 before:content-['']"
            style={{ width: 36, height: 36 }}
          >
            <ChevronLeft size={20} style={{ color: "rgb(var(--c-charcoal-soft))" }} aria-hidden />
          </button>
          <h1
            className="flex-1 min-w-0 line-clamp-2"
            style={{ fontSize: textPx(24), lineHeight: linePx(30), fontWeight: 700, letterSpacing: -0.5, color: "rgb(var(--c-charcoal))" }}
          >
            {title}
          </h1>
          {sourceTag && (
            <button
              type="button"
              onClick={onSourceTag}
              className="tap shrink-0 inline-flex items-center rounded-full"
              style={{ height: 24, padding: "0 9px", gap: 4, background: mc(metric, "tint"), color: metricTextInk(metric, dark) }}
            >
              <RefreshCw size={11} style={{ color: metricIconInk(metric, dark) }} aria-hidden />
              <span style={{ fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 700 }}>{sourceTag}</span>
            </button>
          )}
          {menu && menu.length > 0 && (
            <button
              ref={setMenuBtn}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="More options"
              aria-haspopup="menu"
              className="tap shrink-0 grid place-items-center rounded-full relative before:absolute before:-inset-1 before:content-['']"
              style={{ width: 36, height: 36, marginRight: -8 }}
            >
              <MoreVertical size={20} style={{ color: "rgb(var(--c-charcoal-soft))" }} aria-hidden />
            </button>
          )}
        </div>
        <SegmentedTabs
          className="mt-3"
          items={RANGE_TABS}
          activeKey={range}
          onChange={(k) => onRangeChange(k as MetricRange)}
          size="compact"
          darkTone="partB"
          idleInk="rgb(var(--c-charcoal-soft))"
        />
      </FixedHeader>
      {children}
      {menu && menu.length > 0 && (
        <PopupMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchor={menuBtn}
          options={options}
          align="right"
          width={220}
          variant="health"
          onSelect={(v) => {
            setMenuOpen(false);
            menu.find((m) => m.value === v)?.onSelect();
          }}
        />
      )}
      {cta && <PinnedCta primary={{ label: cta.label, icon: cta.icon, onClick: cta.onClick, disabled: cta.disabled, style: PINNED_FILL_STYLE }} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Hero

/**
 * Hero card 358 wide r22 in the metric tint (each page gives its own padding
 * and the Sleep night hero its own fill), with the identity pattern p<n>.svg
 * under content. p*.svg have no -dark file: the pattern is drawn as a CSS
 * mask over a fill in the metric accent (dark: the "Pattern colour dark"
 * column, --metric-<key>-pattern), so its own opacities are kept and the dark
 * recolour is exact. High contrast: 50% (HE1 States). The "masked behind
 * number and text" area is UNSPECIFIED: a centred ellipse fades the layer
 * where the hero content sits.
 */
export const MetricHero: React.FC<{
  metric: MetricKey;
  pattern?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | null;
  padding: string;
  background?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Loading: tint + 2 skeleton bars (Shared states). */
  loading?: boolean;
  children?: React.ReactNode;
  ariaLabel?: string;
}> = ({ metric, pattern, padding, background, className, style, loading, children, ariaLabel }) => {
  const { dark, hc } = useHealthMode();
  const url = pattern === null || pattern === undefined ? null : heroPatternGenericUrl(pattern);
  const mask = url ? `url(${url}), radial-gradient(ellipse 42% 38% at 50% 45%, transparent 50%, #000 100%)` : undefined;
  return (
    <section
      aria-label={ariaLabel}
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{ borderRadius: 22, padding, background: background ?? mc(metric, "tint"), ...style }}
    >
      {url && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: dark ? mc(metric, "pattern") : mc(metric, "accent"),
            opacity: hc ? 0.5 : 1,
            WebkitMaskImage: mask,
            maskImage: mask,
            WebkitMaskSize: "cover, 100% 100%",
            maskSize: "cover, 100% 100%",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskComposite: "source-in",
            maskComposite: "intersect",
          }}
        />
      )}
      <div className="relative">
        {loading ? (
          <div className="flex flex-col items-center" style={{ gap: 10, padding: "40px 0" }}>
            <SkeletonBar width="60%" height={28} />
            <SkeletonBar width="40%" height={14} />
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
};

/** Hero pill: pad 3 9 r9999 10.5/15.8 700 metric ink on #FFFFFF@80% (dark #FFFFFF@8%*). */
export const HeroPill: React.FC<{ metric: MetricKey; children: React.ReactNode; color?: string; icon?: React.ReactNode }> = ({ metric, children, color, icon }) => {
  const { dark } = useHealthMode();
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full"
      style={{
        padding: "3px 9px",
        gap: 4,
        fontSize: textPx(10.5),
        lineHeight: linePx(15.8),
        fontWeight: 700,
        color: color ?? metricTextInk(metric, dark),
        background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.8)",
      }}
    >
      {icon}
      {children}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Stat card

export interface Stat {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  value: React.ReactNode;
  label: string;
}

/**
 * Shared stat card (HE1.2 #18-#27): metric tint r16 pad 10 2 with 0.5px
 * dividers #E5E7EB (dark #383B44); each stat = 20 tile r6 #FFFFFF@80% with a
 * 13 icon left of the number (15/17.3 800 ls-0.4 tnum), label under (10/13
 * 600 metric ink), centred as a group. Width / margin per page (`style`).
 */
export const StatCard: React.FC<{
  metric: MetricKey;
  stats: Stat[];
  style?: React.CSSProperties;
  className?: string;
  /** Value type: 15 = 15/17.3 (HE1.2 #21, default), 17 = 17/19.6 (HE1.1 #35, HE1.3 #42, HE1.4 #46). */
  valueSize?: 15 | 17;
}> = ({ metric, stats, style, className, valueSize = 15 }) => {
  const { dark, hc } = useHealthMode();
  return (
    <div className={`flex items-stretch ${className ?? ""}`} style={{ borderRadius: 16, padding: "10px 2px", background: mc(metric, "tint"), ...style }}>
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="flex-1 min-w-0 flex flex-col items-center justify-center"
          style={{
            padding: "0 6px",
            borderLeft: i === 0 ? undefined : `0.5px solid ${hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "#383B44" : "#E5E7EB"}`,
          }}
        >
          <span className="flex items-center" style={{ gap: 5 }}>
            <span className="grid place-items-center shrink-0" style={{ width: 20, height: 20, borderRadius: 6, background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.8)" }}>
              <s.icon size={13} strokeWidth={1.5} style={{ color: metricIconInk(metric, dark) }} />
            </span>
            <span
              className="whitespace-nowrap"
              style={{ fontSize: textPx(valueSize), lineHeight: linePx(valueSize === 17 ? 19.6 : 17.3), fontWeight: 800, letterSpacing: -0.4, fontVariantNumeric: "tabular-nums", color: "rgb(var(--c-charcoal))" }}
            >
              {s.value}
            </span>
          </span>
          <span className="truncate max-w-full" style={{ marginTop: 3, fontSize: textPx(10), lineHeight: linePx(13), fontWeight: 600, color: metricTextInk(metric, dark) }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Freshness / offline / error lines

/** Freshness line (synced metrics, native): 10.5/15.8 600 #5B5349 + RefreshCw 11, m-top 8. */
export const FreshnessLine: React.FC<{ children: React.ReactNode; offline?: boolean }> = ({ children, offline }) => (
  <p className="flex items-center" style={{ marginTop: 8, gap: 5, fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>
    {offline ? <WifiOff size={11} aria-hidden /> : <RefreshCw size={11} aria-hidden />}
    <span>{children}</span>
  </p>
);

export const OFFLINE_CACHED = "You're offline. Showing your last saved data.";
export const OFFLINE_ACTION = "You're offline. Try again when you're connected.";
export const SAVE_FAILED = "Couldn't save. Try again.";

/** Error card in place of the chart (no cache): 12/18 600 #C0392B (dark #F09A8E), Retry 700. */
export const ErrorCard: React.FC<{ onRetry: () => void; message?: string }> = ({ onRetry, message = "Couldn't load your data." }) => {
  const { dark, hc } = useHealthMode();
  return (
    <div
      role="alert"
      className="flex items-center justify-between"
      style={{ marginTop: 12, borderRadius: 18, padding: 14, background: dark ? "#1C1F28" : "#FFFFFF", border: `0.5px solid ${hairline(dark, hc)}` }}
    >
      <span style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: dark ? "#F09A8E" : "#C0392B" }}>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="tap min-h-[44px] px-2"
        style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: dark ? "#F09A8E" : "#C0392B" }}
      >
        Retry
      </button>
    </div>
  );
};

/** Skeleton bar: #FFFFFF@60% on tints (dark @6%); `neutral` = #F5F5F6 (dark #242730) for the chart card. */
export const SkeletonBar: React.FC<{ width: string | number; height: number; neutral?: boolean; radius?: number }> = ({ width, height, neutral, radius = 6 }) => {
  const { dark } = useHealthMode();
  return (
    <span
      aria-hidden
      className="block animate-skeleton-pulse"
      style={{
        width,
        height,
        borderRadius: radius,
        background: neutral ? (dark ? "#242730" : "#F5F5F6") : dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.6)",
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Chart card

/**
 * Chart card (HE1.2 #30-#39): r18 white + 0.5px #241F1B@8% (dark #1C1F28,
 * #F5F3FA@8%), pad 14, m-top 12; title 13/19.5 700; ‹ › 24 r9999 (hit 44)
 * with ChevronLeft/Right 14 #5B5349, next dimmed on the current period;
 * period label 11/16.5 700 #5B5349; chart (caller, 146 tall); legend row
 * 10.5/15.8 600 #5B5349 gap 6 14; foot line 10.5/15.8 600 metric ink, m-top 8.
 */
export const ChartCard: React.FC<{
  metric: MetricKey;
  title: string;
  periodLabel: string;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  legend?: { label: string; swatch: React.ReactNode }[];
  foot?: React.ReactNode;
  /** Loading: 7 neutral skeleton bars. */
  loading?: boolean;
  /** Screen-reader summary sentence. */
  summary?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  /** Added (Health A sub-agent B): no ‹ › chevrons (HE1.2.e #20 ghost period card). */
  hideNav?: boolean;
}> = ({ metric, title, periodLabel, onPrev, onNext, nextDisabled, legend, foot, loading, summary, children, style, hideNav }) => {
  const { dark, hc } = useHealthMode();
  const chev = (dir: "prev" | "next") => {
    if (hideNav) return null;
    const disabled = dir === "next" && nextDisabled;
    const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
    return (
      <button
        type="button"
        onClick={dir === "prev" ? onPrev : onNext}
        disabled={disabled}
        aria-label={dir === "prev" ? "Previous period" : "Next period"}
        className="tap relative grid place-items-center rounded-full before:absolute before:-inset-[10px] before:content-[''] disabled:opacity-35"
        style={{ width: 24, height: 24 }}
      >
        <Icon size={14} style={{ color: "rgb(var(--c-charcoal-soft))" }} aria-hidden />
      </button>
    );
  };
  return (
    <section
      style={{ marginTop: 12, borderRadius: 18, padding: 14, background: dark ? "#1C1F28" : "#FFFFFF", border: `0.5px solid ${hairline(dark, hc)}`, ...style }}
      aria-label={summary}
    >
      <div className="flex items-center justify-between" style={{ gap: 8, marginTop: -3.5 }}>
        <h2 style={{ fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>{title}</h2>
        <div className="flex items-center" style={{ gap: 2 }}>
          {chev("prev")}
          <span className="whitespace-nowrap" style={{ fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 700, color: "rgb(var(--c-charcoal-soft))" }}>
            {periodLabel}
          </span>
          {chev("next")}
        </div>
      </div>
      <div style={{ marginTop: 8 }} aria-hidden={summary ? true : undefined}>
        {loading ? (
          <div className="flex items-end justify-between" style={{ height: 146, padding: "0 6px" }}>
            {[60, 90, 45, 110, 75, 95, 55].map((h, i) => (
              <SkeletonBar key={i} width={20} height={h} neutral />
            ))}
          </div>
        ) : (
          children
        )}
      </div>
      {legend && legend.length > 0 && (
        <div className="flex flex-wrap items-center" style={{ marginTop: 8, columnGap: 14, rowGap: 6 }}>
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center" style={{ gap: 6, fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>
              {l.swatch}
              {l.label}
            </span>
          ))}
        </div>
      )}
      {foot && (
        <p style={{ marginTop: 8, fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: metricTextInk(metric, dark) }}>{foot}</p>
      )}
    </section>
  );
};

// ---------------------------------------------------------------------------
// History

/** Caps section label (HE1.2 #40): 9.5/14.3 700 ls1.9 uppercase #9A94B3 (dark #8A8698), m 20 0 9 0. */
export const CapsLabel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const { dark, hc } = useHealthMode();
  return (
    <h2
      className="uppercase"
      style={{
        margin: "20px 0 9px",
        fontSize: textPx(9.5),
        lineHeight: linePx(14.3),
        fontWeight: 700,
        letterSpacing: 1.9,
        color: hc ? "rgb(var(--c-charcoal))" : dark ? "#8A8698" : "#9A94B3",
        ...style,
      }}
    >
      {children}
    </h2>
  );
};

export interface HistoryItem {
  key: string;
  title: string;
  meta: React.ReactNode;
  /** Optional second meta line (BP notes), 1 line with ellipsis. */
  meta2?: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** Sub-value colour override (range colours). */
  subColor?: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * History card (HE1.2 #41-#59): white r18 + 0.5px hairline; rows 60 tall pad
 * 9 14 separated by 0.5px #241F1B@5% (dark #F5F3FA@5%); tile 32 r10 metric
 * tint with the metric icon 17; title 13.5/18 600; meta 11/15 400 #8C8378,
 * m-top 2; value 14/21 800 tnum right; sub 10.5/15.8 600 #8C8378 m-top 1.
 * Swipe left: Edit (45 r12 #AEA1DC@18%, Pencil #7D67D9) and Delete (45 r12
 * #FCEDEC, Trash2 #B4372C); keyboard path through SwipeActions' keyboardLabel
 * and a long press.
 */
export const HistoryCard: React.FC<{
  metric: MetricKey;
  items: HistoryItem[];
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  empty?: string;
  loading?: boolean;
}> = ({ metric, items, icon, empty, loading }) => {
  const { dark, hc } = useHealthMode();
  const sep = hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.05)" : "rgba(36,31,27,0.05)";
  const bg = dark ? "#1C1F28" : "#FFFFFF";
  return (
    <div className="overflow-hidden" style={{ borderRadius: 18, background: bg, border: `0.5px solid ${hairline(dark, hc)}` }}>
      {loading ? (
        [0, 1, 2].map((i) => (
          <div key={i} className="flex items-center" style={{ height: 60, padding: "9px 14px", gap: 11, borderTop: i ? `0.5px solid ${sep}` : undefined }}>
            <SkeletonBar width={32} height={32} neutral radius={10} />
            <div className="flex-1 flex flex-col" style={{ gap: 6 }}>
              <SkeletonBar width="50%" height={11} neutral />
              <SkeletonBar width="35%" height={9} neutral />
            </div>
          </div>
        ))
      ) : items.length === 0 ? (
        <p className="text-center" style={{ padding: "18px 14px", fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 600, color: "rgb(var(--c-charcoal-faint))" }}>
          {empty}
        </p>
      ) : (
        items.map((it, i) => {
          const Icon = it.icon ?? icon;
          const row = (
            <div
              role={it.onClick ? "button" : undefined}
              tabIndex={it.onClick ? 0 : undefined}
              onClick={it.onClick}
              onKeyDown={it.onClick ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), it.onClick?.()) : undefined}
              className="flex items-center"
              style={{ minHeight: 60, padding: "9px 14px", gap: 11, background: bg }}
            >
              <span className="grid place-items-center shrink-0" style={{ width: 32, height: 32, borderRadius: 10, background: mc(metric, "tint") }} aria-hidden>
                <Icon size={17} strokeWidth={1.5} style={{ color: metricIconInk(metric, dark) }} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate" style={{ fontSize: textPx(13.5), lineHeight: linePx(18), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>
                  {it.title}
                </span>
                <span className="block truncate" style={{ marginTop: 2, fontSize: textPx(11), lineHeight: linePx(15), fontWeight: 400, color: "rgb(var(--c-charcoal-faint))" }}>
                  {it.meta}
                </span>
                {it.meta2 && (
                  <span className="block truncate" style={{ fontSize: textPx(11), lineHeight: linePx(15), fontWeight: 400, color: "rgb(var(--c-charcoal-faint))" }}>
                    {it.meta2}
                  </span>
                )}
              </span>
              <span className="shrink-0 flex flex-col items-end text-right">
                <span style={{ fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "rgb(var(--c-charcoal))" }}>{it.value}</span>
                {it.sub !== undefined && it.sub !== null && (
                  <span style={{ marginTop: 1, fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: it.subColor ?? "rgb(var(--c-charcoal-faint))" }}>{it.sub}</span>
                )}
              </span>
            </div>
          );
          const actions: SwipeAction[] = [];
          if (it.onEdit) actions.push({ key: "edit", label: "Edit", icon: <Pencil size={16} />, onClick: it.onEdit });
          if (it.onDelete) actions.push({ key: "delete", label: "Delete", icon: <Trash2 size={16} />, onClick: it.onDelete, destructive: true });
          return (
            <div key={it.key} style={{ borderTop: i ? `0.5px solid ${sep}` : undefined }}>
              {actions.length ? (
                <SwipeActions actions={actions} radius={0} tileMax={45} tileRadius={12} edgeInset={7} keyboardLabel={`${it.title}, ${typeof it.value === "string" ? it.value : ""}`}>
                  {row}
                </SwipeActions>
              ) : (
                row
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Web no-device state (OURS-health-no-device-web, HE1.2.e #8-#12)

export const noDeviceBody = (what: string) =>
  `${what} come from Apple Health or Health Connect on your phone. Syncing from the Centium phone app is coming. Centium only reads the data types you allow.`;

/**
 * HE1.2.e #8-#12: metric tint card, icon disc #FFFFFF@80%, title 17/25.5 800
 * ls-0.3, body 12.5/18.8 400 #5B5349. Card geometry per HE1.2.e (r22 pad 20,
 * disc 48: read from the HE1.2.e table by the page that uses it).
 */
export const NoDeviceCard: React.FC<{
  metric: MetricKey;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  title?: string;
  body: string;
  style?: React.CSSProperties;
  /**
   * HE1.2.e #8-#12 literal geometry: card pad 22 18, tile 48 r14, icon 24,
   * body m-top 6. Default false keeps the earlier drawing (pad 20, round
   * disc, icon 22, body m-top 4) for existing callers.
   */
  literal?: boolean;
}> = ({ metric, icon: Icon, title = "No device connected", body, style, literal }) => {
  const { dark } = useHealthMode();
  return (
    <section className="flex flex-col items-center text-center" style={{ borderRadius: 22, padding: literal ? "22px 18px" : 20, background: mc(metric, "tint"), ...style }}>
      <span className="grid place-items-center" style={{ width: 48, height: 48, borderRadius: literal ? 14 : 9999, background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.8)" }} aria-hidden>
        <Icon size={literal ? 24 : 22} strokeWidth={1.5} style={{ color: metricIconInk(metric, dark) }} />
      </span>
      <h2 style={{ marginTop: 12, fontSize: textPx(17), lineHeight: linePx(25.5), fontWeight: 800, letterSpacing: -0.3, color: "rgb(var(--c-charcoal))" }}>{title}</h2>
      <p style={{ marginTop: literal ? 6 : 4, fontSize: textPx(12.5), lineHeight: linePx(18.8), fontWeight: 400, color: "rgb(var(--c-charcoal-soft))" }}>{body}</p>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Range + anchor state (shared by the metric pages)

/**
 * The page's range and the day its period is anchored on. Opens on
 * `defaultRange` at today unless the route was entered with
 * `location.state` { range?: MetricRange; date?: string } (Home / HE1 deep
 * links, a History row, a Month day tap). The anchor never passes today.
 */
export function useMetricRangeState(defaultRange: MetricRange) {
  const { today } = useApp();
  const location = useLocation();
  const st = (location.state ?? {}) as { range?: MetricRange; date?: string };
  const [range, setRange] = useState<MetricRange>(st.range ?? defaultRange);
  const [anchor, setAnchorState] = useState<string>(st.date && st.date <= today ? st.date : today);
  const setAnchor = (d: string) => setAnchorState(d > today ? today : d);
  /** Opens one day in the Day view (Month day tap, History row, Go to date). */
  const openDay = (d: string) => {
    setRange("day");
    setAnchor(d);
  };
  return { range, setRange, anchor, setAnchor, openDay, today };
}

/** OURS-health-empty-water #5: an empty stat value, 13/15 800 (HE1.6 #36), "No data yet". */
export const StatEmpty: React.FC<{ children?: React.ReactNode }> = ({ children = "No data yet" }) => (
  <span data-stat-empty style={{ fontSize: textPx(13), lineHeight: linePx(15), fontWeight: 800, letterSpacing: 0 }}>
    {children}
  </span>
);

// ---------------------------------------------------------------------------
// Source tag + freshness line (HA-01, Database B1 health_integrations)

/**
 * The first connected source (priority order) as the header source tag, and
 * its freshness line: "Last synced today at 8:40 AM"; access off "<Source>
 * access is off. Turn it on" (handover, native settings link); failure
 * "Couldn't sync. Try again" (#C0392B / dark #F09A8E). Nothing on the web
 * today (no source is ever connected there): pages keep the no-device state.
 */
export function useMetricSource() {
  const { today } = useApp();
  const { dark } = useHealthMode();
  const { data: sources } = useHealthSources();
  const s = sources[0] ?? null;
  if (!s) return { tag: null as string | null, freshness: null as React.ReactNode };
  const state = syncState(s);
  const freshness =
    state === "access_off" ? (
      <FreshnessLine>{`${s.name} access is off. Turn it on`}</FreshnessLine>
    ) : state === "error" ? (
      <p style={{ marginTop: 8, fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: dark ? "#F09A8E" : "#C0392B" }}>
        Couldn't sync. <strong style={{ fontWeight: 700 }}>Try again</strong>
      </p>
    ) : s.lastSyncedAt ? (
      <FreshnessLine>{`Last synced ${whenText(s.lastSyncedAt, today)}`}</FreshnessLine>
    ) : null;
  return { tag: s.name, freshness };
}
