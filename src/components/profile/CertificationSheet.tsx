import React, { useEffect, useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import {
  certificationUrl,
  fetchCertificationPath,
  isLocalOnlyCertification,
  removeCertification,
  uploadCertification,
} from "../../services/certification";
import { acceptFor } from "../../services/storage";
import { Camera, FileText, Clock, Trash2 } from "lucide-react";

// V7 (QA 7.0): the certification a professional uploads during onboarding
// had no surface to view or replace afterward — this gives it one under More.
//
// IT IS A REAL UPLOAD NOW. What this used to do was read the file into a
// base64 `data:` URL and hand it to updateProfile, which is local state:
// nothing was uploaded, professional_profiles.certification_url was never
// written, and the document existed in one browser's localStorage. The sheet
// meanwhile displayed "Pending confirmation & approval by administrators" over
// a file no administrator could open — a claim about a review process, made
// about bytes that had never left the device. See services/certification.
//
// `user.certificationUrl` NOW HOLDS A PATH, NOT A URL, because the bucket is
// private. Anything to be rendered has to be signed first, which is why the
// preview below is state rather than a src read straight from the field.
export const CertificationSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user, updateProfile, authUserId } = useApp();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);

  // THE SERVER IS THE SOURCE OF TRUTH, not local state, and this is the
  // difference between a real feature and a write with no read. The column is
  // not carried by fetchProfile or by fetchMyProfile's column list, so a
  // professional who uploaded on their phone would open this on a laptop and
  // be told they have no certification. Local state is still mirrored, for
  // the listing preview in ProfessionalExplore which only tests presence.
  const [stored, setStored] = useState<string | null>(user.certificationUrl ?? null);

  useEffect(() => {
    if (!open || !authUserId) return;
    let cancelled = false;
    void fetchCertificationPath(authUserId).then((result) => {
      if (cancelled || !result.ok) return;
      // Falling back to the local value when the column is empty keeps a
      // pre-Storage `data:` leftover visible — with the copy below saying
      // plainly that it is only on this device.
      const next = result.path ?? (isLocalOnlyCertification(user.certificationUrl) ? user.certificationUrl! : null);
      setStored(next);
      if (next !== user.certificationUrl) updateProfile({ certificationUrl: next ?? undefined });
    });
    return () => {
      cancelled = true;
    };
    // user.certificationUrl is read for the fallback and must not re-trigger
    // this; the sheet is keyed by its caller and re-reads on every open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, authUserId]);

  // A leftover from before this was built: still viewable, because the bytes
  // are right there, but not stored anywhere and the copy says so.
  const isLegacyLocal = isLocalOnlyCertification(stored);

  // SIGNED ON OPEN, NOT HELD. signedUrlFor caps its TTL at minutes, so a URL
  // kept in state across a long session would expire into a broken preview.
  // Asking each time the sheet opens is both simpler and correct.
  //
  // Nothing clears the URL when the sheet closes, because Profile keys this
  // component so it remounts on each open — the same treatment RateAppSheet
  // and TwoFactorSheet get there, and it means a signed URL cannot outlive
  // the visit that minted it.
  useEffect(() => {
    if (!open || !stored) return;
    let cancelled = false;
    void certificationUrl(stored).then((result) => {
      if (cancelled) return;
      if (!result.ok || !result.url) {
        setViewError(result.message ?? "Couldn't open your certification.");
        return;
      }
      setViewError(null);
      setViewUrl(result.url);
    });
    return () => {
      cancelled = true;
    };
  }, [open, stored]);

  const isPdfLike =
    isLegacyLocal
      ? stored!.startsWith("data:application/pdf")
      : /\.(pdf|doc|docx)$/i.test(stored ?? "");

  const handleFile = async (file: File) => {
    if (!authUserId || busy) return;
    setBusy(true);
    setError(null);
    const result = await uploadCertification(authUserId, file, stored);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    // Local state mirrors the stored PATH, so the next open signs the right
    // object and a replace knows what to delete.
    setStored(result.path);
    updateProfile({ certificationUrl: result.path });
  };

  const handleRemove = async () => {
    if (!authUserId || busy) return;
    setBusy(true);
    setError(null);
    const result = await removeCertification(authUserId, stored);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Couldn't remove your certification.");
      return;
    }
    setStored(null);
    updateProfile({ certificationUrl: undefined });
    setViewUrl(null);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Certification">
      <div className="space-y-4 animate-fade-slide-up">
        <input
          ref={cameraInputRef}
          type="file"
          accept={acceptFor("certifications", true)}
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
        />
        <input
          ref={fileInputRef}
          type="file"
          // Derived from the bucket rather than typed out, the same fix the
          // capture flows got: `image/*,application/pdf` offered HEIC and
          // friends that the bucket refuses, and hid the Word documents it
          // accepts.
          accept={acceptFor("certifications")}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
        />

        {stored ? (
          <div>
            {viewError ? (
              <p className="text-sm text-status-high text-center py-6">{viewError}</p>
            ) : !viewUrl ? (
              <p className="text-sm text-charcoal-faint text-center py-6">Opening…</p>
            ) : isPdfLike ? (
              <iframe title="Certification" src={viewUrl} className="w-full h-64 rounded-2xl border border-charcoal/10" />
            ) : (
              <img
                src={viewUrl}
                alt="Certification"
                className="w-full max-h-64 object-contain rounded-2xl border border-charcoal/10 bg-cream-soft"
              />
            )}

            {/* PROVISIONAL COPY — REVISIT WHEN THE REVIEW FLOW SHIPS.
                This used to promise "Pending confirmation & approval by
                administrators", which was false twice: nothing was stored, and
                there is no review flow to be pending in. The file is really
                stored now, so the first half is fixed; the second is not, and
                until an administrator can actually open and decide on these,
                the honest thing to say is that it is saved and not yet
                reviewed. professional_profiles has no review-status column
                today — when it gains one, this line should read from it
                instead of stating one fixed thing to everybody. */}
            {isLegacyLocal ? (
              <p className="flex items-start gap-1.5 text-xs text-status-caution mt-2.5">
                <Clock size={13} className="shrink-0 mt-0.5" />
                This copy is only saved on this device. Upload it again to store it on your account.
              </p>
            ) : (
              <p className="flex items-start gap-1.5 text-xs text-charcoal-soft mt-2.5">
                <Clock size={13} className="shrink-0 mt-0.5" />
                Saved to your account. Verification by our team isn't available yet — we'll be in
                touch when it is.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-charcoal-faint text-center py-6">No certification uploaded yet.</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={busy}
            className="tap flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-charcoal/10 bg-cream-card py-5 disabled:opacity-40"
          >
            <Camera size={20} className="text-primary" />
            <span className="text-xs font-semibold text-charcoal-soft">Use camera</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="tap flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-charcoal/10 bg-cream-card py-5 disabled:opacity-40"
          >
            <FileText size={20} className="text-primary" />
            <span className="text-xs font-semibold text-charcoal-soft">
              {stored ? "Replace file" : "Upload file"}
            </span>
          </button>
        </div>

        {busy && <p className="text-center text-xs font-semibold text-charcoal-faint">Saving…</p>}
        {error && <p className="text-center text-xs font-semibold text-status-high">{error}</p>}

        {stored && (
          <Button
            variant="outline"
            fullWidth
            onClick={() => void handleRemove()}
            disabled={busy}
            className="!border-teal/30 !text-teal-dark"
          >
            <Trash2 size={14} /> Remove certification
          </Button>
        )}
      </div>
    </BottomSheet>
  );
};
