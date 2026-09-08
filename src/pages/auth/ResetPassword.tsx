import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Lock, Eye, EyeOff, Check, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { updatePassword } from "../../services/auth";
import {
  passwordChecks,
  meetsMinimumPassword,
  shouldWarnPasswordMismatch,
} from "../../utils/password";

const inputClass =
  "w-full rounded-2xl bg-cream-card border border-charcoal/10 pl-10 pr-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10";

/**
 * The destination of a password-reset link, and the only thing a recovery
 * session is permitted to do.
 *
 * Reached two ways: the emailed link lands here directly (see
 * passwordResetRedirectUrl), and the /app guards bounce a pending recovery
 * back here if the user navigates elsewhere before finishing.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { authReady, authUserId, recoveryPending, clearRecovery, signOut } = useApp();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmBlurred, setConfirmBlurred] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mismatch = shouldWarnPasswordMismatch(password, confirmPassword, confirmBlurred);
  const passedChecks = passwordChecks.filter((c) => c.test(password)).length;
  const strengthLabel = passedChecks <= 1 ? "Weak" : passedChecks <= 3 ? "Medium" : "Strong";
  const strengthColor =
    passedChecks <= 1
      ? "rgb(var(--c-status-high))"
      : passedChecks <= 3
      ? "rgb(var(--c-status-caution))"
      : "rgb(var(--c-status-good))";

  const canSubmit =
    !busy && meetsMinimumPassword(password) && confirmPassword === password && !!authUserId;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);

    if (!result.ok) {
      setError(result.message ?? "Could not update your password.");
      return;
    }

    // Only now, once the password has actually changed, does the session stop
    // being a recovery session and become an ordinary one. Goes through the
    // context so the guards' state clears too — clearing storage alone left
    // them redirecting back here forever.
    clearRecovery();
    setDone(true);
    setTimeout(() => navigate("/app", { replace: true }), 900);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-sm text-charcoal-faint">Loading…</p>
      </div>
    );
  }

  // No session here means the code exchange never happened. Under PKCE the
  // verifier lives in the browser that requested the reset, so opening the
  // link somewhere else — another browser, or an email client's in-app
  // browser — cannot complete. Saying so beats a blank screen.
  if (!authUserId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-6 text-center">
        <h1 className="font-display text-2xl font-bold text-charcoal mb-2">This link didn't open</h1>
        <p className="text-sm text-charcoal-soft max-w-sm mb-6">
          Password reset links only work in the same browser you requested them from. Open
          the link there, or request a new one.
        </p>
        <Button onClick={() => navigate("/app/onboarding", { replace: true })}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream px-6 py-12 flex flex-col justify-center">
      <div className="w-full max-w-md mx-auto">
        <h1 className="font-display text-2xl font-bold text-charcoal mb-2">Set a new password</h1>
        <p className="text-sm text-charcoal-soft mb-6">
          {recoveryPending
            ? "Choose a new password to finish signing in."
            : "Choose a new password for your account."}
        </p>

        {done ? (
          <div className="flex items-center gap-2 rounded-2xl bg-primary-pale px-4 py-3.5 text-sm font-semibold text-primary-deep-text">
            <Check size={16} /> Password updated. Taking you to Centium…
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                type={showPassword ? "text" : "password"}
                className={inputClass}
              />
              <button
                onClick={() => setShowPassword((v) => !v)}
                className="tap absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </label>

            <label className="block relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setConfirmBlurred(true)}
                placeholder="Confirm new password"
                type={showPassword ? "text" : "password"}
                className={inputClass}
              />
            </label>

            {mismatch && (
              <p className="text-[11px] font-semibold text-status-high -mt-1.5 pl-1">
                Passwords don't match
              </p>
            )}

            {password && (
              <div className="rounded-2xl bg-cream-card px-4 py-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-charcoal-soft">Password strength</span>
                  <span className="text-xs font-bold" style={{ color: strengthColor }}>
                    {strengthLabel}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-cream-soft overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(passedChecks / passwordChecks.length) * 100}%`,
                      background: strengthColor,
                    }}
                  />
                </div>
                <div className="space-y-1">
                  {passwordChecks.map((c) => {
                    const passed = c.test(password);
                    return (
                      <div key={c.label} className="flex items-center gap-1.5 text-[11px]">
                        {passed ? (
                          <Check size={11} className="text-primary-dark" />
                        ) : (
                          <X size={11} className="text-charcoal-faint" />
                        )}
                        <span className={passed ? "text-charcoal-soft" : "text-charcoal-faint"}>
                          {c.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs font-semibold text-status-high text-center">{error}</p>
            )}

            <Button fullWidth size="lg" onClick={handleSubmit} disabled={!canSubmit}>
              {busy ? "Saving…" : "Set new password"}
            </Button>

            {/* The way out for someone who opened the link by mistake. Signing
                out ends the recovery session rather than leaving it usable. */}
            <button
              onClick={() => {
                clearRecovery();
                void signOut();
                navigate("/app/onboarding", { replace: true });
              }}
              className="tap w-full text-center text-xs font-semibold text-charcoal-soft"
            >
              Cancel and sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
