import React, { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Check, ChevronLeft, Lightbulb, Loader2, Plus, type LucideIcon } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { Toast } from "../../../components/ui/Toast";
import { useBack } from "../../../hooks/useBack";

// v6 Batch 4 · the BizTypeKit kit for Store orders, products and
// appointments (OP1-001 to OP1-020 and their OURS files). Every value is the
// source's own (handoff/source/BizTypeKit.dc.html, template lines 21 to 51,
// palettes at lines 58 to 59), through theme tokens so dark, the five colour
// themes, Larger text and High contrast apply:
//   page cream (#FFFFFF / #121317) · ink charcoal (#241F1B / #F5F3FA) ·
//   inkSoft charcoal-soft (#5B5349 / #B8B3C7) · faint charcoal-faint
//   (#8C8378 / #B8B3C7) · soft cream-soft (#F5F5F6 / #242730) · list
//   th-f7f7fc / th-aea1dc@0.10 · rule th-ebeaf6 / th-aea1dc@0.16 · fill
//   primary-fill (#AEA1DC / #A991FE) with on-primary-fill (#FFFFFF / #0D0B1A)
//   · pDark th-7d6bb5 / th-c3b3fb · pale th-f0edf9 / th-303141 · good, high
//   status-* · warn caution-text on status-caution-bg (#8A6A3E / #F6E9C9,
//   dark #DCBB7F / #332B1A).

export const LIST = "bg-th-f7f7fc dark:bg-th-aea1dc/[0.10]";
export const RULE = "bg-th-ebeaf6 dark:bg-th-aea1dc/[0.16]";
export const P_DARK = "text-th-7d6bb5 dark:text-th-c3b3fb";
export const PALE = "bg-th-f0edf9 dark:bg-th-303141";
const FILL_LINE = "border-th-aea1dc dark:border-th-a991fe";
const pretty = { textWrap: "pretty" } as React.CSSProperties;
/** Single-line text that wraps under Larger text (HANDOVER 2.5). */
const ONE_LINE = "truncate [.larger-text_&]:whitespace-normal [.larger-text_&]:overflow-visible";

// ---------------------------------------------------------------------------
// Header (template line 23-26): flex start, gap 10, margin-bottom 14

export const OpsHeader: React.FC<{ kicker: string; title: string; sub?: string | null; back?: boolean | (() => void) }> = ({ kicker, title, sub, back }) => {
  const goBack = useBack();
  return (
    <div className="flex items-start" style={{ gap: 10, marginBottom: 14 }}>
      {back && (
        <button
          type="button"
          onClick={typeof back === "function" ? back : goBack}
          aria-label="Back"
          // 40 drawn; .tap gives the 44 hit box (OP1-005 O6).
          className="tap flex items-center justify-center shrink-0 rounded-full text-charcoal-soft rtl:-scale-x-100"
          style={{ width: 40, height: 40, marginInlineStart: -8 }}
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold leading-[16.5px] text-charcoal-faint">{kicker}</p>
        <h1 className="text-[24px] font-bold tracking-[-0.02em] leading-[30px] text-charcoal break-words">{title}</h1>
        {sub && (
          <p className="text-[12.5px] leading-[18px] text-charcoal-faint" style={{ marginTop: 2, ...pretty }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Text tabs (line 27): gap 20, 1px rule, margin 0 0 16; tab padding 8 0 10,
// 13.5, active 800 ink with a 2px fill underline, idle 600 faint.

export function TextTabs<K extends string>({ tabs, active, onChange, label }: { tabs: { key: K; label: string }[]; active: K; onChange: (k: K) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex overflow-x-auto [scrollbar-width:none] border-b border-th-ebeaf6 dark:border-th-aea1dc/[0.16]" style={{ gap: 20, margin: "0 0 16px" }}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={clsx(
              "tap shrink-0 whitespace-nowrap text-[13.5px] leading-[20.25px] border-b-2",
              on ? clsx("font-extrabold text-charcoal", FILL_LINE) : "font-semibold text-charcoal-faint border-transparent"
            )}
            style={{ padding: "8px 0 10px", marginBottom: -1 }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Number boxes (line 30): grid, gap 8, mb 14; tile r16 list, padding 12 10;
// value 24/800 line 28 tabular; label 11/600 line 14 mt 4; delta 10.5/700.

export interface NumberBox {
  v: string;
  l: string;
  d?: string;
  dTone?: "good" | "warn" | "bad";
}

export const NumberBoxes: React.FC<{ items: NumberBox[]; loading?: boolean }> = ({ items, loading }) => (
  <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: 8, marginBottom: 14 }}>
    {items.map((nb) => (
      <div key={nb.l} className={LIST} style={{ borderRadius: 16, padding: "12px 10px", minWidth: 0 }}>
        {loading ? (
          // OP1-001 O1: a 40 × 20 r6 bar in place of the value.
          <span aria-hidden className={clsx("block animate-skeleton-pulse", RULE)} style={{ width: 40, height: 20, borderRadius: 6, margin: "4px 0" }} />
        ) : (
          <p className="text-[24px] font-extrabold leading-[28px] text-charcoal tabular-nums whitespace-nowrap">{nb.v}</p>
        )}
        <p className="text-[11px] font-semibold leading-[14px] text-charcoal-faint" style={{ marginTop: 4, ...pretty }}>
          {nb.l}
        </p>
        {nb.d && (
          <p
            className={clsx(
              "text-[10.5px] font-bold",
              nb.dTone === "bad" ? "text-status-high" : nb.dTone === "warn" ? "text-caution-text" : "text-status-good"
            )}
            style={{ marginTop: 4 }}
          >
            {nb.d}
          </p>
        )}
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Section label (line 29): flex end, space-between, pb 7.5, 1.5 fill rule,
// margin 6 2 12 (block flow, so the 6 collapses under a 14 block margin).

export const KitLabel: React.FC<{ label: string; action?: string; onAction?: () => void; id?: string }> = ({ label, action, onAction, id }) => (
  <div className={clsx("flex items-end justify-between border-b-[1.5px]", FILL_LINE)} style={{ paddingBottom: 7.5, margin: "6px 2px 12px" }}>
    <h2 id={id} className="text-[11px] font-semibold tracking-[0.14em] uppercase leading-[14px] text-charcoal-faint rtl:tracking-normal">
      {label}
    </h2>
    {action && onAction && (
      <button type="button" onClick={onAction} className={clsx("tap text-[12px] font-bold leading-[18px]", P_DARK)}>
        {action}
      </button>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// List card (line 31): list fill, r18, padding 2 14, mb 14. Rows min 58,
// padding 8 0, gap 12; a 1px rule from x 48 on rows 2+; tile 36 r11 pale /
// pDark, glyph 17 / 1.75; title 13.5/700 line 18; sub 11.5 line 16 faint;
// chip 10/800 0.04em uppercase padding 3 8; value 13/800.

export const ListCard: React.FC<{ children: React.ReactNode; label?: string; className?: string }> = ({ children, label, className }) => (
  <div role={label ? "list" : undefined} aria-label={label} className={clsx(LIST, className)} style={{ borderRadius: 18, padding: "2px 14px", marginBottom: 14 }}>
    {children}
  </div>
);

export type ChipTone = "good" | "warn" | "bad" | "soft" | "pale";
const CHIP: Record<ChipTone, string> = {
  good: "bg-status-good-bg text-status-good",
  warn: "bg-status-caution-bg text-caution-text",
  bad: "bg-status-high-bg text-status-high",
  soft: "bg-cream-soft text-charcoal-faint",
  pale: clsx(PALE, P_DARK),
};

export const KitChip: React.FC<{ label: string; tone: ChipTone }> = ({ label, tone }) => (
  <span className={clsx("shrink-0 whitespace-nowrap rounded-full text-[10px] font-extrabold tracking-[0.04em] uppercase", CHIP[tone])} style={{ padding: "3px 8px" }}>
    {label}
  </span>
);

export const KitTile: React.FC<{ icon: LucideIcon; size?: 36 | 48 }> = ({ icon: Icon, size = 36 }) => (
  <span aria-hidden className={clsx("flex items-center justify-center shrink-0", PALE, P_DARK)} style={{ width: size, height: size, borderRadius: size === 48 ? 14 : 11 }}>
    <Icon size={size === 48 ? 22 : 17} strokeWidth={1.75} />
  </span>
);

export interface KitRowProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  sub?: React.ReactNode;
  /** Wrap the sub up to 3 lines (a customer's note) instead of one line. */
  subWrap?: boolean;
  chip?: { label: string; tone: ChipTone } | null;
  value?: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  disabled?: boolean;
  /** A control after the value (a remove button on a static row). */
  trailing?: React.ReactNode;
}

export const KitRow: React.FC<KitRowProps> = ({ icon, title, sub, subWrap, chip, value, onClick, ariaLabel, disabled, trailing }) => {
  const body = (
    <>
      <span aria-hidden className={clsx("kit-rule absolute top-0 right-0 h-px", RULE)} style={{ left: icon ? 48 : 0 }} />
      {icon && <KitTile icon={icon} />}
      <span className="flex-1 min-w-0">
        <span className={clsx("block text-[13.5px] font-bold leading-[18px] text-charcoal", ONE_LINE)}>{title}</span>
        {sub && (
          <span className={clsx("block text-[11.5px] leading-[16px] text-charcoal-faint", subWrap ? "line-clamp-3 break-words" : ONE_LINE)}>{sub}</span>
        )}
      </span>
      {chip && <KitChip label={chip.label} tone={chip.tone} />}
      {value !== undefined && value !== null && <span className="shrink-0 whitespace-nowrap text-[13px] font-extrabold text-charcoal">{value}</span>}
      {trailing}
    </>
  );
  const cls = "relative w-full flex items-center text-start [&:first-child>.kit-rule]:hidden";
  const style: React.CSSProperties = { gap: 12, minHeight: 58, padding: "8px 0" };
  if (onClick) {
    return (
      <button type="button" role="listitem" onClick={onClick} disabled={disabled} aria-label={ariaLabel} className={clsx("tap", cls, "disabled:opacity-40")} style={style}>
        {body}
      </button>
    );
  }
  return (
    <div role="listitem" aria-label={ariaLabel} className={cls} style={style}>
      {body}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Empty card (line 35) and tip (line 36)

export const EmptyCard: React.FC<{ icon: LucideIcon; title: string; body: string; children?: React.ReactNode }> = ({ icon, title, body, children }) => (
  <div className={clsx("text-center border-[1.5px] border-dashed", FILL_LINE)} style={{ borderRadius: 20, padding: "24px 18px", marginBottom: 14 }}>
    <span className="inline-flex">
      <KitTile icon={icon} size={48} />
    </span>
    <p className="text-[15px] font-extrabold leading-[22.5px] text-charcoal" style={{ marginTop: 10 }}>
      {title}
    </p>
    <p className="text-[12.5px] leading-[18px] text-charcoal-soft" style={{ marginTop: 4, ...pretty }}>
      {body}
    </p>
    {children}
  </div>
);

export const KitTip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={clsx("flex items-start", PALE, P_DARK)} style={{ gap: 10, borderRadius: 16, padding: "12px 14px", marginBottom: 14 }}>
    <Lightbulb size={15} strokeWidth={2} aria-hidden className="shrink-0" style={{ marginTop: 2 }} />
    <p className="text-[12.5px] leading-[18px]" style={pretty}>
      {children}
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// States (OP1-001 O1 / O2)

export const ListSkeleton: React.FC<{ rows?: number; label?: string }> = ({ rows = 3, label = "Loading" }) => (
  <div aria-busy="true" aria-label={label} className={LIST} style={{ borderRadius: 18, padding: "2px 14px", marginBottom: 14 }}>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex items-center" style={{ gap: 12, minHeight: 58, padding: "8px 0" }}>
        <span aria-hidden className={clsx("block shrink-0 animate-skeleton-pulse", PALE)} style={{ width: 36, height: 36, borderRadius: 11 }} />
        <span className="flex-1">
          <span aria-hidden className={clsx("block animate-skeleton-pulse", RULE)} style={{ width: 120, height: 12, borderRadius: 6 }} />
          <span aria-hidden className={clsx("block animate-skeleton-pulse", RULE)} style={{ width: 180, maxWidth: "100%", height: 10, borderRadius: 6, marginTop: 6 }} />
        </span>
      </div>
    ))}
  </div>
);

export const ErrorCard: React.FC<{ text: string; onRetry: () => void }> = ({ text, onRetry }) => (
  <div role="alert" className={LIST} style={{ borderRadius: 18, padding: 14, marginBottom: 14 }}>
    <p className="text-[12.5px] leading-[18px] text-charcoal-soft">{text}</p>
    <button type="button" onClick={onRetry} className={clsx("tap text-[12px] font-bold", P_DARK)} style={{ minHeight: 44 }}>
      Try again
    </button>
  </div>
);

/** A 44 tall text button under a card: "Cancel order", "Deny", "Mark as no-show" (OURS). */
export const TextButton: React.FC<{ label: string; onClick: () => void; tone?: "soft" | "high"; disabled?: boolean }> = ({ label, onClick, tone = "soft", disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={clsx("tap w-full flex items-center justify-center text-[14px] font-bold disabled:opacity-40", tone === "high" ? "text-status-high" : "text-charcoal-soft")}
    style={{ minHeight: 44 }}
  >
    {label}
  </button>
);

// ---------------------------------------------------------------------------
// Fixed CTA (line 40): left / right 16, bottom 88 above the navbar, 50 tall,
// r16, fill / onFill 14/800, gap 8, shadow 0 6px 16px rgba(95,80,147,0.22).
// Icon: `plus` 16 / 2.4 on add actions only (none on step CTAs, OP1-005 #14).

export const FixedCta: React.FC<{ label: string; onClick: () => void; plus?: boolean; disabled?: boolean; busy?: boolean; error?: string | null }> = ({ label, onClick, plus, disabled, busy, error }) =>
  createPortal(
    <div className="fixed z-20" style={{ left: "calc(var(--app-gutter, 0px) + 16px)", right: "calc(var(--app-gutter, 0px) + 16px)", bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}>
      {error && (
        <p role="alert" className="text-[11.5px] font-bold text-status-high text-center" style={{ marginBottom: 6 }}>
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        className="tap w-full flex items-center justify-center bg-primary-fill text-on-primary-fill text-[14px] font-extrabold disabled:opacity-40"
        style={{ height: 50, borderRadius: 16, gap: 8, boxShadow: "0 6px 16px rgba(95,80,147,0.22)" }}
      >
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : plus ? <Plus size={16} strokeWidth={2.4} aria-hidden /> : null}
        {label}
      </button>
    </div>,
    document.body
  );

/** The page's extra bottom room while a fixed CTA shows (padB 160 vs 110). */
export const CtaSpacer: React.FC = () => <div aria-hidden style={{ height: 50 }} />;

// ---------------------------------------------------------------------------
// Toast (line 51): one business toast (X-08: #241F1B in both modes), r14,
// padding 12 14, 12.5/700, gap 8, a `check` 15 / 2.6 in the toast ink;
// bottom 150 over a fixed CTA, 88 without (OP1-007 #1).

export function useOpsToast(): [React.ReactNode, (message: string, overCta?: boolean) => void] {
  const [t, setT] = useState<{ m: string; cta: boolean; k: number } | null>(null);
  const k = useRef(0);
  const show = useCallback((m: string, overCta = true) => setT({ m, cta: overCta, k: ++k.current }), []);
  const node = t ? (
    <Toast
      key={t.k}
      open
      variant="business"
      shape="more"
      bottom={t.cta ? 150 : 88}
      duration={5000}
      message={t.m}
      icon={<Check size={15} strokeWidth={2.6} aria-hidden className="flex-none" />}
      onExpire={() => setT(null)}
    />
  ) : null;
  return [node, show];
}

// ---------------------------------------------------------------------------
// Central pop (line 50) through the shared ConfirmCard (stacked, kit frame).

export const KitPop: React.FC<{
  open: boolean;
  icon: LucideIcon;
  title: string;
  body: string;
  action: string;
  keep: string;
  onAction: () => void;
  onKeep: () => void;
  busy?: boolean;
  error?: string | null;
  tone?: "destructive" | "primary";
}> = ({ open, icon: Icon, title, body, action, keep, onAction, onKeep, busy, error, tone = "destructive" }) => (
  <ConfirmCard
    open={open}
    layout="stacked"
    frame="kit"
    tone={tone}
    icon={<Icon size={20} strokeWidth={2.2} />}
    title={title}
    titleLineHeight={25.5}
    subtitle={body}
    // OP1-004 S4: the error line under the body (11.5/700 high, the sheet error style).
    extra={
      error ? (
        <p role="alert" className="text-[11.5px] font-bold text-status-high" style={{ marginTop: 6 }}>
          {error}
        </p>
      ) : undefined
    }
    confirmLabel={action}
    cancelLabel={keep}
    busy={busy}
    onConfirm={onAction}
    onCancel={busy ? () => undefined : onKeep}
  />
);

// ---------------------------------------------------------------------------
// Sheet (lines 43-48): scrim blur 2, band / outline per X-05, header 53,
// body padding 18 20 12, fields label 12/700 inkSoft mb 6, box 46 r14 soft
// 1.5 border, 13.5/700, icon 16 / 2.2 faint, mb 12; footer button 52 r16
// fill 14/700.

export const OpsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  button: string;
  onButton: () => void;
  disabled?: boolean;
  busy?: boolean;
  error?: string | null;
}> = ({ open, onClose, title, children, button, onButton, disabled, busy, error }) => (
  <BottomSheet
    open={open}
    onClose={onClose}
    title={title}
    tone="business"
    headerHeight={53}
    bodyPadding={{ top: 18, right: 20, bottom: 12, left: 20 }}
    footer={
      <div>
        {error && (
          <p role="alert" className="text-[11.5px] font-bold text-status-high" style={{ marginBottom: 6 }}>
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={onButton}
          disabled={disabled || busy}
          aria-busy={busy || undefined}
          className="tap w-full flex items-center justify-center bg-primary-fill text-on-primary-fill text-[14px] font-bold disabled:opacity-40"
          style={{ height: 52, borderRadius: 16, gap: 8 }}
        >
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
          {button}
        </button>
      </div>
    }
  >
    {children}
  </BottomSheet>
);

const BOX = "flex items-center bg-cream-soft border-[1.5px]";
const BOX_BORDER = "border-charcoal/[0.11] dark:border-charcoal/[0.08]";

export const KitField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: LucideIcon;
  error?: string | null;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  multiline?: boolean;
  disabled?: boolean;
  note?: React.ReactNode;
}> = ({ id, label, value, onChange, placeholder, icon: Icon, error, inputMode, maxLength, multiline, disabled, note }) => (
  <div style={{ marginBottom: 12 }}>
    <label htmlFor={id} className="block text-[12px] font-bold text-charcoal-soft" style={{ marginBottom: 6 }}>
      {label}
    </label>
    <div className={clsx(BOX, error ? "border-status-high" : BOX_BORDER, disabled && "opacity-60")} style={{ minHeight: 46, borderRadius: 14, padding: multiline ? "10px 12px" : "0 12px", gap: 8, alignItems: multiline ? "flex-start" : "center" }}>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          rows={3}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 resize-none bg-transparent outline-none text-[13.5px] font-bold leading-[19px] text-charcoal placeholder:text-charcoal-faint placeholder:font-medium"
        />
      ) : (
        <input
          id={id}
          value={value}
          inputMode={inputMode}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] font-bold text-charcoal placeholder:text-charcoal-faint placeholder:font-medium truncate"
        />
      )}
      {Icon && <Icon size={16} strokeWidth={2.2} aria-hidden className="shrink-0 text-charcoal-faint" style={multiline ? { marginTop: 2 } : undefined} />}
    </div>
    {error && (
      <p id={`${id}-err`} role="alert" className="text-[11.5px] font-bold text-status-high" style={{ marginTop: 4 }}>
        {error}
      </p>
    )}
    {note && !error && <p className="text-[11.5px] leading-[16px] text-charcoal-faint" style={{ marginTop: 4 }}>{note}</p>}
  </div>
);

/** A field that opens a menu (Category, Service, Day, Time) or shows a read-only value. */
export const KitFieldButton: React.FC<{
  id: string;
  label: string;
  value: string | null;
  placeholder: string;
  icon: LucideIcon;
  onClick?: (el: HTMLButtonElement) => void;
  error?: string | null;
  disabled?: boolean;
  note?: React.ReactNode;
  expanded?: boolean;
}> = ({ id, label, value, placeholder, icon: Icon, onClick, error, disabled, note, expanded }) => (
  <div style={{ marginBottom: 12 }}>
    <p id={`${id}-l`} className="text-[12px] font-bold text-charcoal-soft" style={{ marginBottom: 6 }}>
      {label}
    </p>
    <button
      id={id}
      type="button"
      aria-labelledby={`${id}-l ${id}`}
      aria-haspopup={onClick ? "listbox" : undefined}
      aria-expanded={expanded}
      disabled={disabled || !onClick}
      onClick={(e) => onClick?.(e.currentTarget)}
      className={clsx("tap w-full text-start", BOX, error ? "border-status-high" : BOX_BORDER, disabled && "opacity-60")}
      style={{ height: 46, borderRadius: 14, padding: "0 12px", gap: 8 }}
    >
      <span className={clsx("flex-1 min-w-0 truncate text-[13.5px]", value ? "font-bold text-charcoal" : "font-medium text-charcoal-faint")}>{value ?? placeholder}</span>
      <Icon size={16} strokeWidth={2.2} aria-hidden className="shrink-0 text-charcoal-faint" />
    </button>
    {error && (
      <p role="alert" className="text-[11.5px] font-bold text-status-high" style={{ marginTop: 4 }}>
        {error}
      </p>
    )}
    {note && !error && <p className="text-[11.5px] leading-[16px] text-charcoal-faint" style={{ marginTop: 4 }}>{note}</p>}
  </div>
);
