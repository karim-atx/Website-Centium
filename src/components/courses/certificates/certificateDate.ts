import { formatShortDate } from "../../../utils/date";

/** "12 Oct 2026", in the app's language: the day a certificate was earned. */
export const certificateDate = (issuedAt: string) =>
  formatShortDate(new Date(issuedAt), { day: "numeric", month: "short", year: "numeric" });
