import React, { useEffect, useRef, useState } from "react";
import { Camera, ChevronRight, Copy, Image as ImageIcon, Lock, Mail, Share2, Star, Trash2 } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CentredPopup } from "../../ui/CentredPopup";
import { PassQr } from "../../marketplace/PassQr";
import { ChoiceCard, FieldInput, FieldLabel, wellStyle } from "../calendar/calendarFields";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { AVATAR_ACCEPT, removeAvatar, uploadAvatar } from "../../../services/avatar";
import { requestTypeChange, setMyHandle } from "../../../services/pro/profile";
import { updatePhone } from "../../../services/profile";
import { saveFirstName } from "../../../services/pro/profile";
import { textPx } from "../../../theme/textSize";
import type { ProfessionalSubtype } from "../../../types";
import { INK } from "../proInk";
import { CtaButton, ErrorLine } from "./kit";
import { profileHref, profileUrl } from "./profileModel";
import { SITE_HOST } from "../../../config/site";
import { typeLabel } from "./typeLabel";
import type { CoverPicker } from "./useCoverPicker";

// Release 3 · W6 the profile's sheets and pop-ups:
// - PhotoSourceSheet (MO26 "Profile · photo source", r15 profile15): "Profile
//   photo" over a list card (r6b listCard6: r20, pad 4 14; rows 11 0, a 34
//   r11 tile with a 16 / 1.75 icon, 13 / 600, chevron 14). Uploads through
//   services/avatar, the same write the client Profile uses.
// - TypeLockedPopup (MO26 v2 "locked type explained", r16 profile16 + ui.js
//   popup): lock tile, "Professional type is locked", Contact support
//   (primary, Mail) and Close (secondary). Contact support opens
//   TypeChangeSheet, which sends request_professional_type_change (FINAL_PLAN
//   W6 "Request a change"): our team decides it (DB-9).
// - HandleSheet: set_my_handle; the backend's ATXG2 / taken / reserved answers.
// - ShareProfileSheet (MO15 v2, r13 shareProfile13): the r22 card (70 high
//   striped band; 56 avatar ring 3 card, -26 up; name 17 / 800; type 12 / 600
//   teal.dark; stars 11 + "{n} · {n} reviews" 12 text.soft; specialties
//   11.5 text.faint; 76 r12 QR and the link 12 text.soft), then Copy link
//   (secondary, Copy) and Share (primary, Share) as sheet CTAs, equal halves.

// ---------------------------------------------------------------------------
// Photo source
// ---------------------------------------------------------------------------

export function usePhotoPicker() {
  const { authUserId, user, updateProfile } = useApp();
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    if (!authUserId || busy) return;
    setBusy(true);
    setError(null);
    const r = await uploadAvatar(authUserId, file, user.avatarUrl);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    updateProfile({ avatarUrl: r.url });
  };
  const remove = async () => {
    if (!authUserId || busy) return;
    setBusy(true);
    setError(null);
    const r = await removeAvatar(authUserId, user.avatarUrl);
    setBusy(false);
    if (!r.ok) return setError(r.message ?? "Couldn't remove your picture.");
    updateProfile({ avatarUrl: undefined });
  };
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void upload(f);
  };
  const inputs = (
    <>
      <input ref={camera} type="file" accept={AVATAR_ACCEPT} capture="user" className="hidden" onChange={onPick} />
      <input ref={gallery} type="file" accept={AVATAR_ACCEPT} className="hidden" onChange={onPick} />
    </>
  );
  return { inputs, busy, error, hasPhoto: !!user.avatarUrl, takePhoto: () => camera.current?.click(), choose: () => gallery.current?.click(), remove };
}

type SourceRow = { key: string; icon: typeof Camera; label: string; run: () => void; disabled: boolean };

/** MO26's list card (r20, pad 4 14; 34 r11 tiles). `onRun` runs after a row's action (the photo rows close the sheet). */
const SourceRows: React.FC<{ rows: SourceRow[]; onRun?: () => void }> = ({ rows, onRun }) => {
  const dark = useIsDark();
  return (
    <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "4px 14px" }}>
      {rows.map((r, i) => (
        <button
          key={r.key}
          type="button"
          disabled={r.disabled}
          onClick={() => {
            r.run();
            onRun?.();
          }}
          className="tap w-full flex items-center text-left disabled:opacity-50"
          style={{ gap: 12, padding: "11px 0", minHeight: 44, borderBottom: i < rows.length - 1 ? `1px solid ${INK.b06}` : "none" }}
        >
          <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 11, background: dark ? "rgba(174,161,220,0.14)" : "#F0EDF9" }}>
            <r.icon size={16} strokeWidth={1.75} aria-hidden style={{ color: INK.prAccent }} />
          </span>
          <span className="flex-1 min-w-0" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch }}>
            {r.label}
          </span>
          <ChevronRight size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
        </button>
      ))}
    </div>
  );
};

/**
 * `cover` (Release B, MO14 "Photo and cover"): a second card for the cover
 * photo under the profile photo's, with the cover (or MO15's striped band)
 * above it. Not drawn: the sheet stays open on a cover row so the band and
 * any error show the result. Unset, the sheet is MO26's, unchanged.
 */
export const PhotoSourceSheet: React.FC<{ open: boolean; onClose: () => void; picker: ReturnType<typeof usePhotoPicker>; cover?: CoverPicker }> = ({ open, onClose, picker, cover }) => {
  const rows: SourceRow[] = [
    { key: "camera", icon: Camera, label: "Take a photo", run: picker.takePhoto, disabled: picker.busy },
    { key: "library", icon: ImageIcon, label: "Choose from library", run: picker.choose, disabled: picker.busy },
    { key: "remove", icon: Trash2, label: "Remove photo", run: () => void picker.remove(), disabled: picker.busy || !picker.hasPhoto },
  ];
  return (
    <BottomSheet open={open} onClose={onClose} title={cover ? "Photo and cover" : "Profile photo"}>
      {cover && <p style={{ fontSize: textPx(12), fontWeight: 700, color: INK.chF, margin: "0 2px 8px" }}>Profile photo</p>}
      <SourceRows rows={rows} onRun={onClose} />
      {picker.error && <ErrorLine>{picker.error}</ErrorLine>}
      {cover && (
        <>
          <p style={{ fontSize: textPx(12), fontWeight: 700, color: INK.chF, margin: "16px 2px 8px" }}>Cover photo</p>
          <div
            aria-hidden={!cover.url}
            className="relative overflow-hidden"
            style={{ height: 96, borderRadius: 16, marginBottom: 8, background: cover.url ? INK.soft : `repeating-linear-gradient(45deg, ${INK.soft} 0 6px, ${INK.card} 6px 12px)`, border: `1px solid ${INK.bCard}` }}
          >
            {cover.url && <img src={cover.url} alt="Your cover photo" className="absolute inset-0 w-full h-full object-cover" />}
          </div>
          <SourceRows
            rows={[
              { key: "cover", icon: ImageIcon, label: cover.busy ? "Uploading…" : cover.url ? "Change cover" : "Add a cover", run: cover.choose, disabled: cover.busy },
              { key: "cover-remove", icon: Trash2, label: "Remove cover", run: () => void cover.remove(), disabled: cover.busy || !cover.url },
            ]}
          />
          {cover.error && <ErrorLine>{cover.error}</ErrorLine>}
        </>
      )}
    </BottomSheet>
  );
};

// ---------------------------------------------------------------------------
// Professional type locked, and the request it leads to
// ---------------------------------------------------------------------------

export const TypeLockedPopup: React.FC<{ open: boolean; onClose: () => void; onContact: () => void }> = ({ open, onClose, onContact }) => (
  <CentredPopup
    open={open}
    onClose={onClose}
    title="Professional type is locked"
    icon={<Lock size={22} />}
    body="Your type decides your tools, your navbar and how your licence is checked, so it can't be changed here. Our support team can change it and will ask for your new credentials."
  >
    <div className="flex flex-col" style={{ gap: 8 }}>
      <CtaButton label="Contact support" icon={Mail} onClick={onContact} full />
      <CtaButton label="Close" variant="secondary" onClick={onClose} full />
    </div>
  </CentredPopup>
);

const TYPES: ProfessionalSubtype[] = ["trainer", "coach_instructor", "physiotherapist", "dietitian", "nutritionist", "doctor", "other"];

export const TypeChangeSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  current: ProfessionalSubtype | null | undefined;
  pending: ProfessionalSubtype | null;
  onSent: (t: ProfessionalSubtype) => void;
}> = ({ open, onClose, current, pending, onSent }) => {
  const [type, setType] = useState<ProfessionalSubtype | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    if (!type || busy) return;
    setBusy(true);
    setError(null);
    const r = await requestTypeChange(type, note);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onSent(type);
    onClose();
  };
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Request a change"
      footer={pending ? undefined : <CtaButton label="Send request" icon={Mail} size="sheet" onClick={() => void send()} disabled={!type} busy={busy} full />}
    >
      {pending ? (
        <p style={{ fontSize: textPx(13), lineHeight: 1.55, color: INK.chS }}>
          Your request to change to {typeLabel(pending)} is with our team. They'll ask for your new credentials.
        </p>
      ) : (
        <div className="flex flex-col" style={{ gap: 14 }}>
          <p style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: INK.chS }}>Choose the type you want. Our team checks it and asks for your new credentials.</p>
          <div role="radiogroup" aria-label="Professional type" className="flex flex-col" style={{ gap: 8 }}>
            {TYPES.filter((t) => t !== current).map((t) => (
              <ChoiceCard key={t} title={typeLabel(t)} on={type === t} onClick={() => setType(t)} />
            ))}
          </div>
          <div className="min-w-0">
            <FieldLabel htmlFor="type-note">Note for our team (optional)</FieldLabel>
            <textarea
              id="type-note"
              value={note}
              maxLength={500}
              rows={3}
              onChange={(e) => setNote(e.target.value)}
              className="w-full resize-none outline-none"
              style={{ ...wellStyle(), padding: "10px 12px" }}
            />
          </div>
          {error && <ErrorLine>{error}</ErrorLine>}
        </div>
      )}
    </BottomSheet>
  );
};

// ---------------------------------------------------------------------------
// A one-field sheet (name, phone, handle)
// ---------------------------------------------------------------------------

const OneFieldSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  initial: string;
  note?: React.ReactNode;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  prefix?: string;
  save: (v: string) => Promise<string | null>;
}> = ({ open, onClose, title, label, initial, note, inputMode, prefix, save }) => {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setValue(initial);
      setError(null);
    }
  }, [open, initial]);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const msg = await save(value);
    setBusy(false);
    if (msg) return setError(msg);
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={title} footer={<CtaButton label="Save" size="sheet" onClick={() => void run()} busy={busy} full />}>
      <div className="flex flex-col" style={{ gap: 10 }}>
        {prefix ? (
          <div className="min-w-0">
            <FieldLabel htmlFor="one-field">{label}</FieldLabel>
            <span className="flex items-center focus-within:!border-primary" style={{ ...wellStyle(), height: 40 }}>
              <span style={{ color: INK.chF, fontSize: textPx(14), whiteSpace: "nowrap", flex: "none" }}>{prefix}</span>
              <input
                id="one-field"
                value={value}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setValue(e.target.value.toLowerCase())}
                className="flex-1 min-w-0 h-full bg-transparent outline-none"
                style={{ fontSize: textPx(14), color: INK.ch }}
              />
            </span>
          </div>
        ) : (
          <FieldInput label={label} value={value} onChange={setValue} inputMode={inputMode} />
        )}
        {note}
        {error && <ErrorLine>{error}</ErrorLine>}
      </div>
    </BottomSheet>
  );
};

export const NameSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user, authUserId, updateProfile } = useApp();
  return (
    <OneFieldSheet
      open={open}
      onClose={onClose}
      title="Name"
      label="Name"
      initial={user.firstName ?? ""}
      save={async (v) => {
        if (!authUserId) return "You're signed out. Sign in again.";
        const r = await saveFirstName(authUserId, v);
        if (!r.ok) return r.message;
        updateProfile({ firstName: v.trim() });
        return null;
      }}
    />
  );
};

export const PhoneSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user, authUserId, updateProfile } = useApp();
  return (
    <OneFieldSheet
      open={open}
      onClose={onClose}
      title="Phone"
      label="Phone"
      inputMode="tel"
      initial={user.phone ?? ""}
      save={async (v) => {
        if (!authUserId) return "You're signed out. Sign in again.";
        const r = await updatePhone(authUserId, v.trim());
        if (!r.ok) return r.message ?? "Couldn't save your phone. Try again.";
        updateProfile({ phone: v.trim() });
        return null;
      }}
    />
  );
};

export const HandleSheet: React.FC<{ open: boolean; onClose: () => void; handle: string | null; onSaved: (h: string | null) => void }> = ({ open, onClose, handle, onSaved }) => (
  <OneFieldSheet
    open={open}
    onClose={onClose}
    title="Handle"
    label="Your handle"
    prefix={`${SITE_HOST}/p/`}
    initial={handle ?? ""}
    note={
      <p style={{ fontSize: textPx(11.5), lineHeight: 1.5, color: INK.chF }}>
        Lowercase letters, numbers and dots. Handles and business web addresses share one list, so each is unique. You can change your handle once every 30 days.
      </p>
    }
    save={async (v) => {
      const r = await setMyHandle(v);
      if (!r.ok) return r.message;
      onSaved(r.handle);
      return null;
    }}
  />
);

// ---------------------------------------------------------------------------
// MO15 Share profile
// ---------------------------------------------------------------------------

export const ShareProfileSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  name: string;
  avatarUrl: string | null;
  type: string;
  rating: { average: number; count: number } | null;
  specialties: string[];
  handle: string | null;
  onChooseHandle: () => void;
  /** Release B: the cover photo fills the 70 band; without one, the stripes. */
  coverUrl?: string | null;
}> = ({ open, onClose, name, avatarUrl, type, rating, specialties, handle, onChooseHandle, coverUrl }) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = handle ? profileUrl(handle) : null;
  const full = handle ? profileHref(handle) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setError(null);
    } catch {
      setError("Couldn't copy the link. Try again.");
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url: full });
      } catch {
        /* dismissed */
      }
    } else void copy();
  };
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Share profile"
      footer={
        url ? (
          <div className="flex" style={{ gap: 8 }}>
            <CtaButton label={copied ? "Copied" : "Copy link"} icon={Copy} variant="secondary" size="sheet" onClick={() => void copy()} />
            <CtaButton label="Share" icon={Share2} size="sheet" onClick={() => void share()} />
          </div>
        ) : (
          <CtaButton label="Choose your handle" size="sheet" onClick={onChooseHandle} full />
        )
      }
    >
      <div style={{ borderRadius: 22, overflow: "hidden", border: `1px solid ${INK.b10}`, background: INK.card }}>
        <div aria-hidden className="relative overflow-hidden" style={{ height: 70, background: coverUrl ? INK.soft : `repeating-linear-gradient(45deg, ${INK.soft} 0 6px, ${INK.card} 6px 12px)` }}>
          {coverUrl && <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        </div>
        <div style={{ padding: "0 16px 16px", marginTop: -26 }}>
          <span className="flex items-center justify-center overflow-hidden" style={{ width: 56, height: 56, borderRadius: 9999, border: `3px solid ${INK.card}`, background: INK.tealPale, fontSize: 18, fontWeight: 800, color: INK.tealDark }}>
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
          </span>
          <p style={{ fontSize: textPx(17), fontWeight: 800, color: INK.ch, marginTop: 6, overflowWrap: "anywhere" }}>{name}</p>
          <p style={{ fontSize: textPx(12), color: INK.tealDark, fontWeight: 600 }}>{type}</p>
          {rating && rating.count > 0 && (
            <p className="flex items-center" style={{ gap: 5, fontSize: textPx(12), color: INK.chS, marginTop: 4 }}>
              <span className="inline-flex" style={{ gap: 2 }} aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={11} strokeWidth={1.5} style={{ color: i < Math.round(rating.average) ? "#D9A441" : "rgba(140,131,120,0.35)", fill: i < Math.round(rating.average) ? "#D9A441" : "none" }} />
                ))}
              </span>
              {rating.average.toFixed(1)} · {rating.count} {rating.count === 1 ? "review" : "reviews"}
            </p>
          )}
          {specialties.length > 0 && <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 6 }}>{specialties.slice(0, 3).join(" · ")}</p>}
          <div className="flex items-center" style={{ gap: 12, marginTop: 12 }}>
            {url ? (
              <span className="shrink-0 overflow-hidden flex items-center justify-center" style={{ width: 76, height: 76, borderRadius: 12, border: `1px solid ${INK.b10}`, background: "#FFFFFF" }}>
                <PassQr value={full} size={68} label={`QR code for ${url}`} />
              </span>
            ) : null}
            <span style={{ fontSize: textPx(12), color: INK.chS, lineHeight: 1.5, overflowWrap: "anywhere" }}>{url ?? "Choose a handle to get your profile link."}</span>
          </div>
        </div>
      </div>
      {error && <ErrorLine>{error}</ErrorLine>}
    </BottomSheet>
  );
};
