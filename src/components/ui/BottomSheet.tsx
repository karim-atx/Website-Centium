import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  // V6 (QA 6.0): suppresses the sticky title bar entirely, for sheets that
  // render their own first-item name + close control as part of the
  // scrollable content instead (e.g. ExerciseSettingsSheet).
  hideHeader?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ open, onClose, title, children, hideHeader }) => {
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
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md bg-cream rounded-t-4xl sm:rounded-4xl shadow-lift max-h-[88vh] overflow-y-auto animate-sheet-up sm:animate-pop">
        {!hideHeader && (
          <div className="sticky top-0 bg-cream/95 backdrop-blur-sm px-5 pt-4 pb-3 flex items-center justify-between border-b border-charcoal/5 rounded-t-4xl">
            <div className="w-8" />
            {title && <h2 className="font-display text-lg font-semibold text-charcoal">{title}</h2>}
            <button
              onClick={onClose}
              className="tap w-8 h-8 rounded-full bg-charcoal/5 flex items-center justify-center text-charcoal-soft hover:bg-charcoal/10"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
};
