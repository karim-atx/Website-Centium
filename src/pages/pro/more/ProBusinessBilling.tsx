import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useBillingPeriod } from "../../../hooks/useCentiumBilling";
import { useSubscriptionTiers } from "../../../hooks/useSubscriptionTiers";
import {
  missingPriceText,
  noPriceText,
  periodName,
  periodOptions,
  periodPriceText,
  periodSaving,
  perMonthText,
  perPeriod,
  renewalAfterSwitch,
  renewalDayText,
  switchConfirm,
  switchedText,
  type SubscriptionPeriod,
} from "../../../services/centium-billing/period";
import { formatPrice, savingLabel } from "../../../services/subscription-tiers/pricing";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { INK } from "../../../components/pro/proInk";
import { ProCardSkeleton } from "../../../components/pro/states";
import { textPx } from "../../../theme/textSize";
import { t, tn } from "../../../i18n/core";
import { useIsWeb } from "../../../components/web/useWebLayout";

// Batch 2 · CS, Karim's decision (21 Oct): a PROFESSIONAL who owns a business
// and holds its business plan gets the same monthly / yearly choice as a
// business account. Their plan is managed here: /app/subscription is the
// professional's subscription screen, and the business console's More pages
// (/app/business/more/*) are business accounts only.
//
// The same rules as the business screens (BillingPages SubscriptionPage,
// BusinessSubscription): set_subscription_billing_period changes the
// CALLER's own subscription, so this shows only when that subscription is an
// active BUSINESS base plan (useBillingPeriod checks the tier), which only
// its holder has; a professional on a professional plan, or seated on
// someone else's business, sees nothing. Every price is subscription_price_for
// with the seat blocks held; NULL reads "Not available" and can't be chosen;
// the yearly option names its saving and restates its price a month only when
// both periods are priced and yearly is cheaper (periodSaving, b93cb12); the
// same confirm comes first, and nothing is charged.

export function ProBusinessBilling() {
  const { authUserId } = useApp();
  const own = useBillingPeriod(authUserId ?? null, true);
  const { tiers } = useSubscriptionTiers("business");
  const [ask, setAsk] = useState<{ to: SubscriptionPeriod; price: number; at: Date } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "done" | "error"; text: string } | null>(null);
  const web = useIsWeb();

  const sub = own.sub;
  if (!own.ready) return null;
  if (own.error && !sub) {
    return (
      <div role="alert" className="flex items-center justify-between" style={{ gap: 12, marginBottom: 14 }}>
        <p style={{ fontSize: textPx(12), fontWeight: 700, color: INK.hi }}>{t(own.error)}</p>
        <button type="button" onClick={own.reload} className="tap shrink-0" style={{ minHeight: 44, padding: "0 8px", fontSize: textPx(12), fontWeight: 800, color: INK.prDeep }}>
          {t("Retry")}
        </button>
      </div>
    );
  }
  if (!sub) return null;

  const planName = tiers.find((tier) => tier.rowId === sub.tierId)?.name ?? "Business";
  const prices = own.prices;
  const total = prices ? prices[sub.period] : undefined;
  const options = prices ? periodOptions(sub.period, prices) : [];
  // What yearly saves on the plan and blocks held (b93cb12); null unless both
  // periods are priced and yearly is cheaper.
  const saving = periodSaving(prices);
  const blocks = sub.seatBlocks;
  const confirm = ask ? switchConfirm({ to: ask.to, price: ask.price, seatBlocks: blocks, renewal: ask.at, money: formatPrice }) : null;

  const doSwitch = async () => {
    if (!ask || busy) return;
    setBusy(true);
    const r = await own.choose(ask.to);
    setBusy(false);
    setAsk(null);
    setNote(r.ok ? { tone: "done", text: switchedText(r.value.period, r.value.renewsAt) } : { tone: "error", text: r.message });
    own.reload();
  };

  return (
    <section aria-labelledby="pro-biz-plan" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, padding: "14px 16px", marginBottom: 14 }}>
      <p id="pro-biz-plan" style={{ fontSize: textPx(14), fontWeight: 800, color: INK.ch }}>
        {t("Your business plan")}
      </p>
      <p style={{ fontSize: textPx(12), color: INK.chS, marginTop: 4, lineHeight: 1.5 }}>
        {[
          blocks > 0 ? tn(blocks, "{plan} + {n} seat block", "{plan} + {n} seat blocks", { plan: planName }) : planName,
          sub.period === "monthly" ? t("Billed monthly") : t("Billed yearly"),
          total === undefined ? null : total === null ? missingPriceText(sub.period) : t("{price} in total", { price: `${formatPrice(total)} ${perPeriod(sub.period)}` }),
          sub.renewsAt ? t("renews {date}", { date: renewalDayText(sub.renewsAt) }) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {own.error && (
        <div role="alert" className="flex items-center justify-between" style={{ gap: 12, marginTop: 8 }}>
          <p style={{ fontSize: textPx(12), fontWeight: 700, color: INK.hi }}>{t(own.error)}</p>
          <button type="button" onClick={own.reload} className="tap shrink-0" style={{ minHeight: 44, padding: "0 8px", fontSize: textPx(12), fontWeight: 800, color: INK.prDeep }}>
            {t("Retry")}
          </button>
        </div>
      )}
      {!prices && !own.error && <ProCardSkeleton lines={2} />}
      {/* Website viewport (WP-MO.11, WP-MO Business Billing Web): the two choices as 72 radio cards side by side (12
          apart, r14, 12 16), the 20 ring, the period 15/24 700 with Current / the saving chip, the price a month
          13/20 under it, the price 15/24 700 at the end. */}
      {prices && web && (
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#5B5349" }}>{t("How your business plan is billed")}</p>
          <div role="radiogroup" aria-label={t("How your business plan is billed")} className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
            {options.map((o) => {
              const off = !o.current && !o.selectable;
              return (
                <button
                  key={o.period}
                  type="button"
                  role="radio"
                  aria-checked={o.current}
                  aria-disabled={off}
                  disabled={off}
                  onClick={() => {
                    setNote(null);
                    if (o.selectable && o.price !== null) setAsk({ to: o.period, price: o.price, at: renewalAfterSwitch(new Date(), o.period) });
                  }}
                  className="flex items-center text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                  style={{ minHeight: 72, boxSizing: "border-box", gap: 12, borderRadius: 14, padding: "12px 16px", background: o.current ? "#F0EDF9" : "#FFFFFF", border: `1px solid ${o.current ? "#AEA1DC" : "rgba(36,31,27,0.11)"}`, opacity: off ? 0.6 : 1, cursor: off ? "default" : "pointer", color: "#241F1B" }}
                >
                  <span className="flex items-center justify-center shrink-0" style={{ width: 20, height: 20, boxSizing: "border-box", borderRadius: 999, border: `2px solid ${o.current ? "#5F5093" : "rgba(36,31,27,0.25)"}` }}>
                    {o.current && <span style={{ width: 10, height: 10, borderRadius: 999, background: "#5F5093" }} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
                      <span style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700 }}>{periodName(o.period)}</span>
                      {o.current && <span style={{ fontSize: 11, lineHeight: "16px", fontWeight: 800, borderRadius: 999, padding: "2px 8px", background: "#FFFFFF", color: "#5F5093" }}>{t("Current")}</span>}
                      {o.period === "yearly" && saving && <span style={{ fontSize: 11, lineHeight: "16px", fontWeight: 800, borderRadius: 999, padding: "2px 8px", background: "#E3F1E8", color: "#3F9165" }}>{savingLabel(saving)}</span>}
                    </span>
                    {o.period === "yearly" && o.price !== null && saving && <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{perMonthText(o.price, formatPrice)}</span>}
                  </span>
                  <span className="whitespace-nowrap" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: o.price === null ? "#8C8378" : "#241F1B" }}>{periodPriceText(o.price, o.period, formatPrice)}</span>
                </button>
              );
            })}
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
            {options.find((o) => !o.current && o.price === null)
              ? noPriceText(options.find((o) => !o.current && o.price === null)!.period)
              : t("Seat blocks follow your plan's billing. Switching charges nothing now.")}
          </p>
        </div>
      )}
      {prices && !web && (
        <div role="radiogroup" aria-label={t("How your business plan is billed")} style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {options.map((o) => (
            <button
              key={o.period}
              type="button"
              role="radio"
              aria-checked={o.current}
              aria-disabled={!o.current && !o.selectable}
              disabled={!o.current && !o.selectable}
              onClick={() => {
                setNote(null);
                if (o.selectable && o.price !== null) setAsk({ to: o.period, price: o.price, at: renewalAfterSwitch(new Date(), o.period) });
              }}
              className="tap w-full flex items-center justify-between text-start"
              style={{
                minHeight: 44,
                gap: 10,
                borderRadius: 12,
                padding: "10px 12px",
                background: o.current ? INK.prPale : INK.soft,
                border: `1px solid ${o.current ? INK.prAccent : "transparent"}`,
                opacity: !o.current && !o.selectable ? 0.6 : 1,
                color: INK.ch,
              }}
            >
              <span className="flex items-center flex-wrap" style={{ gap: 6 }}>
                <span style={{ fontSize: textPx(13), fontWeight: 800 }}>{periodName(o.period)}</span>
                {o.period === "yearly" && saving && (
                  // The tier cards' own saving badge (ProSubscription TierCard).
                  <span style={{ fontSize: textPx(10.5), fontWeight: 800, borderRadius: 9999, padding: "2px 7px", background: INK.goodBg, color: INK.good }}>
                    {savingLabel(saving)}
                  </span>
                )}
              </span>
              <span className="flex flex-col items-end" style={{ textAlign: "end" }}>
                <span style={{ fontSize: textPx(12), fontWeight: 700, color: o.price === null ? INK.chF : INK.chS }}>{periodPriceText(o.price, o.period, formatPrice)}</span>
                {o.period === "yearly" && o.price !== null && saving && (
                  <span style={{ fontSize: textPx(11), fontWeight: 600, color: INK.chF }}>{perMonthText(o.price, formatPrice)}</span>
                )}
              </span>
            </button>
          ))}
          <p style={{ fontSize: textPx(11), color: INK.chF, lineHeight: 1.5 }}>
            {options.find((o) => !o.current && o.price === null)
              ? noPriceText(options.find((o) => !o.current && o.price === null)!.period)
              : t("Seat blocks follow your plan's billing. Switching charges nothing now.")}
          </p>
        </div>
      )}
      {note && (
        <p role={note.tone === "error" ? "alert" : "status"} style={{ fontSize: textPx(12), fontWeight: 700, marginTop: 8, color: note.tone === "error" ? INK.hi : INK.prDeep }}>
          {t(note.text)}
        </p>
      )}
      <ConfirmCard
        open={!!ask}
        layout="stacked"
        frame="kit"
        tone="primary"
        icon={<CalendarRange size={20} strokeWidth={2.2} />}
        title={confirm?.title ?? ""}
        subtitle={confirm?.body}
        confirmLabel={confirm?.action}
        cancelLabel={t("Keep my billing")}
        busy={busy}
        onCancel={() => setAsk(null)}
        onConfirm={() => void doSwitch()}
      />
    </section>
  );
}
