// Batch 2 CO · the invitee's side of a team invitation's window. Pure (no
// Supabase) for the node tests.
//
// What's known comes from two places: my_business_employments()
// (MyEmployment.invite: expires_at, revoked_at and the server's own
// `acceptable`; null when the reader doesn't return them) and an accept that
// the server refused (ATXA3 withdrawn / expired), which this screen remembers
// until the list is read again.

import type { AcceptRefusalKind } from "../../../services/business-team/inviteRefusals";
import { shortDay } from "../../../pages/business-team/teamLogic";
import { t } from "../../../i18n/core";

export type InvitationState = "open" | "expired" | "withdrawn";

type Window = { expiresAt: string | null; revokedAt: string | null; acceptable?: boolean | null } | null | undefined;

/**
 * Open unless a refusal or the window says otherwise; an unknown window stays
 * open (never guessed). `acceptable` is team_invite_is_acceptable, so it
 * decides over the dates: not acceptable and not withdrawn is expired.
 */
export function invitationState(invite: Window, refused: AcceptRefusalKind | null | undefined, now: Date = new Date()): InvitationState {
  if (refused === "withdrawn") return "withdrawn";
  if (refused === "expired") return "expired";
  if (!invite) return "open";
  if (invite.revokedAt) return "withdrawn";
  if (invite.acceptable === true) return "open";
  if (invite.acceptable === false) return "expired";
  // team_invite_is_acceptable: no expires_at is not acceptable.
  if (!invite.expiresAt) return "expired";
  const at = Date.parse(invite.expiresAt);
  if (Number.isNaN(at)) return "open";
  return at > now.getTime() ? "open" : "expired";
}

/** "Expires Oct 30" / "Expired Oct 14"; null when the window isn't known or it was withdrawn. */
export function invitationExpiry(invite: Window, state: InvitationState, now: Date = new Date()): string | null {
  if (!invite?.expiresAt || state === "withdrawn") return null;
  const date = shortDay(invite.expiresAt, now);
  return state === "open" ? t("Expires {date}", { date }) : t("Expired {date}", { date });
}

/** The line that replaces the consent text on an invitation that can't be accepted. */
export function deadInvitationLine(state: InvitationState, businessName: string): string | null {
  if (state === "withdrawn") return t("{business} withdrew this invitation, so it can't be accepted.", { business: businessName });
  if (state === "expired") return t("This invitation has expired. Ask {business} to send it again.", { business: businessName });
  return null;
}
