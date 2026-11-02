import { Check, Sparkles } from "lucide-react";
import { useFreeLimits } from "../../services/premium/hooks";
import { PREMIUM_FEATURES, freeAllowanceText } from "../../services/premium/features";
import { t } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G1 · the plan page's feature list with the Premium switch on: the
// one table in services/premium/features.ts, in the grid the page already
// draws. Each free-limit feature says what the free plan includes, from
// free_limits() (nothing is said until the numbers are known).
export function PremiumFeatureList() {
  const limits = useFreeLimits();
  return (
    <ul data-premium-features className="grid grid-cols-2 gap-2.5 mb-6" aria-label={t("What Premium adds")}>
      {PREMIUM_FEATURES.map((f) => {
        const free = freeAllowanceText(f.key, limits);
        const Icon = f.kind === "premium_only" ? Sparkles : Check;
        return (
          <li key={f.key} className="flex items-start gap-2.5 bg-cream-card rounded-2xl px-3.5 py-3 shadow-soft animate-fade-slide-up">
            <Icon size={16} className="text-primary shrink-0 mt-px" aria-hidden />
            <span className="min-w-0">
              <span className="block text-xs font-medium text-charcoal leading-tight">{t(f.label)}</span>
              {free && <span className="block text-[10.5px] text-charcoal-faint leading-tight mt-1">{free}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
