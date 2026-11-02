import type React from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, RotateCw } from "lucide-react";
import { t } from "../../../i18n/core";

// Small AN3 building blocks (AnClassesV6 template), styled by classes.css.

/** Section label + right caption (AN3-001 row 11). */
export const LabelRow: React.FC<{ label: string; caption: string }> = ({ label, caption }) => (
  <div className="an3-label-row">
    <h2 className="an3-label">{label}</h2>
    <p className="an3-caption">{caption}</p>
  </div>
);

/** A collapsible block (AN3-001 row 25, S6): grid-template-rows 0fr ↔ 1fr 0.32s, chevron 180. */
export const Coll: React.FC<{
  id: string;
  title: string;
  count?: string;
  line?: string;
  open: boolean;
  onToggle: () => void;
  padding?: string;
  children: React.ReactNode;
}> = ({ id, title, count, line, open, onToggle, padding, children }) => (
  <div className="an3-coll" style={padding ? { padding } : undefined}>
    <button type="button" className="an3-coll-head tap" aria-expanded={open} aria-controls={`an3-${id}`} onClick={onToggle}>
      <span className="an3-coll-title">{title}</span>
      {count && <span className="an3-coll-count">{count}</span>}
      <span className="an3-chev" style={{ transform: open ? "rotate(180deg)" : "none" }} aria-hidden>
        <ChevronDown size={16} />
      </span>
    </button>
    {line && <p className="an3-coll-line">{line}</p>}
    <div id={`an3-${id}`} className="an3-coll-body" style={{ gridTemplateRows: open ? "1fr" : "0fr" }} aria-hidden={!open} inert={!open}>
      <div>{children}</div>
    </div>
  </div>
);

/** A breakdown row's bar (AN3-001 rows 24a, 24c). */
export const Bar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => (
  <div className="an3-bar">
    <div style={{ width: `${Math.max(pct, 1.5)}%`, background: color }} />
    <span />
  </div>
);

/** The listing status row (AN3-006 row 16, AN3-008 row 22). */
export const ListingRow: React.FC<{
  listed: boolean;
  people: string;
  disabled?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}> = ({ listed, people, disabled, onClick, style }) => {
  const title = listed ? t("Listed on Explore") : t("Hidden from Explore");
  const act = listed ? t("Manage") : t("Turn on");
  const members = people === "members";
  const sub = listed ? (members ? t("Members can find you and book") : t("Clients can find you and book")) : members ? t("Turn it on so members can book") : t("Turn it on so clients can book");
  const Icon = listed ? Eye : EyeOff;
  return (
    <button
      type="button"
      className="an3-listing tap"
      onClick={onClick}
      disabled={disabled}
      aria-label={t("Listing status: {status}. {action}", { status: title, action: act })}
      style={style}
    >
      <span
        aria-hidden
        className="flex items-center justify-center shrink-0"
        style={{ width: 36, height: 36, borderRadius: 12, background: listed ? "var(--k-good-bg)" : "var(--k-track)", color: listed ? "var(--k-good)" : "var(--k-faint)" }}
      >
        <Icon size={17} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="an3-listing-title">
          <span aria-hidden className="shrink-0" style={{ width: 7, height: 7, borderRadius: 999, background: listed ? "var(--k-good)" : "var(--k-tert)" }} />
          {title}
        </span>
        <span className="an3-listing-sub">{sub}</span>
      </span>
      <span className="an3-listing-act" aria-hidden>
        {act}
        <ChevronRight size={14} />
      </span>
    </button>
  );
};


/** Error with Retry inside a card (AN3-001 O2). */
export const ErrorBody: React.FC<{ onRetry: () => void; disabled?: boolean }> = ({ onRetry, disabled }) => (
  <div className="an3-empty" role="alert">
    <p className="an3-empty-title">{t("Couldn't load your class numbers")}</p>
    <p className="an3-empty-body">{t("Check your connection and try again.")}</p>
    <button type="button" className="an3-retry tap" onClick={onRetry} disabled={disabled}>
      <RotateCw size={15} aria-hidden />
      {t("Retry")}
    </button>
  </div>
);

const Sk: React.FC<{ w: number | string; h: number; r?: number; style?: React.CSSProperties }> = ({ w, h, r = 6, style }) => (
  <div className="an3-skel animate-skeleton-pulse" style={{ width: w, height: h, borderRadius: r, ...style }} />
);

/** Loading (AN3-001 O1, AN3-006 O1): the card keeps its layout. */
export const LoadingBody: React.FC = () => (
  <div aria-busy="true" aria-label={t("Loading your class numbers")}>
    <div className="an3-fr">
      <Sk w="60%" h={11.5} />
      <Sk w={64} h={30} r={8} style={{ marginTop: 22 }} />
      <Sk w="100%" h={18} r={999} style={{ marginTop: 13, marginBottom: 28 }} />
    </div>
    <div className="an3-tabs-wrap">
      <Sk w="100%" h={50} r={16} />
    </div>
    <div className="an3-rows-wrap" style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 20 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center" style={{ gap: 10 }}>
          <Sk w={90} h={12} />
          <Sk w="100%" h={6} r={999} />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonRow: React.FC = () => <Sk w="100%" h={56} r={16} style={{ background: "var(--k-soft)" }} />;
