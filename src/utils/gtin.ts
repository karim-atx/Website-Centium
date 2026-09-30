// GTIN normalisation, the same rules in the same order as public.normalize_gtin
// and the lookup-barcode Edge Function (Database-Atraxia), so one product is
// one code whatever scanned it: a UPC-E, its UPC-A and the EAN-13 all become
// the same 13 digits, and anything that cannot be a GTIN is rejected before a
// lookup is spent on it.

/** GS1 modulo 10: alternating weights 1 and 3 from the left, sum divisible by 10. */
function checkDigitOk(gtin: string): boolean {
  if (!/^[0-9]{13}$/.test(gtin)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(gtin[i]) * (i % 2 === 0 ? 1 : 3);
  return sum % 10 === 0;
}

/** The 13-digit GTIN for a scanned or typed code, or null when it cannot be one. */
export function normalizeGtin(input: string): string | null {
  if (typeof input !== "string") return null;
  let d = input.trim().replace(/[\s-]/g, "");
  if (!/^[0-9]+$/.test(d)) return null;

  if (d.length === 8) {
    // UPC-E begins 0 or 1. Try that reading first and keep it only if the
    // expansion's check digit is valid; otherwise it is a GTIN-8.
    if (d[0] === "0" || d[0] === "1") {
      const x6 = d[6];
      let upca: string;
      if (x6 === "0" || x6 === "1" || x6 === "2") {
        upca = d[0] + d.slice(1, 3) + x6 + "0000" + d.slice(3, 6) + d[7];
      } else if (x6 === "3") {
        upca = d[0] + d.slice(1, 4) + "00000" + d.slice(4, 6) + d[7];
      } else if (x6 === "4") {
        upca = d[0] + d.slice(1, 5) + "00000" + d[5] + d[7];
      } else {
        upca = d[0] + d.slice(1, 6) + "0000" + x6 + d[7];
      }
      if (checkDigitOk("0" + upca)) return "0" + upca;
    }
    d = "00000" + d;
  } else if (d.length === 12) {
    d = "0" + d;
  } else if (d.length === 14) {
    // Indicator 0 means the same trade item. Anything else is a case.
    if (d[0] !== "0") return null;
    d = d.slice(1);
  }

  if (d.length !== 13) return null;
  return checkDigitOk(d) ? d : null;
}
