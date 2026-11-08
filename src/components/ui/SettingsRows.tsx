import React, { useContext, useId } from "react";
import clsx from "clsx";
import { ChevronRight, ExternalLink, type LucideIcon } from "lucide-react";
import { Toggle } from "./Toggle";
import { BizRow } from "../business-more/kit";

import { SettingsRowVariant } from "./settingsRowVariant";
import { usePaneSpan } from "../web/paneFill";
import { useIsDark } from "../../hooks/useIsDark";

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
  const variant = useContext(SettingsRowVariant);
  const dark = useIsDark();
  const inPane = usePaneSpan() && !dark;
  if (variant === "pane") {
    // WP-MO.10 (web pane): the label 13/20 700 caps #7D67D9 over the 1.5 #AEA1DC rule 8 below, 32 above (0 for the first), 8 under; the rows in a white r16 card (0 16).
    return (
      <section id={id} aria-labelledby={labelId} className={clsx("mt-8 first:mt-0", className)}>
        <h2
          id={labelId}
          className="rtl:tracking-normal"
          style={{ margin: "0 0 8px", paddingBottom: 8, borderBottom: "1.5px solid #AEA1DC", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#7D67D9" }}
        >
          {label}
        </h2>
        <div style={{ background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", borderRadius: 16, overflow: "hidden" }}>{children}</div>
      </section>
    );
  }
  return (
    <section id={id} aria-labelledby={labelId} className={clsx("mt-8 first:mt-0", className)}>
      {/* MO1.8.5.1: Arabic drops the small caps' letter-spacing. MO1.8 #4:
          primary.accent ink (High contrast light: the darkened #4B3BA0, the
          token there). MO1.8 #5: the rule sits 8 under the label (the shared
          .section-label has 7.5). */}
      <h2
        id={labelId}
        className={clsx("section-label text-primary-accent rtl:tracking-normal", labelClassName)}
        // Website viewport (ST Settings Web / WC-SE Settings Web): in a spanning pane the label is 13/20 700 .14em #7D67D9.
        style={inPane ? { paddingBottom: 8, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".14em", color: "#7D67D9" } : { paddingBottom: 8 }}
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
export const SettingsBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  // The web pane (WP-MO.10) draws its own header and spacing: no inset, no offset.
  const pane = useContext(SettingsRowVariant) === "pane";
  return <div className={pane ? undefined : clsx("px-2", className)}>{children}</div>;
};

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
  /** The web pane row (WP-MO.10) ends in the external-link glyph: the row opens another page. Ignored elsewhere. */
  paneExternal?: boolean;
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
        toggle: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; label?: string; describedBy?: string };
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
  paneExternal,
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
  if (variant === "pane") {
    return (
      <PaneRow
        id={id}
        className={className}
        icon={Icon}
        tile={tile}
        title={title}
        subtitle={subtitle}
        srDescription={srDescription}
        destructive={destructive}
        dimmed={dimmed}
        value={value}
        onClick={onClick}
        toggle={toggle}
        external={paneExternal}
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
      className="shrink-0 text-charcoal-faint"
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
          describedBy={toggle.describedBy}
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

/**
 * Website viewport (Professional handover v1, WP-MO.10; WP-MO Practice
 * Settings Web): a row of a page in the spanning Settings pane. 56 high (64
 * with a subtitle), 16 in, the 32 r10 tile with an 18 glyph, the title 15/24
 * 600, the subtitle and value 13/20 #8C8378, the 18 chevron #9A94B3 (the 16
 * external-link glyph for a row that opens another page), the 44 × 26 switch;
 * rows divided by a full-width hairline, hover #FAFAFB.
 */
const PaneRow: React.FC<{
  id?: string;
  className?: string;
  icon?: LucideIcon;
  tile?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  srDescription?: string;
  destructive?: boolean;
  dimmed?: boolean;
  value?: React.ReactNode;
  onClick?: () => void;
  toggle?: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; label?: string };
  external?: boolean;
}> = ({ id, className, icon: Icon, tile, title, subtitle, srDescription, destructive, dimmed, value, onClick, toggle, external }) => {
  const style: React.CSSProperties = { minHeight: subtitle ? 64 : 56, boxSizing: "border-box", gap: 12, padding: "0 16px" };
  const cls = clsx("relative w-full flex items-center text-start [&+&]:border-t [&+&]:border-[rgba(36,31,27,0.06)]", dimmed && "opacity-40", className);
  const body = (
    <>
      {(Icon || tile) && (
        <span aria-hidden className="flex items-center justify-center shrink-0 overflow-hidden" style={{ width: 32, height: 32, borderRadius: 10, background: tile ? undefined : destructive ? "#FBEAEA" : "#F0EDF9" }}>
          {tile ?? (Icon && <Icon size={18} strokeWidth={1.75} style={{ color: destructive ? "#B3261E" : "#7D67D9" }} />)}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block break-words" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: destructive ? "#B3261E" : "#241F1B" }}>{title}</span>
        {subtitle && <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{subtitle}</span>}
        {srDescription && <span className="sr-only">{srDescription}</span>}
      </span>
      {value !== undefined && value !== null && (
        <span className="shrink-0 max-w-[45%] truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{value}</span>
      )}
    </>
  );
  if (toggle) {
    const on = toggle.checked;
    return (
      <div id={id} inert={dimmed || undefined} aria-disabled={dimmed || undefined} className={cls} style={style}>
        {body}
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={toggle.label ?? title}
          disabled={toggle.disabled}
          onClick={() => toggle.onChange(!on)}
          className="flex shrink-0 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]"
          style={{ width: 44, height: 26, boxSizing: "border-box", borderRadius: 999, background: on ? "#9A8CD6" : "#E4E2EA", padding: 3, justifyContent: on ? "flex-end" : "flex-start" }}
        >
          <span style={{ width: 20, height: 20, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 2px rgba(36,31,27,0.2)" }} />
        </button>
      </div>
    );
  }
  if (onClick) {
    return (
      <button id={id} type="button" onClick={onClick} inert={dimmed || undefined} disabled={dimmed} className={clsx(cls, "hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#AEA1DC]")} style={style}>
        {body}
        {external ? (
          <ExternalLink size={16} strokeWidth={2} aria-hidden className="shrink-0" style={{ color: "#9A94B3" }} />
        ) : (
          <ChevronRight size={18} aria-hidden className="shrink-0" style={{ color: "#9A94B3" }} />
        )}
      </button>
    );
  }
  return (
    <div id={id} className={cls} style={style}>
      {body}
    </div>
  );
};
