import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { Copy, Check, Gift } from "lucide-react";

// QA 11.0: "Put a referral tab... gives you a code when another client,
// professional and/or business subscribes to Centium. The code applies a
// 10% discount to the subscription model for a one time use per account.
// The client who succeeded in referral gets 1500 points in the tier list
// as well as 15% off of the next month subscription." Shared across
// Client/Professional/Business More pages — "Apply the same referral
// program found in the client UI."
export const ReferralSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { referralCode, referralRedeemed, referralDiscountPct, referralNextMonthDiscountPct, redeemReferralCode } =
    useApp();
  const [codeDraft, setCodeDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const submit = () => {
    setResult(redeemReferralCode(codeDraft));
    setCodeDraft("");
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Referral">
      <div className="space-y-5 animate-fade-slide-up">
        <div className="bg-primary-pale rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Gift size={15} className="text-primary-dark" />
            <p className="text-sm font-bold text-primary-deep-text">Your referral code</p>
          </div>
          <p className="text-xs text-charcoal-soft mb-3">
            Share this code — when someone subscribes to Centium using it, they get 10% off their
            subscription, and you get 1,500 points plus 15% off your next month.
          </p>
          <div className="flex items-center gap-2">
            <span className="flex-1 rounded-xl bg-cream-card border border-charcoal/10 px-3.5 py-2.5 text-sm font-bold text-charcoal tracking-wide text-center">
              {referralCode}
            </span>
            <button
              onClick={copyCode}
              aria-label="Copy referral code"
              className="tap w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {referralNextMonthDiscountPct > 0 && (
          <p className="text-xs font-semibold text-primary-dark bg-primary-pale/60 rounded-xl px-3.5 py-2.5">
            A referral succeeded — you have {referralNextMonthDiscountPct}% off your next month's subscription.
          </p>
        )}

        <div>
          <p className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Have a code?</p>
          {referralRedeemed ? (
            <p className="text-xs text-charcoal-faint bg-cream-soft rounded-xl px-3.5 py-2.5">
              You've already redeemed a referral code
              {referralDiscountPct > 0 ? ` — ${referralDiscountPct}% off is applied to your subscription.` : "."}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
                placeholder="Enter a friend's code"
                className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button size="md" onClick={submit} disabled={!codeDraft.trim()}>
                Apply
              </Button>
            </div>
          )}
          {result && (
            <p className={`text-xs font-semibold mt-2 ${result.success ? "text-status-good" : "text-status-high"}`}>
              {result.message}
            </p>
          )}
        </div>
      </div>
    </BottomSheet>
  );
};
