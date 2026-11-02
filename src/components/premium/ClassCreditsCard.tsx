import clsx from "clsx";
import { CalendarCheck } from "lucide-react";
import { BuyInApp } from "./BuyInApp";
import { premiumDate, type ClassCredits } from "../../services/premium/model";
import { t, tn } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G5 · class credits on the hiring pages (my_class_credits), beside
// the hiring credits card and in its look, only when credits_on (the business
// plans switch, for the business's owner). A class-slot hire uses one class
// credit in place of the percentage fee; role hires keep using hiring
// credits. Class credits are bought in the Centium app only: $3 for 1, $25
// for 10, valid 12 months (CLASS_CREDIT_PRICES), through "Buy in the Centium
// app" (Coming soon). Null, off, loading or no G5: nothing (today).
export function ClassCreditsCard({ credits, className }: { credits: ClassCredits | null; className?: string }) {
  if (!credits?.creditsOn) return null;
  const packs = credits.packs.filter((p) => p.remaining > 0);
  return (
    <section data-class-credits aria-label={t("Class credits")} className={clsx("rounded-2xl bg-cream-card shadow-soft px-4 py-4", className)}>
      <div className="flex items-center gap-2.5">
        <CalendarCheck size={18} className="text-primary-dark shrink-0" aria-hidden />
        <p className="flex-1 min-w-0 text-[14px] font-extrabold text-charcoal">{t("Class credits")}</p>
        <p className="text-[13px] font-bold text-primary-dark whitespace-nowrap">{tn(credits.free, "{n} left to use", "{n} left to use")}</p>
      </div>
      <p className="text-[12px] leading-[17px] text-charcoal-soft mt-1.5">{t("Each class-slot hire uses 1 class credit instead of the hiring fee.")}</p>
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
      <BuyInApp product="class_credits" compact className="mt-3 !shadow-none !bg-cream-soft" />
    </section>
  );
}
