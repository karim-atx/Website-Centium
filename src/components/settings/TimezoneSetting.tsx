import React, { useState } from "react";
import { Card } from "../ui/Card";
import { useApp } from "../../context/AppContext";
import { browserTimezone, knownTimezones } from "../../services/timezone";
import { zoneLabel } from "../../services/timezone/logic";

/**
 * Task T: Settings → Time zone. Writes the profile (profiles.timezone), the
 * one zone the app keeps, for every account.
 *
 * Picking a zone records it as the user's choice (timezone_chosen_at), so a
 * phone in another zone no longer changes it. "Use this device's time zone"
 * goes back to following the device. Moved here from the cycle tracker's own
 * Settings tab, which now links to it.
 *
 * A <select> OF THE ENGINE'S OWN LIST, because the server validates names
 * (ATX50) and a hand-kept list would go stale; where the engine cannot list
 * them, the stored zone and the device's own are offered.
 */
export const TimezoneSetting: React.FC = () => {
  const { myTimezone, pickTimezone, followDeviceZone } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const device = browserTimezone();
  const stored = myTimezone?.timezone ?? null;
  const chosen = !!myTimezone?.chosenAt;
  const all = knownTimezones();
  const options = all.length > 0 ? all : [...new Set([stored, device].filter(Boolean) as string[])];

  const run = async (write: () => Promise<{ ok: boolean; message?: string }>) => {
    setBusy(true);
    setError(null);
    const r = await write();
    setBusy(false);
    if (!r.ok) setError(r.message ?? "Couldn't save your time zone. Try again.");
  };

  return (
    <Card className="mb-6" id="timezone">
      <p className="text-sm font-medium text-charcoal">Time zone</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-charcoal-faint">
        Sets what counts as "today" for your streaks, meditation and cycle days, and when reminders are sent.
      </p>
      {myTimezone === null ? (
        <p className="mt-2.5 text-xs text-charcoal-faint">Loading…</p>
      ) : (
        <>
          <select
            value={stored ?? ""}
            disabled={busy}
            aria-label="Time zone"
            onChange={(e) => {
              const zone = e.target.value;
              if (zone) void run(() => pickTimezone(zone));
            }}
            className="w-full mt-2.5 rounded-xl bg-cream-soft px-3.5 py-2.5 text-[13px] text-charcoal disabled:opacity-50"
          >
            {stored === null && <option value="">Not set</option>}
            {/* A zone the engine does not list (set on another device, or
                since renamed) would otherwise vanish from its own picker. */}
            {stored !== null && !options.includes(stored) && <option value={stored}>{zoneLabel(stored)}</option>}
            {options.map((tz) => (
              <option key={tz} value={tz}>
                {zoneLabel(tz)}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-charcoal-soft" role="status">
            {chosen ? "Set by you. This device won't change it." : "Follows this device."}
          </p>
          {(chosen || (device && device !== stored)) && (
            <button
              type="button"
              onClick={() => void run(followDeviceZone)}
              disabled={busy}
              className="tap mt-1 text-[11.5px] font-semibold text-primary-dark disabled:opacity-40"
            >
              Use this device's time zone{device ? ` (${zoneLabel(device)})` : ""}
            </button>
          )}
          {error && (
            <p className="mt-2 text-xs font-semibold text-status-high" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </Card>
  );
};
