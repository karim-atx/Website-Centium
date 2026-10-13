import React, { useEffect, useId, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { linePx, textPx } from "../../theme/textSize";
import type { ZoneOption } from "./timezoneOptions";

// MO1.8.13 #35–#40: the compact one-column wheel inside the time zone panel.
// Rows 30 tall, 5 visible (150), text centred on one line with an ellipsis;
// the selected row 15 / 22.5 800 ink, its neighbours 13.5 / 20.3 600 at 45%,
// the outer pair 12.5 / 18.8 600 at 22%. The band is 40 tall, r10, #F0EEFD
// (dark #242730, the Part B wheel band: the table's #1C1F28 equals the panel
// and would vanish, X-18 / O6). Larger text (O7): rows 34, band 44, 5 rows
// still visible. High contrast: the ink token turns #111111 / #F5F3FA and
// the faded rows keep their opacities (O8).
//
// A listbox (S5): ↑ / ↓ move the band, Home / End, Enter saves and closes,
// a typed character goes to the search box. Reduce motion: no smooth scroll.
//
// It reports a zone only when the USER moved the band (scroll settle, tap,
// keys). A move from outside (a search narrowing the list) only positions it.

const SETTLE_MS = 110;

export const TimezoneWheel: React.FC<{
  options: ZoneOption[];
  /** The zone in the band. */
  value: string | null;
  /** The user put this zone in the band. */
  onPick: (zone: string) => void;
  /** Enter: save and close. */
  onEnter: () => void;
  /** A printable key typed on the wheel (type-ahead goes to search). */
  onTypeAhead: (key: string) => void;
  reduceMotion: boolean;
  label: string;
}> = ({ options, value, onPick, onEnter, onTypeAhead, reduceMotion, label }) => {
  const { accessibility } = useApp();
  const dark = useIsDark();
  const larger = !!accessibility.largerText;
  const ROW = larger ? 34 : 30;
  const BAND = larger ? 44 : 40;
  const listId = useId();
  const ref = useRef<HTMLDivElement | null>(null);
  const settle = useRef<number | null>(null);
  const quietUntil = useRef(0);
  const [top, setTop] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.zone === value));

  // Position on the band zone when it changes from outside, without reporting.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (Math.round(el.scrollTop / ROW) !== index) {
      quietUntil.current = Date.now() + 500;
      el.scrollTop = index * ROW;
    }
    setTop(el.scrollTop);
  }, [index, ROW, options]);

  useEffect(
    () => () => {
      if (settle.current) window.clearTimeout(settle.current);
    },
    []
  );

  const moveTo = (i: number, report: boolean) => {
    const el = ref.current;
    const opt = options[i];
    if (!el || !opt) return;
    // The scroll this causes is ours (and, when reported, already reported).
    quietUntil.current = Date.now() + 700;
    el.scrollTo({ top: i * ROW, behavior: reduceMotion ? "auto" : "smooth" });
    if (report) onPick(opt.zone);
  };

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setTop(el.scrollTop);
    if (settle.current) window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      settle.current = null;
      if (Date.now() < quietUntil.current) return;
      const i = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
      const next = options[i];
      if (next && next.zone !== value) onPick(next.zone);
    }, SETTLE_MS);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      moveTo(Math.min(options.length - 1, Math.max(0, index + (e.key === "ArrowDown" ? 1 : -1))), true);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      moveTo(e.key === "Home" ? 0 : options.length - 1, true);
    } else if (e.key === "Enter") {
      e.preventDefault();
      onEnter();
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      onTypeAhead(e.key);
    }
  };

  const optionId = (i: number) => `${listId}-o${i}`;

  return (
    <div className="relative w-full" style={{ height: ROW * 5 }}>
      <div
        aria-hidden
        className="absolute inset-x-0 pointer-events-none"
        style={{ top: ROW * 2 - (BAND - ROW) / 2, height: BAND, borderRadius: 10, background: dark ? "var(--wheel-band)" : "#F0EEFD" }}
      />
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        aria-activedescendant={options.length ? optionId(index) : undefined}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        className="relative h-full overflow-y-auto no-scrollbar outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[10px]"
        style={{ scrollSnapType: "y mandatory", paddingTop: ROW * 2, paddingBottom: ROW * 2 }}
      >
        {options.map((opt, i) => {
          const d = Math.abs(i - top / ROW);
          const on = d < 0.5;
          const near = !on && d < 1.5;
          return (
            <div
              key={opt.zone}
              id={optionId(i)}
              role="option"
              aria-selected={opt.zone === value}
              onClick={() => moveTo(i, true)}
              className="w-full flex items-center justify-center px-2 text-charcoal cursor-pointer"
              style={{ height: ROW, scrollSnapAlign: "center", opacity: on ? 1 : near ? 0.45 : 0.22 }}
            >
              <span
                className="block min-w-0 truncate"
                style={{
                  fontSize: textPx(on ? 15 : near ? 13.5 : 12.5),
                  lineHeight: linePx(on ? 22.5 : near ? 20.3 : 18.8),
                  fontWeight: on ? 800 : 600,
                }}
              >
                {opt.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
