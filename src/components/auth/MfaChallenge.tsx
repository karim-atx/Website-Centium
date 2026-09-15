import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { getMfaStatus, verifyTotp } from "../../services/mfa";

/**
 * The second factor, asked for at the point the app would otherwise let
 * someone in.
 *
 * A GUARD SCREEN, NOT A STEP INSIDE AuthStep, and the difference is the whole
 * reason it works. AuthStep owns the email form; Google sign-in returns by
 * redirect with a session already established and never touches that
 * component's submit handler at all. A challenge built as an AuthStep mode
 * would have covered email sign-in and waved every Google account straight
 * past — so this lives where recoveryPending and the admin notice live,
 * between the guards and the app.
 *
 * THE SESSION BEHIND THIS IS REAL. The user is authenticated, their JWT works,
 * and RLS will answer for them — this screen is what stands between that and
 * the app. What it is not is a security boundary in itself: GoTrue refuses the
 * operations that matter (changing a password, enrolling another factor,
 * removing this one) below aal2 on its own. This makes the app honour the
 * user's choice; the server enforces it.
 */
export const MfaChallenge: React.FC = () => {
  const { refreshMfaState, signOut } = useApp();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [factorName, setFactorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which factor to challenge. mfaPending already told the guard that one
  // exists; this is the only place that needs to know WHICH, and asking here
  // rather than holding it in context keeps a factor id out of app state.
  useEffect(() => {
    let cancelled = false;
    void getMfaStatus().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const factor = result.data.factors[0];
      if (!factor) {
        // Nothing to challenge. Reachable if the factor was removed
        // elsewhere between the guard's check and this render — re-reading
        // the state clears the guard rather than stranding anyone.
        void refreshMfaState();
        return;
      }
      setFactorId(factor.id);
      setFactorName(factor.friendly_name ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshMfaState]);

  const submit = async () => {
    if (!factorId || code.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    const result = await verifyTotp(factorId, code);
    if (!result.ok) {
      setBusy(false);
      setCode("");
      setError(result.message);
      return;
    }
    // The session is now aal2. The guard reads context, not the token, so it
    // has to be told — see refreshMfaState. Deliberately no setBusy(false):
    // this component unmounts on the next render and flipping it first would
    // show an enabled button for one frame.
    await refreshMfaState();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-primary-pale flex items-center justify-center mx-auto">
          <ShieldCheck size={22} className="text-primary-dark" />
        </div>
        <h1 className="text-lg font-semibold text-charcoal">Two-factor authentication</h1>
        <p className="text-[13px] text-charcoal-soft leading-relaxed">
          {factorName
            ? `Enter the 6-digit code from ${factorName}.`
            : "Enter the 6-digit code from your authenticator app."}
        </p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          // inputMode over type="number": a phone gets the numeric keypad
          // without the spinner, the scroll-to-change behaviour, or the
          // silent value loss that type="number" brings to a padded code.
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="000000"
          aria-label="Six-digit authentication code"
          disabled={loading || !factorId}
          className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-center text-xl font-semibold tracking-[0.4em] text-charcoal placeholder:text-charcoal-faint placeholder:tracking-[0.4em] focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
        />

        {error && <p className="text-[11.5px] font-semibold text-status-high">{error}</p>}

        <Button fullWidth size="lg" onClick={() => void submit()} disabled={busy || code.length < 6}>
          {busy ? "Checking…" : "Verify"}
        </Button>

        {/* HONEST ABOUT WHAT DOES NOT EXIST YET. Supabase issues no backup
            codes, and the administrator-side reset is Phase 2 — so this says
            what actually happens today rather than offering a link that
            would go nowhere. Saying "contact support" and meaning it beats a
            "lost your device?" button that dead-ends. */}
        <p className="text-[11px] text-charcoal-faint leading-relaxed">
          Lost access to your authenticator? Contact Centium support to have two-factor
          authentication removed from your account — we'll need to confirm who you are first.
        </p>

        <button
          onClick={() => void signOut()}
          className="tap w-full text-center text-sm font-semibold text-charcoal-soft"
        >
          Not you? <span className="text-primary">Sign out</span>
        </button>
      </div>
    </div>
  );
};
