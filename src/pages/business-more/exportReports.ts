import { fetchAllTransactions } from "../../services/business-revenue";
import { fetchLocations } from "../../services/business-more";
import { fetchVenueMembers } from "../../services/venues/console";
import type { VenueMember } from "../../services/venues/consoleLogic";
import { fetchStoreOrders } from "../../services/store/orders";
import { fetchBusinessPeople, type BusinessPerson } from "../../services/business-members";
import { customerRows, memberRows, orderRows, toCsv, transactionRows, type CsvCell, type ExportKind, type ExportRange } from "./exportModel";

export { exportFileName, presetExportRange, type ExportKind, type ExportRange } from "./exportModel";

// The readers half of OURS-MO1B-export (rows 4 and B1); the rows are built in exportModel.ts.

type Built = { ok: true; rows: CsvCell[][] } | { ok: false };

async function allMembers(businessId: string): Promise<(VenueMember & { venue: string })[] | null> {
  const locs = await fetchLocations(businessId);
  if (!locs.ok) return null;
  const out: (VenueMember & { venue: string })[] = [];
  for (const g of locs.value) {
    for (let offset = 0; offset < 5000; offset += 200) {
      const r = await fetchVenueMembers(g.id, null, 200, offset);
      if (!r.ok) return null;
      out.push(...r.value.members.map((m) => ({ ...m, venue: g.name })));
      if (r.value.members.length < 200 || out.length >= r.value.total) break;
    }
  }
  return out;
}

async function allCustomers(businessId: string): Promise<BusinessPerson[] | null> {
  const out: BusinessPerson[] = [];
  for (let offset = 0; offset < 5000; offset += 200) {
    const r = await fetchBusinessPeople(businessId, { segment: "customers", limit: 200, offset });
    if (!r.ok) return null;
    out.push(...r.people);
    if (r.people.length < 200 || out.length >= r.total) break;
  }
  return out;
}

/** Reads and builds one report's rows (header first). */
export async function buildExport(businessId: string, kind: ExportKind, r: ExportRange): Promise<Built> {
  if (kind === "transactions") {
    const t = await fetchAllTransactions(businessId, { from: r.from, to: r.to });
    if (!t.ok || t.value.denied) return { ok: false };
    return { ok: true, rows: transactionRows(t.value.rows) };
  }
  if (kind === "members") {
    const m = await allMembers(businessId);
    return m ? { ok: true, rows: memberRows(m, r) } : { ok: false };
  }
  const orders = await fetchStoreOrders(businessId);
  if (orders.status !== "ok") return { ok: false };
  if (kind === "orders") return { ok: true, rows: orderRows(orders.value, r) };
  const people = await allCustomers(businessId);
  return people ? { ok: true, rows: customerRows(people, orders.value, r) } : { ok: false };
}

/** Saves the CSV through a temporary link (the Analytics shell's downloadCsv shape, with a BOM so Excel reads UTF-8). */
export function saveCsv(filename: string, rows: CsvCell[][]) {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
