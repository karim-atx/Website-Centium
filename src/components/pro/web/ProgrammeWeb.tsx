import React from "react";
import { Check, ChevronLeft, ChevronRight, Ellipsis, EllipsisVertical, Search, SlidersHorizontal, UserRound, type LucideIcon } from "lucide-react";
import type { Exercise } from "../../../types";
import { specCells } from "./programmeSpec";
import { useWebLayout } from "../../web/useWebLayout";
import { t } from "../../../i18n/core";

// Professional handover v1, WP-LI.3 to WP-LI.3.3 (WP-LI Programme Web v5,
// WP-LI Client Copy Web): the pieces shared by the programme detail, its
// Progress, the client's copy and the workout log on web.
//
// The header: 64 high, the 1px rgba(36,31,27,0.06) divider, 32 side margin
// (24 on the rail), 16 apart; the back square 40 (r12, #F5F5F6, 1px 10%), an
// optional caps eyebrow 13/20 700 .08em #8C8378 above the title (Progress,
// the client's copy) or beside it (the log, 12/16), the title 28/36 700
// −0.03em, the meta line 13/20 #8C8378 beside it (baseline), the primary
// action 40 (r14, 0 18, #9A8CD6, 15/24 600, the 20 icon), the green
// "Reviewed" 15/24 700 #3F9165 and the round ⋮ 40 (1px 11%).
// The body: up to 1280, 32 padding (24 on the rail).

export const ProgHeaderWeb: React.FC<{
  title: string;
  onBack: () => void;
  eyebrow?: string;
  /** The eyebrow sits beside the title (the workout log) instead of above it. */
  eyebrowInline?: boolean;
  meta?: string;
  cta?: { label: string; icon: LucideIcon; onClick: () => void; disabled?: boolean };
  reviewed?: boolean;
  /** Extra header content before the ⋮ (the workout log's review slot). */
  slot?: React.ReactNode;
  onMore?: (anchor: HTMLElement) => void;
  moreRef?: React.Ref<HTMLButtonElement>;
}> = ({ title, onBack, eyebrow, eyebrowInline, meta, cta, reviewed, slot, onMore, moreRef }) => {
  const { rail } = useWebLayout();
  const caps: React.CSSProperties = { margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#71685E" };
  return (
    <header className="flex items-center" style={{ height: 64, boxSizing: "border-box", gap: 16, paddingInline: rail ? 24 : 32, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
      <button
        type="button"
        onClick={onBack}
        aria-label={t("Back")}
        className="flex items-center justify-center shrink-0 hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: 12, background: "#F5F5F6", border: "1px solid rgba(36,31,27,0.10)" }}
      >
        <ChevronLeft size={20} strokeWidth={2} aria-hidden style={{ color: "#241F1B" }} />
      </button>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {eyebrow && !eyebrowInline && <p style={{ ...caps, fontSize: 13, lineHeight: "20px" }}>{eyebrow}</p>}
        <div className="flex min-w-0" style={{ gap: 16, alignItems: eyebrowInline ? "center" : "baseline" }}>
          <h1 className="truncate" style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.03em", color: "#241F1B" }}>
            {title}
          </h1>
          {eyebrow && eyebrowInline && <span className="min-w-0 truncate" style={{ ...caps, fontSize: 12, lineHeight: "16px" }}>{eyebrow}</span>}
          {meta && <span className="min-w-0 truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{meta}</span>}
        </div>
      </div>
      {cta && (
        <button
          type="button"
          onClick={cta.onClick}
          disabled={cta.disabled}
          className="flex items-center shrink-0 whitespace-nowrap hover:bg-[#8E7FD0] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]"
          style={{ height: 40, padding: "0 18px", borderRadius: 14, background: "#9A8CD6", color: "#FFFFFF", gap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
        >
          <cta.icon size={20} strokeWidth={2} aria-hidden />
          {cta.label}
        </button>
      )}
      {reviewed && (
        <span className="flex items-center shrink-0" style={{ gap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#1D744A" }}>
          <Check size={20} strokeWidth={2} aria-hidden />
          {t("Reviewed")}
        </span>
      )}
      {slot}
      {onMore && (
        <button
          ref={moreRef}
          type="button"
          aria-label={t("More")}
          onClick={(e) => onMore(e.currentTarget)}
          className="flex items-center justify-center shrink-0 hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: 999, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.11)" }}
        >
          <Ellipsis size={20} strokeWidth={2} aria-hidden style={{ color: "#5B5349" }} />
        </button>
      )}
    </header>
  );
};

export const ProgBodyWeb: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { rail } = useWebLayout();
  return (
    <div data-pro-web="programme" style={{ maxWidth: 1280, margin: "0 auto", boxSizing: "border-box", padding: rail ? 24 : 32 }}>
      {children}
    </div>
  );
};

/** The section head: caps 13/20 700 .08em #7D67D9 over the 1.5 #AEA1DC rule, 8 below the label, 16 to the content. */
export const CapsHeadWeb: React.FC<{ label: string; right?: string; onRight?: () => void; first?: boolean }> = ({ label, right, onRight, first = true }) => (
  <div className="flex items-end justify-between" style={{ paddingBottom: 8, borderBottom: "1.5px solid #AEA1DC", margin: first ? "0 0 16px" : "16px 0 16px" }}>
    <h2 className="whitespace-nowrap" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#7D67D9" }}>
      {label}
    </h2>
    {right && onRight && (
      <button type="button" onClick={onRight} className="flex items-center hover:underline" style={{ gap: 2, fontSize: 13, lineHeight: "16px", fontWeight: 700, color: "#5F5093" }}>
        {right}
        <ChevronRight size={16} strokeWidth={2.4} aria-hidden />
      </button>
    )}
  </div>
);

/** The initials disc: 40 (36 for past rows), #F0EDF9, 13 800 #5F5093. */
export const InitialsWeb: React.FC<{ name: string; size?: number; url?: string | null }> = ({ name, size = 40, url }) => {
  const ini = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return url ? (
    <img src={url} alt="" aria-hidden className="shrink-0 object-cover" style={{ width: size, height: size, borderRadius: 999 }} />
  ) : (
    <span aria-hidden className="flex items-center justify-center shrink-0" style={{ width: size, height: size, borderRadius: 999, background: "#F0EDF9", color: "#5F5093", fontSize: 13, fontWeight: 800 }}>
      {ini}
    </span>
  );
};

/** The empty panel: #FAFAFB r24, 1px 8%, the line 22/30 700, a 44 action (r16) 28 below, up to 360 wide. */
export const EmptyPanelWeb: React.FC<{ line: string; action?: { label: string; icon: LucideIcon; onClick: () => void; secondary?: boolean }; minHeight?: number }> = ({ line, action, minHeight = 360 }) => (
  <div className="flex flex-col items-center justify-center text-center" style={{ minHeight, boxSizing: "border-box", borderRadius: 24, background: "#FAFAFB", border: "1px solid rgba(36,31,27,0.08)", padding: 40 }}>
    <p style={{ margin: 0, maxWidth: 560, fontSize: 22, lineHeight: "30px", fontWeight: 700, color: "#241F1B", textWrap: "pretty" }}>{line}</p>
    {action && (
      <button
        type="button"
        onClick={action.onClick}
        className={`flex items-center justify-center w-full ${action.secondary ? "hover:border-[rgba(174,161,220,0.4)]" : "hover:bg-[#8E7FD0]"}`}
        style={{
          marginTop: 28,
          maxWidth: 360,
          height: 44,
          boxSizing: "border-box",
          borderRadius: 16,
          gap: 10,
          fontSize: 15,
          lineHeight: "24px",
          fontWeight: 600,
          background: action.secondary ? "#FFFFFF" : "#9A8CD6",
          color: action.secondary ? "#241F1B" : "#FFFFFF",
          border: action.secondary ? "1px solid rgba(36,31,27,0.11)" : "none",
        }}
      >
        <action.icon size={20} strokeWidth={2} aria-hidden />
        {action.label}
      </button>
    )}
  </div>
);

// ----- the spec strip (WP-LI.3) ---------------------------------------------

const SPEC_LABELS = () => [t("Sets"), t("Reps"), t("Weight"), t("RPE"), t("Tempo"), t("Rest")];

/**
 * One exercise card: #FFF, 1px #E4DFF5, r12, 12 20; the 24 number square
 * (r7, #F0EDF9, 12/16 700 #5F5093) and the name 17/24 700; the strip 8
 * below: 6 equal columns (3 + 3 on the rail), the value 17/24 700 with its
 * unit 13/20 #5B5349, the caps label 13/20 700 #7D67D9 4 below, divided by
 * 1px rgba(125,107,181,0.2).
 */
export const SpecCardWeb: React.FC<{ ex: Exercise; n: number }> = ({ ex, n }) => {
  const { rail } = useWebLayout();
  const cols = rail ? 3 : 6;
  const DIV = "1px solid rgba(125,107,181,0.2)";
  const labels = SPEC_LABELS();
  return (
    <div style={{ boxSizing: "border-box", background: "#FFFFFF", border: "1px solid #E4DFF5", borderRadius: 12, padding: "12px 20px" }}>
      <div className="flex items-center" style={{ gap: 12 }}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 24, height: 24, borderRadius: 7, background: "#F0EDF9", color: "#5F5093", fontSize: 12, lineHeight: "16px", fontWeight: 700 }}>
          {n}
        </span>
        <span className="min-w-0 truncate" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{ex.name}</span>
      </div>
      <div className="grid" style={{ marginTop: 8, gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
        {specCells(ex).map((parts, i) => {
          const first = i % cols === 0;
          const row2 = i >= cols;
          return (
            <div
              key={i}
              className="min-w-0 flex flex-col items-start"
              style={{
                paddingBlock: `${row2 ? 8 : 0}px ${cols === 3 && !row2 ? 8 : 0}px`,
                paddingInline: `${first ? 0 : 12}px 4px`,
                borderInlineStart: first ? "none" : DIV,
                borderTop: row2 ? DIV : "none",
              }}
            >
              <span className="flex items-baseline whitespace-nowrap" style={{ columnGap: 4 }}>
                {(parts ?? [{ n: "–" }]).map((p, j) => (
                  <span key={j} className="whitespace-nowrap">
                    <span style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: parts ? "#241F1B" : "#C9C2B8", fontVariantNumeric: "tabular-nums" }}>{p.n}</span>
                    {p.u && <span style={{ marginInlineStart: 2, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>{p.u}</span>}
                  </span>
                ))}
              </span>
              <span className="whitespace-nowrap" style={{ marginTop: 4, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#7D67D9" }}>
                {labels[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** A block (superset, AMRAP…): rgba(125,107,181,0.08), the 4 #7D6BB5 start rule, r16, 12 16 12 12; the heading 15/24 800 #5F5093 and its line 13/20 on one row (wrapping). */
export const BlockBandWeb: React.FC<{ heading: string; line: string; gap: number; children: React.ReactNode }> = ({ heading, line, gap, children }) => (
  <section aria-label={heading} className="flex flex-col" style={{ marginInline: -16, borderRadius: 16, background: "rgba(125,107,181,0.08)", borderInlineStart: "4px solid #7D6BB5", paddingBlock: 12, paddingInline: "12px 16px", gap }}>
    <div className="flex flex-wrap items-center justify-between" style={{ columnGap: 16 }}>
      <p className="whitespace-nowrap" style={{ margin: 0, fontSize: 15, lineHeight: "24px", fontWeight: 800, color: "#5F5093" }}>{heading}</p>
      <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{line}</p>
    </div>
    {children}
  </section>
);

// ----- the Library list on web (WP-LI.6, WP-LI Library Extras Web) ---------------

/** The page header: Library 28/36, the search 360 × 44 (260 on the rail), Filter 44 and the 44 primary action with its shadow. */
export const LibraryHeaderWeb: React.FC<{
  /** The page title (Library; the Nutrition lane's Meal plans). */
  title?: string;
  query: string;
  onQuery: (q: string) => void;
  placeholder: string;
  filter?: { on: boolean; onClick: (anchor: HTMLElement) => void };
  action: { label: string; icon: LucideIcon; onClick: () => void };
}> = ({ title, query, onQuery, placeholder, filter, action }) => {
  const { rail } = useWebLayout();
  return (
    <header className="flex items-center" style={{ height: 64, boxSizing: "border-box", gap: 12, paddingInline: rail ? 24 : 32, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
      <h1 className="flex-1 min-w-0 truncate" style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.03em", color: "#241F1B" }}>
        {title ?? t("Library")}
      </h1>
      <label className="flex items-center shrink-0 focus-within:border-[#AEA1DC]" style={{ width: rail ? 260 : 360, height: 44, boxSizing: "border-box", gap: 10, padding: "0 14px", borderRadius: 12, background: "#F5F5F6", border: "1px solid rgba(36,31,27,0.10)" }}>
        <Search size={16} strokeWidth={2} aria-hidden style={{ color: "#71685E", flexShrink: 0 }} />
        <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="flex-1 min-w-0 bg-transparent focus:outline-none placeholder:text-[#71685E]" style={{ fontSize: 15, lineHeight: "24px", color: "#241F1B" }} />
      </label>
      {filter && (
        <button
          type="button"
          aria-label={t("Filter")}
          aria-pressed={filter.on}
          onClick={(e) => filter.onClick(e.currentTarget)}
          className="flex items-center justify-center shrink-0 hover:bg-[#F0EDF9]"
          style={{ width: 44, height: 44, boxSizing: "border-box", borderRadius: 12, background: filter.on ? "#F0EDF9" : "#F5F5F6", border: `1px solid ${filter.on ? "#AEA1DC" : "rgba(36,31,27,0.10)"}` }}
        >
          <SlidersHorizontal size={20} strokeWidth={1.75} aria-hidden style={{ color: filter.on ? "#5F5093" : "#5B5349" }} />
        </button>
      )}
      <button
        type="button"
        onClick={action.onClick}
        className="flex items-center shrink-0 whitespace-nowrap hover:bg-[#8E7FD0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]"
        style={{ height: 44, padding: "0 18px", borderRadius: 14, background: "#9A8CD6", color: "#FFFFFF", gap: 8, fontSize: 15, fontWeight: 700, boxShadow: "0 10px 24px rgba(95,80,147,0.28)" }}
      >
        <action.icon size={20} strokeWidth={2} aria-hidden />
        {action.label}
      </button>
    </header>
  );
};

/** The Programmes / Workouts / Exercises chips: 3 equal, 44 high, 8 apart, 20 below; on #9A8CD6 700, off white 600 with the 11% border. */
export const LibraryChipsWeb = <K extends string>({ items, active, onChange }: { items: { key: K; label: string }[]; active: K; onChange: (k: K) => void }) => (
  <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length},minmax(0,1fr))`, gap: 8, marginBottom: 20 }}>
    {items.map((it) => {
      const on = it.key === active;
      return (
        <button
          key={it.key}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(it.key)}
          className="flex items-center justify-center whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ height: 44, boxSizing: "border-box", padding: "0 13px", borderRadius: 999, fontSize: 15, lineHeight: "20px", fontWeight: on ? 700 : 600, background: on ? "#9A8CD6" : "#FFFFFF", color: on ? "#FFFFFF" : "#5B5349", border: `1px solid ${on ? "#9A8CD6" : "rgba(36,31,27,0.11)"}` }}
        >
          {it.label}
        </button>
      );
    })}
  </div>
);

/** A workout card: r20, 1px 8%, 24, 176 high (168 on the rail), the 52 tile (r16, the folder colour at 14%), the title 17/24 700, the line 13/20, the chip 12/16 700, ⋮ 44 at the top end. */
export const WorkoutCardWeb: React.FC<{ icon: LucideIcon; colour?: string; title: string; sub: string; chip: { label: string; template: boolean } | null; extra?: React.ReactNode; onOpen: () => void; onMenu?: (anchor: HTMLElement) => void }> = ({ icon: Icon, colour, title, sub, chip, extra, onOpen, onMenu }) => {
  const { rail } = useWebLayout();
  const col = colour ?? "#7D67D9";
  const n = parseInt(col.slice(1), 16);
  const tintBg = /^#[0-9a-f]{6}$/i.test(col) ? `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0.14)` : "#F0EDF9";
  return (
    <div className="relative min-w-0 flex flex-col hover:bg-[#FAFAFB]" style={{ boxSizing: "border-box", gap: 16, borderRadius: 20, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", padding: 24, minHeight: rail ? 168 : 176 }}>
      <button type="button" onClick={onOpen} className="flex flex-col items-start text-start flex-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ gap: 16 }}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 52, height: 52, borderRadius: 16, background: tintBg }}>
          <Icon size={24} strokeWidth={1.75} aria-hidden style={{ color: col }} />
        </span>
        <span className="flex-1 min-w-0 flex flex-col" style={{ paddingInlineEnd: 32 }}>
          <span style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B", overflowWrap: "anywhere" }}>{title}</span>
          <span style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{sub}</span>
          {chip && (
            <span className="flex" style={{ gap: 5, marginTop: 10 }}>
              <span className="whitespace-nowrap" style={{ fontSize: 12, lineHeight: "16px", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: chip.template ? "#F5F5F6" : "#F0EDF9", color: chip.template ? "#71685E" : "#5F5093" }}>{chip.label}</span>
            </span>
          )}
          {extra}
        </span>
      </button>
      {onMenu && (
        <button
          type="button"
          aria-label={t("Options for {title}", { title })}
          onClick={(e) => onMenu(e.currentTarget)}
          className="absolute flex items-center justify-center hover:bg-[#F5F5F6]"
          style={{ top: 12, insetInlineEnd: 12, width: 44, height: 44, borderRadius: 999 }}
        >
          <EllipsisVertical size={16} strokeWidth={2} aria-hidden style={{ color: "#71685E" }} />
        </button>
      )}
    </div>
  );
};

/** WP-LI Library Web v2's section head: 13/20 700 .08em caps #7D67D9 over the 1.5 #AEA1DC rule (8 below the label, 16 under the rule); the link 15/20 600 #5F5093. */
export const LibSectionHeadWeb: React.FC<{ label: string; right?: string; onRight?: () => void }> = ({ label, right, onRight }) => (
  <div className="flex items-end justify-between" style={{ gap: 12, paddingBottom: 8, borderBottom: "1.5px solid #AEA1DC", marginBottom: 16 }}>
    <h2 style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#7D67D9" }}>{label}</h2>
    {right && (
      <button type="button" onClick={onRight} className="shrink-0 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]" style={{ fontSize: 15, lineHeight: "20px", fontWeight: 600, color: "#5F5093" }}>
        {right}
      </button>
    )}
  </div>
);

/** WP-LI.1 Assigned to clients on web: one card (r20, padding 0 24); rows 10 0 with the 44 tile (r11, #F0EDF9), 17/24 700 and 13/20, the ring at the end; "All assignments" 15/24 600 under a rule (16 0 20). */
export const AssignedListWeb: React.FC<{
  rows: { key: string; title: string; line?: string; trailing: React.ReactNode; onClick: () => void }[];
  more?: { label: string; onClick: () => void };
}> = ({ rows, more }) => (
  <div className="flex flex-col" style={{ boxSizing: "border-box", borderRadius: 20, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", padding: "0 24px" }}>
    {rows.map((r, i) => (
      <button key={r.key} type="button" onClick={r.onClick} className="flex items-center text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]" style={{ gap: 16, padding: "10px 0", borderBottom: i < rows.length - 1 ? "1px solid rgba(36,31,27,0.06)" : "none" }}>
        <span className="flex shrink-0 items-center justify-center" style={{ width: 44, height: 44, borderRadius: 11, background: "#F0EDF9" }}>
          <UserRound size={20} strokeWidth={1.75} aria-hidden style={{ color: "#7D67D9" }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B", overflowWrap: "anywhere" }}>{r.title}</span>
          {r.line && <span className="block" style={{ marginTop: 2, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>{r.line}</span>}
        </span>
        {r.trailing}
      </button>
    ))}
    {more && (
      <button type="button" onClick={more.onClick} className="flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]" style={{ gap: 2, padding: "16px 0 20px", fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#5F5093", borderTop: rows.length ? "1px solid rgba(36,31,27,0.06)" : "none" }}>
        {more.label}
        <ChevronRight size={16} strokeWidth={2.4} aria-hidden />
      </button>
    )}
  </div>
);
