// Release 3 · inviting clients (DB-2 "Invites", HANDOVER_API "Invite page",
// "Email invite"; Karim's answer 1).
//
// - The invite link is a client_codes row of kind invite_link, multi-use and
//   revocable (create_invite_link). The professional reads their own rows
//   (client_codes_select_own).
// - professional_invites_allowed(p_professional): false for a doctor,
//   physiotherapist or dietitian until their licence is verified; then
//   create_invite_link and invite_client refuse with ATXG3.
// - preview_invite_link(code).licence_verified: false shows "Licence not
//   verified yet" (the invite page and the client's row say the same).
// - invite_client('email', address) queues the email; the send-client-invite
//   Edge Function sends it (never called from the browser).
//   invite_client('phone', number) only records it (no SMS provider): the
//   device's own messages app sends the text.
// - offline_clients: a name, contact details and a goal (at most 200), until
//   the person joins.
// - invite_client also takes the first name (at most 40) and a message (at
//   most 500) for the email (follow-up 20261124120000); 22023 when too long.

import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { rpc } from "./rpc";
import { invite22023, OFFLINE_GOAL_MAX } from "./inviteErrors";

export interface InviteLink {
  id: string;
  code: string;
  expiresAt: string;
  uses: number;
  maxUses: number;
}

export type Result<T> = { ok: true; data: T } | { ok: false; message: string; offline?: boolean };

export const INVITE_LOCKED_MESSAGE = "Invite links open once your licence is verified.";

/** COPY {invite_url} = centium.app/i/{code}. */
export const inviteUrl = (code: string) => `centium.app/i/${code}`;
export const inviteHref = (code: string) => `https://${inviteUrl(code)}`;

export async function fetchInvitesAllowed(me: string): Promise<Result<boolean>> {
  const { data, error } = await rpc("professional_invites_allowed", { p_professional: me });
  if (error) return { ok: false, message: OFFLINE_MESSAGE, offline: isOffline(error) };
  return { ok: true, data: data === true };
}

/** The newest usable invite link: not revoked, not expired, not used up. */
export async function fetchCurrentInviteLink(): Promise<Result<InviteLink | null>> {
  const { data, error } = await supabase
    .from("client_codes")
    .select("id, code, expires_at, uses, max_uses, revoked_at, kind")
    .eq("kind", "invite_link")
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) return { ok: false, message: "Couldn't load your invite link. Try again.", offline: isOffline(error) };
  const row = (data ?? []).find((r) => (r.uses ?? 0) < (r.max_uses ?? 1));
  return { ok: true, data: row ? { id: row.id, code: row.code, expiresAt: row.expires_at, uses: row.uses ?? 0, maxUses: row.max_uses ?? 1 } : null };
}

/** create_invite_link with its defaults (90 days, 200 people). */
export async function createInviteLink(): Promise<Result<InviteLink>> {
  const { data, error } = await rpc("create_invite_link", {});
  if (error) {
    if (error.code === "ATXG3") return { ok: false, message: INVITE_LOCKED_MESSAGE };
    if (error.code === "ATX02") return { ok: false, message: "You've made several links in the last hour. Try again later." };
    return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't create your invite link. Try again.", offline: isOffline(error) };
  }
  const r = data as { id: string; code: string; expires_at: string; uses: number | null; max_uses: number | null };
  return { ok: true, data: { id: r.id, code: r.code, expiresAt: r.expires_at, uses: r.uses ?? 0, maxUses: r.max_uses ?? 1 } };
}

/** preview_invite_link(code).licence_verified (anon reader, Karim's answer 1). Null when unknown. */
export async function fetchLicenceVerified(code: string): Promise<boolean | null> {
  const { data, error } = await rpc("preview_invite_link", { p_code: code });
  if (error) return null;
  const row = ((data ?? []) as { licence_verified: boolean | null }[])[0];
  return row ? row.licence_verified === true : null;
}

export interface InviteJoin {
  clientId: string;
  firstName: string;
  avatarUrl: string | null;
  joinedAt: string;
}

/** my_invite_joins(): who joined through an invite link (HO2 "Joined with your invite"). */
export async function fetchInviteJoins(): Promise<Result<InviteJoin[]>> {
  const { data, error } = await rpc("my_invite_joins", {});
  if (error) return { ok: false, message: "Couldn't load who joined. Try again.", offline: isOffline(error) };
  return {
    ok: true,
    data: ((data ?? []) as { client_id: string; first_name: string | null; avatar_url: string | null; joined_at: string }[]).map((r) => ({
      clientId: r.client_id,
      firstName: r.first_name?.trim() || "Name unavailable",
      avatarUrl: r.avatar_url,
      joinedAt: r.joined_at,
    })),
  };
}

export type ContactChannel = "email" | "phone";

/** A client_invites row as the professional reads it (Clients "Invites sent"). */
export interface SentInviteRow {
  id: string;
  channel: string;
  /** The masked address ("k***@mail.com", "***123"); the full one isn't readable. */
  addressHint: string;
  firstName: string | null;
  message: string | null;
  createdAt: string;
}

type SentQuery = PromiseLike<{ data: unknown; error: PostgrestError | null }> & {
  order: (col: string, o: { ascending: boolean }) => SentQuery;
  limit: (n: number) => SentQuery;
};

/** How many sent invites Clients reads (newest first). */
export const SENT_INVITES_LIMIT = 50;

/**
 * The professional's sent invitations (client_invites_select_own; follow-up
 * 20261124120000: first_name and message are readable by the professional).
 * Only the granted columns are selected; email, address_hash, status and
 * the outbox fields are left alone (statuses wait for a later release).
 */
export async function fetchSentInvites(): Promise<Result<SentInviteRow[]>> {
  // first_name / message aren't in the generated types yet: cast at this boundary.
  const table = (supabase as unknown as { from: (t: string) => { select: (cols: string) => SentQuery } }).from("client_invites");
  const { data, error } = await table
    .select("id, channel, address_hint, first_name, message, created_at")
    .order("created_at", { ascending: false })
    .limit(SENT_INVITES_LIMIT);
  if (error) return { ok: false, message: "Couldn't load your invites. Try again.", offline: isOffline(error) };
  const rows = (data ?? []) as unknown as { id: string; channel: string; address_hint: string; first_name: string | null; message: string | null; created_at: string }[];
  return {
    ok: true,
    data: rows.map((r) => ({ id: r.id, channel: r.channel, addressHint: r.address_hint, firstName: r.first_name, message: r.message, createdAt: r.created_at })),
  };
}

/**
 * invite_client(channel, address, first_name, message): email is queued and
 * sent by the server, with the first name (at most 40) and message (at most
 * 500) in the email; phone is only recorded. Blank name or message is sent as null.
 */
export async function inviteByContact(
  channel: ContactChannel,
  address: string,
  extra?: { firstName?: string; message?: string }
): Promise<Result<{ code: string | null }>> {
  const { data, error } = await rpc("invite_client", {
    p_channel: channel,
    p_address: address,
    p_first_name: extra?.firstName?.trim() || null,
    p_message: extra?.message?.trim() || null,
  });
  if (error) {
    if (error.code === "ATXG3") return { ok: false, message: INVITE_LOCKED_MESSAGE };
    if (error.code === "ATX02") return { ok: false, message: "You've sent a lot of invites today. Try again tomorrow." };
    if (error.code === "22023") return { ok: false, message: invite22023(error.message, channel) };
    return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't send the invite. Try again.", offline: isOffline(error) };
  }
  const row = ((data ?? []) as { code: string | null }[])[0];
  return { ok: true, data: { code: row?.code ?? null } };
}

export interface OfflineDraft {
  name: string;
  email: string;
  phone: string;
  /** offline_clients.goal: at most 200 characters; blank is null. */
  goal: string;
}

export async function addOfflineClient(me: string, d: OfflineDraft): Promise<Result<{ id: string }>> {
  // goal isn't in the generated types yet: cast at this boundary.
  const row = { professional_id: me, name: d.name.trim(), email: d.email.trim() || null, phone: d.phone.trim() || null, goal: d.goal.trim() || null };
  const { data, error } = await supabase
    .from("offline_clients")
    .insert(row as unknown as { professional_id: string; name: string })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23514" && d.goal.trim().length > OFFLINE_GOAL_MAX) return { ok: false, message: `Keep the goal to ${OFFLINE_GOAL_MAX} characters or fewer.` };
    return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't add them. Try again.", offline: isOffline(error) };
  }
  return { ok: true, data: { id: data.id } };
}

/** The device's messages app with the invite text (the server sends no SMS). */
export function smsHref(number: string, body: string): string {
  const to = number.replace(/[^0-9+]/g, "");
  return `sms:${to}?&body=${encodeURIComponent(body)}`;
}

/** COPY HO2 default message: "Hi, it's {pro_first_name}. Here's my Centium page, where you can see my plans and hire me. {invite_url}". */
export const defaultInviteMessage = (firstName: string, code: string) =>
  `Hi, it's ${firstName}. Here's my Centium page, where you can see my plans and hire me. ${inviteUrl(code)}`;
