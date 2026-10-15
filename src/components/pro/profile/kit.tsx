import React, { useEffect, useRef, useState } from "react";
import { BadgeCheck, CalendarPlus, ChevronLeft, Lock, UserPlus, type LucideIcon } from "lucide-react";
import { useBack } from "../../../hooks/useBack";
import { useApp } from "../../../context/AppContext";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { pairStacks } from "./profileModel";

// Release 3 · W6 the More sub-page pieces for the profile screens, from the
// board's own primitives (source/gen):
// - SubPage (more.js subPage + ui.js pageHead): back 36 (chevron 18 / 2
//   text.soft, 2 down), 6 to the title 27 / 700 -0.022em line 1.5, subtitle
//   13 / 500 text.faint 6 below, 20 under the head; the body 8 in from each
//   side and 12 up (padding 0 8, margin-top -12). `right` sits top right
//   (MO14 "Preview": 13 / 700 primary.deep, 12 down).
// - VerifiedTag (more.js verifiedTag): BadgeCheck 12 / 2 good, 3 apart, 10 / 700 good.
// - LockTile (r16 lockRight16): 28 square r9 soft fill, Lock 14 / 2 text.faint, aria "Locked".
// - CtaButton / ProfilePair (ui.js cta, r16 fixPin16): 48 high r14, pad 0 16,
//   14 / 700 with a 15 / 2 icon 7 apart; primary fill / onFill, secondary
//   primary.pale / primary.deep. The pair is the pinned bar's direct children,
//   flex 1 1 0 with an 8 gap; stacked full width with Hire on top when a half
//   is under 162 (360) or with Larger text.
// - SheetFooterCta (ui.js cta size sheet): 52 high r16.

export const SubPage: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  bottomPad?: number;
}> = ({ title, subtitle, right, children, bottomPad }) => {
  const back = useBack();
  return (
    <div style={{ paddingBottom: bottomPad }}>
      <div className="flex items-start justify-between" style={{ marginBottom: 20 }}>
        <div className="flex items-start min-w-0" style={{ gap: 6 }}>
          <button type="button" onClick={back} aria-label="Back" className="tap flex items-center justify-center shrink-0" style={{ width: 36, height: 36, marginTop: 2, color: INK.chS }}>
            <ChevronLeft size={18} strokeWidth={2} aria-hidden />
          </button>
          <div className="min-w-0">
            <h1 style={{ fontSize: textPx(27), fontWeight: 700, letterSpacing: "-0.022em", color: INK.ch, lineHeight: 1.5, overflowWrap: "anywhere" }}>{title}</h1>
            {subtitle && <p style={{ fontSize: textPx(13), fontWeight: 500, marginTop: 6, color: INK.chF }}>{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      <div style={{ padding: "0 8px", marginTop: -12 }}>{children}</div>
    </div>
  );
};

export const HeadLink: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="tap relative shrink-0 whitespace-nowrap before:absolute before:-inset-3 before:content-['']"
    style={{ fontSize: textPx(13), fontWeight: 700, color: INK.prDeep, marginTop: 12 }}
  >
    {label}
  </button>
);

export const VerifiedTag: React.FC<{ label?: string }> = ({ label = "Verified" }) => (
  <span className="inline-flex items-center shrink-0 whitespace-nowrap" style={{ gap: 3, fontSize: textPx(10), fontWeight: 700, color: INK.good }}>
    <BadgeCheck size={12} strokeWidth={2} aria-hidden />
    {label}
  </span>
);

export const LockTile: React.FC = () => (
  <span aria-label="Locked" role="img" className="inline-flex items-center justify-center shrink-0" style={{ width: 28, height: 28, borderRadius: 9, background: INK.soft }}>
    <Lock size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
  </span>
);

export const CtaButton: React.FC<{
  label: string;
  icon?: LucideIcon;
  variant?: "primary" | "secondary";
  size?: "page" | "sheet";
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  full?: boolean;
  ariaLabel?: string;
}> = ({ label, icon: Icon, variant = "primary", size = "page", onClick, disabled, busy, full, ariaLabel }) => {
  const primary = variant === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-label={ariaLabel}
      aria-busy={busy || undefined}
      className="tap inline-flex items-center justify-center whitespace-nowrap disabled:opacity-60"
      style={{
        flex: full ? "none" : "1 1 0",
        width: full ? "100%" : undefined,
        minWidth: 0,
        height: size === "sheet" ? 52 : 48,
        borderRadius: size === "sheet" ? 16 : 14,
        background: primary ? INK.fill : INK.prPale,
        color: primary ? INK.onFill : INK.prDeep,
        gap: 7,
        padding: "0 16px",
        fontSize: textPx(14),
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {Icon && <Icon size={15} strokeWidth={2} aria-hidden />}
      <span className="truncate">{busy ? "Saving…" : label}</span>
    </button>
  );
};

/** Watches an element's width (the app column, not the window: desktop puts it in a 430 column). */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/**
 * MO3 v3 Hire and Book a session (r16 btnSpec16), the pinned bar's content:
 * equal halves, Book a session (secondary) then Hire (primary); stacked full
 * width with Hire on top at 360 and with Larger text.
 */
export const HireBookPair: React.FC<{
  firstName: string;
  onHire?: () => void;
  onBook?: () => void;
  disabled?: boolean;
}> = ({ firstName, onHire, onBook, disabled }) => {
  const { accessibility } = useApp();
  const [ref, w] = useWidth<HTMLDivElement>();
  // The bar is 16 in from each edge of the column: the column is w + 32.
  const stack = w > 0 && pairStacks(w + 32, accessibility.largerText);
  const hire = <CtaButton key="hire" label={firstName ? `Hire ${firstName}` : "Hire"} icon={UserPlus} onClick={onHire} disabled={disabled} full={stack} />;
  const book = <CtaButton key="book" label="Book a session" icon={CalendarPlus} variant="secondary" onClick={onBook} disabled={disabled} full={stack} />;
  return (
    <div ref={ref} className="flex" data-stacked={stack ? "true" : undefined} style={{ gap: 8, flexDirection: stack ? "column" : "row" }}>
      {stack ? [hire, book] : [book, hire]}
    </div>
  );
};

/** ui.js secLabel over a block (the board's sSection label, 32 apart). */
export const Section: React.FC<{ label: string; first?: boolean; right?: React.ReactNode; children: React.ReactNode }> = ({ label, first, right, children }) => (
  <section style={{ marginTop: first ? 0 : 32 }}>
    <div className="flex items-center justify-between" style={{ paddingBottom: 7.5, borderBottom: `1.5px solid ${INK.pr}` }}>
      <h2 style={{ fontSize: textPx(11), fontWeight: 600, lineHeight: "14px", textTransform: "uppercase", letterSpacing: "0.14em", color: INK.chF }}>{label}</h2>
      {right}
    </div>
    <div>{children}</div>
  </section>
);

/** A one-line state under a section (empty, coming soon): 12.5 / 1.5 text.faint, 13 0. */
export const StateLine: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ padding: "13px 0", fontSize: textPx(12.5), lineHeight: 1.5, color: INK.chF }}>{children}</p>
);

/** The lock / info footnote (r16 pubEdit16 and profile16): icon 12 / 2, 11.5 / 1.45 text.faint, gap 6. */
export const FootNote: React.FC<{ icon: LucideIcon; children: React.ReactNode; style?: React.CSSProperties }> = ({ icon: Icon, children, style }) => (
  <p className="flex" style={{ gap: 6, fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.45, ...style }}>
    <Icon size={12} strokeWidth={2} aria-hidden style={{ flexShrink: 0, marginTop: 3 }} />
    <span>{children}</span>
  </p>
);

/** An inline error line under a control. */
export const ErrorLine: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 8 }}>
    {children}
  </p>
);
