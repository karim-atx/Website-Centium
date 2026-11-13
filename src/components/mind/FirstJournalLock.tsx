import { useEffect, useRef, useState } from "react";
import { Fingerprint, Lock } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { CtaButton } from "../ui/PinnedCta";
import { JournalPasswordPopup, PasswordField } from "./JournalLock";
import { useApp } from "../../context/AppContext";
import { useDeviceUnlock, announceDeviceUnlockChanged } from "../../hooks/useDeviceUnlock";
import { biometrics } from "../../platform/biometrics";
import { verifyFolderLockSecret, type FolderLockAuth } from "../../services/journal";
import { registerThisPhone } from "../../services/journal/deviceUnlock";
import { signFailure, turnOnLabel } from "../../services/journal/deviceUnlockModel";
import {
  confirmProblem,
  confirmProblemLine,
  deviceStepLine,
  deviceUseLabel,
  explainLines,
  markFirstLockSeen,
  nextFirstLockStep,
  offerDeviceStep,
  type FirstLockStep,
} from "../../services/journal/firstLockModel";
import type { UnlockMethod } from "../../services/journal/lockLogic";
import { t, tk } from "../../i18n/core";

// Batch D GD: the FIRST time a person locks a journal folder, three steps in
// the Foundations centred popup (the same card as the unlock prompt), in place
// of the old silent lock. Later locks stay as they were: no prompt.
//
// 1. Protect: the ACCOUNT password twice (there is no separate journal
//    password), checked by the server before the folder locks
//    (verifyFolderLockSecret), or the emailed code for an account without a
//    password, through the unlock prompt's own code flow.
// 2. Explain: how the folder opens again, as the code really behaves.
// 3. This phone's fingerprint or face, only in the app on a phone that can
//    set it up and hasn't; "Not now" finishes. Set-up is Settings › Privacy's
//    own (createKey, then register_device_key), with the password just typed
//    as the re-authentication so it isn't asked for a third time. That
//    password is held in a ref for this sheet only and dropped when it closes.

export function FirstJournalLock({
  folder,
  auth,
  onMethodChange,
  onClose,
}: {
  folder: { id: string; name: string };
  auth: FolderLockAuth;
  /** ATXB2: the account has a password after all; the Journal's later unlocks use it too. */
  onMethodChange: (method: UnlockMethod) => void;
  /** Closes the sheet: cancelled before the lock, or finished after it. */
  onClose: () => void;
}) {
  const { authUserId, lockJournalFolder } = useApp();
  const device = useDeviceUnlock();
  const [step, setStep] = useState<FirstLockStep>("protect");
  const [method, setMethod] = useState<UnlockMethod>(auth.method);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const password = useRef<string | null>(null);
  useEffect(
    () => () => {
      password.current = null;
    },
    []
  );

  const offerDevice = offerDeviceStep(device.status);
  const advance = () => {
    const next = nextFirstLockStep(step, offerDevice);
    if (next === "done") onClose();
    else setStep(next);
  };

  // Step 1's submit: the server checks the secret first; only then the lock.
  const verifyThenLock = async (secret: string): Promise<string | null> => {
    const checked = await verifyFolderLockSecret(folder.id, secret, method);
    if (!checked.ok) {
      if (checked.code === "ATXB2") {
        setNotice(checked.message);
        setMethod("password");
        onMethodChange("password");
        return null;
      }
      return checked.message;
    }
    const failed = await lockJournalFolder(folder.id);
    if (failed) return failed;
    markFirstLockSeen(globalThis.localStorage, authUserId);
    if (method === "password") password.current = secret;
    setStep("explain");
    return null;
  };

  if (step === "protect") {
    if (method === "code")
      return (
        <JournalPasswordPopup
          purpose="unlock"
          folderName={folder.name}
          method="code"
          email={auth.email}
          copy={{
            title: t("Protect with an emailed code"),
            body: t("You sign in without a password, so locked folders open with a code we email you. Confirm it's you to lock {folder}.", {
              folder: folder.name,
            }),
            cta: t("Lock folder"),
          }}
          onClose={onClose}
          onSubmit={verifyThenLock}
        />
      );
    return <ProtectWithPassword folderName={folder.name} notice={notice} onClose={onClose} onSubmit={verifyThenLock} />;
  }

  if (step === "explain")
    return (
      <CentredPopup
        open
        onClose={onClose}
        icon={<Lock size={22} strokeWidth={1.75} />}
        title={t("{folder} is locked", { folder: folder.name })}
        cta={{ label: offerDevice ? t("Next") : t("Done"), onClick: advance }}
      >
        <ul className="space-y-2">
          {explainLines(method).map((line) => (
            <li key={line} className="flex gap-2 text-[13px] leading-[18px] font-medium text-charcoal-soft">
              <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-charcoal-faint" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </CentredPopup>
    );

  return <SetUpThisPhone kind={device.kind} method={method} email={auth.email} password={password} onDone={onClose} />;
}

/** Step 1 for an account with a password: the two fields, then the server's check. */
function ProtectWithPassword({
  folderName,
  notice,
  onClose,
  onSubmit,
}: {
  folderName: string;
  notice?: string;
  onClose: () => void;
  onSubmit: (password: string) => Promise<string | null>;
}) {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  // A server sentence or a local problem, shown under the fields.
  const [error, setError] = useState<string | null>(notice ?? null);
  const [mismatch, setMismatch] = useState(false);
  const [busy, setBusy] = useState(false);
  const firstRef = useRef<HTMLInputElement | null>(null);
  const secondRef = useRef<HTMLInputElement | null>(null);

  // The caret goes in the first field (the popup focuses its card first).
  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const submit = async () => {
    if (busy) return;
    const problem = confirmProblem(first, second);
    if (problem) {
      setError(confirmProblemLine(problem));
      setMismatch(problem !== "empty");
      (problem === "empty" ? firstRef : secondRef).current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    setMismatch(false);
    const failed = await onSubmit(first);
    setBusy(false);
    if (failed) {
      // Cleared for the next try, as the unlock prompt does.
      setError(failed);
      setFirst("");
      setSecond("");
      firstRef.current?.focus();
    }
  };

  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    if (error) setError(null);
    if (mismatch) setMismatch(false);
  };

  return (
    <CentredPopup
      open
      onClose={busy ? () => {} : onClose}
      icon={<Lock size={22} strokeWidth={1.75} />}
      title={t("Protect with your password")}
      body={t("Locked folders open with your account password. Enter it twice to lock {folder}.", { folder: folderName })}
      cta={{ label: t("Lock folder"), onClick: () => void submit(), loading: busy }}
    >
      <PasswordField inputRef={firstRef} value={first} onChange={edit(setFirst)} onEnter={() => secondRef.current?.focus()} invalid={!!error && !mismatch} />
      <div className="mt-2.5">
        <PasswordField
          inputRef={secondRef}
          label={tk("Confirm password")}
          value={second}
          onChange={edit(setSecond)}
          onEnter={() => void submit()}
          invalid={!!error}
        />
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-[11.5px] leading-4 font-medium text-status-high">
          {t(error)}
        </p>
      )}
    </CentredPopup>
  );
}

/**
 * Step 3: Settings › Privacy's turn-on (UnlockPhones), offered once here. The
 * phone makes its key (one fingerprint or face sheet), then register_device_key
 * takes it with the password from step 1. An account without a password has
 * no secret to reuse (the emailed code is spent), so a stale session (ATXB1)
 * asks for a fresh code in the unlock prompt's code flow, as Settings does.
 */
function SetUpThisPhone({
  kind,
  method,
  email,
  password,
  onDone,
}: {
  kind: ReturnType<typeof useDeviceUnlock>["kind"];
  method: UnlockMethod;
  email: string;
  password: { current: string | null };
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const finished = () => {
    announceDeviceUnlockChanged();
    onDone();
  };

  const setUp = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const made = await biometrics.createKey({ title: turnOnLabel(kind), cancel: t("Cancel") });
    if ("error" in made) {
      setBusy(false);
      const failure = signFailure(made.error);
      if (failure.line) setError(failure.line);
      return;
    }
    const result = await registerThisPhone(made.publicKey, password.current ? { password: password.current } : undefined);
    setBusy(false);
    if (result.ok) return finished();
    if (result.reauth) return setPendingKey(made.publicKey);
    setError(result.line);
  };

  if (pendingKey)
    return (
      <JournalPasswordPopup
        purpose="unlock"
        folderName=""
        method={method}
        email={email}
        copy={{
          title: t("Confirm it's you"),
          body: t("Confirm it's you to let this phone unlock your locked folders."),
          cta: t("Add this phone"),
        }}
        onClose={onDone}
        onSubmit={async (secret) => {
          const result = await registerThisPhone(pendingKey, method === "code" ? { code: secret } : { password: secret });
          if (result.ok) {
            finished();
            return null;
          }
          return result.line;
        }}
      />
    );

  return (
    <CentredPopup
      open
      onClose={busy ? () => {} : onDone}
      icon={<Fingerprint size={22} strokeWidth={1.75} />}
      title={turnOnLabel(kind)}
      body={deviceStepLine(kind, method)}
    >
      <div aria-live="polite">
        {error && <p className="-mt-1 mb-3 text-[11.5px] leading-4 font-medium text-status-high">{error}</p>}
      </div>
      {/* Two buttons, so the card carries them itself rather than its single cta. */}
      <CtaButton size="page" label={deviceUseLabel(kind)} onClick={() => void setUp()} loading={busy} className="mt-1" />
      <CtaButton size="page" variant="secondary" label={t("Not now")} onClick={onDone} disabled={busy} className="mt-2" />
    </CentredPopup>
  );
}
