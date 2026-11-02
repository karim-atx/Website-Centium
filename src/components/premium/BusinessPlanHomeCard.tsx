import { useNavigate } from "react-router-dom";
import { ChevronRight, Rocket } from "lucide-react";
import { usePlanLevel, usePlanLevelPrices } from "./usePlanLevel";
import { planChoiceLine, planHomeCard } from "../../services/premium/model";
import { t } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G1 · #15 on the business home (G fixes 3: the level is chosen on the
// web and bought in the Centium app), only with business_plans_on:
// - must_choose_level: "Choose your business plan", opening the plan screen;
// - awaiting_purchase: "Buy your plan in the Centium app", with the chosen
//   level and period, and that verification is approved once the purchase is
//   confirmed;
// - nothing otherwise.
// Nothing while business_plans_on is off or loading, and a business created
// before the switch is never asked (the Database decides).

const SUBSCRIPTION_PATH = "/app/business/more/subscription";

export function BusinessPlanHomeCard({ businessId }: { businessId: string | null | undefined }) {
  const navigate = useNavigate();
  const { level } = usePlanLevel(businessId);
  const card = planHomeCard(level);
  const prices = usePlanLevelPrices(card === "awaiting_purchase");
  if (!card) return null;
  const title = card === "choose" ? t("Choose your business plan") : t("Buy your plan in the Centium app");
  const choice = card === "awaiting_purchase" ? planChoiceLine(level?.chosenSeatBlocks, level?.chosenBillingPeriod, prices) : null;
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
        {choice && <span className="block text-[12px] font-semibold text-primary-dark mt-0.5">{choice}</span>}
        {card === "awaiting_purchase" && <span className="block text-[12px] text-primary-dark/80 mt-0.5">{t("Your verification is approved once the purchase is confirmed.")}</span>}
      </span>
      <ChevronRight size={16} className="text-primary-dark shrink-0" aria-hidden />
    </button>
  );
}
