import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  // V6 (QA 6.0): suppresses the sticky title bar entirely, for sheets that
  // render their own first-item name + close control as part of the
  // scrollable content instead (e.g. ExerciseSettingsSheet).
  hideHeader?: boolean;
  // Mobile handoff item 1: the header back arrow, shown only when there is
  // somewhere to go back to (e.g. a food is selected in Add Food, or a
  // nutrient-details step is open). Replaces the old pattern of a "Back"
  // button rendered at the bottom of a sheet's own content — every caller
  // that had one should pass onBack here and drop its own button instead.
  onBack?: () => void;
  // Extra header control rendered immediately left of the close ring (e.g.
  // Meal Prep's 26px pencil). Spacing to the ring is CentiumMealPrep.dc.html's
  // 6px gap.
  headerAction?: React.ReactNode;
  // "session" = the workout session's calculator/set-options chrome
  // (CentiumFrame ovSessionSheetLav): #EBE9FE header strip, 0 20px padding,
  // #7155CA title and 1.5px close ring, never a back arrow.
  variant?: "default" | "session";
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  children,
  hideHeader,
  onBack,
  headerAction,
  variant = "default",
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

  // Portaled to <body>: several call sites render this inside a container
  // carrying `animate-fade-slide-up` (a transform-based animation). Any
  // transform on an ancestor turns it into the containing block for
  // descendant `position: fixed` elements per the CSS spec, which clipped
  // this sheet to that ancestor's box instead of the viewport — the
  // "cut in half, blur misaligned" bug. Portaling sidesteps the ancestor
  // chain entirely.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div
        className="absolute inset-0 backdrop-blur-[2px] animate-fade-in"
        style={{ background: "rgba(36,31,27,0.4)" }}
        onClick={onClose}
      />
      {hideHeader ? (
        <div className="relative w-full sm:max-w-md bg-cream rounded-t-4xl sm:rounded-4xl shadow-lift max-h-[88vh] overflow-y-auto animate-sheet-up sm:animate-pop">
          <div className="p-5">{children}</div>
        </div>
      ) : (
        // CentiumFrame.dc.html ovSheetLav / ovSessionSheetLav: #F0EEFD shell
        // with a 1px #7248F8 hairline on top and both sides (none at the
        // bottom); the whole shell scrolls under a sticky 53px header; the
        // white panel is flush (no side inset) with a 22px top radius, so
        // the shell colour reads through at its rounded top corners.
        <div
          className="relative w-full sm:max-w-md rounded-t-4xl sm:rounded-4xl shadow-lift max-h-[88vh] overflow-y-auto animate-sheet-up sm:animate-pop"
          style={{ background: "#F0EEFD", border: "1px solid #7248F8", borderBottom: "none" }}
        >
          <div
            className="sticky top-0 z-10 flex items-center justify-between rounded-t-4xl"
            style={{
              height: 53,
              padding: variant === "session" ? "0 20px" : "0 18px",
              background: variant === "session" ? "#EBE9FE" : "#F0EEFD",
            }}
          >
            <div className="flex items-center shrink-0" style={{ width: 26 }}>
              {onBack && variant !== "session" && (
                <button
                  onClick={onBack}
                  className="tap w-[26px] h-[26px] rounded-full flex items-center justify-center"
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
                style={{
                  color: variant === "session" ? "#7155CA" : "#7248F8",
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: "-0.015em",
                }}
              >
                {title}
              </h2>
            )}
            {/* 26px slot like CentiumMealPrep's close span: headerAction
                overflows leftward so the title stays centred. */}
            <div className="flex items-center justify-end shrink-0" style={{ width: 26, gap: 6 }}>
              {headerAction && <span className="flex shrink-0">{headerAction}</span>}
              <button
                onClick={onClose}
                className="tap w-[26px] h-[26px] shrink-0 rounded-full flex items-center justify-center"
                style={{
                  border: variant === "session" ? "1.5px solid #7155CA" : "1.6px solid #7248F8",
                  color: variant === "session" ? "#7155CA" : "#7248F8",
                }}
                aria-label="Close"
              >
                <X size={12} strokeWidth={variant === "session" ? 2.4 : 2.6} />
              </button>
            </div>
          </div>
          <div className="bg-white" style={{ borderRadius: "22px 22px 0 0", margin: 0, padding: 20, minHeight: 220 }}>
            {children}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
