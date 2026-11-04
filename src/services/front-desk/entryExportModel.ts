import { toCsvText, type CsvValue } from "../../utils/csv";

// Round H (EU) · the entry system members export: every active member at the
// venue plus today's changes, as export_entry_members returns them, in the
// columns a door system's import needs. Headers stay English like every other
// Centium export (exportModel.ts). Cells go through utils/csv (formula guard).

/** One export_entry_members row (Round H). */
export interface EntryExportRow {
  membership_id: string;
  member_number: string | number | null;
  member_first_name: string | null;
  plan_name: string | null;
  starts_on: string | null;
  expires_on: string | null;
  external_id: string | null;
  enrolled: boolean | null;
  change: "new" | "renewal" | "ended" | null;
}

const CHANGE: Record<NonNullable<EntryExportRow["change"]>, string> = { new: "Add (new)", renewal: "Add (renewal)", ended: "Remove" };

export function entryExportRows(rows: EntryExportRow[]): CsvValue[][] {
  return [
    ["Member number", "First name", "Plan", "Starts", "Expires", "External ID", "Enrolled", "Today"],
    ...rows.map((r) => [
      r.member_number === null || r.member_number === undefined ? null : String(r.member_number),
      r.member_first_name?.trim() || null,
      r.plan_name?.trim() || null,
      r.starts_on?.slice(0, 10) ?? null,
      r.expires_on?.slice(0, 10) ?? null,
      r.external_id?.trim() || null,
      r.enrolled ? "Yes" : "No",
      r.change ? CHANGE[r.change] : null,
    ]),
  ];
}

/** "centium-entry-system-main-street-2026-11-04.csv": the venue as a slug (Latin letters and digits), then the day. */
export function entryExportFileName(venue: string, day: string): string {
  const slug = venue
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `centium-entry-system-${slug ? `${slug}-` : ""}${day}.csv`;
}

export const entryExportCsv = (rows: EntryExportRow[]): string => toCsvText(entryExportRows(rows), "\r\n");
