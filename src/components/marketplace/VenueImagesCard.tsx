import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Camera, LoaderCircle, Trash2 } from "lucide-react";
import { ConfirmCard } from "../ui/ConfirmCard";
import { PopupMenu } from "../ui/PopupMenu";
import { VenueImage } from "./VenueImage";
import { initials } from "../professionals/typeColour";
import { useApp } from "../../context/AppContext";
import { useOnline } from "../../hooks/useOnline";
import { FORUM_PHOTO_ACCEPT } from "../../services/forum/photo";
import { fetchVenueImages, removeVenueImage, uploadVenueImage, type VenueImages } from "../../services/venues/console";
import { VCardError, VDetailCard } from "./VenueKit";

// The business logo and the venue cover (stage A4), owner only, rebuilt from
// the MO1 Business Profile hero (OURS-OP1-venue-images: K21 cover 132 r18 with
// a camera badge, the 72 r20 logo overlapping it by 34, K20 photo source menu
// "Take a photo / Choose from library / Remove photo", K16 remove confirm,
// K17 toasts). Objects go to the PUBLIC business-logos / gym-covers buckets
// under <your uid>/… (the uid prefix is what lets account deletion find
// them) and the PATH is stored in business_profiles.logo_url /
// gyms.cover_url. Every photo is re-drawn with its metadata stripped (the
// forum photo preparation) before it leaves the device; replacing one removes
// the old object. A path with no object behind it (the seed's) shows the
// initials / the tint. One cover per venue (V6-163).

type Kind = "logo" | "cover";
type Action = "camera" | "library" | "remove";

const hasCamera = () => {
  try {
    return !window.matchMedia("(pointer: fine)").matches;
  } catch {
    return true;
  }
};

export function VenueImagesCard({
  gymId,
  businessId,
  venueName,
  onToast,
  id,
}: {
  gymId: string;
  businessId: string;
  venueName: string;
  onToast?: (message: string) => void;
  id?: string;
}) {
  const { authUserId } = useApp();
  const online = useOnline();
  const [images, setImages] = useState<{ gymId: string; value: VenueImages } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [menu, setMenu] = useState<{ kind: Kind; anchor: HTMLElement } | null>(null);
  // Removing asks first (user decision, 7 October 2026): it deletes the
  // stored image, which cannot be brought back.
  const [confirming, setConfirming] = useState<Kind | null>(null);
  const [tick, setTick] = useState(0);
  const libraryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const target = useRef<Kind>("logo");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetchVenueImages(gymId, businessId);
      if (cancelled) return;
      if (!r.ok) {
        setLoadError(r.message);
        return;
      }
      setLoadError(null);
      setImages({ gymId, value: r.value });
    })();
    return () => {
      cancelled = true;
    };
  }, [gymId, businessId, tick]);

  const current = images?.gymId === gymId ? images.value : null;
  const disabled = !current || !!busy || !online;

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
    onToast?.(kind === "logo" ? "Logo updated." : "Cover photo updated.");
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
    onToast?.(kind === "logo" ? "Logo removed." : "Cover photo removed.");
  };

  const pick = (action: Action) => {
    const kind = menu?.kind ?? "logo";
    setMenu(null);
    target.current = kind;
    if (action === "remove") setConfirming(kind);
    else (action === "camera" ? cameraInput : libraryInput).current?.click();
  };

  const has = (kind: Kind) => (kind === "logo" ? !!current?.logoPath : !!current?.coverPath);
  const options: { value: Action; label: string; destructive?: boolean }[] = [
    ...(hasCamera() ? [{ value: "camera" as const, label: "Take a photo" }] : []),
    { value: "library", label: "Choose from library" },
    ...(menu && has(menu.kind) ? [{ value: "remove" as const, label: "Remove photo", destructive: true }] : []),
  ];

  const spinner = <LoaderCircle size={20} aria-hidden className="text-white animate-spin" />;

  return (
    <VDetailCard id={id} title="Logo and cover" right="Shown on Explore">
      {loadError && !current ? (
        <VCardError title="Couldn't load the logo and cover" message={loadError} onRetry={() => setTick((t) => t + 1)} />
      ) : (
        <div style={{ padding: "6px 16px 16px" }}>
          {/* K21 cover */}
          <button
            type="button"
            aria-label="Change cover photo"
            aria-haspopup="menu"
            disabled={disabled}
            onClick={(e) => setMenu({ kind: "cover", anchor: e.currentTarget })}
            className="tap relative block w-full h-[132px] rounded-[18px] overflow-hidden bg-primary-pale disabled:cursor-default"
          >
            <VenueImage srcs={[current?.coverUrl]} className="absolute inset-0 w-full h-full" />
            {busy === "cover" ? (
              <span className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(36,31,27,0.55)" }}>
                {spinner}
              </span>
            ) : (
              current && (
                <span className="absolute w-[32px] h-[32px] rounded-full flex items-center justify-center text-white" style={{ right: 10, bottom: 10, background: "rgba(36,31,27,0.55)" }}>
                  <Camera size={15} strokeWidth={2.2} aria-hidden />
                </span>
              )
            )}
          </button>
          {/* K21 logo, overlapping the cover by 34 */}
          <div style={{ marginTop: -34, paddingLeft: 14 }}>
            <button
              type="button"
              aria-label="Change logo"
              aria-haspopup="menu"
              disabled={disabled}
              onClick={(e) => setMenu({ kind: "logo", anchor: e.currentTarget })}
              className="tap relative w-[78px] h-[78px] rounded-[23px] bg-cream-card disabled:cursor-default"
              style={{ padding: 3 }}
            >
              <span className="relative w-[72px] h-[72px] rounded-[20px] overflow-hidden bg-[#8E7FD0] flex items-center justify-center text-white text-[24px] font-extrabold">
                <VenueImage srcs={[current?.logoUrl]} className="absolute inset-0 w-full h-full" fallback={initials(venueName)} />
                {busy === "logo" && (
                  <span className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(36,31,27,0.55)" }}>
                    {spinner}
                  </span>
                )}
              </span>
              {current && busy !== "logo" && (
                <span
                  className="absolute w-[26px] h-[26px] rounded-full bg-cream-card border border-solid border-charcoal/[0.11] dark:border-charcoal/[0.08] flex items-center justify-center text-primary-dark"
                  style={{ right: -2, bottom: -2 }}
                >
                  <Camera size={13} strokeWidth={2.2} aria-hidden />
                </span>
              )}
            </button>
          </div>
          <div className="mt-[10px] space-y-[2px]">
            <p className="text-[12px] leading-[16px] text-charcoal-soft">Business logo · Shown on all your venues.</p>
            <p className="text-[12px] leading-[16px] text-charcoal-soft">Cover photo for {venueName} · The wide photo at the top of this venue's page.</p>
            <p className="text-[11px] leading-[15px] text-charcoal-faint">JPEG, PNG or WebP. Logo under 2 MB, cover under 5 MB.</p>
          </div>
          {error && <p className="mt-[10px] text-[11.5px] leading-[16px] font-bold text-status-high">{error}</p>}
          {!online && <p className="mt-[10px] text-[11.5px] leading-[16px] text-charcoal-faint">You're offline. Showing what was loaded last.</p>}
        </div>
      )}
      <p className={clsx("border-t border-charcoal/[0.06] text-[11.5px] leading-[16px] text-charcoal-faint")} style={{ padding: "10px 16px 14px" }}>
        Location and camera details are removed from every photo before it's uploaded.
      </p>

      <input
        ref={libraryInput}
        type="file"
        accept={FORUM_PHOTO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void upload(target.current, e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInput}
        type="file"
        accept={FORUM_PHOTO_ACCEPT}
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void upload(target.current, e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor ?? null}
        variant="field"
        width={204}
        align="left"
        heading={menu?.kind === "cover" ? "Cover photo" : "Logo"}
        options={options}
        onSelect={pick}
      />
      <ConfirmCard
        open={!!confirming}
        layout="stacked"
        frame="kit"
        tone="destructive"
        icon={<Trash2 size={20} strokeWidth={2.2} />}
        title={confirming === "logo" ? "Remove the logo?" : "Remove the cover photo?"}
        subtitle={
          confirming === "logo"
            ? "Your venues will show your initials instead. You can upload a new logo at any time."
            : "This venue's page will show its colour instead. You can upload a new cover at any time."
        }
        confirmLabel="Remove"
        cancelLabel="Keep it"
        busy={!!busy}
        onCancel={() => !busy && setConfirming(null)}
        onConfirm={() => {
          const kind = confirming;
          setConfirming(null);
          if (kind) void remove(kind);
        }}
      />
    </VDetailCard>
  );
}
