import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Card } from "../../components/ui/Card";
import { marketplaceCategories, mockGyms, mockClasses } from "../../data/mockProfessionals";
import { useApp } from "../../context/AppContext";
import { Sparkles, Gem, Plus, Award, Medal, Trophy, Crown, ChevronRight, Gift, KeyRound } from "lucide-react";
import { marketplaceCategoryIcon } from "../../utils/icons";
import { QrPattern, DAY_MS, isOneTimePlan } from "../../components/marketplace/GymDetailSheet";
import BusinessDashboard from "./BusinessDashboard";
import ProfessionalExplore from "./ProfessionalExplore";

// Iteration 6 "Team" §5 Explore: each "More categories" tile gets its own
// icon colour and light row tint — extending the same colour family used
// for every other tinted-row list this pass touched (see rowTint in
// RoutinesTab.tsx). The four not shown in the captured frame (the rest of
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
  const { streaks, user, bonusPoints, addBonusPoints, gymPurchases } = useApp();
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

  const passes = Object.entries(gymPurchases).flatMap(([gymId, arr]) =>
    arr
      .filter((p) => !p.oneTime || Date.now() - p.purchasedAt < DAY_MS)
      .map((p) => ({ gymId, gymName: mockGyms.find((g) => g.id === gymId)?.name ?? "Gym", plan: p.plan, purchasedAt: p.purchasedAt, oneTime: p.oneTime }))
  );
  const currentPass = passes[0];
  const passRemainingMs = currentPass && currentPass.oneTime ? currentPass.purchasedAt + DAY_MS - Date.now() : null;

  return (
    <div>
      {/* Iteration 6 "Team": compact 19px title in place of PageHeader's
          27px default — see the identical note in Food.tsx. */}
      <div className="mb-[13px]">
        <p className="text-[19px] font-bold tracking-[-0.03em] text-charcoal">Explore</p>
        <p className="mt-[3px] text-[11px] text-charcoal-tertiary">The future Centium ecosystem</p>
      </div>

      {/* Iteration 6 "Team" §5 Explore: the tier card and streak-reward row
          split back into two pieces — a gradient hero (matching Home/
          Health/Mind) plus its own tinted row — reversing the "merge into
          one hairline panel" refinement from an earlier round. Real tier/
          points/progress values throughout, not the mockup's fixed
          "Silver · 6,000 · 4,000 to Gold" example. */}
      <div
        className="relative overflow-hidden rounded-[22px] px-[17px] py-4 mb-[13px]"
        style={{ background: "var(--gradient-board)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[9px] font-bold tracking-[.2em] uppercase text-white/[0.66]">{tier.name} tier</p>
          <div className="flex items-center gap-1.5">
            {/* V8 (QA 8.0): "as a place holder add a plus sign logo that
                increases the tier by 1000 points" */}
            <button
              onClick={() => addBonusPoints(1000)}
              aria-label="Add 1000 points (placeholder)"
              className="tap w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white"
            >
              <Plus size={11} />
            </button>
            <span className="text-[9.5px] font-bold text-white bg-white/20 rounded-full px-[9px] py-1 whitespace-nowrap">
              {nextTier ? `${(nextTier.threshold - points).toLocaleString()} to ${nextTier.name}` : "Highest tier"}
            </span>
          </div>
        </div>
        <p className="mt-[10px] flex items-baseline gap-[5px]">
          <span className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-white tabular-nums">{points.toLocaleString()}</span>
          <span className="text-[11px] font-semibold text-white/[0.74]">pts</span>
        </p>
        <div className="my-[11px]">
          <div className="h-[5px] rounded-full bg-white/[0.26] overflow-hidden">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${progressPct}%`, transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)" }}
            />
          </div>
        </div>
        <div className="flex gap-1 pt-[11px] border-t border-white/[0.24]">
          {rewardTiers.map((t) => {
            const reached = points >= t.threshold;
            return (
              <div key={t.name} className="flex-1 flex flex-col items-center gap-1">
                <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: reached ? "rgba(255,255,255,.24)" : "rgba(255,255,255,.1)" }}>
                  <t.icon size={13} className="text-white" style={{ opacity: reached ? 1 : 0.5 }} />
                </span>
                <span className="text-[8px] font-extrabold text-white" style={{ opacity: reached ? 1 : 0.55 }}>
                  {t.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-[11px] rounded-[15px] px-3.5 py-3 mb-[13px]" style={{ background: "rgba(162,200,194,.18)" }}>
        <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--gradient-teal-hero)" }}>
          <Gift size={15} className="text-white" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-extrabold text-charcoal">Your {streak.days}-day streak unlocked a reward</p>
          <p className="text-[10px] text-team-teal-ink">10% off your next membership at partner gyms</p>
        </div>
      </div>

      <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42]">Near you</p>
      <div className="flex flex-col gap-[7px] mb-[13px]">
        {[
          { id: "gyms", label: "Gyms", count: mockGyms.length, tile: "#7D6BB5", bg: "rgba(174,161,220,.16)" },
          { id: "classes", label: "Classes", count: mockClasses.length, tile: "#6F9993", bg: "rgba(162,200,194,.18)" },
        ].map((c) => {
          const Icon = marketplaceCategoryIcon[c.id as "gyms" | "classes"];
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/app/marketplace/${c.id}`)}
              className="tap w-full flex items-center gap-[11px] rounded-[15px] px-3.5 py-3 text-left"
              style={{ background: c.bg }}
            >
              <div className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center shrink-0" style={{ background: c.tile }}>
                <Icon size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold text-charcoal">{c.label}</p>
                <p className="text-[10px] text-charcoal-tertiary">{c.count} nearby</p>
              </div>
              <ChevronRight size={14} className="text-primary-deep-text/60 shrink-0" />
            </button>
          );
        })}
      </div>

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

      {/* "Your passes" — reuses the exact canonical large Gym Passes widget
          from HomeWidget.tsx, real purchase data. Net new to this screen;
          not addressed structurally before this handoff. */}
      <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42]">Your passes</p>
      <div className="w-full h-[150px] box-border rounded-[15px] px-4 py-3.5 flex flex-col mb-[13px]" style={{ background: "rgba(36,31,27,.05)" }}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[9px] font-bold tracking-[.16em] uppercase text-charcoal/50">Gym passes</p>
          <span className="text-[9.5px] font-bold rounded-full px-2 py-[3px] whitespace-nowrap text-charcoal/[0.62] bg-charcoal/[0.09]">{passes.length} active</span>
        </div>
        {currentPass ? (
          <div className="flex-1 flex flex-col justify-between min-h-0 mt-[9px]">
            <div className="flex items-center gap-[13px]">
              <QrPattern seed={`${currentPass.gymId}-${currentPass.plan}`} className="w-[52px] h-[52px] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-extrabold tracking-[-0.02em] text-charcoal truncate">{currentPass.gymName}</p>
                <p className="mt-[3px] text-[10px] text-charcoal-tertiary">{currentPass.plan}</p>
                {passRemainingMs !== null && (
                  <p className={clsx("mt-[5px] text-[10px] font-extrabold", passRemainingMs < 6 * 60 * 60 * 1000 ? "text-status-high" : "text-charcoal-soft")}>
                    {isOneTimePlan(currentPass.plan) ? "Day pass" : currentPass.plan} · expires{" "}
                    {new Date(currentPass.purchasedAt + DAY_MS).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center min-h-0">
            <span className="flex flex-col items-center gap-[7px] text-charcoal/55">
              <KeyRound size={30} />
              <span className="text-[11px] font-semibold">No active passes</span>
            </span>
          </div>
        )}
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
