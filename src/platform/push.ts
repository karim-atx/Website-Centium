// Native push in the phone app: FCM on Android now, APNs on iOS with the same
// calls later (App-Centium ROUND_J.md §3; Database DB-Z3).
//
// The website's services/push branches here inside the app, so Settings, the
// reminder switches and the business settings keep one code path: Web Push in
// a browser, this in the app.
//
// REGISTERED ONLY ONCE THE PROFILE ROW EXISTS. push_devices references
// profiles(id), as app_session_installs does, so AppContext starts this from
// the same place as the install report. After that, on every launch while
// permission is granted (the Database's rule: the token and last_seen_at stay
// fresh), and again when the language changes (the row's locale).
//
// NEVER ASKS ON ITS OWN. The system prompt appears only from enable(), which
// the website calls after the person tapped "Turn on".
//
// The token is kept on this install (localStorage) so sign-out can remove its
// row while the session still allows it; the FCM token itself is left alive,
// as the browser subscription is on the web, and the next account to sign in
// registers the same token (the Database moves it to the caller).
import { App } from "@capacitor/app";
import { PushNotifications, type PermissionStatus } from "@capacitor/push-notifications";
import { supabase } from "../../lib/supabase/client";
import { getLanguage } from "../i18n/core";
import type { PushModule, PushPermission } from "./contracts";
import { featureAvailable } from "./features";
import { isNative, platform } from "./index";
import { CentiumNative } from "./native";
import type { ReceivedPush } from "./pushBannerModel";
import { serverPushToken } from "./pushTokenModel";

// Not in the generated types yet (Database DB-Z3 is newer than database.types.ts).
type Rpc = { rpc: (fn: string, args: object) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }> };
type From = {
  from: (table: string) => {
    select: (cols: string) => { eq: (col: string, v: string) => { limit: (n: number) => PromiseLike<{ data: unknown[] | null; error: unknown }> } };
  };
};
type KindFrom = {
  from: (table: string) => {
    select: (cols: string) => { eq: (col: string, v: string) => { maybeSingle: () => PromiseLike<{ data: { kind?: string } | null; error: unknown }> } };
  };
};
const rpc = (fn: string, args: object) => (supabase as unknown as Rpc).rpc(fn, args);

const TOKEN_KEY = "centium.pushToken";

let supported = false;
let cachedPermission: PushPermission | null = null;
let listening: Promise<void> | null = null;
let started = false;
const opened = new Set<(url: string) => void>();
const received = new Set<(push: ReceivedPush) => void>();
let waiting: ((token: string | null) => void) | null = null;
/** A tap that came while nothing listened (the app remounting): the next listener gets it. */
let unopened: string | null = null;

function toPermission(s: PermissionStatus): PushPermission {
  if (s.receive === "granted") return "granted";
  if (s.receive === "denied") return "denied";
  return "prompt";
}

function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * This install's token, or null (a browser, or never registered). "Sign out
 * of all devices" keeps this row while removing the account's others; the
 * ordinary sign-out then removes it (unregisterNativePush).
 */
export function thisInstallPushToken(): string | null {
  return storedToken();
}

function storeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Not kept: sign-out then can't remove this row, and the next sign-in's
    // registration moves the token to that account anyway.
  }
}

async function record(token: string): Promise<boolean> {
  const [{ id }, info] = await Promise.all([CentiumNative.installId(), App.getInfo()]);
  const { error } = await rpc("register_push_device", {
    p_platform: platform(),
    p_kind: "alert",
    p_token: token,
    // TestFlight, the App Store and Android are all production; only an iOS
    // Debug build is sandbox, which the iOS half will say.
    p_environment: "production",
    p_app_version: info.version,
    p_locale: getLanguage(),
    p_device_id: id,
  });
  if (error) {
    console.error("[push] Could not register this device:", error.code, error.message);
    return false;
  }
  storeToken(token);
  return true;
}

function listen(): Promise<void> {
  listening ??= (async () => {
    await PushNotifications.addListener("registration", ({ value: raw }) => {
      // As the server keeps it: lowercase on iOS (./pushTokenModel).
      const value = serverPushToken(platform(), raw);
      void record(value).then((ok) => {
        waiting?.(ok ? value : null);
        waiting = null;
      });
    });
    await PushNotifications.addListener("registrationError", (e) => {
      console.error("[push] Registration failed:", e.error);
      waiting?.(null);
      waiting = null;
    });
    // A tapped notification: its `url` (/app/calls/{id}, /app/messages?push=…,
    // a reminder's link) goes to NativeOpenPath, which follows only /app paths.
    await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
      const url = (notification.data as { url?: unknown } | undefined)?.url;
      if (typeof url === "string") openPushLink(url);
    });
    // A push while Centium is open: the phone shows nothing (no
    // presentationOptions), so PushBanner does (pushBannerModel.ts).
    await PushNotifications.addListener("pushNotificationReceived", (n) => {
      const push: ReceivedPush = { id: n.id, title: n.title, body: n.body, data: n.data as Record<string, unknown> | undefined };
      for (const l of received) l(push);
    });
  })();
  return listening;
}

/** Asks FCM for this install's token and records it; resolves the token, or null on failure. */
async function register(): Promise<string | null> {
  await listen();
  const token = new Promise<string | null>((resolve) => {
    waiting = resolve;
  });
  await PushNotifications.register();
  return token;
}

/**
 * At launch (main.tsx): whether this build has native push, and the current
 * permission, so the website's synchronous checks (pushSupported) can answer.
 */
export function primeNativePush(): void {
  if (!isNative()) return;
  void featureAvailable("push").then(async (a) => {
    supported = a.ok;
    if (!supported) return;
    cachedPermission = toPermission(await PushNotifications.checkPermissions());
    // Listening from launch, so a notification that cold-started the app is
    // followed even before the session settles.
    await listen();
  });
}

export function nativePushSupported(): boolean {
  return supported;
}

/** The last known permission, for the website's synchronous reads; "prompt" until known. */
export function nativePushPermission(): PushPermission {
  return cachedPermission ?? "prompt";
}

/**
 * After the profile row exists (AppContext). Registers this install for the
 * signed-in account when permission is already granted; never prompts.
 */
export function startNativePush(): void {
  if (!isNative() || started) return;
  started = true;
  void (async () => {
    const a = await featureAvailable("push");
    if (!a.ok) return;
    await listen();
    cachedPermission = toPermission(await PushNotifications.checkPermissions());
    if (cachedPermission === "granted") await register();
  })().catch((e: unknown) => console.error("[push]", e));
}

/** The language changed: the row's locale follows (the server writes push text in it). */
export function refreshNativePushLocale(): void {
  if (!started || cachedPermission !== "granted") return;
  const token = storedToken();
  if (token) void record(token);
}

/** Sign-out, while the session still allows it: this install's row goes. Best effort. */
export async function unregisterNativePush(): Promise<{ removed: boolean; error?: string }> {
  const token = storedToken();
  started = false;
  if (!token) return { removed: false };
  const { data, error } = await rpc("unregister_push_device", { p_token: token });
  if (error) return { removed: false, error: error.message };
  storeToken(null);
  return { removed: data === true };
}

/** Whether this install's token is registered to the signed-in account (its own push_devices row). */
export async function nativePushRegistered(): Promise<boolean | null> {
  const token = storedToken();
  if (!token) return false;
  const { data, error } = await (supabase as unknown as From)
    .from("push_devices")
    .select("id")
    // A token stored before the fix may be uppercase (./pushTokenModel).
    .eq("token", serverPushToken(platform(), token))
    .limit(1);
  if (error) return null;
  return (data?.length ?? 0) > 0;
}

/** A tapped notification's link, for NativeOpenPath. */
export function onPushOpen(listener: (url: string) => void): () => void {
  opened.add(listener);
  if (unopened !== null) {
    const url = unopened;
    unopened = null;
    listener(url);
  }
  return () => opened.delete(listener);
}

/** Opens a push's link as a tap on its notification does: a tapped notification, or PushBanner. */
export function openPushLink(url: string): void {
  if (opened.size === 0) unopened = url;
  else for (const l of opened) l(url);
}

/** Every push that arrives while Centium is open, for PushBanner. */
export function onPushReceived(listener: (push: ReceivedPush) => void): () => void {
  received.add(listener);
  return () => received.delete(listener);
}

/**
 * Recovery-sensitive mode: the neutral title and line "Hide details on lock
 * screen" gives this push's family ("Centium", "You have a reminder"), in the
 * app's language, from the server's own copy (push_neutral_text), so the two
 * never read differently. The family comes from the reminder's kind; a push
 * without one gets the general line. Null when it can't be read.
 */
export async function neutralPushText(notificationId: string | null): Promise<{ title: string; line: string } | null> {
  let family = "";
  if (notificationId) {
    const row = await (supabase as unknown as KindFrom)
      .from("reminder_sends")
      .select("kind")
      .eq("id", notificationId)
      .maybeSingle()
      .then((r) => r.data, () => null);
    if (row?.kind) {
      const { data, error } = await rpc("notification_family", { p_kind: row.kind });
      if (!error && typeof data === "string") family = data;
    }
  }
  const { data, error } = await rpc("push_neutral_text", { p_family: family, p_language: getLanguage() });
  const text = (Array.isArray(data) ? data[0] : data) as { title?: unknown; body?: unknown } | null;
  if (error || typeof text?.title !== "string" || typeof text.body !== "string") return null;
  return { title: text.title, line: text.body };
}

export const nativePush: PushModule = {
  async available() {
    return { ok: (await featureAvailable("push")).ok };
  },
  async permission() {
    cachedPermission = toPermission(await PushNotifications.checkPermissions());
    return cachedPermission;
  },
  /** The system prompt (Android 13+), then this install's registration. */
  async enable() {
    await listen();
    cachedPermission = toPermission(await PushNotifications.requestPermissions());
    if (cachedPermission === "granted") {
      started = true;
      await register();
    }
    return cachedPermission;
  },
  async openSettings() {
    await CentiumNative.openNotificationSettings();
  },
};
