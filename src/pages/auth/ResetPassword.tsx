import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { updatePassword } from "../../services/auth";
import { usePasswordVisibility } from "../../hooks/usePasswordVisibility";
import { useSingleFlight } from "../../hooks/useSingleFlight";
import { getMfaStatus, verifyTotp } from "../../services/mfa";
import { CodeBoxes } from "../../components/ui/CodeBoxes";
import { meetsPasswordRule, shouldWarnPasswordMismatch } from "../../utils/password";
import { ObFooter, ObHeader, ObLockup, ObPage, ObTitle, ObToast, useObToast } from "../onboarding/shell/ObShell";
import { ObField, ObStatus, ObStrength } from "../onboarding/shell/ObBlocks";
import { CI, LF, OB } from "../onboarding/shell/visuals";
import { t } from "../../i18n/core";

/**
 * The destination of a password-reset link, and the only thing a recovery
 * session is permitted to do.
 *
 * Reached two ways: the emailed link lands here directly (see
 * passwordResetRedirectUrl), and the /app guards bounce a pending recovery
 * back here if the user navigates elsewhere before finishing.
 *
 * v6 (OURS-reset-password): restyled in the shared-onboarding language
 * (Create your account fields and strength card, Check your email info card,
 * the status block for a link that didn't open, the dark toast when done).
 * Behaviour unchanged: recovery session only, two-factor first when the
 * account has it, the same password rule as sign-up, "Cancel and sign out".
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { authReady, authUserId, recoveryPending, clearRecovery, signOut, refreshMfaState } = useApp();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmBlurred, setConfirmBlurred] = useState(false);
  const passwordVisibility = usePasswordVisibility();
  const showPassword = passwordVisibility.shown;
  const [busy, setBusy] = useState(false);
  const singleFlight = useSingleFlight();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [toast, showToast] = useObToast(2000);

  // --- the second factor, which has to come first --------------------------
  //
  // WITHOUT THIS, TWO-FACTOR IS A LOCKOUT: a recovery session for an enrolled
  // account arrives at aal1, and updateUser({ password }) is refused below
  // aal2. So: challenge, reach aal2, then update. Only when there is a
  // factor; an account without one behaves exactly as before.
  const [mfaChecked, setMfaChecked] = useState(false);
  const [mfaFactor, setMfaFactor] = useState<{ id: string; name: string | null } | null>(null);
  const [mfaCleared, setMfaCleared] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void getMfaStatus().then((result) => {
      if (cancelled) return;
      setMfaChecked(true);
      // A failed read must not block the reset: the server still refuses a
      // write that needs a factor, and that error reads clearly.
      if (!result.ok) return;
      const factor = result.data.factors[0];
      if (result.data.pending && factor) setMfaFactor({ id: factor.id, name: factor.friendly_name ?? null });
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const needsMfa = !!mfaFactor && !mfaCleared;

  const submitMfa = async () => {
    if (!mfaFactor || mfaCode.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    const result = await verifyTotp(mfaFactor.id, mfaCode);
    if (!result.ok) {
      setBusy(false);
      setMfaCode("");
      setError(t(result.message));
      return;
    }
    // THE GUARD HAS TO BE TOLD, or /app asks for a code the user just gave.
    await refreshMfaState();
    setBusy(false);
    setMfaCleared(true);
  };

  const mismatch = shouldWarnPasswordMismatch(password, confirmPassword, confirmBlurred);
  const canSubmit = !busy && meetsPasswordRule(password) && confirmPassword === password && !!authUserId;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ? t(result.message) : t("Could not update your password."));
      return;
    }
    // Only now does the session stop being a recovery session. Through the
    // context so the guards' state clears too.
    clearRecovery();
    setDone(true);
    showToast(t("Password updated. Taking you to Centium…"));
    setTimeout(() => navigate("/app", { replace: true }), 900);
  };

  const cancel = () => {
    clearRecovery();
    void signOut();
    navigate("/app/onboarding", { replace: true });
  };

  const header = <ObHeader margin="nobar" />;

  if (!authReady || (authUserId && !mfaChecked && !done)) {
    // Held rather than showing the password form first: an enrolled user
    // would otherwise see the form replaced under them a moment later.
    return (
      <ObPage backdrop>
        <div className="ob-body">
          <div className="ob-head" data-m="nobar" style={{ justifyContent: "center" }}>
            <ObLockup />
          </div>
          <p role="status" style={{ textAlign: "center", fontSize: 13, lineHeight: "19.5px", fontWeight: 500, color: "var(--ob-faint)" }}>
            {authReady ? t("Checking your account…") : t("Loading…")}
          </p>
        </div>
      </ObPage>
    );
  }

  // No session means the code exchange never happened: under PKCE the
  // verifier lives in the browser that requested the reset.
  if (!authUserId) {
    return (
      <ObPage>
        <div className="ob-body ob-step-in">
          {header}
          <ObStatus
            vis={[LF(50, 82, 0.13, -45, OB.leaf, 0.5), CI(50, 50, 40, "none", { s: OB.high, sw: 1.5, o: 0.5 })]}
            eyebrow={t("Link expired")}
            eyebrowColor="var(--ob-high)"
            title={t("This link didn't open")}
            body={t("Password reset links only work in the same browser you requested them from. Open the link there, or request a new one.")}
          />
        </div>
        <ObFooter
          primary={{ label: t("Back to sign in"), onClick: () => navigate("/app/onboarding?auth=signin", { replace: true }) }}
          link={{ node: t("Send a new link"), onClick: () => navigate("/app/onboarding?auth=forgot", { replace: true }) }}
        />
      </ObPage>
    );
  }

  if (needsMfa) {
    return (
      <ObPage backdrop>
        <form
          id="ob-reset-mfa"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy && mfaCode.length === 6) void singleFlight(submitMfa);
          }}
          className="ob-body ob-step-in"
        >
          {header}
          <ObTitle
            variant="intro"
            eyebrow={t("Reset password")}
            title={t("Confirm it's you")}
            subtitle={t("This account uses two-factor authentication. Enter a code before choosing a new password.")}
          />
          <div className="ob-info" style={{ marginBottom: 16 }}>
            <ShieldCheck size={16} />
            <span>{mfaFactor?.name ? t("Enter the code from {app}", { app: mfaFactor.name }) : t("Enter the code from your authenticator app")}</span>
          </div>
          {/* Six boxes (Foundations 2.5), as on every two-factor screen. */}
          <CodeBoxes
            value={mfaCode}
            onChange={(v) => {
              setMfaCode(v);
              setError(null);
            }}
            error={!!error}
            disabled={busy}
            autoFocus
            label={t("Six-digit authentication code")}
          />
          {error && (
            <div className="ob-help" data-err="true" style={{ justifyContent: "center" }}>
              <span role="alert" style={{ flex: "none", textAlign: "center" }}>
                {error}
              </span>
            </div>
          )}
          {/* No backup path to offer from here: says what actually happens. */}
          <p style={{ fontSize: 11.5, lineHeight: "17px", color: "var(--ob-faint)", textAlign: "center", marginTop: 16 }}>
            {t("Lost access to your authenticator? Contact Centium support. Resetting your password alone won't get you back in.")}
          </p>
        </form>
        <ObFooter
          primary={{ label: busy ? t("Checking…") : t("Continue"), type: "submit", form: "ob-reset-mfa", disabled: busy || mfaCode.length < 6 }}
          link={{ node: t("Cancel and sign out"), onClick: cancel }}
        />
      </ObPage>
    );
  }

  return (
    <ObPage backdrop>
      <form
        id="ob-reset"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) void singleFlight(handleSubmit);
        }}
        className="ob-body ob-step-in"
      >
        {header}
        <ObTitle
          variant="intro"
          eyebrow={t("Reset password")}
          title={t("Set a new password")}
          subtitle={recoveryPending ? t("Choose a new password to finish signing in.") : t("Choose a new password for your account.")}
        />
        <ObField
          variant="intro"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder={t("New password")}
          aria-label={t("New password")}
          // First field of the step, so Enter-to-submit works without a pointer.
          autoFocus
          value={password}
          readOnly={busy || done}
          onChange={(e) => setPassword(e.target.value)}
          end={
            <button type="button" className="hit" onClick={passwordVisibility.toggle} aria-label={showPassword ? t("Hide password") : t("Show password")} style={{ display: "flex" }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />
        <ObField
          variant="intro"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder={t("Confirm new password")}
          aria-label={t("Confirm new password")}
          value={confirmPassword}
          readOnly={busy || done}
          error={mismatch ? t("Passwords don't match") : null}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() => setConfirmBlurred(true)}
        />
        {password && <ObStrength password={password} />}
      </form>
      <ObFooter
        error={error}
        primary={{ label: busy ? t("Saving…") : t("Set new password"), type: "submit", form: "ob-reset", disabled: !canSubmit || done }}
        // The way out for someone who opened the link by mistake: signing
        // out ends the recovery session rather than leaving it usable.
        link={{ node: t("Cancel and sign out"), onClick: cancel }}
      />
      <ObToast message={toast} />
    </ObPage>
  );
}
