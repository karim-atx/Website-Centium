import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Copy } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { CodeBoxes, CODE_LENGTH } from "../../components/ui/CodeBoxes";
import { useApp } from "../../context/AppContext";
import { useSingleFlight } from "../../hooks/useSingleFlight";
import {
  enrollTotp,
  getMfaStatus,
  removeAbandonedFactors,
  unenrollFactor,
  verifyTotp,
  type TotpEnrollment,
} from "../../services/mfa";

// MO1.8.4.1 Set up two-factor, on one page (R18; scan and verify used to be
// two steps of a sheet): Step 1 of 2, the QR on white with the setup key in
// groups of four and a copy button; Step 2 of 2, six code boxes; a pinned
// Verify.
//
// THE FACTOR EXISTS BEFORE IT PROTECTS ANYTHING. enroll() creates an
// unverified factor at once; only a correct code makes it real. Leaving this
// page without verifying removes it (GoTrue allows that because an unverified
// factor guards nothing), so backing out leaves two-factor off.
//
// CHANGE APP (?change=1, C20) enrols a SECOND factor, verifies it, and only
// then removes the old one. If the new code is never verified, the old
// factor is untouched: the account is never left without two-factor on the
// way to a new app. Enrolling while a verified factor exists needs an aal2
// session, which GoTrue enforces.

/** "JBSWY3DPEHPK3PXP" -> "JBSW Y3DP EHPK 3PXP". */
const grouped = (secret: string) => secret.replace(/(.{4})/g, "$1 ").trim();

export default function TwoFactorSetupPage() {
  const { refreshMfaState } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const changing = params.get("change") === "1";
  const singleFlight = useSingleFlight();

  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // The factor being replaced, for Change app.
  const oldFactorId = useRef<string | null>(null);
  // Set once the new factor is verified, so leaving does not remove it.
  const verified = useRef(false);

  // Enrol on mount; on leaving, remove the factor if it was never verified.
  // StrictMode mounts this twice in development: the first enrolment is
  // removed by its own cleanup once it resolves, so only one survives.
  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    void (async () => {
      const status = await getMfaStatus();
      if (cancelled) return;
      if (!status.ok) {
        setStartError(status.message);
        return;
      }
      const existing = status.data.factors[0] ?? null;
      if (existing && !changing) {
        // Already on: nothing to set up here.
        navigate("/app/settings/two-factor", { replace: true });
        return;
      }
      oldFactorId.current = changing ? existing?.id ?? null : null;
      // Abandoned enrolments from an earlier visit protect nothing and would
      // collide with the new factor's name; remove them first.
      await removeAbandonedFactors();
      if (cancelled) return;
      // A new name while the old factor exists: GoTrue keeps names unique
      // per user. The authenticator app shows the issuer, "Centium", either way.
      const name = existing?.friendly_name === "Centium" ? "Centium authenticator" : "Centium";
      const result = await enrollTotp(name);
      if (!result.ok) {
        if (!cancelled) setStartError(result.message);
        return;
      }
      created = result.data.factorId;
      if (cancelled) {
        void unenrollFactor(created);
        return;
      }
      setEnrollment(result.data);
    })();
    return () => {
      cancelled = true;
      if (created && !verified.current) void unenrollFactor(created);
    };
  }, [changing, navigate]);

  const verify = async () => {
    if (!enrollment || code.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    const result = await verifyTotp(enrollment.factorId, code);
    if (!result.ok) {
      setBusy(false);
      setCode("");
      setError(result.message);
      return;
    }
    verified.current = true;
    // Change app: the new factor works, so the old one can go now.
    if (oldFactorId.current) {
      const removed = await unenrollFactor(oldFactorId.current);
      if (!removed.ok) {
        // Both factors are verified; either one signs in. Say so rather than
        // pretending the swap finished.
        setBusy(false);
        setError(`Your new app works, but the old one couldn't be removed: ${removed.message}`);
        await refreshMfaState();
        return;
      }
    }
    await refreshMfaState();
    navigate("/app/settings/two-factor", { replace: true });
  };

  const copySecret = async () => {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
    } catch {
      // The key is on screen and selectable either way.
    }
  };

  return (
    <div className="pb-[172px]">
      <PageHeader title={changing ? "Change authenticator app" : "Set up two-factor"} showBack sub />

      {startError ? (
        <p role="alert" className="text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {startError}
        </p>
      ) : !enrollment ? (
        <p className="text-sm text-charcoal-faint text-center py-10">Loading…</p>
      ) : (
        <>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Step 1 of 2</p>
          {/* On white in both themes, so any phone camera can read it. The
              card is 180 × 180 at radius 18 (MO1.8.4.1), the code inside it. */}
          <div className="mt-3 mx-auto w-[180px] h-[180px] rounded-[18px] border border-primary/40 bg-white p-2">
            <img src={enrollment.qrCode} alt="QR code for two-factor setup" className="w-full h-full" />
          </div>
          {/* On a phone the QR is on the same screen as the app that would
              scan it: the link hands the secret to the authenticator. */}
          <a href={enrollment.uri} className="tap mt-3 block text-center text-[13px] font-semibold text-primary-deep-text">
            Open in my authenticator app
          </a>

          <p className="mt-4 text-center text-[13px] font-semibold text-charcoal-soft">Can't scan? Copy the setup key</p>
          <div className="mt-2 flex items-center gap-2">
            {/* MO1.8.4.1: the key in the app font, 13 / 700; it wraps between
                its groups of four. */}
            <code className="flex-1 min-w-0 rounded-xl bg-cream-soft px-3.5 py-3 font-sans text-[13px] font-bold text-charcoal break-words">
              {grouped(enrollment.secret)}
            </code>
            <button
              type="button"
              onClick={() => void copySecret()}
              aria-label="Copy setup key"
              className="tap w-11 h-11 rounded-xl bg-primary-pale text-primary-dark flex items-center justify-center shrink-0"
            >
              {copied ? <Check size={18} strokeWidth={1.75} /> : <Copy size={18} strokeWidth={1.75} />}
            </button>
          </div>

          <p className="mt-6 text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
            Step 2 of 2: enter the 6-digit code from your app
          </p>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void singleFlight(verify);
            }}
            className="mt-3"
          >
            <CodeBoxes
              value={code}
              onChange={(v) => {
                setCode(v);
                if (error) setError(null);
              }}
              error={!!error}
              disabled={busy}
              label="Six-digit authentication code"
            />
            {error && (
              <p role="alert" className="mt-3 text-center text-xs font-semibold text-status-high">
                {error}
              </p>
            )}
          </form>

          <PinnedCta
            primary={{
              label: busy ? "Checking…" : "Verify",
              disabled: busy || code.length !== CODE_LENGTH,
              onClick: () => void singleFlight(verify),
            }}
          />
        </>
      )}
    </div>
  );
}
