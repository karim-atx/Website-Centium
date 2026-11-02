import { useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronUp, Globe, Loader2, Mail, MapPin, Pencil, Phone, RefreshCcw } from "lucide-react";
import { BizButton, BizButtonSoft, BizDropdown, BizField, BizFieldButton, BizSheet, BizConfirm, FieldLabel, BORDER } from "../../../components/business-more/kit";
import { InstagramGlyph } from "../../../components/business-more/InstagramGlyph";
import { BUSINESS_TYPE_OPTIONS, CATEGORY_KEYS, CATEGORY_LABEL, MAX_CATEGORIES, typeLabel, type BizKind } from "../../../components/business-more/kind";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { t, tx } from "../../../i18n/core";

const INSTAGRAM = "Instagram";
import type { BusinessPatch, BusinessTypeValue } from "../../../services/business-more";
import { PlaylistField, playlistFieldValid } from "../../../components/music/PlaylistField";
import { tidyPlaylistInput } from "../../../services/music/playlistLink";
import { ImageApprovalBadge, ImageApprovalNote, type OwnImageState } from "../../../components/moderation/ImageApproval";

// MO1B-014 to -023 · the BizMoreV8 sheets (`sheet` template lines 127 to 137):
// band #F0EEFD / #1C1F28 with the business outline (#7248F8 / #9976F7), title
// 20/800, body padding 16 16 28, lead 12.5 / 18, fields min-height 46 r14,
// Save 52 r16. Each Save is enabled only when something changed (K1, kept from
// the old listing form) and writes only the keys it shows.

type Save = (patch: BusinessPatch) => Promise<string | null>;

// ---------------------------------------------------------------------------
// Name and type (MO1B-014, -015)

export function NameTypeSheet({
  open,
  onClose,
  name,
  type,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  type: BusinessTypeValue;
  onSave: Save;
}) {
  const [draftName, setDraftName] = useState(name);
  const [draftType, setDraftType] = useState<BusinessTypeValue>(type);
  const [typeOpen, setTypeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [askType, setAskType] = useState(false);

  const dirty = draftName.trim() !== name.trim() || draftType !== type;

  const commit = async () => {
    setBusy(true);
    setError(null);
    const patch: BusinessPatch = {};
    if (draftName.trim() !== name.trim()) patch.name = draftName;
    if (draftType !== type) patch.type = draftType;
    const failed = await onSave(patch);
    setBusy(false);
    if (failed) setError(failed);
  };

  const save = () => {
    if (!draftName.trim()) {
      setNameError(t("Add your business name"));
      return;
    }
    if (draftType !== type) {
      setAskType(true);
      return;
    }
    void commit();
  };

  return (
    <BizSheet open={open} onClose={onClose} title={t("Name and type")} lead={t("Shown at the top of your listing.")}>
      <BizField
        id="biz-name"
        label={t("Business name")}
        value={draftName}
        onChange={(v) => {
          setDraftName(v);
          if (nameError) setNameError(null);
        }}
        icon={Pencil}
        maxLength={80}
        error={nameError}
        autoComplete="organization"
      />
      <BizFieldButton
        id="biz-type"
        label={t("Business type")}
        value={t(typeLabel(draftType))}
        icon={typeOpen ? ChevronUp : ChevronDown}
        expanded={typeOpen}
        onClick={() => setTypeOpen((o) => !o)}
      />
      {typeOpen && (
        <BizDropdown
          label={t("Business type")}
          options={BUSINESS_TYPE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
          value={draftType}
          onPick={(v) => {
            setDraftType(v);
            setTypeOpen(false);
          }}
        />
      )}
      {error && (
        <p role="alert" className="text-[12px] font-bold text-status-high" style={{ marginBottom: 6 }}>
          {error}
        </p>
      )}
      <BizButton label={t("Save")} onClick={save} disabled={!dirty} busy={busy} />
      <BizConfirm
        open={askType}
        icon={RefreshCcw}
        title={t("Change your business type?")}
        body={t("Your navbar, Dashboard and Analytics change to match {type}.", { type: t(typeLabel(draftType)) })}
        action={t("Change type")}
        cancel={t("Keep {type}", { type: t(typeLabel(type)) })}
        busy={busy}
        onCancel={() => setAskType(false)}
        onAction={() => {
          setAskType(false);
          void commit();
        }}
      />
    </BizSheet>
  );
}

// ---------------------------------------------------------------------------
// Bio (MO1B-020)

const BIO_MAX = 300;

export function BioSheet({ open, onClose, bio, onSave }: { open: boolean; onClose: () => void; bio: string; onSave: Save }) {
  const [draft, setDraft] = useState(bio);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const over = draft.length > BIO_MAX;
  const dirty = draft.trim() !== bio.trim();
  return (
    <BizSheet open={open} onClose={onClose} title={t("Bio")} lead={t("A few lines about what clients can expect.")}>
      <div style={{ marginBottom: 12 }}>
        <FieldLabel htmlFor="biz-bio">{t("Bio")}</FieldLabel>
        <textarea
          id="biz-bio"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-invalid={over || undefined}
          className={clsx(
            "block w-full resize-none bg-cream-soft border-[1.5px] outline-none text-[13.5px] font-semibold leading-[19px] text-charcoal",
            over ? "border-status-high" : BORDER
          )}
          style={{ minHeight: 96, borderRadius: 14, padding: 12 }}
          rows={4}
        />
        <p className={clsx("text-end text-[11px]", over ? "font-bold text-status-high" : "text-charcoal-faint")} style={{ marginTop: 4 }} aria-live="polite">
          {draft.length} / {BIO_MAX}
        </p>
      </div>
      {error && <p role="alert" className="text-[12px] font-bold text-status-high">{error}</p>}
      <BizButton
        label={t("Save")}
        disabled={!dirty || over}
        busy={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const failed = await onSave({ bio: draft });
          setBusy(false);
          if (failed) setError(failed);
        }}
      />
    </BizSheet>
  );
}

// ---------------------------------------------------------------------------
// House playlist (Round E, ours: no frame draws it). Public like the profile:
// shown on the gym's page as "House playlist".

export function HousePlaylistSheet({ open, onClose, url, onSave }: { open: boolean; onClose: () => void; url: string; onSave: Save }) {
  const [draft, setDraft] = useState(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = tidyPlaylistInput(draft);
  const dirty = next !== url.trim();
  return (
    <BizSheet open={open} onClose={onClose} title={t("House playlist")} lead={t("The music you play here. Members open it in their own app.")}>
      <PlaylistField
        value={draft}
        onChange={(v) => {
          setDraft(v);
          setError(null);
        }}
        label={t("House playlist (optional)")}
        hint={t("Shown on your page on Explore.")}
        error={error}
        style={{ marginBottom: 12 }}
      />
      <BizButton
        label={url && !next ? t("Remove playlist") : t("Save")}
        disabled={!dirty || !playlistFieldValid(next)}
        busy={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const failed = await onSave({ playlistUrl: next || null });
          setBusy(false);
          if (failed) setError(failed);
        }}
      />
    </BizSheet>
  );
}

// ---------------------------------------------------------------------------
// Categories (MO1B-021)

export function CategoriesSheet({
  open,
  onClose,
  kind,
  categories,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  kind: BizKind;
  categories: string[];
  onSave: Save;
}) {
  const [picked, setPicked] = useState<string[]>(categories);
  const [limit, setLimit] = useState(false);
  const [shake, setShake] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduce = useReducedMotion();
  // Keys the business already holds stay offered even if this lane wouldn't list them.
  const keys = [...CATEGORY_KEYS[kind], ...categories.filter((c) => !CATEGORY_KEYS[kind].includes(c))];
  const dirty = picked.length !== categories.length || picked.some((c) => !categories.includes(c));

  const tap = (k: string) => {
    if (picked.includes(k)) {
      setPicked(picked.filter((c) => c !== k));
      setLimit(false);
      return;
    }
    if (picked.length >= MAX_CATEGORIES) {
      setLimit(true);
      if (!reduce) {
        setShake(k);
        window.setTimeout(() => setShake(null), 400);
      }
      return;
    }
    setPicked([...picked, k]);
  };

  return (
    <BizSheet
      open={open}
      onClose={onClose}
      title={t("Categories")}
      lead={limit ? t("Pick up to 5.") : t("Pick up to 5. Clients filter Explore by these.")}
      leadTone={limit ? "high" : "soft"}
    >
      <style>{`@keyframes biz-chip-shake { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-4px) } 75% { transform: translateX(4px) } }`}</style>
      <div className="flex flex-wrap" style={{ gap: 8, marginBottom: 12 }}>
        {keys.map((k) => {
          const on = picked.includes(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => tap(k)}
              // 36 drawn; .tap gives the 44 hit area (MO1B-021 row 4).
              className={clsx(
                "tap flex items-center border text-[12.5px] font-semibold",
                on ? "bg-primary-fill text-on-primary-fill border-primary" : clsx("bg-cream-card text-charcoal-soft", BORDER)
              )}
              style={{ height: 36, padding: "0 14px", borderRadius: 12, animation: shake === k ? "biz-chip-shake 0.4s ease" : undefined }}
            >
              {t(CATEGORY_LABEL[k] ?? k)}
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="text-[12px] font-bold text-status-high">{error}</p>}
      <BizButton
        label={t("Save · {n} selected", { n: picked.length })}
        disabled={!dirty}
        busy={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const failed = await onSave({ categories: picked });
          setBusy(false);
          if (failed) setError(failed);
        }}
      />
    </BizSheet>
  );
}

// ---------------------------------------------------------------------------
// Contact (MO1B-022, -023)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSTAGRAM_RE = /^[A-Za-z0-9._]{1,30}$/;

export function ContactSheet({
  open,
  onClose,
  phone,
  email,
  website,
  instagram,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  onSave: Save;
}) {
  const [d, setD] = useState({ phone, email, website, instagram: instagram ? `@${instagram}` : "" });
  const [errors, setErrors] = useState<{ email?: string; instagram?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handle = d.instagram.trim().replace(/^@/, "");
  const dirty = d.phone.trim() !== phone.trim() || d.email.trim() !== email.trim() || d.website.trim() !== website.trim() || handle !== instagram;

  const save = async () => {
    const next: typeof errors = {};
    if (d.email.trim() && !EMAIL_RE.test(d.email.trim())) next.email = t("Use a full email address, like name@business.com.");
    if (handle && !INSTAGRAM_RE.test(handle)) next.instagram = t("Use your Instagram handle: letters, numbers, dots and underscores.");
    setErrors(next);
    if (next.email || next.instagram) return;
    setBusy(true);
    setError(null);
    const failed = await onSave({ publicPhone: d.phone, publicEmail: d.email, publicWebsite: d.website, instagram: handle });
    setBusy(false);
    if (failed) setError(failed);
  };

  return (
    <BizSheet open={open} onClose={onClose} title={tx("Contact", "section")} lead={t("How clients reach you from your listing.")}>
      <BizField id="biz-phone" label={t("Phone")} value={d.phone} onChange={(v) => setD({ ...d, phone: v })} icon={Phone} type="tel" inputMode="tel" autoComplete="tel" />
      <BizField
        id="biz-email"
        label={t("Email")}
        value={d.email}
        onChange={(v) => {
          setD({ ...d, email: v });
          if (errors.email) setErrors({ ...errors, email: undefined });
        }}
        icon={Mail}
        type="email"
        inputMode="email"
        autoComplete="email"
        error={errors.email}
      />
      <BizField id="biz-web" label={t("Website")} value={d.website} onChange={(v) => setD({ ...d, website: v })} icon={Globe} inputMode="url" autoComplete="url" />
      <BizField
        id="biz-ig"
        label={INSTAGRAM}
        value={d.instagram}
        onChange={(v) => {
          setD({ ...d, instagram: v });
          if (errors.instagram) setErrors({ ...errors, instagram: undefined });
        }}
        icon={InstagramGlyph}
        maxLength={31}
        error={errors.instagram}
      />
      {error && <p role="alert" className="text-[12px] font-bold text-status-high">{error}</p>}
      <BizButton label={t("Save")} onClick={() => void save()} disabled={!dirty} busy={busy} />
    </BizSheet>
  );
}

// ---------------------------------------------------------------------------
// Area (OURS, NOTHING_LOST LOST 4): business_profiles.location, the free-text
// area shown next to the name on the storefront, the Explore seller line and
// this page's type line. Venues (Locations and hours) carry their own address;
// this stays the business-wide line, so a store or wellness business with no
// venue still has one. Main edited it on the old listing form.

const AREA_MAX = 60;

export function AreaSheet({ open, onClose, area, onSave }: { open: boolean; onClose: () => void; area: string; onSave: Save }) {
  const [draft, setDraft] = useState(area);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = draft.trim() !== area.trim();
  return (
    <BizSheet open={open} onClose={onClose} title={t("Area")} lead={t("The neighbourhood or city clients see next to your business name.")}>
      <BizField id="biz-area" label={t("Area")} value={draft} onChange={setDraft} icon={MapPin} placeholder={t("Hamra, Beirut")} maxLength={AREA_MAX} autoComplete="address-level2" />
      {error && <p role="alert" className="text-[12px] font-bold text-status-high">{error}</p>}
      <BizButton
        label={t("Save")}
        disabled={!dirty}
        busy={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const failed = await onSave({ location: draft });
          setBusy(false);
          if (failed) setError(failed);
        }}
      />
    </BizSheet>
  );
}

// ---------------------------------------------------------------------------
// Your photo (OURS, NOTHING_LOST LOST 5): the owner's own picture
// (profiles.avatar_url), which team chats and direct messages show. The page
// owns the upload (services/avatar, the same path as the personal Profile);
// this sheet is the preview and the three choices. `avatarUrl` is what the
// owner sees (a pending photo first, Round C Release 2), `approval` its badge
// and note, `canRemove` whether there is an approved photo to clear.

export function YourPhotoSheet({
  open,
  onClose,
  avatarUrl,
  approval,
  canRemove,
  initials,
  busy,
  error,
  onCamera,
  onLibrary,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  avatarUrl: string | null;
  approval: OwnImageState;
  canRemove: boolean;
  initials: string;
  busy: boolean;
  error: string | null;
  onCamera: () => void;
  onLibrary: () => void;
  onRemove: () => void;
}) {
  return (
    <BizSheet open={open} onClose={onClose} title={t("Your photo")} lead={t("Your own picture, separate from the business logo. Your team and the people you message see it.")}>
      <div className="flex justify-center" style={{ marginBottom: 14 }}>
        <span
          className="relative flex items-center justify-center overflow-hidden rounded-full bg-th-8e7fd0 text-white text-[28px] font-extrabold"
          style={{ width: 88, height: 88 }}
          aria-busy={busy || undefined}
        >
          {avatarUrl ? <img src={avatarUrl} alt={t("Your photo")} className="w-full h-full object-cover" /> : <span aria-hidden>{initials}</span>}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Loader2 size={24} className="animate-spin text-white" aria-label={t("Saving")} />
            </span>
          )}
        </span>
      </div>
      {approval && (
        <div className="flex flex-col items-center text-center gap-1.5" style={{ marginBottom: 12 }}>
          <ImageApprovalBadge state={approval} />
          <ImageApprovalNote state={approval} />
        </div>
      )}
      {error && (
        <p role="alert" className="text-[12px] font-bold text-status-high" style={{ marginBottom: 6 }}>
          {error}
        </p>
      )}
      <BizButton label={t("Choose from library")} onClick={onLibrary} busy={busy} />
      <BizButtonSoft label={t("Take a photo")} onClick={onCamera} disabled={busy} />
      {canRemove && <BizButtonSoft label={t("Remove photo")} tone="high" onClick={onRemove} disabled={busy} />}
    </BizSheet>
  );
}
