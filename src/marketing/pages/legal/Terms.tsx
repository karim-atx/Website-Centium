import React from "react";
import { Section } from "../../components/Section";
import { StickyIndex } from "../../components/StickyIndex";
import { LegalNotice } from "./LegalNotice";
import { useSEO } from "../../useSEO";

const sections = [
  { id: "acceptance", title: "1. Acceptance of terms", body: "[Placeholder] To be drafted by qualified legal counsel before this product is made available to real users." },
  { id: "description", title: "2. Description of service", body: "[Placeholder] Centium is a health & wellness platform combining nutrition tracking, workout logging, health tracking, AI-powered guidance, and community/professional access. Exact scope of service must be finalized here." },
  { id: "accounts", title: "3. Accounts & eligibility", body: "[Placeholder] To be specified — minimum age, account types (client, professional, business), and verification requirements." },
  { id: "billing", title: "4. Subscriptions & billing", body: "[Placeholder] Centium's business model includes client subscriptions, professional seats, and business accounts (subscription plus revenue share). Actual billing terms, cancellation and refund policy must be drafted here — none are established yet." },
  { id: "disclaimer", title: "5. Health & medical disclaimer", body: "[Placeholder] This section must clearly state that Centium is not a medical device or substitute for professional medical advice, diagnosis or treatment, drafted and reviewed by qualified legal and medical/compliance counsel." },
  { id: "conduct", title: "6. User content & conduct", body: "[Placeholder] To be specified." },
  { id: "termination", title: "7. Termination", body: "[Placeholder] To be specified." },
  { id: "liability", title: "8. Limitation of liability", body: "[Placeholder] To be specified per applicable jurisdiction." },
  { id: "law", title: "9. Governing law", body: "[Placeholder — jurisdiction TBD]" },
  { id: "contact", title: "10. Contact", body: "[Placeholder] Contact details for legal inquiries — TBD." },
];

export const Terms: React.FC = () => {
  useSEO("Terms of Service", "Centium's terms of service.");

  return (
    <Section className="pt-32 sm:pt-[152px]">
      <h1 className="font-display font-extrabold text-4xl text-mkt-ink tracking-tight mb-2.5">Terms of Service</h1>
      <p className="text-sm text-mkt-faint mb-8">Placeholder draft — not yet reviewed by legal counsel.</p>
      <LegalNotice />

      <div className="flex gap-14 mt-10">
        <StickyIndex items={sections.map((s) => ({ id: s.id, label: s.title.replace(/^\d+\.\s*/, "") }))} />
        <div className="flex flex-col gap-8 text-mkt-soft leading-[1.75] max-w-[68ch]">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="font-display font-bold text-lg text-mkt-ink mb-2">{s.title}</h2>
              <p>{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </Section>
  );
};
