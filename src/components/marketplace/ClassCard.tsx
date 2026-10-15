import type { ReactNode } from "react";
import { Check } from "lucide-react";
import type { MarketplaceClass } from "../../services/marketplace";
import { time12Split } from "../../utils/time12";
import { useKnownPosition } from "../../hooks/useKnownPosition";
import { distanceKm } from "../../services/geo/distance";
import { distanceText } from "../../services/marketplace/classBooking";
import { FeaturedChip } from "./FeaturedChip";

// v6 MO1.4 #37-#46 (Explore class card), shared by Explore › Classes and the
// gym page's Classes tab (OURS-gym-classes-tab #3, venue line hidden there).
//
// Literal values (MO1.4 table, light / dark):
//   card     pad 12 · r18 · cream-card · 0.5px #241F1B@8% / #F5F3FA@8% (hair-08)
//   block    56 wide · pad 8 0 · r12 · #F0EDF9 / #303141 (primary-pale) · 12 to the text
//   day      10.5/15.8 800 ls 0.6 · #7D67D9 / #9A8CD6
//   time     14/21 800 · charcoal; meridiem 9.5/12 700 #8C8378 under it (V6-148)
//   title    14/21 700 · venue 12/18 600 #7D67D9 / #9A8CD6 · place 11.5/17.3 400 faint
//   price    pad 2 8 · 11/16.5 700 · #2F5F58 on #E4F0EE (dark: the app's teal pair, V6-92)
//   spots    11/16.5 400 faint; "Full" 11/16.5 700 #C0392B / #F09A8E (K8)
//   Book     h30 · pad 0 14 · r10 · 12/18 700 #7D67D9 on cream-card · 0.5px #AEA1DC /
//            #9A8CD6 on #1C1F28 · 0.5px #A991FE; 44 hit area from .tap
// The whole card opens the class page (S7); Book / Booked open the same page.

/** A class 7 or more days out, whose weekday alone would not say which week. */
const farOff = (iso: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${iso}T00:00:00`).getTime() - today.getTime() >= 7 * 86_400_000;
};

/**
 * The date block's top line: the weekday ("SAT"), or for a class a week or
 * more away the date ("OCT 18", K7). Upper-cased by the block's style.
 */
export const blockDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return farOff(iso)
    ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : d.toLocaleDateString("en-US", { weekday: "short" });
};

export function ClassCard({
  c,
  booked,
  onOpen,
  hideVenue,
  onBook,
}: {
  c: MarketplaceClass;
  booked: boolean;
  onOpen: (c: MarketplaceClass) => void;
  /** B13 MK-07: Book was tapped (before it opens the class page), for book_tap. */
  onBook?: (c: MarketplaceClass) => void;
  /** The gym page's Classes tab: the venue is the page itself. */
  hideVenue?: boolean;
}) {
  const here = useKnownPosition();
  // The gym page's own tab is at that gym: no distance there.
  const distance =
    !hideVenue && here && c.venueLat != null && c.venueLng != null ? distanceText(distanceKm(here, { lat: c.venueLat, lng: c.venueLng })) : null;
  const free = !c.priceValue;
  const t = time12Split(c.startTime);
  const when = `${blockDay(c.date)} ${t ? `${t.time} ${t.meridiem}` : c.startTime}`;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(c)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(c);
        }
      }}
      aria-label={`${c.title}${hideVenue ? "" : `, ${c.businessName}`}, ${when}. Open class`}
      data-class-card=""
      className="cursor-pointer rounded-[18px] bg-cream-card border-[0.5px] border-hair-08 p-3 animate-fade-slide-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="flex gap-3">
        <span
          data-date-block=""
          className="w-14 shrink-0 self-center rounded-[12px] bg-primary-pale flex flex-col items-center justify-center py-2"
        >
          <span className="text-[10.5px] leading-[15.8px] font-extrabold uppercase tracking-[0.6px] text-th-7d67d9 dark:text-primary-accent whitespace-nowrap">
            {blockDay(c.date)}
          </span>
          <span className="text-[14px] leading-[21px] font-extrabold text-charcoal tabular-nums">{t?.time ?? c.startTime}</span>
          {t && <span className="text-[9.5px] leading-[12px] font-bold text-charcoal-faint">{t.meridiem}</span>}
        </span>
        <div className="min-w-0 flex-1">
          {/* B13 MK-06: a live featured week, the chip after the title. */}
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="min-w-0 text-[14px] leading-[21px] font-bold text-charcoal truncate">{c.title}</p>
            {c.isFeatured && <FeaturedChip />}
          </div>
          {!hideVenue && (
            <p className="text-[12px] leading-[18px] font-semibold text-th-7d67d9 dark:text-primary-accent truncate">{c.businessName}</p>
          )}
          {/* #43 PB-O-50 (B9): the place, then "· 1.2 km" from the venue's
              coordinates (marketplace_classes venue_lat / venue_lng) when the
              device has already shared its position; place only otherwise. */}
          {(c.location || distance) && (
            <p className="text-[11.5px] leading-[17.3px] text-charcoal-faint truncate">{[c.location, distance].filter(Boolean).join(" · ")}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="inline-flex items-center text-[11px] leading-[16.5px] font-bold rounded-full px-2 py-[2px] bg-th-e4f0ee text-th-2f5f58 dark:bg-teal-pale dark:text-teal-deep-text">
              {free ? "Free" : c.price}
            </span>
            <span
              className={`text-[11px] leading-[16.5px] ${c.isFull ? "font-bold text-status-high" : "text-charcoal-faint"}`}
            >
              {c.isFull ? "Full" : `${c.spotsRemaining} ${c.spotsRemaining === 1 ? "spot" : "spots"} left`}
            </span>
            {booked ? (
              // K10: Booked in the Book slot, the class page's teal check style.
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(c);
                }}
                aria-label={`Booked: ${c.title}`}
                className="tap ml-auto h-[30px] px-2.5 rounded-[10px] border-[0.5px] inline-flex items-center gap-1 text-[12px] leading-[18px] font-bold bg-th-e7f2f0 border-th-c1d5d2 text-th-3c6b65 dark:bg-teal-pale dark:border-teal-dark/50 dark:text-teal-deep-text"
              >
                <Check size={13} strokeWidth={2.4} aria-hidden /> Booked
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBook?.(c);
                  onOpen(c);
                }}
                aria-label={`Book ${c.title}`}
                className="tap ml-auto h-[30px] px-[14px] rounded-[10px] bg-cream-card border-[0.5px] border-th-aea1dc dark:border-primary text-[12px] leading-[18px] font-bold text-th-7d67d9 dark:text-primary-accent"
              >
                Book
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Foundations' empty-state block (MO1.4.3): a 56 primary-tint tile, a title
 * and a line. Shared by Explore and the gym page's Classes tab.
 */
export function ExploreEmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    // 42 here plus the list's 14 = the block's 56 from the rail above.
    <div className="flex flex-col items-center text-center gap-2.5 px-6 pt-[42px] pb-0">
      <span className="w-14 h-14 rounded-[18px] bg-primary-pale flex items-center justify-center text-th-7d67d9 dark:text-primary-accent">{icon}</span>
      <p className="text-[16px] font-extrabold text-charcoal">{title}</p>
      <p className="text-[13px] text-charcoal-faint leading-[1.55]">{body}</p>
    </div>
  );
}

/**
 * The shared load-error line (MO1.4 K15 / O-ERR / O-OFF): 12/600 danger
 * #C0392B / #F09A8E and a "Retry" text button 12/700 #7D67D9 / #9A8CD6 with
 * a 44 hit area.
 */
export function RetryLine({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <p role="alert" className={`flex flex-wrap items-center gap-x-2 text-[12px] leading-[18px] font-semibold text-status-high ${className ?? ""}`}>
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="tap text-[12px] leading-[18px] font-bold text-th-7d67d9 dark:text-primary-accent">
          Retry
        </button>
      )}
    </p>
  );
}

/** "You're offline." when the browser says so, for the load-error lines. */
export const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;
