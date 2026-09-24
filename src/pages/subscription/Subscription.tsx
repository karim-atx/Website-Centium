import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useSubscriptionTiers } from "../../hooks/useSubscriptionTiers";
import { useMySubscriptionTier } from "../../hooks/useMySubscriptionTier";
import { useEffectiveProfessionalTier } from "../../hooks/useEffectiveProfessionalTier";
import { useBusinessPlan } from "../../hooks/useBusinessPlan";
import { useBusinessTeam } from "../../hooks/useBusinessTeam";
import { capLabel, effectiveTierLabel, tierLabel } from "../../services/subscription-tiers";
import {
  formatPrice,
  yearlySaving,
  NO_PAYMENTS_NOTE,
  type BillingPeriod,
} from "../../services/subscription-tiers/pricing";
import { UPGRADE_ACTION_LABEL, upgradeMailto } from "../../services/subscription-tiers/upgrade";
import { BillingToggle, PlanRow, PlanSkeleton } from "./PlanRows";
import {
  ChevronLeft,
  Mic,
  LineChart,
  TrendingUp,
  Droplet,
  Dumbbell,
  Users,
  Flame,
  Sparkles,
} from "lucide-react";

// The subscription screen, for all three account types.
//
// READ-ONLY THROUGHOUT, AND THAT IS NOT A SIMPLIFICATION. Two of these three
// screens used to let somebody pick a plan, walk a payment sheet and "confirm"
// it, which wrote a string to localStorage and nothing else —
// subscription_states has no write policy or grant for any client role, so
// nothing the browser did could change the plan the database enforces. The two
// then disagreed: the screen said Growth, the cap trigger still counted
// Starter's clients, and the refusal arrived later with no explanation.
//
// 9c724ce cured the professional screen of it. This does the same to the
// client and business ones, which were still doing it — the client one while
// showing $5.99 and $49.99 against a database that says $9.99 and $99.99.

const features = [
  { icon: Mic, label: "AI food logging" },
  { icon: LineChart, label: "Advanced nutrition insights" },
  { icon: TrendingUp, label: "Advanced progress tracking" },
  { icon: Droplet, label: "Bloodwork history" },
  { icon: Dumbbell, label: "Advanced workout analytics" },
  { icon: Users, label: "Professional sharing" },
  { icon: Flame, label: "Streak rewards" },
  { icon: Sparkles, label: "Personalized insights" },
];

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    aria-label="Back"
    className="tap w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-soft mb-4"
  >
    <ChevronLeft size={20} />
  </button>
);

const Masthead: React.FC<{ title: string; blurb: string }> = ({ title, blurb }) => (
  <div className="text-center mb-6 animate-fade-slide-up">
    {/* Design refinement §3c "Placements": full lockup — splash, subscription,
        share cards — replaces the icon-tile + separate wordmark line. */}
    <img src="/centium-lockup.png" alt="Centium" className="w-[104px] h-auto object-contain mx-auto mb-5" />
    <h1 className="font-display text-3xl font-semibold text-charcoal leading-tight mb-3">{title}</h1>
    <p className="text-charcoal-soft text-sm max-w-xs mx-auto">{blurb}</p>
  </div>
);

/** The upgrade path, and the one sentence about why it is an email. */
const UpgradeFooter: React.FC<{ show?: boolean }> = ({ show = true }) => (
  <>
    {show && (
      <a
        href={upgradeMailto()}
        className="tap w-full flex items-center justify-center rounded-2xl bg-primary text-white text-base font-semibold h-14"
      >
        {UPGRADE_ACTION_LABEL}
      </a>
    )}
    <p className="text-[11px] text-charcoal-faint text-center mt-4">{NO_PAYMENTS_NOTE}</p>
  </>
);

/** The best saving on offer, for the toggle's badge. Null when none qualifies. */
function bestSavingAmong(tiers: { monthlyPrice: number; yearlyPrice: number | null }[]): number | null {
  const percents = tiers
    .map((t) => yearlySaving(t.monthlyPrice, t.yearlyPrice)?.percent)
    .filter((p): p is number => p != null);
  return percents.length > 0 ? Math.max(...percents) : null;
}

// ---------------------------------------------------------------------------

function ClientSubscription() {
  const navigate = useNavigate();
  const { tiers, loading, error } = useSubscriptionTiers("client");
  const { resolved, loading: planLoading, error: planError } = useMySubscriptionTier("client");
  const [period, setPeriod] = useState<BillingPeriod>("yearly");

  const current = resolved?.tier ?? null;
  const isTopTier = !!current && tiers.length > 0 && tiers[tiers.length - 1].id === current.id;

  return (
    <div>
      <BackButton onClick={() => navigate(-1)} />
      <Masthead
        title="Your health, without the limits."
        blurb="Unlock the full Centium experience with AI-powered logging and deeper insights."
      />

      {/* THE PLAN, NAMED. Never "no subscription": an account with no
          subscription_states row is on the free default, which is a plan with
          a name, not an absence. */}
      <div className="rounded-2xl bg-primary-pale px-4 py-3.5 mb-6 text-center">
        {planLoading ? (
          <p className="text-sm text-primary-dark">Checking your plan…</p>
        ) : planError ? (
          <p className="text-sm font-semibold text-status-high">{planError}</p>
        ) : current ? (
          <p className="text-sm text-primary-dark">
            You're on <span className="font-bold">{tierLabel(current)}</span>
          </p>
        ) : (
          <p className="text-sm text-primary-dark">Your plan couldn't be identified.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {features.map((f) => (
          <div
            key={f.label}
            className="flex items-center gap-2.5 bg-cream-card rounded-2xl px-3.5 py-3 shadow-soft animate-fade-slide-up"
          >
            <f.icon size={16} className="text-primary shrink-0" />
            <span className="text-xs font-medium text-charcoal leading-tight">{f.label}</span>
          </div>
        ))}
      </div>

      <BillingToggle period={period} onChange={setPeriod} bestSaving={bestSavingAmong(tiers)} />

      {/* A FAILED READ IS SAID OUT LOUD, not rendered as an empty list. On the
          screen where somebody looks at what they could pay for, "no plans"
          and "we couldn't fetch the plans" are not the same sentence. */}
      {error && <p className="text-xs font-semibold text-status-high mb-4">{error}</p>}

      <div className="space-y-2.5 mb-6">
        {loading && <PlanSkeleton rows={2} />}
        {tiers.map((t) => (
          <PlanRow
            key={t.id}
            tier={t}
            period={period}
            isCurrent={current?.id === t.id}
            detail={t.monthlyPrice === 0 ? "Everything you need to start" : "Every feature above"}
          />
        ))}
      </div>

      <UpgradeFooter show={!isTopTier} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function ProfessionalSubscription() {
  const navigate = useNavigate();
  const { professionalClients } = useApp();
  const { tiers, loading, error } = useSubscriptionTiers("professional");
  const { effective, loading: planLoading, error: planError } = useEffectiveProfessionalTier();
  const [period, setPeriod] = useState<BillingPeriod>("yearly");

  const current = effective?.tier ?? null;
  // The top of the ladder has nothing to upgrade to, so it is the one plan
  // that gets no upgrade prompt. Price ascending is the service's own order.
  const isTopTier = !!current && tiers.length > 0 && tiers[tiers.length - 1].id === current.id;

  return (
    <div>
      <BackButton onClick={() => navigate(-1)} />
      <Masthead
        title="Grow your client roster."
        blurb="Centium for professionals scales with how many clients you manage."
      />

      <div className="rounded-2xl bg-primary-pale px-4 py-3.5 mb-6 text-center">
        {planLoading ? (
          <p className="text-sm text-primary-dark">Checking your plan…</p>
        ) : planError ? (
          <p className="text-sm font-semibold text-status-high">{planError}</p>
        ) : effective ? (
          <>
            <p className="text-sm text-primary-dark">
              You're on <span className="font-bold">{effectiveTierLabel(effective)}</span>
            </p>
            <p className="text-xs text-primary-dark/80 mt-0.5">
              {capLabel(effective.tier, professionalClients.length)}
            </p>
            {/* WHOSE PLAN IT IS matters here in a way it does not elsewhere: a
                seated professional keeps this plan only while the affiliation
                lasts, which is not something to discover when it ends. */}
            {effective.source === "business_seat" && (
              <p className="text-[11px] text-primary-dark/70 mt-1">
                This plan comes with your business seat.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-primary-dark">Your plan couldn't be identified.</p>
        )}
      </div>

      <BillingToggle period={period} onChange={setPeriod} bestSaving={bestSavingAmong(tiers)} />

      {error && <p className="text-xs font-semibold text-status-high mb-4">{error}</p>}

      <div className="space-y-2.5 mb-6">
        {loading && <PlanSkeleton rows={4} />}
        {tiers.map((t) => (
          <PlanRow key={t.id} tier={t} period={period} isCurrent={current?.id === t.id} />
        ))}
      </div>

      <UpgradeFooter show={!isTopTier} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function BusinessSubscription() {
  const navigate = useNavigate();
  const { team: businessEmployees } = useBusinessTeam();
  const { tiers, loading, error } = useSubscriptionTiers("business");
  const { plan, loading: planLoading, error: planError } = useBusinessPlan();
  // WHICH PLAN A SEAT IS WORTH, read from the flag rather than written as
  // "Starter". is_business_seat_plan marks it and effective_professional_tier
  // resolves seated professionals to the same row, so naming it here would go
  // wrong the first time the seat plan moved. It is a PROFESSIONAL tier, which
  // is why this reads that list rather than the business one.
  const { tiers: professionalTiers } = useSubscriptionTiers("professional");
  const seatPlan = professionalTiers.find((t) => t.isBusinessSeatPlan) ?? null;
  const [period, setPeriod] = useState<BillingPeriod>("yearly");

  const base = tiers.find((t) => !t.isAddon) ?? null;
  const seat = tiers.find((t) => t.isAddon) ?? null;
  const perBlock = seat?.seatsPerUnit ?? 0;
  const seatsUsed = businessEmployees.length;

  return (
    <div>
      <BackButton onClick={() => navigate(-1)} />
      <Masthead
        title="Grow your team."
        blurb="A base plan, plus seats for the professionals who work with you."
      />

      <div className="rounded-2xl bg-primary-pale px-4 py-3.5 mb-6 text-center">
        {planLoading ? (
          <p className="text-sm text-primary-dark">Checking your plan…</p>
        ) : planError ? (
          <p className="text-sm font-semibold text-status-high">{planError}</p>
        ) : plan ? (
          <>
            <p className="text-sm text-primary-dark">
              You're on <span className="font-bold">{plan.base?.name ?? "Base"}</span>
              {plan.seatBlocks > 0 && (
                <>
                  {" "}
                  + {plan.seatBlocks} seat block{plan.seatBlocks === 1 ? "" : "s"}
                </>
              )}
            </p>
            {/* "N of M seats used" — M is blocks x seats per block, read from
                the add-on row rather than assumed to be five. */}
            <p className="text-xs text-primary-dark/80 mt-0.5">
              {seatsUsed} of {plan.totalSeats} seat{plan.totalSeats === 1 ? "" : "s"} used
            </p>
            {plan.seatBlocks > 0 && (
              <p className="text-[11px] text-primary-dark/70 mt-1">
                {formatPrice(plan.monthlyTotal)}/mo in total
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-primary-dark">Your plan couldn't be identified.</p>
        )}
      </div>

      <BillingToggle period={period} onChange={setPeriod} bestSaving={bestSavingAmong(tiers)} />

      {error && <p className="text-xs font-semibold text-status-high mb-4">{error}</p>}

      <div className="space-y-2.5 mb-4">
        {loading && <PlanSkeleton rows={2} />}
        {base && (
          <PlanRow
            tier={base}
            period={period}
            isCurrent={!!plan?.base}
            detail="The business account itself"
          />
        )}
        {seat && (
          <PlanRow
            tier={seat}
            period={period}
            isCurrent={false}
            detail={`${perBlock} professional${perBlock === 1 ? "" : "s"} per block`}
          />
        )}
      </div>

      {/* HOW THE TWO COMBINE, said in words. A base price and an add-on price
          in a list do not explain that one is bought repeatedly, or that a
          seat is worth a named plan to the professional sitting in it. */}
      {base && seat && (
        <div className="rounded-2xl bg-cream-soft px-4 py-3.5 mb-6">
          <p className="text-xs text-charcoal-soft leading-relaxed">
            {formatPrice(base.monthlyPrice)}/mo covers the business account. Each seat block is{" "}
            {formatPrice(seat.monthlyPrice)}/mo and seats {perBlock} professional
            {perBlock === 1 ? "" : "s"} — buy as many blocks as you need. Every seated professional
            gets the {seatPlan?.name ?? "seat"} plan for as long as they're on your team.
          </p>
        </div>
      )}

      <UpgradeFooter />
    </div>
  );
}

export default function Subscription() {
  const { user } = useApp();
  if (user.accountType === "professional") return <ProfessionalSubscription />;
  if (user.accountType === "business") return <BusinessSubscription />;
  return <ClientSubscription />;
}
