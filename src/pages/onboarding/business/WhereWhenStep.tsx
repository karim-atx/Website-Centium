import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Clock, Copy, LocateFixed, MapPin, Plus, Search, X } from "lucide-react";
import { Toggle } from "../../../components/ui/Toggle";
import { useIsDark } from "../../../hooks/useIsDark";
import { BizFrame } from "./BizFrame";
import { BizField, BizLink } from "./ui";
import { ObSectionLabel, ObToast, useObToast } from "../shell";
import type { BizFlowKey } from "./bizLanes";
import {
  copyMondayToWeekdays,
  DAY_SHORT_MON,
  fixCountLine,
  fmt12,
  whereErrors,
  type Area,
  type DayHours,
  type Location,
} from "./lanes";
import type { LaneStepProps } from "./laneTypes";
import { t } from "../../../i18n/core";

const NearbyMap = lazy(() => import("../../../components/professionals/NearbyMap"));

// OB-221 / 253 / 284 (+ 223 opening time wheel, 255 place the pin, 256 / 286
// pin placed, 316 arrives): Step 2 · Where and when.

const DEFAULT_CENTER = { lat: 33.89, lng: 35.5 };

/** The address field's help line. */
const pinHelp = (loc: Location) => (loc.lat != null ? t("Pinned on the map") : t("Type the address, or tap Pin to drop it on the map."));

type PinTarget = { kind: "main" } | { kind: "extra"; index: number };

export const WhereWhenStep: React.FC<LaneStepProps> = ({ biz, setBiz, flowKey, onContinue, onBack, saveExit, save }) => {
  const lane = biz.lane ?? "gym";
  const [showErrors, setShowErrors] = useState(false);
  const [wheel, setWheel] = useState<{ scope: "main" | number; weekday: number; which: "opens" | "closes" } | null>(null);
  const [pinFor, setPinFor] = useState<PinTarget | null>(null);
  const [toast, setToast] = useObToast();
  const errors = whereErrors(biz.location, biz.hours);
  const errorCount = Object.keys(errors).length;
  const shown = showErrors ? errors : {};


  const setHours = (scope: "main" | number, f: (h: DayHours[]) => DayHours[]) =>
    setBiz((b) =>
      scope === "main" ? { ...b, hours: f(b.hours) } : { ...b, areas: b.areas.map((a, i) => (i === scope ? { ...a, hours: f(a.hours) } : a)) }
    );

  if (pinFor) {
    const loc = pinFor.kind === "main" ? biz.location : biz.extraLocations[pinFor.index];
    return (
      <PlacePin
        step={flowKey}
        lane={lane}
        initial={loc}
        onBack={() => setPinFor(null)}
        onConfirm={(c) => {
          setBiz((b) =>
            pinFor.kind === "main"
              ? { ...b, location: { ...b.location, ...c } }
              : { ...b, extraLocations: b.extraLocations.map((l, i) => (i === pinFor.index ? { ...l, ...c } : l)) }
          );
          setPinFor(null);
          // OURS wording: there is no geocoder, so the typed address is kept ("Address updated." would not be true).
          setToast(t("Pin placed."));
        }}
      />
    );
  }

  return (
    <BizFrame
      step={flowKey}
      lane={lane}
      title={t("Where and when")}
      subtitle={lane === "store" ? t("Clients pick up here and see when you're open.") : t("Clients use this to find you and plan their visit.")}
      onBack={onBack}
      saveExit={saveExit}
      footer={{
        label: save.error && !save.offline ? t("Try again") : t("Continue"),
        onClick: () => {
          if (errorCount) {
            setShowErrors(true);
            return;
          }
          onContinue();
        },
        disabled: showErrors && errorCount > 0,
        busy: save.busy,
        error: showErrors && errorCount ? fixCountLine(errorCount) : save.error ?? undefined,
        errorTone: save.offline ? "info" : "error",
      }}
      // BizOnboardingV10 toastB: footer height + 8 (34 + 12 + 52 + 8).
      overlay={<ObToast message={toast} bottom={106} />}
    >
      <ObSectionLabel title={t("Address")} tag={t("Required")} tagTone="accent" margin="0 2px 12px" />
      <BizField
        ariaLabel={t("Address")}
        value={biz.location.address}
        onChange={(v) => setBiz((b) => ({ ...b, location: { ...b.location, address: v } }))}
        placeholder={t("Street, building, area")} /* OURS */
        leading={<Search size={16} aria-hidden />}
        pin={{ onClick: () => setPinFor({ kind: "main" }) }}
        autoComplete="street-address"
        error={shown.address}
        help={pinHelp(biz.location)}
      />
      {biz.extraLocations.map((loc, i) => (
        <BizField
          key={i}
          ariaLabel={t("Location {n} address", { n: i + 2 })}
          value={loc.address}
          onChange={(v) => setBiz((b) => ({ ...b, extraLocations: b.extraLocations.map((l, j) => (j === i ? { ...l, address: v } : l)) }))}
          placeholder={t("Street, building, area")}
          leading={<Search size={16} aria-hidden />}
          trailing={
            <button
              type="button"
              aria-label={t("Remove location {n}", { n: i + 2 })}
              onClick={() => setBiz((b) => ({ ...b, extraLocations: b.extraLocations.filter((_, j) => j !== i) }))}
              className="tap text-charcoal-faint"
            >
              <X size={16} strokeWidth={2} aria-hidden />
            </button>
          }
          pin={{ onClick: () => setPinFor({ kind: "extra", index: i }) }}
          help={pinHelp(loc)}
        />
      ))}
      <BizLink
        icon={Plus}
        text={t("Add another location")}
        onClick={() => setBiz((b) => ({ ...b, extraLocations: [...b.extraLocations, { address: "", lat: null, lng: null }] }))}
      />
      <ObSectionLabel title={lane === "store" ? t("Pickup and opening hours") : t("Opening hours")} tag={t("Required")} tagTone="accent" />
      {shown.hours && (
        <p role="alert" className="-mt-1 mb-2 mx-[2px] text-[11.5px] font-semibold text-status-high">
          {shown.hours}
        </p>
      )}
      <HoursList
        hours={biz.hours}
        open={wheel && wheel.scope === "main" ? wheel : null}
        onOpenWheel={(weekday, which) => setWheel(wheel && wheel.scope === "main" && wheel.weekday === weekday && wheel.which === which ? null : { scope: "main", weekday, which })}
        onCloseWheel={() => setWheel(null)}
        onChange={(f) => setHours("main", f)}
      />
      <BizLink icon={Copy} text={t("Copy Monday to all weekdays")} onClick={() => setHours("main", copyMondayToWeekdays)} className="mx-[2px] mb-3" />
      {lane === "gym" && (
        <>
          {biz.areas.map((a, ai) => (
            <AreaBlock
              key={ai}
              area={a}
              index={ai}
              wheel={wheel && wheel.scope === ai ? wheel : null}
              onWheel={(weekday, which) => setWheel(wheel && wheel.scope === ai && wheel.weekday === weekday && wheel.which === which ? null : { scope: ai, weekday, which })}
              onCloseWheel={() => setWheel(null)}
              onName={(v) => setBiz((b) => ({ ...b, areas: b.areas.map((x, i) => (i === ai ? { ...x, name: v.slice(0, 40) } : x)) }))}
              onHours={(f) => setHours(ai, f)}
              onRemove={() => setBiz((b) => ({ ...b, areas: b.areas.filter((_, i) => i !== ai) }))}
            />
          ))}
          <BizLink
            icon={biz.areas.length ? Plus : Clock}
            text={biz.areas.length ? t("Add an area") : t("Some areas keep different hours")}
            onClick={() => setBiz((b) => ({ ...b, areas: [...b.areas, { name: "", hours: b.hours.map((h) => ({ ...h })) }] }))}
            className="mx-[2px] mb-3"
          />
        </>
      )}
    </BizFrame>
  );
};

const AreaBlock: React.FC<{
  area: Area;
  index: number;
  wheel: { weekday: number; which: "opens" | "closes" } | null;
  onWheel: (weekday: number, which: "opens" | "closes") => void;
  onCloseWheel: () => void;
  onName: (v: string) => void;
  onHours: (f: (h: DayHours[]) => DayHours[]) => void;
  onRemove: () => void;
}> = ({ area, index, wheel, onWheel, onCloseWheel, onName, onHours, onRemove }) => (
  <div className="mt-2">
    <BizField
      label={t("Area name")}
      value={area.name}
      onChange={onName}
      placeholder={t("e.g. Pool")} /* OURS */
      maxLength={40}
      trailing={
        <button type="button" aria-label={t("Remove area {n}", { n: index + 1 })} onClick={onRemove} className="tap text-charcoal-faint">
          <X size={16} strokeWidth={2} aria-hidden />
        </button>
      }
    />
    <HoursList hours={area.hours} open={wheel} onOpenWheel={onWheel} onCloseWheel={onCloseWheel} onChange={onHours} label={area.name || t("Area {n}", { n: index + 1 })} />
  </div>
);

/** Opening hours (isHours): rows Mon-Sun, open/close buttons, 42×26 switches, the wheel card under the field. */
const HoursList: React.FC<{
  hours: DayHours[];
  open: { weekday: number; which: "opens" | "closes" } | null;
  onOpenWheel: (weekday: number, which: "opens" | "closes") => void;
  onCloseWheel: () => void;
  onChange: (f: (h: DayHours[]) => DayHours[]) => void;
  label?: string;
}> = ({ hours, open, onOpenWheel, onCloseWheel, onChange, label }) => (
  <div className="bg-list rounded-[18px] py-1 px-[10px] mb-[10px]" role="group" aria-label={label ? t("{label} hours", { label }) : t("Opening hours")}>
    {hours.map((h, i) => {
      const day = t(DAY_SHORT_MON[h.weekday - 1]);
      const sel = open?.weekday === h.weekday ? open.which : null;
      const btn = (which: "opens" | "closes") => (
        <button
          type="button"
          aria-label={which === "opens" ? t("Opens on {day}", { day }) : t("Closes on {day}", { day })}
          aria-expanded={sel === which}
          disabled={!h.open}
          onClick={() => onOpenWheel(h.weekday, which)}
          className={clsx(
            "flex-1 min-w-0 h-[38px] rounded-[12px] border-[1.5px] border-solid flex items-center justify-center whitespace-nowrap text-[12px] font-bold tabular-nums box-border",
            sel === which ? "bg-primary-pale border-primary-fill text-primary-deep-text" : "bg-cream-card border-hair-11 text-charcoal"
          )}
        >
          {h.open ? fmt12(which === "opens" ? h.opens : h.closes) : t("Closed")}
        </button>
      );
      return (
        <div key={h.weekday} className="relative" style={{ zIndex: sel ? 4 : 1 }}>
          <div className="grid items-center gap-2 py-[7px]" style={{ gridTemplateColumns: "30px minmax(0,1fr) 42px", borderTop: i ? "1px solid var(--list-rule)" : "none" }}>
            <span className="text-[12.5px] font-extrabold text-charcoal">{day}</span>
            <span className="flex items-center gap-1 min-w-0" style={{ opacity: h.open ? 1 : 0.5 }}>
              {btn("opens")}
              <span className="text-charcoal-faint text-[11px] shrink-0">{t("to")}</span>
              {btn("closes")}
            </span>
            <Toggle
              size="business"
              knobShadow={false}
              checked={h.open}
              label={t("Open on {day}", { day })}
              onChange={(v) => onChange((all) => all.map((x) => (x.weekday === h.weekday ? { ...x, open: v } : x)))}
            />
          </div>
          {sel && (
            <TimeWheelCard
              label={sel === "opens" ? t("Opening time, {day}", { day }) : t("Closing time, {day}", { day })}
              value={sel === "opens" ? h.opens : h.closes}
              left={sel === "opens" ? 36 : undefined}
              onChange={(v) => onChange((all) => all.map((x) => (x.weekday === h.weekday ? { ...x, [sel]: v } : x)))}
              onDone={onCloseWheel}
            />
          )}
        </div>
      );
    })}
  </div>
);

const HOURS12 = ["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
const MINS = ["00", "15", "30", "45"];
const ROW = 26;

/**
 * The opening-time wheel (OB-223): a 176-wide card under the field, three
 * columns (hour, minute, AM/PM) on a soft well with the card-coloured band,
 * 26px rows (selected 16/800 ink, others 13/600 faint, the outer pair 45%),
 * and Done. Scroll, tap a row, or use the arrow keys.
 */
const TimeWheelCard: React.FC<{ label: string; value: string; left?: number; onChange: (v: string) => void; onDone: () => void }> = ({
  label,
  value,
  left,
  onChange,
  onDone,
}) => {
  const [H, M] = value.split(":").map(Number);
  const hi = H % 12;
  const mi = Math.max(0, MINS.indexOf(String(M).padStart(2, "0")));
  const pm = H >= 12;
  const set = (h12: number, m: number, isPm: boolean) => {
    const h24 = (h12 % 12) + (isPm ? 12 : 0);
    onChange(`${String(h24).padStart(2, "0")}:${MINS[m]}`);
  };
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[data-col]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDone]);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className="absolute top-[46px] w-[176px] z-[5] bg-cream-card rounded-[14px] p-2"
      style={{ left: left ?? undefined, right: left === undefined ? 52 : undefined, border: "1px solid var(--menu-border)", boxShadow: "var(--shadow-menu)" }}
    >
      <div className="relative rounded-[10px] bg-cream-soft py-1 px-[6px] grid grid-cols-3 gap-[2px]">
        <span aria-hidden className="absolute start-1 end-1 top-1/2 h-8 -translate-y-1/2 rounded-[9px] bg-cream-card" style={{ boxShadow: "0 1px 3px rgba(36,31,27,0.08)" }} />
        <WheelCol label={t("Hour")} items={HOURS12} index={hi} loop onPick={(i) => set(i, mi, pm)} />
        <WheelCol label={t("Minutes")} items={MINS} index={mi} loop onPick={(i) => set(hi, i, pm)} />
        <WheelCol label={t("AM or PM")} items={[t("AM"), t("PM")]} index={pm ? 1 : 0} onPick={(i) => set(hi, mi, i === 1)} />
      </div>
      <button type="button" onClick={onDone} className="mt-2 w-full h-9 rounded-[10px] bg-primary-fill text-on-primary-fill flex items-center justify-center text-[12.5px] font-extrabold">
        {t("Done")}
      </button>
    </div>
  );
};

const WheelCol: React.FC<{ label: string; items: string[]; index: number; loop?: boolean; onPick: (i: number) => void }> = ({ label, items, index, loop, onPick }) => {
  const n = items.length;
  const at = (d: number) => (loop ? items[(index + d + n) % n] : items[index + d] ?? "");
  const step = (d: number) => {
    const next = loop ? (index + d + n) % n : Math.min(n - 1, Math.max(0, index + d));
    if (next !== index) onPick(next);
  };
  const wheelAcc = useRef(0);
  return (
    <div
      data-col
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuetext={items[index]}
      aria-valuenow={index}
      aria-valuemin={0}
      aria-valuemax={n - 1}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          step(-1);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          step(1);
        }
      }}
      onWheel={(e) => {
        wheelAcc.current += e.deltaY;
        if (Math.abs(wheelAcc.current) >= ROW) {
          step(wheelAcc.current > 0 ? 1 : -1);
          wheelAcc.current = 0;
        }
      }}
      onTouchStart={(e) => {
        (e.currentTarget as HTMLElement).dataset.y = String(e.touches[0].clientY);
      }}
      onTouchMove={(e) => {
        const el = e.currentTarget as HTMLElement;
        const y0 = Number(el.dataset.y);
        const dy = e.touches[0].clientY - y0;
        if (Math.abs(dy) >= ROW) {
          step(dy < 0 ? 1 : -1);
          el.dataset.y = String(e.touches[0].clientY);
        }
      }}
      className="relative flex flex-col items-center outline-none rounded-[9px] focus-visible:ring-2 focus-visible:ring-brand-c touch-none"
    >
      {[-2, -1, 0, 1, 2].map((d) => {
        const v = at(d);
        return (
          <button
            key={d}
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => d !== 0 && v && step(d)}
            className={clsx("h-[26px] flex items-center tabular-nums", d ? "text-[13px] font-semibold text-charcoal-faint" : "text-[16px] font-extrabold text-charcoal")}
            style={{ opacity: !v ? 0 : Math.abs(d) === 2 ? 0.45 : 1 }}
          >
            {v || " "}
          </button>
        );
      })}
    </div>
  );
};

/** OB-255 / 256: Place the pin. The map moves under a centred pin. */
const PlacePin: React.FC<{
  step: BizFlowKey;
  lane: LaneStepProps["biz"]["lane"];
  initial: Location;
  onBack: () => void;
  onConfirm: (c: { lat: number; lng: number }) => void;
}> = ({ step, lane, initial, onBack, onConfirm }) => {
  const dark = useIsDark();
  const [center, setCenter] = useState(initial.lat != null && initial.lng != null ? { lat: initial.lat, lng: initial.lng } : DEFAULT_CENTER);
  const [view, setView] = useState(center);
  const [locError, setLocError] = useState<string | null>(null);
  const locate = () => {
    if (!navigator.geolocation) {
      setLocError(t("Location isn't available on this device.")); // OURS
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setCenter(c);
        setView(c);
        setLocError(null);
      },
      () => setLocError(t("Allow location to use where you are, or move the map.")), // OURS
      { timeout: 10000 }
    );
  };
  return (
    <BizFrame
      step={step}
      lane={lane}
      title={t("Place the pin")}
      subtitle={t("Drag the map so the pin sits on your entrance.")}
      onBack={onBack}
      saveExit={false}
      footer={{ label: t("Confirm pin"), onClick: () => onConfirm({ lat: Number(view.lat.toFixed(6)), lng: Number(view.lng.toFixed(6)) }) }}
    >
      <div className="relative h-[420px] rounded-[20px] overflow-hidden mb-3 bg-cream-soft">
        <Suspense fallback={<div className="absolute inset-0 bg-cream-soft" />}>
          <div className="absolute inset-0">
            <NearbyMap center={center} zoom={16} dark={dark} onViewChange={(c) => setView(c)} ariaLabel={t("Map. Drag to move the pin onto your entrance.")} className="h-full w-full" hideControls />
          </div>
        </Suspense>
        <span className="absolute left-1/2 top-1/2 flex text-brand-c pointer-events-none" style={{ transform: "translate(-50%,-100%)" }}>
          <MapPin size={40} strokeWidth={2} aria-hidden />
        </span>
        <span className="absolute left-1/2 top-1/2 w-[10px] h-1 rounded-full pointer-events-none" style={{ background: "rgba(0,0,0,0.25)", transform: "translate(-50%,-1px)" }} />
        <button
          type="button"
          aria-label={t("Use current location")}
          onClick={locate}
          className="absolute end-3 bottom-3 w-11 h-11 rounded-full bg-cream-card flex items-center justify-center text-primary-dark"
          // 12 from the edge as drawn, lifted above the map's credit line (it must stay visible).
          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.18)", bottom: 30 }}
        >
          <LocateFixed size={20} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <p className="text-[13px] font-bold -mt-[2px] mb-3 flex gap-[6px] items-center text-charcoal">
        <MapPin size={14} className="text-primary-dark shrink-0" aria-hidden />
        {initial.address.trim() || `${view.lat.toFixed(5)}, ${view.lng.toFixed(5)}`}
      </p>
      {locError && <p role="alert" className="text-[11.5px] font-semibold text-status-high">{locError}</p>}
    </BizFrame>
  );
};

