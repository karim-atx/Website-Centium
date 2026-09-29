import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft } from "lucide-react";

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
   */
  footer?: React.ReactNode;
  /**
   * "tall" raises the max height to nearly the full viewport, minus a small
   * top inset (FO8). The default max is 88% of the dynamic viewport. Either
   * way the sheet hugs its content up to that max.
   */
  size?: "default" | "tall";
}

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
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  children,
  hideHeader,
  onBack,
  headerAction,
  footer,
  size = "default",
}) => {
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

  if (!open) return null;

  // The whole sheet never reaches the status area (notch / Dynamic Island),
  // and shrinks by whatever the keyboard currently covers.
  const statusGap = "calc(env(safe-area-inset-top) + 12px)";
  const maxHeight =
    size === "tall"
      ? `calc(100dvh - ${statusGap} - var(--kb-inset))`
      : `min(calc(88dvh - var(--kb-inset)), calc(100dvh - ${statusGap} - var(--kb-inset)))`;
  const bottomPad = "max(34px, calc(env(safe-area-inset-bottom) + 20px))";

  // Portaled to <body>: several call sites render this inside a container
  // carrying `animate-fade-slide-up` (a transform-based animation). Any
  // transform on an ancestor turns it into the containing block for
  // descendant `position: fixed` elements per the CSS spec, which clipped
  // this sheet to that ancestor's box instead of the viewport — the
  // "cut in half, blur misaligned" bug. Portaling sidesteps the ancestor
  // chain entirely.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ paddingBottom: "var(--kb-inset)" }}>
      <div
        className="absolute inset-0 backdrop-blur-[2px] animate-fade-in"
        style={{ background: "rgba(36,31,27,0.4)" }}
        onClick={onClose}
      />
      {hideHeader ? (
        <div
          className="relative w-full max-w-[430px] bg-cream rounded-t-4xl shadow-lift flex flex-col overflow-hidden animate-sheet-up"
          style={{ maxHeight }}
        >
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
            style={{ padding: 20, paddingBottom: footer ? 20 : bottomPad }}
          >
            {children}
          </div>
          {footer && (
            <div className="shrink-0 bg-cream" style={{ padding: `12px 20px ${bottomPad}` }}>
              {footer}
            </div>
          )}
        </div>
      ) : (
        <div
          className="relative w-full max-w-[430px] rounded-t-4xl shadow-lift flex flex-col overflow-hidden animate-sheet-up"
          style={{ maxHeight, background: "#F0EEFD", border: "1px solid #7248F8", borderBottom: "none" }}
        >
          <div className="shrink-0 flex items-center justify-between" style={{ height: 53, padding: "0 18px" }}>
            <div className="flex items-center shrink-0" style={{ width: 26 }}>
              {onBack && (
                // 26px visual on a 44px hit area (01 GLOBAL touch targets).
                <button
                  onClick={onBack}
                  className="tap relative w-[26px] h-[26px] rounded-full flex items-center justify-center before:absolute before:-inset-[9px] before:content-['']"
                  style={{ color: "#241F1B" }}
                  aria-label="Back"
                >
                  <ChevronLeft size={17} strokeWidth={2.6} />
                </button>
              )}
            </div>
            {title && (
              <h2
                className="flex-1 min-w-0 text-center truncate"
                style={{ color: "#7248F8", fontSize: 20, fontWeight: 800, letterSpacing: "-0.015em" }}
              >
                {title}
              </h2>
            )}
            {/* 26px slot: headerAction overflows leftward so the title stays
                centred. */}
            <div className="flex items-center justify-end shrink-0" style={{ width: 26, gap: 6 }}>
              {headerAction && <span className="flex shrink-0">{headerAction}</span>}
              <button
                onClick={onClose}
                className="tap relative w-[26px] h-[26px] shrink-0 rounded-full flex items-center justify-center before:absolute before:-inset-[9px] before:content-['']"
                style={{ border: "1.6px solid #7248F8", color: "#7248F8" }}
                aria-label="Close"
              >
                <X size={12} strokeWidth={2.6} />
              </button>
            </div>
          </div>
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white"
            style={{ borderRadius: "22px 22px 0 0", padding: 20, paddingBottom: footer ? 20 : bottomPad }}
          >
            {children}
          </div>
          {footer && (
            <div className="shrink-0 bg-white" style={{ padding: `12px 20px ${bottomPad}` }}>
              {footer}
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
};
