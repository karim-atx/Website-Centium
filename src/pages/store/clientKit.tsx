import React from "react";
import clsx from "clsx";
import { ChevronRight, Minus, Plus, type LucideIcon } from "lucide-react";
import { DetailLabel } from "../marketplace/venueParts";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { PopupButtons } from "../../components/cycle/cycleUi";
import { t, tx } from "../../i18n/core";

// V6-49 · "Designed by us": the customer side of stores and appointments, in
// the client Part B language (OURS-customer-* files). Pieces, all existing
// client values:
//   section label = DetailLabel (MO1.4.2.1 #25: 10.5/15.8 700 uppercase
//   1.3px, #7D67D9 / #9A8CD6), 22 above and 8 under;
//   card = MO1.5.1 Join row card (r18, 1px #241F1B@8%, cream-card), rows
//   padding 12 14, a 0.5px hairline between rows;
//   tile = 32 r10 primary-pale with a 16 / 1.75 primary-dark glyph;
//   title 15/600 charcoal, sub 12/500 charcoal-faint, value 14/700;
//   empty = Foundations › Empty state (Explore MO1.4.3: tile 56 r18, icon 24,
//   title 15/700, line 12.5/1.55 500 faint);
//   error = the shared RetryLine (12/600 high + "Retry" 12/700 primary-dark).

export { DetailLabel };

export const Section: React.FC<{ label: string; children: React.ReactNode; first?: boolean; right?: React.ReactNode }> = ({ label, children, first, right }) => (
  <section style={{ marginTop: first ? 0 : 22 }}>
    <div className="flex items-end justify-between" style={{ marginBottom: 8 }}>
      <DetailLabel>{label}</DetailLabel>
      {right}
    </div>
    {children}
  </section>
);

export const ClientCard: React.FC<{ children: React.ReactNode; className?: string; label?: string }> = ({ children, className, label }) => (
  <div role={label ? "group" : undefined} aria-label={label} className={clsx("rounded-[18px] border border-charcoal/[0.08] bg-cream-card overflow-hidden", className)}>
    {children}
  </div>
);

export const Tile: React.FC<{ icon: LucideIcon; size?: 32 | 56 }> = ({ icon: Icon, size = 32 }) => (
  <span
    aria-hidden
    className="flex items-center justify-center shrink-0 bg-primary-pale text-th-7d67d9 dark:text-primary-accent"
    style={{ width: size, height: size, borderRadius: size === 56 ? 18 : 10 }}
  >
    <Icon size={size === 56 ? 24 : 16} strokeWidth={1.75} />
  </span>
);

export type ClientTone = "pale" | "good" | "soft" | "bad" | "warn";
const TONE: Record<ClientTone, string> = {
  pale: "bg-primary-pale text-primary-dark",
  good: "bg-status-good-bg text-status-good",
  soft: "bg-cream-soft text-charcoal-faint",
  bad: "bg-status-high-bg text-status-high",
  warn: "bg-status-caution-bg text-caution-text",
};

export const Pill: React.FC<{ label: string; tone: ClientTone }> = ({ label, tone }) => (
  <span className={clsx("shrink-0 whitespace-nowrap rounded-full text-[11px] font-bold", TONE[tone])} style={{ padding: "3px 9px" }}>
    {label}
  </span>
);

export interface ClientRowProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  sub?: React.ReactNode;
  value?: React.ReactNode;
  pill?: { label: string; tone: ClientTone } | null;
  onClick?: () => void;
  chevron?: boolean;
  trailing?: React.ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
}

export const ClientRow: React.FC<ClientRowProps> = ({ icon, title, sub, value, pill, onClick, chevron, trailing, disabled, ariaLabel }) => {
  const body = (
    <>
      {icon && <Tile icon={icon} />}
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold leading-[20px] text-charcoal break-words">{title}</span>
        {sub && <span className="block text-[12px] font-medium leading-[17px] text-charcoal-faint break-words" style={{ marginTop: 2 }}>{sub}</span>}
      </span>
      {pill && <Pill label={pill.label} tone={pill.tone} />}
      {value !== undefined && value !== null && <span className="shrink-0 whitespace-nowrap text-[14px] font-bold text-charcoal tabular-nums">{value}</span>}
      {trailing}
      {(chevron ?? !!onClick) && onClick && <ChevronRight size={15} aria-hidden className="shrink-0 text-charcoal-faint rtl:-scale-x-100" />}
    </>
  );
  const cls = "w-full flex items-center text-start border-t-[0.5px] border-charcoal/[0.08] first:border-t-0";
  const style: React.CSSProperties = { gap: 12, minHeight: 56, padding: "12px 14px" };
  return onClick ? (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel} className={clsx("tap", cls, "disabled:opacity-40")} style={style}>
      {body}
    </button>
  ) : (
    <div aria-label={ariaLabel} className={cls} style={style}>
      {body}
    </div>
  );
};

/** Foundations › Empty state, as Explore draws it (MO1.4.3). */
export const ClientEmpty: React.FC<{ icon: LucideIcon; title: string; line: string; children?: React.ReactNode }> = ({ icon, title, line, children }) => (
  <div className="flex flex-col items-center text-center gap-2.5 px-6 pt-10 pb-4">
    <Tile icon={icon} size={56} />
    <p className="m-0 text-[15px] font-bold text-charcoal">{title}</p>
    <p className="m-0 text-[12.5px] font-medium text-charcoal-faint leading-[1.55] max-w-[280px]">{line}</p>
    {children}
  </div>
);

export const RetryLine: React.FC<{ text: string; onRetry: () => void }> = ({ text, onRetry }) => (
  <div role="alert" className="flex items-center justify-between gap-3" style={{ marginTop: 8 }}>
    <p className="text-[12px] font-semibold text-status-high">{text}</p>
    <button type="button" onClick={onRetry} className="tap shrink-0 text-[12px] font-bold text-primary-dark" style={{ minHeight: 44 }}>
      {t("Retry")}
    </button>
  </div>
);

export const SkeletonCards: React.FC<{ heights?: number[]; label?: string }> = ({ heights = [72, 72, 72], label }) => (
  <div className="space-y-2.5" aria-busy="true" aria-label={label ?? t("Loading")}>
    {heights.map((h, i) => (
      <div key={i} aria-hidden className="animate-skeleton-pulse rounded-[18px] bg-cream-soft" style={{ height: h }} />
    ))}
  </div>
);

/** A note in the pale info style (pending stages, privacy lines). */
export const InfoNote: React.FC<{ children: React.ReactNode; icon?: LucideIcon }> = ({ children, icon: Icon }) => (
  <div className="flex items-start rounded-[16px] bg-primary-pale text-th-7d67d9 dark:text-primary-accent" style={{ gap: 10, padding: "12px 14px", marginTop: 12 }}>
    {Icon && <Icon size={15} strokeWidth={2} aria-hidden className="shrink-0" style={{ marginTop: 2 }} />}
    <p className="text-[12.5px] leading-[18px] font-medium" style={{ textWrap: "pretty" } as React.CSSProperties}>
      {children}
    </p>
  </div>
);

/** Quantity stepper: two 44 round buttons around the count. */
export const QtyStepper: React.FC<{ value: number; onChange: (n: number) => void; min?: number; max: number; label: string }> = ({ value, onChange, min = 1, max, label }) => (
  <div role="group" aria-label={label} className="flex items-center shrink-0" style={{ gap: 4 }}>
    <button
      type="button"
      aria-label={tx("Fewer", "quantity")}
      onClick={() => onChange(Math.max(min, value - 1))}
      disabled={value <= min}
      className="tap flex items-center justify-center rounded-full bg-cream-soft text-charcoal disabled:opacity-40"
      style={{ width: 36, height: 36 }}
    >
      <Minus size={16} strokeWidth={2.2} aria-hidden />
    </button>
    <span aria-live="polite" className="text-[15px] font-bold text-charcoal tabular-nums text-center" style={{ minWidth: 26 }}>
      {value}
    </span>
    <button
      type="button"
      aria-label={tx("More", "quantity")}
      onClick={() => onChange(Math.min(max, value + 1))}
      disabled={value >= max}
      className="tap flex items-center justify-center rounded-full bg-cream-soft text-charcoal disabled:opacity-40"
      style={{ width: 36, height: 36 }}
    >
      <Plus size={16} strokeWidth={2.2} aria-hidden />
    </button>
  </div>
);

/** A radio card row (fulfilment, payment, reason, service). */
export const RadioRow: React.FC<{
  selected: boolean;
  onSelect?: () => void;
  title: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
  trailing?: React.ReactNode;
}> = ({ selected, onSelect, title, sub, icon, disabled, trailing }) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    aria-disabled={disabled || undefined}
    onClick={disabled ? undefined : onSelect}
    className={clsx("tap w-full flex items-center text-start border-t-[0.5px] border-charcoal/[0.08] first:border-t-0", disabled && "opacity-50 cursor-not-allowed")}
    style={{ gap: 12, minHeight: 56, padding: "12px 14px" }}
  >
    {icon && <Tile icon={icon} />}
    <span className="flex-1 min-w-0">
      <span className="block text-[15px] font-semibold leading-[20px] text-charcoal">{title}</span>
      {sub && <span className="block text-[12px] font-medium leading-[17px] text-charcoal-faint" style={{ marginTop: 2 }}>{sub}</span>}
    </span>
    {trailing}
    <span aria-hidden className={clsx("flex items-center justify-center shrink-0 rounded-full border-2", selected ? "border-primary-dark" : "border-charcoal/25")} style={{ width: 20, height: 20 }}>
      {selected && <span className="block rounded-full bg-primary-dark" style={{ width: 10, height: 10 }} />}
    </span>
  </button>
);

/** "Soon" chip (the business kit's, in client colours). */
export const SoonChip: React.FC = () => (
  <span className="shrink-0 rounded-full bg-primary-pale text-primary-dark text-[9.5px] font-extrabold uppercase tracking-[0.06em]" style={{ padding: "2px 8px" }}>
    {t("Soon")}
  </span>
);

/**
 * A Part B centred confirm (CentredPopup geometry "partB" + PopupButtons,
 * HE1.10.b.4): title, a 13/20.2 body, Keep / Confirm side by side.
 */
export const ClientConfirm: React.FC<{
  open: boolean;
  title: string;
  body: string;
  keep: string;
  confirm: string;
  destructive?: boolean;
  busy?: boolean;
  error?: string | null;
  onKeep: () => void;
  onConfirm: () => void;
}> = ({ open, title, body, keep, confirm, destructive, busy, error, onKeep, onConfirm }) => (
  <CentredPopup open={open} onClose={busy ? () => undefined : onKeep} title={title} geometry="partB" align="start">
    <p className="text-[13px] leading-[20.2px] text-charcoal-soft" style={{ marginTop: -6 }}>
      {body}
    </p>
    {error && (
      <p role="alert" className="text-[12px] font-semibold text-status-high" style={{ marginTop: 8 }}>
        {error}
      </p>
    )}
    <div style={{ marginTop: 16 }}>
      <PopupButtons cancel={keep} onCancel={onKeep} confirm={confirm} onConfirm={onConfirm} destructive={destructive} busy={busy} />
    </div>
  </CentredPopup>
);
