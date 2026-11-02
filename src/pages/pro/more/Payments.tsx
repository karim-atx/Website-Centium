import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, CreditCard, Download, Landmark, Wallet } from "lucide-react";
import { SettingsRow } from "../../../components/pro/calendar/calendarFields";
import { ComingSoonPill } from "../../../components/pro/ComingSoon";
import { ErrorLine, Section, StateLine, SubPage } from "../../../components/pro/profile/kit";
import { useProfileFacts } from "../../../components/pro/profile/useProfileFacts";
import { OfflineLine, ProCardSkeleton, ProError } from "../../../components/pro/states";
import { Toggle } from "../../../components/ui/Toggle";
import { PremiumLeafIcon } from "../../../components/icons/MoreLeafIcons";
import { useApp } from "../../../context/AppContext";
import { useEffectiveProfessionalTier } from "../../../hooks/useEffectiveProfessionalTier";
import { savePaymentModalities } from "../../../services/pro/profile";
import { t, tn } from "../../../i18n/core";

/**
 * Release 3 · W6 MO8 Payments and billing (/app/more/payments; more.js payments):
 * - Payment methods you accept: Cash and Card at sessions
 *   (professional_profiles.payment_modalities 'cash' and 'card', each "You
 *   confirm each payment": a card taken in person is confirmed like cash);
 *   Card in the app, Coming soon (no in-app payments). Bank transfer
 *   (W6C-2, 20261216080000: payment_modality gains 'bank_transfer') is a
 *   method you accept like cash, confirmed by you; Centium moves no money, so
 *   the frame's "Show your details on invoices" (there are no invoices yet)
 *   reads as Cash and Card do. Any other stored value (whish) is kept as it
 *   is on every save.
 * - Payouts, Invoices and receipts: states only (no in-app payments).
 * - Your Centium plan: the effective tier (useEffectiveProfessionalTier, the
 *   sidebar's own read) opening Subscription.
 */
export default function Payments() {
  const navigate = useNavigate();
  const { authUserId } = useApp();
  const { facts, setFacts, error, offline, reload } = useProfileFacts();
  const { effective } = useEffectiveProfessionalTier();
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  type Modality = "cash" | "card" | "bank_transfer";
  const accepts = (m: Modality) => !!facts?.paymentModalities.includes(m);
  const setModality = async (m: Modality, on: boolean) => {
    if (!authUserId || !facts || busy) return;
    const next = on ? [...new Set([...facts.paymentModalities, m])] : facts.paymentModalities.filter((x) => x !== m);
    setBusy(true);
    setSaveError(null);
    const r = await savePaymentModalities(authUserId, next);
    setBusy(false);
    if (!r.ok) return setSaveError(r.message);
    setFacts({ ...facts, paymentModalities: next });
  };

  const tier = effective?.tier;
  const planSub = tier
    ? [tier.name, tier.maxClients === null ? t("No client limit") : tn(tier.maxClients, "Up to {n} client", "Up to {n} clients"), effective?.viaBusinessName ? t("via {business}", { business: effective.viaBusinessName }) : null].filter(Boolean).join(" · ")
    : undefined;

  return (
    <SubPage title={t("Payments and billing")}>
      {offline && facts && <OfflineLine />}
      {error && !facts ? (
        <ProError onRetry={() => void reload()} />
      ) : !facts ? (
        <div className="flex flex-col" style={{ gap: 12 }} role="status" aria-label={t("Loading")}>
          <ProCardSkeleton lines={3} height={160} />
          <ProCardSkeleton lines={2} height={100} />
        </div>
      ) : (
        <>
          <Section label={t("Payment methods you accept")} first>
            <SettingsRow icon={Banknote} title={t("Cash")} sub={t("You confirm each payment")} right={<Toggle checked={accepts("cash")} onChange={(v) => void setModality("cash", v)} disabled={busy} label={t("Cash")} />} />
            <SettingsRow icon={CreditCard} title={t("Card at sessions")} sub={t("You confirm each payment")} right={<Toggle checked={accepts("card")} onChange={(v) => void setModality("card", v)} disabled={busy} label={t("Card at sessions")} />} />
            <SettingsRow icon={CreditCard} title={t("Card in the app")} sub={t("Coming soon")} right={<Toggle checked={false} onChange={() => {}} disabled label={t("Card in the app, coming soon")} />} />
            <SettingsRow
              icon={Landmark}
              title={t("Bank transfer")}
              sub={t("You confirm each payment")}
              right={<Toggle checked={accepts("bank_transfer")} onChange={(v) => void setModality("bank_transfer", v)} disabled={busy} label={t("Bank transfer")} />}
              last
            />
            {saveError && <ErrorLine>{saveError}</ErrorLine>}
          </Section>

          <Section label={t("Payouts")}>
            <SettingsRow icon={Wallet} title={t("Payout account")} sub={t("Available when in-app payments launch")} last />
          </Section>

          <Section label={t("Invoices and receipts")}>
            <StateLine>{t("Invoices and receipts appear here once in-app payments launch.")}</StateLine>
            <SettingsRow icon={Download} title={t("Export all")} sub={t("CSV or PDF")} value={<ComingSoonPill />} last />
          </Section>

          <Section label={t("Your Centium plan")}>
            <SettingsRow
              tile={<PremiumLeafIcon size={22} style={{ color: "rgb(var(--c-primary-accent))" }} />}
              title={t("Centium Professional")}
              sub={planSub}
              onClick={() => navigate("/app/subscription")}
              last
            />
          </Section>
        </>
      )}
    </SubPage>
  );
}
