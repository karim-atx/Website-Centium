import React from "react";
import { ChevronLeft, EllipsisVertical, type LucideIcon } from "lucide-react";
import { INK } from "../proInk";
import { textPx } from "../../../theme/textSize";
import { useIsDark } from "../../../hooks/useIsDark";

/**
 * Release 3 · W5 Library › Programmes: the board's pieces for TR1 to TR22,
 * literal values from source/gen:
 * - SquareBtn (r6b sqBtn6): 40 × 40, r12, soft fill, 1px 10% border, icon 16
 *   / 1.75 text.soft; on = primary.pale fill, primary border, primary.deep
 *   icon; count badge 16 high, 9.5 / 800 on the fill;
 * - FilterChip (r6c trLibrary6 chips): r9999, pad 7 13, 12, 1px border
 *   (text 11% idle, fill when on), card fill / fill, 600 / 700;
 * - LibCard (r6c libCard6): r20, card fill + border, pad 14 14 14 16, gap 12,
 *   tile 38 r12 (tinted by the colour, else lavender), icon 17 / 1.75, title
 *   14 / 700, sub 12 text.faint, meta chips row (gap 4, m-top 5), ⋮ 16 / 2;
 * - DetailHeader (head19 with back): back 44 hit, title 19 / 700 -0.03em,
 *   eyebrow 11 / 600 caps 0.14em text.faint;
 * - Fab (r10 fab10): 56 round, 20 from the right, 104 up, fill with the
 *   shadow 0 10px 24px rgba(95,80,147,0.28), plus 22 / 2 on-fill — placed
 *   like pages/food/Food.tsx's button (fixed, safe-area and --app-gutter).
 */

export const SquareBtn = React.forwardRef<HTMLButtonElement, { icon: LucideIcon; label: string; onClick: () => void; on?: boolean; count?: number; filled?: boolean; onPointerDown?: React.PointerEventHandler; onPointerUp?: React.PointerEventHandler; onPointerLeave?: React.PointerEventHandler }>(
  ({ icon: Icon, label, onClick, on, count, filled, ...pointer }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={on}
      {...pointer}
      className="tap relative flex items-center justify-center shrink-0 before:absolute before:-inset-[2px] before:content-['']"
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: filled ? INK.fill : on ? INK.prPale : INK.soft,
        border: `1px solid ${filled ? INK.fill : on ? INK.pr : INK.b10}`,
      }}
    >
      <Icon size={filled ? 20 : 16} strokeWidth={filled ? 2 : 1.75} aria-hidden style={{ color: filled ? INK.onFill : on ? INK.prDeep : INK.chS }} />
      {!!count && (
        <span
          className="absolute flex items-center justify-center"
          style={{ top: -5, insetInlineEnd: -5, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 9999, background: INK.fill, color: INK.onFill, fontSize: textPx(9.5), fontWeight: 800 }}
        >
          {count}
        </span>
      )}
    </button>
  )
);
SquareBtn.displayName = "SquareBtn";

export const FilterChip: React.FC<{ label: string; on: boolean; onClick: () => void }> = ({ label, on, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className="tap whitespace-nowrap shrink-0 relative before:absolute before:-inset-y-[6px] before:inset-x-0 before:content-['']"
    style={{
      borderRadius: 9999,
      padding: "7px 13px",
      fontSize: textPx(12),
      border: `1px solid ${on ? INK.fill : "rgb(var(--c-charcoal) / 0.11)"}`,
      background: on ? INK.fill : INK.card,
      color: on ? INK.onFill : INK.chS,
      fontWeight: on ? 700 : 600,
    }}
  >
    {label}
  </button>
);

/** A hue's tile tint: the colour at 14% (dark 22%), as the board's tint(). */
const tint = (hex: string, dark: boolean) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return dark ? "rgba(174,161,220,0.14)" : "#F0EDF9";
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${dark ? 0.22 : 0.14})`;
};

export const LibCard: React.FC<{
  icon: LucideIcon;
  colour?: string;
  title: string;
  sub: string;
  meta?: React.ReactNode;
  onOpen: () => void;
  onMenu?: (anchor: HTMLElement) => void;
  menuLabel?: string;
}> = ({ icon: Icon, colour, title, sub, meta, onOpen, onMenu, menuLabel }) => {
  const dark = useIsDark();
  return (
    <div className="flex items-center" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, paddingBlock: "14px", paddingInline: "16px 14px", marginBottom: 8, gap: 12 }}>
      <button type="button" onClick={onOpen} className="tap flex-1 min-w-0 flex items-center text-start" style={{ gap: 12 }}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 12, background: colour ? tint(colour, dark) : dark ? "rgba(174,161,220,0.14)" : "#F0EDF9" }}>
          <Icon size={17} strokeWidth={1.75} aria-hidden style={{ color: colour ?? INK.prAccent }} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch, overflowWrap: "anywhere" }}>
            {title}
          </span>
          <span className="block" style={{ fontSize: textPx(12), color: INK.chF }}>
            {sub}
          </span>
          {meta && (
            <span className="flex flex-wrap" style={{ gap: 4, marginTop: 5 }}>
              {meta}
            </span>
          )}
        </span>
      </button>
      {onMenu && (
        <button
          type="button"
          onClick={(e) => onMenu(e.currentTarget)}
          aria-label={menuLabel ?? `Options for ${title}`}
          className="tap relative shrink-0 self-start flex items-center justify-center before:absolute before:-inset-3 before:content-['']"
          style={{ width: 20, height: 20 }}
        >
          <EllipsisVertical size={16} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
        </button>
      )}
    </div>
  );
};

export const DetailHeader: React.FC<{ title: string; eyebrow?: string; onBack: () => void; right?: React.ReactNode }> = ({ title, eyebrow, onBack, right }) => (
  <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
    <button type="button" onClick={onBack} aria-label="Back" className="tap flex items-center justify-center shrink-0" style={{ width: 44, height: 44, marginInlineStart: -12 }}>
      <ChevronLeft size={22} strokeWidth={2} aria-hidden style={{ color: INK.ch }} />
    </button>
    <div className="flex-1 min-w-0">
      {eyebrow && <p style={{ fontSize: textPx(11), fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: INK.chF }}>{eyebrow}</p>}
      <h2 style={{ fontSize: textPx(19), lineHeight: 1.4, fontWeight: 700, letterSpacing: "-0.03em", color: INK.ch, overflowWrap: "anywhere" }}>{title}</h2>
    </div>
    {right}
  </div>
);

export const Fab: React.FC<{ label: string; onClick: () => void; icon: LucideIcon }> = ({ label, onClick, icon: Icon }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="tap fixed bottom-[calc(env(safe-area-inset-bottom)+104px+var(--active-bar,0px))] end-[calc(var(--app-gutter)+20px)] z-30 w-14 h-14 rounded-full flex items-center justify-center"
    style={{ background: INK.fill, boxShadow: "0 10px 24px rgba(95,80,147,0.28)" }}
  >
    <Icon size={22} strokeWidth={2} aria-hidden style={{ color: INK.onFill }} />
  </button>
);

/** A small inline status line: refused writes and failed refreshes. */
export const ErrorLine: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p role="alert" style={{ fontSize: textPx(11.5), fontWeight: 600, color: INK.hi, marginBottom: 12 }}>
    {children}
  </p>
);
