import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { PageHeader } from "../ui/PageHeader";
import { PinnedCta } from "../ui/PinnedCta";
import { SettingsBody } from "../ui/SettingsRows";
import { RECOVERY_CODES_FILENAME, recoveryCodesClipboard, recoveryCodesFile } from "./recoveryCodesText";

// MO1.8.4.2 Recovery codes: the step after Verify on MO1.8.4.1, and what
// View codes opens on the Recovery codes widget. Measured from the 2x frame:
// - a 52 pt #E4F0EE tile (radius 16) with Check 24 / 2.4 #2F5F58, centred;
//   10 under it "Two-factor is on" 20 / 800, 10 under that the body
//   14 / 400 #5B5349, centred (the block is 77 to 221; the board wraps the
//   title onto the body, an artefact);
// - 17 under, the code card: #F0EDF9, radius 16, padding 14, two columns
//   12 apart, rows 10 apart, codes 14 / 700 centred in their column with
//   wide letter-spacing (measured about 0.12 em; the handover gives no value);
// - 12 under, Copy all and Download: 44 tall, 8 apart, white with a 1 px
//   #AEA1DC border, radius 12, 13.5 / 700 #7D67D9;
// - the pinned "I've saved them".
// All new since the redesign, so the handover's own light colours.
//
// NOTHING HERE MAKES OR STORES CODES. The host passes the plaintext codes
// the backend returns (once, at generation) and decides what "I've saved
// them" does.
//
// MASKED (View codes on MO1.8.4.3): the backend keeps only hashes, so a sheet
// can never be shown twice. View codes opens this page with the codes masked
// (••••-••••), the count left, and Generate new as the pinned action: the
// resolution the API doc gives for the frame's View codes.

export const RecoveryCodesView: React.FC<{
  codes: readonly string[];
  onSaved: () => void;
  /** View codes: the sheet can't be shown again; masked rows and Generate new. */
  masked?: { left: number; total: number; onGenerate: () => void; generating?: boolean; error?: string | null };
  /** Back chevron (MO1.8.4); defaults to history back. */
  onBack?: () => void;
}> = ({ codes, onSaved, onBack, masked }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodesClipboard(codes));
      setCopied(true);
    } catch {
      // The codes are on screen and selectable either way.
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([recoveryCodesFile(codes)], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = RECOVERY_CODES_FILENAME;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const action =
    "tap h-11 flex-1 min-w-0 rounded-xl border border-th-aea1dc dark:border-primary/40 bg-cream-card text-[13.5px] font-bold text-primary-accent";

  return (
    <div className="pb-[172px]">
      <PageHeader title="Recovery codes" showBack onBack={onBack} sub tightBack />

      <SettingsBody className="-mt-1">
        <div className="flex flex-col items-center text-center">
          <span
            aria-hidden
            className="w-[52px] h-[52px] rounded-2xl bg-th-e4f0ee dark:bg-teal-pale text-th-2f5f58 dark:text-teal-deep-text flex items-center justify-center"
          >
            <Check size={24} strokeWidth={2.4} />
          </span>
          <h2 className="mt-2.5 text-[20px] font-extrabold leading-[1.5] text-charcoal">Two-factor is on</h2>
          <p className="mt-2.5 text-[14px] leading-[1.5] text-charcoal-soft">
            {masked
              ? `${masked.left} of ${masked.total} codes left. Codes are only shown once, when they're made; generate new ones if you've lost them.`
              : "Save these codes. Each one signs you in once if you lose your phone."}
          </p>
        </div>

        <ul
          aria-label="Your recovery codes"
          className="mt-[17px] grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-2xl bg-th-f0edf9 dark:bg-primary-pale p-3.5"
        >
          {masked
            ? Array.from({ length: masked.total }, (_, i) => (
                <li key={i} aria-label="Hidden code" className="text-center text-[14px] leading-[21px] font-bold tracking-[0.12em] text-charcoal-faint">
                  ••••-••••
                </li>
              ))
            : codes.map((code) => (
                <li key={code} className="text-center text-[14px] leading-[21px] font-bold tracking-[0.12em] text-charcoal select-all">
                  {code}
                </li>
              ))}
        </ul>

        {masked?.error && (
          <p role="alert" className="mt-3 text-center text-[12px] font-semibold text-status-high">
            {masked.error}
          </p>
        )}

        {!masked && (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => void copyAll()} className={action}>
            {copied ? "Copied" : "Copy all"}
          </button>
          <button type="button" onClick={download} className={action}>
            Download
          </button>
        </div>
        )}
      </SettingsBody>

      <PinnedCta
        primary={
          masked
            ? { label: "Generate new", onClick: masked.onGenerate, loading: masked.generating }
            : { label: "I’ve saved them", onClick: onSaved }
        }
      />
    </div>
  );
};
