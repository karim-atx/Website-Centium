import React from "react";
import { ChevronRight, Lock, ShieldCheck, type LucideIcon } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { initialsOf, toneOf, type Tone } from "./clientFormat";

export type { Tone } from "./clientFormat";

/**
 * Release 3 · W3 the client page's building blocks, from the board's own
 * primitives (source/gen/ui.js and r6b.js), with literal values:
 * - SectionHead (ui.js sectionHead): 11 / 600 caps 0.14em text.faint, 1.5
 *   primary rule, pad-bottom 7.5, m-bottom 10; the right link 12 / 700
 *   primary.deep;
 * - ListCard (r6b listCard6): r20, card fill and border, pad 4 14; rows pad
 *   11 0, 1px 6% rules, tile 34 r11 (lavender #F0EDF9 / dark 14%) with a 16
 *   / 1.75 primary.accent icon, title 13 / 600, meta 11 / 1.4 text.faint,
 *   chevron 14 text.faint (or the row's chip);
 * - Chip (r6b chip6): 10.5 / 700, pad 2 8, r9999, by tone;
 * - Pill (ui.js pill): 10 / 700 caps 0.025em, pad 2 8, r9999, by tone;
 * - NumBox (ui.js numBox): r18, pad 12 12 11, label 10.5 / 600, value 22 /
 *   800 -0.02em, delta 11 / 700 with a trend arrow;
 * - SharedChips (profile.js sharedRow): 26 high, pad 0 10, r9999, 11 / 700,
 *   teal pale + shield when shared, soft + lock when not;
 * - Avatar (ui.js avatar): tone fills, initials 33% / 800.
 */


export const SectionHead: React.FC<{ label: string; right?: React.ReactNode; onRight?: () => void; className?: string }> = ({ label, right, onRight, className }) => (
  <div className={`flex items-center justify-between ${className ?? ""}`} style={{ marginBottom: 10, paddingBottom: 7.5, borderBottom: `1.5px solid ${INK.pr}` }}>
    <h2 style={{ fontSize: textPx(11), fontWeight: 600, lineHeight: "14px", textTransform: "uppercase", letterSpacing: "0.14em", color: INK.chF }}>{label}</h2>
    {right &&
      (onRight ? (
        <button type="button" onClick={onRight} className="tap flex items-center relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep, gap: 2 }}>
          {right}
          <ChevronRight size={12} strokeWidth={2.4} aria-hidden />
        </button>
      ) : (
        <span style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>{right}</span>
      ))}
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; pad?: string; className?: string; style?: React.CSSProperties }> = ({ children, pad = "14px 16px", className, style }) => (
  <div className={className} style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: pad, marginBottom: 12, ...style }}>
    {children}
  </div>
);

export interface ListRow {
  key: string;
  icon?: LucideIcon;
  tone?: Tone;
  title: React.ReactNode;
  meta?: React.ReactNode;
  /** A chip or control at the end; omitted rows with onClick show the chevron. */
  trailing?: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}

export const ListCard: React.FC<{ rows: ListRow[]; more?: { label: string; onClick: () => void } }> = ({ rows, more }) => {
  const dark = useIsDark();
  return (
    <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "4px 14px", marginBottom: 12 }}>
      {rows.map((r, i) => {
        const t = r.tone ? toneOf(r.tone) : null;
        const inner = (
          <>
            {r.icon && (
              <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 11, background: t ? t.bg : dark ? "rgba(174,161,220,0.14)" : "#F0EDF9" }}>
                <r.icon size={16} strokeWidth={1.75} aria-hidden style={{ color: t ? t.ink : INK.prAccent }} />
              </span>
            )}
            <span className="flex-1 min-w-0 text-start">
              <span className="block" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>
                {r.title}
              </span>
              {r.meta && (
                <span className="block" style={{ fontSize: textPx(11), color: INK.chF, lineHeight: 1.4, overflowWrap: "anywhere" }}>
                  {r.meta}
                </span>
              )}
            </span>
            {r.trailing ?? (r.onClick ? <ChevronRight size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF, flexShrink: 0 }} /> : null)}
          </>
        );
        const style: React.CSSProperties = { gap: 12, padding: "11px 0", minHeight: 44, borderBottom: i < rows.length - 1 || more ? `1px solid ${INK.b06}` : "none" };
        return r.onClick ? (
          <button key={r.key} type="button" onClick={r.onClick} aria-label={r.ariaLabel} className="tap w-full flex items-center" style={style}>
            {inner}
          </button>
        ) : (
          <div key={r.key} className="flex items-center" style={style}>
            {inner}
          </div>
        );
      })}
      {more && (
        <button type="button" onClick={more.onClick} className="tap w-full flex items-center" style={{ gap: 2, padding: "10px 0", minHeight: 44, fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
          {more.label}
          <ChevronRight size={12} strokeWidth={2.4} aria-hidden />
        </button>
      )}
    </div>
  );
};

export const Chip: React.FC<{ label: string; tone?: Tone }> = ({ label, tone = "pr" }) => {
  const t = toneOf(tone);
  return (
    <span className="whitespace-nowrap shrink-0" style={{ fontSize: textPx(10.5), fontWeight: 700, padding: "2px 8px", borderRadius: 9999, background: t.bg, color: t.ink }}>
      {label}
    </span>
  );
};

export const Pill: React.FC<{ label: string; tone?: Tone }> = ({ label, tone = "pr" }) => {
  const t = toneOf(tone);
  return (
    <span
      className="inline-flex items-center whitespace-nowrap"
      style={{ fontSize: textPx(10), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", borderRadius: 9999, padding: "2px 8px", background: t.bg, color: t.ink }}
    >
      {label}
    </span>
  );
};

export const NumBox: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div className="flex-1 min-w-0" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, padding: "12px 12px 11px" }}>
    <p className="truncate" style={{ fontSize: textPx(10.5), fontWeight: 600, color: INK.chF, lineHeight: 1.3 }}>
      {label}
    </p>
    <p style={{ marginTop: 6, fontSize: textPx(22), fontWeight: 800, letterSpacing: "-0.02em", color: INK.ch, lineHeight: 1 }}>{value}</p>
    {sub && <p style={{ fontSize: textPx(10), color: INK.chT, marginTop: 4 }}>{sub}</p>}
  </div>
);

export const SharedChips: React.FC<{ items: { label: string; on: boolean }[] }> = ({ items }) => {
  const dark = useIsDark();
  const onInk = dark ? "#B2D4CF" : "#3C6B65";
  return (
    <div className="flex flex-wrap" style={{ gap: 6 }}>
      {items.map((x) => (
        <span
          key={x.label}
          className="inline-flex items-center whitespace-nowrap"
          style={{ gap: 4, height: 26, padding: "0 10px", borderRadius: 9999, fontSize: textPx(11), fontWeight: 700, background: x.on ? INK.tealPale : INK.soft, color: x.on ? onInk : INK.chF }}
        >
          {x.on ? <ShieldCheck size={11} strokeWidth={2.2} aria-hidden /> : <Lock size={11} strokeWidth={2.2} aria-hidden />}
          {x.label}
          <span className="sr-only">{x.on ? ", shared" : ", not shared"}</span>
        </span>
      ))}
    </div>
  );
};


export const Avatar: React.FC<{ name: string; url?: string | null; size: number; tone?: "pr" | "sky" | "gold" | "teal" }> = ({ name, url, size, tone = "pr" }) => {
  const bg = tone === "teal" ? INK.tealPale : tone === "gold" ? INK.goldPale : tone === "sky" ? INK.skyPale : INK.prPale;
  const ink = tone === "teal" ? "rgb(var(--th-3c6b65))" : tone === "gold" ? INK.goldInk : tone === "sky" ? INK.sky : INK.prDeep;
  return (
    <span aria-hidden className="flex items-center justify-center shrink-0 overflow-hidden" style={{ width: size, height: size, borderRadius: 9999, background: bg, color: ink, fontSize: Math.round(size * 0.33), fontWeight: 800 }}>
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : initialsOf(name)}
    </span>
  );
};

/** ui.js roundBtn: 36 round, card fill, 1px 11% border, 16 / 2 text.soft icon; a 44 hit area. */
export const RoundBtn = React.forwardRef<HTMLButtonElement, { icon: LucideIcon; label: string; onClick: () => void; expanded?: boolean }>(({ icon: Icon, label, onClick, expanded }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-expanded={expanded}
    className="tap relative flex items-center justify-center shrink-0 before:absolute before:-inset-1 before:content-['']"
    style={{ width: 36, height: 36, borderRadius: 9999, background: INK.card, border: `1px solid rgb(var(--c-charcoal) / 0.11)` }}
  >
    <Icon size={16} strokeWidth={2} aria-hidden style={{ color: INK.chS }} />
  </button>
));
RoundBtn.displayName = "RoundBtn";

/** The soft lock / info line (r6b): r14 soft, pad 10 12, icon 13, 11.5 / 1.5 text.soft. */
export const SoftLine: React.FC<{ icon: LucideIcon; children: React.ReactNode; action?: React.ReactNode }> = ({ icon: Icon, children, action }) => (
  <div className="flex items-start" style={{ gap: 8, borderRadius: 14, background: INK.soft, padding: "10px 12px", marginBottom: 12 }}>
    <Icon size={13} strokeWidth={2} aria-hidden style={{ color: INK.chF, flexShrink: 0, marginTop: 3 }} />
    <div className="flex-1 min-w-0" style={{ fontSize: textPx(11.5), lineHeight: 1.5, color: INK.chS }}>
      {children}
    </div>
    {action}
  </div>
);

