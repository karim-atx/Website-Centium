import React, { useEffect, useRef } from "react";

export interface WheelOption<V extends string | number = string> {
  value: V;
  label: string;
  /** Shown greyed #CFCBD6 and never selected (WO4.1: times later than now). */
  disabled?: boolean;
}

export interface WheelColumn<V extends string | number = string> {
  options: WheelOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Accessible name for the column ("Day", "Meal", "Hours"…). */
  label: string;
  /** Relative width (flex grow); defaults to 1. */
  flex?: number;
}

const ROW = 36;
const VISIBLE = 5; // selected row plus two neighbours either side

/**
 * The shared iOS-style wheel picker, handover 2026-09-29 02 "Wheel picker":
 * columns with a highlighted selection band #F3F3FD (radius 10, 36px rows);
 * the selected row 17px/700 near-black, neighbours fading to 0.55 then 0.25.
 * Always fits within the sheet width. Used for Day + Meal (FO1.1 Copy to…)
 * and Hours / Minutes / AM-PM (WO4.1 Measured on).
 */
export function WheelPicker({ columns }: { columns: WheelColumn<string | number>[] }) {
  return (
    <div className="relative w-full" style={{ height: ROW * VISIBLE }}>
      {/* The selection band sits behind every column. */}
      <div
        aria-hidden
        className="absolute inset-x-0 pointer-events-none"
        style={{ top: ROW * 2, height: ROW, background: "#F3F3FD", borderRadius: 10 }}
      />
      <div className="relative flex h-full">
        {columns.map((col) => (
          <WheelColumnView key={col.label} column={col} />
        ))}
      </div>
    </div>
  );
}

function WheelColumnView({ column }: { column: WheelColumn<string | number> }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const settle = useRef<number | null>(null);
  const [top, setTop] = React.useState(0);
  const index = Math.max(0, column.options.findIndex((o) => o.value === column.value));

  // Keep the scroll position on the selected value when it changes from outside.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (Math.round(el.scrollTop / ROW) !== index) el.scrollTop = index * ROW;
    setTop(el.scrollTop);
  }, [index]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setTop(el.scrollTop);
    if (settle.current) window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      let i = Math.min(column.options.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
      // A disabled row can't hold the selection: back to the nearest enabled one.
      if (column.options[i]?.disabled) {
        const back = column.options.slice(0, i).map((o) => !o.disabled).lastIndexOf(true);
        i = back >= 0 ? back : column.options.findIndex((o) => !o.disabled);
        if (i < 0) return;
        el.scrollTo({ top: i * ROW, behavior: "smooth" });
      }
      const next = column.options[i];
      if (next && next.value !== column.value) column.onChange(next.value);
    }, 110);
  };

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={column.label}
      onScroll={onScroll}
      className="h-full overflow-y-auto no-scrollbar"
      style={{ flex: column.flex ?? 1, scrollSnapType: "y mandatory", paddingTop: ROW * 2, paddingBottom: ROW * 2 }}
    >
      {column.options.map((opt, i) => {
        // Distance from the centre row, from the live scroll position.
        const d = Math.abs(i - top / ROW);
        const on = d < 0.5;
        return (
          <button
            key={String(opt.value)}
            role="option"
            aria-selected={opt.value === column.value}
            aria-disabled={opt.disabled || undefined}
            onClick={() => {
              if (opt.disabled) return;
              ref.current?.scrollTo({ top: i * ROW, behavior: "smooth" });
              column.onChange(opt.value);
            }}
            className="w-full flex items-center justify-center whitespace-nowrap"
            style={{
              height: ROW,
              scrollSnapAlign: "center",
              fontSize: on ? 17 : 15,
              fontWeight: on ? 700 : 500,
              color: opt.disabled ? "#CFCBD6" : "#241F1B",
              opacity: opt.disabled ? 1 : on ? 1 : d < 1.5 ? 0.55 : 0.25,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
