import React, { useState } from "react";
import { Camera, FileText, Eye, X } from "lucide-react";
import { useFilePick, type PickResult } from "../../hooks/useFilePick";
import { FileViewerSheet } from "../health/FileViewerSheet";
import type { PrivateBucket } from "../../services/storage";

/**
 * "Use camera" / "Upload file" for one private document, with its preview.
 *
 * The one attach control for the onboarding certificate, the Certification
 * sheet and each CV licence. It does not upload by itself: `onFile` decides
 * whether a picked file goes up now (onboarding, the Certification sheet) or
 * is held until a form is saved (a licence being added). Either way the file
 * has already passed the bucket's type and size check by then.
 *
 * The stored document opens in FileViewerSheet, which signs a short-lived URL
 * on open — the path travels, never a URL.
 */
export const AttachDocument: React.FC<{
  bucket: PrivateBucket;
  /** The stored object path, if a document is attached. */
  path: string | null;
  /** A picked file that is not uploaded yet (shown by name, clearable). */
  pendingName?: string | null;
  onClearPending?: () => void;
  onFile: (file: File) => Promise<PickResult>;
  /** Offered only when given. */
  onRemove?: () => Promise<PickResult>;
  /** Sheet title for the preview, e.g. "Certificate". */
  label: string;
  busyLabel?: string;
  disabled?: boolean;
}> = ({ bucket, path, pendingName, onClearPending, onFile, onRemove, label, busyLabel = "Uploading…", disabled }) => {
  const pick = useFilePick(bucket, onFile);
  const [viewing, setViewing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const busy = pick.busy || removing;
  const hasDocument = !!path || !!pendingName;

  const remove = async () => {
    if (!onRemove || busy) return;
    setRemoving(true);
    pick.setError(null);
    const result = await onRemove();
    setRemoving(false);
    if (!result.ok) pick.setError(result.message);
  };

  const buttonClass =
    "tap flex items-center justify-center gap-2 min-h-[48px] rounded-2xl border border-primary/30 bg-primary-pale px-3 text-[13.5px] font-bold text-primary-deep-text disabled:opacity-40";

  return (
    <div>
      <input {...pick.cameraInputProps} />
      <input {...pick.fileInputProps} />
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={pick.openCamera} disabled={busy || disabled} className={buttonClass}>
          <Camera size={16} className="shrink-0" /> Use camera
        </button>
        <button type="button" onClick={pick.openFiles} disabled={busy || disabled} className={buttonClass}>
          <FileText size={16} className="shrink-0" /> {hasDocument ? "Replace file" : "Upload file"}
        </button>
      </div>

      {busy && <p className="text-xs font-semibold text-charcoal-faint mt-2.5">{removing ? "Removing…" : busyLabel}</p>}
      {pick.error && !busy && <p className="text-xs font-semibold text-status-high mt-2.5">{pick.error}</p>}

      {pendingName && !busy && (
        <div className="flex items-center gap-2 mt-2.5 min-h-[44px] rounded-xl bg-cream-soft px-3">
          <FileText size={14} className="text-charcoal-faint shrink-0" />
          <span className="flex-1 min-w-0 truncate text-xs text-charcoal-soft">
            {pendingName} · uploads when you save
          </span>
          {onClearPending && (
            <button
              type="button"
              onClick={onClearPending}
              aria-label="Remove the picked file"
              className="tap w-11 h-11 -mr-3 flex items-center justify-center text-charcoal-faint"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {path && !pendingName && !busy && (
        <div className="flex items-center gap-4 mt-1.5">
          <button
            type="button"
            onClick={() => setViewing(true)}
            className="tap inline-flex items-center gap-1.5 min-h-[44px] text-xs font-bold text-primary-deep-text"
          >
            <Eye size={14} /> View document
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={disabled}
              className="tap inline-flex items-center min-h-[44px] text-xs font-bold text-status-high disabled:opacity-40"
            >
              Remove
            </button>
          )}
        </div>
      )}

      <FileViewerSheet open={viewing} onClose={() => setViewing(false)} path={path} bucket={bucket} label={label} />
    </div>
  );
};
