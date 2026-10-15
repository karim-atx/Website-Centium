import React, { useContext, useId } from "react";
import clsx from "clsx";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Toggle } from "./Toggle";
import { BizRow } from "../business-more/kit";

import { SettingsRowVariant } from "./settingsRowVariant";

// Mobile v5.1 handover, MO1.8 Settings and its sub-pages (Foundations 2.3,
// 2.4), restyled to the v6 Part B MO1.8 table (the user's colour rule
// overrides decisions 22 / 23's kept greys): a labelled section of rows. Each
// row is padding 13 0, gap 14, a 36 pt icon tile (radius 11, glyph 17 / 1.75),
// a 14 / 19 600 title, an optional 12 / 16 400 muted subtitle 2 below, and on
// the right a value (12.5 / 400 muted) with a 16 pt chevron, a toggle, or
// nothing. Rows are divided by a 1 px hairline that starts at the text column
// (50 pt in) and is absent under the last row. Sections are 32 pt apart.
//
// COLOURS (MO1.8 #4-#11, #23): the section label in primary.accent #7D67D9 /
// #9A8CD6 over a 1.5 primary rule 8 below it; the tile primary.tint #F0EDF9 /
// #303141 (bg-primary-pale) with a primary.accent glyph; the divider
// border.row #AEA1DC@15% (dark: the token's rgba(238,239,242,0.08), TK 1.4
// #4), 30% of ink under High contrast through the token.
//
// The first row starts right under the section line (MO1.8: line bottom 96,
// row 97; MO1.8.3: 222, 222), so the label has no bottom margin.
//
// Directions are logical (start/end), so the layout mirrors in Arabic; the
// chevron flips with it.

export const SettingsSection: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Extra classes on the label, for a frame whose label box differs (MO1.8.6's 26 pt). */
  labelClassName?: string;
}> = ({ label, children, className, id, labelClassName }) => {
  const labelId = useId();
  return (
    <section id={id} aria-labelledby={labelId} className={clsx("mt-8 first:mt-0", className)}>
      {/* MO1.8.5.1: Arabic drops the small caps' letter-spacing. MO1.8 #4:
          primary.accent ink (High contrast light: the darkened #4B3BA0, the
          token there). MO1.8 #5: the rule sits 8 under the label (the shared
          .section-label has 7.5). */}
      <h2
        id={labelId}
        className={clsx("section-label text-primary-accent rtl:tracking-normal", labelClassName)}
        style={{ paddingBottom: 8 }}
      >
        {label}
      </h2>
      <div>{children}</div>
    </section>
  );
};

/**
 * The content column of Settings and its sub-pages, under the PageHeader.
 * Every MO1.8 frame draws the content 24 pt in from each edge (x 25 on the
 * board, 342 wide), 8 inside the header's 16, so this adds 8 each side.
 * `className` carries the page's own top offset: a negative margin that
 * collapses with the header's 20 pt bottom margin to the frame's gap.
 */
export const SettingsBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={clsx("px-2", className)}>{children}</div>
);

type RowBase = {
  icon?: LucideIcon;
  /** A custom tile glyph in place of `icon` (brand marks, avatars). */
  tile?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  /**
   * Screen-reader-only text after the title: what the row does, where the
   * frame draws no subtitle (handover-complete pass). Not drawn.
   */
  srDescription?: string;
  /** Red title and glyph, for rows like "Delete account". */
  destructive?: boolean;
  /** Greys the whole row out (BR-12: rows under a switched-off master). */
  dimmed?: boolean;
  className?: string;
  id?: string;
  /**
   * The glyph ink. "accent" (default) primary.accent #7D67D9 / #9A8CD6; "dark"
   * primary.dark #7D6BB5 / #C3B3FB, the ink MO1.8 draws on the Data & account
   * rows (#49, #53, #60, #69).
   */
  iconTone?: "accent" | "dark";
};

type RowProps = RowBase &
  (
    | {
        /** Opens a page or popup: the row is a button with a trailing chevron. */
        onClick: () => void;
        /** Shown before the chevron, e.g. the current language. */
        value?: React.ReactNode;
        /**
         * MO1.8 #77-#78: the value 12.5 / 18.8 and 4 from the chevron (one
         * group) instead of the row's 14 gap. Unset keeps the 14.
         */
        valueTight?: boolean;
        toggle?: never;
      }
    | {
        /** A switch at the end; the row itself is not a button. */
        toggle: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; label?: string };
        onClick?: never;
        value?: never;
        valueTight?: never;
      }
    | { onClick?: never; toggle?: never; value?: React.ReactNode; valueTight?: never }
  );

/** The row geometry and inset divider, for a page's own row shape (MO1.8.3 From / To). */
export const settingsRowClass = clsx(
  // 13 px above and below; Bigger tap targets adds --row-extra (8 px) to the row.
  "relative w-full flex items-center gap-3.5 text-start [padding-block:calc(13px_+_var(--row-extra,0px)_/_2)]",
  // The inset divider: from the text column to the end, not under the last row.
  // ::before, not ::after: .tap already uses ::after for its 44 px hit box.
  "before:content-[''] before:absolute before:bottom-0 before:start-[50px] before:end-0 before:h-px before:bg-[var(--border-row)] before:pointer-events-none",
  "last:before:hidden"
);

export const SettingsRow: React.FC<RowProps> = ({
  icon: Icon,
  tile,
  title,
  subtitle,
  srDescription,
  destructive,
  dimmed,
  className,
  id,
  onClick,
  value,
  valueTight,
  toggle,
  iconTone = "accent",
}) => {
  const variant = useContext(SettingsRowVariant);
  if (variant === "business") {
    return (
      <BizRow
        id={id}
        className={className}
        icon={Icon}
        title={title}
        desc={subtitle}
        ariaLabel={srDescription ? `${title}. ${srDescription}` : undefined}
        value={value ?? undefined}
        onClick={onClick}
        toggle={toggle}
        danger={destructive}
        dim={dimmed}
        chevron={onClick ? value === undefined || value === null : undefined}
      />
    );
  }
  const body = (
    <>
      {(Icon || tile) && (
        <span
          aria-hidden
          className={clsx(
            // MO1.8 / Foundations 2.4: the 36 pt tile at radius 11, a rounded square.
            "w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 overflow-hidden",
            tile
              ? ""
              : destructive
                ? "bg-status-high-bg text-status-high"
                : iconTone === "dark"
                  ? "bg-primary-pale text-primary-dark"
                  : "bg-primary-pale text-primary-accent"
          )}
        >
          {/* MO1.8 icon list: Sun, Mic, ShieldCheck, Globe … all 17 / 1.75. */}
          {tile ?? (Icon && <Icon size={17} strokeWidth={1.75} />)}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span
          className={clsx(
            "block text-[14px] font-semibold leading-[19px] break-words",
            destructive ? "text-status-high" : "text-charcoal"
          )}
        >
          {title}
        </span>
        {subtitle && <span className="block mt-0.5 text-[12px] leading-4 text-charcoal-faint">{subtitle}</span>}
        {srDescription && <span className="sr-only">{srDescription}</span>}
      </span>
      {!valueTight && value !== undefined && value !== null && (
        <span className="shrink-0 max-w-[45%] truncate text-[12.5px] text-charcoal-faint">{value}</span>
      )}
    </>
  );
  const chevron = (
    <ChevronRight
      size={16}
      strokeWidth={1.75}
      aria-hidden
      className="shrink-0 text-charcoal-faint rtl:-scale-x-100"
    />
  );

  // Dimmed (BR-12): the whole row at 40% and inert, so it takes no tap and no
  // keyboard focus. The switch is not also disabled, which would apply its own
  // 40% on top and leave it at 16%.
  const dim = dimmed ? "opacity-40" : undefined;
  const inert = dimmed || undefined;

  if (toggle) {
    return (
      <div id={id} inert={inert} aria-disabled={dimmed || undefined} className={clsx(settingsRowClass, dim, className)}>
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
      <button id={id} type="button" onClick={onClick} inert={inert} disabled={dimmed} className={clsx("tap", settingsRowClass, dim, className)}>
        {body}
        {valueTight && value !== undefined && value !== null ? (
          <span className="shrink-0 max-w-[45%] flex items-center gap-1">
            <span className="min-w-0 truncate text-[12.5px] leading-[18.8px] text-charcoal-faint">{value}</span>
            {chevron}
          </span>
        ) : (
          chevron
        )}
      </button>
    );
  }

  return (
    <div id={id} className={clsx(settingsRowClass, dim, className)}>
      {body}
    </div>
  );
};
