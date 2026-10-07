import React from "react";
import { Link } from "react-router-dom";
import { UPGRADE_ACTION_LABEL, upgradeMailto } from "../../services/subscription-tiers/upgrade";
import { FREE_PERIOD_ENDED } from "../../services/subscription-tiers/freePeriodCopy";
import type { HireGate } from "../../services/hires/proLogic";

// A3: tells a professional, in their own console, that clients cannot hire
// them right now — before a client meets the hire sheet's "not taking new
// clients right now" (ATXA0, which deliberately gives the client no reason).
//
// The gate comes from hireGate() (services/hires/proLogic), derived from what
// the app can read, because professional_can_take_client() is granted to
// nobody. Here, unlike to a client, it says WHICH gate.
//
// UNSPECIFIED BY THE HANDOVER: no frame draws it. It reuses FreePeriodEnded's
// panel (rounded-2xl primary-pale, 14px semibold line, the upgrade link) so
// the console has one way of saying "you can't take new clients".

export const HireAvailabilityNotice: React.FC<{
  gate: HireGate;
  /** "Free", "Starter (via Iron Works)" … for the cap sentence. */
  planLabel?: string | null;
  /** "1 of 1 client used", from capLabel. */
  capLine?: string | null;
  className?: string;
}> = ({ gate, planLabel, capLine, className }) => {
  if (!gate) return null;
  return (
    <div className={`rounded-2xl bg-primary-pale px-4 py-3.5 ${className ?? ""}`} role="status">
      {gate === "free_period" ? (
        <>
          <p className="text-sm font-semibold text-charcoal">{FREE_PERIOD_ENDED}</p>
          <p className="text-xs text-charcoal-soft mt-1">
            Clients who try to hire you are told you're not taking new clients right now.
          </p>
          <Link to="/contact" className="tap inline-flex items-center mt-1.5 text-sm font-bold text-primary-deep-text underline">
            {UPGRADE_ACTION_LABEL}
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-charcoal">
            {planLabel ? `You've reached the client limit on your ${planLabel} plan.` : "You've reached the client limit on your plan."}
          </p>
          <p className="text-xs text-charcoal-soft mt-1">
            {capLine ? `${capLine}. ` : ""}Clients who try to hire you are told you're not taking new clients right
            now. Disconnect a client to free a place, or{" "}
            <a href={upgradeMailto()} className="font-bold text-primary-deep-text underline">
              {UPGRADE_ACTION_LABEL.toLowerCase()}
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
};
