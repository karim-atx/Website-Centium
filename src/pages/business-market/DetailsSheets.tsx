import { useState } from "react";
import { Square, SquareCheck } from "lucide-react";
import { useOnline } from "../../hooks/useOnline";
import { saveVenueDetails } from "../../services/business-market/listing";
import { AMENITY_KEYS, AMENITY_LABEL, FIRST_VISIT_MAX, cleanFirstVisit, type AmenityKey } from "../../services/business-market/listingLogic";
import { useMarket } from "./MarketContext";
import { lh, MLead, MPrimary, MSaveError, MSheet, MSoonNote, px } from "./kit";

// OURS-MA1-listing-details-sheets: Amenities and First visit, in the MA1
// sheet shell. B13 MK-02: the venue's gyms.amenities (the fixed keys of
// amenity_vocabulary(), in its order) and gyms.first_visit (up to 300). The
// write is a venue write (gyms_update_insider: the Venues permission). While
// the columns are absent (probe "pending") Save stays disabled with the
// pending note; nothing is stored on the device.

function useDetailsWrite() {
  const m = useMarket();
  const online = useOnline();
  const live = m.backend.details === "live" && !!m.venue;
  const allowed = m.can("venues");
  return { m, live, allowed, canSave: live && allowed && online };
}

function Blocked({ live, allowed, hasVenue }: { live: boolean; allowed: boolean; hasVenue: boolean }) {
  const { c } = useMarket();
  if (!live && hasVenue) return <MSoonNote c={c}>Saving this is coming soon.</MSoonNote>;
  if (!hasVenue) return <MSoonNote c={c}>Add a location first.</MSoonNote>;
  if (!allowed) return <MSoonNote c={c}>You need the Venues permission to change this. Ask the owner.</MSoonNote>;
  return null;
}

export function AmenitiesSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { m, live, allowed, canSave } = useDetailsWrite();
  const { c } = m;
  const [picked, setPicked] = useState<AmenityKey[]>(() => (m.details?.amenities ?? []) as AmenityKey[]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = (a: AmenityKey) => setPicked((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  const save = async () => {
    if (!m.venue || busy) return;
    setBusy(true);
    setError(null);
    const r = await saveVenueDetails(m.venue.gymId, { amenities: picked });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    m.setDetails(r.value);
    m.refreshStrength();
    onSaved();
  };
  return (
    <MSheet
      open={open}
      onClose={onClose}
      title="Amenities"
      footer={
        <>
          {error && <MSaveError c={c}>{error}</MSaveError>}
          <MPrimary c={c} disabled={!canSave || busy} onClick={() => void save()}>
            Save amenities
          </MPrimary>
          <Blocked live={live} allowed={allowed} hasVenue={!!m.venue} />
        </>
      }
    >
      <MLead c={c}>Shown on your listing so people know what to expect.</MLead>
      <div role="group" aria-label="Amenities">
        {AMENITY_KEYS.map((a) => {
          const on = picked.includes(a);
          return (
            <button
              key={a}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(a)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 8,
                padding: "9px 10px",
                marginTop: 6,
                border: `1px solid ${on ? c.optOn : c.option}`,
                background: on ? c.pale : c.raised,
                minHeight: 44,
                width: "100%",
                textAlign: "left",
                color: c.ink,
              }}
            >
              <span style={{ flex: 1, fontSize: px(13), fontWeight: 700 }}>{AMENITY_LABEL[a]}</span>
              <span style={{ display: "flex", color: on ? c.pDark : c.tert }}>{on ? <SquareCheck size={17} strokeWidth={2.4} aria-hidden /> : <Square size={17} strokeWidth={2.4} aria-hidden />}</span>
            </button>
          );
        })}
      </div>
    </MSheet>
  );
}

export function FirstVisitSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { m, live, allowed, canSave } = useDetailsWrite();
  const { c } = m;
  const [text, setText] = useState(() => m.details?.firstVisit ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!m.venue || busy) return;
    setBusy(true);
    setError(null);
    const r = await saveVenueDetails(m.venue.gymId, { firstVisit: cleanFirstVisit(text) });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    m.setDetails(r.value);
    m.refreshStrength();
    onSaved();
  };
  return (
    <MSheet
      open={open}
      onClose={onClose}
      title="First visit"
      footer={
        <>
          {error && <MSaveError c={c}>{error}</MSaveError>}
          <MPrimary c={c} disabled={!canSave || busy} onClick={() => void save()}>
            Save
          </MPrimary>
          <Blocked live={live} allowed={allowed} hasVenue={!!m.venue} />
        </>
      }
    >
      <MLead c={c}>Tell new clients what to bring and where to go.</MLead>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, FIRST_VISIT_MAX))}
        aria-label="First visit"
        maxLength={FIRST_VISIT_MAX}
        style={{
          width: "100%",
          minHeight: 120,
          borderRadius: 14,
          background: c.soft,
          border: `1.5px solid ${c.border}`,
          fontSize: px(14),
          lineHeight: lh(20),
          color: c.ink,
          padding: "12px 12px",
          boxSizing: "border-box",
          resize: "vertical",
          outline: "none",
        }}
      />
      <p style={{ fontSize: px(11), color: c.faint, textAlign: "right", marginTop: 4 }}>{`${text.length}/${FIRST_VISIT_MAX}`}</p>
    </MSheet>
  );
}
