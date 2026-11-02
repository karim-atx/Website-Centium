import { t } from "../../i18n/core";
// Release 3 · what invite_client's 22023 refusals say (DB-2 "Email invite",
// follow-up 20261124120000: the first name is at most 40 characters and the
// message at most 500). Pure, so it's tested on its own (inviteErrors.test.ts).

export const INVITE_NAME_MAX = 40;
export const INVITE_MESSAGE_MAX = 500;
/** offline_clients_goal_check: 1 to 200 characters. */
export const OFFLINE_GOAL_MAX = 200;

/** The sentence for an invite_client 22023, from the server's message. */
export function invite22023(message: string | undefined, channel: "email" | "phone"): string {
  const m = message ?? "";
  if (/already invited/.test(m)) return t("You already invited them today.");
  if (/first name/.test(m)) return t("Keep the first name to {max} characters or fewer.", { max: INVITE_NAME_MAX });
  if (/message/.test(m)) return t("Keep the message to {max} characters or fewer.", { max: INVITE_MESSAGE_MAX });
  return channel === "email" ? t("Enter a valid email address.") : t("Enter a valid phone number.");
}
