import { useBack } from "../../../hooks/useBack";
import { RedeemScreen } from "../../../components/market/redeem/RedeemScreen";

// Market + Share 3.0 · W3 · P-MA.4 Redeem a voucher
// (/app/pro/marketplace/redeem; the Overview's Redeem tile), back header
// "Marketplace / Redeem a voucher". Professional copy: "client", Not valid
// "Not valid with you" / "This voucher was issued for another professional's
// or business's offer.", no staff row on Already used. A hidden marketplace
// listing still validates issued vouchers (the server decides).

export default function RedeemPage() {
  const back = useBack("/app/pro/marketplace/overview");
  return <RedeemScreen variant="professional" onBack={back} backLabel="Back to Marketplace" />;
}
