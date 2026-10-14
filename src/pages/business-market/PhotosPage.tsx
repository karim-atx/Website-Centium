import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Camera, Ellipsis, Images, Lightbulb, Plus, RefreshCw, Star, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useOnline } from "../../hooks/useOnline";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { FORUM_PHOTO_ACCEPT } from "../../services/forum/photo";
import { removeBusinessImage, uploadBusinessImage } from "../../services/business-more";
import { MarketProvider, useMarket } from "./MarketContext";
import { lh, MBackHeader, MError, MPopup, MPrimary, MSheet, MSoonNote, px, useMarketToast } from "./kit";

// MA1-033 / 035 / 080 / 083 / 084 / 086 / 087 / 088 / 090-095 · Photos.
// The gallery (business_photos with moderation, reorder, 20 max) is B13
// MK-03, not on the local stack. What is live is the cover photo
// (business_profiles.cover_url, B5), which MA1-033 K1 makes the gallery's
// first photo: it shows here as photo 1 with the Cover chip, and Replace /
// Delete work on it through the Business Profile upload (metadata stripped
// on the device first, K2, KEEP-SAFETY). With no cover yet, "Add photos"
// uploads one as the cover. Adding more photos waits for B13 ("Coming soon").
// The logo stays in Business Profile.

/** B13 MK-03 gallery writes are wired (flip when the stage lands and HANDOVER_API.md names them). */
const GALLERY_WRITES = false;

export default function PhotosPage() {
  return (
    <MarketProvider>
      <PhotosBody />
    </MarketProvider>
  );
}

type Sheet = null | "source" | "options" | "replace" | "upload";

function PhotosBody() {
  const m = useMarket();
  const { c, v, kind, business } = m;
  const { authUserId } = useApp();
  const navigate = useNavigate();
  const online = useOnline();
  const reduced = useReducedMotion();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [upload, setUpload] = useState<{ name: string; state: "waiting" | "done" | "failed"; file: File; replace: boolean; message?: string } | null>(null);
  const [toast, showToast] = useMarketToast();
  const [hasCamera, setHasCamera] = useState(false);
  const camRef = useRef<HTMLInputElement | null>(null);
  const libRef = useRef<HTMLInputElement | null>(null);

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

  const back = () => navigate(m.tabHref("listing"));
  const eyebrow = kind === "store" ? "Products · Listing" : "Marketplace · Listing";
  if (m.error && !business) return <MError c={c} onRetry={m.reload} />;
  const cover = business?.coverUrl ?? null;
  const photos = cover ? [{ url: cover, name: "Cover photo" }] : [];
  const galleryLive = GALLERY_WRITES && m.backend.photos === "live";
  const canAdd = !cover || galleryLive;
  const owner = m.isOwner && online;

  const runUpload = async (file: File, replace: boolean) => {
    if (!business || !authUserId) return;
    setUpload({ name: file.name || "Photo", state: "waiting", file, replace });
    setSheet("upload");
    const r = await uploadBusinessImage({ kind: "cover", uid: authUserId, ownerId: business.ownerId, businessId: business.id, file, previousPath: business.coverPath });
    if (!r.ok) {
      setUpload({ name: file.name || "Photo", state: "failed", file, replace, message: r.message });
      return;
    }
    m.setBusiness({ ...business, coverPath: r.value.path, coverUrl: r.value.url });
    setUpload(null);
    setSheet(null);
    showToast(replace ? "Your cover photo is replaced." : "1 photo added.");
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void runUpload(f, sheet === "replace");
  };

  const doDelete = async () => {
    if (!business || !authUserId) return;
    setBusy(true);
    const r = await removeBusinessImage({ kind: "cover", uid: authUserId, ownerId: business.ownerId, businessId: business.id, previousPath: business.coverPath });
    setBusy(false);
    setConfirmDelete(false);
    if (!r.ok) return showToast(r.message);
    m.setBusiness({ ...business, coverPath: null, coverUrl: null });
    showToast("Photo deleted.");
  };

  const source = (replace: boolean) => {
    const disabled = !replace && !canAdd;
    return (
      <MSheet open onClose={() => setSheet(null)} title={replace ? "Replace photo" : "Add photos"}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "18px 0 8px", opacity: disabled ? 0.45 : 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
            {hasCamera && (
              <button
                type="button"
                aria-label="Take a photo"
                aria-disabled={disabled}
                onClick={() => !disabled && camRef.current?.click()}
                style={{ width: 96, height: 96, borderRadius: 999, background: c.camBg, color: c.camInk, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 24px rgba(36,31,27,0.22)", border: 0 }}
              >
                <Camera size={30} strokeWidth={2} aria-hidden />
              </button>
            )}
            <button
              type="button"
              aria-label="Choose from library"
              aria-disabled={disabled}
              onClick={() => !disabled && libRef.current?.click()}
              style={{ width: 96, height: 96, borderRadius: 999, background: c.pale, color: c.pDark, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(95,80,147,0.14)", border: 0 }}
            >
              <Images size={26} strokeWidth={2} aria-hidden />
            </button>
          </div>
          <p style={{ fontSize: px(20), fontWeight: 700, lineHeight: lh(26), marginBottom: 8, color: c.ink, textWrap: "balance" } as React.CSSProperties}>
            {replace ? "Replace Cover photo" : "Take a photo, or choose from your library"}
          </p>
          <p style={{ fontSize: px(13.5), lineHeight: lh(19), color: c.inkSoft, maxWidth: 280, textWrap: "pretty" } as React.CSSProperties}>
            {replace ? "The new photo keeps the same place in your gallery." : "Add photos of your real space. You can reorder them after."}
          </p>
        </div>
        {disabled && <MSoonNote c={c}>Adding more photos is coming soon.</MSoonNote>}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 14, padding: "10px 12px", borderRadius: 12, background: c.tealPale, color: c.tealInk }}>
          <Lightbulb size={15} strokeWidth={2.2} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: px(12), lineHeight: lh(17) }}>Real photos of your space, in landscape and good light, get more profile opens. Up to 20 photos.</p>
        </div>
      </MSheet>
    );
  };

  return (
    <div style={{ color: c.ink, marginTop: -4 }}>
      <MBackHeader c={c} eyebrow={eyebrow} title="Photos" onBack={back} backLabel="Back to Listing" />
      <div style={{ borderRadius: 18, background: c.pale, padding: "12px 14px", display: "flex", gap: 10 }}>
        <Lightbulb size={16} strokeWidth={2.2} color={c.pDark} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: px(12), lineHeight: lh(17), color: c.deep }}>{v.photoTip}</p>
      </div>
      <p style={{ fontSize: px(12), fontWeight: 700, color: c.inkSoft, margin: "14px 2px 8px" }} aria-live="polite">
        {photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"} · drag to reorder · the first photo is your cover` : "No photos yet · the first photo is your cover"}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
        {photos.map((p, i) => (
          <div key={p.url} style={{ position: "relative", aspectRatio: "4 / 3", borderRadius: 16, overflow: "hidden", background: c.pale, transition: reduced ? "none" : "transform .15s" }}>
            <img src={p.url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            {i === 0 && <span style={{ position: "absolute", left: 8, top: 8, fontSize: px(10), fontWeight: 800, color: c.onFill, background: c.fill, borderRadius: 999, padding: "2px 8px" }}>Cover</span>}
            <button
              type="button"
              aria-label="Photo options"
              disabled={!owner}
              onClick={() => setSheet("options")}
              style={{ position: "absolute", right: 4, bottom: 4, width: 36, height: 36, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", color: c.ink, background: "transparent", border: 0, opacity: owner ? 1 : 0.4 }}
            >
              <span style={{ width: 28, height: 28, borderRadius: 999, background: c.card, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ellipsis size={16} strokeWidth={2.4} aria-hidden />
              </span>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSheet("source")}
          disabled={!owner}
          style={{ position: "relative", aspectRatio: "4 / 3", borderRadius: 16, border: `1.5px dashed ${c.primary}`, background: "transparent", color: c.pDark, display: "flex", alignItems: "center", justifyContent: "center", opacity: owner ? 1 : 0.4 }}
        >
          <Plus size={22} strokeWidth={1.8} aria-hidden />
          <span style={{ position: "absolute", left: 8, bottom: 8, fontSize: px(10.5), fontWeight: 700, color: c.ink, background: c.card, borderRadius: 999, padding: "2px 8px" }}>Add photos</span>
        </button>
      </div>

      <input ref={camRef} type="file" accept={FORUM_PHOTO_ACCEPT} capture="environment" hidden onChange={onPick} />
      <input ref={libRef} type="file" accept={FORUM_PHOTO_ACCEPT} hidden onChange={onPick} />

      {sheet === "source" && source(false)}
      {sheet === "replace" && source(true)}
      {sheet === "options" && (
        <MSheet open onClose={() => setSheet(null)} title="Photo options">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            {cover && <img src={cover} alt="" style={{ width: 64, height: 48, borderRadius: 10, objectFit: "cover" }} />}
            <span>
              <span style={{ display: "block", fontSize: px(14), fontWeight: 800, color: c.ink }}>Cover photo</span>
              <span style={{ display: "block", fontSize: px(11.5), color: c.faint }}>{`Photo 1 of ${photos.length}`}</span>
            </span>
          </div>
          {[
            ...(photos.length > 1 ? [{ k: "cover", t: "Set as cover", I: Star }] : []),
            ...(photos.length > 1 ? [{ k: "left", t: "Move left", I: ArrowLeft }, { k: "right", t: "Move right", I: ArrowRight }] : []),
            { k: "replace", t: "Replace", I: RefreshCw },
            { k: "delete", t: "Delete", I: Trash2 },
          ].map((row, i) => (
            <button
              key={row.k}
              type="button"
              onClick={() => {
                if (row.k === "replace") setSheet("replace");
                if (row.k === "delete") {
                  setSheet(null);
                  setConfirmDelete(true);
                }
              }}
              style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 50, width: "100%", borderTop: i ? `1px solid ${c.divider}` : "none", borderLeft: 0, borderRight: 0, borderBottom: 0, background: "transparent", color: row.k === "delete" ? c.high : c.ink, textAlign: "left" }}
            >
              <row.I size={18} strokeWidth={2.1} aria-hidden />
              <span style={{ flex: 1, fontSize: px(14), fontWeight: 700 }}>{row.t}</span>
            </button>
          ))}
        </MSheet>
      )}
      {sheet === "upload" && upload && (
        <MSheet
          open
          onClose={() => {
            if (upload.state !== "waiting") {
              setUpload(null);
              setSheet(null);
            }
          }}
          title="Uploading photos"
          footer={
            upload.state === "failed" ? (
              <MPrimary
                c={c}
                tone="quiet"
                onClick={() => {
                  setUpload(null);
                  setSheet(null);
                }}
              >
                Done
              </MPrimary>
            ) : undefined
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 60 }}>
            <span style={{ width: 44, height: 44, borderRadius: 10, background: c.pale, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: px(13), fontWeight: 700 }}>
                <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: c.ink }}>{upload.name}</span>
                <span style={{ color: upload.state === "failed" ? c.high : c.inkSoft, whiteSpace: "nowrap" }}>{upload.state === "failed" ? "Couldn't upload" : "Uploading"}</span>
              </span>
              <span style={{ display: "block", height: 5, borderRadius: 999, background: c.track, marginTop: 7, overflow: "hidden" }}>
                <span className={upload.state === "waiting" && !reduced ? "animate-skeleton-pulse" : undefined} style={{ display: "block", height: "100%", width: upload.state === "failed" ? "38%" : "60%", borderRadius: 999, background: upload.state === "failed" ? c.high : c.primary }} />
              </span>
            </span>
            {upload.state === "failed" && (
              <button
                type="button"
                aria-label="Retry upload"
                onClick={() => void runUpload(upload.file, upload.replace)}
                style={{ height: 34, padding: "0 12px", borderRadius: 10, border: `1px solid ${c.high}`, color: c.high, background: "transparent", fontSize: px(12), fontWeight: 800 }}
              >
                Retry
              </button>
            )}
          </div>
          <p style={{ fontSize: px(11.5), color: c.faint, marginTop: 10 }}>{upload.state === "failed" ? upload.message ?? "Couldn't upload the photo. Try again." : "Keep this page open until the upload finishes."}</p>
        </MSheet>
      )}
      <MPopup
        open={confirmDelete}
        icon={Trash2}
        title="Delete this photo?"
        body="Cover photo will be removed from your listing. This can't be undone."
        action="Delete photo"
        keep="Keep it"
        busy={busy}
        onAction={() => void doDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
      {toast}
    </div>
  );
}
