import React from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { UPGRADE_ACTION_LABEL } from "../../services/subscription-tiers/upgrade";
import { FREE_PERIOD_ENDED, freePeriodLine, type FreePeriodFacts } from "../../services/subscription-tiers/freePeriodCopy";

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
      {line}
    </p>
  );
};

/** The friendly stop shown wherever a new connection would be attempted. */
export const FreePeriodEnded: React.FC<{ className?: string; onContact?: () => void }> = ({ className, onContact }) => (
  <div className={`rounded-2xl bg-primary-pale px-4 py-3.5 ${className ?? ""}`} role="status">
    <p className="text-sm font-semibold text-charcoal">{FREE_PERIOD_ENDED}</p>
    <Link
      to="/contact"
      onClick={onContact}
      className="tap inline-flex items-center mt-1.5 text-sm font-bold text-primary-deep-text underline"
    >
      {UPGRADE_ACTION_LABEL}
    </Link>
  </div>
);
