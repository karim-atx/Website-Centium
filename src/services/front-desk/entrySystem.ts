import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { t } from "../../i18n/core";
import { consoleMessage } from "../venues/consoleLogic";
import type { Result } from "../venues";
import { entryCodeMessage, toEntrySystem, type EntrySystem } from "../venues/entrySystem";
import type { EntryExportRow } from "./entryExportModel";

export type { EntryExportRow };

// Round H (EU) · the front desk's "Entry system" tab and the members export
// (Database migration 20261226380000). A gym that keeps its own entry system
// enrols each new member in it and removes each ending one; Centium keeps the
// list of who to add and who to take off.
//
// Desk readers and marks: business_can(business, 'front_desk'), ATX03
// otherwise. They name only members who agreed to the sharing; the others are
// a count (awaiting_consent). While the venue's entry_system is 'none' the
// lists are empty and the marks answer ATXU5.
// The export: the owner, or an employee whose role is manager (ATXU2). It is
// called as a POST (supabase-js rpc's default) because it writes its log.
//
// THE PENDING RULE: a database without these functions (PGRST202 / 42883) or
// without gyms.entry_system (42703) reads as a venue with no own system, so
// nothing new shows until the Database's Round H is live.

type Rpc = <T>(fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: T | null; error: PostgrestError | null }>;
const rpc = (supabase as unknown as { rpc: (...a: unknown[]) => unknown }).rpc.bind(supabase) as unknown as Rpc;

const isMissing = (e: PostgrestError) => e.code === "PGRST202" || e.code === "42883" || e.code === "42703";

const fail = <T>(error: PostgrestError, fallback: string): Result<T> => ({
  ok: false,
  code: error.code,
  message: isOffline(error) ? OFFLINE_MESSAGE : entryCodeMessage(error.code) ?? consoleMessage(error.code, error.message, fallback),
});

// ---------------------------------------------------------------------------
// The venue's own system (gyms.entry_system, readable like the venue's other columns)

export interface VenueEntrySystem {
  system: EntrySystem;
  name: string | null;
}

export async function fetchVenueEntrySystem(gymId: string): Promise<Result<VenueEntrySystem>> {
  type Loose = { from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { maybeSingle: () => PromiseLike<{ data: Record<string, unknown> | null; error: PostgrestError | null }> } } } };
  const { data: got, error } = await (supabase as unknown as Loose).from("gyms").select("id, entry_system, entry_system_name").eq("id", gymId).maybeSingle();
  // One row; an array (a stub or proxy answering a list) is read by id.
  const data = Array.isArray(got) ? ((got as Record<string, unknown>[]).find((r) => r.id === gymId) ?? null) : got;
  if (error) {
    if (isMissing(error)) return { ok: true, value: { system: "none", name: null } };
    return fail(error, t("Couldn't load this venue's entry system."));
  }
  return { ok: true, value: { system: toEntrySystem(data?.entry_system), name: (data?.entry_system_name as string | null) ?? null } };
}

// ---------------------------------------------------------------------------
// The two lists and their counts

export interface EntrySummary {
  toEnrol: number;
  ending: number;
  awaitingConsent: number;
}

export interface ToEnrolRow {
  membership_id: string;
  member_id: string;
  member_number: string | number | null;
  member_first_name: string | null;
  plan_name: string | null;
  starts_on: string | null;
  expires_on: string | null;
  kind: "new" | "renewal";
  granted: boolean | null;
  previous_external_id: string | null;
}

export interface ToEnrol {
  membershipId: string;
  memberId: string;
  memberNumber: string | null;
  firstName: string;
  planName: string | null;
  startsOn: string | null;
  expiresOn: string | null;
  kind: "new" | "renewal";
  granted: boolean;
  previousExternalId: string | null;
}

export interface EndingRow {
  membership_id: string;
  member_id: string;
  member_number: string | number | null;
  member_first_name: string | null;
  plan_name: string | null;
  ended_on: string | null;
  reason: "expired" | "cancelled" | "consent_withdrawn";
  external_id: string | null;
}

export interface Ending {
  membershipId: string;
  memberId: string;
  memberNumber: string | null;
  firstName: string;
  planName: string | null;
  endedOn: string | null;
  reason: "expired" | "cancelled" | "consent_withdrawn";
  externalId: string | null;
}

const numberOf = (v: string | number | null | undefined): string | null => (v === null || v === undefined || v === "" ? null : String(v));
const nameOf = (v: string | null | undefined): string => v?.trim() || t("Member");

export const toToEnrol = (r: ToEnrolRow): ToEnrol => ({
  membershipId: r.membership_id,
  memberId: r.member_id,
  memberNumber: numberOf(r.member_number),
  firstName: nameOf(r.member_first_name),
  planName: r.plan_name?.trim() || null,
  startsOn: r.starts_on,
  expiresOn: r.expires_on,
  kind: r.kind === "renewal" ? "renewal" : "new",
  granted: r.granted === true,
  previousExternalId: r.previous_external_id?.trim() || null,
});

export const toEnding = (r: EndingRow): Ending => ({
  membershipId: r.membership_id,
  memberId: r.member_id,
  memberNumber: numberOf(r.member_number),
  firstName: nameOf(r.member_first_name),
  planName: r.plan_name?.trim() || null,
  endedOn: r.ended_on,
  reason: r.reason === "cancelled" || r.reason === "consent_withdrawn" ? r.reason : "expired",
  externalId: r.external_id?.trim() || null,
});

export interface EntryLists {
  summary: EntrySummary;
  toEnrol: ToEnrol[];
  ending: Ending[];
}

export async function fetchEntryLists(gymId: string): Promise<Result<EntryLists>> {
  const [s, a, b] = await Promise.all([
    rpc<{ to_enrol: number; ending: number; awaiting_consent: number }[] | { to_enrol: number; ending: number; awaiting_consent: number }>("desk_entry_summary", { p_gym_id: gymId }),
    rpc<ToEnrolRow[]>("desk_entry_to_enrol", { p_gym_id: gymId }),
    rpc<EndingRow[]>("desk_entry_ending", { p_gym_id: gymId }),
  ]);
  const error = s.error ?? a.error ?? b.error;
  if (error) {
    console.error("[entry system] Could not read the lists:", error.message);
    return fail(error, t("Couldn't load the entry system lists."));
  }
  const row = Array.isArray(s.data) ? s.data[0] : s.data;
  return {
    ok: true,
    value: {
      summary: { toEnrol: Number(row?.to_enrol ?? 0), ending: Number(row?.ending ?? 0), awaitingConsent: Number(row?.awaiting_consent ?? 0) },
      toEnrol: (a.data ?? []).map(toToEnrol),
      ending: (b.data ?? []).map(toEnding),
    },
  };
}

// ---------------------------------------------------------------------------
// Enrolled members (desk_entry_enrolled, STABLE, front_desk): current, paid,
// agreed, enrolled and not removed; the place to change an ID (a lost card).
// p_search matches the first name or the external ID (contains, any case) or
// the member number (digits or #digits); p_limit is clamped to 1–200.

export interface EnrolledRow {
  membership_id: string;
  member_id: string;
  member_number: string | number | null;
  member_first_name: string | null;
  plan_name: string | null;
  starts_on: string | null;
  expires_on: string | null;
  external_id: string | null;
  enrolled_at: string | null;
  total_count: number | string | null;
}

export interface Enrolled {
  membershipId: string;
  memberNumber: string | null;
  firstName: string;
  planName: string | null;
  startsOn: string | null;
  expiresOn: string | null;
  externalId: string | null;
  enrolledAt: string | null;
}

export async function fetchEnrolled(gymId: string, search: string, limit = 50, offset = 0): Promise<Result<{ rows: Enrolled[]; total: number }>> {
  const q = search.trim();
  const { data, error } = await rpc<EnrolledRow[]>("desk_entry_enrolled", { p_gym_id: gymId, p_search: q || null, p_limit: limit, p_offset: offset });
  if (error) {
    if (isMissing(error)) return { ok: true, value: { rows: [], total: 0 } };
    console.error("[entry system] Could not read the enrolled members:", error.message);
    return fail(error, t("Couldn't load the enrolled members."));
  }
  const rows = data ?? [];
  return {
    ok: true,
    value: {
      total: Number(rows[0]?.total_count ?? rows.length),
      rows: rows.map((r) => ({
        membershipId: r.membership_id,
        memberNumber: numberOf(r.member_number),
        firstName: nameOf(r.member_first_name),
        planName: r.plan_name?.trim() || null,
        startsOn: r.starts_on,
        expiresOn: r.expires_on,
        externalId: r.external_id?.trim() || null,
        enrolledAt: r.enrolled_at,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// The marks (and their undo, within 10 minutes: ATXU6 after that)

async function write(fn: string, args: Record<string, unknown>, fallback: string): Promise<Result<null>> {
  const { error } = await rpc<unknown>(fn, args);
  if (error) {
    console.error(`[entry system] ${fn} failed:`, error.message);
    return fail(error, fallback);
  }
  return { ok: true, value: null };
}

export const markEntryEnrolled = (membershipId: string, externalId: string | null) =>
  write("mark_entry_enrolled", { p_membership_id: membershipId, p_external_id: externalId }, t("Couldn't mark them enrolled. Try again."));

export const setEntryExternalId = (membershipId: string, externalId: string | null) =>
  write("set_entry_external_id", { p_membership_id: membershipId, p_external_id: externalId }, t("Couldn't save the ID. Try again."));

export const markEntryRemoved = (membershipId: string) =>
  write("mark_entry_removed", { p_membership_id: membershipId }, t("Couldn't mark them removed. Try again."));

export const undoMarkEntryEnrolled = (membershipId: string) =>
  write("undo_mark_entry_enrolled", { p_membership_id: membershipId }, t("Couldn't undo. Try again."));

/** Mark removed clears the ID, so the undo passes back the one that was on screen. */
export const undoMarkEntryRemoved = (membershipId: string, externalId: string | null) =>
  write("undo_mark_entry_removed", { p_membership_id: membershipId, p_external_id: externalId }, t("Couldn't undo. Try again."));

// ---------------------------------------------------------------------------
// The export (the owner or a manager) and its log


export async function exportEntryMembers(gymId: string): Promise<Result<EntryExportRow[]>> {
  const { data, error } = await rpc<EntryExportRow[]>("export_entry_members", { p_gym_id: gymId });
  if (error) {
    console.error("[entry system] Could not export:", error.message);
    return fail(error, t("Couldn't export the members list. Try again."));
  }
  return { ok: true, value: data ?? [] };
}

export interface EntryExportLog {
  exportId: string;
  exportedAt: string;
  exportedBy: string | null;
  /** entry_exports.exported_by_first_name; null when unknown. */
  exportedByName: string | null;
  rowCount: number;
}

export async function fetchEntryExports(gymId: string, limit = 50): Promise<Result<EntryExportLog[]>> {
  const { data, error } = await rpc<{ export_id: string; exported_at: string; exported_by: string | null; exported_by_first_name?: string | null; row_count: number }[]>("entry_exports", { p_gym_id: gymId, p_limit: limit });
  if (error) {
    if (isMissing(error)) return { ok: true, value: [] };
    return fail(error, t("Couldn't load the export history."));
  }
  return {
    ok: true,
    value: (data ?? []).map((r) => ({ exportId: r.export_id, exportedAt: r.exported_at, exportedBy: r.exported_by, exportedByName: r.exported_by_first_name?.trim() || null, rowCount: Number(r.row_count ?? 0) })),
  };
}
