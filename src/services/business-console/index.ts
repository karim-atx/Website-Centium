import { supabase } from "../../../lib/supabase/client";
import { buildAccess, NO_ACCESS, type ConsoleAccess, type EmploymentRow, type OwnedRow } from "./access";

export * from "./access";

// The business the console is about, for the owner AND for staff (B7).
//
// Before B7 every console read found "my business" as the business_profiles
// row whose profile_id is this account, so an employee opened the console and
// saw an empty business. Now: the owned business if there is one, else the
// accepted employment (with at least one permission) the person last opened
// from Your businesses, else their first such employment.
//
// TWO READS, BOTH ALREADY ALLOWED: business_profiles by profile_id (own row),
// and the caller's own business_employees rows (business_employees_select_
// professional; `permissions` and `role` carry SELECT grants). The employer's
// name comes from business_profiles, which an insider may read even while the
// business is hidden (business_profiles_select_public: active OR insider).
//
// Cached per account for the session and dropped on CONSOLE_ACCESS_CHANGED
// (choosing another business, accepting or leaving a team, sign-out).

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- B6 columns, newer than the production-generated types
const db = supabase as any;

export const CONSOLE_ACCESS_CHANGED = "centium:console-access-changed";
const CHOSEN_KEY = (uid: string) => `centium.consoleBusiness:${uid}`;

const readChosen = (uid: string): string | null => {
  try {
    return localStorage.getItem(CHOSEN_KEY(uid));
  } catch {
    return null;
  }
};

const cache = new Map<string, Promise<{ ok: true; value: ConsoleAccess } | { ok: false }>>();

async function load(uid: string): Promise<{ ok: true; value: ConsoleAccess } | { ok: false }> {
  const [own, emp] = await Promise.all([
    db.from("business_profiles").select("id, business_name, business_type").eq("profile_id", uid).maybeSingle(),
    db.from("business_employees").select("business_id, permissions, accepted_at, role").eq("professional_id", uid),
  ]);
  if (own.error) {
    console.error("[business-console] Could not read the owned business:", own.error.message);
    return { ok: false };
  }
  // A failed employment read must not take an owner's console down with it.
  const employments = (emp.error ? [] : (emp.data ?? [])) as EmploymentRow[];
  if (emp.error) console.error("[business-console] Could not read employments:", emp.error.message);
  const ids = [...new Set(employments.filter((e) => e.accepted_at).map((e) => e.business_id))];
  const names = new Map<string, { name: string; type: string | null }>();
  if (ids.length) {
    const n = await db.from("business_profiles").select("id, business_name, business_type").in("id", ids);
    for (const r of (n.data ?? []) as OwnedRow[]) names.set(r.id, { name: r.business_name?.trim() || "A business", type: r.business_type ?? null });
  }
  return { ok: true, value: buildAccess((own.data as OwnedRow | null) ?? null, employments, names, readChosen(uid)) };
}

/** The console seats for this account (cached; see the header). */
export function loadConsoleAccess(uid: string | null | undefined): Promise<{ ok: true; value: ConsoleAccess } | { ok: false }> {
  if (!uid) return Promise.resolve({ ok: true, value: NO_ACCESS });
  let p = cache.get(uid);
  if (!p) {
    p = load(uid).then((r) => {
      // A failure is retried next time, not remembered; so is "no business
      // yet", because the owner's first save creates the row mid-session.
      if (!r.ok || !r.value.current) cache.delete(uid);
      return r;
    });
    cache.set(uid, p);
  }
  return p;
}

/** Forget the cached answer (and tell every mounted console hook to read again). */
export function invalidateConsoleAccess(): void {
  cache.clear();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CONSOLE_ACCESS_CHANGED));
}

/** Open the console for one of this account's staff seats (remembered on this device). */
export function chooseConsoleBusiness(uid: string, businessId: string): void {
  try {
    localStorage.setItem(CHOSEN_KEY(uid), businessId);
  } catch {
    /* the choice holds for this session only */
  }
  invalidateConsoleAccess();
}
