import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Card } from "../ui/Card";
import { VenueImage } from "./VenueImage";
import { initials } from "../professionals/typeColour";
import { useApp } from "../../context/AppContext";
import { FORUM_PHOTO_ACCEPT } from "../../services/forum/photo";
import { fetchVenueImages, removeVenueImage, uploadVenueImage, type VenueImages } from "../../services/venues/console";

// The business logo and the venue cover (stage A4), owner only. Objects go to
// the PUBLIC business-logos / gym-covers buckets under <your uid>/… — the uid
// prefix is what lets account deletion find them — and the PATH is stored in
// business_profiles.logo_url / gyms.cover_url. Every photo is re-drawn with
// its metadata stripped (the forum photo preparation) before it leaves the
// device; replacing one removes the old object. Drawn with VenueImage, so a
// path with no object behind it (the seed's) shows the initials / the tint.
//
// Built from the business console's cards; NOT YET MATCHED TO THE BUSINESS UI
// BOARD.

type Kind = "logo" | "cover";

export function VenueImagesCard({ gymId, businessId, venueName }: { gymId: string; businessId: string; venueName: string }) {
  const { authUserId } = useApp();
  const [images, setImages] = useState<{ gymId: string; value: VenueImages } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Kind | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetchVenueImages(gymId, businessId);
      if (cancelled) return;
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setError(null);
      setImages({ gymId, value: r.value });
    })();
    return () => {
      cancelled = true;
    };
  }, [gymId, businessId]);

  const current = images?.gymId === gymId ? images.value : null;

  const upload = async (kind: Kind, file: File | undefined) => {
    if (!file || !authUserId || !current || busy) return;
    setBusy(kind);
    setError(null);
    const r = await uploadVenueImage({
      kind,
      uid: authUserId,
      gymId,
      businessId,
      file,
      previousPath: kind === "logo" ? current.logoPath : current.coverPath,
    });
    setBusy(null);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setImages({
      gymId,
      value: kind === "logo" ? { ...current, logoPath: r.value.path, logoUrl: r.value.url } : { ...current, coverPath: r.value.path, coverUrl: r.value.url },
    });
  };

  const remove = async (kind: Kind) => {
    if (!authUserId || !current || busy) return;
    setBusy(kind);
    setError(null);
    const r = await removeVenueImage({ kind, uid: authUserId, gymId, businessId, previousPath: kind === "logo" ? current.logoPath : current.coverPath });
    setBusy(null);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setImages({ gymId, value: kind === "logo" ? { ...current, logoPath: null, logoUrl: null } : { ...current, coverPath: null, coverUrl: null } });
  };

  const actions = (kind: Kind, has: boolean) => (
    <div className="flex items-center gap-3 mt-2">
      <button
        onClick={() => (kind === "logo" ? logoInput : coverInput).current?.click()}
        disabled={!current || !!busy}
        className="tap flex items-center gap-1.5 text-[11.5px] font-semibold text-primary-dark disabled:opacity-40"
      >
        <ImagePlus size={13} /> {busy === kind ? "Uploading…" : has ? "Replace" : "Upload"}
      </button>
      {has && (
        <button
          onClick={() => void remove(kind)}
          disabled={!!busy}
          aria-label={kind === "logo" ? "Remove logo" : "Remove cover"}
          className="tap flex items-center gap-1.5 text-[11.5px] font-semibold text-status-high disabled:opacity-40"
        >
          <Trash2 size={13} /> Remove
        </button>
      )}
    </div>
  );

  return (
    <div className="mb-6">
      <p className="section-label text-charcoal-faint mb-2.5">Logo and cover</p>
      {error && <p className="mb-3 rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-status-high">{error}</p>}
      <Card>
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <span className="relative w-16 h-16 rounded-2xl overflow-hidden bg-primary-pale flex items-center justify-center text-lg font-extrabold text-primary-dark">
              <VenueImage srcs={[current?.logoUrl]} className="absolute inset-0 w-full h-full" fallback={initials(venueName)} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-charcoal">Business logo</p>
            <p className="text-xs text-charcoal-faint">Shown on all your venues. JPEG, PNG or WebP, under 2 MB.</p>
            {actions("logo", !!current?.logoPath)}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-charcoal/[0.06]">
          <div className="relative h-28 rounded-2xl overflow-hidden bg-primary-pale">
            <VenueImage srcs={[current?.coverUrl]} className="absolute inset-0 w-full h-full" />
          </div>
          <p className="text-sm font-semibold text-charcoal mt-3">Cover photo for {venueName}</p>
          <p className="text-xs text-charcoal-faint">The wide photo at the top of this venue's page. JPEG, PNG or WebP, under 5 MB.</p>
          {actions("cover", !!current?.coverPath)}
        </div>
        <p className="text-[11px] text-charcoal-faint mt-3">Location and camera details are removed from every photo before it's uploaded.</p>
      </Card>

      <input
        ref={logoInput}
        type="file"
        accept={FORUM_PHOTO_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          void upload("logo", e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={coverInput}
        type="file"
        accept={FORUM_PHOTO_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          void upload("cover", e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
