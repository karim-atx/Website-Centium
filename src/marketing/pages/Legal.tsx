import React from "react";
import { Link } from "react-router-dom";
import { useSEO } from "../useSEO";

// v3 Centium landing handoff, "Centium Legal.dc.html": three full sections
// (Terms of Service, Privacy Policy, Health & Medical Disclaimer) replacing
// the earlier twelve-anchor-stub structure — real, if still placeholder,
// body copy instead of one-paragraph summaries per topic. Content here is
// unreviewed draft per the handoff's own amber notice; kept as an explicit
// banner (this repo's existing convention for unreviewed legal content)
// rather than dropped, since none of this is real published policy.
//
// The handoff's own prototype ships this page with its own opaque sticky
// header (logo + "Back to site"), since the prototype has no shared nav to
// fall back on. This app already wraps every marketing route in the one
// shared, transparent <Nav /> (MarketingLayout) — duplicating a second
// header here would stack two nav bars. Top padding below clears that
// shared nav instead.
const bullets = {
  terms: [
    {
      h: "Your account",
      items: [
        "You must be at least 16 years old (or the age of digital consent in your country) to hold a Centium account, and you are responsible for keeping your credentials secure.",
        "Information you log — meals, sessions, weights, biomarkers, journal entries — belongs to you. You are responsible for its accuracy and for what you choose to share with professionals or businesses.",
        "Accounts may not be shared. Professionals and businesses are licensed per seat and per location.",
      ],
    },
    {
      h: "Subscriptions and billing",
      items: [
        "Consumer plans bill monthly or yearly in advance; yearly plans are discounted and renew automatically until cancelled.",
        "Professional seats are billed per active seat per month. Business plans combine a platform fee with a revenue share on marketplace transactions, itemised on each invoice.",
        "You can cancel at any time; access continues to the end of the paid period. Statutory refund and cooling-off rights are unaffected.",
        "Prices may change with at least 30 days' notice before your next renewal.",
      ],
    },
    {
      h: "Acceptable use",
      items: [
        "Don't misuse the platform: no scraping, reverse engineering, resale of access, or uploading unlawful or harmful content.",
        "Professionals and businesses must hold the qualifications, registrations and insurance their services require, and must only access client data a client has explicitly shared with them.",
        "Marketplace listings must be accurate. Centium may suspend listings or accounts that breach these terms.",
      ],
    },
  ],
  privacy: [
    {
      h: "What we collect",
      items: [
        "Account data — name, email, account type, and billing details processed by our payment provider (we never store full card numbers).",
        "Health and activity data — food logs, workouts, body metrics, sleep and step data, biomarker results, habits and journal entries, including anything synced from a connected health service with your permission.",
        "Usage data — device type, app version and diagnostic events used to keep the product working and improve it.",
      ],
    },
    {
      h: "How it's used and shared",
      items: [
        "To operate your account, calculate goals and trends, and deliver the features you use. Health data is treated as a special category of personal data and processed on the basis of your explicit consent.",
        "Professionals and businesses only see what you have switched on for them — food diary, workouts, weight, progress or health metrics — and you can revoke any of it at any time.",
        "We do not sell personal data and do not use health data for advertising. Service providers (hosting, payments, analytics) act on our instructions under contract.",
        "Aggregated, de-identified statistics may be used to improve the product and to give businesses anonymised insights that cannot identify an individual.",
      ],
    },
    {
      h: "Retention, security and your rights",
      items: [
        "Data is kept while your account is active and for a limited period afterwards to meet legal and accounting obligations, then deleted or irreversibly anonymised.",
        "Data is encrypted in transit and at rest, with access limited to staff who need it. We will notify affected users and regulators of a qualifying breach without undue delay.",
        "You can access, export, correct or delete your data, withdraw consent, or object to certain processing — from Settings, or by contacting us.",
      ],
    },
  ],
};

const Bullets: React.FC<{ items: string[]; color: string }> = ({ items, color }) => (
  <ul className="flex flex-col gap-3 mt-3.5">
    {items.map((t) => (
      <li key={t} className="flex gap-3 items-baseline">
        <span className="font-bold" style={{ color }}>—</span>
        <span className="text-base leading-[1.6] text-mkt-soft">{t}</span>
      </li>
    ))}
  </ul>
);

export const Legal: React.FC = () => {
  useSEO("Legal", "Centium's Terms of Service, Privacy Policy, and Health & Medical Disclaimer.");

  return (
    <div>
      <section
        className="relative overflow-hidden pt-32 sm:pt-[152px] pb-16 sm:pb-24"
        style={{ background: "linear-gradient(160deg,#EDE7FB 0%,#F7F5FB 46%,#EAF3F0 100%)" }}
      >
        <div
          aria-hidden="true"
          className="absolute rounded-full pointer-events-none"
          style={{ left: -130, top: -60, width: 320, height: 320, background: "radial-gradient(circle at 50% 50%,rgba(140,110,222,.3),rgba(140,110,222,0) 68%)" }}
        />
        <div
          aria-hidden="true"
          className="absolute rounded-full pointer-events-none"
          style={{ right: -120, bottom: -140, width: 340, height: 340, background: "radial-gradient(circle at 50% 50%,rgba(111,153,147,.3),rgba(111,153,147,0) 68%)" }}
        />
        <div className="relative max-w-[1180px] mx-auto px-5 sm:px-10">
          <span className="block font-semibold text-[11px] tracking-[.22em] text-mkt-accent-hover">LEGAL</span>
          <h1 className="font-display font-extrabold text-[clamp(34px,4.6vw,52px)] leading-[1.08] tracking-[-.032em] mt-[18px] max-w-[720px] text-mkt-ink">
            Policies, privacy and disclaimers.
          </h1>
          <p className="text-[17px] leading-relaxed text-mkt-soft mt-[18px] max-w-[620px]">
            Everything covering how Centium works, how your data is handled, and what Centium is — and isn't —
            responsible for. Last updated 6 September 2026.
          </p>
          <div className="flex flex-wrap gap-2 mt-7">
            <a href="#terms" className="px-[15px] py-2.5 rounded-full font-semibold text-[13px]" style={{ background: "#F4F1FB", color: "#6A54C4" }}>
              Terms of Service
            </a>
            <a href="#privacy" className="px-[15px] py-2.5 rounded-full font-semibold text-[13px]" style={{ background: "#EDF4F3", color: "#4F8F8A" }}>
              Privacy Policy
            </a>
            <a href="#health" className="px-[15px] py-2.5 rounded-full font-semibold text-[13px]" style={{ background: "#F4F1FB", color: "#6A54C4" }}>
              Health &amp; Medical Disclaimer
            </a>
          </div>
        </div>
      </section>

      <main className="max-w-[1180px] mx-auto px-5 sm:px-10 py-10 sm:py-16">
        <div
          className="flex gap-4 items-start p-[22px_24px] rounded-2xl max-w-[860px]"
          style={{ background: "#FBF6E9", border: "2px solid #D9A441", padding: "22px 24px" }}
        >
          <span className="w-[34px] h-[34px] shrink-0 rounded-full flex items-center justify-center font-extrabold text-base" style={{ background: "#F6E9C9", color: "#8A6512" }}>
            !
          </span>
          <div>
            <div className="font-extrabold text-[15.5px] text-mkt-ink">Placeholder content — not reviewed by a lawyer</div>
            <p className="text-[15px] leading-relaxed text-mkt-soft mt-1.5">
              The sections below are a structural starting point written for a health, fitness and nutrition
              platform with consumer and business tiers. They are <strong>not legal advice</strong> and must be
              reviewed, corrected and finalised by qualified legal counsel — including jurisdiction-specific
              health-data and consumer-billing requirements — before Centium launches publicly.
            </p>
          </div>
        </div>

        <section id="terms" className="max-w-[860px] mt-12 sm:mt-16 scroll-mt-24">
          <span className="block font-semibold text-[11px] tracking-[.22em]" style={{ color: "#7D67D9" }}>01</span>
          <h2 className="font-display font-extrabold text-[clamp(28px,3.4vw,38px)] leading-[1.1] tracking-[-.03em] text-mkt-ink mt-3.5">
            Terms of Service
          </h2>
          <p className="text-[16.5px] leading-[1.65] text-mkt-soft mt-[18px]">
            These terms govern your use of the Centium apps, website and connected professional and business
            dashboards. By creating an account you accept them on your own behalf, or on behalf of the practice or
            business you represent.
          </p>
          {bullets.terms.map((g) => (
            <React.Fragment key={g.h}>
              <h3 className="font-bold text-[19px] tracking-[-.01em] text-mkt-ink mt-[34px]">{g.h}</h3>
              <Bullets items={g.items} color="#7D67D9" />
            </React.Fragment>
          ))}
          <h3 className="font-bold text-[19px] tracking-[-.01em] text-mkt-ink mt-[34px]">Liability</h3>
          <p className="text-base leading-[1.65] text-mkt-soft mt-3.5">
            Centium is provided as a tracking and coordination tool, without warranty that it will be uninterrupted
            or error-free. To the fullest extent permitted by law, Centium is not liable for indirect or
            consequential loss, for decisions made on the basis of logged data, or for the services delivered by
            any professional or business you engage through the marketplace. Nothing here limits liability that
            cannot lawfully be limited.
          </p>
        </section>

        <section id="privacy" className="max-w-[860px] mt-14 sm:mt-[88px] pt-10 sm:pt-14 border-t border-mkt-line scroll-mt-24">
          <span className="block font-semibold text-[11px] tracking-[.22em]" style={{ color: "#4F8F8A" }}>02</span>
          <h2 className="font-display font-extrabold text-[clamp(28px,3.4vw,38px)] leading-[1.1] tracking-[-.03em] text-mkt-ink mt-3.5">
            Privacy Policy
          </h2>
          <p className="text-[16.5px] leading-[1.65] text-mkt-soft mt-[18px]">
            Centium exists to bring your health information together in one place, which means we take its
            handling seriously. This section explains what we collect, why, and the control you keep over it.
          </p>
          {bullets.privacy.map((g) => (
            <React.Fragment key={g.h}>
              <h3 className="font-bold text-[19px] tracking-[-.01em] text-mkt-ink mt-[34px]">{g.h}</h3>
              <Bullets items={g.items} color="#4F8F8A" />
            </React.Fragment>
          ))}
        </section>

        <section id="health" className="max-w-[860px] mt-14 sm:mt-[88px] pt-10 sm:pt-14 border-t border-mkt-line scroll-mt-24">
          <span className="block font-semibold text-[11px] tracking-[.22em]" style={{ color: "#7D67D9" }}>03</span>
          <h2 className="font-display font-extrabold text-[clamp(28px,3.4vw,38px)] leading-[1.1] tracking-[-.03em] text-mkt-ink mt-3.5">
            Health &amp; Medical Disclaimer
          </h2>
          <div className="mt-5 p-[22px_24px] rounded-2xl" style={{ background: "#7D67D9", border: "2px solid #3E2F7A", padding: "22px 24px" }}>
            <p className="text-[17px] leading-[1.55] font-semibold text-white">
              Centium supports your health journey — it does not provide medical diagnosis or treatment.
            </p>
          </div>
          <Bullets
            color="#7D67D9"
            items={[
              "Nutrition targets, training suggestions, biomarker readings and trend analysis are informational. They are generated from the data you enter and from general, published health standards — not from an assessment of your individual medical situation.",
              "Always consult a qualified healthcare professional before starting a new diet or training programme, changing medication, or acting on any reading shown in the app. Never delay seeking medical advice because of something you saw in Centium.",
              "Biomarker capture and any automated extraction of values from photos or connected services may be inaccurate. Treat laboratory reports and clinician guidance as the source of truth.",
              "Professionals and businesses on Centium are independent providers. Centium facilitates the connection and the data sharing; it does not supervise, endorse or take clinical responsibility for their advice or services.",
              "Centium is not an emergency service. If you think you are experiencing a medical emergency, contact your local emergency number immediately.",
            ]}
          />
        </section>

        <section className="max-w-[860px] mt-14 sm:mt-[88px] pt-10 sm:pt-14 border-t border-mkt-line">
          <h2 className="font-display font-extrabold text-[22px] tracking-[-.028em] text-mkt-ink">Questions about any of this?</h2>
          <p className="text-base leading-[1.65] text-mkt-soft mt-3 max-w-[620px]">
            Reach out and we'll point you to the right person — including for data access, export or deletion
            requests.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/" className="px-7 py-[15px] rounded-full bg-mkt-accent hover:bg-mkt-accent-hover text-white font-semibold text-[15px] transition-colors">
              Back to home
            </Link>
            <Link to="/contact" className="px-[26px] py-[15px] rounded-full border border-[#CFC5EA] hover:border-mkt-accent text-mkt-ink font-semibold text-[15px] transition-colors">
              Contact us
            </Link>
          </div>
        </section>
      </main>

      <div className="border-t border-mkt-line" style={{ background: "linear-gradient(#F7F5FB 0%,#EBE5FA 100%)" }}>
        <div className="max-w-[1180px] mx-auto px-5 sm:px-10 py-8 flex flex-wrap items-center justify-between gap-3.5">
          <span className="text-[12.5px] text-mkt-faint">© 2026 Centium. All rights reserved.</span>
          <span className="text-[12.5px] text-mkt-faint">Placeholder legal text — pending review by qualified counsel.</span>
        </div>
      </div>
    </div>
  );
};
