import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { signedUrlFor, type PrivateBucket } from "../../services/storage";
import { FileWarning, Loader2 } from "lucide-react";

// Opens a file out of a private bucket, for both the client's own records and
// a consented professional's view of them.
//
// SIGNED AT OPEN, NEVER AT LIST RENDER. A signed Storage URL is authorised
// ONCE, when it is minted, and keeps working until it expires no matter what
// the client revokes afterwards -- so the TTL is the revocation delay, and
// services/storage clamps it to minutes. Signing a whole list up front would
// mint links for files nobody opens, start their short lives immediately, and
// leave most of them dead before anyone tapped one. So the path travels
// through the UI and the URL is created here, on open.
//
// EXTENSION DECIDES THE RENDERER, and that is trustworthy rather than a guess:
// uploadPrivateFile generates the filename itself and derives the extension
// from the MIME type the bucket already validated, so the stored path cannot
// disagree with the bytes. No sniffing, no Content-Type round trip.
//
// Both buckets accept PDFs as well as images, so assuming an <img> would have
// rendered a broken-image icon for every emailed lab report.

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

type Kind = "image" | "pdf" | "unsupported";

function kindFor(path: string): Kind {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  return "unsupported";
}

export const FileViewerSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** Object path within the bucket, as stored on the owning row. */
  path: string | null;
  bucket: PrivateBucket;
  /** What the file is, for the sheet title — e.g. "X-Ray" or "Lab report". */
  label: string;
}> = ({ open, onClose, path, bucket, label }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !path) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setUrl(null);
    void signedUrlFor(bucket, path).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok || !result.url) {
        // Covers an expired session, a revoked grant, and the case 4a warned
        // about: Storage does not cascade, so a row can outlive its object.
        // All three surface as "this could not be opened" rather than a blank
        // sheet the user has to interpret.
        setError(result.message ?? "That file couldn't be opened.");
        return;
      }
      setUrl(result.url);
    });
    return () => {
      cancelled = true;
    };
  }, [open, path, bucket]);

  const kind = path ? kindFor(path) : "unsupported";

  return (
    <BottomSheet open={open} onClose={onClose} title={label}>
      <div className="animate-fade-slide-up min-h-[220px] flex flex-col justify-center">
        {loading && (
          <div className="flex flex-col items-center gap-2 py-10 text-charcoal-faint">
            <Loader2 size={20} className="animate-spin" />
            <p className="text-xs">Opening…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <FileWarning size={22} className="text-status-high" />
            <p className="text-sm font-semibold text-charcoal">{error}</p>
            <p className="text-[11px] text-charcoal-faint max-w-[16rem]">
              The record is still here — only the attached file couldn't be loaded.
            </p>
          </div>
        )}

        {!loading && !error && url && kind === "image" && (
          <img
            src={url}
            alt={label}
            // A signed URL can expire between minting and loading on a slow
            // connection, and a bad path yields a 400 the <img> swallows into
            // a broken-image icon. Say so instead.
            onError={() => setError("That file couldn't be loaded.")}
            className="w-full max-h-[60vh] object-contain rounded-2xl border border-charcoal/10 bg-cream-soft"
          />
        )}

        {!loading && !error && url && kind === "pdf" && (
          <iframe
            title={label}
            src={url}
            className="w-full h-[60vh] rounded-2xl border border-charcoal/10 bg-cream-soft"
          />
        )}

        {!loading && !error && kind === "unsupported" && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <FileWarning size={22} className="text-charcoal-faint" />
            <p className="text-sm font-semibold text-charcoal">This file can't be previewed here.</p>
            <p className="text-[11px] text-charcoal-faint max-w-[16rem]">
              Only images and PDFs can be shown, which is everything these
              records accept — so this is unexpected rather than routine.
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
