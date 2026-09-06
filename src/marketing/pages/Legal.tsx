import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { LegalNotice } from "./legal/LegalNotice";
import { useSEO } from "../useSEO";

// v2 Centium landing handoff, "Centium Legal.dc.html": a single consolidated
// legal centre replacing the earlier separate Privacy/Terms pages, with
// twelve sections across three groups instead of two long-form documents.
// Content here is placeholder-grade summary prose per the handoff's own
// note ("have counsel replace it") — kept as an explicit LegalNotice
// banner (this repo's existing convention for unreviewed legal content)
// rather than dropped, since none of this is real published policy.
//
// The handoff's own prototype ships this page with its own opaque sticky
// header (logo + "Back to Centium"), since the prototype has no shared nav
// to fall back on. This app already wraps every marketing route in the one
// shared, transparent <Nav /> (MarketingLayout) — duplicating a second
// header here would stack two nav bars. Top padding below clears that
// shared nav instead, the same pattern the page this supersedes (Privacy.tsx)
// used.
const groups: { title: string; items: { id: string; label: string }[] }[] = [
  {
    title: "Your data",
    items: [
      { id: "privacy", label: "Privacy Policy" },
      { id: "cookies", label: "Cookie Policy" },
      { id: "dpa", label: "Data Processing Agreement" },
      { id: "ai", label: "AI Transparency" },
    ],
  },
  {
    title: "Using Centium",
    items: [
      { id: "terms", label: "Terms of Service" },
      { id: "subscription", label: "Subscription Policy" },
      { id: "refunds", label: "Refund & Cancellation Policy" },
      { id: "copyright", label: "Copyright Policy" },
    ],
  },
  {
    title: "Health & community",
    items: [
      { id: "medical", label: "Health & Medical Disclaimer" },
      { id: "fitness", label: "Fitness & Nutrition Disclaimer" },
      { id: "community", label: "Community Guidelines" },
      { id: "accessibility", label: "Accessibility Statement" },
    ],
  },
];

const sections: { id: string; title: string; body: string }[] = [
  {
    id: "privacy",
    title: "Privacy Policy",
    body: "Centium collects the health, nutrition and training data you choose to log, plus the account details needed to run your subscription. Your data is used to power your own dashboards and, where you explicitly grant access, to share what matters with the professionals you connect to. You can export or delete your account data at any time.",
  },
  {
    id: "cookies",
    title: "Cookie Policy",
    body: "We use strictly necessary cookies to keep you signed in and to remember your preferences. Analytics cookies are optional and can be declined without affecting how the app works.",
  },
  {
    id: "dpa",
    title: "Data Processing Agreement",
    body: "For professionals and businesses processing client data through Centium, this agreement sets out the roles of controller and processor, the permitted purposes of processing, sub-processor disclosure and the security measures applied to client records.",
  },
  {
    id: "ai",
    title: "AI Transparency",
    body: "Centium's assistant helps you log meals and interpret trends. It produces suggestions, not clinical judgements, and it can be wrong — always review what it logs on your behalf. Assistant interactions are used to fulfil your request and to improve accuracy, and you can turn the assistant off entirely.",
  },
  {
    id: "terms",
    title: "Terms of Service",
    body: "These terms cover your account, acceptable use of the platform, the responsibilities of professionals and businesses operating on Centium, intellectual property, and the limits of our liability. Using Centium means agreeing to them.",
  },
  {
    id: "subscription",
    title: "Subscription Policy",
    body: "Plans bill monthly or yearly, with yearly billed at a 20% discount. Professional plans bill per seat; business plans include a revenue share on marketplace activity. Subscriptions renew automatically until cancelled.",
  },
  {
    id: "refunds",
    title: "Refund & Cancellation Policy",
    body: "You can cancel at any time and keep access until the end of the paid period. Where required by local consumer law, refunds are issued for unused portions of a term; duplicate or accidental charges are always refunded.",
  },
  {
    id: "copyright",
    title: "Copyright Policy",
    body: "Programs, meal plans and content you publish on Centium remain yours. If you believe material on the platform infringes your copyright, send us a notice identifying the work and the location, and we will review and act on it.",
  },
  {
    id: "medical",
    title: "Health & Medical Disclaimer",
    body: "Centium supports your health journey — it does not provide medical diagnosis or treatment. Metrics, trends and reference ranges shown in the app are informational. Always consult a qualified clinician before acting on them, and seek urgent care for any acute symptom.",
  },
  {
    id: "fitness",
    title: "Fitness & Nutrition Disclaimer",
    body: "Training programs and nutrition targets in Centium are general guidance, adapted to the goals you set. They are not prescriptions. Stop and seek advice if an exercise causes pain, and treat calorie and macro targets as estimates rather than clinical requirements.",
  },
  {
    id: "community",
    title: "Community Guidelines",
    body: "Centium connects people to trainers, dietitians and other members. Keep exchanges respectful, don't offer clinical advice you aren't qualified to give, don't promote unsafe practices or unverified supplements, and respect other members' privacy.",
  },
  {
    id: "accessibility",
    title: "Accessibility Statement",
    body: "We build Centium to meet WCAG 2.2 AA: readable contrast, keyboard-navigable flows, respect for reduced-motion preferences, and screen-reader labelling throughout. If something blocks you, tell us and we will prioritise a fix.",
  },
];

export const Legal: React.FC = () => {
  useSEO("Legal", "Centium's policies and disclaimers: privacy, cookies, terms, subscriptions and health disclaimers.");

  return (
    <div>
      <section
        className="pt-32 sm:pt-[152px] pb-16 sm:pb-[92px] border-b border-mkt-line"
        style={{ background: "linear-gradient(160deg,#EFEAF9 0%,#F4F1FB 46%,#EBF3F1 100%)" }}
      >
        <div className="max-w-[1180px] mx-auto px-5 sm:px-10">
          <span className="block font-semibold text-[11px] tracking-[.22em] text-mkt-accent-hover">LEGAL</span>
          <h1 className="font-display font-extrabold text-[clamp(34px,4.4vw,54px)] leading-[1.05] tracking-[-.032em] mt-[18px] max-w-[620px] text-mkt-ink">
            Policies &amp; disclaimers
          </h1>
          <p className="text-[17px] leading-relaxed text-mkt-soft mt-[18px] max-w-[560px]" style={{ textWrap: "pretty" }}>
            How Centium handles your data, your subscription and your health information. Last updated 5 September 2026.
          </p>
        </div>
      </section>

      <main className="py-12 sm:py-[72px]">
        <div className="max-w-[1180px] mx-auto px-5 sm:px-10">
          <LegalNotice />
          <div className="grid gap-[34px] mt-10" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
            {groups.map((g) => (
              <div key={g.title}>
                <p className="font-bold text-[11px] tracking-[.2em] text-[#6B6358]">{g.title.toUpperCase()}</p>
                <ul className="flex flex-col gap-2.5 mt-4">
                  {g.items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="flex items-center justify-between gap-3 px-[15px] py-[13px] rounded-xl border border-mkt-line bg-white text-mkt-ink no-underline transition-[border-color,transform,box-shadow] duration-200 hover:border-mkt-accent-ring hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(72,58,130,.1)]"
                      >
                        <span className="text-[15px] font-semibold">{item.label}</span>
                        <ArrowUpRight size={13} className="text-mkt-faint shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-5 sm:px-10 mt-14 sm:mt-[84px] flex flex-col gap-9 sm:gap-12">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="font-display font-extrabold text-2xl leading-[1.15] tracking-[-.022em] text-mkt-ink m-0">
                {s.title}
              </h2>
              <p className="text-base leading-[1.68] text-mkt-soft mt-3" style={{ textWrap: "pretty" }}>
                {s.body}
              </p>
            </section>
          ))}
        </div>
      </main>

      <div className="flex justify-center pb-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-mkt-soft hover:text-mkt-ink transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Centium
        </Link>
      </div>
    </div>
  );
};
