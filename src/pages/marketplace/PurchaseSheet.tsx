import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { CentiumLockup } from "../../components/icons/CentiumMark";
import { useIsDark } from "../../hooks/useIsDark";
import { useBackCloses } from "../../hooks/useBackCloses";
import { textPx, linePx } from "../../theme/textSize";
import { NO_ICON_SCALE } from "../../components/pro/proInk";
import { marketPalette } from "../../theme/marketTokens";
import { FOCUS_CSS, usePress } from "../../components/market/usePress";

// Market + Share 3.0 · W2 · the purchase / booking sheet (C-MO.4.2.2
// `memberSheet`, C-MO.4.3.2 `classSheet`; HANDOVER §4 "Purchase / booking
// sheets") and its confirmation page (`memberDone`, `classDone`). One
// component for the gym membership checkout (GymPage) and the class Book
// sheet (ClassPage). Literal values, Client Explore Screens lines 152–201 and
// 319–356:
// - MasterBottomSheet chrome (the app's BottomSheet defaults: band #F0EEFD,
//   1px #7248F8, radius 32, 53 title bar 20 / 800 #7248F8, 26 close ring,
//   body #FFFFFF radius 22 padding 20; footer 8 20 34 under a 1px #F2F2F2
//   rule; CTA 50 radius 16 #AEA1DC 15 / 700);
// - the body: a column, gap 12, of --sgrey boxes (radius 14, padding 12 14,
//   the label 13 / 500 --slabel 8 above its content);
// - the plan box: a --sfield field (radius 10, padding 11 13, column gap 6,
//   12.5): the plan and price 14 / 800, then key / value rows (--ink2 /
//   700 right-aligned, gap 12);
// - the class ticket: the --sgrey ticket with the 72 price stub (1.5px dashed
//   --fill, --pale, the price 18 / 800 --pdark) and its two 14 notches in
//   --sbody at right 65;
// - payment rows: a column, gap 6; each padding 9 13, radius 10, --sfield,
//   gap 12; the 20 radio (selected 6px --segactive, else 1.5px --border); the
//   name 14 / 700 and the line 11 --faint; selected border 1.5px
//   --segactive, else 0.5px --border.
// Pre-decided: payment is cash at the venue only. App Store / Google Play and
// Whish Money keep their rows, greyed (opacity 0.4, the CTA's disabled
// treatment) with "Coming soon"; Cash is the one selected row.

const PAY_ROWS: { key: "store" | "whish" | "cash"; name: string }[] = [
  { key: "store", name: "App Store / Google Play" },
  { key: "whish", name: "Whish Money" },
  { key: "cash", name: "Cash" },
];

/** A labelled --sgrey box (the sheet's sections). */
export const SheetBox: React.FC<{ label: string; children: React.ReactNode; id?: string }> = ({ label, children, id }) => {
  const m = marketPalette(useIsDark());
  return (
    <div role="group" aria-labelledby={id} style={{ background: m.sgrey, borderRadius: 14, padding: "12px 14px" }}>
      <div id={id} style={{ fontSize: textPx(13), fontWeight: 500, color: m.slabel, marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  );
};

/** The membership plan field: name and price, then key / value rows. */
export const PlanSummary: React.FC<{ name: string; price: string; rows: { k: string; v: string }[] }> = ({ name, price, rows }) => {
  const m = marketPalette(useIsDark());
  return (
    <SheetBox label="Plan" id="purchase-plan">
      <div style={{ background: m.card, borderRadius: 10, padding: "11px 13px", display: "flex", flexDirection: "column", gap: 6, fontSize: textPx(12.5), color: m.ink }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: textPx(14), minWidth: 0 }}>{name}</span>
          <span style={{ fontWeight: 800, fontSize: textPx(14), whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{price}</span>
        </div>
        {rows.map((r) => (
          <div key={r.k} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: m.ink2, flexShrink: 0 }}>{r.k}</span>
            <span style={{ fontWeight: 700, textAlign: "right", minWidth: 0 }}>{r.v}</span>
          </div>
        ))}
      </div>
    </SheetBox>
  );
};

/**
 * The class ticket (classSheet): "Class", the title 15 / 800, the venue and
 * instructor 12 / 600 --accent, the time line 12 --ink2, "14 of 20 booked"
 * 11 --faint and the 3 tall bar (--sfield track, --segactive fill); the 72
 * price stub.
 */
export const ClassTicketSummary: React.FC<{ title: string; place: string; when: string; booked: string; pct: number; price: string }> = ({ title, place, when, booked, pct, price }) => {
  const m = marketPalette(useIsDark());
  const notch: React.CSSProperties = { position: "absolute", right: 65, width: 14, height: 14, borderRadius: 999, background: m.sbody };
  return (
    <div role="group" aria-label="Class" style={{ position: "relative", display: "flex", borderRadius: 14, background: m.sgrey, overflow: "hidden", color: m.ink }}>
      <div style={{ flex: 1, minWidth: 0, padding: "12px 14px" }}>
        <div style={{ fontSize: textPx(13), fontWeight: 500, color: m.slabel, marginBottom: 8 }}>Class</div>
        <div style={{ fontSize: textPx(15), fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: textPx(12), fontWeight: 600, color: m.accent }}>{place}</div>
        <div style={{ fontSize: textPx(12), color: m.ink2, marginTop: 2 }}>{when}</div>
        <div style={{ marginTop: 10, fontSize: textPx(11), color: m.faint }}>{booked}</div>
        <div aria-hidden style={{ marginTop: 4, height: 3, borderRadius: 999, background: m.card, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, pct))}%`, background: m.segactive }} />
        </div>
      </div>
      <div style={{ width: 72, flexShrink: 0, borderLeft: `1.5px dashed ${m.fill}`, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: textPx(18), fontWeight: 800, color: m.pdark, whiteSpace: "nowrap" }}>{price}</span>
      </div>
      <span aria-hidden style={{ ...notch, top: -7 }} />
      <span aria-hidden style={{ ...notch, bottom: -7 }} />
    </div>
  );
};

/** The payment box: cash selected, the store and Whish rows greyed "Coming soon". */
export const PaymentMethods: React.FC<{ cashHint: string }> = ({ cashHint }) => {
  const m = marketPalette(useIsDark());
  return (
    <SheetBox label="Payment method" id="purchase-payment">
      <div role="radiogroup" aria-labelledby="purchase-payment" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {PAY_ROWS.map((r) => {
          const on = r.key === "cash";
          return (
            <div
              key={r.key}
              role="radio"
              aria-checked={on}
              aria-disabled={!on || undefined}
              tabIndex={on ? 0 : -1}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "9px 13px",
                borderRadius: 10,
                background: m.card,
                border: on ? `1.5px solid ${m.segactive}` : `0.5px solid ${m.border}`,
                opacity: on ? 1 : 0.4,
              }}
            >
              <span aria-hidden style={{ width: 20, height: 20, borderRadius: 999, boxSizing: "border-box", border: on ? `6px solid ${m.segactive}` : `1.5px solid ${m.border}`, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: textPx(14), fontWeight: 700, color: m.ink }}>{r.name}</div>
                <div style={{ fontSize: textPx(11), color: m.faint }}>{on ? cashHint : "Coming soon"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </SheetBox>
  );
};

export interface PurchaseSheetProps {
  open: boolean;
  onClose: () => void;
  /** "Join Hamra Strength Club" / "Book Spin 45". */
  title: string;
  /** The plan box or the class ticket (PlanSummary / ClassTicketSummary). */
  summary: React.ReactNode;
  /** The Cash row's line ("Pay at the front desk on your first visit" / "… before class"); null hides the payment box (a free class). */
  cashHint: string | null;
  /** "Confirm and pay $45" (or "Confirm booking" when free). */
  ctaLabel: string;
  busy?: boolean;
  disabled?: boolean;
  /** A refusal or failure, shown under the boxes. */
  error?: string | null;
  /** Extra lines under the boxes (the offline line, a note). */
  note?: React.ReactNode;
  onConfirm: () => void;
}

export const PurchaseSheet: React.FC<PurchaseSheetProps> = ({ open, onClose, title, summary, cashHint, ctaLabel, busy, disabled, error, note, onConfirm }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const press = usePress();
  const off = !!disabled || !!busy;
  return (
    <BottomSheet
      open={open}
      onClose={() => !busy && onClose()}
      title={title}
      footerRule
      footer={
        <>
          <style>{FOCUS_CSS}</style>
          <button
            type="button"
            onClick={() => !off && onConfirm()}
            aria-disabled={off || undefined}
            aria-busy={busy || undefined}
            className="market-focus"
            {...press.handlers}
            style={{
              width: "100%",
              height: 50,
              borderRadius: 16,
              border: 0,
              background: m.fill,
              color: m.onfill,
              font: "inherit",
              fontSize: textPx(15),
              fontWeight: 700,
              cursor: off ? "default" : "pointer",
              opacity: disabled ? 0.4 : 1,
              ...(off ? {} : press.style),
            }}
          >
            {busy ? "One moment…" : ctaLabel}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, lineHeight: "normal" }}>
        {summary}
        {cashHint !== null ? <PaymentMethods cashHint={cashHint} /> : null}
        {note}
        {error ? (
          <p role="alert" style={{ margin: 0, fontSize: textPx(12), lineHeight: linePx(17), fontWeight: 600, color: m.high }}>
            {error}
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
};

// ---------------------------------------------------------------------------
// The confirmation page (memberDone / classDone, lines 184–202): a full
// screen over the app (the board draws it without the navbar), a column
// (min-height 797, padding 0 24 34): centred (gap 10) the Centium lockup
// 104 × 127.5, the title 22 / 800 (margin-top 6), the body 13 / 19.5 --ink2
// (max 280), the rows box (margin-top 14, --soft, radius 16, padding 12 14,
// gap 6, 12.5: --ink2 key, 700 value), the "Saved to My Bookings" pill
// (margin-top 6, 12 / 700 --tealink on --tealbg, radius 999, padding 4 10,
// the 13 tick); then the actions (gap 8): "View My Bookings" 52 radius 16
// --fill 15 / 800, "Done" 48 14 / 700 --ink2.

export interface BookingDoneProps {
  open: boolean;
  title: string;
  body: string;
  rows: { k: string; v: string }[];
  /** My bookings' tab to open ("memberships" / "upcoming"). */
  bookingsTab: "memberships" | "upcoming";
  /** Extra content under the pill (the class's "Added to your calendar"). */
  extra?: React.ReactNode;
  onDone: () => void;
}

export const BookingDone: React.FC<BookingDoneProps> = ({ open, title, body, rows, bookingsTab, extra, onDone }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const press = usePress();
  useBackCloses(open, onDone);
  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDone]);
  if (!open) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-done-title"
      className="fixed inset-0 overflow-y-auto"
      style={{ zIndex: 70, background: m.page, color: m.ink, lineHeight: "normal" }}
    >
      <style>{FOCUS_CSS}</style>
      <div
        className="mx-auto"
        style={{ maxWidth: 430, minHeight: "100dvh", boxSizing: "border-box", padding: "max(47px, env(safe-area-inset-top)) 24px max(34px, calc(env(safe-area-inset-bottom) + 20px))", display: "flex", flexDirection: "column" }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 10 }}>
          <CentiumLockup width={104} />
          <h1 id="booking-done-title" ref={titleRef} tabIndex={-1} style={{ margin: "6px 0 0", fontSize: textPx(22), fontWeight: 800, outline: "none" }}>
            {title}
          </h1>
          <p style={{ margin: 0, fontSize: textPx(13), lineHeight: linePx(19.5), color: m.ink2, maxWidth: 280 }}>{body}</p>
          <div style={{ marginTop: 14, width: "100%", borderRadius: 16, background: m.soft, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, fontSize: textPx(12.5), textAlign: "left", boxSizing: "border-box" }}>
            {rows.map((r) => (
              <div key={r.k} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ color: m.ink2, flexShrink: 0 }}>{r.k}</span>
                <span style={{ fontWeight: 700, textAlign: "right", minWidth: 0 }}>{r.v}</span>
              </div>
            ))}
          </div>
          <span style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, fontSize: textPx(12), fontWeight: 700, color: m.tealink, background: m.tealbg, borderRadius: 999, padding: "4px 10px" }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Saved to My Bookings
          </span>
          {extra}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            className="market-focus"
            {...press.handlers}
            onClick={() => {
              onDone();
              navigate(`/app/marketplace/bookings?tab=${bookingsTab}`);
            }}
            style={{ height: 52, borderRadius: 16, border: 0, background: m.fill, color: m.onfill, font: "inherit", fontSize: textPx(15), fontWeight: 800, cursor: "pointer", ...press.style }}
          >
            View My Bookings
          </button>
          <button type="button" className="market-focus" onClick={onDone} style={{ height: 48, border: 0, background: "none", font: "inherit", fontSize: textPx(14), fontWeight: 700, color: m.ink2, cursor: "pointer" }}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
