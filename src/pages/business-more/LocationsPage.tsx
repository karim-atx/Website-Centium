import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Clock, LocateFixed, MapPin, MapPinOff, Minus, Pencil, Phone, Plus, ScanLine, Search, Store, Trash2 } from "lucide-react";
import { BizButton, BizButtonSoft, BizConfirm, BizField, BizFieldButton, BizPage, BizRow, BizSection, BizSheet, LoadError, RowsSkeleton, SubHeader, LIST_BG } from "../../components/business-more/kit";
import { useBizToast } from "../../components/business-more/useBizToast";
import { useBusiness } from "../../components/business-more/useBusiness";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import { venueKindOf } from "../../components/business-more/kind";
import { useIsDark } from "../../hooks/useIsDark";
import { useOnline } from "../../hooks/useOnline";
import {
  addLocation,
  countUpcomingClasses,
  fetchLocations,
  removeLocation,
  updateEntryRules,
  updateLocation,
  ENTRY_AGE_MAX,
  ENTRY_AGE_MIN,
  GUEST_PASSES_MAX,
  type EntryRules,
  type BizLocation,
  type LocationDraft,
} from "../../services/business-more";
import { hoursLines, isoWeekdayIn } from "../../services/venues/hours";
import { fetchHoursTable } from "../../services/venues/console";
import type { GymHoursTableRow } from "../../services/venues/consoleLogic";
import { VenueHoursSheet } from "../../components/marketplace/VenueHoursSheet";
import { AREAS } from "../../services/geo/areas";
import type { Coords } from "../../services/geo/distance";

import { t, tn } from "../../i18n/core";

const NearbyMap = lazy(() => import("../../components/professionals/NearbyMap"));

// OURS-MO1B-locations + MO1B-045 to -049 · Locations and hours (BizMoreV8
// screen="locations" / "hours"). Each location is a venue row (gyms; B5 lets
// stores and wellness have one): its address, pin, phone and the opening
// hours, with the venue console (V6-54: Business Profile › Locations and
// hours for owners; never for stores, which edit hours here) as the detailed
// editor for hours, members and photos.
//
// THE PIN IS REQUIRED for a new location: gyms.lat / lng are NOT NULL and
// drive Explore's map. There is no geocoding service yet (BU6-14), so the
// address is typed and the map's search jumps to the app's own list of areas;
// reverse geocoding the pin into an address is BACKEND.

const VENUE_CONSOLE_KEY = "centium.venueConsole.selected";
const BEIRUT: Coords = { lat: 33.8938, lng: 35.5018 };

const emptyDraft: LocationDraft = { name: "", address: "", lat: null, lng: null, phone: "" };

export default function LocationsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { business, kind, kindKnown, loading: bizLoading, error: bizError } = useBusiness();
  // B7: staff reach this page too. A venue's details (gyms UPDATE) need
  // 'venues', its opening hours (gym_hours) need 'schedule'; adding or
  // removing a location stays the owner's (gyms INSERT / DELETE).
  const access = useConsoleAccess();
  const owner = access.isOwner || (!access.isStaff && !!business);
  const canEdit = owner || access.can("venues");
  const canHours = owner || access.can("schedule");
  const [toast, showToast] = useBizToast();
  const [locations, setLocations] = useState<BizLocation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const bizId = business?.id ?? null;
  useEffect(() => {
    if (!bizId) return;
    let cancelled = false;
    void fetchLocations(bizId).then((r) => {
      if (cancelled) return;
      if (!r.ok) setError(r.message);
      else {
        setError(null);
        setLocations(r.value);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [bizId, tick]);
  const reload = () => setTick((t) => t + 1);

  // ?edit=<id> or ?add=1 opens the sheet (from Business Profile's rows).
  const editId = params.get("edit");
  const adding = params.get("add") === "1";
  const editing = locations?.find((l) => l.id === editId) ?? null;
  const closeSheet = () => setParams({}, { replace: true });

  const openConsole = (gymId: string) => {
    try {
      localStorage.setItem(VENUE_CONSOLE_KEY, gymId);
    } catch {
      /* the console falls back to its first venue */
    }
    navigate("/app/business/venue");
  };

  // Neutral wording until the lane is known (useBusiness falls back to "store").
  const store = kindKnown && kind === "store";
  // V6-54: the venue console is never for stores (Wellness Service is a store
  // lane here, bizKindOf). A store edits its hours in place, with the same
  // hours sheet the console and Products › Listing use.
  const [storeHours, setStoreHours] = useState<{ loc: BizLocation; rows: GymHoursTableRow[] } | null>(null);
  const openHours = async (loc: BizLocation) => {
    if (!store) {
      openConsole(loc.id);
      return;
    }
    const r = await fetchHoursTable(loc.id);
    if (!r.ok) {
      showToast(r.message);
      return;
    }
    setStoreHours({ loc, rows: r.value });
  };
  const title = store ? t("Pickup and opening hours") : t("Locations and hours");
  const [entryFor, setEntryFor] = useState<BizLocation | null>(null);

  return (
    <BizPage title={title} sub={t("Clients see these on your listing.")}>
      {/* No business_profiles row yet: locations are saved under it, so the
          owner saves the profile first (the same gate as Listing and Offers). */}
      {!bizLoading && !bizError && !business ? (
        <BizSection>
          <BizRow icon={MapPin} title={t("Save your business profile first")} desc={t("Locations are saved under it.")} value={t("Set up")} onClick={() => navigate("/app/business/profile")} />
        </BizSection>
      ) : (
        <>
          {error && <LoadError onRetry={reload} />}
          {!locations && !error && <RowsSkeleton rows={3} />}
        </>
      )}
      {locations?.map((loc) => {
        const lines = hoursLines(loc.hours, isoWeekdayIn(loc.timezone));
        return (
          <BizSection key={loc.id} label={`${business?.name ?? t("Your business")} · ${loc.name}`}>
            <BizRow icon={MapPin} title={loc.address} desc={t("Pinned on the map")} value={canEdit ? t("Edit") : undefined} onClick={canEdit ? () => setParams({ edit: loc.id }, { replace: true }) : undefined} />
            {lines.length > 0 ? (
              lines.map((l) => <BizRow key={l.key} icon={Clock} title={l.label} value={l.value} onClick={canHours || !store ? () => void openHours(loc) : undefined} />)
            ) : (
              <BizRow icon={Clock} title={t("Opening hours")} desc={t("Not published yet")} value={canHours ? t("Add") : undefined} onClick={canHours || !store ? () => void openHours(loc) : undefined} />
            )}
            {/* B10 entry rules (OB-259's "Entry and check-in", after onboarding): gyms only, Venues permission. */}
            {loc.kind === "gym" && (
              <BizRow
                icon={ScanLine}
                title={t("Entry and check-in")}
                desc={entryLine(loc.entry)}
                value={canEdit ? t("Edit") : undefined}
                onClick={canEdit ? () => setEntryFor(loc) : undefined}
              />
            )}
            {/* V6-54: the venue console, for owners, from here; never for stores. */}
            {!store && <BizRow icon={Store} title={t("Venue console")} desc={t("Members, classes, hours & photos")} onClick={() => openConsole(loc.id)} />}
          </BizSection>
        );
      })}
      {locations && !owner && (
        <p className="text-[11.5px] leading-[16px] text-charcoal-faint text-center" style={{ margin: "4px 8px 16px" }}>
          {t("Only the owner can add or remove a location.")}
        </p>
      )}
      {locations && owner && (
        <BizSection>
          <BizRow icon={Plus} title={t("Add a location")} desc={t("Each location gets its own hours and classes")} onClick={() => setParams({ add: "1" }, { replace: true })} />
        </BizSection>
      )}

      {business && editing && canEdit && (
        <LocationSheet
          key={`e-${editing.id}`}
          mode="edit"
          location={editing}
          onClose={closeSheet}
          onOpenHours={() => void openHours(editing)}
          onSave={async (d) => {
            const r = await updateLocation(editing.id, d, editing.phones);
            if (!r.ok) return r.message;
            closeSheet();
            reload();
            showToast(t("Location updated."));
            return null;
          }}
          onRemove={!owner ? undefined : async () => {
            const r = await removeLocation(editing.id);
            if (!r.ok) return r.message;
            closeSheet();
            reload();
            showToast(t("{name} removed.", { name: editing.name }));
            return null;
          }}
          onViewClasses={() => navigate("/app/business/operations")}
          onToast={showToast}
        />
      )}
      {business && adding && owner && (
        <LocationSheet
          key="add"
          mode="add"
          location={null}
          onClose={closeSheet}
          onSave={async (d) => {
            const r = await addLocation(business.id, venueKindOf(business.type), d);
            if (!r.ok) return r.message;
            closeSheet();
            reload();
            showToast(t("{name} added. It shows on your listing.", { name: d.name.trim() }));
            return null;
          }}
          onToast={showToast}
        />
      )}
      {entryFor && canEdit && (
        <EntrySheet
          key={entryFor.id}
          location={entryFor}
          onClose={() => setEntryFor(null)}
          onSaved={() => {
            setEntryFor(null);
            reload();
            showToast(t("Entry and check-in updated."));
          }}
        />
      )}
      {storeHours && (
        <VenueHoursSheet
          open
          onClose={() => setStoreHours(null)}
          gymId={storeHours.loc.id}
          timezone={storeHours.loc.timezone}
          rows={storeHours.rows}
          zoneEditable={canEdit}
          onSaved={() => {
            setStoreHours(null);
            reload();
            showToast(t("Opening hours updated."));
          }}
        />
      )}
      {toast}
    </BizPage>
  );
}

// ---------------------------------------------------------------------------
// B10 venue settings: entry and check-in (OURS sheet; the controls and their
// words are OB-259's onboarding rows: "Front desk can check people in",
// "Minimum age" 16 to 21, "Guest passes a month" 0 to 10).

const entryLine = (e: EntryRules) =>
  `${t("{age} and over", { age: e.minEntryAge })} · ${tn(e.guestPassesPerMonth, "{n} guest pass a month", "{n} guest passes a month")} · ${e.frontDeskCheckIn ? t("Front desk check-in on") : t("Front desk check-in off")}`;

function EntrySheet({ location, onClose, onSaved }: { location: BizLocation; onClose: () => void; onSaved: () => void }) {
  const online = useOnline();
  const [v, setV] = useState<EntryRules>(location.entry);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = v.minEntryAge !== location.entry.minEntryAge || v.guestPassesPerMonth !== location.entry.guestPassesPerMonth || v.frontDeskCheckIn !== location.entry.frontDeskCheckIn;
  const save = async () => {
    setBusy(true);
    setError(null);
    const r = await updateEntryRules(location.id, v);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onSaved();
  };
  const stepper = (label: string, value: number, min: number, max: number, set: (n: number) => void) => (
    <div className="flex items-center justify-between gap-3" style={{ minHeight: 54, padding: "7px 14px" }}>
      <span className="text-[12.5px] leading-[17px] font-bold text-charcoal">{label}</span>
      <span className="inline-flex items-center gap-1">
        <button type="button" aria-label={t("Less: {label}", { label })} disabled={value <= min} onClick={() => set(value - 1)} className="tap w-9 h-9 rounded-[10px] flex items-center justify-center text-primary-dark disabled:opacity-30">
          <Minus size={15} strokeWidth={2.4} aria-hidden />
        </button>
        <span role="status" aria-label={`${label}, ${value}`} className="min-w-[28px] text-center text-[14px] font-extrabold text-charcoal tabular-nums">
          {value}
        </span>
        <button type="button" aria-label={t("More: {label}", { label })} disabled={value >= max} onClick={() => set(value + 1)} className="tap w-9 h-9 rounded-[10px] flex items-center justify-center text-primary-dark disabled:opacity-30">
          <Plus size={15} strokeWidth={2.4} aria-hidden />
        </button>
      </span>
    </div>
  );
  return (
    <BizSheet open onClose={onClose} title={t("Entry and check-in")} lead={t("How people come in at {name}.", { name: location.name })}>
      <div className={`rounded-[18px] ${LIST_BG}`} style={{ padding: "4px 0" }}>
        <BizRow title={t("Front desk can check people in")} toggle={{ checked: v.frontDeskCheckIn, onChange: (on) => setV({ ...v, frontDeskCheckIn: on }), label: t("Front desk can check people in") }} />
        {stepper(t("Minimum age"), v.minEntryAge, ENTRY_AGE_MIN, ENTRY_AGE_MAX, (n) => setV({ ...v, minEntryAge: n }))}
        {stepper(t("Guest passes a month"), v.guestPassesPerMonth, 0, GUEST_PASSES_MAX, (n) => setV({ ...v, guestPassesPerMonth: n }))}
      </div>
      {error && <p className="mt-3 text-[12px] leading-[17px] font-bold text-status-high">{error}</p>}
      <BizButton label={t("Save")} className="mt-4" onClick={() => void save()} disabled={!dirty || !online || busy} busy={busy} />
    </BizSheet>
  );
}

// ---------------------------------------------------------------------------
// The Edit / Add a location sheet (MO1B-045, OURS-MO1B-locations row 2)

function LocationSheet({
  mode,
  location,
  onClose,
  onSave,
  onRemove,
  onOpenHours,
  onViewClasses,
  onToast,
}: {
  mode: "edit" | "add";
  location: BizLocation | null;
  onClose: () => void;
  onSave: (d: LocationDraft) => Promise<string | null>;
  onRemove?: () => Promise<string | null>;
  onOpenHours?: () => void;
  onViewClasses?: () => void;
  onToast: (m: string) => void;
}) {
  const initial: LocationDraft = location
    ? { name: location.name, address: location.address, lat: location.lat, lng: location.lng, phone: location.phones[0] ?? "" }
    : emptyDraft;
  const [d, setD] = useState<LocationDraft>(initial);
  const [mapOpen, setMapOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [discardAsk, setDiscardAsk] = useState(false);
  const [blocked, setBlocked] = useState<number | null>(null);
  const [removeAsk, setRemoveAsk] = useState(false);

  const dirty = d.name !== initial.name || d.address !== initial.address || d.lat !== initial.lat || d.lng !== initial.lng || d.phone !== initial.phone;
  const tryClose = () => (dirty ? setDiscardAsk(true) : onClose());

  const hoursSummary = location
    ? hoursLines(location.hours, null)
        .slice(0, 2)
        .map((l) => `${l.label} ${l.value}`)
        .join(" · ") || t("Not published yet")
    : t("Set after you add it");

  const submit = async () => {
    if (mode === "add" && (!d.name.trim() || !d.address.trim() || d.lat === null)) {
      setMissing(true);
      return;
    }
    if (!d.name.trim() || !d.address.trim()) {
      setMissing(true);
      return;
    }
    setBusy(true);
    setError(null);
    const failed = await onSave(d);
    setBusy(false);
    if (failed) setError(failed);
  };

  const askRemove = async () => {
    if (!location || !onRemove) return;
    const n = await countUpcomingClasses(location.id);
    if (n.ok && n.value > 0) {
      setBlocked(n.value);
      return;
    }
    setRemoveAsk(true);
  };

  if (mapOpen) {
    return (
      <PinMap
        start={d.lat !== null && d.lng !== null ? { lat: d.lat, lng: d.lng } : null}
        query={d.address}
        onBack={() => setMapOpen(false)}
        onConfirm={(c) => {
          setD({ ...d, lat: c.lat, lng: c.lng });
          setMapOpen(false);
          setMissing(false);
          onToast(t("Pin placed."));
        }}
        onToast={onToast}
      />
    );
  }

  return (
    <BizSheet
      open
      onClose={tryClose}
      title={mode === "add" ? t("Add a location") : t("Edit location")}
      lead={missing ? t("Add a name and choose an address before saving.") : t("Type the address, or tap Pin to place it on the map.")}
      leadTone={missing ? "high" : "soft"}
    >
      <BizField id="loc-name" label={t("Location name")} value={d.name} onChange={(v) => setD({ ...d, name: v })} icon={Pencil} maxLength={80} />
      <BizField
        id="loc-address"
        label={t("Address")}
        value={d.address}
        onChange={(v) => setD({ ...d, address: v })}
        icon={Search}
        placeholder={t("Search an address")}
        autoComplete="street-address"
        after={
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            aria-label={t("Place the pin on the map")}
            className={`tap flex-1 min-w-0 flex items-center justify-center border-[1.5px] border-primary text-primary-dark text-[12.5px] font-extrabold ${LIST_BG}`}
            style={{ height: 46, borderRadius: 14, gap: 5 }}
          >
            <MapPin size={16} strokeWidth={2.2} aria-hidden />
            {t("Pin")}
          </button>
        }
      />
      {mode === "edit" && (
        <BizFieldButton id="loc-hours" label={t("Opening hours")} value={hoursSummary} icon={Clock} onClick={() => onOpenHours?.()} />
      )}
      <BizField id="loc-phone" label={t("Phone")} value={d.phone} onChange={(v) => setD({ ...d, phone: v })} icon={Phone} type="tel" inputMode="tel" autoComplete="tel" />
      {error && <p role="alert" className="text-[12px] font-bold text-status-high">{error}</p>}
      <BizButton label={mode === "add" ? t("Add location") : t("Save changes")} onClick={() => void submit()} busy={busy} disabled={mode === "edit" && !dirty} />
      {mode === "edit" && onRemove && <BizButtonSoft label={t("Remove location")} tone="high" onClick={() => void askRemove()} />}

      <BizConfirm
        open={discardAsk}
        icon={Trash2}
        title={t("Discard your changes?")}
        body={location?.name ? t("{name} keeps its current details.", { name: location.name }) : t("This location keeps its current details.")}
        action={t("Discard")}
        cancel={t("Keep editing")}
        onAction={() => {
          setDiscardAsk(false);
          onClose();
        }}
        onCancel={() => setDiscardAsk(false)}
      />
      <BizConfirm
        open={blocked !== null}
        icon={MapPinOff}
        title={location?.name ? t("You can't remove {name} yet", { name: location.name }) : t("You can't remove this location yet")}
        body={tn(blocked ?? 0, "{n} class is scheduled there in the next 30 days. Move or cancel them first, then remove the location.", "{n} classes are scheduled there in the next 30 days. Move or cancel them first, then remove the location.")}
        action={t("View those classes")}
        cancel={t("Close")}
        onAction={() => {
          setBlocked(null);
          onViewClasses?.();
        }}
        onCancel={() => setBlocked(null)}
      />
      <BizConfirm
        open={removeAsk}
        icon={Trash2}
        title={location?.name ? t("Remove {name}?", { name: location.name }) : t("Remove this location?")}
        body={t("It comes off your listing and the map.")}
        action={t("Remove location")}
        cancel={t("Keep it")}
        busy={busy}
        onAction={async () => {
          setBusy(true);
          const failed = await onRemove?.();
          setBusy(false);
          setRemoveAsk(false);
          if (failed) setError(failed);
        }}
        onCancel={() => setRemoveAsk(false)}
      />
    </BizSheet>
  );
}

// ---------------------------------------------------------------------------
// Place the pin (MO1B-047): a fixed centre pin over a real map that moves.

function PinMap({
  start,
  query,
  onBack,
  onConfirm,
  onToast,
}: {
  start: Coords | null;
  query: string;
  onBack: () => void;
  onConfirm: (c: Coords) => void;
  onToast: (m: string) => void;
}) {
  const dark = useIsDark();
  const online = useOnline();
  const [center, setCenter] = useState<Coords>(start ?? BEIRUT);
  const [view, setView] = useState<Coords>(start ?? BEIRUT);
  const [q, setQ] = useState(query);
  const [typed, setTyped] = useState(false);
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t || !typed) return [];
    return AREAS.filter((a) => a.name.toLowerCase().includes(t) || t.includes(a.name.toLowerCase().split(" ")[0])).slice(0, 4);
  }, [q, typed]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      onToast(t("Location is blocked in your browser settings."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setCenter({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => onToast(t("Location is blocked in your browser settings."))
    );
  }, [onToast]);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-cream" style={{ padding: "24px calc(var(--app-gutter, 0px) + 16px) 40px" }}>
      <div className="mx-auto max-w-[430px]">
        <SubHeader title={t("Place the pin")} sub={t("Drag the map so the pin sits on your entrance.")} onBack={onBack} />
        <div className="relative overflow-hidden" style={{ height: 460, borderRadius: 18, marginBottom: 12, background: dark ? "#1E2228" : "#EEF1EC" }}>
          {online ? (
            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><span className="block w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-label={t("Loading the map")} /></div>}>
              <div className="absolute inset-0">
                <NearbyMap center={center} zoom={16} dark={dark} onViewChange={(c) => setView(c)} className="h-full" ariaLabel={t("Map. Move it so the pin sits on your entrance.")} />
              </div>
            </Suspense>
          ) : (
            <p className="absolute inset-0 flex items-center justify-center text-center text-[12.5px] font-bold text-charcoal-faint" style={{ padding: 24 }}>
              {t("You're offline. Type the address instead.")}
            </p>
          )}
          {online && (
            <>
              {/* The fixed pin: map-pin 40 / 2, bottom-centre on the map centre, with its shadow ellipse. */}
              <span aria-hidden className="pointer-events-none absolute flex flex-col items-center text-primary-dark" style={{ left: "50%", top: "50%", transform: "translate(-50%,-100%)", zIndex: 2 }}>
                <MapPin size={40} strokeWidth={2} />
              </span>
              <span aria-hidden className="pointer-events-none absolute rounded-full" style={{ left: "50%", top: "50%", width: 10, height: 4, background: "rgba(0,0,0,0.25)", transform: "translate(-50%,-1px)", zIndex: 2 }} />
              <div className="absolute" style={{ insetInlineStart: 12, insetInlineEnd: 68, top: 12, zIndex: 3 }}>
                <label className="flex items-center bg-cream-card text-charcoal-soft" style={{ height: 44, borderRadius: 14, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", padding: "0 12px", gap: 8 }}>
                  <Search size={16} aria-hidden />
                  <input value={q} onChange={(e) => { setQ(e.target.value); setTyped(true); }} aria-label={t("Search an area")} placeholder={t("Search an area")} className="flex-1 min-w-0 bg-transparent outline-none text-[13px] font-semibold text-charcoal placeholder:text-charcoal-faint" />
                </label>
                {matches.length > 0 && (
                  <div className="mt-1 bg-cream-card overflow-hidden" style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
                    {matches.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setCenter({ lat: a.lat, lng: a.lng });
                          setQ("");
                        }}
                        className="tap block w-full text-start text-[12.5px] font-semibold text-charcoal"
                        style={{ padding: "10px 12px" }}
                      >
                        {a.name}, {a.region}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={locate}
                aria-label={t("Use current location")}
                className="tap absolute flex items-center justify-center rounded-full bg-cream-card text-primary-dark"
                // Bottom 34 (frame 12) so the map's credit line stays readable under it.
                style={{ insetInlineEnd: 12, bottom: 34, width: 44, height: 44, boxShadow: "0 4px 12px rgba(0,0,0,0.18)", zIndex: 3 }}
              >
                <LocateFixed size={20} strokeWidth={2} aria-hidden />
              </button>
            </>
          )}
        </div>
        <p className="flex items-center text-[12.5px] font-bold text-charcoal" style={{ gap: 6, margin: "-2px 0 12px" }}>
          <MapPin size={14} aria-hidden className="text-primary-dark shrink-0" />
          {query.trim() || `${view.lat.toFixed(4)}, ${view.lng.toFixed(4)}`}
        </p>
        <BizButton label={t("Confirm pin")} disabled={!online} onClick={() => onConfirm(view)} />
      </div>
    </div>
  );
}
