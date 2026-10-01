/**
 * Task X: recovery-sensitive mode on the account (recovery_mode_settings),
 * not only in this browser. Pure, so the sync rule is tested without a server.
 */

export interface RecoveryMode {
  enabled: boolean;
  /** The one-time Home explainer has been dismissed. */
  introSeen: boolean;
}

export const RECOVERY_MODE_OFF: RecoveryMode = { enabled: false, introSeen: false };

/**
 * What the account's setting is, given the server row and this device's
 * old browser-only value, and whether the device value must be uploaded.
 *
 * THE RULE:
 *   - A server row exists: the SERVER WINS, always. The device copy is only
 *     ever a first-paint hint after this, so it is corrected, never uploaded.
 *   - No server row, and this device has the mode ON: the device's value is
 *     uploaded, once (it creates the row). Someone who turned it on before it
 *     was saved to the account keeps it, on every device from now on.
 *   - No server row, and the device has it off (or no value): off, and
 *     nothing is written. A row is created the first time it is switched.
 * A device "off" never overrides anything: off is the default and a missing
 * row already means off.
 */
export function syncRecoveryMode(
  server: RecoveryMode | null,
  device: RecoveryMode | null
): { mode: RecoveryMode; upload: RecoveryMode | null } {
  if (server) return { mode: server, upload: null };
  if (device?.enabled) return { mode: device, upload: device };
  return { mode: RECOVERY_MODE_OFF, upload: null };
}
