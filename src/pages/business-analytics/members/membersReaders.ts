import { useEffect, useMemo, useState } from "react";
import { fetchBusyTimes, fetchFrontDeskVenues, fetchRenewalsDue, fetchRenewalStats } from "../../../services/front-desk";
import { toChase, type RenewalStats } from "../../../services/front-desk/frontDeskLogic";
import { useOnline } from "../../../hooks/useOnline";
import { appLocale } from "../../../i18n/format";
import { t } from "../../../i18n/core";
import { useAnalytics } from "../analyticsContext";
import type { MembersPageDef, MembersVocab } from "./membersModel";
import type { MembersData } from "./useMembersData";

// The Members pages' readers and small helpers, shared by the mobile page
// (MembersPage, RenewalsCard) and the web block grid (MembersBlocks.web).

/** The foot line under each page (AnMembersV6 `foot`; AN4-025 D3: "Names follow member privacy settings." is dropped). */
export function footOf(page: MembersPageDef, vocab: MembersVocab): string | null {
  const classes = vocab.label === "Clients";
  switch (page.key) {
    case "growth":
      return classes ? null : t("Members with a current membership.");
    case "first90":
      return classes ? null : t("Based on joins, ends and bookings in this period.");
    case "engagement":
      return t("Based on booked spots in this period.");
    case "atrisk":
      return classes ? t("Based on each client's bookings.") : t("Based on each member's bookings.");
    case "plans":
      return t("Based on current memberships and plans.");
    default:
      return null;
  }
}

/** Weekday d (0 = Monday) in the app's language; 1 Jan 2024 was a Monday. */
export const dayName = (d: number, weekday: "long" | "narrow" = "long") => new Date(2024, 0, 1 + d).toLocaleDateString(appLocale("en-US"), { weekday });
export const fmtEntries = (v: number) => (v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));

/** The per-weekday entry sums EntriesByDay draws (null while loading, on an error or with no gym); `weeks` is the range in weeks. */
export function useEntriesByDay(data: MembersData): { days: number[] | null; weeks: number; gyms: number } {
  const { range } = useAnalytics();
  const gyms = useMemo(() => data.venues.filter((v) => v.kind === "gym" && v.businessId === data.businessId).map((v) => v.gymId), [data.venues, data.businessId]);
  // The range in weeks (the reader takes 1 to 13).
  const weeks = Math.min(13, Math.max(1, Math.round((Date.parse(range.to) - Date.parse(range.from)) / (7 * 86_400_000))));
  const key = `${gyms.join(",")}|${weeks}`;
  const [state, setState] = useState<{ key: string; days: number[] | null } | null>(null);
  useEffect(() => {
    if (gyms.length === 0) return;
    let cancelled = false;
    void Promise.all(gyms.map((g) => fetchBusyTimes(g, weeks))).then((rs) => {
      if (cancelled) return;
      if (rs.some((r) => !r.ok)) return setState({ key, days: null });
      const days = Array<number>(7).fill(0);
      for (const r of rs) if (r.ok) r.value.forEach((row, d) => (days[d] += row.reduce((a, v) => a + v, 0)));
      setState({ key, days });
    });
    return () => {
      cancelled = true;
    };
  }, [gyms, weeks, key]);
  return { days: state?.key === key ? state.days : null, weeks, gyms: gyms.length };
}

export interface RenewalsData {
  ending: number;
  toChase: number;
  stats: RenewalStats;
}

/** The Renewals block's figures (null while loading), summed across the business's venues; `error` on a failed read. */
export function useRenewals(from: string, to: string): { data: RenewalsData | null; error: boolean } {
  const online = useOnline();
  const [data, setData] = useState<RenewalsData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const v = await fetchFrontDeskVenues();
      if (!v.ok) {
        if (!cancelled) setError(true);
        return;
      }
      let ending = 0;
      let chase = 0;
      const sum: RenewalStats = { from, to, due: 0, renewed: 0, lapsed: 0, cancelled: 0, rate: null };
      for (const venue of v.value) {
        const [d, s] = await Promise.all([fetchRenewalsDue(venue.gymId, 7), fetchRenewalStats(venue.gymId, from, to)]);
        if (!d.ok || !s.ok) {
          if (!cancelled) setError(true);
          return;
        }
        ending += d.value.length;
        chase += toChase(d.value).length;
        if (s.value) {
          sum.due += s.value.due;
          sum.renewed += s.value.renewed;
          sum.lapsed += s.value.lapsed;
          sum.cancelled += s.value.cancelled;
        }
      }
      sum.rate = sum.due > 0 ? sum.renewed / sum.due : null;
      if (!cancelled) {
        setError(false);
        setData({ ending, toChase: chase, stats: sum });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to, online]);
  return { data, error };
}
