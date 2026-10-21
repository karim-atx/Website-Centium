import { dayMonth } from "../shell/range";

const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Sat" */
export const weekday = (iso: string): string => SHORT[new Date(`${iso}T00:00:00`).getDay()];

/** "Sat, Oct 17" */
export const dayDate = (iso: string): string => `${weekday(iso)}, ${dayMonth(iso)}`;

/** "$3,470" / "$60" (no cents when whole). */
export const money = (n: number): string =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;


export const hhmmOf = (min: number): string => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
