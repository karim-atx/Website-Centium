import { lazy, Suspense, useState } from "react";
import { MapPin } from "lucide-react";
import { Toggle } from "../ui/Toggle";
import { Button } from "../ui/Button";
import { AreaPicker } from "../professionals/AreaPicker";
import { AREAS, type Area } from "../../services/geo/areas";
import { distanceKm, type Coords } from "../../services/geo/distance";
import { clearMapArea, setMapArea, type ProfessionalProfile } from "../../services/professional-profile";

const NearbyMap = lazy(() => import("../professionals/NearbyMap"));

/** The named area nearest a dropped pin, if one is within 5 km, as a default label. */
function nearestAreaName(c: Coords): string | null {
  let best: Area | null = null;
  let bestKm = Infinity;
  for (const a of AREAS) {
    const km = distanceKm(c, a);
    if (km < bestKm) {
      best = a;
      bestKm = km;
    }
  }
  return best && bestKm <= 5 ? best.name : null;
}

/**
 * "Show my area on the map" (Task F), in the professional's public listing.
 *
 * OFF BY DEFAULT, and off means no coordinates at all: turning it off calls
 * clear_approximate_location(), which always works and leaves the listing in
 * the directory. Turning it on asks for an area, from the list or by dropping
 * a pin, saved with set_approximate_location(). Only an approximate area is
 * ever stored or shown (two decimal places, about 1 km), never an address.
 */
export const MapAreaSection: React.FC<{
  mapArea: ProfessionalProfile["mapArea"];
  disabled: boolean;
  dark: boolean;
  onChanged: (next: ProfessionalProfile["mapArea"]) => void;
  /** ATX48: a date of birth is needed first; retry runs after it is saved. */
  onNeedsDob: (retry: () => void) => void;
}> = ({ mapArea, disabled, dark, onChanged, onNeedsDob }) => {
  const [choosing, setChoosing] = useState(false);
  const [mode, setMode] = useState<"list" | "pin">("list");
  const [pin, setPin] = useState<Coords | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const on = !!mapArea;

  const save = async (c: Coords, label: string | null) => {
    setBusy(true);
    setError(null);
    const r = await setMapArea(c.lat, c.lng, label);
    setBusy(false);
    if (!r.ok) {
      if (r.needsDob) onNeedsDob(() => void save(c, label));
      else setError(r.message);
      return;
    }
    onChanged(r.mapArea);
    setChoosing(false);
    setPin(null);
  };

  const turnOff = async () => {
    setBusy(true);
    setError(null);
    const r = await clearMapArea();
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onChanged(null);
    setChoosing(false);
  };

  return (
    <div className="pt-4 border-t border-charcoal/[0.08] flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-charcoal flex items-center gap-1.5">
            <MapPin size={14} className="text-charcoal-soft" /> Show my area on the map
          </p>
          <p className="text-[11px] text-charcoal-faint mt-0.5 leading-relaxed">
            {on
              ? `Clients see you near ${mapArea?.label ?? "your chosen area"}. Only an approximate area (about 1 km) is shown, never your address.`
              : "Off. Clients can still find you in the list. Only an approximate area (about 1 km) is ever shown."}
          </p>
        </div>
        <Toggle
          checked={on || choosing}
          disabled={disabled || busy}
          onChange={(v) => {
            if (v) {
              setError(null);
              setChoosing(true);
            } else if (on) void turnOff();
            else setChoosing(false);
          }}
          label="Show my area on the map"
        />
      </div>

      {on && !choosing && (
        <button
          type="button"
          onClick={() => setChoosing(true)}
          disabled={disabled || busy}
          className="tap self-start min-h-[44px] text-[13px] font-bold text-primary-deep-text disabled:opacity-50"
        >
          Change area
        </button>
      )}

      {choosing && (
        <div className="rounded-xl border border-charcoal/10 bg-cream-soft p-3 flex flex-col gap-3">
          <div role="group" aria-label="Choose your area by" className="grid grid-cols-2 gap-1.5">
            {(
              [
                { v: "list", label: "Pick from list" },
                { v: "pin", label: "Drop a pin" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                aria-pressed={mode === o.v}
                onClick={() => setMode(o.v)}
                className={`tap h-9 rounded-full text-[13px] font-bold ${
                  mode === o.v ? "bg-primary-fill text-on-primary-fill" : "bg-cream-card border border-charcoal/10 text-charcoal"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {mode === "list" ? (
            <div className="max-h-[320px] overflow-y-auto">
              <AreaPicker onPick={(a) => void save({ lat: a.lat, lng: a.lng }, a.name)} />
            </div>
          ) : (
            <>
              <p className="text-xs text-charcoal-soft">Tap the map near where you work. It's saved to about 1 km.</p>
              <Suspense fallback={<div className="h-[220px] rounded-xl bg-cream-card" />}>
                <NearbyMap
                  center={pin ?? (mapArea ? { lat: mapArea.lat, lng: mapArea.lng } : { lat: 33.89, lng: 35.5 })}
                  zoom={11}
                  dark={dark}
                  pick={{ value: pin, onPick: setPin }}
                  className="h-[220px] rounded-xl overflow-hidden border border-charcoal/10"
                  ariaLabel="Map for choosing your area. Tap to drop a pin, or pick from the list instead."
                />
              </Suspense>
              <Button size="sm" disabled={!pin || busy} onClick={() => pin && void save(pin, nearestAreaName(pin))}>
                {busy ? "Saving…" : pin ? `Use this area${nearestAreaName(pin) ? ` (near ${nearestAreaName(pin)})` : ""}` : "Tap the map first"}
              </Button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setChoosing(false);
              setPin(null);
            }}
            className="tap min-h-[40px] text-sm font-medium text-charcoal-soft"
          >
            Cancel
          </button>
        </div>
      )}

      {error && <p className="text-xs font-semibold text-status-high">{error}</p>}
    </div>
  );
};
