import { useCallback, useRef } from "react";

/**
 * Release 3 · W6 drag to reorder by a grip (MO29 question cards, MO21 note
 * template sections): press the grip and move; the item swaps with its
 * neighbour once the pointer passes the neighbour's middle. Arrow Up / Down
 * on the focused grip move it one place (keyboard reorder).
 */
export function useReorder(count: number, move: (from: number, to: number) => void) {
  const items = useRef<(HTMLElement | null)[]>([]);
  const drag = useRef<{ index: number; pointerId: number } | null>(null);

  const register = useCallback((i: number) => (el: HTMLElement | null) => {
    items.current[i] = el;
  }, []);

  const gripProps = (i: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = { index: i, pointerId: e.pointerId };
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d || d.pointerId !== e.pointerId) return;
      const y = e.clientY;
      const above = items.current[d.index - 1];
      const below = items.current[d.index + 1];
      if (above) {
        const r = above.getBoundingClientRect();
        if (y < r.top + r.height / 2) {
          move(d.index, d.index - 1);
          d.index -= 1;
          return;
        }
      }
      if (below) {
        const r = below.getBoundingClientRect();
        if (y > r.top + r.height / 2) {
          move(d.index, d.index + 1);
          d.index += 1;
        }
      }
    },
    onPointerUp: () => {
      drag.current = null;
    },
    onPointerCancel: () => {
      drag.current = null;
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "ArrowUp" && i > 0) {
        e.preventDefault();
        move(i, i - 1);
      } else if (e.key === "ArrowDown" && i < count - 1) {
        e.preventDefault();
        move(i, i + 1);
      }
    },
    style: { touchAction: "none" as const, cursor: "grab" },
  });

  return { register, gripProps };
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

export type GripProps = ReturnType<ReturnType<typeof useReorder>["gripProps"]>;
