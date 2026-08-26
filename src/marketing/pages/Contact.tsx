import React from "react";
import { Mail, MapPin } from "lucide-react";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { useSEO } from "../useSEO";

export const Contact: React.FC = () => {
  useSEO("Contact", "Get in touch with the Centium team.");

  return (
    <Section className="pt-14 sm:pt-20" narrow>
      <Reveal className="text-center mb-14">
        <p className="text-sm font-bold uppercase tracking-wide text-primary-dark mb-3">Contact</p>
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-charcoal tracking-tight mb-5">
          Get in touch
        </h1>
        <p className="text-charcoal-soft text-lg leading-relaxed">
          Questions about Centium, or interested in bringing your practice or business on board? Reach out.
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="rounded-3xl bg-cream-card shadow-soft p-8 sm:p-10 flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <span className="w-10 h-10 rounded-2xl bg-primary-pale text-primary-dark flex items-center justify-center shrink-0">
              <Mail size={18} />
            </span>
            <div>
              <p className="font-semibold text-charcoal">Email</p>
              <p className="text-sm text-charcoal-faint">[contact email — TBD]</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="w-10 h-10 rounded-2xl bg-teal-pale text-teal-dark flex items-center justify-center shrink-0">
              <MapPin size={18} />
            </span>
            <div>
              <p className="font-semibold text-charcoal">Location</p>
              <p className="text-sm text-charcoal-faint">[office / location — TBD]</p>
            </div>
          </div>
          <p className="text-xs text-charcoal-faint pt-2 border-t border-charcoal/5">
            Contact details haven't been finalized yet — this section is a placeholder pending real contact
            channels.
          </p>
        </div>
      </Reveal>
    </Section>
  );
};
