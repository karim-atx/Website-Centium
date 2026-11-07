import React, { useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarPlus, MessageCircle, MoreHorizontal, Plus, Tag } from "lucide-react";
import { useIsWide, useWebLayout, WEB_CONTENT_MAX } from "../../web/useWebLayout";
import { toneOf, type Tone } from "../client/clientFormat";
import { initialsOf } from "../home/initials";
import type { ProLane } from "../subtypeLanes";
import { placeBlocks, tabLayoutFor } from "./clientTabLayout";
import { ClientWebSizeContext, FC_WEB_SIZES, webSizes3 } from "../client/clientWebSizes";
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
        <ArrowLeft size={20} strokeWidth={2} aria-hidden style={{ color: "#5B5349" }} />
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

/** The items a tab renders, through any display:contents wrapper; closed or fixed overlays are left out. */
function tabItems(box: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const c of Array.from(box.children) as HTMLElement[]) {
    const cs = getComputedStyle(c);
    if (cs.display === "contents") out.push(...tabItems(c));
    else if (cs.display !== "none" && cs.position !== "fixed" && c.tagName !== "STYLE") out.push(c);
  }
  return out;
}

const headOf = (el: HTMLElement): string | null => {
  const h = el.tagName === "H2" ? el : el.firstElementChild?.tagName === "H2" ? el.firstElementChild : null;
  return h ? (h.textContent ?? "").trim() : null;
};

/**
 * WP-CL.1 / WP-CL.1 · NU / WP-CO-CL.1: the client page tab on the reference
 * files' column sets (clientTabLayout.ts). The repo's cards are placed into
 * blocks on a 12-column grid (8 on the rail for Nutrition and Clinical
 * overview) of 1px rows, each card's height measured, 24 between cards
 * unless the card above is a section head; re-placed when a card resizes or
 * the list changes. Full coaching Notes is one block: the toolbar row
 * (search 4fr | chips 5fr | Add a note, 16 apart, chips 4 equal 40 high) and
 * the notes 2 across (16).
 */
export const ClientTabGridWeb: React.FC<{ lane: ProLane; tab: string; children: React.ReactNode }> = ({ lane, tab, children }) => {
  const { rail } = useWebLayout();
  const ref = useRef<HTMLDivElement | null>(null);
  const notesRow = tabLayoutFor(lane, tab, false) === "notes-row";
  const [cols, setCols] = useState(12);

  useLayoutEffect(() => {
    const box = ref.current;
    if (!box || notesRow) return;
    let raf = 0;
    const watched = new Set<Element>();
    const ro = new ResizeObserver(() => schedule());
    const run = () => {
      raf = 0;
      const layout = tabLayoutFor(lane, tab, !!box.querySelector("[data-wpcl-locked]"));
      if (layout === "notes-row") return;
      const grid = layout.grid[rail ? 1 : 0];
      setCols(grid);
      const els = tabItems(box);
      const heads = new Set(els.map(headOf).filter((h): h is string => !!h));
      const members: number[][] = layout.blocks.map(() => []);
      let cur = 0;
      els.forEach((el, index) => {
        const b = layout.place({ el, head: headOf(el), text: (el.textContent ?? "").trim(), index }, { heads, rail });
        if (b !== undefined) cur = b;
        members[cur].push(index);
      });
      const spans = layout.blocks.map((b) => b.span[rail ? 1 : 0]);
      // Columns first (an item's height depends on its width), then rows.
      const ones = els.map(() => 1);
      placeBlocks(grid, spans, members, ones, ones).forEach((a, i) => {
        if (!a) return;
        els[i].style.gridColumn = `${a.col} / span ${a.span}`;
        // A bare link button (Change history) keeps its own width.
        if (els[i].tagName === "BUTTON" && !els[i].classList.contains("w-full")) els[i].style.justifySelf = "start";
      });
      const sizes = els.map((el) => {
        const cs = getComputedStyle(el);
        const mt = parseFloat(cs.marginTop) || 0;
        const mb = parseFloat(cs.marginBottom) || 0;
        return { h: el.getBoundingClientRect().height + mt + mb, mt, mb };
      });
      const gaps = els.map((_, i) => {
        const block = members.find((m) => m.includes(i)) ?? [];
        const k = block.indexOf(i);
        if (k <= 0) return 0;
        const prev = block[k - 1];
        // 24 between cards; none under a section head; 12 between the insights row and the groups (Client Web v4 gapOf).
        const list = (el: HTMLElement) => ["insights", "groups"].includes(el.getAttribute("data-wpcl") ?? "");
        const want = list(els[prev]) && list(els[i]) ? 12 : 24;
        return headOf(els[prev]) ? 0 : Math.max(0, want - sizes[prev].mb - sizes[i].mt);
      });
      placeBlocks(
        grid,
        spans,
        members,
        sizes.map((s) => s.h),
        gaps,
      ).forEach((a, i) => {
        if (a) els[i].style.gridRow = `${a.row} / span ${a.rows}`;
      });
      for (const el of els) {
        if (!watched.has(el)) {
          watched.add(el);
          ro.observe(el);
        }
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(run);
    };
    run();
    const mo = new MutationObserver(schedule);
    mo.observe(box, { childList: true, subtree: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, [lane, tab, rail, notesRow]);

  // The cards at their web sizes (kit.tsx ClientWebSizes).
  const sizes = lane === "full_coaching" ? FC_WEB_SIZES : webSizes3(rail);
  if (notesRow)
    return (
      <ClientWebSizeContext.Provider value={sizes}>
        <style>{NOTES_ROW_CSS}</style>
        <div data-pro-web="client-tab" className="wpcl-notes-row">
          {children}
        </div>
      </ClientWebSizeContext.Provider>
    );
  return (
    <ClientWebSizeContext.Provider value={sizes}>
      <div data-pro-web="client-tab" ref={ref} style={{ display: "grid", gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, columnGap: 24, rowGap: 0, gridAutoRows: 1, alignItems: "start" }}>
        {children}
      </div>
    </ClientWebSizeContext.Provider>
  );
};

const NOTES_ROW_CSS = [
  ".wpcl-notes-row{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,5fr) auto;column-gap:16px;align-items:center}",
  ".wpcl-notes-row>*{grid-column:1/-1}",
  ".wpcl-notes-row>button{justify-self:start}",
  ".wpcl-notes-row>label,.wpcl-notes-row>[role=tablist],.wpcl-notes-row>label+[role=tablist]+div{grid-column:auto;margin:0 0 24px!important}",
  ".wpcl-notes-row>[role=tablist]{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px!important}",
  ".wpcl-notes-row>[role=tablist]>button{height:40px;font-size:15px!important;padding:0 8px!important}",
  ".wpcl-notes-row>div.flex-col:has(>button){display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px!important;align-items:start}",
].join("");

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
