import React, { useEffect, useRef } from "react";
import clsx from "clsx";

// Mobile v5.1 handover, Foundations 2.5 "Code boxes": six boxes 48 x 52, gap
// 8, radius 12, digits 20 / 800. The focused box takes a 1.5 px primary
// border; an error turns every border danger. Used wherever a 6-digit code is
// typed: the two-factor set-up, turning it off, the sign-in check, and the
// password reset and change steps.
//
// SIX REAL INPUTS, ONE VALUE. The parent holds the code as a string; each box
// shows one character of it. Typing moves on, Backspace on an empty box moves
// back, and a paste (or a password manager or the phone's one-time-code
// suggestion, which arrive as a multi-character input) fills from the first
// box. Only digits are kept, and spaces in a pasted "123 456" are dropped.
//
// THE FIRST BOX CARRIES autocomplete="one-time-code", which is where iOS and
// Android offer the code from a text message or a password manager.

export const CODE_LENGTH = 6;

export const CodeBoxes: React.FC<{
  value: string;
  onChange: (code: string) => void;
  /** Called once all six digits are in. */
  onComplete?: (code: string) => void;
  /** Danger borders on every box (a wrong code). */
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Read out for the group, e.g. "Six-digit authentication code". */
  label: string;
  className?: string;
}> = ({ value, onChange, onComplete, error, disabled, autoFocus, label, className }) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
  const empty = digits.length === 0;

  // Focus the first box when asked to: on mount, once the boxes are enabled,
  // and again when a wrong code is cleared (the parent empties the value).
  useEffect(() => {
    if (autoFocus && !disabled && empty) refs.current[0]?.focus();
  }, [autoFocus, disabled, empty]);

  const set = (next: string, focusAt?: number) => {
    const clean = next.replace(/\D/g, "").slice(0, CODE_LENGTH);
    onChange(clean);
    if (focusAt !== undefined) refs.current[Math.min(focusAt, CODE_LENGTH - 1)]?.focus();
    if (clean.length === CODE_LENGTH) onComplete?.(clean);
  };

  const onInput = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;
    // A multi-character input is a paste or an autofill: fill from box i.
    const next = (digits.slice(0, i) + typed).slice(0, CODE_LENGTH);
    set(next, next.length);
  };

  return (
    <div role="group" aria-label={label} className={clsx("flex justify-center gap-2", className)}>
      {Array.from({ length: CODE_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          data-code-box
          value={digits[i] ?? ""}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
          aria-invalid={error || undefined}
          // Wider than one character so a paste or an autofill arrives whole.
          maxLength={CODE_LENGTH}
          onChange={(e) => onInput(i, e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (!/\d/.test(text)) return;
            e.preventDefault();
            set(text, text.replace(/\D/g, "").length);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              if (digits[i]) set(digits.slice(0, i) + digits.slice(i + 1), i);
              else if (i > 0) set(digits.slice(0, i - 1) + digits.slice(i), i - 1);
            } else if (e.key === "ArrowLeft" && i > 0) {
              e.preventDefault();
              refs.current[i - 1]?.focus();
            } else if (e.key === "ArrowRight" && i < CODE_LENGTH - 1) {
              e.preventDefault();
              refs.current[i + 1]?.focus();
            }
          }}
          onFocus={(e) => {
            // Never start typing past a gap: jump to the first empty box.
            if (i > digits.length) refs.current[digits.length]?.focus();
            else e.target.select();
          }}
          className={clsx(
            "w-12 h-[52px] min-w-0 rounded-xl bg-cream-soft text-center text-[20px] font-extrabold text-charcoal tabular-nums",
            "border outline-none transition-colors disabled:opacity-40",
            error
              ? "border-status-high"
              : "border-charcoal/10 focus:border-[1.5px] focus:border-primary dark:border-[rgba(238,239,242,0.12)] dark:focus:border-primary"
          )}
        />
      ))}
    </div>
  );
};
