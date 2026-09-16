import React, { forwardRef } from "react";
import clsx from "clsx";
import { X, Maximize2, Minimize2, GripVertical } from "lucide-react";
import type { WidgetSize } from "../../types";

interface WidgetShellProps {
  size: WidgetSize;
  editMode: boolean;
  onRemove: () => void;
  onResize: () => void;
  onGripPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}

// Iteration 6.2 "Team" canonical widget library: every widget tile is a
// fixed 114×114 (small) or 358×150 (large) with its own flat tinted ground,
// radius and padding baked into the widget's own root element (see
// HomeWidget.tsx) — the shell no longer supplies a uniform white card
// around it, only sizing and the edit-mode chrome.
//
// Handoff §7a "V2 — inside the corner" (the variant chosen out of the 5
// explored): resize/remove sit 7px INSIDE the tile's top-right corner as
// 22px circles with an 11px glyph; the grip sits in the opposite corner
// (7px/8px inside bottom-left) with no circle chrome, just the glyph.
// Literal values are from design/CentiumHomeV2.dc.html's `chrome.e2` object,
// not the README prose (which as of this pass still says "no variant
// chosen" — the requester has since picked V2 out of band).
//
// Handoff §7b: reordering is pointer-events based, not native HTML5 drag
// (which mobile browsers never fire for touch). WidgetShell only reports
// the grip's pointerdown — WidgetBoard.tsx owns the actual drag mechanics
// (lift, live reflow, placeholder, auto-scroll, settle) since it needs
// sibling tile rects and the board's own bounds.
export const WidgetShell = forwardRef<HTMLDivElement, WidgetShellProps>(
  ({ size, editMode, onRemove, onResize, onGripPointerDown, children }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          "relative shrink-0 rounded-[15px] transition-transform",
          size === "large" ? "w-full max-w-[358px]" : "w-[114px]",
          editMode && "ring-2 ring-team-nav-accent/30"
        )}
      >
        {editMode && (
          <>
            <div style={{ position: "absolute", top: 7, right: 7, display: "flex", gap: 4, zIndex: 10 }}>
              <button
                onClick={onResize}
                className="tap"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                  background: "rgba(255,255,255,0.92)",
                  color: "#241F1B",
                  boxShadow: "0 2px 8px rgba(36,31,27,0.18)",
                }}
                aria-label="Resize widget"
              >
                {size === "small" ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
              </button>
              <button
                onClick={onRemove}
                className="tap"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                  background: "rgba(255,255,255,0.92)",
                  color: "#4F7F78",
                  boxShadow: "0 2px 8px rgba(36,31,27,0.18)",
                }}
                aria-label="Remove widget"
              >
                <X size={11} strokeWidth={3} />
              </button>
            </div>
            {/* Grip: no background/circle chrome for this variant, just the
                glyph, positioned in the opposite corner from resize/remove.
                touch-action:none is scoped to this element only, and it
                carries an invisible 44×44 hit area (padded around the 12px
                visual glyph) so the tappable/draggable region meets the
                handoff's minimum even though the icon reads much smaller. */}
            <div
              onPointerDown={onGripPointerDown}
              role="button"
              aria-label="Drag to reorder"
              style={{
                position: "absolute",
                bottom: 7,
                left: 8,
                color: "rgba(36,31,27,0.35)",
                zIndex: 10,
                display: "inline-flex",
                touchAction: "none",
              }}
              className="cursor-grab active:cursor-grabbing"
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 44,
                  height: 44,
                }}
              />
              <GripVertical size={12} />
            </div>
          </>
        )}
        {children}
      </div>
    );
  }
);
WidgetShell.displayName = "WidgetShell";
