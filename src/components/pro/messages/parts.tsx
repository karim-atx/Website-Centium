import React from "react";
import { ChevronLeft, Search } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { linePx, textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { TAB_LABEL, type ProTab } from "./messagesModel";

/**
 * Release 3 · MO22 v5 building blocks, literal from gen/r19.js (messages19
 * wrapping messages18 with msgTabs19, secLab19, row19) and gen/lib.js tokens.
 */

/**
 * messages19's head: the back 36 (-7 in, chevron 18 / 2 text.soft), 8 to the
 * title 24 / 700 -0.03em; the round buttons on the right; 16 below.
 */
export const MessagesHead: React.FC<{ title: string; onBack: () => void; right?: React.ReactNode }> = ({ title, onBack, right }) => (
  <div className="flex items-center justify-between" style={{ marginBottom: 16, gap: 8 }}>
    <div className="flex items-center min-w-0" style={{ gap: 8 }}>
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="tap relative flex items-center justify-center shrink-0 before:absolute before:-inset-1 before:content-['']"
        style={{ width: 36, height: 36, marginLeft: -7 }}
      >
        <ChevronLeft size={18} strokeWidth={2} style={{ color: INK.chS }} aria-hidden />
      </button>
      <h1 className="truncate" style={{ fontSize: textPx(24), fontWeight: 700, letterSpacing: "-0.03em", color: INK.ch, lineHeight: 1.25 }}>
        {title}
      </h1>
    </div>
    {right && (
      <div className="flex items-center shrink-0" style={{ gap: 8 }}>
        {right}
      </div>
    )}
  </div>
);

/**
 * msgTabs19: track r16 pad 6 gap 5 (tabTrack #F3F3FD / #242730), 16 below;
 * each tab min 40, pad 0 6, r12, 14 / 700, gap 6 to a 6 unread dot (#8F68F6)
 * on an inactive tab with unread messages; active #A79AD5 / #A991FE with
 * #FFFFFF / #0D0B1A ink, idle #F5F4FE / #2B2C3A with #6D50D3 / #B7ABDE.
 */
export const MsgTabs: React.FC<{ tabs: ProTab[]; active: ProTab; unread: Partial<Record<ProTab, boolean>>; onChange: (t: ProTab) => void }> = ({ tabs, active, unread, onChange }) => {
  const dark = useIsDark();
  return (
    <div role="tablist" aria-label="Conversations" className="flex items-center no-scrollbar" style={{ overflowX: "auto", background: dark ? "#242730" : "#F3F3FD", borderRadius: 16, padding: 6, gap: 5, marginBottom: 16 }}>
      {tabs.map((t) => {
        const on = t === active;
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t)}
            // Labels never truncate: with Businesses as a fourth tab at 360 and
            // Larger text, the track scrolls sideways instead (OURS).
            className="tap flex items-center justify-center whitespace-nowrap"
            style={{
              flex: "1 0 0",
              minWidth: "max-content",
              minHeight: 40,
              padding: "0 6px",
              borderRadius: 12,
              gap: 6,
              fontSize: textPx(14),
              fontWeight: 700,
              background: on ? (dark ? "#A991FE" : "#A79AD5") : dark ? "#2B2C3A" : "#F5F4FE",
              color: on ? (dark ? "#0D0B1A" : "#FFFFFF") : dark ? "#B7ABDE" : "#6D50D3",
            }}
          >
            <span>{TAB_LABEL[t]}</span>
            {!on && unread[t] && <span aria-label="Unread" className="rounded-full shrink-0" style={{ width: 6, height: 6, background: "#8F68F6" }} />}
          </button>
        );
      })}
    </div>
  );
};

/** gen/ui.js field (placeholder "Search", lead search 15 / 2 text.faint): 40 tall, r12, soft fill, 1px 10% border, pad 0 12, gap 8, 14. */
export const SearchField: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <label data-search-field="" className="flex items-center" style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", gap: 8 }}>
    <Search size={15} strokeWidth={2} style={{ color: INK.chF }} className="shrink-0" aria-hidden />
    <span className="sr-only">Search messages and chats</span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search"
      className="flex-1 min-w-0 bg-transparent focus:outline-none placeholder:text-charcoal-faint"
      style={{ fontSize: textPx(14), color: INK.ch }}
    />
  </label>
);

/** secLab19: 11 / 600 on 14, 0.14em caps text.faint; 24 above (not the first), 8 in, 4 below. */
export const SecLabel: React.FC<{ first?: boolean; children: React.ReactNode }> = ({ first, children }) => (
  <h2 style={{ fontSize: textPx(11), fontWeight: 600, lineHeight: linePx(14), letterSpacing: "0.14em", textTransform: "uppercase", color: INK.chF, margin: `${first ? 0 : 24}px 8px 4px` }}>{children}</h2>
);

/** messages19's footnote: 12 / 1.5 text.faint, 20 above, 8 in. */
export const Footnote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ fontSize: textPx(12), lineHeight: 1.5, color: INK.chF, margin: "20px 8px 0" }}>{children}</p>
);
