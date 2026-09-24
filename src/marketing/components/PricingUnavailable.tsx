import React from "react";
import { Link } from "react-router-dom";

/**
 * What the site says when it cannot read the prices.
 *
 * NEVER A STALE NUMBER. The temptation is a fallback set of figures so the
 * page still looks complete — and a fallback is how a page quotes last
 * quarter's price to somebody about to buy. A visitor told the prices did not
 * load can reload or ask; a visitor shown the wrong price cannot tell that
 * anything happened.
 *
 * Both ways out are offered because they fail differently: a retry fixes a
 * dropped connection, and the contact link works when the read does not.
 */
export const PricingUnavailable: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => (
  <div
    className="rounded-2xl border border-[#E4DFD7] bg-white px-6 py-8 text-center"
    role="status"
  >
    <p className="font-display font-bold text-lg text-mkt-ink">Pricing couldn't load</p>
    <p className="text-sm text-mkt-soft mt-1.5 max-w-sm mx-auto">{message}</p>
    <div className="flex items-center justify-center flex-wrap mt-5" style={{ gap: 10 }}>
      <button
        onClick={onRetry}
        className="tap px-5 py-2.5 rounded-full bg-mkt-ink text-white font-semibold text-sm"
      >
        Try again
      </button>
      <Link
        to="/contact"
        className="tap px-5 py-2.5 rounded-full border border-[#DFDAD2] hover:border-mkt-ink text-mkt-ink font-semibold text-sm transition-colors"
      >
        Ask us for a price
      </Link>
    </div>
  </div>
);
