import React, { useState } from "react";
import { Mail, Clock } from "lucide-react";
import clsx from "clsx";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Eyebrow } from "../components/Eyebrow";
import { useSEO } from "../useSEO";

const topics = ["General", "Professional", "Business", "Press"];

export const Contact: React.FC = () => {
  useSEO("Contact", "Get in touch with the Centium team.");
  const [topic, setTopic] = useState(0);

  return (
    <Section className="pt-32 sm:pt-[152px] pb-24">
      <Reveal className="text-center mb-14 max-w-2xl mx-auto">
        <Eyebrow className="mx-auto">CONTACT</Eyebrow>
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-mkt-ink tracking-tight mt-5">Get in touch</h1>
        <p className="text-lg leading-relaxed text-mkt-soft mt-4">
          Questions about Centium, or interested in bringing your practice or business on board? Reach out.
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="grid lg:grid-cols-[1.3fr_.7fr] gap-8 max-w-4xl mx-auto border border-mkt-line rounded-3xl overflow-hidden bg-white">
          <form onSubmit={(e) => e.preventDefault()} className="p-7 sm:p-9 flex flex-col gap-3.5">
            <span className="font-semibold text-[10.5px] tracking-[.16em] text-mkt-faint">WHAT'S THIS ABOUT?</span>
            <div className="flex flex-wrap gap-2 mb-1.5">
              {topics.map((t, i) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTopic(i)}
                  className={clsx(
                    "px-3.5 py-2 rounded-full text-[13px] font-bold transition-colors",
                    topic === i ? "bg-mkt-ink text-white" : "border border-[#E0DDD6] text-mkt-soft"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              placeholder="Name"
              className="border border-[#E0DDD6] rounded-xl px-4 py-3 text-sm text-mkt-ink placeholder:text-mkt-faint focus:outline-none focus:border-mkt-accent"
            />
            <input
              type="email"
              required
              placeholder="Email"
              className="border border-[#E0DDD6] rounded-xl px-4 py-3 text-sm text-mkt-ink placeholder:text-mkt-faint focus:outline-none focus:border-mkt-accent"
            />
            <textarea
              required
              rows={4}
              placeholder="How can we help?"
              className="border border-[#E0DDD6] rounded-xl px-4 py-3 text-sm text-mkt-ink placeholder:text-mkt-faint focus:outline-none focus:border-mkt-accent resize-none"
            />
            <button type="submit" className="tap rounded-full bg-mkt-accent hover:bg-mkt-accent-hover text-white font-semibold text-sm py-3.5 mt-1 transition-colors">
              Send message
            </button>
            <p className="text-xs text-mkt-faint">
              This form isn't wired up to a real inbox yet — email us directly using the address alongside, or check
              back once contact channels are finalized.
            </p>
          </form>

          <div className="border-t lg:border-t-0 lg:border-l border-mkt-line p-7 sm:p-9 flex flex-col gap-6 bg-mkt-wash">
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 font-semibold text-[10.5px] tracking-[.16em] text-mkt-faint">
                <Mail size={13} /> EMAIL
              </span>
              <p className="text-sm text-mkt-soft">[contact email — TBD]</p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 font-semibold text-[10.5px] tracking-[.16em] text-mkt-faint">
                <Clock size={13} /> RESPONSE TIME
              </span>
              <p className="text-sm text-mkt-soft">Within a few business days</p>
            </div>
            <p className="text-xs text-mkt-faint pt-4 border-t border-mkt-line">
              Contact details haven't been finalized yet — this section is a placeholder pending real contact
              channels.
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
};
