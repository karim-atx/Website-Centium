import { linePx, textPx } from "../../../theme/textSize";
import { DAY_LETTERS } from "../../../utils/week";
import { minutesOfDay, time12 } from "../../../utils/time12";
import type { OpsColors } from "./opsTheme";
import { addDays, flagOf, hourLabel, isEnded, mondayOf, overlaps, shortDate, weekHours, type Issue, type Session } from "./scheduleModel";

// Week view (OP1-076, OpsTabsV4 template 199-215, logic 455-459): this
// Monday-to-Sunday week, 18 px an hour, blocks split side by side when they
// overlap, shading from the bottom for spots booked. The hour range grows past
// 7 AM to 9 PM when a session needs it (O1). Each day header is a 44 px button
// that opens the List at that day: the accessible route to every session (O3).

const PX = 18;
// "10 AM" at 9.5/700 needs about 26 of the 30 gutter (row 4): widened to 34.
const GUTTER = 34;

export function WeekGrid({
  c,
  sessions,
  today,
  now,
  issues,
  onOpen,
  onDay,
}: {
  c: OpsColors;
  sessions: Session[];
  today: string;
  now: Date;
  issues: Issue[];
  onOpen: (id: string) => void;
  onDay: (day: string) => void;
}) {
  const monday = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const inWeek = sessions.filter((s) => s.date >= days[0] && s.date <= days[6]);
  const { h0, h1 } = weekHours(inWeek);
  const height = (h1 - h0) * PX;
  const hours: number[] = [];
  for (let h = h0; h < h1; h += 3) hours.push(h);
  const mins = (t: string) => (minutesOfDay(t) ?? 0) / 60;

  return (
    <div style={{ marginTop: 12, background: c.card, borderRadius: 20, border: `1px solid ${c.border}`, padding: "10px 8px 10px 4px" }}>
      <div className="grid" style={{ gridTemplateColumns: `${GUTTER}px repeat(7, minmax(0, 1fr))`, columnGap: 3 }}>
        <span />
        {days.map((d, i) => {
          const isToday = d === today;
          const n = Number(d.slice(8));
          return (
            <button
              key={d}
              type="button"
              onClick={() => onDay(d)}
              aria-label={`${shortDate(d)}: show this day in the list`}
              className="tap text-center"
              style={{ paddingBottom: 6, minHeight: 44, color: isToday ? c.pDark : c.faint }}
            >
              <span className="block" style={{ fontSize: 10, fontWeight: 800 }}>
                {DAY_LETTERS[i]}
              </span>
              <span className="block" style={{ fontSize: 13, fontWeight: 800, lineHeight: "16px" }}>
                {n}
              </span>
            </button>
          );
        })}
      </div>
      <div className="relative grid" style={{ gridTemplateColumns: `${GUTTER}px repeat(7, minmax(0, 1fr))`, columnGap: 3, height }}>
        <div className="relative">
          {hours.map((h) => (
            <span
              key={h}
              className="absolute tabular-nums whitespace-nowrap"
              style={{ right: 4, top: (h - h0) * PX, transform: "translateY(-50%)", fontSize: 9.5, fontWeight: 700, color: c.faint }}
            >
              {hourLabel(h)}
            </span>
          ))}
        </div>
        {days.map((d) => {
          const items = inWeek.filter((s) => s.date === d);
          return (
            <div key={d} className="relative" style={{ background: d === today ? c.pale : c.weekBg, borderRadius: 8 }}>
              {items.map((s) => {
                const ov = items.filter((o) => overlaps(o, s));
                const idx = ov.findIndex((o) => o.id === s.id);
                const n = ov.length;
                const fill = s.maxCapacity ? Math.min(100, Math.round((s.booked / s.maxCapacity) * 100)) : 0;
                const flagged = !!flagOf(s, issues);
                const ended = isEnded(s, now);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onOpen(s.id)}
                    aria-label={`${s.title}, ${shortDate(d)} ${time12(s.startTime)}, ${s.booked} of ${s.maxCapacity} booked`}
                    className="absolute overflow-hidden"
                    style={{
                      top: (mins(s.startTime) - h0) * PX,
                      height: Math.max(10, (mins(s.endTime) - mins(s.startTime)) * PX - 2),
                      left: `${(idx * 100) / n}%`,
                      width: `calc(${100 / n}% - ${n > 1 ? 1 : 0}px)`,
                      borderRadius: 6,
                      background: c.blockBg,
                      borderLeft: `2.5px solid ${c.primary}`,
                      opacity: ended ? 0.6 : 1,
                      outline: c.hc ? `1px solid ${c.primary}` : undefined,
                    }}
                  >
                    <span aria-hidden className="absolute left-0 bottom-0 w-full" style={{ height: `${fill}%`, background: c.primary, opacity: 0.28 }} />
                    {flagged && <span aria-hidden className="absolute" style={{ top: 2, right: 2, width: 6, height: 6, borderRadius: 999, background: c.high }} />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap" style={{ gap: 12, padding: `10px 8px 0 ${GUTTER}px`, fontSize: textPx(10.5), lineHeight: linePx(14), color: c.faint }}>
        <span className="flex items-center" style={{ gap: 5 }}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: c.primary }} />
          Class
        </span>
        <span className="flex items-center" style={{ gap: 5 }}>
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: c.high }} />
          Needs attention
        </span>
        <span>Shading is spots booked</span>
      </div>
    </div>
  );
}
