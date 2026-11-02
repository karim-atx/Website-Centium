import { useNavigate } from "react-router-dom";
import { ChevronRight, Rocket } from "lucide-react";
import { usePlanLevel } from "./usePlanLevel";
import { planHomeCard } from "../../services/premium/model";
import { t } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G1 · #15 on the business home (G fixes, then G fixes 2: plan levels
// are bought in the Centium app only), only with business_plans_on:
// - must_choose_level: "Choose your business plan", buy it in the Centium
//   app, opening the plan screen (the levels and "Buy in the Centium app");
// - today's Database's awaiting_payment: the purchase isn't confirmed yet,
//   with no charge shown;
// - choice_due: a gentle line pointing to the app, with no web action.
// Nothing while business_plans_on is off or loading, and a business created
// before the switch is never asked (the Database decides).

const SUBSCRIPTION_PATH = "/app/business/more/subscription";

export function BusinessPlanHomeCard({ businessId }: { businessId: string | null | undefined }) {
  const navigate = useNavigate();
  const { level } = usePlanLevel(businessId);
  const card = planHomeCard(level);
  if (!card) return null;
  if (card === "choice_due") {
    return (
      <p data-plan-home-card={card} role="note" className="rounded-2xl bg-primary-pale px-4 py-3.5 text-[12px] font-semibold text-primary-dark" style={{ marginBottom: 20 }}>
        {t("Change your plan in the Centium app.")}
      </p>
    );
  }
  const title = card === "choose" ? t("Choose your business plan") : t("Business plan");
  const body = card === "choose" ? t("Buy it in the Centium app. Your verification is approved once the purchase is confirmed.") : t("Your verification is approved once your purchase is confirmed.");
  return (
    <button
      type="button"
      data-plan-home-card={card}
      onClick={() => navigate(SUBSCRIPTION_PATH)}
      className="tap w-full flex items-center gap-3 rounded-2xl bg-primary-pale px-4 py-3.5 text-start"
      style={{ marginBottom: 20 }}
    >
      <Rocket size={18} className="text-primary-dark shrink-0" aria-hidden />
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-bold text-primary-dark">{title}</span>
        <span className="block text-[12px] text-primary-dark/80 mt-0.5">{body}</span>
      </span>
      <ChevronRight size={16} className="text-primary-dark shrink-0" aria-hidden />
    </button>
  );
}
