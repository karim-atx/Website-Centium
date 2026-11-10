import React, { useId } from "react";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { Toggle } from "../../ui/Toggle";
import { SelectableBox } from "../../ui/SelectableBox";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";

// Release 3 · W4 the board's form pieces for the calendar sheets (source/gen
// ui.js field, toggle, sRow, sSection; r6a.js repeatRow6, popMenuInline):
// - field: label 12 / 600 text.soft with an optional 12 icon, 6 above a 40
//   high r12 well (cream-soft, 1 px charcoal 10%, primary when open), pad
//   0 12, value 14, trailing icon (ChevronDown 14 / 2, others 16 / 1.75);
// - sRow: pad 13 0, gap 14, tile 36 r11 #F0EDF9 (dark lavender 14%) with a
//   17 / 1.75 #7D67D9 (dark #9A8CD6) icon, title 14 / 600 / 20, sub 12 / 16
//   text.faint, value 12.5 text.faint, rule 1 px 6% from 50;
// - sSection: 32 apart, the section label 11 / 600 caps 0.14em text.faint over
//   a 1.5 primary rule (pad-bottom 7.5);
// - repeat row: min 48, r12, cream-soft, pad 10 12, gap 16, title 14 / 600,
//   sub 11.5 text.faint, the switch right.

export const LABEL_CLASS = "flex items-center";
const labelStyle: React.CSSProperties = { gap: 6, fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 };
export const wellStyle = (focus = false): React.CSSProperties => ({
  width: "100%",
  minHeight: 40,
  borderRadius: 12,
  background: INK.soft,
  border: `1px solid ${focus ? INK.pr : INK.b10}`,
  padding: "0 12px",
  gap: 8,
  fontSize: textPx(14),
  color: INK.ch,
});

export const FieldLabel: React.FC<{ icon?: LucideIcon; htmlFor?: string; children: React.ReactNode }> = ({ icon: Icon, htmlFor, children }) => (
  <label htmlFor={htmlFor} className={LABEL_CLASS} style={labelStyle}>
    {Icon && <Icon size={12} strokeWidth={2} aria-hidden />}
    {children}
  </label>
);

/** A field that opens something (a dropdown, a picker): a button in the well. */
export const FieldButton = React.forwardRef<
  HTMLButtonElement,
  {
    label?: string;
    labelIcon?: LucideIcon;
    value: React.ReactNode;
    placeholder?: boolean;
    lead?: React.ReactNode;
    icon?: LucideIcon;
    open?: boolean;
    ariaLabel: string;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
  }
>(({ label, labelIcon, value, placeholder, lead, icon: Icon = ChevronDown, open, ariaLabel, onClick, disabled }, ref) => {
  const id = useId();
  return (
    <div className="min-w-0">
      {label && (
        <FieldLabel icon={labelIcon} htmlFor={id}>
          {label}
        </FieldLabel>
      )}
      <button
        ref={ref}
        id={id}
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup={Icon === ChevronDown ? "menu" : undefined}
        aria-expanded={Icon === ChevronDown ? !!open : undefined}
        className="tap flex items-center justify-between text-start disabled:opacity-50"
        style={{ ...wellStyle(open), height: 40 }}
      >
        {lead}
        <span className="flex-1 min-w-0 truncate" style={{ color: placeholder ? INK.chF : INK.ch }}>
          {value}
        </span>
        <Icon size={Icon === ChevronDown ? 14 : 16} strokeWidth={Icon === ChevronDown ? 2 : 1.75} aria-hidden style={{ color: INK.chF, flexShrink: 0 }} />
      </button>
    </div>
  );
});
FieldButton.displayName = "FieldButton";

export const FieldInput: React.FC<
  {
    label?: string;
    labelIcon?: LucideIcon;
    value: string;
    onChange: (v: string) => void;
    icon?: LucideIcon;
    ariaLabel?: string;
  } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">
> = ({ label, labelIcon, value, onChange, icon: Icon, ariaLabel, ...rest }) => {
  const id = useId();
  return (
    <div className="min-w-0">
      {label && (
        <FieldLabel icon={labelIcon} htmlFor={id}>
          {label}
        </FieldLabel>
      )}
      <span className="flex items-center focus-within:!border-primary" style={{ ...wellStyle(), height: 40 }}>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label ? undefined : ariaLabel}
          className="flex-1 min-w-0 h-full bg-transparent outline-none placeholder:text-charcoal-faint"
          style={{ fontSize: textPx(14), color: INK.ch }}
          {...rest}
        />
        {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden style={{ color: INK.chF, flexShrink: 0 }} />}
      </span>
    </div>
  );
};

/**
 * r6a repeatRow6: the full-width row with the switch on the right (CA5 v2 fix).
 * FP: the row is the switch, so a tap anywhere on it toggles; the line under
 * the title describes it.
 */
export const SwitchRow: React.FC<{ title: string; sub?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ title, sub, checked, onChange, disabled }) => {
  const subId = useId();
  return (
    <SelectableBox
      kind="switch"
      selected={checked}
      onToggle={() => onChange(!checked)}
      disabled={disabled}
      label={title}
      describedBy={sub ? subId : undefined}
      className="flex items-center justify-between"
      style={{ gap: 16, minHeight: 48, borderRadius: 12, background: INK.soft, padding: "10px 12px" }}
    >
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch, lineHeight: 1.3 }}>
          {title}
        </span>
        {sub && (
          <span id={subId} className="block" style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.35 }}>
            {sub}
          </span>
        )}
      </span>
      <Toggle decorative checked={checked} disabled={disabled} />
    </SelectableBox>
  );
};

/**
 * ui.js sSection: a section label over its rows, 32 above (0 for the first).
 * `web` (WP-CA Calendar Extras Web): the label 12/16 600, 8 under it, no
 * margin (the web column spaces its sections).
 */
export const SettingsSection: React.FC<{ label: string; first?: boolean; web?: boolean; pane?: boolean; children: React.ReactNode }> = ({ label, first, web, pane, children }) =>
  pane ? (
    // WP-MO.5 web (WP-MO Edit Profile Web): the section label (24 0 8, 13/20 700 caps #7D67D9 over the 1.5 #AEA1DC rule), then the rows in a card.
    <section aria-label={label}>
      <h2 style={{ margin: "24px 0 8px", paddingBottom: 8, borderBottom: "1.5px solid #AEA1DC", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7D67D9" }}>{label}</h2>
      <PaneRowCard>{children}</PaneRowCard>
    </section>
  ) : web ? (
    <section aria-label={label}>
      <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600, lineHeight: "16px", textTransform: "uppercase", letterSpacing: "0.14em", paddingBottom: 8, borderBottom: "1.5px solid #AEA1DC", color: "#71685E" }}>{label}</h2>
      <div>{children}</div>
    </section>
  ) : (
    <section style={{ marginTop: first ? 0 : 32 }}>
      <h2 style={{ fontSize: textPx(11), fontWeight: 600, lineHeight: "14px", textTransform: "uppercase", letterSpacing: "0.14em", paddingBottom: 7.5, borderBottom: `1.5px solid ${INK.pr}`, color: INK.chF }}>{label}</h2>
      <div>{children}</div>
    </section>
  );

/** WP-MO.5 web: the card around pane rows (white, the 8% border, r16, 0 16). */
export const PaneRowCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", borderRadius: 16, padding: "0 16px" }}>{children}</div>
);

/**
 * ui.js sRow. `right` is a node (a switch, a value) or the chevron when onClick is set.
 * `web` (WP-CA Calendar Extras Web): min 60, 8 0, gap 14, tile 40 r12 / 20, title 15/24 600, sub and value 13/20, the rule from 54; hover #FAF9FD.
 */
export const SettingsRow: React.FC<{
  icon?: LucideIcon;
  tile?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  value?: React.ReactNode;
  right?: React.ReactNode;
  last?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  muted?: boolean;
  web?: boolean;
  /** WP-MO.5 web (a row in PaneRowCard): min 56, gap 12, tile 32 r10 / 18 #5F5093, the title 15/24 600 with the sub 13/20 at the end, chevron 18 #9A94B3, the 6% rule. */
  pane?: boolean;
}> = ({ icon: Icon, tile, title, sub, value, right, last, onClick, ariaLabel, muted, web, pane }) => {
  const dark = useIsDark();
  if (pane) {
    const paneBody = (
      <>
        {(Icon || tile) && (
          <span className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 10, background: "#F0EDF9" }}>
            {tile ?? (Icon && <Icon size={18} strokeWidth={2} aria-hidden style={{ color: "#5F5093" }} />)}
          </span>
        )}
        <span className="flex-1 min-w-0 flex items-center justify-between" style={{ gap: 16 }}>
          <span style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, whiteSpace: "nowrap", color: muted ? "#71685E" : "#241F1B" }}>{title}</span>
          {(sub ?? value) !== undefined && <span className="min-w-0 truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{sub ?? value}</span>}
        </span>
        {right ?? (onClick ? <ChevronRight size={18} strokeWidth={2} aria-hidden style={{ color: "#9A94B3", flexShrink: 0 }} /> : null)}
      </>
    );
    const paneStyle: React.CSSProperties = { minHeight: 56, gap: 12, margin: "0 -16px", padding: "0 16px", width: "calc(100% + 32px)", boxSizing: "border-box", borderBottom: last ? "none" : "1px solid rgba(36,31,27,0.06)" };
    return onClick ? (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className="flex items-center text-start hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={paneStyle}>
        {paneBody}
      </button>
    ) : (
      <div className="flex items-center" style={paneStyle}>
        {paneBody}
      </div>
    );
  }
  if (web) {
    const webBody = (
      <>
        {(Icon || tile) && (
          <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: "#F0EDF9" }}>
            {tile ?? (Icon && <Icon size={20} strokeWidth={1.75} aria-hidden style={{ color: "#7D67D9" }} />)}
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block truncate" style={{ fontSize: 15, fontWeight: 600, lineHeight: "24px", color: muted ? "#71685E" : "#241F1B" }}>
            {title}
          </span>
          {sub && (
            <span className="block truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
              {sub}
            </span>
          )}
        </span>
        {value !== undefined && <span style={{ flexShrink: 0, whiteSpace: "nowrap", fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{value}</span>}
        {right ?? (onClick ? <ChevronRight size={16} strokeWidth={1.75} aria-hidden style={{ color: "#71685E", flexShrink: 0 }} /> : null)}
        {!last && <span aria-hidden className="absolute" style={{ bottom: 0, insetInlineStart: Icon || tile ? 54 : 0, insetInlineEnd: 0, height: 1, background: "rgba(36,31,27,0.06)" }} />}
      </>
    );
    const webStyle: React.CSSProperties = { gap: 14, padding: "8px 0", minHeight: 60, boxSizing: "border-box" };
    return onClick ? (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className="relative w-full flex items-center text-start hover:bg-[#FAF9FD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={webStyle}>
        {webBody}
      </button>
    ) : (
      <div className="relative flex items-center" style={webStyle}>
        {webBody}
      </div>
    );
  }
  const body = (
    <>
      {(Icon || tile) && (
        <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 11, background: dark ? "rgba(174,161,220,0.14)" : "#F0EDF9" }}>
          {tile ?? (Icon && <Icon size={17} strokeWidth={1.75} aria-hidden style={{ color: dark ? "#9A8CD6" : "#7D67D9" }} />)}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: textPx(14), fontWeight: 600, lineHeight: "20px", color: muted ? INK.chF : INK.ch }}>
          {title}
        </span>
        {sub && (
          <span className="block" style={{ marginTop: 1, fontSize: textPx(12), lineHeight: "16px", color: INK.chF, overflowWrap: "anywhere" }}>
            {sub}
          </span>
        )}
      </span>
      {value !== undefined && <span style={{ flexShrink: 0, fontSize: textPx(12.5), color: INK.chF }}>{value}</span>}
      {right ?? (onClick ? <ChevronRight size={16} strokeWidth={1.75} aria-hidden style={{ color: INK.chF, flexShrink: 0 }} /> : null)}
      {!last && <span aria-hidden className="absolute" style={{ bottom: 0, left: Icon || tile ? 50 : 0, insetInlineEnd: 0, height: 1, background: INK.b06 }} />}
    </>
  );
  const style: React.CSSProperties = { gap: 14, padding: "13px 0", minHeight: 44 };
  return onClick ? (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className="tap relative w-full flex items-center text-start" style={style}>
      {body}
    </button>
  ) : (
    <div className="relative flex items-center" style={style}>
      {body}
    </div>
  );
};

/** r6a popMenuInline: the CA18 choices drawn in the sheet. */
export const ChoiceCard: React.FC<{ title: string; sub?: string; on: boolean; onClick?: () => void; trailing?: React.ReactNode; disabled?: boolean }> = ({ title, sub, on, onClick, trailing, disabled }) => {
  const dark = useIsDark();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      disabled={disabled}
      className="tap w-full flex items-center text-start disabled:cursor-not-allowed"
      style={{
        gap: 9,
        borderRadius: 12,
        padding: 12,
        border: `1px solid ${on ? (dark ? "#9A8CD6" : "#AEA1DC") : dark ? "#31343C" : "#E5E6EB"}`,
        background: on ? (dark ? "#303141" : "#F0EDF9") : dark ? "#262932" : "#FAFAFB",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: textPx(14), fontWeight: on ? 700 : 600, color: INK.ch }}>
          {title}
        </span>
        {sub && (
          <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF }}>
            {sub}
          </span>
        )}
      </span>
      {trailing}
      {on && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={dark ? "#B7ABDE" : "#7D6BB5"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </button>
  );
};
