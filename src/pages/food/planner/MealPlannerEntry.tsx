import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronRight } from "lucide-react";
import { usePremium } from "../../../services/premium/hooks";
import { useG4Available } from "../../../components/premium/g4/useG4";
import { PremiumLabel } from "../../../components/premium/PremiumAskHost";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G4 · on Food › Custom: the way into the member's own meal planner.
// It is NOT the coach-assigned meal plan (MealPlanCard on Goals), which stays
// as it is. A free member sees the Premium label; the planner still opens,
// because reading and deleting their own plans always work, and every write
// there carries the label and opens the prompt. Nothing while the switch is
// off, loading, or on a Database without G4.

export function MealPlannerEntry({ className = "" }: { className?: string }) {
  const on = useG4Available();
  const { premium } = usePremium();
  const navigate = useNavigate();
  if (!on) return null;
  const locked = !premium?.premium;
  return (
    <button
      type="button"
      data-g4="meal-planner"
      onClick={() => navigate("/app/food/planner")}
      className={`tap w-full flex items-center gap-3 rounded-2xl bg-cream-card px-4 py-3 text-start shadow-soft ${className}`}
    >
      <span className="w-9 h-9 rounded-xl bg-primary-pale flex items-center justify-center shrink-0">
        <CalendarDays size={17} aria-hidden className="text-primary-deep-text" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13.5px] font-bold text-charcoal">{t("Meal planner")}</span>
        <span className="block text-[11.5px] text-charcoal-faint">{t("Plan your week and get a grocery list")}</span>
      </span>
      {locked ? <PremiumLabel className="shrink-0" /> : <ChevronRight size={16} aria-hidden className="shrink-0 text-charcoal-faint" />}
    </button>
  );
}
