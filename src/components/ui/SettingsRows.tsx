import React, { useId } from "react";
import clsx from "clsx";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { Toggle } from "./Toggle";

// Mobile v5.1 handover, MO1.8 Settings and its sub-pages (Foundations 2.3,
// 2.4): a labelled section of rows. Each row is padding 13 0, gap 14, a 36 pt
// icon tile (radius 11, primary.tint, 17 pt glyph at 1.75 stroke in
// primary.accent), a 14 / 600 title, an optional 12 / 400 muted subtitle, and
// on the right a value (12.5 / 400 muted) with a 16 pt chevron, a toggle, or
// nothing. Rows are divided by a 1 px border.row hairline that starts at the
// text column (50 pt in) and is absent under the last row. Sections are 32 pt
// apart.
//
// Directions are logical (start/end), so the layout mirrors in Arabic; the
// chevron flips with it.

export const SettingsSection: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className }) => {
  const id = useId();
  return (
    <section aria-labelledby={id} className={clsx("mt-8 first:mt-0", className)}>
      <SectionLabel id={id}>{label}</SectionLabel>
      <div>{children}</div>
    </section>
  );
};

type RowBase = {
  icon?: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
  /** Red title and glyph, for rows like "Delete account". */
  destructive?: boolean;
  className?: string;
};

type RowProps = RowBase &
  (
    | {
        /** Opens a page or popup: the row is a button with a trailing chevron. */
        onClick: () => void;
        /** Shown before the chevron, e.g. the current language. */
        value?: React.ReactNode;
        toggle?: never;
      }
    | {
        /** A switch at the end; the row itself is not a button. */
        toggle: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean };
        onClick?: never;
        value?: never;
      }
    | { onClick?: never; toggle?: never; value?: React.ReactNode }
  );

const rowClass = clsx(
  "relative w-full flex items-center gap-3.5 py-[13px] text-start",
  // The inset divider: from the text column to the end, not under the last row.
  "after:content-[''] after:absolute after:bottom-0 after:start-[50px] after:end-0 after:h-px after:bg-[var(--border-row)]",
  "last:after:hidden"
);

export const SettingsRow: React.FC<RowProps> = ({
  icon: Icon,
  title,
  subtitle,
  destructive,
  className,
  onClick,
  value,
  toggle,
}) => {
  const body = (
    <>
      {Icon && (
        <span
          className={clsx(
            "w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0",
            destructive ? "bg-status-high-bg text-status-high" : "bg-primary-pale text-primary-accent"
          )}
        >
          <Icon size={17} strokeWidth={1.75} aria-hidden />
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span
          className={clsx(
            "block text-[14px] font-semibold leading-5 break-words",
            destructive ? "text-status-high" : "text-charcoal"
          )}
        >
          {title}
        </span>
        {subtitle && <span className="block mt-px text-[12px] leading-4 text-charcoal-faint">{subtitle}</span>}
      </span>
      {value !== undefined && value !== null && (
        <span className="shrink-0 max-w-[45%] truncate text-[12.5px] text-charcoal-faint">{value}</span>
      )}
    </>
  );

  if (toggle) {
    return (
      <div className={clsx(rowClass, className)}>
        {body}
        <Toggle checked={toggle.checked} onChange={toggle.onChange} disabled={toggle.disabled} label={title} />
      </div>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={clsx("tap", rowClass, className)}>
        {body}
        <ChevronRight
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className="shrink-0 text-charcoal-tertiary rtl:-scale-x-100"
        />
      </button>
    );
  }

  return <div className={clsx(rowClass, className)}>{body}</div>;
};
