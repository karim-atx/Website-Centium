import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// MO1.6.1, Calendar · Year: one continuous vertical scroll of years, as in
// Apple Calendar. Each year is a 30/800 heading over a rule and three columns
// of mini months. Tapping a month opens it in Month view. Handover-complete
// pass (was B31's ±5 in a scroller of its own): the years run open-ended in
// the PAGE's scroll, as the frame draws them, starting with the year being
// viewed straight under the tabs. Later years are added as the end comes
// near; an earlier year is added above when someone keeps scrolling up at the
// top of the page (wheel, touch or keys), with the scroll position kept so
// nothing jumps. Decision 23 (item 105): a day with
// events carries the Month view's 3.5 #6F9993 dot under its number, in place
// of the per-month count line; the count stays in the month's label for
// screen readers.

const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString("en-US", { month: "short" }));

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function MiniMonth({
  year,
  month,
  todayIso,
  eventDays,
  onOpen,
}: {
  year: number;
  month: number;
  todayIso: string;
  eventDays: Set<string>;
  onOpen: () => void;
}) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const isCurrent = todayIso.startsWith(iso(year, month, 1).slice(0, 7));
  const cells = [...Array.from({ length: first }, () => 0), ...Array.from({ length: days }, (_, i) => i + 1)];
  const count = cells.filter((d) => d > 0 && eventDays.has(iso(year, month, d))).length;
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
      {/* MO1.6.1 (2x frame): the first row's centre 24.5 under the name's,
          rows 17 apart (y 535 → 569); today a 15 circle (x 158–187). The
          event dot sits at the foot of the 15 cell (position measured: not
          given), so the rows keep their pitch. */}
      <span className="grid grid-cols-7 gap-y-[2px] mt-2" aria-hidden>
        {cells.map((d, i) => {
          const key = d > 0 ? iso(year, month, d) : "";
          const today = d > 0 && key === todayIso;
          return (
            <span
              key={i}
              data-today={today || undefined}
              className={`relative h-[15px] flex items-center justify-center text-[9px] tabular-nums ${
                today ? "w-[15px] justify-self-center font-bold rounded-full bg-primary-fill text-on-primary-fill" : "font-semibold text-charcoal"
              }`}
            >
              {d > 0 ? d : ""}
              {d > 0 && eventDays.has(key) && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[3.5px] h-[3.5px] rounded-full"
                  style={{ background: today ? "rgb(var(--c-on-primary-fill))" : "rgb(var(--th-6f9993))" }}
                />
              )}
            </span>
          );
        })}
      </span>
    </button>
  );
}

/** Years added at a time when the end of the list comes near. */
const STEP = 2;

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
  // The years on the page: opens on the viewed year and the next STEP.
  const [span, setSpan] = useState(() => ({ from: year, to: year + STEP }));
  const years = useMemo(() => Array.from({ length: span.to - span.from + 1 }, (_, i) => span.from + i), [span]);
  const eventDaySet = useMemo(() => new Set(eventDays), [eventDays]);
  const refs = useRef(new Map<number, HTMLElement>());
  const end = useRef<HTMLDivElement | null>(null);

  // Later years: a few more whenever the end is within a screen of view.
  useEffect(() => {
    const el = end.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSpan((s) => ({ ...s, to: s.to + STEP }));
      },
      { rootMargin: "0px 0px 100% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Earlier years: one more above when someone keeps scrolling up at the top
  // of the page. The first year's screen position is noted before it is
  // added and restored after, so the page stays where it was and the next
  // scroll up moves into the added year.
  const anchor = useRef<{ year: number; top: number } | null>(null);
  const prepend = () => {
    if (anchor.current) return;
    const first = refs.current.get(span.from);
    if (!first) return;
    anchor.current = { year: span.from, top: first.getBoundingClientRect().top };
    setSpan((s) => ({ ...s, from: s.from - 1 }));
  };
  useLayoutEffect(() => {
    const a = anchor.current;
    if (!a) return;
    anchor.current = null;
    const el = refs.current.get(a.year);
    if (el) window.scrollBy(0, el.getBoundingClientRect().top - a.top);
  }, [span.from]);

  const prependRef = useRef(prepend);
  useLayoutEffect(() => {
    prependRef.current = prepend;
  });
  useEffect(() => {
    const atTop = () => window.scrollY <= 0;
    let touchY: number | null = null;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0 && atTop()) prependRef.current();
    };
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (touchY !== null && y !== undefined && y - touchY > 12 && atTop()) {
        touchY = y;
        prependRef.current();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "ArrowUp" || e.key === "PageUp" || e.key === "Home") && atTop()) prependRef.current();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // A second tap on Year: today's year, added first if it is not on the page.
  const pendingJump = useRef(false);
  useEffect(() => {
    if (!jumpSignal) return;
    pendingJump.current = true;
    setSpan((s) => ({ from: Math.min(s.from, todayYear), to: Math.max(s.to, todayYear + STEP) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpSignal]);
  useEffect(() => {
    if (!pendingJump.current) return;
    pendingJump.current = false;
    refs.current.get(todayYear)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  return (
    // MO1.6.1 (2x frame): 30 between a year's last row and the next heading
    // (Dec's last row 1467 → "2027" 1578 centre to centre).
    <div className="flex flex-col gap-[30px] pb-6">
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
                eventDays={eventDaySet}
                onOpen={() => onOpenMonth(y, m)}
              />
            ))}
          </div>
        </section>
      ))}
      <div ref={end} aria-hidden className="h-px" />
    </div>
  );
};
