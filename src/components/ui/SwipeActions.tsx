import React, { useEffect, useRef, useState } from "react";
import { useIsDark } from "../../hooks/useIsDark";

export interface SwipeAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  /** Delete: #FCEDEC fill + #B4372C icon, and always the far-right tile. */
  destructive?: boolean;
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
  children: React.ReactNode;
}> = ({ actions, radius = 16, disabled, shrink, children }) => {
  const dark = useIsDark();
  const id = useRef(Math.random().toString(36).slice(2));
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [rowH, setRowH] = useState(TILE_MAX);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; axis: "x" | "y" | null } | null>(null);

  // Delete last, whatever order the caller passed.
  const ordered = [...actions.filter((a) => !a.destructive), ...actions.filter((a) => a.destructive)];
  const tile = Math.min(TILE_MAX, rowH);
  const openWidth = ordered.length * (tile + TILE_GAP);

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

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    start.current = { x: e.clientX, y: e.clientY, base: offset, axis: null };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
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
        style={{ gap: TILE_GAP, width: openWidth }}
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
              background: a.destructive ? (dark ? "#3C2A30" : "#FCEDEC") : "rgba(174,161,220,0.18)",
              color: a.destructive ? (dark ? "#FF6B5E" : "#B4372C") : dark ? "#B7ABDE" : "#7D67D9",
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
        className="relative overflow-hidden"
        style={{
          borderRadius: radius,
          touchAction: "pan-y",
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
