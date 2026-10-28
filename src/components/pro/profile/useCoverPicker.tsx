import React, { useEffect, useRef, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { COVER_ACCEPT, fetchMyCoverUrl, removeCover, uploadCover } from "../../../services/pro/cover";

/**
 * Release B · the professional's cover photo picker (MO14 "Photo and cover",
 * the onboarding preview's cover placeholder): reads cover_url once, then
 * uploads / removes through services/pro/cover, the way usePhotoPicker does
 * for the profile photo. `beforeUpload` lets onboarding make sure the
 * professional_profiles row exists first (the bucket's insert policy needs it).
 */
export function useCoverPicker(beforeUpload?: () => Promise<{ ok: boolean; message?: string }>) {
  const { authUserId } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [cover, setCover] = useState<{ userId: string; url: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchMyCoverUrl(authUserId).then((r) => live && r.ok && setCover({ userId: authUserId, url: r.url }));
    return () => {
      live = false;
    };
  }, [authUserId]);

  // Keyed on the account it was read for, as useIsAmbassador does.
  const url = cover && cover.userId === authUserId ? cover.url : null;

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
    const r = await uploadCover(authUserId, file, url);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setCover({ userId: authUserId, url: r.url });
  };
  const remove = async () => {
    if (!authUserId || busy || !url) return;
    setBusy(true);
    setError(null);
    const r = await removeCover(authUserId, url);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setCover({ userId: authUserId, url: null });
  };
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void upload(f);
  };
  const inputs = <input ref={input} type="file" accept={COVER_ACCEPT} className="hidden" onChange={onPick} aria-hidden tabIndex={-1} />;
  return { inputs, url, busy, error, choose: () => input.current?.click(), remove, upload };
}

export type CoverPicker = ReturnType<typeof useCoverPicker>;
