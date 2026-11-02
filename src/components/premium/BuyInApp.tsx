import clsx from "clsx";
import { Smartphone } from "lucide-react";
import { RefundPolicyLink } from "../legal/RefundPolicyLink";
import { t } from "../../i18n/core";
import { APP_STORE_URL, GOOGLE_PLAY_URL, STORE_APPS_LIVE, formatPremiumPrice } from "../../services/premium/model";

// undrawn (Round G, no handover)
// Round G1 · "Buy in the Centium app" (CF; decisions G7 b and G10): the one
// block shown wherever Premium (or a hiring credit) is offered. The web never
// sells either: the prices are the Database's, the store buttons are
// disabled and say "Coming soon" until STORE_APPS_LIVE, the trial and the
// billing are Apple's or Google's, and the refund policy is linked.

type Props =
  | { product: "premium"; monthly: number | null; yearly: number | null; trialDays: number | null; compact?: boolean; className?: string }
  | { product: "hiring_credits"; price1: number | null; price3: number | null; compact?: boolean; className?: string };

function priceLine(p: Props): string | null {
  if (p.product === "premium") {
    const m = formatPremiumPrice(p.monthly);
    const y = formatPremiumPrice(p.yearly);
    if (m && y) return t("{monthly} a month or {yearly} a year", { monthly: m, yearly: y });
    if (m) return t("{price} a month", { price: m });
    if (y) return t("{price} a year", { price: y });
    return null;
  }
  const one = formatPremiumPrice(p.price1);
  const three = formatPremiumPrice(p.price3);
  if (one && three) return t("{one} for 1 hiring credit, {three} for 3", { one, three });
  return null;
}

const StoreButton = ({ label, href }: { label: string; href: string | null }) => {
  const live = STORE_APPS_LIVE && !!href;
  const inner = (
    <>
      <Smartphone size={15} aria-hidden className="shrink-0" />
      <span className="flex flex-col items-start leading-tight min-w-0">
        <span className="text-[12px] font-bold truncate">{label}</span>
        {!live && <span className="text-[10.5px] font-semibold opacity-80">{t("Coming soon")}</span>}
      </span>
    </>
  );
  const cls = "flex-1 min-h-[44px] rounded-xl px-3 py-2 flex items-center justify-center gap-2 text-start";
  return live ? (
    <a href={href!} target="_blank" rel="noopener noreferrer" className={clsx("tap bg-primary-fill text-on-primary-fill", cls)}>
      {inner}
    </a>
  ) : (
    <button type="button" disabled aria-disabled="true" className={clsx("bg-cream-soft text-charcoal-soft cursor-not-allowed", cls)}>
      {inner}
    </button>
  );
};

export function BuyInApp(props: Props) {
  const line = priceLine(props);
  const billing =
    props.product === "premium"
      ? props.trialDays && props.trialDays > 0
        ? t("The {n}-day free trial and billing are handled by Apple or Google.", { n: props.trialDays })
        : t("The free trial and billing are handled by Apple or Google.")
      : t("Billing is handled by Apple or Google.");
  return (
    <section data-buy-in-app aria-label={t("Buy in the Centium app")} className={clsx("rounded-2xl bg-cream-card shadow-soft", props.compact ? "px-3.5 py-3" : "px-4 py-4", props.className)}>
      <p className="text-[13px] font-extrabold text-charcoal">{t("Buy in the Centium app")}</p>
      {line && <p className="text-[12px] text-charcoal-soft mt-0.5">{line}</p>}
      <div className="flex gap-2 mt-3">
        <StoreButton label="App Store" href={APP_STORE_URL} />
        <StoreButton label="Google Play" href={GOOGLE_PLAY_URL} />
      </div>
      <p className="text-[11px] text-charcoal-faint mt-2.5 leading-[16px]">
        {billing} <RefundPolicyLink />
      </p>
    </section>
  );
}
