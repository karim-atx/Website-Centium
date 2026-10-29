import { useEffect, useState } from "react";
import { myImageApprovals, stagedUrl } from "../../services/moderation/images";
import { latestApproval } from "../../services/moderation/imageModel";
import type { ImageSurface } from "../../services/moderation/imageCopy";

// Round C Release 2: a list of the owner's own items shows each one's photo
// that is waiting for approval (a signed image-staging URL) in place of the
// approved one, as the editor does. One my_image_approvals read per surface,
// again whenever `key` changes (the list's reload after a save).

/** Record id → the signed URL of the owner's pending photo for it. */
export function usePendingPhotos(surface: ImageSurface, key: unknown): Map<string, string> {
  const [pending, setPending] = useState<Map<string, string>>(() => new Map());
  useEffect(() => {
    let live = true;
    void (async () => {
      const byRecord = new Map<string, Awaited<ReturnType<typeof myImageApprovals>>>();
      for (const a of await myImageApprovals(surface)) byRecord.set(a.recordId, [...(byRecord.get(a.recordId) ?? []), a]);
      const out = new Map<string, string>();
      await Promise.all(
        [...byRecord].map(async ([recordId, list]) => {
          const a = latestApproval(list);
          if (a?.status !== "pending") return;
          const url = await stagedUrl(a.stagingPath);
          if (url) out.set(recordId, url);
        })
      );
      if (live) setPending(out);
    })();
    return () => {
      live = false;
    };
  }, [surface, key]);
  return pending;
}
