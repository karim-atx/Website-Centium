/**
 * Round D (Database 20261222020000): an offline write is saved once.
 *
 * Each queued item's id is a uuid made on the device, sent as
 * `client_request_id` on every attempt. The column is unique per owner, so a
 * replay (the first attempt reached the server but its answer didn't reach
 * us) is refused with 23505 on `<table>_client_request_unique`, which means
 * "already saved". Pure, so it can be tested.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (s: string | null | undefined): s is string => !!s && UUID.test(s);

/** A new queue id. Items queued before Round D kept other ids; those are sent without one. */
export function newRequestId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Very old browsers only: a v4-shaped id from Math.random.
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  const h = hex.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** The `client_request_id` to send for a queue id, or nothing for an older one. */
export const requestColumn = (requestId: string | null | undefined): { client_request_id?: string } =>
  isUuid(requestId) ? { client_request_id: requestId } : {};

/** True when the server already has this write (a replay of a queued item). */
export function isAlreadySaved(error: { code?: string; message?: string; details?: string } | null | undefined): boolean {
  if (!error || error.code !== "23505") return false;
  return `${error.message ?? ""} ${error.details ?? ""}`.includes("client_request_unique");
}
