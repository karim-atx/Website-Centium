import React from "react";
import clsx from "clsx";
import { useIsDark } from "../../../hooks/useIsDark";
import { Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, UserRound, WifiOff, type LucideIcon } from "lucide-react";

// AN4 (AnMembersV6) parts, literal values from AN4-001 / -005 / -025 / -043 /
// -046 through the app tokens (page #FFFFFF · #121317, card #FFFFFF ·
// #1C1F28 = cream-card, ink / inkSoft / faint / tert = charcoal / -soft /
// -faint / -tertiary, pale = primary-pale, pDark = primary-dark, fill =
// primary-fill). Five themes, Larger text and High contrast follow the tokens.

const CARD = "bg-cream-card border border-solid border-charcoal/[0.11] dark:border-charcoal/[0.08]";
const DIV = "border-charcoal/[0.06]";

/** AN4-001 row 10 · the r24 card. */
export const AnCard: React.FC<{ children: React.ReactNode; className?: string; label?: string }> = ({ children, className, label }) => (
  <section aria-label={label} className={clsx(CARD, "rounded-[24px] overflow-hidden", className)}>
    {children}
  </section>
);

/** AN4-001 rows 11-16 · an index row: title, lead, value (+ delta), chevron. */
export const AnIndexRow: React.FC<{
  title: string;
  lead: React.ReactNode;
  value: string | null;
  delta?: React.ReactNode;
  onClick: () => void;
  first?: boolean;
  ariaLabel: string;
}> = ({ title, lead, value, delta, onClick, first, ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    className={clsx(
      "w-full grid items-center text-left min-h-[76px] active:bg-cream-soft [html.high-contrast_&]:active:outline [html.high-contrast_&]:active:outline-1 [html.high-contrast_&]:active:outline-charcoal-faint focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-primary-dark",
      !first && "border-t",
      DIV
    )}
    style={{ gridTemplateColumns: "minmax(0,1fr) auto 16px", columnGap: 12, padding: "14px 14px 14px 20px" }}
  >
    <span className="min-w-0">
      <span className="block text-[13.5px] leading-[18px] font-extrabold text-charcoal">{title}</span>
      <span className="block text-[11.5px] leading-[16px] text-charcoal-soft mt-[3px] [text-wrap:pretty]">{lead}</span>
    </span>
    <span className="text-right max-w-[98px]">
      <span className={clsx("block text-[20px] leading-[22px] font-extrabold tracking-[-0.02em] tabular-nums whitespace-nowrap", value === null ? "text-charcoal-tertiary" : "text-charcoal")}>
        {value ?? "–"}
      </span>
      {delta && <span className="block text-[10.5px] leading-[13px] font-extrabold whitespace-nowrap mt-[2px]">{delta}</span>}
    </span>
    <ChevronRight size={16} aria-hidden className="text-charcoal-tertiary [html.high-contrast_&]:text-charcoal-soft" />
  </button>
);

/** AN4-001 row 17 · the hint under the index. */
export const AnHint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10.5px] leading-[15px] text-charcoal-faint text-center mt-[10px]">{children}</p>
);

/** AN4-005 rows 10-14 / AN4-046 · back 44, crumb, title (or the picker title), position. */
export const AnHeaderRow: React.FC<{
  crumb: string;
  backLabel: string;
  onBack: () => void;
  title: string;
  position?: string;
  picker?: { open: boolean; onToggle: (el: HTMLElement) => void };
}> = ({ crumb, backLabel, onBack, title, position, picker }) => (
  <div className="flex items-center gap-[6px] mb-[12px]">
    <button
      type="button"
      onClick={onBack}
      aria-label={backLabel}
      className="tap w-[44px] h-[44px] -ml-[10px] shrink-0 rounded-full flex items-center justify-center text-charcoal-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
    >
      <ChevronLeft size={20} aria-hidden />
    </button>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] leading-[14px] font-bold text-charcoal-faint">{crumb}</p>
      {picker ? (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={picker.open}
          onClick={(e) => picker.onToggle(e.currentTarget)}
          className="tap relative inline-flex items-center gap-[4px] min-h-[32px] text-[18px] leading-[23px] font-extrabold tracking-[-0.01em] text-charcoal text-left"
        >
          <span aria-hidden className="absolute inset-x-0 -inset-y-[6px]" />
          {title}
          <ChevronDown size={17} strokeWidth={2.4} aria-hidden className="text-primary-dark shrink-0 motion-safe:transition-transform motion-safe:duration-200" style={{ transform: picker.open ? "rotate(180deg)" : undefined }} />
        </button>
      ) : (
        <h2 className="text-[18px] leading-[23px] font-extrabold tracking-[-0.01em] text-charcoal">{title}</h2>
      )}
    </div>
    {position && <span className="text-[11px] font-bold text-charcoal-faint tabular-nums whitespace-nowrap self-start mt-[14px]">{position}</span>}
  </div>
);

/** AN4-005 row 16 · the two number boxes. */
export const AnNumberBoxes: React.FC<{ boxes: [{ label: string; value: string | null; delta?: React.ReactNode }, { label: string; value: string | null; delta?: React.ReactNode }] }> = ({ boxes }) => (
  <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) 1px minmax(0,1fr)" }}>
    {boxes.map((b, i) => (
      <React.Fragment key={b.label}>
        {i === 1 && <span aria-hidden className="bg-charcoal/[0.06]" style={{ margin: "14px 0" }} />}
        <div className="text-center min-w-0" style={{ padding: "18px 8px 16px" }}>
          <p className="flex flex-wrap items-baseline justify-center gap-x-[6px]">
            <span className={clsx("text-[30px] leading-[32px] font-extrabold tracking-[-0.03em] tabular-nums", b.value === null ? "text-charcoal-tertiary" : "text-charcoal")}>{b.value ?? "–"}</span>
            {b.delta && <span className="text-[11px] font-extrabold whitespace-nowrap">{b.delta}</span>}
          </p>
          <p className="text-[11px] leading-[14px] font-semibold text-charcoal-faint mt-[5px]">{b.label}</p>
        </div>
      </React.Fragment>
    ))}
  </div>
);

/** AN4-005 row 17 · the lead under the boxes. */
export const AnLead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className={clsx("border-t text-[12px] leading-[17px] text-charcoal-soft", DIV)} style={{ padding: "12px 20px" }}>
    {children}
  </p>
);

/** AN4-025 L2 · count + order line. */
export const AnCountLine: React.FC<{ count: string; order: string }> = ({ count, order }) => (
  <div className="flex items-baseline justify-between gap-[8px] pt-[6px]">
    <span className="text-[12px] leading-[16px] font-extrabold text-charcoal">{count}</span>
    <span className="text-[10.5px] leading-[14px] text-charcoal-faint whitespace-nowrap">{order}</span>
  </div>
);

/** AN4-025 L4 · a 36 avatar: a coloured initial (by row index) or masked. */
const AV = [
  "bg-primary-pale text-primary-deep-text",
  "bg-teal-pale text-teal-text",
  "bg-status-caution-bg text-caution-deep",
];
export const AnAvatar: React.FC<{ initial?: string; index?: number; masked?: boolean; icon?: LucideIcon; tone?: "caution" }> = ({ initial, index = 0, masked, icon: Icon, tone }) => {
  if (masked)
    return (
      <span aria-hidden className="w-[36px] h-[36px] rounded-full bg-cream-soft text-charcoal-soft flex items-center justify-center">
        <UserRound size={16} />
      </span>
    );
  if (Icon)
    return (
      <span aria-hidden className={clsx("w-[36px] h-[36px] rounded-full flex items-center justify-center", tone === "caution" ? AV[2] : AV[0])}>
        <Icon size={16} />
      </span>
    );
  return (
    <span aria-hidden className={clsx("w-[36px] h-[36px] rounded-full flex items-center justify-center text-[12px] font-extrabold tracking-[0.02em]", AV[index % 3])}>
      {initial}
    </span>
  );
};

/** AN4-025 L3 · a list row: avatar · name + fact · trailing. */
export const AnListRow: React.FC<{ avatar: React.ReactNode; name: React.ReactNode; nameExtra?: React.ReactNode; fact?: React.ReactNode; trailing?: React.ReactNode; first?: boolean; mono?: boolean }> = ({
  avatar,
  name,
  nameExtra,
  fact,
  trailing,
  first,
  mono,
}) => (
  <div className={clsx("grid items-center min-h-[62px]", !first && "border-t", DIV)} style={{ gridTemplateColumns: "36px minmax(0,1fr) auto", columnGap: 12, padding: "10px 0" }}>
    {avatar}
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-x-[6px] gap-y-[2px]">
        <span className={clsx("text-[13px] leading-[17px] font-bold text-charcoal [overflow-wrap:anywhere]", mono && "tracking-[0.06em] tabular-nums")}>{name}</span>
        {nameExtra}
      </p>
      {fact && <p className="text-[11.5px] leading-[16px] text-charcoal-faint mt-[1px] [text-wrap:pretty]">{fact}</p>}
    </div>
    {trailing}
  </div>
);

/** AN4-025 L8 · the Message-button shell (h40, r12, 1px border, 12/700), 44 hit. */
export const AnRowButton: React.FC<{ icon: LucideIcon; label: string; onClick: () => void; ariaLabel?: string; tone?: "primary" | "high"; disabled?: boolean }> = ({
  icon: Icon,
  label,
  onClick,
  ariaLabel,
  tone = "primary",
  disabled,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    disabled={disabled}
    className={clsx(
      "tap relative inline-flex items-center gap-[5px] h-[40px] px-[12px] rounded-[12px] border border-solid border-charcoal/[0.11] dark:border-charcoal/[0.08] text-[12px] font-bold whitespace-nowrap disabled:opacity-50",
      tone === "high" ? "text-status-high" : "text-primary-dark"
    )}
  >
    <span aria-hidden className="absolute inset-x-0 -inset-y-[2px]" />
    <Icon size={14} aria-hidden />
    {label}
  </button>
);

/** AN4-025 L10 · "See all {n}". */
export const AnSeeAll: React.FC<{ n: number; onClick: () => void }> = ({ n, onClick }) => (
  <button type="button" onClick={onClick} className={clsx("tap w-full min-h-[44px] border-t flex items-center justify-center gap-[4px] rounded-[10px] text-[12px] font-extrabold text-primary-dark", DIV)}>
    See all {n} <ChevronRight size={14} aria-hidden />
  </button>
);

/** AN4-025 L11 · none row with a disc. */
export const AnNoneRow: React.FC<{ icon?: LucideIcon; tone?: "good" | "pale" | "caution"; children: React.ReactNode }> = ({ icon: Icon = Check, tone = "good", children }) => (
  <div className="flex items-center gap-[10px]" style={{ padding: "14px 0 6px" }}>
    <span
      aria-hidden
      className={clsx(
        "w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0",
        tone === "good" ? "bg-status-good-bg text-status-good" : tone === "caution" ? "bg-status-caution-bg text-caution-deep" : "bg-primary-pale text-primary-dark"
      )}
    >
      <Icon size={16} strokeWidth={2.4} />
    </span>
    <p className="text-[12px] leading-[17px] text-charcoal-soft">{children}</p>
  </div>
);

/** AN4-001 O2 / O3 · the error or offline strip with Retry. */
export const AnStrip: React.FC<{ offline?: boolean; text: string; onRetry?: () => void }> = ({ offline, text, onRetry }) => (
  <div role="status" className="flex items-center gap-[8px] rounded-[16px] bg-status-high-bg mb-[12px]" style={{ padding: "10px 12px" }}>
    {offline ? <WifiOff size={15} aria-hidden className="text-status-high shrink-0" /> : <CircleAlert size={15} aria-hidden className="text-status-high shrink-0" />}
    <p className="flex-1 text-[12px] leading-[17px] text-charcoal">{text}</p>
    {onRetry && (
      <button type="button" onClick={onRetry} className="tap min-h-[44px] px-1 text-[12px] font-extrabold text-primary-dark">
        Retry
      </button>
    )}
  </div>
);

/** AN4-023 rows 10-15 / AN4-043 · the empty card (optional ghost chart and button). */
export const AnEmptyCard: React.FC<{
  icon: LucideIcon;
  title: string;
  body: React.ReactNode;
  ghost?: boolean;
  button?: { label: string; icon: LucideIcon; onClick: () => void };
  children?: React.ReactNode;
}> = ({ icon: Icon, title, body, ghost, button, children }) => (
  <div className={clsx(CARD, "rounded-[24px] flex flex-col items-center text-center gap-[8px]")} style={{ padding: "28px 20px" }}>
    {ghost && (
      <svg width="100%" height="96" viewBox="0 0 300 96" preserveAspectRatio="none" aria-hidden className="mb-[6px] overflow-visible">
        <line x1="0" x2="300" y1="14" y2="14" className="stroke-charcoal/[0.07]" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="0" x2="300" y1="44" y2="44" className="stroke-charcoal/[0.07]" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="0" x2="300" y1="74" y2="74" className="stroke-charcoal-tertiary" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      </svg>
    )}
    <span aria-hidden className="w-[44px] h-[44px] rounded-[16px] bg-primary-pale text-primary-dark flex items-center justify-center">
      <Icon size={20} />
    </span>
    <p className="text-[14px] font-bold text-charcoal">{title}</p>
    <p className="text-[12px] leading-[17px] text-charcoal-faint max-w-[270px]">{body}</p>
    {button && (
      <button
        type="button"
        onClick={button.onClick}
        className="tap mt-[6px] inline-flex items-center gap-[8px] h-[44px] px-[18px] rounded-[14px] bg-primary-fill text-on-primary-fill text-[13px] font-bold"
      >
        <button.icon size={15} aria-hidden /> {button.label}
      </button>
    )}
    {children}
  </div>
);

/** AN4-001 O1 · skeleton index rows. */
export const AnIndexSkeleton: React.FC<{ rows: number }> = ({ rows }) => (
  <div role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={clsx("flex items-center justify-between min-h-[76px]", i > 0 && "border-t", DIV)} style={{ padding: "14px 14px 14px 20px" }}>
        <span className="space-y-[6px]">
          <span className="block w-[90px] h-[12px] rounded-[6px] bg-cream-soft animate-skeleton-pulse" />
          <span className="block w-[200px] h-[10px] rounded-[5px] bg-cream-soft animate-skeleton-pulse" />
          <span className="block w-[150px] h-[10px] rounded-[5px] bg-cream-soft animate-skeleton-pulse" />
        </span>
        <span className="block w-[40px] h-[18px] rounded-[6px] bg-cream-soft animate-skeleton-pulse mr-[28px]" />
      </div>
    ))}
  </div>
);

/**
 * AN4-024 row 1 / AN4-044 row 10 · the early-data hint: r12 #F5F5F6 · #242730
 * (c.soft), padding 9 12, 11.5/16 #5B5349 · #B8B3C7, 12 above the card.
 */
export const AnEarlyHint: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dark = useIsDark();
  return (
    <p data-early-hint className="text-[11.5px] leading-[16px] text-charcoal-soft rounded-[12px] mb-[12px]" style={{ padding: "9px 12px", background: dark ? "#242730" : "#F5F5F6" }}>
      {children}
    </p>
  );
};

/**
 * AN4-005 row 34 / S7 · the collapsible section (AnMembersV6 `sec()`, l.192-196):
 * divider, padding 14 20; header min-h 24 (44 hit), title 12.5/800 line 17,
 * chevron-down 16 tert rotating 180° in 0.3s cubic-bezier(0.22,1,0.36,1); line
 * 11.5/16 inkSoft mt 3; body grid-template-rows 0fr → 1fr, same easing; intro
 * 11/15 faint margin 10 0 10; 4 px spacer under the body. Collapsed by default.
 */
export const AnSection: React.FC<{ title: string; line: React.ReactNode; intro: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, line, intro, children, defaultOpen = false }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  const id = React.useId();
  const ease = "cubic-bezier(0.22,1,0.36,1)";
  return (
    <div data-an-section className={clsx("border-t", DIV)} style={{ padding: "14px 20px" }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="relative w-full flex items-center gap-[8px] min-h-[24px] text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark rounded-[8px]"
      >
        <span aria-hidden className="absolute inset-x-0 -inset-y-[10px]" />
        <span className="flex-1 min-w-0 text-[12.5px] leading-[17px] font-extrabold text-charcoal">{title}</span>
        <ChevronDown size={16} aria-hidden className="text-charcoal-tertiary shrink-0 motion-reduce:!transition-none" style={{ transform: open ? "rotate(180deg)" : "none", transition: `transform 0.3s ${ease}` }} />
      </button>
      <p className="text-[11.5px] leading-[16px] text-charcoal-soft mt-[3px]">{line}</p>
      <div id={id} className="grid motion-reduce:!transition-none" style={{ gridTemplateRows: open ? "1fr" : "0fr", transition: `grid-template-rows 0.3s ${ease}` }} inert={!open}>
        <div className="overflow-hidden min-h-0">
          <p className="text-[11px] leading-[15px] text-charcoal-faint" style={{ margin: "10px 0 10px" }}>
            {intro}
          </p>
          {children}
          <div style={{ height: 4 }} />
        </div>
      </div>
    </div>
  );
};

/** One row of a section's rows body (AnMembersV6 l.204-212). `n` null reads "–" (tert). */
export interface AnSectionRow {
  key: string;
  n: string | null;
  /** The dash / stack colour (light, dark). */
  col: [string, string];
  t: string;
  s?: string;
  /** Stack share (0 or null: not in the stacked bar). */
  share?: number | null;
}

/**
 * The rows body: optional stacked bar (h12, gap 2, mb 4, radius by position)
 * and rows grid 16 34 1fr gap 10, padding 10 0: dash h4 r999 mt 9, number
 * 18/800 line 20, title 12/700 16, sub 11.5/16 inkSoft mt 2.
 */
export const AnSectionRows: React.FC<{ rows: AnSectionRow[]; stack?: boolean; dark: boolean }> = ({ rows, stack, dark }) => {
  const seg = rows.filter((r) => (r.share ?? 0) > 0);
  const rad = (i: number, a: unknown[]) => (a.length === 1 ? "999px" : i === 0 ? "999px 3px 3px 999px" : i === a.length - 1 ? "3px 999px 999px 3px" : "3px");
  return (
    <>
      {stack && seg.length > 0 && (
        <div aria-hidden style={{ display: "flex", height: 12, gap: 2, marginBottom: 4 }}>
          {seg.map((r, i) => (
            <span key={r.key} style={{ flex: r.share ?? 0, background: r.col[dark ? 1 : 0], borderRadius: rad(i, seg) }} />
          ))}
        </div>
      )}
      {rows.map((r, i) => (
        <div key={r.key} className={clsx("grid", i > 0 && "border-t", DIV)} style={{ gridTemplateColumns: "16px 34px minmax(0,1fr)", gap: 10, padding: "10px 0" }}>
          <span aria-hidden style={{ height: 4, borderRadius: 999, background: r.col[dark ? 1 : 0], marginTop: 9 }} />
          <span className={clsx("text-[18px] leading-[20px] font-extrabold tabular-nums", r.n === null ? "text-charcoal-tertiary" : "text-charcoal")}>{r.n ?? "–"}</span>
          <div className="min-w-0">
            <p className="text-[12px] leading-[16px] font-bold text-charcoal">{r.t}</p>
            {r.s && <p className="text-[11.5px] leading-[16px] text-charcoal-soft mt-[2px]">{r.s}</p>}
          </div>
        </div>
      ))}
    </>
  );
};
