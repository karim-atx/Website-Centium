import { dayMonth } from "../shell/range";
import { appLocale } from "../../../i18n/format";
import { getLanguage } from "../../../i18n/core";
import { ARABIC_LOCALE } from "../../../i18n/format";

const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Sat" */
export const weekday = (iso: string): string =>
  getLanguage() === "ar"
    ? new Date(`${iso}T00:00:00`).toLocaleDateString(ARABIC_LOCALE, { weekday: "long" })
    : SHORT[new Date(`${iso}T00:00:00`).getDay()];

/** "Sat, Oct 17" */
export const dayDate = (iso: string): string => `${weekday(iso)}${getLanguage() === "ar" ? "، " : ", "}${dayMonth(iso)}`;

/** "$3,470" / "$60" (no cents when whole). */
export const money = (n: number): string =>
  `$${n.toLocaleString(appLocale("en-US"), { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;


export const hhmmOf = (min: number): string => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
