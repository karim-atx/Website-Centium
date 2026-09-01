import React from "react";
import { Users } from "lucide-react";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Eyebrow } from "../components/Eyebrow";
import { AppScreen } from "../components/illustrations/AppScreen";
import { PhotoPanel } from "../components/illustrations/PhotoPanel";
import { useSEO } from "../useSEO";

const professionals = ["Personal Trainers", "Dietitians", "Physiotherapists", "GPs & other professionals"];
const businesses = ["Gyms", "Clothing stores", "Equipment stores", "Supplement stores", "Meal prepping services", "Wellness services"];

const steps = [
  { n: "01", title: "Sign up", description: "Create your professional or business account and pick a plan." },
  { n: "02", title: "Set up your space", description: "Import your client roster, or list your gym, store or service." },
  { n: "03", title: "Go live", description: "Clients and customers find and book you from inside Centium." },
];

export const Business: React.FC = () => {
  useSEO(
    "For Professionals & Businesses",
    "Centium for personal trainers, dietitians, physiotherapists, gyms and businesses — client tools, listings and seat- or revenue-based billing."
  );

  return (
    <>
      <Section className="pt-0 pb-0 border-b border-mkt-line">
        <div className="grid lg:grid-cols-2 gap-0 -mx-5 sm:-mx-10">
          <div className="px-5 sm:px-10 pt-[136px] pb-16 sm:pt-[168px] sm:pb-24 flex flex-col justify-center" style={{ background: "linear-gradient(#F6F4FD, #fff)" }}>
            <Reveal>
              <Eyebrow>FOR BUSINESS</Eyebrow>
              <h1 className="font-display font-extrabold text-4xl sm:text-[46px] leading-[1.08] tracking-[-.03em] text-mkt-ink mt-4">
                Bring your clients and listings into Centium.
              </h1>
              <p className="text-lg leading-relaxed text-mkt-soft mt-5 max-w-md">
                Centium is B2B and B2C — professionals manage clients and businesses manage listings on the same
                platform their clients already use to track their health.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <a href="#lead" className="tap px-6 py-3.5 rounded-full bg-mkt-accent hover:bg-mkt-accent-hover text-white font-semibold text-sm transition-colors">
                  Talk to us
                </a>
                <a href="#professionals" className="tap px-6 py-3.5 rounded-full border border-[#DFDAD2] hover:border-mkt-ink text-mkt-ink font-semibold text-sm transition-colors">
                  See the dashboard
                </a>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.08} className="min-h-[240px] lg:min-h-0">
            <PhotoPanel icon={<Users size={22} />} tone="primary" className="w-full h-full" />
          </Reveal>
        </div>
      </Section>

      <Section id="professionals" className="bg-white scroll-mt-20">
        <div className="grid lg:grid-cols-2 gap-5">
          <Reveal>
            <div className="border border-mkt-line rounded-3xl p-8 sm:p-9 h-full flex flex-col">
              <Eyebrow>PROFESSIONALS</Eyebrow>
              <h2 className="font-display font-bold text-xl text-mkt-ink mt-3">For professionals</h2>
              <p className="text-base leading-relaxed text-mkt-soft mt-2.5">
                Manage your client roster, bookings and shared health data — billed monthly or yearly, per seat.
              </p>
              <ul className="flex flex-wrap gap-2 mt-5">
                {professionals.map((p) => (
                  <li key={p} className="text-xs font-semibold px-3 py-2 rounded-full bg-mkt-tint text-mkt-accent-hover">
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-6 h-[190px] rounded-2xl overflow-hidden bg-mkt-wash2 border border-mkt-line">
                <AppScreen variant="roster" />
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="border border-mkt-line rounded-3xl p-8 sm:p-9 h-full flex flex-col">
              <Eyebrow tone="teal">BUSINESSES</Eyebrow>
              <h2 className="font-display font-bold text-xl text-mkt-ink mt-3">For businesses</h2>
              <p className="text-base leading-relaxed text-mkt-soft mt-2.5">
                List your gym, store or service — billed monthly or yearly, plus a share of the revenue generated
                through Centium.
              </p>
              <ul className="flex flex-wrap gap-2 mt-5">
                {businesses.map((b) => (
                  <li key={b} className="text-xs font-semibold px-3 py-2 rounded-full bg-mkt-teal-tint text-mkt-teal">
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-6 h-[190px] rounded-2xl overflow-hidden bg-mkt-wash2 border border-mkt-line">
                <AppScreen variant="listing" />
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section className="bg-mkt-wash border-t border-b border-mkt-line">
        <Reveal>
          <h2 className="font-display font-bold text-2xl text-mkt-ink tracking-tight mb-9">How onboarding works</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {steps.map((s) => (
              <div key={s.n} className="border border-mkt-line rounded-2xl bg-white p-6">
                <span className="font-semibold text-xs text-mkt-accent-ring">{s.n}</span>
                <div className="font-bold text-[15px] text-mkt-ink mt-2">{s.title}</div>
                <p className="text-sm leading-relaxed text-mkt-soft mt-1.5">{s.description}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      <Section id="lead" className="bg-mkt-dark" navDark>
        <Reveal>
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-mkt-dark-ink tracking-tight">
                Join the Centium network
              </h2>
              <p className="text-[15px] leading-relaxed text-mkt-dark-soft mt-3 max-w-sm">
                Get in touch to learn more about bringing your practice or business onto Centium — no bouncing to
                another page, just tell us a bit about you.
              </p>
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-2.5">
              <input
                type="text"
                required
                placeholder="Name"
                className="bg-transparent border border-mkt-dark-line rounded-lg px-4 py-3 text-sm text-mkt-dark-ink placeholder:text-mkt-dark-soft/60 focus:outline-none focus:border-mkt-dark-accent"
              />
              <input
                type="email"
                required
                placeholder="Email"
                className="bg-transparent border border-mkt-dark-line rounded-lg px-4 py-3 text-sm text-mkt-dark-ink placeholder:text-mkt-dark-soft/60 focus:outline-none focus:border-mkt-dark-accent"
              />
              <button type="submit" className="tap rounded-lg bg-mkt-dark-accent text-mkt-dark font-semibold text-sm py-3 mt-1">
                Get in touch
              </button>
              <p className="text-xs text-mkt-dark-soft/70">Not yet connected — email us directly from the Contact page for now.</p>
            </form>
          </div>
        </Reveal>
      </Section>
    </>
  );
};
