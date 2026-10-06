import React, { useState } from "react";
import { Droplet } from "lucide-react";
import { Toggle } from "../ui/Toggle";
import { useApp } from "../../context/AppContext";
import { TRACKER_OFF_KEEPS_DATA } from "../../services/cycle/guidance";

// Cycle tracking, the one switch every profile can reach for the cycle and
// pregnancy section (handover 2026-09-29 MO11). Moved from Settings to the
// profile in batch C (C6) WITH EXACTLY THE RULE IT HAD THERE: shown to every
// account, whatever its type or age. On means shown: offered (by sex or
// opt-in) and tracking. Off is the user's own choice and always wins; nothing
// is deleted either way.
//
// Where it sits: inside Safety & content for a customer, in a Health
// tracking section on a professional's Profile, and on a business's Business
// Profile (the only profile a business account reaches).
export const CycleTrackingRow: React.FC = () => {
  const { cycleSettings, cycleSettingsLoaded, cycleOffered, setCycleTracking } = useApp();
  const cycleOn = cycleOffered && !!cycleSettings?.trackerEnabled;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (on: boolean) => {
    setBusy(true);
    setError(null);
    const r = await setCycleTracking(on);
    setBusy(false);
    if (!r.ok) setError(r.message ?? "Couldn't save that. Try again.");
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center text-charcoal-soft shrink-0" aria-hidden>
            <Droplet size={16} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-charcoal">Cycle tracking</span>
            {/* MO1.5 anatomy row 8: subtitle 12/400. */}
            <span className="block text-xs text-charcoal-faint leading-snug">
              {cycleOn ? TRACKER_OFF_KEEPS_DATA : "Switch it on to start tracking."}
            </span>
          </span>
        </span>
        <Toggle checked={cycleOn} onChange={(on) => void toggle(on)} label="Cycle tracking" disabled={busy || !cycleSettingsLoaded} />
      </div>
      {error && (
        <p className="mt-3 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">{error}</p>
      )}
    </div>
  );
};
