import { useEffect, useState } from "react";
import { BadgePercent, Check } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { Toast } from "../ui/Toast";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import { useOnline } from "../../hooks/useOnline";
import { businessPaymentFor, fetchPromotions, promotionStatus, recordPromotionRedemption, type Promotion } from "../../services/business-market/promotions";
import { offerSub } from "../../pages/business-market/promoModel";
import { onPromotionUsedOffer, type PromotionUsedOffer } from "./promotionUsed";

// "Promotion used" (Follow-up 20261121390000; B13 "Promotions are recorded,
// not applied"). After a payment is recorded at the desk, the store, an
// appointment, a class roster, a venue roster or Revenue, the screen calls
// offerPromotionUsed(). Here, when the business has a live promotion, a
// business toast (X-08) above the screen's own "paid" toast offers it
// ("Choose"); the sheet lists the live promotions and records the one picked
// with business_payment_for() + record_promotion_redemption(). Choosing none
// is fine, and nothing here touches the payment itself.
//
// OURS strings (no frame draws this): toast "Promotion used? Record it on
// this payment." + "Choose"; sheet "Promotion used", lead "Optional. Pick
// the promotion this payment used. The price stays what you charged.", CTA
// "Record", done toast "Promotion recorded.". ATXF8 keeps promoErrorMessage's
// sentence.

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function PromotionUsedHost() {
  const access = useConsoleAccess();
  const online = useOnline();
  const businessId = access.businessId;
  // business_payment_for / record_promotion_redemption: revenue, front_desk or store.
  const allowed = access.isOwner || access.can("revenue") || access.can("front_desk") || access.can("store");
  const [offer, setOffer] = useState<{ o: PromotionUsedOffer; promos: Promotion[]; n: number } | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(
    () =>
      onPromotionUsedOffer((o) => {
        if (!businessId || !allowed) return;
        void fetchPromotions(businessId).then((r) => {
          if (!r.ok) return;
          const live = r.value.filter((p) => promotionStatus(p, today()) === "live");
          if (live.length === 0) return;
          setOffer((prev) => ({ o, promos: live, n: (prev?.n ?? 0) + 1 }));
          setPicked(live.length === 1 ? live[0].id : null);
          setError(null);
          setSheetOpen(false);
          setToastOpen(true);
        });
      }),
    [businessId, allowed]
  );

  const record = async () => {
    if (!offer || !picked || busy) return;
    setBusy(true);
    setError(null);
    const pay = await businessPaymentFor(offer.o.kind, offer.o.sourceId);
    const r = pay.ok ? await recordPromotionRedemption(picked, pay.value) : pay;
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setSheetOpen(false);
    setDone(true);
  };

  return (
    <>
      <Toast
        key={offer?.n ?? 0}
        open={toastOpen && !!offer}
        variant="business"
        // Above the screen's own "paid" toast (96), which shows at the same time.
        bottom={152}
        duration={8000}
        icon={<BadgePercent size={15} strokeWidth={2.4} aria-hidden className="flex-none" />}
        message="Promotion used? Record it on this payment."
        action={{
          label: "Choose",
          onClick: () => {
            setToastOpen(false);
            setSheetOpen(true);
          },
        }}
        onExpire={() => setToastOpen(false)}
      />
      <BottomSheet
        open={sheetOpen && !!offer}
        onClose={() => setSheetOpen(false)}
        title="Promotion used"
        tone="business"
        headerHeight={53}
        bodyPadding={{ top: 18, right: 20, bottom: 12, left: 20 }}
        footer={<CtaButton label="Record" loading={busy} disabled={!picked || !online} onClick={() => void record()} />}
      >
        <p className="m-0 mb-3 text-[12.5px] leading-[18px] text-charcoal-soft">Optional. Pick the promotion this payment used. The price stays what you charged.</p>
        <div role="radiogroup" aria-label="Promotion used" className="flex flex-col gap-2" data-promotion-used="">
          {offer?.promos.map((p) => {
            const on = picked === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPicked(p.id)}
                className={`tap w-full min-h-[52px] rounded-[14px] px-3.5 py-2.5 flex items-center gap-3 text-start border ${on ? "border-primary-dark bg-primary-pale" : "border-charcoal/10 bg-cream-card"}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold leading-[18px] text-charcoal [overflow-wrap:anywhere]">{p.name}</span>
                  <span className="block text-[11px] leading-[15px] text-charcoal-faint">{offerSub(p)}</span>
                </span>
                {on && <Check size={16} strokeWidth={2.6} aria-hidden className="shrink-0 text-primary-dark" />}
              </button>
            );
          })}
        </div>
        {error && (
          <p role="alert" className="mt-3 mb-0 text-[12px] font-semibold leading-[17px] text-status-high">
            {error}
          </p>
        )}
      </BottomSheet>
      <Toast open={done} variant="business" message="Promotion recorded." onExpire={() => setDone(false)} />
    </>
  );
}
