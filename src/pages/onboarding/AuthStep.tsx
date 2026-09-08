import React, { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import { Mail, Lock, Eye, EyeOff, Check, X, MailCheck } from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { Session } from "@supabase/supabase-js";
import {
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "../../services/auth";
import { setRememberMe as setRememberMePreference } from "../../../lib/supabase/rememberMe";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
}

type Mode = "signIn" | "signUp" | "forgot" | "checkEmail";

// V10 (QA 10.0): "Between the get started and What brings you to Centium?
// page, i would like a page that prompts you to either sign in ... Or sign
// up ... Ensure password should be strong ... amongst other things i might
// have forgotten [forgot password]."
//
// Now backed by real Supabase auth. The UI is unchanged from the prototype
// version — same fields, same strength meter, same Google button — but the
// handlers call signUp/signInWithPassword/signInWithOAuth instead of just
// validating format and advancing.
//
// Email confirmation is REQUIRED on this project, so sign-up does not log
// anyone in: it sends a link and parks on a "check your email" state. The
// step only advances once a real session exists, which is why the advance
// is driven by the session in AppContext rather than by the submit handler.
const passwordChecks = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const inputClass =
  "w-full rounded-2xl bg-cream-card border border-charcoal/10 pl-10 pr-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10";

export const AuthStep: React.FC<Props> = ({ draft, setDraft, onNext }) => {
  const { session, authReady, signOut } = useApp();
  const [mode, setMode] = useState<Mode>("signIn");
  // Why we're on the check-email screen, which changes what we may say.
  // After a sign-up we must not reveal whether the address already has an
  // account; after a sign-in that came back `email_not_confirmed`, Supabase
  // has already told us the account exists and the user proved they know
  // the password, so there is nothing left to protect and the copy can be
  // direct.
  const [checkEmailReason, setCheckEmailReason] = useState<"signup" | "unconfirmed">("signup");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmBlurred, setConfirmBlurred] = useState(false);
  // Default on: the persistent session everyone had before this existed.
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const email = draft.email;
  const setEmail = (v: string) => setDraft((d) => ({ ...d, email: v }));

  // The single gate out of this step: a session *arriving* while we're here.
  // Covers all three ways that happens — password sign-in, the returning
  // click on a confirmation link, and the Google OAuth round trip — so no
  // handler advances on its own.
  //
  // It must be the null -> session TRANSITION, not merely "a session
  // exists". This step is conditionally mounted, so navigating back to it
  // remounts the component and re-runs this effect with the session still
  // in place; keying off existence alone re-fired onNext() immediately and
  // made the back button on the next step look broken. Seeding the ref with
  // whatever session is present at mount means an already-signed-in user
  // stays put and gets the "signed in as" screen below instead.
  const prevSession = useRef<Session | null>(session);
  useEffect(() => {
    const had = prevSession.current;
    prevSession.current = session;
    if (!session || had) return;
    // Google (and a confirmation return) carry the authoritative address;
    // adopt it so the rest of onboarding shows what they actually signed in
    // with rather than whatever was half-typed in the field.
    const sessionEmail = session.user?.email;
    if (sessionEmail) setDraft((d) => ({ ...d, email: sessionEmail }));
    onNext();
  }, [session, setDraft, onNext]);

  /**
   * Live mismatch warning for the confirm-password field.
   *
   * The awkward part of this pattern is the first few keystrokes: "abc" is
   * not yet "abcdef", but the user is mid-way through typing it correctly and
   * telling them off for that is noise. So the warning waits for one of two
   * signals that they are actually done:
   *
   *   - the confirmation has reached the password's length, so it can no
   *     longer become correct by typing more, or
   *   - they have left the field, so they consider it finished.
   *
   * It clears the instant the two match, including mid-keystroke, and an
   * empty confirmation is never an error — that is what the submit guard and
   * the disabled button are for.
   */
  const confirmMismatch =
    mode === "signUp" &&
    confirmPassword.length > 0 &&
    confirmPassword !== password &&
    (confirmBlurred || confirmPassword.length >= password.length);

  const passedChecks = passwordChecks.filter((c) => c.test(password)).length;
  const strengthLabel = passedChecks <= 1 ? "Weak" : passedChecks <= 3 ? "Medium" : "Strong";
  const strengthColor =
    passedChecks <= 1
      ? "rgb(var(--c-status-high))"
      : passedChecks <= 3
      ? "rgb(var(--c-status-caution))"
      : "rgb(var(--c-status-good))";
  // Requires length + at least a number and a letter — special char is a bonus for the "Strong" label only.
  const meetsMinimum = passwordChecks[0].test(password) && passwordChecks[2].test(password) && /[A-Za-z]/.test(password);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // Google needs no confirmation step — this navigates away to Google and
  // the session lands on the return trip, picked up by the effect above.
  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    const result = await signInWithGoogle();
    if (result.status === "error") {
      setError(result.message);
      setBusy(false);
    }
    // On success the browser is already leaving; leave `busy` set so the
    // button can't be double-fired during the redirect.
  };

  const handleSignIn = async () => {
    if (!isValidEmail(email)) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    setError(null);
    // Recorded BEFORE the request. Supabase writes the session cookie the
    // moment auth succeeds, and the cookie adapter reads this synchronously
    // at that point — setting it afterwards would be one write too late.
    setRememberMePreference(rememberMe);
    setBusy(true);
    const result = await signInWithEmail(email, password);
    setBusy(false);

    if (result.status === "email_not_confirmed") {
      // Deliberately distinct from a wrong password: the credentials were
      // right, the account just isn't confirmed yet.
      setCheckEmailReason("unconfirmed");
      setMode("checkEmail");
      return;
    }
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    // Success advances via the session effect, not from here.
  };

  const handleSignUp = async () => {
    if (!isValidEmail(email)) return setError("Enter a valid email address.");
    if (!meetsMinimum) return setError("Choose a stronger password — see the checklist below.");
    if (password !== confirmPassword) return setError("Passwords don't match.");
    setError(null);
    setBusy(true);
    const result = await signUpWithEmail(email, password);
    setBusy(false);

    if (result.status === "error") {
      setError(result.message);
      return;
    }
    if (result.status === "confirmation_required") {
      setCheckEmailReason("signup");
      setMode("checkEmail");
      return;
    }
    // status === "signed_in" only if confirmations get disabled on the
    // project; the session effect handles advancing in that case too.
  };

  const handleResend = async () => {
    setError(null);
    setBusy(true);
    const result = await signUpWithEmail(email, password);
    setBusy(false);
    if (result.status === "error") setError(result.message);
  };

  const handleSendReset = async () => {
    setError(null);
    setBusy(true);
    const result = await sendPasswordReset(forgotEmail);
    setBusy(false);
    // Shown regardless of outcome — the copy is deliberately worded so it
    // reveals nothing about whether the address has an account.
    if (!result.ok && result.message) setError(result.message);
    else setResetSent(true);
  };

  // Restoring a session on load is async; showing the sign-in form in the
  // meantime would flash it at a user who is already signed in.
  if (!authReady) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-charcoal-faint">Checking your session…</p>
      </div>
    );
  }

  // Already signed in and arrived here anyway — almost always by pressing
  // back from the next step. Auto-advancing would make that back button
  // useless, so offer the way forward explicitly instead. The onboarding
  // draft is untouched either way, so Continue resumes exactly where they
  // were.
  if (session) {
    return (
      <div className="flex-1 flex flex-col animate-fade-slide-up">
        <h1 className="font-display text-2xl font-bold text-charcoal mb-2">You're signed in</h1>
        <p className="text-charcoal-soft text-sm mb-6">Continue setting up your Centium account.</p>
        <div className="flex-1">
          <div className="rounded-2xl bg-primary-pale px-4 py-3.5 flex items-center gap-2.5">
            <MailCheck size={16} className="shrink-0 text-primary-dark" />
            <span className="text-sm text-primary-dark">
              Signed in as <span className="font-semibold">{session.user?.email ?? email}</span>
            </span>
          </div>
        </div>
        <div className="mt-8">
          <Button fullWidth size="lg" onClick={onNext}>
            Continue
          </Button>
          <button
            onClick={() => {
              setError(null);
              void signOut();
            }}
            className="tap w-full text-center text-sm font-semibold text-charcoal-soft mt-4"
          >
            Not you? <span className="text-primary">Sign out</span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "checkEmail") {
    const fromSignUp = checkEmailReason === "signup";
    return (
      <div className="flex-1 flex flex-col animate-fade-slide-up">
        <h1 className="font-display text-2xl font-bold text-charcoal mb-2">Check your email</h1>
        {fromSignUp ? (
          // Enumeration-safe: the response Supabase gives is identical for a
          // new address and one that already has an account, deliberately, so
          // sign-up can't be used to discover who has registered. This copy
          // holds for both cases without leaking which one it is.
          <p className="text-charcoal-soft text-sm mb-6">
            If an account doesn't already exist for{" "}
            <span className="font-semibold text-charcoal">{email}</span>, you'll get a confirmation
            link. Already registered? Sign in instead.
          </p>
        ) : (
          <p className="text-charcoal-soft text-sm mb-6">
            Your account isn't confirmed yet. Open the confirmation link we sent to{" "}
            <span className="font-semibold text-charcoal">{email}</span> to activate it.
          </p>
        )}
        <div className="flex-1">
          <div className="rounded-2xl bg-primary-pale px-4 py-3.5 text-sm text-primary-dark flex items-start gap-2.5">
            <MailCheck size={16} className="mt-0.5 shrink-0" />
            <span>
              An account isn't active until that link is clicked. You can leave this page open —
              onboarding picks up where you left off when you return.
            </span>
          </div>
          <p className="text-[11px] text-charcoal-faint mt-3">
            Nothing arrived? Check spam, then resend below.
          </p>
        </div>
        <div className="mt-8">
          {error && <p className="text-xs font-semibold text-status-high mb-3 text-center">{error}</p>}
          {fromSignUp && (
            <Button
              fullWidth
              size="lg"
              className="mb-3"
              onClick={() => {
                setError(null);
                setMode("signIn");
              }}
            >
              Sign in instead
            </Button>
          )}
          <Button fullWidth size="lg" variant="outline" disabled={busy || !password} onClick={handleResend}>
            {busy ? "Sending…" : "Resend confirmation email"}
          </Button>
          <button
            onClick={() => {
              setError(null);
              setMode("signIn");
            }}
            className="tap w-full text-center text-sm font-semibold text-charcoal-soft mt-4"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <div className="flex-1 flex flex-col animate-fade-slide-up">
        <h1 className="font-display text-2xl font-bold text-charcoal mb-2">Reset your password</h1>
        <p className="text-charcoal-soft text-sm mb-6">
          Enter the email on your account and we'll send a reset link.
        </p>
        <div className="flex-1 space-y-4">
          {resetSent ? (
            <div className="rounded-2xl bg-primary-pale px-4 py-3.5 text-sm text-primary-dark flex items-center gap-2">
              <Check size={16} /> If an account exists for {forgotEmail}, a reset link is on its way.
            </div>
          ) : (
            <label className="block relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
              <input
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@email.com"
                type="email"
                className={inputClass}
              />
            </label>
          )}
        </div>
        <div className="mt-8">
          {error && <p className="text-xs font-semibold text-status-high mb-3 text-center">{error}</p>}
          {!resetSent ? (
            <Button
              fullWidth
              size="lg"
              disabled={!isValidEmail(forgotEmail) || busy}
              onClick={handleSendReset}
            >
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          ) : (
            <Button fullWidth size="lg" onClick={() => { setMode("signIn"); setResetSent(false); }}>
              Back to sign in
            </Button>
          )}
          {!resetSent && (
            <button
              onClick={() => setMode("signIn")}
              className="tap w-full text-center text-sm font-semibold text-charcoal-soft mt-4"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col animate-fade-slide-up">
      <h1 className="font-display text-2xl font-bold text-charcoal mb-2">
        {mode === "signIn" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="text-charcoal-soft text-sm mb-6">
        {mode === "signIn" ? "Sign in to continue to Centium." : "Sign up with your email to get started."}
      </p>

      <div className="flex-1 space-y-4">
        <label className="block relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            type="email"
            className={inputClass}
          />
        </label>

        <label className="block relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            className={`${inputClass} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="tap absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </label>

        {mode === "signIn" && (
          <div className="flex items-center justify-between -mt-2">
            {/* Unticked, the session cookie is written without Max-Age, so the
                browser drops it on close. See lib/supabase/rememberMe.ts. */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-xs font-semibold text-charcoal-soft">Remember me</span>
            </label>
            <button onClick={() => setMode("forgot")} className="tap text-xs font-semibold text-primary">
              Forgot password?
            </button>
          </div>
        )}

        {mode === "signUp" && (
          <>
            <label className="block relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setConfirmBlurred(true)}
                placeholder="Confirm password"
                type={showPassword ? "text" : "password"}
                className={inputClass}
              />
            </label>

            {confirmMismatch && (
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
                    style={{ width: `${(passedChecks / passwordChecks.length) * 100}%`, background: strengthColor }}
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
                        <span className={passed ? "text-charcoal-soft" : "text-charcoal-faint"}>{c.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-8">
        {error && <p className="text-xs font-semibold text-status-high mb-3 text-center">{error}</p>}
        <Button
          fullWidth
          size="lg"
          disabled={busy}
          onClick={mode === "signIn" ? handleSignIn : handleSignUp}
        >
          {busy ? "Please wait…" : mode === "signIn" ? "Sign in" : "Sign up"}
        </Button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-charcoal/10" />
          <span className="text-xs text-charcoal-faint">or</span>
          <div className="flex-1 h-px bg-charcoal/10" />
        </div>

        <Button fullWidth size="lg" variant="outline" disabled={busy} onClick={handleGoogle}>
          Continue with Google
        </Button>

        <button
          onClick={() => {
            setError(null);
            // Otherwise leaving sign-up mid-mismatch and coming back shows the
            // warning again before they have typed anything.
            setConfirmBlurred(false);
            setMode(mode === "signIn" ? "signUp" : "signIn");
          }}
          className="tap w-full text-center text-sm font-semibold text-charcoal-soft mt-5"
        >
          {mode === "signIn" ? "Don't have an account? " : "Already have an account? "}
          <span className="text-primary">{mode === "signIn" ? "Sign up" : "Sign in"}</span>
        </button>

      </div>
    </div>
  );
};
