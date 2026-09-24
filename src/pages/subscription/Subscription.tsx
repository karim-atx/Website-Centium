import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { PaymentMethodSheet } from "../../components/profile/PaymentMethodSheet";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { useSubscriptionTiers } from "../../hooks/useSubscriptionTiers";
import { useMySubscriptionTier } from "../../hooks/useMySubscriptionTier";
import { capLabel, tierLabel } from "../../services/subscription-tiers";
import { UPGRADE_ACTION_LABEL, upgradeMailto } from "../../services/subscription-tiers/upgrade";
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
  Check,
} from "lucide-react";
import clsx from "clsx";

/**
 * The price line for a professional tier.
 *
 * Built from the number rather than read from a string, because the string is
 * gone: professionalTiers.ts carried `price: "$14.99/month"` and the database
 * carries `monthly_price: 14.99`. Formatting here reproduces those labels
 * exactly, and leaves one copy of the figure rather than two.
 */
const monthlyLabel = (monthlyPrice: number) =>
  monthlyPrice === 0 ? "Free" : `$${monthlyPrice.toFixed(2)}/month`;

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

/**
 * The professional's plan, as it stands.
 *
 * READ-ONLY, AND THAT IS NOT A SIMPLIFICATION. This screen used to let a
 * professional pick a tier, walk a payment sheet and "confirm" it, which wrote
 * a string to localStorage and nothing else — subscription_states has no write
 * policy or grant for any client role, so nothing the browser did could change
 * the plan the database enforces. The two then disagreed: the screen said
 * Growth, the cap trigger still counted Starter's clients, and the refusal
 * arrived later with no explanation.
 *
 * So the purchase flow is gone rather than restyled, and what replaces it is
 * the one thing that works today — an email to support. It comes back when
 * there is a payment process to come back for.
 */
function ProfessionalSubscription() {
  const navigate = useNavigate();
  const { professionalClients } = useApp();
  const { tiers, loading, error } = useSubscriptionTiers("professional");
  const { resolved, loading: planLoading, error: planError } = useMySubscriptionTier("professional");

  const current = resolved?.tier ?? null;
  // The top of the ladder has nothing to upgrade to, so it is the one plan
  // that gets no upgrade prompt. Price ascending is the service's own order.
  const isTopTier = !!current && tiers.length > 0 && tiers[tiers.length - 1].id === current.id;

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="tap w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-soft mb-4"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="text-center mb-6 animate-fade-slide-up">
        {/* Design refinement §3c "Placements": full lockup — splash,
            subscription, share cards — replaces the icon-tile + separate
            wordmark line. */}
        <img src="/centium-lockup.png" alt="Centium" className="w-[104px] h-auto object-contain mx-auto mb-5" />
        <h1 className="font-display text-3xl font-semibold text-charcoal leading-tight mb-3">
          Grow your client roster.
        </h1>
        <p className="text-charcoal-soft text-sm max-w-xs mx-auto">
          Centium Premium for professionals scales with how many clients you manage.
        </p>
      </div>

      {/* THE PLAN, NAMED. Never "no subscription": an account with no
          subscription_states row is on the free default, which is a plan with
          a name and a cap, not an absence. */}
      <div className="rounded-2xl bg-primary-pale px-4 py-3.5 mb-6 text-center">
        {planLoading ? (
          <p className="text-sm text-primary-dark">Checking your plan…</p>
        ) : planError ? (
          <p className="text-sm font-semibold text-status-high">{planError}</p>
        ) : current ? (
          <>
            <p className="text-sm text-primary-dark">
              You're on <span className="font-bold">{tierLabel(current)}</span>
            </p>
            <p className="text-xs text-primary-dark/80 mt-0.5">
              {capLabel(current, professionalClients.length)}
            </p>
          </>
        ) : (
          // Only reachable when no professional tier carries is_default, which
          // the database treats as a misconfiguration and logs. Naming no plan
          // is better than naming the wrong one.
          <p className="text-sm text-primary-dark">Your plan couldn't be identified.</p>
        )}
      </div>

      {/* A FAILED READ IS SAID OUT LOUD, not rendered as an empty list. On the
          screen where someone looks at what they could pay for, "no plans" and
          "we couldn't fetch the plans" are not the same sentence, and only one
          of them is true. */}
      {error && <p className="text-xs font-semibold text-status-high mb-4">{error}</p>}

      <div className="space-y-2.5 mb-6">
        {loading &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border-2 border-charcoal/10 bg-cream-card px-4 py-4">
              <div className="h-3.5 w-24 rounded bg-charcoal/10 mb-2" />
              <div className="h-3 w-40 rounded bg-charcoal/[0.06]" />
            </div>
          ))}
        {tiers.map((t) => {
          const isCurrent = current?.id === t.id;
          return (
            <div
              key={t.id}
              className={clsx(
                "w-full flex items-center justify-between rounded-2xl px-4 py-4 border-2",
                isCurrent ? "border-primary bg-primary-pale" : "border-charcoal/10 bg-cream-card"
              )}
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-charcoal">{t.name}</p>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-primary-dark bg-white rounded-full px-2 py-0.5">
                      CURRENT
                    </span>
                  )}
                </div>
                <p className="text-xs text-charcoal-faint">
                  {t.maxClients === null ? "Unlimited clients" : `Up to ${t.maxClients} client${t.maxClients === 1 ? "" : "s"}`} ·{" "}
                  {monthlyLabel(t.monthlyPrice)}
                </p>
              </div>
              {isCurrent && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isTopTier && (
        <a
          href={upgradeMailto()}
          className="tap w-full flex items-center justify-center rounded-2xl bg-primary text-white text-base font-semibold h-14"
        >
          {UPGRADE_ACTION_LABEL}
        </a>
      )}
      <p className="text-[11px] text-charcoal-faint text-center mt-4">
        Plans can't be changed in the app yet — email us and we'll move you.
      </p>
    </div>
  );
}

// V9 (QA 9.0): monthly is the base rate; yearly/5-year are discounted
// multiples of it, same "longer commitment saves more" idea as the client
// UI's own Yearly/Monthly toggle above.
const billingPeriods = [
  { value: "monthly", label: "Monthly", months: 1, discount: 0 },
  { value: "yearly", label: "Yearly", months: 12, discount: 0.2 },
  { value: "5year", label: "Every 5 years", months: 60, discount: 0.35 },
] as const;
type BillingPeriod = (typeof billingPeriods)[number]["value"];

function BusinessSubscription() {
  const navigate = useNavigate();
  const { user, businessDirectory, updateMyBusinessTier } = useApp();
  const { tiers, loading, error } = useSubscriptionTiers("business");
  const currentTier = businessDirectory.find((b) => b.id === user.businessId)?.tier ?? "starter";
  const [selected, setSelected] = useState(currentTier);
  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  const [confirmed, setConfirmed] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [downgradeOpen, setDowngradeOpen] = useState(false);
  const [downgradeFeedback, setDowngradeFeedback] = useState("");

  const currentIdx = tiers.findIndex((t) => t.id === currentTier);
  const selectedIdx = tiers.findIndex((t) => t.id === selected);
  const selectedTier = selectedIdx >= 0 ? tiers[selectedIdx] : null;
  // `monthlyPrice` was nullable in businessTiers.ts, where null meant Free.
  // The column is NOT NULL and the free tier is 0.00, so free is a value now
  // rather than an absence — which also removes the case where a missing
  // price and a free one looked the same.
  const selectedIsFree = selectedTier?.monthlyPrice === 0;
  const isDowngrade = currentIdx >= 0 && selectedIdx >= 0 && selectedIdx < currentIdx;

  const confirm = () => {
    updateMyBusinessTier(selected);
    setConfirmed(true);
  };

  // QA 12.0: "The free version should not prompt you on any payment
  // modality... If the user were to downgrade... prompt the user that we
  // are sorry for losing you and then ask for recommendations."
  const handlePrimaryAction = () => {
    if (isDowngrade) {
      setDowngradeOpen(true);
    } else if (selectedIsFree) {
      confirm();
    } else {
      setPaymentOpen(true);
    }
  };

  const priceFor = (monthlyPrice: number) => {
    if (monthlyPrice === 0) return "Free";
    const { months, discount, label } = billingPeriods.find((p) => p.value === period)!;
    const total = monthlyPrice * months * (1 - discount);
    return `$${total.toFixed(2)} / ${label.toLowerCase()}`;
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="tap w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-soft mb-4"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="text-center mb-8 animate-fade-slide-up">
        {/* Design refinement §3c "Placements": full lockup — splash,
            subscription, share cards — replaces the icon-tile + separate
            wordmark line. */}
        <img src="/centium-lockup.png" alt="Centium" className="w-[104px] h-auto object-contain mx-auto mb-5" />
        <h1 className="font-display text-3xl font-semibold text-charcoal leading-tight mb-3">
          Grow your team.
        </h1>
        <p className="text-charcoal-soft text-sm max-w-xs mx-auto">
          Centium Premium for businesses scales with how many professionals affiliate with you.
        </p>
      </div>

      {/* V9 (QA 9.0): "should be monthly and yearly as well as every 5
          years" */}
      <div className="flex gap-2 mb-5">
        {billingPeriods.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={clsx(
              "tap flex-1 rounded-xl py-2.5 text-xs font-bold transition-colors",
              period === p.value ? "bg-primary text-white" : "bg-cream-soft text-charcoal-faint"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Same reasoning as the professional screen: an empty list and a failed
          read say different things, and only one of them is honest here. */}
      {error && <p className="text-xs font-semibold text-status-high mb-4">{error}</p>}

      <div className="space-y-2.5 mb-4">
        {loading &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border-2 border-charcoal/10 bg-cream-card px-4 py-4">
              <div className="h-3.5 w-24 rounded bg-charcoal/10 mb-2" />
              <div className="h-3 w-44 rounded bg-charcoal/[0.06]" />
            </div>
          ))}
        {tiers.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={clsx(
              "tap w-full flex items-center justify-between rounded-2xl px-4 py-4 border-2 transition-colors",
              selected === t.id ? "border-primary bg-primary-pale" : "border-charcoal/10 bg-cream-card"
            )}
          >
            <div className="text-left">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-charcoal">{t.name}</p>
                {t.id === currentTier && (
                  <span className="text-[10px] font-bold text-primary-dark bg-white rounded-full px-2 py-0.5">
                    CURRENT
                  </span>
                )}
              </div>
              <p className="text-xs text-charcoal-faint">
                {t.maxEmployees === null ? "Unlimited professionals" : `Up to ${t.maxEmployees} professionals`} ·{" "}
                {priceFor(t.monthlyPrice)}
              </p>
            </div>
            {selected === t.id && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* V9 (QA 9.0): "mention that we take 10% off of every listing sold
          in our market place, this feature is set and not part of the
          subscription plan" */}
      <p className="text-xs text-charcoal-faint bg-cream-soft rounded-2xl px-4 py-3 mb-6">
        Centium takes a flat 10% of every marketplace listing you sell — this applies at every tier and
        isn't part of the subscription plan above.
      </p>

      <Button
        fullWidth
        size="lg"
        onClick={handlePrimaryAction}
        // Disabled until the tiers are known, for the same reason as the
        // professional screen: no list means no way to tell a switch apart
        // from a purchase.
        disabled={(confirmed && selected === currentTier) || !selectedTier}
      >
        {confirmed && selected === currentTier
          ? "You're all set ✓"
          : selected === currentTier
          ? "Confirm tier"
          : isDowngrade
          ? "Switch package"
          : "Upgrade package"}
      </Button>
      <p className="text-[11px] text-charcoal-faint text-center mt-4">
        Prototype pricing for demo purposes — no payment will be processed.
      </p>
      <PaymentMethodSheet open={paymentOpen} onClose={() => setPaymentOpen(false)} onConfirm={confirm} />

      <BottomSheet open={downgradeOpen} onClose={() => setDowngradeOpen(false)} title="We're sorry to see you go">
        <div className="space-y-4 animate-fade-slide-up">
          <p className="text-sm text-charcoal-soft leading-relaxed">
            Before you switch to {selectedTier?.name ?? "that plan"}, would you tell us what didn't work, or
            what would've kept you on your current plan? It helps us improve.
          </p>
          <textarea
            value={downgradeFeedback}
            onChange={(e) => setDowngradeFeedback(e.target.value)}
            placeholder="Optional — e.g. too expensive, didn't need the extra professional slots…"
            rows={3}
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              confirm();
              setDowngradeOpen(false);
              setDowngradeFeedback("");
            }}
          >
            Confirm switch to {selectedTier?.name ?? "that plan"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

export default function Subscription() {
  const navigate = useNavigate();
  const { user, premiumPlan, setPremiumPlan } = useApp();
  const [plan, setPlan] = useState<"monthly" | "yearly">(premiumPlan ?? "yearly");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const confirmed = premiumPlan === plan;

  if (user.accountType === "professional") {
    return <ProfessionalSubscription />;
  }
  if (user.accountType === "business") {
    return <BusinessSubscription />;
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="tap w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-soft mb-4"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="text-center mb-8 animate-fade-slide-up">
        {/* Design refinement §3c "Placements": full lockup — splash,
            subscription, share cards — replaces the icon-tile + separate
            wordmark line. */}
        <img src="/centium-lockup.png" alt="Centium" className="w-[104px] h-auto object-contain mx-auto mb-5" />
        <h1 className="font-display text-3xl font-semibold text-charcoal leading-tight mb-3">
          Your health, without the limits.
        </h1>
        <p className="text-charcoal-soft text-sm max-w-xs mx-auto">
          Unlock the full Centium experience with AI-powered logging and deeper insights.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {features.map((f) => (
          <div key={f.label} className="flex items-center gap-2.5 bg-cream-card rounded-2xl px-3.5 py-3 shadow-soft animate-fade-slide-up">
            <f.icon size={16} className="text-primary shrink-0" />
            <span className="text-xs font-medium text-charcoal leading-tight">{f.label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2.5 mb-6">
        <button
          onClick={() => setPlan("yearly")}
          className={clsx(
            "tap w-full flex items-center justify-between rounded-2xl px-4 py-4 border-2 transition-colors",
            plan === "yearly" ? "border-primary bg-primary-pale" : "border-charcoal/10 bg-cream-card"
          )}
        >
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-charcoal">Yearly</p>
              <span className="text-[10px] font-bold text-white bg-teal rounded-full px-2 py-0.5">
                SAVE 30%
              </span>
            </div>
            <p className="text-xs text-charcoal-faint">$49.99/year · billed annually</p>
          </div>
          {plan === "yearly" && (
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Check size={12} className="text-white" strokeWidth={3} />
            </div>
          )}
        </button>

        <button
          onClick={() => setPlan("monthly")}
          className={clsx(
            "tap w-full flex items-center justify-between rounded-2xl px-4 py-4 border-2 transition-colors",
            plan === "monthly" ? "border-primary bg-primary-pale" : "border-charcoal/10 bg-cream-card"
          )}
        >
          <div className="text-left">
            <p className="text-sm font-bold text-charcoal">Monthly</p>
            <p className="text-xs text-charcoal-faint">$5.99/month</p>
          </div>
          {plan === "monthly" && (
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Check size={12} className="text-white" strokeWidth={3} />
            </div>
          )}
        </button>
      </div>

      <Button fullWidth size="lg" onClick={() => setPaymentOpen(true)} disabled={confirmed}>
        {confirmed ? "You're on the list ✓" : "Continue"}
      </Button>
      <p className="text-[11px] text-charcoal-faint text-center mt-4">
        Prototype pricing for demo purposes — no payment will be processed.
      </p>
      <PaymentMethodSheet open={paymentOpen} onClose={() => setPaymentOpen(false)} onConfirm={() => setPremiumPlan(plan)} />
    </div>
  );
}
