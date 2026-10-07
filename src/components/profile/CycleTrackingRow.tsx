import React, { useState } from "react";
import { HealthScanIcon } from "./HealthScanIcon";
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
      {/* MO1.5 anatomy row 8 (2x frame): the title centred beside a 36
          #F0EDF9 tile with a #7D6BB5 glyph (new tile, decision 22), and the
          12/400 line under the row at the title's x, 10 below the tile, like
          the Recovery body above it. The glyph is the one MO1.5 draws
          (HealthScanIcon, copied from the handover asset; was Droplet). */}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-2xl bg-primary-pale flex items-center justify-center text-primary-dark shrink-0" aria-hidden>
            <HealthScanIcon />
          </span>
          <span className="block text-sm font-semibold text-charcoal">Cycle tracking</span>
        </span>
        <Toggle checked={cycleOn} onChange={(on) => void toggle(on)} label="Cycle tracking" disabled={busy || !cycleSettingsLoaded} />
      </div>
      <p className="ps-12 mt-2.5 text-xs text-charcoal-faint leading-normal">
        {cycleOn ? TRACKER_OFF_KEEPS_DATA : "Switch it on to start tracking."}
      </p>
      {error && (
        <p className="mt-3 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">{error}</p>
      )}
    </div>
  );
};
