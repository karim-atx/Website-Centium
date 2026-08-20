import React, { useState } from "react";
import { Card } from "../ui/Card";
import { Toggle } from "../ui/Toggle";
import { Apple, Smartphone } from "lucide-react";

/** Mock Apple Health / Android Health integration — no real API in this
 * prototype, but the toggle + synced-data list model the eventual UI. */
export const IntegrationsCard: React.FC = () => {
  const [apple, setApple] = useState(false);
  const [android, setAndroid] = useState(false);

  const row = (
    icon: React.ReactNode,
    label: string,
    desc: string,
    on: boolean,
    setOn: (v: boolean) => void
  ) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center text-charcoal-soft">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-charcoal">{label}</p>
          <p className="text-[11px] text-charcoal-faint">{desc}</p>
        </div>
      </div>
      <Toggle checked={on} onChange={setOn} label={label} />
    </div>
  );

  return (
    <Card>
      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
        Integrations
      </p>
      <div className="divide-y divide-charcoal/[0.05]">
        {row(<Apple size={16} />, "Apple Health", "Syncs steps, sleep, calories, BMI", apple, setApple)}
        {row(<Smartphone size={16} />, "Android Health", "Syncs steps, body fat, calories", android, setAndroid)}
      </div>
      {(apple || android) && (
        <p className="text-[11px] text-sohati-dark bg-sohati-pale rounded-xl px-3 py-2 mt-2">
          Connected (mock) — real syncing arrives in a future version.
        </p>
      )}
    </Card>
  );
};
