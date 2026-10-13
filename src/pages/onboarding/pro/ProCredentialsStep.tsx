import React, { useEffect, useState } from "react";
import { Award, BadgeCheck, Hash, IdCard, ShieldCheck } from "lucide-react";
import { ObStep, ObFooter } from "../shell/ObShell";
import { ObField, ObSectionLabel, ObTip } from "../shell/ObBlocks";
import { useOnboardingFlow, OB_STRINGS } from "../shell/flow";
import { fetchCertificationPath, uploadCertification } from "../../../services/certification";
import {
  ensureProProfileRow,
  fetchCredentialRows,
  saveCertificateIssuer,
  saveDegree,
  saveRegistration,
  type CredentialRows,
} from "../../../services/professional-onboarding";
import { credentialsComplete, fileLine, isRegulated, licenceNumberError } from "./proModel";
import { proLaneId } from "./proLanes";
import { proChipLabel } from "./proModel";
import { UploadRow, type UploadState } from "./parts";
import type { ProStepProps } from "./types";

/**
 * Step 4 · Credentials (OB-147, OB-173, OB-175, OB-176, OB-204).
 *
 * Physiotherapist and Dietitian (regulated): registering body, licence number
 * and proof, required. The proof is a professional_licences row whose document
 * opens a review in the existing licence review queue. V6-67: no real list of
 * registering bodies was supplied, so the body is free text; the frame's
 * sample board names never ship. The degree or certificate is optional.
 *
 * Fitness and Other: the certificate (kept from About you: uploaded the moment
 * it is picked, the server path read first so a replace removes the real old
 * file; the database turns it into licence #1) and who issued it.
 */
export const ProCredentialsStep: React.FC<ProStepProps> = ({ kind, shared, setShared, pro, setPro, userId, onNext, onBack }) => {
  const flow = useOnboardingFlow();
  const reg = isRegulated(kind);
  const chipLabel = proChipLabel(kind, pro.whatYouDo);
  const [rows, setRows] = useState<CredentialRows | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [certPath, setCertPath] = useState<string | null | undefined>(undefined);
  const [proofState, setProofState] = useState<UploadState>("empty");
  const [proofError, setProofError] = useState<string | null>(null);
  const [certState, setCertState] = useState<UploadState>("empty");
  const [certError, setCertError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  // The server's rows, not the draft's: onboarding resumed on another device
  // must see (and replace) what is really stored.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    // The profile row first: created after a licence, it would wipe that
    // licence's document (ensureProProfileRow).
    void ensureProProfileRow(userId)
      .then(() => Promise.all([fetchCredentialRows(userId, pro.registrationLicenceId), fetchCertificationPath(userId)]))
      .then(([r, c]) => {
      if (cancelled) return;
      if (!r.ok) {
        setLoadError(r.message);
        return;
      }
      setLoadError(null);
      setRows(r);
      const path = c.ok ? c.path : null;
      setCertPath(path);
      if (path !== shared.certificationFile) setShared({ certificationFile: path });
      setCertState(reg ? (r.degree ? "done" : "empty") : path ? "done" : "empty");
      setProofState(r.registration?.documentPath ? "done" : "empty");
      if (r.registration) {
        setPro((p) => ({
          ...p,
          registrationLicenceId: r.registration!.id,
          registeringBody: p.registeringBody || r.registration!.issuingBody || "",
          licenceNumber: p.licenceNumber || r.registration!.credentialId || "",
        }));
      }
      if (r.certificate?.issuingBody) setPro((p) => (p.issuedBy ? p : { ...p, issuedBy: r.certificate!.issuingBody ?? "" }));
    });
    return () => {
      cancelled = true;
    };
    // shared / setters are stable for this purpose; re-read only on retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, reload]);

  const offline = !!flow && !flow.online;
  const loading = !!userId && !rows && !loadError;

  const pickCertificate = async (file: File) => {
    if (!userId) return;
    if (offline) {
      setCertState("err");
      setCertError(OB_STRINGS.uploadFailed);
      return;
    }
    setCertState("busy");
    setCertError(null);
    const r = await uploadCertification(userId, file, certPath ?? null);
    if (!r.ok) {
      setCertState(certPath ? "done" : "err");
      setCertError(r.message || OB_STRINGS.uploadFailed);
      return;
    }
    setCertPath(r.path);
    setShared({ certificationFile: r.path });
    setPro((p) => ({ ...p, certificateFile: { name: file.name, bytes: file.size } }));
    setCertState("done");
    const fresh = await fetchCredentialRows(userId, pro.registrationLicenceId);
    if (fresh.ok) setRows(fresh);
  };

  // Regulated: the degree is its own licence. Going through certification_url
  // would overwrite licence #1, which may be the registration proof itself.
  const pickDegree = async (file: File) => {
    if (!userId) return;
    if (offline) {
      setCertState("err");
      setCertError(OB_STRINGS.uploadFailed);
      return;
    }
    setCertState("busy");
    setCertError(null);
    const r = await saveDegree(userId, rows?.degree ?? null, file, rows?.count ?? 0);
    if (!r.ok) {
      setCertState(rows?.degree ? "done" : "err");
      setCertError(r.message || OB_STRINGS.uploadFailed);
      return;
    }
    setRows((prev) => (prev ? { ...prev, degree: r.licence, count: prev.degree ? prev.count : prev.count + 1 } : prev));
    setPro((p) => ({ ...p, certificateFile: { name: file.name, bytes: file.size } }));
    setCertState("done");
  };

  const pickProof = async (file: File) => {
    if (!userId || (kind !== "physio" && kind !== "diet")) return;
    if (offline) {
      setProofState("err");
      setProofError(OB_STRINGS.uploadFailed);
      return;
    }
    setProofState("busy");
    setProofError(null);
    const r = await saveRegistration(
      userId,
      kind,
      { body: pro.registeringBody, number: pro.licenceNumber },
      rows?.registration ?? null,
      file,
      rows?.count ?? 0
    );
    if (!r.ok) {
      setProofState(rows?.registration?.documentPath ? "done" : "err");
      setProofError(r.message || OB_STRINGS.uploadFailed);
      return;
    }
    setRows((prev) => (prev ? { ...prev, registration: r.licence, count: prev.registration ? prev.count : prev.count + 1 } : prev));
    setPro((p) => ({ ...p, registrationLicenceId: r.licence.id, proofFile: { name: file.name, bytes: file.size } }));
    setProofState("done");
  };

  const proofUploaded = !!rows?.registration?.documentPath;
  const bodyError = reg && tried && pro.registeringBody.trim().length < 2 ? "Add your registering body." : null;
  const numberError = reg && tried ? licenceNumberError(pro.licenceNumber) : null;
  const missingProof = reg && tried && !proofUploaded ? "Add a photo or file of your registration." : null;
  const errorCount = [bodyError, numberError, missingProof].filter(Boolean).length;
  const ok = credentialsComplete(kind, pro, proofUploaded);

  const go = async () => {
    setTried(true);
    setSaveError(null);
    if (!ok || busy || !userId) return;
    setBusy(true);
    let r: { ok: true } | { ok: false; message: string } = { ok: true };
    if (reg && rows?.registration && (kind === "physio" || kind === "diet")) {
      const changed =
        (rows.registration.issuingBody ?? "") !== pro.registeringBody.trim() || (rows.registration.credentialId ?? "") !== pro.licenceNumber.trim();
      if (changed) {
        const s = await saveRegistration(userId, kind, { body: pro.registeringBody, number: pro.licenceNumber }, rows.registration, null, rows.count);
        r = s.ok ? { ok: true } : s;
        if (s.ok) setRows((prev) => (prev ? { ...prev, registration: s.licence } : prev));
      }
    }
    if (r.ok && rows?.certificate && pro.issuedBy.trim() !== (rows.certificate.issuingBody ?? "")) {
      r = await saveCertificateIssuer(userId, rows.certificate, pro.issuedBy);
    }
    setBusy(false);
    if (!r.ok) {
      setSaveError(r.message);
      return;
    }
    onNext();
  };

  const certSaved = reg ? !!rows?.degree : !!certPath;
  const certSubtitle = certSaved
    ? pro.certificateFile
      ? `${pro.certificateFile.name} · saved to your account`
      : "Saved to your account"
    : reg
    ? "Add a file"
    : "Take a photo or upload a file";

  const footerError = loadError
    ? OB_STRINGS.saveError
    : saveError
    ? saveError
    : tried && errorCount > 0
    ? errorCount === 1 && numberError
      ? "Add your licence number to continue."
      : `Fix ${errorCount} thing${errorCount === 1 ? "" : "s"} to continue.`
    : offline
    ? OB_STRINGS.offlineStep
    : null;

  return (
    <ObStep
      lane={proLaneId(kind)}
      chipLabel={chipLabel}
      step="creds"
      title="Credentials"
      subtitle={
        kind === "physio"
          ? "Physiotherapy is regulated, so we check your licence before your profile goes live."
          : kind === "diet"
          ? "Dietetics is regulated, so we check your registration before your profile goes live."
          : "Optional, but a checked certificate adds a badge clients trust."
      }
      onBack={onBack}
      loading={loading}
      footer={
        <ObFooter
          error={footerError}
          errorTone={loadError || saveError || (tried && errorCount > 0) ? "error" : "info"}
          primary={
            loadError
              ? { label: OB_STRINGS.tryAgain, onClick: () => setReload((n) => n + 1) }
              : { label: saveError ? OB_STRINGS.tryAgain : "Continue", onClick: () => void go(), disabled: busy || loading || (tried && errorCount > 0) }
          }
        />
      }
    >
      {reg ? (
        <>
          <ObSectionLabel title="Registration" tag="Required" tagTone="accent" margin="0 2px 12px" />
          <ObField
            label="Registering body"
            value={pro.registeringBody}
            onChange={(e) => setPro((p) => ({ ...p, registeringBody: e.target.value }))}
            placeholder="The board or council you're registered with"
            maxLength={200}
            error={bodyError}
          />
          <ObField
            label="Licence or registration number"
            icon={Hash}
            value={pro.licenceNumber}
            onChange={(e) => setPro((p) => ({ ...p, licenceNumber: e.target.value }))}
            placeholder="e.g. PT-00000"
            maxLength={120}
            autoComplete="off"
            error={numberError}
          />
          <UploadRow
            icon={IdCard}
            title="Proof of registration"
            subtitle={
              proofUploaded
                ? pro.proofFile
                  ? fileLine(pro.proofFile.name, pro.proofFile.bytes)
                  : "Saved to your account"
                : "Take a photo or upload a file"
            }
            state={proofState}
            error={proofError ?? missingProof}
            onPick={(f) => void pickProof(f)}
            disabled={!userId}
          />
          <ObSectionLabel title="Other certificates" tag="Optional" />
          <UploadRow
            icon={Award}
            title="Degree or certificate"
            subtitle={certSubtitle}
            state={certState}
            error={certError}
            onPick={(f) => void pickDegree(f)}
            disabled={!userId || loading}
          />
          <ObTip icon={ShieldCheck} margin="4px 0 0">
            Usually checked within 2 working days. You can finish setting up while you wait.
          </ObTip>
        </>
      ) : (
        <>
          <ObSectionLabel title="Certification" tag="Recommended" margin="0 2px 12px" />
          <UploadRow
            icon={Award}
            title="Certificate"
            subtitle={certSubtitle}
            state={certState}
            error={certError}
            onPick={(f) => void pickCertificate(f)}
            disabled={!userId || certPath === undefined}
          />
          <ObField
            label="Issued by"
            tag="Optional"
            value={pro.issuedBy}
            onChange={(e) => setPro((p) => ({ ...p, issuedBy: e.target.value }))}
            placeholder="e.g. NASM, ACE, Yoga Alliance"
            maxLength={200}
            help={!rows?.certificate && pro.issuedBy.trim() ? "Saved with your certificate once you add it." : undefined}
          />
          <ObTip icon={BadgeCheck} margin="4px 0 0">
            You go live straight away. The Certified badge appears once we've checked it.
          </ObTip>
        </>
      )}
    </ObStep>
  );
};
