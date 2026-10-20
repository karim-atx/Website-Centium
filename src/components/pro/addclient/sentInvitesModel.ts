// Release 3 W9 post-review · Clients "Invites sent" (Karim: in Clients, not
// Home). One row per client_invites row the professional sent, from the
// columns the follow-up 20261124120000 makes readable: the first name, or
// the masked address when there is none; the channel; the day it was sent in
// the app's short date ("Oct 14", shareDate); and the message when present.
// Statuses (Hired / Waiting / Opened) wait for a later release.
import { shareDate } from "../../share/shareCardModel";

/** The fields of services/pro/invites SentInviteRow this needs (kept structural: the node:test project has no DOM, so no service import). */
export interface SentInviteInput {
  id: string;
  channel: string;
  addressHint: string;
  firstName: string | null;
  message: string | null;
  createdAt: string;
}

export interface SentInviteView {
  id: string;
  /** The first name, or the masked address when no name was given. */
  name: string;
  channel: "Email" | "Phone";
  /** "Email · Oct 14". */
  meta: string;
  message: string | null;
}

/** Rows shown before "See all". */
export const SENT_INVITES_SHOWN = 3;

export const channelLabel = (channel: string): "Email" | "Phone" => (channel === "phone" ? "Phone" : "Email");

export function sentInviteView(r: SentInviteInput, now: Date = new Date()): SentInviteView {
  const channel = channelLabel(r.channel);
  const date = shareDate(r.createdAt, now);
  return {
    id: r.id,
    name: r.firstName?.trim() || r.addressHint,
    channel,
    meta: date ? `${channel} · ${date}` : channel,
    message: r.message?.trim() || null,
  };
}
