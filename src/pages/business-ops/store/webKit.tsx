import React from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import { t } from "../../../i18n/core";
import type { ChipTone } from "./opsKit";

// Website viewport v1 · the Store and Appointments web pages' shared parts
// (WB-ST Orders Web v2, WB-ST Store Extras Web, WB-ST Appointments Web v2):
// the underline tabs, the number boxes, the caps label with its lavender
// rule, the #F7F7FC list card with 56 rows (48 at the rail) and the 52-inset
// rule, the chips, the tip, the dashed empty card and the detail card. Used
// only from 1024px wide; the mobile pages keep opsKit.

export const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]";

const CHIP: Record<ChipTone, [string, string]> = {
  good: ["#E3F3E9", "#3F9165"],
  warn: ["#F6E9C9", "#8A6A3E"],
  bad: ["#FBE7E4", "#C0392B"],
  soft: ["#F5F5F6", "#8C8378"],
  pale: ["#F0EDF9", "#7D6BB5"],
};

export const WebChip: React.FC<{ label: string; tone: ChipTone }> = ({ label, tone }) => (
  <span className="shrink-0 whitespace-nowrap uppercase" style={{ borderRadius: 999, fontSize: 11, lineHeight: "16px", fontWeight: 800, letterSpacing: "0.04em", padding: "2px 8px", background: CHIP[tone][0], color: CHIP[tone][1] }}>
    {label}
  </span>
);

/** Underline tabs (section 2): equal columns across the row, 15/24, padding 7 / 8, the selected one 800 with a 2px #AEA1DC line. */
export function WebTabs<K extends string>({ tabs, active, onChange, label }: { tabs: { key: K; label: string }[]; active: K; onChange: (k: K) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length},minmax(0,1fr))`, borderBottom: "1px solid #EBEAF6" }}>
      {tabs.map((x) => {
        const on = x.key === active;
        return (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(x.key)}
            className={`flex justify-center whitespace-nowrap hover:text-[#241F1B] ${FOCUS}`}
            style={{ fontSize: 15, lineHeight: "24px", padding: "7px 0 8px", marginBottom: -1, borderBottom: `2px solid ${on ? "#AEA1DC" : "transparent"}`, fontWeight: on ? 800 : 600, color: on ? "#241F1B" : "#8C8378" }}
          >
            {x.label}
          </button>
        );
      })}
    </div>
  );
}

export interface WebBox {
  v: string;
  l: string;
  d?: string;
}

/** Number boxes: #F7F7FC r16, padding 14 16 (10 12 at the rail), the value 28/36 (22/30) 800, the label 13/20 600. */
export const WebBoxes: React.FC<{ items: WebBox[]; rail: boolean; loading?: boolean }> = ({ items, rail, loading }) => (
  <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length},minmax(0,1fr))`, gap: 12 }}>
    {items.map((n, i) => (
      <div key={i} className="min-w-0" style={{ background: "#F7F7FC", borderRadius: 16, padding: rail ? "10px 12px" : "14px 16px" }}>
        {loading ? (
          <span aria-hidden className="block animate-skeleton-pulse" style={{ height: rail ? 30 : 36, width: 48, borderRadius: 8, background: "#ECEBF5" }} />
        ) : (
          <p title={n.v} className="whitespace-nowrap overflow-hidden text-ellipsis tabular-nums" style={{ margin: 0, fontSize: rail ? 22 : 28, lineHeight: rail ? "30px" : "36px", fontWeight: 800, color: "#241F1B" }}>
            {n.v}
          </p>
        )}
        <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#8C8378", textWrap: "pretty" } as React.CSSProperties}>{n.l}</p>
        {n.d && <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#8A6A3E" }}>{n.d}</p>}
      </div>
    ))}
  </div>
);

/** The caps label with its 1.5 lavender rule; an optional text action at the end. */
export const WebLabel: React.FC<{ label: string; first?: boolean; action?: string; onAction?: () => void; as?: "h2" | "h3" }> = ({ label, first, action, onAction, as: H = "h2" }) => (
  <div className="flex items-end justify-between" style={{ borderBottom: "1.5px solid #AEA1DC", padding: `${first ? 0 : 4}px 2px 8px` }}>
    <H className="whitespace-nowrap uppercase" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, letterSpacing: "0.1em", color: "#8C8378" }}>
      {label}
    </H>
    {action && (
      <button type="button" onClick={onAction} className={`whitespace-nowrap hover:underline ${FOCUS}`} style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#7D6BB5", borderRadius: 6 }}>
        {action}
      </button>
    )}
  </div>
);

/** The list card: #F7F7FC r18, padding 4 16 (4 14 inside a detail card). */
export const WebList: React.FC<{ label?: string; inner?: boolean; children: React.ReactNode }> = ({ label, inner, children }) => (
  <div role="list" aria-label={label} className="flex flex-col" style={{ background: "#F7F7FC", borderRadius: 18, padding: inner ? "4px 14px" : "4px 16px" }}>
    {children}
  </div>
);

export interface WebRowProps {
  icon: LucideIcon;
  title: string;
  sub?: string | null;
  /** The sub line wraps (up to 3 lines) instead of one line with an ellipsis. */
  subWrap?: boolean;
  /** The title wraps to 2 lines (detail rows). */
  titleWrap?: boolean;
  chip?: { label: string; tone: ChipTone } | null;
  value?: string;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  /** Not the first row: the 1px #EBEAF6 rule from the text edge (52 in). */
  rule: boolean;
  /** The selected row of a list-detail list (#EFEDF8, padded out 10). */
  selected?: boolean;
  rowH: number;
  link?: boolean;
}

export const WebRow: React.FC<WebRowProps> = ({ icon: Icon, title, sub, subWrap, titleWrap, chip, value, onClick, disabled, ariaLabel, rule, selected, rowH, link }) => {
  const body = (
    <>
      {rule && <span aria-hidden className="absolute top-0" style={{ insetInlineEnd: 0, insetInlineStart: 52, height: 1, background: "#EBEAF6" }} />}
      <span className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, background: "#F0EDF9" }}>
        <Icon size={20} strokeWidth={1.75} style={{ color: "#7D6BB5" }} aria-hidden />
      </span>
      <span className="flex-1 min-w-0">
        <span
          className={titleWrap ? "block" : "block overflow-hidden text-ellipsis whitespace-nowrap"}
          title={title}
          style={{
            fontSize: 15,
            lineHeight: titleWrap ? "22px" : "24px",
            fontWeight: 700,
            color: link ? "#7D6BB5" : "#241F1B",
            ...(titleWrap ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textWrap: "pretty" } : null),
          } as React.CSSProperties}
        >
          {title}
        </span>
        {sub && (
          <span
            className={subWrap ? "" : "block overflow-hidden text-ellipsis whitespace-nowrap"}
            title={subWrap ? undefined : sub}
            style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378", ...(subWrap ? { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", textWrap: "pretty" } : null) } as React.CSSProperties}
          >
            {sub}
          </span>
        )}
      </span>
      {chip && <WebChip label={chip.label} tone={chip.tone} />}
      {value && (
        <span className="shrink-0 whitespace-nowrap tabular-nums" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 800, color: "#241F1B" }}>
          {value}
        </span>
      )}
    </>
  );
  const style: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 12,
    minHeight: rowH,
    boxSizing: "border-box",
    padding: `6px ${selected ? 10 : 0}px`,
    margin: `0 ${selected ? -10 : 0}px`,
    borderRadius: 12,
    background: selected ? "#EFEDF8" : "transparent",
    width: selected ? "calc(100% + 20px)" : "100%",
    textAlign: "start",
  };
  return onClick ? (
    <button
      type="button"
      role="listitem"
      aria-current={selected ? "true" : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={`hover:bg-[#EFEDF8] disabled:opacity-40 ${FOCUS}`}
      style={style}
    >
      {body}
    </button>
  ) : (
    <div role="listitem" style={style}>
      {body}
    </div>
  );
};

/** A lavender tip: #F0EDF9 r16, padding 12 14, the bulb 16, 13/20. */
export const WebTip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start" style={{ gap: 10, borderRadius: 16, padding: "12px 14px", background: "#F0EDF9", color: "#7D6BB5" }}>
    <Lightbulb size={16} strokeWidth={2} className="shrink-0" style={{ marginTop: 2 }} aria-hidden />
    <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", textWrap: "pretty" } as React.CSSProperties}>{children}</p>
  </div>
);

/** The dashed empty card: 1.5 dashed #AEA1DC r20, padding 32; a 56 tile, the title 22/30 800 and the body 15/24. */
export const WebEmpty: React.FC<{ icon: LucideIcon; title: string; body: string; minHeight?: number | string; padding?: number | string; children?: React.ReactNode }> = ({ icon: Icon, title, body, minHeight, padding = 32, children }) => (
  <div className="flex flex-col items-center justify-center text-center" style={{ border: "1.5px dashed #AEA1DC", borderRadius: 20, padding, minHeight }}>
    <span className="inline-flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: 16, background: "#F0EDF9" }}>
      <Icon size={24} strokeWidth={1.75} style={{ color: "#7D6BB5" }} aria-hidden />
    </span>
    <p className="self-stretch" style={{ margin: "16px 0 0", fontSize: 22, lineHeight: "30px", fontWeight: 800, color: "#241F1B" }}>
      {title}
    </p>
    <p className="self-stretch" style={{ margin: "6px auto 0", maxWidth: "46ch", fontSize: 15, lineHeight: "24px", color: "#5B5349", textWrap: "pretty" } as React.CSSProperties}>
      {body}
    </p>
    {children}
  </div>
);

/** A row of skeleton rows inside a list card, while loading. */
export const WebListSkeleton: React.FC<{ rows?: number; label: string; rowH: number }> = ({ rows = 3, label, rowH }) => (
  <div aria-busy="true" aria-label={label} className="flex flex-col" style={{ background: "#F7F7FC", borderRadius: 18, padding: "4px 16px" }}>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex items-center" style={{ gap: 12, minHeight: rowH }}>
        <span aria-hidden className="animate-skeleton-pulse" style={{ width: 40, height: 40, borderRadius: 12, background: "#ECEBF5" }} />
        <span aria-hidden className="animate-skeleton-pulse" style={{ height: 12, width: "40%", borderRadius: 999, background: "#ECEBF5" }} />
      </div>
    ))}
  </div>
);

/**
 * The See all pages' header (WB-ST Store Extras Web: OR.3, AP.4, PR.3): 72 tall with the bottom divider, a 40
 * round Back with the 1px border (chevron 20 #5B5349, hover #F5F5F6), the kicker 13/20 700 over the H1 28/36 700.
 */
export const ExtrasHeader: React.FC<{ kicker: string; title: string; backLabel: string; onBack: () => void }> = ({ kicker, title, backLabel, onBack }) => (
  <header className="shrink-0 flex items-center bg-cream" style={{ height: 72, boxSizing: "border-box", gap: 12, padding: "0 32px", borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
    <button
      type="button"
      onClick={onBack}
      title={backLabel}
      aria-label={backLabel}
      className={`shrink-0 flex items-center justify-center hover:bg-[#F5F5F6] ${FOCUS}`}
      style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: 999, border: "1px solid rgba(36,31,27,0.11)" }}
    >
      <ChevronLeft size={20} style={{ color: "#5B5349" }} aria-hidden />
    </button>
    <div className="flex-1 min-w-0">
      <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#8C8378" }}>{kicker}</p>
      <h1 className="whitespace-nowrap overflow-hidden text-ellipsis" style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.022em", color: "#241F1B" }}>
        {title}
      </h1>
    </div>
  </header>
);

/** The See all list card: #F7F7FC r20, padding 4 × 20. */
export const ExtrasList: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div role="list" aria-label={label} className="flex flex-col" style={{ background: "#F7F7FC", borderRadius: 20, padding: "4px 20px" }}>
    {children}
  </div>
);

/**
 * A See all row: min 64 (padding 10 0, gap 14), the 54-in rule, tile 40 r12 (glyph 20), title 15/24 700 and sub 13/20
 * on one line each, the chip 11/16 800 (padding 3 × 10), the value 15/24 800 (min 72, end-aligned), the chevron 16 #9A94B3.
 */
export const ExtrasRow: React.FC<{ icon: LucideIcon; title: string; sub: string; chip?: { label: string; tone: ChipTone } | null; value?: string; rule: boolean; onClick: () => void; ariaLabel?: string }> = ({
  icon: Icon,
  title,
  sub,
  chip,
  value,
  rule,
  onClick,
  ariaLabel,
}) => (
  <button
    type="button"
    role="listitem"
    data-extras-row
    onClick={onClick}
    aria-label={ariaLabel}
    className={`relative flex items-center w-full hover:bg-[#EFEDF8] ${FOCUS}`}
    style={{ gap: 14, minHeight: 64, padding: "10px 0", boxSizing: "border-box", textAlign: "start", borderRadius: 12 }}
  >
    {rule && <span aria-hidden className="absolute top-0" style={{ insetInlineEnd: 0, insetInlineStart: 54, height: 1, background: "#EBEAF6" }} />}
    <span className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, background: "#F0EDF9" }}>
      <Icon size={20} strokeWidth={1.75} style={{ color: "#7D6BB5" }} aria-hidden />
    </span>
    <span className="flex-1 min-w-0">
      <span title={title} className="block overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
        {title}
      </span>
      <span title={sub} className="block overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
        {sub}
      </span>
    </span>
    {chip && (
      <span className="shrink-0 whitespace-nowrap uppercase" style={{ borderRadius: 999, fontSize: 11, lineHeight: "16px", fontWeight: 800, letterSpacing: "0.04em", padding: "3px 10px", background: CHIP[chip.tone][0], color: CHIP[chip.tone][1] }}>
        {chip.label}
      </span>
    )}
    {value && (
      <span className="shrink-0 whitespace-nowrap tabular-nums" style={{ minWidth: 72, textAlign: "end", fontSize: 15, lineHeight: "24px", fontWeight: 800, color: "#241F1B" }}>
        {value}
      </span>
    )}
    <ChevronRight size={16} strokeWidth={2} className="shrink-0" style={{ color: "#9A94B3" }} aria-hidden />
  </button>
);

/** "Show more" under a See all list: centred, 44 tall, padding 0 20, 15/24 700 #7D6BB5, r12 with a #F0EDF9 hover. */
export const ExtrasMore: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`self-center flex items-center whitespace-nowrap hover:bg-[#F0EDF9] ${FOCUS}`}
    style={{ marginTop: 8, height: 44, padding: "0 20px", fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#7D6BB5", borderRadius: 12 }}
  >
    {t("Show more")}
  </button>
);
