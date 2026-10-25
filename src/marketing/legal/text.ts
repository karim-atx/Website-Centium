// The legal text of the Centium site (/legal): the Terms of Service, the
// Privacy Policy and the Health & Medical Disclaimer, WORD FOR WORD. Moved
// here unchanged from the previous src/marketing/pages/Legal.tsx (landing
// v29: the page's design changed, its text did not; the handover's
// centium-legal-v7.js carries the same strings). src/marketing/legal/
// legal.test.ts pins every string with a fingerprint, so an edit here is
// deliberate: change the fingerprint in the same commit, and move
// LEGAL_VERSION (src/services/legal/acceptances.ts) and the app's
// LEGAL_UPDATED (src/pages/settings/legalCopy.ts) when the documents change.

export interface LegalGroup {
  h: string;
  items: string[];
}

// Copied verbatim from the handoff's `termsData` (11 headed groups; the 12th
// subsection, "Liability", is a hardcoded block after these in the handoff
// rather than a data entry, so it is appended explicitly below).
// Except the minimum age (user decision, 14 Oct 2026): stated as exactly 16,
// the age the app and database enforce, without "or the age of digital
// consent"; Children's data below says "under 16" for the same reason.
export const TERMS_GROUPS: LegalGroup[] = [
  {
    h: "Your account",
    items: [
      "You must be at least 16 years old to hold a Centium account, and you are responsible for keeping your credentials secure.",
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
      "Professionals subscribe to their own plan, billed monthly or yearly. Businesses pay a base platform fee plus seat blocks of five professionals, billed monthly or yearly; each seated professional receives the Starter plan. A marketplace revenue share applies to businesses' marketplace sales and is billed separately.",
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

export const LIABILITY_TEXT =
  "Centium is provided as a tracking and coordination tool, without warranty that it will be uninterrupted or error-free. To the fullest extent permitted by law, Centium is not liable for indirect or consequential loss, for decisions made on the basis of logged data, or for the services delivered by any professional or business you engage through the marketplace. Nothing here limits liability that cannot lawfully be limited.";

// Copied verbatim from the handoff's `privacyData` (10 headed groups).
export const PRIVACY_GROUPS: LegalGroup[] = [
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
      "Centium is not directed at, and does not knowingly collect data from, anyone under 16.",
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

// Copied verbatim from the handoff's `healthData`: a flat bullet list. The
// page (LG1) shows it under its "In detail" heading, which is not legal text.
export const HEALTH_ITEMS: string[] = [
  "Nutrition targets, training suggestions, biomarker readings and trend analysis are informational. They are generated from the data you enter and from general, published health standards, not from an assessment of your individual medical situation.",
  "Always consult a qualified healthcare professional before starting a new diet or training programme, changing medication, or acting on any reading shown in the app. Never delay seeking medical advice because of something you saw in Centium.",
  "Biomarker capture and any automated extraction of values from photos or connected services may be inaccurate. Treat laboratory reports and clinician guidance as the source of truth.",
  "Voice and video calls between you and a professional are a convenience feature, not a clinical-grade telehealth platform, and are not designed for emergencies or for transmitting information that requires enhanced regulatory safeguards.",
  "Professionals and businesses on Centium are independent providers. Centium facilitates the connection and the data sharing; it does not supervise, endorse or take clinical responsibility for their advice or services.",
  "Where Centium reviews a professional's submitted certification or credential documents, this confirms eligibility to be listed on the platform at the time of review. It is not an ongoing guarantee that a credential remains valid, and it is not an endorsement of the quality of care or advice a professional provides.",
  "Centium is not an emergency service. If you think you are experiencing a medical emergency, contact your local emergency number immediately.",
];


/** The paragraph under each document's title (the Health one is drawn in the lavender box). */
export const INTRO = {
  terms:
    "These terms govern your use of the Centium apps, website and connected professional and business dashboards. By creating an account you accept them on your own behalf, or on behalf of the practice or business you represent.",
  privacy:
    "Centium exists to bring your health information together in one place, which means we take its handling seriously. This section explains what we collect, why, and the control you keep over it.",
  health: "Centium supports your health journey. It does not provide medical diagnosis or treatment.",
};

/** The closing card: its heading and its line. */
export const ASK = [
  "Questions about any of this?",
  "Reach out and we'll point you to the right person, including for data access, export or deletion requests.",
] as const;

/** The governing-law line under the closing card. */
export const GOVERNING =
  "These terms are governed by the laws of Lebanon, and any dispute will be resolved in the courts of Beirut, subject to any mandatory consumer-protection rights in your country of residence.";
