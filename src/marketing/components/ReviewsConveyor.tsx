import React from "react";
import { Star } from "lucide-react";

export interface Review {
  initials: string;
  name: string;
  role: string;
  quote: string;
  tone: "primary" | "teal";
}

/** Reviews conveyor: an infinite marquee of testimonial cards sitting
 *  directly on the hero's own gradient (no background of its own — the
 *  hero's bottom fade-to-white resolves it, per the v2 landing handoff).
 *  Cards are duplicated once so the belt loops seamlessly; the edges fade
 *  via a mask so cards don't hard-cut at the viewport edge.
 *
 *  Quotes are real product claims with placeholder attribution — replace
 *  with real reviews before launch (handoff's own note). */
export const ReviewsConveyor: React.FC<{ reviews: Review[] }> = ({ reviews }) => {
  const belt = [...reviews, ...reviews];

  return (
    <div
      className="relative z-[6]"
      style={{
        padding: "22px 0 46px",
        overflow: "hidden",
        WebkitMaskImage: "linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)",
        maskImage: "linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)",
      }}
    >
      <div className="flex w-max gap-3.5 animate-mkt-belt">
        {belt.map((r, i) => (
          <div
            key={r.name + i}
            className="flex items-center gap-3 shrink-0 w-[326px] rounded-2xl px-4 py-3.5"
            style={{ background: "rgba(255,255,255,.76)", border: "1px solid rgba(34,30,26,.06)" }}
          >
            <div
              className="w-[34px] h-[34px] rounded-full shrink-0 flex items-center justify-center font-bold text-[12.5px]"
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
                <span className="font-bold text-[13px] text-mkt-ink whitespace-nowrap">{r.name}</span>
                <span className="text-[11.5px] text-mkt-faint whitespace-nowrap">{r.role}</span>
                <span className="flex gap-px ml-auto">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} size={11} fill="#D9A441" stroke="none" />
                  ))}
                </span>
              </div>
              <p className="text-[12.5px] leading-[1.45] text-mkt-soft mt-1" style={{ textWrap: "pretty" }}>
                {r.quote}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
