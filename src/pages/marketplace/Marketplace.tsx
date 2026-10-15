import { useNavigate } from "react-router-dom";
import Discover from "./Discover";
import { useApp } from "../../context/AppContext";
import { useEffect, useState } from "react";
import { FixedHeader } from "../../components/ui/FixedHeader";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { ChevronLeft, Gift } from "lucide-react";
import { rewardForUser, type EarnedReward } from "../../services/rewards";
import { tierProgress } from "../../services/achievements";
import { TIER_ICON, colourSet, tierHex } from "../../components/mind/achievementStyle";
import { contrastRatio, liftTo, mixHex } from "../../data/folderColors";
import BusinessDashboard from "./BusinessDashboard";
import { useIsDark } from "../../hooks/useIsDark";
import ProfessionalExplore from "./ProfessionalExplore";
import { textPx } from "../../theme/textSize";
import { useBack } from "../../hooks/useBack";

export default function Marketplace() {
  const { user, noteFeatureMilestone } = useApp();
  const back = useBack();
  // S2: Discover reports when its tabs and rail are pinned under the header.
  const [tabsPinned, setTabsPinned] = useState(false);

  // Explorer milestone: "Out and about". Recorded once per account for ever —
  // a repeat is a primary-key conflict the service treats as the success it
  // is. Worth zero points, like every self-reported achievement.
  useEffect(() => {
    noteFeatureMilestone("explore_page");
  }, [noteFeatureMilestone]);

  // Businesses get a management dashboard here instead of the consumer
  // browse experience — separate UI per QA, not just a banner.
  if (user.accountType === "business") {
    return <BusinessDashboard />;
  }
  // Release 3 (MO17 v2 / v3): a professional's Explore is its own screen
  // (businesses, classes, colleagues) with the same points card.
  if (user.accountType === "professional") {
    return <ProfessionalExplore pointsCard={<PointsCard />} />;
  }

  // NOTHING IS COMPUTED HERE ANY MORE, and that is the point of the change.
  //
  // The balance used to be `sum of auto-streak days x 100 + bonusPoints`: a
  // rate nobody set, applied to streaks, plus a localStorage integer a "+"
  // button incremented by 1,000. It read like a ledger and was arithmetic.
  // Every figure below now comes from my_points_summary(), which sums
  // points_ledger and resolves the tier against point_tiers — and the ledger
  // has no client write path at all, so the number cannot be self-credited.
  //
  // NO EARLY RETURN ON AN EMPTY SUMMARY. A brand-new account, or one whose
  // summary has not arrived yet, still came here for the marketplace.

  // "Your passes" used to live here, reading gymPurchases and resolving each
  // gym's NAME out of mockGyms. Both halves were fabricated: the purchases
  // were local rows keyed to invented gym ids, bought from a mock gym sheet
  // reached through the category pages this pass is clearing out. A pass to a
  // gym that does not exist is not a record of anything, so the section is
  // gone rather than left showing a QR code for it. Real gym passes become
  // possible when the gyms table has rows and a purchase path exists.

  return (
    <div>
      {/* v6 MO1.4 #1-#5 / S1: the header is step 1 of the fixed area (shared
          FixedHeader; fill #FFFFFF / #121317 and a 1px hairline once content
          passes under, V6-91). Back 36 at x 9, 6 to the title. Title
          27/40.5 700 ls -0.6 (X-12 / V6-150: one size for pages reached from
          More; the frame's 24/36 deviates). Subtitle 13/19.5 400 #8C8378 /
          #B8B3C7 straight under it. Once Discover's tabs and rail pin under
          it (S2), the one hairline moves to the rail's bottom. */}
      <FixedHeader paddingBottom={0} hideHairline={tabsPinned}>
        <div className="flex items-start gap-1.5">
          <button
            onClick={back}
            aria-label="Back"
            className="tap w-9 h-9 mt-0.5 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-card hover:shadow-soft shrink-0 -ml-[7px] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-[27px] leading-[40.5px] font-bold tracking-[-0.6px] text-charcoal">Explore</h1>
            <p className="text-[13px] leading-[19.5px] text-charcoal-faint">Classes and places near you</p>
          </div>
        </div>
      </FixedHeader>

      {/* #6-#24: the points card, 16 under the header, 12 over the search;
          it scrolls away. Every value is my_points_summary()'s (D2). Bronze is
          drawn: #FBF7F4 with 0.5px #9C6B4A@24% (dark #262932 with
          #D9A57F@24%, ink #D9A57F). Other tiers (OURS) take the same recipe
          from their own colour (light: colourSet's 5% fill; dark: #262932
          with the tier lifted to 4.5:1). */}
      <div className="mt-4">
        <PointsCard />
      </div>

      {/* MO8.1 reward row (K4), in the handover's design, shown ONLY for a
          reward this user has really earned. There is no source yet (see
          services/rewards), so it stays hidden; it would scroll away with the
          card, above the pinned tabs. */}
      {(() => {
        const reward = rewardForUser();
        return reward ? <RewardRow reward={reward} /> : null;
      })()}

      <Discover onPinnedChange={setTabsPinned} />
    </div>
  );
}

/**
 * The points card (my_points_summary), shared by the client's Explore and,
 * Release 3 (MO17), the professional's. Moved out of Marketplace unchanged.
 */
function PointsCard() {
  const { pointsSummary, pointTiers, accessibility } = useApp();
  const navigate = useNavigate();
  const dark = useIsDark();
  const reduced = useReducedMotion();
  // O-LOAD: the card skeleton shows while the summary loads, not for ever.
  const [pointsGaveUp, setPointsGaveUp] = useState(false);
  useEffect(() => {
    if (pointsSummary) return;
    const id = window.setTimeout(() => setPointsGaveUp(true), 6000);
    return () => window.clearTimeout(id);
  }, [pointsSummary]);
  return (
    <>
    {pointsSummary ? (
      (() => {
        const card = tierCard(pointsSummary.tierName, dark, !!accessibility.highContrast);
        return (
          <button
            type="button"
            onClick={() => navigate("/app/mind/achievements")}
            aria-label={`${pointsSummary.tierName} tier, ${pointsSummary.balance.toLocaleString()} points. Open Achievements`}
            data-points-card=""
            className="tap w-full text-left rounded-[20px] px-4 py-3.5 mb-3 border-[0.5px]"
            style={{ background: card.fill, borderColor: card.border }}
          >
            <div className="flex items-center justify-between gap-3">
              {/* #7-#9: label 10/15 800 ls 1.4 uppercase, figure 22/33 800,
                  "pts" 11/16.5 600, 6 apart. */}
              <p className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-[10px] leading-[15px] font-extrabold uppercase tracking-[1.4px]" style={{ color: card.ink }}>
                  {pointsSummary.tierName}
                </span>
                <span className="text-[22px] font-extrabold leading-[33px] text-charcoal tabular-nums">{pointsSummary.balance.toLocaleString()}</span>
                <span className="text-[11px] leading-[16.5px] font-semibold text-charcoal-faint">pts</span>
              </p>
              {/* #10 / K6: pad 3 9, 10.5/15.8 700, the tier on its 12% tint. */}
              <span
                className="shrink-0 text-[10.5px] leading-[15.8px] font-bold rounded-full px-[9px] py-[3px] whitespace-nowrap"
                style={{ background: card.pill, color: card.ink }}
              >
                {pointsSummary.nextTierName && pointsSummary.pointsToNextTier !== null
                  ? `${pointsSummary.pointsToNextTier.toLocaleString()} to ${pointsSummary.nextTierName}`
                  : "Highest tier"}
              </span>
            </div>
            {/* #11 / #12: 5 tall, 10 under, tier@14% track, tier fill; the
                width eases 0.7 s (none under Reduce motion, O-RM). */}
            <div className="h-[5px] rounded-full overflow-hidden mt-2.5" style={{ background: card.track }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${tierProgress(pointsSummary) * 100}%`,
                  background: card.solid,
                  transition: reduced ? "none" : "width 0.7s cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-3">
              {/* #13 / K5: 11/16.5 400 #8C8378 / #B8B3C7. */}
              <p className="min-w-0 text-[11px] leading-[16.5px] text-charcoal-faint">
                {pointsSummary.achievementPoints.toLocaleString()} from achievements · {pointsSummary.referralPoints.toLocaleString()} from referrals
                {pointsSummary.otherPoints !== 0 ? ` · ${pointsSummary.otherPoints.toLocaleString()} other` : ""}
              </p>
              {/* #14-#23: the tiers from point_tiers, 22 discs 5 apart. The
                  current one filled in the tier with a white Medal 11;
                  the others a 1.1px ring at tier@50% with the icon at
                  tier@70% (dark: the app's lifted ring and ink, where the
                  literal 70% would fall under 3:1, V6-92). */}
              {pointTiers.length > 0 && (
                <span className="flex gap-[5px] shrink-0" aria-hidden>
                  {pointTiers.map((t) => {
                    const current = t.name === pointsSummary.tierName;
                    const th = tierHex(t.name);
                    const own = colourSet(th, true);
                    const Icon = TIER_ICON[t.name] ?? TIER_ICON.Bronze;
                    return (
                      <span
                        key={t.name}
                        data-tier-disc={current ? "current" : ""}
                        className="w-[22px] h-[22px] rounded-full flex items-center justify-center"
                        style={{
                          background: current ? th : "transparent",
                          border: `1.1px solid ${current ? th : dark ? own.border : `${th}80`}`,
                        }}
                      >
                        <Icon size={11} strokeWidth={1.75} style={{ color: current ? "#FFFFFF" : dark ? own.ink : `${th}B3` }} />
                      </span>
                    );
                  })}
                </span>
              )}
            </div>
            {/* #24: 10.5/15.8 400, 8 under. */}
            <p className="mt-2 text-[10.5px] leading-[15.8px] text-charcoal-faint">Rewards for your points are coming soon.</p>
          </button>
        );
      })()
    ) : (
      // O-LOAD (OURS): the card's skeleton while my_points_summary loads.
      !pointsGaveUp && <div aria-hidden className="mb-3 h-[143.8px] rounded-[20px] bg-cream-soft animate-skeleton-pulse" />
    )}
    </>
  );
}

/** The first mix of `hue` toward black that reaches `ratio` on `bg`. */
function darkenTo(hue: string, bg: string, ratio = 4.5): string {
  for (let t = 0; t <= 1; t += 0.01) {
    const c = mixHex(hue, "#000000", t);
    if (contrastRatio(c, bg) >= ratio) return c;
  }
  return "#000000";
}

/**
 * MO1.4 #6 / #7 / #10-#12: the points card's colours for a tier. Bronze is
 * drawn (light #FBF7F4, 0.5px #9C6B4A@24%, pill #9C6B4A@12%, track @14%;
 * dark #262932, #D9A57F at the same alphas). Other tiers (not drawn, OURS)
 * follow the recipe from their own colour.
 */
function tierCard(name: string, dark: boolean, highContrast = false) {
  const hex = tierHex(name);
  if (!dark) {
    const fill = colourSet(hex, false).fill;
    // High contrast: the drawn ink (Bronze #9C6B4A on #FBF7F4 is 4.27:1) is
    // darkened just enough to reach 4.5:1 on its own card.
    const ink = highContrast ? darkenTo(hex, fill) : hex;
    return { fill, border: `${hex}3D`, ink, pill: `${hex}1F`, track: `${hex}24`, solid: hex };
  }
  const ink = name === "Bronze" ? "#D9A57F" : liftTo(hex, "#262932");
  return { fill: "#262932", border: `${ink}3D`, ink, pill: `${ink}1F`, track: `${ink}24`, solid: ink };
}
/**
 * MO8.1 · the earned-reward row under the tier card: a light teal card
 * (rgba(162,200,194,.18)), a teal gift tile, the reason on one line and the
 * real offer below it (frame colours: #241F1B title, #4F7F78 detail).
 * Mobile v5.1 R3, dark mode: the title is the charcoal token and the detail
 * secondary.deeper #A3C7C0 (7:1 on the teal row over the dark page).
 */
function RewardRow({ reward }: { reward: EarnedReward }) {
  const dark = useIsDark();
  return (
    <div
      className="flex items-center mb-[13px]"
      style={{ gap: 11, padding: "12px 14px", borderRadius: 15, background: "rgb(var(--th-a2c8c2) / .18)" }}
    >
      <span
        className="flex-none flex items-center justify-center"
        style={{ width: 30, height: 30, borderRadius: 10, background: "var(--gradient-teal-hero)" }}
      >
        <Gift size={15} className="text-white" />
      </span>
      <span className="min-w-0">
        <span className="block" style={{ fontSize: textPx(12.5), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>
          {reward.title}
        </span>
        <span className="block" style={{ fontSize: textPx(10.5), color: dark ? "rgb(var(--thi-a3c7c0))" : "rgb(var(--thi-4f7f78))", marginTop: 1 }}>
          {reward.detail}
        </span>
      </span>
    </div>
  );
}
