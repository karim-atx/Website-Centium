import { useEffect, useState } from "react";
import { imagePreviewUrl } from "../../../services/business-onboarding";

/**
 * The URL the owner sees for a Step 1 logo or cover path: a picture waiting
 * for approval lives in the private image-staging bucket, so it is read with
 * a signed URL (imagePreviewUrl); null until that answer arrives.
 */
export function useImagePreview(kind: "logo" | "cover", path: string | null): string | null {
  const [state, setState] = useState<{ path: string | null; url: string | null }>({ path: null, url: null });
  useEffect(() => {
    if (!path) return;
    let live = true;
    void imagePreviewUrl(kind, path).then((url) => live && setState({ path, url }));
    return () => {
      live = false;
    };
  }, [kind, path]);
  return path && state.path === path ? state.url : null;
}
