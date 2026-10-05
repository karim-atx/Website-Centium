import React from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Check, Lock } from "lucide-react";
import { LEVEL_LABEL, type Badge } from "../../services/achievements";

// One badge, every rung of it.
//
// THE GRID SHOWS THE RUNG BEING CHASED; THIS SHOWS THE WHOLE LADDER, which is
// the only place the shape of a group is visible. A one-off is a ladder with
// one rung — the catalogue models it that way deliberately, so this screen has
// no special case for it either.
//
// A RUNG'S LEVEL IS A LABEL, NOT THE ORDERING. Rungs are listed by threshold,
// because the logging-streak ladder has seven of them and carries no level at
// all; where a level exists it is shown beside the title, and where it does
// not, nothing is invented to fill the space.

function formatEarnedAt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const AchievementDetailSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  badge: Badge | null;
  /** "130 more to reach Silver", or null once the ladder is finished. */
  nextLabel: string | null;
}> = ({ open, onClose, badge, nextLabel }) => {
  if (!badge) return null;

  const current = badge.rungs[0].currentValue;
  const earned = badge.earned !== null;

  return (
    <BottomSheet open={open} onClose={onClose} title={badge.display.title}>
      <div className="pb-2">
        <div className="flex flex-col items-center text-center pb-4">
          <span
            className="text-[46px] leading-none mb-2"
            style={{ filter: earned ? "none" : "grayscale(1)", opacity: earned ? 1 : 0.45 }}
          >
            {badge.display.icon}
          </span>
          <p className="text-[15px] font-bold text-charcoal">{badge.display.title}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-charcoal-soft px-4">
            {badge.display.description}
          </p>

          {/* WHAT IS LEFT, IN THE UNITS THE BADGE IS MEASURED IN. The gap to
              the next TIER is a different number and lives on the tier card;
              this one is about this ladder. */}
          {nextLabel && (
            <p className="mt-2.5 text-[11px] font-bold text-team-gold-ink">{nextLabel}</p>
          )}

          {badge.next && (
            <div className="w-full mt-3">
              <div className="h-[5px] rounded-full bg-charcoal/[0.09] overflow-hidden">
                <div
                  className="h-full rounded-full bg-team-gold-deep"
                  style={{
                    width: `${badge.progress * 100}%`,
                    transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
              </div>
              <p className="mt-1.5 text-[10.5px] font-semibold tabular-nums text-charcoal-faint">
                {current.toLocaleString()} of {badge.next.threshold.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* ---- the rungs --------------------------------------------------- */}
        <p className="mb-[7px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42] dark:text-charcoal/[0.55]">
          {badge.rungs.length > 1 ? "Levels" : "Level"}
        </p>
        <div className="rounded-[15px] overflow-hidden divide-y divide-charcoal/[0.05] bg-cream-card">
          {badge.rungs.map((r) => {
            const done = r.earnedAt !== null;
            return (
              <div key={r.key} className="flex items-center gap-3 px-3.5 py-2.5">
                <span
                  className="w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0"
                  style={{ background: done ? "rgba(217,164,65,.18)" : "rgba(36,31,27,.05)" }}
                >
                  {done ? (
                    <Check size={13} className="text-team-gold-deep" />
                  ) : (
                    <Lock size={11} className="text-charcoal-faint" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-charcoal truncate">
                    {r.title}
                    {r.level && (
                      <span className="ml-1.5 text-[10px] font-semibold text-charcoal-faint">
                        {LEVEL_LABEL[r.level]}
                      </span>
                    )}
                  </p>
                  <p className="text-[10.5px] text-charcoal-soft">
                    {/* EARNED SHOWS WHEN, NOT WHAT IS LEFT. A streak that has
                        since broken keeps its date beside a progress bar that
                        has honestly gone down — the pairing is deliberate. */}
                    {done
                      ? `Earned ${formatEarnedAt(r.earnedAt!)}`
                      : `${r.threshold.toLocaleString()} needed`}
                  </p>
                </div>
                {/* An explorer rung is worth zero points on purpose: it is
                    self-reported, and self-reporting may unlock a badge but may
                    never move a balance. Showing "+0 pts" would be noise, so
                    the column is simply empty for them. */}
                {r.points > 0 && (
                  <span
                    className="text-[10px] font-extrabold shrink-0 tabular-nums"
                    style={{ color: done ? "rgb(var(--c-gold-dark))" : "rgba(36,31,27,.35)" }}
                  >
                    +{r.points.toLocaleString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {badge.pointsEarned > 0 && (
          <p className="mt-2.5 text-[11px] font-semibold text-charcoal-soft text-center">
            {badge.pointsEarned.toLocaleString()} points earned from this badge.
          </p>
        )}
      </div>
    </BottomSheet>
  );
};
