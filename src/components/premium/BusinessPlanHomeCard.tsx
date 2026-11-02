import { useNavigate } from "react-router-dom";
import { ChevronRight, Rocket } from "lucide-react";
import { usePlanLevel } from "./usePlanLevel";
import { choiceDue, mustPayFirst } from "../../services/premium/model";
import { t } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G1 · #15 on the business home: "Start your plan to go live" while a
// business created under the switch hasn't paid its plan (must_pay_first),
// else the gentle renewal card (choice_due). Both open the Centium
// subscription page. Nothing while business_plans_on is off or loading, and
// a business created before the switch is never asked (the Database decides).
export function BusinessPlanHomeCard({ businessId }: { businessId: string | null | undefined }) {
  const navigate = useNavigate();
  const { level } = usePlanLevel(businessId);
  const pay = mustPayFirst(level);
  if (!pay && !choiceDue(level)) return null;
  return (
    <button
      type="button"
      data-plan-home-card={pay ? "pay-first" : "choice-due"}
      onClick={() => navigate("/app/business/more/subscription")}
      className="tap w-full flex items-center gap-3 rounded-2xl bg-primary-pale px-4 py-3.5 text-start"
      style={{ marginBottom: 20 }}
    >
      <Rocket size={18} className="text-primary-dark shrink-0" aria-hidden />
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-bold text-primary-dark">{pay ? t("Start your plan to go live") : t("Choose your plan for your next renewal")}</span>
        <span className="block text-[12px] text-primary-dark/80 mt-0.5">
          {pay ? t("Your business goes live once your first plan payment is recorded. Until then you can't submit your verification or add a venue.") : t("Pick the level you want from your next renewal.")}
        </span>
      </span>
      <ChevronRight size={16} className="text-primary-dark shrink-0" aria-hidden />
    </button>
  );
}
