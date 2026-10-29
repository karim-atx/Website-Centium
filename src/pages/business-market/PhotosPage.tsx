import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Camera, Ellipsis, Images, Lightbulb, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useOnline } from "../../hooks/useOnline";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { FORUM_PHOTO_ACCEPT } from "../../services/forum/photo";
import { removeBusinessImage, uploadBusinessImage } from "../../services/business-more";
import { addBusinessPhoto, deleteBusinessPhoto, fetchOwnPhotoImages, reorderBusinessPhotos, replaceBusinessPhoto, type OwnPhotoImage } from "../../services/business-market/listing";
import { moveId, moveTo, PHOTO_LIMIT, sortPhotos, type BusinessPhoto } from "../../services/business-market/listingLogic";
import { MarketProvider, useMarket } from "./MarketContext";
import { MarketError } from "../../components/market/MarketStates";
import { useIsDark } from "../../hooks/useIsDark";
import { ImageApprovalBadge, ImageApprovalNote, useOwnImage } from "../../components/moderation/ImageApproval";
import { BackHeader, CentredDialog, MasterSheet, PrimaryButton, SoonNote, lh, px, useMarketColors, useStrip } from "./listingParts";

// MA1-033 / 035 / 080 / 083 / 084 / 086 / 087 / 088 / 090-095 · Photos.
// Tile 1 is the cover (business_profiles.cover_url, MA1-033 K1): only the
// owner replaces or deletes it, through the Business Profile upload. The
// gallery after it is B13 MK-03 business_photos (Marketing permission): every
// new or replaced photo is "In review" until Centium approves it (the public
// sees approved photos only), "Not approved" shows the reason, at most 20
// (ATXF5), long-press and drag or Move left / right reorder them
// (reorder_business_photos). A gallery photo never becomes the cover (B13:
// cover_url stays the owner's choice), so "Set as cover" is not offered.
// Uploads strip metadata on the device first (K2, KEEP-SAFETY). While
// business_photos is absent (probe "pending") the old cover-only page stands.
// Round C Release 2: a new cover or photo (added or replaced) waits for an
// admin (business_cover / venue_photo). The uploader sees it here at once
// from image-staging with one badge, "Waiting for approval" or "Not
// approved"; the old row-status chip only shows on photos with no submission
// of theirs. Everyone else keeps the approved file until the new one is.

export default function PhotosPage() {
  return (
    <MarketProvider>
      <PhotosBody />
    </MarketProvider>
  );
}

type Sheet = null | "source" | "options" | "replace" | "upload";
type Target = { kind: "cover" } | { kind: "photo"; photo: BusinessPhoto };
type UpRow = { key: string; name: string; file: File; state: "waiting" | "uploading" | "done" | "failed"; message?: string };

const LONG_PRESS_MS = 350;

function PhotosBody() {
  const m = useMarket();
  const c = useMarketColors();
  const dark = useIsDark();
  const { v, kind, business } = m;
  const { authUserId } = useApp();
  const navigate = useNavigate();
  const online = useOnline();
  const reduced = useReducedMotion();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Target | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [ups, setUps] = useState<UpRow[] | null>(null);
  const [coverUp, setCoverUp] = useState<{ name: string; state: "waiting" | "failed"; file: File; replace: boolean; message?: string } | null>(null);
  const [toast, showToast] = useStrip();
  const [hasCamera, setHasCamera] = useState(false);
  const [drag, setDrag] = useState<{ id: string; order: string[] } | null>(null);
  const [announce, setAnnounce] = useState("");
  const camRef = useRef<HTMLInputElement | null>(null);
  const libRef = useRef<HTMLInputElement | null>(null);
  const pressRef = useRef<{ timer: number; id: string } | null>(null);
  const ownCover = useOwnImage("business_cover", business?.id);
  const [ownPhotos, setOwnPhotos] = useState<Map<string, OwnPhotoImage>>(new Map());
  const [ownTick, setOwnTick] = useState(0);
  const refreshOwnPhotos = () => setOwnTick((t) => t + 1);
  useEffect(() => {
    let alive = true;
    void fetchOwnPhotoImages().then((map) => alive && setOwnPhotos(map));
    return () => {
      alive = false;
    };
  }, [ownTick]);

  useEffect(() => {
    let alive = true;
    void navigator.mediaDevices
      ?.enumerateDevices?.()
      .then((d) => alive && setHasCamera(d.some((x) => x.kind === "videoinput")))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const back = () => navigate(m.tabHref("overview"));
  const eyebrow = kind === "store" ? "Products · Overview" : "Marketplace · Overview";
  if (m.error && !business) return <MarketError thing="your photos" onRetry={m.reload} />;
  const cover = (ownCover.image?.status === "pending" && ownCover.image.url) || business?.coverUrl || null;
  /** What the uploader sees for a gallery photo: their pending file, else the approved one. */
  const photoUrl = (p: BusinessPhoto) => {
    const own = ownPhotos.get(p.id);
    return (own?.status === "pending" && own.url) || p.url;
  };
  const anyPending = ownCover.image?.status === "pending" ? ownCover.image : ([...ownPhotos.values()].find((o) => o.status === "pending") ?? null);
  const galleryLive = m.backend.photos === "live" && m.photos !== null;
  const gallery = sortPhotos(m.photos ?? []);
  const shownGallery = drag ? (drag.order.map((id) => gallery.find((p) => p.id === id)).filter(Boolean) as BusinessPhoto[]) : gallery;
  const total = (cover ? 1 : 0) + gallery.length;
  const full = gallery.length >= PHOTO_LIMIT;
  const canGallery = galleryLive && online && m.can("marketing");
  const owner = m.isOwner && online;
  // Add photos: the gallery when it is live; before B13 the owner's first photo is the cover.
  const canAdd = galleryLive ? canGallery && !full : owner && !cover;
  const addVisible = galleryLive ? !full : true;

  const setGallery = (next: BusinessPhoto[]) => m.setPhotos(sortPhotos(next));

  // ---- cover (owner, Business Profile upload)
  const runCoverUpload = async (file: File, replace: boolean) => {
    if (!business || !authUserId) return;
    setCoverUp({ name: file.name || "Photo", state: "waiting", file, replace });
    setSheet("upload");
    const r = await uploadBusinessImage({ kind: "cover", uid: authUserId, ownerId: business.ownerId, businessId: business.id, file });
    if (!r.ok) {
      setCoverUp({ name: file.name || "Photo", state: "failed", file, replace, message: r.message });
      return;
    }
    ownCover.refresh();
    setCoverUp(null);
    setSheet(null);
    showToast("Cover photo sent. It shows on Explore once approved.");
  };

  // ---- gallery uploads, one after another (MA1-086)
  const uploadRows = async (rows: UpRow[]) => {
    if (!business || !authUserId) return;
    let list = rows;
    let added: BusinessPhoto[] = [];
    let base = gallery.length ? Math.max(...gallery.map((p) => p.position)) + 1 : 0;
    for (const row of rows) {
      if (row.state === "done") continue;
      list = list.map((x) => (x.key === row.key ? { ...x, state: "uploading", message: undefined } : x));
      setUps(list);
      const r = await addBusinessPhoto({ uid: authUserId, businessId: business.id, gymId: m.venue?.gymId ?? null, file: row.file, position: base });
      if (r.ok) {
        base += 1;
        added = [...added, r.value];
        list = list.map((x) => (x.key === row.key ? { ...x, state: "done" } : x));
      } else {
        list = list.map((x) => (x.key === row.key ? { ...x, state: "failed", message: r.message } : x));
      }
      setUps(list);
    }
    const next = [...(m.photos ?? []), ...added];
    if (added.length) {
      setGallery(next);
      refreshOwnPhotos();
    }
    if (list.every((x) => x.state === "done")) {
      const n = list.length;
      setUps(null);
      setSheet(null);
      showToast(`${n === 1 ? "1 photo" : `${n} photos`} added. They show on Explore once approved.`);
    }
    return next;
  };

  const startGalleryUpload = (files: File[]) => {
    const room = PHOTO_LIMIT - gallery.length;
    const take = files.slice(0, Math.max(0, room));
    if (!take.length) return;
    const rows: UpRow[] = take.map((f, i) => ({ key: `${Date.now()}-${i}`, name: f.name || "Photo", file: f, state: "waiting" }));
    setUps(rows);
    setSheet("upload");
    void uploadRows(rows);
    if (files.length > take.length) showToast(`Only ${take.length} more fit. A listing shows up to 20 photos.`, "neutral");
  };

  const runReplace = async (photo: BusinessPhoto, file: File) => {
    if (!business || !authUserId) return;
    const rows: UpRow[] = [{ key: photo.id, name: file.name || "Photo", file, state: "uploading" }];
    setUps(rows);
    setSheet("upload");
    const r = await replaceBusinessPhoto({ uid: authUserId, businessId: business.id, photo, file });
    if (!r.ok) {
      setUps([{ ...rows[0], state: "failed", message: r.message }]);
      return;
    }
    refreshOwnPhotos();
    setUps(null);
    setSheet(null);
    showToast("Photo replaced. It shows on Explore once approved.");
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    if (sheet === "replace" && target) {
      if (target.kind === "cover") void runCoverUpload(files[0], true);
      else void runReplace(target.photo, files[0]);
      return;
    }
    if (galleryLive) startGalleryUpload(files);
    else void runCoverUpload(files[0], false);
  };

  const doDelete = async () => {
    if (!business || !authUserId || !confirmDelete) return;
    setBusy(true);
    if (confirmDelete.kind === "cover") {
      const r = await removeBusinessImage({ kind: "cover", uid: authUserId, ownerId: business.ownerId, businessId: business.id, previousPath: business.coverPath });
      setBusy(false);
      setConfirmDelete(null);
      setDeleteStep(1);
      if (!r.ok) return showToast(r.message, "error");
      m.setBusiness({ ...business, coverPath: null, coverUrl: null });
    } else {
      const photo = confirmDelete.photo;
      const r = await deleteBusinessPhoto({ uid: authUserId, photo });
      setBusy(false);
      setConfirmDelete(null);
      setDeleteStep(1);
      if (!r.ok) return showToast(r.message, "error");
      setGallery((m.photos ?? []).filter((p) => p.id !== photo.id));
    }
    m.refreshStrength();
    showToast("Photo deleted.");
  };

  const saveOrder = async (ids: string[], before: BusinessPhoto[]) => {
    if (!business) return;
    const next = ids.map((id, i) => ({ ...(before.find((p) => p.id === id) as BusinessPhoto), position: i }));
    setGallery(next);
    const r = await reorderBusinessPhotos(business.id, ids);
    if (!r.ok) {
      setGallery(before);
      return showToast(r.message, "error");
    }
    showToast("Photo moved.");
  };

  const move = (photo: BusinessPhoto, dir: -1 | 1) => {
    const ids = gallery.map((p) => p.id);
    const next = moveId(ids, photo.id, dir);
    setSheet(null);
    setAnnounce(`Moved to position ${next.indexOf(photo.id) + 1 + (cover ? 1 : 0)} of ${total}`);
    void saveOrder(next, gallery);
  };

  // ---- long-press drag (MA1-035): pointer and touch; keyboard users use Move left / right.
  const onPointerDown = (e: React.PointerEvent, id: string) => {
    if (!canGallery || e.button !== 0) return;
    const pointerId = e.pointerId;
    const el = e.currentTarget as HTMLElement;
    pressRef.current = {
      id,
      timer: window.setTimeout(() => {
        try {
          el.setPointerCapture(pointerId);
        } catch {
          /* the pointer may already be gone */
        }
        setDrag({ id, order: gallery.map((p) => p.id) });
      }, LONG_PRESS_MS),
    };
  };
  const cancelPress = () => {
    if (pressRef.current) window.clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const over = document.elementsFromPoint(e.clientX, e.clientY).find((x) => (x as HTMLElement).dataset?.photoId && (x as HTMLElement).dataset.photoId !== drag.id) as HTMLElement | undefined;
    const to = over ? drag.order.indexOf(over.dataset.photoId as string) : -1;
    if (to >= 0 && drag.order[to] !== drag.id) setDrag({ id: drag.id, order: moveTo(drag.order, drag.id, to) });
  };
  const onPointerUp = () => {
    cancelPress();
    if (!drag) return;
    const ids = drag.order;
    const before = gallery;
    setDrag(null);
    if (ids.join() === before.map((p) => p.id).join()) return;
    setAnnounce(`Moved to position ${ids.indexOf(drag.id) + 1 + (cover ? 1 : 0)} of ${total}`);
    void saveOrder(ids, before);
  };

  const countLine =
    total === 0
      ? "No photos yet · the first photo is your cover"
      : `${total} photo${total === 1 ? "" : "s"}${galleryLive && gallery.length > 1 ? " · drag to reorder" : ""}${cover ? " · the first photo is your cover" : ""}`;

  const source = (replace: boolean) => {
    const limit = !replace && galleryLive && full;
    const disabled = !replace && !canAdd;
    const name = target?.kind === "photo" ? target.photo.caption ?? "this photo" : "Cover photo";
    return (
      <MasterSheet open onClose={() => setSheet(null)} title={replace ? "Replace photo" : "Add photos"}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "18px 0 8px", opacity: disabled ? 0.45 : 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
            {hasCamera && (
              <button
                type="button"
                aria-label="Take a photo"
                aria-disabled={disabled}
                onClick={() => !disabled && camRef.current?.click()}
                style={{ width: 96, height: 96, borderRadius: 999, background: c.ink, color: c.page, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 24px rgba(36,31,27,0.22)", border: 0 }}
              >
                <Camera size={30} strokeWidth={2} aria-hidden />
              </button>
            )}
            <button
              type="button"
              aria-label="Choose from library"
              aria-disabled={disabled}
              onClick={() => !disabled && libRef.current?.click()}
              style={{ width: 96, height: 96, borderRadius: 999, background: c.pale, color: c.pdark, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(95,80,147,0.14)", border: 0 }}
            >
              <Images size={26} strokeWidth={2} aria-hidden />
            </button>
          </div>
          <p style={{ fontSize: px(20), fontWeight: 700, lineHeight: lh(26), marginBottom: 8, color: c.ink, textWrap: "balance" } as React.CSSProperties}>
            {replace ? `Replace ${name}` : limit ? "You've reached 20 photos" : "Take a photo, or choose from your library"}
          </p>
          <p style={{ fontSize: px(13.5), lineHeight: lh(19), color: c.ink2, maxWidth: 280, textWrap: "pretty" } as React.CSSProperties}>
            {replace
              ? "The new photo keeps the same place in your gallery."
              : limit
                ? "That's the most a listing can show. Remove a photo to add another."
                : "Add photos of your real space. You can reorder them after."}
          </p>
        </div>
        {disabled && !limit && !galleryLive && <SoonNote>Adding more photos is coming soon.</SoonNote>}
        {disabled && !limit && galleryLive && !m.can("marketing") && <SoonNote>You need the Marketing permission to add photos. Ask the owner.</SoonNote>}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 14, padding: "10px 12px", borderRadius: 12, background: c.tealbg, color: c.tealink }}>
          <Lightbulb size={15} strokeWidth={2.2} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: px(12), lineHeight: lh(17) }}>Real photos of your space, in landscape and good light, get more profile opens. Up to 20 photos.</p>
        </div>
      </MasterSheet>
    );
  };

  const optionRows = (t: Target) => {
    if (t.kind === "cover") return [{ k: "replace", t: "Replace", I: RefreshCw }, { k: "delete", t: "Delete", I: Trash2 }];
    const i = gallery.findIndex((p) => p.id === t.photo.id);
    return [
      ...(i > 0 ? [{ k: "left", t: "Move left", I: ArrowLeft }] : []),
      ...(i >= 0 && i < gallery.length - 1 ? [{ k: "right", t: "Move right", I: ArrowRight }] : []),
      { k: "replace", t: "Replace", I: RefreshCw },
      { k: "delete", t: "Delete", I: Trash2 },
    ];
  };
  const canOptions = (t: Target) => (t.kind === "cover" ? owner : canGallery);

  // One badge per tile: the uploader's own submission when there is one, else the row's status.
  const tileChip = (p: BusinessPhoto) =>
    ownPhotos.has(p.id) ? (
      <ImageApprovalBadge state={ownPhotos.get(p.id) ?? null} className="absolute right-2 top-2" />
    ) : p.status === "in_review" ? (
      <span style={{ position: "absolute", right: 8, top: 8, fontSize: px(10), fontWeight: 800, color: c.caution, background: c.cautionbg, borderRadius: 999, padding: "2px 8px" }}>In review</span>
    ) : p.status === "rejected" ? (
      <span style={{ position: "absolute", right: 8, top: 8, fontSize: px(10), fontWeight: 800, color: c.high, background: c.highbg, borderRadius: 999, padding: "2px 8px" }}>Not approved</span>
    ) : null;

  const optionsButton = (t: Target, label: string) => (
    <button
      type="button"
      aria-label={label}
      disabled={!canOptions(t)}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => {
        setTarget(t);
        setSheet("options");
      }}
      style={{ position: "absolute", right: 4, bottom: 4, width: 36, height: 36, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", color: c.ink, background: "transparent", border: 0, opacity: canOptions(t) ? 1 : 0.4 }}
    >
      <span style={{ width: 28, height: 28, borderRadius: 999, background: c.card, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ellipsis size={16} strokeWidth={2.4} aria-hidden />
      </span>
    </button>
  );

  const posOf = (t: Target) => (t.kind === "cover" ? 1 : gallery.findIndex((p) => p.id === t.photo.id) + 1 + (cover ? 1 : 0));

  return (
    <div style={{ color: c.ink, marginTop: -4 }}>
      <BackHeader eyebrow={eyebrow} title="Photos" onBack={back} backLabel="Back to Overview" />
      <div style={{ borderRadius: 18, background: c.pale, padding: "12px 14px", display: "flex", gap: 10 }}>
        <Lightbulb size={16} strokeWidth={2.2} color={c.pdark} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: px(12), lineHeight: lh(17), color: c.pdark }}>{v.photoTip}</p>
      </div>
      <p style={{ fontSize: px(12), fontWeight: 700, color: c.ink2, margin: "14px 2px 8px" }} aria-live="polite">
        {countLine}
      </p>
      <span aria-live="polite" className="sr-only">
        {announce}
      </span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, touchAction: drag ? "none" : undefined }} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        {cover && (
          <div style={{ position: "relative", aspectRatio: "4 / 3", borderRadius: 16, overflow: "hidden", background: c.pale }}>
            <img src={cover} alt="Cover photo" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <span style={{ position: "absolute", left: 8, top: 8, fontSize: px(10), fontWeight: 800, color: c.onfill, background: c.fill, borderRadius: 999, padding: "2px 8px" }}>Cover</span>
            <ImageApprovalBadge state={ownCover.image} className="absolute right-2 top-2" />
            {optionsButton({ kind: "cover" }, "Photo options, Cover photo")}
          </div>
        )}
        {shownGallery.map((p, i) => {
          const lifted = drag?.id === p.id;
          const n = i + 1 + (cover ? 1 : 0);
          return (
            <div
              key={p.id}
              data-photo-id={p.id}
              onPointerDown={(e) => onPointerDown(e, p.id)}
              onPointerLeave={() => !drag && cancelPress()}
              onContextMenu={(e) => canGallery && e.preventDefault()}
              style={{
                position: "relative",
                aspectRatio: "4 / 3",
                borderRadius: 16,
                overflow: "hidden",
                background: c.pale,
                transform: lifted ? "scale(1.04) rotate(-2deg)" : "none",
                boxShadow: lifted ? (dark ? "0 16px 34px rgba(0,0,0,0.5)" : "0 16px 34px rgba(36,31,27,0.28)") : "none",
                zIndex: lifted ? 2 : 1,
                transition: reduced ? "none" : "transform .15s",
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
            >
              {/* A teammate's photo waiting for approval has no public file yet: the tile shows its chip only. */}
              <img key={photoUrl(p)} src={photoUrl(p)} alt={p.caption ?? `Photo ${n}`} draggable={false} onError={(e) => (e.currentTarget.style.visibility = "hidden")} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
              {n === 1 && <span style={{ position: "absolute", left: 8, top: 8, fontSize: px(10), fontWeight: 800, color: c.onfill, background: c.fill, borderRadius: 999, padding: "2px 8px" }}>Cover</span>}
              {tileChip(p)}
              {p.caption && (
                <span style={{ position: "absolute", left: 8, bottom: 8, maxWidth: "calc(100% - 52px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: px(10.5), fontWeight: 700, color: c.ink, background: c.card, borderRadius: 999, padding: "2px 8px" }}>
                  {p.caption}
                </span>
              )}
              {optionsButton({ kind: "photo", photo: p }, `Photo options, ${p.caption ?? `photo ${n}`}`)}
            </div>
          );
        })}
        {addVisible && (
          <button
            type="button"
            onClick={() => {
              setTarget(null);
              setSheet("source");
            }}
            disabled={!(galleryLive ? canGallery : owner)}
            style={{ position: "relative", aspectRatio: "4 / 3", borderRadius: 16, border: `1.5px dashed ${c.fill}`, background: "transparent", color: c.pdark, display: "flex", alignItems: "center", justifyContent: "center", opacity: (galleryLive ? canGallery : owner) ? 1 : 0.4 }}
          >
            <Plus size={22} strokeWidth={1.8} aria-hidden />
            <span style={{ position: "absolute", left: 8, bottom: 8, fontSize: px(10.5), fontWeight: 700, color: c.ink, background: c.card, borderRadius: 999, padding: "2px 8px" }}>Add photos</span>
          </button>
        )}
      </div>

      <ImageApprovalNote state={anyPending} className="mt-[10px]" />

      <input ref={camRef} type="file" accept={FORUM_PHOTO_ACCEPT} capture="environment" hidden onChange={onPick} />
      <input ref={libRef} type="file" accept={FORUM_PHOTO_ACCEPT} multiple={galleryLive && sheet !== "replace"} hidden onChange={onPick} />

      {sheet === "source" && source(false)}
      {sheet === "replace" && source(true)}
      {sheet === "options" && target && (
        <MasterSheet open onClose={() => setSheet(null)} title="Photo options">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <img src={target.kind === "cover" ? cover ?? "" : photoUrl(target.photo)} alt="" style={{ width: 64, height: 48, borderRadius: 10, objectFit: "cover" }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: px(14), fontWeight: 800, color: c.ink }}>{target.kind === "cover" ? "Cover photo" : target.photo.caption ?? `Photo ${posOf(target)}`}</span>
              <span style={{ display: "block", fontSize: px(11.5), color: c.faint }}>{`Photo ${posOf(target)} of ${total}`}</span>
            </span>
          </div>
          {(target.kind === "cover" ? ownCover.image : ownPhotos.get(target.photo.id)) && (
            <ImageApprovalNote state={(target.kind === "cover" ? ownCover.image : ownPhotos.get(target.photo.id)) ?? null} className="mb-[10px]" />
          )}
          {target.kind === "photo" && !ownPhotos.has(target.photo.id) && target.photo.status === "rejected" && (
            <p style={{ fontSize: px(12), lineHeight: lh(17), color: c.high, background: c.highbg, borderRadius: 12, padding: "10px 12px", marginBottom: 10 }}>
              {target.photo.rejectReason ? `Not approved: ${target.photo.rejectReason}` : "Not approved. Replace it or delete it."}
            </p>
          )}
          {optionRows(target).map((row, i) => (
            <button
              key={row.k}
              type="button"
              onClick={() => {
                if (row.k === "replace") setSheet("replace");
                if (row.k === "delete") {
                  setSheet(null);
                  setConfirmDelete(target);
                }
                if (target.kind === "photo" && (row.k === "left" || row.k === "right")) move(target.photo, row.k === "left" ? -1 : 1);
              }}
              style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 50, width: "100%", borderTop: i ? `1px solid ${c.div}` : "none", borderLeft: 0, borderRight: 0, borderBottom: 0, background: "transparent", color: row.k === "delete" ? c.high : c.ink, textAlign: "left" }}
            >
              <row.I size={18} strokeWidth={2.1} aria-hidden />
              <span style={{ flex: 1, fontSize: px(14), fontWeight: 700 }}>{row.t}</span>
            </button>
          ))}
        </MasterSheet>
      )}
      {sheet === "upload" && (coverUp || ups) && (
        <MasterSheet
          open
          onClose={() => {
            const waiting = coverUp?.state === "waiting" || ups?.some((x) => x.state === "waiting" || x.state === "uploading");
            if (!waiting) {
              setCoverUp(null);
              setUps(null);
              setSheet(null);
            }
          }}
          title="Uploading photos"
          footer={
            coverUp?.state === "failed" || (ups && ups.some((x) => x.state === "failed") && !ups.some((x) => x.state === "waiting" || x.state === "uploading")) ? (
              <PrimaryButton
                onClick={() => {
                  setCoverUp(null);
                  setUps(null);
                  setSheet(null);
                }}
              >
                Done
              </PrimaryButton>
            ) : undefined
          }
        >
          {(coverUp
            ? [{ key: "cover", name: coverUp.name, state: coverUp.state === "waiting" ? ("uploading" as const) : ("failed" as const), message: coverUp.message, file: coverUp.file }]
            : ups ?? []
          ).map((row, i) => {
            const failed = row.state === "failed";
            const done = row.state === "done";
            return (
              <div key={row.key} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 60, borderTop: i ? `1px solid ${c.div}` : "none" }}>
                <span style={{ width: 44, height: 44, borderRadius: 10, background: c.pale, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: px(13), fontWeight: 700 }}>
                    <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: c.ink }}>{row.name}</span>
                    <span style={{ color: failed ? c.high : done ? c.good : c.ink2, whiteSpace: "nowrap" }}>{failed ? "Couldn't upload" : done ? "Added" : row.state === "waiting" ? "Waiting" : "Uploading"}</span>
                  </span>
                  <span style={{ display: "block", height: 5, borderRadius: 999, background: c.soft, marginTop: 7, overflow: "hidden" }}>
                    <span
                      className={row.state === "uploading" && !reduced ? "animate-skeleton-pulse" : undefined}
                      style={{ display: "block", height: "100%", width: failed ? "38%" : done ? "100%" : row.state === "waiting" ? "0%" : "60%", borderRadius: 999, background: failed ? c.high : done ? c.good : c.fill }}
                    />
                  </span>
                </span>
                {failed && (
                  <button
                    type="button"
                    aria-label="Retry upload"
                    onClick={() => {
                      if (coverUp) void runCoverUpload(coverUp.file, coverUp.replace);
                      else if (target?.kind === "photo" && ups?.length === 1 && ups[0].key === target.photo.id) void runReplace(target.photo, row.file);
                      else if (ups) void uploadRows(ups);
                    }}
                    style={{ height: 34, padding: "0 12px", borderRadius: 10, border: `1px solid ${c.high}`, color: c.high, background: "transparent", fontSize: px(12), fontWeight: 800 }}
                  >
                    Retry
                  </button>
                )}
              </div>
            );
          })}
          <p style={{ fontSize: px(11.5), color: c.faint, marginTop: 10 }}>{uploadLine(coverUp, ups)}</p>
        </MasterSheet>
      )}
      {/* Destructive, so two steps (HANDOVER §4 CentredDialog). */}
      <CentredDialog
        open={!!confirmDelete}
        title={deleteStep === 1 ? "Delete this photo?" : "Confirm delete"}
        body={
          deleteStep === 1
            ? `${confirmDelete?.kind === "photo" ? confirmDelete.photo.caption ?? "This photo" : "Cover photo"} will be removed from your listing.`
            : "This can't be undone."
        }
        cancel={deleteStep === 1 ? "Keep it" : "Cancel"}
        action={deleteStep === 1 ? "Delete" : "Delete photo"}
        busy={busy}
        onAction={() => (deleteStep === 1 ? setDeleteStep(2) : void doDelete())}
        onCancel={() => {
          setConfirmDelete(null);
          setDeleteStep(1);
        }}
      />
      {toast}
    </div>
  );
}

function uploadLine(coverUp: { state: string; message?: string } | null, ups: UpRow[] | null): string {
  if (coverUp) return coverUp.state === "failed" ? coverUp.message ?? "Couldn't upload the photo. Try again." : "Keep this page open until the upload finishes.";
  const rows = ups ?? [];
  const failed = rows.filter((x) => x.state === "failed");
  const running = rows.some((x) => x.state === "waiting" || x.state === "uploading");
  if (failed.length && !running) {
    const added = rows.filter((x) => x.state === "done").length;
    if (rows.length === 1) return failed[0].message ?? "Couldn't upload the photo. Try again.";
    return `${added} of ${rows.length} added. ${failed.length === 1 ? "The failed photo is" : "The failed photos are"} kept here so you can try again.`;
  }
  return "Keep this page open until the upload finishes.";
}
