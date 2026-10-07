import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "../ui/Button";
import { CodeBoxes } from "../ui/CodeBoxes";
import { useSingleFlight } from "../../hooks/useSingleFlight";
import { useApp } from "../../context/AppContext";
import { getMfaStatus, verifyTotp } from "../../services/mfa";
import { redeemRecoveryCode } from "../../services/recoveryCodes";

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
  const { refreshMfaState, signOut, passMfaWithRecoveryCode } = useApp();
  // "Use a recovery code" (stage 1): one of the ten codes from MO1.8.4.2,
  // spent here instead of the authenticator. No frame draws this step; it is
  // an account-safety path, styled with the screen it lives on.
  const [useRecovery, setUseRecovery] = useState(false);
  const [recovery, setRecovery] = useState("");

  const [factorId, setFactorId] = useState<string | null>(null);
  const [factorName, setFactorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const singleFlight = useSingleFlight();
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

  const submitRecovery = async () => {
    if (!recovery.trim() || busy) return;
    setBusy(true);
    setError(null);
    const result = await redeemRecoveryCode(recovery);
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    if (!result.value.success) {
      // The server's one sentence for every failure, shown as it is.
      setBusy(false);
      setError(result.value.message);
      return;
    }
    // In: the guard reads the pass, and this screen unmounts.
    passMfaWithRecoveryCode();
  };

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
    <div className="min-h-[100dvh] flex items-center justify-center bg-cream px-6">
      {/* A real form: Enter, and the keyboard's Go key, verify exactly as the
          button does, and never while it is disabled. */}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          if (useRecovery) {
            if (recovery.trim()) void singleFlight(submitRecovery);
          } else if (code.length === 6) void singleFlight(submit);
        }}
        className="w-full max-w-sm text-center space-y-4"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary-pale flex items-center justify-center mx-auto">
          <ShieldCheck size={22} className="text-primary-dark" />
        </div>
        <h1 className="text-lg font-semibold text-charcoal">Two-factor authentication</h1>
        <p className="text-[13px] text-charcoal-soft leading-relaxed">
          {useRecovery
            ? "Enter one of the recovery codes you saved when you turned on two-factor."
            : factorName
              ? `Enter the 6-digit code from ${factorName}.`
              : "Enter the 6-digit code from your authenticator app."}
        </p>

        {useRecovery ? (
          // Foundations › Inputs: 44 tall, radius 12, surface.soft. The
          // server forgives case, spaces, the hyphen, O/0 and I/1.
          <input
            value={recovery}
            onChange={(e) => {
              setRecovery(e.target.value);
              setError(null);
            }}
            disabled={busy}
            autoFocus
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXX-XXXX"
            aria-label="Recovery code"
            aria-invalid={!!error}
            className={`w-full h-11 rounded-xl bg-cream-soft border px-3.5 text-center text-[15px] font-bold tracking-[0.12em] text-charcoal placeholder:text-charcoal-faint placeholder:font-semibold focus:outline-none focus:border-primary-accent ${error ? "border-status-high" : "border-charcoal/10"}`}
          />
        ) : (
        /* Six boxes (Foundations 2.5). They take focus once the factor has
            loaded: autoFocus waits for the boxes to be enabled. */
        <CodeBoxes
          value={code}
          onChange={(v) => {
                setCode(v);
                setError(null);
              }}
          error={!!error}
          disabled={loading || !factorId || busy}
          autoFocus
          label="Six-digit authentication code"
        />
        )}

        {error && <p className="text-[11.5px] font-semibold text-status-high">{error}</p>}

        <Button type="submit" fullWidth size="lg" disabled={busy || (useRecovery ? !recovery.trim() : code.length < 6)}>
          {busy ? "Checking…" : "Verify"}
        </Button>

        {/* The way in without the phone: a recovery code (stage 1), and back
            to the authenticator from there. With no codes left either,
            support removes the factor once they've confirmed who it is. */}
        <button
          type="button"
          onClick={() => {
            setUseRecovery((v) => !v);
            setError(null);
            setCode("");
            setRecovery("");
          }}
          disabled={busy}
          className="tap w-full text-center text-sm font-semibold text-primary"
        >
          {useRecovery ? "Use my authenticator app" : "Use a recovery code"}
        </button>
        <p className="text-[11px] text-charcoal-faint leading-relaxed">
          No codes either? Contact Centium support to have two-factor removed. We'll need to confirm
          who you are first.
        </p>

        <button
          type="button"
          onClick={() => void signOut()}
          className="tap w-full text-center text-sm font-semibold text-charcoal-soft"
        >
          Not you? <span className="text-primary">Sign out</span>
        </button>
      </form>
    </div>
  );
};
