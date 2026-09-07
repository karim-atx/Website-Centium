import React from "react";

export interface Review {
  initials: string;
  name: string;
  role: string;
  quote: string;
  tone: "primary" | "teal";
}

const Stars: React.FC = () => (
  <svg width="70" height="13" viewBox="0 0 59 11" aria-hidden="true" className="ml-auto shrink-0">
    {[0, 12, 24, 36, 48].map((x) => (
      <use key={x} href="#mkt-star" x={x} y="0" width="11" height="11" />
    ))}
  </svg>
);

/** Reviews conveyor: an infinite marquee of testimonial cards sitting
 *  directly on the hero's own gradient (no background of its own — the
 *  hero's bottom fade-to-white resolves it, per the landing handoff).
 *  Cards are duplicated once so the belt loops seamlessly; the edges fade
 *  via a mask so cards don't hard-cut at the viewport edge.
 *
 *  The five-star row is a single `<symbol>` (defined once, referenced via
 *  `<use>` per card) rather than five inline star SVGs each — same pixel
 *  result, far less markup repeated across twelve cards.
 *
 *  Quotes are real product claims with placeholder attribution — replace
 *  with real reviews before launch (handoff's own note). */
export const ReviewsConveyor: React.FC<{ reviews: Review[] }> = ({ reviews }) => {
  const belt = [...reviews, ...reviews];

  return (
    <div
      className="relative z-[6]"
      style={{
        padding: "150px 0 clamp(56px,6vw,84px)",
        overflow: "hidden",
        WebkitMaskImage: "linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)",
        maskImage: "linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)",
      }}
    >
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <symbol id="mkt-star" viewBox="0 0 24 24">
          <path
            fill="#D9A441"
            d="M11.5 2.3a.53.53 0 0 1 .95 0l2.31 4.68a2.12 2.12 0 0 0 1.6 1.16l5.16.75a.53.53 0 0 1 .3.91l-3.74 3.64a2.12 2.12 0 0 0-.61 1.87l.88 5.14a.53.53 0 0 1-.77.56l-4.62-2.43a2.12 2.12 0 0 0-1.97 0L6.4 21.01a.53.53 0 0 1-.77-.56l.88-5.14a2.12 2.12 0 0 0-.61-1.88L2.16 9.8a.53.53 0 0 1 .29-.91l5.17-.75a2.12 2.12 0 0 0 1.6-1.16z"
          />
        </symbol>
      </svg>
      <div id="reviews-belt" className="flex w-max gap-[18px] animate-mkt-belt">
        {belt.map((r, i) => (
          <div
            key={r.name + i}
            aria-hidden={i >= reviews.length || undefined}
            className="flex items-center gap-[15px] shrink-0 w-[412px] rounded-[22px] px-[22px] py-[19px] overflow-hidden"
            style={{
              background: "linear-gradient(150deg,#FBF9FF 0%,#F6F3FD 58%,#F1F8F5 100%)",
              border: "1px solid #E4DCF8",
              boxShadow: "0 10px 26px rgba(72,58,130,.1)",
            }}
          >
            <div
              className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center font-bold text-[15px]"
              style={
                r.tone === "primary"
                  ? { background: "#DED4F4", color: "#5C48A8" }
                  : { background: "#DAEAE7", color: "#3F726D" }
              }
            >
              {r.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[15.5px] text-mkt-ink whitespace-nowrap">{r.name}</span>
                <span className="text-[13px] text-mkt-faint whitespace-nowrap">{r.role}</span>
                <Stars />
              </div>
              <p className="text-[14.5px] leading-[1.5] text-mkt-soft mt-1.5" style={{ textWrap: "pretty" }}>
                {r.quote}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
