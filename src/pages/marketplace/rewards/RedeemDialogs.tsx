import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx, linePx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { FOCUS_CSS, usePress } from "../../../components/market/usePress";
import { SheetBox } from "../PurchaseSheet";
import { deductionLine, redeemOffer } from "../../../services/offers";
import { newRequestId } from "./rewardsModel";

// Market + Share 3.0 · W2 · C-MO.4.4.3 Redeem confirm (`redeem1`, `redeem2`):
// the two-step MasterBottomSheet over the offer. Literal values, Client
// Explore Screens lines 486–513 and the script's `redeem`:
// - the app BottomSheet's defaults (band --sband, 1px --sborder, radius 32,
//   53 title bar 20 / 800 --stitle, the 26 close ring, body --sbody radius 22
//   padding 20) and the footer rule (padding 8 20 34, 1px --srule, gap 4);
// - the step bars: two 4-tall radius 999 bars, gap 6, margin-bottom 12; step
//   1 --segactive + --soft, step 2 both --segactive;
// - the "Offer" --sgrey box (radius 14, padding 12 14, the label 13 / 500
//   --slabel 8 above) holding the --sfield card (radius 10, padding 11 13):
//   the headline 14 / 800, the owner 12 / 600 --accent (margin-top 1), the
//   deduction line 13 / 19 (margin-top 8);
// - step 1 "Redeem this offer": the note 12 / 17 --faint (margin-top 12)
//   "Points are non-refundable once the voucher is issued.", CTA "Continue",
//   the secondary "Cancel" (40 tall 14 / 700 --ink2);
// - step 2 "Confirm redemption": the caution row (margin-top 12, --cautionbg,
//   radius 14, padding 10 12, gap 10; the 6 dot --caution at margin-top 6;
//   12 / 17 600 --caution), CTA "Redeem 900 points", the secondary "Back".
// Confirm calls redeem_offer (DB2, ⟳) with ONE request id per open sheet, kept
// across retries so a retry can't redeem twice; a new opening makes a new
// one. Refusals show REDEEM_ERROR_TEXT; before DB2 lands it says "Redeeming
// points is coming soon." On success the voucher opens (?new=1 shows "Saved
// to My Rewards") and the points summary is re-read.

export interface RedeemSheetProps {
  open: boolean;
  onClose: () => void;
  offerId: string;
  headline: string;
  /** The owner line ("Outline Activewear", "Rana Khoury · Trainer"). */
  owner: string;
  cost: number;
  balance: number;
}

export const RedeemSheet: React.FC<RedeemSheetProps> = ({ open, onClose, offerId, headline, owner, cost, balance }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const { refreshAchievements } = useApp();
  const press = usePress();
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);

  // Each opening starts at step 1 with a fresh request id; a retry inside the
  // same opening keeps it.
  useEffect(() => {
    if (open) {
      setStep(1);
      setError(null);
      setBusy(false);
      requestId.current = newRequestId();
    }
  }, [open]);

  const confirm = async () => {
    if (busy) return;
    if (!requestId.current) requestId.current = newRequestId();
    setBusy(true);
    setError(null);
    // awaiting DB stage DB2: redeem_offer.
    const r = await redeemOffer(offerId, requestId.current);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    refreshAchievements();
    onClose();
    navigate(`/app/marketplace/vouchers/${encodeURIComponent(r.voucher.id)}?new=1`);
  };

  const primary = step === 1 ? "Continue" : `Redeem ${cost.toLocaleString("en-US")} points`;
  const secondary = step === 1 ? "Cancel" : "Back";

  return (
    <BottomSheet
      open={open}
      onClose={() => !busy && onClose()}
      title={step === 1 ? "Redeem this offer" : "Confirm redemption"}
      footerRule
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <style>{FOCUS_CSS}</style>
          <button
            type="button"
            onClick={() => (step === 1 ? setStep(2) : void confirm())}
            aria-disabled={busy || undefined}
            aria-busy={busy || undefined}
            className="market-focus"
            {...press.handlers}
            style={{ width: "100%", height: 50, borderRadius: 16, border: 0, background: m.fill, color: m.onfill, font: "inherit", fontSize: textPx(15), fontWeight: 700, cursor: busy ? "default" : "pointer", ...(busy ? {} : press.style) }}
          >
            {busy ? "One moment…" : primary}
          </button>
          <button
            type="button"
            onClick={() => {
              if (busy) return;
              if (step === 2) {
                setStep(1);
                setError(null);
              } else onClose();
            }}
            className="market-focus"
            style={{ height: 40, border: 0, background: "none", font: "inherit", fontSize: textPx(14), fontWeight: 700, color: m.ink2, cursor: "pointer" }}
          >
            {secondary}
          </button>
        </div>
      }
    >
      <div style={{ lineHeight: "normal", color: m.ink }}>
        <div aria-hidden style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={{ flex: 1, height: 4, borderRadius: 999, background: m.segactive }} />
          <span style={{ flex: 1, height: 4, borderRadius: 999, background: step === 2 ? m.segactive : m.soft }} />
        </div>
        <span className="sr-only">{`Step ${step} of 2`}</span>
        <SheetBox label="Offer" id="redeem-offer">
          <div style={{ background: m.card, borderRadius: 10, padding: "11px 13px" }}>
            <div style={{ fontSize: textPx(14), fontWeight: 800 }}>{headline}</div>
            <div style={{ fontSize: textPx(12), fontWeight: 600, color: m.accent, marginTop: 1 }}>{owner}</div>
            <div style={{ marginTop: 8, fontSize: textPx(13), lineHeight: linePx(19) }}>{deductionLine(cost, balance)}</div>
          </div>
        </SheetBox>
        {step === 2 ? (
          <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "flex-start", borderRadius: 14, padding: "10px 12px", background: m.cautionbg }}>
            <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: m.caution, marginTop: 6, flexShrink: 0 }} />
            <span style={{ fontSize: textPx(12), lineHeight: linePx(17), fontWeight: 600, color: m.caution }}>Points are non-refundable once the voucher is issued.</span>
          </div>
        ) : (
          <div style={{ marginTop: 12, fontSize: textPx(12), lineHeight: linePx(17), color: m.faint }}>Points are non-refundable once the voucher is issued.</div>
        )}
        {error ? (
          <p role="alert" style={{ margin: "12px 0 0", fontSize: textPx(12), lineHeight: linePx(17), fontWeight: 600, color: m.high }}>
            {error}
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
};
