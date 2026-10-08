import React, { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronUp, Clock, Globe, Loader2, Search, Smartphone } from "lucide-react";
import { SettingsRow, settingsRowClass } from "../ui/SettingsRows";
import { useApp } from "../../context/AppContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { browserTimezone, knownTimezones } from "../../services/timezone";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { linePx, textPx } from "../../theme/textSize";
import { buildZoneOptions, filterZones, zoneCity, zoneDisplay } from "./timezoneOptions";
import { TimezoneWheel } from "./TimezoneWheel";

/**
 * Settings â†’ Data & account â†’ Time zone (MO1.8 #59â€“#73, MO1.8.13). Writes the
 * profile's one zone (profiles.timezone) for every account.
 *
 * Two rows. "Time zone": our field ("(GMT+03:00) Riyadh") that opens an
 * inline panel under it (pushes the rows below down) with a search box and a
 * compact one-column wheel. Putting a zone in the band records it as the
 * user's choice (timezone_chosen_at), saved when the wheel settles (+400 ms,
 * one write) and on close if the band differs from the saved zone (V6-149).
 * "Use device time zone": a switch, on while chosen_at is null (the zone
 * follows the device; AppContext writes the device zone quietly on load).
 *
 * The zone list is the engine's own (the server validates names: ATX50,
 * timezone_name_is_valid()); a stored zone the engine doesn't list stays in
 * the wheel at its city position. The explainer is screen-reader text
 * (V6-149). id="timezone" stays on the Time zone row: the cycle tracker links
 * to /app/settings#timezone (Settings.tsx scrolls to it).
 */

const SAVE_AFTER_SETTLE_MS = 400;
const OFFLINE_TZ = "You're offline. Your time zone wasn't changed.";

export const TimezoneSetting: React.FC = () => {
  const { myTimezone, pickTimezone, followDeviceZone } = useApp();
  const reduceMotion = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [band, setBand] = useState<string | null>(null);

  const device = browserTimezone();
  const stored = myTimezone?.timezone ?? null;
  const chosen = !!myTimezone?.chosenAt;
  const loading = myTimezone === null;

  const options = useMemo(() => buildZoneOptions(knownTimezones(), stored, device), [stored, device]);
  const shown = useMemo(() => filterZones(options, query), [options, query]);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const saveTimer = useRef<number | null>(null);
  // The latest values for handlers that outlive a render (timers, listeners).
  const live = useRef({ band, stored, chosen, shown });
  useEffect(() => {
    live.current = { band, stored, chosen, shown };
  });

  const describe = (message?: string) =>
    message === OFFLINE_MESSAGE ? OFFLINE_TZ : message ?? "Couldn't save your time zone. Try again.";

  const write = async (fn: () => Promise<{ ok: boolean; message?: string }>, revertBand: boolean) => {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) {
      setError(describe(r.message));
      // O2: the band goes back to the saved zone (the switch follows the
      // server state, so it reverts by itself).
      if (revertBand) setBand(live.current.stored);
    }
  };

  const saveBand = (zone: string | null) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (!zone || zone === live.current.stored) return;
    void write(() => pickTimezone(zone), true);
  };

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    []
  );

  const openPicker = () => {
    setError(null);
    setQuery("");
    setBand(stored ?? device ?? options[0]?.zone ?? null);
    setOpen(true);
  };

  const closePicker = (focusField = true) => {
    const { band: b, shown: list } = live.current;
    // Nothing to save while a search matches nothing (the band is hidden).
    const inList = !!b && list.some((o) => o.zone === b);
    setOpen(false);
    setQuery("");
    if (inList && b !== live.current.stored) saveBand(b);
    else if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (focusField) fieldRef.current?.focus();
  };
  const closeRef = useRef(closePicker);
  useEffect(() => {
    closeRef.current = closePicker;
  });

  // S3: Escape and a tap outside the field and panel close it too.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeRef.current(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    // S6: the whole panel, field to helper, in view.
    wrapRef.current?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    // Desktop only: on touch the keyboard would cover the wheel (OURS).
    if (window.matchMedia?.("(pointer: fine)").matches) searchRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, reduceMotion]);

  // S1: typing moves the band to the first match; nothing is saved by typing.
  const onQuery = (q: string) => {
    setQuery(q);
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const first = filterZones(options, q)[0];
    if (first) setBand(first.zone);
  };

  // S2: the user put a zone in the band: save once the wheel has settled.
  const onPick = (zone: string) => {
    setBand(zone);
    setError(null);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveBand(zone), SAVE_AFTER_SETTLE_MS);
  };

  const fieldZone = open ? band : stored;
  const fieldLabel = fieldZone ? zoneDisplay(fieldZone) : "Not set";
  const bandVisible = shown.length > 0;

  return (
    <>
      <div id="timezone" className={clsx(settingsRowClass, "!items-start")}>
        <span
          aria-hidden
          className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 bg-primary-pale text-primary-dark"
        >
          {/* MO1.8 #60: this section's glyph ink #7D6BB5 / #C3B3FB. */}
          <Clock size={17} strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          {/* The title sits centred on the 36 tile (MO1.8 #61: 1079.4 on a
              1070.9 tile); the field is 10 under the tile (#62). */}
          <div className="min-h-9 flex items-center">
            <span className="block text-[14px] font-semibold leading-[19px] text-charcoal">Time zone</span>
          </div>
          <span className="sr-only">
            Sets what counts as "today" for your streaks, meditation and cycle days, and when reminders are sent.
          </span>
          <div ref={wrapRef}>
            {loading ? (
              <div
                aria-busy
                aria-label="Time zone, loading"
                className="mt-2.5 h-11 rounded-xl bg-cream-card border-[0.5px] border-charcoal/[0.14] flex items-center px-3"
              >
                <span className="block h-3 w-[60%] rounded-md bg-cream-soft animate-skeleton-pulse" />
              </div>
            ) : (
              <button
                ref={fieldRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={`Time zone, ${fieldLabel}`}
                disabled={busy && !open}
                onClick={() => (open ? closePicker() : openPicker())}
                className={clsx(
                  "tap mt-2.5 w-full flex items-center gap-2 px-3 rounded-xl bg-cream-card border-[0.5px] text-start",
                  "outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
                  open ? "border-primary" : "border-charcoal/[0.14]"
                )}
                // 44, 46 under Larger text (MO1.8 O6).
                style={{ minHeight: linePx(44) }}
              >
                <Globe size={15} strokeWidth={1.75} aria-hidden className="shrink-0 text-charcoal-soft" />
                <span
                  className={clsx("flex-1 min-w-0 truncate font-semibold", fieldZone ? "text-charcoal" : "text-charcoal-faint")}
                  style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3) }}
                >
                  <bdi>{fieldLabel}</bdi>
                </span>
                {busy ? (
                  <Loader2 size={14} aria-hidden className="shrink-0 animate-spin text-charcoal-faint" />
                ) : open ? (
                  <ChevronUp size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-charcoal-faint" />
                ) : (
                  <ChevronDown size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-charcoal-faint" />
                )}
              </button>
            )}

            {open && (
              <div
                className="mt-2 p-2.5 rounded-[14px] bg-cream-card border-[0.5px] border-hair-08 overflow-hidden"
                style={reduceMotion ? undefined : { animation: "tz-panel-in 180ms var(--ease-base) both" }}
              >
                <style>{`@keyframes tz-panel-in { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 320px; } }`}</style>
                <label className="flex items-center gap-[7px] h-9 px-2.5 rounded-[10px] bg-cream-soft">
                  <Search size={14} strokeWidth={1.75} aria-hidden className="shrink-0 text-charcoal-faint" />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => onQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        closePicker();
                      }
                    }}
                    placeholder="Search city or zone"
                    aria-label="Search city or zone"
                    className="flex-1 min-w-0 bg-transparent outline-none text-charcoal placeholder:text-charcoal-faint caret-primary-dark [&::-webkit-search-cancel-button]:hidden"
                    style={{ fontSize: textPx(13), lineHeight: linePx(19.5) }}
                  />
                </label>
                <span className="sr-only" aria-live="polite">
                  {query ? `${shown.length} time zones` : ""}
                </span>
                <div className="mt-1.5">
                  {bandVisible ? (
                    <TimezoneWheel
                      options={shown}
                      value={band}
                      onPick={onPick}
                      onEnter={() => closePicker()}
                      onTypeAhead={(k) => {
                        onQuery(query + k);
                        searchRef.current?.focus();
                      }}
                      reduceMotion={reduceMotion}
                      label="Time zones"
                    />
                  ) : (
                    <p
                      className="flex items-center justify-center text-center text-charcoal-faint"
                      style={{ height: 150, fontSize: textPx(12.5), lineHeight: linePx(18.8) }}
                    >
                      No time zones match.
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <span
                role="alert"
                className="block mt-1.5 font-semibold text-status-high"
                style={{ fontSize: textPx(11), lineHeight: linePx(15) }}
              >
                {error}
              </span>
            )}
            <span
              role="status"
              className="block mt-1.5 text-charcoal-faint"
              style={{ fontSize: textPx(11), lineHeight: linePx(15) }}
            >
              {loading ? "" : chosen ? "Set by you. This device won't change it." : "Follows this device."}
            </span>
          </div>
        </div>
      </div>

      {/* MO1.8 #68â€“#73: its own switch row. On = follows the device
          (timezone_chosen_at null). Off keeps the current zone as set by you. */}
      <SettingsRow
        icon={Smartphone}
        iconTone="dark"
        title="Use device time zone"
        subtitle={
          <span className="block" style={{ fontSize: textPx(11), lineHeight: linePx(15) }}>
            {!device
              ? "This browser doesn't share its time zone."
              : chosen
                ? "Off while a zone is set by you"
                : `On Â· ${zoneCity(device)}`}
          </span>
        }
        toggle={{
          checked: !loading && !chosen,
          disabled: loading || busy || !device,
          label: "Use device time zone",
          onChange: (next) => {
            if (next) {
              if (open) {
                setOpen(false);
                setQuery("");
              }
              if (saveTimer.current) window.clearTimeout(saveTimer.current);
              void write(followDeviceZone, false);
            } else if (stored) {
              void write(() => pickTimezone(stored), false);
            }
          },
        }}
      />
    </>
  );
};
