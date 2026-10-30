import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, ImageOff } from "lucide-react";
import { imageStateFor } from "../../services/moderation/images";
import { PENDING_BADGE, PENDING_LINE, reasonText, REJECTED_BADGE, type ImageSurface } from "../../services/moderation/imageCopy";
import type { ImageApproval } from "../../services/moderation/imageModel";
import { t } from "../../i18n/core";

// Image approval on the owner's own screens (Round C Release 2; PLAN S2,
// undrawn, in the existing badge and note styles).
//
// - Pending: the uploader sees their new image straight away (a signed URL
//   from image-staging) with a "Waiting for approval" badge and the line
//   "Only you can see this until our team approves it, usually within a day."
//   Everyone else keeps seeing the previous approved image, or nothing.
// - Rejected: the reason category in a sentence, and the screen's own
//   picker to choose another.
// Both link to the Community guidelines.

export type OwnImageState = (ImageApproval & { url: string | null }) | null;

/** The owner's pending or rejected image for one record; refresh() after a submit. */
export function useOwnImage(surface: ImageSurface, recordId: string | null | undefined) {
  const [state, setState] = useState<{ key: string; value: OwnImageState }>({ key: "", value: null });
  const [tick, setTick] = useState(0);
  const key = `${surface}:${recordId ?? ""}:${tick}`;
  useEffect(() => {
    if (!recordId) return;
    let live = true;
    void imageStateFor(surface, recordId).then((v) => live && setState({ key, value: v }));
    return () => {
      live = false;
    };
  }, [surface, recordId, key]);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  // The last answer stays shown while a refresh reads again (no flash of nothing).
  return { image: recordId && state.key.startsWith(`${surface}:${recordId}:`) ? state.value : null, refresh };
}

/** The small badge over or beside a thumbnail. */
export const ImageApprovalBadge: React.FC<{ state: OwnImageState; className?: string }> = ({ state, className }) => {
  if (!state) return null;
  const pending = state.status === "pending";
  return (
    <span
      data-image-approval={state.status}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10.5px] font-extrabold whitespace-nowrap ${
        pending ? "bg-status-caution-bg text-status-caution" : "bg-status-high-bg text-status-high"
      } ${className ?? ""}`}
    >
      {pending ? <Clock size={11} aria-hidden /> : <ImageOff size={11} aria-hidden />}
      {t(pending ? PENDING_BADGE : REJECTED_BADGE)}
    </span>
  );
};

/** The line under the picker: what the badge means, and the guidelines. */
export const ImageApprovalNote: React.FC<{ state: OwnImageState; className?: string }> = ({ state, className }) => {
  if (!state) return null;
  const pending = state.status === "pending";
  return (
    <p data-image-approval-note={state.status} className={`text-[11.5px] leading-[16px] ${pending ? "text-charcoal-soft" : "text-status-high"} ${className ?? ""}`}>
      {pending ? t(PENDING_LINE) : t("{reason} Choose another photo.", { reason: t(reasonText(state.reasonCategory)) })}{" "}
      <Link to="/legal/community-guidelines" className="font-semibold underline">
        {t("Community guidelines")}
      </Link>
    </p>
  );
};
