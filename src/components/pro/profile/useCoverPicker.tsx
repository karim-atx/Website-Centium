import React, { useEffect, useRef, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { COVER_ACCEPT, fetchMyCoverUrl, removeCover, submitCover } from "../../../services/pro/cover";
import { useOwnImage } from "../../moderation/ImageApproval";

/**
 * Release B · the professional's cover photo picker (MO14 "Photo and cover",
 * the onboarding preview's cover placeholder): reads cover_url once, then
 * sends / removes through services/pro/cover, the way usePhotoPicker does
 * for the profile photo. `beforeUpload` lets onboarding make sure the
 * professional_profiles row exists first (submit_image needs the record).
 *
 * Round C Release 2: a new cover waits for approval. `url` is what the owner
 * sees (their pending cover from image-staging, else the approved one; a
 * rejected one is not drawn); `approvedUrl` is the column, the one Remove
 * clears; `image` (pending or rejected) feeds the badge and note.
 */
export function useCoverPicker(beforeUpload?: () => Promise<{ ok: boolean; message?: string }>) {
  const { authUserId } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [cover, setCover] = useState<{ userId: string; url: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { image, refresh } = useOwnImage("professional_cover", authUserId);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchMyCoverUrl(authUserId).then((r) => live && r.ok && setCover({ userId: authUserId, url: r.url }));
    return () => {
      live = false;
    };
  }, [authUserId]);

  // Keyed on the account it was read for, as useIsAmbassador does.
  const approvedUrl = cover && cover.userId === authUserId ? cover.url : null;

  const upload = async (file: File) => {
    if (!authUserId || busy) return;
    setBusy(true);
    setError(null);
    if (beforeUpload) {
      const ready = await beforeUpload();
      if (!ready.ok) {
        setBusy(false);
        return setError(ready.message ?? "Couldn't add your cover. Try again.");
      }
    }
    const r = await submitCover(authUserId, file);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    refresh();
  };
  const remove = async () => {
    // A cover waiting for approval can be removed too (removeCover withdraws it).
    if (!authUserId || busy || !(approvedUrl || image?.status === "pending")) return;
    setBusy(true);
    setError(null);
    const r = await removeCover(authUserId, approvedUrl);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setCover({ userId: authUserId, url: null });
    refresh();
  };
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void upload(f);
  };
  const inputs = <input ref={input} type="file" accept={COVER_ACCEPT} className="hidden" onChange={onPick} aria-hidden tabIndex={-1} />;
  const url = (image?.status === "pending" && image.url) || approvedUrl;
  return { inputs, url, approvedUrl, image, busy, error, choose: () => input.current?.click(), remove, upload };
}

export type CoverPicker = ReturnType<typeof useCoverPicker>;
