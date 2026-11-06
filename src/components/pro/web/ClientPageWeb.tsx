import React, { useRef } from "react";
import { ArrowLeft, CalendarPlus, MessageCircle, MoreHorizontal, Plus, Tag } from "lucide-react";
import { useIsWide, useWebLayout, WEB_CONTENT_MAX } from "../../web/useWebLayout";
import { toneOf, type Tone } from "../client/clientFormat";
import { initialsOf } from "../home/initials";
import { t } from "../../../i18n/core";

// Professional handover v1, WP-CL.1 / WP-CL.1 · NU / WP-CO-CL.1 (WP-CL Client
// Web v4, WP-CL Nutrition Client Web, WP-CO Patient Web): the client and
// patient page from 1024px. A 64 bar (back 40, the "Clients" kicker, Message,
// Schedule and ⋮ as 40 round buttons), the hero (photo 4, name 5, Dietary
// needs 3, 150 high), the six equal tabs (track #F3F3FD, 40), then the tab's
// own cards laid out across the page. The tabs' contents are the repo's.
// Mobile keeps ClientHeader and its scrolling tabs.

export const ClientTopBarWeb: React.FC<{
  kicker: string;
  onBack: () => void;
  onMessage: () => void;
  onSchedule: () => void;
  onMore: (el: HTMLElement) => void;
}> = ({ kicker, onBack, onMessage, onSchedule, onMore }) => {
  const { rail } = useWebLayout();
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const round = "flex items-center justify-center hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]";
  const roundStyle: React.CSSProperties = { height: 40, boxSizing: "border-box", padding: "0 16px", borderRadius: 999, border: "1px solid rgba(36,31,27,0.11)", gap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#5B5349" };
  return (
    <header className="flex items-center" style={{ height: 64, boxSizing: "border-box", gap: 12, paddingInline: rail ? 24 : 32, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
      <button type="button" onClick={onBack} aria-label={t("Back")} className={`${round} shrink-0`} style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: 999, border: "1px solid rgba(36,31,27,0.11)" }}>
        <ArrowLeft size={20} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" style={{ color: "#5B5349" }} />
      </button>
      <p className="flex-1" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#8C8378" }}>
        {kicker}
      </p>
      <div className="flex" style={{ gap: 10 }}>
        <button type="button" onClick={onMessage} className={round} style={roundStyle}>
          <MessageCircle size={20} strokeWidth={2} aria-hidden />
          {t("Message")}
        </button>
        <button type="button" onClick={onSchedule} className={round} style={roundStyle}>
          <CalendarPlus size={20} strokeWidth={2} aria-hidden />
          {t("Schedule")}
        </button>
        <button
          ref={moreRef}
          type="button"
          aria-label={t("More")}
          aria-haspopup="menu"
          onClick={() => moreRef.current && onMore(moreRef.current)}
          className={round}
          style={{ ...roundStyle, padding: 0, width: 40 }}
        >
          <MoreHorizontal size={20} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </header>
  );
};

/** The page body: 32 (24) padding, the 2.1 width cap. */
export const ClientPageBodyWeb: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { rail } = useWebLayout();
  return (
    <div data-pro-web="client-page" style={{ maxWidth: WEB_CONTENT_MAX, boxSizing: "border-box", padding: rail ? 24 : 32 }}>
      {children}
    </div>
  );
};

/**
 * The hero, 150 high on a 12-column grid (8 on the rail): the photo 4 (r24,
 * initials 64/72 800 without one), the name 40/48 700 with the status pill
 * 12/16 caps, the since line 15/24, tags 32 (r9) and the dashed + Tag; the
 * Dietary needs card 3 (the repo card).
 */
export const ClientHeroWeb: React.FC<{
  name: string;
  avatarUrl: string | null | undefined;
  isNew: boolean;
  status: { label: string; tone: Tone };
  since: string;
  tags: string[];
  onTags: () => void;
  diet: React.ReactNode;
}> = ({ name, avatarUrl, isNew, status, since, tags, onTags, diet }) => {
  const { rail } = useWebLayout();
  const pill = toneOf(status.tone);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${rail ? 8 : 12},minmax(0,1fr))`, columnGap: 24, minHeight: 150, marginBottom: 24 }}>
      <div className="relative overflow-hidden" style={{ gridColumn: `span ${rail ? 2 : 4}`, minWidth: 0, borderRadius: 24, background: isNew ? "#E4EEF7" : "#F0EDF9", minHeight: 150 }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div aria-hidden className="absolute inset-0 flex items-center justify-center" style={{ color: isNew ? "#4F7FA8" : "#5F5093", fontSize: 64, lineHeight: "72px", fontWeight: 800, letterSpacing: "-0.02em" }}>
            {initialsOf(name)}
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center" style={{ gridColumn: `span ${rail ? 3 : 5}`, minWidth: 0, gap: 4 }}>
        <div className="flex items-center min-w-0" style={{ gap: 14 }}>
          <h1 className="truncate" title={name} style={{ margin: 0, fontSize: 40, lineHeight: "48px", fontWeight: 700, letterSpacing: "-0.02em", color: "#241F1B" }}>
            {name}
          </h1>
          <span className="shrink-0" style={{ fontSize: 12, lineHeight: "16px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", background: pill.bg, color: pill.ink }}>
            {status.label}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>{since}</p>
        <div className="flex flex-wrap" style={{ gap: 8, marginTop: 8 }}>
          {tags.map((g) => (
            <button
              key={g}
              type="button"
              onClick={onTags}
              className="inline-flex items-center hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
              style={{ height: 32, boxSizing: "border-box", gap: 6, padding: "0 12px", borderRadius: 9, background: "#F0EDF9", color: "#5F5093", fontSize: 13, fontWeight: 700 }}
            >
              <Tag size={16} strokeWidth={2} aria-hidden />
              {g}
            </button>
          ))}
          <button
            type="button"
            onClick={onTags}
            className="inline-flex items-center hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
            style={{ height: 32, boxSizing: "border-box", gap: 4, padding: "0 12px", borderRadius: 9, border: "1px dashed rgba(36,31,27,0.18)", color: "#8C8378", fontSize: 13, fontWeight: 700 }}
          >
            <Plus size={16} strokeWidth={2.4} aria-hidden />
            {t("Tag")}
          </button>
        </div>
      </div>
      <div style={{ gridColumn: "span 3", minWidth: 0 }}>{diet}</div>
    </div>
  );
};

/** The six page tabs: equal segments on the #F3F3FD track (40, padding 5, r14), 15/24 600; selected #A79AD5 with white text. */
export const ClientTabsWeb: React.FC<{ items: { key: string; label: string }[]; active: string; onChange: (key: string) => void; label: string }> = ({ items, active, onChange, label }) => (
  <div
    role="tablist"
    aria-label={label}
    style={{ height: 40, boxSizing: "border-box", display: "grid", gridTemplateColumns: `repeat(${items.length},minmax(0,1fr))`, gap: 4, padding: 5, borderRadius: 14, background: "#F3F3FD", marginBottom: 24 }}
  >
    {items.map((it) => {
      const on = it.key === active;
      return (
        <button
          key={it.key}
          type="button"
          role="tab"
          aria-selected={on}
          tabIndex={on ? 0 : -1}
          onClick={() => onChange(it.key)}
          onKeyDown={(e) => {
            const i = items.findIndex((x) => x.key === active);
            const rtl = document.documentElement.dir === "rtl";
            const step = e.key === "ArrowRight" ? (rtl ? -1 : 1) : e.key === "ArrowLeft" ? (rtl ? 1 : -1) : 0;
            if (!step) return;
            e.preventDefault();
            const next = items[(i + step + items.length) % items.length];
            onChange(next.key);
            requestAnimationFrame(() => (document.querySelector(`[role=tab][data-key="${next.key}"]`) as HTMLElement | null)?.focus());
          }}
          data-key={it.key}
          className="flex items-center justify-center truncate focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]"
          style={{ borderRadius: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#A79AD5" : "transparent", color: on ? "#FFFFFF" : "#5F5093", paddingInline: 8 }}
        >
          {it.label}
        </button>
      );
    })}
  </div>
);

/**
 * The tab's own cards across the page: three columns for Overview (4 + 4 + 4
 * at 1440; two on the rail), two for the other tabs. The cards keep their
 * order, top to bottom, column by column, and never split. At 1920 and wider
 * one more column (section 2.1).
 */
export const ClientTabBodyWeb: React.FC<{ columns: number; children: React.ReactNode }> = ({ columns, children }) => {
  const wide = useIsWide();
  return (
  <>
    <style>{".wpcl-tab>*:only-child{display:contents}.wpcl-tab>*,.wpcl-tab>*:only-child>*{break-inside:avoid}"}</style>
    <div data-pro-web="client-tab" className="wpcl-tab" style={{ columnCount: wide ? columns + 1 : columns, columnGap: 24 }}>
      {children}
    </div>
  </>
  );
};
