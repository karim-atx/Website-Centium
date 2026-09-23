import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Clock } from "lucide-react";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Eyebrow } from "../components/Eyebrow";
import { useSEO } from "../useSEO";

const topics = ["General", "Professional", "Business", "Press"];

export const Contact: React.FC = () => {
  useSEO("Contact", "Get in touch with the Centium team.");
  const [topic, setTopic] = useState(0);
  const [sent, setSent] = useState(false);

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
        <div className="grid lg:grid-cols-[1.3fr_.7fr] max-w-4xl mx-auto border border-mkt-line rounded-3xl overflow-hidden bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="p-7 sm:p-9 flex flex-col gap-3.5"
          >
            <span className="font-semibold text-[10.5px] tracking-[.16em] text-mkt-faint">WHAT'S THIS ABOUT?</span>
            <div className="flex flex-wrap gap-2 mb-1.5">
              {topics.map((t, i) => {
                const active = topic === i;
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTopic(i)}
                    className="px-3.5 py-2 rounded-full text-[13px] font-bold transition-colors duration-200 border"
                    style={
                      active
                        ? { background: "#2F5F58", borderColor: "#2F5F58", color: "#fff" }
                        : { background: "transparent", borderColor: "#E0DDD6", color: "#5B5349" }
                    }
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              required
              placeholder="Name"
              className="border border-[#E0DDD6] rounded-xl px-4 py-3 text-sm text-mkt-ink placeholder:text-mkt-faint focus:outline-none focus:border-mkt-accent transition-colors duration-200"
            />
            <input
              type="email"
              required
              placeholder="Email"
              className="border border-[#E0DDD6] rounded-xl px-4 py-3 text-sm text-mkt-ink placeholder:text-mkt-faint focus:outline-none focus:border-mkt-accent transition-colors duration-200"
            />
            <textarea
              required
              rows={4}
              placeholder="How can we help?"
              className="border border-[#E0DDD6] rounded-xl px-4 py-3 text-sm text-mkt-ink placeholder:text-mkt-faint focus:outline-none focus:border-mkt-accent transition-colors duration-200 resize-none"
            />
            <button
              type="submit"
              className="tap self-center w-1/2 rounded-full bg-mkt-accent hover:bg-mkt-accent-hover active:scale-[0.98] text-white font-semibold text-sm py-3.5 px-[26px] mt-1 transition-colors duration-200"
            >
              {sent ? "Message noted — thank you" : "Send message"}
            </button>
          </form>

          <div className="border-t lg:border-t-0 lg:border-l border-mkt-line p-7 sm:p-9 flex flex-col gap-6 bg-mkt-wash2">
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 font-semibold text-[10.5px] tracking-[.16em] text-mkt-faint">
                <Mail size={13} /> EMAIL
              </span>
              <a href="mailto:support@atraxia.org" className="text-sm font-semibold" style={{ color: "#6A54C4" }}>
                support@atraxia.org
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 font-semibold text-[10.5px] tracking-[.16em] text-mkt-faint">
                <Clock size={13} /> RESPONSE TIME
              </span>
              <p className="text-sm text-mkt-soft">Within a few business days</p>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="flex flex-wrap gap-3 justify-center mt-[76px]">
        <Link
          to="/"
          className="px-7 py-[15px] rounded-full bg-mkt-accent hover:bg-mkt-accent-hover text-white font-semibold text-[15px] transition-colors"
        >
          Back to home
        </Link>
        <Link
          to="/legal"
          className="px-[26px] py-[15px] rounded-full border border-[#CFC5EA] hover:border-mkt-accent text-mkt-ink font-semibold text-[15px] transition-colors"
        >
          Legal
        </Link>
      </div>
    </Section>
  );
};
