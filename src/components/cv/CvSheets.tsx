import React, { useRef, useState } from "react";
import { Lock, Trash2 } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Toggle } from "../ui/Toggle";
import { MonthYearField } from "../ui/MonthYearField";
import { AttachDocument } from "../ui/AttachDocument";
import { ChipInput } from "../ui/ChipInput";
import { LicenceStatusBadge, REPLACE_RESETS_REVIEW, RejectionNote } from "./CvBadges";
import { LicencePublishRow } from "./LicencePublish";
import { PUBLISH_STRINGS } from "./licencePublishState";
import {
  deleteEntry,
  deleteLicence,
  licenceStatus,
  PROFICIENCIES,
  removeLicenceDocument,
  saveCvProfile,
  saveEntry,
  saveLicence,
  type Licence,
  type LicenceDraft,
  type MyCv,
  type Proficiency,
  type SectionDraft,
  type SectionEntry,
  type SectionKey,
} from "../../services/professional-cv";
import { checkRange, checkText, checkUrl, firstProblem } from "../../services/professional-cv/validate";
import { currentMonth } from "../../services/professional-cv/cvDates";
import { nextPosition } from "./useMyCv";
import { t, tx } from "../../i18n/core";

// The CV's add/edit sheets. Every save goes to the server and the sheet closes
// only when it lands; the caller then patches its state with the returned row.
// Deleting asks twice ("Tap again to confirm"), the app's usual two-tap delete.

const INPUT =
  "w-full min-h-[48px] rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

const Field: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: string;
  note?: React.ReactNode;
}> = ({ id, label, value, onChange, placeholder, multiline, maxLength, inputMode, type, note }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-xs font-semibold text-charcoal-soft">
      {label}
    </label>
    {multiline ? (
      <textarea
        id={id}
        rows={4}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${INPUT} resize-none`}
      />
    ) : (
      <input
        id={id}
        value={value}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={INPUT}
      />
    )}
    {note}
  </div>
);

const ToggleRow: React.FC<{ label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }> = ({
  label,
  sub,
  checked,
  onChange,
}) => (
  <div className="flex items-center justify-between gap-3 min-h-[44px]">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-charcoal">{label}</p>
      {sub && <p className="text-xs text-charcoal-soft mt-0.5">{sub}</p>}
    </div>
    <Toggle checked={checked} onChange={onChange} label={label} />
  </div>
);

/** The frame every entry sheet shares: fields, a pinned Save, delete, error. */
const EntryFrame: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  saveLabel: string;
  busy: boolean;
  error: string | null;
  onSave: () => void;
  onDelete?: () => Promise<boolean>;
  deleteLabel?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, saveLabel, busy, error, onSave, onDelete, deleteLabel, children }) => {
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<number | null>(null);

  const del = async () => {
    if (!onDelete) return;
    if (!confirm) {
      setConfirm(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setConfirm(false), 3000);
      return;
    }
    await onDelete();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      size="tall"
      footer={
        <div>
          {error && <p className="text-xs font-semibold text-status-high mb-2.5 text-center">{t(error)}</p>}
          <Button fullWidth size="lg" onClick={onSave} disabled={busy}>
            {busy ? t("Saving…") : saveLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {children}
        {onDelete && (
          <button
            type="button"
            onClick={() => void del()}
            disabled={busy}
            className="tap w-full min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold text-status-high"
          >
            <Trash2 size={13} /> {confirm ? t("Tap again to confirm") : (deleteLabel ?? t("Delete"))}
          </button>
        )}
      </div>
    </BottomSheet>
  );
};

type SheetProps<E> = {
  open: boolean;
  onClose: () => void;
  userId: string;
  /** The entry being edited, or null to add one. */
  entry: E | null;
  /** Where a new entry goes (one past the last). */
  position: number;
  onSaved: (entry: E) => void;
  onDeleted: (id: string) => void;
};

/** Save/delete plumbing for the text sections. */
function useEntry<K extends SectionKey>(key: K, p: SheetProps<SectionEntry<K>>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (draft: SectionDraft<K>, problem: string | null) => {
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await saveEntry(p.userId, key, draft, p.entry ? { id: (p.entry as { id: string }).id } : { position: p.position });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    p.onSaved(result.entry);
    p.onClose();
  };

  const remove = p.entry
    ? async () => {
        setBusy(true);
        const result = await deleteEntry(key, (p.entry as { id: string }).id);
        setBusy(false);
        if (!result.ok) {
          setError(result.message);
          return false;
        }
        p.onDeleted((p.entry as { id: string }).id);
        p.onClose();
        return true;
      }
    : undefined;

  return { busy, error, save, remove };
}

// ---------------------------------------------------------------------------

export const ExperienceSheet: React.FC<SheetProps<SectionEntry<"experience">>> = (p) => {
  const e = p.entry;
  const [title, setTitle] = useState(e?.title ?? "");
  const [organisation, setOrganisation] = useState(e?.organisation ?? "");
  const [location, setLocation] = useState(e?.location ?? "");
  const [start, setStart] = useState<string | null>(e?.start ?? null);
  const [end, setEnd] = useState<string | null>(e?.end ?? null);
  const [description, setDescription] = useState(e?.description ?? "");
  const x = useEntry("experience", p);

  return (
    <EntryFrame
      open={p.open}
      onClose={p.onClose}
      title={e ? t("Edit experience") : t("Add experience")}
      saveLabel={t("Save experience")}
      busy={x.busy}
      error={x.error}
      onDelete={x.remove}
      onSave={() =>
        void x.save(
          { title, organisation, location, start: start!, end, description },
          firstProblem(
            checkText("Title", title, 2, 200, true),
            checkText("Organisation", organisation, 2, 200, true),
            checkText("Location", location, 2, 200, false),
            start ? null : "Add the start date.",
            checkRange(start, end),
            checkText("Description", description, 1, 4000, false)
          )
        )
      }
    >
      <Field id="exp-title" label={tx("Title", "job title")} value={title} onChange={setTitle} placeholder={t("e.g. Head Coach")} maxLength={200} />
      <Field id="exp-org" label={t("Organisation")} value={organisation} onChange={setOrganisation} placeholder={t("Gym, clinic or company")} maxLength={200} />
      <Field id="exp-location" label={t("Location")} value={location} onChange={setLocation} placeholder={t("Optional")} maxLength={200} />
      <div className="grid grid-cols-2 gap-2.5">
        <MonthYearField id="exp-start" label={t("Start")} value={start} onChange={setStart} />
        <MonthYearField id="exp-end" label={t("End")} value={end} onChange={setEnd} allowPresent present={!end} />
      </div>
      <Field id="exp-desc" label={t("What you did")} value={description} onChange={setDescription} placeholder={t("Optional")} multiline maxLength={4000} />
    </EntryFrame>
  );
};

export const EducationSheet: React.FC<SheetProps<SectionEntry<"education">>> = (p) => {
  const e = p.entry;
  const [institution, setInstitution] = useState(e?.institution ?? "");
  const [degree, setDegree] = useState(e?.degree ?? "");
  const [field, setField] = useState(e?.field ?? "");
  const [start, setStart] = useState<string | null>(e?.start ?? null);
  const [end, setEnd] = useState<string | null>(e?.end ?? null);
  const [description, setDescription] = useState(e?.description ?? "");
  const x = useEntry("education", p);

  return (
    <EntryFrame
      open={p.open}
      onClose={p.onClose}
      title={e ? t("Edit education") : t("Add education")}
      saveLabel={t("Save education")}
      busy={x.busy}
      error={x.error}
      onDelete={x.remove}
      onSave={() =>
        void x.save(
          { institution, degree, field, start, end, description },
          firstProblem(
            checkText("Institution", institution, 2, 200, true),
            checkText("Degree", degree, 1, 200, false),
            checkText("Field of study", field, 1, 200, false),
            checkRange(start, end),
            checkText("Description", description, 1, 4000, false)
          )
        )
      }
    >
      <Field id="edu-inst" label={t("Institution")} value={institution} onChange={setInstitution} placeholder={t("University, college or school")} maxLength={200} />
      <Field id="edu-degree" label={t("Degree")} value={degree} onChange={setDegree} placeholder={t("e.g. BSc (optional)")} maxLength={200} />
      <Field id="edu-field" label={t("Field of study")} value={field} onChange={setField} placeholder={t("e.g. Sports Science (optional)")} maxLength={200} />
      <div className="grid grid-cols-2 gap-2.5">
        <MonthYearField id="edu-start" label={t("Start")} value={start} onChange={setStart} optional />
        <MonthYearField id="edu-end" label={t("End")} value={end} onChange={setEnd} optional toYear={Number(currentMonth().slice(0, 4)) + 6} />
      </div>
      <p className="text-[11.5px] text-charcoal-soft -mt-2">{t("Dates are optional.")}</p>
      <Field id="edu-desc" label={t("Description")} value={description} onChange={setDescription} placeholder={t("Optional")} multiline maxLength={4000} />
    </EntryFrame>
  );
};

export const AwardSheet: React.FC<SheetProps<SectionEntry<"awards">>> = (p) => {
  const e = p.entry;
  const [title, setTitle] = useState(e?.title ?? "");
  const [issuer, setIssuer] = useState(e?.issuer ?? "");
  const [awarded, setAwarded] = useState<string | null>(e?.awarded ?? null);
  const [description, setDescription] = useState(e?.description ?? "");
  const x = useEntry("awards", p);

  return (
    <EntryFrame
      open={p.open}
      onClose={p.onClose}
      title={e ? t("Edit award") : t("Add award")}
      saveLabel={t("Save award")}
      busy={x.busy}
      error={x.error}
      onDelete={x.remove}
      onSave={() =>
        void x.save(
          { title, issuer, awarded, description },
          firstProblem(
            checkText("Award name", title, 2, 200, true),
            checkText("Awarded by", issuer, 2, 200, false),
            checkText("Description", description, 1, 4000, false)
          )
        )
      }
    >
      <Field id="award-title" label={t("Award name")} value={title} onChange={setTitle} maxLength={200} />
      <Field id="award-issuer" label={t("Awarded by")} value={issuer} onChange={setIssuer} placeholder={t("Optional")} maxLength={200} />
      <MonthYearField id="award-date" label={t("Date")} value={awarded} onChange={setAwarded} optional />
      <Field id="award-desc" label={t("Description")} value={description} onChange={setDescription} placeholder={t("Optional")} multiline maxLength={4000} />
    </EntryFrame>
  );
};

export const PublicationSheet: React.FC<SheetProps<SectionEntry<"publications">>> = (p) => {
  const e = p.entry;
  const [title, setTitle] = useState(e?.title ?? "");
  const [publisher, setPublisher] = useState(e?.publisher ?? "");
  const [published, setPublished] = useState<string | null>(e?.published ?? null);
  const [url, setUrl] = useState(e?.url ?? "");
  const [description, setDescription] = useState(e?.description ?? "");
  const x = useEntry("publications", p);

  return (
    <EntryFrame
      open={p.open}
      onClose={p.onClose}
      title={e ? t("Edit publication") : t("Add publication")}
      saveLabel={t("Save publication")}
      busy={x.busy}
      error={x.error}
      onDelete={x.remove}
      onSave={() =>
        void x.save(
          { title, publisher, published, url, description },
          firstProblem(
            checkText("Title", title, 2, 300, true),
            checkText("Publisher", publisher, 2, 200, false),
            checkUrl("Link", url, false),
            checkText("Description", description, 1, 4000, false)
          )
        )
      }
    >
      <Field id="pub-title" label={t("Title")} value={title} onChange={setTitle} maxLength={300} />
      <Field id="pub-publisher" label={t("Publisher")} value={publisher} onChange={setPublisher} placeholder={t("Optional")} maxLength={200} />
      <MonthYearField id="pub-date" label={tx("Published", "publication date")} value={published} onChange={setPublished} optional />
      <Field id="pub-url" label={t("Link")} value={url} onChange={setUrl} placeholder={t("https:// (optional)")} type="url" inputMode="url" maxLength={2000} />
      <Field id="pub-desc" label={t("Description")} value={description} onChange={setDescription} placeholder={t("Optional")} multiline maxLength={4000} />
    </EntryFrame>
  );
};

export const VolunteeringSheet: React.FC<SheetProps<SectionEntry<"volunteering">>> = (p) => {
  const e = p.entry;
  const [role, setRole] = useState(e?.role ?? "");
  const [organisation, setOrganisation] = useState(e?.organisation ?? "");
  const [start, setStart] = useState<string | null>(e?.start ?? null);
  const [end, setEnd] = useState<string | null>(e?.end ?? null);
  const [description, setDescription] = useState(e?.description ?? "");
  const x = useEntry("volunteering", p);

  return (
    <EntryFrame
      open={p.open}
      onClose={p.onClose}
      title={e ? t("Edit volunteering") : t("Add volunteering")}
      saveLabel={t("Save volunteering")}
      busy={x.busy}
      error={x.error}
      onDelete={x.remove}
      onSave={() =>
        void x.save(
          { role, organisation, start, end, description },
          firstProblem(
            checkText("Role", role, 2, 200, true),
            checkText("Organisation", organisation, 2, 200, true),
            checkRange(start, end),
            checkText("Description", description, 1, 4000, false)
          )
        )
      }
    >
      <Field id="vol-role" label={t("Role")} value={role} onChange={setRole} maxLength={200} />
      <Field id="vol-org" label={t("Organisation")} value={organisation} onChange={setOrganisation} maxLength={200} />
      <div className="grid grid-cols-2 gap-2.5">
        <MonthYearField id="vol-start" label={t("Start")} value={start} onChange={setStart} optional />
        <MonthYearField id="vol-end" label={t("End")} value={end} onChange={setEnd} allowPresent present={!!start && !end} optional />
      </div>
      <Field id="vol-desc" label={t("Description")} value={description} onChange={setDescription} placeholder={t("Optional")} multiline maxLength={4000} />
    </EntryFrame>
  );
};

export const LinkSheet: React.FC<SheetProps<SectionEntry<"links">>> = (p) => {
  const e = p.entry;
  const [label, setLabel] = useState(e?.label ?? "");
  const [url, setUrl] = useState(e?.url ?? "");
  const x = useEntry("links", p);

  return (
    <EntryFrame
      open={p.open}
      onClose={p.onClose}
      title={e ? t("Edit link") : t("Add link")}
      saveLabel={t("Save link")}
      busy={x.busy}
      error={x.error}
      onDelete={x.remove}
      onSave={() =>
        void x.save({ label, url }, firstProblem(checkText("Label", label, 1, 80, true), checkUrl("Link", url, true)))
      }
    >
      <Field id="link-label" label={t("Label")} value={label} onChange={setLabel} placeholder={t("e.g. Portfolio")} maxLength={80} />
      <Field id="link-url" label={t("Link")} value={url} onChange={setUrl} placeholder={t("https://")} type="url" inputMode="url" maxLength={2000} />
    </EntryFrame>
  );
};

// ---------------------------------------------------------------------------
// Licences
// ---------------------------------------------------------------------------

export const LicenceSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  userId: string;
  licence: Licence | null;
  cv: MyCv;
  onSaved: (licence: Licence) => void;
  onDeleted: (id: string) => void;
}> = ({ open, onClose, userId, licence, cv, onSaved, onDeleted }) => {
  const [name, setName] = useState(licence?.name ?? "");
  const [issuer, setIssuer] = useState(licence?.issuingBody ?? "");
  const [issued, setIssued] = useState<string | null>(licence?.issued ?? null);
  const [expires, setExpires] = useState<string | null>(licence?.expires ?? null);
  const [noExpiry, setNoExpiry] = useState(licence?.noExpiry ?? false);
  const [credentialId, setCredentialId] = useState(licence?.credentialId ?? "");
  const [credentialUrl, setCredentialUrl] = useState(licence?.credentialUrl ?? "");
  const [showWhenExpired, setShowWhenExpired] = useState(licence?.showWhenExpired ?? false);
  // A picked document is held until Save, so cancelling the sheet leaves no
  // file behind in the bucket.
  const [file, setFile] = useState<File | null>(null);
  const [current, setCurrent] = useState<Licence | null>(licence);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = current ? licenceStatus(current, cv.reviews) : null;
  const thisYear = Number(currentMonth().slice(0, 4));

  const save = async () => {
    const problem = firstProblem(
      checkText("Name", name, 2, 200, true),
      checkText("Issuing organisation", issuer, 2, 200, false),
      noExpiry ? null : checkRange(issued, expires, "The expiry date"),
      checkText("Credential ID", credentialId, 1, 120, false),
      checkUrl("Credential link", credentialUrl, false)
    );
    if (problem) {
      setError(problem);
      return;
    }
    const draft: LicenceDraft = {
      name,
      issuingBody: issuer,
      issued,
      expires: noExpiry ? null : expires,
      noExpiry,
      credentialId,
      credentialUrl,
      showWhenExpired,
    };
    setBusy(true);
    setError(null);
    const result = await saveLicence(userId, draft, current, file, nextPosition(cv.licences));
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved(result.licence);
    onClose();
  };

  const remove = current
    ? async () => {
        setBusy(true);
        const result = await deleteLicence(userId, current);
        setBusy(false);
        if (!result.ok) {
          setError(result.message);
          return false;
        }
        onDeleted(current.id);
        onClose();
        return true;
      }
    : undefined;

  return (
    <EntryFrame
      open={open}
      onClose={onClose}
      title={licence ? t("Edit licence") : t("Add a licence")}
      saveLabel={t("Save licence")}
      busy={busy}
      error={error}
      onSave={() => void save()}
      onDelete={remove}
      deleteLabel={t("Delete licence")}
    >
      {status && status.kind !== "none" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-charcoal-soft">{t("Review")}</span>
            <LicenceStatusBadge status={status} />
          </div>
          {status.kind === "rejected" && <RejectionNote reason={status.reason} />}
          {status.kind === "verified" && <p className="text-xs text-charcoal-soft">{t(REPLACE_RESETS_REVIEW)}</p>}
        </div>
      )}

      <Field id="lic-name" label={t("Name")} value={name} onChange={setName} placeholder={t("e.g. Certified Personal Trainer")} maxLength={200} />
      <Field id="lic-issuer" label={t("Issuing organisation")} value={issuer} onChange={setIssuer} placeholder={t("Who issued it")} maxLength={200} />
      <div className="grid grid-cols-2 gap-2.5">
        <MonthYearField id="lic-issued" label={t("Issued")} value={issued} onChange={setIssued} optional />
        <MonthYearField
          id="lic-expires"
          label={t("Expires")}
          value={noExpiry ? null : expires}
          onChange={setExpires}
          optional
          disabled={noExpiry}
          fromYear={thisYear - 30}
          toYear={thisYear + 15}
        />
      </div>
      <ToggleRow label={t("Doesn't expire")} checked={noExpiry} onChange={setNoExpiry} />

      <Field
        id="lic-cid"
        label={t("Credential ID")}
        value={credentialId}
        onChange={setCredentialId}
        placeholder={t("Optional")}
        maxLength={120}
        note={
          <p className="flex items-center gap-1.5 text-xs text-charcoal-soft">
            <Lock size={13} className="shrink-0" /> {t("Only you and our review team can see this")}
          </p>
        }
      />
      <Field
        id="lic-url"
        label={t("Credential link")}
        value={credentialUrl}
        onChange={setCredentialUrl}
        placeholder={t("https:// (optional, shown to clients)")}
        type="url"
        inputMode="url"
        maxLength={2000}
      />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-charcoal-soft">{t("Document for verification")}</p>
        <AttachDocument
          bucket="certifications"
          path={current?.documentPath ?? null}
          pendingName={file?.name ?? null}
          onClearPending={() => setFile(null)}
          onFile={async (f) => {
            setFile(f);
            return { ok: true };
          }}
          onRemove={
            current?.documentPath
              ? async () => {
                  const result = await removeLicenceDocument(current);
                  if (!result.ok) return result;
                  setCurrent(result.licence);
                  onSaved(result.licence);
                  return { ok: true };
                }
              : undefined
          }
          label={name.trim() || t("Licence document")}
          disabled={busy}
        />
        <p className="text-xs text-charcoal-soft leading-[1.4]">
          {t("Private: only our review team sees the document. Clients see a Verified badge once it's approved.")}
        </p>
      </div>

      {!noExpiry && (
        <ToggleRow
          label={t("Show to clients after it expires")}
          sub={t("Off: expired licences are hidden from clients")}
          checked={showWhenExpired}
          onChange={setShowWhenExpired}
        />
      )}

      {/* Publishing is its own act on a saved licence (20261120150000): never part of Save. */}
      {current ? (
        <LicencePublishRow
          licence={current}
          onChanged={(l) => {
            setCurrent(l);
            onSaved(l);
          }}
        />
      ) : (
        <p className="text-xs text-charcoal-soft leading-[1.4]">{t(PUBLISH_STRINGS.newLicence)}</p>
      )}
    </EntryFrame>
  );
};

// ---------------------------------------------------------------------------
// Skills and languages: saved as they change, no Save button.
// ---------------------------------------------------------------------------

export const SkillsLanguagesSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  userId: string;
  cv: MyCv;
  setCv: React.Dispatch<React.SetStateAction<MyCv | null>>;
}> = ({ open, onClose, userId, cv, setCv }) => {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [language, setLanguage] = useState("");
  const [proficiency, setProficiency] = useState<Proficiency>("fluent");

  const saveSkills = async (skills: string[]) => {
    const before = cv.profile.skills;
    setCv((c) => (c ? { ...c, profile: { ...c.profile, skills } } : c));
    const result = await saveCvProfile(userId, { skills });
    if (!result.ok) {
      setError(result.message);
      setCv((c) => (c ? { ...c, profile: { ...c.profile, skills: before } } : c));
    } else setError(null);
  };

  const addLanguage = async () => {
    const problem = checkText("Language", language, 2, 80, true);
    if (problem) {
      setError(problem);
      return;
    }
    if (cv.languages.some((l) => l.language.toLowerCase() === language.trim().toLowerCase())) {
      setError(t("That language is already on your CV."));
      return;
    }
    setBusy(true);
    const result = await saveEntry(userId, "languages", { language, proficiency }, { position: nextPosition(cv.languages) });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setLanguage("");
    setCv((c) => (c ? { ...c, languages: [...c.languages, result.entry] } : c));
  };

  const changeLevel = async (id: string, level: Proficiency) => {
    const row = cv.languages.find((l) => l.id === id);
    if (!row) return;
    const result = await saveEntry(userId, "languages", { language: row.language, proficiency: level }, { id });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCv((c) => (c ? { ...c, languages: c.languages.map((l) => (l.id === id ? result.entry : l)) } : c));
  };

  const removeLanguage = async (id: string) => {
    const result = await deleteEntry("languages", id);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCv((c) => (c ? { ...c, languages: c.languages.filter((l) => l.id !== id) } : c));
  };

  const SELECT =
    "min-h-[44px] rounded-xl bg-cream-soft border border-charcoal/10 px-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <BottomSheet open={open} onClose={onClose} title={t("Skills and languages")} size="tall">
      <div className="space-y-6">
        <ChipInput
          id="cv-skills"
          label={t("Skills")}
          values={cv.profile.skills}
          onChange={(v) => void saveSkills(v)}
          placeholder={t("e.g. Mobility")}
          max={30}
          maxTotal={900}
        />

        <div>
          <p className="text-xs font-semibold text-charcoal-soft mb-1.5">{t("Languages")}</p>
          <div className="space-y-2">
            {cv.languages.map((l) => (
              <div key={l.id} className="flex items-center gap-2">
                <span className="flex-1 min-w-0 truncate text-sm font-semibold text-charcoal">{l.language}</span>
                <select
                  aria-label={t("{language} level", { language: l.language })}
                  value={l.proficiency}
                  onChange={(e) => void changeLevel(l.id, e.target.value as Proficiency)}
                  className={SELECT}
                >
                  {PROFICIENCIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {tx(p.label, "language level")}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void removeLanguage(l.id)}
                  aria-label={t("Remove {language}", { language: l.language })}
                  className="tap w-11 h-11 flex items-center justify-center text-charcoal-faint shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-2 mt-3">
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <label htmlFor="cv-lang" className="text-[11.5px] text-charcoal-soft">
                {t("Add a language")}
              </label>
              <input
                id="cv-lang"
                value={language}
                maxLength={80}
                onChange={(e) => setLanguage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addLanguage();
                  }
                }}
                placeholder={t("e.g. Arabic")}
                className={`${INPUT} !min-h-[44px]`}
              />
            </div>
            <select
              aria-label={t("Level")}
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value as Proficiency)}
              className={`${SELECT} max-w-[42%]`}
            >
              {PROFICIENCIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {tx(p.label, "language level")}
                </option>
              ))}
            </select>
          </div>
          <Button fullWidth variant="outline" className="mt-2.5" disabled={busy || !language.trim()} onClick={() => void addLanguage()}>
            {busy ? t("Adding…") : t("Add language")}
          </Button>
        </div>

        {error && <p className="text-xs font-semibold text-status-high">{t(error)}</p>}
        <p className="text-[11.5px] text-charcoal-soft">{t("Changes save as you make them.")}</p>
      </div>
    </BottomSheet>
  );
};
