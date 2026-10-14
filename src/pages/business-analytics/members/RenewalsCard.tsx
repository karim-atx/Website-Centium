import { useEffect, useState } from "react";
import clsx from "clsx";
import { fetchFrontDeskVenues, fetchRenewalsDue, fetchRenewalStats } from "../../../services/front-desk";
import { renewalRateLabel, toChase, type RenewalStats } from "../../../services/front-desk/frontDeskLogic";
import { useOnline } from "../../../hooks/useOnline";
import { AnCard } from "./anKit";

// OURS-AN4-gym-variant row 17 · the gym Plans page's "Renewals" block, on B7
// MB-05: venue_renewals_due(gym, 7) for the line and "Due in 7 days" (not
// renewed, not ending at the period end), venue_renewal_stats(gym, from, to)
// over the Analytics range for the rate. Lapsed and ended-by-choice are
// counted apart (a member who chose to stop is not a renewal the venue
// missed). A NULL rate is "–" with "No renewals were due", never 0% or 100%.
// Summed across the business's venues.

interface Data {
  ending: number;
  toChase: number;
  stats: RenewalStats;
}

export function RenewalsCard({ from, to }: { from: string; to: string }) {
  const online = useOnline();
  const [data, setData] = useState<Data | null>(null);
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

  const rate = renewalRateLabel(data?.stats ?? null);
  const rows: { value: string | null; label: string; sub: string; tone: "caution" | "rate" | "high" | "soft" }[] = [
    { value: data ? String(data.toChase) : null, label: "Due in 7 days", sub: "Not renewed yet and not ending.", tone: "caution" },
    { value: data ? rate.value : null, label: "Renewal rate", sub: rate.note ?? "Renewed out of those due this period.", tone: "rate" },
    { value: data ? String(data.stats.lapsed) : null, label: "Lapsed", sub: "Ended this period without a renewal.", tone: "high" },
    { value: data ? String(data.stats.cancelled) : null, label: "Ended by choice", sub: "Ended by the member or by you this period.", tone: "soft" },
  ];

  return (
    <AnCard label="Renewals" className="mt-[14px]">
      <div style={{ padding: "14px 20px 4px" }}>
        <p className="text-[13px] leading-[18px] font-extrabold text-charcoal">Renewals</p>
        <p className="text-[12px] leading-[17px] text-charcoal-soft" role="status">
          {error
            ? "Couldn't load renewals. Check your connection and try again."
            : !data
              ? "Loading renewals…"
              : data.ending === 1
                ? "1 membership ends in the next 7 days."
                : `${data.ending} memberships end in the next 7 days.`}
        </p>
      </div>
      <div>
        {rows.map((r, i) => (
          <div
            key={r.label}
            className={clsx("grid items-center border-charcoal/[0.06]", i > 0 && "border-t")}
            style={{ gridTemplateColumns: "3px 64px minmax(0,1fr)", columnGap: 12, padding: "12px 20px", minHeight: 56 }}
          >
            <span
              aria-hidden
              className={clsx(
                "self-stretch rounded-full",
                r.tone === "caution" ? "bg-caution-strong" : r.tone === "high" ? "bg-status-high" : r.tone === "rate" ? "bg-primary-dark" : "bg-charcoal-tertiary"
              )}
            />
            <span className={clsx("text-[18px] font-extrabold tabular-nums", r.value === null || r.value === "–" ? "text-charcoal-tertiary" : "text-charcoal")}>{r.value ?? "–"}</span>
            <span className="min-w-0">
              <span className="block text-[12.5px] leading-[17px] font-extrabold text-charcoal">{r.label}</span>
              <span className="block text-[11px] leading-[15px] text-charcoal-faint">{r.sub}</span>
            </span>
          </div>
        ))}
      </div>
    </AnCard>
  );
}
