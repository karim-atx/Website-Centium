import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { Check, type LucideIcon } from "lucide-react";
import { BRAND, CTA_BG, INK, INK2, LAV, LIST_BG, MUTED, RULE, TINT, TONE, useWebDialogFocus, type WebTone } from "./deskWebTokens";

// Website viewport v1 · WB-FD Front desk (WB-FD Front Desk Web v4, the web
// token set): the parts the Front desk's web tabs share. The caps section
// label with its 1.5 lavender rule, the list card and its rows (60, tile 36
// r11, icon 20, 15/22 + 13/20, the 11/15 caps chip), the underline tabs, the
// 440 centred popup and the dashed empty card. Web only; the mobile kit
// (frontDeskKit.tsx) is not touched.

/** The caps label (13/20 600, 0.08em, #8C8378) over a 1.5 #AEA1DC rule, padding-bottom 7, margin 0 2 12. */
export const WebSectionLabel: React.FC<{ children: React.ReactNode; trailing?: React.ReactNode; style?: React.CSSProperties }> = ({ children, trailing, style }) => (
  <div style={{ flex: "none", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8, paddingBottom: 7, borderBottom: `1.5px solid ${LAV}`, margin: "0 2px 12px", ...style }}>
    <h2 style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED, whiteSpace: "nowrap" }}>{children}</h2>
    {trailing}
  </div>
);

/** The hour / group caption above a list card (13/20 600, margin 0 2 6). */
export const WebGroupCaption: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ margin: "0 2px 6px", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: MUTED }}>{children}</p>
);

/** The list card: #F7F7FC r18, padding 2 16. */
export const WebListCard: React.FC<{ children: React.ReactNode; label?: string }> = ({ children, label }) => (
  <div role="list" aria-label={label} style={{ borderRadius: 18, background: LIST_BG, padding: "2px 16px", display: "flex", flexDirection: "column" }}>
    {children}
  </div>
);

/** The status chip: 11/15 800, 0.04em caps, padding 3 8, r999. */
export const WebChip: React.FC<{ tone: WebTone; children: React.ReactNode }> = ({ tone, children }) => (
  <span className="rtl:tracking-normal" style={{ flex: "none", fontSize: 11, lineHeight: "15px", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 999, background: TONE[tone].bg, color: TONE[tone].ink, whiteSpace: "nowrap" }}>
    {children}
  </span>
);

/** A chip drawn as an action (Remind, Mark paid): the chip with a hover tint and a focus ring. */
export const WebChipButton: React.FC<{ tone: WebTone; label: string; ariaLabel: string; disabled?: boolean; onClick: () => void }> = ({ tone, label, ariaLabel, disabled, onClick }) => (
  <button
    type="button"
    aria-label={ariaLabel}
    aria-disabled={disabled || undefined}
    onClick={(e) => {
      e.stopPropagation();
      if (!disabled) onClick();
    }}
    className="rtl:tracking-normal hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
    style={{ flex: "none", fontSize: 11, lineHeight: "15px", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 999, background: TONE[tone].bg, color: TONE[tone].ink, whiteSpace: "nowrap", border: 0, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1 }}
  >
    {label}
  </button>
);

/**
 * A list row: min-height 60, padding 8 0, gap 12; the 36 tile (r11 #F0EDF9,
 * icon 20 / 1.75 #7D6BB5), title 15/22 700 and line 13/20 #8C8378 (one line,
 * ellipsis with a hover title); the divider starts at 48. With `onClick` the
 * row is a button with the hover tint (#F0EDF9, r12, padding 8 inside a -8
 * margin) and, while its menu is open, the tint stays.
 */
export const WebDeskRow: React.FC<{
  icon: LucideIcon;
  title: string;
  sub: string;
  trailing?: React.ReactNode;
  first?: boolean;
  onClick?: (el: HTMLElement) => void;
  ariaLabel?: string;
  menuOpen?: boolean;
}> = ({ icon: Icon, title, sub, trailing, first, onClick, ariaLabel, menuOpen }) => {
  const body = (
    <>
      {!first && <span aria-hidden style={{ position: "absolute", top: 0, insetInlineStart: onClick ? 56 : 48, insetInlineEnd: onClick ? 8 : 0, height: 1, background: RULE }} />}
      <span aria-hidden style={{ width: 36, height: 36, borderRadius: 11, background: TINT, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", color: BRAND }}>
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <span style={{ flex: 1, minWidth: 0, textAlign: "start" }}>
        <span title={title} style={{ display: "block", fontSize: 15, lineHeight: "22px", fontWeight: 700, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </span>
        <span title={sub} style={{ display: "block", fontSize: 13, lineHeight: "20px", color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {sub}
        </span>
      </span>
      {trailing}
    </>
  );
  if (!onClick) {
    return (
      <div role="listitem" style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "8px 0", boxSizing: "border-box" }}>
        {body}
      </div>
    );
  }
  return (
    <div role="listitem" style={{ position: "relative" }}>
      <div
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={!!menuOpen}
        onClick={(e) => onClick(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(e.currentTarget);
          }
        }}
        className="hover:!bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "8px", margin: "0 -8px", boxSizing: "border-box", borderRadius: 12, cursor: "pointer", background: menuOpen ? TINT : "transparent" }}
      >
        {body}
      </div>
    </div>
  );
};

/** The "None due" / "No entries yet today." line box (#F7F7FC r18, padding 14, 13/16 #8C8378, centred). */
export const WebListLine: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ borderRadius: 18, background: LIST_BG, padding: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, lineHeight: "16px", color: MUTED, textAlign: "center" }}>{children}</div>
);

/** The primary button: 44 (or 40 in the page header), padding 0 20 / 16, r14, #9A8CD6, 15/24 600, plus icon. */
export const WebPrimaryButton: React.FC<{ label: string; icon?: LucideIcon; onClick: () => void; size?: 40 | 44; disabled?: boolean; shadow?: string }> = ({ label, icon: Icon, onClick, size = 44, disabled, shadow }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="hover:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]"
    style={{ height: size, padding: size === 40 ? "0 16px" : "0 20px", borderRadius: 14, background: CTA_BG, color: "#FFFFFF", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", fontSize: 15, lineHeight: "24px", fontWeight: 600, border: 0, cursor: disabled ? "default" : "pointer", boxShadow: shadow ?? "0 6px 16px rgba(95,80,147,0.22)", transition: "transform .12s", flex: "none" }}
  >
    {Icon && <Icon size={size === 40 ? 18 : 20} strokeWidth={2.4} aria-hidden />}
    {label}
  </button>
);

/** The empty card: 1.5 dashed #AEA1DC r20, padding 40 24, tile 64 r14 (icon 28), title 22/30 800, body 15/24 #5B5349 (max 440), the CTA 20 below. */
export const WebEmptyCard: React.FC<{ icon: LucideIcon; title: string; body: string; children?: React.ReactNode; style?: React.CSSProperties; dashed?: string; radius?: number; tileRadius?: number }> = ({
  icon: Icon,
  title,
  body,
  children,
  style,
  dashed = `1.5px dashed ${LAV}`,
  radius = 20,
  tileRadius = 14,
}) => (
  <div data-web-empty style={{ boxSizing: "border-box", borderRadius: radius, border: dashed, padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", ...style }}>
    <span aria-hidden style={{ width: 64, height: 64, borderRadius: tileRadius, background: TINT, display: "flex", alignItems: "center", justifyContent: "center", color: BRAND }}>
      <Icon size={28} strokeWidth={1.75} />
    </span>
    <p style={{ margin: "12px 0 0", fontSize: 22, lineHeight: "30px", fontWeight: 800, color: INK }}>{title}</p>
    <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: "24px", color: INK2, maxWidth: 440 }}>{body}</p>
    {children && <div style={{ marginTop: 20 }}>{children}</div>}
  </div>
);

/**
 * The 440 centred popup (WB-FD v4 `popup`): the page dimmed
 * rgba(36,31,27,0.4); white r24, padding 24 24 18, centred; the 52 disc
 * (icon 24 / 2.2), title 20/28 800, body 15/24 #5B5349; anything extra; then
 * the 44 r14 confirm (15/700 white) and the 44 text button (15/700 #5B5349),
 * gap 4, 18 below. Esc and a click outside close it; the cancel button takes
 * focus first.
 */
export const WebPopup: React.FC<{
  open: boolean;
  onClose: () => void;
  icon: LucideIcon;
  tone: WebTone;
  title: string;
  body?: React.ReactNode;
  children?: React.ReactNode;
  confirm: { label: string; onClick: () => void; destructive?: boolean; disabled?: boolean };
  cancel: { label: string; onClick?: () => void };
}> = ({ open, onClose, icon: Icon, tone, title, body, children, confirm, cancel }) => {
  const panel = useRef<HTMLDivElement | null>(null);
  useWebDialogFocus(open, onClose, panel, "[data-popup-cancel]");
  if (!open) return null;
  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(36,31,27,0.4)", display: "grid", placeItems: "center" }}>
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        data-web-popup
        onClick={(e) => e.stopPropagation()}
        style={{ width: 440, maxWidth: "calc(100% - 32px)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", boxSizing: "border-box", background: "#FFFFFF", borderRadius: 24, padding: "24px 24px 18px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: "0 24px 60px rgba(36,31,27,0.2)", color: INK }}
      >
        <span aria-hidden style={{ width: 52, height: 52, borderRadius: 999, background: TONE[tone].bg, color: TONE[tone].ink, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon size={24} strokeWidth={2.2} />
        </span>
        <p style={{ margin: "12px 0 0", fontSize: 20, lineHeight: "28px", fontWeight: 800 }}>{title}</p>
        {body && <p style={{ margin: "6px 0 0", fontSize: 15, lineHeight: "24px", color: INK2, textWrap: "pretty" } as React.CSSProperties}>{body}</p>}
        {children}
        <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: 4, marginTop: 18 }}>
          <button
            type="button"
            onClick={confirm.onClick}
            disabled={confirm.disabled}
            className="disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]"
            style={{ height: 44, borderRadius: 14, background: confirm.destructive ? "#C0392B" : CTA_BG, color: "#FFFFFF", fontSize: 15, fontWeight: 700, border: 0, cursor: confirm.disabled ? "default" : "pointer" }}
          >
            {confirm.label}
          </button>
          <button
            type="button"
            data-popup-cancel
            onClick={cancel.onClick ?? onClose}
            className="hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
            style={{ minHeight: 44, borderRadius: 14, fontSize: 15, fontWeight: 700, color: INK2, background: "transparent", border: 0, cursor: "pointer" }}
          >
            {cancel.label}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * The underline tabs (section 2: 15/24, padding 7 0 8, full width): equal
 * columns over a 1px #EBEAF6 rule; the selected tab 800 #241F1B with a 2px
 * #AEA1DC underline, the others 600 #8C8378 (hover #241F1B). Arrow keys move
 * between tabs.
 */
export function WebUnderlineTabs<K extends string>({ tabs, value, onChange, label, idPrefix }: { tabs: { key: K; label: string }[]; value: K; onChange: (k: K) => void; label: string; idPrefix: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div role="tablist" aria-label={label} style={{ flex: "none", display: "grid", gridTemplateColumns: `repeat(${tabs.length},minmax(0,1fr))`, borderBottom: `1px solid ${RULE}`, marginBottom: 24 }}>
      {tabs.map((tb, i) => {
        const on = tb.key === value;
        return (
          <button
            key={tb.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tb.key}`}
            aria-selected={on}
            aria-controls={`${idPrefix}-panel-${tb.key}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(tb.key)}
            onKeyDown={(e) => {
              const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
              if (!dir) return;
              e.preventDefault();
              const rtl = document.documentElement.dir === "rtl";
              const next = (i + (rtl ? -dir : dir) + tabs.length) % tabs.length;
              refs.current[next]?.focus();
              onChange(tabs[next].key);
            }}
            className="hover:!text-[#241F1B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
            style={{ display: "flex", justifyContent: "center", padding: "7px 0 8px", marginBottom: -1, borderBottom: `2px solid ${on ? LAV : "transparent"}`, fontSize: 15, lineHeight: "24px", fontWeight: on ? 800 : 600, color: on ? INK : MUTED, whiteSpace: "nowrap", cursor: "pointer", background: "none", borderTop: 0, borderInline: 0 }}
          >
            {tb.label}
          </button>
        );
      })}
    </div>
  );
}

/** A grey pulse block for the loading states. */
export const WebPulse: React.FC<{ style?: React.CSSProperties }> = ({ style }) => <span aria-hidden className="block animate-skeleton-pulse" style={{ background: "#F1F0F5", borderRadius: 16, ...style }} />;

export interface WebMenuOption<V extends string = string> {
  value: V;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  note?: string;
}

/**
 * The anchored menu (section 3; WB-FD v4 `menu`): a white card 6 under its
 * trigger, lined up with the trigger's start (or end), content box `width`
 * with padding 8, r14, 1px rgba(174,161,220,0.5), the page dimmed
 * rgba(36,31,27,0.18). Optional caps heading (13/20 700, 0.1em). Rows padding
 * 11 × 12, r8, 15/22, 6 apart: #FAFAFB with a #E5E6EB border (500), the
 * selected one #F0EDF9 / #AEA1DC (700) with a 14 check; hover #F0EDF9.
 * Opens upward when less than 220 is left below. Esc closes, arrows move,
 * focus returns to the trigger.
 */
export function WebMenu<V extends string>({
  open,
  anchor,
  onClose,
  options,
  onSelect,
  selected,
  heading,
  width = 220,
  align = "end",
  label,
}: {
  open: boolean;
  anchor: HTMLElement | null;
  onClose: () => void;
  options: WebMenuOption<V>[];
  onSelect: (v: V) => void;
  selected?: V | null;
  heading?: string;
  width?: number;
  align?: "start" | "end";
  label?: string;
}) {
  const panel = useRef<HTMLDivElement | null>(null);
  useWebDialogFocus(open && !!anchor, onClose, panel, "[role=menuitem]:not([aria-disabled=true]), [role=menuitemradio]");
  if (!open || !anchor) return null;
  const r = anchor.getBoundingClientRect();
  const rtl = document.documentElement.dir === "rtl";
  const vw = window.innerWidth;
  const startEdge = rtl ? vw - r.right : r.left;
  const endEdge = rtl ? r.left : vw - r.right;
  const up = window.innerHeight - r.bottom < 220 && r.top > window.innerHeight - r.bottom;
  const pos: React.CSSProperties = {
    position: "fixed",
    ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    ...(align === "end" ? { insetInlineEnd: Math.max(8, endEdge) } : { insetInlineStart: Math.max(8, startEdge) }),
  };
  const move = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(panel.current?.querySelectorAll<HTMLElement>("[data-menu-row]:not([aria-disabled=true])") ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };
  return createPortal(
    <>
      <div onClick={onClose} aria-hidden style={{ position: "fixed", inset: 0, background: "rgba(36,31,27,0.18)", zIndex: 60 }} />
      <div
        ref={panel}
        role="menu"
        aria-label={label ?? heading}
        data-web-menu
        onKeyDown={move}
        style={{ ...pos, width, boxSizing: "content-box", background: "#FFFFFF", border: "1px solid rgba(174,161,220,0.5)", borderRadius: 14, boxShadow: "0 12px 32px rgba(95,80,147,0.18)", padding: 8, zIndex: 61 }}
      >
        {heading && <p className="rtl:tracking-normal" style={{ margin: "2px 4px 8px", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>{heading}</p>}
        {options.map((o, i) => {
          const on = selected !== undefined && selected === o.value;
          return (
            <button
              key={o.value}
              type="button"
              data-menu-row
              role={selected !== undefined ? "menuitemradio" : "menuitem"}
              aria-checked={selected !== undefined ? on : undefined}
              aria-disabled={o.disabled || undefined}
              onClick={() => {
                if (o.disabled) return;
                onSelect(o.value);
              }}
              className={o.disabled ? "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" : "hover:!bg-[#F0EDF9] hover:!border-[#AEA1DC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"}
              style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", boxSizing: "border-box", borderRadius: 8, padding: "11px 12px", marginTop: i ? 6 : 0, border: `1px solid ${on ? LAV : "#E5E6EB"}`, background: on ? TINT : "#FAFAFB", color: o.destructive ? "#C0392B" : INK, fontSize: 15, lineHeight: "22px", fontWeight: on ? 700 : 500, cursor: o.disabled ? "default" : "pointer", textAlign: "start", opacity: o.disabled ? 0.5 : 1 }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                {o.label}
                {o.note && <span style={{ display: "block", fontSize: 13, lineHeight: "18px", fontWeight: 500, color: MUTED }}>{o.note}</span>}
              </span>
              {on && <Check size={14} strokeWidth={3} aria-hidden style={{ color: BRAND }} />}
            </button>
          );
        })}
      </div>
    </>,
    document.body
  );
}
