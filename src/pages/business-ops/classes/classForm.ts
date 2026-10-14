import type { BusinessClassRow } from "../../../services/business-classes";

// The class sheet's form values (strings as typed), and how a stored row and
// "Create another" fill them.

export interface ClassForm {
  classType: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  /** What is typed in the capacity box (validated on save). */
  capacity: string;
  price: string;
  professionalId: string;
  paymentType: string;
  notes: string;
}

/** A blank form (AN3-010: 9:00 to 10:00 AM, 10 spots, cash), with any carried values. */
export const blankForm = (date: string, carry?: Partial<ClassForm>): ClassForm => ({
  classType: "",
  title: "",
  date,
  startTime: "09:00",
  endTime: "10:00",
  capacity: "10",
  price: "",
  professionalId: "",
  paymentType: "Cash",
  notes: "",
  ...carry,
});

/** A stored session as form values (Edit class, OURS-AN3 A3). */
export const formOf = (row: BusinessClassRow): ClassForm => ({
  classType: row.classType,
  title: row.title,
  date: row.date,
  startTime: row.startTime,
  endTime: row.endTime,
  capacity: String(row.maxCapacity),
  price: row.price ? row.price.replace(/^\$/, "") : "",
  professionalId: row.professionalId ?? "",
  paymentType: "Cash",
  notes: row.notes ?? "",
});

/** V6-164: "Create another" carries type, date, Run by and payment. */
export const carryOf = (f: ClassForm): Partial<ClassForm> => ({
  classType: f.classType,
  date: f.date,
  professionalId: f.professionalId,
  paymentType: f.paymentType,
});

/** "15", "15.50", "15,50" (one comma read as the decimal point, AN3-064 row 8), "$15"; null when not a price. */
export function normalisePrice(raw: string): string | null {
  const t = raw.trim().replace(/^\$/, "").trim();
  if (!t) return "";
  if (/^\d+([.,]\d{1,2})?$/.test(t)) return t.replace(",", ".");
  return null;
}
