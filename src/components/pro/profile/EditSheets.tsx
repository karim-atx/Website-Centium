import React, { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { FieldInput } from "../calendar/calendarFields";
import { useApp } from "../../../context/AppContext";
import { fetchMyProfile, saveMyProfile } from "../../../services/professional-profile";
import { saveRates, saveSpecialties } from "../../../services/pro/profile";
import { MAX_SPECIALTIES, MORE_SPECIALTIES, SPECIALTIES, proKindOf } from "../../../pages/onboarding/pro/proModel";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { CtaButton, ErrorLine } from "./kit";

// Release 3 · W6 MO14's own sheets beyond the CV's:
// - SpecialtiesSheet: professional_profiles.specialties (up to 5), chosen from
//   the onboarding specialty list (proModel SPECIALTIES + MORE_SPECIALTIES;
//   FINAL_PLAN section 3: specialties are data). Chips as MO4 draws them
//   (more.js credentials): pad 7 13, r9999, 12 / 700; chosen fill / onFill
//   with an X 12 / 2.4, the rest 1 px 11% border, 12 / 600 text.soft.
// - ListingDetailsSheet: the listing fields PublicListingSheet carried
//   (specialty, location, website, Instagram, Facebook, X), written with
//   saveMyProfile (only the keys sent). The listing switch itself is Settings ›
//   Practice › Public listing.

export const SpecialtyChip: React.FC<{ label: string; on: boolean; onClick?: () => void; disabled?: boolean }> = ({ label, on, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={on}
    className="tap inline-flex items-center disabled:opacity-50"
    style={{
      gap: 4,
      borderRadius: 9999,
      padding: "7px 13px",
      minHeight: 32,
      fontSize: textPx(12),
      fontWeight: on ? 700 : 600,
      background: on ? INK.fill : "transparent",
      color: on ? INK.onFill : INK.chS,
      border: on ? "1px solid transparent" : "1px solid rgb(var(--c-charcoal) / 0.11)",
    }}
  >
    {label}
    {on ? <X size={12} strokeWidth={2.4} aria-hidden /> : null}
  </button>
);

export const SpecialtiesSheet: React.FC<{ open: boolean; onClose: () => void; initial: string[]; onSaved: (list: string[]) => void }> = ({ open, onClose, initial, onSaved }) => {
  const { user, authUserId } = useApp();
  const kind = proKindOf(user.professionalSubtype);
  const options = [...new Set([...SPECIALTIES[kind], ...MORE_SPECIALTIES[kind], ...initial])];
  const [chosen, setChosen] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setChosen(initial);
      setError(null);
    }
  }, [open, initial]);
  const toggle = (s: string) => setChosen((c) => (c.includes(s) ? c.filter((x) => x !== s) : c.length >= MAX_SPECIALTIES ? c : [...c, s]));
  const save = async () => {
    if (!authUserId || busy) return;
    setBusy(true);
    setError(null);
    const r = await saveSpecialties(authUserId, chosen);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onSaved(chosen);
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Specialties" footer={<CtaButton label="Save" icon={Check} size="sheet" onClick={() => void save()} busy={busy} full />}>
      <p style={{ fontSize: textPx(12.5), color: INK.chS, marginBottom: 12 }}>Choose up to {MAX_SPECIALTIES}. Clients see them on your profile.</p>
      <div className="flex flex-wrap" style={{ gap: 6 }}>
        {options.map((s) => (
          <SpecialtyChip key={s} label={s} on={chosen.includes(s)} onClick={() => toggle(s)} disabled={!chosen.includes(s) && chosen.length >= MAX_SPECIALTIES} />
        ))}
      </div>
      {error && <ErrorLine>{error}</ErrorLine>}
    </BottomSheet>
  );
};

type Draft = { specialty: string; location: string; website: string; instagram: string; facebook: string; x: string };
const EMPTY: Draft = { specialty: "", location: "", website: "", instagram: "", facebook: "", x: "" };
const orNull = (s: string) => (s.trim() === "" ? null : s.trim());

const FIELDS: { key: keyof Draft; label: string; placeholder: string }[] = [
  { key: "specialty", label: "Specialty", placeholder: "e.g. Strength & conditioning" },
  { key: "location", label: "Location", placeholder: "e.g. Beirut" },
  { key: "website", label: "Website", placeholder: "yoursite.com" },
  { key: "instagram", label: "Instagram", placeholder: "@handle" },
  { key: "facebook", label: "Facebook", placeholder: "Page name or URL" },
  { key: "x", label: "X", placeholder: "@handle" },
];

export const ListingDetailsSheet: React.FC<{ open: boolean; onClose: () => void; onSaved?: () => void }> = ({ open, onClose, onSaved }) => {
  const { authUserId } = useApp();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open || !authUserId) return;
    let live = true;
    setLoading(true);
    setError(null);
    void fetchMyProfile(authUserId).then((r) => {
      if (!live) return;
      if (!r.ok) setError(r.message);
      else {
        const p = r.profile;
        setDraft(p ? { specialty: p.specialty ?? "", location: p.location ?? "", website: p.website ?? "", instagram: p.instagram ?? "", facebook: p.facebook ?? "", x: p.x ?? "" } : EMPTY);
      }
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [open, authUserId]);
  const save = async () => {
    if (!authUserId || busy) return;
    setBusy(true);
    setError(null);
    const r = await saveMyProfile(authUserId, {
      specialty: orNull(draft.specialty),
      location: orNull(draft.location),
      website: orNull(draft.website),
      instagram: orNull(draft.instagram),
      facebook: orNull(draft.facebook),
      x: orNull(draft.x),
    });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onSaved?.();
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Details and links" size="tall" footer={<CtaButton label="Save" size="sheet" onClick={() => void save()} disabled={loading} busy={busy} full />}>
      <div className="flex flex-col" style={{ gap: 14 }}>
        {/* Disabled while loading: typing before the read lands would be overwritten. */}
        {FIELDS.map((f) => (
          <FieldInput key={f.key} label={f.label} value={draft[f.key]} placeholder={f.placeholder} disabled={loading} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} />
        ))}
        {error && <ErrorLine>{error}</ErrorLine>}
      </div>
    </BottomSheet>
  );
};

export const AddChip: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="tap inline-flex items-center"
    style={{ gap: 4, borderRadius: 9999, padding: "7px 13px", minHeight: 32, fontSize: textPx(12), fontWeight: 600, border: "1px solid rgb(var(--c-charcoal) / 0.11)", color: INK.chS }}
  >
    Add
  </button>
);

/**
 * The monthly and consultation rates PaymentsSheet carried (QA 12.0:
 * "what his monthly rate is to be hired, alongside other types like
 * consultations"), now on MO5. "" is not set; 0 is a real rate.
 */
export const RatesSheet: React.FC<{ open: boolean; onClose: () => void; monthly: number | null; consultation: number | null; onSaved: (m: number | null, c: number | null) => void }> = ({
  open,
  onClose,
  monthly,
  consultation,
  onSaved,
}) => {
  const { authUserId } = useApp();
  const [m, setM] = useState("");
  const [c, setC] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setM(monthly != null ? String(monthly) : "");
      setC(consultation != null ? String(consultation) : "");
      setError(null);
    }
  }, [open, monthly, consultation]);
  const parse = (s: string) => (s.replace(/\D/g, "") === "" ? null : Number(s.replace(/\D/g, "")));
  const save = async () => {
    if (!authUserId || busy) return;
    setBusy(true);
    setError(null);
    const r = await saveRates(authUserId, parse(m), parse(c));
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onSaved(parse(m), parse(c));
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Rates" footer={<CtaButton label="Save" size="sheet" onClick={() => void save()} busy={busy} full />}>
      <div className="flex flex-col" style={{ gap: 14 }}>
        <FieldInput label="Monthly rate (to be hired)" value={m} onChange={(v) => setM(v.replace(/\D/g, ""))} inputMode="numeric" placeholder="e.g. 150" />
        <FieldInput label="Consultation rate" value={c} onChange={(v) => setC(v.replace(/\D/g, ""))} inputMode="numeric" placeholder="e.g. 40" />
        <p style={{ fontSize: textPx(11.5), lineHeight: 1.5, color: INK.chF }}>In US dollars. Clients connecting with you see these, and so does your Explore listing when it's on.</p>
        {error && <ErrorLine>{error}</ErrorLine>}
      </div>
    </BottomSheet>
  );
};
