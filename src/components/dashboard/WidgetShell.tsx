import React, { forwardRef } from "react";
import clsx from "clsx";
import { X, Maximize2, Minimize2, GripVertical } from "lucide-react";
import type { WidgetSize } from "../../types";
import { useIsDark } from "../../hooks/useIsDark";
import { t } from "../../i18n/core";

interface WidgetShellProps {
  size: WidgetSize;
  editMode: boolean;
  onRemove: () => void;
  onResize: () => void;
  onGripPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** HO1.1: the tile's grid-column span on the widget board (6 tracks). */
  span?: number;
  /**
   * v6 Batch 2 (V6-137 / D3): a 500 ms press on a tile outside edit mode
   * enters edit mode, a second way in beside the Edit button. A move of more
   * than 8 px (a scroll) cancels it, and the click that ends the press does
   * not open the widget.
   */
  onLongPress?: () => void;
  /** OURS-home-widget-motion #8: the tile's place on the board, for the wiggle offset (index x 60 ms). */
  index?: number;
  /** OURS-home-widget-motion #11: "enter" fades + scales 0.96 -> 1 over 250 ms; "leave" fades out over 200 ms. */
  motion?: "enter" | "leave" | null;
  children: React.ReactNode;
}

const LONG_PRESS_MS = 500;
const MOTION_CSS = `
@keyframes hw-wiggle { from { transform: rotate(-1deg) } to { transform: rotate(1deg) } }
@keyframes hw-chrome-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes hw-tile-in { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
@keyframes hw-tile-out { from { opacity: 1 } to { opacity: 0 } }
.hw-wiggle { animation: hw-wiggle 260ms ease-in-out infinite alternate; }
.hw-chrome-in { animation: hw-chrome-in 150ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.hw-tile-in { animation: hw-tile-in 250ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.hw-tile-out { animation: hw-tile-out 200ms cubic-bezier(0.22, 1, 0.36, 1) both; pointer-events: none; }
.reduce-motion .hw-wiggle, .reduce-motion .hw-chrome-in, .reduce-motion .hw-tile-in { animation: none; }
@media (prefers-reduced-motion: reduce) { .hw-wiggle, .hw-chrome-in, .hw-tile-in { animation: none; } }
`;

// Iteration 6.2 "Team" canonical widget library: every widget tile has its
// own flat tinted ground, radius and padding baked into the widget's own
// root element (see HomeWidget.tsx) — the shell supplies only its grid
// placement and the edit-mode chrome. Handover 2026-09-29 HO1.1: widths are
// fluid, set by the board's grid span (small 114 tall, large full row).
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
  ({ size, editMode, onRemove, onResize, onGripPointerDown, span, onLongPress, index = 0, motion = null, children }, ref) => {
    // Mobile v5.1 R3, dark mode (no light islands): the edit controls are
    // surface.raised #262932 at the same 92% (charcoal ink 13:1; the remove
    // glyph secondary.deep #7FB3A9, 6.2:1); the grip is the charcoal token.
    const dark = useIsDark();
    // EDIT CONTROLS ONLY EVER DO THEIR OWN THING. The tap stops here (it
    // never reaches the tile or the board), a pointerdown on a control can
    // never start a drag, and touch-action: manipulation stops a quick double
    // tap being read as a zoom. WidgetBoard also ignores edit taps for a
    // moment after each resize, while the grid reflows.
    const control = (action: () => void) => ({
      type: "button" as const,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        action();
      },
      onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    });

    // Long-press (V6-137): timer from the first pointer down; a scroll or a
    // release before 500 ms is an ordinary tap. Once fired, the release's
    // click is swallowed so the widget's own screen does not open too.
    const press = React.useRef<{ timer: number; x: number; y: number } | null>(null);
    const fired = React.useRef(false);
    const cancel = () => {
      if (press.current) window.clearTimeout(press.current.timer);
      press.current = null;
    };
    React.useEffect(() => cancel, []);
    const pressHandlers =
      onLongPress && !editMode
        ? {
            onPointerDown: (e: React.PointerEvent) => {
              if (e.button !== 0) return;
              fired.current = false;
              cancel();
              press.current = {
                x: e.clientX,
                y: e.clientY,
                timer: window.setTimeout(() => {
                  press.current = null;
                  fired.current = true;
                  onLongPress();
                }, LONG_PRESS_MS),
              };
            },
            onPointerMove: (e: React.PointerEvent) => {
              const p = press.current;
              if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) cancel();
            },
            onPointerUp: cancel,
            onPointerCancel: cancel,
            onPointerLeave: cancel,
            onContextMenu: (e: React.MouseEvent) => {
              if (fired.current || press.current) e.preventDefault();
            },
            onClickCapture: (e: React.MouseEvent) => {
              if (fired.current) {
                fired.current = false;
                e.preventDefault();
                e.stopPropagation();
              }
            },
          }
        : {};

    return (
      <div
        ref={ref}
        {...pressHandlers}
        className={clsx(
          "relative min-w-0 w-full rounded-[15px] transition-transform",
          editMode && "ring-2 ring-team-nav-accent/30 hw-wiggle",
          motion === "enter" && "hw-tile-in",
          motion === "leave" && "hw-tile-out"
        )}
        style={{
          ...(span ? { gridColumn: `span ${span}` } : {}),
          ...(editMode ? { animationDelay: `${index * 60}ms` } : {}),
          // A long press must not select text or raise the iOS callout.
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
      >
        <style href="home-board-motion" precedence="default">{MOTION_CSS}</style>
        {editMode && (
          <span className="hw-chrome-in">
            <div style={{ position: "absolute", top: 7, insetInlineEnd: 7, display: "flex", gap: 4, zIndex: 10 }}>
              <button
                {...control(onResize)}
                className="tap"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                  background: dark ? "rgba(38,41,50,0.92)" : "rgba(255,255,255,0.92)",
                  color: "rgb(var(--c-charcoal))",
                  boxShadow: "0 2px 8px rgba(36,31,27,0.18)",
                  touchAction: "manipulation",
                }}
                aria-label={t("Resize widget")}
              >
                {size === "small" ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
              </button>
              <button
                {...control(onRemove)}
                className="tap"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                  background: dark ? "rgba(38,41,50,0.92)" : "rgba(255,255,255,0.92)",
                  color: dark ? "rgb(var(--thi-7fb3a9))" : "rgb(var(--thi-4f7f78))",
                  boxShadow: "0 2px 8px rgba(36,31,27,0.18)",
                  touchAction: "manipulation",
                }}
                aria-label={t("Remove widget")}
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
              aria-label={t("Drag to reorder")}
              style={{
                position: "absolute",
                bottom: 7,
                insetInlineStart: 8,
                color: "rgb(var(--c-charcoal) / 0.35)",
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
                  insetInlineStart: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 44,
                  height: 44,
                }}
              />
              <GripVertical size={12} />
            </div>
          </span>
        )}
        {/* THE TILE ITSELF IS INERT WHILE EDITING: a tap on it (including one
            meant for a control that a resize has just moved) never opens the
            widget's screen or sheet. pointer-events is inherited.
            OURS-home-widget-motion #8: while editing, the tile wiggles
            (rotate -1deg <-> 1deg, 260 ms, ease-in-out, offset index x 60 ms);
            none under Reduce motion. */}
        <div style={editMode ? { pointerEvents: "none" } : undefined}>{children}</div>
      </div>
    );
  }
);
WidgetShell.displayName = "WidgetShell";
