import { useNavigate } from "react-router-dom";
import Discover from "./Discover";
import { useApp } from "../../context/AppContext";
import { useEffect } from "react";
import { ChevronLeft, Gift } from "lucide-react";
import { rewardForUser, type EarnedReward } from "../../services/rewards";
import { tierProgress } from "../../services/achievements";
import { TIER_ICON, colourSet, tierHex } from "../../components/mind/achievementStyle";
import { liftTo } from "../../data/folderColors";
import BusinessDashboard from "./BusinessDashboard";
import { useIsDark } from "../../hooks/useIsDark";
import ProfessionalExplore from "./ProfessionalExplore";
import { textPx } from "../../theme/textSize";
import { useBack } from "../../hooks/useBack";

export default function Marketplace() {
  const { user, pointsSummary, pointTiers, noteFeatureMilestone } = useApp();
  const navigate = useNavigate();
  const back = useBack();
  const dark = useIsDark();

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
  // V7 (QA 7.0): a professional's Explore is job postings + affiliation,
  // not the consumer rewards/marketplace browse experience.
  if (user.accountType === "professional") {
    return <ProfessionalExplore />;
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
      {/* Iteration 6 "Team": compact 19px title in place of PageHeader's
          27px default — see the identical note in Food.tsx. */}
      {/* Handover 2026-09-29 MO8.1: a back arrow beside the title, the
          same button Mind's header uses (Explore opens from More and Home). */}
      {/* MO1.4 #1 (frame check): the header at x 9 with a 6 gap, so the
          title starts at 51; the chevron centred at y 42; 16 to the card. */}
      <div className="flex items-start gap-1.5 mb-4">
        <button
          onClick={back}
          aria-label="Back"
          className="tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-card hover:shadow-soft shrink-0 -ml-[7px] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        {/* MO1.4: ONE header (Discover's second one is gone), 24/700 with its
            13/400 subtitle. */}
        <div className="mt-[3px]">
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-charcoal leading-tight">Explore</h1>
          <p className="mt-1 text-[13px] text-charcoal-tertiary">Classes and places near you</p>
        </div>
      </div>

      {/* Iteration 6 "Team" §5 Explore: the tier card — a gradient hero
          matching Home/Health/Mind. Every value in it is my_points_summary()'s.

          THE "+" BUTTON IS GONE. It read "as a place holder add a plus sign
          logo that increases the tier by 1000 points" (V8/QA 8.0) and did
          exactly that, into a localStorage integer. points_ledger now has no
          INSERT grant and no INSERT policy for any client role, so there is no
          longer a way to write a point from this side even in principle — and
          nothing to fake, since achievements credit real ones. */}
      {pointsSummary &&
        (() => {
          const tc = colourSet(tierHex(pointsSummary.tierName), dark);
          return (
            <button
              type="button"
              onClick={() => navigate("/app/mind/achievements")}
              aria-label={`${pointsSummary.tierName} tier, ${pointsSummary.balance.toLocaleString()} points. Open Achievements`}
              className="tap w-full text-left rounded-[20px] px-4 py-3.5 mb-3"
              style={{ background: tc.fill, border: `1px solid ${tc.border}` }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-baseline gap-2 min-w-0">
                  {/* Frame check: letter-spacing measured from the frame
                      (BRONZE 47 wide at 10/800: ~0.12em); the 22/800 figure
                      keeps its normal line height, so the row is 33 tall and
                      the pill centres on it as drawn. */}
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: tc.ink }}>
                    {pointsSummary.tierName}
                  </span>
                  <span className="text-[22px] font-extrabold leading-[1.5] text-charcoal tabular-nums">{pointsSummary.balance.toLocaleString()}</span>
                  <span className="text-[11px] font-semibold text-charcoal-faint">pts</span>
                </p>
                {/* MO1.4 #2: the pill alone, no chevron (the card still opens Achievements). */}
                <span className="flex items-center gap-1 shrink-0">
                  <span className="text-[10.5px] font-bold rounded-full px-[9px] py-[3px] whitespace-nowrap" // The ink is lifted against the pill itself, which is darker than the card in dark.
                    style={{ background: tc.track, color: dark ? liftTo(tierHex(pointsSummary.tierName), tc.track) : tc.ink }}>
                    {pointsSummary.nextTierName && pointsSummary.pointsToNextTier !== null
                      ? `${pointsSummary.pointsToNextTier.toLocaleString()} to ${pointsSummary.nextTierName}`
                      : "Highest tier"}
                  </span>
                </span>
              </div>
              {/* Frame check: the bar is 4 tall, 11 under the top row. */}
              <div className="h-1 rounded-full overflow-hidden mt-[11px]" style={{ background: tc.track }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${tierProgress(pointsSummary) * 100}%`,
                    background: tc.solid,
                    transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-3">
                {/* WHERE THE BALANCE CAME FROM: the ledger's own sums by source;
                    "other" only when a source outside these two credits anything. */}
                <p className="min-w-0 text-[11px] font-semibold text-charcoal-faint">
                  {pointsSummary.achievementPoints.toLocaleString()} from achievements · {pointsSummary.referralPoints.toLocaleString()} from referrals
                  {pointsSummary.otherPoints !== 0 ? ` · ${pointsSummary.otherPoints.toLocaleString()} other` : ""}
                </p>
                {/* Decision 23 (item 136): the tier ladder restored, right of
                    the sources line as drawn — the tiers from point_tiers
                    with AchievementsTab's icons (TIER_ICON) and colours
                    (colourSet): Medal / Shield / Crown / Star / Gem 11/1.75
                    in 22 discs, gap 5. The current tier is filled with the
                    white icon; the others a 1 px ring in the tier colour at
                    50% (measured from the frame, 2x) with the icon in it. */}
                {pointTiers.length > 0 && (
                  <span className="flex gap-[5px] shrink-0" aria-hidden>
                    {pointTiers.map((t) => {
                      const current = t.name === pointsSummary.tierName;
                      const own = colourSet(tierHex(t.name), dark);
                      const Icon = TIER_ICON[t.name] ?? TIER_ICON.Bronze;
                      return (
                        <span
                          key={t.name}
                          className="w-[22px] h-[22px] rounded-full flex items-center justify-center border"
                          style={{
                            background: current ? own.solid : "transparent",
                            borderColor: current ? own.solid : dark ? own.border : `${tierHex(t.name)}80`,
                          }}
                        >
                          <Icon size={11} strokeWidth={1.75} style={{ color: current ? own.onSolid : own.ink }} />
                        </span>
                      );
                    })}
                  </span>
                )}
              </div>
              {/* SAYING SO, RATHER THAN IMPLYING ONE: points and a tier are
                  real; a reward to spend them on is not, yet. */}
              <p className="mt-[7px] text-[11px] text-charcoal-faint">Rewards for your points are coming soon.</p>
            </button>
          );
        })()}

      {/* MO8.1 reward row, in the handover's design, shown ONLY for a reward
          this user has really earned. There is no source yet (see
          services/rewards: partner offers / business_discounts), so it stays
          hidden; the frame's example discount is never shown. */}
      {(() => {
        const reward = rewardForUser();
        return reward ? <RewardRow reward={reward} /> : null;
      })()}

      {/* THE "NEAR YOU" TILES ARE GONE, and they were the worst of it: two
          rows reading `mockGyms.length` and `mockClasses.length` — "3 nearby"
          for gyms that do not exist. Real classes and real venues now live in
          the Discover section below, straight from marketplace_classes and
          marketplace_venues. */}
      {/* Decision 23: the "More categories" grid is gone (item 46; each
          category page is now reached from a business's page, which the
          Businesses rows open) and so is the "More coming to Centium" card
          (item 32; the empty states already say what will show). */}
      <Discover />
    </div>
  );
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
