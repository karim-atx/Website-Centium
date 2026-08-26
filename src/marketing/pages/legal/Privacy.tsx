import React from "react";
import { Section } from "../../components/Section";
import { LegalNotice } from "./LegalNotice";
import { useSEO } from "../../useSEO";

export const Privacy: React.FC = () => {
  useSEO("Privacy Policy", "Centium's privacy policy.");

  return (
    <Section narrow className="pt-14 sm:pt-20">
      <h1 className="font-display font-extrabold text-4xl text-charcoal tracking-tight mb-3">Privacy Policy</h1>
      <p className="text-sm text-charcoal-faint mb-8">Placeholder draft — not yet reviewed by legal counsel.</p>
      <LegalNotice />

      <div className="prose-legal mt-8 flex flex-col gap-8 text-charcoal-soft leading-relaxed">
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">1. Overview</h2>
          <p>
            [Placeholder] This policy will describe what information Centium collects, how it is used, and the
            choices available to users. It must be drafted and approved by qualified legal counsel before this
            product handles any real user data.
          </p>
        </section>
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">2. Information we collect</h2>
          <p>
            [Placeholder] To be specified — categories such as account information, health and fitness data
            entered into the app, usage data, and device information will need explicit, accurate
            documentation reflecting the actual product implementation.
          </p>
        </section>
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">3. How we use information</h2>
          <p>[Placeholder] To be specified once data flows, third-party processors, and AI features are finalized.</p>
        </section>
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">4. Health data</h2>
          <p>
            [Placeholder] Health and fitness data is sensitive personal data in most jurisdictions. This section
            must address applicable regulations (e.g. HIPAA, GDPR, or local equivalents) once the product's
            actual data handling and hosting are determined — do not treat this draft as compliant with any of
            them.
          </p>
        </section>
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">5. Data sharing & third parties</h2>
          <p>[Placeholder] To be specified once real infrastructure and integration partners are chosen.</p>
        </section>
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">6. Your rights & choices</h2>
          <p>[Placeholder] To be specified per applicable jurisdiction (access, deletion, portability, etc.).</p>
        </section>
        <section>
          <h2 className="font-display font-bold text-lg text-charcoal mb-2">7. Contact</h2>
          <p>[Placeholder] Contact details for privacy inquiries — TBD.</p>
        </section>
      </div>
    </Section>
  );
};
