import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown, Search, Trash2 } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { ConfirmCard } from "../ui/ConfirmCard";
import { saveHours, saveVenueTimezone } from "../../services/venues/console";
import { draftWrapsMidnight, draftsFromRows, validateDrafts, type DayDraft, type GymHoursTableRow } from "../../services/venues/consoleLogic";
import { formatMinutes12 } from "../../utils/time12";
import { useOnline } from "../../hooks/useOnline";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { DIVIDER } from "./VenueKit";
import { isRtl, t, tk } from "../../i18n/core";

// THE opening hours sheet (V6-163: one sheet, MA1 values). Drawn in MA1
// (BizMarketV7 l.290-313, l.532-545; frames 009-019): rows of day · opens
// "to" closes · switch (K18) and the floating 12-hour time wheel (K19,
// 15-minute steps). This file adds what MA1 does not draw
// (OURS-OP1-venue-hours rows 11-19): the "Open 24 hours" shape (a button in
// the wheel card; the row's fields merge into one), overnight ranges
// ("Closes the next day at …"), unpublished days ("Not set", never saved
// silently as Closed), the per-day validation after a Save attempt, and the
// venue time zone (its own searchable sheet).
//
// Writes go through the console service: the zone first (gyms.timezone),
// then the seven gym_hours rows (UPDATE by id, INSERT the missing; never an
// upsert: gym_id is outside the UPDATE grant). Owner only (RLS refuses staff;
// the console hides the editor for them).

const SHORT = [tk("Mon"), tk("Tue"), tk("Wed"), tk("Thu"), tk("Fri"), tk("Sat"), tk("Sun")];
const LONG = [tk("Monday"), tk("Tuesday"), tk("Wednesday"), tk("Thursday"), tk("Friday"), tk("Saturday"), tk("Sunday")];
const DEFAULT_RANGE = { opensAt: "06:00", closesAt: "22:00" };

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const hhmmOf = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
/** "6:00 AM", with AM / PM in the app's language. */
const label12 = (hhmm: string) => formatMinutes12(toMin(hhmm)).replace(/ (AM|PM)$/, (_, mer: string) => ` ${t(mer)}`);

function zoneList(current: string): string[] {
  let zones: string[] = [];
  try {
    zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    zones = [];
  }
  return zones.includes(current) ? zones : [current, ...zones];
}

// ---------------------------------------------------------------------------
// K19 · one wheel column: rows 26, 5 visible, the selected row 16/800 ink,
// neighbours 13/600 faint, the outer rows at 0.45.

const ROW = 26;

function MiniWheel<V extends string | number>({ options, value, onChange, label }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void; label: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const settle = useRef<number | null>(null);
  const [top, setTop] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (Math.round(el.scrollTop / ROW) !== index) el.scrollTop = index * ROW;
    setTop(el.scrollTop);
  }, [index]);
  useEffect(() => () => void (settle.current && window.clearTimeout(settle.current)), []);
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setTop(el.scrollTop);
    if (settle.current) window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const i = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
      const next = options[i];
      if (next && next.value !== value) onChange(next.value);
    }, 110);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const i = Math.min(options.length - 1, Math.max(0, index + (e.key === "ArrowDown" ? 1 : -1)));
    onChange(options[i].value);
  };
  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKey}
      onScroll={onScroll}
      className="relative flex-1 h-full overflow-y-auto no-scrollbar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark rounded-[8px]"
      style={{ scrollSnapType: "y mandatory", paddingTop: ROW * 2, paddingBottom: ROW * 2 }}
    >
      {options.map((o, i) => {
        const d = Math.abs(i - top / ROW);
        const on = d < 0.5;
        const near = d < 1.5;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="option"
            aria-selected={o.value === value}
            tabIndex={-1}
            onClick={() => {
              ref.current?.scrollTo({ top: i * ROW, behavior: "smooth" });
              onChange(o.value);
            }}
            className={clsx("w-full flex items-center justify-center tabular-nums whitespace-nowrap", on ? "text-charcoal" : "text-charcoal-faint")}
            style={{ height: ROW, scrollSnapAlign: "center", fontSize: on ? 16 : 13, fontWeight: on ? 800 : 600, opacity: on || near ? 1 : 0.45 }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** K19 · the floating time wheel card: hour · minute · AM/PM, a shape button, Done. */
function TimeWheelCard({
  value,
  onChange,
  onDone,
  shapeButton,
  above,
  alignRight,
  label,
}: {
  value: string;
  onChange: (hhmm: string) => void;
  onDone: () => void;
  shapeButton: { label: string; onClick: () => void };
  above: boolean;
  alignRight: boolean;
  label: string;
}) {
  const reduced = useReducedMotion();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const min = toMin(value);
  const h24 = Math.floor(min / 60);
  const minute = min % 60;
  const pm = h24 >= 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const set = (h: number, m: number, p: boolean) => onChange(hhmmOf(((h % 12) + (p ? 12 : 0)) * 60 + m));
  // 15-minute steps (MA1); a stored off-step minute joins the column so nothing is lost.
  const minutes = [0, 15, 30, 45].includes(minute) ? [0, 15, 30, 45] : [0, 15, 30, 45, minute].sort((a, b) => a - b);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    const onDown = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest?.("[data-hours-field]")) onDone();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [onDone]);
  useEffect(() => {
    cardRef.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);
  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={label}
      className={clsx("absolute z-20 w-[176px] bg-cream-card rounded-[14px] border border-solid border-th-aea1dc/50", reduced ? "animate-fade-in" : "animate-popup-in")}
      style={{ ...(alignRight ? { insetInlineEnd: 0 } : { insetInlineStart: 0 }), ...(above ? { bottom: 48 } : { top: 48 }), padding: 8, boxShadow: "0 12px 32px rgba(95,80,147,0.18)" }}
    >
      <div className="relative bg-cream-soft rounded-[10px]" style={{ padding: "4px 6px", height: ROW * 5 + 8 }}>
        <span
          aria-hidden
          className="absolute start-[6px] end-[6px] bg-cream-card rounded-[9px] pointer-events-none"
          style={{ top: 4 + ROW * 2 - 3, height: 32, boxShadow: "0 1px 3px rgba(36,31,27,0.08)" }}
        />
        <div className="relative flex h-full">
          <MiniWheel label={t("Hour")} value={h12} onChange={(h) => set(h, minute, pm)} options={[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => ({ value: h, label: String(h) }))} />
          <MiniWheel label={t("Minute")} value={minute} onChange={(m) => set(h12, m, pm)} options={minutes.map((m) => ({ value: m, label: String(m).padStart(2, "0") }))} />
          <MiniWheel label={t("AM or PM")} value={pm ? "PM" : "AM"} onChange={(p) => set(h12, minute, p === "PM")} options={[{ value: "AM", label: t("AM") }, { value: "PM", label: t("PM") }]} />
        </div>
      </div>
      <button type="button" onClick={shapeButton.onClick} className="tap w-full min-h-[36px] mt-[6px] text-[12.5px] font-extrabold text-primary-dark">
        {shapeButton.label}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="tap relative w-full h-[36px] rounded-[10px] bg-primary-fill text-on-primary-fill text-[12.5px] font-extrabold mt-[4px]"
      >
        <span aria-hidden className="absolute inset-x-0 -inset-y-[4px]" />
        {t("Done")}
      </button>
    </div>
  );
}

/** K18 · a time field: h40 r12 soft, 1.5px border, 13/700 tabular, centred (44 hit). */
const TimeField = React.forwardRef<
  HTMLButtonElement,
  { text: string; active?: boolean; dim?: boolean; error?: boolean; onClick?: () => void; ariaLabel: string; disabled?: boolean; className?: string }
>(({ text, active, dim, error, onClick, ariaLabel, disabled, className }, ref) => (
  <button
    ref={ref}
    type="button"
    data-hours-field
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    aria-expanded={active}
    className={clsx(
      "tap relative h-[40px] w-full rounded-[12px] border-[1.5px] border-solid text-[13px] font-bold tabular-nums text-center whitespace-nowrap px-1",
      active
        ? "bg-primary-pale border-primary-fill text-primary-deep-text"
        : error
          ? "bg-cream-soft border-status-high text-charcoal"
          : "bg-cream-soft border-[#DEDDDE] dark:border-[#343740] text-charcoal",
      dim && "!text-charcoal-faint",
      className
    )}
  >
    <span aria-hidden className="absolute inset-x-0 -inset-y-[2px]" />
    {text}
  </button>
));
TimeField.displayName = "TimeField";

/** K18 · the day switch: 42×26 r999 padding 3, thumb 20 (44 hit). */
function DaySwitch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="tap relative w-[46px] h-[44px] flex items-center justify-center justify-self-end"
    >
      <span className={clsx("relative w-[42px] h-[26px] rounded-full transition-colors", on ? "bg-primary-fill" : "bg-[#D9D6E3] dark:bg-[#3A3D48] toggle-off")} style={{ padding: 3 }}>
        <span className="block w-[20px] h-[20px] rounded-full bg-white transition-transform" style={{ transform: on ? `translateX(${isRtl() ? -16 : 16}px)` : "translateX(0)", boxShadow: "0 1px 2px rgba(0,0,0,0.12)" }} />
      </span>
    </button>
  );
}

type Open = { weekday: number; which: "opens" | "closes" | "merged" } | null;

export function VenueHoursSheet({
  open,
  onClose,
  gymId,
  timezone,
  rows,
  onSaved,
  zoneEditable = true,
}: {
  open: boolean;
  onClose: () => void;
  gymId: string;
  timezone: string;
  rows: GymHoursTableRow[];
  onSaved: (rows: GymHoursTableRow[], zoneChanged: boolean) => void;
  /**
   * B7: the hours are gym_hours ('schedule') and the zone is gyms.timezone
   * ('venues'). Somebody holding only 'schedule' sees the zone, fixed.
   */
  zoneEditable?: boolean;
}) {
  const online = useOnline();
  const [drafts, setDrafts] = useState<DayDraft[]>(() => draftsFromRows(rows));
  // The last range each day had, so switching a day back on restores it.
  const [lastRange, setLastRange] = useState<Record<number, { opensAt: string; closesAt: string }>>({});
  const [zone, setZone] = useState(timezone);
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [wheel, setWheel] = useState<Open>(null);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [query, setQuery] = useState("");
  // MA1-009 row 3 / S4 (Batch 5): Save waits for a change, and closing with
  // a change asks first (the MA1-144 pop-up pattern).
  const [discard, setDiscard] = useState(false);

  // Each opening starts from the saved rows.
  const [openedFor, setOpenedFor] = useState(false);
  if (open !== openedFor) {
    setOpenedFor(open);
    if (open) {
      setDrafts(draftsFromRows(rows));
      setLastRange({});
      setZone(timezone);
      setSheetError(null);
      setTried(false);
      setWheel(null);
    }
  }

  const errors = validateDrafts(drafts);
  const changed = zone !== timezone || JSON.stringify(drafts) !== JSON.stringify(draftsFromRows(rows));
  const close = () => (changed && !saving ? setDiscard(true) : onClose());
  const zones = useMemo(() => zoneList(timezone), [timezone]);
  const shownZones = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "_");
    return q ? zones.filter((z) => z.toLowerCase().includes(q)) : zones;
  }, [zones, query]);
  const unset = drafts.some((d) => d.shape === null);

  const patch = (weekday: number, p: Partial<DayDraft>) => setDrafts((ds) => ds.map((d) => (d.weekday === weekday ? { ...d, ...p } : d)));

  const toggleDay = (d: DayDraft, on: boolean) => {
    setWheel(null);
    if (!on) {
      if (d.shape === "range") setLastRange((l) => ({ ...l, [d.weekday]: { opensAt: d.opensAt, closesAt: d.closesAt } }));
      patch(d.weekday, { shape: "closed" });
      return;
    }
    const back = lastRange[d.weekday] ?? (d.shape === null ? DEFAULT_RANGE : { opensAt: d.opensAt, closesAt: d.closesAt });
    patch(d.weekday, { shape: "range", ...back });
  };

  const save = async () => {
    setTried(true);
    setWheel(null);
    if (saving || Object.keys(errors).length > 0) return;
    setSaving(true);
    setSheetError(null);
    let zoneChanged = false;
    if (zone !== timezone) {
      const z = await saveVenueTimezone(gymId, zone);
      if (!z.ok) {
        setSaving(false);
        setSheetError(z.message);
        return;
      }
      zoneChanged = true;
    }
    const r = await saveHours(gymId, drafts);
    setSaving(false);
    if (!r.ok) {
      setSheetError(r.message);
      return;
    }
    onSaved(r.value, zoneChanged);
  };

  const footer = (
    <div>
      {tried && Object.keys(errors).length > 0 && <p className="text-[11.5px] font-bold text-status-high mb-[8px]">{t("Fix the highlighted days first.")}</p>}
      {sheetError && <p className="text-[11.5px] font-bold text-status-high mb-[8px]">{sheetError}</p>}
      {!online && <p className="text-[11.5px] leading-[16px] text-charcoal-faint mb-[8px]">{t("You're offline. Showing what was loaded last.")}</p>}
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || !online || !changed}
        className="tap w-full h-[52px] rounded-[16px] bg-primary-fill text-on-primary-fill text-[14.5px] font-extrabold disabled:opacity-40"
      >
        {saving ? t("Saving…") : t("Save hours")}
      </button>
    </div>
  );

  return (
    <>
      <BottomSheet open={open && !zoneOpen} onClose={close} title={t("Opening hours")} tone="business" chrome="market" headerHeight={58} footer={footer}>
        <div className="relative">
          {!wheel && (
            <div className="text-[12.5px] leading-[18px] text-charcoal-soft mb-[12px] space-y-[6px]">
              <p>{t("Tap a time to change it. Turn a day off if you're closed.")}</p>
              <p>{t("A closing time at or before the opening time runs past midnight into the next day. One range per day: a break in the middle of the day can't be shown.")}</p>
              {unset && (
                <button
                  type="button"
                  onClick={() => setDrafts((ds) => ds.map((d) => (d.shape === null ? { ...d, shape: "closed" } : d)))}
                  className="tap min-h-[44px] text-[12.5px] font-extrabold text-primary-dark"
                >
                  {t("Mark unset days closed")}
                </button>
              )}
            </div>
          )}
          {drafts.map((d, i) => {
            const err = tried ? errors[d.weekday] : undefined;
            const off = d.shape === "closed" || d.shape === null;
            const day = t(LONG[d.weekday - 1]);
            const fieldText = d.shape === null ? t("Not set") : d.shape === "closed" ? t("Closed") : null;
            const isOpen = (w: "opens" | "closes" | "merged") => wheel?.weekday === d.weekday && wheel.which === w;
            const above = d.weekday >= 6;
            return (
              <div key={d.weekday} className={clsx(i > 0 && "border-t", DIVIDER)}>
                <div className="relative grid items-center min-h-[52px]" style={{ gridTemplateColumns: "44px minmax(0,1fr) 46px", gap: 10 }}>
                  <span className={clsx("text-[13px] font-extrabold text-charcoal", off && "opacity-50")}>{t(SHORT[d.weekday - 1])}</span>
                  {d.shape === "open24h" ? (
                    <div className="relative">
                      <TimeField
                        text={t("Open 24 hours")}
                        active={isOpen("merged")}
                        error={!!err}
                        ariaLabel={t("{day}, open 24 hours. Change", { day })}
                        onClick={() => setWheel(isOpen("merged") ? null : { weekday: d.weekday, which: "merged" })}
                      />
                      {isOpen("merged") && (
                        <TimeWheelCard
                          label={t("{day} hours", { day })}
                          value={d.opensAt}
                          onChange={(v) => patch(d.weekday, { opensAt: v })}
                          onDone={() => setWheel(null)}
                          above={above}
                          alignRight={false}
                          shapeButton={{
                            label: t("Set hours"),
                            onClick: () => {
                              patch(d.weekday, { shape: "range" });
                              setWheel({ weekday: d.weekday, which: "opens" });
                            },
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className={clsx("relative grid items-center", off && "opacity-50")} style={{ gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 8 }}>
                      <TimeField
                        text={fieldText ?? label12(d.opensAt)}
                        dim={d.shape === null}
                        active={isOpen("opens")}
                        error={!!err}
                        disabled={off}
                        ariaLabel={t("Opens on {day}, {time}", { day, time: fieldText ?? label12(d.opensAt) })}
                        onClick={() => setWheel(isOpen("opens") ? null : { weekday: d.weekday, which: "opens" })}
                      />
                      <span className="text-[12px] text-charcoal-faint">{t("to")}</span>
                      <TimeField
                        text={fieldText ?? label12(d.closesAt)}
                        dim={d.shape === null}
                        active={isOpen("closes")}
                        error={!!err}
                        disabled={off}
                        ariaLabel={t("Closes on {day}, {time}", { day, time: fieldText ?? label12(d.closesAt) })}
                        onClick={() => setWheel(isOpen("closes") ? null : { weekday: d.weekday, which: "closes" })}
                      />
                      {(isOpen("opens") || isOpen("closes")) && (
                        <TimeWheelCard
                          label={isOpen("opens") ? t("Opens on {day}", { day }) : t("Closes on {day}", { day })}
                          value={isOpen("opens") ? d.opensAt : d.closesAt}
                          onChange={(v) => patch(d.weekday, isOpen("opens") ? { opensAt: v } : { closesAt: v })}
                          onDone={() => setWheel(null)}
                          above={above}
                          alignRight={isOpen("closes")}
                          shapeButton={{
                            label: t("Open 24 hours"),
                            onClick: () => {
                              setLastRange((l) => ({ ...l, [d.weekday]: { opensAt: d.opensAt, closesAt: d.closesAt } }));
                              patch(d.weekday, { shape: "open24h" });
                              setWheel(null);
                            },
                          }}
                        />
                      )}
                    </div>
                  )}
                  <DaySwitch on={d.shape === "range" || d.shape === "open24h"} onChange={(v) => toggleDay(d, v)} label={t("Open on {day}", { day })} />
                </div>
                {draftWrapsMidnight(d) && (
                  <p className="text-[11px] leading-[15px] text-charcoal-faint pb-[8px]" style={{ paddingInlineStart: 54 }}>
                    {t("Closes the next day at {time}.", { time: label12(d.closesAt) })}
                  </p>
                )}
                {err && (
                  <p className="text-[11.5px] font-bold text-status-high pb-[8px] -mt-[2px]" style={{ paddingInlineStart: 54 }}>
                    {err}
                  </p>
                )}
              </div>
            );
          })}

          <div className="mt-[16px]">
            <p className="text-[12px] font-bold text-charcoal-soft mb-[6px]">{t("Venue time zone")}</p>
            {!zoneEditable ? (
              <div className="w-full min-h-[48px] rounded-[14px] bg-cream-soft flex flex-col justify-center" style={{ padding: "6px 14px" }}>
                <span className="text-[14px] leading-[20px] font-bold text-charcoal [overflow-wrap:anywhere]">{zone}</span>
                <span className="text-[11px] leading-[15px] text-charcoal-faint">{t("You need venue access to change the time zone.")}</span>
              </div>
            ) : (
            <button
              type="button"
              onClick={() => {
                setWheel(null);
                setQuery("");
                setZoneOpen(true);
              }}
              className="tap w-full min-h-[48px] rounded-[14px] bg-cream-soft border border-solid border-[#DEDDDE] dark:border-[#343740] flex items-center justify-between gap-2 text-start"
              style={{ padding: "0 14px" }}
            >
              <span className="text-[14px] leading-[20px] font-bold text-charcoal [overflow-wrap:anywhere]">{zone}</span>
              <ChevronDown size={16} aria-hidden className="text-charcoal-faint shrink-0" />
            </button>
            )}
          </div>
        </div>
      </BottomSheet>

      <ConfirmCard
        open={open && discard}
        layout="stacked"
        frame="ops"
        tone="destructive"
        disc={{ bg: "rgb(var(--c-cream-soft))", ink: "rgb(var(--c-charcoal-soft))" }}
        icon={<Trash2 size={20} strokeWidth={2.2} />}
        title={t("Discard your changes?")}
        subtitle={t("Your opening hours keep their saved times.")}
        confirmLabel={t("Discard changes")}
        cancelLabel={t("Keep editing")}
        scrimBlur
        onConfirm={() => {
          setDiscard(false);
          onClose();
        }}
        onCancel={() => setDiscard(false)}
      />

      <BottomSheet open={open && zoneOpen} onClose={() => setZoneOpen(false)} title={t("Time zone")} tone="business" headerHeight={62} bodyPadding={{ top: 18, right: 18, bottom: 30, left: 18 }}>
        <label className="flex items-center gap-2 min-h-[48px] rounded-[14px] bg-cream-soft border border-solid border-[#DEDDDE] dark:border-[#343740]" style={{ padding: "0 14px" }}>
          <Search size={16} aria-hidden className="text-charcoal-faint shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search a city or zone")}
            aria-label={t("Search a city or zone")}
            className="flex-1 min-w-0 bg-transparent text-[14px] text-charcoal placeholder:text-charcoal-faint focus:outline-none"
          />
        </label>
        <div className="mt-[12px] rounded-[22px] overflow-hidden bg-cream-card border border-solid border-charcoal/[0.11] dark:border-charcoal/[0.08]" role="listbox" aria-label={t("Time zones")}>
          {shownZones.slice(0, 200).map((z, i) => (
            <button
              key={z}
              type="button"
              role="option"
              aria-selected={z === zone}
              onClick={() => {
                setZone(z);
                setZoneOpen(false);
              }}
              className={clsx("tap w-full flex items-center justify-between gap-2 min-h-[44px] text-start text-[13px] font-bold text-charcoal", i > 0 && "border-t", DIVIDER)}
              style={{ padding: "10px 16px" }}
            >
              <span className="[overflow-wrap:anywhere]">{z.replace(/_/g, " ")}</span>
              {z === zone && <Check size={16} strokeWidth={2.6} aria-hidden className="text-primary-dark shrink-0" />}
            </button>
          ))}
          {shownZones.length === 0 && <p className="text-[13px] text-charcoal-faint" style={{ padding: "14px 16px" }}>{t("No time zone matches «{query}».", { query })}</p>}
        </div>
      </BottomSheet>
    </>
  );
}
