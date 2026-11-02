import clsx from "clsx";
import { PremiumLeafIcon } from "../icons/MoreLeafIcons";
import { usePremium } from "../../services/premium/hooks";
import { giverLineParts, memberStatus, memberStatusGiver, memberStatusLine, memberStatusTitle, premiumDate } from "../../services/premium/model";

// undrawn (Round G, no handover)
// Round G1 · EA: the member's Premium status, on Profile and the plan page.
// A pass reads "Premium from {name}" with the giver's name from
// my_premium().from_name (the professional's first name or the gym's name,
// G fixes), falling back to "Premium from your professional" / "Premium with
// your gym membership" when it is null; "until {date}" once the pass is
// ending; a comp shows "Premium" and its end; a store purchase is "Managed in
// the app store". Never a price on a pass. The name is user data, so it sits
// in <bdi> (a Latin name inside Arabic, or the reverse, keeps its order).
// Nothing at all while the switch is off, loading, or without Premium.

export function PremiumStatusCard({ className }: { className?: string }) {
  const { premium } = usePremium();
  const s = memberStatus(premium);
  if (!s) return null;
  const line = memberStatusLine(s, premiumDate);
  const giver = memberStatusGiver(s);
  const parts = giver ? giverLineParts() : null;
  return (
    <div data-premium-status className={clsx("flex items-center gap-3 rounded-[18px] border border-charcoal/[0.08] bg-cream-card px-3.5 py-3 animate-fade-slide-up", className)}>
      <span className="w-8 h-8 rounded-[10px] bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
        <PremiumLeafIcon size={18} className="text-primary-dark" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold text-charcoal">
          {parts ? (
            <>
              {parts.before}
              <bdi>{giver}</bdi>
              {parts.after}
            </>
          ) : (
            memberStatusTitle(s)
          )}
        </span>
        {line && <span className="block text-[12px] text-charcoal-soft mt-0.5">{line}</span>}
      </span>
    </div>
  );
}
