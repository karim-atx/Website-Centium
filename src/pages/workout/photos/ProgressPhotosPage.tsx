import { useEffect, useRef, useState } from "react";
import { Camera, Check, Image as ImageIcon, ImageOff, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { Button } from "../../../components/ui/Button";
import { Toast } from "../../../components/ui/Toast";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { G3Body, LockedRow } from "../../../components/premium/g3/parts";
import { useG3 } from "../../../components/premium/g3/useG3";
import { G4Route } from "../../../components/premium/g4/parts";
import { useG4Available } from "../../../components/premium/g4/useG4";
import { useApp } from "../../../context/AppContext";
import { useHideNumbers } from "../../../hooks/useHideNumbers";
import { usePremium } from "../../../services/premium/hooks";
import {
  addProgressPhoto,
  deleteProgressPhoto,
  fetchMayAddPhotos,
  fetchPhotoPair,
  fetchPhotos,
  type PairWithUrls,
  type SignedPhoto,
} from "../../../services/premium/g4Calls";
import {
  POSES,
  daysApartText,
  pairOrder,
  pairReady,
  photoFileError,
  photosAddable,
  photosVisible,
  poseName,
  takenOnValid,
  type Pose,
} from "../../../services/premium/g4";
import { appLocale } from "../../../i18n/format";
import { t } from "../../../i18n/core";
import { camera as phoneCamera, useNativeCamera, useProtectedScreen } from "../../../platform/camera";

// undrawn (Round G, no handover)
// Round G4 · /app/workout/progress-photos, the member's own progress photos:
// the list (my_progress_photos(), newest first, each signed from the private
// 'progress-photos' bucket), Add (only when i_may_add_progress_photos() says
// so; the type and size are checked before the upload), Delete (the row and
// the file), and two side by side (progress_photo_pair(a, b), earlier first,
// "{n} days apart"). Never shown to anybody else.
//
// RECOVERY-SENSITIVE MODE: the route doesn't exist (G4Route blocked), and no
// reader is called (useG3's enabled flag is photosVisible).
//
// IN THE APP (App-Centium ROUND_J.md §4.3): the page blocks screenshots and
// the Recents preview (Karim, D14), and "Take photo" is Centium's own camera:
// the photo never reaches the phone's gallery or photo backup, and carries no
// EXIF. "Choose from gallery" stays for a photo the member already has.

const longDay = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString(appLocale("en-US"), { day: "numeric", month: "short", year: "numeric" });

export default function ProgressPhotosPage() {
  const hideNumbers = useHideNumbers();
  return (
    <G4Route fallback="/app/workout" blocked={hideNumbers}>
      <PhotosScreen />
    </G4Route>
  );
}

function PhotosScreen() {
  const g4 = useG4Available();
  const hideNumbers = useHideNumbers();
  const { premium } = usePremium();
  const visible = photosVisible({ premiumOn: premium?.premiumOn === true, g4, hideNumbers });
  useProtectedScreen(visible);
  const photos = useG3(fetchPhotos, "photos", visible);
  const [mayAdd, setMayAdd] = useState<boolean | null>(null);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [comparing, setComparing] = useState<[string, string] | null>(null);
  const [deleting, setDeleting] = useState<SignedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone?: "error" } | null>(null);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    void fetchMayAddPhotos().then((v) => live && setMayAdd(v));
    return () => {
      live = false;
    };
  }, [visible]);

  if (!visible) return null;
  const canAdd = photosAddable({ visible, mayAdd });

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p.slice(-1), id]));

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    const r = await deleteProgressPhoto(deleting.id, deleting.path);
    setBusy(false);
    setDeleting(null);
    if (!r.ok) return setToast({ message: r.message, tone: "error" });
    setPicked((p) => p.filter((x) => x !== deleting.id));
    photos.reload();
  };

  return (
    <div className="animate-fade-slide-up pb-10" data-g4="progress-photos-page">
      <PageHeader
        title={t("Progress photos")}
        showBack
        right={
          canAdd ? (
            <button type="button" onClick={() => setAdding(true)} className="tap inline-flex items-center gap-1 rounded-full bg-primary-fill px-3 py-1.5 text-[12.5px] font-bold text-on-primary-fill">
              <Plus size={14} aria-hidden />
              {t("Add")}
            </button>
          ) : undefined
        }
      />
      <p className="mb-3 text-[12px] text-charcoal-faint">{t("Only you can see these photos.")}</p>

      <G3Body state={photos.state} onRetry={photos.reload} otherwise={photos.state.kind === "premium" ? <LockedRow feature="progress_photos" title={t("Progress photos")} /> : null}>
        {(list) =>
          list.length === 0 ? (
            <div className="rounded-2xl bg-cream-card px-4 py-6 text-center shadow-soft">
              <p className="text-[13.5px] font-semibold text-charcoal">{t("No progress photos yet.")}</p>
              {canAdd && <p className="mt-1 text-[12px] text-charcoal-faint">{t("Add one to start. Choose two to compare them side by side.")}</p>}
            </div>
          ) : (
            <>
              <p className="mb-2 text-[12px] text-charcoal-soft">{t("Choose two photos to compare them.")}</p>
              <ul className="grid grid-cols-2 gap-2.5">
                {list.map((p) => {
                  const on = picked.includes(p.id);
                  return (
                    <li key={p.id} data-g4-photo={p.pose} className={`overflow-hidden rounded-2xl bg-cream-card shadow-soft ${on ? "ring-2 ring-primary" : ""}`}>
                      <button type="button" aria-pressed={on} onClick={() => toggle(p.id)} className="tap relative block w-full">
                        <PhotoImage url={p.url} alt={t("Progress photo, {pose}, {day}", { pose: poseName(p.pose), day: longDay(p.takenOn) })} />
                        {on && (
                          <span className="absolute top-2 end-2 w-6 h-6 rounded-full bg-primary-fill text-on-primary-fill flex items-center justify-center">
                            <Check size={14} strokeWidth={3} aria-hidden />
                          </span>
                        )}
                      </button>
                      <div className="flex items-center gap-1 px-3 py-2">
                        <span className="flex-1 min-w-0">
                          <span className="block text-[12.5px] font-bold text-charcoal">{longDay(p.takenOn)}</span>
                          <span className="block truncate text-[11px] text-charcoal-faint">{p.note ? `${poseName(p.pose)} · ${p.note}` : poseName(p.pose)}</span>
                        </span>
                        <button type="button" aria-label={t("Delete photo")} onClick={() => setDeleting(p)} className="tap w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-charcoal-soft">
                          <Trash2 size={15} aria-hidden />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {pairReady(picked[0] ?? null, picked[1] ?? null) && (
                <Button variant="primary" size="lg" fullWidth className="mt-4" onClick={() => setComparing([picked[0], picked[1]])}>
                  {t("Compare")}
                </Button>
              )}
              {comparing && <CompareSheet ids={comparing} photos={list} onClose={() => setComparing(null)} />}
            </>
          )
        }
      </G3Body>

      {adding && canAdd && (
        <AddPhotoSheet
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            setToast({ message: t("Photo added.") });
            photos.reload();
          }}
        />
      )}

      <ConfirmCard
        open={!!deleting}
        title={t("Delete this photo?")}
        subtitle={t("It is deleted for good.")}
        confirmLabel={t("Delete")}
        tone="destructive"
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
      />
      <Toast open={!!toast} message={toast?.message ?? ""} tone={toast?.tone} onExpire={() => setToast(null)} />
    </div>
  );
}

function PhotoImage({ url, alt }: { url: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed)
    return (
      <span className="flex aspect-[3/4] w-full items-center justify-center bg-cream-soft text-charcoal-faint" role="img" aria-label={alt}>
        <ImageOff size={20} aria-hidden />
      </span>
    );
  return <img src={url} alt={alt} onError={() => setFailed(true)} className="block aspect-[3/4] w-full object-cover" />;
}

function CompareSheet({ ids, photos, onClose }: { ids: [string, string]; photos: SignedPhoto[]; onClose: () => void }) {
  const a = photos.find((p) => p.id === ids[0]);
  const b = photos.find((p) => p.id === ids[1]);
  const [ordered] = useState(() => (a && b ? pairOrder(a, b) : null));
  const [state, setState] = useState<{ kind: "loading" } | { kind: "ready"; value: PairWithUrls | null } | { kind: "message"; text: string }>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    void fetchPhotoPair(ids[0], ids[1]).then((r) => {
      if (!live) return;
      if (r.kind === "ready") setState({ kind: "ready", value: r.value });
      else if (r.kind === "refused" || r.kind === "error") setState({ kind: "message", text: r.message });
      else setState({ kind: "message", text: t("Couldn't load this. Try again.") });
    });
    return () => {
      live = false;
    };
  }, [ids]);

  const pair = state.kind === "ready" ? state.value : null;
  const sides = pair
    ? [
        { day: pair.first.takenOn, url: pair.firstUrl },
        { day: pair.second.takenOn, url: pair.secondUrl },
      ]
    : ordered
      ? ordered.map((p) => ({ day: p.takenOn, url: p.url }))
      : [];

  return (
    <BottomSheet open onClose={onClose} title={t("Side by side")} size="tall">
      <div data-g4="photo-compare" className="pb-2">
        {state.kind === "message" ? (
          <p role="alert" className="py-4 text-[12.5px] font-semibold text-status-high">
            {state.text}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {sides.map((s, n) => (
                <figure key={n} className="overflow-hidden rounded-2xl bg-cream-card shadow-soft">
                  <PhotoImage url={s.url} alt={t("Progress photo, {day}", { day: longDay(s.day) })} />
                  <figcaption className="px-3 py-2 text-[12px] font-bold text-charcoal">
                    {n === 0 ? t("Earlier · {day}", { day: longDay(s.day) }) : t("Later · {day}", { day: longDay(s.day) })}
                  </figcaption>
                </figure>
              ))}
            </div>
            {pair && <p className="mt-3 text-center text-[13px] font-semibold text-charcoal-soft">{daysApartText(pair.daysBetween)}</p>}
            {state.kind === "loading" && <p className="mt-3 text-center text-[12px] text-charcoal-faint">{t("Loading…")}</p>}
          </>
        )}
      </div>
    </BottomSheet>
  );
}

function AddPhotoSheet({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { today, authUserId } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [takenOn, setTakenOn] = useState(today);
  const [pose, setPose] = useState<Pose>("front");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The preview stays on the device and is released with the sheet.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    const bad = photoFileError(f);
    if (bad) {
      setError(bad);
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const phone = useNativeCamera();
  const takeOnPhone = async () => {
    setError(null);
    const r = await phoneCamera.capturePhoto({ purpose: "progress" }).catch(() => null);
    if (!r) return setError(t("The camera couldn't start. Choose a photo from your gallery instead."));
    if ("cancelled" in r) {
      if (r.reason === "denied") setError(t("Camera access is off for Centium. Allow it in your phone's settings."));
      else if (r.reason !== "closed") setError(t("The camera couldn't start. Choose a photo from your gallery instead."));
      return;
    }
    pick(r.file);
  };

  const save = async () => {
    if (!authUserId) return;
    if (!file) return setError(t("Choose a photo."));
    if (!takenOnValid(takenOn, today)) return setError(t("Choose a date that isn't in the future."));
    setBusy(true);
    const r = await addProgressPhoto(authUserId, file, { takenOn, pose, note });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onAdded();
  };

  const chip = (on: boolean) =>
    `tap rounded-full px-3 py-1.5 text-[12px] font-bold border ${on ? "bg-primary-fill text-on-primary-fill border-transparent" : "bg-cream-card text-charcoal-soft border-charcoal/10"}`;

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={t("Add a progress photo")}
      size="tall"
      footer={
        <Button variant="primary" size="lg" fullWidth disabled={busy || !file} onClick={() => void save()}>
          {busy ? t("Saving…") : t("Save photo")}
        </Button>
      }
    >
      <div data-g4="add-photo" className="pb-2">
        <button type="button" onClick={() => fileRef.current?.click()} className="tap block w-full overflow-hidden rounded-2xl bg-cream-soft">
          {preview ? (
            <img src={preview} alt={t("The photo you chose")} className="block max-h-[260px] w-full object-contain" />
          ) : (
            <span className="flex h-[140px] flex-col items-center justify-center gap-1.5 text-charcoal-soft">
              <Plus size={20} aria-hidden />
              <span className="text-[13px] font-bold">{t("Choose a photo")}</span>
              <span className="text-[11px] text-charcoal-faint">{t("JPEG, PNG, WebP or HEIC, up to 10 MB")}</span>
            </span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,.heic,.heif" hidden onChange={(e) => pick(e.target.files?.[0] ?? undefined)} />
        {phone?.capture && (
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void takeOnPhone()} className="tap inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-fill px-3 py-2.5 text-[13px] font-bold text-on-primary-fill">
              <Camera size={15} aria-hidden />
              {t("Take photo")}
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="tap inline-flex items-center justify-center gap-1.5 rounded-xl bg-cream-soft px-3 py-2.5 text-[13px] font-bold text-charcoal">
              <ImageIcon size={15} aria-hidden />
              {t("Choose from gallery")}
            </button>
          </div>
        )}

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12px] font-semibold text-charcoal-soft">{t("Taken on")}</span>
          <input
            type="date"
            value={takenOn}
            max={today}
            onChange={(e) => setTakenOn(e.target.value)}
            className="w-full rounded-xl bg-cream-soft px-3 py-2.5 text-[14px] text-charcoal focus:outline-none"
          />
        </label>

        <p className="mt-4 mb-1.5 text-[12px] font-semibold text-charcoal-soft">{t("Pose")}</p>
        <div role="radiogroup" aria-label={t("Pose")} className="flex flex-wrap gap-1.5">
          {POSES.map((p) => (
            <button key={p} type="button" role="radio" aria-checked={pose === p} onClick={() => setPose(p)} className={chip(pose === p)}>
              {poseName(p)}
            </button>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12px] font-semibold text-charcoal-soft">{t("Note (optional)")}</span>
          <input
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl bg-cream-soft px-3 py-2.5 text-[14px] text-charcoal focus:outline-none"
          />
        </label>

        {error && (
          <p role="alert" className="mt-3 text-[12.5px] font-semibold text-status-high">
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
