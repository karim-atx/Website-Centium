import { useCallback, useEffect, useRef, useState } from "react";

// Round F (DW3): drag a card by its grip onto another day, in the
// professional's builder and the member's week view.
//
// THE DAYS MARK THEMSELVES with data-drop-day="<key>" and the pointer is read
// with elementFromPoint, so one hook serves mouse, pen and touch (the grip
// sets touch-action: none, so a finger on it drags instead of scrolling the
// page). A press that never moves past the tolerance is not a drag: the
// grip's own click runs, which is also the keyboard and screen-reader route
// (it opens the day picker). The click a finished drag fires is swallowed
// (clickAfterDrag). Escape cancels.

const TOLERANCE = 6;

export interface DayDrag<T> {
  /** The item being dragged, or null. */
  dragging: T | null;
  /** The day under the pointer that would take it, or null. */
  over: string | null;
  /** Wire to the grip's onPointerDown. */
  begin: (item: T, e: React.PointerEvent<HTMLElement>) => void;
  /** True (once) when the click is the end of a drag: the grip's onClick ignores it. */
  clickAfterDrag: () => boolean;
}

export function useDayDrag<T>(canDrop: (item: T, day: string) => boolean, onDrop: (item: T, day: string) => void): DayDrag<T> {
  const [state, setState] = useState<{ item: T; over: string | null } | null>(null);
  const handlers = useRef({ canDrop, onDrop });
  useEffect(() => {
    handlers.current = { canDrop, onDrop };
  }, [canDrop, onDrop]);
  const stopRef = useRef<(() => void) | null>(null);
  const dragged = useRef(false);
  useEffect(() => () => stopRef.current?.(), []);

  const begin = useCallback((item: T, e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    stopRef.current?.();
    const sx = e.clientX;
    const sy = e.clientY;
    let moving = false;
    let over: string | null = null;

    const move = (ev: PointerEvent) => {
      if (!moving) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < TOLERANCE) return;
        moving = true;
      }
      ev.preventDefault();
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>("[data-drop-day]");
      const key = el?.dataset.dropDay ?? null;
      over = key !== null && handlers.current.canDrop(item, key) ? key : null;
      setState({ item, over });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      stopRef.current = null;
      setState(null);
      if (moving) {
        // The click this pointerup may fire belongs to the drag; a click that
        // never comes (released elsewhere) must not eat the next real one.
        dragged.current = true;
        window.setTimeout(() => {
          dragged.current = false;
        }, 0);
      }
    };
    const up = () => {
      const target = moving ? over : null;
      stop();
      if (target !== null) handlers.current.onDrop(item, target);
    };
    const cancel = () => stop();
    const key = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") stop();
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    stopRef.current = stop;
  }, []);

  const clickAfterDrag = useCallback(() => {
    if (!dragged.current) return false;
    dragged.current = false;
    return true;
  }, []);

  return { dragging: state?.item ?? null, over: state?.over ?? null, begin, clickAfterDrag };
}
