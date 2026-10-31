// Round F (DN, F5): the "Billing and refunds" help article, for every account
// type: the business Help centre's Billing topic and, for clients and
// professionals (who have no Help centre), Settings › Billing and refunds.
// Every step restates the Refund and Cancellation Policy (sections 4, 6, 7
// and 9) and nothing more; the article ends with a link to the policy itself.
// Shown through t() where they render.
import { tk } from "../../i18n/core";

export const BILLING_HELP_TITLE = tk("Billing and refunds");

export const BILLING_HELP_STEPS: string[] = [
  tk("Centium plans are bought in the Centium app, through the App Store or Google Play."),
  tk("To cancel, open the subscriptions in your Apple or Google account settings. Your plan stays active until the end of the period you've paid for, then stops renewing."),
  tk("Refunds are made by Apple or Google, under their own rules. Ask Apple at reportaproblem.apple.com, or Google through Google Play. Centium can't issue refunds for App Store purchases."),
  tk("If you were charged twice, charged after cancelling in time, or charged the wrong amount, contact us below with your account email, what you bought, the date and the reason. We'll support your request and reply within 5 business days."),
];
