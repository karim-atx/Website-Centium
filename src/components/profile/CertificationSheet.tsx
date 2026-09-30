import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { AttachDocument } from "../ui/AttachDocument";
import { LicenceStatusBadge, RejectionNote } from "../cv/CvBadges";
import { useApp } from "../../context/AppContext";
import {
  fetchCertificationPath,
  isLocalOnlyCertification,
  removeCertification,
  uploadCertification,
} from "../../services/certification";
import { fetchCertificateStatus, type LicenceStatus } from "../../services/professional-cv";

// The professional's onboarding certificate: view, replace or remove it.
//
// IT IS LICENCE #1 OF THE CV. The database keeps
// professional_profiles.certification_url and the first licence's document in
// step both ways, so an upload here re-opens that licence's review, and the
// status shown is that licence's: the same rule the public Verified badge uses.
// The fixed "verification isn't available yet" line that stood here is gone —
// the review flow exists now.
//
// `user.certificationUrl` HOLDS A PATH, NOT A URL, because the bucket is
// private. The preview is signed on open by FileViewerSheet (via
// AttachDocument), never read straight from the field.
export const CertificationSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user, updateProfile, authUserId } = useApp();

  // THE SERVER IS THE SOURCE OF TRUTH, not local state: the column is not
  // carried by fetchProfile, so a professional who uploaded on their phone
  // would otherwise be told on a laptop that they have none. Local state is
  // still mirrored for the places that only test presence.
  const [stored, setStored] = useState<string | null>(user.certificationUrl ?? null);
  const [status, setStatus] = useState<LicenceStatus | null>(null);

  const refreshStatus = async () => {
    if (!authUserId) return;
    setStatus(await fetchCertificateStatus(authUserId));
  };

  useEffect(() => {
    if (!open || !authUserId) return;
    let cancelled = false;
    void fetchCertificationPath(authUserId).then((result) => {
      if (cancelled || !result.ok) return;
      // A pre-Storage `data:` leftover exists only in local state; keep it
      // visible so the copy below can say plainly that it is on this device.
      const next = result.path ?? (isLocalOnlyCertification(user.certificationUrl) ? user.certificationUrl! : null);
      setStored(next);
      if (next !== user.certificationUrl) updateProfile({ certificationUrl: next ?? undefined });
    });
    void fetchCertificateStatus(authUserId).then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
    // user.certificationUrl is read for the fallback and must not re-trigger
    // this; the sheet is keyed by its caller and re-reads on every open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, authUserId]);

  const isLegacyLocal = isLocalOnlyCertification(stored);
  const path = stored && !isLegacyLocal ? stored : null;

  return (
    <BottomSheet open={open} onClose={onClose} title="Certification">
      <div className="space-y-4">
        {path ? (
          status && status.kind !== "none" ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-charcoal">Review</span>
                <LicenceStatusBadge status={status} />
              </div>
              {status.kind === "rejected" && <RejectionNote reason={status.reason} />}
              {status.kind === "pending" && (
                <p className="text-xs text-charcoal-soft">Our team checks it and clients see a Verified badge once it's approved.</p>
              )}
            </div>
          ) : null
        ) : isLegacyLocal ? (
          <p className="flex items-start gap-1.5 text-xs text-status-caution">
            <Clock size={13} className="shrink-0 mt-0.5" />
            This copy is only saved on this device. Upload it again to store it on your account.
          </p>
        ) : (
          <p className="text-sm text-charcoal-faint text-center py-3">No certification uploaded yet.</p>
        )}

        <AttachDocument
          bucket="certifications"
          path={path}
          label="Certification"
          busyLabel="Saving…"
          onFile={async (file) => {
            if (!authUserId) return { ok: false, message: "You're signed out. Sign in again to upload." };
            const result = await uploadCertification(authUserId, file, stored);
            if (!result.ok) return result;
            setStored(result.path);
            updateProfile({ certificationUrl: result.path });
            await refreshStatus();
            return { ok: true };
          }}
          onRemove={async () => {
            if (!authUserId) return { ok: false, message: "You're signed out." };
            const result = await removeCertification(authUserId, stored);
            if (!result.ok) return { ok: false, message: result.message ?? "Couldn't remove your certification." };
            setStored(null);
            setStatus(null);
            updateProfile({ certificationUrl: undefined });
            return { ok: true };
          }}
        />

        <p className="text-[11.5px] text-charcoal-soft leading-relaxed">
          This is the first licence on your CV. Add its name and issuer, and any other licences, in Profile › My CV.
        </p>
      </div>
    </BottomSheet>
  );
};
