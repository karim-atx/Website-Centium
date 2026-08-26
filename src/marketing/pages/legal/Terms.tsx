import React from "react";
import { Section } from "../../components/Section";
import { LegalNotice } from "./LegalNotice";
import { useSEO } from "../../useSEO";

export const Terms: React.FC = () => {
  useSEO("Terms of Service", "Centium's terms of service.");

  return (
    <Section narrow className="pt-14 sm:pt-20">
      <h1 className="font-display font-extrabold text-4xl text-charcoal tracking-tight mb-3">Terms of Service</h1>
      <p className="text-sm text-charcoal-faint mb-8">Placeholder draft — not yet reviewed by legal counsel.</p>
      <LegalNotice />

      <div className="prose-legal mt-8 flex flex-col gap-8 text-charcoal-soft leading-relaxed">
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">1. Acceptance of terms</h2>
          <p>[Placeholder] To be drafted by qualified legal counsel before this product is made available to real users.</p>
        </section>
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">2. Description of service</h2>
          <p>
            [Placeholder] Centium is a health & wellness platform combining nutrition tracking, workout
            logging, health tracking, AI-powered guidance, and community/professional access. Exact scope of
            service must be finalized here.
          </p>
        </section>
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">3. Accounts & eligibility</h2>
          <p>[Placeholder] To be specified — minimum age, account types (client, professional, business), and verification requirements.</p>
        </section>
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">4. Subscriptions & billing</h2>
          <p>
            [Placeholder] Centium's business model includes client subscriptions, professional seats, and
            business accounts (subscription plus revenue share). Actual billing terms, cancellation and refund
            policy must be drafted here — none are established yet.
          </p>
        </section>
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">5. Health & medical disclaimer</h2>
          <p>
            [Placeholder] This section must clearly state that Centium is not a medical device or substitute
            for professional medical advice, diagnosis or treatment, drafted and reviewed by qualified legal
            and medical/compliance counsel.
          </p>
        </section>
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">6. User content & conduct</h2>
          <p>[Placeholder] To be specified.</p>
        </section>
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">7. Termination</h2>
          <p>[Placeholder] To be specified.</p>
        </section>
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">8. Limitation of liability</h2>
          <p>[Placeholder] To be specified per applicable jurisdiction.</p>
        </section>
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">9. Governing law</h2>
          <p>[Placeholder — jurisdiction TBD]</p>
        </section>
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">10. Contact</h2>
          <p>[Placeholder] Contact details for legal inquiries — TBD.</p>
        </section>
      </div>
    </Section>
  );
};
