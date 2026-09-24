import React from "react";
import { useApp } from "../../context/AppContext";
import { useEffectiveProfessionalTier } from "../../hooks/useEffectiveProfessionalTier";
import { useMySubscriptionTier } from "../../hooks/useMySubscriptionTier";
import { useBusinessPlan } from "../../hooks/useBusinessPlan";
import { effectiveTierLabel } from "../../services/subscription-tiers";
import { businessPlanLabel, planLabel } from "../../services/subscription-tiers/pricing";

// The plan named under the account's name in the sidebar.
//
// THIS USED TO BE THE LITERAL "Free plan", on every page, for everybody. A
// professional on Starter through their gym's seat block read "Free plan"
// while the Subscription screen two clicks away read "Starter (via One Block
// Gym)". The string was never wired to anything.
//
// ONE HOOK PER ACCOUNT TYPE, SPLIT INTO THREE COMPONENTS. Hooks cannot be
// called conditionally, so a single component would have had to call all
// three — three reads on every page for every account, two of which can only
// ever answer "not you". Rendering one of three components conditionally is
// allowed where calling one of three hooks is not, and only the mounted one
// fetches.
//
// NOTHING IS SHOWN UNTIL SOMETHING IS KNOWN. Each branch returns null while
// loading and null on failure, so the line appears once and reads correctly,
// rather than flashing a plausible guess first. A wrong plan name is worse
// than no plan name: it is the difference between a professional not knowing
// their cap and believing the wrong one.

const Line: React.FC<{ children: string }> = ({ children }) => (
  <p className="text-charcoal-faint text-xs">{children}</p>
);

const ProfessionalPlanLine: React.FC = () => {
  const { effective, loading, error } = useEffectiveProfessionalTier();
  if (loading || error || !effective) return null;
  // Names the business when the plan came from a seat — "Starter (via One
  // Block Gym)" tells a professional which affiliation their cap depends on.
  return <Line>{effectiveTierLabel(effective)}</Line>;
};

const ClientPlanLine: React.FC = () => {
  const { resolved, loading, error } = useMySubscriptionTier("client");
  if (loading || error || !resolved) return null;
  // `resolved` already carries the free default when no subscription is held,
  // so this is Free or Premium without this file deciding which.
  return <Line>{planLabel(resolved.tier.name)}</Line>;
};

const BusinessPlanLine: React.FC = () => {
  const { plan, loading, error } = useBusinessPlan();
  if (loading || error || !plan) return null;
  return (
    <Line>
      {businessPlanLabel({
        active: plan.active,
        baseName: plan.base?.name ?? null,
        totalSeats: plan.totalSeats,
      })}
    </Line>
  );
};

export const PlanLine: React.FC = () => {
  const { user } = useApp();
  if (user.accountType === "professional") return <ProfessionalPlanLine />;
  if (user.accountType === "business") return <BusinessPlanLine />;
  return <ClientPlanLine />;
};
