import React, { useCallback, useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Copy, Check, Gift, Share, Sparkles, UserPlus } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { useApp } from "../../context/AppContext";
import {
  getReferralSummary,
  mintMyReferralCode,
  redeemReferralCode,
  previewReferralCode,
  type ReferralSummary,
} from "../../services/redemption";
import { appliedLine, previewOfferLine, redemptionsLine } from "../../services/redemption/referralLogic";

// MO1.10 Invite friends, as a centred popup (R15/popups, batch C, C30), on
// the A6 backend ("Stage A6 · Referrals" in ../Database/docs/HANDOVER_API.md):
//
// - referral_summary() on every open (free, creates nothing). Its `code` is
//   NULL until my_referral_code() has minted one, so the code row shows
//   "Get my code" until then; my_referral_code() is called from that button
//   only, never just to look.
// - The code is permanent: one per account, no expiry, shared as often as
//   you like.
// - "Have a code?" calls redeem_referral_code() straight from Apply (as the
//   frame draws: Apply → MO1.10.1 or MO1.10.2) and words the outcome from its
//   `reason`, never from `message`. An account that has already been referred
//   (i_was_referred) sees MO1.10.1's applied row in the field's place, with
//   its own discount (my_discount_pct).
//
// REMOVED in A6: the create_referral() / per-row code flow.
//
// THE "{name} invited you" CONFIRM IS BACK (user decision, 7 October 2026), on
// preview_referral_code(): Apply previews first (first name and the two
// rates, nothing else), and only Confirm redeems. Preview's reasons are its
// own (not_valid covers unknown, own, used and expired codes alike, so it
// cannot be used to probe codes) and are not mapped onto redeem's.
//
// Still waiting on the D25 reward model: the frame's reward wording ("first
// payment", "a future bill"), the "N of 12 discount rewards" progress bar and
// its three rule lines, "Codes apply to your first subscription only." and
// MO1.10.3's subscribed state. The progress line's slot carries what the
// summary does know: how many friends joined and the points earned.
//
// QA 11.0: shared across Client / Professional / Business More pages.
export const ReferralPopup: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { authUserId } = useApp();
  const [codeDraft, setCodeDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);

  // Another account signed in: nothing of the last one's may show (reset
  // during render, so no frame paints the previous account's code).
  const [summaryFor, setSummaryFor] = useState(authUserId);
  if (summaryFor !== authUserId) {
    setSummaryFor(authUserId);
    setSummary(null);
    setSummaryError(null);
    setMintError(null);
    setResult(null);
    setCodeDraft("");
  }

  const fetchSummary = useCallback(
    () =>
      getReferralSummary().then((r) => {
        if (r.status === "ok") {
          setSummary(r.summary);
          setSummaryError(null);
        } else setSummaryError(r.message);
      }),
    []
  );

  // Re-read on every open so the counts are current; the reader is free.
  useEffect(() => {
    if (!open || !authUserId) return;
    void fetchSummary();
  }, [open, authUserId, fetchSummary]);

  const loadSummary = () => {
    setSummaryError(null);
    void fetchSummary();
  };

  const myCode = summary?.code ?? null;

  const getMyCode = async () => {
    setMintError(null);
    setMinting(true);
    const r = await mintMyReferralCode();
    setMinting(false);
    if (r.status === "ok") setSummary((s) => (s ? { ...s, code: r.code } : s));
    else setMintError(r.message);
  };

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

  // The previewed invitation awaiting Confirm (null = the field shows).
  const [invite, setInvite] = useState<{
    code: string;
    referrerFirstName: string;
    refereeDiscountPct: number | null;
    referrerDiscountPct: number | null;
  } | null>(null);

  const lookUp = async () => {
    if (!codeDraft.trim()) return;
    setResult(null);
    setBusy(true);
    const p = await previewReferralCode(codeDraft);
    setBusy(false);
    if (p.status === "found") {
      setInvite({ code: codeDraft, ...p });
      return;
    }
    setResult({ success: false, message: p.status === "refused" ? p.line : p.message });
  };

  const apply = async () => {
    const code = invite?.code ?? codeDraft;
    if (!code.trim()) return;
    setResult(null);
    setBusy(true);
    const outcome = await redeemReferralCode(code);
    setBusy(false);
    setInvite(null);
    if (outcome.status === "redeemed") {
      setCodeDraft("");
      setResult({ success: true, message: outcome.line });
      setSummary((s) => (s ? { ...s, iWasReferred: true, myDiscountPct: outcome.discountPct } : s));
      return;
    }
    // A refusal (by reason) and a raised error (rate limit, offline, signed
    // out) both show as MO1.10.2's line under the field.
    setResult({ success: false, message: outcome.status === "refused" ? outcome.line : outcome.message });
  };

  // MO1.10.1 in the field's place: this session's redemption, or one made
  // before (one per account, ever).
  const appliedMessage = result?.success
    ? result.message
    : summary?.iWasReferred
      ? appliedLine(summary.myDiscountPct)
      : null;
  const progressLine = summary ? redemptionsLine(summary) : null;

  // MO1.10 row 3: the popup's labels are 10.5/700 (cap 7.5 on the 2x frame),
  // 10 above what they name (no rule under them in the popup).
  const label = (text: string) => (
    <p className="text-[10.5px] leading-[14px] font-bold text-charcoal-faint uppercase tracking-wide mb-2.5">{text}</p>
  );

  // MO1.10 (2x frame): Copy, Share and (unspecified, same fill) Get my code
  // take #9A8CD6 (th-9a8cd6, follows the theme) in light; dark keeps
  // primary-fill.
  const filled = "bg-th-9a8cd6 text-white dark:bg-primary-fill dark:text-on-primary-fill";

  return (
    // MO1.10 anatomy rows 3–5: title 19/800, Gift 23/1.75. Row 3 "padding 0
    // 18px": content 18 in, the Gift tile 22 under the top (y 148 → 192) and
    // Apply 18 above the bottom (y 1503 → 1539). Decision 23 (flag): the
    // Foundations 342 width (16 side margins) rather than the frame's 354.
    <CentredPopup
      open={open}
      onClose={onClose}
      title="Invite friends"
      titleSize={19}
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
        {/* The points are real: redeem_referral_code() writes them to the
            referrer's points_ledger, shown under "from referrals" on both
            tier cards. What they are for is a tier and, so far, nothing else. */}
        <p className="mt-2 text-[12px] text-charcoal-faint">Points count toward your tier. Rewards for points are coming soon.</p>

        {/* MO1.10 (2x frame): 14 between the note and "Your code"; the code
            box 48 tall, radius 12, the code 16/800 (cap 11.5) spaced 0.18em;
            the Copy button radius 12. Decision 23 (item 25): the frame's 1px
            #E4E4E3 hairline (charcoal 12% on white) in light, as in dark. */}
        <div className="mt-3.5">{label("Your code")}</div>
        {summary && !myCode ? (
          // No code minted yet (referral_summary's code is NULL). Not drawn
          // on the board: one full-width button in the Share code style.
          <>
            <button
              type="button"
              onClick={() => void getMyCode()}
              disabled={minting}
              className={`tap w-full h-12 rounded-[14px] ${filled} text-[14px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40`}
            >
              {minting ? "Getting your code…" : "Get my code"}
            </button>
            {mintError && <p role="alert" className="text-[11px] text-status-high mt-2">{mintError}</p>}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {myCode ? (
                <span className="flex-1 min-w-0 h-12 rounded-xl bg-cream-card border border-charcoal/[0.12] flex items-center justify-center text-[16px] font-extrabold tracking-[0.18em] text-charcoal truncate">
                  {myCode}
                </span>
              ) : (
                // Loading (not drawn): a skeleton block at the code box's
                // place, surface.soft at the box's radius.
                <span
                  className={`flex-1 min-w-0 h-12 rounded-xl bg-cream-soft flex items-center justify-center text-[13px] text-charcoal-faint ${summaryError ? "" : "animate-pulse"}`}
                  aria-busy={!summaryError || undefined}
                >
                  {summaryError ? "Unavailable" : ""}
                </span>
              )}
              <button
                type="button"
                onClick={() => void copyCode()}
                disabled={!myCode}
                aria-label="Copy"
                className={`tap w-12 h-12 rounded-xl ${filled} flex items-center justify-center shrink-0 disabled:opacity-40`}
              >
                {copied ? <Check size={18} strokeWidth={1.75} /> : <Copy size={18} strokeWidth={1.75} />}
              </button>
            </div>
            {summaryError && (
              <p role="alert" className="text-[11px] text-status-high mt-2">
                {summaryError}{" "}
                <button type="button" onClick={loadSummary} className="tap font-bold underline">
                  Try again
                </button>
              </p>
            )}
            <button
              type="button"
              onClick={() => void shareCode()}
              disabled={!myCode}
              // MO1.10: 8 under the code row (2x frame y 943 → 960), radius 14.
              className={`tap mt-2 w-full h-12 rounded-[14px] ${filled} text-[14px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40`}
            >
              <Share size={16} strokeWidth={1.75} aria-hidden />
              {copied ? "Code copied" : "Share code"}
            </button>
          </>
        )}

        {/* The frame's progress-line slot (2x y 1101, ≈13 regular, charcoal;
            size measured, not given): referral_summary's redemptions and
            points_earned, once anybody has used the code. */}
        {progressLine && <p className="mt-4 text-[13px] text-charcoal">{progressLine}</p>}

        {/* MO1.10 (2x frame): the rule 16 under the block above (y 1290 →
            1330) and 14 above "Have a code?". */}
        <div className="mt-4 pt-3.5 border-t border-charcoal/[0.06]">
          {label("Have a code?")}
          {appliedMessage ? (
            // MO1.10.1: the success row replaces the code box.
            // MO1.10.1 (2x frame): 48 tall (y 1408–1503), radius 12, #E4F0EE
            // with #2F5F58 text and icon (new, decision 22; theme secondary),
            // 10 between the 18 check and the text.
            <p role="status" className="flex items-center gap-2.5 min-h-12 rounded-xl bg-th-e4f0ee dark:bg-teal-pale px-3.5 py-3 text-[13px] font-semibold text-th-2f5f58 dark:text-teal-deep-text">
              {/* MO1.10.1: CircleCheck 18/2. */}
              <CircleCheck size={18} strokeWidth={2} className="shrink-0" aria-hidden />
              {appliedMessage}
            </p>
          ) : invite ? (
            // The confirm, as main drew it (item 131): an r12 primary-pale row
            // in the field's place, then Cancel / Confirm (48, r14, gap 8).
            <div className="animate-fade-slide-up">
              <div className="min-h-12 rounded-xl bg-primary-pale px-3.5 py-2.5 flex flex-col justify-center">
                <p className="text-sm font-semibold text-primary-deep-text">{invite.referrerFirstName} invited you</p>
                <p className="text-xs text-primary-dark">{previewOfferLine(invite)}</p>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setInvite(null)}
                  disabled={busy}
                  className="tap flex-1 h-12 rounded-[14px] bg-primary-pale text-primary-accent text-[14px] font-bold disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void apply()}
                  disabled={busy}
                  className={`tap flex-1 h-12 rounded-[14px] text-[14px] font-bold disabled:opacity-60 ${filled}`}
                >
                  {busy ? "Applying…" : "Confirm"}
                </button>
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
                onKeyDown={(e) => e.key === "Enter" && codeDraft.trim() && !busy && void lookUp()}
                placeholder="Enter a code"
                aria-label="A friend's referral code"
                aria-invalid={(result && !result.success) || undefined}
                // MO1.10 (2x frame): 48 tall, radius 12, #F5F5F6 (y 1408–1503);
                // MO1.10.2: the border turns danger on a refusal. Decision 23
                // (item 26): no visible border otherwise, as drawn, in light
                // and dark. The typed code 14/600 (Foundations Inputs;
                // MO1.10.2 cap 10 on the 2x frame); the danger border is 1.5
                // (y 1340–1342).
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
          {/* MO1.10.2: a refusal, worded from redeem_referral_code's reason. */}
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
