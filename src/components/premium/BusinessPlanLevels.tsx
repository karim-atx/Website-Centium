import { useEffect, useState } from "react";
import clsx from "clsx";
import { BizNote, BizRow, BizSection } from "../business-more/kit";
import { RefundPolicyLink } from "../legal/RefundPolicyLink";
import { Button } from "../ui/Button";
import { choosePlanLevel, choiceDue, fetchLevelPrices, formatPremiumPrice, planLevelName, type PlanLevel, type PlanLevelPrice, type PlanPeriod } from "../../services/premium";
import { renewalDayText } from "../../services/centium-billing";
import { t, tn } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G1 · #15, the business plan levels on the Centium subscription page,
// only while business_plans_on is true for the business (business_plan_level
// says so for its owner); otherwise nothing renders and the page is today's.
// - Base, Base + 5 seats, Base + 10 seats, monthly and yearly, from
//   business_plan_level_prices();
// - the owner's "Start now" (choose_business_plan_level, with the wording key,
//   the language, the refund policy version shown and 'web'): with no active
//   plan it opens the plan charge, paid through the existing Centium billing
//   below (cash or bank transfer, recorded by Centium); with an active plan it
//   sets the level "From your next renewal";
// - choice_due: a gentle card asking to choose before the renewal;
// - ATXD7: a plan charge already waits for payment, with a link to it;
// - staff see the status only.

const periodLabel = (p: PlanPeriod) => (p === "monthly" ? t("Monthly") : t("Yearly"));
const priceText = (row: PlanLevelPrice, p: PlanPeriod): string | null => {
  const v = formatPremiumPrice(p === "monthly" ? row.monthlyPrice : row.yearlyPrice);
  return v ? (p === "monthly" ? t("{price} a month", { price: v }) : t("{price} a year", { price: v })) : null;
};

export function BusinessPlanLevels({ businessId, level, isOwner, onChanged, historyAnchor }: { businessId: string; level: PlanLevel | null; isOwner: boolean; onChanged: () => void; historyAnchor: string }) {
  const [prices, setPrices] = useState<PlanLevelPrice[] | null>(null);
  const [period, setPeriod] = useState<PlanPeriod>(level?.chosenBillingPeriod ?? level?.billingPeriod ?? "monthly");
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "done" | "error"; text: string; pending?: boolean } | null>(null);
  const on = !!level?.businessPlansOn;

  useEffect(() => {
    if (!on) return;
    let live = true;
    void fetchLevelPrices().then((r) => live && setPrices(r.ok ? r.value : []));
    return () => {
      live = false;
    };
  }, [on]);

  if (!on || !level || !prices || prices.length === 0) return null;
  const base = prices.find((p) => p.seatBlocks === 0) ?? null;
  const current = level.planActive ? level.seatBlocks : null;
  const chosen = level.chosenSeatBlocks;
  const selected = pick ?? chosen ?? current ?? null;
  const selectedRow = prices.find((p) => p.seatBlocks === selected) ?? null;
  const canStart = isOwner && selectedRow !== null && priceText(selectedRow, period) !== null && !busy;

  const start = async () => {
    if (!canStart || selected === null) return;
    setBusy(true);
    setNote(null);
    const r = await choosePlanLevel(businessId, selected, period);
    setBusy(false);
    if (!r.ok) {
      setNote({ tone: "error", text: r.message, pending: r.code === "ATXD7" });
      return;
    }
    setNote({
      tone: "done",
      text: level.planActive
        ? period === "monthly"
          ? t("From your next renewal: {level}, billed monthly.", { level: planLevelName(selectedRow!, base) })
          : t("From your next renewal: {level}, billed yearly.", { level: planLevelName(selectedRow!, base) })
        : t("Your plan charge is ready below. Pay by cash or bank transfer; your plan starts once Centium records the payment."),
    });
    setPick(null);
    onChanged();
  };

  return (
    <>
      {choiceDue(level) && (
        <div data-plan-choice-due className="rounded-2xl bg-primary-pale px-4 py-3.5" style={{ marginBottom: 13 }}>
          <p className="text-[13px] font-bold text-primary-dark">{t("Choose your plan for your next renewal")}</p>
          <p className="text-[12px] text-primary-dark/80 mt-0.5">
            {level.renewsAt ? t("Your plan renews on {date}. Pick the level you want from then.", { date: renewalDayText(level.renewsAt) }) : t("Pick the level you want from your next renewal.")}
            {!isOwner && ` ${t("The business owner chooses the plan.")}`}
          </p>
        </div>
      )}
      <BizSection label={t("Plan levels")}>
        <div role="radiogroup" aria-label={t("Billing period")} className="flex gap-2" style={{ padding: "8px 14px 6px" }}>
          {(["monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              onClick={() => setPeriod(p)}
              className={clsx("tap flex-1 min-h-[44px] rounded-xl text-[12px] font-bold", period === p ? "bg-primary-fill text-on-primary-fill" : "bg-cream-soft text-charcoal-soft")}
            >
              {periodLabel(p)}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label={t("Plan levels")}>
          {prices.map((row) => {
            const price = priceText(row, period);
            const tag =
              current === row.seatBlocks && (level.billingPeriod ?? period) === period
                ? t("Current")
                : chosen === row.seatBlocks && (level.chosenBillingPeriod ?? period) === period
                  ? t("From your next renewal")
                  : undefined;
            return (
              <BizRow
                key={row.seatBlocks}
                radio={isOwner ? { selected: selected === row.seatBlocks } : undefined}
                title={planLevelName(row, base)}
                desc={[tn(row.seats, "{n} seat", "{n} seats"), price ?? t("Not available")].join(" · ")}
                value={tag}
                valueTone="good"
                disabled={!isOwner || price === null}
                dim={price === null}
                onClick={isOwner && price !== null ? () => setPick(row.seatBlocks) : undefined}
              />
            );
          })}
        </div>
      </BizSection>
      {isOwner ? (
        <div style={{ margin: "-4px 0 14px" }}>
          <Button variant="primary" size="lg" fullWidth disabled={!canStart} onClick={() => void start()}>
            {busy ? t("Starting…") : t("Start now")}
          </Button>
          <p className="text-[11px] leading-[16px] text-charcoal-faint text-center" style={{ marginTop: 8 }}>
            {level.planActive ? t("An active plan changes at its next renewal; nothing is charged now.") : t("Your plan starts once its first payment is recorded.")} <RefundPolicyLink />
          </p>
        </div>
      ) : (
        <BizNote>{t("The business owner chooses the plan.")}</BizNote>
      )}
      {note && (
        <p role={note.tone === "error" ? "alert" : "status"} className={clsx("text-[12px] font-semibold leading-[18px]", note.tone === "error" ? "text-status-high" : "text-charcoal-soft")} style={{ margin: "0 4px 14px" }}>
          {note.text}
          {note.pending && (
            <>
              {" "}
              <a href={`#${historyAnchor}`} className="underline font-bold" style={{ color: "inherit" }}>
                {t("See the charge")}
              </a>
            </>
          )}
        </p>
      )}
    </>
  );
}
