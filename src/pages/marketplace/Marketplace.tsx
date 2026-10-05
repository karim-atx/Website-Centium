import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { marketplaceCategories } from "../../data/mockProfessionals";
import Discover from "./Discover";
import { useApp } from "../../context/AppContext";
import { useEffect } from "react";
import { Sparkles, ChevronLeft, ChevronRight, Gift } from "lucide-react";
import { rewardForUser, type EarnedReward } from "../../services/rewards";
import { tierProgress } from "../../services/achievements";
import { colourSet, tierHex } from "../../components/mind/achievementStyle";
import { liftTo } from "../../data/folderColors";
import { marketplaceCategoryIcon } from "../../utils/icons";
import BusinessDashboard from "./BusinessDashboard";
import { useIsDark } from "../../hooks/useIsDark";
import ProfessionalExplore from "./ProfessionalExplore";

// Iteration 6 "Team" §5 Explore: each "More categories" tile gets its own
// icon colour and light row tint — extending the same colour family used
// for every other tinted-row list this pass touched. The four not shown in
// the captured frame (the rest of
// marketplaceCategories) get a neutral tile in the same spirit as
// Explore/Referral/Settings on the More screen.
const CATEGORY_STYLE: Record<string, { icon: string; bg: string }> = {
  stores: { icon: "#7D6BB5", bg: "rgba(174,161,220,.16)" },
  supplements: { icon: "#4F7F78", bg: "rgba(162,200,194,.18)" },
  equipment: { icon: "#C29A3D", bg: "rgba(36,31,27,.05)" },
  wellness: { icon: "#9C4F7C", bg: "rgba(36,31,27,.05)" },
  clothing: { icon: "#9B8AD0", bg: "rgba(174,161,220,.16)" },
  meal_prep: { icon: "#6F9993", bg: "rgba(162,200,194,.18)" },
};

export default function Marketplace() {
  const { user, pointsSummary, noteFeatureMilestone } = useApp();
  const navigate = useNavigate();
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
      <div className="flex items-start gap-2.5 mb-[13px]">
        <button
          onClick={() => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate("/app/more"))}
          aria-label="Back"
          className="tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-card hover:shadow-soft shrink-0 -ml-1.5 mt-0.5 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        {/* MO1.4: ONE header (Discover's second one is gone), 24/700 with its
            13/400 subtitle. */}
        <div className="mt-[3px]">
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-charcoal leading-tight">Explore</h1>
          <p className="mt-1 text-[13px] text-charcoal-faint">Classes and places near you</p>
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
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: tc.ink }}>
                    {pointsSummary.tierName}
                  </span>
                  <span className="text-[22px] font-extrabold leading-none text-charcoal tabular-nums">{pointsSummary.balance.toLocaleString()}</span>
                  <span className="text-[11px] font-semibold text-charcoal-faint">pts</span>
                </p>
                <span className="flex items-center gap-1 shrink-0">
                  <span className="text-[10.5px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap" // The ink is lifted against the pill itself, which is darker than the card in dark.
                    style={{ background: tc.track, color: dark ? liftTo(tierHex(pointsSummary.tierName), tc.track) : tc.ink }}>
                    {pointsSummary.nextTierName && pointsSummary.pointsToNextTier !== null
                      ? `${pointsSummary.pointsToNextTier.toLocaleString()} to ${pointsSummary.nextTierName}`
                      : "Highest tier"}
                  </span>
                  <ChevronRight size={15} className="text-charcoal-faint" aria-hidden />
                </span>
              </div>
              <div className="h-[5px] rounded-full overflow-hidden mt-3" style={{ background: tc.track }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${tierProgress(pointsSummary) * 100}%`,
                    background: tc.solid,
                    transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
              </div>
              {/* WHERE THE BALANCE CAME FROM: the ledger's own sums by source;
                  "other" only when a source outside these two credits anything. */}
              <p className="mt-2.5 text-[11px] font-semibold text-charcoal-faint">
                {pointsSummary.achievementPoints.toLocaleString()} from achievements · {pointsSummary.referralPoints.toLocaleString()} from referrals
                {pointsSummary.otherPoints !== 0 ? ` · ${pointsSummary.otherPoints.toLocaleString()} other` : ""}
              </p>
              {/* SAYING SO, RATHER THAN IMPLYING ONE: points and a tier are
                  real; a reward to spend them on is not, yet. */}
              <p className="mt-1.5 text-[11px] text-charcoal-faint">Rewards for your points are coming soon.</p>
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
      <Discover />

      {/* V9 (QA 9.0): "Remove the browse a category and keep the choose a
          category each with their own selectable button" — every category
          is its own directly-tappable button again, no picker sheet
          in between. */}
      {/* Kept below the tabs (B28): the only way into the category pages. */}
      <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42] dark:text-charcoal/[0.55]">More categories</p>
      <div className="grid grid-cols-2 gap-[7px] mb-[13px]">
        {marketplaceCategories
          .filter((c) => c.id !== "gyms" && c.id !== "classes")
          .map((c) => {
            const Icon = marketplaceCategoryIcon[c.id];
            const style = CATEGORY_STYLE[c.id] ?? { icon: "#7E7568", bg: "rgba(36,31,27,.05)" };
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/app/marketplace/${c.id}`)}
                className="tap flex flex-col items-start gap-2 rounded-[15px] px-3.5 py-3"
                style={{ background: style.bg }}
              >
                <Icon size={17} style={{ color: style.icon }} />
                <span className="text-[11px] font-bold leading-[1.25] text-charcoal text-left">{c.label}</span>
              </button>
            );
          })}
      </div>

      <Card className="text-center py-8 animate-fade-slide-up">
        <Sparkles size={22} className="text-berry mx-auto mb-3" />
        <p className="font-display font-semibold text-charcoal mb-1.5">More coming to Centium</p>
        <p className="text-xs text-charcoal-soft max-w-xs mx-auto leading-relaxed">
          Stores, classes, equipment, supplements and wellness services: a full health marketplace,
          built around your streaks and progress.
        </p>
      </Card>
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
      style={{ gap: 11, padding: "12px 14px", borderRadius: 15, background: "rgba(162,200,194,.18)" }}
    >
      <span
        className="flex-none flex items-center justify-center"
        style={{ width: 30, height: 30, borderRadius: 10, background: "var(--gradient-teal-hero)" }}
      >
        <Gift size={15} className="text-white" />
      </span>
      <span className="min-w-0">
        <span className="block" style={{ fontSize: 12.5, fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>
          {reward.title}
        </span>
        <span className="block" style={{ fontSize: 10.5, color: dark ? "#A3C7C0" : "#4F7F78", marginTop: 1 }}>
          {reward.detail}
        </span>
      </span>
    </div>
  );
}
