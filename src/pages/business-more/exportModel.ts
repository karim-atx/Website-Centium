import type { TxReaderRow } from "../../services/business-revenue/model";
import type { VenueMember } from "../../services/venues/consoleLogic";
import type { StoreOrder } from "../../services/store/types";
import { addDays, isoOf } from "../business-analytics/analyticsRange";
import { toCsvText } from "../../utils/csv";

// The pure half of the export (exportReports.ts reads): ranges, file name,
// each report's rows (header first) and the CSV text.
// OURS-MO1B-export rows 4 and B1 (BACKEND_REQUIREMENTS-v6 DI-06: no backend;
// the CSV is built in the browser from the readers that exist):
//   - Transactions: transactions_page (fetchAllTransactions), every lane;
//   - Members (classes, gym): venue_members per venue;
//   - Orders (store): store_orders + store_orders_page labels (fetchStoreOrders);
//   - Customers (store): business_people segment "customers" (B7 MB-01) and
//     the orders in range per customer.
// Every person is the server's label (Q-05: a first name only when shared
// with this business, else "Member #0042", or "Guest"); no export builds a
// name, and no person id is written.
// Bookings (no bookings list reader) and the PDF summary are not offered.

export type ExportKind = "transactions" | "members" | "orders" | "customers";
export type CsvCell = string | number | null;
export interface ExportRange {
  from: string;
  to: string;
}

/** Last 30 days (today and the 29 before) or this year (1 Jan to today), on this device's calendar. */
export function presetExportRange(key: "30d" | "year", today: string = isoOf(new Date())): ExportRange {
  if (key === "30d") return { from: addDays(today, -29), to: today };
  return { from: `${today.slice(0, 4)}-01-01`, to: today };
}

/** "centium-transactions-2026-09-16-to-2026-10-15.csv". */
export function exportFileName(kind: ExportKind, r: ExportRange): string {
  return `centium-${kind}-${r.from}-to-${r.to}.csv`;
}

const inRange = (day: string | null | undefined, r: ExportRange) => !!day && day.slice(0, 10) >= r.from && day.slice(0, 10) <= r.to;
const yesNo = (b: boolean) => (b ? "Yes" : "No");
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "");
const num = (v: number | string | null | undefined) => (v === null || v === undefined || v === "" ? null : Number(v));

export function transactionRows(rows: TxReaderRow[]): CsvCell[][] {
  return [
    ["Date", "Who", "Member number", "Item", "Price type", "Venue", "Method", "Amount (USD)", "Refunded (USD)", "Net (USD)", "Status", "Reference"],
    ...rows.map((t) => [
      t.paid_on ?? t.recorded_at.slice(0, 10),
      t.label,
      t.member_number,
      cap(t.source_kind),
      cap(t.price_type),
      t.venue_name,
      t.method === "whish" ? "Whish" : "Cash",
      num(t.amount),
      num(t.refunded),
      num(t.net),
      cap(t.status),
      t.provider_reference,
    ]),
  ];
}

/** Memberships that ran during the range (started by its end, not ended before its start). */
export function memberRows(members: (VenueMember & { venue: string })[], r: ExportRange): CsvCell[][] {
  const ran = members.filter((m) => m.startedOn.slice(0, 10) <= r.to && (!m.expiresOn || m.expiresOn.slice(0, 10) >= r.from));
  return [
    ["Member", "Member number", "Under 18", "Venue", "Plan", "Status", "Joined", "Starts", "Ends", "Price (USD)", "Method", "Payment"],
    ...ran.map((m) => [
      m.label,
      m.memberNumber,
      yesNo(m.isMinor),
      m.venue,
      m.planName,
      cap(m.status),
      m.joinedAt.slice(0, 10),
      m.startedOn.slice(0, 10),
      m.expiresOn ? m.expiresOn.slice(0, 10) : null,
      m.priceAgreed,
      m.paymentMethod === "whish" ? "Whish" : m.paymentMethod ? cap(m.paymentMethod) : null,
      cap(m.paymentStatus),
    ]),
  ];
}

export function orderRows(orders: StoreOrder[], r: ExportRange): CsvCell[][] {
  return [
    ["Order", "Placed", "Customer", "Under 18", "Items", "Fulfilment", "Subtotal (USD)", "Delivery (USD)", "Total (USD)", "Method", "Payment", "Status"],
    ...orders
      .filter((o) => inRange(o.placedAt, r))
      .map((o) => [
        `#${o.number}`,
        o.placedAt.slice(0, 10),
        o.customerLabel ?? "Guest",
        yesNo(o.customerIsMinor),
        o.items.map((i) => `${i.qty} × ${i.name}`).join("; "),
        cap(o.fulfilment),
        o.subtotal,
        o.deliveryFee,
        o.total,
        o.paymentMethod === "whish" ? "Whish" : "Cash",
        cap(o.paymentStatus),
        cap(o.status),
      ]),
  ];
}

/** Customers seen during the range, with their orders in it. */
/** The business_people fields the Customers report uses (B7 MB-01; kept here so this file reads no client). */
export interface ExportPerson {
  personId: string;
  label: string;
  memberNumber: number | null;
  isMinor: boolean;
  firstSeen: string | null;
  lastSeen: string | null;
}

export function customerRows(people: ExportPerson[], orders: StoreOrder[], r: ExportRange): CsvCell[][] {
  const count = new Map<string, number>();
  for (const o of orders) if (o.customerId && inRange(o.placedAt, r)) count.set(o.customerId, (count.get(o.customerId) ?? 0) + 1);
  const seen = people.filter((p) => (!p.firstSeen || p.firstSeen.slice(0, 10) <= r.to) && (!p.lastSeen || p.lastSeen.slice(0, 10) >= r.from));
  return [
    ["Customer", "Member number", "Under 18", "First seen", "Last seen", "Orders in range"],
    ...seen.map((p) => [p.label, p.memberNumber, yesNo(p.isMinor), p.firstSeen?.slice(0, 10) ?? null, p.lastSeen?.slice(0, 10) ?? null, count.get(p.personId) ?? 0]),
  ];
}

/** The shared writer (utils/csv): formulas neutralised, quotes doubled, CRLF lines. */
export function toCsv(rows: CsvCell[][]): string {
  return toCsvText(rows, "\r\n");
}
