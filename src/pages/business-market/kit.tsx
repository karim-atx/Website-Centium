import React, { useCallback, useMemo, useRef, useState } from "react";
import { ChevronLeft, CircleAlert, type LucideIcon } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { linePx, textPx } from "../../theme/textSize";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { Toast } from "../../components/ui/Toast";
import { Toggle } from "../../components/ui/Toggle";
import { marketPalette, type MarketPalette } from "./palette";

// The Marketplace (MA1) kit: literal BizMarketV7 values (source lines 21-412)
// through marketPalette. Shared components are used where they already carry
// the MA1 values (BottomSheet chrome "market", ConfirmCard stacked, Toast
// business shape "market", Toggle business sizes, SegmentedTabs).

export function useMarketPalette(): MarketPalette {
  const dark = useIsDark();
  const { accessibility } = useApp();
  const hc = !!accessibility.highContrast;
  return useMemo(() => marketPalette(dark, hc), [dark, hc]);
}

export const px = textPx;
export const lh = linePx;

/** MA1's own section label (no rule): 10.5/700 0.1em uppercase faint. */
export function MLabel({ c, children, margin = "4px 0 8px" }: { c: MarketPalette; children: React.ReactNode; margin?: string }) {
  return (
    <h2 style={{ fontSize: px(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: c.faint, margin, lineHeight: lh(15.75) }}>
      {children}
    </h2>
  );
}

export function MCard({
  c,
  r = 24,
  style,
  children,
  borderColor,
  ...rest
}: { c: MarketPalette; r?: number; style?: React.CSSProperties; children?: React.ReactNode; borderColor?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} style={{ borderRadius: r, background: c.card, border: `1px solid ${borderColor ?? c.border}`, boxSizing: "border-box", ...style }}>
      {children}
    </div>
  );
}

/** Business row switch: 42 × 26 (rows) or 46 × 28 (listing visibility). */
export function MSwitch({
  c,
  on,
  onChange,
  label,
  large,
  disabled,
  shadow = true,
  describedBy,
}: {
  c: MarketPalette;
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  large?: boolean;
  disabled?: boolean;
  shadow?: boolean;
  describedBy?: string;
}) {
  return (
    <span aria-describedby={describedBy} style={{ display: "inline-flex", flexShrink: 0 }}>
      <Toggle checked={on} onChange={onChange} label={label} size={large ? "business-lg" : "business"} onColor={c.fill} disabled={disabled} knobShadow={shadow} />
    </span>
  );
}

/** The MA1 primary action: 52 tall, r16, 15/800 (sheet footers, CTA). */
export function MPrimary({
  c,
  children,
  onClick,
  disabled,
  tone = "primary",
  type = "button",
  style,
}: {
  c: MarketPalette;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "primary" | "destructive" | "quiet";
  type?: "button" | "submit";
  style?: React.CSSProperties;
}) {
  const bg = tone === "primary" ? c.fill : tone === "destructive" ? c.highBg : "transparent";
  const ink = tone === "primary" ? c.onFill : tone === "destructive" ? c.high : c.inkSoft;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="tap"
      style={{
        width: "100%",
        minHeight: 52,
        borderRadius: 16,
        background: bg,
        color: ink,
        border: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontSize: px(15),
        fontWeight: 800,
        padding: "0 16px",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** Outlined 40 tall r12 secondary (Retry, Create class, Feature for a week). */
export function MOutline({
  c,
  children,
  onClick,
  disabled,
  style,
}: {
  c: MarketPalette;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="tap"
      style={{
        minHeight: 40,
        borderRadius: 12,
        border: `1px solid ${c.border}`,
        background: "transparent",
        color: c.pDark,
        fontSize: px(12.5),
        fontWeight: 800,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "0 14px",
        opacity: disabled ? 0.4 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** A small text link (Manage, Preview as client, See all): 12/800 pDark, 44 hit. */
export function MLink({
  c,
  children,
  onClick,
  ariaLabel,
  style,
}: {
  c: MarketPalette;
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="tap"
      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: px(12), fontWeight: 800, color: c.pDark, borderRadius: 8, padding: "2px 4px", background: "transparent", border: 0, ...style }}
    >
      {children}
    </button>
  );
}

/** MA1-064 empty card (r22, pad 24 20, tile 48 r16). `tone="error"` is the OURS error card. */
export function MEmpty({
  c,
  icon: Icon,
  title,
  body,
  action,
  tone = "pale",
  pad = "24px 20px",
  bodyLh = 20,
}: {
  c: MarketPalette;
  icon: LucideIcon;
  title: string;
  body?: React.ReactNode;
  action?: { label: string; onClick: () => void; disabled?: boolean };
  tone?: "pale" | "error";
  pad?: string;
  bodyLh?: number;
}) {
  const err = tone === "error";
  return (
    <MCard c={c} r={22} style={{ padding: pad, textAlign: "center" }} role={err ? "alert" : undefined}>
      <span style={{ width: 48, height: 48, borderRadius: 16, background: err ? c.highBg : c.pale, color: err ? c.high : c.pDark, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={22} strokeWidth={2} aria-hidden />
      </span>
      <p style={{ fontSize: px(15), fontWeight: 800, marginTop: 10, color: c.ink, lineHeight: lh(22.5) }}>{title}</p>
      {body && <p style={{ fontSize: px(12.5), color: c.inkSoft, marginTop: 4, lineHeight: lh(bodyLh), whiteSpace: "pre-line" }}>{body}</p>}
      {action && (
        <MOutline c={c} onClick={action.onClick} disabled={action.disabled} style={{ marginTop: 12 }}>
          {action.label}
        </MOutline>
      )}
    </MCard>
  );
}

/** OURS-MA1-marketplace-states #5: the error card. */
export function MError({ c, onRetry, title = "Couldn't load your marketplace" }: { c: MarketPalette; onRetry: () => void; title?: string }) {
  return <MEmpty c={c} icon={CircleAlert} tone="error" title={title} body="Check your connection and try again." action={{ label: "Retry", onClick: onRetry }} />;
}

/** A skeleton block in the card shape (OURS-MA1-marketplace-states #1-#4). */
export function MBlock({ c, h, r = 24, style }: { c: MarketPalette; h: number; r?: number; style?: React.CSSProperties }) {
  return <div aria-hidden className="animate-skeleton-pulse" style={{ height: h, borderRadius: r, background: c.soft, ...style }} />;
}

/** Back row (MA1-033 row 1): 44 back, eyebrow, 22/800 title. */
export function MBackHeader({ c, eyebrow, title, onBack, backLabel }: { c: MarketPalette; eyebrow: string; title: string; onBack: () => void; backLabel: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "-8px 0 6px -10px" }}>
      <button type="button" onClick={onBack} aria-label={backLabel} className="tap" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: c.ink, background: "transparent", border: 0, flexShrink: 0 }}>
        <ChevronLeft size={22} strokeWidth={2.2} aria-hidden />
      </button>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: px(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: c.faint, lineHeight: lh(15.75) }}>{eyebrow}</p>
        <h1 style={{ fontSize: px(22), fontWeight: 800, lineHeight: lh(28), color: c.ink }}>{title}</h1>
      </div>
    </div>
  );
}

/** Every MA1 sheet: chrome "market" (band 58, body 16 16 28, ring 1.5, X 14, black scrim), business outline, X only. */
export function MSheet({
  open,
  onClose,
  title,
  children,
  footer,
  fill,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  fill?: boolean;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title} chrome="market" headerHeight={58} tone="business" scrim="black" closeOnScrim={false} footer={footer} fillHeight={fill} footerPadX={16} titleWrap>
      {children}
    </BottomSheet>
  );
}

/** Lead line in a sheet (12.5/18 inkSoft, mb 12). */
export function MLead({ c, children }: { c: MarketPalette; children: React.ReactNode }) {
  return <p style={{ fontSize: px(12.5), color: c.inkSoft, lineHeight: lh(18), marginBottom: 12, textWrap: "pretty" } as React.CSSProperties}>{children}</p>;
}

/** Field label (12/700 inkSoft, mb 6). */
export function MFieldLabel({ c, children, id }: { c: MarketPalette; children: React.ReactNode; id?: string }) {
  return (
    <p id={id} style={{ fontSize: px(12), fontWeight: 700, color: c.inkSoft, marginBottom: 6, lineHeight: lh(18) }}>
      {children}
    </p>
  );
}

/** A "Coming soon" note under a pending control (its B13 / B7 probe found the table or function absent). */
export function MSoonNote({ c, id, children }: { c: MarketPalette; id?: string; children: React.ReactNode }) {
  return (
    <p id={id} style={{ fontSize: px(11.5), color: c.faint, lineHeight: lh(16), marginTop: 8, textAlign: "center" }}>
      {children}
    </p>
  );
}

/** The OB `Soon` chip (10/800 pDark on pale). */
export function MSoonChip({ c }: { c: MarketPalette }) {
  return <span style={{ fontSize: px(10), fontWeight: 800, color: c.pDark, background: c.pale, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>Soon</span>;
}

/** MA1 central pop-up (ConfirmCard stacked, ops frame = r20 pad 22 20 18; scrim blur 2 as drawn). */
export function MPopup({
  open,
  icon: Icon,
  title,
  body,
  action,
  keep,
  onAction,
  onCancel,
  busy,
  disc,
  tone = "destructive",
  extra,
}: {
  open: boolean;
  icon: LucideIcon;
  title: string;
  body: string;
  action: string;
  keep: string;
  onAction: () => void;
  onCancel: () => void;
  busy?: boolean;
  disc?: { bg: string; ink: string };
  tone?: "primary" | "destructive";
  extra?: React.ReactNode;
}) {
  return (
    <ConfirmCard
      open={open}
      layout="stacked"
      frame="ops"
      tone={tone}
      icon={<Icon size={20} strokeWidth={2.2} />}
      title={title}
      subtitle={body}
      confirmLabel={action}
      cancelLabel={keep}
      busy={busy}
      disc={disc}
      scrimBlur
      extra={extra}
      onConfirm={onAction}
      onCancel={onCancel}
    />
  );
}

/** The MA1 business toast (r14, 13/700, circle-check 18/2.4, bottom 96; 152 over a fixed CTA). */
export function useMarketToast(): [React.ReactNode, (msg: string, opts?: { overCta?: boolean }) => void] {
  const [t, setT] = useState<{ msg: string; overCta: boolean; key: number } | null>(null);
  const seq = useRef(0);
  const show = useCallback((msg: string, opts?: { overCta?: boolean }) => {
    seq.current += 1;
    setT({ msg, overCta: !!opts?.overCta, key: seq.current });
  }, []);
  const node = t ? (
    <Toast key={t.key} open variant="business" shape="market" message={t.msg} bottom={t.overCta ? 152 : 96} onExpire={() => setT(null)} />
  ) : null;
  return [node, show];
}

/** Fixed CTA (MA1-007 CTA): left / right 16, bottom 92 + safe area, h52 r16, plus 17/2.6. */
export function MFixedCta({
  c,
  label,
  icon,
  onClick,
  disabled,
}: {
  c: MarketPalette;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="fixed z-[40]"
      style={{ left: "calc(var(--app-gutter, 0px) + 16px)", right: "calc(var(--app-gutter, 0px) + 16px)", bottom: "calc(92px + env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="tap"
        style={{
          width: "100%",
          height: 52,
          borderRadius: 16,
          background: c.fill,
          color: c.onFill,
          border: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontSize: px(15),
          fontWeight: 800,
          boxShadow: "0 10px 24px rgba(95,80,147,0.28)",
          opacity: disabled ? 0.4 : 1,
        }}
      >
        {icon}
        {label}
      </button>
    </div>
  );
}

/** A centred text block for an inline save error (OURS-MA1-marketplace-states #6). */
export function MSaveError({ c, children }: { c: MarketPalette; children: React.ReactNode }) {
  return (
    <p role="alert" style={{ fontSize: px(11.5), fontWeight: 700, color: c.high, lineHeight: lh(16), marginTop: 8, textAlign: "center" }}>
      {children}
    </p>
  );
}
