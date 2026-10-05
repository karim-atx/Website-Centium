import { useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { useApp } from "../../context/AppContext";
import { AchievementDetailSheet } from "../../components/mind/AchievementDetailSheet";
import {
  toBadges,
  categoriesPresent,
  recentlyUnlocked,
  nextRungLabel,
  tierProgress,
  tierReached,
  earnedCount,
  CATEGORY_LABEL,
  type Badge,
  type AchievementCategory,
} from "../../services/achievements";

// The Achievements tab.
//
// EVERY NUMBER ON THIS SCREEN IS THE SERVER'S. The tier, the balance, the gap
// to the next tier and each badge's progress come from my_points_summary() and
// my_achievements(); the tier floors behind the pips come from point_tiers.
// Nothing is derived, estimated or held as a second copy here — the Explore
// hero used to do all three, and getting two answers to "what tier am I" is
// the reason this screen reads rather than computes.
//
// OPENING THIS TAB AWARDS. my_achievements() evaluates before it returns, so
// simply arriving here is one of the moments an unlock can fire; the sheet
// itself is rendered globally in Layout, because an unlock earned on the Food
// screen has to be celebrated on the Food screen.

/** A locked badge is greyed; an earned one keeps its colour. */
function BadgeTile({ badge, onOpen }: { badge: Badge; onOpen: () => void }) {
  const earned = badge.earned !== null;
  const { display } = badge;
  return (
    <button
      onClick={onOpen}
      className="tap flex flex-col items-center gap-1.5 rounded-[15px] px-2 py-3 text-center"
      style={{ background: earned ? "rgba(217,164,65,.13)" : "rgba(36,31,27,.04)" }}
    >
      <span
        className="text-[26px] leading-none"
        // GREYED, NOT HIDDEN. A locked badge is something to aim at, so it
        // shows its icon and its bar; the saturation is what says "not yet".
        style={{ filter: earned ? "none" : "grayscale(1)", opacity: earned ? 1 : 0.45 }}
      >
        {display.icon}
      </span>
      <span
        className="text-[10px] font-bold leading-[1.25] line-clamp-2"
        style={{ color: earned ? "rgb(var(--c-charcoal))" : "rgba(36,31,27,.45)" }}
      >
        {display.title}
      </span>

      {/* THE BAR ONLY APPEARS WHERE THERE IS SOMETHING LEFT TO DO. A finished
          badge shows what it was worth instead of a full bar, which says the
          same thing with less ink. */}
      {badge.next ? (
        <span className="w-full">
          <span className="block h-[3px] rounded-full bg-charcoal/[0.09] overflow-hidden">
            <span
              className="block h-full rounded-full bg-team-gold-deep"
              style={{ width: `${badge.progress * 100}%` }}
            />
          </span>
          <span className="mt-1 block text-[8.5px] font-semibold tabular-nums text-charcoal-faint">
            {Math.min(badge.rungs[0].currentValue, badge.next.threshold).toLocaleString()} /{" "}
            {badge.next.threshold.toLocaleString()}
          </span>
        </span>
      ) : (
        <span className="text-[8.5px] font-bold text-team-gold-ink/[0.82] dark:text-team-gold-ink">
          {badge.pointsEarned > 0 ? `+${badge.pointsEarned.toLocaleString()} pts` : "Earned"}
        </span>
      )}
    </button>
  );
}

export default function AchievementsTab() {
  const { achievements, pointsSummary, pointTiers, achievementsLoading, achievementsError } =
    useApp();
  const [category, setCategory] = useState<AchievementCategory | "all">("all");
  const [openBadge, setOpenBadge] = useState<Badge | null>(null);

  // Memoised because `achievements ?? []` is a new array on every render, and
  // everything below it is derived. Without this the whole grid recomputes on
  // each keystroke elsewhere in the tree.
  const rows = useMemo(() => achievements ?? [], [achievements]);
  const badges = useMemo(() => toBadges(rows), [rows]);
  const categories = useMemo(() => categoriesPresent(badges), [badges]);
  const recent = useMemo(() => recentlyUnlocked(rows, 3), [rows]);
  const counts = earnedCount(rows);
  const shown = category === "all" ? badges : badges.filter((b) => b.category === category);

  if (achievementsLoading && achievements === null) {
    return (
      <div className="animate-fade-slide-up">
        <Card className="text-center py-8">
          <p className="text-sm text-charcoal-faint">Loading…</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-slide-up">
      {/* A FAILED READ SAYS SO. "No achievements" and "the request failed"
          render identically, and only one of them is true. */}
      {achievementsError && (
        <p className="mb-3 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {achievementsError}
        </p>
      )}

      {/* ---- the tier card ------------------------------------------------ */}
      {pointsSummary && (
        <div
          className="relative overflow-hidden rounded-[22px] px-[17px] py-4 mb-[13px]"
          style={{ background: "var(--gradient-board)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-bold tracking-[.2em] uppercase text-white/[0.66]">
              {pointsSummary.tierName} tier
            </p>
            <span className="text-[9.5px] font-bold text-white bg-white/20 rounded-full px-[9px] py-1 whitespace-nowrap">
              {pointsSummary.nextTierName && pointsSummary.pointsToNextTier !== null
                ? `${pointsSummary.pointsToNextTier.toLocaleString()} to ${pointsSummary.nextTierName}`
                : "Highest tier"}
            </span>
          </div>

          <p className="mt-[10px] flex items-baseline gap-[5px]">
            <span className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-white tabular-nums">
              {pointsSummary.balance.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-white/[0.74]">pts</span>
            <span className="ml-auto text-[10px] font-semibold text-white/[0.74] tabular-nums">
              {counts.earned} of {counts.total}
            </span>
          </p>

          <div className="my-[11px]">
            <div className="h-[5px] rounded-full bg-white/[0.26] overflow-hidden">
              <div
                className="h-full rounded-full bg-white"
                style={{
                  width: `${tierProgress(pointsSummary) * 100}%`,
                  transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            </div>
          </div>

          {/* The five pips, from point_tiers rather than a list in this file. */}
          <div className="flex gap-1 pt-[11px] border-t border-white/[0.24]">
            {pointTiers.map((t) => {
              const reached = tierReached(t, pointsSummary);
              return (
                <div key={t.name} className="flex-1 flex flex-col items-center gap-1">
                  <span
                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center"
                    style={{ background: reached ? "rgba(255,255,255,.26)" : "rgba(255,255,255,.1)" }}
                  >
                    <span
                      className="w-[7px] h-[7px] rounded-full bg-white"
                      style={{ opacity: reached ? 1 : 0.4 }}
                    />
                  </span>
                  <span
                    className="text-[8px] font-extrabold text-white"
                    style={{ opacity: reached ? 1 : 0.55 }}
                  >
                    {t.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* SAID PLAINLY, BECAUSE IT IS TRUE AND THE ALTERNATIVE IS TO IMPLY
              OTHERWISE. Points are earned and a tier is real; there is nothing
              yet to spend them on, and no screen in this app should suggest
              there is. */}
          <p className="mt-[11px] text-[10px] leading-[1.4] text-white/[0.66]">
            Rewards for your points are coming soon.
          </p>
        </div>
      )}

      {/* ---- recently unlocked -------------------------------------------- */}
      {recent.length > 0 && (
        <div className="mb-[13px]">
          <p className="mb-[7px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42] dark:text-charcoal/[0.55]">
            Recently unlocked
          </p>
          <Card padded={false} className="divide-y divide-charcoal/[0.04]">
            {recent.map((a) => (
              <div key={a.key} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="text-[20px] leading-none">{a.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-charcoal truncate">{a.title}</p>
                  <p className="text-[10.5px] text-charcoal-soft truncate">{a.description}</p>
                </div>
                {a.points > 0 && (
                  <span className="text-[10px] font-extrabold text-team-gold-ink shrink-0 tabular-nums">
                    +{a.points.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ---- category chips ----------------------------------------------- */}
      {/* `scroll-row no-scrollbar`, never `overflow: hidden` — the latter
          strands the trailing chips. See the note in Chip.tsx. */}
      {categories.length > 0 && (
        <div className="flex gap-2 scroll-row no-scrollbar -mx-4 px-4 mb-[11px]">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {CATEGORY_LABEL[c]}
            </Chip>
          ))}
        </div>
      )}

      {/* ---- the badge grid ----------------------------------------------- */}
      {shown.length === 0 ? (
        <Card className="text-center py-7">
          <p className="text-sm font-semibold text-charcoal mb-1">Nothing here yet</p>
          <p className="text-[12.5px] text-charcoal-soft leading-relaxed px-4">
            {achievementsError
              ? "We couldn't load your achievements."
              : "Use the app and badges start appearing here."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-[7px]">
          {shown.map((b) => (
            <BadgeTile key={b.id} badge={b} onOpen={() => setOpenBadge(b)} />
          ))}
        </div>
      )}

      {/* The one line the grid cannot fit, for the badge that was tapped. */}
      <AchievementDetailSheet
        open={openBadge !== null}
        onClose={() => setOpenBadge(null)}
        badge={openBadge}
        nextLabel={openBadge ? nextRungLabel(openBadge) : null}
      />
    </div>
  );
}
