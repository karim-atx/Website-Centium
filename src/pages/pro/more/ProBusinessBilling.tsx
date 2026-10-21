import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useBillingPeriod } from "../../../hooks/useCentiumBilling";
import { useSubscriptionTiers } from "../../../hooks/useSubscriptionTiers";
import {
  noPriceText,
  periodName,
  periodOptions,
  periodPriceText,
  perPeriod,
  renewalAfterSwitch,
  renewalDayText,
  switchConfirm,
  switchedText,
  type SubscriptionPeriod,
} from "../../../services/centium-billing/period";
import { formatPrice } from "../../../services/subscription-tiers/pricing";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { INK } from "../../../components/pro/proInk";
import { ProCardSkeleton } from "../../../components/pro/states";
import { textPx } from "../../../theme/textSize";

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
// nothing compares the two periods; the same confirm comes first, and
// nothing is charged.

export function ProBusinessBilling() {
  const { authUserId } = useApp();
  const own = useBillingPeriod(authUserId ?? null, true);
  const { tiers } = useSubscriptionTiers("business");
  const [ask, setAsk] = useState<{ to: SubscriptionPeriod; price: number; at: Date } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "done" | "error"; text: string } | null>(null);

  const sub = own.sub;
  if (!own.ready) return null;
  if (own.error && !sub) {
    return (
      <div role="alert" className="flex items-center justify-between" style={{ gap: 12, marginBottom: 14 }}>
        <p style={{ fontSize: textPx(12), fontWeight: 700, color: INK.hi }}>{own.error}</p>
        <button type="button" onClick={own.reload} className="tap shrink-0" style={{ minHeight: 44, padding: "0 8px", fontSize: textPx(12), fontWeight: 800, color: INK.prDeep }}>
          Retry
        </button>
      </div>
    );
  }
  if (!sub) return null;

  const planName = tiers.find((t) => t.rowId === sub.tierId)?.name ?? "Business";
  const prices = own.prices;
  const total = prices ? prices[sub.period] : undefined;
  const options = prices ? periodOptions(sub.period, prices) : [];
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
        Your business plan
      </p>
      <p style={{ fontSize: textPx(12), color: INK.chS, marginTop: 4, lineHeight: 1.5 }}>
        {[
          blocks > 0 ? `${planName} + ${blocks} seat block${blocks === 1 ? "" : "s"}` : planName,
          `Billed ${sub.period}`,
          total === undefined ? null : total === null ? "price not available" : `${formatPrice(total)} ${perPeriod(sub.period)} in total`,
          sub.renewsAt ? `renews ${renewalDayText(sub.renewsAt)}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {own.error && (
        <div role="alert" className="flex items-center justify-between" style={{ gap: 12, marginTop: 8 }}>
          <p style={{ fontSize: textPx(12), fontWeight: 700, color: INK.hi }}>{own.error}</p>
          <button type="button" onClick={own.reload} className="tap shrink-0" style={{ minHeight: 44, padding: "0 8px", fontSize: textPx(12), fontWeight: 800, color: INK.prDeep }}>
            Retry
          </button>
        </div>
      )}
      {!prices && !own.error && <ProCardSkeleton lines={2} />}
      {prices && (
        <div role="radiogroup" aria-label="How your business plan is billed" style={{ marginTop: 10, display: "grid", gap: 8 }}>
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
              className="tap w-full flex items-center justify-between text-left"
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
              <span style={{ fontSize: textPx(13), fontWeight: 800 }}>{periodName(o.period)}</span>
              <span style={{ fontSize: textPx(12), fontWeight: 700, color: o.price === null ? INK.chF : INK.chS, textAlign: "right" }}>
                {periodPriceText(o.price, o.period, formatPrice)}
              </span>
            </button>
          ))}
          <p style={{ fontSize: textPx(11), color: INK.chF, lineHeight: 1.5 }}>
            {options.find((o) => !o.current && o.price === null)
              ? noPriceText(options.find((o) => !o.current && o.price === null)!.period)
              : "Seat blocks follow your plan's billing. Switching charges nothing now."}
          </p>
        </div>
      )}
      {note && (
        <p role={note.tone === "error" ? "alert" : "status"} style={{ fontSize: textPx(12), fontWeight: 700, marginTop: 8, color: note.tone === "error" ? INK.hi : INK.prDeep }}>
          {note.text}
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
        cancelLabel="Keep my billing"
        busy={busy}
        onCancel={() => setAsk(null)}
        onConfirm={() => void doSwitch()}
      />
    </section>
  );
}
