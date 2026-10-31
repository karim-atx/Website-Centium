import { useState } from "react";
import { Square, SquareCheck } from "lucide-react";
import { useOnline } from "../../hooks/useOnline";
import { saveVenueDetails } from "../../services/business-market/listing";
import { AMENITY_KEYS, AMENITY_LABEL, FIRST_VISIT_MAX, cleanFirstVisit, type AmenityKey } from "../../services/business-market/listingLogic";
import { useMarket } from "./MarketContext";
import { MasterSheet, PrimaryButton, SaveError, SheetBox, SoonNote, fieldStyle, lh, px, useMarketColors } from "./listingParts";

// The Listing strength's Amenities and First visit sheets (KEPT, PLAN §3.4),
// in the handover's MasterBottomSheet chrome: a lead line 12.5 / 18 --ink2,
// the choices as 52-tall radius 14 --sgrey rows (the B-MA.2 Item photo row),
// the selected one on --pale with a 1.5px --fill border; the text in an
// --sgrey field box; Save pinned in the footer. B13 MK-02: the venue's
// gyms.amenities (the fixed keys of amenity_vocabulary(), in its order) and
// gyms.first_visit (up to 300). The write is a venue write (gyms_update_
// insider: the Venues permission). While the columns are absent (probe
// "pending") Save stays disabled with the pending note; nothing is stored on
// the device.

function useDetailsWrite() {
  const m = useMarket();
  const online = useOnline();
  const live = m.backend.details === "live" && !!m.venue;
  const allowed = m.can("venues");
  return { m, live, allowed, canSave: live && allowed && online };
}

function Blocked({ live, allowed, hasVenue }: { live: boolean; allowed: boolean; hasVenue: boolean }) {
  if (!live && hasVenue) return <SoonNote>Saving this is coming soon.</SoonNote>;
  if (!hasVenue) return <SoonNote>Add a location first.</SoonNote>;
  if (!allowed) return <SoonNote>You need the Venues permission to change this. Ask the owner.</SoonNote>;
  return null;
}

function Lead({ children }: { children: React.ReactNode }) {
  const c = useMarketColors();
  return <p style={{ fontSize: px(12.5), color: c.ink2, lineHeight: lh(18), marginBottom: 12, textWrap: "pretty" } as React.CSSProperties}>{children}</p>;
}

export function AmenitiesSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { m, live, allowed, canSave } = useDetailsWrite();
  const c = useMarketColors();
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
    <MasterSheet
      open={open}
      onClose={onClose}
      title="Amenities"
      footer={
        <>
          {error && <SaveError style={{ marginTop: 0, marginBottom: 8 }}>{error}</SaveError>}
          <PrimaryButton disabled={!canSave} busy={busy} onClick={() => void save()}>
            Save amenities
          </PrimaryButton>
          <Blocked live={live} allowed={allowed} hasVenue={!!m.venue} />
        </>
      }
    >
      <Lead>Shown on your listing so people know what to expect.</Lead>
      <div role="group" aria-label="Amenities" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {AMENITY_KEYS.map((a) => {
          const on = picked.includes(a);
          return (
            <button
              key={a}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(a)}
              className="market-focus"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderRadius: 14,
                padding: "0 14px",
                border: `1.5px solid ${on ? c.fill : "transparent"}`,
                background: on ? c.pale : c.sgrey,
                minHeight: 52,
                width: "100%",
                boxSizing: "border-box",
                textAlign: "start",
                color: c.ink,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              <span style={{ flex: 1, fontSize: px(14), fontWeight: 600 }}>{AMENITY_LABEL[a]}</span>
              <span style={{ display: "flex", color: on ? c.pdark : c.tert }}>{on ? <SquareCheck size={18} strokeWidth={2.2} aria-hidden /> : <Square size={18} strokeWidth={2.2} aria-hidden />}</span>
            </button>
          );
        })}
      </div>
    </MasterSheet>
  );
}

export function FirstVisitSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { m, live, allowed, canSave } = useDetailsWrite();
  const c = useMarketColors();
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
    <MasterSheet
      open={open}
      onClose={onClose}
      title="First visit"
      footer={
        <>
          {error && <SaveError style={{ marginTop: 0, marginBottom: 8 }}>{error}</SaveError>}
          <PrimaryButton disabled={!canSave} busy={busy} onClick={() => void save()}>
            Save
          </PrimaryButton>
          <Blocked live={live} allowed={allowed} hasVenue={!!m.venue} />
        </>
      }
    >
      <Lead>Tell new clients what to bring and where to go.</Lead>
      <SheetBox label="What to bring, first visit" htmlFor="first-visit-text">
        <textarea
          id="first-visit-text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, FIRST_VISIT_MAX))}
          maxLength={FIRST_VISIT_MAX}
          style={{ ...fieldStyle(c), minHeight: 120, resize: "vertical" }}
        />
        <p style={{ fontSize: px(11.5), color: c.faint, textAlign: "end", marginTop: 6 }}>{`${text.length}/${FIRST_VISIT_MAX}`}</p>
      </SheetBox>
    </MasterSheet>
  );
}
