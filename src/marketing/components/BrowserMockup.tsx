import React from "react";

/** The Platform pillar rail's app-screenshot mockup — a browser-chrome frame
 *  (traffic-light dots + a fake URL bar) around a left icon rail and a
 *  content pane, replacing the old phone-shell mockups used elsewhere on
 *  the page. Regression fix: the pillar rail was previously reproduced with
 *  the hero's large phone shells at ~78px graphic scale; the actual handoff
 *  markup (`Centium Landing.dc.html`) uses this much more compact
 *  browser-window device at a fixed 430px max-width. */
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
      className="w-full max-w-[430px] rounded-[14px] overflow-hidden bg-white"
      style={{ border: `1px solid ${border}`, boxShadow: "0 20px 46px rgba(72,58,130,.14)" }}
    >
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${border}`, background: headerBg }}>
        <span className="flex gap-1 shrink-0">
          <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#E4DCF8" }} />
          <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#DDE8E5" }} />
          <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#E7E3DC" }} />
        </span>
        <span
          className="flex-1 min-w-0 h-[15px] rounded-full bg-white flex items-center px-2 text-[7.5px] font-bold text-mkt-faint overflow-hidden whitespace-nowrap"
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
