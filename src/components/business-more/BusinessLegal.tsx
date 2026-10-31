import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { t, tk } from "../../i18n/core";

// OURS-MO1B-legal · the business sections of Terms of Service and Privacy
// (BizMoreV8 B.legal isNew blocks; text LEGAL_AND_HELP.md "For business
// accounts" / "Business accounts", for lawyer review before publishing,
// HANDOVER 7). Business accounts see them after the general sections;
// clients see theirs only. Label 10.5/700 faint; blocks r14 padding 12 14
// #F7F7FC with a 1.5 primary border, heading 14/800 line 19, body 12.5 line
// 19 inkSoft, and a "New" chip 9.5/800 uppercase on primary.

const BUSINESS_TERMS: [string, string][] = [
  [tk("Business accounts"), tk("A business account must be opened by someone allowed to act for the business. You confirm you have that authority and that the business details you give are true.")],
  [tk("Your listing"), tk("Keep your listing, classes, prices, photos and opening hours accurate and up to date. Don't show photos of a space that isn't yours.")],
  [tk("Payments, fees and refunds"), tk("Clients may pay you through Whish or in cash. Centium's fees are shown before you accept them. You're responsible for refunds to your clients under your own policy.")],
  [tk("Your policies and waivers"), tk("Your cancellation rules, waivers and class terms are yours. You're responsible for what they say and for applying them fairly.")],
  [tk("Your team"), tk("Professionals join your business with your business ID and use a seat. You're responsible for how your staff behave on Centium.")],
  [tk("Reviews of your business"), tk("Don't post or pay for fake reviews. Reply to reviews politely and never share a client's private details in a reply.")],
  [tk("Promotions and featured placement"), tk("Promotions must be honest. Paid featured placement is labelled as featured and doesn't change your rating.")],
  [tk("Suspending or closing a business account"), tk("We may suspend a business account that breaks these terms or puts clients at risk. You can close yours at any time from Settings.")],
];

const BUSINESS_PRIVACY: [string, string][] = [
  [tk("Business data we collect"), tk("Your business details, staff and roles, schedules, offerings, promotions and the transactions that run through Centium.")],
  [tk("Client data shared with a business"), tk("A business sees a client's name, bookings and membership status. Clients who haven't shared their profile show as a member number. Health data is never shared unless the client switches it on.")],
  [tk("Your responsibilities as a business"), tk("Use client data only to run your services. Don't export it for unrelated marketing, and keep staff access to the people who need it.")],
  [tk("Analytics for businesses"), tk("Reports show counts and trends across your clients, not the private details of any one person.")],
  [tk("Payment data"), tk("Whish handles payments. We keep the amount, method and status of each payment, never full card or account numbers.")],
  [tk("Closing a business account"), tk("When a business account is closed, its listing and team access end at once. Business records are removed within the deletion period, except what the law requires us to keep.")],
];

export function BusinessLegalSections({ doc }: { doc: "terms" | "privacy" }) {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === "#business") document.getElementById("business")?.scrollIntoView({ block: "start" });
  }, [hash]);
  const sections = doc === "terms" ? BUSINESS_TERMS : BUSINESS_PRIVACY;
  return (
    <section id="business" aria-labelledby="business-legal-label" className="mt-6">
      <p id="business-legal-label" className="text-[10.5px] font-bold text-charcoal-faint" style={{ margin: "10px 2px 8px" }}>
        {doc === "terms" ? t("For business accounts") : t("Business accounts")}
      </p>
      {sections.map(([h, body]) => (
        <div key={h} className="bg-[#F7F7FC] dark:bg-th-aea1dc/[0.10] border-[1.5px] border-primary" style={{ borderRadius: 14, padding: "12px 14px", margin: "0 0 10px" }}>
          <div className="flex items-center justify-between" style={{ gap: 8 }}>
            <h3 className="text-[14px] font-extrabold leading-[19px] text-charcoal">{t(h)}</h3>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-primary-fill text-on-primary-fill text-[9.5px] font-extrabold uppercase tracking-[0.06em]" style={{ padding: "2px 8px" }}>
              {t("New")}
            </span>
          </div>
          <p className="text-[12.5px] leading-[19px] text-charcoal-soft" style={{ marginTop: 4 }}>
            {t(body)}
          </p>
        </div>
      ))}
    </section>
  );
}
