import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

// WO1.1 drag and drop on the Routines tab.
//
// THE LIST MARKS ITS OWN DROP GEOMETRY with data attributes, and this hook
// reads it from the DOM (null folder ids are written as ""):
//   [data-dnd-header="<folderId>"]       a folder header (drop a routine on it)
//   [data-dnd-group="<folderId>"]        a folder's (or Unfiled's) routine list,
//     whose direct [data-dnd-row] children are the routines in order
//   [data-dnd-folders="<parentId>"]      a sibling group of folders, whose
//     direct [data-dnd-folder-block] children are the folders in order
//   [data-dnd-placeholder]               the gap where the item will land
//   [data-flip="<key>"]                  anything that slides when the list shifts
//
// THE DRAGGED ITEM STAYS MOUNTED (hidden) where it started. A touch that began
// on an element that leaves the DOM stops delivering touchmove to the window,
// and the listener that stops the page scrolling mid-drag lives there.

export type DragItem =
  | { kind: "routine"; id: string; folderId: string | null; index: number }
  | { kind: "folder"; id: string; parentId: string | null; index: number };

export type DropTarget =
  | { kind: "group"; folderId: string | null; index: number }
  | { kind: "header"; folderId: string }
  | { kind: "folders"; parentId: string | null; index: number };

export interface DragState {
  item: DragItem;
  target: DropTarget;
  /** The lifted card: its size and where it follows the pointer. */
  height: number;
  width: number;
  left: number;
  offsetY: number;
  y: number;
}

const LONG_PRESS_MS = 400;
const MOVE_TOLERANCE = 8;
const EDGE_TOP = 96;
// The navbar, and the active-workout bar when it shows, cover the bottom.
const EDGE_BOTTOM = 170;

const attr = (id: string | null) => id ?? "";
const fromAttr = (v: string | undefined) => (v ? v : null);

/** Layout position (ignores transforms, so in-flight slide animations don't move the targets). */
function layoutRect(el: HTMLElement): { top: number; bottom: number } {
  let top = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) top += n.offsetTop;
  top -= window.scrollY;
  return { top, bottom: top + el.offsetHeight };
}
const shown = (el: Element) => (el as HTMLElement).offsetParent !== null;

/** The drop slots of an ordered run of elements: before each one and after the last. */
function slots(items: HTMLElement[], container: HTMLElement): number[] {
  if (items.length === 0) {
    const r = layoutRect(container);
    return [(r.top + r.bottom) / 2];
  }
  const r = items.map(layoutRect);
  const ys = [r[0].top];
  for (let i = 1; i < r.length; i++) ys.push((r[i - 1].bottom + r[i].top) / 2);
  ys.push(r[r.length - 1].bottom);
  return ys;
}

export function useRoutineDrag(
  listRef: RefObject<HTMLElement | null>,
  onDrop: (item: DragItem, target: DropTarget) => void
) {
  const [drag, setDragState] = useState<DragState | null>(null);
  // Mirrors of the latest drag and drop handler for the window listeners.
  const dragRef = useRef<DragState | null>(null);
  const onDropRef = useRef(onDrop);
  useLayoutEffect(() => {
    onDropRef.current = onDrop;
  });
  const setDrag = useCallback((s: DragState | null) => {
    dragRef.current = s;
    setDragState(s);
  }, []);
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const settleUntil = useRef(0);
  const flipTops = useRef(new Map<string, number>());

  const hitTest = useCallback(
    (state: DragState, y: number): DropTarget => {
      const root = listRef.current;
      if (!root) return state.target;
      const center = y - state.offsetY + state.height / 2;
      const ph = root.querySelector<HTMLElement>("[data-dnd-placeholder]");
      if (ph && shown(ph)) {
        const r = layoutRect(ph);
        if (center >= r.top && center <= r.bottom) return state.target;
      }
      let best: { d: number; target: DropTarget } | null = null;
      const consider = (d: number, target: DropTarget) => {
        if (!best || d < best.d) best = { d, target };
      };

      if (state.item.kind === "routine") {
        // Over a folder header (collapsed or not): the end of that folder.
        for (const h of root.querySelectorAll<HTMLElement>("[data-dnd-header]")) {
          if (!shown(h)) continue;
          const r = layoutRect(h);
          if (y >= r.top + 4 && y <= r.bottom - 4) return { kind: "header", folderId: h.dataset.dndHeader! };
        }
        for (const g of root.querySelectorAll<HTMLElement>("[data-dnd-group]")) {
          if (!shown(g)) continue;
          const rows = [...g.children].filter(
            (c): c is HTMLElement => c.hasAttribute("data-dnd-row") && shown(c)
          );
          slots(rows, g).forEach((sy, index) =>
            consider(Math.abs(center - sy), { kind: "group", folderId: fromAttr(g.dataset.dndGroup), index })
          );
        }
      } else {
        const container = root.querySelector<HTMLElement>(`[data-dnd-folders="${attr(state.item.parentId)}"]`);
        if (container) {
          const blocks = [...container.children].filter(
            (c): c is HTMLElement => c.hasAttribute("data-dnd-folder-block") && shown(c)
          );
          const parentId = state.item.parentId;
          slots(blocks, container).forEach((sy, index) =>
            consider(Math.abs(center - sy), { kind: "folders", parentId, index })
          );
        }
      }
      return (best as { d: number; target: DropTarget } | null)?.target ?? state.target;
    },
    [listRef]
  );

  const begin = useCallback((item: DragItem, el: HTMLElement, clientY: number) => {
    const r = el.getBoundingClientRect();
    const target: DropTarget =
      item.kind === "routine"
        ? { kind: "group", folderId: item.folderId, index: item.index }
        : { kind: "folders", parentId: item.parentId, index: item.index };
    setDrag({ item, target, height: r.height, width: r.width, left: r.left, offsetY: clientY - r.top, y: clientY });
  }, [setDrag]);

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  /** Long-press on a card or header. Buttons marked data-no-drag (play, ⋮) never start one. */
  const pressProps = (item: DragItem, enabled = true) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled || e.button !== 0 || dragRef.current) return;
      if ((e.target as HTMLElement).closest("[data-no-drag], input, textarea")) return;
      const el = e.currentTarget;
      const y = e.clientY;
      cancelPress();
      press.current = {
        x: e.clientX,
        y,
        timer: window.setTimeout(() => {
          press.current = null;
          begin(item, el, y);
        }, LONG_PRESS_MS),
      };
    },
    onPointerMove: (e: React.PointerEvent) => {
      const p = press.current;
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_TOLERANCE) cancelPress();
    },
    onPointerUp: cancelPress,
    onPointerCancel: cancelPress,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  /** The six-dot grip: starts a drag at once, lifting the [data-drag-card] it sits in. */
  const gripProps = (item: DragItem) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || dragRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const el = e.currentTarget.closest<HTMLElement>("[data-drag-card]");
      if (el) begin(item, el, e.clientY);
    },
    style: { touchAction: "none" as const, cursor: "grab" },
  });

  // Follow the pointer, block page scrolling, auto-scroll near the edges.
  const active = drag !== null;
  useEffect(() => {
    if (!active) return;
    let lastY = dragRef.current?.y ?? 0;
    let frame = 0;
    const update = (y: number) => {
      lastY = y;
      const s = dragRef.current;
      if (!s) return;
      const target = hitTest(s, y);
      setDrag({ ...s, y, target });
    };
    const onMove = (e: PointerEvent) => update(e.clientY);
    const finish = (commit: boolean) => {
      const s = dragRef.current;
      if (!s) return;
      suppressClickUntil.current = Date.now() + 350;
      settleUntil.current = Date.now() + 320;
      // The dropped item slides from where the lifted card was.
      const key = s.item.kind === "routine" ? `r:${s.item.id}` : `f:${s.item.id}`;
      flipTops.current.set(key, s.y - s.offsetY + window.scrollY);
      setDrag(null);
      if (commit) onDropRef.current(s.item, s.target);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish(false);
    const blockScroll = (e: TouchEvent) => e.preventDefault();
    const tick = () => {
      const speed =
        lastY < EDGE_TOP ? -Math.ceil((EDGE_TOP - lastY) / 6) : lastY > window.innerHeight - EDGE_BOTTOM ? Math.ceil((lastY - (window.innerHeight - EDGE_BOTTOM)) / 6) : 0;
      if (speed !== 0) {
        const before = window.scrollY;
        window.scrollBy(0, speed);
        if (window.scrollY !== before) update(lastY);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchmove", blockScroll, { passive: false });
    const prevSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchmove", blockScroll);
      document.body.style.userSelect = prevSelect;
    };
  }, [active, hitTest, setDrag]);

  // Other items slide to make room (FLIP), while dragging and as a drop settles.
  useLayoutEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const animate = dragRef.current !== null || Date.now() < settleUntil.current;
    const next = new Map<string, number>();
    for (const el of root.querySelectorAll<HTMLElement>("[data-flip]")) {
      if (!shown(el)) continue;
      const key = el.dataset.flip!;
      const top = layoutRect(el).top + window.scrollY;
      next.set(key, top);
      const prev = flipTops.current.get(key);
      if (animate && prev !== undefined && Math.abs(prev - top) > 0.5) {
        el.animate([{ transform: `translateY(${prev - top}px)` }, { transform: "translateY(0)" }], {
          duration: 200,
          easing: "cubic-bezier(.2,.8,.2,1)",
        });
      }
    }
    flipTops.current = next;
  });

  /** On the list: a drag's closing pointerup must not also tap what is under it. */
  const onClickCapture = (e: React.MouseEvent) => {
    if (Date.now() < suppressClickUntil.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  return { drag, pressProps, gripProps, onClickCapture };
}
