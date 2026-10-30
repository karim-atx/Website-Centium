import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { ObFooter, ObHeader, ObPage, ObProgress, ObTitle } from "../../pages/onboarding/shell/ObShell";
import { ObField } from "../../pages/onboarding/shell/ObBlocks";
import { CodeBoxes } from "../ui/CodeBoxes";
import { useSingleFlight } from "../../hooks/useSingleFlight";
import { useApp } from "../../context/AppContext";
import { getMfaStatus, verifyTotp } from "../../services/mfa";
import { redeemRecoveryCode } from "../../services/recoveryCodes";
import { t } from "../../i18n/core";
import { rich } from "../../pages/onboarding/shell/rich";

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
        setError(t(result.message));
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
      setError(t(result.message));
      return;
    }
    if (!result.value.success) {
      // The server's one sentence for every failure, shown through t() (it translates once the errors catalogue has it).
      setBusy(false);
      setError(t(result.value.message));
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
      setError(t(result.message));
      return;
    }
    // The session is now aal2. The guard reads context, not the token, so it
    // has to be told — see refreshMfaState. Deliberately no setBusy(false):
    // this component unmounts on the next render and flipping it first would
    // show an enabled button for one frame.
    await refreshMfaState();
  };

  // v6 (OURS-sign-in-errors T1…T4): on the Sign in shell (OB-007): eyebrow
  // "Welcome back", title "Two-factor authentication", the code boxes or the
  // recovery-code field (52 r16 field spec), the error under them, footer
  // Continue with the two text links. Behaviour unchanged.
  const canSubmit = !busy && (useRecovery ? !!recovery.trim() : code.length === 6);
  return (
    <ObPage backdrop>
      {/* A real form: Enter, and the keyboard's Go key, verify exactly as the
          button does, and never while it is disabled. */}
      <form
        id="ob-mfa"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          if (useRecovery) {
            if (recovery.trim()) void singleFlight(submitRecovery);
          } else if (code.length === 6) void singleFlight(submit);
        }}
        className="ob-body ob-step-in"
      >
        <ObProgress count={3} index={1} variant="intro" />
        <ObHeader margin="intro" />
        <ObTitle
          variant="intro"
          eyebrow={t("Welcome back")}
          title={t("Two-factor authentication")}
          subtitle={
            useRecovery
              ? t("Enter one of the recovery codes you saved when you turned on two-factor.")
              : factorName
                ? t("Enter the 6-digit code from {app}.", { app: factorName })
                : t("Enter the 6-digit code from your authenticator app.")
          }
        />
        {useRecovery ? (
          // The server forgives case, spaces, the hyphen, O/0 and I/1.
          <ObField
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
            // i18n-ignore (the code's shape)
            placeholder="XXXX-XXXX"
            aria-label={t("Recovery code")}
            icon={ShieldCheck}
            error={error}
            style={{ fontWeight: 700, letterSpacing: "0.12em" }}
          />
        ) : (
          <>
            {/* Six boxes (Foundations 2.5). They take focus once the factor
                has loaded: autoFocus waits for the boxes to be enabled. */}
            <CodeBoxes
              value={code}
              onChange={(v) => {
                setCode(v);
                setError(null);
              }}
              error={!!error}
              disabled={loading || !factorId || busy}
              autoFocus
              label={t("Six-digit authentication code")}
            />
            {error && (
              <div className="ob-help" data-err="true">
                <span role="alert" style={{ textAlign: "center" }}>
                  {error}
                </span>
              </div>
            )}
          </>
        )}
        {/* With no codes either, support removes the factor once they have
            confirmed who it is. */}
        <p style={{ fontSize: 11.5, lineHeight: "17px", color: "var(--ob-faint)", textAlign: "center", marginTop: 16 }}>
          {t("No codes either? Contact Centium support to have two-factor removed. We'll need to confirm who you are first.")}
        </p>
      </form>
      <ObFooter
        primary={{ label: busy ? t("Checking…") : t("Continue"), type: "submit", form: "ob-mfa", disabled: !canSubmit }}
        link={{
          node: <b>{useRecovery ? t("Use my authenticator app") : t("Use a recovery code")}</b>,
          disabled: busy,
          onClick: () => {
            setUseRecovery((v) => !v);
            setError(null);
            setCode("");
            setRecovery("");
          },
        }}
        after={
          <button type="button" className="ob-link hit" onClick={() => void signOut()}>
            {rich(t("Not you? {signOut}"), { signOut: <b>{t("Sign out")}</b> })}
          </button>
        }
      />
    </ObPage>
  );
};
