import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// MO1.6.1, Calendar · Year: one continuous vertical scroll of years, as in
// Apple Calendar. Each year is a 30/800 heading over a rule and three columns
// of mini months. Tapping a month opens it in Month view. B31: today's year
// ±5, opening on the year being viewed; each month keeps its event count (a
// small line under its name, shown only when there is something to count).

const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString("en-US", { month: "short" }));
const RANGE = 5;

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function MiniMonth({
  year,
  month,
  todayIso,
  count,
  onOpen,
}: {
  year: number;
  month: number;
  todayIso: string;
  count: number;
  onOpen: () => void;
}) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const isCurrent = todayIso.startsWith(iso(year, month, 1).slice(0, 7));
  const cells = [...Array.from({ length: first }, () => 0), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}${count ? `, ${count} ${count === 1 ? "day" : "days"} with events` : ""}`}
      className="tap self-start flex flex-col items-stretch text-left min-w-0"
    >
      {/* MO1.6.1 anatomy row 7: the current month in the primary accent
          #7D67D9 (new since pre-R1, whose year view had no current month:
          decision 22, the handover's own colour). */}
      <span className={`block text-[15px] font-semibold leading-tight ${isCurrent ? "text-primary-accent" : "text-charcoal"}`}>
        {MONTHS[month]}
      </span>
      {count > 0 && (
        <span className="block text-[10px] leading-[14px] text-charcoal-faint">
          {count} {count === 1 ? "event" : "events"}
        </span>
      )}
      {/* MO1.6.1 (2x frame): the first row's centre 24.5 under the name's,
          rows 17 apart (y 535 → 569); today a 15 circle (x 158–187). */}
      <span className="grid grid-cols-7 gap-y-[2px] mt-2" aria-hidden>
        {cells.map((d, i) => {
          const today = d > 0 && iso(year, month, d) === todayIso;
          return (
            <span
              key={i}
              data-today={today || undefined}
              className={`h-[15px] flex items-center justify-center text-[9px] tabular-nums ${
                today ? "w-[15px] justify-self-center font-bold rounded-full bg-primary-fill text-on-primary-fill" : "font-semibold text-charcoal"
              }`}
            >
              {d > 0 ? d : ""}
            </span>
          );
        })}
      </span>
    </button>
  );
}

export const YearScroll: React.FC<{
  /** The year to open on (the cursor's). */
  year: number;
  todayIso: string;
  /** Days with at least one event, as yyyy-mm-dd keys. */
  eventDays: string[];
  onOpenMonth: (year: number, month: number) => void;
  /** Bumped by the page to scroll back to today's year (a second tap on the Year tab). */
  jumpSignal: number;
}> = ({ year, todayIso, eventDays, onOpenMonth, jumpSignal }) => {
  const todayYear = Number(todayIso.slice(0, 4));
  const years = useMemo(() => Array.from({ length: RANGE * 2 + 1 }, (_, i) => todayYear - RANGE + i), [todayYear]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of eventDays) m.set(d.slice(0, 7), (m.get(d.slice(0, 7)) ?? 0) + 1);
    return m;
  }, [eventDays]);
  const refs = useRef(new Map<number, HTMLElement>());
  const box = useRef<HTMLDivElement | null>(null);
  // THE YEARS SCROLL IN THEIR OWN AREA, under the tabs, so opening on this
  // year (the sixth of eleven) does not scroll the view tabs off the screen.
  // It runs to just above the floating navbar.
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const top = box.current?.getBoundingClientRect().top ?? 0;
      setHeight(Math.max(320, window.innerHeight - top - 96));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const scrollToYear = (y: number, smooth: boolean) => {
    const el = refs.current.get(y);
    // The box is `relative`, so a section's offsetTop is already measured from it.
    if (el && box.current) box.current.scrollTo({ top: el.offsetTop, behavior: smooth ? "smooth" : "auto" });
  };

  // Opens on the year being viewed, without animating there.
  useEffect(() => {
    if (height === null) return;
    scrollToYear(Math.min(Math.max(year, years[0]), years[years.length - 1]), false);
    // Only once it has its height; later scrolling is the person's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height === null]);

  useEffect(() => {
    if (jumpSignal) scrollToYear(todayYear, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpSignal]);

  return (
    <div
      ref={box}
      // MO1.6.1 (2x frame): 30 between a year's last row and the next
      // heading (Dec's last row 1467 → "2027" 1578 centre to centre).
      className="relative flex flex-col gap-[30px] overflow-y-auto no-scrollbar -mx-1 px-1 pb-6"
      style={{ height: height ?? undefined }}
    >
      {years.map((y) => (
        <section
          key={y}
          ref={(el) => {
            if (el) refs.current.set(y, el);
            else refs.current.delete(y);
          }}
          aria-label={String(y)}
        >
          <h2 className="m-0 text-[30px] font-extrabold leading-[1.2] tracking-[-0.02em] text-charcoal tabular-nums">{y}</h2>
          <div className="h-px bg-charcoal/[0.08] mt-2 mb-4" />
          {/* Month rows 131.6 apart for five-week months (Jan → Apr, 2x
              frame), so 22 between them. */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-[22px]">
            {Array.from({ length: 12 }, (_, m) => (
              <MiniMonth
                key={m}
                year={y}
                month={m}
                todayIso={todayIso}
                count={counts.get(iso(y, m, 1).slice(0, 7)) ?? 0}
                onOpen={() => onOpenMonth(y, m)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
