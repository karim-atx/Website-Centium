import React from "react";
import { ChevronLeft, MoreVertical } from "lucide-react";
import { useBack } from "../../../hooks/useBack";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { t } from "../../../i18n/core";

// Website viewport v1 · Client · Health: the pieces every Health web page
// shares (WC-HE Health Web v5 and WC-HE Records Web v3). Values are the
// reference files' literals.

/** Side margin of the page: 32 beside the full sidebar, 24 beside the rail. */
export function useHealthMargin(): number {
  const { rail } = useWebLayout();
  return rail ? 24 : 32;
}

/**
 * The Health page header: 64 tall with the bottom divider, padded by the page
 * margin; a 36 back button (chevron 20 #5B5349, hover #F5F5F6, -8 start
 * margin); the title 24/32 600 (-0.6px; the Records pages 24/30 700 -0.5px
 * with a 13/18 600 line under it); actions at the end.
 */
export const HealthWebHeader: React.FC<{
  title: string;
  back?: boolean;
  /** Records pages: 24/30 700 -0.5px, the line under the title. */
  records?: boolean;
  /** Beside the title on its baseline (the overview's sync line). */
  beside?: React.ReactNode;
  /** Under the title (Records pages). */
  sub?: string;
  actions?: React.ReactNode;
  dark?: boolean;
}> = ({ title, back, records, beside, sub, actions, dark }) => {
  const goBack = useBack();
  const margin = useHealthMargin();
  const ink2 = dark ? "#B8B3C7" : "#5B5349";
  return (
    <header
      className="shrink-0 flex items-center"
      style={{ height: 64, boxSizing: "border-box", gap: 12, paddingInline: margin, borderBottom: "1px solid rgba(36,31,27,0.06)", background: dark ? "#15171E" : "#FFFFFF" }}
    >
      {back && (
        <button
          type="button"
          onClick={goBack}
          aria-label={t("Back")}
          title={t("Back")}
          className={`shrink-0 grid place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] ${dark ? "hover:bg-[rgba(255,255,255,0.12)]" : "hover:bg-[#F5F5F6]"}`}
          style={{ width: 36, height: 36, marginInlineStart: -8 }}
        >
          <ChevronLeft size={20} className="rtl:-scale-x-100" style={{ color: ink2 }} aria-hidden />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline min-w-0" style={{ gap: 14 }}>
          <h1
            className="whitespace-nowrap overflow-hidden text-ellipsis"
            title={title}
            style={
              records
                ? { margin: 0, fontSize: 24, lineHeight: "30px", fontWeight: 700, letterSpacing: "-0.5px", color: dark ? "#FFFFFF" : "#241F1B" }
                : { margin: 0, fontSize: 24, lineHeight: "32px", fontWeight: 600, letterSpacing: "-0.6px", color: "#241F1B" }
            }
          >
            {title}
          </h1>
          {beside}
        </div>
        {sub && <p style={{ margin: 0, fontSize: 13, lineHeight: "18px", fontWeight: 600, color: ink2, whiteSpace: "nowrap" }}>{sub}</p>}
      </div>
      {actions}
    </header>
  );
};

/** The header's primary action: 40 tall, pad 0 16, r12, #9A8CD6, an 18 icon and a 15/24 600 label. */
export const HeaderCta = React.forwardRef<HTMLButtonElement, { label: string; icon?: React.ReactNode; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; disabled?: boolean }>(
  ({ label, icon, onClick, disabled }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 flex items-center whitespace-nowrap transition-transform hover:scale-[0.98] active:scale-[0.96] disabled:opacity-40 disabled:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]"
      style={{ height: 40, padding: "0 16px", borderRadius: 12, gap: 8, background: "#9A8CD6", color: "#FFFFFF", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
    >
      {icon}
      {label}
    </button>
  ),
);
HeaderCta.displayName = "HeaderCta";

/** The header's ⋮: 36 round, -8 end margin, #F5F5F6 while its menu is open. */
export const HeaderMenuButton = React.forwardRef<HTMLButtonElement, { open: boolean; onClick: () => void; dark?: boolean }>(({ open, onClick, dark }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    aria-label={t("More options")}
    aria-haspopup="menu"
    aria-expanded={open}
    className={`shrink-0 grid place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] ${dark ? "hover:bg-[rgba(255,255,255,0.12)]" : "hover:bg-[#F5F5F6]"}`}
    style={{ width: 36, height: 36, marginInlineEnd: -8, background: open ? (dark ? "rgba(255,255,255,0.12)" : "#F5F5F6") : "transparent" }}
  >
    <MoreVertical size={20} style={{ color: dark ? "#B8B3C7" : "#5B5349" }} aria-hidden />
  </button>
));
HeaderMenuButton.displayName = "HeaderMenuButton";

/** Section caps: 13/20 700 .14em uppercase #9A94B3. */
export const WebCaps: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; as?: "p" | "h2" }> = ({ children, style, as: Tag = "h2" }) => (
  <Tag className="uppercase" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".14em", color: "#9A94B3", ...style }}>
    {children}
  </Tag>
);

/**
 * Segmented tabs (section 2, every level): track #F3F3FD, pad 5, r14, 40
 * tall; equal segments spanning the row; the pill 30 tall r10; labels 15/24
 * 600; selected #A79AD5 with white, idle #5B5349 (hover #ECEBFB).
 * Arrow keys move between tabs.
 */
export const WebSegmented: React.FC<{ items: { key: string; label: string }[]; active: string; onChange: (key: string) => void; ariaLabel?: string }> = ({ items, active, onChange, ariaLabel }) => {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number) => {
    const n = (i + items.length) % items.length;
    onChange(items[n].key);
    refs.current[n]?.focus();
  };
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex" style={{ height: 40, padding: 5, gap: 5, borderRadius: 14, background: "#F3F3FD", boxSizing: "border-box" }}>
      {items.map((it, i) => {
        const on = it.key === active;
        return (
          <button
            key={it.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(it.key)}
            onKeyDown={(e) => {
              const rtl = document.documentElement.dir === "rtl";
              if (e.key === "ArrowRight") (e.preventDefault(), move(i + (rtl ? -1 : 1)));
              if (e.key === "ArrowLeft") (e.preventDefault(), move(i + (rtl ? 1 : -1)));
            }}
            className={`flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7D6BB5] ${on ? "" : "hover:bg-[#ECEBFB]"}`}
            style={{ height: 30, borderRadius: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#A79AD5" : "transparent", color: on ? "#FFFFFF" : "#5B5349" }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
};

/** The page body: max 1280 wide, centred, padded 24 by the page margin. */
export const HealthWebBody: React.FC<{ children: React.ReactNode; gap?: number; style?: React.CSSProperties; className?: string }> = ({ children, gap = 24, style, className }) => {
  const margin = useHealthMargin();
  return (
    <div className={`flex flex-col ${className ?? ""}`} style={{ maxWidth: 1280, marginInline: "auto", width: "100%", padding: `24px ${margin}px`, boxSizing: "border-box", gap, ...style }}>
      {children}
    </div>
  );
};

/**
 * An identity pattern layer: the repo's public/hero file drawn at the mobile
 * scale and never stretched, anchored or repeated so the density holds on a
 * wider card (the reference's pat()): "tl" / "bl" / "br" one copy in a
 * corner, "x-bottom" / "x-top" a row along an edge, "all" tiled. cw / ch crop
 * the tile, cx / cy offset it.
 */
export interface PatternLayerSpec {
  src: string;
  vw: number;
  vh: number;
  s: number;
  a: "tl" | "bl" | "br" | "x-bottom" | "x-top" | "all";
  cw?: number;
  ch?: number;
  cx?: number;
  cy?: number;
}

export const PatternLayer: React.FC<{ layers: PatternLayerSpec[]; mask?: string; opacity?: number }> = ({ layers, mask, opacity }) => {
  const uid = React.useId().replace(/:/g, "");
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ WebkitMaskImage: mask, maskImage: mask, opacity }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, display: "block" }} aria-hidden>
        <defs>
          {layers.map((L, i) => {
            if (L.a === "tl" || L.a === "bl" || L.a === "br") return null;
            const cw = (L.cw ?? L.vw) * L.s;
            const ch = (L.ch ?? L.vh) * L.s;
            const bottom = L.a === "x-bottom";
            return (
              <pattern key={i} id={`${uid}-${i}`} patternUnits="userSpaceOnUse" x={0} y={bottom ? -ch : 0} width={cw} height={ch}>
                <image href={L.src} x={-(L.cx ?? 0) * L.s} y={-(L.cy ?? 0) * L.s} width={L.vw * L.s} height={L.vh * L.s} preserveAspectRatio="none" />
              </pattern>
            );
          })}
        </defs>
        {layers.map((L, i) => {
          const w = L.vw * L.s;
          const h = L.vh * L.s;
          const img = (x: number, y: number) => <image href={L.src} x={x} y={y} width={w} height={h} preserveAspectRatio="none" />;
          if (L.a === "tl") return <g key={i}>{img(0, 0)}</g>;
          if (L.a === "bl")
            return (
              <svg key={i} y="100%" overflow="visible">
                {img(0, -h)}
              </svg>
            );
          if (L.a === "br")
            return (
              <svg key={i} x="100%" y="100%" overflow="visible">
                {img(-w, -h)}
              </svg>
            );
          const ch = (L.ch ?? L.vh) * L.s;
          const bottom = L.a === "x-bottom";
          const rect = <rect x={0} y={bottom ? -ch : 0} width="100%" height={L.a === "all" ? "100%" : ch} fill={`url(#${uid}-${i})`} />;
          return bottom ? (
            <svg key={i} y="100%" overflow="visible">
              {rect}
            </svg>
          ) : (
            <g key={i}>{rect}</g>
          );
        })}
      </svg>
    </div>
  );
};
