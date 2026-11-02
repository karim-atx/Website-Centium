import React, { useMemo, useState } from "react";
import clsx from "clsx";
import { ScanLine, UserCheck } from "lucide-react";
import { barHeights, BAR_AREA, entrySub, hourBins, hourCounts, hourShort, isDeskMethod, type Entry } from "../../../services/front-desk/frontDeskLogic";
import { clock12 } from "../../../utils/time12";
import { t, tk, tx } from "../../../i18n/core";
import type { DeskState } from "./useFrontDesk";
import { DeskLabel, DeskRow, EmptyCard, ErrorCard, LIST, ListCard, RULE, ListLine, NumberBoxes, NumberBoxesSkeleton, RowsSkeleton, StatusChip } from "./frontDeskKit";

// OP1-013 (Entries), OP1-016 (empty), OURS states O1-O10, on B10: the boxes
// are desk_summary (entries since the venue's midnight, In now = people with
// an entry in the last 90 minutes, denied today), the chart and the list are
// desk_entries (first names: the check-in screen, Q-05). OP1-016's card shows
// while this venue has never recorded a check-in, and on a database without
// B10 (the pending rule). Nothing below invents a number (HANDOVER 1).

const EMPTY_BODY = tk("Members scan their pass at the door, or you check them in here.");

export const EntriesTab: React.FC<{
  desk: DeskState;
  /** The venues' own load failed (my_venues). */
  error: string | null;
  onRetry: () => void;
  now: Date;
}> = ({ desk, error, onRetry, now }) => {
  const [all, setAll] = useState(false);

  if (desk.loading && !desk.summary && desk.live !== false && !error) {
    return (
      <div aria-busy="true">
        <NumberBoxesSkeleton />
        <ChartSkeleton />
        <DeskLabel>{t("Recent")}</DeskLabel>
        <RowsSkeleton />
      </div>
    );
  }
  if ((error || desk.error) && !desk.summary) return <ErrorCard title={t("Couldn't load entries")} onRetry={onRetry} />;
  if (desk.live !== true || !desk.summary || !desk.entries || desk.everAny === false) {
    return <EmptyCard icon={ScanLine} title={tx("No entries yet", "gym entries")} body={t(EMPTY_BODY)} />;
  }
  return <EntriesBody desk={desk} now={now} all={all} setAll={setAll} />;
};

/** S6: "Updated {n} min ago" (11/600 faint). */
function updatedLine(at: Date | null, now: Date): string | null {
  if (!at) return null;
  const min = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 60_000));
  return min < 1 ? t("Updated just now") : t("Updated {n} min ago", { n: min });
}

const EntriesBody: React.FC<{
  desk: DeskState;
  now: Date;
  all: boolean;
  setAll: (v: boolean) => void;
}> = ({ desk, now, all, setAll }) => {
  const entries = useMemo(() => desk.entries ?? [], [desk.entries]);
  const summary = desk.summary!;
  const quiet = entries.length === 0;
  const hours = useMemo(() => {
    const entryHours = [...new Set(entries.filter((e) => e.result === "in").map((e) => new Date(e.at).getHours()))];
    return hourCounts(entries, hourBins(desk.todayHours, entryHours, now.getHours()));
  }, [entries, desk.todayHours, now]);
  const updated = updatedLine(desk.readAt, now);

  if (all) {
    // S3: today's full list, grouped by hour, newest first.
    const groups = new Map<number, Entry[]>();
    for (const e of entries) {
      const h = new Date(e.at).getHours();
      groups.set(h, [...(groups.get(h) ?? []), e]);
    }
    return (
      <div className="flex flex-col">
        <DeskLabel action={{ label: t("Back"), onClick: () => setAll(false), ariaLabel: t("Back to the front desk") }}>{t("Entries today")}</DeskLabel>
        {[...groups].map(([h, list]) => (
          <section key={h} aria-label={hourShort(h)}>
            <p className="text-[11px] font-semibold leading-[14px] text-charcoal-faint" style={{ margin: "0 2px 6px" }}>
              {clock12(new Date(now.getFullYear(), now.getMonth(), now.getDate(), h))}
            </p>
            <ListCard label={hourShort(h)}>
              {list.map((e, i) => (
                <EntryRow key={e.id} e={e} first={i === 0} />
              ))}
            </ListCard>
          </section>
        ))}
      </div>
    );
  }

  const seeAll = !quiet && entries.length > 3;
  return (
    <div className="flex flex-col">
      <NumberBoxes
        items={[
          { label: t("Entries today"), value: String(summary.entriesToday) },
          { label: t("In now"), value: String(summary.inNow) },
          { label: t("Denied"), value: String(summary.deniedToday) },
        ]}
      />
      <HourChart hours={hours} now={now} quiet={quiet} />
      <DeskLabel
        action={seeAll ? { label: t("See all"), onClick: () => setAll(true), ariaLabel: t("See all entries today") } : undefined}
        trailing={!seeAll && updated ? <UpdatedNote text={updated} /> : undefined}
      >
        {t("Recent")}
      </DeskLabel>
      {quiet ? (
        <ListLine>{t("No entries yet today.")}</ListLine>
      ) : (
        <ListCard label={t("Recent entries")}>
          {entries.slice(0, 3).map((e, i) => (
            <EntryRow key={e.id} e={e} first={i === 0} />
          ))}
        </ListCard>
      )}
      {seeAll && updated && (
        <p className="text-[11px] font-semibold leading-[14px] text-charcoal-faint" style={{ margin: "-6px 2px 14px" }}>
          {updated}
        </p>
      )}
    </div>
  );
};

const UpdatedNote: React.FC<{ text: string }> = ({ text }) => <span className="text-[11px] font-semibold leading-[14px] text-charcoal-faint normal-case tracking-normal">{text}</span>;

const EntryRow: React.FC<{ e: Entry; first: boolean }> = ({ e, first }) => (
  <DeskRow
    icon={isDeskMethod(e.method) ? UserCheck : ScanLine}
    title={e.title}
    sub={entrySub(e)}
    first={first}
    trailing={e.result === "in" ? <StatusChip tone="good">{tx("In", "entry result")}</StatusChip> : <StatusChip tone="high">{t("Denied")}</StatusChip>}
  />
);

/** OP1-013 rows 9-12: one bar per opening hour (D3), height value / max × 81 (D1). */
const HourChart: React.FC<{ hours: { hour: number; count: number }[]; now: Date; quiet: boolean }> = ({ hours, now, quiet }) => {
  const heights = barHeights(hours.map((h) => h.count));
  const current = now.getHours();
  return (
    <div className={LIST} style={{ borderRadius: 18, padding: 14, marginBottom: 14 }}>
      <p className="text-[13px] font-extrabold leading-[1.5] text-charcoal">{t("Entries by hour")}</p>
      <p className="text-[11.5px] leading-[1.5] text-charcoal-faint" style={{ marginBottom: 12 }}>
        {t("How busy is it right now?")}
      </p>
      {quiet || hours.length === 0 ? (
        <p className="flex items-center justify-center text-[11.5px] leading-[16px] text-charcoal-faint" style={{ height: 96 }}>
          {t("No entries yet today.")}
        </p>
      ) : (
        <div role="img" aria-label={hours.map((h) => `${hourShort(h.hour)} ${h.count}`).join(", ")} className="flex items-end" style={{ gap: 4, height: 96 }}>
          {hours.map((h, i) => (
            <div key={h.hour} className="flex-1 min-w-0 flex flex-col items-center justify-end" style={{ height: 96 }}>
              <div className="w-full flex items-end" style={{ height: BAR_AREA }}>
                <div
                  className={clsx("w-full", h.hour === current ? "bg-primary-fill" : "bg-th-aea1dc dark:bg-th-c3b3fb")}
                  style={{ height: heights[i], borderRadius: "6px 6px 3px 3px" }}
                />
              </div>
              <span className="block text-[9px] leading-[11px] text-charcoal-faint whitespace-nowrap" style={{ marginTop: 4, visibility: i % 2 === 0 ? "visible" : "hidden" }}>
                {hourShort(h.hour)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ChartSkeleton: React.FC = () => (
  <div aria-hidden className={LIST} style={{ borderRadius: 18, padding: 14, marginBottom: 14 }}>
    <span className="block bg-cream-soft animate-skeleton-pulse" style={{ width: 96, height: 12, borderRadius: 6 }} />
    <span className="block bg-cream-soft animate-skeleton-pulse" style={{ width: 130, height: 10, borderRadius: 5, marginTop: 8, marginBottom: 12 }} />
    <div className="flex items-end" style={{ gap: 4, height: 96 }}>
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className={clsx("flex-1 opacity-40", RULE)} style={{ height: 81 * (0.3 + ((i * 37) % 60) / 100), borderRadius: "6px 6px 3px 3px" }} />
      ))}
    </div>
  </div>
);
