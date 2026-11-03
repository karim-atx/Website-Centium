import React from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { UPGRADE_ACTION_LABEL } from "../../services/subscription-tiers/upgrade";
import { FREE_PERIOD_ENDED, freePeriodLine, type FreePeriodFacts } from "../../services/subscription-tiers/freePeriodCopy";
import { t } from "../../i18n/core";
import { useProPlanInApp } from "../../services/premium/hooks";
import { proPlanPath } from "../../services/premium/model";
import { BuyInApp } from "../premium/BuyInApp";

/**
 * Task G: the Free plan's month for connecting new clients.
 *
 * Inside the month: "Free plan: 12 days left to connect clients". After it:
 * FREE_PERIOD_ENDED with "Contact us to upgrade", which goes to the contact
 * form because there is no checkout yet (see subscription-tiers/upgrade).
 * Nothing at all for a paid or seated professional, or while the plan is
 * unknown. Existing clients are never mentioned: they stay connected.
 */
export const FreePeriodNotice: React.FC<{ plan: FreePeriodFacts | null; className?: string }> = ({
  plan,
  className,
}) => {
  if (!plan) return null;
  if (!plan.mayConnectClients) return <FreePeriodEnded className={className} />;
  const line = freePeriodLine(plan);
  if (!line) return null;
  return (
    <p className={`flex items-center gap-1.5 text-xs font-semibold text-charcoal-soft ${className ?? ""}`}>
      <Clock size={13} className="shrink-0" aria-hidden />
      {t(line)}
    </p>
  );
};

/**
 * The friendly stop shown wherever a new connection would be attempted.
 * Round G5: while plans_in_app the plan is bought in the Centium app, so the
 * Buy block replaces the contact link; off, loading or no G5: today's link.
 */
export const FreePeriodEnded: React.FC<{ className?: string; onContact?: () => void }> = ({ className, onContact }) => {
  const viaApp = proPlanPath(useProPlanInApp()) === "app";
  return (
    <div className={`rounded-2xl bg-primary-pale px-4 py-3.5 ${className ?? ""}`} role="status">
      <p className="text-sm font-semibold text-charcoal">{t(FREE_PERIOD_ENDED)}</p>
      {viaApp ? (
        // undrawn (Round G, no handover): G5's Buy block in place of the contact link.
        <BuyInApp product="professional_plan" line={null} compact className="mt-2.5 !shadow-none" />
      ) : (
        <Link
          to="/contact"
          onClick={onContact}
          className="tap inline-flex items-center mt-1.5 text-sm font-bold text-primary-deep-text underline"
        >
          {t(UPGRADE_ACTION_LABEL)}
        </Link>
      )}
    </div>
  );
};
