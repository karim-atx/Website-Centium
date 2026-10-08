import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft } from "lucide-react";
import { textPx } from "../../theme/textSize";
import { useBackCloses } from "../../hooks/useBackCloses";
import { useReducedMotion } from "../../hooks/useReducedMotion";

type ToneColours = { band: string; border: string; title: string; body: string };

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  // V6 (QA 6.0): suppresses the title bar entirely, for sheets that render
  // their own first-item name + close control as part of the scrollable
  // content instead (e.g. ExerciseSettingsSheet).
  hideHeader?: boolean;
  // The header back arrow, shown only when there is somewhere to go back to
  // inside the sheet. A back chevron never closes the sheet.
  onBack?: () => void;
  // Extra header control rendered immediately left of the close ring (e.g.
  // Meal Prep's 26px pencil), 6px from it.
  headerAction?: React.ReactNode;
  /**
   * Handover 2026-09-29, 02 "Bottom sheet": the primary action row, pinned
   * to the bottom of the sheet (sticky footer) while the body scrolls. It
   * stays above the home indicator and rides above the on-screen keyboard.
   * This is the pinned footer HANDOVER §2.2 asks for on business sheets too
   * (OP1-041 D2).
   */
  footer?: React.ReactNode;
  /** FO8: a full-width 1px #F2F2F2 rule above the footer, 8px over its content. */
  footerRule?: boolean;
  /**
   * The footer's bottom padding above the home indicator, when a frame draws
   * the Lavender-header sheet's own 30 (Foundations 2.5: footer padding
   * 12 × 20 × 30; MO1.1.2.3). Unset keeps max(34, safe area + 20).
   */
  footerBottom?: number;
  /**
   * "tall" raises the max height to nearly the full viewport, minus a small
   * top inset (FO8). The default max is `maxHeightPct` of the dynamic
   * viewport. Either way the sheet hugs its content up to that max.
   */
  size?: "default" | "tall";
  /**
   * Recolours the chrome. An object (WO21: a starter program takes its
   * level's colours) sets header band, border, title and close ring, and the
   * body/footer fill. "business" (v6 X-05) keeps the app chrome but outlines
   * the sheet in --sheet-border-business (#7248F8 light, #9976F7 dark).
   */
  tone?: ToneColours | "business";
  /**
   * WO18: a 36×4 #CABCFB grab handle 8px from the top, with the title row
   * below it (the header is 58px instead of 53).
   */
  handle?: boolean;
  /** WO18: an icon left of the title, the pair centred. */
  titleIcon?: React.ReactNode;
  /**
   * v6 X-02: the header row's height, literal per drawing component: 53
   * (default: app, BizTypeKit, Part B), 58 (MA1 / BizMarketV7), 62
   * (OpsTabsV4). Ignored with `handle` (46 under the handle, as WO18).
   */
  headerHeight?: 53 | 58 | 62;
  /**
   * v6 X-03 / X-06: per-component chrome.
   * - "app" (default): body padding 20 (34 at the bottom), close ring 1.6, X 12,
   *   1px outline.
   * - "partB": Part B sheet tables (PB2 D-HB-03): 0.5px outline, ring 1.1.
   * - "market": MA1 / BizMoreV8: body padding 16 16 28, ring 1.5, X 14, and a
   *   black rgba(0,0,0,0.4) scrim.
   */
  chrome?: "app" | "partB" | "market";
  /**
   * v6 X-06 / X-07: the scrim colour. "warm" rgba(36,31,27,0.4) (default, in
   * both modes) or "black" rgba(0,0,0,0.4) (MA1, BizMoreV8; the default for
   * chrome="market").
   */
  scrim?: "warm" | "black";
  /** The scrim's 2px blur (default on, as handover 2026-09-29 draws it). */
  scrimBlur?: boolean;
  /** v6 X-04: max height as % of the dynamic viewport. 88 (default) or 90 (AN3 class sheets). */
  maxHeightPct?: 88 | 90;
  /**
   * Slide the sheet down (350 ms, easeBase) and fade the scrim when `open`
   * turns false, instead of disappearing at once (BU class-save-flow: "sheet
   * down 350 ms"). While it leaves, the last open content is shown and taps
   * pass through. Instant under Reduce motion. Off by default.
   */
  animateExit?: boolean;
}

const EXIT_MS = 350;

/**
 * The app's one bottom sheet, per handover 2026-09-29, 02 "Bottom sheet":
 * header band #F0EEFD with a 1px #7248F8 border (none at the bottom) and
 * 32px top radius; title centred #7248F8 20px/800; close = 26px circle with
 * a 1.6px #7248F8 outline and an X; optional back chevron on the left. Body
 * white, top radius 22, padding 20 (34 at the bottom). Height hugs the
 * content up to a viewport-relative max, past which the body scrolls and the
 * footer stays pinned. Backdrop rgba(36,31,27,0.4) + 2px blur.
 *
 * 01 GLOBAL: max width 430 (the app column), dvh heights, never over the
 * status area, safe-area aware, above the keyboard (--kb-inset), and the
 * 26px header controls sit on 44px hit areas.
 *
 * Dark mode swaps the chrome to the --sheet-* dark set (v5.1: sheet.header and
 * the body are the dark card #1C1F28). Mobile v5.1 R3: every sheet follows the
 * theme; there are no light islands, so a `tone` passes its dark shades too.
 *
 * v6 props (RECONCILIATION-v6 §7 X-02…X-06): headerHeight, chrome, tone
 * "business", scrim, scrimBlur, maxHeightPct, animateExit. Defaults are the
 * values above, so a caller that passes none of them is unchanged.
 */
export const BottomSheet: React.FC<BottomSheetProps> = (props) => {
  const { open, onClose, animateExit } = props;
  // Batch E (E5): the phone's back closes this first.
  useBackCloses(open, onClose);
  const reduced = useReducedMotion();

  // Exit: keep rendering the last open content while it slides away.
  const [prevOpen, setPrevOpen] = useState(open);
  const [closing, setClosing] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setClosing(!open && !!animateExit && !reduced);
  }
  useEffect(() => {
    if (!closing) return;
    const id = window.setTimeout(() => setClosing(false), EXIT_MS);
    return () => window.clearTimeout(id);
  }, [closing]);
  const last = useRef(props);
  if (open) last.current = props;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open && !closing) return null;
  return <SheetFrame {...(open ? props : last.current)} leaving={!open} />;
};

const SheetFrame: React.FC<BottomSheetProps & { leaving: boolean }> = ({
  onClose,
  title,
  children,
  hideHeader,
  onBack,
  headerAction,
  footer,
  size = "default",
  tone,
  handle,
  titleIcon,
  footerRule,
  footerBottom,
  headerHeight = 53,
  chrome = "app",
  scrim,
  scrimBlur = true,
  maxHeightPct = 88,
  leaving,
}) => {
  // The handover's light chrome, and its dark-mode counterpart, come from the
  // --sheet-* variables in index.css.
  const colours = typeof tone === "object" ? tone : undefined;
  const band = colours?.band ?? "var(--sheet-band)";
  const border = colours?.border ?? (tone === "business" ? "var(--sheet-border-business)" : "var(--sheet-border)");
  const titleColor = colours?.title ?? "var(--sheet-title)";
  const body = colours?.body ?? "var(--sheet-body)";
  const market = chrome === "market";
  const partB = chrome === "partB";
  const borderWidth = partB ? 0.5 : 1;
  const ring = partB ? 1.1 : market ? 1.5 : 1.6;
  const xSize = market ? 14 : 12;
  const scrimColour = (scrim ?? (market ? "black" : "warm")) === "black" ? "rgba(0,0,0,0.4)" : "rgba(36,31,27,0.4)";

  // The whole sheet never reaches the status area (notch / Dynamic Island),
  // and shrinks by whatever the keyboard currently covers.
  const statusGap = "calc(env(safe-area-inset-top) + 12px)";
  const maxHeight =
    size === "tall"
      ? `calc(100dvh - ${statusGap} - var(--kb-inset))`
      : `min(calc(${maxHeightPct}dvh - var(--kb-inset)), calc(100dvh - ${statusGap} - var(--kb-inset)))`;
  const bottomPad = "max(34px, calc(env(safe-area-inset-bottom) + 20px))";
  const footerPad = footerBottom === undefined ? bottomPad : `calc(env(safe-area-inset-bottom) + ${footerBottom}px)`;
  // Body padding: 20 (34 at the bottom) for the app and Part B; MA1 /
  // BizMoreV8 16 16 28.
  const bodyPadding: React.CSSProperties = market
    ? { padding: "16px 16px", paddingBottom: footer ? 16 : "max(28px, calc(env(safe-area-inset-bottom) + 20px))" }
    : { padding: 20, paddingBottom: footer ? 20 : bottomPad };

  const sheetAnim = leaving ? "bottom-sheet-out .35s cubic-bezier(0.22,1,0.36,1) both" : undefined;
  const scrimAnim = leaving ? "bottom-sheet-scrim-out .35s ease both" : undefined;

  // Portaled to <body>: several call sites render this inside a container
  // carrying `animate-fade-slide-up` (a transform-based animation). Any
  // transform on an ancestor turns it into the containing block for
  // descendant `position: fixed` elements per the CSS spec, which clipped
  // this sheet to that ancestor's box instead of the viewport — the
  // "cut in half, blur misaligned" bug. Portaling sidesteps the ancestor
  // chain entirely.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ paddingBottom: "var(--kb-inset)", pointerEvents: leaving ? "none" : undefined }}
      aria-hidden={leaving || undefined}
    >
      {leaving && (
        <style>{`@keyframes bottom-sheet-out { from { transform: translateY(0); } to { transform: translateY(100%); } } @keyframes bottom-sheet-scrim-out { from { opacity: 1; } to { opacity: 0; } }`}</style>
      )}
      <div
        className={`absolute inset-0 ${scrimBlur ? "backdrop-blur-[2px]" : ""} ${leaving ? "" : "animate-fade-in"}`}
        style={{ background: scrimColour, animation: scrimAnim }}
        onClick={onClose}
      />
      {hideHeader ? (
        <div
          className={`relative w-full max-w-[430px] bg-cream rounded-t-4xl shadow-lift flex flex-col overflow-hidden ${leaving ? "" : "animate-sheet-up"}`}
          style={{ maxHeight, animation: sheetAnim }}
        >
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={bodyPadding}>
            {children}
          </div>
          {footer && (
            <div className="shrink-0 bg-cream" style={{ padding: `12px 20px ${footerPad}` }}>
              {footer}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`relative w-full max-w-[430px] rounded-t-4xl shadow-lift flex flex-col overflow-hidden ${leaving ? "" : "animate-sheet-up"}`}
          style={{ maxHeight, background: band, border: `${borderWidth}px solid ${border}`, borderBottom: "none", animation: sheetAnim }}
        >
          {handle && (
            <div aria-hidden className="shrink-0 flex justify-center" style={{ paddingTop: 8 }}>
              <span style={{ width: 36, height: 4, borderRadius: 2, background: "var(--sheet-handle)" }} />
            </div>
          )}
          <div className="shrink-0 flex items-center justify-between" style={{ height: handle ? 46 : headerHeight, padding: "0 18px" }}>
            <div className="flex items-center shrink-0" style={{ width: 26 }}>
              {onBack && (
                // 26px visual on a 44px hit area (01 GLOBAL touch targets).
                <button
                  onClick={onBack}
                  className="tap relative w-[26px] h-[26px] rounded-full flex items-center justify-center before:absolute before:-inset-[9px] before:content-['']"
                  style={{ color: "var(--sheet-back)" }}
                  aria-label="Back"
                >
                  <ChevronLeft size={17} strokeWidth={2.6} />
                </button>
              )}
            </div>
            {title && (
              <h2
                className="flex-1 min-w-0 flex items-center justify-center"
                style={{ color: titleColor, fontSize: textPx(20), fontWeight: 800, letterSpacing: "-0.015em", gap: 9 }}
              >
                {titleIcon && <span className="flex shrink-0">{titleIcon}</span>}
                <span className="min-w-0 truncate">{title}</span>
              </h2>
            )}
            {/* 26px slot: headerAction overflows leftward so the title stays
                centred. */}
            <div className="flex items-center justify-end shrink-0" style={{ width: 26, gap: 6 }}>
              {headerAction && <span className="flex shrink-0">{headerAction}</span>}
              <button
                onClick={onClose}
                className="tap relative w-[26px] h-[26px] shrink-0 rounded-full flex items-center justify-center before:absolute before:-inset-[9px] before:content-['']"
                style={{ border: `${ring}px solid ${border}`, color: border }}
                aria-label="Close"
              >
                <X size={xSize} strokeWidth={2.6} />
              </button>
            </div>
          </div>
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
            style={{ background: body, borderRadius: "22px 22px 0 0", ...bodyPadding }}
          >
            {children}
          </div>
          {footer && (
            <div
              className="shrink-0"
              style={{
                background: body,
                padding: `${footerRule ? 8 : 12}px ${market ? 16 : 20}px ${footerPad}`,
                borderTop: footerRule ? "1px solid var(--sheet-rule)" : undefined,
              }}
            >
              {footer}
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
};
