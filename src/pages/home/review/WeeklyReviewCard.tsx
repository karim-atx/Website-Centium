import { useNavigate } from "react-router-dom";
import { CalendarCheck, ChevronRight } from "lucide-react";
import { usePremium } from "../../../services/premium/hooks";
import { askLocked, useG3Available } from "../../../components/premium/g3/useG3";
import { PremiumLabel } from "../../../components/premium/PremiumAskHost";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G3 · the way into the weekly review, on Home: the Monday push ("Your
// week in Centium") opens /app, so this card is where it lands until the
// Database's deepLinkFor opens /app/weekly-review itself. With Premium it
// opens the review; a free member sees the Premium label and the prompt.
// Nothing while the switch is off or loading.

export function WeeklyReviewCard({ className = "" }: { className?: string }) {
  const on = useG3Available();
  const { premium } = usePremium();
  const navigate = useNavigate();
  if (!on) return null;
  const locked = !premium?.premium;
  return (
    <button
      type="button"
      data-g3="weekly-review"
      onClick={() => (locked ? askLocked("weekly_review") : navigate("/app/weekly-review"))}
      className={`tap w-full flex items-center gap-3 rounded-2xl bg-cream-card px-4 py-3 text-start shadow-soft ${className}`}
    >
      <span className="w-9 h-9 rounded-xl bg-primary-pale flex items-center justify-center shrink-0">
        <CalendarCheck size={17} aria-hidden className="text-primary-deep-text" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13.5px] font-bold text-charcoal">{t("Your week")}</span>
        <span className="block text-[11.5px] text-charcoal-faint">{t("Last week at a glance, with goal suggestions")}</span>
      </span>
      {locked ? <PremiumLabel className="shrink-0" /> : <ChevronRight size={16} aria-hidden className="shrink-0 text-charcoal-faint rtl:-scale-x-100" />}
    </button>
  );
}
