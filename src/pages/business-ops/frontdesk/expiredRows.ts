// OP1-017 row 11: "Expired" rows under Renewals due. venue_renewals_due lists
// active periods only, so a lapsed membership comes from venue_members (the
// desk already reads every status, useFrontDesk). A row shows when the
// membership is `expired`, it ended within the cut-off, and the person has no
// later active or upcoming membership at the same venue (renewed since).
//
// CUT-OFF UNSPECIFIED (the handover draws one "Expired yesterday" row): 7
// days back, the same window as the tab's "Renewals due" (7 days ahead).

import { t, tn } from "../../../i18n/core";
import type { FrontDeskMember } from "../../../services/front-desk/frontDeskLogic";

export const EXPIRED_DAYS = 7;

export interface ExpiredRow {
  membershipId: string;
  gymId: string;
  personId: string | null;
  label: string;
  planName: string;
  expiresOn: string;
  /** 0 = expired today, 1 = yesterday. */
  daysAgo: number;
}

const dayNumber = (iso: string) => Math.round(new Date(`${iso}T00:00:00Z`).getTime() / 86_400_000);

export function expiredRows(members: FrontDeskMember[], today: string, days = EXPIRED_DAYS): ExpiredRow[] {
  const today0 = dayNumber(today);
  const current = new Set(
    members.filter((m) => m.personId && (m.status === "active" || m.status === "upcoming")).map((m) => `${m.gymId}:${m.personId}`)
  );
  return members
    .filter((m) => m.status === "expired" && !!m.expiresOn)
    .map((m) => ({ m, ago: today0 - dayNumber(m.expiresOn as string) }))
    .filter(({ m, ago }) => ago >= 0 && ago <= days && !(m.personId && current.has(`${m.gymId}:${m.personId}`)))
    .sort((a, b) => a.ago - b.ago || a.m.label.localeCompare(b.m.label))
    .map(({ m, ago }) => ({ membershipId: m.membershipId, gymId: m.gymId, personId: m.personId, label: m.label, planName: m.planName, expiresOn: m.expiresOn as string, daysAgo: ago }));
}

/** "Expired yesterday" (drawn, BizTypeKit l.95); "Expired today", "Expired {n} days ago" (OURS). */
export function expiredSub(daysAgo: number): string {
  if (daysAgo <= 0) return t("Expired today");
  if (daysAgo === 1) return t("Expired yesterday");
  return tn(daysAgo, "Expired {n} day ago", "Expired {n} days ago");
}
