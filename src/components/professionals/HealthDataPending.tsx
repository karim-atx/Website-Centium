import React from "react";

// Stands in for the professional-facing client health/training panels.
//
// Those panels read a client's weight trend, calories, workout activity and
// medical history. All of it is real client data that belongs behind
// `client_access_grants` — a table that exists but is not yet enforced —
// and the underlying health tables in this app are still mock. Showing the
// old mock numbers next to a real roster would be worse than showing
// nothing: a professional would read a stranger's demo figures as their
// client's. Showing zeros would be worse still, since a zero looks like a
// measurement.
//
// So the panels say plainly that they aren't wired yet. See the README
// follow-up "The professional dashboard's client-health tiles are not
// wired".
export const HealthDataPending: React.FC<{ label?: string; className?: string }> = ({
  label = "Client health data",
  className,
}) => (
  <div
    className={`rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3.5 text-center ${className ?? ""}`}
  >
    <p className="text-xs font-semibold text-charcoal-soft">{label} — coming soon</p>
    <p className="text-[11px] text-charcoal-faint mt-1 leading-relaxed">
      Not yet connected to real client data.
    </p>
  </div>
);
