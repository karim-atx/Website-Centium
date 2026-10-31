import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Eye, Plus, Square, SquareCheck, Star, X } from "lucide-react";
import { CATEGORY_KEYS, CATEGORY_LABEL, MAX_CATEGORIES, initialsOf, typeLabel } from "../../components/business-more/kind";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { ConfirmationStrip, type StripTone } from "../../components/market/ConfirmationStrip";
import { FOCUS_CSS, usePress } from "../../components/market/usePress";
import { hexAlpha } from "../../components/market/marketColor";
import { useIsDark } from "../../hooks/useIsDark";
import { useBackCloses } from "../../hooks/useBackCloses";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { linePx, textPx } from "../../theme/textSize";
import { marketPalette, type MarketPalette } from "../../theme/marketTokens";
import { checklistOrder, strengthLine, type StrengthItem } from "./model";

// Market + Share 3.0 · W3 · the Marketplace's own parts in the handover chrome
// (Business Marketplace Screens; marketPalette, light = the board, dark = the
// board's [data-cm="dark"] palette). Replaces the MA1 kit for the Overview,
// Showcase and the kept Listing features (PLAN §3.4): the Listing strength
// card, "Your card" with Preview, the Photos card, the Activities / Item
// categories multi-select and the Rating card, now handover cards under the
// Overview's caps "Listing" section; plus the shared bits (card, caps label,
// MasterBottomSheet, CentredDialog, ConfirmationStrip overlay, buttons).

export const px = textPx;
export const lh = linePx;

/** marketPalette for the current theme. */
export function useMarketColors(): MarketPalette {
  return marketPalette(useIsDark());
}

// ---------------------------------------------------------------------------
// Chrome

/** A handover card: --card, 1px --border, radius 24 (20 for ledgers). */
export function Card({ r = 24, style, children, ...rest }: { r?: number; style?: React.CSSProperties; children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  const m = useMarketColors();
  return (
    <div {...rest} style={{ borderRadius: r, background: m.card, border: `1px solid ${m.border}`, boxSizing: "border-box", ...style }}>
      {children}
    </div>
  );
}

/** The board's caps label ("Gym", "Listing", "5 items · drag to reorder"): 10.5 / 700, 0.1em, uppercase, --faint. */
export function CapsLabel({ children, style, as = "h2" }: { children: React.ReactNode; style?: React.CSSProperties; as?: "h2" | "span" | "p" }) {
  const m = useMarketColors();
  const Tag = as;
  return <Tag style={{ fontSize: px(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint, lineHeight: "normal", margin: 0, ...style }}>{children}</Tag>;
}

/** The board's outlined button ("Add item", "Add service", "Add plan"): 42 tall overall (the board's min-height 40 + its 1px --border; W3 lead decision), radius 12, 12.5 / 800 --pdark, padding 0 14, gap 6. Market screens only. */
export function OutlineButton({ children, onClick, disabled, style, ariaLabel }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties; ariaLabel?: string }) {
  const m = useMarketColors();
  return (
    <>
      <style>{FOCUS_CSS}</style>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className="tap market-focus"
        style={{
          minHeight: 42,
          borderRadius: 12,
          border: `1px solid ${m.border}`,
          background: "transparent",
          color: m.pdark,
          fontSize: px(12.5),
          fontWeight: 800,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "0 14px",
          fontFamily: "inherit",
          lineHeight: "normal",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.4 : 1,
          boxSizing: "border-box",
          ...style,
        }}
      >
        {children}
      </button>
    </>
  );
}

/** A small text action on a card (Manage, Preview as client): 12 / 800 --pdark, 44 target. */
export function TextLink({ children, onClick, ariaLabel, style }: { children: React.ReactNode; onClick: () => void; ariaLabel?: string; style?: React.CSSProperties }) {
  const m = useMarketColors();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="tap market-focus"
      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: px(12), fontWeight: 800, color: m.pdark, borderRadius: 8, padding: "2px 4px", background: "transparent", border: 0, cursor: "pointer", ...style }}
    >
      {children}
    </button>
  );
}

/** The sheet / page primary action: 50 tall, radius 16, --fill / --onfill, 15 / 700; disabled at 0.4; pressed 0.97. */
export function PrimaryButton({ children, onClick, disabled, busy, style }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; busy?: boolean; style?: React.CSSProperties }) {
  const m = useMarketColors();
  const press = usePress();
  const off = disabled || busy;
  return (
    <>
      <style>{FOCUS_CSS}</style>
      <button
        type="button"
        onClick={off ? undefined : onClick}
        aria-disabled={off || undefined}
        aria-busy={busy || undefined}
        className="market-focus"
        {...(off ? {} : press.handlers)}
        style={{
          width: "100%",
          height: 50,
          borderRadius: 16,
          border: 0,
          background: m.fill,
          color: m.onfill,
          fontFamily: "inherit",
          fontSize: px(15),
          fontWeight: 700,
          cursor: off ? "default" : "pointer",
          opacity: disabled ? 0.4 : 1,
          ...(off ? {} : press.style),
          ...style,
        }}
      >
        {children}
      </button>
    </>
  );
}

/** A centred quiet line under a control (a pending stage, a missing permission). */
export function SoonNote({ children, id, style }: { children: React.ReactNode; id?: string; style?: React.CSSProperties }) {
  const m = useMarketColors();
  return (
    <p id={id} style={{ fontSize: px(11.5), color: m.faint, lineHeight: lh(16), marginTop: 8, textAlign: "center", ...style }}>
      {children}
    </p>
  );
}

/** An inline save error (11.5 / 700 --high). */
export function SaveError({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const m = useMarketColors();
  return (
    <p role="alert" style={{ fontSize: px(11.5), fontWeight: 700, color: m.high, lineHeight: lh(16), marginTop: 8, textAlign: "center", ...style }}>
      {children}
    </p>
  );
}

/** The handover back header: 44 back target, eyebrow 10.5 / 15.75 700 0.1em uppercase, title 22 / 28 800. */
export function BackHeader({ eyebrow, title, onBack, backLabel, aside }: { eyebrow: string; title: string; onBack: () => void; backLabel: string; aside?: React.ReactNode }) {
  const m = useMarketColors();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBlock: "-4px 12px", marginInline: "-10px 0", color: m.ink }}>
      <button type="button" onClick={onBack} aria-label={backLabel} className="tap market-focus" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: m.ink, background: "transparent", border: 0, flexShrink: 0, cursor: "pointer" }}>
        <ChevronLeft size={22} strokeWidth={2.2} aria-hidden />
      </button>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: px(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint, lineHeight: lh(15.75) }}>{eyebrow}</p>
        <h1 style={{ fontSize: px(22), fontWeight: 800, lineHeight: lh(28), color: m.ink, margin: 0 }}>{title}</h1>
      </div>
      {aside}
    </div>
  );
}

/**
 * MasterBottomSheet (HANDOVER §4 "Bottom sheets"): the app BottomSheet's
 * defaults are the board's chrome (band --sband, 1px --sborder, radius 32,
 * 53 title bar, 20 / 800 --stitle, 26 close ring; body --sbody radius 22
 * padding 20; scrim --sscrim + blur 2); a footer is pinned with the 1px
 * --srule above it (padding 8 20 34).
 */
export function MasterSheet({
  open,
  onClose,
  title,
  children,
  footer,
  headerAction,
  fill,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  fill?: boolean;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title} footer={footer} footerRule={!!footer} headerAction={headerAction} fillHeight={fill} titleWrap>
      {children}
    </BottomSheet>
  );
}

/** A grey field box in a sheet (--sgrey, radius 14, padding 12 14) with its 13 / 500 --slabel label 8 above the field. */
export function SheetBox({ label, htmlFor, children, style }: { label: string; htmlFor?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  const m = useMarketColors();
  return (
    <div style={{ background: m.sgrey, borderRadius: 14, padding: "12px 14px", ...style }}>
      <label htmlFor={htmlFor} style={{ display: "block", fontSize: px(13), fontWeight: 500, color: m.slabel, marginBottom: 8, lineHeight: "normal" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/** The field inside a SheetBox: --sfield (the card), radius 10, padding 11 13, 14 / 19 --ink. */
export function fieldStyle(m: MarketPalette, invalid?: boolean): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    background: m.card,
    borderRadius: 10,
    padding: "11px 13px",
    fontSize: px(14),
    lineHeight: lh(19),
    color: m.ink,
    border: 0,
    boxShadow: invalid ? `inset 0 0 0 1px ${m.high}` : undefined,
    outline: "none",
    fontFamily: "inherit",
    fontWeight: 400,
  };
}

/**
 * The board's sheet switch (B-MA.2 "Show in showcase"): 42 × 26 radius 999,
 * on --fill, off --swoff; knob 22 #FFFFFF, 2 from the edge, shadow 0 1px 3px
 * rgba(0,0,0,0.18). The 44 target comes from .tap.
 */
export function SheetSwitch({ on, onChange, label, describedBy, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; describedBy?: string; disabled?: boolean }) {
  const m = useMarketColors();
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="tap market-focus"
      style={{ width: 42, height: 26, borderRadius: 999, background: on ? m.fill : m.swoff, position: "relative", flexShrink: 0, border: 0, padding: 0, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1 }}
    >
      <span aria-hidden style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 22, height: 22, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.18)", transition: reduce ? undefined : "left 140ms ease" }} />
    </button>
  );
}

/**
 * CentredDialog (Business Marketplace Screens B-MA.5.1 `del`, line 371):
 * scrim --sscrim + blur 2; card 320 wide, padding 24, radius 32, --sbody,
 * 1px --sborder, shadow 0 18px 48px rgba(95,80,147,0.22), centred text;
 * title 20 / 26 800 −0.015em --stitle; body (margin-top 8) 13 / 19 500
 * --ink2; buttons (margin-top 20, gap 8) 48 tall radius 14 14 / 700: cancel
 * #F0EDF9 / #5F5093 (--cancelbg / --cancelink), action #C0392B / #FFFFFF
 * (destructive) or --fill / --onfill. Escape and the phone's back cancel.
 */
export function CentredDialog({
  open,
  title,
  body,
  cancel,
  action,
  tone = "destructive",
  busy,
  error,
  onAction,
  onCancel,
  children,
  width = 320,
  pad = 24,
  actionsTop = 20,
}: {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  cancel: string;
  action: string;
  /** The card width when a board draws other than 320 (P-MA.2 delete: 330). */
  width?: number;
  /** The card padding when a board draws other than 24 (Business Hiring Screens `dlg`: "24px 22px 22px"). */
  pad?: number | string;
  /** The buttons' margin-top when a board draws other than 20 (Business Hiring Screens `dlg`: 18). */
  actionsTop?: number;
  tone?: "destructive" | "primary";
  busy?: boolean;
  error?: string | null;
  onAction: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const titleId = useId();
  const bodyId = useId();
  const card = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  });
  useBackCloses(open, onCancel);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    card.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  const btn = (bg: string, ink: string): React.CSSProperties => ({ flex: 1, minWidth: 0, minHeight: 48, padding: "0 8px", borderRadius: 14, border: 0, background: bg, color: ink, fontFamily: "inherit", fontSize: px(14), fontWeight: 700, cursor: "pointer" });
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 70, padding: "16px" }}>
      <style>{FOCUS_CSS}</style>
      <div aria-hidden onClick={() => !busy && onCancel()} style={{ position: "absolute", inset: 0, background: m.sscrim, backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }} />
      <div
        ref={card}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={body ? bodyId : undefined}
        tabIndex={-1}
        style={{
          position: "relative",
          width,
          maxWidth: "100%",
          boxSizing: "border-box",
          padding: pad,
          borderRadius: 32,
          background: m.sbody,
          border: `1px solid ${m.sborder}`,
          boxShadow: dark ? "none" : "0 18px 48px rgba(95,80,147,0.22)",
          textAlign: "center",
          outline: "none",
          color: m.ink,
          lineHeight: "normal",
        }}
      >
        <h2 id={titleId} style={{ fontSize: px(20), lineHeight: lh(26), fontWeight: 800, letterSpacing: "-0.015em", color: m.stitle, margin: 0 }}>
          {title}
        </h2>
        {body ? (
          <div id={bodyId} style={{ marginTop: 8, fontSize: px(13), lineHeight: lh(19), fontWeight: 500, color: m.ink2 }}>
            {body}
          </div>
        ) : null}
        {children}
        {error ? (
          <p role="alert" style={{ margin: "12px 0 0", fontSize: px(12), lineHeight: lh(17), fontWeight: 600, color: m.high }}>
            {error}
          </p>
        ) : null}
        <div style={{ marginTop: actionsTop, display: "flex", gap: 8 }}>
          <button type="button" onClick={onCancel} disabled={busy} className="market-focus" style={btn(m.cancelbg, m.cancelink)}>
            {cancel}
          </button>
          <button
            type="button"
            onClick={onAction}
            disabled={busy}
            aria-busy={busy || undefined}
            className="market-focus"
            style={{ ...(tone === "destructive" ? btn(dark ? m.high : "#C0392B", dark ? m.onfill : "#FFFFFF") : btn(m.fill, m.onfill)), opacity: busy ? 0.6 : 1 }}
          >
            {action}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * A ConfirmationStrip overlaid on the header (W1 lead decision Q4), as the
 * share button shows its result: fixed 12 from the top, 16 from the sides,
 * up to 398 wide; it closes with Done or after 5 s.
 */
export function useStrip(): [React.ReactNode, (text: string, tone?: StripTone, act?: { label: string; onPress: () => void }) => void] {
  const reduced = useReducedMotion();
  const [s, setS] = useState<{ text: string; tone: StripTone; n: number; act?: { label: string; onPress: () => void } } | null>(null);
  const seq = useRef(0);
  // `act` (optional): the stub's word and what it does when a board draws other than "Done" (B-MA.8.8 etDone: "Team").
  const show = useCallback((text: string, tone: StripTone = "success", act?: { label: string; onPress: () => void }) => {
    seq.current += 1;
    setS({ text, tone, n: seq.current, act });
  }, []);
  useEffect(() => {
    if (!s) return;
    const id = window.setTimeout(() => setS(null), 5000);
    return () => window.clearTimeout(id);
  }, [s]);
  const node = s
    ? createPortal(
        <div className="fixed start-0 end-0 flex justify-center" style={{ zIndex: 95, top: "calc(env(safe-area-inset-top) + 12px)", padding: "0 16px", pointerEvents: "none" }}>
          <div style={{ width: "100%", maxWidth: 398, pointerEvents: "auto" }} data-strip>
            <ConfirmationStrip
              key={s.n}
              text={s.text}
              tone={s.tone}
              action={s.act?.label ?? "Done"}
              onAction={() => {
                setS(null);
                s.act?.onPress();
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
// Listing strength (kept: MA1-001 rows 5-5d, MA1-078), as a handover card

export function StrengthCard({ items, emptyLine, highlight, onItem }: { items: StrengthItem[]; emptyLine: string; highlight: string | null; onItem: (it: StrengthItem) => void }) {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const done = items.filter((x) => x.done).length;
  const total = items.length;
  const order = checklistOrder(items);
  const shown = all ? order : order.slice(0, 4);
  return (
    <Card style={{ overflow: "hidden" }} data-strength>
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Listing strength, ${done} of ${total} done`}
        onClick={() => setOpen((o) => !o)}
        className="market-focus"
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", width: "100%", background: "transparent", border: 0, textAlign: "start", color: m.ink, cursor: "pointer", fontFamily: "inherit" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <p style={{ fontSize: px(14), fontWeight: 700, lineHeight: "normal" }}>Listing strength</p>
            <p style={{ fontSize: px(12), fontWeight: 700, color: m.pdark, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", lineHeight: "normal" }}>{`${done} of ${total} done`}</p>
          </div>
          <div aria-hidden style={{ display: "grid", gridTemplateColumns: `repeat(${total}, minmax(0,1fr))`, gap: 3, marginTop: 9 }}>
            {items.map((x) => (
              <span key={x.key} style={{ height: 6, borderRadius: 999, background: x.done ? m.fill : m.soft }} />
            ))}
          </div>
          <p style={{ fontSize: px(11.5), lineHeight: lh(16), color: m.faint, marginTop: 8, textWrap: "pretty" } as React.CSSProperties}>{strengthLine(items, emptyLine)}</p>
        </div>
        <span style={{ display: "flex", color: m.faint, transform: open ? "rotate(180deg)" : "none", transition: reduce ? undefined : "transform 200ms", flexShrink: 0 }}>
          <ChevronDown size={16} strokeWidth={2} aria-hidden />
        </span>
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${m.div}` }}>
          {shown.map((x, i) => (
            <button
              key={x.key}
              type="button"
              onClick={() => onItem(x)}
              aria-label={`${x.title}${x.sub ? `, ${x.sub}` : ""}${x.done ? ", done" : ""}`}
              className="market-focus"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                minHeight: 52,
                padding: "8px 16px",
                width: "100%",
                borderTop: i ? `1px solid ${m.div}` : "none",
                borderInlineStart: 0,
                borderInlineEnd: 0,
                borderBottom: 0,
                background: highlight === x.key ? m.goodbg : "transparent",
                textAlign: "start",
                color: m.ink,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: reduce ? undefined : "background .3s",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: x.done ? m.good : "transparent",
                  border: `1.5px solid ${x.done ? m.good : m.tert}`,
                  color: dark ? m.onfill : "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxSizing: "border-box",
                }}
              >
                {x.done && <Check size={12} strokeWidth={3} aria-hidden />}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: px(13.5), fontWeight: 700, color: x.done ? m.faint : m.ink, lineHeight: "normal" }}>{x.title}</span>
                {x.sub && <span style={{ display: "block", fontSize: px(11.5), color: m.faint, lineHeight: "normal" }}>{x.sub}</span>}
              </span>
              {!x.done && <span style={{ fontSize: px(12), fontWeight: 800, color: m.pdark, whiteSpace: "nowrap" }}>{x.key === "photos" ? "Add" : "Set up"}</span>}
              <ChevronRight size={16} color={m.faint} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
            </button>
          ))}
          {total > 4 && (
            <button
              type="button"
              onClick={() => setAll((a) => !a)}
              aria-expanded={all}
              className="market-focus"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 44, width: "100%", borderTop: `1px solid ${m.div}`, borderInlineStart: 0, borderInlineEnd: 0, borderBottom: 0, background: "transparent", fontSize: px(12.5), fontWeight: 800, color: m.pdark, cursor: "pointer", fontFamily: "inherit" }}
            >
              {all ? "Show less" : `Show all ${total}`}
              {all ? <ChevronUp size={14} strokeWidth={2.4} aria-hidden /> : <ChevronDown size={14} strokeWidth={2.4} aria-hidden />}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Your card (kept: MA1-001 rows 6-7; the visibility switch is the Overview's ListingToggleTile now)

export interface CardModel {
  name: string;
  type: string | null;
  categories: string[];
  location: string | null;
  bio: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  meta: string;
  chips: string[];
  rating: { average: number; count: number } | null;
}

export function typeLine(type: string | null, categories: string[]): string {
  const cats = categories.map((k) => CATEGORY_LABEL[k] ?? k);
  return cats.length ? `${typeLabel(type)} · ${cats.join(", ")}` : typeLabel(type);
}

/** The client card body (MA1-001 rows 6c-6k); shared by the Preview page. */
export function MiniCard({ m: card, dim, emptyAddress, emptyBio }: { m: CardModel; dim?: boolean; emptyAddress: string; emptyBio: string }) {
  const m = useMarketColors();
  return (
    <div style={{ borderRadius: 20, border: `1px solid ${m.border}`, overflow: "hidden", opacity: dim ? 0.55 : 1, background: m.card }}>
      <div style={{ position: "relative", height: 96, background: m.soft, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {card.coverUrl && <img src={card.coverUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        <span
          style={{
            position: "relative",
            width: 46,
            height: 46,
            borderRadius: 14,
            background: m.card,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: px(15),
            fontWeight: 800,
            color: m.pdark,
            boxShadow: "0 2px 8px rgba(36,31,27,0.12)",
            overflow: "hidden",
          }}
        >
          {card.logoUrl ? <img src={card.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initialsOf(card.name)}
        </span>
      </div>
      <div style={{ padding: "10px 12px 12px", lineHeight: "normal" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ flex: 1, minWidth: 0, fontSize: px(15), fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: m.ink }}>{card.name}</p>
          {card.rating && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: px(11.5), fontWeight: 700, whiteSpace: "nowrap", color: m.ink }} aria-label={`Rated ${card.rating.average.toFixed(1)} from ${card.rating.count} reviews`}>
              <Star size={12} fill={m.gold} strokeWidth={0} color={m.gold} aria-hidden />
              {card.rating.average.toFixed(1)}
              <span style={{ fontWeight: 600, color: m.faint }}>({card.rating.count})</span>
            </span>
          )}
        </div>
        <p style={{ fontSize: px(12), fontWeight: 600, color: m.pdark, marginTop: 2 }}>{typeLine(card.type, card.categories)}</p>
        <p style={{ fontSize: px(11.5), color: m.faint, marginTop: 2 }}>{card.location?.trim() || emptyAddress}</p>
        <p style={{ fontSize: px(12), color: m.ink2, lineHeight: lh(17), marginTop: 4, textWrap: "pretty" } as React.CSSProperties}>{card.bio?.trim() || emptyBio}</p>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: px(11.5), color: m.faint }}>{card.meta}</span>
          {card.chips.map((t) => (
            <span key={t} style={{ fontSize: px(10.5), fontWeight: 800, color: m.pdark, background: m.pale, borderRadius: 999, padding: "2px 8px" }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function YourCard({
  m: card,
  active,
  emptyBusiness,
  listedSub,
  listedEmptySub,
  hiddenSub,
  onPreview,
  emptyAddress,
  emptyBio,
}: {
  m: CardModel;
  active: boolean;
  emptyBusiness: boolean;
  listedSub: string;
  listedEmptySub: string;
  hiddenSub: string;
  onPreview: () => void;
  emptyAddress: string;
  emptyBio: string;
}) {
  const m = useMarketColors();
  return (
    <Card style={{ overflow: "hidden" }} data-yourcard>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBlock: "12px 0", paddingInline: "16px 12px" }}>
        <CapsLabel as="p">Your card</CapsLabel>
        <TextLink onClick={onPreview}>
          <Eye size={14} strokeWidth={2.2} aria-hidden />
          Preview as client
        </TextLink>
      </div>
      <div style={{ margin: "10px 16px 0" }}>
        <MiniCard m={card} dim={!active} emptyAddress={emptyAddress} emptyBio={emptyBio} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 14px", lineHeight: "normal" }}>
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: active ? m.good : m.high, boxShadow: `0 0 0 3px ${active ? m.goodbg : m.highbg}`, flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: px(13.5), fontWeight: 700, color: active ? m.good : m.high }}>{active ? "Listed on Explore" : "Hidden from Explore"}</span>
          <span style={{ display: "block", fontSize: px(11.5), color: m.faint, marginTop: 1 }}>{active ? (emptyBusiness ? listedEmptySub : listedSub) : hiddenSub}</span>
        </span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Photos card (kept: MA1-001 rows 8-8c)

export function PhotosCard({ photos, line, onOpen }: { photos: string[]; line: string; onOpen: () => void }) {
  const m = useMarketColors();
  const slots = [0, 1, 2, 3];
  return (
    <Card style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ fontSize: px(14), fontWeight: 700, color: m.ink, lineHeight: "normal" }}>Photos</p>
        <TextLink onClick={onOpen} style={{ gap: 2, marginInlineEnd: -4 }}>
          {photos.length ? "Manage" : "Add photos"}
          <ChevronRight size={14} aria-hidden />
        </TextLink>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6 }}>
        {slots.map((i) =>
          photos[i] ? (
            <span key={i} style={{ position: "relative", aspectRatio: "4 / 3", borderRadius: 12, overflow: "hidden", background: m.soft }}>
              {/* A teammate's photo waiting for approval has no public file yet: the tile stays empty. */}
              <img key={photos[i]} src={photos[i]} alt="" onError={(e) => (e.currentTarget.style.visibility = "hidden")} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {i === 0 && <span style={{ position: "absolute", insetInlineStart: 4, top: 4, fontSize: px(9), fontWeight: 800, background: m.card, color: m.ink, borderRadius: 999, padding: "1px 5px" }}>Cover</span>}
            </span>
          ) : (
            <button
              key={i}
              type="button"
              onClick={onOpen}
              aria-label="Add photos"
              tabIndex={i === photos.length ? 0 : -1}
              className="market-focus"
              style={{ aspectRatio: "4 / 3", borderRadius: 12, border: `1.5px dashed ${m.border}`, background: m.soft, color: m.tert, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <Plus size={16} strokeWidth={2} aria-hidden />
            </button>
          )
        )}
      </div>
      <p style={{ fontSize: px(11.5), color: m.faint, marginTop: 8, lineHeight: "normal" }}>{line}</p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Activities / Item categories (kept: MA1-001 row 9, MA1-037)

export function CategoriesCard({
  kind,
  title,
  sub,
  value,
  canEdit,
  onApply,
  openSignal,
}: {
  kind: "classes" | "gym" | "store";
  title: string;
  sub: string;
  value: string[];
  canEdit: boolean;
  onApply: (next: string[]) => Promise<string | null>;
  /** Bumped by the strength checklist's Activities row: scroll here and open. */
  openSignal: number;
}) {
  const m = useMarketColors();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);
  const [up, setUp] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [lastSignal, setLastSignal] = useState(openSignal);
  const options = CATEGORY_KEYS[kind];

  const show = () => {
    setDraft(value);
    setError(null);
    setOpen(true);
  };
  if (openSignal !== lastSignal) {
    setLastSignal(openSignal);
    if (canEdit) show();
  }

  useLayoutEffect(() => {
    if (!open || !fieldRef.current) return;
    const r = fieldRef.current.getBoundingClientRect();
    // PopupMenu rule: open upward unless there is no room above.
    const menuH = 120 + options.length * 50;
    setUp(r.top > menuH || window.innerHeight - r.bottom < menuH);
    cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, options.length]);

  const toggle = (k: string) => setDraft((d) => (d.includes(k) ? d.filter((x) => x !== k) : d.length >= MAX_CATEGORIES ? d : [...d, k]));
  const apply = async () => {
    setBusy(true);
    const msg = await onApply(draft);
    setBusy(false);
    if (msg) setError(msg);
    else setOpen(false);
  };
  const chips = value.map((k) => CATEGORY_LABEL[k] ?? k);

  return (
    <div ref={cardRef}>
      <Card style={{ padding: "14px 16px" }}>
        <p style={{ fontSize: px(14), fontWeight: 700, color: m.ink, lineHeight: "normal" }}>{title}</p>
        <p style={{ fontSize: px(11.5), color: m.faint, lineHeight: "normal" }}>{sub}</p>
        <div style={{ position: "relative" }}>
          <button
            ref={fieldRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={`${title}: ${chips.length ? chips.join(", ") : "none chosen"}`}
            disabled={!canEdit}
            onClick={() => (open ? setOpen(false) : show())}
            className="market-focus"
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
              minHeight: 48,
              width: "100%",
              borderRadius: 14,
              border: `1px solid ${open ? m.fill : m.border}`,
              padding: "6px 12px",
              boxSizing: "border-box",
              flexWrap: "wrap",
              background: m.sgrey,
              cursor: canEdit ? "pointer" : "default",
              textAlign: "start",
              fontFamily: "inherit",
              opacity: canEdit ? 1 : 0.6,
            }}
          >
            {(chips.length ? chips : ["Choose"]).map((t) => (
              <span key={t} style={{ fontSize: px(12), fontWeight: 700, background: m.pale, color: m.pdark, borderRadius: 8, padding: "3px 9px" }}>
                {t}
              </span>
            ))}
            <span style={{ marginInlineStart: "auto", display: "flex", color: m.faint }}>
              <ChevronDown size={16} strokeWidth={2.4} aria-hidden />
            </span>
          </button>
          {open && (
            <div
              role="listbox"
              aria-multiselectable="true"
              aria-label={title}
              style={{
                position: "absolute",
                insetInlineStart: 0,
                insetInlineEnd: 0,
                ...(up ? { bottom: 56 } : { top: 62 }),
                zIndex: 5,
                background: m.card,
                border: `1px solid ${hexAlpha("#AEA1DC", 0.5)}`,
                borderRadius: 14,
                boxShadow: "0 12px 32px rgba(95,80,147,0.18)",
                padding: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBlock: "0 2px", marginInline: "4px 0" }}>
                <CapsLabel as="p">{`${title} · ${draft.length} chosen`}</CapsLabel>
                <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="tap market-focus" style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: m.faint, background: "transparent", border: 0 }}>
                  <X size={16} strokeWidth={2.4} aria-hidden />
                </button>
              </div>
              {options.map((k) => {
                const on = draft.includes(k);
                const blocked = !on && draft.length >= MAX_CATEGORIES;
                return (
                  <button
                    key={k}
                    type="button"
                    role="option"
                    aria-selected={on}
                    aria-disabled={blocked}
                    onClick={() => !blocked && toggle(k)}
                    className="market-focus"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      borderRadius: 14,
                      padding: "0 14px",
                      marginTop: 6,
                      border: `1.5px solid ${on ? m.fill : "transparent"}`,
                      background: on ? m.pale : m.sgrey,
                      minHeight: 44,
                      boxSizing: "border-box",
                      width: "100%",
                      textAlign: "start",
                      color: m.ink,
                      opacity: blocked ? 0.45 : 1,
                      cursor: blocked ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <span style={{ flex: 1, fontSize: px(14), fontWeight: 600 }}>{CATEGORY_LABEL[k] ?? k}</span>
                    <span style={{ display: "flex", color: on ? m.pdark : m.tert }}>{on ? <SquareCheck size={17} strokeWidth={2.4} aria-hidden /> : <Square size={17} strokeWidth={2.4} aria-hidden />}</span>
                  </button>
                );
              })}
              {error && <p role="alert" style={{ fontSize: px(11.5), fontWeight: 700, color: m.high, margin: "8px 4px 0" }}>{error}</p>}
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)", gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setDraft([])} className="market-focus" style={{ height: 40, borderRadius: 12, border: 0, color: m.cancelink, background: m.cancelbg, fontSize: px(13), fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
                  Clear
                </button>
                <button type="button" onClick={() => void apply()} disabled={busy} className="market-focus" style={{ height: 40, borderRadius: 12, background: m.fill, color: m.onfill, border: 0, fontSize: px(13), fontWeight: 700, opacity: busy ? 0.6 : 1, fontFamily: "inherit", cursor: "pointer" }}>
                  {`Apply · ${draft.length}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rating card (kept: MA1-001 row 10 → Reputation)

export function RatingCard({ average, count, onOpen }: { average: number | null; count: number; onOpen: () => void }) {
  const m = useMarketColors();
  if (count === 0) return null;
  const few = count < 3 || average === null;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={few ? "No reviews yet" : `Rated ${average.toFixed(1)} from ${count} reviews`}
      className="market-focus"
      style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, width: "100%", borderRadius: 24, background: m.card, border: `1px solid ${m.border}`, textAlign: "start", color: m.ink, cursor: "pointer", fontFamily: "inherit", lineHeight: "normal", boxSizing: "border-box" }}
    >
      {few ? (
        <span style={{ flex: 1, fontSize: px(14), fontWeight: 700 }}>No reviews yet</span>
      ) : (
        <>
          <span style={{ fontSize: px(30), fontWeight: 800, letterSpacing: "-0.03em", lineHeight: lh(32), fontVariantNumeric: "tabular-nums" }}>{average.toFixed(1)}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", gap: 2 }} aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} style={{ position: "relative", width: 16, height: 16, display: "inline-flex" }}>
                  <Star size={16} strokeWidth={1.6} color={hexAlpha("#C08A1E", 0.3)} style={{ position: "absolute", inset: 0 }} />
                  <span style={{ position: "absolute", inset: 0, width: `${Math.max(0, Math.min(1, average - i)) * 100}%`, overflow: "hidden", color: m.gold }}>
                    <Star size={16} fill={m.gold} strokeWidth={1.6} />
                  </span>
                </span>
              ))}
            </span>
            <span style={{ display: "block", fontSize: px(11.5), color: m.faint, marginTop: 2 }}>{`${count} reviews`}</span>
          </span>
        </>
      )}
      <ChevronRight size={16} strokeWidth={2} color={m.faint} aria-hidden />
    </button>
  );
}
