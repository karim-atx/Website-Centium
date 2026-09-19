import React from "react";

/** The Platform pillar rail's app-screenshot mockup — a browser-chrome frame
 *  (traffic-light dots + a fake URL bar) around a left icon rail and a
 *  content pane, replacing the old phone-shell mockups used elsewhere on
 *  the page. Regression fix: the pillar rail was previously reproduced with
 *  the hero's large phone shells at ~78px graphic scale; the actual handoff
 *  markup (`Centium Landing.dc.html`) uses this much more compact
 *  browser-window device at a fixed 430px max-width.
 *
 *  Chrome measurements (radius, shadow, header padding/gap, URL-pill size)
 *  are literal from the handoff's own browser-frame markup. Two literal
 *  values are deliberately NOT ported as-is, flagged rather than guessed at
 *  per this component's CLAUDE.md rule (unspecified/conflicting values get
 *  flagged, not approximated):
 *  - The icon rail is 96px wide with 11px/8px padding in the handoff; kept
 *    at 52px here because the interior content filling `children` (defined
 *    per-pillar in Home.tsx, out of this file's scope) is already laid out
 *    against a 430px-wide, 52px-rail card, and widening the rail without
 *    also touching that content would just cramp it.
 *  - The mock body is `min-height: 300px` in the handoff; kept at 196px
 *    here because the handoff's pane is nearly full viewport width (its
 *    sweep gallery panes are ~100vw each) while this card is capped at
 *    430px — at that narrower width the same content is far less dense, so
 *    300px would read as a mostly-empty card rather than a fuller one. */
export const BrowserMockup: React.FC<{
  border: string;
  headerBg: string;
  url: string;
  railActive: string;
  railInactive: string;
  children: React.ReactNode;
}> = ({ border, headerBg, url, railActive, railInactive, children }) => (
  <div className="flex justify-center w-full">
    <div
      className="w-full max-w-[430px] rounded-[16px] overflow-hidden bg-white"
      style={{ border: `1px solid ${border}`, boxShadow: "0 22px 50px rgba(72,58,130,.15)" }}
    >
      <div className="flex items-center gap-[9px] px-[11px] py-[6px]" style={{ borderBottom: `1px solid ${border}`, background: headerBg }}>
        <span className="flex gap-1 shrink-0">
          <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#E4DCF8" }} />
          <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#DDE8E5" }} />
          <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#E7E3DC" }} />
        </span>
        <span
          className="flex-1 min-w-0 h-[17px] rounded-full bg-white flex items-center px-[9px] text-[7.5px] font-bold text-mkt-faint overflow-hidden whitespace-nowrap"
          style={{ border: `1px solid ${border}` }}
        >
          {url}
        </span>
      </div>
      <div className="flex min-h-[196px]">
        <div className="w-[52px] shrink-0 flex flex-col gap-1.5 py-[9px] px-[7px]" style={{ borderRight: `1px solid ${border}` }}>
          <span className="h-[14px] rounded" style={{ background: railActive }} />
          <span className="h-[14px] rounded" style={{ background: railInactive }} />
          <span className="h-[14px] rounded" style={{ background: railInactive }} />
          <span className="h-[14px] rounded" style={{ background: railInactive }} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-[9px] py-[11px] px-[13px] text-left">{children}</div>
      </div>
    </div>
  </div>
);
