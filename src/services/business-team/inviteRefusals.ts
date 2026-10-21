import { isOffline } from "../network-error";

// Batch 2 CO (migration 20261201000000): the words for every refusal of
// resend_team_invite, revoke_team_invite, reinvite_revoked_team_member and
// accept_business_employment.
// Pure (no Supabase) so the node tests can pin each documented error.
//
// ATXA3 carries several meanings per function, told apart by the message
// text the contract documents (HANDOVER_API "Batch 2 · Team invites expire,
// resend and revoke"); the server's own text is never shown, it has "--".

export type PgError = { code?: string; message?: string } | null | undefined;

/** What the screen should do after a refused invite write. */
export interface InviteRefusal {
  message: string;
  /** The row changed under us (gone, accepted, withdrawn): read the team again. */
  refresh: boolean;
}

const text = (e: PgError) => `${e?.message ?? ""}`.toLowerCase();

/** "Try again in 12 minutes." from check_rate_limit's "...Please try again in N minute(s)."; else an hour. */
export function retryIn(e: PgError): string {
  const m = /try again in (\d+) minute/i.exec(`${e?.message ?? ""}`);
  if (!m) return "Try again in an hour.";
  const n = Number(m[1]);
  return `Try again in ${n} minute${n === 1 ? "" : "s"}.`;
}

/** The shared answers: offline, no permission, a closed business. Null when none applies. */
function common(e: PgError, offline: string): InviteRefusal | null {
  if (isOffline(e)) return { message: offline, refresh: false };
  if (e?.code === "42501") return { message: "You can't manage this team's invites.", refresh: false };
  // CP: business_employees writes are refused once the business is closed (ATXAB).
  if (e?.code === "ATXAB" || text(e).includes("atxab")) return { message: "Your business is closed, so its invites can't be changed.", refresh: false };
  return null;
}

/** resend_team_invite refusals. */
export function resendRefusal(e: PgError): InviteRefusal {
  const c = common(e, "Couldn't resend the invite. Check your connection and try again.");
  if (c) return c;
  if (e?.code === "ATX02") return { message: `You've resent a lot of invites in the last hour. ${retryIn(e)}`, refresh: false };
  if (e?.code === "ATXA3") {
    const t = text(e);
    if (t.includes("already accepted")) return { message: "They already accepted, so they're on your team now.", refresh: true };
    if (t.includes("withdrawn")) return { message: "This invite was withdrawn, so it can't be resent.", refresh: true };
    if (t.includes("no such invitation")) return { message: "This invite isn't there any more. They may have declined it.", refresh: true };
  }
  return { message: "Couldn't resend the invite. Try again.", refresh: false };
}

/** revoke_team_invite refusals (an already-withdrawn invite is not one: it answers with the old time). */
export function revokeRefusal(e: PgError): InviteRefusal {
  const c = common(e, "Couldn't withdraw the invite. Check your connection and try again.");
  if (c) return c;
  if (e?.code === "ATXA3") {
    const t = text(e);
    if (t.includes("already works here")) return { message: "They already accepted, so they're on your team. To end that, use Remove from team.", refresh: true };
    if (t.includes("no such invitation")) return { message: "This invite isn't there any more. They may have declined it.", refresh: true };
  }
  return { message: "Couldn't withdraw the invite. Try again.", refresh: false };
}

/** reinvite_revoked_team_member refusals (a still-live invite is not one: it answers its window). */
export function reinviteRefusal(e: PgError): InviteRefusal {
  const c = common(e, "Couldn't invite them again. Check your connection and try again.");
  if (c) return c;
  if (e?.code === "ATX02") return { message: `You've sent a lot of invites in the last hour. ${retryIn(e)}`, refresh: false };
  if (e?.code === "ATXA3") {
    const t = text(e);
    if (t.includes("already works here")) return { message: "They already accepted, so they're on your team now.", refresh: true };
    if (t.includes("no previous invitation")) return { message: "This invite isn't there any more. Add them again to send a new one.", refresh: true };
  }
  return { message: "Couldn't invite them again. Try again.", refresh: false };
}

/** Why an invitation can't be accepted: gone, withdrawn or expired (accept_business_employment ATXA3). */
export type AcceptRefusalKind = "gone" | "withdrawn" | "expired";

/** accept_business_employment's ATXA3, worded per meaning. Null for anything else. */
export function acceptRefusal(e: PgError): { kind: AcceptRefusalKind | null; message: string } | null {
  if (e?.code !== "ATXA3") return null;
  const t = text(e);
  if (t.includes("has expired")) return { kind: "expired", message: "This invitation has expired. Ask the business to send it again." };
  if (t.includes("withdrawn")) return { kind: "withdrawn", message: "This invitation was withdrawn." };
  if (t.includes("no invitation")) return { kind: "gone", message: "This invitation isn't there any more. The business may have removed it." };
  return { kind: null, message: "This invitation can't be accepted any more." };
}
