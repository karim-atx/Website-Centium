import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSEO } from "../useSEO";

// v5 Centium landing handoff, "Centium Landing.dc.html" §3 (Legal screen):
// replaces the old single-scroll, three-anchor Legal page with a two-level
// document/subsection navigator — Terms (12 subsections incl. the hardcoded
// "Liability" clause), Privacy (10 subsections per this handoff's own
// privacyData array — the README's "15" is stale prose; the .dc.html's own
// data array is the literal spec per this repo's handoff rules) and Health
// (a single flat disclaimer with no subsection nav at all).
//
// URL shape is `#legal/<doc>/<sub-slug>`, with bare `#terms` / `#privacy` /
// `#health` (no `legal/` prefix) as aliases that resolve to that document's
// first subsection — this is exactly what App.tsx's existing
// `/legal/privacy` → `/legal#privacy` and `/legal/terms` → `/legal#terms`
// redirects already produce, so no route-config change was needed for them.
// The whole two-level state lives in the URL hash on the single existing
// `/legal` route (no nested route params): React Router's own
// useLocation()/useNavigate() already deliver deep-linking and back/forward
// for free once the hash changes go through navigate() rather than a
// hand-rolled history.pushState + popstate/hashchange listener pair like the
// prototype's, so that plumbing is not ported — only the URL shape and the
// resulting behaviour are.
//
// All three documents' body copy (including the governing-law line in the
// footer) is copied verbatim from the handoff's termsData / privacyData /
// healthData and is unreviewed placeholder content, not real legal text.

type DocKey = "terms" | "privacy" | "health";

const DOC_KEYS: DocKey[] = ["terms", "privacy", "health"];

const DOC_META: Record<DocKey, { number: string; pillLabel: string; fullLabel: string; eyebrowColor: string }> = {
  terms: { number: "01", pillLabel: "Terms of Service", fullLabel: "Terms of Service", eyebrowColor: "#7D67D9" },
  privacy: { number: "02", pillLabel: "Privacy Policy", fullLabel: "Privacy Policy", eyebrowColor: "#4F8F8A" },
  health: { number: "03", pillLabel: "Health & Medical", fullLabel: "Health & Medical Disclaimer", eyebrowColor: "#7D67D9" },
};

interface LegalGroup {
  h: string;
  items: string[];
}

// Copied verbatim from the handoff's `termsData` (11 headed groups; the 12th
// subsection, "Liability", is a hardcoded block after these in the handoff
// rather than a data entry, so it is appended explicitly below).
const TERMS_GROUPS: LegalGroup[] = [
  {
    h: "Your account",
    items: [
      "You must be at least 16 years old (or the age of digital consent in your country) to hold a Centium account, and you are responsible for keeping your credentials secure.",
      "Information you log, including meals, sessions, weights, biomarkers and journal entries, belongs to you. You are responsible for its accuracy and for what you choose to share with professionals or businesses.",
      "Accounts may not be shared. Professionals and businesses are licensed per seat and per location.",
      "You can enable optional two-factor authentication for extra account security. You're responsible for keeping your login credentials and any second-factor device secure. Contact support if you lose access so we can verify your identity and help you regain entry.",
    ],
  },
  {
    h: "Account status",
    items: [
      "Centium may suspend or restrict an account that breaches these terms, appears fraudulent, or poses a risk to other users, and may schedule an account for deletion at a user's request or on a professional's or business's departure from the platform. Where legally required, you'll be notified of the action taken.",
    ],
  },
  {
    h: "Communications and content review",
    items: [
      "Centium does not monitor private messages as a matter of course. In limited circumstances, such as investigating abuse reports, safety concerns or legal obligations, authorised staff may access message content, with the reason logged.",
      "Content that violates these terms may be removed or redacted. The other participant will see that a message or attachment was removed.",
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
  {
    h: "Bookings and cancellations",
    items: [
      "Booking a class or service through Centium creates a booking directly between you and the business or professional offering it. Cancellation, rescheduling and refund policies are set by that business or professional, not by Centium, unless stated otherwise at the time of booking.",
    ],
  },
  {
    h: "Reviews",
    items: [
      "You may leave a review of a professional you've been a client of. Reviews must be honest and based on genuine experience. Centium may moderate, redact or remove reviews that violate these terms, and professionals may respond to reviews left about them.",
    ],
  },
  {
    h: "Referral, rewards and ambassador program",
    items: [
      "Centium may offer referral credits, reward points and an invite-only ambassador tier with enhanced referral terms. These have no cash value, cannot be transferred, sold or redeemed for cash, and may be adjusted, expired or revoked, including for suspected fraud or abuse. Centium may change or discontinue any referral, rewards or ambassador program at any time.",
    ],
  },
  {
    h: "Content and intellectual property",
    items: [
      "You keep ownership of what you log or upload. You grant Centium a limited licence to store, process and display that content as needed to provide the service, including sharing it with professionals or businesses you've authorised.",
      "Centium's name, branding, and app content and design remain Centium's property. Nothing here transfers ownership of them to you.",
    ],
  },
  {
    h: "Termination",
    items: [
      "If a professional's or business's account is suspended or terminated, their access to any client data shared with them ends immediately, and their marketplace listings are removed. Centium will take reasonable steps to inform affected clients that access has ended.",
    ],
  },
  {
    h: "Changes to these terms",
    items: [
      "We may update these terms from time to time. We'll notify you of material changes in-app or by email before they take effect. Continuing to use Centium after that point means you accept the updated terms.",
    ],
  },
];

const LIABILITY_TEXT =
  "Centium is provided as a tracking and coordination tool, without warranty that it will be uninterrupted or error-free. To the fullest extent permitted by law, Centium is not liable for indirect or consequential loss, for decisions made on the basis of logged data, or for the services delivered by any professional or business you engage through the marketplace. Nothing here limits liability that cannot lawfully be limited.";

// Copied verbatim from the handoff's `privacyData` (10 headed groups).
const PRIVACY_GROUPS: LegalGroup[] = [
  {
    h: "What we collect",
    items: [
      "Account data covers your name, email, account type, and billing details processed by our payment provider (we never store full card numbers).",
      "Health and activity data covers food logs, workouts, body metrics, sleep and step data, biomarker results, habits and journal entries, including anything synced from a connected health service with your permission.",
      "Usage data covers device type, app version and diagnostic events used to keep the product working and improve it.",
      "Communications data covers message content, call metadata (duration and participants, not recorded audio or video by default), and push notification tokens, where you use messaging or calling features.",
      "Files you upload, such as profile photos, professional certification documents and calendar attachments, are stored securely and shared only with the parties you've authorised to see them. Certification documents are reviewed by Centium to confirm eligibility to be listed.",
    ],
  },
  {
    h: "How it's used and shared",
    items: [
      "To operate your account, calculate goals and trends, and deliver the features you use. Health data is treated as a special category of personal data and processed on the basis of your explicit consent.",
      "Professionals and businesses only see what you have switched on for them, such as your food diary, workouts, weight, progress or health metrics, and you can revoke any of it at any time.",
      "We do not sell personal data and do not use health data for advertising. Service providers (hosting, payments, analytics) act on our instructions under contract.",
      "Aggregated, de-identified statistics may be used to improve the product and to give businesses anonymised insights that cannot identify an individual.",
      "If you're a client of a professional employed by a business on Centium, other authorised staff of that business may also be able to access data you've shared with that professional, consistent with the employment relationship and the access you've granted.",
      "Reviews are shown to other users without your name attached by default. You can choose to display your name when leaving one.",
    ],
  },
  {
    h: "Third-party and walk-in data",
    items: [
      "If a business enrols you as a member or class participant without you creating your own Centium account, we process the minimum information the business provides to manage that relationship, in line with this policy. You can ask the business, or contact us, to access or remove that information.",
    ],
  },
  {
    h: "Third-party processors",
    items: [
      "We use a small number of processors to run Centium: Supabase (database and authentication hosting), LiveKit (voice and video calling infrastructure), Resend (transactional email), and Cloudflare (content delivery). Each is bound by contract to process data only on our instructions.",
    ],
  },
  {
    h: "International data transfers",
    items: [
      "Your data may be processed in a country other than your own. Where required, we rely on appropriate safeguards for such transfers.",
    ],
  },
  {
    h: "Automated processing",
    items: [
      "Some features, including AI-assisted logging and guidance, process what you enter using automated systems, which may include third-party AI providers acting under contract. Outputs are informational, not medical advice. See the Health and Medical Disclaimer.",
    ],
  },
  {
    h: "Cookies and similar technologies",
    items: [
      "We use essential cookies and local storage to keep you signed in and remember preferences, and limited diagnostic tooling to detect and fix errors. We don't use third-party advertising cookies.",
    ],
  },
  {
    h: "Marketing communications",
    items: [
      "If you opt in to product updates or marketing emails, you can unsubscribe at any time via the email footer or Settings.",
    ],
  },
  {
    h: "Children's data",
    items: [
      "Centium is not directed at, and does not knowingly collect data from, anyone under the applicable minimum age.",
    ],
  },
  {
    h: "Retention, security and your rights",
    items: [
      "When you delete your account or reset your health data, most associated data is removed within a defined period. Some data is retained beyond that point for safety, accountability or legal reasons, for example a professional's clinical notes about a shared client, and account-safety settings, even after the underlying health data is deleted.",
      "Data is encrypted in transit and at rest, with access limited to staff who need it. We will notify affected users and regulators of a qualifying breach without undue delay.",
      "You can access, export, correct or delete your data, withdraw consent, or object to certain processing, either from Settings or by emailing support@atraxia.org. We aim to respond within a few business days.",
      "Removed or redacted content, including reviews and messages, may be retained internally for audit, safety or legal purposes even though it's no longer visible to other users.",
      "If you're not satisfied with how we've handled your data, you can also lodge a complaint with your local data protection authority.",
    ],
  },
];

// Copied verbatim from the handoff's `healthData` — a flat bullet list, no
// h3 headings, so Health has no level-2 navigation at all.
const HEALTH_ITEMS: string[] = [
  "Nutrition targets, training suggestions, biomarker readings and trend analysis are informational. They are generated from the data you enter and from general, published health standards, not from an assessment of your individual medical situation.",
  "Always consult a qualified healthcare professional before starting a new diet or training programme, changing medication, or acting on any reading shown in the app. Never delay seeking medical advice because of something you saw in Centium.",
  "Biomarker capture and any automated extraction of values from photos or connected services may be inaccurate. Treat laboratory reports and clinician guidance as the source of truth.",
  "Voice and video calls between you and a professional are a convenience feature, not a clinical-grade telehealth platform, and are not designed for emergencies or for transmitting information that requires enhanced regulatory safeguards.",
  "Professionals and businesses on Centium are independent providers. Centium facilitates the connection and the data sharing; it does not supervise, endorse or take clinical responsibility for their advice or services.",
  "Where Centium reviews a professional's submitted certification or credential documents, this confirms eligibility to be listed on the platform at the time of review. It is not an ongoing guarantee that a credential remains valid, and it is not an endorsement of the quality of care or advice a professional provides.",
  "Centium is not an emergency service. If you think you are experiencing a medical emergency, contact your local emergency number immediately.",
];

// Ported from the handoff's `legalSlug()`.
function slugify(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function subsFor(doc: DocKey): string[] {
  if (doc === "terms") return TERMS_GROUPS.map((g) => g.h).concat(["Liability"]);
  if (doc === "privacy") return PRIVACY_GROUPS.map((g) => g.h);
  return [];
}

function legalHashFor(doc: DocKey, sub: string | null): string {
  return "#legal/" + doc + (sub ? "/" + sub : "");
}

// Ported from the handoff's `readLegalHash()`: `#legal/<doc>/<sub>` is the
// canonical shape, and a bare `#terms` / `#privacy` / `#health` (the
// pre-redesign deep-link shape, still produced by App.tsx's /legal/privacy
// and /legal/terms redirects) is an alias for that document with no
// explicit subsection.
function parseLegalHash(hash: string): { doc: DocKey; sub: string | null } {
  const raw = (hash || "").replace(/^#/, "");
  const parts = raw.split("/").filter(Boolean);
  let doc: string | null = null;
  let sub: string | null = null;
  if (parts[0] === "legal") {
    doc = parts[1] || "terms";
    sub = parts[2] || null;
  } else if ((DOC_KEYS as string[]).includes(parts[0])) {
    doc = parts[0];
    sub = parts[1] || null;
  }
  if (!doc || !(DOC_KEYS as string[]).includes(doc)) {
    doc = "terms";
    sub = null;
  }
  return { doc: doc as DocKey, sub };
}

const HERO_BACKGROUND =
  "radial-gradient(86% 128% at 0% 0%,rgba(124,96,214,0.5000) 0.0%,rgba(124,96,214,0.4605) 4.0%,rgba(124,96,214,0.4226) 8.0%,rgba(124,96,214,0.3861) 12.0%,rgba(124,96,214,0.3511) 16.0%,rgba(124,96,214,0.3177) 20.0%,rgba(124,96,214,0.2858) 24.0%,rgba(124,96,214,0.2555) 28.0%,rgba(124,96,214,0.2267) 32.0%,rgba(124,96,214,0.1996) 36.0%,rgba(124,96,214,0.1740) 40.0%,rgba(124,96,214,0.1501) 44.0%,rgba(124,96,214,0.1277) 48.0%,rgba(124,96,214,0.1071) 52.0%,rgba(124,96,214,0.0881) 56.0%,rgba(124,96,214,0.0709) 60.0%,rgba(124,96,214,0.0554) 64.0%,rgba(124,96,214,0.0416) 68.0%,rgba(124,96,214,0.0297) 72.0%,rgba(124,96,214,0.0197) 76.0%,rgba(124,96,214,0.0115) 80.0%,rgba(124,96,214,0.0055) 84.0%,rgba(124,96,214,0.0015) 88.0%,rgba(124,96,214,0.0000) 92.0%,rgba(255,255,255,0) 100%),radial-gradient(86% 128% at 100% 0%,rgba(62,145,132,0.4600) 0.0%,rgba(62,145,132,0.4237) 4.0%,rgba(62,145,132,0.3887) 8.0%,rgba(62,145,132,0.3552) 12.0%,rgba(62,145,132,0.3230) 16.0%,rgba(62,145,132,0.2923) 20.0%,rgba(62,145,132,0.2630) 24.0%,rgba(62,145,132,0.2351) 28.0%,rgba(62,145,132,0.2086) 32.0%,rgba(62,145,132,0.1836) 36.0%,rgba(62,145,132,0.1601) 40.0%,rgba(62,145,132,0.1381) 44.0%,rgba(62,145,132,0.1175) 48.0%,rgba(62,145,132,0.0985) 52.0%,rgba(62,145,132,0.0811) 56.0%,rgba(62,145,132,0.0652) 60.0%,rgba(62,145,132,0.0509) 64.0%,rgba(62,145,132,0.0383) 68.0%,rgba(62,145,132,0.0273) 72.0%,rgba(62,145,132,0.0181) 76.0%,rgba(62,145,132,0.0106) 80.0%,rgba(62,145,132,0.0050) 84.0%,rgba(62,145,132,0.0014) 88.0%,rgba(62,145,132,0.0000) 92.0%,rgba(255,255,255,0) 100%),#FFFFFF";
// Literal from rendered/12-legal-screen.{terms,privacy,health}.html (identical
// across all three doc states) — this is a 16-stop mask, not the shorter
// hand-simplified curve this file previously had; see CLAUDE.md's root-cause
// #2 (approximate reproduction instead of literal values), the exact failure
// mode that caused the review-belt fade-mask regression this file's own
// standing rules were written after.
const HERO_MASK =
  "linear-gradient(to bottom,#000 0%,#000 48%,rgba(0,0,0,0.8559) 51.7%,rgba(0,0,0,0.7235) 55.4%,rgba(0,0,0,0.6026) 59.1%,rgba(0,0,0,0.4933) 62.9%,rgba(0,0,0,0.3954) 66.6%,rgba(0,0,0,0.3088) 70.3%,rgba(0,0,0,0.2333) 74.0%,rgba(0,0,0,0.1688) 77.7%,rgba(0,0,0,0.1151) 81.4%,rgba(0,0,0,0.0720) 85.1%,rgba(0,0,0,0.0394) 88.9%,rgba(0,0,0,0.0168) 92.6%,rgba(0,0,0,0.0039) 96.3%,rgba(0,0,0,0.0000) 100.0%)";

// This "Last updated" date is a static literal (matching this repo's
// existing convention, e.g. the equivalent line on Contact/Home) rather than
// the handoff's own `legalUpdatedOn()` behaviour, which fingerprints
// termsData/privacyData/healthData and stamps+persists "today" the first
// time the fingerprint changes via localStorage. That's a content-authoring
// convenience for the prototype's own iteration loop, not an interaction a
// visitor exercises, so it isn't in scope for "port behaviour, not just
// appearance" the way the doc/subsection navigation is — flagged in the
// implementation report rather than ported as client-side localStorage logic.
const LEGAL_UPDATED_DATE = "6 September 2026";

const Bullets: React.FC<{ items: string[]; color: string }> = ({ items, color }) => (
  <ul className="flex flex-col gap-3 mt-3.5 list-none p-0">
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

  const location = useLocation();
  const navigate = useNavigate();

  const parsed = useMemo(() => parseLegalHash(location.hash), [location.hash]);
  const doc = parsed.doc;
  const subs = useMemo(() => subsFor(doc), [doc]);
  const hasNav = subs.length > 0;

  // Never a blank panel: fall back to the document's first subsection when
  // the hash names none, or names one that doesn't exist on this document.
  const activeSub = useMemo(() => {
    if (!subs.length) return null;
    const match = subs.find((h) => slugify(h) === parsed.sub);
    return slugify(match ?? subs[0]);
  }, [subs, parsed.sub]);

  // <1024px: doc pills become a swipe rail and the sidebar collapses to a
  // "Jump to section" disclosure. Tracked unconditionally via a resize
  // listener (not gated behind a one-time check) so it stays correct across
  // resizes and orientation changes, per the handoff's own gotcha about
  // viewport guards that only run on one path.
  const [narrow, setNarrow] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 1024 : false));
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [jumpOpen, setJumpOpen] = useState(false);
  // Selecting a document or subsection always closes the mobile disclosure.
  useEffect(() => {
    setJumpOpen(false);
  }, [doc, activeSub]);

  const tabRefs = useRef<Partial<Record<DocKey, HTMLAnchorElement | null>>>({});
  const subRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const pushLegalHash = (nextDoc: DocKey, nextSub: string | null) => {
    navigate(`${location.pathname}${legalHashFor(nextDoc, nextSub)}`);
  };

  const selectDoc = (nextDoc: DocKey) => {
    const nextSubs = subsFor(nextDoc);
    pushLegalHash(nextDoc, nextSubs.length ? slugify(nextSubs[0]) : null);
  };

  const selectSub = (slug: string) => {
    pushLegalHash(doc, slug);
  };

  // Roving-tabindex keys on the doc tablist: arrow keys move both focus and
  // selection, Home/End jump to the first/last document.
  const onTabKeyDown = (e: React.KeyboardEvent, key: DocKey) => {
    const i = DOC_KEYS.indexOf(key);
    let j = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % DOC_KEYS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + DOC_KEYS.length) % DOC_KEYS.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = DOC_KEYS.length - 1;
    if (j < 0) return;
    e.preventDefault();
    const nextKey = DOC_KEYS[j];
    selectDoc(nextKey);
    tabRefs.current[nextKey]?.focus();
  };

  // The subsection sidebar is a nav landmark of plain links (matching this
  // site's other nav lists), not a nested tablist, so arrow keys here only
  // move focus — activating a link (click or Enter) is what changes the
  // selection, exactly as the handoff's own initLegalNav() implements it.
  const onSubKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let j = -1;
    if (e.key === "ArrowDown") j = Math.min(subs.length - 1, idx + 1);
    else if (e.key === "ArrowUp") j = Math.max(0, idx - 1);
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = subs.length - 1;
    if (j < 0) return;
    e.preventDefault();
    subRefs.current[j]?.focus();
  };

  const meta = DOC_META[doc];
  const currentSubLabel = activeSub ? subs.find((h) => slugify(h) === activeSub) ?? "" : "";
  const jumpLabel = currentSubLabel ? `${meta.fullLabel} · ${currentSubLabel}` : meta.fullLabel;

  return (
    <div>
      <section
        className="relative overflow-hidden"
        style={{
          padding: "clamp(128px,13vw,152px) 0 clamp(20px,2.4vw,30px)",
          background: HERO_BACKGROUND,
          WebkitMaskImage: HERO_MASK,
          maskImage: HERO_MASK,
        }}
      >
        <div className="relative max-w-[1180px] mx-auto px-5 sm:px-10">
          <span className="block font-semibold text-[11px] tracking-[.22em]" style={{ color: "#6A54C4" }}>
            LEGAL
          </span>
          <h1 className="font-display font-extrabold text-[clamp(34px,4.6vw,52px)] leading-[1.08] tracking-[-.032em] mt-[18px] max-w-[720px] text-mkt-ink">
            Policies, privacy and disclaimers.
          </h1>
          <p className="text-[17px] leading-relaxed text-mkt-soft mt-[18px] max-w-[620px]">
            Everything covering how Centium works, how your data is handled, and what Centium is and isn't
            responsible for.
          </p>
          <div
            data-legal-stamp=""
            className="inline-flex items-center gap-2.5 mt-[26px] px-4 py-[11px] rounded-[14px]"
            style={{ background: "rgba(255,255,255,.72)", border: "1px solid rgba(34,30,26,.09)", boxShadow: "0 6px 18px rgba(72,58,130,.07)" }}
          >
            <span aria-hidden="true" className="flex" style={{ color: "#6A54C4" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5V12l3.2 1.9" />
              </svg>
            </span>
            <span className="flex flex-col leading-[1.25]">
              <span className="font-extrabold text-[10.5px] tracking-[.16em]" style={{ color: "#6B6358" }}>
                LAST UPDATED
              </span>
              <span data-legal-date="" className="font-bold text-sm text-mkt-ink">{LEGAL_UPDATED_DATE}</span>
            </span>
          </div>
        </div>
      </section>

      <main className="max-w-[1180px] mx-auto" style={{ padding: "clamp(12px,1.4vw,18px) clamp(20px,4vw,40px) clamp(40px,5vw,64px)" }}>
        <div className="rounded-[22px] overflow-hidden bg-white" style={{ border: "1px solid #EDEAE4" }}>
          <div
            role="tablist"
            aria-label="Legal documents"
            className="flex"
            style={{
              flexWrap: narrow ? "nowrap" : "wrap",
              gap: narrow ? 8 : 4,
              padding: "10px 12px",
              borderBottom: "1px solid #EDEAE4",
              background: "#FCFBFE",
              overflowX: narrow ? "auto" : "visible",
              WebkitOverflowScrolling: "touch",
              scrollSnapType: narrow ? "x mandatory" : "none",
              scrollbarWidth: "none",
            }}
          >
            {DOC_KEYS.map((key) => {
              const m = DOC_META[key];
              const selected = key === doc;
              // Literal from the handoff's own template: the tab's static href is
              // the bare "#legal/<doc>" (no subsection) — only the click handler's
              // selectDoc() (mirroring setLegalDoc()) actually lands on the first
              // subsection. See rendered/12-legal-screen.*.html and dc.html §3.
              const href = `${location.pathname}${legalHashFor(key, null)}`;
              return (
                <a
                  key={key}
                  id={`legal-tab-${key}`}
                  href={href}
                  data-legal-doc={key}
                  ref={(el) => {
                    tabRefs.current[key] = el;
                  }}
                  role="tab"
                  aria-selected={selected}
                  aria-controls={key}
                  tabIndex={selected ? 0 : -1}
                  onClick={(e) => {
                    e.preventDefault();
                    selectDoc(key);
                  }}
                  onKeyDown={(e) => onTabKeyDown(e, key)}
                  className="inline-flex items-center gap-2 rounded-full font-bold text-[13.5px] leading-[1.3] whitespace-nowrap cursor-pointer transition-colors"
                  style={{
                    flex: narrow ? "0 0 auto" : "0 1 auto",
                    padding: "10px 16px",
                    scrollSnapAlign: "center",
                    background: selected ? "#3F726D" : "transparent",
                    color: selected ? "#FFFFFF" : "#5B5349",
                    boxShadow: selected ? "0 5px 14px rgba(72,58,130,.18)" : "none",
                  }}
                >
                  <span aria-hidden="true" className="font-extrabold text-[10px] tracking-[.1em]" style={{ opacity: 0.7 }}>
                    {m.number}
                  </span>
                  {m.pillLabel}
                </a>
              );
            })}
          </div>

          <div
            className="grid items-start"
            style={{
              gridTemplateColumns: hasNav && !narrow ? "minmax(200px,242px) minmax(0,1fr)" : "minmax(0,1fr)",
              gap: "clamp(18px,2vw,30px)",
              padding: "clamp(18px,2vw,26px)",
            }}
          >
            {hasNav && (
              <div className="min-w-0">
                {narrow && (
                  <button
                    type="button"
                    data-legal-jump=""
                    aria-expanded={jumpOpen}
                    aria-controls="legal-subnav"
                    onClick={() => setJumpOpen((o) => !o)}
                    className="flex w-full items-center justify-between gap-2.5 rounded-[14px] font-bold text-sm text-left cursor-pointer"
                    style={{ padding: "13px 16px", border: "1px solid rgba(34,30,26,.1)", background: "#FAF9F7", color: "#221E1A", fontFamily: "inherit" }}
                  >
                    <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{jumpLabel}</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      style={{ flexShrink: 0, transition: "transform .3s cubic-bezier(.22,1,.36,1)", transform: jumpOpen ? "rotate(180deg)" : "none" }}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                )}
                <nav
                  id="legal-subnav"
                  aria-label="Legal navigation"
                  className="flex-col gap-0.5"
                  style={{
                    display: !narrow || jumpOpen ? "flex" : "none",
                    position: narrow ? "static" : "sticky",
                    top: 96,
                    marginTop: narrow ? 8 : 0,
                    padding: narrow ? "8px" : "10px 8px",
                    borderRadius: 16,
                    border: narrow ? "1px solid rgba(34,30,26,.1)" : "1px solid #EDEAE4",
                    background: narrow ? "rgba(250,249,252,.62)" : "#FCFBFE",
                  }}
                >
                  {!narrow && (
                    <span className="font-extrabold text-[10.5px] tracking-[.16em]" style={{ color: "#6B6358", padding: "6px 12px 8px" }}>
                      ON THIS PAGE
                    </span>
                  )}
                  {subs.map((h, idx) => {
                    const slug = slugify(h);
                    const current = slug === activeSub;
                    return (
                      <a
                        key={slug}
                        href={`${location.pathname}${legalHashFor(doc, slug)}`}
                        data-legal-sub={slug}
                        aria-current={current ? "true" : "false"}
                        ref={(el) => {
                          subRefs.current[idx] = el;
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          selectSub(slug);
                        }}
                        onKeyDown={(e) => onSubKeyDown(e, idx)}
                        className="block rounded-[10px] text-[13.5px] font-semibold leading-[1.35] cursor-pointer transition-colors"
                        style={{ padding: "9px 12px", background: current ? "rgba(125,103,217,.14)" : "transparent", color: current ? "#6A54C4" : "#5B5349" }}
                      >
                        {h}
                      </a>
                    );
                  })}
                </nav>
              </div>
            )}

            <div className="min-w-0">
              <section
                id="terms"
                role="tabpanel"
                aria-labelledby="legal-tab-terms"
                tabIndex={0}
                className="max-w-[860px]"
                style={{ display: doc === "terms" ? "block" : "none" }}
              >
                <span className="block font-semibold text-[11px] tracking-[.22em]" style={{ color: DOC_META.terms.eyebrowColor }}>
                  {DOC_META.terms.number}
                </span>
                <h2 className="font-display font-extrabold text-[clamp(28px,3.4vw,38px)] leading-[1.1] tracking-[-.03em] text-mkt-ink mt-3.5">
                  Terms of Service
                </h2>
                <p className="text-[16.5px] leading-[1.65] text-mkt-soft mt-[18px]">
                  These terms govern your use of the Centium apps, website and connected professional and business
                  dashboards. By creating an account you accept them on your own behalf, or on behalf of the
                  practice or business you represent.
                </p>
                {TERMS_GROUPS.filter((g) => slugify(g.h) === activeSub).map((g) => (
                  <React.Fragment key={g.h}>
                    <h3 className="font-bold text-[19px] tracking-[-.01em] text-mkt-ink mt-[34px]">{g.h}</h3>
                    <Bullets items={g.items} color="#7D67D9" />
                  </React.Fragment>
                ))}
                {activeSub === "liability" && (
                  <>
                    <h3 className="font-bold text-[19px] tracking-[-.01em] text-mkt-ink mt-[34px]">Liability</h3>
                    <p className="text-base leading-[1.65] text-mkt-soft mt-3.5">{LIABILITY_TEXT}</p>
                  </>
                )}
              </section>

              <section
                id="privacy"
                role="tabpanel"
                aria-labelledby="legal-tab-privacy"
                tabIndex={0}
                className="max-w-[860px]"
                style={{ display: doc === "privacy" ? "block" : "none" }}
              >
                <span className="block font-semibold text-[11px] tracking-[.22em]" style={{ color: DOC_META.privacy.eyebrowColor }}>
                  {DOC_META.privacy.number}
                </span>
                <h2 className="font-display font-extrabold text-[clamp(28px,3.4vw,38px)] leading-[1.1] tracking-[-.03em] text-mkt-ink mt-3.5">
                  Privacy Policy
                </h2>
                <p className="text-[16.5px] leading-[1.65] text-mkt-soft mt-[18px]">
                  Centium exists to bring your health information together in one place, which means we take its
                  handling seriously. This section explains what we collect, why, and the control you keep over it.
                </p>
                {PRIVACY_GROUPS.filter((g) => slugify(g.h) === activeSub).map((g) => (
                  <React.Fragment key={g.h}>
                    <h3 className="font-bold text-[19px] tracking-[-.01em] text-mkt-ink mt-[34px]">{g.h}</h3>
                    <Bullets items={g.items} color="#4F8F8A" />
                  </React.Fragment>
                ))}
              </section>

              <section
                id="health"
                role="tabpanel"
                aria-labelledby="legal-tab-health"
                tabIndex={0}
                className="max-w-[860px]"
                style={{ display: doc === "health" ? "block" : "none" }}
              >
                <span className="block font-semibold text-[11px] tracking-[.22em]" style={{ color: DOC_META.health.eyebrowColor }}>
                  {DOC_META.health.number}
                </span>
                <h2 className="font-display font-extrabold text-[clamp(28px,3.4vw,38px)] leading-[1.1] tracking-[-.03em] text-mkt-ink mt-3.5">
                  Health &amp; Medical Disclaimer
                </h2>
                <div className="mt-5 rounded-2xl" style={{ background: "#7D67D9", border: "2px solid #3E2F7A", padding: "22px 24px" }}>
                  <p className="text-[17px] leading-[1.55] font-semibold text-white">
                    Centium supports your health journey. It does not provide medical diagnosis or treatment.
                  </p>
                </div>
                <Bullets color="#7D67D9" items={HEALTH_ITEMS} />
              </section>
            </div>
          </div>
        </div>

        <section className="max-w-[860px] border-t border-mkt-line" style={{ marginTop: "clamp(56px,7vw,88px)", paddingTop: "clamp(40px,5vw,56px)" }}>
          <h2 className="font-display font-extrabold text-[22px] tracking-[-.028em] text-mkt-ink">Questions about any of this?</h2>
          <p className="text-base leading-[1.65] text-mkt-soft mt-3 max-w-[620px]">
            Reach out and we'll point you to the right person, including for data access, export or deletion
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
          <span className="text-[12.5px] text-mkt-soft">© {new Date().getFullYear()} Centium. All rights reserved.</span>
          <span className="text-[12.5px] text-mkt-soft max-w-[560px]">
            These terms are governed by the laws of Lebanon, and any dispute will be resolved in the courts of
            Beirut, subject to any mandatory consumer-protection rights in your country of residence.
          </span>
        </div>
      </div>
    </div>
  );
};
