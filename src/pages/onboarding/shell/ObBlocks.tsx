import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronRight, ChevronUp, X, type LucideIcon } from "lucide-react";
import { passwordChecks, passwordStrength } from "../../../utils/password";
import "./onboarding.css";
import { MARK_LEAF_PATH } from "../../../components/icons/CentiumMark";
import { OB, type Shape, Shapes } from "./visuals";

// The body blocks of the onboarding steps (BizOnboardingV10 `bl` kinds), one
// component per kind, literal to the markup. Lanes compose steps from these;
// a kind a lane needs that is not here is added here (backward compatible),
// never re-drawn inside a step.

// ---- Field (isField; SharedOnboardingV4 fields with variant="intro") --------

export interface ObFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  /** Right of the label: "Optional", "Required"… (10.5/700 faint). */
  tag?: string;
  icon?: LucideIcon;
  /** Right end of the box (e.g. the eye button, a calendar icon). */
  end?: React.ReactNode;
  help?: React.ReactNode;
  error?: React.ReactNode;
  count?: string;
  /** "intro": SharedOnboardingV4 field (16px text, no label row); default lane (15px). */
  variant?: "intro" | "lane";
  boxRef?: React.Ref<HTMLLabelElement>;
  marginBottom?: number;
}

export const ObField = React.forwardRef<HTMLInputElement, ObFieldProps>(
  ({ label, tag, icon: Icon, end, help, error, count, variant = "lane", boxRef, marginBottom, id, ...input }, ref) => {
    const auto = useId();
    const inputId = id ?? auto;
    const helpId = `${inputId}-help`;
    const showHelp = !!(error || help || count);
    return (
      <div className="ob-field" style={marginBottom !== undefined ? { marginBottom } : undefined}>
        {(label || tag) && (
          <div className="ob-field-head">
            <label className="ob-label" htmlFor={inputId}>
              {label}
            </label>
            {tag && <span className="ob-tag">{tag}</span>}
          </div>
        )}
        <label ref={boxRef} className="ob-box" data-v={variant} data-icon={Icon ? "" : undefined} data-err={error ? "true" : undefined} htmlFor={inputId}>
          {Icon && (
            <span className="ob-box-ic">
              <Icon size={16} />
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={showHelp ? helpId : undefined}
            aria-label={!label ? input.placeholder : undefined}
            {...input}
          />
          {end && <span className="ob-box-end">{end}</span>}
        </label>
        {showHelp && (
          <div className="ob-help" data-err={error ? "true" : undefined} id={helpId}>
            <span role={error ? "alert" : undefined}>{error || help}</span>
            {count && <span className="ob-help-count">{count}</span>}
          </div>
        )}
      </div>
    );
  }
);
ObField.displayName = "ObField";

// ---- Section label (isLabel) --------------------------------------------------

export const ObSectionLabel: React.FC<{ title: string; tag?: string; tagTone?: "accent" | "faint"; margin?: string }> = ({
  title,
  tag,
  tagTone = "faint",
  margin = "8px 2px 12px",
}) => (
  <div className="ob-sec" style={{ margin }}>
    <span className="ob-sec-t">{title}</span>
    {tag ? (
      <span className="ob-sec-tag" data-tone={tagTone}>
        {tag}
      </span>
    ) : (
      <span className="ob-sec-tag" />
    )}
  </div>
);

// ---- Tip (isTip) -----------------------------------------------------------------

export const ObTip: React.FC<{ icon: LucideIcon; heading?: string; children: React.ReactNode; tone?: "pale" | "warn"; margin?: string; role?: string }> = ({
  icon: Icon,
  heading,
  children,
  tone = "pale",
  margin = "-4px 0 16px",
  role,
}) => (
  <div className="ob-tip" data-tone={tone} style={{ margin }} role={role}>
    <Icon size={15} strokeWidth={2} />
    <p>
      {heading && <strong>{heading} </strong>}
      {children}
    </p>
  </div>
);

// ---- Segmented choice (isSeg) ------------------------------------------------------

export function ObSeg<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: { value: T; label: string; icon: LucideIcon }[];
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p className="ob-label" style={{ marginBottom: 6 }}>
        {label}
      </p>
      <div className="ob-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className="tap" onClick={() => onChange(o.value)}>
            <o.icon size={18} strokeWidth={2} />
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Collapsible (isColl) ------------------------------------------------------------

export const ObCollapsible: React.FC<{
  icon: LucideIcon;
  title: string;
  summary: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  tag?: "Optional" | "Required" | "Done" | string;
  margin?: string;
  controls?: string;
}> = ({ icon: Icon, title, summary, open, onToggle, tag = "Optional", margin = "0 0 12px", controls }) => (
  <button type="button" className="ob-coll" aria-expanded={open} aria-controls={controls} onClick={onToggle} style={{ margin }}>
    <span className="ob-coll-ic">
      <Icon size={16} strokeWidth={2} />
    </span>
    <span style={{ flex: 1, minWidth: 0 }}>
      <span className="ob-coll-t">{title}</span>
      <span className="ob-coll-s">{summary}</span>
    </span>
    <span className="ob-pilltag" data-tone={tag === "Optional" ? "opt" : tag === "Done" ? "done" : undefined}>
      {tag}
    </span>
    <span className="ob-chev">{open ? <ChevronUp size={16} strokeWidth={2.2} /> : <ChevronDown size={16} strokeWidth={2.2} />}</span>
  </button>
);

// ---- Row group (isRows) ------------------------------------------------------------------

export interface ObRowItem {
  key: string;
  title: string;
  desc?: string;
  icon?: LucideIcon;
  /** "radio" (role radio, 20px ring), "toggle" (44×24 switch), "link" (chevron). */
  kind: "radio" | "toggle" | "link";
  on?: boolean;
  dim?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export const ObRows: React.FC<{ rows: ObRowItem[]; label?: string; marginBottom?: number }> = ({ rows, label, marginBottom }) => {
  const radio = rows.some((r) => r.kind === "radio");
  return (
    <div className="ob-rows" role={radio ? "radiogroup" : undefined} aria-label={label} style={marginBottom !== undefined ? { marginBottom } : undefined}>
      {rows.map((r, i) => {
        const hasIc = !!r.icon && r.kind !== "radio";
        const inner = (
          <>
            {i > 0 && <span className="ob-row-rule" style={{ left: hasIc ? 55 : 14 }} />}
            {hasIc && r.icon && (
              <span className="ob-row-ic">
                <r.icon size={15} />
              </span>
            )}
            {r.kind === "radio" && (
              <span className="ob-radio">
                <span />
              </span>
            )}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="ob-row-t">{r.title}</span>
              {r.desc && <span className="ob-row-d">{r.desc}</span>}
            </span>
            {r.kind === "toggle" && (
              <span className={`ob-switch${r.on ? "" : " toggle-off"}`} aria-hidden data-on={r.on}>
                <span />
              </span>
            )}
            {r.kind === "link" && (
              <span className="ob-chev">
                <ChevronRight size={14} />
              </span>
            )}
          </>
        );
        return (
          <button
            key={r.key}
            type="button"
            role={r.kind === "radio" ? "radio" : r.kind === "toggle" ? "switch" : undefined}
            aria-checked={r.kind === "link" ? undefined : !!r.on}
            className="ob-row"
            disabled={r.disabled}
            style={{ opacity: r.dim ? 0.5 : 1 }}
            onClick={r.onClick}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
};

// ---- Switch -------------------------------------------------------------------------------

export const ObSwitch: React.FC<{ on: boolean; label: string; onChange: (on: boolean) => void; disabled?: boolean; style?: React.CSSProperties }> = ({
  on,
  label,
  onChange,
  disabled,
  style,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    className={`ob-switch hit${on ? "" : " toggle-off"}`}
    onClick={() => onChange(!on)}
    style={style}
  >
    <span />
  </button>
);

// ---- Toggle list (isToggles) ---------------------------------------------------------------

export interface ObToggleItem {
  key: string;
  icon: LucideIcon;
  title: string;
  desc: React.ReactNode;
  caption?: string;
  /** Shown under the description while on (accentText 11.5/600). */
  effect?: string;
  on: boolean;
  onChange: (on: boolean) => void;
}

export const ObToggleList: React.FC<{ title: string; items: ObToggleItem[]; children?: React.ReactNode }> = ({ title, items, children }) => (
  <div style={{ marginBottom: 14 }}>
    <p className="ob-sec ob-sec-t" style={{ margin: "4px 2px 4px", display: "block" }}>
      {title}
    </p>
    {children}
    {items.map((t, k) => (
      <div key={t.key} role="group" aria-label={t.title} className="ob-tg">
        {k > 0 && <span className="ob-tg-rule" />}
        <span className="ob-sq-ic">
          <t.icon size={17} strokeWidth={1.75} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="ob-tg-t">{t.title}</span>
          <span className="ob-tg-d">{t.desc}</span>
          {t.caption && <span className="ob-tg-cap">{t.caption}</span>}
          {t.on && t.effect && <span className="ob-tg-eff">{t.effect}</span>}
        </span>
        <ObSwitch on={t.on} label={t.title} onChange={t.onChange} />
      </div>
    ))}
  </div>
);

// ---- Chips (isChips) -------------------------------------------------------------------------

export const ObChip: React.FC<{ label: string; on: boolean; onClick: () => void; disabled?: boolean }> = ({ label, on, onClick, disabled }) => (
  <button type="button" className="ob-chip-b hit" aria-pressed={on} onClick={onClick} disabled={disabled}>
    {on && <Check size={13} strokeWidth={2.8} />}
    {label}
  </button>
);

/** A read-only chip (You're all set "Your starting point"): the on look, not a button. */
export const ObChipStatic: React.FC<{ label: string }> = ({ label }) => (
  <span className="ob-chip-b" data-on="true">
    <Check size={13} strokeWidth={2.8} />
    {label}
  </span>
);

// ---- Pair fields with unit switch (isUnits) ----------------------------------------------------

export interface ObUnitField {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "decimal";
  units: { value: string; label: string }[];
  unit: string;
  onUnit: (u: string) => void;
  error?: boolean;
}

export const ObUnits: React.FC<{ items: ObUnitField[] }> = ({ items }) => (
  <div className="ob-units">
    {items.map((u) => (
      <div key={u.label} style={{ minWidth: 0 }}>
        <label className="ob-label" style={{ display: "block", marginBottom: 6 }} htmlFor={`ob-unit-${u.label}`}>
          {u.label}
        </label>
        <span className="ob-box" data-err={u.error ? "true" : undefined}>
          <input
            id={`ob-unit-${u.label}`}
            value={u.value}
            inputMode={u.inputMode}
            placeholder={u.placeholder}
            onChange={(e) => u.onChange(e.target.value)}
            style={{ whiteSpace: "nowrap" }}
          />
          <span className="ob-unit-sw" role="radiogroup" aria-label={`${u.label} unit`}>
            {u.units.map((un) => (
              <button key={un.value} type="button" role="radio" aria-checked={u.unit === un.value} className="hit" onClick={() => u.onUnit(un.value)}>
                {un.label}
              </button>
            ))}
          </span>
        </span>
      </div>
    ))}
  </div>
);

// ---- Goal tiles (isGoalTiles) -----------------------------------------------------------------

export interface ObGoalTile {
  key: string;
  icon: LucideIcon;
  title: string;
  on: boolean;
  dim?: boolean;
  refine?: string;
  onToggle: () => void;
  onRefine?: () => void;
}

export const ObGoalTiles: React.FC<{ items: ObGoalTile[] }> = ({ items }) => (
  <div className="ob-goals" role="group" aria-label="Goal areas">
    {items.map((g) => (
      <div
        key={g.key}
        role="checkbox"
        aria-checked={g.on}
        aria-disabled={g.dim || undefined}
        tabIndex={0}
        className="ob-goal tap"
        data-dim={g.dim ? "true" : undefined}
        onClick={g.onToggle}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            g.onToggle();
          }
        }}
      >
        <span className="ob-goal-top">
          <span className="ob-goal-ic">
            <g.icon size={17} strokeWidth={1.75} />
          </span>
          <span className="ob-tick" data-on={g.on}>
            {g.on && <Check size={11} strokeWidth={3} />}
          </span>
        </span>
        <span className="ob-goal-t">{g.title}</span>
        <button
          type="button"
          className="ob-goal-ref hit"
          style={{ visibility: g.on ? "visible" : "hidden" }}
          tabIndex={g.on ? 0 : -1}
          onClick={(e) => {
            e.stopPropagation();
            g.onRefine?.();
          }}
        >
          {g.refine}
        </button>
      </div>
    ))}
  </div>
);

// ---- Scale (isScale) -------------------------------------------------------------------------

export function ObScale<T extends string>({
  label,
  items,
  value,
  onChange,
  caption,
}: {
  label: string;
  items: { value: T; label: string; icon: LucideIcon }[];
  value: T | null;
  onChange: (v: T) => void;
  caption?: { title: string; desc: string } | null;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="ob-scale" role="radiogroup" aria-label={label}>
        {items.map((s) => (
          <button key={s.value} type="button" role="radio" aria-checked={value === s.value} aria-label={s.label} className="tap" onClick={() => onChange(s.value)}>
            <s.icon size={20} strokeWidth={1.75} />
            <span>{s.label}</span>
          </button>
        ))}
      </div>
      {caption && (
        <p className="ob-scale-cap">
          {caption.title}
          <span> · {caption.desc}</span>
        </p>
      )}
    </div>
  );
}

// ---- Row link (isRowLink) ------------------------------------------------------------------------

export const ObRowLink = React.forwardRef<HTMLButtonElement, { icon: LucideIcon; title: string; desc: string; onClick: () => void; expanded?: boolean }>(
  ({ icon: Icon, title, desc, onClick, expanded }, ref) => (
    <button ref={ref} type="button" className="ob-rowlink" onClick={onClick} aria-haspopup="menu" aria-expanded={expanded}>
      <span className="ob-sq-ic">
        <Icon size={17} strokeWidth={1.75} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="ob-rowlink-t">{title}</span>
        <span className="ob-rowlink-d">{desc}</span>
      </span>
      <span className="ob-chev">
        <ChevronRight size={16} strokeWidth={2} />
      </span>
    </button>
  )
);
ObRowLink.displayName = "ObRowLink";

// ---- Tracking rows (isTrackRows) ---------------------------------------------------------------------

export type ObTrackRow =
  | { kind: "toggle"; key: string; icon: LucideIcon; title: string; desc?: string; on: boolean; disabled?: boolean; iconBg?: "pale" | "card"; onChange: (on: boolean) => void }
  | { kind: "group"; key: string; icon: LucideIcon; title: string; count: string; open: boolean; onToggle: () => void; controls?: string };

export const ObTrackRows: React.FC<{ rows: ObTrackRow[]; marginBottom: number; id?: string }> = ({ rows, marginBottom, id }) => (
  <div className="ob-trk" style={{ marginBottom }} id={id}>
    {rows.map((r, k) =>
      r.kind === "toggle" ? (
        <div key={r.key} className="ob-trk-row">
          {k > 0 && <span className="ob-trk-rule" />}
          <span className="ob-trk-ic" data-bg={r.iconBg === "card" ? "card" : undefined}>
            <r.icon size={16} strokeWidth={1.75} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="ob-trk-t">{r.title}</span>
            {r.desc && <span className="ob-trk-d">{r.desc}</span>}
          </span>
          <ObSwitch on={r.on} label={r.title} onChange={r.onChange} disabled={r.disabled} />
        </div>
      ) : (
        <button key={r.key} type="button" className="ob-trk-row" aria-expanded={r.open} aria-controls={r.controls} onClick={r.onToggle}>
          {k > 0 && <span className="ob-trk-rule" />}
          <span className="ob-trk-ic" data-bg="soft">
            <r.icon size={16} strokeWidth={1.75} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="ob-trk-t">{r.title}</span>
          </span>
          <span className="ob-trk-cnt">{r.count}</span>
          <span className="ob-chev">{r.open ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}</span>
        </button>
      )
    )}
  </div>
);

// ---- Status block (isStatus) ---------------------------------------------------------------------------

export const ObStatus: React.FC<{
  vis: Shape[];
  eyebrow: string;
  eyebrowColor: string;
  title: React.ReactNode;
  body: React.ReactNode;
  /** Ring opacity, ring scale, glow opacity / size, text opacity (BizOnboardingV10 STATUS options). */
  ringOpacity?: number;
  ringScale?: number;
  glowOpacity?: number;
  glowSize?: number;
  textOpacity?: number;
  /** Style for the 120×120 drawing. */
  visStyle?: React.CSSProperties;
  /** A custom 0 0 100 100 drawing instead of `vis` (animated leaves). */
  visNode?: React.ReactNode;
}> = ({ vis, eyebrow, eyebrowColor, title, body, ringOpacity = 1, ringScale = 1, glowOpacity = 0, glowSize = 160, textOpacity = 1, visStyle, visNode }) => (
  <div className="ob-status">
    <div className="ob-status-vis">
      {[170, 132, 96].map((s, i) => (
        <span
          key={s}
          className="ob-status-ring"
          style={{ width: s, height: s, marginLeft: -s / 2, marginTop: -s / 2, opacity: i === 0 ? ringOpacity * 0.6 : ringOpacity, transform: `scale(${ringScale})` }}
        />
      ))}
      <span className="ob-status-glow" style={{ width: glowSize, height: glowSize, marginLeft: -glowSize / 2, marginTop: -glowSize / 2, opacity: glowOpacity }} />
      {visNode ? (
        <svg viewBox="0 0 100 100" width={120} height={120} aria-hidden className="ob-status-svg" style={visStyle}>
          {visNode}
        </svg>
      ) : (
        <Shapes shapes={vis} size={120} className="ob-status-svg" style={visStyle} />
      )}
    </div>
    <p className="ob-status-eb" style={{ color: eyebrowColor, opacity: textOpacity }}>
      {eyebrow}
    </p>
    <h1 className="ob-status-t" style={{ opacity: textOpacity }}>
      {title}
    </h1>
    <p className="ob-status-s" style={{ opacity: textOpacity }}>
      {body}
    </p>
  </div>
);

// ---- Terms (isTerms) ------------------------------------------------------------------------------------

export const ObTerms: React.FC<{
  on: boolean;
  onChange: (on: boolean) => void;
  error?: string | null;
  /** The bold first document: "Terms of Service" (pro / client), "Business Terms" (business). */
  doc?: string;
  /** The sentence after the documents (default: the handover's ", and confirm these details are true."). */
  tail?: string;
  disabled?: boolean;
}> = ({ on, onChange, error, doc = "Terms of Service", tail = ", and confirm these details are true.", disabled }) => (
  <div className="ob-terms">
    <div
      role="checkbox"
      aria-checked={on}
      aria-disabled={disabled || undefined}
      tabIndex={0}
      className="ob-terms-row"
      onClick={() => !disabled && onChange(!on)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === " " || e.key === "Enter")) {
          e.preventDefault();
          onChange(!on);
        }
      }}
    >
      <span className="ob-terms-box hit" data-on={on} data-err={!on && error ? "true" : undefined}>
        {on && <Check size={13} strokeWidth={3} />}
      </span>
      <span className="ob-terms-t">
        I accept the{" "}
        <a href="/legal#terms" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
          {doc}
        </a>{" "}
        {/* Round F (DN, F3): the Refund and Cancellation Policy is part of the Terms. */}
        (including the{" "}
        <a href="/legal/refund-policy" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
          Refund and cancellation policy
        </a>
        ) and{" "}
        <a href="/legal#privacy" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
          Privacy Policy
        </a>
        {tail}
      </span>
    </div>
    {error && (
      <p className="ob-terms-err" role="alert">
        {error}
      </p>
    )}
  </div>
);

// ---- Menu (hasMenu): a multi-select pop-up anchored to a control ---------------------------------------------

export const ObMenu: React.FC<{
  title: string;
  anchor: HTMLElement | null;
  options: { key: string; label: string; on: boolean; disabled?: boolean }[];
  onToggle: (key: string) => void;
  onClose: () => void;
  /** BizOnboardingV10 places the menu at right 24 (client) or left 24 + right 90; "right" = right-aligned to the anchor. */
  align?: "right" | "left";
  doneLabel?: string;
  /** Card width when the frame draws one (OB-146: left 24, right 110 = 256). Added by OB-B; unset = min-width 200. */
  width?: number;
}> = ({ title, anchor, options, onToggle, onClose, align = "right", doneLabel, width }) => {
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const h = menuRef.current?.offsetHeight ?? 0;
      const below = r.bottom + 6;
      const top = below + h > window.innerHeight - 16 ? Math.max(16, r.top - 6 - h) : below;
      setPos(align === "right" ? { top, right: Math.max(16, window.innerWidth - r.right) } : { top, left: Math.max(16, r.left) });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchor, align, options.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="ob-vars">
      <div className="ob-menu-scrim" onClick={onClose} />
      <div ref={menuRef} role="menu" aria-label={title} className="ob-menu" style={{ ...(pos ? pos : { visibility: "hidden", top: 0 }), ...(width ? { width, boxSizing: "border-box" } : null) }}>
        <p className="ob-menu-t">{title}</p>
        {options.map((o) => (
          <button key={o.key} type="button" role="menuitemcheckbox" aria-checked={o.on} disabled={o.disabled} className="ob-menu-o" onClick={() => onToggle(o.key)}>
            <span>{o.label}</span>
            {o.on && (
              <span className="ob-menu-ck">
                <Check size={13} strokeWidth={3} />
              </span>
            )}
          </button>
        ))}
        {doneLabel && (
          <button type="button" className="ob-menu-done" onClick={onClose}>
            {doneLabel}
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};

// ---- Rich selection card (account type, business type, specialty) -------------------------------------------

export interface ObSelectCardProps {
  title: string;
  desc: React.ReactNode;
  points?: string[];
  /** Bullet colour (leaf for Personal and Gym, brand otherwise). */
  dot?: string;
  /** Tile ground: "pale" or "teal" (tealPale). */
  tile: "pale" | "teal";
  /** The drawing: a node sized to the tile. */
  visual: (state: { on: boolean; recede: boolean }) => React.ReactNode;
  /** Tilt of the drawing when selected (−7.5deg account type, −4deg types). */
  tilt?: string;
  tiltOrigin?: string;
  on: boolean;
  /** Another card is selected. */
  recede: boolean;
  /** Continue played: unselected cards fade to 0, the selected one lifts −6px. */
  leaving?: boolean;
  /** Padding override ("14px 16px" default, recede "12px 16px"). */
  pad?: string;
  recedePad?: string;
  tileSize?: number;
  recedeTileSize?: number;
  /** Sub-choice row under the selected card (Personal: General user / Client of a professional). */
  subs?: React.ReactNode;
  /** Extra content inside the card, under the subs (the client code field). */
  extra?: React.ReactNode;
  onSelect: () => void;
}

export const ObSelectCard: React.FC<ObSelectCardProps> = ({
  title,
  desc,
  points,
  dot = OB.brand,
  tile,
  visual,
  tilt = "-7.5deg",
  tiltOrigin,
  on,
  recede,
  leaving,
  pad,
  recedePad,
  tileSize = 56,
  recedeTileSize = 48,
  subs,
  extra,
  onSelect,
}) => {
  const size = recede || (leaving && on && false) ? recedeTileSize : tileSize;
  return (
    <div
      role="radio"
      aria-checked={on}
      tabIndex={on || (!recede && !on) ? 0 : -1}
      className="ob-card"
      data-recede={recede && !leaving ? "true" : undefined}
      data-gone={leaving && !on ? "true" : undefined}
      data-lift={leaving && on ? "true" : undefined}
      style={{ padding: recede && !leaving ? recedePad : pad, cursor: "pointer" }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-card-inner]")) return;
        onSelect();
      }}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-card-inner]")) return;
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="ob-card-main">
        <span className="ob-card-tile" style={{ width: size, height: size, background: tile === "teal" ? "var(--ob-teal-pale)" : "var(--ob-pale)" }}>
          <span className="ob-card-tile-ring" />
          <span className="ob-card-vis" style={{ transform: `rotate(${on ? tilt : "0deg"})`, transformOrigin: tiltOrigin, display: "flex" }}>
            {visual({ on, recede })}
          </span>
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="ob-card-t">{title}</span>
          <span className="ob-card-d">{desc}</span>
        </span>
        <span className="ob-card-radio">{on && <Check size={12} strokeWidth={3} />}</span>
      </div>
      {points && !recede && !leaving && (
        <div className="ob-card-pts">
          {points.map((p) => (
            <span key={p} className="ob-card-pt">
              <span style={{ background: dot }} />
              {p}
            </span>
          ))}
        </div>
      )}
      {subs && on && !leaving && (
        <div className="ob-card-subs" data-card-inner>
          {subs}
        </div>
      )}
      {extra && on && !leaving && <div data-card-inner>{extra}</div>}
    </div>
  );
};

/** The leaf drawn in the toggle option card (isOpt) and similar: a ring with a leaf. */
export const ObLeafRing: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden style={{ overflow: "visible" }}>
    <circle cx="50" cy="52" r="30" fill="none" stroke={OB.lav} strokeWidth="2.5" opacity="0.7" />
    <path d={MARK_LEAF_PATH} fill={OB.leaf} transform="translate(50 70) scale(0.075) rotate(-45) translate(-566 -884)" />
  </svg>
);

// ---- Password strength card (hasStrength) ------------------------------------------------------------------
// SharedOnboardingV4: r18 list fill, pad 14 16, label 12/700 + state 12/800,
// 4px bar, two-column checks 11/14 with 14px discs. Unmet checks (not drawn):
// a soft disc with a faint x. Rules and labels from utils/password, shared by
// sign-up and the reset page.
export const ObStrength: React.FC<{ password: string }> = ({ password }) => {
  const { passed, label, color } = passwordStrength(password);
  return (
    <div className="ob-str" aria-live="polite">
      <div className="ob-str-head">
        <span>Password strength</span>
        <span style={{ color }}>{label}</span>
      </div>
      <div className="ob-str-bar">
        <span style={{ width: `${(passed / passwordChecks.length) * 100}%`, background: color }} />
      </div>
      <div className="ob-str-grid">
        {passwordChecks.map((c) => {
          const met = c.test(password);
          return (
            <span key={c.label} className="ob-str-ck" data-met={met}>
              <span>{met ? <Check size={9} strokeWidth={3.4} /> : <X size={9} strokeWidth={3.4} />}</span>
              {c.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};
