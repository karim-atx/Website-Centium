import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typed } from "../../../lib/supabase/client";
import { useApp } from "../../context/AppContext";
import { businessNavKind, type BusinessNavKind } from "./navItems";

// v6 Business UI navbar per type (X-31, V6-54). The business type lives on
// business_profiles (profiles carries none), and "Wellness with appointments
// only" needs business_store_settings (B5). Both are newer than
// lib/supabase/database.types.ts (generated from production: no `studio`, no
// store settings), so the reads go through an untyped view of the client.
const db = typed as unknown as SupabaseClient;

const STORAGE_KEY = "centium-business-nav-kind:";
const memo = new Map<string, BusinessNavKind>();
const inflight = new Map<string, Promise<BusinessNavKind | null>>();

function readStored(uid: string): BusinessNavKind | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY + uid);
    return v === "classes" || v === "gym" || v === "store" || v === "appointments" || v === "unknown" ? v : null;
  } catch {
    return null;
  }
}

function writeStored(uid: string, kind: BusinessNavKind) {
  try {
    window.localStorage.setItem(STORAGE_KEY + uid, kind);
  } catch {
    /* private mode: the bar still renders from memory */
  }
}

async function load(uid: string): Promise<BusinessNavKind | null> {
  const { data, error } = await db
    .from("business_profiles")
    .select("id, business_type")
    .eq("profile_id", uid)
    .maybeSingle();
  if (error) return null;
  if (!data) return "unknown";
  const row = data as { id: string; business_type: string | null };
  let settings: { sells_products: boolean; offers_appointments: boolean } | null = null;
  if (row.business_type === "wellness_service") {
    const res = await db
      .from("business_store_settings")
      .select("sells_products, offers_appointments")
      .eq("business_id", row.id)
      .maybeSingle();
    // Not on the stack yet, or no row: an ordinary store bar.
    settings = res.error ? null : (res.data as typeof settings);
  }
  return businessNavKind(row.business_type, settings);
}

/**
 * The business bar's type: classes (studio), gym, store, appointments
 * (Wellness Service that offers appointments and sells nothing) or unknown.
 * Falls back to the onboarding answer on this device, then to the last
 * answer stored for this account, while the read is in flight.
 */
export function useBusinessNavKind(): BusinessNavKind {
  const { user, authUserId } = useApp();
  const isBusiness = user.accountType === "business";
  const uid = isBusiness ? authUserId : null;
  const fallback = businessNavKind(user.businessType ?? null, null);
  const [loaded, setLoaded] = useState<{ uid: string; kind: BusinessNavKind } | null>(null);
  const kind = uid ? (loaded?.uid === uid ? loaded.kind : memo.get(uid) ?? readStored(uid)) : null;

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    if (memo.has(uid)) return;
    let p = inflight.get(uid);
    if (!p) {
      p = load(uid).finally(() => inflight.delete(uid));
      inflight.set(uid, p);
    }
    p.then((k) => {
      if (!k) return;
      memo.set(uid, k);
      writeStored(uid, k);
      if (alive) setLoaded({ uid, kind: k });
    });
    return () => {
      alive = false;
    };
  }, [uid]);

  return kind && kind !== "unknown" ? kind : fallback !== "unknown" ? fallback : kind ?? "unknown";
}
