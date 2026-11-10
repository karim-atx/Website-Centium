import React from "react";
import { Check } from "lucide-react";
import { PaneScope, usePanePad } from "./paneWebScope";
import { usePaneFill } from "../web/paneFill";
import { useWebLayout, WEB_READING_MAX } from "../web/useWebLayout";

// Website viewport v1 · ST Settings Web (the designed More / Settings panes,
// WB-MO, WB-SE and the type variants). From 1024px wide a business page shown
// in the More or Settings pane (the shell's WebSecondaryLayout) draws the
// pane design instead of the mobile BizMoreV8 card list: the pane filled
// (max 880, padding 32 40 40, 24 28 32 on the rail), the title 28/36 700,
// sections as a caps purple label over a 1.5 lavender rule with plain rows
// (36 tiles, 15/24 titles, 44 × 26 switches, 22 radios). The kit components
// (kit.tsx) read this; below 1024, outside the pane and inside sheets and
// popups they render exactly as on mobile.

/** Inside a sheet or popup opened from a pane page: the mobile kit look. */
/** A web page with a pane of its own (the client More): the kit draws the pane rows. */
export const PaneWebOn: React.FC<{ children: React.ReactNode }> = ({ children }) => <PaneScope.Provider value="on">{children}</PaneScope.Provider>;

export const PaneWebOff: React.FC<{ children: React.ReactNode }> = ({ children }) => <PaneScope.Provider value="off">{children}</PaneScope.Provider>;

/**
 * The pane page's frame: it asks the shell's pane to drop its centred 430
 * column (usePaneFill), then lays the design's padding and 880 cap.
 */
export const PaneFrame: React.FC<{ children: React.ReactNode; label?: string; reading?: boolean }> = ({ children, label, reading }) => {
  const pad = usePanePad();
  const { rail } = useWebLayout();
  usePaneFill();
  // Professional handover v1 (section 4) and Addendum A (WC-SE): the client and
  // professional panes span the pane (32 padding at 1440, 24 at 1024), up to
  // the reading width of section 2.1. The business panes keep their 880.
  const frame: React.CSSProperties = reading
    ? { maxWidth: WEB_READING_MAX, boxSizing: "border-box", padding: rail ? 24 : 32 }
    : { maxWidth: 880, boxSizing: "border-box", padding: `${pad.top}px ${pad.x}px ${pad.bottom}px` };
  return (
    <div data-web-pane-page aria-label={label}>
      {/* Blocks 28 apart, as the design's column gap; a section label sits on
          its own rows (pages that draw the label and the rows as siblings). */}
      <PaneScope.Provider value="on">
      <div
        className="flex flex-col [&>*+*]:mt-[28px] [&>[data-pane-label]+*]:mt-0"
        style={frame}
      >
        {children}
      </div>
      </PaneScope.Provider>
    </div>
  );
};

/** The pane title (h2 28/36 700 -0.02em) and its line (13/20 #8C8378), 2 apart. */
export const PaneHeader: React.FC<{ title: string; sub?: string; back?: React.ReactNode }> = ({ title, sub, back }) => (
  <header style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
    {back}
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <h2 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.02em", color: "#241F1B", textWrap: "pretty" } as React.CSSProperties}>{title}</h2>
      {sub && <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E", textWrap: "pretty" } as React.CSSProperties}>{sub}</p>}
    </div>
  </header>
);

/** The pane switch: 44 × 26, padding 2, knob 22; on #9A8CD6, off #E4E2EA. */
export const PaneSwitch: React.FC<
  { checked: boolean; disabled?: boolean; label?: string } & (
    | { onChange: (next: boolean) => void; decorative?: false }
    /** FP: only the drawing (aria-hidden), for a row that is itself the switch (SelectableBox kind="switch"). */
    | { decorative: true; onChange?: never }
  )
> = ({ checked, onChange, disabled, label, decorative }) =>
  decorative ? (
    <span
      aria-hidden
      className="shrink-0 flex"
      style={{ width: 44, height: 26, borderRadius: 999, boxSizing: "border-box", padding: 2, justifyContent: checked ? "flex-end" : "flex-start", background: checked ? "#9A8CD6" : "#E4E2EA", transition: "background-color .15s" }}
    >
      <span style={{ width: 22, height: 22, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.18)" }} />
    </span>
  ) : (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange?.(!checked)}
    className="shrink-0 flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:outline-offset-2 disabled:cursor-not-allowed"
    style={{ width: 44, height: 26, borderRadius: 999, boxSizing: "border-box", padding: 2, justifyContent: checked ? "flex-end" : "flex-start", background: checked ? "#9A8CD6" : "#E4E2EA", transition: "background-color .15s" }}
  >
    <span aria-hidden style={{ width: 22, height: 22, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.18)" }} />
  </button>
);

/** The pane radio: 22, selected #9A8CD6 with a white 12 check, else a 1.5 rgba(36,31,27,0.2) ring. */
export const PaneRadio: React.FC<{ selected: boolean }> = ({ selected }) => (
  <span
    aria-hidden
    className="shrink-0 flex items-center justify-center"
    style={{ width: 22, height: 22, borderRadius: 999, boxSizing: "border-box", border: selected ? "none" : "1.5px solid rgba(36,31,27,0.2)", background: selected ? "#9A8CD6" : "transparent" }}
  >
    {selected && <Check size={12} strokeWidth={3} style={{ color: "#FFFFFF" }} />}
  </span>
);

/** The pane's info card (Payouts): max 640, r20 #F7F7FC, padding 24, a 48 r16 tile, title 17/24 700, body 15/24 #5B5349. */
export const PaneCard: React.FC<{ icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>; title: string; body: string }> = ({ icon: Icon, title, body }) => (
  <div style={{ maxWidth: 640, display: "flex", alignItems: "flex-start", gap: 16, borderRadius: 20, background: "#F7F7FC", padding: 24 }}>
    <span className="shrink-0 flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 16, background: "#F0EDF9" }}>
      <Icon size={22} strokeWidth={1.75} style={{ color: "#7D67D9" }} />
    </span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{title}</p>
      <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: "24px", color: "#5B5349", textWrap: "pretty" } as React.CSSProperties}>{body}</p>
    </div>
  </div>
);

