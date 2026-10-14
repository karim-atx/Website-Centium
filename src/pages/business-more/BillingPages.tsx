import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Landmark, Mail, Plus, Repeat, Trash2, XCircle } from "lucide-react";
import { BizConfirm, BizHero, BizNote, BizPage, BizRow, BizSection, LoadError, RowsSkeleton, SoonChip, LIST_BG } from "../../components/business-more/kit";
import { useApp } from "../../context/AppContext";
import { useBusinessPlan } from "../../hooks/useBusinessPlan";
import { fetchPlanRenewal } from "../../services/business-more";
import { fetchPaymentSettings, type PaymentSettings } from "../../services/business-revenue";
import { useBusiness } from "../../components/business-more/useBusiness";
import { UPGRADE_EMAIL, upgradeMailto } from "../../services/subscription-tiers/upgrade";
import { formatShortDate } from "../../utils/date";

// OURS-MO1B-payment-methods, -payouts, -invoices, -taxes, -subscription
// (BizMoreV8 screen="payments" / "payouts" / "invoices" / "taxes" /
// "subscription").
//
// BEFORE WHISH (user rule; V6-42 "do not build payouts; show Coming soon"):
// cash is the one method and is locked on, Whish is dimmed with a Soon chip,
// payouts are an empty "coming" card. Receipts, VAT and billing history have
// no backend (BU6-19, BU6-18), so their rows are dimmed under "Coming soon".
// The plan reads subscription_states + subscription_tiers (V6-40); nothing
// here shows a sample amount, and no money that isn't recorded.

const money = (n: number) => `$${n.toFixed(2)}`;
const fmt = (iso: string) => formatShortDate(new Date(iso), { day: "numeric", month: "short" });

const ComingCard = ({ icon: Icon, title, body }: { icon: typeof Landmark; title: string; body: string }) => (
  <div className={`${LIST_BG} flex flex-col items-center text-center`} style={{ borderRadius: 18, padding: "24px 16px", marginBottom: 13 }}>
    <span className="flex items-center justify-center rounded-full bg-primary-pale text-primary-dark" style={{ width: 48, height: 48 }}>
      <Icon size={22} strokeWidth={1.75} aria-hidden />
    </span>
    <p className="text-[15px] font-extrabold text-charcoal" style={{ marginTop: 12 }}>
      {title}
    </p>
    <p className="text-[12.5px] leading-[18px] text-charcoal-soft" style={{ marginTop: 6, textWrap: "pretty" } as React.CSSProperties}>
      {body}
    </p>
  </div>
);

export function PaymentMethodsPage() {
  // B8 RV-05: the stored settings (business_payment_settings). Whish can't be
  // turned on yet and turning every method off is refused, so with cash the
  // only method both switches stay locked; the page reads the row rather
  // than assuming it.
  const { business } = useBusiness();
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  useEffect(() => {
    if (!business?.id) return;
    let alive = true;
    void fetchPaymentSettings(business.id).then((s) => alive && setSettings(s));
    return () => {
      alive = false;
    };
  }, [business?.id]);
  const cashOn = settings?.cashEnabled ?? true;
  return (
    <BizPage title="Payment methods" sub="Choose how clients can pay you.">
      <BizSection label="Accepted payment methods">
        <BizRow
          title={
            <>
              Whish
              <SoonChip />
            </>
          }
          desc="Online · paid when booking"
          toggle={{ checked: false, onChange: () => undefined, disabled: true, label: "Whish" }}
          dim
        />
        <BizRow title="Cash" desc="Your only method for now" toggle={{ checked: cashOn, onChange: () => undefined, disabled: true, label: "Cash" }} />
      </BizSection>
      <BizSection label="Payout account">
        <BizRow icon={Landmark} title="Whish payouts" desc="Coming soon. You'll add your Whish account here." />
      </BizSection>
    </BizPage>
  );
}

export function PayoutsPage() {
  return (
    <BizPage title="Payouts">
      <ComingCard icon={Landmark} title="Whish payouts are coming" body="Cash you take stays with you. When Whish is live, online payments are paid out here every week." />
    </BizPage>
  );
}

export function InvoicesPage() {
  return (
    <BizPage title="Invoices and receipts">
      <BizSection label="Receipts to clients" footer="Coming soon.">
        <BizRow title="Email a receipt after each payment" toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
        <BizRow title="Include your VAT number" toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
      </BizSection>
      <BizSection label="Recent">
        <BizRow title="No receipts yet" desc="Receipts show here once payments are recorded in the app." />
      </BizSection>
    </BizPage>
  );
}

export function TaxesPage() {
  return (
    <BizPage title="Taxes" sub="How tax shows on your prices and receipts.">
      <BizSection label="VAT" footer="Coming soon.">
        <BizRow title="Prices include VAT" desc="Clients see one total price" toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
        <BizRow title="VAT rate" dim />
        <BizRow title="VAT number" dim />
        <BizRow title="Show VAT on receipts" toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
      </BizSection>
    </BizPage>
  );
}

const cancelMailto = () => `mailto:${UPGRADE_EMAIL}?subject=${encodeURIComponent("Cancel my Centium Business plan")}`;

export function SubscriptionPage() {
  const navigate = useNavigate();
  const { authUserId } = useApp();
  const { plan, loading, error } = useBusinessPlan();
  const [renews, setRenews] = useState<string | null>(null);
  const [cancelAsk, setCancelAsk] = useState(false);

  useEffect(() => {
    if (!authUserId) return;
    void fetchPlanRenewal(authUserId).then((r) => r.ok && setRenews(r.value));
  }, [authUserId]);

  const blocks = plan?.seatBlocks ?? 0;
  return (
    <BizPage title="Centium subscription">
      {error && <LoadError message="Couldn't load your plan." onRetry={() => window.location.reload()} />}
      {loading && <RowsSkeleton rows={2} label="Loading your plan" />}
      {plan && (
        <>
          {plan.active ? (
            <BizHero
              label="Your plan"
              value={plan.base?.name ?? "Business"}
              sub={[
                `${money(plan.monthlyTotal)} a month`,
                renews ? `renews ${fmt(renews)}` : null,
                `${blocks} seat block${blocks === 1 ? "" : "s"} (${plan.totalSeats} seats)`,
              ]
                .filter(Boolean)
                .join(" · ")}
              actions={[{ label: "Add seats", icon: Plus, primary: true, onClick: () => navigate("/app/business/more/seats") }]}
            />
          ) : (
            <BizHero
              label="Your plan"
              value="No plan yet"
              sub={plan.base ? `The Business plan is ${money(plan.base.monthlyPrice)} a month.` : undefined}
              actions={[{ label: "Contact us to upgrade", icon: Mail, primary: true, onClick: () => (window.location.href = upgradeMailto()) }]}
            />
          )}
          <BizSection label="Billing history">
            <BizRow icon={CalendarClock} title="Nothing billed in the app yet" desc="Billing history shows here once your plan is billed in the app." />
          </BizSection>
          {plan.active && (
            <>
              <BizSection label="Change or cancel">
                <BizRow icon={Repeat} title="Change plan" desc="We'll help you switch" onClick={() => (window.location.href = upgradeMailto())} />
                <BizRow icon={XCircle} title="Cancel plan" danger onClick={() => setCancelAsk(true)} />
              </BizSection>
              <BizNote>Plans are changed by the Centium team for now. Each request opens an email to {UPGRADE_EMAIL}.</BizNote>
            </>
          )}
        </>
      )}
      <BizConfirm
        open={cancelAsk}
        icon={Trash2}
        title="Cancel Centium Business?"
        body={`Your plan stays active until ${renews ? fmt(renews) : "the end of the period"}. Seats above the free plan stop working then.`}
        action="Cancel plan"
        cancel="Keep my plan"
        onCancel={() => setCancelAsk(false)}
        onAction={() => {
          setCancelAsk(false);
          window.location.href = cancelMailto();
        }}
      />
    </BizPage>
  );
}
