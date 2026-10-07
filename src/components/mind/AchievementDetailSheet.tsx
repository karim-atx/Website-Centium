import React from "react";
import clsx from "clsx";
import { CentredPopup } from "../ui/CentredPopup";
import { useIsDark } from "../../hooks/useIsDark";
import { Check, Lock } from "lucide-react";
import { LEVEL_LABEL, type Badge } from "../../services/achievements";

// One badge, every rung of it. Mobile v5.1 MO1.1.3.1: a centred popup over
// the page (tap outside or Escape closes), not a bottom sheet.
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
  const dark = useIsDark();
  if (!badge) return null;

  const current = badge.rungs[0].currentValue;
  const earned = badge.earned !== null;

  return (
    <CentredPopup
      open={open}
      onClose={onClose}
      title={badge.display.title}
      // MO1.1.3.1 #16: title 19/800, body 13/400, padded 0 28 (334 at 390),
      // and the medallion in a 76 pt tile (about r20; 314 to 466 at 2x)
      // holding a 61 pt disc (the emoji stands in until the set exists, A11).
      titleSize={19}
      bodyWeight={400}
      maxWidth={334}
      iconWell={{ size: 76, radius: 20 }}
      icon={
        <span className="w-[61px] h-[61px] rounded-full bg-cream-card border border-charcoal/[0.08] dark:border-charcoal/[0.12] flex items-center justify-center">
          <span
            className="text-[30px] leading-none"
            style={{ filter: earned ? "none" : "grayscale(1)", opacity: earned ? 1 : 0.45 }}
          >
            {badge.display.icon}
          </span>
        </span>
      }
      body={badge.display.description}
    >
      <div>
        <div className="flex flex-col items-center text-center pb-4">

          {/* WHAT IS LEFT, IN THE UNITS THE BADGE IS MEASURED IN. The gap to
              the next TIER is a different number and lives on the tier card;
              this one is about this ladder. */}
          {nextLabel && (
            <p className="text-[12px] font-bold text-team-gold-ink">{nextLabel}</p>
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
              <p className="mt-1.5 text-[11px] font-semibold tabular-nums text-charcoal-muted">
                {current.toLocaleString()} of {badge.next.threshold.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* ---- the rungs --------------------------------------------------- */}
        <p className="mb-[7px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42] dark:text-charcoal/[0.55]">
          {badge.rungs.length > 1 ? "Levels" : "Level"}
        </p>
        <div className="rounded-[14px] overflow-hidden divide-y divide-charcoal/[0.05] bg-cream-soft">
          {badge.rungs.map((r) => {
            const done = r.earnedAt !== null;
            return (
              <div key={r.key} className="flex items-center gap-3 px-3.5 py-2.5">
                {/* MO1.1.3.1: a 32 pt white rounded square (64 px, about r10 at
                    2x) with Lock 14/1.75; an earned rung keeps its gold tint. */}
                <span
                  className={clsx(
                    "w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0",
                    !done && "bg-cream-card"
                  )}
                  style={done ? { background: "rgba(217,164,65,.18)" } : undefined}
                >
                  {done ? (
                    <Check size={14} className="text-team-gold-deep" />
                  ) : (
                    <Lock size={14} strokeWidth={1.75} className="text-charcoal-faint" />
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
                    // Dark: a locked rung's points were the light ink at 35%, unreadable
                    // on the dark card; they take the muted text colour instead.
                    style={{ color: done ? "rgb(var(--c-gold-dark))" : dark ? "rgb(var(--c-charcoal-muted))" : "rgba(36,31,27,.35)" }}
                  >
                    +{r.points.toLocaleString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* Handover-complete pass: the "N points earned from this badge." line
            under the rungs is gone (not drawn); each earned rung shows its
            own points. */}
      </div>
    </CentredPopup>
  );
};
