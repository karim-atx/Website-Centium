import React from "react";
import { packDays, type ContraceptionEvent, type ContraceptionPlan } from "../../services/contraception";
import * as G from "../../services/contraception/guidance";

// The pack, day by day.
//
// THE PACK DAY COMES FROM my_contraception_status(), which since
// Database-Atraxia 20260925010000 computes it on the user's own date via
// cycle_today(). NOTHING HERE COUNTS IT A SECOND TIME: when the function has
// not answered, no day is marked as today rather than a different reckoning
// being substituted for it.
//
// It matters here more than anywhere, because this grid shows two things at
// once: which day is today, and which days have been logged. Logged days are
// stored under the user's own date, so mixing clocks used to put the "today"
// ring on one square and the pill on the next one along.
//
// A LOGGED DAY IS FILLED, AN UNLOGGED ONE IS NOT, and a missed one is marked
// differently from a taken one. There is no "you are 3 days behind" summary:
// counting somebody's misses back at them is not what this is for.

const ACTIVE = "#9C8BC9";
const BREAK_BG = "rgba(156,139,201,0.14)";
const MISSED = "rgb(var(--c-status-high))";

export const PillPack: React.FC<{
  plan: ContraceptionPlan;
  /** The user's local date, the same one events are logged under. */
  today: string;
  /** my_contraception_status().pack_day, or null when it is not on that date. */
  packDay: number | null;
  events: ContraceptionEvent[];
}> = ({ plan, today, packDay, events }) => {
  if (!plan.packStartDate || plan.activeDays == null || plan.breakDays == null) return null;
  const pack = packDays(
    {
      packStartDate: plan.packStartDate,
      activeDays: plan.activeDays,
      breakDays: plan.breakDays,
    },
    today
  );
  if (!pack) return null;

  const byDate = new Map(events.map((e) => [e.occurredOn, e.event]));

  return (
    <>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {pack.days.map((d) => {
          const logged = byDate.get(d.date);
          const taken = logged === "pill_taken" || logged === "pill_late";
          const missed = logged === "pill_missed";
          const isToday = packDay !== null && d.day === packDay;
          return (
            <div
              key={d.day}
              title={`Day ${d.day} · ${d.phase === "active" ? G.PACK_ACTIVE : G.PACK_BREAK}`}
              className="aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold tabular-nums"
              style={{
                background: taken ? ACTIVE : d.phase === "active" ? BREAK_BG : "transparent",
                border:
                  d.phase === "break"
                    ? "1px dashed rgba(36,31,27,0.22)"
                    : missed
                      ? `1.5px solid ${MISSED}`
                      : "1.5px solid transparent",
                color: taken ? "#fff" : missed ? MISSED : "rgb(var(--c-charcoal-soft))",
                outline: isToday ? "2px solid rgb(var(--c-charcoal))" : undefined,
                outlineOffset: isToday ? 1 : undefined,
              }}
            >
              {d.day}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mt-2.5">
        <Legend swatch={<span className="w-3 h-3 rounded" style={{ background: ACTIVE }} />} label={G.PACK_ACTIVE} />
        <Legend
          swatch={
            <span
              className="w-3 h-3 rounded"
              style={{ border: "1px dashed rgba(36,31,27,0.35)" }}
            />
          }
          label={G.PACK_BREAK}
        />
        <Legend
          swatch={<span className="w-3 h-3 rounded" style={{ border: `1.5px solid ${MISSED}` }} />}
          label={G.EVENT_LABEL.pill_missed}
        />
      </div>
    </>
  );
};

const Legend: React.FC<{ swatch: React.ReactNode; label: string }> = ({ swatch, label }) => (
  <span className="inline-flex items-center gap-1.5 text-[10px] text-charcoal-faint">
    {swatch}
    {label}
  </span>
);
