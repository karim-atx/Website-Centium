import React, { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Copy, Check, Gift, Share, Sparkles, UserPlus } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import {
  getOrCreateMyReferralCode,
  previewReferral,
  redeemReferral,
  type ReferralPreview,
} from "../../services/redemption";

// MO1.10 Invite friends, as a centred popup (R15/popups, batch C, C30),
// ON TODAY'S TERMS: the rewards card says what redeem_referral() actually
// does (10% off for the friend; 1,500 points, which are real in points_ledger,
// plus 15% off the next month for you). The board's "3 of 12 rewards this
// year" bar and its rule lines describe the referral model in the backlog
// (D25), so they are left out until it exists.
//
// KEPT FROM THE SHEET: the "{name} invited you" confirm before anything is
// redeemed, the "a referral succeeded" banner, and the already-redeemed
// state. MO1.10.1 and .2 use today's paths: the success row replaces the code
// box, and a refusal is a red line with the RPC's own words (the board's
// per-reason wording needs reason codes from the backend). MO1.10.3 (already
// subscribed) needs store subscription data and is skipped.
//
// QA 11.0: shared across Client / Professional / Business More pages.
export const ReferralPopup: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { authUserId, referralRedeemed, referralDiscountPct, referralNextMonthDiscountPct, applyReferralReward } =
    useApp();
  const [codeDraft, setCodeDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ReferralPreview | null>(null);

  // The user's own code, fetched once per mount and remembered, so reopening
  // never mints a second code and orphans one that may already be shared.
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
    if (!myCode) return false;
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      return true;
    } catch {
      setCopied(false);
      return false;
    }
  };

  // The phone's share menu where there is one; elsewhere, copy.
  const shareCode = async () => {
    if (!myCode) return;
    const text = `Join me on Centium with my referral code ${myCode} for 10% off your subscription.`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Centium", text });
        return;
      } catch {
        // Dismissed or refused: fall through to copying.
      }
    }
    await copyCode();
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
      message: found.status === "not_found" ? "Code not found. Check it and try again." : found.message,
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
      // The returned row's number, not a hardcoded 10: only the friend's
      // discount applies to THIS account.
      const pct = outcome.discountPct ?? preview.refereeDiscountPct;
      applyReferralReward(pct);
      setResult({ success: true, message: outcome.message ?? `Code applied. ${pct}% off your subscription.` });
      return;
    }
    setResult({ success: false, message: outcome.message });
  };

  // MO1.10 row 3: the popup's labels are 10.5/700 (cap 7.5 on the 2x frame),
  // 10 above what they name (no rule under them in the popup).
  const label = (text: string) => (
    <p className="text-[10.5px] leading-[14px] font-bold text-charcoal-faint uppercase tracking-wide mb-2.5">{text}</p>
  );

  return (
    // MO1.10 anatomy rows 3–5: title 19/800, Gift 23/1.75. Row 3 "padding 0
    // 18px": the card is 354 wide at 390 (2x frame x 36–743), its content 18
    // in (x 72), the Gift tile 22 under the top (y 148 → 192) and Apply 18
    // above the bottom (y 1503 → 1539).
    <CentredPopup
      open={open}
      onClose={onClose}
      title="Invite friends"
      titleSize={19}
      maxWidth={354}
      className="!px-[18px] !pt-[22px] !pb-[18px]"
      icon={<Gift size={23} strokeWidth={1.75} />}
    >
      <div className="text-start">
        {label("Rewards")}
        <div className="rounded-2xl border border-charcoal/[0.08] px-3.5">
          {[
            { icon: UserPlus, who: "Your friend", what: "10% off their subscription" },
            { icon: Sparkles, who: "You", what: "1,500 points plus 15% off your next month" },
          ].map((row, i) => (
            <div key={row.who} className={`flex items-center gap-3 py-3 ${i === 1 ? "border-t border-charcoal/[0.06]" : ""}`}>
              {/* MO1.10 (2x frame): a 32 r10 #F0EDF9 tile (x 102–165) with
                  the glyph in #7D67D9 (new popup, decision 22). */}
              <span className="w-8 h-8 rounded-[10px] bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
                {/* MO1.10: UserPlus / Sparkles 15/1.75; reward line 13.5/700. */}
                <row.icon size={15} strokeWidth={1.75} className="text-primary-accent" />
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] text-charcoal-faint">{row.who}</span>
                <span className="block text-[13.5px] font-bold text-charcoal">{row.what}</span>
              </span>
            </div>
          ))}
        </div>
        {/* The points are real: redeem_referral() writes 1,500 to
            points_ledger, shown under "from referrals" on both tier cards.
            What they are for is a tier and, so far, nothing else. */}
        <p className="mt-2 text-[12px] text-charcoal-faint">Points count toward your tier. Rewards for points are coming soon.</p>

        {referralNextMonthDiscountPct > 0 && (
          <p className="mt-3 text-xs font-semibold text-primary-dark bg-primary-pale rounded-xl px-3.5 py-2.5">
            A referral succeeded: you have {referralNextMonthDiscountPct}% off your next month's subscription.
          </p>
        )}

        {/* MO1.10 (2x frame): 14 between the note and "Your code"; the code
            box 48 tall, radius 12, a 12% hairline (#E4E4E3), the code 16/800
            (cap 11.5) spaced 0.18em; the Copy button radius 12. */}
        <div className="mt-3.5">{label("Your code")}</div>
        <div className="flex items-center gap-2">
          <span className="flex-1 min-w-0 h-12 rounded-xl bg-cream-card border border-charcoal/[0.12] flex items-center justify-center text-[16px] font-extrabold tracking-[0.18em] text-charcoal truncate">
            {myCode ?? (codeError ? "Unavailable" : "…")}
          </span>
          <button
            type="button"
            onClick={() => void copyCode()}
            disabled={!myCode}
            aria-label="Copy referral code"
            className="tap w-12 h-12 rounded-xl bg-primary-fill text-on-primary-fill flex items-center justify-center shrink-0 disabled:opacity-40"
          >
            {copied ? <Check size={18} strokeWidth={1.75} /> : <Copy size={18} strokeWidth={1.75} />}
          </button>
        </div>
        {codeError && <p className="text-[11px] text-status-high mt-2">{codeError}</p>}
        <button
          type="button"
          onClick={() => void shareCode()}
          disabled={!myCode}
          // MO1.10: 8 under the code row (2x frame y 943 → 960), radius 14.
          className="tap mt-2 w-full h-12 rounded-[14px] bg-primary-fill text-on-primary-fill text-[14px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Share size={16} strokeWidth={1.75} aria-hidden />
          {copied ? "Code copied" : "Share code"}
        </button>

        {/* MO1.10 (2x frame): the rule 16 under the block above (y 1290 →
            1330) and 14 above "Have a code?". */}
        <div className="mt-4 pt-3.5 border-t border-charcoal/[0.06]">
          {label("Have a code?")}
          {result?.success ? (
            // MO1.10.1: the success row replaces the code box.
            // MO1.10.1 (2x frame): 48 tall (y 1408–1503), radius 12, #E4F0EE
            // with #2F5F58 text and icon (new, decision 22; theme secondary),
            // 10 between the 18 check and the text.
            <p role="status" className="flex items-center gap-2.5 min-h-12 rounded-xl bg-th-e4f0ee dark:bg-teal-pale px-3.5 py-3 text-[13px] font-semibold text-th-2f5f58 dark:text-teal-deep-text">
              {/* MO1.10.1: CircleCheck 18/2. */}
              <CircleCheck size={18} strokeWidth={2} className="shrink-0" aria-hidden />
              {result.message}
            </p>
          ) : referralRedeemed ? (
            <p className="text-xs text-charcoal-faint bg-cream-soft rounded-xl px-3.5 py-2.5">
              You've already redeemed a referral code
              {referralDiscountPct > 0 ? `. ${referralDiscountPct}% off is applied to your subscription.` : "."}
            </p>
          ) : preview ? (
            // The confirmation, before anything is redeemed.
            <div className="rounded-2xl bg-primary-pale p-3.5 animate-fade-slide-up">
              <p className="text-sm font-semibold text-primary-deep-text mb-1">{preview.referrerFirstName} invited you</p>
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
                onChange={(e) => {
                  setCodeDraft(e.target.value.toUpperCase());
                  setResult(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && codeDraft.trim() && void lookUp()}
                placeholder="Enter a code"
                aria-label="A friend's referral code"
                aria-invalid={(result && !result.success) || undefined}
                // MO1.10 (2x frame): 48 tall, radius 12, #F5F5F6 with no
                // visible border (y 1408–1503); MO1.10.2: the border turns
                // danger on a refusal.
                // The typed code 14/600 (Foundations Inputs; MO1.10.2 cap
                // 10 on the 2x frame); the danger border is 1.5 (y 1340–1342).
                className={`flex-1 min-w-0 h-12 rounded-xl bg-cream-soft border-[1.5px] px-3.5 text-sm font-semibold text-charcoal placeholder:font-normal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  result && !result.success ? "border-status-high" : "border-transparent"
                }`}
              />
              {/* MO1.10 / MO1.10.2: a tinted Apply, #F0EDF9 with #7D67D9
                  text (2x frame; new popup, decision 22), drawn the same with
                  or without a code typed; 48 tall, about 73 wide, radius 12
                  (x 562–707, y 1408–1503). */}
              <button
                type="button"
                onClick={() => void lookUp()}
                disabled={!codeDraft.trim() || busy}
                className="tap h-12 px-5 rounded-xl bg-primary-pale text-primary-accent text-[13px] font-bold shrink-0 disabled:pointer-events-none"
              >
                {busy ? "…" : "Apply"}
              </button>
            </div>
          )}
          {/* MO1.10.2: a refusal, in the RPC's own words for now. */}
          {result && !result.success && (
            // MO1.10.2 (2x frame): 10 under the field, 8 between the 13 icon
            // and the 12/600 line.
            <p role="alert" className="mt-2.5 flex items-start gap-2 text-xs font-semibold text-status-high">
              {/* MO1.10.2: CircleAlert 13/2. */}
              <CircleAlert size={13} strokeWidth={2} className="shrink-0 mt-px" aria-hidden />
              {result.message}
            </p>
          )}
        </div>
      </div>
    </CentredPopup>
  );
};
