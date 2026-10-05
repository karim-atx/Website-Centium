import React from "react";
import { LotusGlyph } from "../dashboard/LotusGlyph";
import { formatMeditationTime, isEmptySummary, type MeditationSummary } from "../../services/meditation/logic";

/**
 * The meditation log's numbers, for the Mind tile and the Home widget.
 *
 * REAL NUMBERS OR NONE. Before the first read (or if it failed) the tile
 * stays a way in, with no figure; with nothing logged today, this week or in
 * a streak, it says so in words that are true whether the person has never
 * meditated or just not since last week (the summary has no all-time count).
 *
 * NO GOAL. Nobody has set a meditation target, so nothing here is a
 * percentage of one, and no ring fills towards one.
 *
 * "THIS WEEK" MEANS MONDAY TO TODAY, the calendar week the database counts,
 * so it resets on Monday; it is never called "last 7 days". And the streak is
 * labelled as the meditation streak: it counts today as soon as there is a
 * session, so it can be one ahead of the Logging streak, which is updated
 * overnight.
 */

/** Small tile: today's time, or the honest empty state. */
export const MeditationSmall: React.FC<{ summary: MeditationSummary | null }> = ({ summary }) => {
  if (!summary || isEmptySummary(summary)) {
    return (
      <span className="flex flex-col items-center gap-2">
        <LotusGlyph size={40} stroke="rgb(var(--c-teal-dark))" />
        <span className="text-[9px] font-bold text-team-teal-ink/[0.72] dark:text-team-teal-ink">
          {summary ? "No sessions this week" : "Start a session"}
        </span>
      </span>
    );
  }
  return (
    <span className="flex flex-col items-center gap-[7px]">
      <LotusGlyph size={30} stroke="rgb(var(--c-teal-dark))" />
      <span className="flex flex-col items-center leading-none">
        <span className="text-[20px] font-extrabold tracking-[-0.04em] text-charcoal tabular-nums">
          {formatMeditationTime(summary.secondsToday)}
        </span>
        <span className="mt-1 text-[8.5px] font-bold text-team-teal-ink/[0.82] dark:text-team-teal-ink">today</span>
      </span>
    </span>
  );
};

/** Large widget: today, this week and the streak, or the empty state. */
export const MeditationLarge: React.FC<{ summary: MeditationSummary | null }> = ({ summary }) => {
  const empty = !summary || isEmptySummary(summary);
  return (
    <div className="flex-1 flex items-center gap-4 min-h-0 mt-[9px]">
      <LotusGlyph size={66} stroke="rgb(var(--c-teal-dark))" />
      <div className="flex-1 min-w-0">
        {empty ? (
          <>
            <p className="text-[15px] font-extrabold leading-tight tracking-[-0.02em] text-charcoal">
              {summary ? "No sessions this week yet" : "Breathing, stretching & yoga"}
            </p>
            <p className="mt-[7px] text-[10px] leading-snug text-team-teal-ink/[0.72] dark:text-team-teal-ink">
              {summary
                ? "A breathing session from Mind is saved when you stop it."
                : "Breathing sessions you finish are saved and totalled here."}
            </p>
          </>
        ) : (
          <>
            <p className="text-[15px] font-extrabold leading-tight tracking-[-0.02em] text-charcoal tabular-nums">
              {formatMeditationTime(summary.secondsToday)} today
            </p>
            <p className="mt-[5px] text-[10px] leading-snug text-team-teal-ink tabular-nums">
              {formatMeditationTime(summary.secondsThisWeek)} this week · {summary.sessionsThisWeek}{" "}
              {summary.sessionsThisWeek === 1 ? "session" : "sessions"}
            </p>
            <p className="mt-[3px] text-[10px] leading-snug text-team-teal-ink/[0.72] dark:text-team-teal-ink tabular-nums">
              {summary.streakDays > 0
                ? `Meditation streak: ${summary.streakDays} ${summary.streakDays === 1 ? "day" : "days"}`
                : "No meditation streak yet"}
            </p>
          </>
        )}
      </div>
    </div>
  );
};
