import { HEALTH_DISCLAIMER } from "../../services/legal/disclaimer";

/** The app-wide health disclaimer, in small grey text. */
export function HealthDisclaimer({ className }: { className?: string }) {
  return (
    <p className={`text-[10.5px] leading-[1.5] text-charcoal-soft text-center ${className ?? ""}`}>{HEALTH_DISCLAIMER}</p>
  );
}
