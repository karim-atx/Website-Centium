import { CloudOff } from "lucide-react";
import { useOnline } from "../../hooks/useOnline";

/**
 * Shown on every screen while the browser reports no connection.
 *
 * WHAT THIS APP DOES OFFLINE, stated once here rather than discovered a
 * failure at a time: reading works, because everything already loaded is held
 * in context, and writing does not. Every write path refuses honestly and
 * keeps what the user typed — none of them silently pretend to save — so the
 * only thing missing was telling someone why several things in a row have just
 * stopped working.
 *
 * IT DOES NOT BLOCK ANYTHING. No control is disabled and no write is
 * intercepted, which is deliberate: `navigator.onLine` reports true for a wifi
 * network with no route to the internet and false is its only trustworthy
 * direction, so gating writes on it would refuse work the app could actually
 * have done. The banner explains; the services still decide.
 *
 * Deliberately not a toast. A toast for a state that persists would either
 * vanish while still true or have to be re-shown on every failure, and the
 * user needs the answer available for as long as it applies, not once.
 */
export const OfflineBanner: React.FC = () => {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      role="status"
      className="rounded-2xl bg-charcoal/[0.06] border border-charcoal/10 px-4 py-3 mb-5"
    >
      <div className="flex items-start gap-2.5">
        <CloudOff size={16} className="text-charcoal-soft shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-charcoal">You&rsquo;re offline</p>
          <p className="text-[11.5px] text-charcoal-soft mt-0.5">
            You can still look through everything already loaded. Anything you log or
            change won&rsquo;t save until you&rsquo;re back online.
          </p>
        </div>
      </div>
    </div>
  );
};
