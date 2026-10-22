import type { ReactNode } from "react";
import type { MarketplaceClass } from "../../services/marketplace";
import { useIsDark } from "../../hooks/useIsDark";
import { useOnline } from "../../hooks/useOnline";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../pro/proInk";
import { TicketStub } from "../market/TicketStub";
import { ConfirmationStrip } from "../market/ConfirmationStrip";
import { FOCUS_CSS } from "../market/usePress";
import { time12 } from "../../utils/time12";
import { FeaturedChip } from "./FeaturedChip";
import { classCardLines, shortDate, venueOf } from "./classCardModel";

// Market + Share 3.0 · W2 · the class ticket card (C-MO.4.3 `classes`,
// Client Explore Screens lines 240–256), shared by Explore › Classes, the gym
// page's Classes tab (venue left out there), the business's Explore preview
// and ProfessionalExplore. Built on the W1 TicketStub (stubWidth 72):
// - the ticket: relative flex, min-height 88, radius 18, --card, 0.5px --hair,
//   overflow hidden;
// - the body: padding 20, a column with gap 12: a row (gap 12, top aligned)
//   of the 64 wide time block (the time 16 / 22 700 tabular, the duration
//   12 / 16 --faint) and the title 16 / 22 600 + "{venue} · {instructor}"
//   13 / 18 500 --ink2 (each one line with an ellipsis); then
//   "{b} of {cap} booked" 11 / 15 --faint and the 3 tall bar (--soft track,
//   --segactive fill, radius 999, margin-top 5);
// - the 72 price stub (1.5px dashed --fill, --pale, the price 18 / 800
//   --pdark; "Free" for a free class) and its two 14 notches at right 65
//   (--page with a 0.5px --hair ring).
// Undrawn live features, in the same chrome: the Featured chip after the
// title (B13 MK-06); a class the viewer holds turns its stub teal (STUB
// "booked": --tealbg / --tealink / --teal) with a tick and "Booked"; a class
// full for this viewer (viewerSpotsLeft applied by the caller) turns it muted
// (--soft / --faint / --border) with "Full", and "· Full" ends the booked
// line; a viewer's own smaller limit adds "· 2 spots left"; a class a week
// or more out leads the booked line with its date ("Oct 30 · ").
// Times are 12-hour (D-03): the meridiem follows the time at 11 / 700 so
// "12:30 PM" stays inside the 64 block. The whole ticket is one button that
// opens the class page; there is no Book button on the drawn card, so
// book_tap is recorded by the class page's own Book (it already records it,
// once per session, with the page's ?src=).

export function ClassCard({
  c,
  booked,
  onOpen,
  hideVenue,
}: {
  c: MarketplaceClass;
  booked: boolean;
  onOpen: (c: MarketplaceClass) => void;
  /**
   * B13 MK-07 book_tap. Kept for the callers' signature: the redrawn card has
   * no Book button, so the class page's Book records book_tap instead.
   */
  onBook?: (c: MarketplaceClass) => void;
  /** The gym page's Classes tab: the venue is the page itself. */
  hideVenue?: boolean;
}) {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const l = classCardLines(c, { booked, hideVenue });
  const when = [shortDate(c.date), time12(c.startTime)].filter(Boolean).join(" ");
  const label = `${c.title}${hideVenue ? "" : `, ${venueOf(c)}`}, ${when}. ${booked ? "Booked" : l.stub === "full" ? "Full" : l.price}. Open class`;
  const one = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;
  const stub =
    l.stub === "booked" ? (
      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: m.tealink }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span style={{ fontSize: textPx(12), fontWeight: 800 }}>Booked</span>
      </span>
    ) : undefined;
  return (
    <>
      <style>{FOCUS_CSS}</style>
      <TicketStub
        stubWidth={72}
        tone={l.stub === "booked" ? "teal" : l.stub === "full" ? "muted" : "pale"}
        stubLabel={l.stub === "full" ? "Full" : l.price}
        stub={stub}
        minHeight={88}
        onPress={() => onOpen(c)}
        ariaLabel={label}
        className="market-focus"
        bodyStyle={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box" }}
      >
        <span data-class-card="" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ width: 64, flexShrink: 0 }}>
            <span style={{ display: "block", fontSize: textPx(16), lineHeight: linePx(22), fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              {l.time ? (
                <>
                  {l.time.time}
                  <span style={{ fontSize: textPx(11), lineHeight: 1, fontWeight: 700 }}>{` ${l.time.meridiem}`}</span>
                </>
              ) : (
                c.startTime
              )}
            </span>
            <span style={{ display: "block", fontSize: textPx(12), lineHeight: linePx(16), color: m.faint }}>{l.dur}</span>
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: textPx(16), lineHeight: linePx(22), fontWeight: 600, minWidth: 0, ...one }}>{c.title}</span>
              {c.isFeatured && <FeaturedChip />}
            </span>
            <span style={{ display: "block", fontSize: textPx(13), lineHeight: linePx(18), fontWeight: 500, color: m.ink2, ...one }}>{l.sub}</span>
          </span>
        </span>
        <span style={{ display: "block" }}>
          <span style={{ display: "block", fontSize: textPx(11), lineHeight: linePx(15), color: m.faint, fontVariantNumeric: "tabular-nums" }}>
            {l.booked}
            {l.extra && (
              <>
                {" · "}
                <span style={{ fontWeight: 700, color: l.extra === "Full" ? m.high : m.ink2 }}>{l.extra}</span>
              </>
            )}
          </span>
          <span aria-hidden style={{ display: "block", marginTop: 5, height: 3, borderRadius: 999, background: m.soft, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${l.pct}%`, borderRadius: 999, background: m.segactive }} />
          </span>
        </span>
      </TicketStub>
    </>
  );
}

/**
 * The shared empty state (Explore, the gym page's Classes tab), in the
 * handover's empty-card style (MarketEmptyCard: radius 20, --card, 1px
 * --border, padding 16; the title 13.5 / 800, the line 12.5 / 18 --ink2),
 * with the caller's icon in a 36 --pale tile (--accent glyph) to its left.
 */
export function ExploreEmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  const m = marketPalette(useIsDark());
  return (
    <div style={{ lineHeight: "normal", display: "flex", alignItems: "flex-start", gap: 12, borderRadius: 20, background: m.card, border: `1px solid ${m.border}`, padding: 16, color: m.ink }}>
      <span aria-hidden className="[&_svg]:w-5 [&_svg]:h-5" style={{ width: 36, height: 36, borderRadius: 12, background: m.pale, color: m.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: textPx(13.5), fontWeight: 800 }}>{title}</p>
        <p style={{ margin: "4px 0 0", fontSize: textPx(12.5), lineHeight: linePx(18), color: m.ink2 }}>{body}</p>
      </div>
    </div>
  );
}

/**
 * The shared load-error line, as the handover's strip (D-04): the error tone
 * with the caller's message and a "Retry" stub; the neutral tone while the
 * browser is offline (the caller's offline wording).
 */
export function RetryLine({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  const online = useOnline();
  return (
    <div className={className}>
      <ConfirmationStrip tone={online ? "error" : "neutral"} text={message} action={onRetry ? "Retry" : undefined} onAction={onRetry} still />
    </div>
  );
}

/** "You're offline." when the browser says so, for the load-error lines. */
export const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;
