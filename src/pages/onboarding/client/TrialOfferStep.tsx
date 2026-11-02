import React from "react";
import { ObFooter, ObHeader, ObPage } from "../shell/ObShell";
import { BuyInApp } from "../../../components/premium/BuyInApp";
import type { MyPremium } from "../../../services/premium/model";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G1 · CF, the trial card at the end of sign-up, after "You're all
// set" (ClientReadyStep). Built, but HIDDEN NOW: Onboarding shows it only
// when trialCardDue() says so, which needs STORE_APPS_LIVE (decision G7 b:
// the apps aren't in the stores yet). Never for under-18s, never in
// recovery-sensitive mode, shown once, and skippable. The web never starts a
// trial or takes a payment: the trial happens in the app store.
export const TrialOfferStep: React.FC<{ premium: MyPremium; onDone: () => void }> = ({ premium, onDone }) => (
  <ObPage>
    <div className="ob-body ob-fade-in">
      <ObHeader margin="nobar" />
      <h1 className="ob-title" style={{ marginTop: 8 }}>
        {premium.trialDays && premium.trialDays > 0 ? t("Try Premium free for {n} days in the Centium app", { n: premium.trialDays }) : t("Try Premium free in the Centium app")}
      </h1>
      <BuyInApp product="premium" monthly={premium.monthlyPrice} yearly={premium.yearlyPrice} trialDays={premium.trialDays} className="mt-5" />
    </div>
    <ObFooter primary={{ label: t("Maybe later"), onClick: onDone }} />
  </ObPage>
);
