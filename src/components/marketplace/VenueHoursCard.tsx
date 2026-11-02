import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { fetchHoursTable } from "../../services/venues/console";
import { draftAsHoursRow, draftsFromRows, type GymHoursTableRow } from "../../services/venues/consoleLogic";
import { hoursLines, isoWeekdayIn } from "../../services/venues/hours";
import { useOnline } from "../../hooks/useOnline";
import { DIVIDER, VAvatar, VBar, VCardError, VDetailCard, VDetailRow, VFooterLink, VPill } from "./VenueKit";
import { VenueHoursSheet } from "./VenueHoursSheet";
import { t } from "../../i18n/core";

// Opening hours in the venue console (stage A4), restyled per
// OURS-OP1-venue-hours: a K9 card of the shared hours lines (the venue page
// reads the same helper, so "(next day)" and "Not published" read alike) and,
// for whoever may edit, the one hours sheet (VenueHoursSheet, MA1 values).
// Everyone at the venue sees the hours. Since B7 the hours (gym_hours) need
// 'schedule' and the time zone (gyms UPDATE) needs 'venues'; the owner holds
// both (`isOwner` below means "may edit the hours"). Insiders read
// public.gym_hours directly: gym_hours_for() is the public reader and
// returns nothing for a hidden venue.

export function VenueHoursCard({
  gymId,
  timezone,
  isOwner,
  canEditZone,
  onTimezoneSaved,
  onToast,
  openSignal = 0,
  id,
}: {
  gymId: string;
  timezone: string;
  /** May edit the opening hours (owner, or B7 'schedule'). */
  isOwner: boolean;
  /** May change the venue's time zone (owner, or B7 'venues'); defaults to isOwner. */
  canEditZone?: boolean;
  onTimezoneSaved: () => void;
  onToast?: (message: string) => void;
  /** Bumped by the console's "Hours" tile to open the editor. */
  openSignal?: number;
  id?: string;
}) {
  const online = useOnline();
  const [rows, setRows] = useState<{ gymId: string; value: GymHoursTableRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetchHoursTable(gymId);
      if (cancelled) return;
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setError(null);
      setRows({ gymId, value: r.value });
    })();
    return () => {
      cancelled = true;
    };
  }, [gymId, tick]);

  const current = rows?.gymId === gymId ? rows.value : null;

  // The "Hours" action tile opens the editor for the owner once rows are in.
  const [seenSignal, setSeenSignal] = useState(openSignal);
  if (openSignal !== seenSignal) {
    setSeenSignal(openSignal);
    if (isOwner && current && online) setEditing(true);
  }

  const lines = useMemo(() => {
    if (!current) return [];
    const asRows = draftsFromRows(current).flatMap((d) => {
      const r = draftAsHoursRow(d);
      return r ? [r] : [];
    });
    return hoursLines(asRows, isoWeekdayIn(timezone));
  }, [current, timezone]);
  const today = lines.find((l) => l.today);

  return (
    <>
      <VDetailCard
        id={id}
        title={t("Opening hours")}
        right={today ? today.value : undefined}
        footer={
          isOwner && current ? (
            <VFooterLink label={lines.length > 0 ? t("Edit hours") : t("Add opening hours")} onClick={() => setEditing(true)} disabled={!online} />
          ) : null
        }
        note={
          <span className="flex items-center gap-[6px]">
            <Clock size={11} aria-hidden className="shrink-0" /> {t("Times are the venue's own clock: {timezone}", { timezone })}
          </span>
        }
      >
        {!current && !error && (
          <div role="status" aria-label={t("Loading")}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={`flex items-center justify-between border-t ${DIVIDER} min-h-[44px]`} style={{ padding: "10px 16px" }}>
                <VBar w={100} h={10} />
                <VBar w={120} h={10} />
              </div>
            ))}
          </div>
        )}
        {error && !current && <VCardError title={t("Couldn't load opening hours")} message={error} onRetry={() => setTick((t) => t + 1)} />}
        {current && lines.length === 0 && (
          <VDetailRow
            avatar={<VAvatar icon={Clock} />}
            title={t("No opening hours published yet.")}
            sub={isOwner ? t("Members see nothing rather than «Closed» until you add them.") : undefined}
          />
        )}
        {lines.map((l) => (
          <div key={l.key} className={`flex items-start justify-between gap-3 border-t ${DIVIDER} min-h-[44px]`} style={{ padding: "12px 16px" }}>
            <span className="flex flex-wrap items-center gap-[6px] min-w-0">
              <span className={`text-[13px] leading-[17px] text-charcoal ${l.today ? "font-extrabold" : "font-bold"}`}>{l.label.replace(/ \(today\)$/, "")}</span>
              {l.today && <VPill tone="pale" label={t("Today")} />}
            </span>
            <span className="text-[12.5px] leading-[17px] font-extrabold text-charcoal tabular-nums text-end">{l.value}</span>
          </div>
        ))}
      </VDetailCard>

      {isOwner && current && (
        <VenueHoursSheet
          open={editing}
          onClose={() => setEditing(false)}
          gymId={gymId}
          timezone={timezone}
          rows={current}
          zoneEditable={canEditZone ?? isOwner}
          onSaved={(saved, zoneChanged) => {
            setRows({ gymId, value: saved });
            setEditing(false);
            if (zoneChanged) onTimezoneSaved();
            onToast?.(t("Opening hours saved."));
          }}
        />
      )}
    </>
  );
}
