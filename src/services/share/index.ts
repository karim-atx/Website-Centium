// Release 3 · W8 share cards and the client's consent: the documented DB-8
// surface only (HANDOVER_API "DB-8 · Share cards", migration 20261124080000).
//
// Professional:
// - client_wins(p_client_id) → win_id, client_id, kind, occurred_at, value;
//   only the allowed kinds, only from switches the client shares, zero rows
//   for Clinical overview;
// - share_requests (select party): one row per (professional, win);
// - ask_to_share_win(p_client_id, p_win_id, p_card, p_visibility,
//   p_photos_allowed) → share_requests. ATX09 not Full coaching / Nutrition,
//   ATX08 no such win, ATXH0 the client never shares / already asked / a
//   removal request is open, ATXH1 a card key outside the allowlist, ATX02
//   20 a day;
// - record_shared_item(p_kind, p_format, p_card, p_share_request_id,
//   p_image_path) → uuid. A win only after the client allowed it (ATXH0);
// - shared_items (select own);
// - my_shared_items() (Round D · DV, 20261222030000): each own card with its
//   state, held_reason and link_live.
// Client:
// - share_requests (select party), answer_share_request(p_request_id,
//   p_answer allowed | allowed_no_name | declined) (ATX08 not pending);
// - profiles.win_sharing (own row: always_ask, always_allow, never);
// - shared_items (select about me), request_shared_item_removal(p_item_id).
// Anyone: shared_item_public(p_item_id) (anon); report_shared_item(p_item_id,
// p_reason report_reason, p_detail) (signed in, ATX08 gone, 10 a day).

import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";
import { rpc } from "../pro/rpc";
import { BLOCKED_TEXT } from "../moderation/text";
import { t } from "../../i18n/core";
import type { CardPayload, ClientWin, ShareFormat, Visibility, WinKind } from "../../components/share/shareCardModel";
import { readHeldReason, readItemState, type HeldReason, type SharedItemState } from "../../components/share/heldShareModel";

const from = (table: string) => supabase.from(table as never);

export type Read<T> = { ok: true; data: T } | { ok: false; offline: boolean };
export type Write<T> = { ok: true; data: T } | { ok: false; code: string | null; message: string; offline: boolean };

const readFail = (error: unknown) => ({ ok: false as const, offline: isOffline(error) });
const codeOf = (error: unknown) => ((error as { code?: string } | null)?.code ?? null) || null;

// ---------------------------------------------------------------------------
// Professional
// ---------------------------------------------------------------------------

const WIN_KINDS: WinKind[] = ["pr", "programme_complete", "consistency", "streak", "logging_streak", "meal_plan_complete"];

export async function fetchClientWins(clientId: string): Promise<Read<ClientWin[]>> {
  const { data, error } = await rpc("client_wins", { p_client_id: clientId });
  if (error) return readFail(error);
  const rows = (Array.isArray(data) ? data : []) as { win_id: string; client_id: string; kind: string; occurred_at: string; value: Record<string, unknown> | null }[];
  return {
    ok: true,
    data: rows
      .filter((r) => (WIN_KINDS as string[]).includes(r.kind))
      .map((r) => ({ winId: r.win_id, clientId: r.client_id, kind: r.kind as WinKind, occurredAt: r.occurred_at, value: r.value ?? {} }))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
  };
}

export type ShareRequestStatus = "pending" | "allowed" | "allowed_no_name" | "declined" | "withdrawn";

export interface ShareRequest {
  id: string;
  professionalId: string;
  clientId: string;
  winId: string;
  winKind: WinKind;
  visibility: Visibility;
  photosAllowed: boolean;
  card: unknown;
  status: ShareRequestStatus;
  createdAt: string;
  decidedAt: string | null;
}

const REQ_COLS = "id, professional_id, client_id, win_id, win_kind, visibility, photos_allowed, card, status, created_at, decided_at";
type ReqRow = { id: string; professional_id: string; client_id: string; win_id: string; win_kind: WinKind; visibility: Visibility; photos_allowed: boolean; card: unknown; status: ShareRequestStatus; created_at: string; decided_at: string | null };
const toRequest = (r: ReqRow): ShareRequest => ({
  id: r.id,
  professionalId: r.professional_id,
  clientId: r.client_id,
  winId: r.win_id,
  winKind: r.win_kind,
  visibility: r.visibility,
  photosAllowed: r.photos_allowed,
  card: r.card,
  status: r.status,
  createdAt: r.created_at,
  decidedAt: r.decided_at,
});

/** The professional's own asks about one client. */
export async function fetchMyShareRequests(me: string, clientId: string): Promise<Read<ShareRequest[]>> {
  const { data, error } = await from("share_requests").select(REQ_COLS).eq("professional_id", me).eq("client_id", clientId);
  if (error) return readFail(error);
  return { ok: true, data: ((data ?? []) as unknown as ReqRow[]).map(toRequest) };
}

/** The wording for each ask_to_share_win answer. */
export function askErrorMessage(code: string | null, message: string, firstName: string): string {
  if (code === "ATXH0") {
    if (/does not share/i.test(message)) return t("{name} has chosen not to share wins.", { name: firstName });
    if (/already asked/i.test(message)) return t("You already asked about this win.");
    if (/remove/i.test(message)) return t("{name} asked you to remove a shared card. Remove it before asking again.", { name: firstName });
    return t("You can't ask {name} about this win.", { name: firstName });
  }
  if (code === "ATX08") return t("This win is no longer shared with you.");
  if (code === "ATX09") return t("Client wins are shared by Full coaching and Nutrition professionals.");
  if (code === "ATXH1") return t("This card has something that can't be shared.");
  if (code === "ATX02") return t("You've sent a lot of requests today. Try again tomorrow.");
  return t("Couldn't send the request. Try again.");
}

export async function askToShareWin(clientId: string, winId: string, card: CardPayload, visibility: Visibility): Promise<Write<ShareRequest>> {
  const { data, error } = await rpc("ask_to_share_win", { p_client_id: clientId, p_win_id: winId, p_card: card, p_visibility: visibility, p_photos_allowed: false });
  if (error) return { ok: false, code: codeOf(error), message: error.message ?? "", offline: isOffline(error) };
  const row = (Array.isArray(data) ? data[0] : data) as ReqRow | undefined;
  if (!row) return { ok: false, code: null, message: "", offline: false };
  return { ok: true, data: toRequest(row) };
}

/**
 * shared_items.kind. W8-3: `milestone` (the practice milestone card) since
 * Database Release A 20261216020000; before it that card exported with no
 * row and no public link.
 */
export type ItemKind = "win" | "profile" | "review" | "slot" | "content" | "programme" | "course" | "package" | "meal_plan" | "milestone";

/**
 * The log the client sees (CU30) and the public card; returns the shared
 * item's id. format is the export's own: W8-4, shared_items.format takes
 * `square` since 20261216010000 (square cards were recorded as `post`).
 */
export async function recordSharedItem(kind: ItemKind, format: ShareFormat | "link", card: CardPayload, requestId: string | null): Promise<Write<string>> {
  const { data, error } = await rpc("record_shared_item", { p_kind: kind, p_format: format, p_card: card, p_share_request_id: requestId, p_image_path: null });
  if (error) return { ok: false, code: codeOf(error), message: error.message ?? "", offline: isOffline(error) };
  return { ok: true, data: String(data) };
}

export function recordErrorMessage(code: string | null, message: string): string {
  if (code === "ATXH0") return /remove/i.test(message) ? t("The client asked you to remove this card, so it can't be shared again.") : t("A win is shared only after the client allows it.");
  if (code === "ATXH1") return t("This card has something that can't be shared.");
  // Round D: a blocked word (ATX60) in our words, never which word.
  if (code === "ATX60") return BLOCKED_TEXT; // English key: GuidelinesLink matches it; the sheet shows t(message).
  return t("Couldn't share the card. Try again.");
}

export interface MySharedItem {
  id: string;
  clientId: string | null;
  shareRequestId: string | null;
  kind: string;
  format: string;
  card: unknown;
  createdAt: string;
  removalRequestedAt: string | null;
  removedAt: string | null;
}

const ITEM_COLS = "id, professional_id, client_id, share_request_id, kind, format, card, created_at, removal_requested_at, removed_at";
type ItemRow = { id: string; professional_id: string; client_id: string | null; share_request_id: string | null; kind: string; format: string; card: unknown; created_at: string; removal_requested_at: string | null; removed_at: string | null };
const toItem = (r: ItemRow): MySharedItem & { professionalId: string } => ({
  id: r.id,
  professionalId: r.professional_id,
  clientId: r.client_id,
  shareRequestId: r.share_request_id,
  kind: r.kind,
  format: r.format,
  card: r.card,
  createdAt: r.created_at,
  removalRequestedAt: r.removal_requested_at,
  removedAt: r.removed_at,
});

/** The professional's cards about one client (removal requests show on the win). */
export async function fetchMySharedItemsFor(me: string, clientId: string): Promise<Read<MySharedItem[]>> {
  const { data, error } = await from("shared_items").select(ITEM_COLS).eq("professional_id", me).eq("client_id", clientId);
  if (error) return readFail(error);
  return { ok: true, data: ((data ?? []) as unknown as ItemRow[]).map(toItem) };
}

/** Round D · DV: one of the professional's own cards, with its state (my_shared_items, 20261222030000). */
export interface OwnedSharedItem {
  id: string;
  clientId: string | null;
  kind: string;
  format: string;
  /** The owner's own preview, in every state. */
  card: unknown;
  createdAt: string;
  state: SharedItemState;
  heldAt: string | null;
  /** contact_details, not_relevant, not_allowed_content or other while held; never the matched word. */
  heldReason: HeldReason | null;
  removalRequestedAt: string | null;
  removedAt: string | null;
  /** Whether /s/{id} and its QR answer (false while held or removed). */
  linkLive: boolean;
}

type OwnedRow = {
  shared_item_id: string;
  client_id: string | null;
  kind: string;
  format: string;
  card: unknown;
  created_at: string;
  state: string;
  held_at: string | null;
  held_reason: string | null;
  removal_requested_at: string | null;
  removed_at: string | null;
  link_live: boolean | null;
};

/** Every card the professional recorded, newest first, with its state. */
export async function fetchMyOwnedSharedItems(): Promise<Read<OwnedSharedItem[]>> {
  const { data, error } = await rpc("my_shared_items");
  if (error) return readFail(error);
  const rows = (Array.isArray(data) ? data : []) as OwnedRow[];
  return {
    ok: true,
    data: rows.map((r) => {
      const state = readItemState(r.state);
      return {
        id: r.shared_item_id,
        clientId: r.client_id,
        kind: r.kind,
        format: r.format,
        card: r.card,
        createdAt: r.created_at,
        state,
        heldAt: r.held_at,
        heldReason: state === "held_for_review" ? readHeldReason(r.held_reason) : null,
        removalRequestedAt: r.removal_requested_at,
        removedAt: r.removed_at,
        linkLive: r.link_live === true,
      };
    }),
  };
}

/** The professional's own handle (professional_profiles, select own). */
export async function fetchMyHandle(me: string): Promise<string | null> {
  const { data, error } = await from("professional_profiles").select("handle").eq("profile_id", me).maybeSingle();
  if (error || !data) return null;
  return (data as unknown as { handle: string | null }).handle ?? null;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/** Requests waiting for my answer (CU29), oldest first. */
export async function fetchMyPendingShareRequests(me: string): Promise<Read<ShareRequest[]>> {
  const { data, error } = await from("share_requests").select(REQ_COLS).eq("client_id", me).eq("status", "pending").order("created_at");
  if (error) return readFail(error);
  return { ok: true, data: ((data ?? []) as unknown as ReqRow[]).map(toRequest) };
}

export type ShareAnswer = "allowed" | "allowed_no_name" | "declined";

export async function answerShareRequest(id: string, answer: ShareAnswer): Promise<Write<ShareRequest>> {
  const { data, error } = await rpc("answer_share_request", { p_request_id: id, p_answer: answer });
  if (error) return { ok: false, code: codeOf(error), message: error.message ?? "", offline: isOffline(error) };
  const row = (Array.isArray(data) ? data[0] : data) as ReqRow | undefined;
  if (!row) return { ok: false, code: null, message: "", offline: false };
  return { ok: true, data: toRequest(row) };
}

export type WinSharing = "always_ask" | "always_allow" | "never";

export async function fetchMyWinSharing(me: string): Promise<Read<WinSharing>> {
  const { data, error } = await from("profiles").select("win_sharing").eq("id", me).maybeSingle();
  if (error) return readFail(error);
  const v = (data as unknown as { win_sharing: WinSharing } | null)?.win_sharing;
  return { ok: true, data: v === "always_allow" || v === "never" ? v : "always_ask" };
}

export async function setMyWinSharing(me: string, value: WinSharing): Promise<Write<WinSharing>> {
  const { error } = await from("profiles")
    .update({ win_sharing: value } as never)
    .eq("id", me);
  if (error) return { ok: false, code: codeOf(error), message: error.message ?? "", offline: isOffline(error) };
  return { ok: true, data: value };
}

export interface SharedAboutMe extends MySharedItem {
  professionalId: string;
}

/** Every card about me (CU30 "Shared so far"), newest first; removed cards are left out. */
export async function fetchSharedAboutMe(me: string): Promise<Read<SharedAboutMe[]>> {
  const { data, error } = await from("shared_items").select(ITEM_COLS).eq("client_id", me).is("removed_at", null).order("created_at", { ascending: false });
  if (error) return readFail(error);
  return { ok: true, data: ((data ?? []) as unknown as ItemRow[]).map(toItem) };
}

export async function requestSharedItemRemoval(id: string): Promise<Write<null>> {
  const { error } = await rpc("request_shared_item_removal", { p_item_id: id });
  if (error) return { ok: false, code: codeOf(error), message: error.message ?? "", offline: isOffline(error) };
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Anyone
// ---------------------------------------------------------------------------

export interface PublicSharedItem {
  id: string;
  kind: string;
  format: ShareFormat | "link";
  card: unknown;
  professionalHandle: string | null;
  createdAt: string;
}

/** shared_item_public: null when removed or unknown. */
export async function fetchSharedItemPublic(id: string): Promise<Read<PublicSharedItem | null>> {
  const { data, error } = await rpc("shared_item_public", { p_item_id: id });
  if (error) return readFail(error);
  const r = (Array.isArray(data) ? data[0] : data) as { id: string; kind: string; format: PublicSharedItem["format"]; card: unknown; professional_handle: string | null; created_at: string } | undefined;
  if (!r) return { ok: true, data: null };
  return { ok: true, data: { id: r.id, kind: r.kind, format: r.format, card: r.card, professionalHandle: r.professional_handle, createdAt: r.created_at } };
}

export async function reportSharedItem(id: string, reason: string, detail: string): Promise<Write<null>> {
  const { error } = await rpc("report_shared_item", { p_item_id: id, p_reason: reason, p_detail: detail.trim() || null });
  if (error) return { ok: false, code: codeOf(error), message: error.message ?? "", offline: isOffline(error) };
  return { ok: true, data: null };
}

/** The public card's path (the link "More" shares); the Report on it writes share_item_reports. */
export const sharedItemPath = (id: string) => `/s/${id}`;
