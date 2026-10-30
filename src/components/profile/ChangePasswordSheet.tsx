import React, { useEffect, useState } from "react";
import { Check, Eye, EyeOff, Lock, Mail, X } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { supabase } from "../../../lib/supabase/client";
import { usePasswordVisibility } from "../../hooks/usePasswordVisibility";
import { useSingleFlight } from "../../hooks/useSingleFlight";
import { useApp } from "../../context/AppContext";
import { useTurnstile } from "../security/useTurnstile";
import { useCooldown } from "../security/useCooldown";
import { SecurityCheck } from "../security/SecurityCheck";
import { formatCountdown } from "../../services/auth/cooldown";
import { t } from "../../i18n/core";
import {
  changePassword,
  sendReauthenticationCode,
  signOutOtherSessions,
  verifyCurrentPassword,
} from "../../services/auth/passwordChange";
import { hasEmailPassword } from "../../services/auth/passwordChangeLogic";
import { CodeBoxes } from "../ui/CodeBoxes";
import {
  meetsPasswordRule,
  passwordChecks,
  passwordStrength,
  shouldWarnPasswordMismatch,
} from "../../utils/password";

const inputClass =
  "w-full rounded-2xl bg-cream-card border border-charcoal/10 ps-10 pe-11 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10";

type Step = "loading" | "google" | "form" | "code" | "done";

/**
 * Task J: Settings → Security → Change password.
 *
 * Email accounts: current password, new, confirm. The current one is checked
 * first without touching this session (verifyCurrentPassword), then the new
 * one is set. If Supabase's "Secure password change" is on and this session
 * is over 24 hours old, it asks for the 6-digit code it emails, then sets it.
 *
 * Google-only accounts have no password to ask for, so they are told they
 * sign in with Google and may set one (Supabase allows it; email and password
 * sign-in works afterwards).
 *
 * The same rule, checklist and show/hide hook as sign-up and the reset page.
 * Mounted fresh on every open (keyed by the caller), so nothing typed
 * survives closing it.
 */
export const ChangePasswordSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  /** Setting a first password on a Google-only account: no current field. */
  const [settingFirst, setSettingFirst] = useState(false);

  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmBlurred, setConfirmBlurred] = useState(false);
  const [code, setCode] = useState("");
  const currentVisibility = usePasswordVisibility();
  const newVisibility = usePasswordVisibility();

  const [busy, setBusy] = useState(false);
  const singleFlight = useSingleFlight();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // AG phase 1: checking the current password is a password sign-in to
  // GoTrue, so it carries a Turnstile token like the sign-in screen does.
  const { theme } = useApp();
  const { token: captchaToken, status: captchaStatus, container: captchaContainer, reset: resetCaptcha, required: captchaRequired } =
    useTurnstile(theme);
  const cooldown = useCooldown();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const user = data.user;
      setEmail(user?.email ?? "");
      setStep(user && !hasEmailPassword(user) ? "google" : "form");
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const mismatch = shouldWarnPasswordMismatch(password, confirm, confirmBlurred);
  const { passed, label: strengthLabel, color: strengthColor } = passwordStrength(password);
  const canSubmit =
    !busy &&
    (settingFirst || current.length > 0) &&
    meetsPasswordRule(password) &&
    confirm === password &&
    // The check of the current password waits for the security check, and
    // for a rate-limit wait to run out. A first password involves no check.
    (settingFirst || !(captchaRequired && !captchaToken)) &&
    !cooldown.active;

  /** After the server accepted the new password. */
  const finish = async () => {
    await signOutOtherSessions();
    setCurrent("");
    setPassword("");
    setConfirm("");
    setCode("");
    currentVisibility.hide();
    newVisibility.hide();
    setStep("done");
  };

  const submitForm = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    if (!settingFirst) {
      const verified = await verifyCurrentPassword(email, current, captchaToken ?? undefined);
      // Single-use: spent whatever the answer was.
      resetCaptcha();
      if (verified.status === "error" && verified.rateLimited) cooldown.start();
      if (verified.status !== "ok") {
        setBusy(false);
        setError(verified.status === "wrong" ? t("Your current password isn't right.") : t(verified.message));
        return;
      }
    }
    const result = await changePassword(password);
    if (result.status === "code_needed") {
      const sent = await sendReauthenticationCode();
      setBusy(false);
      if (!sent.ok) {
        setError(t(sent.message));
        return;
      }
      setStep("code");
      return;
    }
    if (result.status === "error") {
      setBusy(false);
      setError(t(result.message));
      return;
    }
    await finish();
    setBusy(false);
  };

  const submitCode = async () => {
    if (busy || code.length !== 6) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await changePassword(password, code);
    if (result.status !== "ok") {
      setBusy(false);
      setCode("");
      setError(result.status === "code_needed" ? t("Enter the code from your email to continue.") : t(result.message));
      return;
    }
    await finish();
    setBusy(false);
  };

  const resend = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const sent = await sendReauthenticationCode();
    setBusy(false);
    if (sent.ok) setNotice(t("We sent a new code to {email}.", { email }));
    else setError(t(sent.message));
  };

  const title = step === "google" || settingFirst ? t("Set a password") : t("Change password");

  return (
    <BottomSheet open={open} onClose={onClose} title={step === "code" ? t("Confirm it's you") : title}>
      <div className="animate-fade-slide-up">
        {step === "loading" && <p className="text-sm text-charcoal-faint py-6 text-center">{t("Checking your account…")}</p>}

        {step === "google" && (
          <div className="space-y-4 py-1">
            <div className="rounded-2xl bg-cream-card px-4 py-3.5">
              <p className="text-sm font-semibold text-charcoal">{t("You sign in with Google")}</p>
              {/* Makes no claim about whether a password exists: one set here
                  earlier is invisible on the user object (see hasEmailPassword). */}
              <p className="text-xs text-charcoal-soft mt-1 leading-relaxed">
                {email
                  ? t("If you'd also like to sign in with {email} and a password, you can set one here.", { email })
                  : t("If you'd also like to sign in with your email and a password, you can set one here.")}
              </p>
            </div>
            <Button
              fullWidth
              size="lg"
              onClick={() => {
                setSettingFirst(true);
                setStep("form");
              }}
            >
              {t("Set a password")}
            </Button>
          </div>
        )}

        {step === "form" && (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) void singleFlight(submitForm);
            }}
            className="space-y-3.5"
          >
            {/* For password managers: which account this password belongs to. */}
            <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

            {!settingFirst && (
              <label className="block relative">
                <span className="sr-only">{t("Current password")}</span>
                <Lock size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
                <input
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder={t("Current password")}
                  autoComplete="current-password"
                  autoFocus
                  type={currentVisibility.shown ? "text" : "password"}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={currentVisibility.toggle}
                  className="tap absolute end-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint"
                  aria-label={currentVisibility.shown ? t("Hide current password") : t("Show current password")}
                >
                  {currentVisibility.shown ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </label>
            )}

            <label className="block relative">
              <span className="sr-only">{t("New password")}</span>
              <Lock size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("New password")}
                autoComplete="new-password"
                autoFocus={settingFirst}
                type={newVisibility.shown ? "text" : "password"}
                className={inputClass}
              />
              <button
                type="button"
                onClick={newVisibility.toggle}
                className="tap absolute end-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint"
                aria-label={newVisibility.shown ? t("Hide new password") : t("Show new password")}
              >
                {newVisibility.shown ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </label>

            <label className="block relative">
              <span className="sr-only">{t("Confirm new password")}</span>
              <Lock size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => setConfirmBlurred(true)}
                placeholder={t("Confirm new password")}
                autoComplete="new-password"
                type={newVisibility.shown ? "text" : "password"}
                className={inputClass}
              />
            </label>

            {mismatch && (
              <p className="text-[11px] font-semibold text-status-high -mt-1.5 ps-1">{t("Passwords don't match")}</p>
            )}

            {password && (
              <div className="rounded-2xl bg-cream-card px-4 py-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-charcoal-soft">{t("Password strength")}</span>
                  <span className="text-xs font-bold" style={{ color: strengthColor }}>
                    {t(strengthLabel)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-cream-soft overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(passed / passwordChecks.length) * 100}%`, background: strengthColor }}
                  />
                </div>
                <div className="space-y-1">
                  {passwordChecks.map((c) => {
                    const ok = c.test(password);
                    return (
                      <div key={c.label} className="flex items-center gap-1.5 text-[11px]">
                        {ok ? <Check size={11} className="text-primary-dark" /> : <X size={11} className="text-charcoal-faint" />}
                        <span className={ok ? "text-charcoal-soft" : "text-charcoal-faint"}>{t(c.label)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!settingFirst && <SecurityCheck status={captchaStatus} container={captchaContainer} />}

            {(cooldown.active || error) && (
              <p className="text-xs font-semibold text-status-high text-center" role="alert">
                {cooldown.active ? t("Too many attempts. Try again in {time}.", { time: formatCountdown(cooldown.left) }) : error}
              </p>
            )}

            <Button type="submit" fullWidth size="lg" disabled={!canSubmit}>
              {busy ? t("Saving…") : settingFirst ? t("Set password") : t("Change password")}
            </Button>
          </form>
        )}

        {step === "code" && (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy && code.length === 6) void singleFlight(submitCode);
            }}
            className="space-y-4"
          >
            <div className="flex items-start gap-2.5 rounded-2xl bg-primary-pale px-4 py-3.5">
              <Mail size={16} className="shrink-0 mt-0.5 text-primary-dark" />
              <p className="text-sm text-primary-dark leading-relaxed">
                {t("For your security, we emailed a 6-digit code to {email}. Enter it to finish changing your password.", { email })}
              </p>
            </div>
            {/* Six boxes (Foundations 2.5), as on every code screen. */}
            <CodeBoxes
              value={code}
              onChange={(v) => {
                setCode(v);
                setError(null);
              }}
              error={!!error}
              disabled={busy}
              autoFocus
              label={t("Six-digit code from your email")}
            />
            {notice && <p className="text-xs text-charcoal-soft text-center">{notice}</p>}
            {error && (
              <p className="text-xs font-semibold text-status-high text-center" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" fullWidth size="lg" disabled={busy || code.length !== 6}>
              {busy ? t("Checking…") : t("Confirm")}
            </Button>
            <button
              type="button"
              onClick={() => void singleFlight(resend)}
              disabled={busy}
              className="tap w-full text-center text-xs font-semibold text-charcoal-soft disabled:opacity-40"
            >
              {t("Send a new code")}
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="space-y-4 py-1" role="status">
            <div className="flex items-start gap-2.5 rounded-2xl bg-primary-pale px-4 py-3.5">
              <Check size={16} className="shrink-0 mt-0.5 text-primary-dark" />
              <p className="text-sm text-primary-dark leading-relaxed">
                {settingFirst
                  ? t("Password set. You can now also sign in with {email} and this password.", { email })
                  : t("Password changed. You're still signed in here, and other devices will be asked to sign in again.")}
              </p>
            </div>
            <Button fullWidth size="lg" onClick={onClose} autoFocus>
              {t("Done")}
            </Button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
