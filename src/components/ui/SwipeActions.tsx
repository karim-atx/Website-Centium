import React, { useEffect, useRef, useState } from "react";
import { useIsDark } from "../../hooks/useIsDark";

export interface SwipeAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  /** Delete: #FCEDEC fill + #B4372C icon, and always the far-right tile. */
  destructive?: boolean;
  /**
   * LIGHT-mode tile colours, for a row whose old action buttons keep their
   * colours on the new tiles (decision 15). Dark mode is unaffected.
   */
  light?: { fill: string; ink: string };
}

const TILE_MAX = 56;
const TILE_GAP = 8;
const OPEN_EVENT = "swipe-actions:open";

/**
 * The shared swipe-to-reveal row, handover 2026-09-29 02 "Swipe actions":
 * drag a row LEFT to reveal action tiles on its right edge, the delete tile
 * always at the far right. Tiles are rounded squares at row height (capped,
 * and centred on tall cards); delete = #FCEDEC + #B4372C trash, others = light
 * lavender tint + lavender icon. The row slides as one rounded unit clipped
 * inside its own radius, with a small gap before the tiles. Swiping back,
 * tapping elsewhere or scrolling closes it; one open item at a time; a swipe
 * short of halfway snaps back. Used by WO3.1 and WO16 (`shrink`).
 *
 * Mobile v5.1 R3, dark mode (no light islands): delete is danger.tint
 * #3C2A30 with danger #FF6B5E (4.8:1); the other tiles keep their
 * translucent lavender tint and take primary.deep #B7ABDE for the icon
 * (#7D67D9 measured 2.7:1 on the tint over the dark card, #B7ABDE 5.6:1).
 */
export const SwipeActions: React.FC<{
  actions: SwipeAction[];
  /** The row's corner radius, so it slides as one rounded unit. */
  radius?: number;
  disabled?: boolean;
  /**
   * WO16: instead of sliding left, the row keeps its left edge and narrows to
   * make room for the tiles, lifted by a soft shadow, so none of its text
   * leaves the sheet (the frame's swiped row ends at the tile gap).
   */
  shrink?: boolean;
  /** Tile size cap (default 56) and the gap from the row's right edge
   *  (default 0). MO1.1.1 Habits draws 45 pt tiles 10 pt in from the card. */
  tileMax?: number;
  edgeInset?: number;
  /**
   * The keyboard path to the tiles, with nothing drawn (MO1.1.1, MO1.1.2:
   * the frames show no ⋮ or menu). The row itself takes focus under this
   * accessible name; ArrowLeft opens the tiles (ArrowRight in RTL) and
   * ArrowRight / Escape closes them. Keys pressed on a focusable child (a
   * habit's check) work the same. Off when not given, so every other swipe
   * row is unchanged.
   */
  keyboardLabel?: string;
  /**
   * D12 (MO1.1.1, MO1.1.2; restore round 2026-10-07): the same actions
   * without a swipe. Holding the row still for 500 ms (touch or mouse), or a
   * right-click, calls this with the row, so the caller can open its menu
   * there; the tap that ends the hold is swallowed so it doesn't also act on
   * the row. Off when not given, so every other swipe row is unchanged.
   */
  onLongPress?: (row: HTMLElement) => void;
  children: React.ReactNode;
}> = ({ actions, radius = 16, disabled, shrink, tileMax = TILE_MAX, edgeInset = 0, keyboardLabel, onLongPress, children }) => {
  const dark = useIsDark();
  const id = useRef(Math.random().toString(36).slice(2));
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [rowH, setRowH] = useState(TILE_MAX);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; axis: "x" | "y" | null } | null>(null);

  // Delete last, whatever order the caller passed.
  const ordered = [...actions.filter((a) => !a.destructive), ...actions.filter((a) => a.destructive)];
  const tile = Math.min(tileMax, rowH);
  const openWidth = ordered.length * (tile + TILE_GAP) + edgeInset;

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setRowH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // One open item at a time; scrolling or tapping elsewhere closes it.
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id.current) setOffset(0);
    };
    const close = () => setOffset(0);
    const onDown = (e: PointerEvent) => {
      if (rowRef.current?.parentElement?.contains(e.target as Node)) return;
      setOffset(0);
    };
    window.addEventListener(OPEN_EVENT, onOther);
    window.addEventListener("scroll", close, true);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOther);
      window.removeEventListener("scroll", close, true);
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);

  // D12 long-press: a timer from pointer-down, cancelled by any movement that
  // picks an axis (a swipe or a scroll) or by letting go.
  const longTimer = useRef<number | null>(null);
  const longFired = useRef(false);
  const lastPointer = useRef("mouse");
  const clearLong = () => {
    if (longTimer.current !== null) window.clearTimeout(longTimer.current);
    longTimer.current = null;
  };
  useEffect(() => clearLong, []);
  const fireLong = () => {
    if (!onLongPress || !rowRef.current) return;
    longFired.current = true;
    start.current = null;
    setOffset(0);
    onLongPress(rowRef.current);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    longFired.current = false;
    lastPointer.current = e.pointerType;
    start.current = { x: e.clientX, y: e.clientY, base: offset, axis: null };
    if (onLongPress && e.button === 0) {
      clearLong();
      longTimer.current = window.setTimeout(fireLong, 500);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const rtl = rowRef.current ? getComputedStyle(rowRef.current).direction === "rtl" : false;
    const openKey = rtl ? "ArrowRight" : "ArrowLeft";
    const closeKey = rtl ? "ArrowLeft" : "ArrowRight";
    if (e.key === openKey && offset === 0) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id.current }));
      setOffset(-openWidth);
    } else if ((e.key === closeKey || e.key === "Escape") && offset !== 0) {
      e.preventDefault();
      setOffset(0);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      clearLong();
      s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (s.axis === "x") {
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    }
    if (s.axis !== "x") return;
    setOffset(Math.min(0, Math.max(-openWidth, s.base + dx)));
  };
  const onPointerUp = () => {
    clearLong();
    const s = start.current;
    start.current = null;
    if (!s || s.axis !== "x") return;
    setDragging(false);
    // Short of halfway snaps back.
    setOffset((o) => {
      const open = o < -openWidth / 2;
      if (open) window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id.current }));
      return open ? -openWidth : 0;
    });
  };

  return (
    <div className="relative" style={{ borderRadius: radius }}>
      <div
        aria-hidden={offset === 0}
        className="absolute inset-y-0 right-0 flex items-center justify-end"
        // Hidden while fully closed: a tile behind a row whose corner radius
        // is near the tile's inset otherwise shows as a sliver at the curve.
        // Hiding waits for the row's .22s slide back.
        style={{
          gap: TILE_GAP,
          width: openWidth,
          paddingRight: edgeInset,
          visibility: offset === 0 && !dragging ? "hidden" : "visible",
          transition: offset === 0 && !dragging ? "visibility 0s linear .22s" : "none",
        }}
      >
        {ordered.map((a) => (
          <button
            key={a.key}
            aria-label={a.label}
            title={a.label}
            tabIndex={offset === 0 ? -1 : 0}
            onClick={() => {
              setOffset(0);
              a.onClick();
            }}
            className="tap flex-none flex items-center justify-center"
            style={{
              width: tile,
              height: tile,
              borderRadius: 14,
              background: !dark && a.light ? a.light.fill : a.destructive ? (dark ? "#3C2A30" : "#FCEDEC") : "rgb(var(--th-aea1dc) / 0.18)",
              color: !dark && a.light ? a.light.ink : a.destructive ? (dark ? "#FF6B5E" : "#B4372C") : dark ? "rgb(var(--thi-b7abde))" : "rgb(var(--thi-7d67d9))",
            }}
          >
            {a.icon}
          </button>
        ))}
      </div>
      <div
        ref={rowRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={
          onLongPress
            ? (e) => {
                // The tap that ends a long-press opened the menu; it must not
                // also tick the habit or act on the entry.
                if (!longFired.current) return;
                longFired.current = false;
                e.stopPropagation();
                e.preventDefault();
              }
            : undefined
        }
        onContextMenu={
          onLongPress
            ? (e) => {
                // A touch long-press raises this too (after the timer has
                // fired); a right-click opens the menu by itself.
                e.preventDefault();
                if (!longFired.current && !disabled) {
                  clearLong();
                  fireLong();
                  // A mouse right-click is followed by no click to swallow.
                  if (lastPointer.current === "mouse") longFired.current = false;
                }
              }
            : undefined
        }
        onKeyDown={keyboardLabel ? onKeyDown : undefined}
        tabIndex={keyboardLabel ? 0 : undefined}
        role={keyboardLabel ? "group" : undefined}
        aria-label={keyboardLabel}
        className={`relative overflow-hidden${keyboardLabel ? " focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent" : ""}`}
        style={{
          borderRadius: radius,
          touchAction: "pan-y",
          // No iOS callout or text selection on a held row.
          ...(onLongPress ? { WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" } : null),
          ...(shrink
            ? {
                width: `calc(100% - ${-offset}px)`,
                boxShadow: offset < 0 ? "0 2px 8px rgba(36,31,27,0.08)" : "none",
                transition: dragging ? "none" : "width .22s cubic-bezier(.22,1,.36,1), box-shadow .22s",
              }
            : {
                transform: `translateX(${offset}px)`,
                transition: dragging ? "none" : "transform .22s cubic-bezier(.22,1,.36,1)",
              }),
        }}
      >
        {children}
      </div>
    </div>
  );
};
