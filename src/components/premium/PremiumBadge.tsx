import { Crown } from "lucide-react";
import { usePremium } from "../../services/premium/hooks";
import { showPremiumBadge } from "../../services/premium/model";

// Round G1 · the Premium badge (decision G9): on the member's own Home and
// Profile (and their share cards), only while the Premium switch is on for
// them and they hold Premium. It replaces the dead browser-storage
// premiumPlan Crown, keeping its look: a 16px gold crown after the name.
export function PremiumBadge({ size = 16 }: { size?: number }) {
  const { premium } = usePremium();
  if (!showPremiumBadge(premium)) return null;
  return <Crown size={size} className="text-gold fill-gold shrink-0" role="img" aria-label="Centium Premium" />;
}
