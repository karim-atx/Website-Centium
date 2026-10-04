import { fv } from "../../forum/forumColor";
import type { StatusLook } from "../../../services/courses/author";

// Pieces shared by the builder screens (design screen 9), through the
// --forum-* variables so every one of them has a dark value already.

/** The status pill: Draft, In review, Published, Changes requested. */
export function StatusPill({ look }: { look: StatusLook }) {
  const tone =
    look.tone === "live"
      ? { bg: fv("teal-bg"), ink: fv("teal-ink") }
      : look.tone === "attention"
      ? { bg: fv("amber-bg"), ink: fv("amber-ink") }
      : look.tone === "waiting"
      ? { bg: fv("rules-bg"), ink: fv("rules-ink") }
      : { bg: fv("track"), ink: fv("muted") };
  return (
    <span className="text-[11px] font-extrabold rounded-full px-[9px] py-1 shrink-0" style={{ background: tone.bg, color: tone.ink }}>
      {look.label}
    </span>
  );
}

/**
 * What the reviewer wrote, when they sent it back.
 *
 * ALWAYS SHOWN IN FULL. This is the only place an author learns why, it is
 * written for them personally, and truncating it would mean re-submitting
 * without knowing what to change.
 */
export function ReviewReason({ reason }: { reason: string }) {
  return (
    <div className="rounded-2xl p-[14px] flex flex-col gap-1.5" style={{ background: fv("amber-bg"), color: fv("amber-ink") }}>
      <span className="text-[13px] font-extrabold">What we'd like changed</span>
      <p className="text-[13px] leading-[1.55] whitespace-pre-wrap [overflow-wrap:anywhere]">{reason}</p>
    </div>
  );
}

export function AuthorCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-[14px] flex flex-col gap-2.5 ${className}`}
      style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}
    >
      {children}
    </div>
  );
}

export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-[13px] font-extrabold">{children}</span>
      {hint && (
        <span className="text-xs leading-[1.45]" style={{ color: fv("muted") }}>
          {hint}
        </span>
      )}
    </span>
  );
}

const fieldStyle = { background: fv("card"), border: `1px solid ${fv("border")}`, color: fv("text") } as const;

export function TextField({
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
  label,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  label: string;
  inputMode?: "numeric" | "decimal" | "url";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      aria-label={label}
      inputMode={inputMode}
      className="h-11 rounded-[14px] px-3 text-sm outline-none w-full disabled:opacity-60"
      style={fieldStyle}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
  label,
  rows = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  label: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      aria-label={label}
      rows={rows}
      className="rounded-[14px] px-3 py-2.5 text-sm outline-none w-full resize-y disabled:opacity-60"
      style={fieldStyle}
    />
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="tap h-11 rounded-[14px] px-4 text-sm font-extrabold disabled:opacity-50 w-full"
      style={{ background: fv("accent"), color: fv("on-accent") }}
    >
      {children}
    </button>
  );
}

export function QuietButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="tap h-10 rounded-[12px] px-3 text-[13px] font-bold disabled:opacity-50"
      style={{
        background: fv("card"),
        border: `1px solid ${fv("border")}`,
        color: danger ? fv("danger") : fv("text"),
      }}
    >
      {children}
    </button>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-xs font-semibold rounded-xl px-3 py-2" style={{ background: fv("amber-bg"), color: fv("danger") }}>
      {children}
    </p>
  );
}

/** A one-line note that is advice rather than a failure. */
export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs leading-[1.5]" style={{ color: fv("muted") }}>
      {children}
    </p>
  );
}

export function LessonKindIcon({ kind }: { kind: string }) {
  const stroke = fv("muted");
  const common = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (kind === "video") {
    return (
      <svg {...common}>
        <rect x="2" y="5" width="14" height="14" rx="3" />
        <path d="M16 10l6-3v10l-6-3z" />
      </svg>
    );
  }
  if (kind === "reading") {
    return (
      <svg {...common}>
        <path d="M4 5h7a2 2 0 012 2v12a2 2 0 00-2-2H4z" />
        <path d="M20 5h-7a2 2 0 00-2 2v12a2 2 0 012-2h7z" />
      </svg>
    );
  }
  if (kind === "pdf") {
    return (
      <svg {...common}>
        <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
        <path d="M14 3v5h5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 113.2 2.4c-.6.2-.7.6-.7 1.1v.5" />
      <path d="M12 17h.01" />
    </svg>
  );
}
