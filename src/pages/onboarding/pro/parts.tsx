// The professional lane's blocks that the shell's ObBlocks (shell/ObBlocks.tsx)
// does not carry: a dropdown-style field; the chip group
// with its label and "More"; ROWS with status pills; NUMS; LINK; UP; SUM; the
// profile preview. Built on the shell's classes (.ob-field, .ob-box, .ob-rows,
// .ob-chip-b) plus pro.css; each is the literal markup of one
// BizOnboardingV10.dc.html block.
import React, { forwardRef, useId, useRef } from "react";
import { Camera, Check, ChevronRight, Loader2, Minus, Plus, RotateCcw, Upload, type LucideIcon } from "lucide-react";
import "./pro.css";

// ---------------------------------------------------------------------------
// F: a field (label row, 52 tall box, help / count / error foot)
// ---------------------------------------------------------------------------

export interface FieldProps {
  label?: string;
  tag?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  help?: string | null;
  error?: string | null;
  count?: string;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: string;
  /** The whole box is a button (a dropdown-style field). */
  onPress?: (el: HTMLButtonElement) => void;
  id?: string;
  autoComplete?: string;
  ariaLabel?: string;
  min?: string;
  max?: string;
  onEnter?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  children?: React.ReactNode;
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  {
    label,
    tag,
    value,
    onChange,
    placeholder,
    leadingIcon: Lead,
    trailingIcon: Trail,
    help,
    error,
    count,
    maxLength,
    inputMode,
    type,
    onPress,
    id,
    autoComplete,
    ariaLabel,
    min,
    max,
    onEnter,
    onFocus,
    onBlur,
    children,
  },
  ref
) {
  const auto = useId();
  const fid = id ?? auto;
  const helpId = `${fid}-help`;
  const foot = error || help || count;
  const lead = Lead && (
    <span className="ob-box-ic" aria-hidden>
      <Lead size={16} />
    </span>
  );
  const trail = Trail && (
    <span className="ob-box-end" aria-hidden>
      <Trail size={16} strokeWidth={2} />
    </span>
  );
  return (
    <div className="ob-field" ref={ref}>
      {(label || tag) && (
        <div className="ob-field-head">
          <label htmlFor={fid} className="ob-label">
            {label}
          </label>
          {tag && <span className="ob-tag">{tag}</span>}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        {onPress ? (
          <button
            type="button"
            id={fid}
            onClick={(e) => onPress(e.currentTarget)}
            aria-label={ariaLabel ?? label}
            aria-describedby={foot ? helpId : undefined}
            aria-haspopup="menu"
            className="ob-box tap"
            data-icon={Lead ? "" : undefined}
            data-err={error ? "true" : undefined}
            style={{ flex: 3, minWidth: 0, width: "100%", textAlign: "start", color: value ? undefined : "var(--ob-faint)" }}
          >
            {lead}
            <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value || placeholder}</span>
            {trail}
          </button>
        ) : (
          <div className="ob-box" data-icon={Lead ? "" : undefined} data-err={error ? "true" : undefined} style={{ flex: 3, minWidth: 0 }}>
            {lead}
            <input
              id={fid}
              type={type ?? "text"}
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder={placeholder}
              maxLength={maxLength}
              inputMode={inputMode}
              autoComplete={autoComplete}
              min={min}
              max={max}
              aria-label={label ? undefined : ariaLabel}
              aria-invalid={!!error}
              aria-describedby={foot ? helpId : undefined}
              onFocus={onFocus}
              onBlur={onBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter" && onEnter) {
                  e.preventDefault();
                  onEnter();
                }
              }}
              style={{ height: 50 }}
            />
            {trail}
          </div>
        )}
      </div>
      {foot && (
        <div className="ob-help" data-err={error ? "true" : undefined}>
          <span id={helpId} role={error ? "alert" : undefined}>
            {error || help}
          </span>
          {count && <span className="ob-help-count">{count}</span>}
        </div>
      )}
      {children}
    </div>
  );
});

// ---------------------------------------------------------------------------
// CH: chips
// ---------------------------------------------------------------------------

export const Chips: React.FC<{
  label?: string;
  tag?: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  /** The "More" chip (plus icon, pale). */
  onMore?: (el: HTMLButtonElement) => void;
  error?: string | null;
}> = ({ label, tag, options, selected, onToggle, onMore, error }) => {
  const gid = useId();
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <div className="ob-field-head" style={{ marginBottom: 8 }}>
          <span id={gid} className="ob-label">
            {label}
          </span>
          {tag && <span className="ob-tag">{tag}</span>}
        </div>
      )}
      <div role="group" aria-labelledby={label ? gid : undefined} className="ob-chips">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button key={o} type="button" aria-pressed={on} onClick={() => onToggle(o)} className="ob-chip-b tap">
              {on && <Check size={13} strokeWidth={2.8} aria-hidden />}
              {o}
            </button>
          );
        })}
        {onMore && (
          <button type="button" onClick={(e) => onMore(e.currentTarget)} aria-haspopup="menu" className="ob-chip-b obp-more tap">
            <Plus size={13} strokeWidth={2.6} aria-hidden />
            More
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="obp-chips-err">
          {error}
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ROWS
// ---------------------------------------------------------------------------

/** ROWS with icon tiles, status pills and chevrons. */
export const ListRows: React.FC<{
  rows: {
    key: string;
    icon?: LucideIcon;
    title: string;
    description?: string;
    status?: { text: string; tone: "good" | "warn" | "soft" | "high" };
    onClick?: () => void;
  }[];
  margin?: string;
}> = ({ rows, margin }) => (
  <div className="ob-rows" style={margin ? { margin } : undefined}>
    {rows.map((r, i) => {
      const Icon = r.icon;
      const inner = (
        <>
          {i > 0 && <span aria-hidden className="ob-row-rule" style={{ left: Icon ? 55 : 14 }} />}
          {Icon && (
            <span aria-hidden className="ob-row-ic">
              <Icon size={15} />
            </span>
          )}
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="ob-row-t">{r.title}</span>
            {r.description && <span className="ob-row-d">{r.description}</span>}
          </span>
          {r.status ? (
            <span className="obp-pill" data-tone={r.status.tone}>
              {r.status.text}
            </span>
          ) : r.onClick ? (
            <span className="ob-chev" aria-hidden>
              <ChevronRight size={14} />
            </span>
          ) : null}
        </>
      );
      return r.onClick ? (
        <button key={r.key} type="button" onClick={r.onClick} className="ob-row tap">
          {inner}
        </button>
      ) : (
        <div key={r.key} className="ob-row">
          {inner}
        </div>
      );
    })}
  </div>
);

// ---------------------------------------------------------------------------
// NUMS
// ---------------------------------------------------------------------------

export const NumBoxes: React.FC<{
  items: { label: string; value: number; onLess: () => void; onMore: () => void; lessDisabled?: boolean; moreDisabled?: boolean }[];
}> = ({ items }) => (
  <div className="obp-nums" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
    {items.map((n) => (
      <div key={n.label} className="obp-num" role="group" aria-label={n.label}>
        <p className="obp-num-v" aria-live="polite">
          {n.value}
        </p>
        <p className="obp-num-l">{n.label}</p>
        <div className="obp-num-btns">
          <button type="button" aria-label={`Less, ${n.label}`} onClick={n.onLess} disabled={n.lessDisabled} className="hit">
            <Minus size={14} strokeWidth={2.6} aria-hidden />
          </button>
          <button type="button" aria-label={`More, ${n.label}`} onClick={n.onMore} disabled={n.moreDisabled} className="hit">
            <Plus size={14} strokeWidth={2.6} aria-hidden />
          </button>
        </div>
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// LINK
// ---------------------------------------------------------------------------

export const LinkLine: React.FC<{ icon: LucideIcon; text: string; margin?: string; onClick?: () => void }> = ({
  icon: Icon,
  text,
  margin = "-2px 2px 18px",
  onClick,
}) =>
  onClick ? (
    <button type="button" onClick={onClick} className="obp-linkline tap" style={{ margin }}>
      <Icon size={14} strokeWidth={2.2} aria-hidden />
      {text}
    </button>
  ) : (
    <p className="obp-linkline" style={{ margin }}>
      <Icon size={14} strokeWidth={2.2} aria-hidden />
      {text}
    </p>
  );

// ---------------------------------------------------------------------------
// UP: upload row
// ---------------------------------------------------------------------------

export type UploadState = "empty" | "done" | "err" | "busy";

export const UploadRow: React.FC<{
  icon: LucideIcon;
  title: string;
  subtitle: string;
  state: UploadState;
  error?: string | null;
  onPick: (file: File) => void;
  accept?: string;
  disabled?: boolean;
  /** "Retry" (rotate-ccw) when the upload failed; the drawn "Retake" (camera) when the photo was refused. */
  failure?: "upload" | "photo";
}> = ({ icon: Icon, title, subtitle, state, error, onPick, accept = "image/*,application/pdf", disabled, failure = "upload" }) => {
  const input = useRef<HTMLInputElement>(null);
  const errId = useId();
  const action =
    state === "done"
      ? { text: "Uploaded", Icon: Check }
      : state === "busy"
      ? { text: "Uploading…", Icon: Loader2 }
      : state === "err"
      ? failure === "photo"
        ? { text: "Retake", Icon: Camera }
        : { text: "Retry", Icon: RotateCcw }
      : { text: "Upload", Icon: Upload };
  return (
    <div className="obp-up">
      <button
        type="button"
        disabled={disabled || state === "busy"}
        onClick={() => input.current?.click()}
        aria-label={`${title}. ${subtitle}. ${action.text}`}
        aria-describedby={error ? errId : undefined}
        className="obp-up-row tap"
        data-s={state}
        style={disabled ? { opacity: 0.5 } : undefined}
      >
        <span aria-hidden className="obp-up-ic">
          <Icon size={17} strokeWidth={2} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="obp-up-t">{title}</span>
          <span className="obp-up-s">{subtitle}</span>
        </span>
        <span className="obp-up-a" aria-hidden>
          <action.Icon size={15} strokeWidth={2.4} className={state === "busy" ? "ob-spin" : undefined} />
          {action.text}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPick(f);
        }}
      />
      {error && (
        <p id={errId} role="alert" className="obp-up-err">
          {error}
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// SUM: review summary card
// ---------------------------------------------------------------------------

export const SummaryCard: React.FC<{
  n: number;
  heading: string;
  lines: string[];
  action?: string;
  onAction?: () => void;
  flag?: string;
  bad?: boolean;
}> = ({ n, heading, lines, action = "Edit", onAction, flag, bad }) => (
  <div className="obp-sum" data-bad={bad ? "true" : undefined}>
    <div className="obp-sum-head">
      <span aria-hidden className="obp-sum-n">
        {n}
      </span>
      <span className="obp-sum-h">{heading}</span>
      {onAction && (
        <button type="button" onClick={onAction} aria-label={`${action}: ${heading}`} className="obp-sum-a hit">
          {action}
        </button>
      )}
    </div>
    {lines.map((ln, i) => (
      <p key={i} className="obp-sum-l">
        {ln}
      </p>
    ))}
    {flag && <p className="obp-sum-flag">{flag}</p>}
  </div>
);

// ---------------------------------------------------------------------------
// isPreview: the public profile card
// ---------------------------------------------------------------------------

export const ProfilePreview: React.FC<{
  initials: string;
  avatarUrl?: string | null;
  name: string;
  type: string;
  tags: string[];
  line?: string | null;
  /** Release B (W6C-3): professional_profiles.cover_url, drawn in the cover's place. */
  coverUrl?: string | null;
  /** Release B: "Add a cover" / "Change cover" on the cover (the Review step only). */
  onCover?: () => void;
  coverBusy?: boolean;
  /** Round C Release 2: the owner's "Waiting for approval" / "Not approved" badge, top left on the cover. */
  coverBadge?: React.ReactNode;
}> = ({ initials, avatarUrl, name, type, tags, line, coverUrl, onCover, coverBusy, coverBadge }) => (
  <div className="obp-prev">
    {/* The cover photo (Release B, professional-covers); without one, the
        handoff's placeholder pattern, without its sample caption. The
        action is not drawn: a pill in the badge's style, bottom left, as the
        business onboarding's "Change cover". */}
    <div className="obp-prev-cover" style={coverUrl ? { background: "var(--ob-list)" } : undefined}>
      {coverUrl && <img src={coverUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
      <span className="obp-prev-badge">New on Explore</span>
      {coverBadge && <span style={{ position: "absolute", insetInlineStart: 10, top: 10 }}>{coverBadge}</span>}
      {onCover && (
        <button type="button" onClick={onCover} disabled={coverBusy} className="obp-prev-badge hit" style={{ insetInlineEnd: "auto", top: "auto", insetInlineStart: 10, bottom: 10, border: 0, cursor: "pointer", opacity: coverBusy ? 0.6 : 1 }}>
          {coverBusy ? "Uploading…" : coverUrl ? "Change cover" : "Add a cover"}
        </button>
      )}
    </div>
    <div className="obp-prev-body">
      <span aria-hidden className="obp-prev-av">
        {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="obp-prev-name">{name}</p>
        <p className="obp-prev-type">{type}</p>
        {tags.length > 0 && (
          <div className="obp-prev-tags">
            {tags.map((g) => (
              <span key={g}>{g}</span>
            ))}
          </div>
        )}
        {line && <p className="obp-prev-line">{line}</p>}
      </div>
    </div>
  </div>
);


// ---------------------------------------------------------------------------
// isTimeline: what happens after submitting
// ---------------------------------------------------------------------------

export const Timeline: React.FC<{ items: { title: string; desc: string; value: string; state: "done" | "now" | "next" }[] }> = ({ items }) => (
  <ol className="obp-tl">
    {items.map((it) => (
      <li key={it.title} className="obp-tl-row" data-s={it.state} aria-current={it.state === "now" ? "step" : undefined}>
        <span aria-hidden className="obp-tl-dot">
          {it.state === "done" && <Check size={12} strokeWidth={3} />}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="obp-tl-t">{it.title}</span>
          <span className="obp-tl-d">{it.desc}</span>
        </span>
        {it.value && <span className="obp-tl-v">{it.value}</span>}
      </li>
    ))}
  </ol>
);
