import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { PaymentMethodSheet } from "../../components/profile/PaymentMethodSheet";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { professionalTiers } from "../../data/professionalTiers";
import { businessTiers } from "../../data/businessTiers";
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

function ProfessionalSubscription() {
  const navigate = useNavigate();
  const { professionalTier, setProfessionalTier, professionalClients } = useApp();
  const [selected, setSelected] = useState(professionalTier);
  const [confirmed, setConfirmed] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [downgradeOpen, setDowngradeOpen] = useState(false);
  const [downgradeFeedback, setDowngradeFeedback] = useState("");

  const currentIdx = professionalTiers.findIndex((t) => t.id === professionalTier);
  const selectedIdx = professionalTiers.findIndex((t) => t.id === selected);
  const selectedIsFree = professionalTiers.find((t) => t.id === selected)?.price === "Free";
  const isDowngrade = selectedIdx < currentIdx;

  const confirm = () => {
    setProfessionalTier(selected);
    setConfirmed(true);
  };

  // QA 12.0: "The free version should not prompt you on any payment
  // modality because it is free." / "If the user were to downgrade back
  // to the basic and/or free package, prompt the user that we are sorry
  // for losing you and then ask for recommendations."
  const handlePrimaryAction = () => {
    if (isDowngrade) {
      setDowngradeOpen(true);
    } else if (selectedIsFree) {
      confirm();
    } else {
      setPaymentOpen(true);
    }
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
          Grow your client roster.
        </h1>
        <p className="text-charcoal-soft text-sm max-w-xs mx-auto">
          Centium Premium for professionals scales with how many clients you manage —
          you're currently at {professionalClients.length}.
        </p>
      </div>

      <div className="space-y-2.5 mb-6">
        {professionalTiers.map((t) => (
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
                {t.id === professionalTier && (
                  <span className="text-[10px] font-bold text-primary-dark bg-white rounded-full px-2 py-0.5">
                    CURRENT
                  </span>
                )}
              </div>
              <p className="text-xs text-charcoal-faint">
                {t.maxClients === null ? "Unlimited clients" : `Up to ${t.maxClients} clients`} · {t.price}
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

      <Button
        fullWidth
        size="lg"
        onClick={handlePrimaryAction}
        disabled={confirmed && selected === professionalTier}
      >
        {confirmed && selected === professionalTier
          ? "You're all set ✓"
          : selected === professionalTier
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
            Before you switch to {professionalTiers[selectedIdx].name}, would you tell us what didn't work,
            or what would've kept you on your current plan? It helps us improve.
          </p>
          <textarea
            value={downgradeFeedback}
            onChange={(e) => setDowngradeFeedback(e.target.value)}
            placeholder="Optional — e.g. too expensive, didn't need the extra client slots…"
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
            Confirm switch to {professionalTiers[selectedIdx].name}
          </Button>
        </div>
      </BottomSheet>
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
  const currentTier = businessDirectory.find((b) => b.id === user.businessId)?.tier ?? "starter";
  const [selected, setSelected] = useState(currentTier);
  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  const [confirmed, setConfirmed] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [downgradeOpen, setDowngradeOpen] = useState(false);
  const [downgradeFeedback, setDowngradeFeedback] = useState("");

  const currentIdx = businessTiers.findIndex((t) => t.id === currentTier);
  const selectedIdx = businessTiers.findIndex((t) => t.id === selected);
  const selectedIsFree = businessTiers.find((t) => t.id === selected)?.monthlyPrice === null;
  const isDowngrade = selectedIdx < currentIdx;

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

  const priceFor = (monthlyPrice: number | null) => {
    if (monthlyPrice === null) return "Free";
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

      <div className="space-y-2.5 mb-4">
        {businessTiers.map((t) => (
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
        disabled={confirmed && selected === currentTier}
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
            Before you switch to {businessTiers[selectedIdx].name}, would you tell us what didn't work, or
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
            Confirm switch to {businessTiers[selectedIdx].name}
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
