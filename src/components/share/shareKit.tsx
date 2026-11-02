import React from "react";
import { BookOpen, CalendarCheck, CalendarDays, ChevronRight, Flag, Leaf, Lightbulb, Share2, Star, Trophy, UserRound, type LucideIcon } from "lucide-react";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { useIsDark } from "../../hooks/useIsDark";
import { toneSet } from "../client-forms/tone";
import type { WinIcon, WinTone } from "./shareCardModel";

// Release 3 · W8: the small parts the share sheets and the wins card share,
// each from source/gen/r31.js (and r21 tone21 for the tinted tiles).

export const SHARE_ICONS: Record<WinIcon | "star" | "user-round" | "book-open" | "calendar-days" | "lightbulb", LucideIcon> = {
  trophy: Trophy,
  leaf: Leaf,
  "calendar-check": CalendarCheck,
  flag: Flag,
  star: Star,
  "user-round": UserRound,
  "book-open": BookOpen,
  "calendar-days": CalendarDays,
  lightbulb: Lightbulb,
};

/** shareIc31: a 44 target holding a 34 circle, share-2 15 / 2; filled once the client allowed it. */
export const ShareIconButton: React.FC<{ on?: boolean; label: string; onClick: () => void; disabled?: boolean }> = ({ on, label, onClick, disabled }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className="tap flex items-center justify-center shrink-0 disabled:opacity-40"
    style={{ width: 44, height: 44, marginBlock: "-4px", marginInline: "0 -8px" }}
  >
    <span className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 9999, background: on ? INK.fill : INK.prPale }}>
      <Share2 size={15} strokeWidth={2} aria-hidden style={{ color: on ? INK.onFill : INK.prDeep }} />
    </span>
  </button>
);

/** pill31: 24 high, padding 0 9, 11 / 700; gold, teal or soft. */
export const SharePill: React.FC<{ tone?: "gold" | "teal" | "soft"; children: React.ReactNode }> = ({ tone = "soft", children }) => {
  const c = tone === "gold" ? [INK.goldPale, INK.goldInk] : tone === "teal" ? [INK.tealPale, "rgb(var(--c-team-teal-ink))"] : [INK.soft, INK.chS];
  return (
    <span className="inline-flex items-center shrink-0" style={{ height: 24, padding: "0 9px", borderRadius: 9999, fontSize: textPx(11), fontWeight: 700, whiteSpace: "nowrap", background: c[0], color: c[1] }}>
      {children}
    </span>
  );
};

/** A tinted icon tile (tone21 bg / ink). */
export const ToneTile: React.FC<{ icon: LucideIcon; tone: WinTone; size: number; radius: number; iconSize: number }> = ({ icon: Icon, tone, size, radius, iconSize }) => {
  const dark = useIsDark();
  const tn = toneSet(tone, dark);
  return (
    <span className="flex items-center justify-center shrink-0" style={{ width: size, height: size, borderRadius: radius, background: tn.bg }}>
      <Icon size={iconSize} strokeWidth={1.75} aria-hidden style={{ color: tn.ink }} />
    </span>
  );
};

/** picker31's row: 32 r10 tile, 14 / 600 label, 11 text.faint line, chevron 16; min 52 high, top rule. */
export const PickRow: React.FC<{ icon: LucideIcon; tone: WinTone; label: string; sub?: string; onClick?: () => void; disabled?: boolean }> = ({ icon, tone, label, sub, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || !onClick}
    className="tap w-full flex items-center text-start disabled:opacity-50"
    style={{ gap: 12, minHeight: 52, padding: "6px 0", borderTop: `1px solid ${INK.b06}` }}
  >
    <ToneTile icon={icon} tone={tone} size={32} radius={10} iconSize={16} />
    <span className="flex-1 min-w-0">
      <span className="block" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>
        {label}
      </span>
      {sub ? (
        <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>
          {sub}
        </span>
      ) : null}
    </span>
    <ChevronRight size={16} strokeWidth={2} aria-hidden style={{ color: INK.chF }} className="shrink-0 rtl:-scale-x-100" />
  </button>
);

/** picker31's group label: 11 / 600, 0.14em, capitals, text.faint, 16 above 4 below. */
export const GroupLabel: React.FC<{ children: React.ReactNode; first?: boolean }> = ({ children, first }) => (
  <p style={{ fontSize: textPx(11), fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: INK.chF, margin: `${first ? 0 : 16}px 0 4px` }}>{children}</p>
);

/** editor31's lab(): 12 / 600 text.soft, 16 above (0 for the first), 8 below. */
export const EditorLabel: React.FC<{ children: React.ReactNode; first?: boolean }> = ({ children, first }) => (
  <p style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, margin: `${first ? 0 : 16}px 0 8px` }}>{children}</p>
);

/** chip23: r9999, padding 5 10, 11 / 14, 700 on (fill) or 600 off (card, 1px charcoal 11%); the target grows to 44. */
export const StyleChip: React.FC<{ on: boolean; label: string; onClick: () => void }> = ({ on, label, onClick }) => (
  <button
    type="button"
    role="radio"
    aria-checked={on}
    onClick={onClick}
    className="tap relative inline-flex items-center before:absolute before:-inset-y-[9px] before:-inset-x-0.5 before:content-['']"
    style={{
      gap: 5,
      whiteSpace: "nowrap",
      borderRadius: 9999,
      padding: "5px 10px",
      fontSize: textPx(11),
      lineHeight: "14px",
      fontWeight: on ? 700 : 600,
      border: `1px solid ${on ? INK.fill : "rgb(var(--c-charcoal) / 0.11)"}`,
      background: on ? INK.fill : INK.card,
      color: on ? INK.onFill : INK.chS,
    }}
  >
    {label}
  </button>
);

/** The lock note under a group (picker31's foot): r14 soft, padding 12, lock 15 / 2, 12 / 1.5 text.soft. */
export const LockNote: React.FC<{ icon: LucideIcon; children: React.ReactNode; mt?: number }> = ({ icon: Icon, children, mt = 14 }) => (
  <div className="flex items-start" style={{ gap: 10, borderRadius: 14, background: INK.soft, padding: 12, marginTop: mt }}>
    <Icon size={15} strokeWidth={2} aria-hidden className="shrink-0" style={{ color: INK.chS }} />
    <p style={{ fontSize: textPx(12), lineHeight: 1.5, color: INK.chS }}>{children}</p>
  </div>
);
