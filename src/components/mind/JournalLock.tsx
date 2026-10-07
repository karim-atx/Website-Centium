import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { usePasswordVisibility } from "../../hooks/usePasswordVisibility";

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
        <p className="mt-3 text-[14px] leading-5 font-semibold text-charcoal whitespace-nowrap">This folder is locked</p>
        <button
          type="button"
          onClick={onUnlock}
          aria-label={`Unlock ${folderName}`}
          className="tap mt-2 w-full h-[38px] rounded-xl inline-flex items-center justify-center gap-2 bg-[rgb(var(--c-fill-cta))] text-on-primary-fill text-[13px] font-bold active:brightness-[0.92]"
        >
          <KeyRound size={15} strokeWidth={1.75} aria-hidden />
          Unlock
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
  unlock: { title: "Enter your password", body: (n) => `${n} stays open for five minutes.`, cta: "Unlock" },
  write: { title: "Enter your password", body: (n) => `${n} is locked. Unlock it for five minutes to save here.`, cta: "Unlock" },
  delete: { title: "Enter your password", body: (n) => `${n} is locked. Unlock it to delete the folder.`, cta: "Unlock" },
  remove: { title: "Remove the lock?", body: (n) => `Enter your password and ${n} stops locking.`, cta: "Remove lock" },
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
}: {
  purpose: PasswordPurpose;
  folderName: string;
  onClose: () => void;
  /** Resolves to null when the password was accepted, or the sentence to show. */
  onSubmit: (password: string) => Promise<string | null>;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      setError("Enter your password.");
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
      title={copy.title}
      body={copy.body(folderName)}
      cta={{ label: copy.cta, onClick: () => void submit(), loading: busy }}
    >
      <label className="block relative">
        <span className="sr-only">Password</span>
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
          placeholder="Password"
          aria-invalid={!!error || undefined}
          className={`w-full h-11 rounded-xl bg-cream-soft border border-charcoal/10 pl-3.5 pr-11 text-sm font-semibold text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary-accent focus:shadow-[0_0_0_0.5px_rgb(var(--c-primary-accent))] ${
            error ? "!border-status-high focus:!shadow-[0_0_0_0.5px_rgb(var(--c-status-high))]" : ""
          }`}
        />
        <button
          type="button"
          onClick={visibility.toggle}
          className="tap absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint"
          aria-label={visibility.shown ? "Hide password" : "Show password"}
        >
          {visibility.shown ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </label>
      {error && (
        <p role="alert" className="mt-1.5 text-[11.5px] leading-4 font-medium text-status-high">
          {error}
        </p>
      )}
    </CentredPopup>
  );
}
