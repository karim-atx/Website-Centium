import { partBSheetTone } from "./log/LogSheetParts";
import React, { useEffect, useState } from "react";
import { Check, ChevronRight, FileText, Lock, Share } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { useApp } from "../../context/AppContext";
import { fetchLinkedProfessionals, type LinkedProfessional } from "../../services/consent";
import { getImagingShares, shareImagingRecord, unshareImagingRecord, type ImagingShare } from "../../services/imaging";
import { signedUrlFor } from "../../services/storage";
import { initials } from "../professionals/typeColour";
import { textPx, linePx } from "../../theme/textSize";
import type { ImagingRecord } from "../../types";
import { useHealthMode, hairline, fieldFill, tileFill, deepInk, fmtDate, fileKind, SheetCaps, Skel, ConfirmPopup, INK, INK_SOFT, INK_FAINT } from "./records/kit";

// HE1.9.b.2 · Share {type}. V6-25: the canvas "Share Result" summary card is
// retired for imaging; Export file shares or downloads the ORIGINAL file
// (signed at the moment of export, never stored). Per-file sharing is B2
// imaging_shares: tick connected professionals and Share; the "Shared with"
// section lists who has this file with Stop sharing (OURS-imaging-revoke).
// A professional sees the file only while a share exists and the
// medical_history category is granted (RLS); B4 tells them by push.

/** Downloads (or, where the browser can, shares) a stored file under a neutral name. */
export async function exportStoredFile(bucket: "medical-imaging" | "lab-reports", path: string): Promise<{ ok: boolean }> {
  const signed = await signedUrlFor(bucket, path);
  if (!signed.ok || !signed.url) return { ok: false };
  try {
    const res = await fetch(signed.url);
    if (!res.ok) return { ok: false };
    const blob = await res.blob();
    const ext = path.split(".").pop() ?? "bin";
    // NEUTRAL NAME: seen before the file is opened, so it never names the scan.
    const name = `centium-health-record.${ext}`;
    const file = new File([blob], name, { type: blob.type });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Health record · Centium" });
        return { ok: true };
      } catch {
        // fall through to download
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export const ShareImagingSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  record: ImagingRecord | null;
  /** @deprecated The imaging summary card is retired (V6-25); ignored. */
  records?: ImagingRecord[];
  onToast?: (message: string) => void;
}> = ({ open, onClose, record, onToast }) => {
  const { authUserId } = useApp();
  const { dark, hc } = useHealthMode();
  const [pros, setPros] = useState<LinkedProfessional[] | null>(null);
  const [shares, setShares] = useState<ImagingShare[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [stopFor, setStopFor] = useState<LinkedProfessional | null>(null);
  const [stopBusy, setStopBusy] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!open || !authUserId || !record) return;
    let cancelled = false;
    setPros(null);
    setPicked(new Set());
    void Promise.all([fetchLinkedProfessionals(), getImagingShares([record.id])]).then(([linked, sh]) => {
      if (cancelled) return;
      setPros(linked.status === "ok" ? linked.professionals : []);
      setShares(sh.ok ? sh.shares : []);
    });
    return () => {
      cancelled = true;
    };
  }, [open, authUserId, record, tick]);

  if (!record) return null;
  const kind = fileKind(record.filePath);
  const rule = `0.5px solid ${hairline(dark, hc)}`;
  const sharedIds = new Set(shares.map((s) => s.professionalId));
  const sharedPros = (pros ?? []).filter((p) => sharedIds.has(p.professionalId));
  const openPros = (pros ?? []).filter((p) => !sharedIds.has(p.professionalId));
  const n = picked.size;
  const pages = record.filePages ? `, ${record.filePages} page${record.filePages === 1 ? "" : "s"}` : "";

  const doExport = async () => {
    if (!record.filePath || exporting) return;
    setExporting(true);
    const r = await exportStoredFile("medical-imaging", record.filePath);
    setExporting(false);
    if (!r.ok) onToast?.("Couldn't share. Try again.");
  };
  const doShare = async () => {
    if (n === 0) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return onToast?.("You're offline. Try again when you're connected.");
    setSharing(true);
    const ids = [...picked];
    const r = await shareImagingRecord(record.id, ids);
    setSharing(false);
    if (!r.ok) return onToast?.("Couldn't share. Try again.");
    const first = (pros ?? []).find((p) => p.professionalId === ids[0]);
    onToast?.(ids.length === 1 && first ? `Shared with ${first.name}` : `Shared with ${ids.length} professionals`);
    setTick((t) => t + 1);
  };
  const doStop = async () => {
    if (!stopFor) return;
    setStopBusy(true);
    setStopError(null);
    const r = await unshareImagingRecord(record.id, stopFor.professionalId);
    setStopBusy(false);
    if (!r.ok) return setStopError("Couldn't save. Try again.");
    onToast?.(`Stopped sharing with ${stopFor.name}.`);
    setStopFor(null);
    setTick((t) => t + 1);
  };

  const avatar = (p: LinkedProfessional) =>
    p.avatarUrl ? (
      <img src={p.avatarUrl} alt="" className="shrink-0 object-cover" style={{ width: 40, height: 40, borderRadius: 9999 }} />
    ) : (
      <span aria-hidden className="grid place-items-center shrink-0" style={{ width: 40, height: 40, borderRadius: 9999, background: dark ? "#293339" : "#E1EFEC", color: dark ? "#93C1B9" : "#3C6B65", fontSize: textPx(13), fontWeight: 800 }}>
        {initials(p.name)}
      </span>
    );

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={`Share ${record.type}`}
        chrome="partB"
        tone={partBSheetTone(dark)}
        footerBottom={30}
        footer={
          <CtaButton
            label={n === 0 ? "Share" : `Share with ${n} professional${n === 1 ? "" : "s"}`}
            onClick={() => void doShare()}
            loading={sharing}
            disabled={n === 0 || !record.filePath}
          />
        }
      >
        <div className="flex items-center" style={{ minHeight: 57.5, padding: "10px 12px", gap: 12, borderRadius: 14, background: fieldFill(dark) }}>
          <FileText size={20} style={{ color: deepInk(dark) }} aria-hidden />
          <span className="flex-1 min-w-0">
            <span className="block truncate" style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3), fontWeight: 600, color: INK }}>
              {record.note ? `${record.type} · ${record.note}` : record.type}
            </span>
            <span className="block" style={{ fontSize: textPx(11.5), lineHeight: linePx(17.3), color: INK_FAINT }}>
              {[fmtDate(record.date), kind ? `${kind}${kind === "PDF" ? pages : ""}` : null].filter(Boolean).join(" · ")}
            </span>
          </span>
        </div>

        {/* OURS-imaging-revoke: who has this file, Stop sharing. */}
        {sharedPros.length > 0 && (
          <>
            <SheetCaps style={{ marginTop: 16 }}>Shared with</SheetCaps>
            {sharedPros.map((p) => {
              const at = shares.find((s) => s.professionalId === p.professionalId)?.sharedAt;
              return (
                <div key={p.professionalId} className="flex items-center" style={{ minHeight: 56, gap: 12, borderTop: rule }}>
                  {avatar(p)}
                  <span className="flex-1 min-w-0">
                    <span className="block truncate" style={{ fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 600, color: INK }}>
                      {p.name}
                    </span>
                    {at && (
                      <span className="block" style={{ fontSize: textPx(11.5), lineHeight: linePx(17.3), color: INK_FAINT }}>
                        {`Shared ${fmtShort(at)}`}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStopError(null);
                      setStopFor(p);
                    }}
                    className="tap min-h-[44px] shrink-0"
                    style={{ fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 700, color: dark ? "#F09A8E" : "#C0392B" }}
                  >
                    Stop sharing
                  </button>
                </div>
              );
            })}
          </>
        )}

        <SheetCaps style={{ marginTop: 16 }}>Share with a professional</SheetCaps>
        {pros === null ? (
          [0, 1].map((i) => (
            <div key={i} className="flex items-center" style={{ height: 56, gap: 12, borderTop: rule }}>
              <Skel w={40} h={40} r={20} />
              <Skel w="40%" h={12} />
            </div>
          ))
        ) : pros.length === 0 ? (
          <p style={{ padding: "10px 2px", fontSize: textPx(12), lineHeight: linePx(18), color: INK_FAINT, borderTop: rule }}>No professionals connected yet.</p>
        ) : openPros.length === 0 ? (
          <p style={{ padding: "10px 2px", fontSize: textPx(12), lineHeight: linePx(18), color: INK_FAINT, borderTop: rule }}>Everyone you&apos;re connected with has this file.</p>
        ) : (
          openPros.map((p) => {
            const on = picked.has(p.professionalId);
            return (
              <button
                key={p.professionalId}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() =>
                  setPicked((prev) => {
                    const next = new Set(prev);
                    if (next.has(p.professionalId)) next.delete(p.professionalId);
                    else next.add(p.professionalId);
                    return next;
                  })
                }
                className="tap w-full flex items-center text-left"
                style={{ minHeight: 56, gap: 12, borderTop: rule }}
              >
                {avatar(p)}
                <span className="flex-1 min-w-0 truncate" style={{ fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 600, color: INK }}>
                  {p.name}
                </span>
                <span
                  aria-hidden
                  className="grid place-items-center shrink-0"
                  style={
                    on
                      ? { width: 22, height: 22, borderRadius: 6, background: "rgb(var(--c-seg-active))", border: "1.1px solid rgb(var(--c-seg-active))" }
                      : { width: 22, height: 22, borderRadius: 6, border: `1.1px solid ${dark ? "rgba(245,243,250,0.22)" : "rgba(36,31,27,0.22)"}` }
                  }
                >
                  {on && <Check size={13} strokeWidth={2.6} color="#FFFFFF" />}
                </span>
              </button>
            );
          })
        )}

        <SheetCaps style={{ marginTop: 16 }}>Export file</SheetCaps>
        <button
          type="button"
          onClick={() => void doExport()}
          disabled={!record.filePath || exporting}
          className="tap w-full flex items-center text-left disabled:opacity-50"
          style={{ minHeight: 52, gap: 12, borderTop: rule }}
        >
          <span aria-hidden className="grid place-items-center shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: tileFill(dark) }}>
            <Share size={18} style={{ color: deepInk(dark) }} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block" style={{ fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 600, color: INK }}>
              Export file
            </span>
            <span className="block" style={{ fontSize: textPx(11.5), lineHeight: linePx(17.3), color: INK_FAINT }}>
              {record.filePath ? "Download the file to this device" : "No file to export"}
            </span>
          </span>
          <ChevronRight size={17} style={{ color: INK_FAINT }} aria-hidden />
        </button>
        <p className="flex items-center" style={{ marginTop: 16, gap: 6, fontSize: textPx(12), lineHeight: linePx(18), color: INK_SOFT }}>
          <Lock size={13} aria-hidden /> Only the file you choose is shared.
        </p>
      </BottomSheet>
      <ConfirmPopup
        open={stopFor !== null}
        geometry="ours"
        title="Stop sharing this file?"
        body={stopFor ? `${stopFor.name} can no longer open ${record.type}, ${fmtDate(record.date)}. Copies they already saved stay with them.` : ""}
        confirmLabel="Stop sharing"
        busy={stopBusy}
        error={stopError}
        onCancel={() => setStopFor(null)}
        onConfirm={() => void doStop()}
      />
    </>
  );
};

/** "12 Aug" from a timestamp. */
const fmtShort = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]}`;
};
