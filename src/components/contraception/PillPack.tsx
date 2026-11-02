import React from "react";
import { packDays, type ContraceptionEvent, type ContraceptionPlan } from "../../services/contraception";
import * as G from "../../services/contraception/guidance";
import { linePx, textPx } from "../../theme/textSize";
import { getLanguage, t } from "../../i18n/core";

// The pack, day by day (HE1.10.b.2 #12-#16).
//
// THE PACK DAY COMES FROM my_contraception_status(), which computes it on the
// user's own date via cycle_today(). NOTHING HERE COUNTS IT A SECOND TIME:
// when the function has not answered, no day is marked as today rather than a
// different reckoning being substituted for it.
//
// A LOGGED DAY IS FILLED, AN UNLOGGED ONE IS NOT, and a missed one is marked
// differently from a taken one. There is no "you are 3 days behind" summary:
// counting somebody's misses back at them is not what this is for.
//
// v6: 7 columns, days 24 r9999 9.5/14.3 700, rows 32 apart. Logged (taken or
// late) #9A8CD6 white (dark #A991FE / #0D0B1A); today #F0EDF9 with a 1.6
// #241F1B ring and #5F5093 ink (dark #303141 / #F5F3FA / #C3B3FB); an
// unlogged active day the primary tint with primary-deep ink (2x PNG); break
// #F5F5F6 #8C8378 (dark #242730 / #B8B3C7); missed keeps the repo's red ring.
// A day up to today can be tapped to log or change it (S2); a selected past
// day carries the same ring as today. Future days are not tappable.

export const PillPack: React.FC<{
  plan: ContraceptionPlan;
  /** The user's local date, the same one events are logged under. */
  today: string;
  /** my_contraception_status().pack_day, or null when it is not on that date. */
  packDay: number | null;
  events: ContraceptionEvent[];
  /** The day the Today section logs (S2). */
  selected?: string;
  onSelectDay?: (date: string) => void;
}> = ({ plan, today, packDay, events, selected, onSelectDay }) => {
  if (!plan.packStartDate || plan.activeDays == null || plan.breakDays == null) return null;
  const pack = packDays({ packStartDate: plan.packStartDate, activeDays: plan.activeDays, breakDays: plan.breakDays }, today);
  if (!pack) return null;

  const byDate = new Map(events.map((e) => [e.occurredOn, e.event]));

  return (
    <>
      <div className="grid" role="grid" aria-label={G.PACK_TITLE} style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))", rowGap: 8 }}>
        {pack.days.map((d) => {
          const logged = byDate.get(d.date);
          const taken = logged === "pill_taken" || logged === "pill_late";
          const missed = logged === "pill_missed";
          const isToday = packDay !== null && d.day === packDay;
          const isSelected = selected !== undefined && selected !== today && d.date === selected;
          const ringed = (isToday && (selected === undefined || selected === today)) || isSelected;
          const future = d.date > today;
          const active = d.phase === "active";
          const bg = taken ? "rgb(var(--c-fill-pinned))" : ringed || active ? "rgb(var(--c-primary-pale))" : "rgb(var(--c-cream-soft))";
          const ink = taken
            ? "rgb(var(--c-on-primary-fill))"
            : missed
              ? "rgb(var(--c-status-high))"
              : ringed || active
                ? "rgb(var(--c-primary-deep-text))"
                : "rgb(var(--c-charcoal-faint))";
          const label = [t("Day {n}", { n: d.day }), active ? G.PACK_ACTIVE : G.PACK_BREAK, logged ? G.EVENT_LABEL[logged] : null, isToday ? t("today") : null]
            .filter(Boolean)
            .join(getLanguage() === "ar" ? "، " : ", ");
          return (
            <span key={d.day} className="flex justify-center" role="gridcell">
              <button
                type="button"
                disabled={future || !onSelectDay}
                onClick={() => onSelectDay?.(d.date)}
                aria-label={label}
                aria-pressed={isSelected || undefined}
                data-pack-day={d.day}
                className="tap grid place-items-center rounded-full disabled:cursor-default"
                style={{
                  width: 24,
                  height: 24,
                  background: bg,
                  color: ink,
                  boxShadow: ringed ? "inset 0 0 0 1.6px rgb(var(--c-charcoal))" : missed ? "inset 0 0 0 1.5px rgb(var(--c-status-high))" : undefined,
                  fontSize: textPx(9.5),
                  lineHeight: linePx(14.3),
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {d.day}
              </button>
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center" style={{ gap: 14, marginTop: 10 }}>
        <Legend swatch={<span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgb(var(--c-primary-pale))" }} />} label={G.PACK_ACTIVE} />
        <Legend swatch={<span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgb(var(--c-cream-soft))" }} />} label={G.PACK_BREAK} />
        <Legend swatch={<span className="w-2.5 h-2.5 rounded-full" style={{ boxShadow: "inset 0 0 0 1.5px rgb(var(--c-status-high))" }} />} label={G.EVENT_LABEL.pill_missed} />
      </div>
    </>
  );
};

const Legend: React.FC<{ swatch: React.ReactNode; label: string }> = ({ swatch, label }) => (
  <span className="inline-flex items-center text-charcoal-soft" style={{ gap: 6, fontSize: textPx(10), lineHeight: linePx(15), fontWeight: 600 }}>
    {swatch}
    {label}
  </span>
);
