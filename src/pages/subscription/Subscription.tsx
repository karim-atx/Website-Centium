import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { useSubscriptionTiers } from "../../hooks/useSubscriptionTiers";
import { useMySubscriptionTier } from "../../hooks/useMySubscriptionTier";
import { useBusinessPlan } from "../../hooks/useBusinessPlan";
import { useBillingPeriod, usePeriodPrices } from "../../hooks/useCentiumBilling";
import { NOT_AVAILABLE, noPriceText, periodPriceText, periodSuffix, renewalAfterSwitch, renewalDayText, switchConfirm, switchedText } from "../../services/centium-billing/period";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { useBusinessTeam } from "../../hooks/useBusinessTeam";
import {
  formatPrice,
  yearlySaving,
  NO_PAYMENTS_NOTE,
  planLabel,
  type BillingPeriod,
} from "../../services/subscription-tiers/pricing";
import { UPGRADE_ACTION_LABEL, upgradeMailto } from "../../services/subscription-tiers/upgrade";
import { BillingToggle, PlanRow, PlanSkeleton } from "./PlanRows";
import { useBack } from "../../hooks/useBack";
import { CentiumLockup } from "../../components/icons/CentiumMark";
import ProSubscription from "../pro/more/ProSubscription";
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
  CalendarRange,
} from "lucide-react";

// The subscription screen, for client and business accounts (professionals:
// pages/pro/more/ProSubscription, MO24 v3).
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
//
// ONE EXCEPTION, AND IT IS A REAL WRITE (Batch 2 · CS): a business that holds
// the plan chooses monthly or yearly through set_subscription_billing_period,
// which the database owns. The tier itself is still changed by the Centium
// team, not here.

const features = [
  { icon: Mic, label: "AI food logging" },
  { icon: LineChart, label: "Advanced nutrition insights" },
  { icon: TrendingUp, label: "Advanced progress tracking" },
  { icon: Droplet, label: "Bloodwork history" },
  { icon: Dumbbell, label: "Advanced workout analytics" },
  { icon: Users, label: "Professional sharing" },
  // "Streak rewards" WAS A PAID FEATURE THAT DOES NOT EXIST. Nothing is
  // awarded for a streak, to a subscriber or to anyone else — streaks feed the
  // consistency achievements, which every account earns on the same terms and
  // which are not part of a plan. Listing it under what Premium buys made it a
  // claim about the purchase.
  { icon: Flame, label: "Streak & achievement tracking" },
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
        share cards — replaces the icon-tile + separate wordmark line.
        v6 (TK 4.8): the vector lockup, same canvas, 104 wide. */}
    <CentiumLockup width={104} className="mx-auto mb-5" />
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
        className="tap w-full flex items-center justify-center rounded-2xl bg-primary-fill text-on-primary-fill text-base font-semibold h-14"
      >
        {UPGRADE_ACTION_LABEL}
      </a>
    )}
    <p className="text-[11px] text-charcoal-faint text-center mt-4">{NO_PAYMENTS_NOTE}</p>
  </>
);

const otherPeriod = (p: BillingPeriod): BillingPeriod => (p === "monthly" ? "yearly" : "monthly");

/** The best saving on offer, for the toggle's badge. Null when none qualifies. */
function bestSavingAmong(tiers: { monthlyPrice: number; yearlyPrice: number | null }[]): number | null {
  const percents = tiers
    .map((t) => yearlySaving(t.monthlyPrice, t.yearlyPrice)?.percent)
    .filter((p): p is number => p != null);
  return percents.length > 0 ? Math.max(...percents) : null;
}

// ---------------------------------------------------------------------------

function ClientSubscription() {
  const back = useBack();
  const { tiers, loading, error } = useSubscriptionTiers("client");
  const { resolved, loading: planLoading, error: planError } = useMySubscriptionTier("client");
  const [period, setPeriod] = useState<BillingPeriod>("yearly");

  const current = resolved?.tier ?? null;
  const isTopTier = !!current && tiers.length > 0 && tiers[tiers.length - 1].id === current.id;

  return (
    <div>
      <BackButton onClick={back} />
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
            You're on <span className="font-bold">{planLabel(current.name)}</span>
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

function BusinessSubscription() {
  const back = useBack();
  const { authUserId } = useApp();
  const { team: businessEmployees } = useBusinessTeam();
  const { tiers, loading, error } = useSubscriptionTiers("business");
  const { plan, loading: planLoading, error: planError } = useBusinessPlan();
  // WHICH PLAN A SEAT IS WORTH, read from the flag rather than written as
  // "Starter". is_business_seat_plan marks it and my_effective_professional_tier
  // resolves seated professionals to the same row, so naming it here would go
  // wrong the first time the seat plan moved. It is a PROFESSIONAL tier, which
  // is why this reads that list rather than the business one.
  const { tiers: professionalTiers } = useSubscriptionTiers("professional");
  const seatPlan = professionalTiers.find((t) => t.isBusinessSeatPlan) ?? null;

  const base = tiers.find((t) => !t.isAddon) ?? null;
  const seat = tiers.find((t) => t.isAddon) ?? null;
  const perBlock = seat?.seatsPerUnit ?? 0;
  const seatsUsed = businessEmployees.length;

  // Batch 2 · CS: MONTHLY OR YEARLY IS A REAL CHOICE for the business that
  // holds the plan. This screen is the business account's own, so its own
  // subscription is the business's; useBillingPeriod still checks the row is a
  // business base plan before offering anything. For the owner the toggle is
  // the choice (set_subscription_billing_period, confirmed first); for a
  // business without a plan it stays the comparison it was.
  //
  // EVERY PRICE IS subscription_price_for. NULL reads "Not available" and that
  // period can't be chosen. No saving, no "months free", no monthly x 12: the
  // Base tier's yearly price is undecided, so nothing here compares the two.
  const own = useBillingPeriod(authUserId ?? null, true);
  const ownSub = own.sub;
  const list = usePeriodPrices([base?.rowId, seat?.rowId]);
  // Monthly while the Base tier's yearly price is undecided (lead, Batch 2).
  const [viewPeriod, setViewPeriod] = useState<BillingPeriod>("monthly");
  const [ask, setAsk] = useState<{ to: BillingPeriod; price: number; at: Date } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "done" | "error"; text: string } | null>(null);

  const chooses = !!ownSub && !!own.prices;
  const period: BillingPeriod = ownSub ? ownSub.period : viewPeriod;
  const priceOf = (rowId: string | undefined, p: BillingPeriod): number | null | undefined => (rowId ? list.prices?.get(rowId)?.[p] : undefined);
  const rowPrice = (rowId: string | undefined): string | undefined => {
    const v = priceOf(rowId, period);
    if (v === undefined) return undefined;
    return v === null ? NOT_AVAILABLE : `${formatPrice(v)}${periodSuffix(period)}`;
  };
  const ownTotal = ownSub && own.prices ? own.prices[ownSub.period] : undefined;

  const pick = (p: BillingPeriod) => {
    setNote(null);
    if (!chooses || !ownSub || !own.prices) return setViewPeriod(p);
    if (p === ownSub.period) return;
    const price = own.prices[p];
    if (price === null) return;
    setAsk({ to: p, price, at: renewalAfterSwitch(new Date(), p) });
  };
  const confirm = ask ? switchConfirm({ to: ask.to, price: ask.price, seatBlocks: ownSub?.seatBlocks ?? 0, renewal: ask.at, money: formatPrice }) : null;
  const doSwitch = async () => {
    if (!ask || busy) return;
    setBusy(true);
    const r = await own.choose(ask.to);
    setBusy(false);
    setAsk(null);
    setNote(r.ok ? { tone: "done", text: switchedText(r.value.period, r.value.renewsAt) } : { tone: "error", text: r.message });
    own.reload();
  };

  // The combined sentence, at the period shown when both prices exist for it,
  // otherwise at the monthly ones the function returns.
  const sentencePeriod: BillingPeriod = priceOf(base?.rowId, period) != null && priceOf(seat?.rowId, period) != null ? period : "monthly";
  const sentenceBase = priceOf(base?.rowId, sentencePeriod);
  const sentenceSeat = priceOf(seat?.rowId, sentencePeriod);

  return (
    <div>
      <BackButton onClick={back} />
      <Masthead
        title="Grow your team."
        blurb="A base plan, plus seats for the professionals who work with you."
      />

      <div className="rounded-2xl bg-primary-pale px-4 py-3.5 mb-6 text-center">
        {planLoading ? (
          <p className="text-sm text-primary-dark">Checking your plan…</p>
        ) : planError ? (
          <p className="text-sm font-semibold text-status-high">{planError}</p>
        ) : plan && !plan.active ? (
          // NO SUBSCRIPTION, SAID PLAINLY. This branch used to fall through to
          // the one below, which read "You're on Base · 0 of 0 seats used" off
          // the tier reference row — telling a business that has never paid
          // anything that it is on a plan, on the screen whose job is to sell
          // it one.
          <p className="text-sm text-primary-dark">
            You're not on a plan yet. Pick one below.
          </p>
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
            {/* What it costs, at the period it is billed: the plan plus its
                seat blocks from subscription_price_for. */}
            {ownSub && ownTotal !== undefined && (
              <p className="text-[11px] text-primary-dark/70 mt-1">
                {[
                  `Billed ${ownSub.period}`,
                  ownTotal === null ? "price not available" : `${formatPrice(ownTotal)}${periodSuffix(ownSub.period)} in total`,
                  ownSub.renewsAt ? `renews ${renewalDayText(ownSub.renewsAt)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-primary-dark">Your plan couldn't be identified.</p>
        )}
      </div>

      {own.error && <RetryLine message={own.error} onRetry={own.reload} />}
      <BillingToggle
        period={period}
        onChange={pick}
        label={chooses ? "How you're billed" : undefined}
        notes={
          chooses && ownSub && own.prices
            ? { monthly: periodPriceText(own.prices.monthly, "monthly", formatPrice), yearly: periodPriceText(own.prices.yearly, "yearly", formatPrice) }
            : undefined
        }
        disabled={chooses && own.prices ? { monthly: own.prices.monthly === null, yearly: own.prices.yearly === null } : undefined}
      />
      {chooses && ownSub && own.prices && (
        <p className="text-[11px] text-charcoal-faint -mt-3 mb-4 text-center">
          {own.prices[otherPeriod(ownSub.period)] === null
            ? noPriceText(otherPeriod(ownSub.period))
            : "Seat blocks follow your plan's billing. Switching charges nothing now."}
        </p>
      )}
      {note && (
        <p role={note.tone === "error" ? "alert" : "status"} className={`text-xs font-semibold mb-4 text-center ${note.tone === "error" ? "text-status-high" : "text-primary-dark"}`}>
          {note.text}
        </p>
      )}

      {error && <p className="text-xs font-semibold text-status-high mb-4">{error}</p>}
      {list.error && <RetryLine message={list.error} onRetry={list.reload} />}

      <div className="space-y-2.5 mb-4">
        {loading && <PlanSkeleton rows={2} />}
        {base && (
          <PlanRow
            tier={base}
            period={period}
            // `active`, NOT `base`. plan.base is the tier reference row,
            // which is filled in for every business account whether or not it
            // holds anything — so this badge used to read CURRENT even for a
            // business with no subscription at all, on the very screen meant
            // to sell it one.
            isCurrent={plan?.active === true}
            detail="The business account itself"
            priceText={rowPrice(base.rowId)}
            compare={false}
          />
        )}
        {seat && (
          <PlanRow
            tier={seat}
            period={period}
            isCurrent={false}
            detail={`${perBlock} professional${perBlock === 1 ? "" : "s"} per block`}
            priceText={rowPrice(seat.rowId)}
            compare={false}
          />
        )}
      </div>

      {/* HOW THE TWO COMBINE, said in words. A base price and an add-on price
          in a list do not explain that one is bought repeatedly, or that a
          seat is worth a named plan to the professional sitting in it. */}
      {base && seat && sentenceBase != null && sentenceSeat != null && (
        <div className="rounded-2xl bg-cream-soft px-4 py-3.5 mb-6">
          <p className="text-xs text-charcoal-soft leading-relaxed">
            {formatPrice(sentenceBase)}{periodSuffix(sentencePeriod)} covers the business account. Each seat block is{" "}
            {formatPrice(sentenceSeat)}{periodSuffix(sentencePeriod)} and seats {perBlock} professional
            {perBlock === 1 ? "" : "s"}. Buy as many blocks as you need. Every seated professional
            gets the {seatPlan?.name ?? "seat"} plan for as long as they're on your team.
          </p>
        </div>
      )}

      <UpgradeFooter />

      <ConfirmCard
        open={!!ask}
        layout="stacked"
        frame="kit"
        tone="primary"
        icon={<CalendarRange size={20} strokeWidth={2.2} />}
        title={confirm?.title ?? ""}
        subtitle={confirm?.body}
        confirmLabel={confirm?.action}
        cancelLabel="Keep my billing"
        busy={busy}
        onCancel={() => setAsk(null)}
        onConfirm={() => void doSwitch()}
      />
    </div>
  );
}

/** A failed read, said with its own Retry (44px). */
const RetryLine: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="flex items-center justify-between gap-3 mb-4">
    <p className="text-xs font-semibold text-status-high">{message}</p>
    <button type="button" onClick={onRetry} className="tap shrink-0 min-h-[44px] px-2 text-xs font-bold text-primary-dark">
      Retry
    </button>
  </div>
);

export default function Subscription() {
  const { user } = useApp();
  // Release 3 W6 · MO24 v3: the professional screen lives in pages/pro/more.
  if (user.accountType === "professional") return <ProSubscription />;
  if (user.accountType === "business") return <BusinessSubscription />;
  return <ClientSubscription />;
}
