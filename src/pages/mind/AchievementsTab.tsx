import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Trophy } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { MindHeader } from "../../components/mind/MindHeader";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { useOnline } from "../../hooks/useOnline";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useHideNumbers } from "../../hooks/useHideNumbers";
import { AchievementDetailSheet } from "../../components/mind/AchievementDetailSheet";
import { AchievementTile } from "../../components/mind/AchievementIcon";
import { keyInk, tierCardColours, tierHex, tierIcon } from "../../components/mind/achievementStyle";
import { tierRank } from "../../theme/marketTokens";
import {
  toBadges,
  categoriesPresent,
  recentlyUnlocked,
  nextRungLabel,
  tierProgress,
  tierReached,
  earnedCount,
  visibleAchievements,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type Badge,
  type AchievementCategory,
} from "../../services/achievements";
import { appLocale } from "../../i18n/format";
import { t } from "../../i18n/core";

// The Achievements page, v6 MO1.1.3 (/app/mind/achievements).
//
// EVERY NUMBER ON THIS SCREEN IS THE SERVER'S (K1, V6-76). The tier, the
// balance, the gap to the next tier and each badge's progress come from
// my_points_summary() and my_achievements(); the tier floors behind the rail
// come from point_tiers (0 / 1,000 / 3,000 / 7,500 / 15,000 locally, not the
// board's sample 0 / 1k / 2.5k / 5k / 10k). Nothing is derived or held as a
// second copy here.
//
// OPENING THIS PAGE AWARDS (K2). my_achievements() evaluates before it
// returns; the pill itself is rendered globally in Layout (K13).
//
// A TWO-STEP FIXED AREA (S6). The header pins first (MindHeader, the shared
// FixedHeader); the tier card and Recently unlocked scroll away under it; the
// category tabs then pin under the header in their own sticky wrapper (#38).
// The hairline sits under the header until the tabs pin, then under the tabs.

/** The 7% / 8% / 5% washes and hairlines go to 30% of ink under High contrast (O-7). */
const hair = (hc: boolean, alpha: number) => (hc ? "var(--hair-08)" : `rgb(var(--c-charcoal) / ${alpha})`);

/** MO1.1.3 #41-#52: one badge card. */
function BadgeTile({ badge, onOpen, hc }: { badge: Badge; onOpen: () => void; hc: boolean }) {
  const earned = badge.earned !== null;
  const { display } = badge;
  return (
    // #41: white, 0.5 px #241F1B@8% (X-09), r16, padding 14 8 12, gap 8.
    <button
      onClick={onOpen}
      className="tap flex flex-col items-center gap-2 rounded-2xl px-2 pt-3.5 pb-3 text-center bg-cream-card border-[0.5px] border-hair-08"
    >
      {/* #42-#49: the medallion on its 44 r13 tile; locked = greyed icon on
          the neutral locked tile, with the 14 lock pill at 29, 29. */}
      <AchievementTile
        achievementKey={display.key}
        emoji={display.icon}
        tile={44}
        radius={13}
        icon={38}
        locked={!earned}
        lockedTile
        lock={{ size: 14, icon: 8, offset: 29 }}
      />
      <span
        className={clsx(
          "text-[11.5px] font-bold leading-[14.4px] line-clamp-2",
          earned || hc ? "text-charcoal" : "text-charcoal/50"
        )}
      >
        {display.title}
        {!earned && <span className="sr-only">{t(", Locked")}</span>}
      </span>

      {/* THE BAR ONLY APPEARS WHERE THERE IS SOMETHING LEFT TO DO. A finished
          badge shows what it was worth instead (K9: a ladder's banked sum). */}
      {badge.next ? (
        <span className="w-full">
          <span className="block h-[3px] rounded-full overflow-hidden" style={{ background: hair(hc, 0.08) }}>
            <span className="block h-full rounded-full bg-team-gold-deep" style={{ width: `${badge.progress * 100}%` }} />
          </span>
          <span className="mt-[5px] block text-[9.5px] leading-[14.3px] font-semibold tabular-nums text-charcoal-faint">
            <bdi dir="ltr">
              {Math.min(badge.rungs[0].currentValue, badge.next.threshold).toLocaleString(appLocale())} /{" "}
              {badge.next.threshold.toLocaleString(appLocale())}
            </bdi>
          </span>
        </span>
      ) : (
        <span className="text-[11.5px] leading-[14.4px] font-bold text-charcoal line-clamp-2">
          {badge.pointsEarned > 0 ? t("+{n} pts", { n: badge.pointsEarned.toLocaleString(appLocale()) }) : t("No points, just bragging rights")}
        </span>
      )}
    </button>
  );
}

/** O-2 / O-3: the banner under the fixed area. Cached content stays under it. */
function Banner({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="mb-3 flex items-center gap-3 rounded-xl p-3 bg-[#FBE7E4] text-[#C0392B] dark:bg-[#3C2A30] dark:text-[#F09A8E]"
    >
      <p className="flex-1 min-w-0 text-[12px] font-semibold">{text}</p>
      {onRetry && (
        <button onClick={onRetry} className="tap shrink-0 -my-3 -me-3 px-3 min-h-11 text-[12px] font-bold">
          {t("Retry")}
        </button>
      )}
    </div>
  );
}

/**
 * #38 / S6: the step-2 sticky wrapper. It sticks 10 above the header's bottom
 * (its 10 px of fill above the track mask content scrolling under it, the
 * table's same-colour 9.86 border with m -10) and paints over the header's
 * hairline; its own hairline fades in once it is pinned.
 */
function PinnedTabs({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pinned, setPinned] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const top = parseFloat(getComputedStyle(el).top) || 0;
      setPinned(el.getBoundingClientRect().top <= top + 0.5);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div
      ref={ref}
      data-pinned={pinned ? "true" : "false"}
      className="sticky z-[21] -mx-4 px-4 pb-3 pt-2.5 -mt-2.5 bg-cream"
      style={{ top: "calc(var(--fixed-header-bottom, 134px) - 10px)" }}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 border-b border-hair-08 dark:border-hair-10 pointer-events-none"
        style={{ opacity: pinned ? 1 : 0, transition: reduced ? "none" : "opacity 120ms ease" }}
      />
      {children}
    </div>
  );
}

export default function AchievementsTab() {
  const {
    achievements,
    pointsSummary,
    pointTiers,
    achievementsLoading,
    achievementsError,
    refreshAchievements,
    accessibility,
  } = useApp();
  const dark = useIsDark();
  const online = useOnline();
  const hc = !!accessibility.highContrast;
  const reduced = useReducedMotion();
  const [category, setCategory] = useState<AchievementCategory | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();

  // Memoised because `achievements ?? []` is a new array on every render, and
  // everything below it is derived.
  // Recovery-sensitive mode (AJ R8, D20): the streak and logging badges are
  // left out of everything below (grid, tabs, Recent, the earned count, a
  // ?badge= link); the rest stay.
  const hideNumbers = useHideNumbers();
  const rows = useMemo(() => visibleAchievements(achievements ?? [], hideNumbers), [achievements, hideNumbers]);
  const badges = useMemo(() => toBadges(rows), [rows]);
  const categories = useMemo(() => categoriesPresent(badges), [badges]);
  const recent = useMemo(() => recentlyUnlocked(rows, 3), [rows]);
  const counts = earnedCount(rows);
  const shown = category === "all" ? badges : badges.filter((b) => b.category === category);
  const openBadge = openId ? badges.find((b) => b.id === openId) ?? null : null;
  /** The badge holding an achievement key (a rung of a ladder opens its ladder). */
  const badgeOf = (key: string) => badges.find((b) => b.rungs.some((r) => r.key === key)) ?? null;

  // MO1.1.3.1 O-2 / MO1.1.3.2 S1: `?badge=<key>` (the unlock pill) opens that
  // badge's detail once the list has loaded, then leaves the URL clean.
  const linked = achievements === null ? null : params.get("badge");
  const [handled, setHandled] = useState<string | null>(null);
  if (linked && linked !== handled) {
    // Adjusting state while rendering (not in an effect): once per link.
    setHandled(linked);
    const b = badgeOf(linked);
    if (b) setOpenId(b.id);
  } else if (!params.get("badge") && handled !== null) {
    setHandled(null);
  }
  useEffect(() => {
    if (!linked) return;
    const next = new URLSearchParams(params);
    next.delete("badge");
    setParams(next, { replace: true });
  }, [linked, params, setParams]);

  const tabItems = [
    { key: "all", label: t("All") },
    ...(achievements === null ? CATEGORY_ORDER.filter((c) => !(hideNumbers && c === "consistency")) : categories).map((c) => ({ key: c, label: t(CATEGORY_LABEL[c]) })),
  ];
  const tabs = (
    <PinnedTabs>
      <SegmentedTabs
        scroll
        className="-me-4"
        // #39-#40: a 52 track (pad 6), r16 0 0 16 running off the right
        // edge; tabs 40 tall, padding 0 14, gap 5, r12, 12.5/700; active
        // #A79AD5 / white (dark #A991FE / #0D0B1A, V6-02), idle #F5F4FE /
        // #5B5349; dark track and idle #303141 (darkTone partB).
        trackStyle={{ borderRadius: "16px 0 0 16px", gap: 5 }}
        tabHeight={40}
        scrollTabPadding="0 14px"
        scrollMinWidth={0}
        darkTone="partB"
        idleInk="rgb(var(--c-charcoal-soft))"
        items={tabItems}
        activeKey={category}
        onChange={(k) => setCategory(k as AchievementCategory | "all")}
      />
    </PinnedTabs>
  );

  const banner = !online ? (
    <Banner text={t("You're offline. Showing your last saved achievements.")} />
  ) : achievementsError ? (
    <Banner text={t(achievementsError || "Couldn't load. Check your connection.")} onRetry={refreshAchievements} />
  ) : null;

  // O-1 Loading: the header and the tabs at once, then three 96 tall r22
  // blocks in surface.soft, pulsing 1.2 s (static under Reduce motion, X-32).
  // achievements === null with no error is the first read still in flight
  // (achievementsLoading alone is never raised by the context).
  if (achievements === null && (achievementsLoading || !achievementsError)) {
    return (
      <div className="animate-fade-slide-up" aria-busy="true">
        <MindHeader section="achievements" paddingBottom={20} />
        {tabs}
        {banner}
        <span className="sr-only" role="status">{t("Loading your achievements…")}</span>
        <div aria-hidden className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-[22px] bg-cream-soft animate-skeleton-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const tier = pointsSummary ? tierCardColours(tierHex(tierRank(pointTiers, pointsSummary.tierName)), dark) : null;

  return (
    <div className="animate-fade-slide-up">
      <MindHeader section="achievements" paddingBottom={20} />
      {/* ---- #6-#19: the tier card, in the current tier's colour ---------- */}
      {pointsSummary && tier && (
        <div
          className="rounded-[22px] px-[18px] pt-[18px] pb-4 mb-[22px] border-[0.5px]"
          style={{ background: tier.fill, borderColor: tier.border }}
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] leading-[14px] font-extrabold tracking-[1.4px] uppercase" style={{ color: tier.ink }}>
                {t("{tier} tier", { tier: pointsSummary.tierName })}
              </p>
              <p className="mt-1 flex items-baseline gap-[5px]">
                <span className="text-[30px] font-extrabold leading-[30px] tracking-[-1.2px] text-charcoal tabular-nums">
                  {pointsSummary.balance.toLocaleString(appLocale())}
                </span>
                <span className="text-[12px] leading-[18px] font-semibold text-charcoal-faint">{t("pts")}</span>
              </p>
            </div>
            {/* Only once the list has loaded: a failed read is not "0 of 0". */}
            {achievements !== null && (
              <div className="text-end">
                <p className="tabular-nums leading-[22px]">
                  <span className="text-[17px] font-extrabold text-charcoal">{counts.earned}</span>
                  <span className="text-[12px] font-semibold text-charcoal-faint"> {t("of {n}", { n: counts.total })}</span>
                </p>
                <p className="text-[10.5px] leading-[14px] font-normal text-charcoal-faint">{t("earned")}</p>
              </div>
            )}
          </div>

          {/* #12 / K4: "N to Silver" (or "Highest tier") and "a / b". */}
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <p className="text-[11.5px] leading-[17.3px] font-bold text-charcoal">
              {pointsSummary.nextTierName && pointsSummary.pointsToNextTier !== null
                ? t("{n} to {tier}", { n: pointsSummary.pointsToNextTier.toLocaleString(appLocale()), tier: pointsSummary.nextTierName })
                : t("Highest tier")}
            </p>
            {pointsSummary.nextTierMinPoints !== null && (
              <p className="text-[11.5px] leading-[17.3px] font-normal text-charcoal-faint tabular-nums">
                <bdi dir="ltr">
                  {pointsSummary.balance.toLocaleString(appLocale())} / {pointsSummary.nextTierMinPoints.toLocaleString(appLocale())}
                </bdi>
              </p>
            )}
          </div>
          {/* #13-#14 / K11: the bar, 0.7 s (none under Reduce motion). */}
          <div className="mt-[7px] h-[6px] rounded-full overflow-hidden" style={{ background: tier.track }}>
            <div
              className="h-full rounded-full"
              style={{
                background: tier.solid,
                width: `${tierProgress(pointsSummary) * 100}%`,
                transition: reduced ? "none" : "width 0.7s cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          </div>

          {/* #15-#18 / K5: the tier rail, from point_tiers. A 1.5 line, #241F1B
              8%, through the 31 discs' centres, and a stub in the tier colour
              toward the next disc, as far as the points have come. */}
          <div className="relative flex mt-[18px]">
            <span
              aria-hidden
              className="absolute start-[10%] end-[10%] top-[14.75px] h-[1.5px]"
              style={{ background: hair(hc, 0.08) }}
            />
            {(() => {
              const i = pointTiers.findIndex((pt) => pt.name === pointsSummary.tierName);
              if (i < 0 || i >= pointTiers.length - 1) return null;
              const step = 100 / pointTiers.length;
              return (
                <span
                  aria-hidden
                  className="absolute top-[14.75px] h-[1.5px]"
                  style={{
                    insetInlineStart: `${step * (i + 0.5)}%`,
                    width: `${step * tierProgress(pointsSummary)}%`,
                    background: tier.solid,
                  }}
                />
              );
            })()}
            {pointTiers.map((pt) => {
              const reached = tierReached(pt, pointsSummary);
              const current = pt.name === pointsSummary.tierName;
              const own = tierCardColours(tierHex(tierRank(pointTiers, pt.name)), dark);
              const Icon = tierIcon(tierRank(pointTiers, pt.name));
              return (
                <div key={pt.name} className="relative flex-1 flex flex-col items-center">
                  <span
                    className="relative w-[31px] h-[31px] rounded-full flex items-center justify-center border-[1.5px]"
                    style={{
                      background: current ? own.solid : "rgb(var(--c-cream-card))",
                      borderColor: current || reached ? own.solid : own.border,
                      boxShadow: current && own.halo ? `0 0 0 4px ${own.halo}` : undefined,
                    }}
                  >
                    <Icon size={14} strokeWidth={1.75} style={{ color: current ? own.onSolid : own.ink }} />
                  </span>
                  <span
                    className={clsx("mt-[5px] text-[10px] leading-[12px]", current ? "font-extrabold" : "font-normal")}
                    style={{ color: current ? own.ink : "rgb(var(--c-charcoal-faint))" }}
                  >
                    {pt.name}
                  </span>
                  <span className="mt-[5px] text-[10px] leading-[12px] font-normal text-charcoal-faint tabular-nums">
                    {pt.minPoints.toLocaleString(appLocale())}
                  </span>
                </div>
              );
            })}
          </div>

          {/* #19: said plainly; there is nothing yet to spend points on (A13). */}
          <p
            className="mt-3.5 pt-3 border-t-[0.5px] text-[11px] leading-[15px] text-charcoal-faint"
            style={{ borderColor: tier.rule }}
          >
            {t("Rewards for your points are coming soon.")}
          </p>
        </div>
      )}

      {/* ---- #20-#37: Recently unlocked (hidden when none, O-4) ------------- */}
      {recent.length > 0 && (
        <div className="mb-[22px]">
          <p className="mx-1 mb-2 text-[10.5px] leading-[14px] font-bold tracking-[1.3px] uppercase text-charcoal-faint">
            {t("Recently unlocked")}
          </p>
          {/* #21: r18, 0.5 px #241F1B@8% (X-09). Dividers inset to the text
              column (#27: 1 px #241F1B@5%). */}
          <div className="rounded-[18px] px-3.5 bg-cream-card border-[0.5px] border-hair-08">
            {recent.map((a, i) => {
              const badge = badgeOf(a.key);
              return (
                // S2: a row opens the detail of its badge.
                <button
                  key={a.key}
                  onClick={() => badge && setOpenId(badge.id)}
                  className="tap w-full flex items-center gap-3 text-start"
                >
                  <AchievementTile achievementKey={a.key} emoji={a.icon} tile={40} radius={12} icon={34} />
                  <span
                    className="min-w-0 flex-1 self-stretch flex items-center gap-3 py-3 border-t"
                    style={{ borderTopColor: i > 0 ? hair(hc, 0.05) : "transparent" }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] leading-[18px] font-bold text-charcoal line-clamp-2">{a.title}</span>
                      <span className="block text-[10px] leading-[16px] text-charcoal-faint">{a.description}</span>
                    </span>
                    {/* #26 / #31: the key's ink; explorer rows say so instead of "+0". */}
                    <span
                      className="shrink-0 whitespace-nowrap [.larger-text_&]:whitespace-normal [.larger-text_&]:max-w-[150px] text-end text-[12px] leading-[18px] font-extrabold tabular-nums"
                      style={{ color: keyInk(a.key, dark) }}
                    >
                      {a.points > 0 ? `+${a.points.toLocaleString(appLocale())}` : t("No points, just bragging rights")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- #38-#40: the category strip, step 2 of the fixed area -------- */}
      {(categories.length > 0 || achievements === null) && tabs}

      {banner}

      {/* ---- #41-#52: the badge grid ----------------------------------------- */}
      {shown.length === 0 ? (
        // Zero rows only (O-4): Foundations › Empty state.
        !achievementsError && (
          <div className="flex flex-col items-center text-center py-8">
            <span className="w-14 h-14 rounded-2xl bg-primary-pale flex items-center justify-center text-primary-accent">
              <Trophy size={26} strokeWidth={1.5} aria-hidden />
            </span>
            <p className="text-[15px] font-bold text-charcoal mt-3">{t("Nothing here yet")}</p>
            <p className="text-[12.5px] font-medium text-charcoal-muted mt-1 leading-relaxed max-w-[260px]">
              {t("Use the app and badges start appearing here.")}
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {shown.map((b) => (
            <BadgeTile key={b.id} badge={b} hc={hc} onOpen={() => setOpenId(b.id)} />
          ))}
        </div>
      )}

      {/* MO1.1.3.1: the badge that was tapped, as a centred popup. */}
      <AchievementDetailSheet
        open={openBadge !== null}
        onClose={() => setOpenId(null)}
        badge={openBadge}
        nextLabel={openBadge ? nextRungLabel(openBadge) : null}
      />
    </div>
  );
}
