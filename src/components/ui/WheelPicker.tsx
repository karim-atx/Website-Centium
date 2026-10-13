import React, { useEffect, useRef } from "react";
import { textPx } from "../../theme/textSize";

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
  /** variant "partB": this column's own selection band width in px (HE1.1.1 #75 160, HE1.7.1 #83 90 / #88 60, HE1.6.1.a #87 70). */
  bandWidth?: number;
  /** variant "partB": a unit after the selected value, inside the band (HE1.1.1 #79 "ml" 12/18 700). */
  unit?: string;
}

const ROW = 36;
const VISIBLE = 5; // selected row plus two neighbours either side

/**
 * The shared iOS-style wheel picker, handover 2026-09-29 02 "Wheel picker":
 * columns with a highlighted selection band #F3F3FD (radius 10, 36px rows);
 * the selected row 17px/700 near-black, neighbours fading to 0.55 then 0.25.
 * Always fits within the sheet width. Used for Day + Meal (FO1.1 Copy to…)
 * and Hours / Minutes / AM-PM (WO4.1 Measured on). Colours come from the
 * --wheel-* variables in index.css, which have a dark-mode set.
 */
export function WheelPicker({
  columns,
  band = "default",
  variant = "default",
  separator,
  gap = 6,
  trailing,
  rowHeight = ROW,
}: {
  columns: WheelColumn<string | number>[];
  /**
   * "partB" (Health B log sheets, HE1.1.1 #75-#79, HE1.7.1 #83-#92,
   * HE1.6.1.a #87-#91, HE1.8.2 #56-#60): each column has its own band
   * (`bandWidth` × 40, r10, --sheet-band light / #303141 dark); the selected
   * row 24/36 800 tnum, the next rows 16/24 600 at 45%, the outer rows
   * 14/21 600 at 22%. Columns sit centred, `gap` apart, with `separator`
   * between them (":" 22/33 800, "." 24/36 800) and `trailing` after the
   * last (HE1.7.1 #92 "kg"). Default "default" is unchanged.
   */
  variant?: "default" | "partB";
  separator?: { text: string; size: 22 | 24 };
  gap?: number;
  trailing?: React.ReactNode;
  /** variant "partB": row pitch. 36 for value wheels (HE1.1.1, HE1.7.1); 28.5 for time wheels (HE1.6.1.a #88-#90, HE1.8.2 #57-#59). */
  rowHeight?: number;
  /**
   * The selection band (v6 X-18): "default" --wheel-band (#F3F3FD, dark
   * #242730: Part B and client wheels); "business" --wheel-band-business
   * (#F3F3FD, dark #2B2C3A, measured on the BU dark frames).
   */
  band?: "default" | "business";
}) {
  if (variant === "partB") {
    return (
      <div className="relative w-full flex justify-center items-stretch" style={{ height: rowHeight * VISIBLE, gap }}>
        {columns.map((col, i) => (
          <React.Fragment key={col.label}>
            {i > 0 && separator && (
              <span
                aria-hidden
                className="self-center"
                style={{ fontSize: textPx(separator.size), lineHeight: separator.size === 22 ? "33px" : "36px", fontWeight: 800, color: "var(--wheel-text)" }}
              >
                {separator.text}
              </span>
            )}
            <div className="relative shrink-0" style={{ width: col.bandWidth ?? 70 }}>
              <div
                aria-hidden
                className="absolute inset-x-0 pointer-events-none bg-[var(--sheet-band)] dark:bg-th-303141"
                style={{ top: rowHeight * 2.5 - 20, height: 40, borderRadius: 10 }}
              />
              <div className="relative flex h-full">
                <WheelColumnView column={col} look="partB" row={rowHeight} />
              </div>
            </div>
          </React.Fragment>
        ))}
        {trailing && <span className="self-center flex">{trailing}</span>}
      </div>
    );
  }
  return (
    <div className="relative w-full" style={{ height: ROW * VISIBLE }}>
      {/* The selection band sits behind every column. */}
      <div
        aria-hidden
        className="absolute inset-x-0 pointer-events-none"
        style={{ top: ROW * 2, height: ROW, background: band === "business" ? "var(--wheel-band-business)" : "var(--wheel-band)", borderRadius: 10 }}
      />
      <div className="relative flex h-full">
        {columns.map((col) => (
          <WheelColumnView key={col.label} column={col} />
        ))}
      </div>
    </div>
  );
}

function WheelColumnView({ column, look = "default", row = ROW }: { column: WheelColumn<string | number>; look?: "default" | "partB"; row?: number }) {
  const ROW = row;
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
  }, [index, ROW]);

  // A wheel closed mid-settle must not report afterwards: its element is gone,
  // scrollTop reads 0, and the first option would be chosen (seen on the
  // calendar's Starts wheel, which then dragged Ends to 2 AM).
  useEffect(
    () => () => {
      if (settle.current) window.clearTimeout(settle.current);
    },
    []
  );

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
        if (look === "partB") {
          const near = d < 1.5;
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
                fontSize: textPx(on ? 24 : near ? 16 : 14),
                fontWeight: on ? 800 : 600,
                color: opt.disabled ? "var(--wheel-disabled)" : "var(--wheel-text)",
                opacity: opt.disabled ? 1 : on ? 1 : near ? 0.45 : 0.22,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {opt.label}
              {column.unit && (
                <span
                  aria-hidden={!on}
                  className="text-th-7d6bb5 dark:text-primary-deep-text"
                  style={{ marginLeft: 5, fontSize: textPx(12), lineHeight: "18px", fontWeight: 700, visibility: on ? "visible" : "hidden" }}
                >
                  {column.unit}
                </span>
              )}
            </button>
          );
        }
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
              fontSize: textPx(on ? 17 : 15),
              fontWeight: on ? 700 : 500,
              color: opt.disabled ? "var(--wheel-disabled)" : "var(--wheel-text)",
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
