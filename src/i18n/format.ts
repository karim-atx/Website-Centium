import { getLanguage } from "./core";

// Round F (AV, F9): dates and numbers in the app's language. Every
// toLocale*String / Intl call that named an English locale now asks
// appLocale(thatLocale): in English it returns exactly that locale, so no
// English output changes by a character; in Arabic it returns Lebanese Arabic
// with Western digits (Arabic month and day names, 0-9, as the Database's
// server text does: "Western digits, Arabic month names").
export const ARABIC_LOCALE = "ar-LB-u-nu-latn";

export function appLocale(english?: string): string | undefined {
  return getLanguage() === "ar" ? ARABIC_LOCALE : english;
}
