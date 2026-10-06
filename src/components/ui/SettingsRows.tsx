import React, { useId } from "react";
import clsx from "clsx";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Toggle } from "./Toggle";

// Mobile v5.1 handover, MO1.8 Settings and its sub-pages (Foundations 2.3,
// 2.4): a labelled section of rows, laid out as the board draws it. Each row
// is padding 13 0, gap 14, a 36 pt icon tile, a 14 / 600 title, an optional
// 12 / 400 muted subtitle, and on the right a value (12.5 / 400 muted) with a
// 16 pt chevron, a toggle, or nothing. Rows are divided by a 1 px hairline
// that starts at the text column (50 pt in) and is absent under the last row.
// Sections are 32 pt apart.
//
// COLOURS ARE TODAY'S, NOT THE BOARD'S (decisions 15 and 17, batch C 1). The
// section label is the app's 12 px grey caps label with no rule; the icon tile
// is the cream-soft tile with a charcoal-soft glyph that Settings already drew
// for Appearance and Permissions; the hairline is the 6% charcoal one used
// between rows everywhere else. Dark mode follows from the same tokens.
//
// Directions are logical (start/end), so the layout mirrors in Arabic; the
// chevron flips with it.

export const SettingsSection: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}> = ({ label, children, className, id }) => {
  const labelId = useId();
  return (
    <section id={id} aria-labelledby={labelId} className={clsx("mt-8 first:mt-0", className)}>
      <h2 id={labelId} className="section-label text-charcoal-faint mb-1">
        {label}
      </h2>
      <div>{children}</div>
    </section>
  );
};

type RowBase = {
  icon?: LucideIcon;
  /** A custom tile glyph in place of `icon` (brand marks, avatars). */
  tile?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  /** Red title and glyph, for rows like "Delete account". */
  destructive?: boolean;
  /** Greys the whole row out (BR-12: rows under a switched-off master). */
  dimmed?: boolean;
  className?: string;
  id?: string;
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
        toggle: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; label?: string };
        onClick?: never;
        value?: never;
      }
    | { onClick?: never; toggle?: never; value?: React.ReactNode }
  );

const rowClass = clsx(
  // 13 px above and below; Bigger tap targets adds --row-extra (8 px) to the row.
  "relative w-full flex items-center gap-3.5 text-start [padding-block:calc(13px_+_var(--row-extra,0px)_/_2)]",
  // The inset divider: from the text column to the end, not under the last row.
  // ::before, not ::after: .tap already uses ::after for its 44 px hit box.
  "before:content-[''] before:absolute before:bottom-0 before:start-[50px] before:end-0 before:h-px before:bg-charcoal/[0.06] before:pointer-events-none",
  "last:before:hidden"
);

export const SettingsRow: React.FC<RowProps> = ({
  icon: Icon,
  tile,
  title,
  subtitle,
  destructive,
  dimmed,
  className,
  id,
  onClick,
  value,
  toggle,
}) => {
  const body = (
    <>
      {(Icon || tile) && (
        <span
          aria-hidden
          className={clsx(
            "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden",
            tile ? "" : destructive ? "bg-status-high-bg text-status-high" : "bg-cream-soft text-charcoal-soft"
          )}
        >
          {tile ?? (Icon && <Icon size={16} />)}
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

  // Dimmed (BR-12): the whole row at 40% and inert, so it takes no tap and no
  // keyboard focus. The switch is not also disabled, which would apply its own
  // 40% on top and leave it at 16%.
  const dim = dimmed ? "opacity-40" : undefined;
  const inert = dimmed || undefined;

  if (toggle) {
    return (
      <div id={id} inert={inert} aria-disabled={dimmed || undefined} className={clsx(rowClass, dim, className)}>
        {body}
        <Toggle
          checked={toggle.checked}
          onChange={toggle.onChange}
          disabled={toggle.disabled}
          label={toggle.label ?? title}
        />
      </div>
    );
  }

  if (onClick) {
    return (
      <button id={id} type="button" onClick={onClick} inert={inert} disabled={dimmed} className={clsx("tap", rowClass, dim, className)}>
        {body}
        <ChevronRight
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className="shrink-0 text-charcoal-faint rtl:-scale-x-100"
        />
      </button>
    );
  }

  return (
    <div id={id} className={clsx(rowClass, dim, className)}>
      {body}
    </div>
  );
};
