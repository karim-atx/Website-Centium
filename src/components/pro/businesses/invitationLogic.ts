// Batch 2 CO · the invitee's side of a team invitation's window. Pure (no
// Supabase) for the node tests.
//
// What's known comes from two places: the soft read of my own rows
// (MyEmployment.invite: expires_at, revoked_at; null when it failed) and an
// accept that the server refused (ATXA3 withdrawn / expired), which this
// screen remembers because my_business_employments() can't say either.

import type { AcceptRefusalKind } from "../../../services/business-team/inviteRefusals";
import { shortDay } from "../../../pages/business-team/teamLogic";

export type InvitationState = "open" | "expired" | "withdrawn";

type Window = { expiresAt: string | null; revokedAt: string | null } | null | undefined;

/** Open unless a refusal or the window read says otherwise; an unknown window stays open (never guessed). */
export function invitationState(invite: Window, refused: AcceptRefusalKind | null | undefined, now: Date = new Date()): InvitationState {
  if (refused === "withdrawn") return "withdrawn";
  if (refused === "expired") return "expired";
  if (!invite) return "open";
  if (invite.revokedAt) return "withdrawn";
  // team_invite_is_acceptable: no expires_at is not acceptable.
  if (!invite.expiresAt) return "expired";
  const t = Date.parse(invite.expiresAt);
  if (Number.isNaN(t)) return "open";
  return t > now.getTime() ? "open" : "expired";
}

/** "Expires Oct 30" / "Expired Oct 14"; null when the window isn't known or it was withdrawn. */
export function invitationExpiry(invite: Window, state: InvitationState, now: Date = new Date()): string | null {
  if (!invite?.expiresAt || state === "withdrawn") return null;
  return `${state === "open" ? "Expires" : "Expired"} ${shortDay(invite.expiresAt, now)}`;
}

/** The line that replaces the consent text on an invitation that can't be accepted. */
export function deadInvitationLine(state: InvitationState, businessName: string): string | null {
  if (state === "withdrawn") return `${businessName} withdrew this invitation, so it can't be accepted.`;
  if (state === "expired") return `This invitation has expired. Ask ${businessName} to send it again.`;
  return null;
}
