import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { Result } from "./index";
import { getLanguage } from "../../i18n/core";

// The six business notification families (Database B4, HANDOVER_API "## B4"
// "New switches"): app_preferences.notification_business_bookings / _members /
// _orders / _payments / _reviews / _team, each with its own UPDATE grant.
//
// READ BY FAMILY, NOT BY KIND: the server checks the family's switch for every
// business kind it sends, so one switch per family is all a person can
// choose. B4 itself sends none of them yet (the kinds arrive with B6 to B14);
// the switch is still the person's answer and is kept for when they do.
//
// Same write rule as services/preferences: update the caller's row, insert
// only when there is none (an upsert would name owner_id, which the UPDATE
// grant leaves out). No owner filter on the read: the policy is own-row only.

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- B4 columns, not in the production-generated types
const db = supabase as any;

export type BusinessFamily = "bookings" | "members" | "orders" | "payments" | "reviews" | "team";
export type BusinessFamilyPrefs = Record<BusinessFamily, boolean>;

export const BUSINESS_FAMILIES: BusinessFamily[] = ["bookings", "members", "orders", "payments", "reviews", "team"];
const column = (f: BusinessFamily) => `notification_business_${f}`;
const SELECT = BUSINESS_FAMILIES.map(column).join(", ");

/** The database default for every family (on), used only when the caller has no row yet. */
const DEFAULTS: BusinessFamilyPrefs = { bookings: true, members: true, orders: true, payments: true, reviews: true, team: true };

function toPrefs(row: Record<string, unknown> | null): BusinessFamilyPrefs | null {
  if (!row) return { ...DEFAULTS };
  const out = {} as BusinessFamilyPrefs;
  for (const f of BUSINESS_FAMILIES) {
    const v = row[column(f)];
    if (typeof v !== "boolean") return null;
    out[f] = v;
  }
  return out;
}

const failed = <T>(error: { code?: string; message?: string } | null, fallback: string): Result<T> => ({
  ok: false,
  code: error?.code,
  message: isOffline(error) ? OFFLINE_MESSAGE : fallback,
});

export async function fetchBusinessFamilies(): Promise<Result<BusinessFamilyPrefs>> {
  try {
    const { data, error } = await db.from("app_preferences").select(SELECT).maybeSingle();
    if (error) return failed(error, "Couldn't load this. Try again.");
    const prefs = toPrefs(data as Record<string, unknown> | null);
    return prefs ? { ok: true, value: prefs } : { ok: false, message: "Couldn't load this. Try again." };
  } catch (e) {
    return failed(e as { message?: string }, "Couldn't load this. Try again.");
  }
}

export async function setBusinessFamily(ownerId: string, family: BusinessFamily, on: boolean): Promise<Result<BusinessFamilyPrefs>> {
  const patch = { [column(family)]: on };
  const save = "Couldn't save that. Try again.";
  try {
    const updated = await db.from("app_preferences").update(patch).eq("owner_id", ownerId).select(SELECT);
    if (updated.error) return failed(updated.error, save);
    let row = (updated.data as Record<string, unknown>[] | null)?.[0] ?? null;
    if (!row) {
      const inserted = await db.from("app_preferences").insert({ owner_id: ownerId, language: getLanguage(), ...patch }).select(SELECT).single();
      if (inserted.error && inserted.error.code !== "23505") return failed(inserted.error, save);
      if (inserted.error) {
        // Another tab created the row first: update it.
        const retry = await db.from("app_preferences").update(patch).eq("owner_id", ownerId).select(SELECT);
        if (retry.error) return failed(retry.error, save);
        row = (retry.data as Record<string, unknown>[] | null)?.[0] ?? null;
      } else row = inserted.data as Record<string, unknown>;
    }
    const prefs = toPrefs(row);
    return prefs ? { ok: true, value: prefs } : { ok: false, message: save };
  } catch (e) {
    return failed(e as { message?: string }, save);
  }
}
