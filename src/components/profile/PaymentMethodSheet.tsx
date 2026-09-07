import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { CreditCard, Smartphone } from "lucide-react";
import clsx from "clsx";
import { previewReferral, redeemReferral, type ReferralPreview } from "../../services/redemption";

type PaymentMethod = "card" | "whish";

// QA 11.0: "When subscribing to a plan prompt a payment model of either
// card or whish along side a referral code that applies the effect
// mentioned previously." Shared across Client/Professional/Business —
// "Same payment method for Subscription mentioned in client UI."
export const PaymentMethodSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ open, onClose, onConfirm }) => {
  const { referralDiscountPct, applyReferralReward, referralRedeemed } = useApp();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [codeDraft, setCodeDraft] = useState("");
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ReferralPreview | null>(null);

  // Same preview-then-confirm pattern as ReferralSheet: look the code up
  // first so the user sees who it's from and what it's worth, and only then
  // spend it. Both entry points go through the same service functions so
  // they can't drift apart.
  const lookUp = async () => {
    setCodeMessage(null);
    setBusy(true);
    const found = await previewReferral(codeDraft);
    setBusy(false);
    if (found.status === "found") {
      setPreview(found.data);
      return;
    }
    setCodeMessage(
      found.status === "not_found" ? "Code not found — check it and try again." : found.message
    );
  };

  const confirmCode = async () => {
    if (!preview) return;
    setBusy(true);
    const outcome = await redeemReferral(preview.code);
    setBusy(false);
    setPreview(null);
    setCodeDraft("");

    if (outcome.status === "success") {
      const pct = outcome.discountPct ?? preview.refereeDiscountPct;
      applyReferralReward(pct);
      setCodeMessage(outcome.message ?? `Code applied — ${pct}% off.`);
      return;
    }
    setCodeMessage(outcome.message);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Payment method">
      <div className="space-y-5 animate-fade-slide-up">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMethod("card")}
            className={clsx(
              "tap rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-colors",
              method === "card" ? "border-primary bg-primary-pale" : "border-charcoal/10 bg-cream-card"
            )}
          >
            <CreditCard size={22} className={method === "card" ? "text-primary-dark" : "text-charcoal-soft"} />
            <span className="text-sm font-semibold text-charcoal">Card</span>
          </button>
          <button
            onClick={() => setMethod("whish")}
            className={clsx(
              "tap rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-colors",
              method === "whish" ? "border-primary bg-primary-pale" : "border-charcoal/10 bg-cream-card"
            )}
          >
            <Smartphone size={22} className={method === "whish" ? "text-primary-dark" : "text-charcoal-soft"} />
            <span className="text-sm font-semibold text-charcoal">Whish</span>
          </button>
        </div>

        <div>
          <p className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Referral code (optional)</p>
          {referralRedeemed ? (
            <p className="text-xs text-charcoal-faint bg-cream-soft rounded-xl px-3.5 py-2.5">
              Referral code already applied{referralDiscountPct > 0 ? ` — ${referralDiscountPct}% off` : ""}.
            </p>
          ) : preview ? (
            <div className="rounded-xl bg-primary-pale p-3 animate-fade-slide-up">
              <p className="text-xs font-semibold text-primary-deep-text mb-0.5">
                {preview.referrerFirstName} invited you
              </p>
              <p className="text-[11px] text-primary-dark mb-2.5">
                {preview.refereeDiscountPct}% off your subscription.
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={confirmCode} disabled={busy}>
                  {busy ? "Applying…" : "Confirm"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPreview(null)} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
                placeholder="e.g. CENT-ABCD1"
                className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button size="md" variant="outline" onClick={lookUp} disabled={!codeDraft.trim() || busy}>
                {busy ? "…" : "Apply"}
              </Button>
            </div>
          )}
          {codeMessage && (
            <p className={clsx("text-xs font-semibold mt-2", referralRedeemed ? "text-status-good" : "text-status-high")}>
              {codeMessage}
            </p>
          )}
        </div>

        <Button
          fullWidth
          size="lg"
          disabled={!method}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          Confirm subscription
        </Button>
        <p className="text-[11px] text-charcoal-faint text-center">
          Prototype pricing for demo purposes — no payment will be processed.
        </p>
      </div>
    </BottomSheet>
  );
};
