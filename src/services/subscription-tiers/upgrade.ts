/**
 * How somebody asks for a bigger plan, while there is no way to buy one.
 *
 * THERE IS NO CHECKOUT TO SEND THEM TO, and that is a property of the schema
 * rather than a gap in this screen: subscription_states is read-only to every
 * client role — no write policy, no grant — and is written only by a payment
 * process that does not exist yet. A button that opened a payment sheet would
 * collect a card for a change nothing can apply.
 *
 * So the upgrade path is a real one: an email to support, with the subject
 * already written so an operator can see what it is without opening it. The
 * same address the contact form falls back to, and the same shape the account
 * screens already use for "talk to a person".
 */
export const UPGRADE_EMAIL = "support@atraxia.org";

export const UPGRADE_SUBJECT = "Upgrade my Centium plan";

/** `mailto:` for the upgrade request. Subject encoded; no body is prefilled. */
export function upgradeMailto(): string {
  return `mailto:${UPGRADE_EMAIL}?subject=${encodeURIComponent(UPGRADE_SUBJECT)}`;
}

/** The words on the control, in one place so the three screens agree. */
export const UPGRADE_ACTION_LABEL = "Contact us to upgrade";
