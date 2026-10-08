import React from "react";
import { CentredPopup } from "../ui/CentredPopup";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { Check, Lock } from "lucide-react";
import { LEVEL_LABEL, type Badge } from "../../services/achievements";
import { AchievementTile } from "./AchievementIcon";
import { formatEarnedAt, keyInk } from "./achievementStyle";

// One badge, every rung of it. v6 MO1.1.3.1: a centred popup over the page
// (tap outside, Escape or a swipe down closes; no ×, K1 / S1 / S2), on the
// Part B card geometry (X-01: r24, no shadow in dark, no scrim blur) at the
// frame's own 334 wide and padding 26 20 18.
//
// THE GRID SHOWS THE RUNG BEING CHASED; THIS SHOWS THE WHOLE LADDER (K2),
// which is the only place the shape of a group is visible. A one-off is a
// ladder with one rung, so this screen has no special case for it.
//
// A RUNG'S LEVEL IS A LABEL, NOT THE ORDERING (K4, K5). Rungs are listed by
// threshold, because the logging-streak ladder has seven of them and carries
// no level at all.

export const AchievementDetailSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  badge: Badge | null;
  /** "130 more to reach Silver", or null once the ladder is finished. */
  nextLabel: string | null;
}> = ({ open, onClose, badge, nextLabel }) => {
  const dark = useIsDark();
  const hc = !!useApp().accessibility.highContrast;
  if (!badge) return null;

  const current = badge.rungs[0].currentValue;
  const earned = badge.earned !== null;
  const art = badge.display;

  return (
    <CentredPopup
      open={open}
      onClose={onClose}
      title={art.title}
      geometry="partB"
      maxWidth={334}
      className="pt-[26px] pb-[18px]"
      // #58: 19 / 24 800 ls -0.4, 14 under the tile.
      titleClass="text-[19px] leading-[24px] tracking-[-0.4px]"
      bodyWeight={400}
      describeBody
      swipeToClose
      iconBare
      icon={
        // #54-#57: the 76 r23 tile in the key's tint, the 65 medallion, and
        // the 25 lock pill (Lock 14) at 47.5, 47.5 when locked.
        <span className="relative flex">
          <AchievementTile
            achievementKey={art.key}
            emoji={art.icon}
            tile={76}
            radius={23}
            icon={65}
            locked={!earned}
            lock={{ size: 25, icon: 14, offset: 47.5 }}
          />
          {!earned && <span className="sr-only">Locked</span>}
        </span>
      }
      body={
        // #59a / #59b: 13 / 19 400 #5B5349, and the next-rung line in the
        // same style 6 under it (O6: the table over the PNG's gold).
        <>
          <span className="block leading-[19px]">{art.description}</span>
          {nextLabel && <span className="block mt-1.5 leading-[19px]">{nextLabel}</span>}
        </>
      }
    >
      <div>
        {/* #60-#61: the track 6, #241F1B@7% (30% under High contrast), the
            fill team gold (0 of 1 draws none; kept), "a of b" 11 / 16.5. */}
        {badge.next && (
          <div className="pt-px mb-4">
            <div
              className="h-[6px] rounded-full overflow-hidden"
              style={{ background: hc ? "var(--hair-08)" : "rgb(var(--c-charcoal) / 0.07)" }}
            >
              <div
                className="h-full rounded-full bg-team-gold-deep"
                style={{
                  width: `${badge.progress * 100}%`,
                  transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-[16.5px] font-semibold tabular-nums text-charcoal-faint">
              {current.toLocaleString()} of {badge.next.threshold.toLocaleString()}
            </p>
          </div>
        )}

        {/* #62: 10 / 14 700 ls 1.4 uppercase #8C8378, inset 2, 8 above the list. */}
        <p className="mx-0.5 mb-2 text-[10px] leading-[14px] font-bold tracking-[1.4px] uppercase text-charcoal-faint">
          {badge.rungs.length > 1 ? "Levels" : "Level"}
        </p>
        {/* #63: r14, #F7F6FA / #262932; rows padding 10 12. */}
        <div className="rounded-[14px] overflow-hidden divide-y divide-charcoal/[0.05] bg-[#F7F6FA] dark:bg-[#262932]">
          {badge.rungs.map((r) => {
            const done = r.earnedAt !== null;
            return (
              <div key={r.key} className="flex items-center gap-3 px-3 py-2.5">
                {/* #64-#65: a 32 r10 white tile with Lock 14; K3: an earned
                    rung shows a Check 14 in the key's ink. */}
                <span className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 bg-cream-card">
                  {done ? (
                    <Check size={14} strokeWidth={2} style={{ color: keyInk(r.key, dark) }} />
                  ) : (
                    <Lock size={14} strokeWidth={1.75} className="text-charcoal-faint" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-[18px] font-bold text-charcoal truncate">
                    {r.title}
                    {r.level && (
                      <span className="ml-1.5 text-[11px] leading-[15px] font-normal text-charcoal-faint">
                        {LEVEL_LABEL[r.level]}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] leading-[15px] text-charcoal-faint">
                    {/* EARNED SHOWS WHEN, NOT WHAT IS LEFT. A streak that has
                        since broken keeps its date beside a bar that has
                        honestly gone down. */}
                    {done ? `Earned ${formatEarnedAt(r.earnedAt!)}` : `${r.threshold.toLocaleString()} needed`}
                  </p>
                </div>
                {/* #68: 12 / 18 800; locked #8C8378 / #B8B3C7, earned the
                    key's ink. An explorer rung is worth zero on purpose
                    (self-reported), and says so. */}
                <span
                  className="shrink-0 max-w-[104px] text-right text-[12px] leading-[18px] font-extrabold tabular-nums"
                  style={{ color: done ? keyInk(r.key, dark) : "rgb(var(--c-charcoal-faint))" }}
                >
                  {r.points > 0 ? `+${r.points.toLocaleString()}` : "No points, just bragging rights"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </CentredPopup>
  );
};
