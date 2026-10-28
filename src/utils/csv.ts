// The one CSV cell writer (Round C · DK): every export the app offers goes
// through it, so a value can't run as a formula in the spreadsheet that opens
// the file.
//
// FORMULA INJECTION. Excel, Numbers and Sheets read a cell that starts with
// = + - @ (or a tab or carriage return before one) as a formula, so a member
// named `=HYPERLINK("https://…","Click")` would become a live link, or worse,
// on the business owner's machine. Such a text cell gets a leading ' so it
// reads as text. Numbers are written as numbers, and a text cell that is only
// a number ("-12.50") is left alone, so negative amounts stay amounts.

export type CsvValue = string | number | null;

const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^[-+]?\d[\d,]*(\.\d+)?$/;

/** A text value made safe to open in a spreadsheet. */
export function neutraliseFormula(text: string): string {
  return FORMULA_START.test(text) && !PLAIN_NUMBER.test(text) ? `'${text}` : text;
}

/** One quoted CSV cell; null is an empty cell. */
export function csvCell(v: CsvValue): string {
  if (v === null) return "";
  const text = typeof v === "number" ? String(v) : neutraliseFormula(v);
  return `"${text.replace(/"/g, '""')}"`;
}

/** Rows to CSV text. The Analytics files end lines with "\n", the More exports with "\r\n". */
export function toCsvText(rows: CsvValue[][], eol: "\n" | "\r\n" = "\r\n"): string {
  return rows.map((row) => row.map(csvCell).join(",")).join(eol);
}
