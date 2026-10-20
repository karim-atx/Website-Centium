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

/**
 * Release 3 · W6 MO8 Payments and billing (/app/more/payments; more.js payments):
 * - Payment methods you accept: Cash and Card at sessions
 *   (professional_profiles.payment_modalities 'cash' and 'card', each "You
 *   confirm each payment": a card taken in person is confirmed like cash);
 *   Card in the app, Coming soon (no in-app payments); Bank transfer, Coming
 *   soon: payment_modality has no bank transfer value yet (backend gap). Any
 *   other stored value (whish) is kept as it is on every save.
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

  const accepts = (m: "cash" | "card") => !!facts?.paymentModalities.includes(m);
  const setModality = async (m: "cash" | "card", on: boolean) => {
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
    ? [tier.name, tier.maxClients === null ? "No client limit" : `Up to ${tier.maxClients} ${tier.maxClients === 1 ? "client" : "clients"}`, effective?.viaBusinessName ? `via ${effective.viaBusinessName}` : null].filter(Boolean).join(" · ")
    : undefined;

  return (
    <SubPage title="Payments and billing">
      {offline && facts && <OfflineLine />}
      {error && !facts ? (
        <ProError onRetry={() => void reload()} />
      ) : !facts ? (
        <div className="flex flex-col" style={{ gap: 12 }} role="status" aria-label="Loading">
          <ProCardSkeleton lines={3} height={160} />
          <ProCardSkeleton lines={2} height={100} />
        </div>
      ) : (
        <>
          <Section label="Payment methods you accept" first>
            <SettingsRow icon={Banknote} title="Cash" sub="You confirm each payment" right={<Toggle checked={accepts("cash")} onChange={(v) => void setModality("cash", v)} disabled={busy} label="Cash" />} />
            <SettingsRow icon={CreditCard} title="Card at sessions" sub="You confirm each payment" right={<Toggle checked={accepts("card")} onChange={(v) => void setModality("card", v)} disabled={busy} label="Card at sessions" />} />
            <SettingsRow icon={CreditCard} title="Card in the app" sub="Coming soon" right={<Toggle checked={false} onChange={() => {}} disabled label="Card in the app, coming soon" />} />
            <SettingsRow icon={Landmark} title="Bank transfer" sub="Show your details on invoices" value={<ComingSoonPill />} last />
            {saveError && <ErrorLine>{saveError}</ErrorLine>}
          </Section>

          <Section label="Payouts">
            <SettingsRow icon={Wallet} title="Payout account" sub="Available when in-app payments launch" last />
          </Section>

          <Section label="Invoices and receipts">
            <StateLine>Invoices and receipts appear here once in-app payments launch.</StateLine>
            <SettingsRow icon={Download} title="Export all" sub="CSV or PDF" value={<ComingSoonPill />} last />
          </Section>

          <Section label="Your Centium plan">
            <SettingsRow
              tile={<PremiumLeafIcon size={22} style={{ color: "rgb(var(--c-primary-accent))" }} />}
              title="Centium Professional"
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
