import React from "react";
import { Card } from "../ui/Card";
import { Apple, Smartphone } from "lucide-react";

// V4: "Integration should be based on the device whether iOS or Android, do
// not include both" — detect the platform and show only the matching
// integration instead of offering both toggles side by side.
export function detectPlatform(): "ios" | "android" {
  if (typeof navigator === "undefined") return "ios";
  return /android/i.test(navigator.userAgent) ? "android" : "ios";
}

/**
 * Device sync, said honestly: it is not built.
 *
 * WHAT THIS WAS. A working toggle, wired to a `usePersistentState<boolean>`
 * and to nothing else. Turning it on wrote `true` to this browser's
 * localStorage, changed the Health tab's subtitle to "Synced with Apple
 * Health", armed a pull-to-refresh gesture whose whole implementation was a
 * 1400 ms progress animation, and then reported "Synced with Apple Health"
 * again. No request was made, `health_integrations` was never written, and no
 * reading ever arrived. Its own footnote said "Connected (mock)" — which is
 * the right fact in the wrong place, below a switch the user had already been
 * invited to flip.
 *
 * A control that does nothing is worse than an absent one: the user concludes
 * their steps are syncing and that the empty cards are a bug. So the switch is
 * gone and the card says what is true. It comes back as a real control when
 * something writes health_metrics from a device — the table, the enum values
 * and the `apple_health` / `android_health` source values are all already
 * there waiting for it.
 */
export const IntegrationsCard: React.FC = () => {
  const isIos = detectPlatform() === "ios";

  return (
    <Card>
      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
        Integration
      </p>
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center text-charcoal-disabled shrink-0">
            {isIos ? <Apple size={16} /> : <Smartphone size={16} />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-charcoal-soft">
              {isIos ? "Apple Health" : "Android Health"}
            </p>
            <p className="text-[11px] text-charcoal-faint">
              Would sync steps, sleep, heart rate and calories burned
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-charcoal-faint bg-cream-soft rounded-full px-2.5 py-1">
          Coming soon
        </span>
      </div>
      <p className="text-[11px] text-charcoal-faint">
        Device sync isn't available yet. Until it is, weight and water are the metrics you can
        log yourself.
      </p>
    </Card>
  );
};
