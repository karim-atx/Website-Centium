import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { BuyInApp } from "./BuyInApp";
import { useApp } from "../../context/AppContext";
import { forumAccess } from "../../services/forum/rules";
import { supportOpen, usePremium } from "../../services/premium/hooks";
import { featureEntry, type PremiumFeature } from "../../services/premium/features";
import { premiumOn, promptAllowed, type MyPremium } from "../../services/premium/model";
import { t } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G1 · the upgrade prompt sheet (CF) and the gate. G1 ships the parts,
// unit-tested through services/premium/model; the feature screens wire them
// in with the Database's G2, which enforces the limits and the Premium-only
// calls. The rules (decision G6) are usePremiumPrompt's (./usePremiumPrompt).
//
// The sheet: one line about what Premium adds there, "Buy in the Centium
// app", and "Not now".

export function PremiumPromptSheet({ open, feature, premium, onClose }: { open: boolean; feature: PremiumFeature; premium: MyPremium | null; onClose: () => void }) {
  if (!premium) return null;
  return (
    <BottomSheet open={open} onClose={onClose} title={t("Centium Premium")}>
      <div data-premium-prompt={feature} className="pb-2">
        <p className="text-[14px] leading-[20px] text-charcoal">{t(featureEntry(feature).prompt)}</p>
        <BuyInApp product="premium" monthly={premium.monthlyPrice} yearly={premium.yearlyPrice} trialDays={premium.trialDays} className="mt-4" />
        <Button variant="secondary" size="lg" fullWidth className="mt-3" onClick={onClose}>
          {t("Not now")}
        </Button>
      </div>
    </BottomSheet>
  );
}

/**
 * Wraps a feature screen. While the switch is off or loading the children
 * show exactly as today (`whenOff="hide"` is for a feature that doesn't exist
 * today and stays hidden while off). With Premium, or for a free-limit
 * feature (whose screen calls usePremiumPrompt where the limit is felt), the
 * children show. A Premium-only feature without Premium shows its line, and
 * "See Premium" opens the sheet, only where prompts are allowed (never in
 * recovery-sensitive mode, on Get support or for under-18s). A tap is the
 * member asking, so the once-a-day rule doesn't apply to it.
 */
export function PremiumGate({ feature, children, whenOff = "show" }: { feature: PremiumFeature; children: React.ReactNode; whenOff?: "show" | "hide" }) {
  const { premium } = usePremium();
  const { user } = useApp();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const entry = featureEntry(feature);
  if (!premiumOn(premium) || !premium) return whenOff === "show" ? <>{children}</> : null;
  if (premium.premium || entry.kind === "limit") return <>{children}</>;
  const canAsk = promptAllowed({ premium, age: forumAccess(user.dateOfBirth), path: pathname, inSupport: supportOpen() });
  return (
    <div data-premium-gate={feature} className="rounded-2xl bg-cream-card shadow-soft px-4 py-4">
      <p className="flex items-center gap-2 text-[13px] font-extrabold text-charcoal">
        <Lock size={14} aria-hidden />
        {t("Part of Centium Premium")}
      </p>
      <p className="text-[12.5px] leading-[18px] text-charcoal-soft mt-1">{t(entry.prompt)}</p>
      {canAsk && (
        <Button variant="primary" size="md" className="mt-3" onClick={() => setOpen(true)}>
          {t("See Premium")}
        </Button>
      )}
      <PremiumPromptSheet open={open} feature={feature} premium={premium} onClose={() => setOpen(false)} />
    </div>
  );
}
