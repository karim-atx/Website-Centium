import React from "react";
import { Link } from "react-router-dom";
import { useSEO } from "../useSEO";

/** v3 Centium landing handoff, "Centium 404.dc.html": the marketing site's
 *  branded 404, shown for any unmatched path outside /app (see App.tsx's
 *  catch-all route). Reuses the shared Nav/Footer via MarketingLayout rather
 *  than the handoff's own minimal standalone header/footer, for the same
 *  reason as Legal.tsx — every other marketing page already carries the
 *  real site chrome, and a one-off different header here would read as
 *  inconsistent when navigating between pages. */
export const NotFound: React.FC = () => {
  useSEO("Page not found", "This page doesn't exist — or it moved. Your health hub is still right where you left it.");

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute rounded-full pointer-events-none animate-mkt-drift-a"
        style={{ left: -140, top: 40, width: 360, height: 360, background: "radial-gradient(circle at 50% 50%,rgba(111,153,147,.34),rgba(111,153,147,0) 68%)" }}
      />
      <div
        aria-hidden="true"
        className="absolute rounded-full pointer-events-none animate-mkt-drift-b"
        style={{ right: -150, bottom: -60, width: 420, height: 420, background: "radial-gradient(circle at 50% 50%,rgba(140,110,222,.3),rgba(140,110,222,0) 68%)" }}
      />
      <main className="relative flex items-center justify-center px-5 sm:px-10 pt-40 sm:pt-52 pb-24">
        <div className="max-w-[640px] w-full text-center flex flex-col items-center">
          <span className="block font-semibold text-[11px] tracking-[.22em]" style={{ color: "#7D67D9" }}>
            PAGE NOT FOUND
          </span>
          <div className="relative mt-[18px] animate-cent-breathe">
            <div
              className="font-display font-extrabold leading-[.9] tracking-[-.045em]"
              style={{
                fontSize: "clamp(96px,18vw,188px)",
                background: "linear-gradient(100deg,#5F49B8 0%,#7D67D9 44%,#6E9E97 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              404
            </div>
          </div>
          <h1 className="font-display font-extrabold text-[clamp(28px,4vw,40px)] leading-[1.1] tracking-[-.03em] text-mkt-ink mt-3.5 max-w-[520px]">
            This page went off-plan.
          </h1>
          <p className="text-[17px] leading-relaxed text-mkt-soft mt-[18px] max-w-[460px]">
            The link you followed doesn't exist — or it moved. Your health hub is still right where you left it.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-[34px]">
            <Link
              to="/"
              className="tap px-[30px] py-4 rounded-full bg-mkt-accent hover:bg-mkt-accent-hover text-white font-semibold text-[15px] transition-colors"
            >
              Back to home
            </Link>
            <Link
              to="/contact"
              className="tap px-[26px] py-4 rounded-full border border-[#CFC5EA] hover:border-mkt-accent bg-white/[.62] text-mkt-ink font-semibold text-[15px] transition-colors"
            >
              Contact support
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-10">
            <Link to="/#platform" className="px-3.5 py-2 rounded-full font-semibold text-[13px]" style={{ background: "#F4F1FB", color: "#6A54C4" }}>
              Features
            </Link>
            <Link to="/#pricing" className="px-3.5 py-2 rounded-full font-semibold text-[13px]" style={{ background: "#EDF4F3", color: "#4F8F8A" }}>
              Pricing
            </Link>
            <Link to="/#faq" className="px-3.5 py-2 rounded-full font-semibold text-[13px]" style={{ background: "#F4F1FB", color: "#6A54C4" }}>
              FAQ
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
