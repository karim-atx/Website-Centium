import React, { useEffect, useRef, useState } from "react";
import { ClipboardList, FileText, Image as ImageIcon, Lock, Plus, ShieldCheck } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { textPx } from "../../../theme/textSize";
import { CtaButton } from "../../ui/PinnedCta";
import { FileViewerSheet } from "../../health/FileViewerSheet";
import { INK } from "../proInk";
import { ComingSoonPill } from "../ComingSoon";
import { ProCardSkeleton, ProError } from "../states";
import { ListCard, SectionHead, SoftLine } from "./kit";
import { fmtDay } from "./clientFormat";
import type { ClientPageData } from "./useClientPage";
import { fetchClientFiles, fetchTermsAcceptance, uploadClientFile, type ClientFile } from "../../../services/pro/clientPage";
import { acceptFor, validateFileFor } from "../../../services/storage";

/**
 * Release 3 · CL2 v3 Tab 6 Files (source gen/r6b.js cpTab6 'Files'):
 * - Intake and health history: the intake form (Forms, W6: Coming soon) and
 *   Consent "Signed {date} · coaching terms" (coaching_terms_acceptances);
 * - Documents: client_files of kind document, from either side, "Added by
 *   you" or "Added by {name}"; open in FileViewerSheet (client-files);
 *   "Add a document" registers the row (create_client_file) and uploads to
 *   the path it returns;
 * - Progress photos: a client's own upload reaches the professional only
 *   with Body measurements (client_file_visible); not shared: "{name} hasn't
 *   shared progress photos." with the lock.
 */
export const FilesTab: React.FC<{ data: ClientPageData }> = ({ data }) => {
  const { authUserId } = useApp();
  const online = useOnline();
  const { clientId, firstName, access } = data;
  const [files, setFiles] = useState<{ list: ClientFile[] | null; error: boolean }>({ list: null, error: false });
  const [terms, setTerms] = useState<{ version: number; acceptedAt: string } | null | undefined>(undefined);
  const [nonce, setNonce] = useState(0);
  const [viewing, setViewing] = useState<ClientFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchClientFiles(authUserId, clientId).then((r) => live && setFiles(r.ok ? { list: r.data, error: false } : { list: null, error: true }));
    void fetchTermsAcceptance(authUserId, clientId).then((r) => live && setTerms(r.ok ? r.data : null));
    return () => {
      live = false;
    };
  }, [authUserId, clientId, nonce]);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    const check = validateFileFor("client-files", file);
    if (!check.ok) return setMsg(check.message ?? "That file can't be added.");
    if (!online) return setMsg("You're offline. Try again when you're connected.");
    setBusy(true);
    setMsg(null);
    const r = await uploadClientFile(clientId, "document", file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Document", file);
    setBusy(false);
    if (!r.ok) return setMsg(r.message);
    setNonce((n) => n + 1);
  };

  if (files.error && !files.list) return <ProError onRetry={() => setNonce((n) => n + 1)} />;
  if (!files.list) return <ProCardSkeleton lines={4} height={240} />;
  const docs = files.list.filter((f) => f.kind === "document");
  const photos = files.list.filter((f) => f.kind === "progress_photo");
  const by = (f: ClientFile) => (f.uploadedByMe ? "Added by you" : `Added by ${firstName}`);

  return (
    <>
      <SectionHead label="Intake and health history" />
      <ListCard
        rows={[
          { key: "intake", icon: ClipboardList, title: "Intake form", meta: "Answers carried into the profile", trailing: <ComingSoonPill /> },
          {
            key: "consent",
            icon: ShieldCheck,
            title: "Consent",
            meta: terms === undefined ? "Loading…" : terms ? `Signed ${fmtDay(terms.acceptedAt)} · coaching terms` : "No coaching terms signed yet",
          },
        ]}
      />
      <SectionHead label="Documents" />
      {docs.length ? (
        <ListCard rows={docs.map((f) => ({ key: f.id, icon: FileText, title: f.title, meta: `${by(f)} · ${fmtDay(f.createdAt)}`, onClick: () => setViewing(f) }))} />
      ) : (
        <SoftLine icon={FileText}>{`No documents yet. Anything you or ${firstName} add shows here for both of you.`}</SoftLine>
      )}
      <div className="flex" style={{ marginBottom: 6 }}>
        <CtaButton size="base" variant="secondary" icon={<Plus size={15} />} label="Add a document" loading={busy} onClick={() => input.current?.click()} />
        <input ref={input} type="file" hidden accept={acceptFor("client-files")} onChange={(e) => { void onPick(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {msg && (
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginBottom: 8 }}>
          {msg}
        </p>
      )}
      <div style={{ height: 8 }} />
      <SectionHead label="Progress photos" />
      {photos.length ? (
        <ListCard rows={photos.map((f) => ({ key: f.id, icon: ImageIcon, title: f.title, meta: `${by(f)} · ${fmtDay(f.createdAt)}`, onClick: () => setViewing(f) }))} />
      ) : access.has("body_measurements") ? (
        <SoftLine icon={ImageIcon}>{`${firstName} hasn't added progress photos yet.`}</SoftLine>
      ) : (
        <SoftLine icon={Lock}>{`${firstName} hasn't shared progress photos.`}</SoftLine>
      )}
      <FileViewerSheet open={!!viewing} onClose={() => setViewing(null)} path={viewing?.path ?? null} bucket="client-files" label={viewing?.title ?? "File"} />
    </>
  );
};
