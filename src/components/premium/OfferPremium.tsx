import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { Button } from "../ui/Button";
import { Toggle } from "../ui/Toggle";
import { usePremium } from "../../services/premium/hooks";
import { askPremium } from "../../services/premium/asks";
import { fetchOfferPremiumOnly, setOfferPremiumOnly } from "../../services/premium/g2Calls";
import { t } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G2 · Premium-only offers. offer_catalogue / offer_detail say
// premium_only (true only while the switch is on for the caller), which puts
// a "Premium" label on the offer. A free member meets "Premium members only"
// and the prompt in Redeem's place (redeem_offer also refuses with ATXQ1).
// The offer's owner (the professional, or business staff with marketing)
// gets a "Premium members only" switch on the offer editor, only with the
// switch on (set_offer_premium_only answers ATXQ0 otherwise).

/** In Redeem's place for a free member. */
export function PremiumOfferNote() {
  return (
    <div role="note" data-offer-premium="" className="flex flex-col items-center gap-2 rounded-2xl bg-cream-soft px-4 py-3.5 text-center">
      <span className="flex items-center gap-1.5 text-[13px] font-bold text-charcoal">
        <Crown size={14} aria-hidden className="text-gold" />
        {t("Premium members only")}
      </span>
      <Button variant="primary" size="md" onClick={() => askPremium("premium_offers", "tap")}>
        {t("See Premium")}
      </Button>
    </div>
  );
}

/** The owner's switch on an existing offer (the switch on only). */
export function OfferPremiumToggle({ offerId, disabled = false }: { offerId: string; disabled?: boolean }) {
  const { premium } = usePremium();
  const on = !!premium?.premiumOn;
  const [value, setValue] = useState<{ id: string; on: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!on) return;
    let live = true;
    void fetchOfferPremiumOnly(offerId).then((v) => live && v !== null && setValue({ id: offerId, on: v }));
    return () => {
      live = false;
    };
  }, [on, offerId]);

  const current = value && value.id === offerId ? value.on : null;
  // Off, loading, or a Database without the column: today's editor.
  if (!on || current === null) return null;

  const change = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await setOfferPremiumOnly(offerId, next);
    setBusy(false);
    if (r.ok) setValue({ id: offerId, on: r.value });
    else setError(r.message);
  };

  return (
    <div data-offer-premium-toggle="" className="my-3 rounded-2xl bg-cream-card px-4 py-3 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-charcoal">{t("Premium members only")}</p>
          <p className="mt-0.5 text-[11.5px] leading-[16px] text-charcoal-faint">{t("Everyone sees the offer; only Premium members can redeem it.")}</p>
        </div>
        <Toggle checked={current} onChange={(v) => void change(v)} disabled={disabled || busy} label={t("Premium members only")} />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[12px] text-status-high">
          {error}
        </p>
      )}
    </div>
  );
}
