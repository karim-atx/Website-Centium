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
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ open, onClose, title, children, hideHeader, onBack }) => {
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
        // Mobile handoff item 1: the lavender band + white panel standard.
        // The outer shell carries the band colour and the hairline down
        // each side; the white panel sits inset 4px from the sides with
        // its own 24px top radius, so the band's colour reads through at
        // the panel's rounded top corners.
        <div
          className="relative w-full sm:max-w-md rounded-t-4xl sm:rounded-4xl shadow-lift max-h-[88vh] flex flex-col overflow-hidden animate-sheet-up sm:animate-pop"
          style={{ background: "#EBE9FE", borderLeft: "1px solid #7248F8", borderRight: "1px solid #7248F8" }}
        >
          <div className="shrink-0 flex items-center px-4" style={{ height: 53 }}>
            {onBack ? (
              <button
                onClick={onBack}
                className="tap w-7 h-7 shrink-0 flex items-center justify-center"
                style={{ color: "#9C7EF8" }}
                aria-label="Back"
              >
                <ChevronLeft size={22} strokeWidth={2.4} />
              </button>
            ) : (
              <div className="w-7 h-7 shrink-0" />
            )}
            {title && (
              <h2
                className="flex-1 min-w-0 text-center truncate"
                style={{ color: "#9C7EF8", fontSize: 20, fontWeight: 800, letterSpacing: "-0.015em" }}
              >
                {title}
              </h2>
            )}
            <button
              onClick={onClose}
              className="tap w-[26px] h-[26px] shrink-0 rounded-full flex items-center justify-center"
              style={{ border: "1.5px solid #9C7EF8" }}
              aria-label="Close"
            >
              <X size={12} strokeWidth={2.4} style={{ color: "#9C7EF8" }} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto bg-white p-5" style={{ borderRadius: "24px 24px 0 0", margin: "0 4px" }}>
            {children}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
