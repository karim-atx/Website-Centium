import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, RotateCw } from "lucide-react";
import { linePx, textPx } from "../../../theme/textSize";
import type { OpsColors } from "./opsTheme";

// Small pieces shared by the Schedule screens, each with the OpsTabsV4 values.

/** Tag pill: 9.5/800 uppercase 0.05em, padding 2 7, r999 (OpsTabsV4 sesRow). */
export const Tag: React.FC<{ label: string; bg: string; ink: string; size?: "row" | "head" }> = ({ label, bg, ink, size = "row" }) =>
  size === "head" ? (
    // Session page kind tag: 10.5/800, padding 2 8 (OP1-083 row 4).
    <span className="whitespace-nowrap" style={{ fontSize: textPx(10.5), fontWeight: 800, borderRadius: 999, padding: "2px 8px", background: bg, color: ink }}>
      {label}
    </span>
  ) : (
    <span
      className="whitespace-nowrap shrink-0"
      style={{ fontSize: textPx(9.5), fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", borderRadius: 999, padding: "2px 7px", background: bg, color: ink, lineHeight: linePx(13.5) }}
    >
      {label}
    </span>
  );

/** OpsTabsV4 card: r22, 1px border (r20 for the day cards). */
export const OpsCard: React.FC<{ c: OpsColors; radius?: number; className?: string; style?: React.CSSProperties; children: React.ReactNode; ariaLabel?: string }> = ({
  c,
  radius = 22,
  className,
  style,
  children,
  ariaLabel,
}) => (
  <div aria-label={ariaLabel} className={`overflow-hidden ${className ?? ""}`} style={{ background: c.card, borderRadius: radius, border: `1px solid ${c.border}`, ...style }}>
    {children}
  </div>
);

/** A skeleton bar (soft #F5F5F6 · #242730, r6, OP1-074 O1). */
export const Bone: React.FC<{ c: OpsColors; w: number | string; h: number; r?: number; style?: React.CSSProperties }> = ({ c, w, h, r = 6, style }) => (
  <span aria-hidden className="block animate-skeleton-pulse" style={{ width: w, height: h, borderRadius: r, background: c.soft, ...style }} />
);

/** The OURS error card (OP1-074 O2): r20 border, 12.5/18 inkSoft, 40 outlined Retry. */
export const ErrorCard: React.FC<{ c: OpsColors; message: string; onRetry: () => void; disabled?: boolean; inner?: boolean }> = ({ c, message, onRetry, disabled, inner }) => {
  const body = (
    <div style={{ padding: inner ? "10px 16px 14px" : "16px" }}>
      <p style={{ fontSize: textPx(12.5), lineHeight: linePx(18), color: c.inkSoft, margin: 0 }}>{message}</p>
      <RetryButton c={c} onClick={onRetry} disabled={disabled} />
    </div>
  );
  return inner ? body : (
    <OpsCard c={c} radius={20} style={{ marginTop: 14 }}>
      <div role="alert">{body}</div>
    </OpsCard>
  );
};

export const RetryButton: React.FC<{ c: OpsColors; onClick: () => void; disabled?: boolean; label?: string }> = ({ c, onClick, disabled, label = "Retry" }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="tap inline-flex items-center disabled:opacity-40"
    style={{ marginTop: 10, minHeight: 40, padding: "0 14px", gap: 6, borderRadius: 12, border: `1px solid ${c.border}`, color: c.pDark, fontSize: textPx(12.5), fontWeight: 800, background: "transparent" }}
  >
    <RotateCw size={14} strokeWidth={2.2} aria-hidden />
    {label}
  </button>
);

/** The detail pages' back row (OP1-083 row 2): 44 Back + 13/700 faint label. */
export const BackRow: React.FC<{ c: OpsColors; label: string; to?: string; onBack?: () => void }> = ({ c, label, to, onBack }) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center" style={{ gap: 6, margin: "-6px 0 10px -10px" }}>
      <button
        type="button"
        aria-label="Back"
        onClick={() => (onBack ? onBack() : to ? navigate(to) : navigate(-1))}
        className="tap flex items-center justify-center"
        style={{ width: 44, height: 44, color: c.ink }}
      >
        <ChevronLeft size={22} strokeWidth={2.2} />
      </button>
      <p style={{ margin: 0, fontSize: textPx(13), fontWeight: 700, color: c.faint }}>{label}</p>
    </div>
  );
};

/** OP1-074 row 5: the two-figure card with its foot line. */
export const FiguresCard: React.FC<{
  c: OpsColors;
  boxes: { label: string; value: string; delta?: string; deltaInk?: string; dash?: boolean; onClick?: () => void }[];
  line?: React.ReactNode;
  marginTop?: number;
}> = ({ c, boxes, line, marginTop = 16 }) => (
  <OpsCard c={c} style={{ marginTop }}>
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
      {boxes.map((b, i) => {
        const inner = (
          <>
            <p className="whitespace-nowrap" style={{ margin: 0, fontSize: textPx(11.5), fontWeight: 700, color: c.faint }}>
              {b.label}
            </p>
            <p className="flex items-baseline flex-wrap" style={{ margin: "4px 0 0", gap: 6 }}>
              <span
                className="tabular-nums"
                style={{ fontSize: textPx(30), fontWeight: 800, letterSpacing: "-0.03em", lineHeight: linePx(34), color: b.dash ? c.tert : c.ink }}
              >
                {b.value}
              </span>
              {b.delta && <span style={{ fontSize: textPx(12), fontWeight: 800, color: b.deltaInk ?? c.good }}>{b.delta}</span>}
            </p>
          </>
        );
        const style: React.CSSProperties = { padding: "14px 14px 12px", minWidth: 0, borderLeft: i ? `1px solid ${c.divider}` : "none", textAlign: "left" };
        return b.onClick ? (
          <button key={b.label} type="button" onClick={b.onClick} className="tap" style={style}>
            {inner}
          </button>
        ) : (
          <div key={b.label} style={style}>
            {inner}
          </div>
        );
      })}
    </div>
    {line && (
      <p style={{ margin: 0, fontSize: textPx(12), lineHeight: linePx(17), color: c.inkSoft, padding: "10px 14px 12px", borderTop: `1px solid ${c.divider}`, textWrap: "pretty" }}>
        {line}
      </p>
    )}
  </OpsCard>
);

/** The fixed bottom CTA (OP1-074 row 21): 52 r16, fade 150 above, bottom 88. */
export const FixedCta: React.FC<{ c: OpsColors; label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }> = ({ c, label, icon, onClick, disabled }) => (
  <>
    <div
      aria-hidden
      className="fixed z-30 pointer-events-none lg:hidden"
      style={{
        left: "var(--app-gutter, 0px)",
        right: "var(--app-gutter, 0px)",
        bottom: 0,
        height: "calc(env(safe-area-inset-bottom) + 150px)",
        background: `linear-gradient(180deg, ${c.pageT} 0%, ${c.page} 42%)`,
      }}
    />
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className="fixed z-30 flex items-center justify-center transition-transform duration-150 active:scale-[0.98] lg:static lg:w-full lg:mt-6"
      style={{
        left: "calc(var(--app-gutter, 0px) + 16px)",
        right: "calc(var(--app-gutter, 0px) + 16px)",
        bottom: "calc(env(safe-area-inset-bottom) + 88px)",
        height: 52,
        borderRadius: 16,
        background: c.fill,
        color: c.onFill,
        gap: 8,
        fontSize: textPx(14.5),
        fontWeight: 800,
        boxShadow: c.ctaShadow,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  </>
);
