import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { getMfaStatus } from "../../services/mfa";
import { ShieldCheck, X } from "lucide-react";

// A nudge, and nothing more.
//
// WHAT THIS REPLACED. The original scope was mandatory two-factor for
// professional accounts. That was rejected for three reasons worth keeping
// written down, because they are the reasons this file must stay toothless:
// adoption is currently zero, so enforcement would lock out every
// professional at once; the server cannot tell "never enrolled" from "lost
// the device and is waiting on an admin reset", so there is no safe place to
// enforce it; and Admin-Centium is protected by Cloudflare Access rather than
// app-level MFA, so enforcing here would make the two postures inconsistent
// without making either stronger.
//
// SO IT BLOCKS NOTHING. This component renders a banner and navigates to a
// settings screen. It is not read by a route guard, it gates no query, and
// dismissing it sets one boolean that only this component reads. The
// enforcement that DOES exist — the aal2 challenge for somebody who has
// already enrolled — is untouched and lives in App.tsx's guards.
//
// THE SIGNAL IS THE ONE PHASE 1 ALREADY BUILT: getMfaStatus().factors, the
// same call Settings makes to label its Security row. Note that `mfaPending`
// from context is a DIFFERENT question — it means a challenge is outstanding,
// which is false both for somebody who never enrolled and for somebody
// already at aal2, so it cannot tell those two apart and is useless here.
// Settings documents the same distinction for the same reason.

export const TwoFactorNudge: React.FC = () => {
  const { user, authUserId, mfaReady, twoFactorNudgeDismissed, setTwoFactorNudgeDismissed } = useApp();
  const navigate = useNavigate();

  // Keyed on the account it asked about, the way adminFor and the ambassador
  // check are: a bare boolean would carry the previous account's answer for
  // one render after switching, which here would mean flashing a security
  // banner at somebody who has two-factor on.
  const [checked, setChecked] = useState<{ userId: string; enrolled: boolean } | null>(null);

  useEffect(() => {
    // PROFESSIONALS ONLY, and the check is here rather than at the call site
    // so the scoping travels with the component. A customer never pays for
    // the round trip either.
    if (!mfaReady || !authUserId || user.accountType !== "professional") return;
    if (twoFactorNudgeDismissed) return;
    let cancelled = false;
    void getMfaStatus().then((result) => {
      if (cancelled || !result.ok) return;
      setChecked({ userId: authUserId, enrolled: result.data.factors.length > 0 });
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, mfaReady, user.accountType, twoFactorNudgeDismissed]);

  const answered = checked?.userId === authUserId;
  // Shown only once the check has actually answered "no factors". An
  // unanswered check renders nothing rather than guessing — telling somebody
  // their account is unprotected before asking would be worse than silence.
  const show =
    user.accountType === "professional" && !twoFactorNudgeDismissed && answered && !checked.enrolled;

  if (!show) return null;

  return (
    <div className="mb-4 rounded-2xl bg-cream-soft border border-charcoal/[0.08] px-4 py-3.5 flex items-start gap-3 animate-fade-slide-up">
      <span className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
        <ShieldCheck size={16} className="text-primary-dark" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-charcoal">Add an extra layer of security</p>
        <p className="text-xs text-charcoal-faint leading-relaxed mt-0.5">
          Turn on two-factor authentication so a password alone can't sign in to your account.
        </p>
        <button
          onClick={() => navigate("/app/settings")}
          className="tap mt-2 text-xs font-bold text-primary"
        >
          Set it up
        </button>
      </div>
      {/* Dismissal is permanent on this device and reversible from Settings —
          the same bargain voiceDisclosureSeen makes. */}
      <button
        onClick={() => setTwoFactorNudgeDismissed(true)}
        aria-label="Dismiss this reminder"
        className="tap text-charcoal-faint shrink-0"
      >
        <X size={15} />
      </button>
    </div>
  );
};
