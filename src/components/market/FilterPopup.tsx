import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";
import { NO_ICON_SCALE } from "../pro/proInk";
import { marketPalette } from "../../theme/marketTokens";

// Market + Share 3.0 · FilterPopup (HANDOVER §4 C-MO.4.3 class filter and
// P-MA.5.1, §5 "groups of checkbox rows + Done, reuse repo PopupMenu
// pattern"). Behaviour ported from Client Explore Screens' script
// (`toggleFilter`, `closeFilter`, `clearFilter`, `toggleOpt`; filterModel.ts);
// the card follows components/ui/PopupMenu.tsx (portal, anchored under its
// trigger and right-aligned to it, 6 below, flips up when short of room, tap
// outside closes, the app's theme tokens so dark and high contrast follow).
// Literal values (Client Explore Screens lines 224–271; Professional
// Marketplace Screens lines 350–357, 536–549 for variant "pro"):
// - the trigger: 36 × 36 (pro 40 × 40) radius 11, the lucide filter-lines
//   glyph 17 stroke 2; idle --card / 1px rgba(174,161,220,0.34) / --ink2,
//   active rgba(174,161,220,0.22) / 1px #A092E0 / #5F5093 with a 9 dot
//   #6D50D3 (border 1.5px --page) at −3, −3; aria-haspopup menu,
//   aria-expanded;
// - the summary chip: a centred row (gap 7), #F3F3FD, radius 11, padding
//   8 11; a 6 dot #6D50D3; the choices joined " · " 10.5 / 700 #5F5093;
//   "Show all" 10.5 / 700 #6D50D3 at the end (clearFilter);
// - the scrim rgba(36,31,27,0.18) (closeFilter);
// - the card (role menu): 232 content wide, --card, border 1px
//   rgba(174,161,220,0.5), radius 14, shadow 0 12px 32px
//   rgba(95,80,147,0.18), padding 8, scrolls past its max height (540);
// - each group: the heading 11 / 700 0.1em uppercase --faint, margin
//   10 4 2 (first) / 16 4 2 (pro 8 4 2 / 14 4 2); the rows (margin-top 6,
//   column gap 6): menuitemcheckbox, radius 8, padding 9 10, gap 9, 12.5
//   #241F1B, 500 / 700 selected, #FAFAFB / 1px #E5E6EB, selected #F0EDF9 /
//   #AEA1DC (pro rgba(174,161,220,0.16) / #A092E0); the square-check 13
//   stroke 3 #7D6BB5 at opacity 1 when selected, 0 when not;
// - Done: margin-top 8, 100% × 40, radius 10, #AEA1DC, #FFFFFF 13 / 800
//   (closeFilter).
// The rows are 37 tall (the board's), within a 43 pitch; each carries .hit
// (W1 lead decision Q8), a centred 44 hit box that leaves the drawing as is.

export type FilterVariant = "client" | "pro";

/** Theme colours outside marketPalette: [light, dark] (the PopupMenu tokens). */
const DARK_ACCENT = "#C3B3FB";

export const FilterTrigger = React.forwardRef<
  HTMLButtonElement,
  { active: boolean; open: boolean; onPress: () => void; label: string; variant?: FilterVariant }
>(function FilterTrigger({ active, open, onPress, label, variant = "client" }, ref) {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const size = variant === "pro" ? 40 : 36;
  const look = active
    ? { bg: dark ? "rgba(169,145,254,0.22)" : "rgba(174,161,220,0.22)", bd: `1px solid ${dark ? "#A991FE" : "#A092E0"}`, ink: dark ? DARK_ACCENT : "#5F5093" }
    : { bg: m.card, bd: `1px solid ${dark ? "rgba(169,145,254,0.34)" : "rgba(174,161,220,0.34)"}`, ink: m.ink2 };
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPress}
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={open}
      className="hit"
      style={{ position: "relative", flex: "none", width: size, height: size, borderRadius: 11, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: look.bg, border: look.bd, color: look.ink, boxSizing: "border-box" }}
    >
      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block", ...NO_ICON_SCALE }}>
        <path d="M4 6h16" />
        <path d="M7 12h10" />
        <path d="M10 18h4" />
      </svg>
      {active ? <span aria-hidden style={{ position: "absolute", top: -3, right: -3, width: 9, height: 9, borderRadius: 999, background: dark ? DARK_ACCENT : "#6D50D3", border: `1.5px solid ${m.page}` }} /> : null}
    </button>
  );
});

export const FilterSummary: React.FC<{ summary: string; onShowAll: () => void; className?: string; style?: React.CSSProperties }> = ({ summary, onShowAll, className, style }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const link = dark ? DARK_ACCENT : "#6D50D3";
  return (
    <div className={className} style={{ lineHeight: "normal", display: "flex", alignItems: "center", gap: 7, background: dark ? m.segtrack : "#F3F3FD", borderRadius: 11, padding: "8px 11px", ...style }}>
      <span aria-hidden style={{ flex: "none", width: 6, height: 6, borderRadius: 999, background: link }} />
      <span style={{ fontSize: textPx(10.5), fontWeight: 700, color: dark ? m.ink2 : "#5F5093", minWidth: 0 }}>{summary}</span>
      <span style={{ flex: 1, minWidth: 0 }} />
      <button type="button" onClick={onShowAll} className="hit" style={{ border: 0, background: "none", padding: 0, font: "inherit", fontSize: textPx(10.5), fontWeight: 700, color: link, cursor: "pointer", flex: "none" }}>
        Show all
      </button>
    </div>
  );
};

export interface FilterGroup {
  heading: string;
  options: readonly string[];
}

export interface FilterPopupProps {
  open: boolean;
  /** The trigger the card hangs from (FilterTrigger's ref). */
  anchor: HTMLElement | null;
  groups: readonly FilterGroup[];
  selected: readonly string[];
  onToggle: (option: string) => void;
  /** Done and the scrim (closeFilter). */
  onClose: () => void;
  variant?: FilterVariant;
}

const GAP = 6;
const EDGE = 8;
const CONTENT_W = 232;

export const FilterPopup: React.FC<FilterPopupProps> = ({ open, anchor, groups, selected, onToggle, onClose, variant = "client" }) => {
  const dark = useIsDark();
  const card = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; maxHeight: number; up: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const cardW = CONTENT_W + 16 + 2;
      const left = Math.min(Math.max(EDGE, r.right - cardW), vw - EDGE - cardW);
      const below = vh - EDGE - r.bottom - GAP;
      const above = r.top - GAP - EDGE;
      const up = below < 220 && above > below;
      setPos(up ? { bottom: vh - r.top + GAP, left, maxHeight: Math.min(540, above), up } : { top: r.bottom + GAP, left, maxHeight: Math.min(540, below), up });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor]);

  // Focus moves into the menu on open and back to the trigger on close; Escape closes.
  useEffect(() => {
    if (!open || !pos) return;
    card.current?.querySelector<HTMLElement>("[role=menuitemcheckbox]")?.focus();
  }, [open, pos]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      anchor?.focus();
    };
  }, [open, onClose, anchor]);

  if (!open || !pos) return null;
  const pro = variant === "pro";
  // The PopupMenu tokens: literal in light, the app's dark values in dark.
  const onBg = pro && !dark ? "rgba(174,161,220,0.16)" : "rgb(var(--th-f0edf9))";
  const onBd = pro && !dark ? "#A092E0" : dark ? "rgb(var(--th-9a8cd6))" : "rgb(var(--th-aea1dc))";
  const onBgDark = "rgb(var(--th-303141))";
  const check = dark ? "rgb(var(--th-b7abde))" : "#7D6BB5";

  // Arrow keys move between rows.
  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = Array.from(card.current?.querySelectorAll<HTMLElement>("[role=menuitemcheckbox], [data-done]") ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    const j = e.key === "ArrowDown" ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1);
    items[j]?.focus();
    e.preventDefault();
  };

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 60 }}>
      <style>{`@keyframes popup-menu-in { 0% { opacity: 0; transform: translateY(var(--pm-dy)); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="absolute inset-0" onClick={onClose} style={{ background: "rgba(36,31,27,0.18)", animation: "fade-in .2s ease both" }} />
      <div
        ref={card}
        role="menu"
        aria-label="Filters"
        onKeyDown={onMenuKey}
        className="absolute overflow-y-auto overscroll-contain"
        style={
          {
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            width: CONTENT_W,
            maxHeight: Math.max(0, pos.maxHeight - 18),
            boxSizing: "content-box",
            lineHeight: "normal",
            background: "rgb(var(--c-cream-card))",
            border: "1px solid rgb(var(--th-aea1dc) / 0.5)",
            borderRadius: 14,
            boxShadow: "0 12px 32px rgb(var(--th-5f5093) / 0.18)",
            padding: 8,
            animation: "popup-menu-in .22s cubic-bezier(.22,1,.36,1) both",
            ["--pm-dy" as string]: pos.up ? "6px" : "-6px",
          } as React.CSSProperties
        }
      >
        {groups.map((g, gi) => (
          <div key={g.heading} role="group" aria-label={g.heading}>
            <p
              aria-hidden
              style={{
                margin: gi ? (pro ? "14px 4px 2px" : "16px 4px 2px") : pro ? "8px 4px 2px" : "10px 4px 2px",
                fontSize: textPx(11),
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgb(var(--c-charcoal-muted))",
              }}
            >
              {g.heading}
            </p>
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
              {g.options.map((o) => {
                const on = selected.includes(o);
                return (
                  <button
                    key={o}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={on}
                    onClick={() => onToggle(o)}
                    // W1 Q8: the drawn row is 37 tall at a 43 pitch; .hit
                    // centres a 44 (48 with Bigger targets) hit box on it.
                    className="hit"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      textAlign: "left",
                      borderRadius: 8,
                      padding: "9px 10px",
                      cursor: "pointer",
                      font: "inherit",
                      fontSize: textPx(12.5),
                      color: "rgb(var(--c-charcoal))",
                      fontWeight: on ? 700 : 500,
                      background: on ? (dark ? onBgDark : onBg) : "rgb(var(--c-surface-raised))",
                      border: `1px solid ${on ? onBd : "rgb(var(--c-border-option))"}`,
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>{o}</span>
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={check} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block", flex: "none", opacity: on ? 1 : 0, ...NO_ICON_SCALE }}>
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <button
          type="button"
          data-done=""
          onClick={onClose}
          style={{ marginTop: 8, width: "100%", height: 40, borderRadius: 10, border: 0, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", font: "inherit", fontSize: textPx(13), fontWeight: 800, cursor: "pointer" }}
        >
          Done
        </button>
      </div>
    </div>,
    document.body
  );
};
