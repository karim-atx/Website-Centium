import React, { useEffect, useRef, useState } from "react";

// Website viewport v1 · WC-FO.1.2 (FO Add Food Web, u3 / u12): under the Add
// Food filter chips, a draggable pill scrollbar in place of the swipe. Track
// 6 tall, r999, #AEA1DC@25%, 6 below the chips; the thumb #AEA1DC (hover
// #9A8CD6), as wide as the visible share of the row but never under 32,
// placed by how far the row is scrolled; dragging it scrolls the chips.
// Nothing renders when the chips fit. Web only (the sheet renders it from
// 1024px wide).

export const ChipScrollbar: React.FC<{ target: React.RefObject<HTMLElement | null> }> = ({ target }) => {
  const track = useRef<HTMLDivElement | null>(null);
  const [m, setM] = useState<{ w: number; p: number } | null>(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const measure = () => {
      if (!el.scrollWidth) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) {
        setM(null);
        return;
      }
      const w = Math.min(100, (el.clientWidth / el.scrollWidth) * 100);
      const p = Math.min(1, Math.abs(el.scrollLeft) / max);
      setM((prev) => (prev && Math.abs(prev.w - w) < 0.5 && Math.abs(prev.p - p) < 0.005 ? prev : { w, p }));
    };
    const raf = requestAnimationFrame(measure);
    el.addEventListener("scroll", measure, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", measure);
      ro?.disconnect();
    };
  }, [target]);

  if (!m) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    const el = target.current;
    const tr = track.current;
    if (!el || !tr) return;
    e.preventDefault();
    const sx = e.clientX;
    const s0 = el.scrollLeft;
    const thumbPx = Math.max(32, (tr.clientWidth * el.clientWidth) / el.scrollWidth);
    const ratio = (el.scrollWidth - el.clientWidth) / Math.max(1, tr.clientWidth - thumbPx);
    setDrag(true);
    const move = (ev: PointerEvent) => {
      el.scrollLeft = s0 + (ev.clientX - sx) * ratio;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const width = `max(32px, ${m.w.toFixed(2)}%)`;
  return (
    <div ref={track} aria-hidden="true" data-chip-scrollbar className="relative" style={{ height: 6, borderRadius: 999, background: "rgba(174,161,220,0.25)", marginTop: 6 }}>
      <span
        onPointerDown={onPointerDown}
        className="absolute hover:!bg-[#9A8CD6]"
        style={{
          top: 0,
          bottom: 0,
          insetInlineStart: `calc((100% - ${width}) * ${m.p.toFixed(4)})`,
          width,
          borderRadius: 999,
          background: "#AEA1DC",
          cursor: drag ? "grabbing" : "grab",
          touchAction: "none",
          transition: "background-color .15s",
        }}
      />
    </div>
  );
};
