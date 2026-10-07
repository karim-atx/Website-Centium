import { ChevronLeft, MapPin } from "lucide-react";

// Pieces the class page (MO1.4.4) and the gym page (MO1.4.2.1) share.
// Handover-complete pass (2026-10-07). Both pages are new since R1, so they
// take the handover's own light colours (decision 22); dark mode uses the
// v5.1 tokens.

/**
 * The detail page's hero at the top edge: 200 tall on a class page, 240 on a
 * gym page, with a 36 pt white back disc (ChevronLeft 18) 16 in and 16 down
 * (measured on MO1.4.4 / MO1.4.2.1, 2x). Venues and classes have no photos yet
 * (they come from the business / gym dashboard upload, a backend stage), so
 * the hero is the primary tint, as Foundations draws a gym with no photo.
 * The page's 24 pt top padding and the safe area are cancelled so the hero
 * starts at y 0, as the course page does.
 */
export function DetailHero({ height, onBack, children }: { height: 200 | 240; onBack: () => void; children?: React.ReactNode }) {
  return (
    <div
      className="relative -mx-4 -mt-[calc(env(safe-area-inset-top)+24px)] bg-primary-pale px-4 pt-[calc(env(safe-area-inset-top)+16px)]"
      style={{ height: `calc(env(safe-area-inset-top) + ${height}px)` }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="tap relative w-9 h-9 rounded-full bg-cream-card text-charcoal flex items-center justify-center before:content-[''] before:absolute before:-inset-1"
      >
        <ChevronLeft size={18} strokeWidth={2} aria-hidden />
      </button>
      {children}
    </div>
  );
}

/**
 * `label.section` as the detail pages draw it: 10.5/700 uppercase at 0.12em
 * on a 14 line, in primary.accent (#7D67D9), no rule (MO1.4.4 #7, #9, #12).
 */
export function DetailLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`m-0 text-[10.5px] font-bold uppercase tracking-[0.12em] leading-[14px] text-th-7d67d9 dark:text-primary-dark ${className ?? ""}`}>
      {children}
    </h2>
  );
}

/**
 * The Location card: 358 × 120, radius 16, the map fill #EEF1EF with a grid of
 * blocks and a MapPin 28/2 in primary.accent at its centre (MO1.4.4 #13,
 * MO1.4.2.1 #13). A drawing, not a map: venues have no map tiles, and a
 * business has no coordinates at all. The address line sits 8 under it in
 * 12.5/400 text.secondary. The fill is the board's neutral map colour (not a
 * theme colour), so it is a literal; dark mode uses the soft surface.
 */
export function MapCard({ address }: { address: string | null }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-[120px] rounded-2xl overflow-hidden bg-[#EEF1EF] dark:bg-cream-soft" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(var(--c-cream-card)) 0 5px, transparent 5px), linear-gradient(to bottom, rgb(var(--c-cream-card)) 0 5px, transparent 5px)",
            backgroundSize: "49px 100%, 100% 31px",
            backgroundPosition: "-4px 0, 0 -4px",
            opacity: 0.9,
          }}
        />
        <MapPin size={28} strokeWidth={2} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-th-7d67d9 dark:text-primary-dark" />
      </div>
      {address && <p className="m-0 text-[12.5px] text-charcoal-soft">{address}</p>}
    </div>
  );
}
