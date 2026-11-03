// Round F (DN): the Refund and Cancellation Policy, confirmed by legal counsel.
// The text is docs/legal/refund-policy.md (English) and refund-policy.ar.md
// (Arabic, which prevails), read by policyDoc.ts; nothing here restates it.
// Landing update (C14): it is Legal section 04 (pages/Legal.tsx), no longer a
// page of its own.

import { tk } from "../../i18n/core";

/** The policy's id on the Legal page (C14): section 04. Its former page,
 *  /legal/refund-policy, redirects here (public/_redirects at the edge,
 *  pages/RefundPolicy.tsx in the router) for old links. */
export const REFUND_POLICY_ID = "refund-policy";
/** Where the marketing site and the app link the policy: Legal section 04. */
export const REFUND_POLICY_HREF = "/legal#" + REFUND_POLICY_ID;
/** Shown as t(REFUND_POLICY_LABEL). */
export const REFUND_POLICY_LABEL = tk("Refund and cancellation policy");
/** The in-app article for clients and professionals (F5); the business one is in Help. */
export const BILLING_HELP_PATH = "/app/settings/help/billing-and-refunds";

export type PolicyLang = "en" | "ar";

/** F4: the phrases that become links, word for word as each file has them. */
export const REFUND_POLICY_LINKS: Record<PolicyLang, [string, string][]> = {
  en: [
    ["Help in the Centium app", BILLING_HELP_PATH],
    ["centium.atraxia.org", "https://centium.atraxia.org"],
    ["reportaproblem.apple.com", "https://reportaproblem.apple.com"],
  ],
  ar: [
    ["قسم المساعدة في تطبيق Centium", BILLING_HELP_PATH],
    ["centium.atraxia.org", "https://centium.atraxia.org"],
    ["reportaproblem.apple.com", "https://reportaproblem.apple.com"],
  ],
};
