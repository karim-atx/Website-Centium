import React, { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { getImagingShares, unshareImagingRecord, type ImagingShare } from "../../../services/imaging";
import { textPx, linePx } from "../../../theme/textSize";
import { useHealthMode, fmtDate, ListCard, RowTile, RowText, rowRule, SectionCaps, ConfirmPopup, Skel, INK_FAINT } from "./kit";
import { t } from "../../../i18n/core";
import { imagingTypeLabel } from "../imagingTypes";

/**
 * OURS-imaging-revoke #3-#4: the files shared with one professional (B2
 * imaging_shares), each with Stop sharing. Built for Profile › Connected
 * professionals › a professional (DataSharingSection); mounting it there is
 * that screen's owner's change. Rows as the Imaging list (ScanLine tile,
 * type, date) with a trailing red "Stop sharing".
 */
export const ProfessionalSharedFiles: React.FC<{ professionalId: string; name: string }> = ({ professionalId, name }) => {
  const { imagingRecords } = useApp();
  const { dark, hc } = useHealthMode();
  const [shares, setShares] = useState<ImagingShare[] | null>(null);
  const [stop, setStop] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void getImagingShares(imagingRecords.map((r) => r.id)).then((r) => {
      if (!cancelled) setShares(r.ok ? r.shares.filter((s) => s.professionalId === professionalId) : []);
    });
    return () => {
      cancelled = true;
    };
  }, [imagingRecords, professionalId, tick]);

  const files = (shares ?? []).map((s) => ({ share: s, record: imagingRecords.find((r) => r.id === s.recordId) })).filter((x) => !!x.record);
  const stopping = files.find((f) => f.share.recordId === stop)?.record;

  return (
    <section>
      <SectionCaps>{t("Shared files")}</SectionCaps>
      {shares === null ? (
        <Skel w="60%" h={12} />
      ) : files.length === 0 ? (
        <p style={{ fontSize: textPx(11), lineHeight: linePx(16), color: INK_FAINT }}>{t("No files shared with {name}.", { name })}</p>
      ) : (
        <ListCard>
          {files.map(({ share, record }, i) => (
            <div key={share.recordId} className="flex items-center" style={{ minHeight: 66, padding: "9px 14px", gap: 11, borderTop: i ? rowRule(dark, hc) : undefined }}>
              <RowTile icon={ScanLine} />
              <RowText title={imagingTypeLabel(record!.type)} meta={fmtDate(record!.date)} />
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStop(share.recordId);
                }}
                className="tap min-h-[44px] shrink-0"
                style={{ fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 700, color: dark ? "#F09A8E" : "#C0392B" }}
              >
                {t("Stop sharing")}
              </button>
            </div>
          ))}
        </ListCard>
      )}
      {done && (
        <p role="status" style={{ marginTop: 8, fontSize: textPx(12), lineHeight: linePx(18), color: INK_FAINT }}>
          {done}
        </p>
      )}
      <ConfirmPopup
        open={!!stopping}
        geometry="ours"
        title={t("Stop sharing this file?")}
        body={stopping ? t("{name} can no longer open {file}, {date}. Copies they already saved stay with them.", { name, file: imagingTypeLabel(stopping.type), date: fmtDate(stopping.date) }) : ""}
        confirmLabel={t("Stop sharing")}
        busy={busy}
        error={error}
        onCancel={() => setStop(null)}
        onConfirm={() => {
          if (!stop) return;
          setBusy(true);
          void unshareImagingRecord(stop, professionalId).then((r) => {
            setBusy(false);
            if (!r.ok) return setError(t("Couldn't save. Try again."));
            setStop(null);
            setDone(t("Stopped sharing with {name}.", { name }));
            setTick((n) => n + 1);
          });
        }}
      />
    </section>
  );
};
