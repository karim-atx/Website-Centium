import React from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { usePress } from "./usePress";
import { stubColors, type StubTone } from "./marketColor";

export type { StubTone };

// Market + Share 3.0 · TicketStub (HANDOVER §5; tokens.json ticketStub: notch
// 14, perforation 1.5px dashed, stub widths 30 / 46 / 72). One ticket for
// bookings, vouchers, applications, work history, the class price stub and
// calendar events. Literal values from the screen files:
// - the ticket (Client Explore lines 244 / 584, Client Professional 121 / 204,
//   Professional Marketplace 191 / 412): relative flex row, radius 18,
//   --card, border 0.5px --hair, overflow hidden;
// - the stub: the width, flex none, border-left 1.5px dashed in the tone's
//   perforation colour, the tone's fill, content centred;
// - the vertical label (46 stubs, C-MO.4.5 / C-MO.4.6 / P-MA.5.2 / P-MA.5.3):
//   writing-mode vertical-rl, rotate(180deg), 800, uppercase, nowrap, in the
//   tone's ink; 9.5 / 0.1em on the bookings and work-history rows (min height
//   96), 10.5 / 0.16em on My rewards, 9.5 / 0.12em on applications;
// - the price stub (72, C-MO.4.3 class cards): --pale fill, --fill dashes, the
//   price 18 / 800 --pdark;
// - the notches: 14 circles at right = stub − 7, top / bottom −7, in the
//   surface colour behind the ticket with a 0.5px --hair ring (border-box);
//   calendar events (30, Professional Calendar line 58) draw them without the
//   ring.
// Tones (Client Explore `STUB`, Professional Marketplace `STEP`): teal
// (--tealbg / --tealink / --teal), pale (--pale / --pdark / --fill), muted
// (--soft / --faint / --border), step 1–4 (segmentSteps bg / ink, dashes in
// the ink), or a custom triple.

export interface TicketStubProps {
  /** 30 (calendar event), 46 (status card), 72 (price stub / strip). */
  stubWidth: 30 | 46 | 72;
  /** The stub's text: rotated when `vertical`, else the price (18 / 800). */
  stubLabel?: string;
  /** Custom stub content (an icon, a button label); replaces `stubLabel`. */
  stub?: React.ReactNode;
  vertical?: boolean;
  tone?: StubTone;
  /** The vertical label's type: [size, tracking]. Default 9.5 / 0.1em. */
  labelType?: [number, string];
  /** Upper-case the vertical label (the statuses are already upper case). Default true. */
  uppercase?: boolean;
  /** The surface behind the ticket, for the notches. Defaults to --page. */
  notchBg?: string;
  /** The 0.5px --hair ring on the notches (false on calendar events). Default true. */
  notchRing?: boolean;
  /** The ticket's own fill, border and radius (defaults: --card, 0.5px --hair, 18). Pass "none" to draw none. */
  background?: string;
  border?: string;
  radius?: number;
  minHeight?: number;
  /** Makes the whole ticket a button (a row that opens something). */
  onPress?: () => void;
  /** The stub alone as a button (e.g. "Review" on a past class). */
  onStubPress?: () => void;
  ariaLabel?: string;
  stubAriaLabel?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}

export const TicketStub: React.FC<TicketStubProps> = ({
  stubWidth,
  stubLabel,
  stub,
  vertical,
  tone = "pale",
  labelType = [9.5, "0.1em"],
  uppercase = true,
  notchBg,
  notchRing = true,
  background,
  border,
  radius = 18,
  minHeight,
  onPress,
  onStubPress,
  ariaLabel,
  stubAriaLabel,
  children,
  className,
  style,
  bodyStyle,
}) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const c = stubColors(tone, m, dark);
  // The price stub (72, horizontal) is the class card's: --pale / --fill / --pdark 18/800.
  const stubFill = stubWidth === 30 ? "transparent" : c.bg;
  const content =
    stub ??
    (stubLabel ? (
      vertical ? (
        <span
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontSize: textPx(labelType[0]),
            fontWeight: 800,
            letterSpacing: labelType[1],
            textTransform: uppercase ? "uppercase" : undefined,
            color: c.ink,
            whiteSpace: "nowrap",
          }}
        >
          {stubLabel}
        </span>
      ) : (
        <span style={{ fontSize: textPx(18), fontWeight: 800, color: c.ink, whiteSpace: "nowrap" }}>{stubLabel}</span>
      )
    ) : null);
  const stubStyle: React.CSSProperties = {
    width: stubWidth,
    // The board has no box-sizing reset: the stub is its width plus the 1.5
    // perforation (47.5 measured as 47 for the 46 stub, C-MO.4.5).
    boxSizing: "content-box",
    flexShrink: 0,
    background: stubFill,
    borderInlineStart: `1.5px dashed ${c.perf}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: c.ink,
  };
  const notch: React.CSSProperties = {
    position: "absolute",
    right: stubWidth - 7,
    width: 14,
    height: 14,
    borderRadius: 999,
    background: notchBg ?? m.page,
    boxSizing: "border-box",
    pointerEvents: "none",
    ...(notchRing ? { border: `0.5px solid ${m.hair}` } : null),
  };
  const shell: React.CSSProperties = {
    position: "relative",
    lineHeight: "normal",
    display: "flex",
    width: "100%",
    minHeight,
    borderRadius: radius,
    background: background === "none" ? undefined : (background ?? m.card),
    border: border === "none" ? undefined : (border ?? `0.5px solid ${m.hair}`),
    overflow: "hidden",
    textAlign: "start",
    color: m.ink,
    ...style,
  };
  const press = usePress();
  // A ticket with its own stub button can't be one button (no nested
  // buttons): its body is the button instead.
  const body =
    onPress && onStubPress ? (
      <button type="button" onClick={onPress} aria-label={ariaLabel} {...press.handlers} style={{ flex: 1, minWidth: 0, padding: 0, font: "inherit", color: "inherit", textAlign: "start", background: "none", border: 0, cursor: "pointer", ...press.style, ...bodyStyle }}>
        {children}
      </button>
    ) : (
      <div style={{ flex: 1, minWidth: 0, ...bodyStyle }}>{children}</div>
    );
  const stubEl = onStubPress ? (
    <button type="button" onClick={onStubPress} aria-label={stubAriaLabel} className="hit" style={{ ...stubStyle, minHeight: 44, cursor: "pointer" }}>
      {content}
    </button>
  ) : (
    <div style={stubStyle} aria-label={stubAriaLabel} role={stubAriaLabel ? "img" : undefined}>
      {content}
    </div>
  );
  const notches = (
    <>
      <span aria-hidden style={{ ...notch, top: -7 }} />
      <span aria-hidden style={{ ...notch, bottom: -7 }} />
    </>
  );
  if (onPress && !onStubPress) {
    return (
      <button type="button" onClick={onPress} aria-label={ariaLabel} className={className} {...press.handlers} style={{ ...shell, padding: 0, font: "inherit", lineHeight: "normal", cursor: "pointer", ...press.style }}>
        {body}
        {stubEl}
        {notches}
      </button>
    );
  }
  return (
    <div className={className} style={shell} aria-label={ariaLabel} role={ariaLabel ? "group" : undefined}>
      {body}
      {stubEl}
      {notches}
    </div>
  );
};
