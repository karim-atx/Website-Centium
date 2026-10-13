import React from "react";
import clsx from "clsx";
import { CalendarDays, ChevronLeft, ChevronRight, Lock, type LucideIcon } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { linePx, textPx } from "../../theme/textSize";
import { Toggle } from "../ui/Toggle";
import { HEALTH_DISCLAIMER } from "../../services/legal/disclaimer";
import { DISCLAIMER, DISCLAIMER_LONG, PRIVACY_LINE } from "../../services/cycle/guidance";

// The Part B pieces the cycle and contraception pages share
// (health-b-handover.md HE1.10 → HE1.10.b.5, "Shared rules (Health B)").
// Every value is the layout tables' literal; dark from the Dark column, with
// the * derived values recorded in the checklists. Colours come from tokens
// (--c-*, --th-*), so the five colour themes, dark mode and High contrast
// follow (O8 rows).

/** dark / high contrast, read once. */
export function useCycleMode() {
  const { theme, accessibility } = useApp();
  return { dark: theme === "dark", hc: !!accessibility.highContrast };
}

/** 0.5px hairline #241F1B@alpha (dark #F5F3FA@alpha); High contrast 30% of ink (X-09). */
export function hair(dark: boolean, hc: boolean, alpha = 0.08): string {
  if (hc) return "rgb(var(--c-charcoal) / 0.3)";
  return dark ? `rgba(245,243,250,${alpha})` : `rgba(36,31,27,${alpha})`;
}

/** Row divider 1px #AEA1DC@15% (dark #A991FE@15%); High contrast the row token (ink 30%). */
export function rowRule(hc: boolean): string {
  return hc ? "var(--border-row)" : "rgb(var(--c-primary) / 0.15)";
}

/** Type helper: font size / line height / weight, Larger text aware. */
export const type = (size: number, line: number, weight: number, extra?: React.CSSProperties): React.CSSProperties => ({
  fontSize: textPx(size),
  lineHeight: linePx(line),
  fontWeight: weight,
  ...extra,
});

// ---------------------------------------------------------------------------
// Page header

/**
 * The full-page header of a Health B page (HE1.10 #1-#4 / HE1.10.b.1 #1-#4):
 * back 36 r9999 (44 hit area) and the title 24/30 700 ls-0.5 #241F1B (dark
 * #F5F3FA), gap 6. Tab pages draw ChevronLeft 20 #5B5349 (dark #B8B3C7);
 * sub-pages (HE1.10.b.1 – .b.3) 22 in the title ink. V6-131: no second
 * button.
 */
export const CycleTitleRow: React.FC<{ title: string; onBack: () => void; sub?: boolean }> = ({ title, onBack, sub }) => (
  <div className="flex items-center" style={{ gap: 6, minHeight: 36, marginLeft: -8 }}>
    <button
      type="button"
      onClick={onBack}
      aria-label="Back"
      className="tap shrink-0 grid place-items-center rounded-full relative before:absolute before:-inset-1 before:content-['']"
      style={{ width: 36, height: 36 }}
    >
      <ChevronLeft
        size={sub ? 22 : 20}
        aria-hidden
        className="rtl:-scale-x-100"
        style={{ color: sub ? "rgb(var(--c-charcoal))" : "rgb(var(--c-charcoal-soft))" }}
      />
    </button>
    <h1 className="flex-1 min-w-0 line-clamp-2 text-charcoal" style={type(24, 30, 700, { letterSpacing: -0.5 })}>
      {title}
    </h1>
  </div>
);

// ---------------------------------------------------------------------------
// Open Settings layout (HE1.10.b, HE1.10.b.2, HE1.10.b.3)

/**
 * Section label 11/14 600 ls1.5 uppercase #7D67D9 (dark #9A8CD6; High
 * contrast #4B3BA0 through --c-primary-accent) and, 8 below, a 1.5 line
 * #AEA1DC (dark #A991FE).
 */
export const CycleSection: React.FC<{
  label: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}> = ({ label, children, className, style, id }) => {
  const labelId = React.useId();
  return (
    <section aria-labelledby={labelId} className={className} style={style} id={id}>
      <h2
        id={labelId}
        className="uppercase text-primary-accent rtl:tracking-normal"
        style={type(11, 14, 600, { letterSpacing: 1.5 })}
      >
        {label}
      </h2>
      <div aria-hidden style={{ marginTop: 8, height: 1.5, background: "rgb(var(--c-primary))" }} />
      {children}
    </section>
  );
};

/** Tile 36 r11 #F0EDF9 (dark #303141) with an 18 glyph #7D6BB5 (dark #C3B3FB). */
export const CycleTile: React.FC<{ icon?: LucideIcon; glyph?: React.ReactNode; destructive?: boolean }> = ({ icon: Icon, glyph, destructive }) => {
  const { dark } = useCycleMode();
  return (
    <span
      aria-hidden
      className="shrink-0 grid place-items-center"
      style={{
        width: 36,
        height: 36,
        borderRadius: 11,
        // Delete tile (HE1.10.b #33): #FCEDEC, dark #3C2A30; glyph #C0392B / #F09A8E.
        background: destructive ? (dark ? "#3C2A30" : "#FCEDEC") : "rgb(var(--c-primary-pale))",
        color: destructive ? "rgb(var(--c-status-high))" : "rgb(var(--c-primary-dark))",
      }}
    >
      {glyph ?? (Icon && <Icon size={18} strokeWidth={1.75} />)}
    </span>
  );
};

/**
 * One row of the open Settings layout: pad 12 0, gap 14, tile 36, title
 * 14/19 600, subtitle 11/15 400 #8C8378, a value 12.5/18.8 400 #8C8378 + a
 * ChevronRight 16, or a toggle. The 1px divider (#AEA1DC@15%) starts at the
 * text column (x 66.5, 50 in) and is absent under the last row of a section.
 */
export const CycleRow: React.FC<{
  icon?: LucideIcon;
  glyph?: React.ReactNode;
  /** Avatar or other leading element in place of the tile. */
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  subtitleColor?: string;
  value?: React.ReactNode;
  onClick?: () => void;
  toggle?: { checked: boolean; onChange: (on: boolean) => void; disabled?: boolean; label?: string };
  trailing?: React.ReactNode;
  destructive?: boolean;
  last?: boolean;
  className?: string;
  ariaLabel?: string;
}> = ({ icon, glyph, leading, title, subtitle, subtitleColor, value, onClick, toggle, trailing, destructive, last, className, ariaLabel }) => {
  const { hc } = useCycleMode();
  const body = (
    <>
      {leading ?? ((icon || glyph) && <CycleTile icon={icon} glyph={glyph} destructive={destructive} />)}
      <span className="flex-1 min-w-0 text-start">
        <span
          className="block break-words"
          style={type(14, 19, 600, { color: destructive ? "rgb(var(--c-status-high))" : "rgb(var(--c-charcoal))" })}
        >
          {title}
        </span>
        {subtitle && (
          <span className="block" style={type(11, 15, 400, { color: subtitleColor ?? "rgb(var(--c-charcoal-faint))" })}>
            {subtitle}
          </span>
        )}
      </span>
      {value !== undefined && value !== null && (
        <span className="shrink-0 max-w-[45%] truncate text-charcoal-faint" style={type(12.5, 18.8, 400)}>
          {value}
        </span>
      )}
      {trailing}
    </>
  );
  const rule = !last && (
    <span aria-hidden className="absolute bottom-0 end-0 pointer-events-none" style={{ insetInlineStart: 50, height: 1, background: rowRule(hc) }} />
  );
  const cls = clsx("relative w-full flex items-center", className);
  const style: React.CSSProperties = { gap: 14, padding: "calc(12px + var(--row-extra, 0px) / 2) 0" };
  if (toggle)
    return (
      <div className={cls} style={style}>
        {body}
        <Toggle checked={toggle.checked} onChange={toggle.onChange} disabled={toggle.disabled} label={toggle.label ?? (typeof title === "string" ? title : undefined)} />
        {rule}
      </div>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className={clsx("tap", cls)} style={style}>
        {body}
        <ChevronRight size={16} aria-hidden className="shrink-0 text-charcoal-faint rtl:-scale-x-100" style={{ marginInlineStart: -10 }} />
        {rule}
      </button>
    );
  return (
    <div className={cls} style={style}>
      {body}
      {rule}
    </div>
  );
};

/** Help line under a row or section: 11/16 400 #8C8378 (HE1.10.b #15). */
export const CycleHelp: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; className?: string }> = ({ children, style, className }) => (
  <p className={clsx("text-charcoal-faint", className)} style={type(11, 16, 400, style)}>
    {children}
  </p>
);

// ---------------------------------------------------------------------------
// Cards and labels

/** Card r18 0.5px #241F1B@8% (dark #1C1F28 / #F5F3FA@8%). */
export const CycleCard: React.FC<{ children: React.ReactNode; padding?: string; className?: string; style?: React.CSSProperties; ariaLabel?: string }> = ({
  children,
  padding = "14px",
  className,
  style,
  ariaLabel,
}) => {
  const { dark, hc } = useCycleMode();
  return (
    <section
      aria-label={ariaLabel}
      className={clsx("bg-cream-card", className)}
      style={{ borderRadius: 18, padding, border: `0.5px solid ${hair(dark, hc)}`, ...style }}
    >
      {children}
    </section>
  );
};

/** Card label 9.5/14.3 800 ls1.3 uppercase #5F5093 (dark #C3B3FB; High contrast #4B3BA0). */
export const CapsLabel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; as?: "p" | "h2" | "h3" }> = ({ children, style, as: Tag = "h2" }) => (
  <Tag className="uppercase text-primary-deep-text" style={type(9.5, 14.3, 800, { letterSpacing: 1.3, ...style })}>
    {children}
  </Tag>
);

// ---------------------------------------------------------------------------
// The footer lines every cycle tab ends with (HE1.10 #42-#46)

/** Privacy line: Lock 12 + 11/16 400 #5B5349, V6-12 wording. */
export const PrivacyLine: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <p className="flex items-start text-charcoal-soft" style={{ gap: 6, ...type(11, 16, 400), ...style }}>
    <Lock size={12} aria-hidden className="shrink-0" style={{ marginTop: 2 }} />
    <span>{PRIVACY_LINE}</span>
  </p>
);

/**
 * Privacy line (m-top 14), "Estimates · Not a method of contraception"
 * 10.5/15.8 600 #8C8378 (m-top 12), DISCLAIMER_LONG 10/14.5 400 pad 0 8
 * (m-top 4), and the health disclaimer 10.5/15.8 400 #5B5349 (m-top 10). The
 * board centres the three disclaimer lines (pixels).
 */
export const CycleFooter: React.FC<{ privacy?: boolean; className?: string }> = ({ privacy = true, className }) => (
  <div className={className}>
    {privacy && <PrivacyLine style={{ marginTop: 14 }} />}
    <p className="text-center text-charcoal-faint" style={type(10.5, 15.8, 600, { marginTop: 12 })}>
      {DISCLAIMER}
    </p>
    <p className="text-center text-charcoal-faint" style={type(10, 14.5, 400, { marginTop: 4, padding: "0 8px" })}>
      {DISCLAIMER_LONG}
    </p>
    <p className="text-center text-charcoal-soft" style={type(10.5, 15.8, 400, { marginTop: 10 })}>
      {HEALTH_DISCLAIMER}
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// Options and popup buttons

/**
 * Smooth-square option (HE1.10.b #30-#31, HE1.9.b.3 #38-#39): r11, pad 0 12
 * (14 in sheets), 12/18 700 (12.5/18.8 in sheets); idle #F5F4FE #5B5349
 * (dark #303141 / #B8B3C7), selected #A79AD5 white (dark #A991FE / #0D0B1A;
 * High contrast #5B48B8 through --c-seg-active).
 */
export const OptionButton: React.FC<{
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: "settings" | "sheet" | "tall";
  disabled?: boolean;
  role?: "radio" | "checkbox";
  className?: string;
  style?: React.CSSProperties;
}> = ({ selected, onClick, children, size = "settings", disabled, role = "checkbox", className, style }) => {
  const sheet = size === "sheet";
  const tall = size === "tall";
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "tap shrink-0 inline-flex items-center justify-center text-center disabled:opacity-40",
        selected ? "bg-seg-active" : "bg-th-f5f4fe dark:bg-th-303141",
        className
      )}
      style={{
        minHeight: tall ? 48 : sheet ? 36 : 34,
        borderRadius: tall ? 12 : 11,
        padding: tall ? "6px 10px" : sheet ? "0 14px" : "0 12px",
        color: selected ? "rgb(var(--c-on-primary-fill))" : "rgb(var(--c-charcoal-soft))",
        ...(tall ? type(12, 15.6, 700) : sheet ? type(12.5, 18.8, 700) : type(12, 18, 700)),
        ...style,
      }}
    >
      {children}
    </button>
  );
};

/**
 * The two buttons of a Part B centred popup (HE1.10.b.4 #34-#35, .b.5
 * #32-#33): side by side, gap 8, 46 tall r14 14/21 700. Left: outline 0.5px
 * #241F1B@14% ink #5B5349 (dark #F5F3FA@14% / #B8B3C7). Right: primary
 * #9A8CD6 white (dark #A991FE / #0D0B1A) or destructive #C0392B white (dark
 * #F09A8E with #0D0B1A ink, V6-02).
 */
export const PopupButtons: React.FC<{
  cancel: string;
  onCancel: () => void;
  confirm: string;
  onConfirm: () => void;
  destructive?: boolean;
  busy?: boolean;
}> = ({ cancel, onCancel, confirm, onConfirm, destructive, busy }) => {
  const { dark, hc } = useCycleMode();
  return (
    <div className="flex" style={{ gap: 8 }}>
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="tap flex-1 min-w-0 inline-flex items-center justify-center text-charcoal-soft disabled:opacity-40"
        style={{ height: 46, borderRadius: 14, border: `0.5px solid ${hair(dark, hc, 0.14)}`, ...type(14, 21, 700) }}
      >
        {cancel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        aria-busy={busy || undefined}
        className="tap flex-1 min-w-0 inline-flex items-center justify-center disabled:opacity-60"
        style={{
          height: 46,
          borderRadius: 14,
          background: destructive ? "rgb(var(--c-status-high))" : "rgb(var(--c-fill-pinned))",
          color: destructive ? (dark ? "#0D0B1A" : "#FFFFFF") : "rgb(var(--c-on-primary-fill))",
          ...type(14, 21, 700),
        }}
      >
        {busy ? <span className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-label="Working" /> : confirm}
      </button>
    </div>
  );
};

/** "14 Sep 2026" (HE1.10.b.1 #9: day, short month, year). */
export function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })} ${d.getFullYear()}`;
}
/** "21 June 2027" (HE1.10.b.1 #11). */
export function longDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "long" })} ${d.getFullYear()}`;
}

/**
 * Date field (HE1.10.b.1 #9-#10): 44 r12 pad 0 12, #F5F5F6 with a 0.5px
 * #241F1B@10% border (dark #242730 / #F5F3FA@10%), CalendarDays 16 #5B5349
 * and the value 14/21 400. Opens the standard calendar popup.
 */
export const CycleDateField: React.FC<{ value: string | null; placeholder?: string; onClick: () => void; ariaLabel: string; invalid?: boolean }> = ({
  value,
  placeholder = "Choose a date",
  onClick,
  ariaLabel,
  invalid,
}) => {
  const { dark, hc } = useCycleMode();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      className="tap w-full flex items-center bg-cream-soft text-start"
      style={{
        height: 44,
        borderRadius: 12,
        padding: "0 12px",
        gap: 8,
        border: `${invalid ? 1.1 : 0.5}px solid ${invalid ? (dark ? "#E8837C" : "#C2453F") : hair(dark, hc, 0.1)}`,
      }}
    >
      <CalendarDays size={16} aria-hidden className="shrink-0 text-charcoal-soft" />
      <span className={value ? "text-charcoal" : "text-charcoal-faint"} style={type(14, 21, 400)}>
        {value ? shortDate(value) : placeholder}
      </span>
    </button>
  );
};

/** Skeleton bar #F5F5F6 (dark #242730), pulse 1.2 s, static under Reduce motion (X-32). */
export const Skeleton: React.FC<{ width: number | string; height: number; radius?: number; style?: React.CSSProperties }> = ({ width, height, radius = 6, style }) => (
  <span aria-hidden className="block bg-cream-soft animate-skeleton-pulse" style={{ width, height, borderRadius: radius, ...style }} />
);
