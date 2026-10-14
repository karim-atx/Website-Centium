import React from "react";
import clsx from "clsx";
import {
  CalendarRange,
  DoorOpen,
  GraduationCap,
  Repeat,
  Sparkles,
  Sun,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import type { PlanStatus } from "../../../services/membership-plans";
import { STATUS_LABEL, type PlanIconKey } from "./planModel";

// v6 Batch 4 · Plans: the OpsTabsV4 pieces the plan list, page and sheet
// share. Colours are the source's L / D palette (OpsTabsV4 logic 183-184)
// through the app's tokens wherever a token holds the same value, so the five
// colour themes, dark, Larger text and High contrast apply:
//   ink / inkSoft / faint / tert = charcoal / -soft / -faint / -tertiary
//   card cream-card · soft and input cream-soft · page cream
//   border rgba(36,31,27,0.11) / rgba(245,243,250,0.08) = charcoal/[0.11] / [0.08]
//   divider rgba(36,31,27,0.06) / rgba(245,243,250,0.06) = charcoal/[0.06]
//   primary / fill / onFill / pale / pDark = primary / primary-fill /
//   on-primary-fill / primary-pale / primary-dark
//   good / goodBg, high / highBg = status-good(-bg), status-high(-bg)
//   caution #B07D16 / #E0B360 = caution-strong; cautionBg #F6E9C9 / #332B1A
//   (no token: literal, see useTones); teal ring #6F9993 / #A2C8C2 (literal).

export const ICONS: Record<PlanIconKey, LucideIcon> = {
  repeat: Repeat,
  "calendar-range": CalendarRange,
  sun: Sun,
  ticket: Ticket,
  sparkles: Sparkles,
  "door-open": DoorOpen,
  "graduation-cap": GraduationCap,
};

export const BORDER = "border-charcoal/[0.11] dark:border-charcoal/[0.08]";
export const DIVIDER = "border-charcoal/[0.06]";

/** The literal OpsTabsV4 values no token holds. */
export function useTones() {
  const dark = useIsDark();
  return {
    dark,
    cautionBg: dark ? "#332B1A" : "#F6E9C9",
    caution: "rgb(var(--c-caution-strong))",
    cautionBd: dark ? "rgba(224,179,96,0.45)" : "rgba(217,164,65,0.55)",
    teal: dark ? "#A2C8C2" : "#6F9993",
    ctaShadow: dark ? "0 10px 24px rgba(0,0,0,0.5)" : "0 10px 24px rgb(var(--th-5f5093) / 0.35)",
  };
}

/** Status pill (logic 403): row 10/800 pad 2 7, page 10.5/800 pad 2 8. */
export const StatusPill: React.FC<{ status: Exclude<PlanStatus, "archived">; size?: "row" | "page" }> = ({ status, size = "row" }) => {
  const t = useTones();
  const tone =
    status === "active"
      ? { background: "rgb(var(--c-status-good-bg))", color: "rgb(var(--c-status-good))" }
      : status === "paused"
        ? { background: t.cautionBg, color: t.caution }
        : { background: "rgb(var(--c-cream-soft))", color: "rgb(var(--c-charcoal-faint))" };
  return (
    <span
      // Line boxes as measured: row pill 17 tall (OP1-022 row 14), page pill 15 (OP1-037 row 4).
      className={clsx("whitespace-nowrap shrink-0 rounded-full font-extrabold", size === "page" ? "text-[10.5px] leading-[11px]" : "text-[10px] leading-[13px]")}
      style={{ padding: size === "page" ? "2px 8px" : "2px 7px", ...tone }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
};

/**
 * "Soon" tag (OP1-167 row 5): 10/800, pill r999, pad 2 7, soft / faint
 * (#F5F5F6 / #8C8378 · #242730 / #B8B3C7), the plan list's Hidden pill.
 */
export const SoonTag: React.FC = () => (
  <span className="whitespace-nowrap rounded-full bg-cream-soft text-charcoal-faint text-[10px] font-extrabold" style={{ padding: "2px 7px" }}>
    Soon
  </span>
);

/** Figures card (OP1-022 rows 5-9, OP1-037 rows 8-9): two cells and a line. */
export const FiguresCard: React.FC<{
  cells: { label: string; value: string; delta?: string }[];
  line?: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ cells, line, className, style }) => (
  <div className={clsx("bg-cream-card border overflow-hidden", BORDER, className)} style={{ borderRadius: 22, ...style }}>
    <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
      {cells.map((c, i) => (
        <div key={c.label} className={clsx("min-w-0", i > 0 && clsx("border-l", DIVIDER))} style={{ padding: "14px 14px 12px" }}>
          <p className="text-[11.5px] font-bold text-charcoal-faint whitespace-nowrap">{c.label}</p>
          <p className="flex items-baseline whitespace-nowrap" style={{ gap: 6, marginTop: 4 }}>
            <span
              className={clsx("text-[30px] font-extrabold leading-[34px] tabular-nums", c.value === "–" ? "text-charcoal-tertiary" : "text-charcoal")}
              style={{ letterSpacing: "-0.03em" }}
            >
              {c.value}
            </span>
            {c.delta && <span className="text-[12px] font-extrabold text-status-good">{c.delta}</span>}
          </p>
        </div>
      ))}
    </div>
    {line && (
      <p className={clsx("text-[12px] leading-[17px] text-charcoal-soft border-t", DIVIDER)} style={{ padding: "10px 14px 12px", textWrap: "pretty" } as React.CSSProperties}>
        {line}
      </p>
    )}
  </div>
);

/** Grey loading block (OURS: soft #F5F5F6 / #242730, the skeleton pulse). */
export const Bar: React.FC<{ w: number | string; h: number; r?: number; className?: string; style?: React.CSSProperties }> = ({ w, h, r = 6, className, style }) => (
  <span aria-hidden className={clsx("block bg-cream-soft animate-skeleton-pulse", className)} style={{ width: w, height: h, borderRadius: r, ...style }} />
);

/** OURS inline error / offline card (OP1-022 O2, OP1-037 O2). */
export const ErrorCard: React.FC<{ title: string; body?: string; onRetry?: () => void; className?: string }> = ({ title, body, onRetry, className }) => (
  <div role="alert" className={clsx("bg-cream-card border", BORDER, className)} style={{ borderRadius: 20, padding: 14 }}>
    <p className="text-[13px] font-extrabold text-charcoal">{title}</p>
    {body && <p className="text-[12px] leading-[17px] text-charcoal-soft" style={{ marginTop: 2 }}>{body}</p>}
    {onRetry && (
      <button type="button" onClick={onRetry} className="tap text-[12.5px] font-extrabold text-primary-dark" style={{ minHeight: 44 }}>
        Retry
      </button>
    )}
  </div>
);
