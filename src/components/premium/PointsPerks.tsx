import { useHideNumbers } from "../../hooks/useHideNumbers";
import { usePremium } from "../../services/premium/hooks";
import { showDoubled, showDoublePointsLine } from "../../services/premium/g2";
import { t } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G2 · 2x points. A Premium member's awards and daily cap are doubled
// (points_ledger.multiplier 2). Only with the switch on, and never in
// recovery-sensitive mode (points are hidden there already).

/** "2x with Premium" on a ledger row made at 2x. */
export function DoubledChip({ multiplier }: { multiplier: number | null | undefined }) {
  const { premium } = usePremium();
  const hide = useHideNumbers();
  if (hide || !showDoubled(premium, multiplier)) return null;
  return (
    <span data-points-doubled="" className="mt-0.5 inline-flex rounded-full bg-primary-pale px-2 py-[1px] text-[10.5px] font-bold leading-4 text-primary-deep-text">
      {t("2x with Premium")}
    </span>
  );
}

/** For a free member, one quiet line in the points area that Premium doubles points. */
export function DoublePointsLine({ className = "" }: { className?: string }) {
  const { premium } = usePremium();
  const hide = useHideNumbers();
  if (!showDoublePointsLine(premium, hide)) return null;
  return <p data-points-premium="" className={`text-[11px] leading-[16px] text-charcoal-faint ${className}`}>{t("Premium members earn 2x points.")}</p>;
}
