import { useNavigate } from "react-router-dom";
import { ChevronRight, Rocket } from "lucide-react";
import { usePlanLevel, usePlanLevelPrices } from "./usePlanLevel";
import { pendingPlanLine, planHomeCard } from "../../services/premium/model";
import { t } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G1 · #15 on the business home (G fixes), only with business_plans_on:
// - must_choose_level: "Choose your business plan", opening the plan screen;
// - awaiting_payment: the first plan charge is open: "Your plan payment is
//   pending. Your verification is approved once it's paid.", with the level
//   and amount, opening that charge (pending_charge_id) in the billing history;
// - choice_due: the gentle renewal card.
// Nothing while business_plans_on is off or loading, and a business created
// before the switch is never asked (the Database decides).

const SUBSCRIPTION_PATH = "/app/business/more/subscription";

/** The Centium subscription page, scrolled to one charge in its billing history. */
const chargePath = (chargeId: string) => `${SUBSCRIPTION_PATH}#charge-${chargeId}`;

export function BusinessPlanHomeCard({ businessId }: { businessId: string | null | undefined }) {
  const navigate = useNavigate();
  const { level } = usePlanLevel(businessId);
  const card = planHomeCard(level);
  const prices = usePlanLevelPrices(card === "awaiting_payment");
  if (!card) return null;
  const title = card === "choose" ? t("Choose your business plan") : card === "awaiting_payment" ? t("Your plan payment is pending.") : t("Choose your plan for your next renewal");
  const body =
    card === "choose"
      ? t("Choose a level and how you're billed to carry on. Your verification is approved once your plan is paid.")
      : card === "awaiting_payment"
        ? t("Your verification is approved once it's paid.")
        : t("Pick the level you want from your next renewal.");
  const detail = card === "awaiting_payment" ? pendingPlanLine(level, prices) : null;
  const to = card === "awaiting_payment" && level?.pendingChargeId ? chargePath(level.pendingChargeId) : SUBSCRIPTION_PATH;
  return (
    <button
      type="button"
      data-plan-home-card={card}
      onClick={() => navigate(to)}
      aria-label={card === "awaiting_payment" ? [title, body, detail, t("See the charge")].filter(Boolean).join(" ") : undefined}
      className="tap w-full flex items-center gap-3 rounded-2xl bg-primary-pale px-4 py-3.5 text-start"
      style={{ marginBottom: 20 }}
    >
      <Rocket size={18} className="text-primary-dark shrink-0" aria-hidden />
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-bold text-primary-dark">{title}</span>
        <span className="block text-[12px] text-primary-dark/80 mt-0.5">{body}</span>
        {detail && <span className="block text-[12px] font-bold text-primary-dark mt-0.5">{detail}</span>}
      </span>
      <ChevronRight size={16} className="text-primary-dark shrink-0" aria-hidden />
    </button>
  );
}
