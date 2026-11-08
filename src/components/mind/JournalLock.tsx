import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Fingerprint, KeyRound, Lock } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { CodeBoxes } from "../ui/CodeBoxes";
import { usePasswordVisibility } from "../../hooks/usePasswordVisibility";
import { useCooldown } from "../security/useCooldown";
import { formatCountdown } from "../../services/auth/cooldown";
import { sendFolderUnlockCode } from "../../services/journal";
import type { UnlockMethod } from "../../services/journal/lockLogic";
import type { DeviceFailure } from "../../services/journal/deviceUnlockModel";
import { t, tk } from "../../i18n/core";

// MO1.1.2.2 · Journal · Locked folder, and the password prompt that stands in
// for its Face ID on the web (backend stage 3, Database docs/HANDOVER_API.md:
// "re-enter the account password, checked server-side, opening a short
// unlock window").

// MO1.1.2.2 (2x frame, measured): the blurred previews' bars, one per card,
// as long as the frame's blurred date and title. They are PLACEHOLDERS, never
// the folder's entries: while the folder is locked the server returns none,
// and nothing written by the user is ever drawn under the blur.
const PREVIEWS = [
  { date: 70, title: 195 },
  { date: 66, title: 170 },
  { date: 72, title: 120 },
  { date: 66, title: 184 },
  { date: 64, title: 254 },
];

/**
 * The locked list (MO1.1.2.2 #4–9). Five cards 358 × 79, radius 24, 10
 * apart, with no rule (the open list's cards are 94 with one); each holds a
 * blurred date and title. Over them, 96 below the list's top and centred, a
 * white card 224 × 150 (border 1, padding 20 × 23, radius 20, shadow.menu):
 * Lock 30/2.25 in primary.deep, "This folder is locked" 14/600 on a 20 line
 * 12 below it, and 8 below that the unlock button, 176 × 38, radius 12,
 * #A198DF with 13/700 white.
 *
 * WEB: the frame's "Unlock with Face ID" with ScanFace is native-only; the
 * API doc says to relabel it "Unlock", and KeyRound 15/1.75 takes ScanFace's
 * place (8 before the label, the pair centred), since the button now asks
 * for a password.
 */
export function LockedFolderView({ folderName, onUnlock }: { folderName: string; onUnlock: () => void }) {
  return (
    <div className="relative">
      <div aria-hidden className="space-y-2.5">
        {PREVIEWS.map((p, i) => (
          <div
            key={i}
            className="h-[79px] rounded-3xl bg-cream-card border border-charcoal/[0.11] dark:border-charcoal/[0.08] px-5 pt-5 overflow-hidden"
          >
            <div className="h-4 flex items-center">
              <div className="h-[9px] rounded-full bg-charcoal-faint/[0.35] blur-[4px]" style={{ width: p.date }} />
            </div>
            <div className="mt-0.5 h-5 flex items-center">
              <div className="h-[11px] rounded-full bg-charcoal/[0.28] blur-[4px] max-w-full" style={{ width: p.title }} />
            </div>
          </div>
        ))}
      </div>
      <div
        className="absolute top-[96px] left-1/2 -translate-x-1/2 w-[224px] rounded-[20px] bg-cream-card border border-charcoal/[0.08] px-[23px] py-5 flex flex-col items-center"
        style={{ boxShadow: "0 12px 32px rgb(var(--th-5f5093) / 0.18)" }}
      >
        <Lock size={30} strokeWidth={2.25} aria-hidden className="text-th-7d6bb5 dark:text-primary-deep-text" />
        <p className="mt-3 text-[14px] leading-5 font-semibold text-charcoal whitespace-nowrap">{t("This folder is locked")}</p>
        <button
          type="button"
          onClick={onUnlock}
          aria-label={t("Unlock {folder}", { folder: folderName })}
          className="tap mt-2 w-full h-[38px] rounded-xl inline-flex items-center justify-center gap-2 bg-[rgb(var(--c-fill-cta))] text-on-primary-fill text-[13px] font-bold active:brightness-[0.92]"
        >
          <KeyRound size={15} strokeWidth={1.75} aria-hidden />
          {t("Unlock")}
        </button>
      </div>
    </div>
  );
}

/** Why the password is being asked for. "write" and "delete" open the folder
 *  (a window) first, because a locked folder's entries can't be written or
 *  counted until it is. */
export type PasswordPurpose = "unlock" | "remove" | "delete" | "write";

const COPY: Record<PasswordPurpose, { title: string; body: (name: string) => string; cta: string }> = {
  unlock: { title: tk("Enter your password"), body: (n) => t("{folder} stays open for five minutes.", { folder: n }), cta: tk("Unlock") },
  write: { title: tk("Enter your password"), body: (n) => t("{folder} is locked. Unlock it for five minutes to save here.", { folder: n }), cta: tk("Unlock") },
  delete: { title: tk("Enter your password"), body: (n) => t("{folder} is locked. Unlock it to delete the folder.", { folder: n }), cta: tk("Unlock") },
  remove: { title: tk("Remove the lock?"), body: (n) => t("Enter your password and {folder} stops locking.", { folder: n }), cta: tk("Remove lock") },
};

/**
 * Not drawn: the web's stand-in for Face ID, built from Foundations' Centred
 * popup (Lock in its 48 primary.tint tile, title 18/800, body 13/500, a 48
 * CTA) holding one Foundations › Inputs field (44, r12, surface.soft, 14/600,
 * focused border primary.accent, error border and line in danger). The copy
 * is UNSPECIFIED in the handover. A wrong password is the server's own
 * sentence ("That password is not correct."), and a rate limit's message
 * names the wait; both show under the field, which keeps what was typed
 * cleared for the next try.
 */
export function JournalPasswordPopup({
  purpose,
  folderName,
  onClose,
  onSubmit,
  method = "password",
  email = "",
  notice,
  device,
  copy,
}: {
  purpose: PasswordPurpose;
  folderName: string;
  onClose: () => void;
  /** Resolves to null when the password (or code) was accepted, or the sentence to show. */
  onSubmit: (secret: string) => Promise<string | null>;
  /** Round K (DB-Z8): an account without a password opens the lock with an emailed code. */
  method?: UnlockMethod;
  /** Where the code goes. */
  email?: string;
  /** A line shown on open, e.g. why the prompt switched to the password. */
  notice?: string;
  /** Round K: this phone's fingerprint or face, offered first (the app only). */
  device?: DeviceUnlockOption;
  /** Other words for the same check (Settings asks it before adding this phone). */
  copy?: PromptCopy;
}) {
  if (method === "code")
    return <JournalCodePopup purpose={purpose} folderName={folderName} email={email} onClose={onClose} onSubmit={onSubmit} device={device} copy={copy} />;
  return <PasswordPopup purpose={purpose} folderName={folderName} onClose={onClose} onSubmit={onSubmit} notice={notice} device={device} copy={copy} />;
}

/** The prompt's title, line and button, when it isn't for a folder. */
export interface PromptCopy {
  title: string;
  body: string;
  cta: string;
}

/** Round K (DB-Z8): "Unlock with fingerprint", above the password or the code. */
export interface DeviceUnlockOption {
  label: string;
  /** Null once the folder is open (the caller closes the prompt), or what went wrong. */
  onUse: () => Promise<DeviceFailure | null>;
  /** Settings › Privacy, to set this phone up (again). */
  onSetup: () => void;
}

/**
 * The fingerprint or face button, first in the prompt (Round K). The phone's
 * own sheet asks for the finger; a refusal leaves the password or the code
 * below as the way in: cancelling says nothing, a lock-out or a failure says
 * so, and a key the phone lost (a fingerprint was added) offers set-up again.
 */
function DeviceUnlockButton({ option, disabled }: { option: DeviceUnlockOption; disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<DeviceFailure | null>(null);
  const use = async () => {
    if (busy || disabled) return;
    setBusy(true);
    setFailure(null);
    const result = await option.onUse();
    setBusy(false);
    if (result) setFailure(result);
  };
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => void use()}
        disabled={busy || disabled}
        aria-busy={busy || undefined}
        className="tap w-full h-11 rounded-xl inline-flex items-center justify-center gap-2 border border-primary-accent/40 bg-cream-soft text-sm font-bold text-th-7d6bb5 dark:text-primary-deep-text disabled:opacity-50"
      >
        <Fingerprint size={18} strokeWidth={1.75} aria-hidden />
        {option.label}
      </button>
      <div aria-live="polite">
        {failure?.line && (
          <p className="mt-1.5 text-[11.5px] leading-4 font-medium text-status-high">
            {failure.line}
            {failure.setup && (
              <>
                {" "}
                <button type="button" onClick={option.onSetup} className="tap underline font-semibold">
                  {t("Set up again")}
                </button>
              </>
            )}
          </p>
        )}
      </div>
      <p className="mt-3 text-center text-[11.5px] leading-4 font-medium text-charcoal-faint">{t("Or")}</p>
    </div>
  );
}

function PasswordPopup({
  purpose,
  folderName,
  onClose,
  onSubmit,
  notice,
  device,
  copy: custom,
}: {
  purpose: PasswordPurpose;
  folderName: string;
  onClose: () => void;
  onSubmit: (password: string) => Promise<string | null>;
  notice?: string;
  device?: DeviceUnlockOption;
  copy?: PromptCopy;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(notice ?? null);
  const [busy, setBusy] = useState(false);
  const visibility = usePasswordVisibility();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // The caller mounts this only while asking, so every ask starts empty and
  // hidden. The caret goes in the field: the popup focuses its own card on
  // open, and this runs after that, as its parent.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async () => {
    if (busy) return;
    if (!password) {
      setError(t("Enter your password."));
      return;
    }
    setBusy(true);
    setError(null);
    const failed = await onSubmit(password);
    setBusy(false);
    if (failed) {
      setError(failed);
      setPassword("");
    }
  };

  const copy = COPY[purpose];
  return (
    <CentredPopup
      open
      onClose={busy ? () => {} : onClose}
      icon={<Lock size={22} strokeWidth={1.75} />}
      title={custom ? custom.title : t(copy.title)}
      body={custom ? custom.body : copy.body(folderName)}
      cta={{ label: custom ? custom.cta : t(copy.cta), onClick: () => void submit(), loading: busy }}
    >
      {device && <DeviceUnlockButton option={device} disabled={busy} />}
      <label className="block relative">
        <span className="sr-only">{t("Password")}</span>
        <input
          ref={inputRef}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          type={visibility.shown ? "text" : "password"}
          autoComplete="current-password"
          placeholder={t("Password")}
          aria-invalid={!!error || undefined}
          className={`w-full h-11 rounded-xl bg-cream-soft border border-charcoal/10 ps-3.5 pe-11 text-sm font-semibold text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary-accent focus:shadow-[0_0_0_0.5px_rgb(var(--c-primary-accent))] ${
            error ? "!border-status-high focus:!shadow-[0_0_0_0.5px_rgb(var(--c-status-high))]" : ""
          }`}
        />
        <button
          type="button"
          onClick={visibility.toggle}
          className="tap absolute end-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint"
          aria-label={visibility.shown ? t("Hide password") : t("Show password")}
        >
          {visibility.shown ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </label>
      {error && (
        <p role="alert" className="mt-1.5 text-[11.5px] leading-4 font-medium text-status-high">
          {t(error)}
        </p>
      )}
    </CentredPopup>
  );
}

const CODE_COPY: Record<PasswordPurpose, { body: (name: string) => string; cta: string }> = {
  unlock: { body: (n) => t("{folder} stays open for five minutes.", { folder: n }), cta: tk("Unlock") },
  write: { body: (n) => t("{folder} is locked. Unlock it for five minutes to save here.", { folder: n }), cta: tk("Unlock") },
  delete: { body: (n) => t("{folder} is locked. Unlock it to delete the folder.", { folder: n }), cta: tk("Unlock") },
  remove: { body: (n) => t("Enter the code we email you and {folder} stops locking.", { folder: n }), cta: tk("Remove lock") },
};

/**
 * Round K (DB-Z8, D-BK4): the same prompt for an account WITHOUT a password
 * (Google- or Apple-only). "Email me a code" sends the approved
 * reauthentication email ("{code} is your Centium verification code"); the
 * six boxes take it, and the server opens the same five-minute window, or
 * removes the lock. A code works for 10 minutes and once; a wrong or used one
 * is the server's own sentence ("That code is not correct."), shown under
 * the boxes, which clear for the next try. A refused send (the email limit)
 * starts the shared countdown before "Send a new code" works again.
 */
function JournalCodePopup({
  purpose,
  folderName,
  email,
  onClose,
  onSubmit,
  device,
  copy: custom,
}: {
  purpose: PasswordPurpose;
  folderName: string;
  email: string;
  onClose: () => void;
  onSubmit: (code: string) => Promise<string | null>;
  device?: DeviceUnlockOption;
  copy?: PromptCopy;
}) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cooldown = useCooldown();

  const send = async (again: boolean) => {
    if (busy || cooldown.active) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await sendFolderUnlockCode();
    setBusy(false);
    if (!res.ok) {
      if (res.rateLimited) cooldown.start();
      setError(res.message);
      return;
    }
    setSent(true);
    setCode("");
    if (again) setNotice(t("We sent a new code to {email}.", { email: shownEmail }));
  };

  const submit = async (value = code) => {
    if (busy || value.length !== 6) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const failed = await onSubmit(value);
    setBusy(false);
    if (failed) {
      setError(failed);
      setCode("");
    }
  };

  const copy = CODE_COPY[purpose];
  // The address reads left to right inside Arabic text (an isolate keeps it whole).
  const shownEmail = `⁦${email}⁩`;
  const waiting = cooldown.active ? t("Too many attempts. Try again in {time}.", { time: formatCountdown(cooldown.left) }) : null;
  return (
    <CentredPopup
      open
      onClose={busy ? () => {} : onClose}
      icon={<Lock size={22} strokeWidth={1.75} />}
      title={custom ? custom.title : purpose === "remove" ? t("Remove the lock?") : t("Confirm it's you")}
      body={custom ? custom.body : copy.body(folderName)}
      cta={
        sent
          ? { label: custom ? custom.cta : t(copy.cta), onClick: () => void submit(), loading: busy, disabled: code.length !== 6 }
          : { label: t("Email me a code"), onClick: () => void send(false), loading: busy, disabled: cooldown.active }
      }
    >
      {device && <DeviceUnlockButton option={device} disabled={busy} />}
      {!sent ? (
        <p className="text-[13px] leading-[18px] font-medium text-charcoal-soft">{t("We'll email a 6-digit code to {email}.", { email: shownEmail })}</p>
      ) : (
        <>
          <p className="mb-3 text-[13px] leading-[18px] font-medium text-charcoal-soft">{t("Enter the 6-digit code we emailed to {email}.", { email: shownEmail })}</p>
          <CodeBoxes
            value={code}
            onChange={(v) => {
              setCode(v);
              if (error) setError(null);
            }}
            onComplete={(v) => void submit(v)}
            error={!!error}
            disabled={busy}
            autoFocus
            label={t("Six-digit code from your email")}
          />
          <button
            type="button"
            onClick={() => void send(true)}
            disabled={busy || cooldown.active}
            className="tap mt-3 w-full text-center text-xs font-semibold text-charcoal-soft disabled:opacity-40"
          >
            {t("Send a new code")}
          </button>
        </>
      )}
      <div aria-live="polite">
        {notice && !error && !waiting && <p className="mt-1.5 text-center text-[11.5px] leading-4 font-medium text-charcoal-soft">{notice}</p>}
      </div>
      {(error || waiting) && (
        <p role="alert" className="mt-1.5 text-[11.5px] leading-4 font-medium text-status-high">
          {waiting ?? t(error ?? "")}
        </p>
      )}
    </CentredPopup>
  );
}
