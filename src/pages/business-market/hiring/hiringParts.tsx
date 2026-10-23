import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, EllipsisVertical } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { linePx, textPx } from "../../../theme/textSize";
import { marketPalette, STATUS_STEPS, type MarketPalette } from "../../../theme/marketTokens";
import { hexAlpha, liftInk, luminance } from "../../../components/market/marketColor";
import { ConfirmationStrip, type StripTone } from "../../../components/market/ConfirmationStrip";
import { MarketAvatar, Star, TicketCheck } from "../../../components/market/ProfessionalCard";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { NO_ICON_SCALE } from "../../../components/pro/proInk";
import { PopupMenu, type PopupMenuOption } from "../../../components/ui/PopupMenu";
import { sheetChipStyle } from "../../../components/ui/sheetChip";
import { SheetSwitch } from "../listingParts";
import { BUSY_WARNING_TEXT, type Opening, type ProCard } from "../../../services/hiring/model";
import type { MarketResult } from "../../../services/market/rpc";
import { FEE_NOTICE_PLAIN, feeNotice, fetchHiringFeeRules, type HiringFeeRules } from "../../../services/hiring";
import { footLine, hiredLine, openingTag, payLine, personRating, scheduleLine, type HiringTag } from "./hubModel";

// Market + Share 3.0 · W4 · pieces shared by the B-MA.8 pages (W4-A owns this
// file; the other W4 pages import from it). Literal values from Business
// Hiring Screens (markup lines 66–133 and 280–312, script `tag()`, `O`, `P`,
// `R`, `F0` / `fText` / `fChips` / `fToggle` / `fPerson`); light = the board,
// dark = its [data-cm="dark"] palette through marketPalette, the fixed step
// hues as hexAlpha(ink, 0.16) / liftInk(ink) (stubColors does the same). The
// rest of the chrome is the W3 business-market kit: listingParts (BackHeader,
// MasterSheet, CentredDialog, SheetBox, fieldStyle, SheetSwitch, CapsLabel,
// OutlineButton, PrimaryButton) and components/market.

export type { HiringTag };

/** High contrast is on (AppContext's `high-contrast` on <html>, as marketPalette reads it). */
const highContrastOn = (): boolean => typeof document !== "undefined" && document.documentElement.classList.contains("high-contrast");

/** A #RRGGBB ink darkened (toward black, 2% steps) until it reads at `ratio` on the #RRGGBB `bg`. */
export function inkOn(bg: string, ink: string, ratio = 4.5): string {
  const lb = luminance(bg);
  const n = parseInt(ink.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  for (let i = 0; i <= 50; i++) {
    const hex = "#" + rgb.map((v) => Math.round(v * (1 - i / 50)).toString(16).padStart(2, "0")).join("").toUpperCase();
    const li = luminance(hex);
    if ((Math.max(lb, li) + 0.05) / (Math.min(lb, li) + 0.05) >= ratio) return hex;
  }
  return "#000000";
}

/**
 * A fixed board pair: as drawn in light; its 16% tint and lifted ink in dark;
 * under High contrast (light) the ink darkens to 4.5:1 on the drawn tint, as
 * marketPalette's HC palettes do for the board's other inks.
 */
export const fixedPair = (bg: string, ink: string, dark: boolean): [string, string] =>
  dark ? [hexAlpha(ink, 0.16), liftInk(ink)] : highContrastOn() ? [bg, inkOn(bg, ink)] : [bg, ink];

export function tagColors(tag: HiringTag, m: MarketPalette, dark: boolean): [string, string] {
  const fixed = (bg: string, ink: string) => fixedPair(bg, ink, dark);
  switch (tag) {
    case "ROLE":
    case "NEW":
      return fixed(...STATUS_STEPS.APPLIED);
    case "CLASS SLOT":
      return fixed(...STATUS_STEPS.SHORTLISTED);
    case "FILLED":
      return fixed(...STATUS_STEPS.HIRED);
    case "CLOSED":
      return [m.soft, m.faint];
    case "DUE":
      return [m.cautionbg, m.caution];
    case "PAID":
      return [m.goodbg, m.good];
    default:
      return fixed(STATUS_STEPS[tag][0], STATUS_STEPS[tag][1]);
  }
}

/** The board's tag chip: 10 / 800, 0.08em, radius 999, padding 3 8, nowrap. */
export function TagChip({ tag, label, style }: { tag: HiringTag; label?: string; style?: React.CSSProperties }) {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const [bg, ink] = tagColors(tag, m, dark);
  return (
    <span style={{ fontSize: textPx(10), fontWeight: 800, letterSpacing: "0.08em", borderRadius: 999, padding: "3px 8px", background: bg, color: ink, whiteSpace: "nowrap", lineHeight: "normal", flexShrink: 0, ...style }}>
      {label ?? tag}
    </span>
  );
}

// ---------------------------------------------------------------------------
// reads

export type ReadState = "loading" | "ok" | "pending" | "offline" | "error";

/**
 * One DB8 read for a page (D-04 states): loading, the value, `pending` (the
 * stage hasn't landed: the page's quiet designed state), offline or error
 * (Retry). `run` returns null while it can't run yet (no business id).
 * A failed reload keeps what is on screen.
 */
export function useHiringRead<T>(run: () => Promise<MarketResult<T>> | null, deps: React.DependencyList): { state: ReadState; value: T | null; retry: () => void } {
  const [tick, setTick] = useState(0);
  const [s, setS] = useState<{ state: ReadState; value: T | null }>({ state: "loading", value: null });
  useEffect(() => {
    const p = run();
    if (!p) return;
    let live = true;
    void p.then((r) => {
      if (!live) return;
      if (r.ok) setS({ state: "ok", value: r.value });
      else setS((prev) => ({ state: r.pending ? "pending" : r.offline ? "offline" : "error", value: r.pending ? null : prev.value }));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const retry = useCallback(() => {
    setS((prev) => ({ ...prev, state: "loading" }));
    setTick((t) => t + 1);
  }, []);
  return { ...s, retry };
}

// ---------------------------------------------------------------------------
// strip

export interface StripOptions {
  tone?: StripTone;
  /** The stub's word ("View", "Fees"); "Done" when there is no action. */
  action?: string;
  onAction?: () => void;
}

/**
 * The board's ConfirmationStrip (markup line 52: "Opening posted · …" View,
 * "Hired · one-time fee …" Fees, "Offer sent to …" View), overlaid on the
 * header (W1 Q4) as listingParts' useStrip does, with the board's own stub
 * word and action; it closes with its action or after 5 s.
 */
export function useHiringStrip(): [React.ReactNode, (text: string, o?: StripOptions) => void] {
  const reduced = useReducedMotion();
  const [s, setS] = useState<{ text: string; o: StripOptions; n: number } | null>(null);
  const seq = useRef(0);
  const show = useCallback((text: string, o: StripOptions = {}) => {
    seq.current += 1;
    setS({ text, o, n: seq.current });
  }, []);
  useEffect(() => {
    if (!s) return;
    const id = window.setTimeout(() => setS(null), 5000);
    return () => window.clearTimeout(id);
  }, [s]);
  const node = s
    ? createPortal(
        <div className="fixed left-0 right-0 flex justify-center" style={{ zIndex: 95, top: "calc(env(safe-area-inset-top) + 12px)", padding: "0 16px", pointerEvents: "none" }}>
          <div style={{ width: "100%", maxWidth: 398, pointerEvents: "auto" }} data-strip>
            <ConfirmationStrip
              key={s.n}
              text={s.text}
              tone={s.o.tone ?? "success"}
              action={s.o.action ?? "Done"}
              onAction={() => {
                setS(null);
                s.o.onAction?.();
              }}
              still={reduced}
            />
          </div>
        </div>,
        document.body
      )
    : null;
  return [node, show];
}

// ---------------------------------------------------------------------------
// empty state (hEmpty, appEmpty, teamEmpty)

/**
 * The board's empty block (markup lines 93–99 / 123–130): column, centred,
 * gap 10, padding 36 24 0; a 56 tile radius 18 #EEEAF8 / #7D67D9 with a 24
 * glyph at stroke 1.75; title 16 / 800; body 13 / 1.55 --faint max 290; an
 * optional outlined button (margin-top 6, 40 + border, radius 12, 12.5 / 800
 * --pdark, padding 0 14).
 */
export function HiringEmpty({ icon, title, body, action, onAction, style }: { icon: React.ReactNode; title: string; body?: string; action?: string; onAction?: () => void; style?: React.CSSProperties }) {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const [tileBg, tileInk] = fixedPair("#EEEAF8", "#7D67D9", dark);
  return (
    <div role="status" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "36px 24px 0", lineHeight: "normal", color: m.ink, ...style }}>
      <span aria-hidden style={{ width: 56, height: 56, borderRadius: 18, background: tileBg, color: tileInk, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </span>
      <div style={{ fontSize: textPx(16), fontWeight: 800 }}>{title}</div>
      {body ? <div style={{ fontSize: textPx(13), lineHeight: 1.55, color: m.faint, maxWidth: 290 }}>{body}</div> : null}
      {action && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="tap market-focus"
          style={{ marginTop: 6, minHeight: 42, borderRadius: 12, border: `1px solid ${m.border}`, background: "transparent", display: "inline-flex", alignItems: "center", padding: "0 14px", fontSize: textPx(12.5), fontWeight: 800, color: m.pdark, fontFamily: "inherit", cursor: "pointer", boxSizing: "border-box" }}
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

/** lucide user-plus at the board's 24 / 1.75 (hEmpty). */
export const UserPlusGlyph = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx={9} cy={7} r={4} />
    <path d="M19 8v6" />
    <path d="M22 11h-6" />
  </svg>
);

/** lucide inbox at the board's 24 / 1.75 (appEmpty). */
export const InboxGlyph = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

/** The board's ticket glyph with the perforation (the fee notice, markup line 301). */
export const FeeTicketGlyph = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none", ...NO_ICON_SCALE }}>
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v2" />
    <path d="M13 17v2" />
    <path d="M13 11v2" />
  </svg>
);

// ---------------------------------------------------------------------------
// people (applicant cards, search results)

/** The hired line (markup line 106): 11.5 / 700, ticket-check 13, gap 5; --tealink, or --faint for "New to Centium". */
export function HiredLine({ roles, style }: { roles: number; style?: React.CSSProperties }) {
  const m = marketPalette(useIsDark());
  const h = hiredLine(roles);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: textPx(11.5), fontWeight: 700, color: h.hired ? m.tealink : m.faint, lineHeight: "normal", minWidth: 0, ...style }}>
      <TicketCheck size={13} />
      {h.text}
    </span>
  );
}

/**
 * The person row (markup lines 101–104 / 141–144): gap 12, centred; an
 * optional rank (22 wide, 12 / 800 --faint, centred); the 48 avatar (15 /
 * 800); name 15 / 20 800, specialty 12 --ink2, the rating line 11.5 --faint
 * with the 11 --gold star (gap 4, margin-top 1); an optional trailing tag.
 */
export function PersonHead({ p, rank, trailing, teamFirst = true }: { p: ProCard; rank?: number | null; trailing?: React.ReactNode; teamFirst?: boolean }) {
  const m = marketPalette(useIsDark());
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", lineHeight: "normal" }}>
      {rank != null ? <span style={{ width: 22, flexShrink: 0, fontSize: textPx(12), fontWeight: 800, color: m.faint, textAlign: "center" }}>{rank}</span> : null}
      <MarketAvatar id={p.id} name={p.name} photoUrl={p.photoUrl} size={48} fontSize={15} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: textPx(15), fontWeight: 800, lineHeight: linePx(20), color: m.ink, overflowWrap: "anywhere" }}>{p.name}</div>
        {p.specialty ? <div style={{ fontSize: textPx(12), color: m.ink2 }}>{p.specialty}</div> : null}
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: textPx(11.5), color: m.faint, marginTop: 1 }}>
          <Star size={11} />
          {personRating(p, teamFirst)}
        </div>
      </div>
      {trailing}
    </div>
  );
}

// ---------------------------------------------------------------------------
// opening card (B-MA.8 `O`)

/** The kebab: 32 × 32 radius 10 (--pale while open), the 18 / 2.2 ellipsis --ink2, on a 44 target (B-SH.1 opening menu). */
export const KebabButton = React.forwardRef<HTMLButtonElement, { label: string; open: boolean; onOpen: () => void; style?: React.CSSProperties }>(({ label, open, onOpen, style }, ref) => {
  const m = marketPalette(useIsDark());
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className="tap market-focus"
      style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: open ? m.pale : "transparent", color: m.ink2, border: 0, padding: 0, flexShrink: 0, cursor: "pointer", position: "relative", zIndex: 1, ...style }}
    >
      <EllipsisVertical size={18} strokeWidth={2.2} aria-hidden />
    </button>
  );
});
KebabButton.displayName = "KebabButton";

export type OpeningAction = "edit" | "share" | "pause" | "delete" | "reopen";

const OPENING_MENU: PopupMenuOption<OpeningAction>[] = [
  { value: "edit", label: "Edit" },
  { value: "share", label: "Share" },
  { value: "pause", label: "Pause" },
  { value: "delete", label: "Delete", destructive: true },
];

/** Ours (Karim: Pause = close, reopenable): a closed opening's ⋮ has Reopen alone. */
export const CLOSED_OPENING_MENU: PopupMenuOption<OpeningAction>[] = [{ value: "reopen", label: "Reopen" }];

/**
 * The opening's ⋮ (B-SH.1 "Hiring · opening menu"): the app PopupMenu at the
 * drawn 194 (176 content + 8 padding + 1 border each side), rows 37 tall
 * (12.5 on its 17 line, 9 / 10 padding, 1px border), Edit · Share · Pause ·
 * Delete (Delete in --high). It takes focus on its first row; Escape closes
 * it and focus returns to the kebab.
 */
export function OpeningMenuButton({
  title,
  onAction,
  style,
  options = OPENING_MENU,
}: {
  title: string;
  onAction: (a: OpeningAction) => void;
  style?: React.CSSProperties;
  /** Optional: another menu (CLOSED_OPENING_MENU); the drawn four by default. */
  options?: PopupMenuOption<OpeningAction>[];
}) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const btn = useRef<HTMLButtonElement | null>(null);
  const open = !!anchor;
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => (document.querySelector('[role="menu"] button:not(:disabled)') as HTMLElement | null)?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);
  return (
    <>
      <KebabButton ref={btn} label={`Opening options: ${title}`} open={open} onOpen={() => setAnchor(btn.current)} style={style} />
      <PopupMenu
        open={open}
        anchor={anchor}
        width={176}
        rowLineHeight={17}
        onClose={() => {
          setAnchor(null);
          btn.current?.focus();
        }}
        options={options}
        onSelect={(a) => onAction(a)}
      />
    </>
  );
}

/**
 * One opening (markup lines 79–91): radius 20, --card, 1px --border (1.5px
 * --fill when just posted), overflow hidden; body padding 14 16 10: title
 * 15 / 20 800 (flex 1) + the tag (gap 10), schedule 12 --ink2 (margin-top 3),
 * pay 12 / 700 (margin-top 2); footer padding 11 16, 0.5px --div above, the
 * line 12 / 700 in its ink (--pdark, --faint or --tealink), the 16 chevron
 * --faint. The whole card opens the applicants; the ⋮ (our placement: after
 * the tag, as the board's other cards carry theirs) sits above that button.
 */
export function OpeningCard({ o, justPosted, onOpen, menu }: { o: Opening; justPosted: boolean; onOpen: () => void; menu?: React.ReactNode }) {
  const m = marketPalette(useIsDark());
  const sched = scheduleLine(o);
  const pay = payLine(o);
  const foot = footLine(o, justPosted);
  const footInk = foot.tone === "teal" ? m.tealink : foot.tone === "faint" ? m.faint : m.pdark;
  const tag = openingTag(o);
  return (
    <div data-opening={o.id} style={{ position: "relative", borderRadius: 20, background: m.card, border: justPosted ? `1.5px solid ${m.fill}` : `1px solid ${m.border}`, overflow: "hidden", color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <button
        type="button"
        onClick={onOpen}
        aria-label={[o.title, tag, sched, pay, foot.text].filter(Boolean).join(", ")}
        className="market-focus"
        style={{ position: "absolute", inset: 0, width: "100%", borderRadius: 19, background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
      />
      <div aria-hidden style={{ padding: "14px 16px 10px", position: "relative", pointerEvents: "none" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginRight: menu ? 30 : 0 }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: textPx(15), fontWeight: 800, lineHeight: linePx(20), overflowWrap: "anywhere" }}>{o.title}</div>
          <TagChip tag={tag} />
        </div>
        {sched ? <div style={{ fontSize: textPx(12), color: m.ink2, marginTop: 3 }}>{sched}</div> : null}
        {pay ? <div style={{ fontSize: textPx(12), fontWeight: 700, marginTop: 2 }}>{pay}</div> : null}
      </div>
      {menu ? <div style={{ position: "absolute", top: 8, right: 8 }}>{menu}</div> : null}
      <div aria-hidden style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderTop: `0.5px solid ${m.div}`, position: "relative", pointerEvents: "none" }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: textPx(12), fontWeight: 700, color: footInk }}>{foot.text}</span>
        <ChevronRight size={16} strokeWidth={2} color={m.faint} aria-hidden style={NO_ICON_SCALE} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// sheet fields (`F0`, `fText`, `fChips`, `fToggle`, `fPerson`; markup lines 288–296)

/** The field grid: two equal columns, gap 8. */
export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8 }}>{children}</div>;
}

/** A grey field box: --sgrey radius 14 padding 12 14; its label 13 / 500 --slabel, 8 above the field. Spans 1 or 2 columns. */
export function FieldBox({ label, htmlFor, labelId, half, children, hint }: { label: string; htmlFor?: string; labelId?: string; half?: boolean; children: React.ReactNode; hint?: React.ReactNode }) {
  const m = marketPalette(useIsDark());
  return (
    <div style={{ gridColumn: half ? "span 1" : "span 2", background: m.sgrey, borderRadius: 14, padding: "12px 14px", lineHeight: "normal", minWidth: 0 }}>
      <label id={labelId} htmlFor={htmlFor} style={{ display: "block", fontSize: textPx(13), fontWeight: 500, color: m.slabel, marginBottom: 8 }}>
        {label}
      </label>
      {children}
      {hint ? <div style={{ fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint, marginTop: 8 }}>{hint}</div> : null}
    </div>
  );
}

/** The field inside a box: --sfield radius 10 padding 11 13, 14 / 19, flex gap 8 (1px border: transparent, --caution on a warning). */
export function fieldShell(m: MarketPalette, border?: string): React.CSSProperties {
  return { display: "flex", alignItems: "center", gap: 8, width: "100%", boxSizing: "border-box", background: m.card, borderRadius: 10, padding: "11px 13px", fontSize: textPx(14), lineHeight: linePx(19), color: m.ink, border: `1px solid ${border ?? "transparent"}`, fontFamily: "inherit", textAlign: "left" };
}

/** A text / number input in the field shell, with an optional prefix ("$") or suffix. */
export function FieldInput({
  id,
  value,
  onChange,
  inputMode,
  placeholder,
  prefix,
  suffix,
  maxLength,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "text" | "numeric" | "decimal";
  placeholder?: string;
  prefix?: string;
  suffix?: React.ReactNode;
  maxLength?: number;
  describedBy?: string;
}) {
  const m = marketPalette(useIsDark());
  return (
    <div style={fieldShell(m)}>
      {prefix ? <span aria-hidden style={{ color: m.faint }}>{prefix}</span> : null}
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-describedby={describedBy}
        autoComplete="off"
        style={{ flex: 1, minWidth: 0, width: "100%", border: 0, outline: "none", background: "transparent", color: m.ink, font: "inherit", padding: 0 }}
      />
      {suffix}
    </div>
  );
}

/** A field that opens a chooser: the value (or a --faint placeholder) and the 14 / 2.4 chevron --faint. */
export const PickerField = React.forwardRef<HTMLButtonElement, { value: string | null; placeholder: string; labelledBy: string; open: boolean; onOpen: () => void; disabled?: boolean }>(
  ({ value, placeholder, labelledBy, open, onOpen, disabled }, ref) => {
    const m = marketPalette(useIsDark());
    const valueId = React.useId();
    return (
      <button
        ref={ref}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-labelledby={`${labelledBy} ${valueId}`}
        onClick={onOpen}
        disabled={disabled}
        className="market-focus"
        style={{ ...fieldShell(m), cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}
      >
        <span id={valueId} style={{ flex: 1, minWidth: 0, color: value ? m.ink : m.faint }}>
          {value ?? placeholder}
        </span>
        <ChevronDown size={14} strokeWidth={2.4} color={m.faint} aria-hidden style={{ flexShrink: 0, ...NO_ICON_SCALE }} />
      </button>
    );
  }
);
PickerField.displayName = "PickerField";

/** The sheet chips: radius 8, padding 8 12, 13; on --chipon / white 700, off #FAFAFB / 1px #E5E6EB / --ink 500 (sheetChipStyle carries the dark pair). */
export function ChipSet<K extends string>({
  labelId,
  options,
  isOn,
  onToggle,
  kind,
}: {
  labelId: string;
  options: { key: K; label: string }[];
  isOn: (k: K) => boolean;
  onToggle: (k: K) => void;
  kind: "radio" | "check";
}) {
  return (
    <div role={kind === "radio" ? "radiogroup" : "group"} aria-labelledby={labelId} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((o) => {
        const on = isOn(o.key);
        return (
          <button
            key={o.key}
            type="button"
            role={kind === "radio" ? "radio" : undefined}
            aria-checked={kind === "radio" ? on : undefined}
            aria-pressed={kind === "check" ? on : undefined}
            onClick={() => onToggle(o.key)}
            className="hit market-focus"
            style={{ ...sheetChipStyle(on), padding: "8px 12px", fontSize: textPx(13), fontFamily: "inherit", lineHeight: "normal", cursor: "pointer" }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** The toggle box: --sgrey radius 14 padding 12 14, space-between gap 12; label 14 / 700, hint 11.5 --faint; the 42 × 26 switch. */
export function ToggleBox({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  const m = marketPalette(useIsDark());
  const hintId = React.useId();
  return (
    <div style={{ gridColumn: "span 2", background: m.sgrey, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, lineHeight: "normal" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: textPx(14), fontWeight: 700, color: m.ink }}>{label}</div>
        <div id={hintId} style={{ fontSize: textPx(11.5), color: m.faint }}>
          {hint}
        </div>
      </div>
      <SheetSwitch on={on} onChange={onChange} label={label} describedBy={hintId} />
    </div>
  );
}

/** The person row (`fPerson`, unselected): --sgrey radius 14 padding 10 12, gap 12; avatar 40 (13 / 800); name 14 / 700; the line 11.5 --tealink (--faint when muted); the 20 radio ring 1.5 --border. */
export function PersonRow({ p, line, muted }: { p: ProCard; line: string; muted?: boolean }) {
  const m = marketPalette(useIsDark());
  return (
    <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14, background: m.sgrey, border: "1.5px solid transparent", lineHeight: "normal" }}>
      <MarketAvatar id={p.id} name={p.name} photoUrl={p.photoUrl} size={40} fontSize={13} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: textPx(14), fontWeight: 700, color: m.ink }}>{p.name}</div>
        <div style={{ fontSize: textPx(11.5), color: muted ? m.faint : m.tealink }}>{line}</div>
      </div>
      <span aria-hidden style={{ width: 20, height: 20, borderRadius: 999, boxSizing: "border-box", border: `1.5px solid ${m.border}`, flexShrink: 0 }} />
    </div>
  );
}

/** The sheet footer's fee notice (markup line 301): centred, gap 6, padding 4 0 10, 12 / 700 --pdark, the ticket glyph 14. */
/** platform_settings' hiring numbers (cached for the session); null until they load or when the read fails. */
export function useFeeRules(): HiringFeeRules | null {
  const [rules, setRules] = useState<HiringFeeRules | null>(null);
  useEffect(() => {
    let live = true;
    void fetchHiringFeeRules().then((r) => live && r.ok && setRules(r.value));
    return () => {
      live = false;
    };
  }, []);
  return rules;
}

/** The footer notice with the server's rate and floors ("One-time 8% hiring fee (min. $25 per role, $3 per class slot) when you hire"). */
export function feeNoticeText(rules: HiringFeeRules | null): string {
  return rules ? feeNotice(rules) : FEE_NOTICE_PLAIN;
}

export function FeeNoticeRow({ text }: { text: string }) {
  const m = marketPalette(useIsDark());
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "4px 0 10px", fontSize: textPx(12), fontWeight: 700, color: m.pdark, lineHeight: "normal", textAlign: "center" }}>
      <FeeTicketGlyph />
      <span>{text}</span>
    </div>
  );
}

/**
 * Busy times returned with an offer (start / end only, no titles; PLAN §2.2
 * DB9 "business: start / end only"): a warning, never blocking. The board's
 * inline caution card (`isInline`, markup line 296): --cautionbg radius 14
 * padding 12 14; the line 13 / 18 700 --ink; the times 12 / 17 --ink2.
 */
export function BusyWarning({ lines, style }: { lines: string[]; style?: React.CSSProperties }) {
  const m = marketPalette(useIsDark());
  if (!lines.length) return null;
  return (
    <div role="status" style={{ borderRadius: 14, background: m.cautionbg, padding: "12px 14px", lineHeight: "normal", textAlign: "left", ...style }}>
      <div style={{ fontSize: textPx(13), lineHeight: linePx(18), fontWeight: 700, color: m.ink }}>{BUSY_WARNING_TEXT}</div>
      {lines.map((l) => (
        <div key={l} style={{ fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2, marginTop: 4 }}>
          {`Busy ${l}`}
        </div>
      ))}
    </div>
  );
}
