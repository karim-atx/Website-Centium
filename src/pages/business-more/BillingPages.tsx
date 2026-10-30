import { useEffect, useState } from "react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import { Armchair, CalendarClock, CalendarRange, Landmark, Mail, Plus, Repeat, Trash2, XCircle } from "lucide-react";
import { BizConfirm, BizHero, BizNote, BizPage, BizRow, BizSection, LoadError, RowsSkeleton, SoonChip, LIST_BG } from "../../components/business-more/kit";
import { useApp } from "../../context/AppContext";
import { useBusinessPlan } from "../../hooks/useBusinessPlan";
import { useBillingPeriod, useCentiumBilling } from "../../hooks/useCentiumBilling";
import {
  chargeStatusText,
  chargeTitle,
  chargeTone,
  pendingPlanCharge,
  periodName,
  periodOptions,
  periodPriceText,
  missingPriceText,
  NOT_AVAILABLE,
  periodSaving,
  perMonthText,
  renewalAfterSwitch,
  renewalDayText,
  switchConfirm,
  switchedText,
  type CentiumCharge,
  type SubscriptionPeriod,
} from "../../services/centium-billing";
import { fetchPlanRenewal } from "../../services/business-more";
import { fetchPaymentSettings, type PaymentSettings } from "../../services/business-revenue";
import { useBusiness } from "../../components/business-more/useBusiness";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { UPGRADE_ACTION_LABEL, UPGRADE_EMAIL, upgradeMailto } from "../../services/subscription-tiers/upgrade";
import { savingLabel } from "../../services/subscription-tiers/pricing";
import { formatShortDate } from "../../utils/date";
import { t, tn } from "../../i18n/core";

// OURS-MO1B-payment-methods, -payouts, -invoices, -taxes, -subscription
// (BizMoreV8 screen="payments" / "payouts" / "invoices" / "taxes" /
// "subscription").
//
// BEFORE WHISH (user rule; V6-42 "do not build payouts; show Coming soon"):
// cash is the one method and is locked on, Whish is dimmed with a Soon chip,
// payouts are an empty "coming" card. Receipts and VAT have no backend
// (BU6-19), so their rows are dimmed under "Coming soon". The Centium plan
// and its billing history are B8 RV-06 (business_plan_summary,
// centium_billing_history: what the business pays Centium, paid by cash or
// bank transfer and recorded by Centium); nothing here shows a sample amount,
// and no money that isn't recorded.

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
    <BizPage title={t("Payment methods")} sub={t("Choose how clients can pay you.")}>
      <BizSection label={t("Accepted payment methods")}>
        <BizRow
          title={
            <>
              {/* i18n-ignore */}
              Whish
              <SoonChip />
            </>
          }
          desc={t("Online · paid when booking")}
          toggle={{ checked: false, onChange: () => undefined, disabled: true, label: "Whish" }}
          dim
        />
        <BizRow title={t("Cash")} desc={t("Your only method for now")} toggle={{ checked: cashOn, onChange: () => undefined, disabled: true, label: t("Cash") }} />
      </BizSection>
      <BizSection label={t("Payout account")}>
        <BizRow icon={Landmark} title={t("Whish payouts")} desc={t("Coming soon. You'll add your Whish account here.")} />
      </BizSection>
    </BizPage>
  );
}

export function PayoutsPage() {
  return (
    <BizPage title={t("Payouts")}>
      <ComingCard icon={Landmark} title={t("Whish payouts are coming")} body={t("Cash you take stays with you. When Whish is live, online payments are paid out here every week.")} />
    </BizPage>
  );
}

export function InvoicesPage() {
  return (
    <BizPage title={t("Invoices and receipts")}>
      <BizSection label={t("Receipts to clients")} footer={t("Coming soon.")}>
        <BizRow title={t("Email a receipt after each payment")} toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
        <BizRow title={t("Include your VAT number")} toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
      </BizSection>
      <BizSection label={t("Recent")}>
        <BizRow title={t("No receipts yet")} desc={t("Receipts show here once payments are recorded in the app.")} />
      </BizSection>
    </BizPage>
  );
}

export function TaxesPage() {
  return (
    <BizPage title={t("Taxes")} sub={t("How tax shows on your prices and receipts.")}>
      <BizSection label={t("VAT")} footer={t("Coming soon.")}>
        <BizRow title={t("Prices include VAT")} desc={t("Clients see one total price")} toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
        <BizRow title={t("VAT rate")} dim />
        <BizRow title={t("VAT number")} dim />
        <BizRow title={t("Show VAT on receipts")} toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
      </BizSection>
    </BizPage>
  );
}

const cancelMailto = () => `mailto:${UPGRADE_EMAIL}?subject=${encodeURIComponent("Cancel my Centium Business plan")}`;

/** A charge's "15 Oct" from a date-only value, on the local calendar. */
const fmtDay = (d: string) => fmt(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d);
const VALUE_TONE = { due: "primary", settled: "good", void: "faint" } as const;

export function SubscriptionPage() {
  const navigate = useNavigate();
  const { authUserId } = useApp();
  // B8 RV-06: the plan card reads business_plan_summary (prices from
  // subscription_tiers), the history reads centium_billing_history: what this
  // business pays Centium, never what members pay the business. Without RV-06
  // on the database the earlier reads stay (pending rule).
  const billing = useCentiumBilling();
  const legacy = useBusinessPlan();
  const [renews, setRenews] = useState<string | null>(null);
  const [cancelAsk, setCancelAsk] = useState(false);
  const [orderAsk, setOrderAsk] = useState<CentiumCharge | null>(null);
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const live = billing.available;
  // Batch 2 · CS: monthly or yearly. set_subscription_billing_period changes
  // the CALLER's own subscription, so only the owner reads or switches it;
  // staff read business_plan_summary, whose prices are for its billing_period
  // ("$X a year" on a yearly plan). The console seat says who owns the
  // business, with or without RV-06.
  const isOwner = billing.isOwner;
  const period = useBillingPeriod(authUserId ?? null, isOwner);
  const [periodAsk, setPeriodAsk] = useState<{ to: SubscriptionPeriod; price: number; at: Date } | null>(null);
  const [periodBusy, setPeriodBusy] = useState(false);
  const [periodNote, setPeriodNote] = useState<{ tone: "done" | "error"; text: string } | null>(null);
  const ownSub = period.sub;
  const ownTotal = ownSub && period.prices ? period.prices[ownSub.period] : null;
  // What yearly saves on the owner's plan and blocks (b93cb12); null unless
  // both periods are priced and yearly is cheaper.
  const saving = periodSaving(period.prices);

  useEffect(() => {
    if (!authUserId || live) return;
    void fetchPlanRenewal(authUserId).then((r) => r.ok && setRenews(r.value));
  }, [authUserId, live]);

  const s = live ? billing.summary : null;
  const plan = live ? null : legacy.plan;
  const active = s ? s.active : !!plan?.active;
  const renewsAt = ownSub?.renewsAt ?? (s ? s.renewsAt : renews);
  const blocks = s ? s.seatBlocks : (plan?.seatBlocks ?? 0);
  const planPrice = s ? s.planPrice : (plan?.base?.monthlyPrice ?? null);
  const planCharge = live && billing.history ? pendingPlanCharge(billing.history) : null;
  const hidden = live && billing.ready && !billing.canSeePlan;
  const error = live ? billing.summaryError : legacy.error;
  const loading = !error && !hidden && (live ? !billing.ready || !s : legacy.loading);

  const cancelOrder = async () => {
    if (!orderAsk || orderBusy) return;
    setOrderBusy(true);
    setOrderError(null);
    const r = await billing.cancel(orderAsk.id);
    setOrderBusy(false);
    setOrderAsk(null);
    if (!r.ok && r.kind !== "final") setOrderError(r.message);
    billing.reload();
  };

  const switchPeriod = async () => {
    if (!periodAsk || periodBusy) return;
    setPeriodBusy(true);
    setPeriodNote(null);
    const r = await period.choose(periodAsk.to);
    setPeriodBusy(false);
    setPeriodAsk(null);
    setPeriodNote(r.ok ? { tone: "done", text: switchedText(r.value.period, r.value.renewsAt) } : { tone: "error", text: r.message });
    // The new row is already on screen; the rest re-reads behind it.
    period.reload();
    billing.reload();
  };

  // The hero's price: the owner's from subscription_price_for at their own
  // period (with the seat blocks they hold); staff, business_plan_summary's
  // total for its period. NULL is "not available", never $0.
  const priceLine = (): string | null => {
    if (isOwner && ownSub) return ownTotal !== null ? periodPriceText(ownTotal, ownSub.period, money) : missingPriceText(ownSub.period);
    if (isOwner && !period.ready) return null;
    // Staff: the summary's plan_price (and seat_block_price with blocks held)
    // for its period. NULL (251ab70: no fallback to the monthly figure) reads
    // "Not available".
    if (s) return s.total !== null ? periodPriceText(s.total, s.period, money) : missingPriceText(s.period);
    return t("{price} a month", { price: money(plan?.monthlyTotal ?? 0) });
  };
  const confirm = periodAsk ? switchConfirm({ to: periodAsk.to, price: periodAsk.price, seatBlocks: ownSub?.seatBlocks ?? 0, renewal: periodAsk.at, money }) : null;

  return (
    <BizPage title={t("Centium subscription")}>
      {error && <LoadError message={t("Couldn't load your plan.")} onRetry={live ? billing.reload : () => window.location.reload()} />}
      {loading && <RowsSkeleton rows={2} label={t("Loading your plan")} />}
      {hidden && <BizNote>{t("The business owner manages the Centium plan.")}</BizNote>}
      {(s || plan) && (
        <>
          {active ? (
            <BizHero
              label={t("Your plan")}
              value={s ? s.planName : (plan?.base?.name ?? "Business")}
              sub={[
                priceLine(),
                renewsAt ? t("renews {date}", { date: renewalDayText(renewsAt) }) : null,
                tn(blocks, "{n} seat block ({seats} seats)", "{n} seat blocks ({seats} seats)", { seats: String(s ? s.capacity : plan?.totalSeats) }),
              ]
                .filter(Boolean)
                .join(" · ")}
              actions={!live || billing.isOwner ? [{ label: t("Add seats"), icon: Plus, primary: true, onClick: () => navigate("/app/business/more/seats") }] : []}
            />
          ) : (
            <BizHero
              label={t("Your plan")}
              value={t("No plan yet")}
              sub={
                planCharge
                  ? t("Your first month, {price}, is awaiting payment.", { price: money(planCharge.amount) })
                  : planPrice !== null
                    ? (s ? s.period : "monthly") === "monthly"
                      ? t("The Business plan is {price} a month.", { price: money(planPrice) })
                      : t("The Business plan is {price} a year.", { price: money(planPrice) })
                    : s
                      ? // business_plan_summary's plan_price is NULL (251ab70: no
                        // fallback to another period's price): said, never $0.
                        s.period === "monthly"
                        ? t("The Business plan's monthly price: Not available.")
                        : t("The Business plan's yearly price: Not available.")
                      : undefined
              }
              actions={planCharge ? [] : [{ label: t(UPGRADE_ACTION_LABEL), icon: Mail, primary: true, onClick: () => (window.location.href = upgradeMailto()) }]}
            />
          )}
          {active && isOwner && (
            <>
              {period.error ? (
                <LoadError message={t(period.error)} onRetry={period.reload} />
              ) : !period.ready ? (
                <RowsSkeleton rows={2} label={t("Loading how you're billed")} />
              ) : ownSub && period.prices ? (
                <BizSection label={t("Billing")} footer={t("Seat blocks follow your plan's billing. Switching charges nothing now, and your next renewal moves to a month or a year from the day you switch.")}>
                  <div role="radiogroup" aria-label={t("How you're billed")}>
                    {periodOptions(ownSub.period, period.prices).map((o) => (
                      <BizRow
                        key={o.period}
                        radio={{ selected: o.current }}
                        title={periodName(o.period)}
                        // The yearly row restates its price a month and names the
                        // saving, only when both periods are priced and yearly is
                        // cheaper (periodSaving).
                        desc={
                          o.reason ??
                          (o.period === "yearly" && o.price !== null && saving
                            ? `${periodPriceText(o.price, o.period, money)} · ${perMonthText(o.price, money)}`
                            : periodPriceText(o.price, o.period, money))
                        }
                        value={o.price === null ? t(NOT_AVAILABLE) : o.period === "yearly" && saving ? savingLabel(saving) : undefined}
                        valueTone={o.price === null ? "faint" : "good"}
                        disabled={!o.current && !o.selectable}
                        dim={!o.current && !o.selectable}
                        onClick={o.selectable && o.price !== null ? () => setPeriodAsk({ to: o.period, price: o.price as number, at: renewalAfterSwitch(new Date(), o.period) }) : undefined}
                      />
                    ))}
                  </div>
                </BizSection>
              ) : null}
              {periodNote && (
                <p
                  role={periodNote.tone === "error" ? "alert" : "status"}
                  className={clsx("text-[12px] font-semibold leading-[18px]", periodNote.tone === "error" ? "text-status-high" : "text-charcoal-soft")}
                  style={{ margin: "0 4px 14px", textWrap: "pretty" } as React.CSSProperties}
                >
                  {t(periodNote.text)}
                </p>
              )}
            </>
          )}
          {s && s.pendingCharges > 0 && billing.canSeeBilling && (
            <BizNote>
              {t("{price} is awaiting payment to Centium. Pay by cash or bank transfer; your plan and seats update once Centium records the payment.", { price: money(s.pendingAmount) })}
            </BizNote>
          )}
          {(!live || billing.canSeeBilling) && (
            <BizSection label={t("Billing history")}>
              {live && billing.historyError && !billing.history ? (
                <LoadError message={t("Couldn't load your billing history.")} onRetry={billing.reload} />
              ) : live && billing.history && billing.history.length > 0 ? (
                billing.history.map((c) => {
                  const cancellable = billing.isOwner && c.product === "seat_block" && !c.isRenewal && c.status === "pending";
                  const tone = chargeTone(c);
                  return (
                    <BizRow
                      key={c.id}
                      icon={c.product === "seat_block" ? Armchair : CalendarClock}
                      title={chargeTitle(c)}
                      desc={[c.periodStart && c.periodEnd ? t("{start} to {end}", { start: fmtDay(c.periodStart), end: fmtDay(c.periodEnd) }) : fmt(c.createdAt), chargeStatusText(c)].join(" · ")}
                      value={money(c.amount)}
                      valueTone={VALUE_TONE[tone]}
                      dim={tone === "void"}
                      onClick={cancellable ? () => setOrderAsk(c) : undefined}
                      ariaLabel={cancellable ? t("{item}, {price}, awaiting payment. Cancel order", { item: chargeTitle(c), price: money(c.amount) }) : undefined}
                    />
                  );
                })
              ) : (
                <BizRow icon={CalendarClock} title={t("Nothing billed in the app yet")} desc={t("Billing history shows here once your plan is billed in the app.")} />
              )}
            </BizSection>
          )}
          {orderError && <BizNote>{t(orderError)}</BizNote>}
          {active && (!live || billing.isOwner) && (
            <>
              <BizSection label={t("Change or cancel")}>
                <BizRow icon={Repeat} title={t("Change plan")} desc={t("We'll help you switch")} onClick={() => (window.location.href = upgradeMailto())} />
                <BizRow icon={XCircle} title={t("Cancel plan")} danger onClick={() => setCancelAsk(true)} />
              </BizSection>
              <BizNote>{t("Plans are changed by the Centium team for now. Each request opens an email to {email}.", { email: UPGRADE_EMAIL })}</BizNote>
            </>
          )}
        </>
      )}
      <BizConfirm
        open={cancelAsk}
        icon={Trash2}
        title={t("Cancel Centium Business?")}
        body={
          renewsAt
            ? t("Your plan stays active until {date}. Seats above the free plan stop working then.", { date: renewalDayText(renewsAt) })
            : t("Your plan stays active until the end of the period. Seats above the free plan stop working then.")
        }
        action={t("Cancel plan")}
        cancel={t("Keep my plan")}
        onCancel={() => setCancelAsk(false)}
        onAction={() => {
          setCancelAsk(false);
          window.location.href = cancelMailto();
        }}
      />
      <BizConfirm
        open={!!orderAsk}
        icon={XCircle}
        title={t("Cancel this seat order?")}
        body={
          orderAsk
            ? tn(orderAsk.quantity, "{n} seat block won't be added. You can order seats again any time.", "{n} seat blocks won't be added. You can order seats again any time.")
            : t("The seat blocks won't be added. You can order seats again any time.")
        }
        action={t("Cancel order")}
        cancel={t("Keep order")}
        busy={orderBusy}
        onCancel={() => setOrderAsk(null)}
        onAction={() => void cancelOrder()}
      />
      {/* Not destructive, so the primary treatment rather than BizConfirm's red. */}
      <ConfirmCard
        open={!!periodAsk}
        layout="stacked"
        frame="kit"
        tone="primary"
        icon={<CalendarRange size={20} strokeWidth={2.2} />}
        title={confirm?.title ?? ""}
        subtitle={confirm?.body}
        confirmLabel={confirm?.action}
        cancelLabel={t("Keep my billing")}
        busy={periodBusy}
        onCancel={() => setPeriodAsk(null)}
        onConfirm={() => void switchPeriod()}
      />
    </BizPage>
  );
}
