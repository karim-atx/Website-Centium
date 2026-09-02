import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { marketplaceCategories, mockGyms, mockClasses } from "../../data/mockProfessionals";
import { useApp } from "../../context/AppContext";
import { Flame, Sparkles, Gem, Plus, Award, Medal, Trophy, Crown, ChevronRight } from "lucide-react";
import { marketplaceCategoryIcon } from "../../utils/icons";
import BusinessDashboard from "./BusinessDashboard";
import ProfessionalExplore from "./ProfessionalExplore";

// V7 (QA 7.0): "The reward counter should be a series of points that goes
// from bronze to silver to gold to platinum to diamond. With each stage
// start with 5000 and increase increments of 5000."
// V9 (QA 9.0): "Each tier should have a different minimalistic logo based
// on their tier level" — was a single fixed Gem icon for every tier.
const rewardTiers = [
  { name: "Bronze", threshold: 0, color: "#B08D57", icon: Award },
  { name: "Silver", threshold: 5000, color: "#A8A9AD", icon: Medal },
  { name: "Gold", threshold: 10000, color: "#D9A441", icon: Trophy },
  { name: "Platinum", threshold: 15000, color: "#8FA6A3", icon: Crown },
  { name: "Diamond", threshold: 20000, color: "#6FA8DC", icon: Gem },
];

export default function Marketplace() {
  const { streaks, user, bonusPoints, addBonusPoints } = useApp();
  const navigate = useNavigate();

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

  // Rewards are earned strictly off the 4 core (auto-derived, "locked")
  // streaks — a user-added custom streak never counts toward unlocking one.
  const lockedStreaks = streaks.filter((s) => s.auto);
  const streak = [...lockedStreaks].sort((a, b) => b.days - a.days)[0] ?? lockedStreaks[0];
  if (!streak) return null;

  // Points are derived from total logged streak days across the core
  // streaks — a simple, transparent stand-in for a real points ledger.
  // V8 (QA 8.0): plus a placeholder bonus, added via the "+" button below.
  const points = lockedStreaks.reduce((sum, s) => sum + s.days, 0) * 100 + bonusPoints;
  const tierIdx = [...rewardTiers].reverse().findIndex((t) => points >= t.threshold);
  const tier = rewardTiers[rewardTiers.length - 1 - tierIdx];
  const nextTier = rewardTiers[rewardTiers.length - tierIdx];
  const progressPct = nextTier
    ? Math.min(100, ((points - tier.threshold) / (nextTier.threshold - tier.threshold)) * 100)
    : 100;

  return (
    <div>
      <PageHeader title="Explore" subtitle="The future Centium ecosystem" showBack />

      {/* Design refinement §6.9: the two teal gradient cards (tier +
          streak-reward) merge into one hairline panel — tier mark, points,
          progress and the streak reward all read as one unit instead of
          two competing full-bleed colour blocks. */}
      <Card className="mb-6 animate-fade-slide-up">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <tier.icon size={16} style={{ color: tier.color }} />
            <p className="section-label text-charcoal-faint">{tier.name} tier</p>
          </div>
          {/* V8 (QA 8.0): "as a place holder add a plus sign logo that
              increases the tier by 1000 points" */}
          <button
            onClick={() => addBonusPoints(1000)}
            aria-label="Add 1000 points (placeholder)"
            className="tap w-6 h-6 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft"
          >
            <Plus size={13} />
          </button>
        </div>
        <p className="text-[34px] font-extrabold text-charcoal leading-none tracking-[-0.035em] tabular-nums mb-3">
          {points.toLocaleString()} <span className="text-sm font-semibold text-charcoal-faint">pts</span>
        </p>
        <div className="h-1.5 rounded-full bg-cream-soft overflow-hidden mb-2">
          <div
            // §7.4: "Tier progress bar: transition: width .7s cubic-bezier(.22,1,.36,1)."
            className="h-full rounded-full"
            style={{
              width: `${progressPct}%`,
              background: tier.color,
              transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </div>
        <p className="text-xs text-charcoal-faint mb-4">
          {nextTier
            ? `${(nextTier.threshold - points).toLocaleString()} pts to ${nextTier.name}`
            : "Highest tier reached — Diamond"}
        </p>

        {/* 5-tier ladder */}
        <div className="flex items-center justify-between mb-4">
          {rewardTiers.map((t) => {
            const reached = points >= t.threshold;
            return (
              <div key={t.name} className="flex flex-col items-center gap-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: reached ? `${t.color}20` : "rgb(var(--c-cream-soft))" }}
                >
                  <t.icon size={14} style={{ color: reached ? t.color : "rgb(var(--c-charcoal-faint))" }} />
                </div>
                <span className={reached ? "text-[9px] font-semibold text-charcoal-soft" : "text-[9px] font-medium text-charcoal-faint"}>
                  {t.name}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5 border-t border-charcoal/[0.08] pt-3.5">
          <Flame size={15} className="text-teal-dark shrink-0" />
          <div>
            <p className="text-xs font-semibold text-charcoal">Your {streak.days}-day streak unlocked a reward</p>
            <p className="text-[11px] text-charcoal-faint">10% off your next gym membership at partner gyms</p>
          </div>
        </div>
      </Card>

      {/* Design refinement §6.9: Gyms/Classes promoted to grouped-list rows
          with a live count; the remaining categories stay a 2-up grid. */}
      <Card padded={false} className="mb-6 divide-y divide-charcoal/[0.04] animate-fade-slide-up">
        {[
          { id: "gyms", label: "Gyms", count: mockGyms.length },
          { id: "classes", label: "Classes", count: mockClasses.length },
        ].map((c) => {
          const Icon = marketplaceCategoryIcon[c.id as "gyms" | "classes"];
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/marketplace/${c.id}`)}
              className="tap w-full flex items-center justify-between gap-3.5 px-4 py-3.5 text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center text-charcoal-soft shrink-0">
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal">{c.label}</p>
                  <p className="text-xs text-charcoal-faint">{c.count} nearby</p>
                </div>
              </div>
              <ChevronRight size={15} className="text-charcoal-faint shrink-0" />
            </button>
          );
        })}
      </Card>

      {/* V9 (QA 9.0): "Remove the browse a category and keep the choose a
          category each with their own selectable button" — every category
          is its own directly-tappable button again, no picker sheet
          in between. */}
      <p className="section-label text-charcoal-faint mb-2.5">
        More categories
      </p>
      <div className="grid grid-cols-2 gap-2.5 mb-6 animate-fade-slide-up">
        {marketplaceCategories
          .filter((c) => c.id !== "gyms" && c.id !== "classes")
          .map((c) => {
            const Icon = marketplaceCategoryIcon[c.id];
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/marketplace/${c.id}`)}
                className="tap flex flex-col items-center gap-1.5 bg-cream-card border border-charcoal/[0.11] rounded-2xl py-4"
              >
                <Icon size={20} className="text-primary" />
                <span className="text-[11px] font-semibold text-charcoal-soft text-center leading-tight px-1">
                  {c.label}
                </span>
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
