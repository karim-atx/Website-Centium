import React, { useState } from "react";
import { Card } from "../ui/Card";
import { Toggle } from "../ui/Toggle";
import { Apple, Smartphone } from "lucide-react";

// V4: "Integration should be based on the device whether iOS or Android, do
// not include both" — detect the platform and show only the matching
// integration instead of offering both toggles side by side.
function detectPlatform(): "ios" | "android" {
  if (typeof navigator === "undefined") return "ios";
  return /android/i.test(navigator.userAgent) ? "android" : "ios";
}

export const IntegrationsCard: React.FC = () => {
  const platform = detectPlatform();
  const [connected, setConnected] = useState(false);

  const isIos = platform === "ios";

  return (
    <Card>
      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
        Integration
      </p>
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center text-charcoal-soft">
            {isIos ? <Apple size={16} /> : <Smartphone size={16} />}
          </div>
          <div>
            <p className="text-sm font-semibold text-charcoal">{isIos ? "Apple Health" : "Android Health"}</p>
            <p className="text-[11px] text-charcoal-faint">
              Syncs steps, sleep, calories burned, body fat and BMI
            </p>
          </div>
        </div>
        <Toggle checked={connected} onChange={setConnected} label={isIos ? "Apple Health" : "Android Health"} />
      </div>
      {connected && (
        <p className="text-[11px] text-primary-dark bg-primary-pale rounded-xl px-3 py-2 mt-2">
          Connected (mock) — real syncing arrives in a future version.
        </p>
      )}
    </Card>
  );
};
