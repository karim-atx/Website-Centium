import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Clock, Pencil } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { BottomSheet } from "../ui/BottomSheet";
import { fetchHoursTable, saveHours, saveVenueTimezone } from "../../services/venues/console";
import {
  draftAsHoursRow,
  draftsFromRows,
  validateDrafts,
  WEEKDAY_NAMES,
  type DayDraft,
  type DayShape,
  type GymHoursTableRow,
} from "../../services/venues/consoleLogic";
import { dayValue, hoursLines, isoWeekdayIn } from "../../services/venues/hours";

// Opening hours in the venue console (stage A4). Everyone at the venue sees
// them; only the owner edits (gym_hours' write policies are owner-only, and so
// is gyms' UPDATE). Insiders read public.gym_hours directly — gym_hours_for()
// is the public reader and returns nothing for a hidden venue.
//
// THE EDITOR WRITES SEVEN ROWS, each in exactly one of the table's three
// shapes (closed / open 24 hours / from–to, where closing at or before opening
// runs past midnight). The CHECK refuses anything else, so the same rule is
// enforced before saving (consoleLogic.validateDrafts). Labels come from the
// venue page's own helper (hours.dayValue / hoursLines), so "(next day)" reads
// the same on both sides.
//
// Built from the business console's sheets, chips and inputs; NOT YET MATCHED
// TO THE BUSINESS UI BOARD.

const SHAPES: { value: DayShape; label: string }[] = [
  { value: "closed", label: "Closed" },
  { value: "open24h", label: "Open 24 hours" },
  { value: "range", label: "Hours" },
];

const inputClass =
  "w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20";

function zoneList(current: string): string[] {
  let zones: string[] = [];
  try {
    zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    zones = [];
  }
  return zones.includes(current) ? zones : [current, ...zones];
}

export function VenueHoursCard({
  gymId,
  timezone,
  isOwner,
  onTimezoneSaved,
}: {
  gymId: string;
  timezone: string;
  isOwner: boolean;
  onTimezoneSaved: () => void;
}) {
  const [rows, setRows] = useState<{ gymId: string; value: GymHoursTableRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<DayDraft[]>([]);
  const [zone, setZone] = useState(timezone);
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

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
  }, [gymId]);

  const current = rows?.gymId === gymId ? rows.value : null;
  const lines = useMemo(() => {
    if (!current) return [];
    const asRows = draftsFromRows(current).flatMap((d) => {
      const r = draftAsHoursRow(d);
      return r ? [r] : [];
    });
    return hoursLines(asRows, isoWeekdayIn(timezone));
  }, [current, timezone]);

  const errors = validateDrafts(drafts);
  const zones = useMemo(() => zoneList(timezone), [timezone]);

  const openEditor = () => {
    setDrafts(draftsFromRows(current ?? []));
    setZone(timezone);
    setSheetError(null);
    setTried(false);
    setEditing(true);
  };

  const patch = (weekday: number, p: Partial<DayDraft>) => setDrafts((ds) => ds.map((d) => (d.weekday === weekday ? { ...d, ...p } : d)));

  const save = async () => {
    setTried(true);
    if (saving || Object.keys(errors).length > 0) return;
    setSaving(true);
    setSheetError(null);
    if (zone !== timezone) {
      const z = await saveVenueTimezone(gymId, zone);
      if (!z.ok) {
        setSaving(false);
        setSheetError(z.message);
        return;
      }
      onTimezoneSaved();
    }
    const r = await saveHours(gymId, drafts);
    setSaving(false);
    if (!r.ok) {
      setSheetError(r.message);
      return;
    }
    setRows({ gymId, value: r.value });
    setEditing(false);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2.5">
        <p className="section-label text-charcoal-faint">Opening hours</p>
        {isOwner && current && (
          <button onClick={openEditor} className="tap flex items-center gap-1.5 text-[11.5px] font-semibold text-primary-dark">
            <Pencil size={13} /> Edit hours
          </button>
        )}
      </div>
      {error && <p className="mb-3 rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-status-high">{error}</p>}
      <Card>
        {!current && !error && <p className="text-xs text-charcoal-faint">Loading hours…</p>}
        {current && lines.length === 0 && (
          <p className="text-sm text-charcoal-faint">
            {isOwner ? "No opening hours published yet. Members see nothing rather than “Closed” until you add them." : "No opening hours published yet."}
          </p>
        )}
        {lines.length > 0 && (
          <div className="space-y-1.5">
            {lines.map((l) => (
              <div key={l.key} className={clsx("flex items-center justify-between gap-3 text-sm", l.today ? "font-bold text-charcoal" : "text-charcoal-soft")}>
                <span>{l.label}</span>
                <span className="tabular-nums text-right">{l.value}</span>
              </div>
            ))}
          </div>
        )}
        <p className="flex items-center gap-1.5 text-[11px] text-charcoal-faint mt-3 pt-3 border-t border-charcoal/[0.06]">
          <Clock size={11} aria-hidden /> Times are the venue's own clock: {timezone}
        </p>
      </Card>

      <BottomSheet open={editing} onClose={() => setEditing(false)} title="Opening hours">
        <div className="space-y-4 animate-fade-slide-up">
          {drafts.map((d) => {
            const err = tried ? errors[d.weekday] : undefined;
            const preview = dayValue(draftAsHoursRow(d));
            return (
              <div key={d.weekday}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-charcoal-soft">{WEEKDAY_NAMES[d.weekday - 1]}</span>
                  <span className="text-[11px] text-charcoal-faint tabular-nums">{preview}</span>
                </div>
                <div className="flex gap-2">
                  {SHAPES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => patch(d.weekday, { shape: s.value })}
                      aria-pressed={d.shape === s.value}
                      className={clsx(
                        "tap flex-1 rounded-xl py-2 text-xs font-semibold border transition-colors",
                        d.shape === s.value ? "bg-primary-fill text-on-primary-fill border-primary-fill" : "bg-cream-soft border-transparent text-charcoal-soft"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {d.shape === "range" && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <label className="block">
                      <span className="text-[11px] text-charcoal-faint mb-1 block">Opens</span>
                      <input type="time" value={d.opensAt} onChange={(e) => patch(d.weekday, { opensAt: e.target.value })} className={inputClass} />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-charcoal-faint mb-1 block">Closes</span>
                      <input type="time" value={d.closesAt} onChange={(e) => patch(d.weekday, { closesAt: e.target.value })} className={inputClass} />
                    </label>
                  </div>
                )}
                {err && <p className="text-xs font-semibold text-status-high mt-1.5">{err}</p>}
              </div>
            );
          })}

          <p className="text-[11px] text-charcoal-faint leading-relaxed">
            A closing time at or before the opening time runs past midnight into the next day. One range per day: a break in the
            middle of the day can't be shown.
          </p>

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Venue time zone</span>
            <select value={zone} onChange={(e) => setZone(e.target.value)} className={inputClass}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>

          {tried && Object.keys(errors).length > 0 && <p className="text-xs font-semibold text-status-high">Fix the highlighted days first.</p>}
          {sheetError && <p className="text-xs font-semibold text-status-high">{sheetError}</p>}
          <Button fullWidth size="lg" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save hours"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
