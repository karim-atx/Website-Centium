import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Copy } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { SettingsBody } from "../../components/ui/SettingsRows";
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
import { generateRecoveryCodes } from "../../services/recoveryCodes";
import { RecoveryCodesView } from "../../components/security/RecoveryCodesView";

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
// session, which GoTrue enforces. The page keeps the frame's title, "Set
// up two-factor", either way: MO1.8.4.1 is what Change app opens.
//
// VERIFY OPENS MO1.8.4.2 (Recovery codes) when two-factor has just been
// turned on: the now-aal2 session asks the backend (stage 1) for ten codes
// and shows them once; "I've saved them" lands on MO1.8.4. Change app keeps
// the account's existing sheet (the codes don't depend on which app), so it
// returns to MO1.8.4 as before. If the codes can't be made, MO1.8.4 still
// opens, where the widget's Generate new makes them.
//
// Handover-complete pass: the "Open in my authenticator app" link is gone
// (not drawn); the setup key and its copy button carry the same secret.
// Loading is the Foundations skeleton, errors an inline line in danger.

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
  // MO1.8.4.2: the fresh sheet, readable only now.
  const [codes, setCodes] = useState<string[] | null>(null);
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
    if (!oldFactorId.current) {
      const sheet = await generateRecoveryCodes();
      if (sheet.ok && sheet.value.length > 0) {
        setBusy(false);
        setCodes(sheet.value);
        return;
      }
    }
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

  if (codes) {
    const done = () => navigate("/app/settings/two-factor", { replace: true });
    return <RecoveryCodesView codes={codes} onSaved={done} onBack={done} />;
  }

  return (
    <div className="pb-[172px]">
      <PageHeader title="Set up two-factor" showBack sub tightBack />

      {/* MO1.8.4.1: 24 pt side insets; "Step 1 of 2" 16 under the 36 pt title. */}
      <SettingsBody className="-mt-1">

      {startError ? (
        <p role="alert" className="text-[12px] font-semibold text-status-high">
          {startError}
        </p>
      ) : !enrollment ? (
        // Foundations loading state: skeleton blocks at the anatomy positions
        // (surface.soft, each block's radius): the step label, the QR card,
        // the key row and the code boxes.
        <div aria-busy="true" aria-label="Loading two-factor setup">
          <div className="h-[18px] w-24 rounded bg-cream-soft" />
          <div className="mt-2.5 mx-auto w-[180px] h-[180px] rounded-[18px] bg-cream-soft" />
          <div className="mt-[43px] flex gap-2">
            <div className="flex-1 h-12 rounded-xl bg-cream-soft" />
            <div className="w-12 h-12 rounded-xl bg-cream-soft" />
          </div>
          <div className="mt-[70px] flex gap-1.5">
            {Array.from({ length: CODE_LENGTH }, (_, i) => (
              <div key={i} className="flex-1 h-[52px] rounded-xl bg-cream-soft" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* MO1.8.4.1 section label: 12 / 700 #7D67D9 (new since the
              redesign, so the handover's colour), 18 tall, 10 above the QR. */}
          <p className="text-xs leading-[18px] font-bold text-primary-accent uppercase tracking-wide">Step 1 of 2</p>
          {/* On white in both themes, so any phone camera can read it. The
              card is 180 × 180 at radius 18 (MO1.8.4.1), the code inside it,
              ringed 1.5 px in primary.fill #9A8CD6 (measured). */}
          <div className="mt-2.5 mx-auto w-[180px] h-[180px] rounded-[18px] border-[1.5px] border-th-9a8cd6 dark:border-primary bg-white p-2">
            <img src={enrollment.qrCode} alt="QR code for two-factor setup" className="w-full h-full" />
          </div>
          {/* MO1.8.4.1: 15 under the QR card (285 to 300), 19 tall; the key
              row 9 under it (328). */}
          <p className="mt-[15px] text-center text-[13px] leading-[19px] font-semibold text-charcoal-soft">Can't scan? Copy the setup key</p>
          <div className="mt-[9px] flex items-center gap-2">
            {/* MO1.8.4.1: the key in the app font, 13 / 700; it wraps between
                its groups of four. */}
            <code className="flex-1 min-w-0 rounded-xl bg-cream-soft px-3.5 py-3.5 font-sans text-[13px] font-bold text-charcoal break-words">
              {grouped(enrollment.secret)}
            </code>
            <button
              type="button"
              onClick={() => void copySecret()}
              aria-label="Copy setup key"
              // MO1.8.4.1: a 48 × 48 primary.tint tile, Copy in #7D67D9 (measured).
              className="tap w-12 h-12 rounded-xl bg-th-f0edf9 dark:bg-primary-pale text-primary-accent flex items-center justify-center shrink-0"
            >
              {copied ? <Check size={18} strokeWidth={1.75} /> : <Copy size={18} strokeWidth={1.75} />}
            </button>
          </div>

          <p className="mt-6 text-xs leading-[18px] font-bold text-primary-accent uppercase tracking-wide">
            Step 2 of 2: Enter the 6-digit code from your app
          </p>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void singleFlight(verify);
            }}
            className="mt-2.5"
          >
            {/* MO1.8.4.1 measured: the six boxes fill the 342 column, 52 wide
                with 6 between (the Foundations 48 / 8 elsewhere). */}
            <CodeBoxes
              className="!gap-1.5 [&>input]:flex-1"
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
              <p role="alert" className="mt-3 text-center text-[12px] font-semibold text-status-high">
                {error}
              </p>
            )}
          </form>

          <PinnedCta
            primary={{
              label: "Verify",
              loading: busy,
              disabled: code.length !== CODE_LENGTH,
              onClick: () => void singleFlight(verify),
            }}
          />
        </>
      )}
      </SettingsBody>
    </div>
  );
}
