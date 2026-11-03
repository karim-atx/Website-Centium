import clsx from "clsx";
import { renewalRateLabel } from "../../../services/front-desk/frontDeskLogic";
import { useRenewals } from "./membersReaders";
import { AnCard } from "./anKit";
import { t, tn } from "../../../i18n/core";

// OURS-AN4-gym-variant row 17 · the gym Plans page's "Renewals" block, on B7
// MB-05: venue_renewals_due(gym, 7) for the line and "Due in 7 days" (not
// renewed, not ending at the period end), venue_renewal_stats(gym, from, to)
// over the Analytics range for the rate. Lapsed and ended-by-choice are
// counted apart (a member who chose to stop is not a renewal the venue
// missed). A NULL rate is "–" with "No renewals were due", never 0% or 100%.
// Summed across the business's venues.

export function RenewalsCard({ from, to }: { from: string; to: string }) {
  const { data, error } = useRenewals(from, to);
  const rate = renewalRateLabel(data?.stats ?? null);
  const rows: { value: string | null; label: string; sub: string; tone: "caution" | "rate" | "high" | "soft" }[] = [
    { value: data ? String(data.toChase) : null, label: t("Due in 7 days"), sub: t("Not renewed yet and not ending."), tone: "caution" },
    { value: data ? rate.value : null, label: t("Renewal rate"), sub: rate.note ? t(rate.note) : t("Renewed out of those due this period."), tone: "rate" },
    { value: data ? String(data.stats.lapsed) : null, label: t("Lapsed"), sub: t("Ended this period without a renewal."), tone: "high" },
    { value: data ? String(data.stats.cancelled) : null, label: t("Ended by choice"), sub: t("Ended by the member or by you this period."), tone: "soft" },
  ];

  return (
    <AnCard label={t("Renewals")} className="mt-[14px]">
      <div style={{ padding: "14px 20px 4px" }}>
        <p className="text-[13px] leading-[18px] font-extrabold text-charcoal">{t("Renewals")}</p>
        <p className="text-[12px] leading-[17px] text-charcoal-soft" role="status">
          {error
            ? t("Couldn't load renewals. Check your connection and try again.")
            : !data
              ? t("Loading renewals…")
              : tn(data.ending, "1 membership ends in the next 7 days.", "{n} memberships end in the next 7 days.")}
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
