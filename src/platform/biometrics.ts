// Fingerprint (or face) unlock for locked journal folders (App-Centium
// ROUND_K.md §3; Database DB-Z8).
//
// ONE KEY PER INSTALL, IN THE PHONE. A P-256 key that signs only after a
// strong biometric (never a screen-lock PIN, D-BK1). The server keeps its
// public half (register_device_key) and checks a signature over a message it
// can rebuild itself; it never sees a fingerprint or a face. iPhone later: the
// same calls over a Secure Enclave key, with "face" as the kind.
//
// The flow the screens build on:
//   turn on:  re-authenticate (password, or the emailed code for accounts
//             without one) → createKey() → register_device_key(installId, key)
//   unlock:   journal_unlock_challenge(folder, purpose) → sign(journalMessage(…))
//             → the device unlock call, which opens the same 5-minute window
//             as the password
//   sign-out: revoke_device_key while the session allows it; the phone then
//             deletes the key itself.
//
// Shown only where all three agree: the app, the "biometric_unlock" switch
// (app_config) and a phone with a strong biometric set up. Unlike other
// features, the phone is asked every time: a fingerprint can be added or
// removed while the app is open.
import { registerPlugin } from "@capacitor/core";
import { nativeFeatureOn } from "./appConfig";
import { isNative } from "./index";

export { journalMessage, type UnlockPurpose } from "./biometricsModel";

export type BiometricKind = "fingerprint" | "face" | "biometric";

export type BiometricAvailability = {
  ok: boolean;
  /** What to call it in copy: "fingerprint", "face", or "biometric" when the phone has both or can't say. */
  kind?: BiometricKind;
  /** none_enrolled: the phone can, once the person sets one up in its settings. */
  reason?: "not_native" | "no_hardware" | "none_enrolled" | "unsupported";
};

export type SignError = "cancelled" | "locked_out" | "key_invalidated" | "no_key" | "failed";

interface CentiumBiometricsPlugin {
  available(): Promise<BiometricAvailability>;
  hasKey(): Promise<{ ok: boolean }>;
  createKey(options: { title: string; cancel: string }): Promise<{ publicKey?: string; error?: SignError }>;
  sign(options: { message: string; title: string; cancel: string }): Promise<{ signature?: string; error?: SignError }>;
  deleteKey(): Promise<void>;
}

const CentiumBiometrics = registerPlugin<CentiumBiometricsPlugin>("CentiumBiometrics");

export const biometrics = {
  async available(): Promise<BiometricAvailability> {
    if (!isNative()) return { ok: false, reason: "not_native" };
    if (!nativeFeatureOn("biometric_unlock")) return { ok: false, reason: "unsupported" };
    // An app build without the plugin rejects: that's "unsupported" too.
    return CentiumBiometrics.available().catch(() => ({ ok: false, reason: "unsupported" as const }));
  },

  /** Whether this phone already holds a key (it may still need registering, or be revoked server-side). */
  async hasKey(): Promise<boolean> {
    if (!isNative()) return false;
    return CentiumBiometrics.hasKey().then((r) => r.ok, () => false);
  },

  /**
   * Makes this install's key, after re-authentication, showing the biometric
   * sheet once (`prompt`, in the app's language). The public key (SPKI,
   * base64) goes to register_device_key.
   */
  async createKey(prompt: { title: string; cancel: string }): Promise<{ publicKey: string } | { error: SignError }> {
    const r: { publicKey?: string; error?: SignError } = await CentiumBiometrics.createKey(prompt).catch(() => ({ error: "failed" }));
    return r.publicKey ? { publicKey: r.publicKey } : { error: r.error ?? "failed" };
  },

  /**
   * Signs one unlock's message after the biometric sheet. "key_invalidated":
   * a fingerprint was added to the phone, so the key is gone; revoke it on the
   * server and offer to set it up again.
   */
  async sign(message: string, prompt: { title: string; cancel: string }): Promise<{ signature: string } | { error: SignError }> {
    const r: { signature?: string; error?: SignError } = await CentiumBiometrics.sign({ message, ...prompt }).catch(() => ({ error: "failed" }));
    return r.signature ? { signature: r.signature } : { error: r.error ?? "failed" };
  },

  /** "Remove" in Settings, after revoke_device_key. */
  async deleteKey(): Promise<void> {
    if (!isNative()) return;
    await CentiumBiometrics.deleteKey().catch(() => undefined);
  },
};
