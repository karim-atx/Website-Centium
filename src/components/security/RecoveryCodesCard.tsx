import clsx from "clsx";
import { KeyRound } from "lucide-react";

/** What the recovery-codes backend reports: unused codes and the set's size. */
export interface RecoveryCodesStatus {
  left: number;
  total: number;
}

// MO1.8.4 / MO1.8.4.3 Recovery codes widget (Foundations 2.5 Widgets, the
// secondary-tinted one under the Authenticator app card). Measured from the
// 2x frames: 342 wide, radius 20, padding 16; header 10.5 / 700 #2F5F58;
// a 40 pt #E4F0EE tile with KeyRound 19 / 1.75 #2F5F58, 12 to the text
// column; "Recovery codes" 16 / 800; "8 of 10 codes left" 13.5 / 700; a
// 4 pt bar (white track, #6F9993 fill) 6 under it; two masked code chips
// (white, radius 8, 28 tall, 12 / 700, 6 apart) 10 under that; "View codes"
// and "Generate new" (white, 1 px #6F9993, #2F5F58 text, 8 apart) 10 under
// those. The board wraps the chips' and buttons' labels onto two lines in
// fixed boxes: an artefact, not copied (as with Change app).
//
// Off (MO1.8.4): the neutral #F5F5F6 card, everything at 40% with dashes,
// the buttons disabled, and "Turn on two-factor to use this." at full
// strength 10 under the buttons. Colour fade 300 ms, none with Reduce motion.
//
// THE COUNT COMES FROM THE BACKEND (stage 1, two_factor_recovery_status).
// While it's loading or unreadable `status` is null and the card draws the
// off look with a line saying so (and the support route), never a made-up
// count. An account that turned two-factor on before codes existed has a
// 0 / 0 status: "No codes yet", with Generate new. All elements are new since the redesign, so the
// handover's own light colours (decision 22); dark uses the teal tokens.

export const RecoveryCodesCard: React.FC<{
  /** Two-factor is on. */
  enabled: boolean;
  /** Codes left, or null while loading or when it couldn't be read. */
  status: RecoveryCodesStatus | null;
  /** MO1.8.4.2 (opened by View codes). */
  onViewCodes?: () => void;
  /** Generate a new set (the board leaves its destination open). */
  onGenerateNew?: () => void;
  className?: string;
}> = ({ enabled, status, onViewCodes, onGenerateNew, className }) => {
  const active = enabled && status !== null;
  const fade = "transition duration-300 motion-reduce:transition-none";
  const share = active && status.total > 0 ? Math.max(0, Math.min(1, status.left / status.total)) : 0;
  const chip = active ? "••••-••••" : "––––-––––";

  return (
    <section
      aria-label="Recovery codes"
      className={clsx(
        "rounded-[20px] p-4",
        fade,
        active ? "bg-th-6f9993/[0.12] dark:bg-teal-pale" : "bg-cream-soft",
        className
      )}
    >
      <p
        className={clsx(
          "text-[10.5px] font-bold uppercase tracking-wide",
          fade,
          active ? "text-th-2f5f58 dark:text-teal-deep-text" : "text-charcoal-faint opacity-40"
        )}
      >
        Recovery codes
      </p>
      <div className={clsx("mt-2.5 flex gap-3", fade, !active && "opacity-40")}>
        <span
          aria-hidden
          className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            fade,
            active ? "bg-th-e4f0ee dark:bg-teal/10" : "bg-charcoal/5"
          )}
        >
          <KeyRound
            size={19}
            strokeWidth={1.75}
            className={active ? "text-th-2f5f58 dark:text-teal-deep-text" : "text-charcoal-faint"}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-extrabold text-charcoal">Recovery codes</p>
          <p className="mt-1 text-[13.5px] font-bold text-charcoal">
            {active ? (status.total > 0 ? `${status.left} of ${status.total} codes left` : "No codes yet") : "–– codes left"}
          </p>
          <div aria-hidden className={clsx("mt-1.5 h-1 rounded-full overflow-hidden", active ? "bg-cream-card" : "bg-charcoal/10")}>
            <div className="h-full rounded-full bg-th-6f9993 dark:bg-teal-dark" style={{ width: `${share * 100}%` }} />
          </div>
          {/* Decorative: the codes themselves are only ever shown on MO1.8.4.2. */}
          <div aria-hidden className="mt-2.5 flex flex-wrap gap-1.5">
            {[0, 1].map((i) => (
              <span
                key={i}
                className="h-7 px-3 inline-flex items-center rounded-lg bg-cream-card text-[12px] font-bold text-charcoal whitespace-nowrap"
              >
                {chip}
              </span>
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {(
              [
                ["View codes", onViewCodes],
                ["Generate new", onGenerateNew],
              ] as const
            ).map(([label, onClick]) =>
              active && onClick ? (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="tap h-9 px-4 rounded-xl border border-th-6f9993 dark:border-teal-dark bg-cream-card text-[13px] font-semibold text-th-2f5f58 dark:text-teal-deep-text"
                >
                  {label}
                </button>
              ) : (
                // Not tappable (Foundations: off widgets' buttons are disabled).
                <span
                  key={label}
                  aria-disabled="true"
                  className={clsx(
                    "inline-flex h-9 px-4 items-center rounded-xl border bg-cream-card text-[13px] font-semibold",
                    active ? "border-th-6f9993 text-th-2f5f58 opacity-40" : "border-charcoal/10 text-charcoal-faint"
                  )}
                >
                  {label}
                </span>
              )
            )}
          </div>
        </div>
      </div>
      {!enabled ? (
        <p className="mt-2.5 text-[12px] text-charcoal-faint">Turn on two-factor to use this.</p>
      ) : (
        !active && (
          // The count couldn't be read: say so, with the support route.
          <p className="mt-2.5 text-[12px] text-charcoal-faint">
            Couldn't read your recovery codes. If you lose your phone, contact support.
          </p>
        )
      )}
    </section>
  );
};
