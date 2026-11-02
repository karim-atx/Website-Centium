import clsx from "clsx";
import { Ticket } from "lucide-react";
import { BuyInApp } from "./BuyInApp";
import { premiumDate, type HiringCredits } from "../../services/premium/model";
import { t, tn } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G1 · #15, hiring credits on the hiring pages (my_hiring_credits),
// only when credits_on (the business plans switch, for the business's
// owner). A role hire uses one credit in place of the percentage fee;
// class-slot hires are billed as today. Credits are bought in the Centium app
// only (decision G10): $39 for 1, $99 for 3, through "Buy in the Centium app"
// (Coming soon). buy_hiring_credits is never called from the web.
export function HiringCreditsCard({ credits, className }: { credits: HiringCredits | null; className?: string }) {
  if (!credits?.creditsOn) return null;
  const packs = credits.packs.filter((p) => p.remaining > 0);
  return (
    <section data-hiring-credits aria-label={t("Hiring credits")} className={clsx("rounded-2xl bg-cream-card shadow-soft px-4 py-4", className)}>
      <div className="flex items-center gap-2.5">
        <Ticket size={18} className="text-primary-dark shrink-0" aria-hidden />
        <p className="flex-1 min-w-0 text-[14px] font-extrabold text-charcoal">{t("Hiring credits")}</p>
        <p className="text-[13px] font-bold text-primary-dark whitespace-nowrap">{tn(credits.free, "{n} free to use", "{n} free to use")}</p>
      </div>
      <p className="text-[12px] leading-[17px] text-charcoal-soft mt-1.5">{t("Each role hire uses 1 hiring credit instead of the hiring fee. Class-slot hires are billed as before.")}</p>
      {packs.length > 0 && (
        <ul className="mt-2.5 space-y-1">
          {packs.map((p, i) => (
            <li key={`${p.startsAt ?? ""}-${i}`} className="text-[12px] text-charcoal">
              {p.endsAt
                ? tn(p.quantity, "{remaining} of {n} credit left, until {date}", "{remaining} of {n} credits left, until {date}", { remaining: p.remaining, date: premiumDate(p.endsAt) })
                : tn(p.quantity, "{remaining} of {n} credit left", "{remaining} of {n} credits left", { remaining: p.remaining })}
            </li>
          ))}
        </ul>
      )}
      <BuyInApp product="hiring_credits" price1={credits.price1} price3={credits.price3} compact className="mt-3 !shadow-none !bg-cream-soft" />
    </section>
  );
}
