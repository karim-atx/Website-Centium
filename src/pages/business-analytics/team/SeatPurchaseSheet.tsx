import { useNavigate } from "react-router-dom";
import { useCentiumBilling } from "../../../hooks/useCentiumBilling";
import { seatFacts } from "../../../services/centium-billing";
import { SeatsSheet } from "./SeatsSheet";
import type { SeatInfo } from "./teamData";
import "../shell/analytics.css";
import "./an5.css";

// The AN5 057-060 Add seats flow, mounted on its own for the screens outside
// Analytics that open it (OP1 Team "Add seats" and "All seats in use",
// OP1-053 S4 / OP1-070 row 5 / OP1-127 row 8: "Opens the Add seats flow (AN5
// 057-060)"). It reads B8 RV-06 itself (business_plan_summary for the seats
// and block price, the order awaiting payment), so it is mounted only while
// open. Without RV-06 on the database, `fallback` draws the seats and the
// flow keeps its email path.

export function SeatPurchaseSheet({
  used,
  pending,
  fallback,
  onClose,
  onChanged,
}: {
  used: number;
  pending: number;
  /** The seats as the screen already knows them, for a database without RV-06. */
  fallback: SeatInfo | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const navigate = useNavigate();
  const billing = useCentiumBilling();
  if (!billing.ready) return null;
  const seats = billing.summary ? seatFacts(billing.summary, fallback?.perBlock ?? 5) : fallback;
  if (!seats) return null;
  return (
    <SeatsSheet
      open
      mode={seats.planActive ? "add" : "noplan"}
      seats={seats}
      used={used}
      pending={pending}
      billing={billing}
      businessId={billing.businessId}
      onClose={onClose}
      onPlan={() => navigate("/app/business/more/subscription")}
      onChanged={() => {
        billing.reload();
        onChanged?.();
      }}
    />
  );
}
