import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, CalendarPlus, Info, MessageCircle, TriangleAlert } from "lucide-react";
import { fetchAvailability, fetchBooked, type AvailabilityWindow, type ClassSession } from "../../services/business-team/team";
import { hourLabel12, minutesOfDay, range12, time12 } from "../../utils/time12";
import { shiftDate } from "../../utils/date";
import { clashOf, dayDate, weekRange } from "./teamLogic";
import { t, tk } from "../../i18n/core";
import { appLocale } from "../../i18n/format";

// OP1-134 / 136 / 137 / 138 / 139: the Availability card (OpsTabsV4 template
// 266-289, logic 532-544). Hours 06:00-22:00 at 16 px per hour, a 12-hour
// viewport (192), offset in whole hours 0-4, default 1 (07:00). The source
// has no gesture handler, so the drag is a native scroller with a 16 px snap
// (OP1-137 G4): momentum, chaining and keyboard scrolling come with it.
// Availability is the weekly pattern in instructor_availability (B6);
// teaching blocks are this person's classes that week.

const AH0 = 6;
const AH1 = 22;
const APX = 16;

const yOf = (hhmm: string) => {
  const m = minutesOfDay(hhmm) ?? AH0 * 60;
  return ((Math.min(Math.max(m, AH0 * 60), AH1 * 60) - AH0 * 60) / 60) * APX;
};

type Sel = { kind: "cls"; id: string } | { kind: "free"; day: number; i: number } | null;

/** "Oct 5" for a yyyy-mm-dd date, in the app's language. */
const monthDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric" });

/** "Oct 5 to Oct 11" (OP1-134 #2). */
const weekSpan = (from: string, to: string) => t("{from} to {to}", { from: monthDay(from), to: monthDay(to) });

/** The day column's letter ("M"), in the app's language. */
const dayLetter = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(appLocale("en-US"), { weekday: "narrow" });

/** The free-slot suggestion by part of the day. */
const goodSlot = (hhmm: string) => {
  const m = minutesOfDay(hhmm) ?? 0;
  return m < 12 * 60
    ? t("Nothing booked. A good slot for an extra morning class.")
    : m < 17 * 60
      ? t("Nothing booked. A good slot for an extra afternoon class.")
      : t("Nothing booked. A good slot for an extra evening class.");
};

const WEEK_TABS = [tk("This week"), tk("Next week")];

export function AvailabilityCard({
  businessId,
  professionalId,
  firstName,
  sessions,
  today,
  onAsk,
  askBusy,
}: {
  businessId: string;
  professionalId: string;
  firstName: string;
  sessions: ClassSession[];
  today: string;
  onAsk: () => void;
  askBusy?: boolean;
}) {
  const [windows, setWindows] = useState<AvailabilityWindow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [week, setWeek] = useState(0);
  const [sel, setSel] = useState<Sel>(null);
  const [offset, setOffset] = useState(1);
  const [booked, setBooked] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const vpRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAvailability(businessId, professionalId).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setWindows(r.value);
        setError(null);
      } else setError(r.message);
    });
    return () => {
      cancelled = true;
    };
  }, [businessId, professionalId, tick]);

  const range = weekRange(today, week);
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(range.from, i));
  const mine = useMemo(
    () => sessions.filter((s) => s.professionalId === professionalId && s.date >= range.from && s.date <= range.to),
    [sessions, professionalId, range.from, range.to]
  );
  const selCls = sel?.kind === "cls" ? mine.find((s) => s.id === sel.id) ?? null : null;
  const selFree = sel?.kind === "free" ? (windows ?? []).filter((w) => w.weekday === sel.day + 1)[sel.i] ?? null : null;

  useEffect(() => {
    setBooked(null);
    if (!selCls) return;
    let cancelled = false;
    void fetchBooked(selCls.id, selCls.capacity).then((b) => !cancelled && setBooked(b));
    return () => {
      cancelled = true;
    };
  }, [selCls]);

  // First open: offset 1 (07:00), the source default (OP1-137 O2).
  useEffect(() => {
    if (vpRef.current) vpRef.current.scrollTop = APX;
  }, [windows]);

  const onScroll = () => {
    const el = vpRef.current;
    if (el) setOffset(Math.round(el.scrollTop / APX));
  };
  const onKey = (e: React.KeyboardEvent) => {
    const el = vpRef.current;
    if (!el) return;
    const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : e.key === "PageDown" ? 4 : e.key === "PageUp" ? -4 : 0;
    if (!step) return;
    e.preventDefault();
    el.scrollTop = Math.min(4, Math.max(0, Math.round(el.scrollTop / APX) + step)) * APX;
  };

  const empty = windows !== null && windows.length === 0;
  const start = AH0 + offset;
  const rangeText = `${t("{from} to {to}", { from: hourLabel12(start), to: hourLabel12(start + 12) })} · ${offset === 0 ? t("drag for later") : offset === 4 ? t("drag for earlier") : t("drag for more")}`;
  const sub = empty ? t("Usual weekly hours") : `${week ? t("Next week") : t("This week")} · ${weekSpan(range.from, range.to)}`;

  let selT = t("Tap a class or a free slot to see details.");
  let selS = "";
  let selIcon = <Info size={16} strokeWidth={2.1} style={{ color: "var(--tm-faint)" }} />;
  if (selCls) {
    const clash = clashOf(selCls, mine);
    selT = `${dayDate(selCls.date)} · ${selCls.title}${t(", ")}${range12(selCls.start, selCls.end)}`;
    selS =
      (booked === null ? "" : t("{booked} of {capacity} booked", { booked, capacity: selCls.capacity })) +
      (clash ? `${booked === null ? "" : " · "}${t("clashes with {title} at {time}", { title: clash.title, time: time12(clash.start) })}` : "");
    selIcon = clash ? (
      <TriangleAlert size={16} strokeWidth={2.1} style={{ color: "var(--tm-high)" }} />
    ) : (
      <CalendarClock size={16} strokeWidth={2.1} style={{ color: "var(--tm-pdark)" }} />
    );
  } else if (selFree && sel?.kind === "free") {
    const busy = mine.some((s) => s.date === days[sel.day] && s.start < selFree.end && selFree.start < s.end);
    selT = `${dayDate(days[sel.day])} · ${t("free {time}", { time: range12(selFree.start, selFree.end) })}`;
    selS = busy ? t("Part of this slot already has a class.") : goodSlot(selFree.start);
    selIcon = <CalendarPlus size={16} strokeWidth={2.1} style={{ color: "var(--tm-teal)" }} />;
  }

  return (
    <section className="tm-dcard" aria-label={t("Availability")}>
      <div className="tm-av-h">
        <div>
          <p className="tm-av-title">{t("Availability")}</p>
          <p className="tm-row-s">{sub}</p>
        </div>
        {!empty && windows !== null && (
          <div className="tm-wtabs" role="tablist" aria-label={t("Week")}>
            {WEEK_TABS.map((label, i) => (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={week === i}
                className="tm-wtab tm-hit"
                onClick={() => {
                  setWeek(i);
                  setSel(null);
                }}
              >
                {t(label)}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="tm-avempty">
          <p className="tm-avempty-b" style={{ color: "var(--tm-high)" }}>
            {error}
          </p>
          <button type="button" className="tm-retry tap" onClick={() => setTick((n) => n + 1)}>
            {t("Retry")}
          </button>
        </div>
      )}
      {!error && windows === null && (
        <p className="tm-avempty-b" style={{ padding: "18px 16px", textAlign: "center" }}>
          {t("Loading availability…")}
        </p>
      )}

      {empty && (
        <div className="tm-avempty">
          <span className="tm-avempty-tile">
            <CalendarClock size={20} />
          </span>
          <p className="tm-avempty-t">{t("No availability set")}</p>
          <p className="tm-avempty-b">{t("{name} hasn't added their usual hours yet. Ask them in Messages.", { name: firstName })}</p>
          <button type="button" className="tm-ask tm-hit tap" disabled={askBusy} onClick={onAsk}>
            <MessageCircle size={15} />
            {t("Ask {name}", { name: firstName })}
          </button>
        </div>
      )}

      {!error && windows && windows.length > 0 && (
        <>
          <div className="tm-days">
            <span />
            {days.map((d) => (
              <div key={d} className={d === today ? "today" : undefined}>
                <p>{dayLetter(d)}</p>
                <p>{Number(d.slice(8))}</p>
              </div>
            ))}
          </div>
          <div
            ref={vpRef}
            className="tm-vp"
            tabIndex={0}
            role="group"
            aria-label={t("Week grid, showing {from} to {to}", { from: hourLabel12(start), to: hourLabel12(start + 12) })}
            onScroll={onScroll}
            onKeyDown={onKey}
          >
            <div className="tm-vp-in">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className="tm-snap" style={{ top: i * APX }} aria-hidden />
              ))}
              <div className="tm-hours" aria-hidden>
                {[6, 9, 12, 15, 18, 21].map((h) => (
                  <span key={h} style={{ top: (h - AH0) * APX }}>
                    {hourLabel12(h)}
                  </span>
                ))}
              </div>
              {days.map((d, col) => {
                const free = (windows ?? []).filter((w) => w.weekday === col + 1);
                const cls = mine.filter((s) => s.date === d);
                return (
                  <div key={d} className="tm-col">
                    {free.map((w, j) => {
                      const y = yOf(w.start);
                      const h = yOf(w.end) - y;
                      if (h <= 0) return null;
                      const on = sel?.kind === "free" && sel.day === col && sel.i === j;
                      return (
                        <button
                          key={`f${j}`}
                          type="button"
                          className={on ? "tm-free sel" : "tm-free"}
                          style={{ top: y, height: h }}
                          aria-label={t("Available {time}", { time: range12(w.start, w.end) })}
                          aria-pressed={on}
                          onClick={() => setSel(on ? null : { kind: "free", day: col, i: j })}
                        />
                      );
                    })}
                    {cls.map((s) => {
                      const y = yOf(s.start);
                      const h = Math.max(8, yOf(s.end) - y - 1);
                      // Overlapping classes split the column (OP1-134 #10 OURS).
                      const group = cls.filter((o) => o.start < s.end && s.start < o.end);
                      const idx = group.indexOf(s);
                      const n = group.length;
                      const on = sel?.kind === "cls" && sel.id === s.id;
                      const clash = n > 1 && idx > 0;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className={["tm-cls", on ? "sel" : "", clash ? "clash" : ""].filter(Boolean).join(" ")}
                          style={{ top: y, height: h, insetInlineStart: `calc(${(idx / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)` }}
                          aria-label={`${s.title} ${time12(s.start)}`}
                          aria-pressed={on}
                          onClick={() => setSel(on ? null : { kind: "cls", id: s.id })}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="tm-vp-fade" aria-hidden />
          </div>
          <div className="tm-legend">
            <span>
              <span className="tm-sw-free" />
              {t("Available")}
            </span>
            <span>
              <span className="tm-sw-cls" />
              {t("Teaching")}
            </span>
            <span>{t("Blank is not available")}</span>
            <span className="range" aria-live="polite">
              {rangeText}
            </span>
          </div>
          <div className="tm-selbox" aria-live="polite">
            <span>{selIcon}</span>
            <div>
              <p className="tm-selbox-t">{selT}</p>
              {selS && <p className="tm-selbox-s">{selS}</p>}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
