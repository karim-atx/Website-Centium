// What a phone's device key signs to open a locked journal folder (App-Centium
// ROUND_K.md §3.3; Database DB-Z8). The server rebuilds these exact bytes to
// check the signature, so the format is fixed here and pinned by
// biometricsModel.test.ts; iPhone signs the same.

/** What the unlock is for: the four purposes of the password sheet. */
export type UnlockPurpose = "unlock" | "write" | "delete" | "remove";

/**
 * `centium-journal:v1:<purpose>:<folder_id>:<device_id>:<nonce>`, UTF-8.
 * `deviceId` is the install id the key was registered under.
 */
export function journalMessage(purpose: UnlockPurpose, folderId: string, deviceId: string, nonce: string): string {
  return `centium-journal:v1:${purpose}:${folderId}:${deviceId}:${nonce}`;
}
