import React, { useId } from "react";
import clsx from "clsx";
import { Camera, Check, ChevronRight, Eye, Loader2, MapPin, Minus, Pencil, Plus, RotateCcw, Upload, type LucideIcon } from "lucide-react";
import { Toggle } from "../../../components/ui/Toggle";
import { ObChip, ObCollapsible } from "../shell";
import "./business-onboarding.css";

// The BizOnboardingV10 body blocks the shell (shell/ObBlocks.tsx) does not
// have, used by the business lanes only: the field with a text area or a Pin
// button, chips with "More", the collapsible with its body, value / status
// rows, number boxes, links, uploads, documents, the plan card, review
// summaries and the listing preview. Literal sizes from the template; colours
// through the theme tokens whose light and dark values are its L / D palettes
// (card cream-card · list --list-bg · rule --list-rule · ink charcoal ·
// inkSoft charcoal-soft · faint charcoal-faint · soft cream-soft · border
// hair-11 · fill primary-fill / on-primary-fill · accentText primary-dark ·
// deep primary-deep-text · pale primary-pale · tealPale teal-pale · paper
// surface-raised · tile row-tile · desc desc · good / high status-*).

export interface BizFieldProps {
  label?: string;
  tag?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  area?: boolean;
  error?: string;
  help?: string;
  count?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  pin?: { onClick: () => void };
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: string;
  maxLength?: number;
  autoComplete?: string;
  ariaLabel?: string;
}

/**
 * Text field (isField): 52 tall (96 for a text area), r16, card fill, 1px
 * border; focused 1.5px brand with the 4px focus ring; error 1.5px attention.
 * 15px value; help 11.5/15 under it with an optional counter. `pin` adds the
 * 1/4-width "Pin" button beside the box (Where and when).
 */
export const BizField: React.FC<BizFieldProps> = ({
  label,
  tag,
  value,
  onChange,
  placeholder,
  area,
  error,
  help,
  count,
  leading,
  trailing,
  pin,
  inputMode,
  type,
  maxLength,
  autoComplete,
  ariaLabel,
}) => {
  const id = useId();
  const helpId = useId();
  const foot = error || help || count;
  return (
    <div className="mb-[14px]">
      {label && (
        <div className="flex items-center justify-between mb-[6px]">
          <label htmlFor={id} className="text-[12px] font-bold text-charcoal-soft">
            {label}
          </label>
          {tag && <span className="text-[10.5px] font-bold text-charcoal-faint">{tag}</span>}
        </div>
      )}
      <div className="flex gap-2">
        <div
          className={clsx(
            "group flex-[3] min-w-0 rounded-[16px] bg-cream-card flex gap-[10px] box-border text-[15px]",
            area ? "min-h-[96px] items-start py-[13px] px-4" : clsx("min-h-[52px] items-center", leading ? "pl-[14px] pr-4" : "px-4"),
            error
              ? "border-[1.5px] border-status-high"
              : "border border-hair-11 focus-within:border-[1.5px] focus-within:border-brand-c focus-within:shadow-[var(--ob-focus)]"
          )}
        >
          {leading && <span className="inline-flex shrink-0 text-charcoal-faint group-focus-within:text-primary-dark">{leading}</span>}
          {area ? (
            <textarea
              id={id}
              value={value}
              placeholder={placeholder}
              maxLength={maxLength}
              aria-label={label ? undefined : ariaLabel}
              aria-invalid={!!error}
              aria-describedby={foot ? helpId : undefined}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              className="flex-1 min-w-0 resize-none bg-transparent outline-none leading-[21px] text-charcoal placeholder:text-charcoal-faint"
            />
          ) : (
            <input
              id={id}
              value={value}
              type={type ?? "text"}
              inputMode={inputMode}
              placeholder={placeholder}
              maxLength={maxLength}
              autoComplete={autoComplete}
              aria-label={label ? undefined : ariaLabel}
              aria-invalid={!!error}
              aria-describedby={foot ? helpId : undefined}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none leading-[22px] text-charcoal placeholder:text-charcoal-faint truncate"
            />
          )}
          {trailing && <span className="inline-flex shrink-0 text-charcoal-faint">{trailing}</span>}
        </div>
        {pin && (
          <button
            type="button"
            aria-label="Place the pin on the map"
            onClick={pin.onClick}
            className="tap flex-1 min-w-0 h-[52px] rounded-[16px] bg-primary-pale border-[1.5px] border-solid border-primary-fill text-primary-dark flex items-center justify-center gap-[5px] text-[13px] font-extrabold box-border"
          >
            <MapPin size={16} strokeWidth={2.2} aria-hidden />
            Pin
          </button>
        )}
      </div>
      {foot && (
        <div id={helpId} className="flex justify-between gap-[10px] mt-[6px]">
          <span
            role={error ? "alert" : undefined}
            className={clsx("flex-1 min-w-0 text-[11.5px] leading-[15px]", error ? "font-semibold text-status-high" : "font-medium text-charcoal-faint")}
          >
            {error || help}
          </span>
          {count && <span className="shrink-0 text-[11px] text-charcoal-faint whitespace-nowrap">{count}</span>}
        </div>
      )}
    </div>
  );
};

/** Chips (isChips) on the shell's ObChip, with the pale "More" chip and the error line. */
export const BizChips: React.FC<{
  label?: string;
  tag?: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  onMore?: (anchor: HTMLElement) => void;
  error?: string;
  max?: number;
}> = ({ label, tag, options, selected, onToggle, onMore, error, max }) => {
  const labelId = useId();
  return (
    <div className="mb-4">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span id={labelId} className="text-[12px] font-bold text-charcoal-soft">
            {label}
          </span>
          {tag && <span className="text-[10.5px] font-bold text-charcoal-faint">{tag}</span>}
        </div>
      )}
      <div role="group" aria-labelledby={label ? labelId : undefined} className="flex flex-wrap gap-2">
        {options.map((t) => {
          const on = selected.includes(t);
          const full = !on && max !== undefined && selected.length >= max;
          return <ObChip key={t} label={t} on={on} disabled={full} onClick={() => onToggle(t)} />;
        })}
        {onMore && (
          <button
            type="button"
            aria-haspopup="menu"
            onClick={(e) => onMore(e.currentTarget)}
            className="hit h-[38px] px-[13px] rounded-[12px] border border-solid border-primary-pale bg-primary-pale text-primary-dark font-extrabold flex items-center gap-[6px] text-[12.5px] box-border whitespace-nowrap"
          >
            <Plus size={13} strokeWidth={2.6} aria-hidden />
            More
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[11.5px] font-semibold text-status-high mt-[6px]">
          {error}
        </p>
      )}
    </div>
  );
};

/** The shell's collapsible header (isColl) and its body (expand-collapse, 220 ms). */
export const BizCollapsible: React.FC<{
  icon: LucideIcon;
  title: string;
  summary: string;
  tag: "Required" | "Optional" | "Done";
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ icon, title, summary, tag, open, onToggle, children }) => {
  const bodyId = useId();
  return (
    <div>
      <ObCollapsible icon={icon} title={title} summary={summary} tag={tag} open={open} onToggle={onToggle} controls={bodyId} />
      <div id={bodyId} className="ob-collapse" data-open={open} aria-hidden={!open} inert={!open || undefined}>
        <div>{children}</div>
      </div>
    </div>
  );
};

export interface BizRow {
  key: string;
  title: string;
  desc?: string;
  icon?: LucideIcon;
  toggle?: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean };
  radio?: { selected: boolean; onSelect: () => void };
  value?: string;
  onClick?: () => void;
  status?: string;
  dim?: boolean;
  /** An editable value cell (fee, price, a value menu). */
  input?: React.ReactNode;
}

/** Row group (isRows): list fill r18, rows min 54, 12.5/700 titles, 10.5 desc, 44×24 switches, values and status pills. */
export const BizRows: React.FC<{ rows: BizRow[]; ariaLabel?: string; radioGroup?: boolean; className?: string }> = ({ rows, ariaLabel, radioGroup, className }) => (
  <div role={radioGroup ? "radiogroup" : undefined} aria-label={ariaLabel} className={clsx("bg-list rounded-[18px] py-1", className ?? "mb-4")}>
    {rows.map((r, i) => {
      const Icon = r.icon;
      const interactive = !!(r.radio || r.onClick);
      const inner = (
        <>
          {i > 0 && <span aria-hidden className="absolute top-0 right-[14px] h-px bg-list-rule" style={{ left: Icon ? 55 : 14 }} />}
          {Icon && (
            <span className="w-[30px] h-[30px] rounded-[10px] bg-row-tile text-white flex items-center justify-center shrink-0">
              <Icon size={15} aria-hidden />
            </span>
          )}
          {r.radio && (
            <span aria-hidden className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center box-border shrink-0", r.radio.selected ? "border-primary-dark" : "border-desc")}>
              <span className={clsx("w-[10px] h-[10px] rounded-full", r.radio.selected ? "bg-primary-dark" : "bg-transparent")} />
            </span>
          )}
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-[12.5px] font-bold leading-[17px] text-charcoal">{r.title}</span>
            {r.desc && <span className="block mt-[2px] text-[10.5px] leading-[14px] text-desc">{r.desc}</span>}
          </span>
          {r.status && (
            <span className="text-[10px] font-extrabold tracking-[0.04em] uppercase py-[2px] px-2 rounded-full bg-cream-card text-charcoal-faint whitespace-nowrap">{r.status}</span>
          )}
          {r.value && <span className="text-[12px] font-bold text-primary-dark whitespace-nowrap">{r.value}</span>}
          {r.input}
          {r.toggle && <Toggle size="onboarding" checked={r.toggle.on} onChange={r.toggle.onChange} label={r.title} disabled={r.toggle.disabled} />}
          {!r.toggle && !r.radio && !r.value && !r.status && !r.input && r.onClick && (
            <span className="text-desc">
              <ChevronRight size={14} aria-hidden />
            </span>
          )}
        </>
      );
      const cls = clsx("relative w-full flex items-center min-h-[54px] py-[7px] px-[14px] gap-[11px] box-border", r.dim && "opacity-50");
      return interactive ? (
        <button
          key={r.key}
          type="button"
          role={r.radio ? "radio" : undefined}
          aria-checked={r.radio ? r.radio.selected : undefined}
          onClick={r.radio ? r.radio.onSelect : r.onClick}
          className={cls}
        >
          {inner}
        </button>
      ) : (
        <div key={r.key} role={r.toggle ? "group" : undefined} aria-label={r.toggle ? r.title : undefined} className={cls}>
          {inner}
        </div>
      );
    })}
  </div>
);

/** Number boxes (isNums): list fill r16, value 26/800 deep, ± 32 buttons. */
export const BizNums: React.FC<{
  items: { key: string; value: number; label: string; min: number; max: number; step?: number; onChange: (v: number) => void }[];
}> = ({ items }) => (
  <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
    {items.map((n) => (
      <div key={n.key} className="rounded-[16px] bg-list pt-3 px-2 pb-[10px] text-center">
        <p className="text-[26px] font-extrabold leading-[30px] text-primary-deep-text tabular-nums" aria-live="polite">
          {n.value}
        </p>
        <p className="text-[10.5px] font-semibold leading-[13px] text-charcoal-faint mt-[3px] min-h-[26px]">{n.label}</p>
        <div className="flex justify-center gap-2 mt-[6px]">
          {[
            { k: "less", label: `Less, ${n.label}`, icon: Minus, next: n.value - (n.step ?? 1), off: n.value <= n.min },
            { k: "more", label: `More, ${n.label}`, icon: Plus, next: n.value + (n.step ?? 1), off: n.value >= n.max },
          ].map((b) => (
            <button
              key={b.k}
              type="button"
              aria-label={b.label}
              disabled={b.off}
              onClick={() => n.onChange(Math.min(n.max, Math.max(n.min, b.next)))}
              className="tap w-8 h-8 rounded-full bg-cream-card border border-solid border-hair-11 flex items-center justify-center text-primary-dark disabled:opacity-40"
            >
              <b.icon size={14} strokeWidth={2.6} aria-hidden />
            </button>
          ))}
        </div>
      </div>
    ))}
  </div>
);

/** Text link (isLink): 12.5/700 accentText with a 14/2.2 icon. */
export const BizLink: React.FC<{ icon: LucideIcon; text: string; onClick: () => void; className?: string; disabled?: boolean }> = ({
  icon: Icon,
  text,
  onClick,
  className,
  disabled,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={clsx("hit flex items-center gap-[6px] text-[12.5px] font-bold text-primary-dark disabled:opacity-40", className ?? "-mt-[2px] mx-[2px] mb-[18px]")}
  >
    <Icon size={14} strokeWidth={2.2} aria-hidden />
    {text}
  </button>
);

export type UploadState = "empty" | "done" | "err" | "busy";

/** Upload row (isUpload): Upload / Uploaded / Retake, plus OURS Uploading… and Retry. */
export const BizUpload: React.FC<{
  icon: LucideIcon;
  title: string;
  sub: string;
  state: UploadState;
  error?: string;
  retryLabel?: "Retake" | "Retry";
  onPick: () => void;
}> = ({ icon: Icon, title, sub, state, error, retryLabel = "Retake", onPick }) => {
  const errId = useId();
  return (
    <div className="mb-[10px]">
      <button
        type="button"
        onClick={onPick}
        disabled={state === "busy"}
        aria-describedby={error ? errId : undefined}
        className={clsx(
          "w-full text-left flex items-center gap-3 rounded-[16px] py-[11px] px-[14px] box-border",
          state === "done" || state === "busy" ? "border border-solid border-hair-11 bg-cream-card" : "border-[1.5px]",
          state === "empty" && "border-dashed border-primary-fill bg-primary-pale",
          state === "err" && "border-solid border-status-high bg-cream-card"
        )}
      >
        <span className={clsx("w-[38px] h-[38px] rounded-[12px] flex items-center justify-center shrink-0", state === "err" ? "bg-status-high-bg text-status-high" : "bg-list text-primary-dark")}>
          <Icon size={17} strokeWidth={2} aria-hidden />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-bold leading-[18px] text-charcoal">{title}</span>
          <span className="block text-[11.5px] text-charcoal-faint leading-4 truncate">{sub}</span>
        </span>
        <span className={clsx("text-[12px] font-extrabold flex items-center gap-1 whitespace-nowrap", state === "done" ? "text-status-good" : state === "err" ? "text-status-high" : "text-primary-dark")}>
          {state === "done" ? (
            <Check size={15} strokeWidth={2.4} aria-hidden />
          ) : state === "err" ? (
            retryLabel === "Retake" ? <Camera size={15} strokeWidth={2.4} aria-hidden /> : <RotateCcw size={15} strokeWidth={2.4} aria-hidden />
          ) : state === "busy" ? (
            <Loader2 size={15} strokeWidth={2.4} className="ob-biz-spin" aria-hidden />
          ) : (
            <Upload size={15} strokeWidth={2.4} aria-hidden />
          )}
          {state === "done" ? "Uploaded" : state === "err" ? retryLabel : state === "busy" ? "Uploading…" : "Upload"}
        </span>
      </button>
      {error && (
        <p id={errId} role="alert" className="text-[11.5px] font-semibold leading-[15px] text-status-high mt-[6px] mx-1">
          {error}
        </p>
      )}
    </div>
  );
};

/** Document card (isDoc): status pill, three-line paper excerpt, Preview and Edit. */
export const BizDocCard: React.FC<{
  icon: LucideIcon;
  title: string;
  sub: string;
  status: "Ready" | "Template" | "Edited";
  lines: [string, string, string];
  onPreview: () => void;
  onEdit: () => void;
}> = ({ icon: Icon, title, sub, status, lines, onPreview, onEdit }) => (
  <div className="rounded-[20px] bg-cream-card border border-hair-11 p-[14px] mb-3" style={{ boxShadow: "var(--ob-card-sh)" }}>
    <div className="flex items-center gap-[10px]">
      <span className="w-9 h-9 rounded-[11px] bg-primary-pale text-primary-dark flex items-center justify-center shrink-0">
        <Icon size={17} strokeWidth={1.9} aria-hidden />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-extrabold text-charcoal">{title}</span>
        <span className="block text-[11.5px] text-charcoal-soft">{sub}</span>
      </span>
      <span
        className={clsx(
          "text-[10px] font-extrabold tracking-[0.05em] uppercase py-[2px] px-2 rounded-full whitespace-nowrap",
          status === "Template" ? "bg-primary-pale text-primary-dark" : "bg-status-good-bg text-status-good"
        )}
      >
        {status}
      </span>
    </div>
    <div className="mt-3 rounded-[12px] bg-surface-raised border border-list-rule py-[10px] px-3 text-[11.5px] leading-[17px] text-charcoal-soft">
      <p className="font-extrabold text-charcoal">{lines[0]}</p>
      <p>{lines[1]}</p>
      <p>{lines[2]}</p>
    </div>
    <div className="flex gap-2 mt-[10px]">
      <button type="button" onClick={onPreview} className="tap flex-1 h-[38px] rounded-[12px] bg-cream-soft flex items-center justify-center gap-[6px] text-[12.5px] font-bold text-charcoal">
        <Eye size={14} strokeWidth={2.2} aria-hidden />
        Preview
      </button>
      <button type="button" onClick={onEdit} className="tap flex-1 h-[38px] rounded-[12px] bg-primary-pale text-primary-dark flex items-center justify-center gap-[6px] text-[12.5px] font-extrabold">
        <Pencil size={14} strokeWidth={2.2} aria-hidden />
        Edit
      </button>
    </div>
  </div>
);

/** Plan card (isPlan): 1.5px fill outline, teal-pale tile, price 18/800 deep. */
export const BizPlanCard: React.FC<{
  icon: LucideIcon;
  title: string;
  sub: string;
  price: string;
  note: string;
  action?: { label: string; onClick: () => void; disabled?: boolean };
}> = ({ icon: Icon, title, sub, price, note, action }) => (
  <div className="rounded-[20px] bg-cream-card border-[1.5px] border-primary-fill py-[14px] px-4 mb-[10px]" style={{ boxShadow: "var(--ob-plan-shadow)" }}>
    <div className="flex items-center gap-3">
      <span className="w-11 h-11 rounded-[14px] bg-teal-pale text-primary-dark flex items-center justify-center shrink-0">
        <Icon size={20} strokeWidth={1.8} aria-hidden />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-extrabold text-charcoal">{title}</span>
        <span className="block text-[12px] text-charcoal-soft">{sub}</span>
      </span>
      <span className="text-[18px] font-extrabold text-primary-deep-text">{price}</span>
    </div>
    <div className="flex justify-between items-center mt-3 pt-[10px] border-t border-list-rule gap-3">
      <span className="text-[11.5px] text-charcoal-faint">{note}</span>
      {action && (
        <button type="button" onClick={action.onClick} disabled={action.disabled} className="hit text-[12.5px] font-extrabold text-primary-dark whitespace-nowrap disabled:opacity-40">
          {action.label}
        </button>
      )}
    </div>
  </div>
);

/** Review summary card (isSum), and the "fix" variant on A few things to fix. */
export const BizSummary: React.FC<{
  n: number;
  title: string;
  lines: string[];
  action?: string;
  onAction?: () => void;
  flag?: string;
  bad?: boolean;
}> = ({ n, title, lines, action = "Edit", onAction, flag, bad }) => (
  <div className={clsx("rounded-[18px] py-3 px-[14px] mb-[10px]", bad ? "bg-status-high-bg border-[1.5px] border-status-high" : "bg-list")}>
    <div className="flex items-center gap-[10px]">
      <span
        className={clsx(
          "w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11.5px] font-extrabold shrink-0",
          bad ? "bg-status-high text-white dark:text-on-destructive" : "bg-primary-pale text-primary-dark"
        )}
      >
        {n}
      </span>
      <span className="flex-1 min-w-0 text-[13.5px] font-extrabold text-charcoal">{title}</span>
      {onAction && (
        <button type="button" onClick={onAction} aria-label={`${action} ${title}`} className="hit text-[12px] font-extrabold text-primary-dark">
          {action}
        </button>
      )}
    </div>
    {lines.map((l, i) => (
      <p key={i} className="text-[12px] leading-[17px] text-charcoal-soft mt-1 ml-9">
        {l}
      </p>
    ))}
    {flag && <p className={clsx("text-[11.5px] font-bold leading-4 mt-[6px] ml-9", bad ? "text-status-high" : "text-caution-text")}>{flag}</p>}
  </div>
);

/** The striped photo placeholder (135deg pale / list stripes). */
export const stripes = "repeating-linear-gradient(135deg, rgb(var(--c-primary-pale)) 0 10px, var(--list-bg) 10px 20px)";

/** Listing preview (isPreview). */
export const BizListingPreview: React.FC<{
  coverUrl: string | null;
  coverLabel: string;
  logoUrl: string | null;
  initials: string;
  name: string;
  type: string;
  tags: string[];
  line: string;
}> = ({ coverUrl, coverLabel, logoUrl, initials, name, type, tags, line }) => (
  <div className="rounded-[22px] bg-cream-card border border-hair-11 overflow-hidden mb-[14px]" style={{ boxShadow: "var(--ob-preview-shadow)" }}>
    <div className="relative h-[118px]" style={{ background: coverUrl ? `center / cover no-repeat url("${coverUrl}")` : stripes }}>
      {!coverUrl && <span className="absolute left-3 top-[10px] font-mono text-[10px] text-charcoal-faint">{coverLabel}</span>}
      <span className="absolute right-[10px] top-[10px] text-[10px] font-extrabold py-[3px] px-2 rounded-full bg-cream-card text-primary-dark">New on Explore</span>
    </div>
    <div className="flex gap-3 pt-3 px-[14px] pb-[14px]">
      <span
        className="relative w-[50px] h-[50px] rounded-[15px] bg-row-tile text-white flex items-center justify-center text-[16px] font-extrabold -mt-[30px] shrink-0 overflow-hidden"
        style={{ boxShadow: "0 0 0 3px rgb(var(--c-cream-card))" }}
      >
        {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-extrabold leading-5 text-charcoal">{name}</p>
        <p className="text-[12px] text-charcoal-faint leading-[17px]">{type}</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-[6px] mt-2">
            {tags.map((t) => (
              <span key={t} className="text-[10.5px] font-bold py-[3px] px-2 rounded-full bg-cream-soft text-charcoal-soft">
                {t}
              </span>
            ))}
          </div>
        )}
        <p className="text-[11.5px] font-bold text-primary-dark mt-2">{line}</p>
      </div>
    </div>
  </div>
);
