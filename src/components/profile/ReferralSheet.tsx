import React, { useEffect, useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { Copy, Check, Gift } from "lucide-react";
import {
  getOrCreateMyReferralCode,
  previewReferral,
  redeemReferral,
  type ReferralPreview,
} from "../../services/redemption";

// QA 11.0: "Put a referral tab... gives you a code when another client,
// professional and/or business subscribes to Centium. The code applies a
// 10% discount to the subscription model for a one time use per account.
// The client who succeeded in referral gets 1500 points in the tier list
// as well as 15% off of the next month subscription." Shared across
// Client/Professional/Business More pages — "Apply the same referral
// program found in the client UI."
export const ReferralSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { authUserId, referralRedeemed, referralDiscountPct, referralNextMonthDiscountPct, applyReferralReward } =
    useApp();
  const [codeDraft, setCodeDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // The confirmation step: preview_referral() first, then redeem only once
  // the user has seen who the code belongs to and what it's worth.
  const [preview, setPreview] = useState<ReferralPreview | null>(null);

  // The user's own code, from the referrals table. Fetched once per mount
  // and remembered, so reopening the sheet never mints a second code and
  // orphans one that may already have been shared.
  const [myCode, setMyCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const requested = useRef(false);

  useEffect(() => {
    if (!open || !authUserId || requested.current) return;
    requested.current = true;
    void getOrCreateMyReferralCode(authUserId).then((r) => {
      if (r.status === "ok") setMyCode(r.code);
      else setCodeError(r.message);
    });
  }, [open, authUserId]);

  const copyCode = async () => {
    if (!myCode) return;
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const lookUp = async () => {
    setResult(null);
    setBusy(true);
    const found = await previewReferral(codeDraft);
    setBusy(false);
    if (found.status === "found") {
      setPreview(found.data);
      return;
    }
    setResult({
      success: false,
      message: found.status === "not_found" ? "Code not found — check it and try again." : found.message,
    });
  };

  const confirm = async () => {
    if (!preview) return;
    setBusy(true);
    const outcome = await redeemReferral(preview.code);
    setBusy(false);
    setPreview(null);
    setCodeDraft("");

    if (outcome.status === "success") {
      // Real number off the returned row rather than a hardcoded 10.
      // Only the referee's discount applies to THIS account — the referrer's
      // points and discount are credited to their own account by the RPC.
      applyReferralReward(outcome.discountPct ?? preview.refereeDiscountPct);
      setResult({
        success: true,
        message: outcome.message ?? `Code applied — ${outcome.discountPct ?? preview.refereeDiscountPct}% off your subscription.`,
      });
      return;
    }
    setResult({ success: false, message: outcome.message });
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
              {myCode ?? (codeError ? "Unavailable" : "…")}
            </span>
            <button
              onClick={copyCode}
              disabled={!myCode}
              aria-label="Copy referral code"
              className="tap w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 disabled:opacity-40"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          {codeError && <p className="text-[11px] text-status-high mt-2">{codeError}</p>}
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
          ) : preview ? (
            // Confirmation card — shown before anything is redeemed.
            <div className="rounded-2xl bg-primary-pale p-3.5 animate-fade-slide-up">
              <p className="text-sm font-semibold text-primary-deep-text mb-1">
                {preview.referrerFirstName} invited you
              </p>
              <p className="text-xs text-primary-dark mb-3">
                You'll get {preview.refereeDiscountPct}% off your subscription
                {preview.referrerDiscountPct > 0
                  ? `, and ${preview.referrerFirstName} gets ${preview.referrerDiscountPct}% off theirs.`
                  : "."}
              </p>
              <div className="flex items-center gap-2">
                <Button size="md" onClick={confirm} disabled={busy}>
                  {busy ? "Applying…" : "Confirm"}
                </Button>
                <Button size="md" variant="ghost" onClick={() => setPreview(null)} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
                placeholder="Enter a friend's code"
                className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button size="md" onClick={lookUp} disabled={!codeDraft.trim() || busy}>
                {busy ? "…" : "Apply"}
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
