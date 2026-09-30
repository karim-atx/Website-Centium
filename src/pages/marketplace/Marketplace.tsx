import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { marketplaceCategories } from "../../data/mockProfessionals";
import Discover from "./Discover";
import { useApp } from "../../context/AppContext";
import { useEffect } from "react";
import { Sparkles, Gem, Award, Medal, Trophy, Crown, ChevronLeft } from "lucide-react";
import { tierProgress, tierReached } from "../../services/achievements";
import { marketplaceCategoryIcon } from "../../utils/icons";
import BusinessDashboard from "./BusinessDashboard";
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

// THE THRESHOLDS ARE THE DATABASE'S NOW. This list held its own ladder —
// 0 / 5,000 / 10,000 / 15,000 / 20,000 — and point_tiers says 0 / 1,000 /
// 3,000 / 7,500 / 15,000. Two copies of a ladder is two answers to "what tier
// am I", and my_points_summary() resolves the tier server-side, so the client
// copy had to go rather than be corrected. What is left here is the ICON per
// tier, which is presentation and lives nowhere in the schema; a tier the
// catalogue adds later falls back to the medal rather than disappearing.
// V9 (QA 9.0): "Each tier should have a different minimalistic logo based
// on their tier level."
const TIER_ICON: Record<string, typeof Award> = {
  Bronze: Award,
  Silver: Medal,
  Gold: Trophy,
  Platinum: Crown,
  Diamond: Gem,
};

export default function Marketplace() {
  const { user, pointsSummary, pointTiers, noteFeatureMilestone } = useApp();
  const navigate = useNavigate();

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
        <div className="mt-[5px]">
          <p className="text-[19px] font-bold tracking-[-0.03em] text-charcoal">Explore</p>
          <p className="mt-[3px] text-[11px] text-charcoal-tertiary">The future Centium ecosystem</p>
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
      {pointsSummary && (
      <div
        className="relative overflow-hidden rounded-[22px] px-[17px] py-4 mb-[13px]"
        // MO8.1: the tier card is all teal (#A2C8C2 → #4F7F78), the
        // existing teal hero token, which carries its own dark-mode value.
        style={{ background: "var(--gradient-teal-hero)" }}
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

        {/* WHERE THE BALANCE CAME FROM, which the old hero could not say
            because it came from nowhere. Both halves are the ledger's own
            sums by source; "other" only appears if a source outside these two
            ever credits anything, so it is never a zero row nobody can
            explain. */}
        <div className="flex items-center gap-3 flex-wrap text-[9.5px] font-semibold text-white/[0.74]">
          <span>{pointsSummary.achievementPoints.toLocaleString()} from achievements</span>
          <span className="w-1 h-1 rounded-full bg-white/40" />
          <span>{pointsSummary.referralPoints.toLocaleString()} from referrals</span>
          {pointsSummary.otherPoints !== 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <span>{pointsSummary.otherPoints.toLocaleString()} other</span>
            </>
          )}
        </div>

        <div className="flex gap-1 mt-[11px] pt-[11px] border-t border-white/[0.24]">
          {pointTiers.map((t) => {
            const reached = tierReached(t, pointsSummary);
            const Icon = TIER_ICON[t.name] ?? Medal;
            return (
              <div key={t.name} className="flex-1 flex flex-col items-center gap-1">
                <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: reached ? "rgba(255,255,255,.24)" : "rgba(255,255,255,.1)" }}>
                  <Icon size={13} className="text-white" style={{ opacity: reached ? 1 : 0.5 }} />
                </span>
                <span className="text-[8px] font-extrabold text-white" style={{ opacity: reached ? 1 : 0.55 }}>
                  {t.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* SAYING SO, RATHER THAN IMPLYING ONE. The row that used to sit under
            this hero read "Your N-day streak unlocked a reward / 10% off your
            next membership at partner gyms", and named a discount, a partner
            and a transaction that did not exist. Points are real and a tier is
            real; a reward to spend them on is not, yet. */}
        <p className="mt-[11px] text-[10px] leading-[1.4] text-white/[0.66]">
          Points count toward your tier. Rewards for your points are coming soon.
        </p>
      </div>
      )}

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
      <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42]">More categories</p>
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
          Stores, classes, equipment, supplements and wellness services — a full health marketplace,
          built around your streaks and progress.
        </p>
      </Card>
    </div>
  );
}
