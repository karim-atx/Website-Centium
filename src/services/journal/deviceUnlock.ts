import { supabase } from "../../../lib/supabase/client";
import { isNative } from "../../platform/index";
import { CentiumNative } from "../../platform/native";
import { biometrics, journalMessage, type UnlockPurpose } from "../../platform/biometrics";
import { describeLockError } from "./lockLogic";
import { edgeOutcome, phoneLabelFrom, signFailure, type DeviceOutcome } from "./deviceUnlockModel";
import { t } from "../../i18n/core";

// Round K (DB-Z8; App-Centium ROUND_K.md §3): a locked folder opened with this
// phone's fingerprint or face. The key lives in the phone (platform/
// biometrics.ts) and signs a one-time challenge; the server checks it and
// opens the same five-minute window as the password, or removes the lock.
// Native only: in a browser none of this is reached (nothing is shown).

type Rpc = <T>(fn: string, args: Record<string, unknown>) => PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>;
// Through unknown first, as services/journal/index.ts does (TS2589).
const rpc = (supabase as unknown as { rpc: Rpc }).rpc.bind(supabase) as Rpc;

/** This install's id: the device id the key is registered under (report_app_install's). */
export async function thisInstallId(): Promise<string | null> {
  if (!isNative()) return null;
  return CentiumNative.installId().then(
    (r) => r.id,
    () => null
  );
}

/** The fingerprint sheet's own words, in the app's language. */
function unlockPrompt(purpose: UnlockPurpose, folderName: string) {
  return {
    title: purpose === "remove" ? t("Remove the lock on {folder}", { folder: folderName }) : t("Unlock {folder}", { folder: folderName }),
    cancel: t("Cancel"),
  };
}

/**
 * Opens (or, for "remove", unlocks for good) a locked folder with this
 * phone's key: journal_unlock_challenge → the fingerprint sheet signs the
 * message → the Edge Function checks it. A key the phone says is gone
 * (a fingerprint was added) is revoked on the server here, so the device list
 * stops showing it.
 */
export async function unlockFolderWithDevice(folderId: string, purpose: UnlockPurpose, folderName: string): Promise<DeviceOutcome> {
  const deviceId = await thisInstallId();
  if (!deviceId) return { ok: false, ...signFailure("no_key") };

  const { data, error } = await rpc<{ nonce: string } | { nonce: string }[]>("journal_unlock_challenge", { p_folder_id: folderId, p_purpose: purpose });
  if (error) {
    console.error("[journal] journal_unlock_challenge failed:", error.code);
    return { ok: false, line: describeLockError(error.code, error.message), setup: false, revoke: false };
  }
  const nonce = (Array.isArray(data) ? data[0] : data)?.nonce;
  if (!nonce) return { ok: false, line: describeLockError(undefined, undefined), setup: false, revoke: false };

  const signed = await biometrics.sign(journalMessage(purpose, folderId, deviceId, nonce), unlockPrompt(purpose, folderName));
  if ("error" in signed) {
    const failure = signFailure(signed.error);
    if (failure.revoke) await revokeKey(deviceId);
    return { ok: false, ...failure };
  }

  const { data: body, error: fnError } = await supabase.functions.invoke<{ success?: boolean; message?: string; unlocked_until?: string | null }>(
    "unlock-journal-folder-with-device",
    { body: { folder_id: folderId, device_id: deviceId, purpose, nonce, signature: signed.signature } }
  );
  if (!fnError) return edgeOutcome(200, body ?? null);
  // A non-2xx answer: its status is on FunctionsHttpError.context, a Response.
  const context = (fnError as { context?: unknown }).context;
  const status = context instanceof Response ? context.status : 0;
  console.error("[journal] unlock-journal-folder-with-device failed:", status);
  return edgeOutcome(status, null);
}

async function revokeKey(deviceId: string): Promise<boolean> {
  const { data, error } = await rpc<boolean>("revoke_device_key", { p_device_id: deviceId });
  if (error) {
    console.error("[journal] revoke_device_key failed:", error.code);
    return false;
  }
  return data !== false;
}

/** Re-authentication for register_device_key: the password, or the emailed code for an account without one. */
export type DeviceReauth = { password: string } | { code: string };

export type RegisterOutcome =
  | { ok: true; message: string }
  /** `reauth`: the session isn't fresh (ATXB1); ask for the password or the code, then call again with it. */
  | { ok: false; line: string; reauth: boolean; code?: string };

/**
 * Settings' "turn on": the key is made on the phone first (createKey, one
 * fingerprint sheet), then registered with a re-authentication. With none,
 * a session that signed in within ten minutes is enough; otherwise ATXB1 asks
 * for the password or the code, and the same public key is sent again with it.
 */
export async function registerThisPhone(publicKey: string, reauth?: DeviceReauth): Promise<RegisterOutcome> {
  const deviceId = await thisInstallId();
  if (!deviceId) return { ok: false, line: t("Couldn't add this phone. Try again."), reauth: false };
  const model = await CentiumNative.deviceModel().then(
    (r) => r.model,
    () => undefined
  );
  const { data, error } = await rpc<{ registered: boolean; message: string } | { registered: boolean; message: string }[]>("register_device_key", {
    p_device_id: deviceId,
    p_public_key: publicKey,
    p_label: phoneLabelFrom(model, typeof navigator === "undefined" ? "" : navigator.userAgent),
    p_password: reauth && "password" in reauth ? reauth.password : null,
    p_code: reauth && "code" in reauth ? reauth.code : null,
  });
  if (error) {
    console.error("[journal] register_device_key failed:", error.code);
    if (error.code === "ATXB1") return { ok: false, line: describeLockError(error.code, error.message), reauth: true, code: error.code };
    // 22023: more than ten phones (or a malformed key, which the phone never sends).
    const line = error.code === "22023" ? t("This phone couldn't be added. Remove a phone you no longer use and try again.") : describeLockError(error.code, error.message);
    return { ok: false, line, reauth: false, code: error.code };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, line: t("Couldn't add this phone. Try again."), reauth: false };
  // A wrong password or code: the server's own sentence.
  if (!row.registered) return { ok: false, line: row.message ? t(row.message) : t("Couldn't add this phone. Try again."), reauth: false };
  return { ok: true, message: t(row.message || "Device added.") };
}

/** Settings' "Remove" on this phone: off the server first, then the key on the phone. */
export async function removeThisPhone(deviceId: string): Promise<boolean> {
  const ok = await revokeKey(deviceId);
  if (ok) await biometrics.deleteKey();
  return ok;
}

const SIGN_OUT_WAIT_MS = 2000;

/**
 * Sign-out on the phone: this install's key comes off the server while the
 * session still allows it (the phone then deletes the key itself on
 * CentiumNative.signedOut()). Best effort and capped at two seconds: a member
 * who asked to sign out always ends up signed out.
 */
export async function revokeThisPhoneOnSignOut(): Promise<void> {
  if (!isNative()) return;
  const attempt = (async () => {
    if (!(await biometrics.hasKey())) return;
    const deviceId = await thisInstallId();
    if (deviceId) await revokeKey(deviceId);
  })().catch((e: unknown) => {
    console.error("[journal] Could not revoke this phone's key on sign-out:", e);
  });
  await Promise.race([attempt, new Promise<void>((resolve) => setTimeout(resolve, SIGN_OUT_WAIT_MS))]);
}
