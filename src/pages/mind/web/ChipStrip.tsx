import React, { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Website viewport v1 (section 3, "Horizontal carousel → one row + draggable
 * pill scrollbar"; WC-MI Mind Web v5 Achievements, literal): a no-wrap row of
 * 36 chips (padding 0 14, r10, 15/24 600, 6 apart; selected #A79AD5 / white,
 * idle #F5F4FE / #5B5349) and, only while it overflows, a 6 track
 * (#AEA1DC at 25%) under it, 8 below, with the #AEA1DC thumb (hover #9A8CD6,
 * at least 32 wide) that drags the row.
 */
export function ChipStrip<K extends string>({ items, active, onChange, label }: { items: { key: K; label: string }[]; active: K; onChange: (k: K) => void; label: string }) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [m, setM] = useState({ w: 100, p: 0 });
  const [drag, setDrag] = useState(false);

  const measure = useCallback(() => {
    const el = rowRef.current;
    if (!el || !el.scrollWidth) return;
    const w = Math.min(100, (el.clientWidth / el.scrollWidth) * 100);
    const max = el.scrollWidth - el.clientWidth;
    // RTL scrolls with a negative scrollLeft; the thumb runs from the start edge.
    const p = max > 0 ? Math.abs(el.scrollLeft) / max : 0;
    setM((s) => (Math.abs(s.w - w) > 0.3 || Math.abs(s.p - p) > 0.004 ? { w, p } : s));
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = rowRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, items.length]);

  const onThumbDown = (e: React.PointerEvent) => {
    const el = rowRef.current;
    const tr = trackRef.current;
    if (!el || !tr) return;
    e.preventDefault();
    const sx = e.clientX;
    const s0 = el.scrollLeft;
    const thumbPx = Math.max(32, (tr.clientWidth * el.clientWidth) / el.scrollWidth);
    const ratio = (el.scrollWidth - el.clientWidth) / Math.max(1, tr.clientWidth - thumbPx);
    setDrag(true);
    const mv = (ev: PointerEvent) => {
      el.scrollLeft = s0 + (ev.clientX - sx) * ratio; // RTL: a negative scrollLeft, the same sum
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      setDrag(false);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  const cw = m.w.toFixed(2);
  return (
    <div className="flex flex-col" style={{ flex: "none", gap: 8 }}>
      <div ref={rowRef} role="tablist" aria-label={label} onScroll={measure} className="mind-web-noscroll flex" style={{ flexWrap: "nowrap", gap: 6, overflowX: "auto" }}>
        {items.map((c) => {
          const on = c.key === active;
          return (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(c.key)}
              className="mind-web-focus flex items-center whitespace-nowrap"
              style={{ flex: "none", height: 36, padding: "0 14px", borderRadius: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#A79AD5" : "#F5F4FE", color: on ? "#FFFFFF" : "#5B5349" }}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      {m.w < 99.5 && (
        <div ref={trackRef} aria-hidden className="relative" style={{ height: 6, borderRadius: 999, background: "rgba(174,161,220,0.25)" }}>
          <span
            data-chip-thumb
            onPointerDown={onThumbDown}
            className="mind-web-thumb absolute"
            style={{
              top: 0,
              bottom: 0,
              insetInlineStart: `calc((100% - max(32px, ${cw}%)) * ${m.p.toFixed(4)})`,
              width: `max(32px, ${cw}%)`,
              borderRadius: 999,
              background: "#AEA1DC",
              cursor: drag ? "grabbing" : "grab",
              touchAction: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}
