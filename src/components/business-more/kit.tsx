import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Check, ChevronDown, ChevronLeft, ChevronRight, X, type LucideIcon } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { ConfirmCard } from "../ui/ConfirmCard";
import { Toggle } from "../ui/Toggle";
import { useBack } from "../../hooks/useBack";
import { useBackCloses } from "../../hooks/useBackCloses";
import { useOnline } from "../../hooks/useOnline";
import { linePx, textPx } from "../../theme/textSize";

// v6 Batch 3 · the BizMoreV8 kit (business More, Business Profile, Settings,
// Help and legal; MO1B). Every value is the source's own
// (handoff/source/BizMoreV8.dc.html, template lines 21 to 152, palette L / D
// at lines 159 to 160), through the app's theme tokens so the five colour
// themes, dark, Larger text and High contrast apply:
//   page #FFFFFF / #121317 (the app page) · card cream-card · list #F7F7FC /
//   rgba(174,161,220,0.10) · rule #EBEAF6 / rgba(174,161,220,0.16) · desc
//   #9A94B3 · ink / inkSoft / faint = charcoal / -soft / -faint · soft
//   cream-soft · border rgba(36,31,27,0.11) / rgba(245,243,250,0.10) · fill
//   primary-fill / on-primary-fill · pDark primary-dark · deep #5F5093 /
//   #C3B3FB · high status-high · highBg status-high-bg · tilePale #F0EDF9 /
//   rgba(174,161,220,0.14) · tileGlyph #7D67D9 / #9A8CD6 · line primary.
// One sub-page row for every business sub-page (V6-109): BizMoreV8's 12/700.

export const LIST_BG = "bg-[#F7F7FC] dark:bg-th-aea1dc/[0.10]";
export const RULE_BG = "bg-th-ebeaf6 dark:bg-th-aea1dc/[0.16]";
export const DESC = "text-th-9a94b3 [html.high-contrast_&]:text-charcoal-faint";
export const BORDER = "border-charcoal/[0.11] dark:border-charcoal/[0.10]";
export const DEEP = "text-th-5f5093 dark:text-primary-dark";

// ---------------------------------------------------------------------------
// Header

/** BizMoreV8 sub-page header: back 40 (margin-left -8), kicker 11/700, title 24/700 -0.02em line 30, sub 12.5 line 18. */
export const SubHeader: React.FC<{ title: string; sub?: string; kicker?: string; onBack?: () => void }> = ({
  title,
  sub,
  kicker = "More",
  onBack,
}) => {
  const back = useBack();
  return (
    <div className="flex items-start animate-fade-slide-up" style={{ gap: 10, marginBottom: 16 }}>
      <button
        type="button"
        onClick={onBack ?? back}
        aria-label="Back"
        // 40 drawn; .tap gives the 44 hit area (MO1B-011 row 1 OURS).
        className="tap flex items-center justify-center shrink-0 rounded-full text-charcoal-soft"
        style={{ width: 40, height: 40, marginInlineStart: -8 }}
      >
        <ChevronLeft size={20} aria-hidden />
      </button>
      <div className="min-w-0" style={{ paddingTop: 2 }}>
        <p className="text-[11px] font-bold text-charcoal-faint">{kicker}</p>
        <h1 className="text-[24px] font-bold tracking-[-0.02em] leading-[30px] text-charcoal" style={{ textWrap: "pretty" } as React.CSSProperties}>
          {title}
        </h1>
        {sub && <p className="mt-1 text-[12.5px] leading-[18px] text-charcoal-faint">{sub}</p>}
      </div>
    </div>
  );
};

/**
 * "You're offline…" under the header (AN11-009 O3 pattern). Round D O2: these
 * pages don't queue anything, so it no longer promises a later save.
 */
export const OfflineLine: React.FC<{ text?: string }> = ({ text = "You're offline. Changes need a connection." }) => {
  const online = useOnline();
  if (online) return null;
  return (
    <p role="status" className="-mt-2 mb-3 text-[12px] font-semibold leading-[18px] text-charcoal-faint">
      {text}
    </p>
  );
};

export const BizPage: React.FC<{ title: string; sub?: string; kicker?: string; onBack?: () => void; children: React.ReactNode; offline?: boolean }> = ({
  title,
  sub,
  kicker,
  onBack,
  children,
  offline = true,
}) => (
  <div>
    <SubHeader title={title} sub={sub} kicker={kicker} onBack={onBack} />
    {offline && <OfflineLine />}
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Sections

/** Section label: 11/600 0.14em uppercase line 14 faint, 7.5 then a 1.5 primary rule; margin 6 2 10. */
export const BizLabel: React.FC<{ children: React.ReactNode; right?: React.ReactNode; id?: string }> = ({ children, right, id }) => (
  <div
    className="flex items-end justify-between gap-2 border-b-[1.5px] border-primary"
    style={{ paddingBottom: 7.5, margin: "6px 2px 10px" }}
  >
    <h2 id={id} className="text-[11px] font-semibold uppercase tracking-[0.14em] leading-[14px] text-charcoal-faint rtl:tracking-normal">
      {children}
    </h2>
    {right}
  </div>
);

export const BizCard: React.FC<{ children: React.ReactNode; className?: string; ariaLabel?: string }> = ({ children, className, ariaLabel }) => (
  <div role={ariaLabel ? "group" : undefined} aria-label={ariaLabel} className={clsx(LIST_BG, className)} style={{ borderRadius: 18, padding: "4px 0", marginBottom: 13 }}>
    {children}
  </div>
);

/** A label (optional), the list card, and the 11/16 footer line (margin -6 4 14). */
export const BizSection: React.FC<{ label?: React.ReactNode; right?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode; id?: string }> = ({
  label,
  right,
  footer,
  children,
  id,
}) => (
  <section id={id}>
    {label && <BizLabel right={right}>{label}</BizLabel>}
    <BizCard>{children}</BizCard>
    {footer && <BizNote>{footer}</BizNote>}
  </section>
);

export const BizNote: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={clsx("text-[11px] leading-[16px] text-charcoal-faint", className)} style={{ margin: "-6px 4px 14px", textWrap: "pretty" } as React.CSSProperties}>
    {children}
  </p>
);

// ---------------------------------------------------------------------------
// The row

type RowIcon = LucideIcon | React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; absoluteStrokeWidth?: boolean; style?: React.CSSProperties }>;

export interface BizRowProps {
  title: React.ReactNode;
  desc?: React.ReactNode;
  icon?: RowIcon;
  /** "index": the More index's 30 r10 well, glyph 14 / 1.25 white. "sub" (default): 36 r11 tile, glyph 17 / 1.75. */
  well?: "index" | "sub";
  value?: React.ReactNode;
  /** Value ink: primary-dark (default), the good green ("Listed"), or high. */
  valueTone?: "primary" | "good" | "high" | "faint";
  /** A second value in high (Deny), with its own action. */
  value2?: { label: string; onClick: () => void; disabled?: boolean };
  /** The first value as its own button (Approve), when there is a value2. */
  valueAction?: () => void;
  badge?: React.ReactNode;
  /** Any node before the chevron (the Messages unread badge, MO1B-007 K1). */
  trailing?: React.ReactNode;
  /** The chevron-down after a value (role menus). */
  drop?: boolean;
  toggle?: { checked: boolean; onChange: (next: boolean) => void; disabled?: boolean; label?: string };
  radio?: { selected: boolean };
  /** Selected check (16 / 2.6 primary-dark). */
  checked?: boolean;
  danger?: boolean;
  /** opacity 0.5 (source `dim`). */
  dim?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  /** Force the trailing chevron on or off. Default: on for plain button rows. */
  chevron?: boolean;
  ariaLabel?: string;
  /** Under the text (e.g. the setup checklist bar). */
  extra?: React.ReactNode;
  id?: string;
  className?: string;
  rowRef?: React.Ref<HTMLElement>;
}

const VALUE_TONE = {
  primary: "text-primary-dark",
  good: "text-[#3F9165] dark:text-[#7FC79C]",
  high: "text-status-high",
  faint: "text-charcoal-faint",
} as const;

export const BizRow: React.FC<BizRowProps> = ({
  title,
  desc,
  icon: Icon,
  well = "sub",
  value,
  valueTone = "primary",
  value2,
  valueAction,
  badge,
  trailing,
  drop,
  toggle,
  radio,
  checked,
  danger,
  dim,
  onClick,
  disabled,
  chevron,
  ariaLabel,
  extra,
  id,
  className,
  rowRef,
}) => {
  const index = well === "index";
  const hasIcon = !!Icon && !radio;
  const showChevron = chevron ?? (!!onClick && !toggle && !radio && value === undefined && !value2 && !checked);
  const rowCls = clsx(
    "biz-row relative w-full flex items-center text-start",
    // The first row in a card draws no rule (source ruleShow: k ? block : none).
    "[&:first-child>.biz-rule]:hidden",
    className
  );
  const style: React.CSSProperties = { minHeight: 56.6, paddingBlock: "6.7px 9.3px", paddingInline: "14px 15px", gap: 11, opacity: dim ? 0.5 : undefined };

  const body = (
    <>
      <span aria-hidden className={clsx("biz-rule absolute top-0 h-px pointer-events-none", RULE_BG)} style={{ insetInlineStart: hasIcon ? (index ? 55 : 61) : 14, insetInlineEnd: 15 }} />
      {hasIcon && Icon && (
        <span
          aria-hidden
          className={clsx(
            "flex items-center justify-center shrink-0",
            index
              ? danger
                ? "bg-status-high text-white"
                : "bg-th-8e7fd0 text-white"
              : danger
                ? "bg-status-high-bg text-status-high"
                : "bg-th-f0edf9 dark:bg-th-aea1dc/[0.14] text-th-7d67d9 dark:text-th-9a8cd6"
          )}
          style={{ width: index ? 30 : 36, height: index ? 30 : 36, borderRadius: index ? 10 : 11 }}
        >
          <Icon size={index ? 14 : 17} strokeWidth={index ? 1.25 : 1.75} absoluteStrokeWidth={index} />
        </span>
      )}
      {radio && (
        <span
          aria-hidden
          className={clsx("flex items-center justify-center shrink-0 rounded-full border-2", radio.selected ? "border-primary-dark" : "border-th-9a94b3")}
          style={{ width: 20, height: 20 }}
        >
          {radio.selected && <span className="block rounded-full bg-primary-dark" style={{ width: 10, height: 10 }} />}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className={clsx("block text-[12px] font-bold leading-[16px] break-words", danger ? "text-status-high" : "text-charcoal")}>{title}</span>
        {desc && (
          <span className={clsx("block text-[10px] leading-[13px]", DESC)} style={{ marginTop: 5, textWrap: "pretty" } as React.CSSProperties}>
            {desc}
          </span>
        )}
        {extra}
      </span>
      {badge !== undefined && badge !== null && (
        <span
          className="inline-flex items-center justify-center shrink-0 rounded-full bg-primary text-white dark:text-[#0D0B1A] text-[10.5px] font-extrabold"
          style={{ minWidth: 20, height: 20, padding: "0 6px" }}
        >
          {badge}
        </span>
      )}
      {trailing}
      {value !== undefined && value !== null && !valueAction && (
        <span className={clsx("shrink-0 whitespace-nowrap text-[11.5px] font-bold", VALUE_TONE[valueTone])}>{value}</span>
      )}
      {value !== undefined && valueAction && (
        <button type="button" onClick={valueAction} className={clsx("tap relative z-[1] shrink-0 whitespace-nowrap text-[11.5px] font-bold", VALUE_TONE[valueTone])} style={{ minHeight: 44 }}>
          {value}
        </button>
      )}
      {value2 && (
        <button
          type="button"
          onClick={value2.onClick}
          disabled={value2.disabled}
          className="tap relative z-[1] shrink-0 whitespace-nowrap text-[11.5px] font-bold text-status-high disabled:opacity-40"
          style={{ minHeight: 44, marginInlineStart: -5 }}
        >
          {value2.label}
        </button>
      )}
      {drop && <ChevronDown size={14} strokeWidth={2.4} aria-hidden className="shrink-0 text-primary-dark" style={{ marginInlineStart: -6 }} />}
      {toggle && (
        <span className="relative z-[1] shrink-0 flex [html.high-contrast_&_button[aria-checked=false]]:outline [html.high-contrast_&_button[aria-checked=false]]:outline-1 [html.high-contrast_&_button[aria-checked=false]]:outline-[#5B5349]">
          <Toggle size="onboarding" checked={toggle.checked} onChange={toggle.onChange} disabled={toggle.disabled} label={toggle.label ?? (typeof title === "string" ? title : undefined)} />
        </span>
      )}
      {checked && <Check size={16} strokeWidth={2.6} aria-hidden className="shrink-0 text-primary-dark" />}
      {showChevron && <ChevronRight size={14} aria-hidden className={clsx("shrink-0", DESC)} />}
    </>
  );

  if (toggle || valueAction || value2) {
    return (
      <div id={id} ref={rowRef as React.Ref<HTMLDivElement>} role={toggle ? "group" : undefined} aria-label={ariaLabel} className={rowCls} style={style}>
        {/* A row that opens a page and also carries its own value action
            (Business ID "Copy", Approve / Deny): the row is a full-size
            button underneath, the value buttons sit above it. */}
        {onClick && <button type="button" onClick={onClick} aria-label={typeof title === "string" ? title : ariaLabel} className="tap absolute inset-0 w-full" />}
        {body}
      </div>
    );
  }
  if (onClick || radio) {
    return (
      <button
        id={id}
        ref={rowRef as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        disabled={disabled}
        role={radio ? "radio" : undefined}
        aria-checked={radio ? radio.selected : undefined}
        aria-label={ariaLabel}
        className={clsx("tap", rowCls, disabled && "cursor-not-allowed")}
        style={style}
      >
        {body}
      </button>
    );
  }
  return (
    <div id={id} ref={rowRef as React.Ref<HTMLDivElement>} aria-label={ariaLabel} className={rowCls} style={style}>
      {body}
    </div>
  );
};

/** A "Soon" chip after a dimmed row's title (OURS-MO1B-payment-methods row 1). */
export const SoonChip: React.FC<{ label?: string }> = ({ label = "Soon" }) => (
  <span className="ms-1.5 inline-flex items-center rounded-full bg-primary-pale text-primary-dark text-[9.5px] font-extrabold uppercase tracking-[0.06em] align-middle" style={{ padding: "2px 8px" }}>
    {label}
  </span>
);

// ---------------------------------------------------------------------------
// Hero (seats, plan, business ID, payouts)

export const BizHero: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  actions?: { label: string; icon: LucideIcon; onClick: () => void; primary?: boolean; disabled?: boolean }[];
}> = ({ label, value, sub, actions }) => (
  <div className={clsx(LIST_BG, "text-center")} style={{ borderRadius: 18, padding: 16, marginBottom: 16 }}>
    <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-charcoal-faint">{label}</p>
    <p className={clsx("text-[28px] font-extrabold tracking-[0.08em] leading-[36px] tabular-nums break-words", DEEP)} style={{ marginTop: 6 }}>
      {value}
    </p>
    {sub && <p className="text-[11.5px] leading-[16px] text-charcoal-faint" style={{ marginTop: 4 }}>{sub}</p>}
    {actions && actions.length > 0 && (
      <div className="flex justify-center flex-wrap" style={{ gap: 8, marginTop: 12 }}>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            disabled={a.disabled}
            className={clsx(
              "tap flex items-center text-[13px] font-extrabold border disabled:opacity-40",
              a.primary ? "bg-primary-fill text-on-primary-fill border-transparent" : clsx("bg-cream-card text-charcoal", BORDER)
            )}
            style={{ height: 40, padding: "0 16px", borderRadius: 12, gap: 6 }}
          >
            <a.icon size={15} strokeWidth={2.2} aria-hidden />
            {a.label}
          </button>
        ))}
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Buttons

/** 52 tall r16 primary 15/800 (pg.btn / sh.btn). */
export const BizButton: React.FC<{ label: string; onClick?: () => void; disabled?: boolean; busy?: boolean; tone?: "primary" | "danger"; className?: string; type?: "button" | "submit" }> = ({
  label,
  onClick,
  disabled,
  busy,
  tone = "primary",
  className,
  type = "button",
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || busy}
    aria-busy={busy || undefined}
    className={clsx(
      "tap w-full flex items-center justify-center text-[15px] font-extrabold disabled:opacity-40",
      tone === "danger" ? "bg-status-high text-white dark:text-[#0D0B1A]" : "bg-primary-fill text-on-primary-fill",
      className
    )}
    style={{ marginTop: 6, minHeight: 52, borderRadius: 16 }}
  >
    {label}
  </button>
);

/** 48 tall r16 soft 14/700 (sh.b2). */
export const BizButtonSoft: React.FC<{ label: string; onClick: () => void; tone?: "ink" | "high"; disabled?: boolean; className?: string }> = ({ label, onClick, tone = "ink", disabled, className }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={clsx("tap w-full flex items-center justify-center bg-cream-soft text-[14px] font-bold disabled:opacity-40", tone === "high" ? "text-status-high" : "text-charcoal", className)}
    style={{ marginTop: 8, minHeight: 48, borderRadius: 16 }}
  >
    {label}
  </button>
);

// ---------------------------------------------------------------------------
// Sheet and its fields (MO1B-014)

export const BizSheet: React.FC<{ open: boolean; onClose: () => void; title: string; lead?: React.ReactNode; leadTone?: "soft" | "high"; children: React.ReactNode }> = ({
  open,
  onClose,
  title,
  lead,
  leadTone = "soft",
  children,
}) => (
  <BottomSheet open={open} onClose={onClose} title={title} chrome="market" tone="business" headerHeight={58}>
    {lead && (
      <p className={clsx("text-[12.5px] leading-[18px]", leadTone === "high" ? "font-bold text-status-high" : "text-charcoal-soft")} style={{ marginBottom: 12, textWrap: "pretty" } as React.CSSProperties}>
        {lead}
      </p>
    )}
    {children}
  </BottomSheet>
);

export const FieldLabel: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-[12px] font-bold text-charcoal-soft" style={{ marginBottom: 6 }}>
    {children}
  </label>
);

export const FieldError: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  <p id={id} role="alert" className="text-[11.5px] font-bold text-status-high" style={{ marginTop: 5 }}>
    {children}
  </p>
);

const fieldBox = (error?: boolean) =>
  clsx("flex items-center bg-cream-soft border-[1.5px]", error ? "border-status-high" : BORDER);

/** min-height 46, r14, soft, 1.5 border, padding 0 12, gap 8, 13.5/700, trailing icon 16 / 2.2 faint. */
export const BizField: React.FC<{
  id: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  icon?: LucideIcon | React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  placeholder?: string;
  error?: string | null;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
  after?: React.ReactNode;
}> = ({ id, label, value, onChange, icon: Icon, placeholder, error, type = "text", inputMode, maxLength, disabled, autoComplete, className, after }) => (
  <div className={className} style={{ marginBottom: 12 }}>
    {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
    <div className="flex" style={{ gap: 8 }}>
      <div className={clsx(fieldBox(!!error), "flex-[3] min-w-0")} style={{ minHeight: 46, borderRadius: 14, padding: "0 12px", gap: 8 }}>
        <input
          id={id}
          type={type}
          value={value}
          inputMode={inputMode}
          maxLength={maxLength}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] font-bold leading-[19px] text-charcoal placeholder:text-charcoal-faint placeholder:font-semibold"
        />
        {Icon && <Icon size={16} strokeWidth={2.2} aria-hidden className="shrink-0 text-charcoal-faint" />}
      </div>
      {after}
    </div>
    {error && <FieldError id={`${id}-err`}>{error}</FieldError>}
  </div>
);

/** A field that opens something (hours, dropdown): same box, a button. */
export const BizFieldButton: React.FC<{
  id: string;
  label?: string;
  value: React.ReactNode;
  placeholder?: boolean;
  icon?: LucideIcon;
  /** Without onClick the field is a read-only display (Add seats: Price per block, New total). */
  onClick?: () => void;
  expanded?: boolean;
  disabled?: boolean;
  error?: string | null;
}> = ({ id, label, value, placeholder, icon: Icon, onClick, expanded, disabled, error }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
    {!onClick ? (
      <div id={id} className={clsx(fieldBox(false), "w-full")} style={{ minHeight: 46, borderRadius: 14, padding: "0 12px", gap: 8 }}>
        <span className="flex-1 min-w-0 truncate text-[13.5px] font-bold leading-[19px] text-charcoal">{value}</span>
        {Icon && <Icon size={16} strokeWidth={2.2} aria-hidden className="shrink-0 text-charcoal-faint" />}
      </div>
    ) : (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={expanded}
      className={clsx(fieldBox(!!error), "tap w-full text-start disabled:opacity-40")}
      style={{ minHeight: 46, borderRadius: 14, padding: "0 12px", gap: 8 }}
    >
      <span className={clsx("flex-1 min-w-0 truncate text-[13.5px] font-bold leading-[19px]", placeholder ? "text-charcoal-faint" : "text-charcoal")}>{value}</span>
      {Icon && <Icon size={16} strokeWidth={2.2} aria-hidden className="shrink-0 text-charcoal-faint" />}
    </button>
    )}
    {error && <FieldError>{error}</FieldError>}
  </div>
);

/** In-flow dropdown list (MO1B-015 row 3; options 44 min, OURS row 4). */
export function BizDropdown<V extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: { value: V; label: string }[];
  value: V | null;
  onPick: (v: V) => void;
}) {
  return (
    <div
      role="listbox"
      aria-label={label}
      className="flex flex-col bg-cream-card border border-th-aea1dc/50"
      style={{ gap: 6, marginTop: 8, marginBottom: 12, borderRadius: 14, boxShadow: "0 12px 32px rgba(95,80,147,0.18)", padding: 8 }}
    >
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={sel}
            onClick={() => onPick(o.value)}
            className={clsx("tap flex items-center text-start border", BORDER, sel ? LIST_BG : "bg-cream-card")}
            style={{ gap: 10, borderRadius: 8, padding: "0 10px", minHeight: 44 }}
          >
            <span className="flex-1 text-[13px] font-bold text-charcoal">{o.label}</span>
            {sel && <Check size={16} strokeWidth={2.6} aria-hidden className="text-primary-dark" />}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pop-ups

/** BizMoreV8 hasPop: left / right 20, r24, padding 20 18 16, title 17/800 + close 36. */
export const BizPopup: React.FC<{ open: boolean; onClose: () => void; title: string; lead?: React.ReactNode; children: React.ReactNode }> = ({ open, onClose, title, lead, children }) => {
  useBackCloses(open, onClose);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ padding: "0 calc(var(--app-gutter, 0px) + 20px)" }}>
      <div className="absolute inset-0 animate-fade-in" style={{ background: "rgba(36,31,27,0.4)" }} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-[390px] bg-cream-card animate-pop" style={{ borderRadius: 24, padding: "20px 18px 16px", boxShadow: "0 20px 48px rgba(36,31,27,0.28)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <p className="text-[17px] font-extrabold text-charcoal">{title}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="tap flex items-center justify-center text-charcoal-faint" style={{ width: 36, height: 36 }}>
            <X size={18} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
        {lead && (
          <p className="text-[12.5px] leading-[18px] text-charcoal-soft" style={{ marginBottom: 12, textWrap: "pretty" } as React.CSSProperties}>
            {lead}
          </p>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
};

/** 48 r14 fill 14/800 (pop.btn). */
export const PopButton: React.FC<{ label: string; onClick: () => void; disabled?: boolean; busy?: boolean }> = ({ label, onClick, disabled, busy }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || busy}
    className="tap w-full flex items-center justify-center bg-primary-fill text-on-primary-fill text-[14px] font-extrabold disabled:opacity-40"
    style={{ marginTop: 6, minHeight: 48, borderRadius: 14 }}
  >
    {label}
  </button>
);

/** BizMoreV8 hasConfirm (MO1B-042): the kit-frame stacked pop-up, a high disc and a pale-red action. */
export const BizConfirm: React.FC<{
  open: boolean;
  icon: LucideIcon;
  title: string;
  body: string;
  action: string;
  cancel: string;
  onAction: () => void;
  onCancel: () => void;
  busy?: boolean;
  /** An outlined second action between the two (a two-way choice). */
  secondary?: { label: string; onClick: () => void };
}> = ({ open, icon: Icon, title, body, action, cancel, onAction, onCancel, busy, secondary }) => (
  <ConfirmCard
    open={open}
    layout="stacked"
    frame="kit"
    tone="destructive"
    icon={<Icon size={20} strokeWidth={2.2} />}
    title={title}
    subtitle={body}
    confirmLabel={action}
    cancelLabel={cancel}
    busy={busy}
    secondary={secondary}
    onConfirm={onAction}
    onCancel={onCancel}
  />
);

// ---------------------------------------------------------------------------
// States

/** Rows skeleton: a 36 tile block and two text bars per row. */
export const RowsSkeleton: React.FC<{ rows?: number; label?: string }> = ({ rows = 3, label = "Loading" }) => (
  <div aria-busy="true" aria-label={label} className={LIST_BG} style={{ borderRadius: 18, padding: "4px 0", marginBottom: 13 }}>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex items-center" style={{ minHeight: 56.6, paddingBlock: "6.7px 9.3px", paddingInline: "14px 15px", gap: 11 }}>
        <span className="block shrink-0 bg-cream-soft dark:bg-white/[0.06] animate-skeleton-pulse" style={{ width: 36, height: 36, borderRadius: 11 }} />
        <span className="flex-1">
          <span className="block bg-cream-soft dark:bg-white/[0.06] animate-skeleton-pulse" style={{ width: "55%", height: 10, borderRadius: 5 }} />
          <span className="block bg-cream-soft dark:bg-white/[0.06] animate-skeleton-pulse" style={{ width: "35%", height: 8, borderRadius: 4, marginTop: 8 }} />
        </span>
      </div>
    ))}
  </div>
);

/** "Couldn't load this. Try again." 12/600 high + Retry 12.5/800 primary-dark (44). */
export const LoadError: React.FC<{ message?: string; onRetry: () => void }> = ({ message = "Couldn't load this. Try again.", onRetry }) => (
  <div role="alert" className="flex items-center justify-between gap-3" style={{ marginBottom: 13 }}>
    <p className="text-[12px] font-semibold text-status-high">{message}</p>
    <button type="button" onClick={onRetry} className="tap shrink-0 text-[12.5px] font-extrabold text-primary-dark" style={{ minHeight: 44 }}>
      Retry
    </button>
  </div>
);


// ---------------------------------------------------------------------------
// Bits

/** Text input on the bare card for a search field (MO1B-050 row 2). */
export const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string; label: string; icon: LucideIcon; onClear?: () => void }> = ({
  value,
  onChange,
  placeholder,
  label,
  icon: Icon,
  onClear,
}) => (
  <label className={clsx("flex items-center bg-cream-soft border", BORDER)} style={{ height: 44, borderRadius: 14, padding: "0 12px", gap: 8, marginBottom: 14 }}>
    <Icon size={16} aria-hidden className="shrink-0 text-charcoal-faint" />
    <input
      type="search"
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 min-w-0 bg-transparent outline-none text-charcoal placeholder:text-charcoal-faint [&::-webkit-search-cancel-button]:hidden"
      style={{ fontSize: textPx(13.5), lineHeight: linePx(19) }}
    />
    {value && onClear && (
      <button type="button" onClick={onClear} aria-label="Clear search" className="tap shrink-0 flex items-center justify-center text-charcoal-faint" style={{ width: 28, height: 28 }}>
        <X size={15} aria-hidden />
      </button>
    )}
  </label>
);


