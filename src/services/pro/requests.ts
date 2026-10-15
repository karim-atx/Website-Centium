// Release 3 · declining with a reason (DB-2 "Request decline with reason").
//
// - reject_client_request_with_reason(p_request_id, p_reason, p_message): the
//   client sees the reason and message. It keeps every check of the old
//   reject_client_request (ATX08, ATX09, ATX10, the cooldown). A reason is
//   required, and Other requires a message (22023).
// - decline_hire(p_hire_id, p_reason, p_message): wraps cancel_hire for a
//   pending hire.
// With no reason chosen, the existing reject_client_request / cancel_hire
// (services/hire-inbox, services/hires/pro) are used, as before.
// Accepting stays accept_client_request (services/hire-inbox): the database
// starts the client in Onboarding and asks for the default data
// (professional_clients_ask_default_access).

import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { rpc } from "./rpc";

export type DeclineReason = "fully_booked" | "outside_specialty" | "location" | "other";

/** HO18 reason menu, in the frame's order. */
export const DECLINE_REASONS: { value: DeclineReason; label: string }[] = [
  { value: "fully_booked", label: "Fully booked" },
  { value: "outside_specialty", label: "Outside my specialty" },
  { value: "location", label: "Location doesn't suit" },
  { value: "other", label: "Other" },
];

export const DECLINE_MESSAGE_MAX = 280;

export type DeclineResult = { ok: true } | { ok: false; message: string; gone?: boolean };

function describe(error: { code?: string; message?: string }): DeclineResult {
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error.code === "ATX10" || error.code === "ATX08" || error.code === "ATXA1") return { ok: false, message: "This request was already answered.", gone: true };
  if (error.code === "22023") return { ok: false, message: "Add a short message when the reason is Other." };
  return { ok: false, message: "Couldn't decline. Try again." };
}

export async function declineRequestWithReason(requestId: string, reason: DeclineReason, message: string): Promise<DeclineResult> {
  const { error } = await rpc("reject_client_request_with_reason", { p_request_id: requestId, p_reason: reason, p_message: message.trim() || null });
  return error ? describe(error) : { ok: true };
}

export async function declineHireWithReason(hireId: string, reason: DeclineReason, message: string): Promise<DeclineResult> {
  const { error } = await rpc("decline_hire", { p_hire_id: hireId, p_reason: reason, p_message: message.trim() || null });
  return error ? describe(error) : { ok: true };
}
