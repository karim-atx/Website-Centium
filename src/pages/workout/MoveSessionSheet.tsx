import React, { useState } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { Button } from "../../components/ui/Button";
import { textPx } from "../../theme/textSize";
import { moveTargets, type ScheduleRow } from "../../services/programmes/model";
import {
  dayCount,
  fullLabel,
  moveDayLabel,
  moveToDay,
  movingLabel,
  noFreeDay,
  plannedDayLabel,
  weekdayAndDate,
  weekdayName,
  whichDay,
  whichWorkout,
} from "../../services/programmes/copy";
import { coachColor } from "./coachColors";

/**
 * Round F (DW3, Karim F16): "Move to another day" for a member's programme
 * session, as a day picker (OURS, in the week view's style). The days are
 * the other days of the session's own week, today or later, within the
 * programme (ATXP2); a day with four is full (ATXP3); the planned day is
 * marked (moving back to it clears the move). A day with more than one
 * session asks which workout first. The parent keys it per opening.
 */
export const MoveSessionSheet: React.FC<{
  open: boolean;
  /** The day's sessions that can still move. */
  sessions: ScheduleRow[];
  rows: ScheduleRow[];
  today: string;
  assignment: { startsOn: string; endsOn: string };
  dark: boolean;
  busy: boolean;
  onClose: () => void;
  onMove: (session: ScheduleRow, toDate: string) => void;
}> = ({ open, sessions, rows, today, assignment, dark, busy, onClose, onMove }) => {
  const [pick, setPick] = useState(0);
  const [to, setTo] = useState<string | null>(null);
  const session = sessions[pick] ?? sessions[0] ?? null;
  const targets = session ? moveTargets(session, rows, today, assignment) : [];
  const chosen = targets.find((d) => d.date === to && !d.full) ?? null;
  const caps = "text-[9.5px] leading-[14.3px] font-bold tracking-[1.9px] uppercase";

  return (
    <BottomSheet open={open} onClose={onClose} title={moveDayLabel()}>
      <div className="space-y-3 animate-fade-slide-up">
        {sessions.length > 1 && (
          <>
            <p className={caps} style={{ color: coachColor("faint", dark) }}>
              {whichWorkout()}
            </p>
            <div className="flex flex-wrap" style={{ gap: 6 }} role="radiogroup" aria-label={whichWorkout()}>
              {sessions.map((s, i) => {
                const on = i === pick;
                return (
                  <button
                    key={`${s.onDate}-${s.position}-${s.workoutTemplateId}`}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setPick(i);
                      setTo(null);
                    }}
                    className={`tap ${on ? "bg-primary-fill text-on-primary-fill" : "bg-cream-card text-charcoal-soft border border-charcoal/[0.11]"}`}
                    style={{ borderRadius: 9999, padding: "7px 13px", fontSize: textPx(12), fontWeight: on ? 700 : 600 }}
                  >
                    {s.workoutName}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <p className={caps} style={{ color: coachColor("faint", dark) }}>
          {whichDay()}
        </p>
        {targets.length === 0 ? (
          <p style={{ fontSize: textPx(12.5), color: coachColor("faint", dark) }}>{noFreeDay()}</p>
        ) : (
          <div className="flex flex-col" style={{ gap: 6 }} role="radiogroup" aria-label={whichDay()}>
            {targets.map((d) => {
              const on = chosen?.date === d.date;
              return (
                <button
                  key={d.date}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={d.full}
                  onClick={() => setTo(d.date)}
                  className="tap w-full flex items-center text-start disabled:opacity-50"
                  style={{
                    gap: 10,
                    minHeight: 48,
                    borderRadius: 12,
                    padding: "0 12px",
                    background: on ? coachColor("pale", dark) : coachColor("soft", dark),
                    border: `1.5px solid ${on ? coachColor("deep", dark) : "transparent"}`,
                  }}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>
                      {weekdayAndDate(d.date)}
                    </span>
                    <span className="block" style={{ fontSize: textPx(11.5), color: coachColor("faint", dark) }}>
                      {[d.full ? fullLabel() : dayCount(d.count), d.planned ? plannedDayLabel() : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {on && <Check size={16} strokeWidth={2.6} aria-hidden style={{ color: coachColor("deep", dark) }} />}
                </button>
              );
            })}
          </div>
        )}
        <Button fullWidth size="lg" disabled={busy || !session || !chosen} onClick={() => session && chosen && onMove(session, chosen.date)}>
          {busy ? movingLabel() : chosen ? moveToDay(weekdayName(chosen.day)) : moveDayLabel()}
        </Button>
      </div>
    </BottomSheet>
  );
};
