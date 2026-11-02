import { useNavigate } from "react-router-dom";
import { useCentiumBilling } from "../../../hooks/useCentiumBilling";
import { seatFacts } from "../../../services/centium-billing";
import { SeatsSheet } from "./SeatsSheet";
import type { SeatInfo } from "./teamData";
import "../shell/analytics.css";
import "./an5.css";

// The AN5 Add seats sheet, mounted on its own for the screens outside
// Analytics that open it (OP1 Team "Add seats" and "All seats in use",
// OP1-053 S4 / OP1-070 row 5 / OP1-127 row 8). It reads B8 RV-06 itself
// (business_plan_summary for the seats and block price), so it is mounted
// only while open. Without RV-06 on the database, `fallback` draws the seats.
// G fixes 4: seat blocks are bought in the Centium app only (SeatsSheet).

export function SeatPurchaseSheet({
  used,
  pending,
  fallback,
  onClose,
}: {
  used: number;
  pending: number;
  /** The seats as the screen already knows them, for a database without RV-06. */
  fallback: SeatInfo | null;
  onClose: () => void;
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
      isOwner={!billing.available || billing.isOwner}
      onClose={onClose}
      onPlan={() => navigate("/app/business/more/subscription")}
    />
  );
}
