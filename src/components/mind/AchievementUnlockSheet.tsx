import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { BottomSheet } from "../ui/BottomSheet";
import { Confetti } from "../workout/Confetti";
import { useApp } from "../../context/AppContext";
import { LEVEL_LABEL } from "../../services/achievements";

// The unlock moment.
//
// RENDERED IN Layout, NOT IN Mind. An achievement is earned wherever the thing
// that earned it happened — a finished workout, a saved food log, a journal
// entry — and the celebration belongs on that screen rather than waiting until
// somebody next visits the Mind tab.
//
// ONE AT A TIME, IN ORDER. Finishing a first workout can earn first_workout,
// a rung of the workouts ladder and a streak rung in a single evaluation, so
// the context holds a queue and this shows its front. Dismissing pops it and
// the next slides in.
//
// IT CANNOT FIRE TWICE FOR THE SAME BADGE. my_achievements() sets
// newly_earned only on rows that call actually inserted, and user_achievements'
// primary key means exactly one call ever inserts a given badge. The context
// keeps a second guard for a response processed twice.

export const AchievementUnlockSheet: React.FC = () => {
  const { unlockQueue, dismissUnlock } = useApp();
  const achievement = unlockQueue[0] ?? null;
  const [burst, setBurst] = useState(0);

  // RESPECT prefers-reduced-motion, AND KEEP RESPECTING IT. Initialised from
  // the query rather than set in an effect, so the first paint is already
  // correct; the listener is for somebody changing the system setting
  // mid-session, who should get the answer they just chose.
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // A NEW NONCE PER BADGE, so the confetti remounts and replays between two
  // unlocks shown back to back rather than staying finished from the first.
  const key = achievement?.key ?? null;
  useEffect(() => {
    if (key !== null) setBurst((n) => n + 1);
  }, [key]);

  if (!achievement) return null;

  return (
    <>
      {!reducedMotion && <Confetti key={burst} onDone={() => undefined} />}
      <BottomSheet open onClose={dismissUnlock} hideHeader>
        <div className="flex flex-col items-center text-center py-5">
          <p className="text-[9px] font-bold tracking-[.2em] uppercase text-team-gold-ink/[0.72]">
            Achievement unlocked
          </p>

          {/* The one piece of motion the sheet itself owns, so it goes when
              the confetti does. */}
          <span
            className={clsx("text-[58px] leading-none my-3", !reducedMotion && "animate-badge-pop")}
          >
            {achievement.icon}
          </span>

          <p className="text-[17px] font-extrabold tracking-[-0.02em] text-charcoal">
            {achievement.title}
            {achievement.level && (
              <span className="ml-1.5 text-[12px] font-semibold text-charcoal-faint">
                {LEVEL_LABEL[achievement.level]}
              </span>
            )}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-charcoal-soft px-6">
            {achievement.description}
          </p>

          {/* AN EXPLORER BADGE IS WORTH ZERO, AND SAYS NOTHING RATHER THAN
              "+0 points". Those eight are self-reported through
              feature_milestones, and self-reporting may unlock a badge but may
              never move a balance — so there is no number to show. */}
          {achievement.points > 0 && (
            <p className="mt-3 text-[13px] font-extrabold text-team-gold-deep tabular-nums">
              +{achievement.points.toLocaleString()} points
            </p>
          )}

          <button
            onClick={dismissUnlock}
            className="tap mt-5 w-full rounded-full bg-primary py-3 text-[13px] font-bold text-white"
          >
            {unlockQueue.length > 1 ? `Next (${unlockQueue.length - 1} more)` : "Nice"}
          </button>
        </div>
      </BottomSheet>
    </>
  );
};
