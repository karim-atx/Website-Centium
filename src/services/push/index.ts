import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Registering this browser to receive Web Push, and unregistering it again.
 *
 * WHERE THE SUBSCRIPTION IS MADE, and it is not where people expect. The
 * subscribe call belongs to the PAGE, not to src/sw.ts. A service worker
 * cannot subscribe itself: `pushManager` hangs off the registration, the page
 * gets that registration from `navigator.serviceWorker.ready`, and the whole
 * exchange needs the VAPID public key, which lives in the page's bundle. So
 * the worker is untouched by this file — it already has the `push` and
 * `notificationclick` handlers, and those are all it ever needs.
 *
 * WHY NOT `.upsert()`, decided from the grant rather than from taste.
 * push_subscriptions grants INSERT on (owner_id, endpoint, p256dh, auth) but
 * UPDATE on (p256dh, auth) ALONE. PostgREST's upsert compiles to
 * `ON CONFLICT DO UPDATE SET` over every column in the payload, and privileges
 * are checked at PLAN time, so an upsert carrying owner_id and endpoint is
 * refused with 42501 even on the insert path where that branch never runs.
 * This is the same trap app_preferences hit, and it was measured there rather
 * than reasoned about. Insert first, fall back to update.
 *
 * THE ENDPOINT IS GLOBALLY UNIQUE, NOT UNIQUE PER USER, which is the whole
 * reason this file is more than one statement. Two accounts used from one
 * browser share one endpoint, so the second account's insert hits 23505 on a
 * row it cannot see and cannot update. That case is reported, never swallowed
 * — and it is what signing out resolves, by deleting the row it owns.
 */

export type SubscribeResult =
  | { status: "ok"; endpoint: string; created: boolean }
  | { status: "unsupported"; message: string }
  | { status: "denied"; message: string }
  | { status: "claimed"; message: string }
  | { status: "error"; message: string };

export type UnsubscribeResult =
  | { status: "ok"; removed: boolean }
  | { status: "error"; message: string };

function describe(error: PostgrestError): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  const code = error.code ?? "";
  if (code === "PGRST301" || code === "42501") {
    return "Your session expired. Sign in again to enable notifications.";
  }
  return "Couldn't turn on notifications. Try again.";
}

/**
 * The VAPID application server key, as `subscribe()` wants it.
 *
 * base64url -> raw bytes. The key is distributed as base64url (`-` and `_`
 * rather than `+` and `/`, and no padding), while `applicationServerKey` takes
 * a BufferSource, so the translation has to happen somewhere. Padding is
 * restored first because `atob` rejects a length that is not a multiple of 4.
 *
 * A P-256 public key is 65 bytes — a 0x04 marker plus two 32-byte coordinates
 * — and anything else means the environment variable holds something that is
 * not a VAPID key. Checking is worth it: an undersized key makes `subscribe()`
 * reject with a message that names neither the key nor the variable.
 */
function vapidKeyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = base64url.padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), "=");
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  // Backed by an explicit ArrayBuffer rather than `new Uint8Array(length)`:
  // that overload widens to Uint8Array<ArrayBufferLike>, which includes
  // SharedArrayBuffer and so is not assignable to BufferSource.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (bytes.length !== 65 || bytes[0] !== 0x04) {
    throw new Error(`VITE_VAPID_PUBLIC_KEY is not a P-256 public key (${bytes.length} bytes)`);
  }
  return bytes;
}

/** The browser's keys, base64-encoded the way the sender will need them. */
function encodeKey(buffer: ArrayBuffer | null): string | null {
  if (!buffer) return null;
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Whether this browser can receive Web Push at all.
 *
 * FEATURE DETECTION, NEVER PLATFORM DETECTION. `detectPlatform()` in
 * IntegrationsCard answers this shape of question with
 * `/android/i.test(userAgent) ? "android" : "ios"` — every desktop browser is
 * "ios" to it. That is fine for choosing between two integration logos and
 * wrong here, where the question is whether three specific APIs exist. A
 * user-agent test would tell a Chrome-on-Windows user to add the app to their
 * Home Screen.
 *
 * ALL THREE ARE REQUIRED, AND THE THIRD IS THE ONE THAT IS EASY TO MISS.
 * `Notification` is what actually displays the thing; iOS shipped
 * `serviceWorker` years before a web app there could show a notification, so
 * checking only the first two reports success on exactly the platform most
 * likely to fail. Settings used to carry this test privately, one clause
 * stricter than the copy in here — they are one function now, and it is the
 * strict one.
 */
export function pushSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Notification.permission's three states, as a boolean with an undecided. */
export function permissionTriState(p: NotificationPermission): boolean | null {
  if (p === "granted") return true;
  if (p === "denied") return false;
  return null;
}

export type EnableResult =
  | { status: "ok"; endpoint: string; created: boolean }
  | { status: "unsupported"; message: string }
  | { status: "denied"; message: string }
  | { status: "dismissed"; message: string }
  | { status: "claimed"; message: string }
  | { status: "error"; message: string };

/**
 * Asks the OS, then registers this browser — the whole flow, in one place.
 *
 * TWO STEPS, AND THEY FAIL DIFFERENTLY, which is why this returns a status
 * rather than a boolean. Permission is the browser's answer about
 * notifications; the subscription is a row in push_subscriptions that lets the
 * server address this specific browser. Granting the first and failing the
 * second leaves somebody who has seen "Granted" and will never be rung, so the
 * subscribe failure keeps its own outcome instead of being folded into the
 * permission state — which would either lie, or show "Denied" for something
 * the user did allow.
 *
 * SUBSCRIBE ONLY AFTER "granted". subscribeToPush() says the same thing from
 * the other side: subscribe() with userVisibleOnly raises the prompt itself on
 * an undecided permission, from a service layer, with nothing on screen
 * explaining it.
 *
 * MUST BE CALLED FROM A USER GESTURE. Some engines reject rather than resolve
 * when requestPermission() is called outside one, which is the "dismissed"
 * branch below rather than a thrown error the caller has to catch.
 */
export async function enablePush(ownerId: string | null): Promise<EnableResult> {
  if (!pushSupported()) {
    return { status: "unsupported", message: "This browser can't receive notifications." };
  }

  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    return {
      status: "dismissed",
      message: "Couldn't ask for notification permission here. Try from Settings.",
    };
  }

  if (permission !== "granted") {
    return { status: "denied", message: "Notifications are blocked for Centium." };
  }
  if (!ownerId) {
    return { status: "error", message: "Sign in to receive notifications on this device." };
  }
  return subscribeToPush(ownerId);
}

/**
 * Subscribes this browser and records the result against the caller's account.
 *
 * PERMISSION IS ASSUMED GRANTED, NOT REQUESTED HERE. Settings asks first and
 * only calls this once the answer is "granted", because `subscribe()` with
 * `userVisibleOnly` will itself prompt otherwise — and a prompt raised from a
 * service layer, with no row on screen explaining it, is the kind of thing
 * browsers penalise an origin for.
 *
 * REUSES AN EXISTING SUBSCRIPTION. `subscribe()` returns the browser's current
 * subscription when one already exists with the same application server key,
 * so calling this twice is not an error and does not rotate the endpoint. The
 * database write below is what has to cope with that, not this call.
 */
export async function subscribeToPush(ownerId: string): Promise<SubscribeResult> {
  if (!pushSupported()) {
    return { status: "unsupported", message: "This browser can't receive notifications." };
  }
  if (Notification.permission !== "granted") {
    return { status: "denied", message: "Notifications are blocked for Centium." };
  }

  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapid) {
    console.error("[push] VITE_VAPID_PUBLIC_KEY is not set; cannot subscribe.");
    return { status: "error", message: "Notifications aren't configured yet." };
  }

  let endpoint: string;
  let p256dh: string | null;
  let auth: string | null;
  try {
    // `ready` rather than `getRegistration()`: it resolves only once a worker
    // is active, which is exactly the precondition pushManager needs. A page
    // that subscribed against an installing worker would fail intermittently
    // and only on a first visit.
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      // Required by Chrome, and honest: every push this app sends shows a
      // notification. src/sw.ts guarantees it by always calling
      // showNotification, including for a payload it could not parse.
      userVisibleOnly: true,
      applicationServerKey: vapidKeyBytes(vapid),
    });

    endpoint = subscription.endpoint;
    p256dh = encodeKey(subscription.getKey("p256dh"));
    auth = encodeKey(subscription.getKey("auth"));
  } catch (e) {
    console.error("[push] subscribe() failed:", e);
    // NotAllowedError is the browser refusing despite Notification.permission
    // reading "granted" — it happens where push is disabled separately from
    // notifications, so the two are not the same answer.
    const name = (e as { name?: string })?.name;
    if (name === "NotAllowedError") {
      return { status: "denied", message: "This browser blocked push for Centium." };
    }
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Couldn't register for notifications.",
    };
  }

  if (!p256dh || !auth) {
    // Both columns are NOT NULL with non-blank CHECKs, so there is nothing
    // worth sending without them.
    console.error("[push] Subscription carried no keys; refusing to record it.");
    return { status: "error", message: "Couldn't register for notifications." };
  }

  return recordSubscription(ownerId, endpoint, p256dh, auth);
}

/**
 * Writes the subscription to push_subscriptions, insert first.
 *
 * THREE OUTCOMES, AND THE THIRD IS THE ONE WORTH NAMING. A clean insert is the
 * first subscription from this browser. A 23505 followed by an update that
 * matches a row is the SAME account re-subscribing — the browser rotated its
 * keys after a data clear, which is precisely what the (p256dh, auth) update
 * grant exists for. A 23505 followed by an update matching NOTHING means the
 * endpoint belongs to a different account: RLS hides their row from the select
 * and the update alike, so zero rows is the only signal there is.
 *
 * WHY ZERO ROWS IS ENOUGH TO CONCLUDE OWNERSHIP. The update is filtered on the
 * endpoint alone, with no owner_id clause — push_subscriptions_update_own
 * supplies that, so a row that matches is the caller's own by construction.
 * Adding `.eq("owner_id", ownerId)` would restate the policy rather than
 * narrow it, the same reasoning fetchHideReadReceipts records.
 *
 * ONE FALSE POSITIVE, STATED RATHER THAN HIDDEN: if the other account's row is
 * deleted between the failed insert and the update — they signed out in
 * another tab at that instant — this reports a conflict for an endpoint that is
 * now free. The next attempt inserts cleanly, so it self-heals, and spending a
 * retry loop on a race this narrow buys less than it costs to reason about.
 */
async function recordSubscription(
  ownerId: string,
  endpoint: string,
  p256dh: string,
  auth: string
): Promise<SubscribeResult> {
  try {
    const inserted = await supabase
      .from("push_subscriptions")
      .insert({ owner_id: ownerId, endpoint, p256dh, auth })
      .select("endpoint")
      .single();

    if (!inserted.error) return { status: "ok", endpoint, created: true };

    if (inserted.error.code !== "23505") {
      console.error("[push] Could not store subscription:", inserted.error.code, inserted.error.message);
      return { status: "error", message: describe(inserted.error) };
    }

    const updated = await supabase
      .from("push_subscriptions")
      .update({ p256dh, auth })
      .eq("endpoint", endpoint)
      .select("endpoint");

    if (updated.error) {
      console.error("[push] Could not refresh subscription:", updated.error.code, updated.error.message);
      return { status: "error", message: describe(updated.error) };
    }
    if (updated.data && updated.data.length > 0) {
      return { status: "ok", endpoint, created: false };
    }

    console.error("[push] Endpoint is claimed by another account; not overwriting.");
    return {
      status: "claimed",
      message:
        "Another Centium account on this browser still has notifications on. Sign that account out first.",
    };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Couldn't save your notification settings.",
    };
  }
}

/**
 * Removes this browser's subscription row. Called on the way out of a session.
 *
 * THIS IS THE RESOLUTION TO THE ENDPOINT COLLISION, not housekeeping. The
 * endpoint is unique across the whole table, so while this row exists no other
 * account on this browser can register for notifications — they cannot insert
 * over it and RLS will not let them update it. Deleting it on sign-out is what
 * hands the endpoint back.
 *
 * THE BROWSER SUBSCRIPTION IS DELIBERATELY LEFT ALIVE. Calling
 * `subscription.unsubscribe()` would make the browser mint a fresh endpoint
 * next time, which costs a round trip and gains nothing: with the row gone,
 * nothing can address this browser anyway, and the next account to sign in
 * subscribes to the same endpoint and inserts cleanly.
 *
 * READS THE ENDPOINT, NEVER RE-SUBSCRIBES TO FIND IT. `getSubscription()`
 * returns what already exists or null. Subscribing here to learn the endpoint
 * would create a subscription on the way out of a session, which is the
 * opposite of the point.
 *
 * MUST RUN WHILE THE SESSION IS STILL VALID — the DELETE policy is own-row, so
 * after signOut() the row is unreachable and would be left behind forever.
 */
export async function unsubscribeFromPush(): Promise<UnsubscribeResult> {
  if (!pushSupported()) return { status: "ok", removed: false };

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return { status: "ok", removed: false };

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return { status: "ok", removed: false };

    // No owner_id filter: push_subscriptions_delete_own already scopes this to
    // the caller's own row, so someone else's row at this endpoint is not
    // deleted — it is simply not matched.
    const { data, error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", subscription.endpoint)
      .select("endpoint");

    if (error) {
      console.error("[push] Could not remove subscription:", error.code, error.message);
      return { status: "error", message: describe(error) };
    }
    return { status: "ok", removed: (data?.length ?? 0) > 0 };
  } catch (e) {
    console.error("[push] Unsubscribe failed:", e);
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Couldn't remove this device.",
    };
  }
}
