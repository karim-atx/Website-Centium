import React from "react";

export interface RailItem {
  label: string;
  active?: boolean;
}

/** The Platform pillar rail's app-screenshot mockup — a browser-chrome frame
 *  (traffic-light dots + a fake URL bar) around a left icon rail and a
 *  content pane.
 *
 *  Regression fix: this previously rendered at a fixed 430px max-width,
 *  squeezed beside a text column inside PillarRail's pane. The handoff's own
 *  `data-pane-figure` is `width:100%` on a pane that spans the full rail
 *  card (~1100px), stacked *below* the pillar's h3, not beside it — so this
 *  device is meant to render near-full-card-width. That squeeze is also what
 *  forced the rail down to 52px/no-labels and the body down to a 196px
 *  floor in an earlier round; both are restored to their literal values
 *  (96px labelled rail, 300px floor) now that PillarRail.tsx renders this
 *  full width instead of in a two-column grid. */
export const BrowserMockup: React.FC<{
  border: string;
  headerBg: string;
  url: string;
  railActive: string;
  railInactiveDot: string;
  railInk: string;
  railItems: RailItem[];
  children: React.ReactNode;
}> = ({ border, headerBg, url, railActive, railInactiveDot, railInk, railItems, children }) => (
  <div
    className="w-full rounded-[16px] overflow-hidden bg-white"
    style={{ border: `1px solid ${border}`, boxShadow: "0 22px 50px rgba(72,58,130,.15)" }}
  >
    <div className="flex items-center gap-[9px] px-[11px] py-[6px]" style={{ borderBottom: `1px solid ${border}`, background: headerBg }}>
      <span className="flex gap-1 shrink-0">
        <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#E4DCF8" }} />
        <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#DDE8E5" }} />
        <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#E7E3DC" }} />
      </span>
      <span
        className="flex-1 min-w-0 h-[17px] rounded-full bg-white flex items-center px-[9px] text-[12px] font-bold overflow-hidden whitespace-nowrap"
        style={{ border: `1px solid ${border}`, color: "#6B6358" }}
      >
        {url}
      </span>
    </div>
    <div data-mock-body className="flex min-h-[300px]">
      <div data-mock-rail className="w-[96px] shrink-0 flex flex-col gap-[5px] py-[11px] px-[8px]" style={{ borderRight: `1px solid ${border}`, background: "#FCFBFE" }}>
        {railItems.map((item) => (
          <span
            key={item.label}
            className="flex items-center gap-[6px] px-[6px] py-[5px] rounded-[7px]"
            style={{ background: item.active ? railActive : "transparent" }}
          >
            <span className="w-[9px] h-[9px] rounded-[3px] shrink-0" style={{ background: item.active ? "rgba(255,255,255,.9)" : railInactiveDot }} />
            <span className="text-[12px] font-bold whitespace-nowrap" style={{ color: item.active ? "#fff" : railInk }}>
              {item.label}
            </span>
          </span>
        ))}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-[6px] py-[8px] px-[11px] text-left">{children}</div>
    </div>
  </div>
);
