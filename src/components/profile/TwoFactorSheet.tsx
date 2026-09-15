import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import {
  enrollTotp,
  getMfaStatus,
  unenrollFactor,
  verifyTotp,
  type TotpEnrollment,
} from "../../services/mfa";
import { ShieldCheck, Copy, Check, AlertTriangle } from "lucide-react";
import type { Factor } from "@supabase/supabase-js";

// Turning two-factor authentication on and off.
//
// FOUR STEPS, IN THE ORDER SOMEONE CAN ACTUALLY FOLLOW: what this is, the
// code to scan, prove it works, and what happens if the phone is lost. The
// last one is not a formality — this app has no backup codes to hand out, so
// the moment before someone commits is the only honest place to say that.
//
// THE FACTOR EXISTS BEFORE IT PROTECTS ANYTHING. enroll() creates an
// unverified factor immediately; only a correct code makes it real. Leaving
// the sheet in between would strand that row, so closing mid-flow removes it
// — which GoTrue permits precisely because an unverified factor guards
// nothing.

type Step = "intro" | "scan" | "verify" | "recovery" | "done";

export const TwoFactorSheet: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { refreshMfaState } = useApp();

  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [step, setStep] = useState<Step>("intro");
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState(false);

  const enrolled = factors.length > 0;

  // Reads once per mount, which is once per opening: Settings keys this sheet
  // so it remounts each time, the same treatment RateAppSheet gets there and
  // for the same reason — a sheet that reopens holding the previous visit's
  // state shows something the user did not choose this time.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void getMfaStatus().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setFactors(result.data.factors);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Closing mid-enrolment takes the unverified factor with it. Without this,
  // opening and abandoning the sheet three times leaves three dead rows, and
  // the fourth attempt hits the ten-factor ceiling for no reason anyone could
  // see or fix.
  const close = () => {
    if (enrollment && step !== "done") void unenrollFactor(enrollment.factorId);
    setStep("intro");
    setEnrollment(null);
    setCode("");
    setError(null);
    setCopied(false);
    setRemoving(false);
    onClose();
  };

  const begin = async () => {
    setBusy(true);
    setError(null);
    // The authenticator app shows this next to the code, so it has to name
    // the thing being protected, not the app doing the protecting.
    const result = await enrollTotp("Centium");
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEnrollment(result.data);
    setStep("scan");
  };

  const confirm = async () => {
    if (!enrollment || code.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    const result = await verifyTotp(enrollment.factorId, code);
    setBusy(false);
    if (!result.ok) {
      setCode("");
      setError(result.message);
      return;
    }
    await refreshMfaState();
    setStep("recovery");
  };

  const turnOff = async (factorId: string) => {
    setBusy(true);
    setError(null);
    const result = await unenrollFactor(factorId);
    setBusy(false);
    if (!result.ok) {
      // The likely failure is insufficient_aal — a session that signed in
      // before two-factor was switched on, so it never passed a challenge
      // and GoTrue will not let it strip the factor. describeAuthError turns
      // that into "confirm your two-factor code first", which is exactly
      // right: sign out and back in and the challenge appears.
      setError(result.message);
      return;
    }
    setFactors([]);
    setRemoving(false);
    await refreshMfaState();
  };

  const copySecret = async () => {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
    } catch {
      // Clipboard access is denied in plenty of ordinary situations. The
      // secret is on screen and selectable either way, so this is a
      // convenience failing, not the flow failing.
    }
  };

  const title = enrolled && step === "intro" ? "Two-factor authentication" : "Set up two-factor";

  return (
    <BottomSheet open={open} onClose={close} title={title}>
      <div className="space-y-4 animate-fade-slide-up">
        {loading ? (
          <p className="text-sm text-charcoal-faint text-center py-6">Loading…</p>
        ) : enrolled ? (
          <>
            <div className="flex items-start gap-2.5 rounded-2xl bg-primary-pale px-4 py-3.5">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-primary-dark" />
              <div>
                <p className="text-sm font-semibold text-primary-dark">Two-factor is on</p>
                <p className="text-[11.5px] text-primary-dark/80 mt-0.5">
                  You'll be asked for a code from {factors[0]?.friendly_name ?? "your authenticator"}{" "}
                  each time you sign in.
                </p>
              </div>
            </div>

            <p className="text-[12.5px] text-charcoal-soft leading-relaxed">
              Signing in on a device where you chose "Remember me" keeps you signed in, so you'll
              only be asked again when that session ends.
            </p>

            {error && <p className="text-xs font-semibold text-status-high">{error}</p>}

            {removing ? (
              <div className="rounded-2xl bg-cream-soft px-4 py-3.5 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-status-caution" />
                  <p className="text-[12.5px] text-charcoal-soft leading-relaxed">
                    Turning this off means your password alone gets into your account — including
                    your health data. You can turn it back on at any time.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setRemoving(false)}
                    disabled={busy}
                  >
                    Keep it on
                  </Button>
                  <Button
                    fullWidth
                    onClick={() => void turnOff(factors[0].id)}
                    disabled={busy || !factors[0]}
                  >
                    {busy ? "Removing…" : "Turn off"}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setRemoving(true)}
                className="tap w-full text-center text-sm font-semibold text-status-high"
              >
                Turn off two-factor
              </button>
            )}
          </>
        ) : step === "intro" ? (
          <>
            <p className="text-[12.5px] text-charcoal-soft leading-relaxed">
              Two-factor authentication asks for a 6-digit code from your phone as well as your
              password. If someone else learns your password, it isn't enough to get into your
              account.
            </p>
            <p className="text-[12.5px] text-charcoal-soft leading-relaxed">
              You'll need an authenticator app — Google Authenticator, 1Password, Authy or any
              other. Setting this up takes about a minute.
            </p>
            {error && <p className="text-xs font-semibold text-status-high">{error}</p>}
            <Button fullWidth size="lg" onClick={() => void begin()} disabled={busy}>
              {busy ? "Starting…" : "Get started"}
            </Button>
          </>
        ) : step === "scan" && enrollment ? (
          <>
            <p className="text-[12.5px] text-charcoal-soft leading-relaxed">
              Scan this with your authenticator app.
            </p>
            <div className="rounded-2xl bg-white p-4 flex items-center justify-center">
              <img
                src={enrollment.qrCode}
                alt="QR code for two-factor setup"
                className="w-44 h-44"
              />
            </div>

            {/* On a phone the camera is not usable here — the QR is on the
                same screen as the app that would scan it. The link hands the
                whole secret to the authenticator directly, and the code
                below covers anyone whose app takes typed entry. */}
            <a
              href={enrollment.uri}
              className="tap block w-full text-center text-sm font-semibold text-primary"
            >
              Open in my authenticator app
            </a>

            <div className="rounded-2xl bg-cream-soft px-3.5 py-3">
              <p className="text-[11px] font-semibold text-charcoal-faint uppercase tracking-wide mb-1.5">
                Or enter this code
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[12.5px] font-mono text-charcoal break-all">
                  {enrollment.secret}
                </code>
                <button
                  onClick={() => void copySecret()}
                  className="tap shrink-0 text-charcoal-faint"
                  aria-label="Copy setup code"
                >
                  {copied ? (
                    <Check size={15} className="text-primary-dark" />
                  ) : (
                    <Copy size={15} />
                  )}
                </button>
              </div>
            </div>

            <Button fullWidth size="lg" onClick={() => setStep("verify")}>
              Next
            </Button>
          </>
        ) : step === "verify" ? (
          <>
            <p className="text-[12.5px] text-charcoal-soft leading-relaxed">
              Enter the 6-digit code your authenticator app is showing now. This confirms it's set
              up correctly before we switch anything on.
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void confirm();
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              aria-label="Six-digit authentication code"
              className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-center text-xl font-semibold tracking-[0.4em] text-charcoal placeholder:text-charcoal-faint placeholder:tracking-[0.4em] focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
            />
            {error && <p className="text-xs font-semibold text-status-high text-center">{error}</p>}
            <Button
              fullWidth
              size="lg"
              onClick={() => void confirm()}
              disabled={busy || code.length < 6}
            >
              {busy ? "Checking…" : "Confirm"}
            </Button>
            <button
              onClick={() => {
                setError(null);
                setStep("scan");
              }}
              className="tap w-full text-center text-xs font-semibold text-charcoal-soft"
            >
              Back to the code
            </button>
          </>
        ) : step === "recovery" ? (
          <>
            {/* AFTER IT IS ON, NOT BEFORE, and that is the deliberate part.
                This is the screen that tells someone their phone is now the
                only way in — and it has to be read, not dismissed on the way
                to something they wanted. Placing it before "Get started"
                would put it in front of a person who has not yet decided to
                care. */}
            <div className="flex items-start gap-2.5 rounded-2xl bg-primary-pale px-4 py-3.5">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-primary-dark" />
              <p className="text-sm font-semibold text-primary-dark">
                Two-factor authentication is on
              </p>
            </div>

            <div className="rounded-2xl bg-cream-soft px-4 py-3.5 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-status-caution" />
                <p className="text-[12.5px] font-semibold text-charcoal">
                  If you lose your phone, you'll need us to help
                </p>
              </div>
              <p className="text-[12px] text-charcoal-soft leading-relaxed">
                Centium doesn't issue backup codes. If you lose access to your authenticator app,
                contact support and we'll remove two-factor from your account once we've confirmed
                who you are — resetting your password on its own won't get you back in.
              </p>
              <p className="text-[12px] text-charcoal-soft leading-relaxed">
                If your authenticator app can back itself up to your own cloud account, turning
                that on now is the simplest protection against this.
              </p>
            </div>

            <Button fullWidth size="lg" onClick={() => setStep("done")}>
              I understand
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5 rounded-2xl bg-primary-pale px-4 py-3.5">
              <Check size={16} className="shrink-0 text-primary-dark" />
              <p className="text-sm font-semibold text-primary-dark">You're all set</p>
            </div>
            <p className="text-[12.5px] text-charcoal-soft leading-relaxed">
              From now on, signing in asks for a code from your authenticator app as well as your
              password.
            </p>
            <Button fullWidth size="lg" onClick={close}>
              Done
            </Button>
          </>
        )}
      </div>
    </BottomSheet>
  );
};
