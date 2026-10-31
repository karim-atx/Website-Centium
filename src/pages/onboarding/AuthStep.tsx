import React, { useEffect, useRef, useState } from "react";
import type { OnboardingDraft } from "./Onboarding";
import { Mail, Lock, Eye, EyeOff, Check, MailCheck, ShieldAlert } from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { Session } from "@supabase/supabase-js";
import {
  SUSPENDED_MESSAGE,
  consumeAccountSuspended,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  isDisposableEmail,
  DISPOSABLE_EMAIL_MESSAGE,
  consumeReturnedAuthError,
  describeReturnedAuthError,
} from "../../services/auth";
import { setRememberMe as setRememberMePreference } from "../../../lib/supabase/rememberMe";
import { clearSessionArrived, sessionArrivedPending } from "../../../lib/supabase/tabIdentity";
import { usePasswordVisibility } from "../../hooks/usePasswordVisibility";
import { useSingleFlight } from "../../hooks/useSingleFlight";
import { useTurnstile } from "../../components/security/useTurnstile";
import { useCooldown } from "../../components/security/useCooldown";
import { SecurityCheck } from "../../components/security/SecurityCheck";
import { formatCountdown } from "../../services/auth/cooldown";
import { t, tk } from "../../i18n/core";
import { rich } from "./shell/rich";
import { meetsPasswordRule, shouldWarnPasswordMismatch } from "../../utils/password";
import { ObFooter, ObHeader, ObLockup, ObPage, ObProgress, ObTitle, ObToast, useObToast } from "./shell/ObShell";
import { ObField, ObStrength, ObTerms } from "./shell/ObBlocks";
import { useOnline } from "./shell/flow";
import { LEGAL_VERSION } from "../../services/legal/acceptances";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  /** Where this step opens: Welcome's Get started opens sign-up, "I already have an account" sign-in. */
  initialMode?: "signIn" | "signUp" | "forgot";
}

type Mode = "signIn" | "signUp" | "forgot" | "checkEmail";

// v6 (OB-007 Sign in, OB-009 Create your account, OB-011 Check your email;
// OURS-sign-in-errors, OURS-check-email-states, OURS-forgot-password):
// SharedOnboardingV4 screens "signin", "signup", "checkEmail" on the shared
// shell. Every live behaviour is kept: Turnstile on every password call, the
// rate-limit cooldown, the suspended and Google-return messages, the burner
// check, confirm-password mismatch, "not confirmed yet", "You're signed in /
// Not you?", "Checking your session…", forgot password, Enter-to-submit with
// single flight, remember-me cookie semantics.
//
// Email confirmation is REQUIRED on this project, so sign-up does not sign
// anyone in: it sends a link and parks on Check your email. The step only
// advances once a real session exists, driven by the session in AppContext
// rather than by the submit handler.

const OFFLINE = tk("You're offline. Connect and try again.");
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Which messages belong under a field (OURS-sign-in-errors P1) rather than in
// the footer slot (P2). One rule: the field at fault gets the field error.
// The state holds the English (compared here); the screen shows it through t().
const EMAIL_FIELD_ERRORS = new Set<string>([tk("Enter a valid email address.")]);
const PASSWORD_FIELD_ERRORS = new Set<string>([tk("Email or password is incorrect."), tk("Enter your password.")]);

export const AuthStep: React.FC<Props> = ({ draft, setDraft, onNext, initialMode = "signIn" }) => {
  const { session, authReady, signOut, theme } = useApp();
  const online = useOnline();
  // AG phase 1: a Turnstile challenge on every password call this screen
  // makes (sign-in, sign-up, reset, resend). Without a site key there is no
  // widget and no token, and nothing waits.
  const { token: captchaToken, status: captchaStatus, container: captchaContainer, reset: resetCaptcha, required: captchaRequired } =
    useTurnstile(theme);
  const captchaPending = captchaRequired && !captchaToken;
  // After a rate-limit refusal: "Try again in 0:45", and the button waits.
  const cooldown = useCooldown();
  const afterAttempt = (rateLimited?: boolean) => {
    resetCaptcha();
    if (rateLimited) cooldown.start();
  };
  const [mode, setModeState] = useState<Mode>(initialMode);
  // Every screen switch inside this step starts with the password hidden again.
  const passwordVisibility = usePasswordVisibility();
  const showPassword = passwordVisibility.shown;
  const setMode = (next: Mode) => {
    passwordVisibility.hide();
    setModeState(next);
    window.scrollTo(0, 0);
  };
  // Why we're on Check your email: after a sign-up we must not reveal whether
  // the address already has an account; after a sign-in that came back
  // `email_not_confirmed` the user proved they know the password, so the copy
  // can be direct.
  const [checkEmailReason, setCheckEmailReason] = useState<"signup" | "unconfirmed">("signup");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmBlurred, setConfirmBlurred] = useState(false);
  // Default on: the persistent session everyone had before this existed.
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resent, setResent] = useState(false);
  const [toast, showToast] = useObToast();
  /**
   * A suspension that took effect mid-session lands here as the opening
   * state (the reason was captured from the HTTP response and is consumed
   * once here). A Google sign-in refused on the way back (burner domain,
   * suspension, cancel) only exists in the redirect URL, read and cleared by
   * lib/supabase/oauthReturn.ts.
   */
  const [error, setError] = useState<string | null>(() => {
    if (consumeAccountSuspended()) return SUSPENDED_MESSAGE;
    const returned = consumeReturnedAuthError();
    return returned ? describeReturnedAuthError(returned) : null;
  });
  const [termsError, setTermsError] = useState<string | null>(null);
  const singleFlight = useSingleFlight();
  const [busy, setBusy] = useState(false);

  const email = draft.email;
  const setEmail = (v: string) => setDraft((d) => ({ ...d, email: v }));
  const termsOn = !!draft.legalAcceptedAt;
  const setTerms = (on: boolean) => {
    setTermsError(null);
    setDraft((d) => ({ ...d, legalAcceptedAt: on ? new Date().toISOString() : null, legalVersion: on ? LEGAL_VERSION : null }));
  };

  // The single gate out of this step: a session ARRIVING while we're here
  // (password sign-in, the confirmation link's return, the Google round
  // trip). The null -> session transition, not "a session exists", so
  // coming Back to this step keeps the user here on "You're signed in". A
  // session that arrived while this tab was signed out reloads the page to
  // re-bind the tab; the re-bind leaves a mark that counts as the transition.
  const prevSession = useRef<Session | null>(sessionArrivedPending() ? null : session);
  useEffect(() => {
    const had = prevSession.current;
    prevSession.current = session;
    if (!session || had) return;
    clearSessionArrived();
    const sessionEmail = session.user?.email;
    if (sessionEmail) setDraft((d) => ({ ...d, email: sessionEmail }));
    onNext();
  }, [session, setDraft, onNext]);

  // Live mismatch warning (utils/password): waits until the confirmation
  // reaches the password's length or the field is left; clears on match.
  const confirmMismatch = mode === "signUp" && shouldWarnPasswordMismatch(password, confirmPassword, confirmBlurred);
  const meetsRule = meetsPasswordRule(password);
  const signUpReady = meetsRule && confirmPassword === password;

  // BURNER ADDRESSES, sign-up only. The address last found disposable, by
  // the pre-flight on blur or by the server's refusal at submit.
  const [burnerEmail, setBurnerEmail] = useState<string | null>(null);
  const normalizedEmail = email.trim().toLowerCase();
  const isBurner = mode === "signUp" && burnerEmail === normalizedEmail;
  const burnerTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(burnerTimer.current), []);
  const checkBurnerSoon = () => {
    window.clearTimeout(burnerTimer.current);
    if (mode !== "signUp" || !isValidEmail(normalizedEmail)) return;
    const value = normalizedEmail;
    burnerTimer.current = window.setTimeout(() => {
      void isDisposableEmail(value).then((burner) => {
        if (burner) setBurnerEmail(value);
      });
    }, 300);
  };

  // Google needs no confirmation step: this navigates away to Google and the
  // session lands on the return trip, picked up by the effect above.
  const handleGoogle = async () => {
    if (mode === "signUp" && !termsOn) {
      setTermsError(tk("Accept the Terms of Service and Privacy Policy to sign up."));
      return;
    }
    if (!online) return setError(OFFLINE);
    setError(null);
    setBusy(true);
    const result = await signInWithGoogle();
    if (result.status === "error") {
      setError(result.message);
      setBusy(false);
    }
    // On success the browser is already leaving; `busy` stays set.
  };

  const handleSignIn = async () => {
    if (!isValidEmail(email)) return setError(tk("Enter a valid email address."));
    if (!password) return setError(tk("Enter your password."));
    if (!online) return setError(OFFLINE);
    setError(null);
    // Recorded BEFORE the request: the cookie adapter reads it the moment
    // auth succeeds.
    setRememberMePreference(rememberMe);
    setBusy(true);
    const result = await signInWithEmail(email, password, captchaToken ?? undefined);
    setBusy(false);
    afterAttempt(result.status === "error" && result.rateLimited);
    if (result.status === "email_not_confirmed") {
      // The credentials were right; the account just isn't confirmed yet.
      setCheckEmailReason("unconfirmed");
      setMode("checkEmail");
      return;
    }
    if (result.status === "error") {
      // V6-31: an unknown email and a wrong password read the same.
      setError(result.message);
      return;
    }
    // Success advances via the session effect.
  };

  const handleSignUp = async () => {
    if (!isValidEmail(email)) return setError(tk("Enter a valid email address."));
    if (isBurner) return;
    if (!meetsRule) return setError(tk("Choose a stronger password. See the checklist below."));
    if (password !== confirmPassword) return setError(tk("Passwords don't match."));
    if (!termsOn) return setTermsError(tk("Accept the Terms of Service and Privacy Policy to sign up."));
    if (!online) return setError(OFFLINE);
    setError(null);
    setBusy(true);
    // Asked again here: the blur check may not have run or finished yet.
    if (await isDisposableEmail(normalizedEmail)) {
      setBusy(false);
      setBurnerEmail(normalizedEmail);
      return;
    }
    const result = await signUpWithEmail(email, password, captchaToken ?? undefined);
    setBusy(false);
    afterAttempt(result.status === "error" && result.rateLimited);
    if (result.status === "disposable_email") {
      setBurnerEmail(normalizedEmail);
      return;
    }
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    if (result.status === "confirmation_required") {
      setCheckEmailReason("signup");
      setResent(false);
      setMode("checkEmail");
    }
    // "signed_in" only if confirmations get disabled; the session effect advances.
  };

  const handleResend = async () => {
    if (!online) return setError(OFFLINE);
    setError(null);
    setBusy(true);
    const result = await signUpWithEmail(email, password, captchaToken ?? undefined);
    setBusy(false);
    afterAttempt(result.status === "error" && result.rateLimited);
    if (result.status === "disposable_email") setError(DISPOSABLE_EMAIL_MESSAGE);
    else if (result.status === "error") setError(result.message);
    else {
      setResent(true);
      showToast(t("Sent again. Check your inbox."));
    }
  };

  const handleSendReset = async () => {
    if (!online) return setError(OFFLINE);
    setError(null);
    setBusy(true);
    const result = await sendPasswordReset(forgotEmail, captchaToken ?? undefined);
    setBusy(false);
    afterAttempt(result.rateLimited);
    if (result.rateLimited) {
      setError(result.message ?? null);
      return;
    }
    // Enumeration-safe: the sent state reveals nothing about the address.
    if (!result.ok && result.message) setError(result.message);
    else setResetSent(true);
  };

  // The footer slot: the cooldown countdown wins, then offline, then the error.
  // Shown through t(): the messages from services/auth translate once their
  // area's catalogue has them.
  const footerError = (message: string | null): string | null => {
    if (cooldown.active) return t("Too many attempts. Try again in {time}.", { time: formatCountdown(cooldown.left) });
    if (message === SUSPENDED_MESSAGE) return null;
    if (message && (EMAIL_FIELD_ERRORS.has(message) || PASSWORD_FIELD_ERRORS.has(message))) return null;
    if (!online) return t(OFFLINE);
    return message && t(message);
  };
  const emailError = error && EMAIL_FIELD_ERRORS.has(error) ? t(error) : isBurner ? t(DISPOSABLE_EMAIL_MESSAGE) : null;
  const passwordError = error && PASSWORD_FIELD_ERRORS.has(error) ? t(error) : null;
  const suspended = error === SUSPENDED_MESSAGE;

  // Restoring a session on load is async; showing the sign-in form meanwhile
  // would flash it at a user who is already signed in.
  if (!authReady) {
    return (
      <ObPage backdrop>
        <div className="ob-body">
          <ObProgress count={3} index={1} variant="intro" />
          <div className="ob-head" data-m="intro" style={{ justifyContent: "center" }}>
            <ObLockup />
          </div>
          <p role="status" style={{ textAlign: "center", fontSize: 13, lineHeight: "19.5px", fontWeight: 500, color: "var(--ob-faint)" }}>
            {t("Checking your session…")}
          </p>
        </div>
      </ObPage>
    );
  }

  // Already signed in and arrived here anyway, almost always by pressing
  // Back from the next step. Offer the way forward explicitly.
  if (session) {
    return (
      <ObPage backdrop>
        <div className="ob-body ob-step-in">
          <ObProgress count={3} index={1} variant="intro" />
          <ObHeader margin="intro" />
          <ObTitle variant="intro" eyebrow={t("Welcome back")} title={t("You're signed in")} subtitle={t("Continue setting up your Centium account.")} />
          <div className="ob-info">
            <MailCheck size={16} />
            <span>{rich(t("Signed in as {email}"), { email: <b>{session.user?.email ?? email}</b> })}</span>
          </div>
        </div>
        <ObFooter
          primary={{ label: t("Continue"), onClick: onNext }}
          link={{
            node: <>{rich(t("Not you? {signOut}"), { signOut: <b>{t("Sign out")}</b> })}</>,
            onClick: () => {
              setError(null);
              void signOut();
            },
          }}
        />
      </ObPage>
    );
  }

  if (mode === "checkEmail") {
    const fromSignUp = checkEmailReason === "signup";
    // A reload drops the password from memory, so a resend cannot be made
    // from here any more: say so instead of silently disabling it.
    const noPassword = !password;
    const resendDisabled = busy || noPassword || captchaPending || cooldown.active || !online;
    return (
      <ObPage backdrop>
        <div className="ob-body ob-step-in">
          <ObProgress count={3} index={1} variant="intro" />
          <ObHeader margin="intro" />
          <ObTitle
            variant="intro"
            eyebrow={t("Verify your email")}
            title={t("Check your email")}
            subtitle={
              fromSignUp ? (
                // Enumeration-safe: Supabase answers a new address and one that
                // already has an account identically.
                t("If an account doesn't already exist for this address, you'll get a confirmation link. Already registered? Sign in instead.")
              ) : (
                <>
                  {rich(t("Your account isn't confirmed yet. Open the confirmation link we sent to {email} to activate it."), {
                    email: <b style={{ color: "var(--ob-ink)", fontWeight: 700 }}>{email}</b>,
                  })}
                </>
              )
            }
          />
          <div className="ob-mail">
            <div className="ob-mail-ring">
              <span />
              <span />
              <span>
                <MailCheck size={30} strokeWidth={1.6} />
              </span>
            </div>
            <p className="ob-mail-email">{email}</p>
            <p className="ob-mail-body">
              {t("An account isn't active until that link is clicked. You can leave this page open. Onboarding picks up where you left off when you return.")}
            </p>
          </div>
          <p className="ob-hint">
            {noPassword
              ? t("To resend, go back to sign in and sign up again with the same email.")
              : resent
                ? t("Sent again just now. It can take a minute.")
                : t("Nothing arrived? Check spam, then resend below.")}
          </p>
          <div style={{ marginTop: 12 }}>
            <SecurityCheck status={captchaStatus} container={captchaContainer} />
          </div>
        </div>
        <ObFooter
          error={footerError(error)}
          primary={
            fromSignUp
              ? {
                  label: t("Sign in instead"),
                  onClick: () => {
                    setError(null);
                    setMode("signIn");
                  },
                }
              : { label: busy ? t("Sending…") : t("Resend confirmation email"), onClick: () => void singleFlight(handleResend), disabled: resendDisabled }
          }
          secondary={
            fromSignUp ? { label: busy ? t("Sending…") : t("Resend confirmation email"), onClick: () => void singleFlight(handleResend), disabled: resendDisabled } : undefined
          }
          link={{
            node: t("Back to sign in"),
            onClick: () => {
              setError(null);
              setMode("signIn");
            },
          }}
        />
        <ObToast message={toast} bottom={fromSignUp ? 222 : 158} />
      </ObPage>
    );
  }

  if (mode === "forgot") {
    const canSendReset = !resetSent && isValidEmail(forgotEmail) && !busy && !captchaPending && !cooldown.active && online;
    const back = () => {
      setError(null);
      setResetSent(false);
      setMode("signIn");
    };
    return (
      <ObPage backdrop>
        <form
          id="ob-forgot"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (canSendReset) void singleFlight(handleSendReset);
          }}
          className="ob-body ob-step-in"
        >
          <ObProgress count={3} index={1} variant="intro" />
          <ObHeader margin="intro" onBack={back} />
          {resetSent ? (
            <>
              <ObTitle
                variant="intro"
                eyebrow={t("Reset password")}
                title={t("Check your email")}
                subtitle={t("If an account exists for {email}, a reset link is on its way. It works in this browser only.", { email: forgotEmail })}
              />
              <div className="ob-mail">
                <div className="ob-mail-ring">
                  <span />
                  <span />
                  <span>
                    <MailCheck size={30} strokeWidth={1.6} />
                  </span>
                </div>
                <p className="ob-mail-email">{forgotEmail}</p>
                <p className="ob-mail-body">{t("Open the link to choose a new password. It expires in 1 hour.")}</p>
              </div>
              <p className="ob-hint">{t("Nothing arrived? Check spam, or send it again.")}</p>
            </>
          ) : (
            <>
              <ObTitle variant="intro" eyebrow={t("Reset password")} title={t("Forgot your password?")} subtitle={t("Enter the email on your account and we'll send a reset link.")} />
              <ObField
                variant="intro"
                icon={Mail}
                type="email"
                autoComplete="email"
                // i18n-ignore (an example address)
                placeholder="you@email.com"
                value={forgotEmail}
                readOnly={busy}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </>
          )}
          <div style={{ marginTop: 12 }}>
            <SecurityCheck status={captchaStatus} container={captchaContainer} />
          </div>
        </form>
        {resetSent ? (
          <ObFooter
            error={footerError(error)}
            primary={{ label: t("Back to sign in"), onClick: back }}
            secondary={{
              label: busy ? t("Sending…") : t("Send again"),
              disabled: busy || captchaPending || cooldown.active || !online,
              onClick: () => void singleFlight(handleSendReset),
            }}
          />
        ) : (
          <ObFooter
            error={footerError(error)}
            primary={{ label: busy ? t("Sending…") : t("Send reset link"), type: "submit", form: "ob-forgot", disabled: !canSendReset }}
            link={{ node: t("Back to sign in"), onClick: back }}
          />
        )}
      </ObPage>
    );
  }

  // One rule for the button and for Enter / the keyboard's Go key: a real
  // form submit, refused while the button is disabled or a request is out,
  // while the security check has no token, or a rate-limit wait runs.
  const signIn = mode === "signIn";
  const submitDisabled =
    busy || captchaPending || cooldown.active || !online || (!signIn && (isBurner || !signUpReady || !termsOn));
  const switchMode = () => {
    setError(null);
    setTermsError(null);
    // Otherwise leaving sign-up mid-mismatch and coming back shows the warning again.
    setConfirmBlurred(false);
    setMode(signIn ? "signUp" : "signIn");
  };
  return (
    <ObPage backdrop>
      <form
        id="ob-auth"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (submitDisabled) return;
          void singleFlight(signIn ? handleSignIn : handleSignUp);
        }}
        className="ob-body ob-step-in"
      >
        <ObProgress count={3} index={1} variant="intro" />
        <ObHeader margin="intro" />
        <ObTitle
          variant="intro"
          eyebrow={signIn ? t("Welcome back") : t("Get started")}
          title={signIn ? t("Sign in to Centium") : t("Create your account")}
          subtitle={signIn ? t("Pick up where you left off.") : t("One account for everything you do on Centium.")}
        />
        {suspended && (
          <div className="ob-info" data-tone="high" role="alert" style={{ marginBottom: 14 }}>
            <ShieldAlert size={16} />
            <span>{t(SUSPENDED_MESSAGE)}</span>
          </div>
        )}
        <ObField
          variant="intro"
          icon={Mail}
          type="email"
          autoComplete="email"
          // i18n-ignore (an example address)
          placeholder="you@email.com"
          aria-label={t("Email")}
          value={email}
          readOnly={busy}
          error={emailError}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error && EMAIL_FIELD_ERRORS.has(error)) setError(null);
          }}
          onFocus={() => window.clearTimeout(burnerTimer.current)}
          onBlur={checkBurnerSoon}
        />
        <ObField
          variant="intro"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          autoComplete={signIn ? "current-password" : "new-password"}
          placeholder={t("Password")}
          aria-label={t("Password")}
          value={password}
          readOnly={busy}
          error={passwordError}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error && PASSWORD_FIELD_ERRORS.has(error)) setError(null);
          }}
          end={
            <button type="button" className="hit" onClick={passwordVisibility.toggle} aria-label={showPassword ? t("Hide password") : t("Show password")} style={{ display: "flex" }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />
        {signIn && (
          <div className="ob-remember">
            {/* Unticked, the session cookie is written without Max-Age, so the
                browser drops it on close (lib/supabase/rememberMe.ts). */}
            <label onClick={() => setRememberMe((r) => !r)}>
              <span
                role="checkbox"
                aria-checked={rememberMe}
                aria-label={t("Remember me")}
                tabIndex={0}
                className="ob-check hit"
                data-on={rememberMe}
                onKeyDown={(e) => {
                  if (e.key === " ") {
                    e.preventDefault();
                    setRememberMe((r) => !r);
                  }
                }}
              >
                {rememberMe && <Check size={12} strokeWidth={3} />}
              </span>
              {t("Remember me")}
            </label>
            <button
              type="button"
              className="ob-remember-link hit"
              onClick={() => {
                setForgotEmail(email);
                setError(null);
                setMode("forgot");
              }}
            >
              {t("Forgot password?")}
            </button>
          </div>
        )}
        {!signIn && (
          <>
            <ObField
              variant="intro"
              icon={Lock}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder={t("Confirm password")}
              aria-label={t("Confirm password")}
              value={confirmPassword}
              readOnly={busy}
              error={confirmMismatch ? t("Passwords don't match") : null}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setConfirmBlurred(true)}
            />
            {password && <ObStrength password={password} />}
            <div style={{ marginTop: 14 }}>
              <ObTerms on={termsOn} onChange={setTerms} error={termsError && t(termsError)} tail="." />
            </div>
          </>
        )}
        <div style={{ marginTop: 12 }}>
          <SecurityCheck status={captchaStatus} container={captchaContainer} />
        </div>
      </form>
      <ObFooter
        error={footerError(error)}
        primary={{ label: busy ? (signIn ? t("Signing in…") : t("Signing up…")) : signIn ? t("Sign in") : t("Sign up"), type: "submit", form: "ob-auth", disabled: submitDisabled }}
        secondary={{ label: t("Continue with Google"), or: true, disabled: busy, onClick: () => void handleGoogle() }}
        link={{
          node: signIn ? (
            <>{rich(t("Don't have an account? {signUp}"), { signUp: <b>{t("Sign up")}</b> })}</>
          ) : (
            <>{rich(t("Already have an account? {signIn}"), { signIn: <b>{t("Sign in")}</b> })}</>
          ),
          onClick: switchMode,
        }}
      />
    </ObPage>
  );
};
