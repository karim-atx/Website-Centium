import React, { useMemo, useState } from "react";
import clsx from "clsx";
import { ScanLine, UserCheck } from "lucide-react";
import type { EntriesResult } from "../../../services/front-desk";
import { barHeights, BAR_AREA, entryFigures, entrySub, hourShort, type Entry } from "../../../services/front-desk/frontDeskLogic";
import { clock12 } from "../../../utils/time12";
import { DeskLabel, DeskRow, EmptyCard, ErrorCard, LIST, ListCard, RULE, ListLine, NumberBoxes, NumberBoxesSkeleton, RowsSkeleton, StatusChip } from "./frontDeskKit";

// OP1-013 (Entries), OP1-016 (empty), OURS states O1-O10. Check-ins are B10
// (BU2-07): until the stage is on the stack the read answers "not available"
// and the tab shows OP1-016's empty card, which is true: no entry has ever
// been recorded. Nothing below invents a number (data honesty, HANDOVER 1).

const EMPTY_BODY = "Members scan their pass at the door, or you check them in here.";

export const EntriesTab: React.FC<{
  entries: EntriesResult | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  now: Date;
}> = ({ entries, loading, error, onRetry, now }) => {
  const [all, setAll] = useState(false);

  if (loading && !entries) {
    return (
      <div aria-busy="true">
        <NumberBoxesSkeleton />
        <ChartSkeleton />
        <DeskLabel>Recent</DeskLabel>
        <RowsSkeleton />
      </div>
    );
  }
  if (error && !entries) return <ErrorCard title="Couldn't load entries" onRetry={onRetry} />;
  if (!entries || !entries.available || !entries.everAny) {
    return <EmptyCard icon={ScanLine} title="No entries yet" body={EMPTY_BODY} />;
  }
  return <EntriesBody entries={entries.entries} hours={entries.hours} now={now} all={all} setAll={setAll} />;
};

const EntriesBody: React.FC<{
  entries: Entry[];
  hours: { hour: number; count: number }[];
  now: Date;
  all: boolean;
  setAll: (v: boolean) => void;
}> = ({ entries, hours, now, all, setAll }) => {
  const figures = useMemo(() => entryFigures(entries, now), [entries, now]);
  const newest = useMemo(() => [...entries].sort((a, b) => b.at.localeCompare(a.at)), [entries]);
  const quiet = newest.length === 0;

  if (all) {
    // S3: today's full list, grouped by hour, newest first.
    const groups = new Map<number, Entry[]>();
    for (const e of newest) {
      const h = new Date(e.at).getHours();
      groups.set(h, [...(groups.get(h) ?? []), e]);
    }
    return (
      <div className="flex flex-col">
        <DeskLabel action={{ label: "Back", onClick: () => setAll(false), ariaLabel: "Back to the front desk" }}>Entries today</DeskLabel>
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

  return (
    <div className="flex flex-col">
      <NumberBoxes
        items={[
          { label: "Entries today", value: String(figures.today) },
          { label: "In now", value: String(figures.inNow) },
          { label: "Denied", value: String(figures.denied) },
        ]}
      />
      <HourChart hours={hours} now={now} quiet={quiet} />
      <DeskLabel action={quiet || newest.length <= 3 ? undefined : { label: "See all", onClick: () => setAll(true), ariaLabel: "See all entries today" }}>Recent</DeskLabel>
      {quiet ? (
        <ListLine>No entries yet today.</ListLine>
      ) : (
        <ListCard label="Recent entries">
          {newest.slice(0, 3).map((e, i) => (
            <EntryRow key={e.id} e={e} first={i === 0} />
          ))}
        </ListCard>
      )}
    </div>
  );
};

const EntryRow: React.FC<{ e: Entry; first: boolean }> = ({ e, first }) => (
  <DeskRow
    icon={e.method === "qr" ? ScanLine : UserCheck}
    title={e.memberLabel}
    sub={entrySub(e)}
    first={first}
    trailing={e.result === "in" ? <StatusChip tone="good">In</StatusChip> : <StatusChip tone="high">Denied</StatusChip>}
  />
);

/** OP1-013 rows 9-12: one bar per opening hour (D3), height value / max × 81 (D1). */
const HourChart: React.FC<{ hours: { hour: number; count: number }[]; now: Date; quiet: boolean }> = ({ hours, now, quiet }) => {
  const heights = barHeights(hours.map((h) => h.count));
  const current = now.getHours();
  return (
    <div className={LIST} style={{ borderRadius: 18, padding: 14, marginBottom: 14 }}>
      <p className="text-[13px] font-extrabold leading-[1.5] text-charcoal">Entries by hour</p>
      <p className="text-[11.5px] leading-[1.5] text-charcoal-faint" style={{ marginBottom: 12 }}>
        How busy is it right now?
      </p>
      {quiet || hours.length === 0 ? (
        <p className="flex items-center justify-center text-[11.5px] leading-[16px] text-charcoal-faint" style={{ height: 96 }}>
          No entries yet today.
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
