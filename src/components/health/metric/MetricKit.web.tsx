import React, { useContext, useEffect, useRef, useState } from "react";
import { HeroRowContext, HeroSlotContext, type HeroSlot, type HeroStat } from "./heroSlot";
import { ChevronLeft, ChevronRight, MoreVertical, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { HistoryWindowLine } from "../../premium/HistoryWindowLine";
import { PopupMenu } from "../../ui/PopupMenu";
import { useWebLayout } from "../../web/useWebLayout";
import { HeaderCta, HeaderMenuButton, HealthWebHeader, WebCaps, WebSegmented } from "../../../pages/health/web/HealthWebKit";
import { RANGE_TABS, type MetricRange } from "./periods";
import type { MetricKey } from "../MetricWidget";
import { t } from "../../../i18n/core";

// Website viewport v1 · the Health metric pages (WC-HE.1-.7, WC-HE Health Web
// v5 "<metric>-<range>" screens): the web layout of the shared metric-page kit
// (MetricKit.tsx), taken from 1024px wide. Every metric page keeps its own
// data, rules, copy and parts; this file only lays them out for the web:
// - the page header (back, title, the page's primary action as a 40 button,
//   ⋮ as an anchored dropdown), the Day / Week / Month / Year tabs across the
//   page (40 tall), then the list-detail split: the hero, the chart and the
//   page's other cards on the left (8 fr), History on the right (4 fr; 1 : 1
//   at the rail) under its caps label;
// - the kit's cards at the web type scale (Body 15/24, Secondary 13/20,
//   chart labels 11–13), rows 68, hover tints, row ⋮ menus for Edit / Delete
//   in place of the mobile swipe.

type IconLike = React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;

const mc = (metric: MetricKey, part: "main" | "tint" | "accent" | "ink", alpha?: number) =>
  alpha === undefined ? `rgb(var(--metric-${metric}-${part}))` : `rgb(var(--metric-${metric}-${part}) / ${alpha})`;

/**
 * Elements MetricPageWeb moves (tagged in MetricKit.tsx and the hero files):
 * History and its caps label to the History column; the page's stat card and
 * its freshness lines into the hero ("hero"), as the reference draws them.
 */
export type WebRole = "history" | "caps" | "hero" | "stats" | "freshness";
const roleOf = (el: React.ReactElement): WebRole | undefined => (el.type as { webRole?: WebRole }).webRole;

type StatLike = HeroStat;

/** The page's children flattened through fragments (conditionals already dropped). */
function flatten(children: React.ReactNode): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  React.Children.forEach(children, (c) => {
    if (React.isValidElement(c) && c.type === React.Fragment) out.push(...flatten((c.props as { children?: React.ReactNode }).children));
    else if (c !== null && c !== undefined && c !== false && c !== true) out.push(c);
  });
  return out;
}

export interface MetricPageWebProps {
  metric: MetricKey;
  title: string;
  range: MetricRange;
  onRangeChange: (r: MetricRange) => void;
  menu?: { value: string; label: string; icon?: React.ReactNode; onSelect: () => void }[];
  cta?: { label: string; icon?: React.ReactNode; onClick: () => void; disabled?: boolean };
  headerAction?: React.ReactNode;
  sourceTag?: string | null;
  children: React.ReactNode;
}

export const MetricPageWeb: React.FC<MetricPageWebProps> = ({ metric, title, range, onRangeChange, menu, cta, headerAction, sourceTag, children }) => {
  const { rail } = useWebLayout();
  const [menuBtn, setMenuBtn] = useState<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const items = flatten(children);
  // History: the HistoryCard and the "History" caps label right before it.
  // With a hero on the page: the first stat card and the freshness lines go
  // into the hero (stats beside the hero visual, source row under the pills).
  const hasHero = items.some((c) => React.isValidElement(c) && roleOf(c) === "hero");
  const slot: HeroSlot = { stats: null, source: hasHero ? (sourceTag ?? null) : null, lines: [] };
  const aside: React.ReactNode[] = [];
  const main: React.ReactNode[] = [];
  items.forEach((c, i) => {
    const el = React.isValidElement(c) ? c : null;
    const next = items[i + 1];
    const role = el ? roleOf(el) : undefined;
    if (el && role === "history") aside.push(React.cloneElement(el, { key: el.key ?? `h${i}` }));
    else if (el && role === "caps" && React.isValidElement(next) && roleOf(next) === "history") return;
    else if (el && hasHero && role === "stats" && !slot.stats) slot.stats = (el.props as { stats: StatLike[] }).stats;
    else if (el && hasHero && role === "freshness") slot.lines.push(React.cloneElement(el, { key: el.key ?? `f${i}` }));
    else main.push(React.isValidElement(c) && c.key === null ? React.cloneElement(c, { key: `m${i}` }) : c);
  });

  return (
    <div className="flex flex-col bg-white" style={{ minHeight: "100dvh" }} data-metric-page={metric} data-web-page="metric">
      <HealthWebHeader
        title={title}
        back
        actions={
          <>
            {headerAction}
            {cta && <HeaderCta label={cta.label} icon={cta.icon} onClick={cta.onClick} disabled={cta.disabled} />}
            {menu && menu.length > 0 && <HeaderMenuButton ref={setMenuBtn} open={menuOpen} onClick={() => setMenuOpen(true)} />}
          </>
        }
      />
      <div className="flex flex-col" style={{ maxWidth: 1280, width: "100%", marginInline: "auto", padding: `24px ${rail ? 24 : 32}px`, boxSizing: "border-box", gap: 24 }}>
        <div>
          <WebSegmented items={RANGE_TABS.map((r) => ({ key: r.key, label: t(r.label) }))} active={range} onChange={(k) => onRangeChange(k as MetricRange)} ariaLabel={title} />
          <HistoryWindowLine className="mt-2" />
        </div>
        <div className="grid items-start" style={{ gridTemplateColumns: rail ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,8fr) minmax(0,4fr)", gap: 24 }}>
          <div className="min-w-0 flex flex-col" data-metric-main>
            <HeroSlotContext.Provider value={hasHero ? slot : null}>{main}</HeroSlotContext.Provider>
          </div>
          <aside className="min-w-0 flex flex-col" style={{ gap: 12 }} data-metric-history>
            {aside.length > 0 && <WebCaps as="h2">{t("History")}</WebCaps>}
            {aside}
          </aside>
        </div>
      </div>
      {menu && menu.length > 0 && (
        <PopupMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchor={menuBtn}
          options={menu.map((m) => ({ value: m.value, label: m.label, icon: m.icon }))}
          align="right"
          width={208}
          variant="health"
          onSelect={(v) => {
            setMenuOpen(false);
            menu.find((m) => m.value === v)?.onSelect();
          }}
        />
      )}
    </div>
  );
};

/** Hero pill: pad 4 12, r9999, 13/20 700 in the metric ink on #FFFFFF@80%. */
export const HeroPillWeb: React.FC<{ metric: MetricKey; children: React.ReactNode; color?: string; icon?: React.ReactNode }> = ({ metric, children, color, icon }) => (
  <span className="inline-flex items-center whitespace-nowrap rounded-full" style={{ padding: "4px 12px", gap: 4, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: color ?? mc(metric, "ink"), background: "rgba(255,255,255,0.8)" }}>
    {icon}
    {children}
  </span>
);

/** The hero's colours: the tint heroes, and Sleep's night hero (#2E4A48). */
const heroInks = (metric: MetricKey, night: boolean) =>
  night
    ? { ink: "#FFFFFF", sub: "rgba(255,255,255,0.8)", pillBg: "rgba(255,255,255,0.14)", pillInk: "#FFFFFF", statBg: "rgba(255,255,255,0.08)", line: "rgba(255,255,255,0.18)", chipBg: "rgba(255,255,255,0.12)", sync: "#C9DEDA" }
    : { ink: "#241F1B", sub: mc(metric, "ink"), pillBg: "rgba(255,255,255,0.8)", pillInk: mc(metric, "ink"), statBg: "rgba(255,255,255,0.5)", line: "#E5E7EB", chipBg: "rgba(255,255,255,0.8)", sync: "#5B5349" };

/**
 * The web hero's contents (WC-HE Health Web v5 detail hero): a row that wraps,
 * gap 24, centred: the metric's visual at its own width, then a column
 * (flex 1 1 300, min 0) holding the stats (r16 pad 12 4 on #FFFFFF@50%, m-bottom
 * 14; each a 28 r8 #FFFFFF@80% tile with the 16 icon in the accent beside
 * the 20/24 800 value, the 13/18 600 label under it, 0.5px #E5E7EB between),
 * the pills (gap 8: pad 4 12 r999 13/20 700 metric ink on #FFFFFF@80%), the
 * legend (m-top 10, gap 6 14, 10 × 6 r3 swatches, 13/20 600), the page's
 * extra controls, and the source row (m-top 12, gap 8 12: a 28 chip pad 0 10
 * with a 12 refresh icon, 13 700; the freshness line 13/20 600 #5B5349).
 * Sleep's night hero takes the white inks.
 */
export const HeroWebLayout: React.FC<{
  metric: MetricKey;
  night?: boolean;
  visual: React.ReactNode;
  visualWidth: number;
  pills?: React.ReactNode[];
  legend?: { color: string; label: string }[];
  /** The hero's own stats (Steps); otherwise the page's stat card. */
  stats?: StatLike[];
  children?: React.ReactNode;
}> & { webHeroLayout?: boolean } = ({ metric, night = false, visual, visualWidth, pills, legend, stats, children }) => {
  const slot = useContext(HeroSlotContext);
  const k = heroInks(metric, night);
  const st = stats ?? slot?.stats ?? null;
  const source = slot?.source ?? null;
  const lines = slot?.lines ?? [];
  const extra = flatten(children);
  const hasCol = !!(st?.length || pills?.length || legend?.length || extra.length || source || lines.length);
  return (
    <div className="relative flex flex-wrap items-center" style={{ gap: 24, color: k.ink }} data-web-hero>
      <div className="relative shrink-0" style={{ width: hasCol ? visualWidth : "100%", maxWidth: "100%" }} data-web-hero-visual>
        {visual}
      </div>
      {hasCol && (
        <div className="relative min-w-0" style={{ flex: "1 1 300px" }} data-web-hero-col>
          {st && st.length > 0 && (
            <div className="flex items-stretch" style={{ borderRadius: 16, padding: "12px 4px", marginBottom: 14, background: k.statBg }} data-web-stats>
              {st.map((s, i) => (
                <div key={s.label} className="flex-1 min-w-0 flex flex-col items-center justify-center" style={{ padding: "0 8px", borderInlineStart: i === 0 ? undefined : `0.5px solid ${k.line}` }}>
                  <span className="flex items-center" style={{ gap: 6 }}>
                    <span className="grid place-items-center shrink-0" style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.8)" }}>
                      <s.icon size={16} strokeWidth={1.5} style={{ color: mc(metric, "accent") }} />
                    </span>
                    <span className="whitespace-nowrap" style={{ fontSize: 20, lineHeight: "24px", fontWeight: 800, letterSpacing: "-0.4px", fontVariantNumeric: "tabular-nums", color: k.ink }}>
                      {s.value}
                    </span>
                  </span>
                  <span className="truncate max-w-full" style={{ marginTop: 4, fontSize: 13, lineHeight: "18px", fontWeight: 600, color: k.sub }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}
          {pills && pills.length > 0 && (
            <div className="flex flex-wrap" style={{ gap: 8 }} data-web-pills>
              {pills.map((p, i) => (
                <span key={i} className="inline-flex items-center whitespace-nowrap" style={{ borderRadius: 999, padding: "4px 12px", gap: 4, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: k.pillInk, background: k.pillBg }}>
                  {p}
                </span>
              ))}
            </div>
          )}
          {legend && legend.length > 0 && (
            <div className="flex flex-wrap" style={{ marginTop: 10, columnGap: 14, rowGap: 6 }}>
              {legend.map((l) => (
                <span key={l.label} className="inline-flex items-center whitespace-nowrap" style={{ gap: 6, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: k.sub }}>
                  <span aria-hidden style={{ width: 10, height: 6, borderRadius: 3, background: l.color, display: "inline-block" }} />
                  {l.label}
                </span>
              ))}
            </div>
          )}
          {extra.length > 0 && <div style={{ marginTop: 12 }}>{extra}</div>}
          {(source || lines.length > 0) && (
            <div className="flex flex-wrap items-center" style={{ marginTop: 12, columnGap: 12, rowGap: 8 }} data-web-source>
              {source && (
                <span className="inline-flex items-center whitespace-nowrap" style={{ height: 28, padding: "0 10px", borderRadius: 999, gap: 5, background: k.chipBg, fontSize: 13, fontWeight: 700, color: k.sub }}>
                  <RefreshCw size={12} aria-hidden style={{ color: mc(metric, "accent") }} />
                  {source}
                </span>
              )}
              <HeroRowContext.Provider value={k.sync}>{lines}</HeroRowContext.Provider>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
HeroWebLayout.webHeroLayout = true;

/** A hero's contents on the web: its own HeroWebLayout, or (no web layout of its own) the mobile contents as the 326 visual beside the column. */
export const HeroWebChildren: React.FC<{ metric: MetricKey; night: boolean; children?: React.ReactNode }> = ({ metric, night, children }) => {
  const list = flatten(children);
  if (list.length === 1 && React.isValidElement(list[0]) && (list[0].type as { webHeroLayout?: boolean }).webHeroLayout) return <>{children}</>;
  return <HeroWebLayout metric={metric} night={night} visual={children} visualWidth={326} />;
};

/**
 * Stat card: r16 pad 12 4 in the metric tint (#FFFFFF@50% inside a hero),
 * dividers 0.5px #E5E7EB; each stat a 28 r8 #FFFFFF@80% tile with a 16 icon
 * beside the 20/24 800 value, the 13/18 600 label under it.
 */
export const StatCardWeb: React.FC<{ metric: MetricKey; stats: { icon: IconLike; value: React.ReactNode; label: string }[]; style?: React.CSSProperties; className?: string }> = ({
  metric,
  stats,
  style,
  className,
}) => (
  <div className={`flex items-stretch ${className ?? ""}`} style={{ ...style, marginTop: 24, borderRadius: 16, padding: "12px 4px", background: mc(metric, "tint") }} data-web-stats>
    {stats.map((s, i) => (
      <div key={s.label} className="flex-1 min-w-0 flex flex-col items-center justify-center" style={{ padding: "0 8px", borderInlineStart: i === 0 ? undefined : "0.5px solid #E5E7EB" }}>
        <span className="flex items-center" style={{ gap: 6 }}>
          <span className="grid place-items-center shrink-0" style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.8)" }}>
            <s.icon size={16} strokeWidth={1.5} style={{ color: mc(metric, "accent") }} />
          </span>
          <span className="whitespace-nowrap" style={{ fontSize: 20, lineHeight: "24px", fontWeight: 800, letterSpacing: "-0.4px", fontVariantNumeric: "tabular-nums", color: "#241F1B" }}>
            {s.value}
          </span>
        </span>
        <span className="truncate max-w-full" style={{ marginTop: 4, fontSize: 13, lineHeight: "18px", fontWeight: 600, color: mc(metric, "ink") }}>
          {s.label}
        </span>
      </div>
    ))}
  </div>
);

/**
 * The page's chart, drawn by the mobile part at its own 326 wide geometry and
 * scaled to the card (at most 1.6×), centred.
 */
const ScaledChart: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1.4);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setK(Math.max(1, Math.min(1.6, e.contentRect.width / 326))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="w-full" data-web-chart>
      <div style={{ width: 326, marginInline: "auto", zoom: k }}>{children}</div>
    </div>
  );
};

/** True when every chart child draws itself for the web (GoalBarChart, HourlyBars …: `webNative`), so nothing is scaled. */
const webNative = (children: React.ReactNode) => {
  const list = flatten(children);
  return list.length > 0 && list.every((c) => React.isValidElement(c) && !!(c.type as { webNative?: boolean }).webNative);
};

/**
 * Chart card: r18 white + 0.5px #241F1B@8%, pad 18 20, m-top 24; title 17/24
 * 700; ‹ › 32 round (16 chevrons #5B5349, hover #F5F5F6), the period 13/20
 * 700 #5B5349, next dimmed to 0.35 on the current period; the chart; legend
 * 13/20 600 #5B5349 (gap 6 16, m-top 12); foot 13/20 600 in the metric ink.
 */
export const ChartCardWeb: React.FC<{
  metric: MetricKey;
  title: string;
  periodLabel: string;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  legend?: { label: string; swatch: React.ReactNode }[];
  foot?: React.ReactNode;
  loading?: boolean;
  summary?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  hideNav?: boolean;
}> = ({ metric, title, periodLabel, onPrev, onNext, nextDisabled, legend, foot, loading, summary, children, style, hideNav }) => {
  const chev = (dir: "prev" | "next") => {
    if (hideNav) return null;
    const disabled = dir === "next" && nextDisabled;
    const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
    return (
      <button
        type="button"
        onClick={dir === "prev" ? onPrev : onNext}
        disabled={disabled}
        aria-label={dir === "prev" ? t("Previous period") : t("Next period")}
        className="grid place-items-center rounded-full hover:bg-[#F5F5F6] disabled:opacity-35 disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ width: 32, height: 32 }}
      >
        <Icon size={16} style={{ color: "#5B5349" }} aria-hidden />
      </button>
    );
  };
  return (
    <section style={{ ...style, marginTop: 24, borderRadius: 18, padding: "18px 20px", background: "#FFFFFF", border: "0.5px solid rgba(36,31,27,0.08)" }} aria-label={summary} data-web-chart-card>
      <div className="flex items-center justify-between" style={{ gap: 8 }}>
        <h2 className="whitespace-nowrap" style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
          {title}
        </h2>
        <div className="flex items-center" style={{ gap: 4 }}>
          {chev("prev")}
          <span className="whitespace-nowrap" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#5B5349" }}>
            {periodLabel}
          </span>
          {chev("next")}
        </div>
      </div>
      <div style={{ marginTop: 12 }} aria-hidden={summary ? true : undefined}>
        {loading ? (
          <div className="flex items-end justify-between" style={{ height: 220, padding: "0 12px" }}>
            {[60, 90, 45, 110, 75, 95, 55].map((h, i) => (
              <span key={i} aria-hidden className="block animate-skeleton-pulse" style={{ width: 40, height: h * 1.5, borderRadius: 8, background: "#F5F5F6" }} />
            ))}
          </div>
        ) : webNative(children) ? (
          children
        ) : (
          <ScaledChart>{children}</ScaledChart>
        )}
      </div>
      {legend && legend.length > 0 && (
        <div className="flex flex-wrap items-center" style={{ marginTop: 12, columnGap: 16, rowGap: 6 }}>
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center whitespace-nowrap" style={{ gap: 6, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#5B5349" }}>
              {l.swatch}
              {l.label}
            </span>
          ))}
        </div>
      )}
      {foot && <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: mc(metric, "ink") }}>{foot}</p>}
    </section>
  );
};

/** Caps label inside the page: 13/20 700 .14em #9A94B3, m 24 0 12. */
export const CapsLabelWeb: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <WebCaps style={{ ...style, margin: "24px 0 12px" }}>{children}</WebCaps>
);

export interface HistoryItemWeb {
  key: string;
  title: string;
  meta: React.ReactNode;
  meta2?: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  subColor?: string;
  icon?: IconLike;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * History: white r18 + 0.5px hairline; rows min 68, pad 10 16, gap 12,
 * separated by 0.5px #241F1B@5%; a 40 r12 tile in the metric tint with the
 * 20 icon; title 15/22 600, meta 13/20 #8C8378 (one line, ellipsis); value
 * 17/24 800 and its 13/20 600 sub at the end; hover #FAFAFB. Edit / Delete
 * (the mobile swipe) sit in a row ⋮ menu.
 */
export const HistoryCardWeb: React.FC<{ metric: MetricKey; items: HistoryItemWeb[]; icon: IconLike; empty?: string; loading?: boolean }> = ({ metric, items, icon, empty, loading }) => {
  const [menu, setMenu] = useState<{ key: string; el: HTMLButtonElement } | null>(null);
  const open = menu ? items.find((i) => i.key === menu.key) : undefined;
  const sep = "0.5px solid rgba(36,31,27,0.05)";
  return (
    <div className="overflow-hidden" style={{ borderRadius: 18, background: "#FFFFFF", border: "0.5px solid rgba(36,31,27,0.08)" }} data-web-history>
      {loading ? (
        [0, 1, 2].map((i) => (
          <div key={i} className="flex items-center" style={{ minHeight: 68, padding: "10px 16px", gap: 12, borderTop: i ? sep : undefined }}>
            <span className="block animate-skeleton-pulse" style={{ width: 40, height: 40, borderRadius: 12, background: "#F5F5F6" }} />
            <span className="flex-1 flex flex-col" style={{ gap: 6 }}>
              <span className="block animate-skeleton-pulse" style={{ width: "50%", height: 13, borderRadius: 6, background: "#F5F5F6" }} />
              <span className="block animate-skeleton-pulse" style={{ width: "35%", height: 11, borderRadius: 6, background: "#F5F5F6" }} />
            </span>
          </div>
        ))
      ) : items.length === 0 ? (
        <div className="grid place-items-center" style={{ padding: "40px 24px" }}>
          <p className="text-center" style={{ margin: 0, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#8C8378" }}>
            {empty}
          </p>
        </div>
      ) : (
        items.map((it, i) => {
          const Icon = it.icon ?? icon;
          const actions = !!(it.onEdit || it.onDelete);
          return (
            <div key={it.key} className="flex items-center hover:bg-[#FAFAFB]" style={{ minHeight: 68, padding: "10px 16px", gap: 12, borderTop: i ? sep : undefined, paddingInlineEnd: actions ? 8 : 16 }}>
              <div
                role={it.onClick ? "button" : undefined}
                tabIndex={it.onClick ? 0 : undefined}
                onClick={it.onClick}
                onKeyDown={it.onClick ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), it.onClick?.()) : undefined}
                className={`flex-1 min-w-0 flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] ${it.onClick ? "cursor-pointer" : ""}`}
                style={{ gap: 12, borderRadius: 10 }}
              >
                <span className="grid place-items-center shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: mc(metric, "tint") }} aria-hidden>
                  <Icon size={20} strokeWidth={1.5} style={{ color: mc(metric, "accent") }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#241F1B" }}>
                    {it.title}
                  </span>
                  <span className="block truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                    {it.meta}
                  </span>
                  {it.meta2 && (
                    <span className="block truncate" title={it.meta2} style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                      {it.meta2}
                    </span>
                  )}
                </span>
                <span className="shrink-0 flex flex-col items-end text-end whitespace-nowrap">
                  <span style={{ fontSize: 17, lineHeight: "24px", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#241F1B" }}>{it.value}</span>
                  {it.sub !== undefined && it.sub !== null && <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: it.subColor ?? "#8C8378" }}>{it.sub}</span>}
                </span>
              </div>
              {actions && (
                <button
                  type="button"
                  onClick={(e) => setMenu({ key: it.key, el: e.currentTarget })}
                  aria-label={t("More options")}
                  aria-haspopup="menu"
                  className="shrink-0 grid place-items-center rounded-full hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                  style={{ width: 32, height: 32 }}
                >
                  <MoreVertical size={18} style={{ color: "#8C8378" }} aria-hidden />
                </button>
              )}
            </div>
          );
        })
      )}
      <PopupMenu
        open={!!open}
        onClose={() => setMenu(null)}
        anchor={menu?.el ?? null}
        options={[
          ...(open?.onEdit ? [{ value: "edit", label: t("Edit"), icon: <Pencil size={16} /> }] : []),
          ...(open?.onDelete ? [{ value: "delete", label: t("Delete"), icon: <Trash2 size={16} /> }] : []),
        ]}
        align="right"
        width={160}
        variant="health"
        onSelect={(v) => {
          const it = open;
          setMenu(null);
          if (v === "edit") it?.onEdit?.();
          if (v === "delete") it?.onDelete?.();
        }}
      />
    </div>
  );
};

/**
 * No data (no device): the hero's place, r22 in the metric tint, pad 24, a 56
 * r16 #FFFFFF@80% tile with the 28 icon, title 20/28 800, body 15/24 #5B5349
 * (at most 72ch), side by side.
 */
export const NoDeviceCardWeb: React.FC<{ metric: MetricKey; icon: IconLike; title: string; body: string; style?: React.CSSProperties }> = ({ metric, icon: Icon, title, body, style }) => (
  <section className="flex items-center" style={{ ...style, marginTop: 0, borderRadius: 22, padding: 24, gap: 20, background: mc(metric, "tint") }} data-web-nodevice>
    <span className="grid place-items-center shrink-0" style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.8)" }} aria-hidden>
      <Icon size={28} strokeWidth={1.5} style={{ color: mc(metric, "accent") }} />
    </span>
    <div className="min-w-0">
      <h2 style={{ margin: 0, fontSize: 20, lineHeight: "28px", fontWeight: 800, letterSpacing: "-0.3px", color: "#241F1B" }}>{title}</h2>
      <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: "24px", color: "#5B5349", maxWidth: "72ch" }}>{body}</p>
    </div>
  </section>
);
