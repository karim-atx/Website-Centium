// MO1.8.7 Privacy and MO1.8.8 Terms of Service: the in-app legal pages' copy,
// word for word from the handover's copy tables ("copy aligned with
// centium.atraxia.org/legal"). The website (src/marketing/legal/text.ts, shown
// by src/marketing/pages/Legal.tsx) is the source of truth and carries the
// full text; every heading here
// deep-links to its section there (BR-11: #legal/<privacy|terms>/<slug>,
// the website's own slug rule), so the headings must stay the website's.
//
// Round F (AV): the Arabic is legalCopy.ar.ts, the same shape; legalCopyFor()
// gives the copy for the active language. The deep links always take the
// English heading (the website's ids are English slugs).

import { documentFor, getLanguage } from "../../i18n/core";
import { ARABIC_LOCALE } from "../../i18n/format";
import type * as ArabicCopy from "./legalCopy.ar";

export interface LegalSection {
  heading: string;
  body: string;
}

/** The website's "Last updated" date (the legal page writes LEGAL_VERSION month first: src/marketing/legal/anchors.ts legalDateFor). */
export const LEGAL_UPDATED = "November 8, 2026";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * A legal "Last updated" date written month first in English ("September 6,
 * 2026") in the active language: unchanged in English, Arabic month names
 * with Western digits in Arabic ("6 أيلول 2026"). Call during render.
 */
export function legalDate(english: string): string {
  if (getLanguage() === "en") return english;
  const m = /^([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(english);
  const month = m ? MONTHS.indexOf(m[1]) : -1;
  if (!m || month < 0) return english;
  return new Date(Date.UTC(Number(m[3]), month, Number(m[2]))).toLocaleDateString(ARABIC_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The website's slug for a heading (src/marketing/legal/anchors.ts legalSlug, the handoff's legalSlug()). */
export function legalSlug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** BR-11: the website section a heading opens. */
export function legalHref(doc: "privacy" | "terms", heading: string): string {
  return `/legal#legal/${doc}/${legalSlug(heading)}`;
}

export const PRIVACY_INTRO =
  "Centium brings your health information together in one place. Here's what we collect, why, and the control you keep over it.";

// Round K (Karim, 2026-11-08): What we collect, How it's used and shared,
// Third-party processors, Cookies and Retention follow the Privacy Policy
// corrections (#113), so the summary never contradicts the full policy.
export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "What we collect",
    body:
      "Account details (name, email, account type) and billing details handled by Google Play or the App Store when you buy in the app. We never store full card numbers, and the website takes no payments. Health and activity data you log or sync with your permission. The days your account was active and, in the phone app, its version and an installation id. No analytics or crash reporting. Messages and call details, without recorded audio or video by default. Files you upload, such as photos and certification documents.",
  },
  {
    heading: "How it's used and shared",
    body:
      "To run your account and the features you use. Health data is processed only with your explicit consent. Professionals and businesses see only what you switch on for them, and you can revoke it at any time. In the Android app, Health Connect data you allow is used only in Centium, shared only with professionals you choose, and never sold. We don't sell your data or use health data for advertising. If your professional works for a business on Centium, its authorised staff may also see what you've shared. Reviews don't show your name unless you choose to.",
  },
  {
    heading: "Third-party and walk-in data",
    body:
      "If a business enrols you without a Centium account, we process only the minimum it provides. Ask the business or us to access or remove it.",
  },
  {
    heading: "Third-party processors",
    body:
      "Supabase (database and sign-in), LiveKit (calls), Resend (email), Cloudflare (content delivery and the bot check on our forms) and Groq (voice food logging). Each works only on our instructions, under contract. Notifications go through Google's, Apple's or your browser's push service. Google or Apple sign-in shares your name and email (or, with Apple, a private relay address). In the Android app, ML Kit reads barcodes and lab reports on your phone. The map loads from OpenFreeMap, and course videos play from YouTube. Food search sends only your search words to USDA FoodData Central and Open Food Facts, and a barcode scan sends only the number to Open Food Facts, through our servers.",
  },
  {
    heading: "International data transfers",
    body: "Your data may be processed outside your country, with safeguards where required.",
  },
  {
    heading: "Automated processing",
    body:
      "AI-assisted logging and guidance, including Schati, may use third-party AI providers under contract. Results are informational, not medical advice.",
  },
  {
    heading: "Cookies and similar technologies",
    body:
      "Essential cookies and local storage keep you signed in and remember your preferences. No analytics, diagnostic or advertising cookies.",
  },
  {
    heading: "Marketing communications",
    body: "Only if you opt in. Unsubscribe at any time from the email footer or Settings.",
  },
  {
    heading: "Children's data",
    body: "Centium isn't meant for, and doesn't knowingly collect data from, anyone under 16.",
  },
  {
    heading: "Retention, security and your rights",
    body:
      "Data is encrypted in transit and at rest. When you delete your account, most data is removed within a set period, including a professional's clinical notes about you; some is kept for safety or legal reasons. Forum posts stay, shown as \"Deleted member\", and payment records are kept only as long as the law requires. Deleting your account doesn't cancel an App Store or Google Play subscription, so cancel it there. You can access, export, correct or delete your data, or withdraw consent, from Settings or at support@atraxia.org.",
  },
];

export const TERMS_INTRO =
  "These terms cover the Centium app, website and professional and business dashboards. Creating an account means you accept them.";

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "Your account",
    body:
      "You must be at least 16. Keep your login and two-factor device safe. Accounts can't be shared. What you log belongs to you.",
  },
  {
    heading: "Account status",
    body: "We may suspend or restrict accounts that break these terms, look fraudulent, or put others at risk.",
  },
  {
    heading: "Communications and content review",
    body:
      "We don't monitor private messages as a matter of course. Authorised staff may review them for abuse reports, safety or legal reasons, and the reason is logged.",
  },
  {
    heading: "Subscriptions and billing",
    body:
      "Plans are billed monthly or yearly in advance and renew until you cancel. Access continues to the end of the paid period. Price changes come with at least 30 days' notice.",
  },
  {
    heading: "Acceptable use",
    body:
      "No scraping, reverse engineering, reselling access, or harmful content. Professionals and businesses must hold the qualifications their services require.",
  },
  {
    heading: "Bookings and cancellations",
    body:
      "A booking is between you and the business or professional. Their cancellation and refund policy applies.",
  },
  {
    heading: "Reviews",
    body:
      "You can review a professional you've been a client of. Reviews must be honest and may be moderated. Professionals can respond.",
  },
  {
    heading: "Referral, rewards and ambassador program",
    body:
      "Credits and points have no cash value, can't be transferred, and may be adjusted or revoked, including for misuse.",
  },
  {
    heading: "Content and intellectual property",
    body:
      "What you log or upload stays yours. You give Centium a limited licence to store and show it so the service works.",
  },
  {
    heading: "Termination",
    body: "If a professional's or business's account ends, their access to your data ends immediately.",
  },
  {
    heading: "Changes to these terms",
    body: "We'll tell you in the app or by email before important changes take effect.",
  },
  {
    heading: "Liability",
    body:
      "Centium is a tracking and coordination tool. As far as the law allows, we aren't liable for decisions made from logged data or for services from professionals or businesses you engage.",
  },
];

export const TERMS_GOVERNING_LAW =
  "Governed by the laws of Lebanon. Disputes go to the courts of Beirut, subject to consumer rights in your country.";

/** Round F (A11): under the Terms and the Privacy summaries, as on the website. */
export const LEGAL_LANGUAGE = "Published in English and Arabic. If they differ, the Arabic version prevails.";

/** The in-app legal copy in the active language (call during render). */
export function legalCopyFor() {
  const AR = documentFor<typeof ArabicCopy>("settings.legalCopy");
  if (AR) return AR;
  return { PRIVACY_INTRO, PRIVACY_SECTIONS, TERMS_INTRO, TERMS_SECTIONS, TERMS_GOVERNING_LAW, LEGAL_LANGUAGE };
}
