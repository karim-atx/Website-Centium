import React, { useState } from "react";
import { Check, Crown, Droplet, Dumbbell, Flame, LineChart, Mic, Sparkles, TrendingUp, Users } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useBack } from "../../hooks/useBack";
import { useSubscriptionTiers } from "../../hooks/useSubscriptionTiers";
import { useMySubscriptionTier } from "../../hooks/useMySubscriptionTier";
import { formatPrice, monthlyEquivalent, NO_PAYMENTS_NOTE, planLabel, priceLabel, savingLabel, yearlySaving, type BillingPeriod } from "../../services/subscription-tiers/pricing";
import { UPGRADE_ACTION_LABEL, upgradeMailto } from "../../services/subscription-tiers/upgrade";
import { RefundPolicyLink } from "../../components/legal/RefundPolicyLink";
import { usePremium } from "../../services/premium/hooks";
import { memberStatus, planPageFeatureSource, premiumOn, showBuyInApp } from "../../services/premium/model";
import { BuyInApp } from "../../components/premium/BuyInApp";
import { PremiumFeatureList } from "../../components/premium/PremiumFeatureList";
import { PremiumStatusCard } from "../../components/premium/PremiumStatusCard";
import { CentiumMark } from "../../components/icons/CentiumMark";
import { t, tk } from "../../i18n/core";
import { Slot } from "./PlanRows";
import { MoPage } from "../profile/web/moWeb";
import Subscription from "./Subscription";

// Website viewport v1 · WC-MO.6 Centium Premium (WC-MO More Web v7, frames
// WC-MO.6_filled-yearly / _filled-monthly / _empty-checking-your-plan). REPO
// CHANGED: today's mobile plan page (tiers, the plan named, Premium status,
// the store's Buy in app, the refund policy link) in the web layout. Two
// columns 24 apart over three bands (rows min-content 1.45fr / auto /
// min-content 1fr, 24 apart): the crown over the centred C, the 40/48 title
// and its 17/24 line | the Monthly / Yearly toggle (40, r12) over the plan
// cards (r16, 2px border, name 28/36 600); the plan line (r16 #F0EDF9, 17/24
// #7D6BB5) | the 44 CTA and its note; then the eight features as a 2-column
// grid of white cards (r16, min 44, 17/24, a 20 #AEA1DC glyph).

const FEATURES = [
  { icon: Mic, label: tk("AI food logging") },
  { icon: LineChart, label: tk("Advanced nutrition insights") },
  { icon: TrendingUp, label: tk("Advanced progress tracking") },
  { icon: Droplet, label: tk("Bloodwork history") },
  { icon: Dumbbell, label: tk("Advanced workout analytics") },
  { icon: Users, label: tk("Professional sharing") },
  { icon: Flame, label: tk("Streak & achievement tracking") },
  { icon: Sparkles, label: tk("Personalized insights") },
];

/** The best saving on offer, for the toggle's badge (as the mobile page). */
function bestSavingAmong(tiers: { monthlyPrice: number; yearlyPrice: number | null }[]): number | null {
  const percents = tiers.map((x) => yearlySaving(x.monthlyPrice, x.yearlyPrice)?.percent).filter((p): p is number => p != null);
  return percents.length > 0 ? Math.max(...percents) : null;
}

const PILL: React.CSSProperties = { borderRadius: 999, padding: "2px 10px", fontSize: 13, lineHeight: "20px", fontWeight: 700, whiteSpace: "nowrap" };

function ClientSubscriptionWeb() {
  const back = useBack();
  const { tiers, loading, error } = useSubscriptionTiers("client");
  const { resolved, loading: planLoading, error: planError } = useMySubscriptionTier("client");
  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  const { premium } = usePremium();
  const status = memberStatus(premium);
  const current = resolved?.tier ?? null;
  const isTopTier = !!current && tiers.length > 0 && tiers[tiers.length - 1].id === current.id;
  const best = bestSavingAmong(tiers);
  const checking = loading && tiers.length === 0;

  const planLine = planLoading ? (
    t("Checking your plan…")
  ) : planError ? (
    <span style={{ fontWeight: 600, color: "#C0392B" }}>{t(planError)}</span>
  ) : current ? (
    <Slot text={t("You're on {plan}")} slot="plan">
      <span>{planLabel(current.name)}</span>
    </Slot>
  ) : (
    t("Your plan couldn't be identified.")
  );

  return (
    <MoPage title={t("Centium Premium")} sub={t("AI logging, deeper insights & rewards")} onBack={back} frame="premium">
      <div
        data-prem="grid"
        className="flex-1 min-h-0 w-full grid overflow-y-auto"
        style={{ marginTop: 8, gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gridTemplateRows: "minmax(min-content,1.45fr) auto minmax(min-content,1fr)", columnGap: 24, rowGap: 24, scrollbarWidth: "none" }}
      >
        {/* Band A, start: the crown over the centred C, the title and its line. */}
        <div data-band="A" className="min-w-0 min-h-0 flex flex-col items-center text-center" style={{ justifyContent: "space-evenly", gap: 12 }}>
          <div data-emblem="crown-c" role="img" aria-label={t("Centium Premium")} className="shrink-0 flex flex-col items-center" style={{ gap: 8 }}>
            <Crown size={40} strokeWidth={1.75} style={{ color: "#B08D3C" }} aria-hidden />
            <CentiumMark height={100} framing="png" />
          </div>
          <h2 style={{ margin: 0, fontSize: 40, lineHeight: "48px", fontWeight: 700, letterSpacing: "-0.02em", color: "#241F1B", textWrap: "balance" } as React.CSSProperties}>
            {t("Your health, without the limits.")}
          </h2>
          <p style={{ margin: 0, maxWidth: 440, fontSize: 17, lineHeight: "24px", color: "#5B5349", textWrap: "balance" } as React.CSSProperties}>
            {t("Unlock the full Centium experience with AI-powered logging and deeper insights.")}
          </p>
        </div>

        {/* Band A, end: the period toggle and the plan cards. */}
        <div data-band="A" className="min-w-0 min-h-0 flex flex-col" style={{ gap: 12 }}>
          <div className="shrink-0 flex" style={{ gap: 8 }}>
            {(["monthly", "yearly"] as BillingPeriod[]).map((p) => {
              const on = period === p;
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPeriod(p)}
                  className="flex-1 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:outline-offset-2"
                  style={{ height: 40, borderRadius: 12, gap: 6, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#9A8CD6" : "#F5F5F6", color: on ? "#FFFFFF" : "#8C8378" }}
                >
                  {p === "monthly" ? t("Monthly") : t("Yearly")}
                  {p === "yearly" && best != null && !checking && (
                    <span style={{ borderRadius: 999, padding: "1px 6px", fontSize: 11, fontWeight: 700, background: on ? "rgba(255,255,255,0.2)" : "#6F9993", color: "#FFFFFF" }}>−{best}%</span>
                  )}
                </button>
              );
            })}
          </div>
          {error && (
            <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#C0392B" }}>
              {t(error)}
            </p>
          )}
          {checking &&
            [0, 1].map((i) => (
              <div key={i} data-p="plan" aria-hidden style={{ flex: "1 1 0", minHeight: 112, boxSizing: "border-box", display: "flex", alignItems: "center", borderRadius: 16, padding: "16px 24px", border: "2px solid rgba(36,31,27,0.1)", background: "#FAFAFB", opacity: 0.6 }}>
                <span style={{ fontSize: 28, lineHeight: "36px", fontWeight: 600, color: "#241F1B" }}>–</span>
              </div>
            ))}
          {tiers.map((tier) => {
            const isCurrent = current?.id === tier.id;
            const saving = tier.yearlyPrice != null ? yearlySaving(tier.monthlyPrice, tier.yearlyPrice) : null;
            const detail = tier.monthlyPrice === 0 ? t("Everything you need to start") : t("Every feature above");
            return (
              <div
                key={tier.id}
                data-p="plan"
                className="flex items-stretch"
                style={{ flex: "1 1 0", minHeight: 112, boxSizing: "border-box", gap: 12, borderRadius: 16, padding: "16px 24px", border: `2px solid ${isCurrent ? "#AEA1DC" : "rgba(36,31,27,0.1)"}`, background: isCurrent ? "#F0EDF9" : "#FFFFFF" }}
              >
                <div className="flex-1 min-w-0 flex flex-col" style={{ justifyContent: "space-evenly" }}>
                  <div className="flex items-center flex-wrap" style={{ gap: 12 }}>
                    <span style={{ fontSize: 28, lineHeight: "36px", fontWeight: 600, letterSpacing: "-0.01em", color: "#241F1B" }}>{tier.name}</span>
                    {isCurrent && <span style={{ ...PILL, background: "#FFFFFF", color: "#7D6BB5" }}>{t("CURRENT")}</span>}
                    {period === "yearly" && saving && <span style={{ ...PILL, background: "#6F9993", color: "#FFFFFF" }}>{savingLabel(saving)}</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: 17, lineHeight: "24px", color: "#8C8378" }}>{[detail, priceLabel(tier.monthlyPrice, tier.yearlyPrice, period)].filter(Boolean).join(" · ")}</p>
                  {period === "yearly" && tier.yearlyPrice != null && tier.monthlyPrice > 0 && (
                    <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>{t("{price}/mo, billed yearly", { price: formatPrice(monthlyEquivalent(tier.yearlyPrice)) })}</p>
                  )}
                </div>
                {isCurrent && (
                  <span aria-hidden className="shrink-0 self-center grid place-items-center" style={{ width: 20, height: 20, borderRadius: 999, background: "#AEA1DC" }}>
                    <Check size={12} strokeWidth={3} style={{ color: "#FFFFFF" }} />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Band B, start: the plan named (or the Premium status card). */}
        {status ? (
          <div data-band="B" className="min-w-0">
            <PremiumStatusCard />
          </div>
        ) : (
          <div data-band="B" role="status" className="min-w-0 grid place-items-center text-center" style={{ boxSizing: "border-box", minHeight: 44, borderRadius: 16, background: "#F0EDF9", padding: "10px 16px", fontSize: 17, lineHeight: "24px", color: "#7D6BB5" }}>
            <span>{planLine}</span>
          </div>
        )}

        {/* Band B, end: the upgrade path (or Buy in app), the note and the refund policy. */}
        <div data-band="B" className="min-w-0 flex flex-col" style={{ gap: 8 }}>
          {showBuyInApp(premium) && premium ? (
            <BuyInApp product="premium" monthly={premium.monthlyPrice} yearly={premium.yearlyPrice} trialDays={premium.trialDays} />
          ) : premiumOn(premium) ? null : (
            <>
              {!isTopTier && (
                <a
                  href={upgradeMailto()}
                  className="shrink-0 flex items-center justify-center no-underline hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:outline-offset-2"
                  style={{ height: 44, borderRadius: 12, background: "#9A8CD6", color: "#FFFFFF", fontSize: 17, lineHeight: "24px", fontWeight: 600 }}
                >
                  {t(UPGRADE_ACTION_LABEL)}
                </a>
              )}
              <p className="text-center" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                {t(NO_PAYMENTS_NOTE)}
              </p>
              <p className="text-center" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                <RefundPolicyLink />
              </p>
            </>
          )}
        </div>

        {/* Band C: the features (the Premium feature list when Premium is on). */}
        {planPageFeatureSource(premium) === "features" ? (
          <div data-band="C" style={{ gridColumn: "1 / -1" }}>
            <PremiumFeatureList />
          </div>
        ) : (
          <div data-band="C" data-p="feats" className="min-h-0 grid" style={{ gridColumn: "1 / -1", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gridAutoRows: "minmax(44px,1fr)", columnGap: 24, rowGap: 16 }}>
            {FEATURES.map((f) => (
              <div
                key={f.label}
                data-feat="row"
                className="min-w-0 flex items-center"
                style={{ gap: 14, borderRadius: 16, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(36,31,27,0.08),0 0 0 0.5px rgba(36,31,27,0.06)", padding: "0 24px" }}
              >
                <f.icon size={20} style={{ color: "#AEA1DC" }} aria-hidden className="shrink-0" />
                <span title={t(f.label)} className="min-w-0 whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 17, lineHeight: "24px", color: "#241F1B" }}>
                  {t(f.label)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </MoPage>
  );
}

/** /app/subscription from 1024px: a client's Centium Premium; business and professional accounts keep theirs. */
export default function SubscriptionWeb() {
  const { user } = useApp();
  if (user.accountType !== "customer") return <Subscription />;
  return <ClientSubscriptionWeb />;
}
