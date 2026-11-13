import { SIGNED_OUT_OWNER } from "../../../lib/supabase/tabIdentity";

// Which way the device's presentation copy goes once an account's row has been
// read (usePresentationSync, Stage A1), kept pure so the ownership rule is
// tested on its own.
//
// THE DEVICE COPY IS SHARED, THE ROW IS NOT. `deviceOwner` (presentationOwner)
// says whose choices the device copy holds:
//   - null: written before the marker existed; taken as this account's own
//     (the one-time upgrade path);
//   - an account id: that account's;
//   - SIGNED_OUT_OWNER (Batch D GE): kept through a Sign out (or an ended
//     session), and no account's.

/**
 * - "server": the row wins and is applied, and the device copy becomes this
 *   account's;
 * - "save": the device copy is this account's own; write it (a pending change
 *   over the row, or a first row unless it is still the app default);
 * - "default": another account's copy and no row here; start from the app
 *   default (never save another account's choices);
 * - "keep" (Batch D GE): the copy a Sign out left, and no row; it stays on
 *   screen, but is neither saved to this account nor claimed for it. It
 *   becomes this account's only when the person changes a setting while
 *   signed in, and then what is saved is what they see.
 */
export type AfterRead = "server" | "save" | "default" | "keep";

export function afterRead(hasRow: boolean, pending: boolean, deviceOwner: string | null, ownerId: string): AfterRead {
  if (deviceOwner === SIGNED_OUT_OWNER) return hasRow ? "server" : "keep";
  const mine = deviceOwner === null || deviceOwner === ownerId;
  if (hasRow && !(pending && mine)) return "server";
  if (!hasRow && !mine) return "default";
  return "save";
}
