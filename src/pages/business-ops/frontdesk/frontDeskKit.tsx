import React from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Plus, type LucideIcon } from "lucide-react";
import { textPx } from "../../../theme/textSize";

// v6 Batch 4 · the BizTypeKit pieces the gym Front desk is drawn with
// (OP1-013 / 016 / 017, source BizTypeKit.dc.html palette L / D lines 58-59).
// Every colour goes through the app's tokens, which carry the handover values
// in Centium light and dark (and map them in the other four themes):
//   ink #241F1B / #F5F3FA = charcoal · inkSoft #5B5349 / #B8B3C7 = charcoal-soft
//   faint #8C8378 / #B8B3C7 = charcoal-faint · list #F7F7FC / rgba(174,161,220,0.10)
//   rule #EBEAF6 / rgba(174,161,220,0.16) · fill #AEA1DC / #A991FE = primary-fill
//   onFill #FFFFFF / #0D0B1A · pale #F0EDF9 / #303141 = primary-pale
//   pDark #7D6BB5 / #C3B3FB = primary-dark · good / high / warn / soft chips.
// Sizes in Tailwind px classes follow Larger text through the build; inline
// sizes go through textPx().

export const LIST = "bg-[#F7F7FC] dark:bg-th-aea1dc/[0.10]";
export const RULE = "bg-th-ebeaf6 dark:bg-th-aea1dc/[0.16]";
export const RULE_BORDER = "border-th-ebeaf6 dark:border-th-aea1dc/[0.16]";
/** OpsTabsV4 card edge: rgba(36,31,27,0.11) / rgba(245,243,250,0.08). */
export const OPS_BORDER = "border-charcoal/[0.11] dark:border-charcoal/[0.08]";
/** OpsTabsV4 divider: rgba(36,31,27,0.06) / rgba(245,243,250,0.06). */
export const OPS_DIVIDER = "border-charcoal/[0.06]";
export const OPS_DIVIDER_BG = "bg-charcoal/[0.06]";

// ---------------------------------------------------------------------------
// Header (OP1-013 rows 2-3, OURS-scan E1)

export const DeskHeader: React.FC<{ kicker: string; title: string; sub?: string; action?: React.ReactNode }> = ({ kicker, title, sub, action }) => (
  <div className="flex items-start" style={{ gap: 10, marginBottom: 14 }}>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-bold leading-[16.5px] text-charcoal-faint">{kicker}</p>
      <h1 className="text-[24px] font-bold tracking-[-0.02em] leading-[30px] text-charcoal" style={{ textWrap: "pretty" } as React.CSSProperties}>
        {title}
      </h1>
      {sub && <p className="text-[12.5px] leading-[18px] text-charcoal-faint" style={{ marginTop: 2 }}>{sub}</p>}
    </div>
    {action}
  </div>
);

/** OURS-scan E1: 40 round, no fill, 20 glyph inkSoft, 44 hit box. */
export const HeaderIconButton: React.FC<{ icon: LucideIcon; label: string; onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="tap shrink-0 flex items-center justify-center rounded-full text-charcoal-soft"
    style={{ width: 40, height: 40, marginInlineEnd: -8, marginTop: 6 }}
  >
    <Icon size={20} aria-hidden />
  </button>
);

// ---------------------------------------------------------------------------
// Text tabs (OP1-013 rows 4-5, HANDOVER 2.2 Tabs)

export function TextTabs<K extends string>({ tabs, value, onChange, label }: { tabs: { key: K; label: string }[]; value: K; onChange: (k: K) => void; label: string }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={clsx("flex border-b", RULE_BORDER)}
      style={{ gap: 20, marginBottom: 16 }}
    >
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`fd-tab-${t.key}`}
            aria-selected={on}
            aria-controls={`fd-panel-${t.key}`}
            onClick={() => onChange(t.key)}
            className={clsx(
              "tap relative shrink-0 whitespace-nowrap text-[13.5px] leading-[1.5] border-b-2",
              on ? "font-extrabold text-charcoal border-primary" : "font-semibold text-charcoal-faint border-transparent"
            )}
            style={{ padding: "8px 0 10px", marginBottom: -1 }}
          >
            {/* Reserve the bold width so the row does not jump (OP1-017 row 2). */}
            <span aria-hidden className="invisible block h-0 overflow-hidden font-extrabold">
              {t.label}
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section label (OP1-013 rows 13-14)

export const DeskLabel: React.FC<{ children: React.ReactNode; action?: { label: string; onClick: () => void; ariaLabel?: string }; trailing?: React.ReactNode }> = ({ children, action, trailing }) => (
  <div className="flex items-end justify-between gap-2 border-b-[1.5px] border-primary" style={{ paddingBottom: 7.5, margin: "4px 2px 12px" }}>
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] leading-[14px] text-charcoal-faint rtl:tracking-normal">{children}</h2>
    {action ? (
      <button type="button" onClick={action.onClick} aria-label={action.ariaLabel} className="tap shrink-0 text-[12px] font-bold leading-[14px] text-primary-dark">
        {action.label}
      </button>
    ) : (
      trailing
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Number boxes (OP1-013 rows 6-8)

export const NumberBoxes: React.FC<{ items: { label: string; value: string }[] }> = ({ items }) => (
  <div className="grid grid-cols-3" style={{ gap: 8, marginBottom: 14 }}>
    {items.map((b) => (
      <div key={b.label} className={clsx(LIST, "min-w-0")} style={{ borderRadius: 16, padding: "12px 10px", minHeight: 70 }}>
        <p className={clsx("text-[24px] font-extrabold leading-[28px] tabular-nums whitespace-nowrap", b.value === "–" ? "text-charcoal-tertiary" : "text-charcoal")}>{b.value}</p>
        <p className="text-[11px] font-semibold leading-[14px] text-charcoal-faint" style={{ marginTop: 4, textWrap: "pretty" } as React.CSSProperties}>
          {b.label}
        </p>
      </div>
    ))}
  </div>
);

export const NumberBoxesSkeleton: React.FC = () => (
  <div aria-hidden className="grid grid-cols-3" style={{ gap: 8, marginBottom: 14 }}>
    {[0, 1, 2].map((i) => (
      <div key={i} className={LIST} style={{ borderRadius: 16, padding: "12px 10px", height: 70 }}>
        <span className="block bg-cream-soft animate-skeleton-pulse" style={{ width: 24, height: 28, borderRadius: 6 }} />
        <span className="block bg-cream-soft animate-skeleton-pulse" style={{ width: 60, height: 10, borderRadius: 5, marginTop: 6 }} />
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// List rows (OP1-013 rows 15-22)

export const ListCard: React.FC<{ children: React.ReactNode; label?: string }> = ({ children, label }) => (
  <div role={label ? "list" : undefined} aria-label={label} className={LIST} style={{ borderRadius: 18, padding: "2px 14px", marginBottom: 14 }}>
    {children}
  </div>
);

export type ChipTone = "good" | "high" | "warn" | "pale" | "soft";
const CHIP: Record<ChipTone, string> = {
  good: "bg-status-good-bg text-status-good",
  high: "bg-status-high-bg text-status-high",
  warn: "bg-status-caution-bg text-caution-text",
  pale: "bg-primary-pale text-primary-dark",
  soft: "bg-cream-soft text-charcoal-faint",
};

/** OP1-013 rows 20-21: 10/800 0.04em uppercase, padding 3 8, r999. */
export const StatusChip: React.FC<{ tone: ChipTone; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={clsx("inline-flex items-center shrink-0 whitespace-nowrap rounded-full text-[10px] font-extrabold uppercase tracking-[0.04em] leading-[15px]", CHIP[tone])} style={{ padding: "3px 8px" }}>
    {children}
  </span>
);

/** OP1-017 row 10: a chip drawn as an action (Remind), with a 44 hit box. */
export const ChipButton: React.FC<{ tone: ChipTone; label: string; ariaLabel: string; onClick: (el: HTMLElement) => void; disabled?: boolean }> = ({ tone, label, ariaLabel, onClick, disabled }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick(e.currentTarget);
    }}
    aria-label={ariaLabel}
    aria-disabled={disabled || undefined}
    className={clsx("tap inline-flex items-center shrink-0 whitespace-nowrap rounded-full text-[10px] font-extrabold uppercase tracking-[0.04em] leading-[15px]", CHIP[tone], disabled && "opacity-50")}
    style={{ padding: "3px 8px" }}
  >
    {label}
  </button>
);

export const DeskRow: React.FC<{
  icon: LucideIcon;
  title: string;
  sub: string;
  trailing?: React.ReactNode;
  first?: boolean;
  onClick?: (el: HTMLElement) => void;
  ariaLabel?: string;
  menuOpen?: boolean;
}> = ({ icon: Icon, title, sub, trailing, first, onClick, ariaLabel, menuOpen }) => {
  const body = (
    <>
      {!first && <span aria-hidden className={clsx("absolute", RULE)} style={{ top: 0, insetInlineStart: 48, insetInlineEnd: 0, height: 1 }} />}
      <span className="flex items-center justify-center shrink-0 bg-primary-pale text-primary-dark" style={{ width: 36, height: 36, borderRadius: 11 }} aria-hidden>
        <Icon size={17} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1 flex flex-col justify-center text-start">
        <span className="block text-[13.5px] font-bold leading-[18px] text-charcoal truncate [html.larger-text_&]:whitespace-normal">{title}</span>
        <span className="block text-[11.5px] leading-[16px] text-charcoal-faint truncate [html.larger-text_&]:whitespace-normal">{sub}</span>
      </span>
      {trailing}
    </>
  );
  const cls = "relative w-full flex items-center";
  const style: React.CSSProperties = { gap: 12, minHeight: 58, padding: "8px 0" };
  return onClick ? (
    <div role="listitem">
      <button type="button" onClick={(e) => onClick(e.currentTarget)} aria-label={ariaLabel} aria-haspopup={menuOpen !== undefined ? "menu" : undefined} aria-expanded={menuOpen} className={cls} style={style}>
        {body}
      </button>
    </div>
  ) : (
    <div role="listitem" className={cls} style={style}>
      {body}
    </div>
  );
};

export const RowsSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div aria-busy="true" aria-label="Loading" className={LIST} style={{ borderRadius: 18, padding: "2px 14px", marginBottom: 14 }}>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex items-center" style={{ gap: 12, minHeight: 58, padding: "8px 0" }}>
        <span className="block shrink-0 bg-cream-soft animate-skeleton-pulse" style={{ width: 36, height: 36, borderRadius: 11 }} />
        <span className="flex-1">
          <span className="block bg-cream-soft animate-skeleton-pulse" style={{ width: 120, height: 10, borderRadius: 5 }} />
          <span className="block bg-cream-soft animate-skeleton-pulse" style={{ width: 160, height: 8, borderRadius: 4, marginTop: 8 }} />
        </span>
      </div>
    ))}
  </div>
);

/** A one-line list-fill card (OP1-017 O2 "None due", OP1-016 O2). */
export const ListLine: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={clsx(LIST, "text-center text-[11.5px] leading-[16px] text-charcoal-faint")} style={{ borderRadius: 18, padding: 14, marginBottom: 14 }}>
    {children}
  </div>
);

/** OP1-013 O2: list fill r18 padding 14, 13/800 title, 11.5 faint body, Retry 12/700 pDark 44. */
export const ErrorCard: React.FC<{ title: string; onRetry: () => void; body?: string }> = ({ title, onRetry, body = "Check your connection and try again." }) => (
  <div role="alert" className={LIST} style={{ borderRadius: 18, padding: 14, marginBottom: 14 }}>
    <p className="text-[13px] font-extrabold leading-[18px] text-charcoal">{title}</p>
    <p className="text-[11.5px] leading-[16px] text-charcoal-faint" style={{ marginTop: 2 }}>{body}</p>
    <button type="button" onClick={onRetry} className="tap text-[12px] font-bold text-primary-dark" style={{ minHeight: 44 }}>
      Retry
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Empty card (OP1-016 rows 1-4)

export const EmptyCard: React.FC<{ icon: LucideIcon; title: string; body: string; children?: React.ReactNode }> = ({ icon: Icon, title, body, children }) => (
  <div className="text-center border-[1.5px] border-dashed border-primary" style={{ borderRadius: 20, padding: "24px 18px", marginBottom: 14 }}>
    <span className="mx-auto flex items-center justify-center bg-primary-pale text-primary-dark" style={{ width: 48, height: 48, borderRadius: 14 }} aria-hidden>
      <Icon size={22} strokeWidth={1.75} />
    </span>
    <p className="text-[15px] font-extrabold leading-[20px] text-charcoal" style={{ marginTop: 10, textWrap: "balance" } as React.CSSProperties}>
      {title}
    </p>
    <p className="text-[12.5px] leading-[18px] text-charcoal-soft" style={{ marginTop: 4, textWrap: "pretty" } as React.CSSProperties}>
      {body}
    </p>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Fixed CTA (OP1-013 row 23: BizTypeKit 50 / r16 / 14/800; OP1-022 row 19:
// OpsTabsV4 52 / r16 / 14.5/800 with its fade). Bottom 88 over the navbar.

export const FixedCta: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant: "kit" | "ops";
  note?: string;
}> = ({ label, onClick, disabled, variant, note }) => {
  const ops = variant === "ops";
  return createPortal(
    <>
      {ops && (
        <div
          aria-hidden
          className="fixed z-[19] pointer-events-none bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,#FFFFFF_42%)] dark:bg-[linear-gradient(180deg,rgba(18,19,23,0)_0%,#121317_42%)]"
          style={{ left: "var(--app-gutter, 0px)", right: "var(--app-gutter, 0px)", bottom: 0, height: "calc(150px + env(safe-area-inset-bottom))" }}
        />
      )}
      <div className="fixed z-20" style={{ left: "calc(var(--app-gutter, 0px) + 16px)", right: "calc(var(--app-gutter, 0px) + 16px)", bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}>
        {note && (
          <p role="status" className="text-center text-[11.5px] font-semibold leading-[16px] text-charcoal-faint" style={{ marginBottom: 8 }}>
            {note}
          </p>
        )}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          data-fd-cta
          className={clsx(
            "tap w-full flex items-center justify-center bg-primary-fill text-on-primary-fill disabled:opacity-40",
            ops
              ? "shadow-[0_10px_24px_rgba(95,80,147,0.35)] dark:shadow-[0_10px_24px_rgba(0,0,0,0.5)] active:scale-[0.98]"
              : "shadow-[0_6px_16px_rgba(95,80,147,0.22)]"
          )}
          style={{ height: ops ? 52 : 50, borderRadius: 16, gap: 8, fontSize: textPx(ops ? 14.5 : 14), fontWeight: 800 }}
        >
          <Plus size={ops ? 17 : 16} strokeWidth={2.4} aria-hidden />
          {label}
        </button>
      </div>
    </>,
    document.body
  );
};
