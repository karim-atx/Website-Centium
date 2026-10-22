import { useBack } from "../../hooks/useBack";
import { RedeemScreen } from "../../components/market/redeem/RedeemScreen";

// Market + Share 3.0 · W3 · B-MA.4 Redeem a voucher (/app/business/redeem,
// ConsoleGate marketing or front_desk, D-25), back header "Marketplace /
// Redeem a voucher". It reads nothing from the listing: a hidden or paused
// listing still validates issued vouchers (the server decides).

export default function RedeemVoucher() {
  const back = useBack("/app/business/marketplace");
  return <RedeemScreen variant="business" onBack={back} backLabel="Back to Marketplace" />;
}
