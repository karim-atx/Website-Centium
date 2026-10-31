import React from "react";
import { ChevronRight } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { builderMoveTargets } from "../../../services/programmes/model";
import { builderMoveHint, dayCount, fullLabel, moveToTitle, weekdayName } from "../../../services/programmes/copy";

/**
 * Round F (DW3): the builder's "Move to…", the keyboard and screen-reader
 * route for dragging a workout card by its grip. The other six days of the
 * week shown, each with its workouts; a day with four is full (ATXP3). The
 * workout goes last on the day picked (move_programme_day_session).
 */
export const BuilderMoveSheet: React.FC<{
  open: boolean;
  workoutName: string;
  week: string[][] | undefined;
  fromDay: number;
  busy: boolean;
  onClose: () => void;
  onPick: (day: number) => void;
}> = ({ open, workoutName, week, fromDay, busy, onClose, onPick }) => (
  <BottomSheet open={open} onClose={onClose} title={moveToTitle(workoutName)}>
    <div className="space-y-3 animate-fade-slide-up">
      <p style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.45 }}>{builderMoveHint()}</p>
      <div className="flex flex-col" style={{ gap: 6 }}>
        {builderMoveTargets(week, fromDay).map((d) => (
          <button
            key={d.day}
            type="button"
            disabled={busy || d.full}
            onClick={() => onPick(d.day)}
            className="tap w-full flex items-center justify-between text-start disabled:opacity-50"
            style={{ minHeight: 48, borderRadius: 12, background: INK.soft, padding: "0 12px", gap: 10 }}
          >
            <span className="flex-1 min-w-0">
              <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 600, color: INK.ch }}>
                {weekdayName(d.day)}
              </span>
              <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF }}>
                {d.full ? fullLabel() : dayCount(d.count)}
              </span>
            </span>
            <ChevronRight size={15} strokeWidth={2} aria-hidden style={{ color: INK.chT }} className="rtl:-scale-x-100" />
          </button>
        ))}
      </div>
    </div>
  </BottomSheet>
);
