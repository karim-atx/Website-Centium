import React from "react";
import { Section } from "../../components/Section";
import { StickyIndex } from "../../components/StickyIndex";
import { LegalNotice } from "./LegalNotice";
import { useSEO } from "../../useSEO";

const sections = [
  { id: "overview", title: "1. Overview", body: "[Placeholder] This policy will describe what information Centium collects, how it is used, and the choices available to users. It must be drafted and approved by qualified legal counsel before this product handles any real user data." },
  { id: "info-we-collect", title: "2. Information we collect", body: "[Placeholder] To be specified — categories such as account information, health and fitness data entered into the app, usage data, and device information will need explicit, accurate documentation reflecting the actual product implementation." },
  { id: "how-we-use", title: "3. How we use information", body: "[Placeholder] To be specified once data flows, third-party processors, and AI features are finalized." },
  { id: "health-data", title: "4. Health data", body: "[Placeholder] Health and fitness data is sensitive personal data in most jurisdictions. This section must address applicable regulations (e.g. HIPAA, GDPR, or local equivalents) once the product's actual data handling and hosting are determined — do not treat this draft as compliant with any of them." },
  { id: "sharing", title: "5. Data sharing & third parties", body: "[Placeholder] To be specified once real infrastructure and integration partners are chosen." },
  { id: "rights", title: "6. Your rights & choices", body: "[Placeholder] To be specified per applicable jurisdiction (access, deletion, portability, etc.)." },
  { id: "contact", title: "7. Contact", body: "[Placeholder] Contact details for privacy inquiries — TBD." },
];

export const Privacy: React.FC = () => {
  useSEO("Privacy Policy", "Centium's privacy policy.");

  return (
    <Section className="pt-14 sm:pt-20">
      <h1 className="font-display font-extrabold text-4xl text-mkt-ink tracking-tight mb-2.5">Privacy Policy</h1>
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
