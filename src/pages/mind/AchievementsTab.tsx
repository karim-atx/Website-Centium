import { useMemo, useState } from "react";
import clsx from "clsx";
import { Card } from "../../components/ui/Card";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { AchievementDetailSheet } from "../../components/mind/AchievementDetailSheet";
import { TIER_ICON, colourSet, tierHex } from "../../components/mind/achievementStyle";
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

// The Achievements page, mobile v5.1 MO1.1.3 (/app/mind/achievements).
//
// EVERY NUMBER ON THIS SCREEN IS THE SERVER'S. The tier, the balance, the gap
// to the next tier and each badge's progress come from my_points_summary() and
// my_achievements(); the tier floors behind the rail come from point_tiers
// (A9: the database's values, not the board's sample ones). Nothing is
// derived, estimated or held as a second copy here.
//
// OPENING THIS PAGE AWARDS. my_achievements() evaluates before it returns, so
// simply arriving here is one of the moments an unlock can fire; the pill
// itself is rendered globally in Layout, because an unlock earned on the Food
// screen has to be celebrated on the Food screen.
//
// THE HERO TAKES THE CURRENT TIER'S COLOUR (A10). Badges keep their emoji
// until the medallion set exists (A11), inside a round medallion. The badge
// cards and the recently-unlocked points keep their old light colours.

// MO1.1.3 #3 "Recently unlocked": the handover's 10.5/700 label (decision 20;
// tracking measured on the 2x frame at about 0.1em). The label existed before
// the redesign, so it keeps its light colour (decisions 20 and 22).
const sectionLabel = "text-[10.5px] font-bold tracking-[.1em] uppercase text-charcoal/[0.42] dark:text-charcoal/[0.55]";

/** A badge's emoji in a round medallion; greyed when locked. */
function Medallion({ icon, earned, size }: { icon: string; earned: boolean; size: number }) {
  return (
    <span
      className="rounded-full flex items-center justify-center shrink-0 bg-cream-card border border-charcoal/[0.08] dark:border-charcoal/[0.12]"
      style={{ width: size, height: size }}
    >
      <span
        className="leading-none"
        // GREYED, NOT HIDDEN. A locked badge is something to aim at, so it
        // shows its icon and its bar; the saturation is what says "not yet".
        style={{
          fontSize: Math.round(size * 0.5),
          filter: earned ? "none" : "grayscale(1)",
          opacity: earned ? 1 : 0.45,
        }}
      >
        {icon}
      </span>
    </span>
  );
}

/** MO1.1.3 #5–15: one badge card. */
function BadgeTile({ badge, onOpen }: { badge: Badge; onOpen: () => void }) {
  const earned = badge.earned !== null;
  const { display } = badge;
  return (
    <button
      onClick={onOpen}
      className="tap flex flex-col items-center gap-2 rounded-2xl px-2 pt-3.5 pb-3 text-center min-h-[124px]"
      style={{ background: earned ? "rgba(217,164,65,.13)" : "rgba(36,31,27,.04)" }}
    >
      <Medallion icon={display.icon} earned={earned} size={44} />
      <span
        className={`text-[11.5px] font-bold leading-[1.25] line-clamp-2 ${earned ? "text-charcoal" : "text-charcoal/50 dark:text-charcoal/60"}`}
      >
        {display.title}
      </span>

      {/* THE BAR ONLY APPEARS WHERE THERE IS SOMETHING LEFT TO DO. A finished
          badge shows what it was worth instead of a full bar. */}
      {badge.next ? (
        <span className="w-full mt-auto">
          <span className="block h-[3px] rounded-full bg-charcoal/[0.09] overflow-hidden">
            <span className="block h-full rounded-full bg-team-gold-deep" style={{ width: `${badge.progress * 100}%` }} />
          </span>
          <span className="mt-1 block text-[9.5px] font-semibold tabular-nums text-charcoal-faint">
            {Math.min(badge.rungs[0].currentValue, badge.next.threshold).toLocaleString()} /{" "}
            {badge.next.threshold.toLocaleString()}
          </span>
        </span>
      ) : (
        <span className="mt-auto text-[10px] font-bold text-team-gold-ink/[0.82] dark:text-team-gold-ink">
          {badge.pointsEarned > 0 ? `+${badge.pointsEarned.toLocaleString()} pts` : "Earned"}
        </span>
      )}
    </button>
  );
}

export default function AchievementsTab() {
  const { achievements, pointsSummary, pointTiers, achievementsLoading, achievementsError } = useApp();
  const dark = useIsDark();
  const [category, setCategory] = useState<AchievementCategory | "all">("all");
  const [openBadge, setOpenBadge] = useState<Badge | null>(null);

  // Memoised because `achievements ?? []` is a new array on every render, and
  // everything below it is derived.
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

  const tier = pointsSummary ? colourSet(tierHex(pointsSummary.tierName), dark) : null;

  return (
    <div className="animate-fade-slide-up">
      {/* A FAILED READ SAYS SO. "No achievements" and "the request failed"
          render identically, and only one of them is true. */}
      {achievementsError && (
        <p className="mb-3 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {achievementsError}
        </p>
      )}

      {/* ---- MO1.1.3 #2: the tier card, in the current tier's colour ------- */}
      {pointsSummary && tier && (
        <div
          // MO1.1.3 #2, 254 tall on the 2x frame. Measured there: the count
          // 3 pt under the tier label; "13 of 59" / "earned" bottom-aligned
          // with the balance (their baselines 18 apart); tier names 3 pt under
          // the discs; the rule 12 under the floors; and 12 pt under the
          // rewards line (the spec's 16 assumes a tighter line height).
          className="rounded-[22px] px-[18px] pt-[18px] pb-3 mb-[22px] border"
          style={{ background: tier.fill, borderColor: tier.border }}
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold tracking-[.16em] uppercase" style={{ color: tier.ink }}>
                {pointsSummary.tierName} tier
              </p>
              <p className="mt-[3px] flex items-baseline gap-1.5">
                <span className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-charcoal tabular-nums">
                  {pointsSummary.balance.toLocaleString()}
                </span>
                <span className="text-[12px] font-semibold text-charcoal-muted">pts</span>
              </p>
            </div>
            <div className="text-right">
              <p className="tabular-nums leading-[17px]">
                <span className="text-[17px] font-extrabold text-charcoal">{counts.earned}</span>
                <span className="text-[12px] font-semibold text-charcoal-muted"> of {counts.total}</span>
              </p>
              <p className="mt-0.5 text-[12px] font-semibold text-charcoal-muted">earned</p>
            </div>
          </div>

          <div className="mt-4 flex items-baseline justify-between gap-3">
            <p className="text-[12px] font-semibold text-charcoal">
              {pointsSummary.nextTierName && pointsSummary.pointsToNextTier !== null
                ? `${pointsSummary.pointsToNextTier.toLocaleString()} to ${pointsSummary.nextTierName}`
                : "Highest tier"}
            </p>
            {pointsSummary.nextTierMinPoints !== null && (
              <p className="text-[11px] font-semibold text-charcoal-muted tabular-nums">
                {pointsSummary.balance.toLocaleString()} / {pointsSummary.nextTierMinPoints.toLocaleString()}
              </p>
            )}
          </div>
          <div className="mt-2 h-[6px] rounded-full overflow-hidden" style={{ background: tier.track }}>
            <div
              className="h-full rounded-full"
              style={{
                background: tier.solid,
                width: `${tierProgress(pointsSummary) * 100}%`,
                transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          </div>

          {/* The tier rail, from point_tiers rather than a list in this file. */}
          {/* MO1.1.3 #2 (measured on the 2x frame): a neutral 2 pt line,
              charcoal 8% (234,230,227 on #FBF7F4), through the 31 pt discs'
              centres, and a solid stub in the tier colour from the current
              disc toward the next one, as far as the points have come. */}
          <div className="relative flex mt-[18px]">
            <span aria-hidden className="absolute left-[10%] right-[10%] top-[14.5px] h-[2px] bg-charcoal/[0.08]" />
            {(() => {
              const i = pointTiers.findIndex((t) => t.name === pointsSummary.tierName);
              if (i < 0 || i >= pointTiers.length - 1) return null;
              const step = 100 / pointTiers.length;
              return (
                <span
                  aria-hidden
                  className="absolute top-[14.5px] h-[2px]"
                  style={{
                    left: `${step * (i + 0.5)}%`,
                    width: `${step * tierProgress(pointsSummary)}%`,
                    background: tier.solid,
                  }}
                />
              );
            })()}
            {pointTiers.map((t) => {
              const reached = tierReached(t, pointsSummary);
              const current = t.name === pointsSummary.tierName;
              const own = colourSet(tierHex(t.name), dark);
              const Icon = TIER_ICON[t.name] ?? TIER_ICON.Bronze;
              return (
                <div key={t.name} className="relative flex-1 flex flex-col items-center">
                  <span
                    className="relative w-[31px] h-[31px] rounded-full flex items-center justify-center border-[1.5px]"
                    style={{
                      background: current ? own.solid : "rgb(var(--c-cream-card))",
                      borderColor: reached ? own.solid : own.border,
                      boxShadow: current ? `0 0 0 4px ${own.track}` : undefined,
                    }}
                  >
                    <Icon size={14} strokeWidth={1.75} style={{ color: current ? own.onSolid : own.ink }} />
                  </span>
                  <span
                    // Only the current tier's name is bold, in its colour (MO1.1.3).
                    className={clsx("mt-[3px] text-[11px]", current ? "font-bold" : "font-normal")}
                    style={{ color: current ? own.ink : "rgb(var(--c-charcoal-muted))" }}
                  >
                    {t.name}
                  </span>
                  <span className="text-[10px] text-charcoal-muted tabular-nums">{t.minPoints.toLocaleString()}</span>
                </div>
              );
            })}
          </div>

          {/* SAID PLAINLY, BECAUSE IT IS TRUE AND THE ALTERNATIVE IS TO IMPLY
              OTHERWISE. Points are earned and a tier is real; there is nothing
              yet to spend them on (A13). */}
          <p className="mt-3 pt-3 border-t text-[12px] text-charcoal-muted" style={{ borderColor: tier.border }}>
            Rewards for your points are coming soon.
          </p>
        </div>
      )}

      {/* ---- MO1.1.3 #3: recently unlocked -------------------------------- */}
      {recent.length > 0 && (
        <div className="mb-[22px]">
          <p className={`mb-2 px-1 ${sectionLabel}`}>Recently unlocked</p>
          {/* The dividers are inset to the text column, after the 40 pt
              medallion (MO1.1.3 #3). */}
          <Card padded={false} className="px-3.5">
            {recent.map((a, i) => (
              <div key={a.key} className="flex items-center gap-3">
                <span className="flex py-3 shrink-0">
                  <Medallion icon={a.icon} earned size={40} />
                </span>
                <div
                  className={clsx(
                    "min-w-0 flex-1 self-stretch flex items-center gap-3",
                    i > 0 && "border-t border-charcoal/[0.06]"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold text-charcoal truncate">{a.title}</p>
                    <p className="text-[11.5px] text-charcoal-muted truncate">{a.description}</p>
                  </div>
                  {a.points > 0 && (
                    <span className="text-[12px] font-extrabold text-team-gold-ink shrink-0 tabular-nums">
                      +{a.points.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ---- MO1.1.3 #4: the category strip (filters, A13) ---------------- */}
      {categories.length > 0 && (
        <SegmentedTabs
          scroll
          className="-mr-4 mb-3"
          // MO1.1.3 #4 (2x frame): a 52 pt track, 40 pt tabs at their
          // natural width (12 each side: "All" 40), 8 apart. The strip is new
          // since the redesign, so it takes the handover's colours (decision
          // 22): active #A79AD5 / white, idle #F5F4FE / #5B5349.
          trackStyle={{ borderRadius: "16px 0 0 16px", gap: 8 }}
          tabHeight={40}
          scrollTabPadding="0 12px"
          scrollMinWidth={0}
          idleInk="rgb(var(--c-charcoal-soft))"
          items={[{ key: "all", label: "All" }, ...categories.map((c) => ({ key: c, label: CATEGORY_LABEL[c] }))]}
          activeKey={category}
          onChange={(k) => setCategory(k as AchievementCategory | "all")}
        />
      )}

      {/* ---- MO1.1.3 #5–15: the badge grid -------------------------------- */}
      {shown.length === 0 ? (
        <Card className="text-center py-7">
          <p className="text-sm font-semibold text-charcoal mb-1">Nothing here yet</p>
          <p className="text-[12.5px] text-charcoal-soft leading-relaxed px-4">
            {achievementsError ? "We couldn't load your achievements." : "Use the app and badges start appearing here."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {shown.map((b) => (
            <BadgeTile key={b.id} badge={b} onOpen={() => setOpenBadge(b)} />
          ))}
        </div>
      )}

      {/* MO1.1.3.1: the badge that was tapped, as a centred popup. */}
      <AchievementDetailSheet
        open={openBadge !== null}
        onClose={() => setOpenBadge(null)}
        badge={openBadge}
        nextLabel={openBadge ? nextRungLabel(openBadge) : null}
      />
    </div>
  );
}
