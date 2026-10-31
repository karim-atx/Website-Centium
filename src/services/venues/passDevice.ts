// Round F2 · AB5 (Karim F23): this device's secret for the 30-second pass
// code (Database 20261226070000; the code itself is ./passCode, pure).
//
// - issue_pass_device_secret(p_membership_id, p_device_label) → device_id,
//   secret (hex, shown ONCE), period_seconds 30, digits 6. One active secret
//   per device label (issuing again for the label revokes the previous one),
//   10 an hour (ATX02).
// - my_pass_devices(p_membership_id) lists the devices; revoke_pass_device(
//   p_device_id) stops one (10 an hour). rotate_gym_pass_token ("Get a new
//   pass code") revokes every secret of the membership, so the pass issues a
//   fresh one after.
//
// KEPT LIKE THE OFFLINE PASS (./passCache, V6-30): on this device only, per
// account (the key carries the user id) and per membership, under
// "centium-state", which sign-out clears with the rest of the account's
// local cache. The secret has no 24-hour age of its own: the server revokes
// it, and the offline pass it draws on is itself at most 24 hours old.
// Online, the pass checks the secret is still active (my_pass_devices) and
// issues a new one when it was revoked elsewhere. No secret (offline the first
// time, rate-limited): the pass shows the static pass_token, which still works
// (phase one of its retirement).

import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE, rateLimitMessage } from "../network-error";
import { t } from "../../i18n/core";
import { deviceLabelFrom } from "./passCode";

export interface PassSecret {
  deviceId: string;
  /** Hex, as issued; ./passCode decodes it to the raw bytes the server keys with. */
  secret: string;
  label: string;
}

export interface PassDevice {
  deviceId: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export type DeviceResult<T> = { ok: true; value: T } | { ok: false; message: string; code?: string };

const PREFIX = "centium-state:pass-device:";
/** Tells two browsers with the same name apart; not account data, so it outlives sign-out. */
const TAG_KEY = "centium-pass-device-tag";

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}
function store(): KV | null {
  try {
    return (globalThis as { window?: { localStorage?: KV } }).window?.localStorage ?? null;
  } catch {
    return null;
  }
}

function readAll(userId: string): Record<string, PassSecret> {
  try {
    const v = JSON.parse(store()?.getItem(PREFIX + userId) ?? "null") as Record<string, PassSecret> | null;
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
function writeAll(userId: string, all: Record<string, PassSecret>): void {
  const s = store();
  if (!s) return;
  try {
    if (Object.keys(all).length === 0) s.removeItem(PREFIX + userId);
    else s.setItem(PREFIX + userId, JSON.stringify(all));
  } catch {
    /* quota or private mode: the pass falls back to the static code */
  }
}

/** The stored secret for a membership on this device, or null. */
export function storedPassSecret(userId: string, membershipId: string): PassSecret | null {
  const v = readAll(userId)[membershipId];
  return v && typeof v.deviceId === "string" && typeof v.secret === "string" ? v : null;
}

/** Drops this device's secret for a membership (revoked, rotated). */
export function forgetPassSecret(userId: string, membershipId: string): void {
  const all = readAll(userId);
  if (!(membershipId in all)) return;
  delete all[membershipId];
  writeAll(userId, all);
}

/** This browser's label for the device list ("Chrome on Windows · 4F2A"). */
export function thisDeviceLabel(): string {
  const s = store();
  let tag = "";
  try {
    tag = s?.getItem(TAG_KEY) ?? "";
    if (!/^[0-9A-F]{4}$/.test(tag)) {
      tag = Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, "0");
      s?.setItem(TAG_KEY, tag);
    }
  } catch {
    tag = "";
  }
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return deviceLabelFrom(ua, tag);
}

type Rpc = <T>(fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: T | null; error: PostgrestError | null }>;
const rpc = (supabase as unknown as { rpc: (...a: unknown[]) => unknown }).rpc.bind(supabase) as unknown as Rpc;

function fail<T>(error: PostgrestError, fallback: string): DeviceResult<T> {
  console.error("[pass device]", error.code, error.message);
  if (isOffline(error)) return { ok: false, code: error.code, message: t(OFFLINE_MESSAGE) };
  if (error.code === "ATX02") return { ok: false, code: error.code, message: rateLimitMessage(error.message) };
  if (error.code === "ATX08") return { ok: false, code: error.code, message: t("That device couldn't be found. Reload and try again.") };
  if (error.code === "ATX84") return { ok: false, code: error.code, message: t("That membership couldn't be found.") };
  return { ok: false, code: error.code, message: fallback };
}

type DeviceRow = { device_id: string; device_label: string; created_at: string; last_used_at: string | null; revoked_at: string | null };

/** my_pass_devices(p_membership_id): the devices holding a secret, active first. */
export async function fetchPassDevices(membershipId: string): Promise<DeviceResult<PassDevice[]>> {
  const { data, error } = await rpc<DeviceRow[]>("my_pass_devices", { p_membership_id: membershipId });
  if (error) return fail(error, t("Couldn't load your devices. Try again."));
  return {
    ok: true,
    value: (data ?? []).map((r) => ({ deviceId: r.device_id, label: r.device_label, createdAt: r.created_at, lastUsedAt: r.last_used_at, revokedAt: r.revoked_at })),
  };
}

/** revoke_pass_device(p_device_id): that device's code stops working at the desk. */
export async function revokePassDevice(deviceId: string): Promise<DeviceResult<true>> {
  const { error } = await rpc<null>("revoke_pass_device", { p_device_id: deviceId });
  if (error) return fail(error, t("Couldn't remove that device. Try again."));
  return { ok: true, value: true };
}

async function issue(userId: string, membershipId: string): Promise<PassSecret | null> {
  const label = thisDeviceLabel();
  type Row = { device_id: string; secret: string };
  const { data, error } = await rpc<Row[] | Row>("issue_pass_device_secret", { p_membership_id: membershipId, p_device_label: label });
  if (error) {
    console.error("[pass device] Could not issue a secret:", error.code, error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.device_id || !row.secret) return null;
  const v: PassSecret = { deviceId: row.device_id, secret: row.secret, label };
  writeAll(userId, { ...readAll(userId), [membershipId]: v });
  return v;
}

/**
 * The secret this device draws the pass with, or null (the static code then).
 * Offline: whatever is stored. Online: the stored one while my_pass_devices
 * still lists it active; otherwise (none, or revoked elsewhere) a new one is
 * issued. A failed check keeps the stored one.
 */
export function ensurePassSecret(userId: string, membershipId: string, online: boolean): Promise<PassSecret | null> {
  // One check at a time per membership: two opens issuing at once would
  // revoke each other (one active secret per device label).
  const key = `${userId}|${membershipId}|${online}`;
  const running = inFlight.get(key);
  if (running) return running;
  const p = ensure(userId, membershipId, online).finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}
const inFlight = new Map<string, Promise<PassSecret | null>>();

async function ensure(userId: string, membershipId: string, online: boolean): Promise<PassSecret | null> {
  const stored = storedPassSecret(userId, membershipId);
  if (!online) return stored;
  if (stored) {
    const list = await fetchPassDevices(membershipId);
    if (!list.ok) return stored;
    const mine = list.value.find((d) => d.deviceId === stored.deviceId);
    if (mine && !mine.revokedAt) return stored;
    forgetPassSecret(userId, membershipId);
  }
  return issue(userId, membershipId);
}
