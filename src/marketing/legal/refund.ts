// Round F (DN): the Refund and Cancellation Policy, confirmed by legal counsel.
// The text is docs/legal/refund-policy.md (English) and refund-policy.ar.md
// (Arabic, which prevails), read by policyDoc.ts; nothing here restates it.

import { tk } from "../../i18n/core";

export const REFUND_POLICY_PATH = "/legal/refund-policy";
/** Shown as t(REFUND_POLICY_LABEL). */
export const REFUND_POLICY_LABEL = tk("Refund and cancellation policy");
/**
 * Round G1: the version of the policy the pages link, as its "Last updated"
 * date (YYYY-MM-DD). Every "start now" records it (purchase_confirmations);
 * refund.test.ts checks it against the English file's date.
 */
export const REFUND_POLICY_VERSION = "2026-10-31";
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

/** The page's opening line: section 13 of each version, shown at the top of both. */
export const PREVAILS_SECTION_ID = "section-13";

/** ?lang=ar, then the app's own language, then the browser's; English otherwise. */
export function initialPolicyLang(search: string, htmlLang: string, browserLang: string): PolicyLang {
  const q = new URLSearchParams(search).get("lang");
  if (q === "ar" || q === "en") return q;
  if (htmlLang.toLowerCase().startsWith("ar")) return "ar";
  if (browserLang.toLowerCase().startsWith("ar")) return "ar";
  return "en";
}
