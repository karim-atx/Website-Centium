import React, { useId, useState } from "react";
import { ChevronDown, ChevronLeft, CircleAlert, CircleCheck, Loader, Star, WifiOff, type LucideIcon } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { initialsOf } from "./model";

// AN5 building blocks shared by every Team page and sheet (AnTeamV6 and
// TeamFlowsV4 values; classes in an5.css).

/** 30 / 36 / 52 avatar in the instructor's position colour (AnTeamV6 AV l.369). */
export const Avatar: React.FC<{ name: string; seat: number; size?: number; font?: number }> = ({ name, seat, size = 30, font }) => (
  <span
    className="an5-av"
    data-c={String((Math.max(1, seat) - 1) % 4)}
    style={{ width: size, height: size, fontSize: font ?? (size >= 52 ? 16 : size >= 36 ? 12 : 11) }}
    aria-hidden
  >
    {initialsOf(name)}
  </span>
);

/** Back row: 44 back (margin-left -10), crumb 11/700, title 18/800 (AN5-023 rows 10-13). */
export const PageHeader: React.FC<{ crumb: string; title: string; backLabel: string; onBack: () => void }> = ({ crumb, title, backLabel, onBack }) => (
  <div className="an5-back-row">
    <button type="button" className="an5-back tap" aria-label={backLabel} onClick={onBack}>
      <ChevronLeft size={20} aria-hidden />
    </button>
    <div className="min-w-0 flex-1">
      <p className="an5-crumb">{crumb}</p>
      <h2 className="an5-page-title">{title}</h2>
    </div>
  </div>
);

export interface HeadValue {
  v: string;
  l: string;
  d?: string;
  dTone?: "good" | "faint" | "soft";
  dash?: boolean;
}

/** Two-number header card + lead (`headMem`, AN5-023 rows 15-18). */
export const HeadCard: React.FC<{ cells: [HeadValue, HeadValue]; lead: React.ReactNode }> = ({ cells, lead }) => (
  <div className="an5-card an5-head">
    <div className="an5-head-grid">
      {cells.map((c, i) => (
        <React.Fragment key={c.l}>
          {i === 1 && <span className="an5-head-sep" aria-hidden />}
          <div className="an5-head-cell">
            <p className="an5-head-v">
              <b className={c.dash ? "is-dash" : undefined}>{c.v}</b>
              {c.d && (
                <span style={{ color: c.dTone === "good" ? "var(--an-good)" : c.dTone === "soft" ? "var(--an-ink-soft)" : "var(--an-faint)" }}>{c.d}</span>
              )}
            </p>
            <p className="an5-head-l">{c.l}</p>
          </div>
        </React.Fragment>
      ))}
    </div>
    <p className="an5-lead">{lead}</p>
  </div>
);

/** headOld: two small number cards + a 12.5 lead (performance / repeat, AnTeamV6 l.107-117). */
export const HeadOld: React.FC<{ cells: HeadValue[]; lead: React.ReactNode }> = ({ cells, lead }) => (
  <>
    <div className="an5-headold">
      {cells.map((c) => (
        <div key={c.l}>
          <p style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 5, flexWrap: "wrap" }}>
            <b className={c.dash ? "is-dash" : undefined}>{c.v}</b>
            {c.d && (
              <span style={{ fontSize: 10.5, fontWeight: 800, color: c.dTone === "good" ? "var(--an-good)" : "var(--an-faint)" }}>{c.d}</span>
            )}
          </p>
          <p>{c.l}</p>
        </div>
      ))}
    </div>
    <p className="an5-headold-lead">{lead}</p>
  </>
);

/** Question card: 10.5/800 uppercase question + 11/15 caption, children under (AN5-023 rows 19-21). */
export const QuestionCard: React.FC<{ q: string; cap?: string; children?: React.ReactNode; after?: React.ReactNode }> = ({ q, cap, children, after }) => (
  <div className="an5-card">
    <div className="an5-q-in">
      <p className="an5-q">{q}</p>
      {cap && <p className="an5-cap">{cap}</p>}
      {children}
    </div>
    {after}
  </div>
);

/** Collapsible section (AN5-023 row 29): closed by default, summary only while closed. */
export const Accordion: React.FC<{ title: string; summary: string; children: React.ReactNode }> = ({ title, summary, children }) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <div className="an5-acc">
      <button type="button" className="an5-acc-btn tap" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <span className="min-w-0">
          <span className="an5-acc-t block">{title}</span>
          {!open && <span className="an5-acc-sum block">{summary}</span>}
        </span>
        <span className="an5-acc-chev" style={{ transform: open ? "rotate(180deg)" : "none" }}>
          <ChevronDown size={16} strokeWidth={2.4} aria-hidden />
        </span>
      </button>
      <div id={id} className="an5-acc-body" style={{ maxHeight: open ? 900 : 0, transition: reduce ? "none" : undefined }} hidden={!open && reduce}>
        <div className="an5-acc-in">{children}</div>
      </div>
    </div>
  );
};

export const Rule: React.FC<{ icon: LucideIcon; color: string; title: string; sub: string }> = ({ icon: Icon, color, title, sub }) => (
  <div className="an5-rule">
    <span className="an5-rule-tile" style={{ color }}>
      <Icon size={16} strokeWidth={2.2} aria-hidden />
    </span>
    <span>
      <span className="an5-rule-t block">{title}</span>
      <span className="an5-rule-s block">{sub}</span>
    </span>
  </div>
);

/** Error / offline strip (AN5-001 O2 / O3). */
export const Strip: React.FC<{ offline?: boolean; text: string; onRetry?: () => void }> = ({ offline, text, onRetry }) => (
  <div className="an5-strip" role="alert">
    <span className="an5-strip-ic">{offline ? <WifiOff size={15} aria-hidden /> : <CircleAlert size={15} aria-hidden />}</span>
    <p className="an5-strip-t">{text}</p>
    {onRetry && !offline && (
      <button type="button" className="an5-strip-btn tap" onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
);

/** Inline green status (AN5-028 row 3), announced once. */
export const StatusLine: React.FC<{ text: string }> = ({ text }) => (
  <div className="an5-status" role="status">
    <span className="an5-status-ic">
      <CircleCheck size={17} strokeWidth={2.2} aria-hidden />
    </span>
    <p className="an5-status-t">{text}</p>
  </div>
);

/** Business sheet with the AN5 scope (AN5-012 rows 1-4). */
export const Sheet: React.FC<{ open: boolean; onClose: () => void; title: string; handle?: boolean; children: React.ReactNode }> = ({
  open,
  onClose,
  title,
  handle,
  children,
}) => (
  <BottomSheet open={open} onClose={onClose} title={title} tone="business" handle={handle} animateExit titleWrap>
    <div className="an-scope">{children}</div>
  </BottomSheet>
);

/** Lead row with an optional 40 r14 icon tile (AN5-017 row 2). */
export const LeadRow: React.FC<{ icon?: LucideIcon; tone?: "good" | "high" | "pale"; children: React.ReactNode }> = ({ icon: Icon, tone = "pale", children }) => (
  <div className="an5-leadrow">
    {Icon && (
      <span className={`an5-leadic is-${tone}`}>
        <Icon size={19} strokeWidth={2.2} aria-hidden />
      </span>
    )}
    <p className="an5-leadt">{children}</p>
  </div>
);

/** Rows card (AN5-022 row 3). */
export const RowsCard: React.FC<{ rows: { l: string; v: React.ReactNode; bold?: boolean }[] }> = ({ rows }) => (
  <div className="an5-rows">
    {rows.map((r) => (
      <div key={r.l} className={`an5-rowsr${r.bold ? " is-bold" : ""}`}>
        <span>{r.l}</span>
        <span>{r.v}</span>
      </div>
    ))}
  </div>
);

export interface Btn {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon?: LucideIcon;
  tone?: "fill" | "danger" | "soft";
  trailing?: React.ReactNode;
}

/** Footer buttons: outline (alt) left, fill right, grid 1fr 1.4fr (AN5-012 row 16). */
export const Buttons: React.FC<{ alt?: Btn; primary?: Btn; marginTop?: number }> = ({ alt, primary, marginTop }) => (
  <div className={`an5-btns${alt && primary ? "" : " is-one"}`} style={marginTop !== undefined ? { marginTop } : undefined}>
    {alt && (
      <button type="button" className="an5-btn is-outline tap" onClick={alt.onClick} disabled={alt.disabled}>
        {alt.icon && <alt.icon size={16} aria-hidden />}
        {alt.label}
      </button>
    )}
    {primary && (
      <button
        type="button"
        className={`an5-btn is-${primary.tone ?? "fill"} tap`}
        aria-disabled={primary.disabled || primary.busy || undefined}
        onClick={() => {
          if (!primary.disabled && !primary.busy) primary.onClick();
        }}
      >
        {primary.busy ? <Loader size={16} strokeWidth={2.2} className="an5-spin" aria-hidden /> : primary.icon && <primary.icon size={16} strokeWidth={2.2} aria-hidden />}
        {primary.label}
        {primary.trailing}
      </button>
    )}
  </div>
);

/** Five stars, the gold one clipped to (avg − i) × 100 % (AN5-040 row 6). */
export const Stars: React.FC<{ avg: number; size?: number }> = ({ avg, size = 18 }) => (
  <span className="an5-stars" aria-hidden>
    {[0, 1, 2, 3, 4].map((i) => (
      <span key={i} className="an5-star" style={{ width: size, height: size }}>
        <Star size={size} fill="var(--an-track)" stroke="none" />
        <span style={{ width: `${Math.max(0, Math.min(1, avg - i)) * 100}%` }}>
          <Star size={size} fill="var(--an-gold)" stroke="none" style={{ flexShrink: 0 }} />
        </span>
      </span>
    ))}
  </span>
);

/** "Couldn't load …" / offline line pattern used inside sheets. */
export const ErrLine: React.FC<{ text: string; id?: string }> = ({ text, id }) => (
  <p className="an5-err" id={id} role="alert">
    <CircleAlert size={14} aria-hidden />
    {text}
  </p>
);

export const Sk: React.FC<{ w: number | string; h: number; r?: number; className?: string; style?: React.CSSProperties }> = ({ w, h, r = 6, className, style }) => (
  <span className={`an5-sk an5-pulse block ${className ?? ""}`} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden />
);
