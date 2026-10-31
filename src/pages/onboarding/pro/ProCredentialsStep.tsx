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
import { asRegulated, credentialsComplete, fileLine, isRegulated, licenceNumberError } from "./proModel";
import { proLaneId } from "./proLanes";
import { proChipLabel } from "./proModel";
import { UploadRow, type UploadState } from "./parts";
import { ProLicencePublish } from "./ProLicencePublish";
import type { Licence } from "../../../services/professional-cv";
import type { ProStepProps } from "./types";
import { t, tn } from "../../../i18n/core";

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
 * file; the database turns it into licence #1) and who issued it. Not required
 * to finish, but every lane is listed only once checked (user decision
 * 14 Oct 2026), so it is what they go live on.
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
    const regKind = asRegulated(kind);
    if (!userId || !regKind) return;
    if (offline) {
      setProofState("err");
      setProofError(OB_STRINGS.uploadFailed);
      return;
    }
    setProofState("busy");
    setProofError(null);
    const r = await saveRegistration(
      userId,
      regKind,
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
  const bodyError = reg && tried && pro.registeringBody.trim().length < 2 ? t("Add your registering body.") : null;
  const numberError = reg && tried ? licenceNumberError(pro.licenceNumber) : null;
  const missingProof = reg && tried && !proofUploaded ? t("Add a photo or file of your registration.") : null;
  const errorCount = [bodyError, numberError, missingProof].filter(Boolean).length;
  const ok = credentialsComplete(kind, pro, proofUploaded);

  const go = async () => {
    setTried(true);
    setSaveError(null);
    if (!ok || busy || !userId) return;
    setBusy(true);
    let r: { ok: true } | { ok: false; message: string } = { ok: true };
    const regKind = asRegulated(kind);
    if (reg && rows?.registration && regKind) {
      const changed =
        (rows.registration.issuingBody ?? "") !== pro.registeringBody.trim() || (rows.registration.credentialId ?? "") !== pro.licenceNumber.trim();
      if (changed) {
        const s = await saveRegistration(userId, regKind, { body: pro.registeringBody, number: pro.licenceNumber }, rows.registration, null, rows.count);
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

  // OURS-licence-publish: every licence this step created, offered for the
  // profile as its own step. They arrive hidden (20261120150000); nothing here
  // switches one on for the person.
  const created = [rows?.registration, rows?.degree, rows?.certificate].filter(
    (l, i, all): l is Licence => !!l && all.findIndex((x) => x?.id === l.id) === i
  );
  const publishChanged = (l: Licence) =>
    setRows((prev) =>
      prev
        ? {
            ...prev,
            registration: prev.registration?.id === l.id ? l : prev.registration,
            degree: prev.degree?.id === l.id ? l : prev.degree,
            certificate: prev.certificate?.id === l.id ? l : prev.certificate,
          }
        : prev
    );

  const certSaved = reg ? !!rows?.degree : !!certPath;
  const certSubtitle = certSaved
    ? pro.certificateFile
      ? t("{file} · saved to your account", { file: pro.certificateFile.name })
      : t("Saved to your account")
    : reg
    ? t("Add a file")
    : t("Take a photo or upload a file");

  // Upload and save errors hold English (OB_STRINGS or the service's message); shown through t().
  const footerError = loadError
    ? t(OB_STRINGS.saveError)
    : saveError
    ? t(saveError)
    : tried && errorCount > 0
    ? errorCount === 1 && numberError
      ? t("Add your licence number to continue.")
      : tn(errorCount, "Fix {n} thing to continue.", "Fix {n} things to continue.")
    : offline
    ? t(OB_STRINGS.offlineStep)
    : null;

  return (
    <ObStep
      lane={proLaneId(kind)}
      chipLabel={chipLabel}
      step="creds"
      title={t("Credentials")}
      subtitle={
        kind === "physio"
          ? t("Physiotherapy is regulated, so we check your licence before your profile goes live.")
          : kind === "diet"
          ? t("Dietetics is regulated, so we check your registration before your profile goes live.")
          : kind === "doctor"
          ? t("Medicine is regulated, so we check your licence before your profile goes live.")
          : t("We check your certificate before your profile goes live. It adds a badge clients trust too.")
      }
      onBack={onBack}
      loading={loading}
      footer={
        <ObFooter
          error={footerError}
          errorTone={loadError || saveError || (tried && errorCount > 0) ? "error" : "info"}
          primary={
            loadError
              ? { label: t(OB_STRINGS.tryAgain), onClick: () => setReload((n) => n + 1) }
              : { label: saveError ? t(OB_STRINGS.tryAgain) : t("Continue"), onClick: () => void go(), disabled: busy || loading || (tried && errorCount > 0) }
          }
        />
      }
    >
      {reg ? (
        <>
          <ObSectionLabel title={t("Registration")} tag={t("Required")} tagTone="accent" margin="0 2px 12px" />
          <ObField
            label={t("Registering body")}
            value={pro.registeringBody}
            onChange={(e) => setPro((p) => ({ ...p, registeringBody: e.target.value }))}
            placeholder={t("The board or council you're registered with")}
            maxLength={200}
            error={bodyError}
          />
          <ObField
            label={t("Licence or registration number")}
            icon={Hash}
            value={pro.licenceNumber}
            onChange={(e) => setPro((p) => ({ ...p, licenceNumber: e.target.value }))}
            placeholder={t("e.g. PT-00000")}
            maxLength={120}
            autoComplete="off"
            error={numberError}
          />
          <UploadRow
            icon={IdCard}
            title={t("Proof of registration")}
            subtitle={
              proofUploaded
                ? pro.proofFile
                  ? fileLine(pro.proofFile.name, pro.proofFile.bytes)
                  : t("Saved to your account")
                : t("Take a photo or upload a file")
            }
            state={proofState}
            error={proofError ? t(proofError) : missingProof}
            onPick={(f) => void pickProof(f)}
            disabled={!userId}
          />
          <ObSectionLabel title={t("Other certificates")} tag={t("Optional")} />
          <UploadRow
            icon={Award}
            title={t("Degree or certificate")}
            subtitle={certSubtitle}
            state={certState}
            error={certError && t(certError)}
            onPick={(f) => void pickDegree(f)}
            disabled={!userId || loading}
          />
          <ObTip icon={ShieldCheck} margin="4px 0 0">
            {t("Usually checked within 2 working days. You can finish setting up while you wait.")}
          </ObTip>
        </>
      ) : (
        <>
          <ObSectionLabel title={t("Certification")} tag={t("To go live")} margin="0 2px 12px" />
          <UploadRow
            icon={Award}
            title={t("Certificate")}
            subtitle={certSubtitle}
            state={certState}
            error={certError && t(certError)}
            onPick={(f) => void pickCertificate(f)}
            disabled={!userId || certPath === undefined}
          />
          <ObField
            label={t("Issued by")}
            tag={t("Optional")}
            value={pro.issuedBy}
            onChange={(e) => setPro((p) => ({ ...p, issuedBy: e.target.value }))}
            placeholder={t("e.g. NASM, ACE, Yoga Alliance")}
            maxLength={200}
            help={!rows?.certificate && pro.issuedBy.trim() ? t("Saved with your certificate once you add it.") : undefined}
          />
          <ObTip icon={BadgeCheck} margin="4px 0 0">
            {t("Usually checked within 2 working days. You go live and get the Certified badge once it's checked.")}
          </ObTip>
        </>
      )}
      <ProLicencePublish
        licences={created}
        onChanged={publishChanged}
        unnamedHint={t("Give it a name in the next step, Your background, to show it on your profile.")}
        margin="20px 2px 4px"
      />
    </ObStep>
  );
};
