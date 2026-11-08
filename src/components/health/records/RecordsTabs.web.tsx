import React, { useState } from "react";
import { Activity, Eye, FileText, MoreVertical, Pencil, ScanLine, Share2, Trash2 } from "lucide-react";
import { PopupMenu } from "../../ui/PopupMenu";
import { useWebLayout } from "../../web/useWebLayout";
import type { ImagingRecord, LabReport } from "../../../types";
import type { LabResult } from "../../../services/labs/results";
import { imagingTypeLabel } from "../imagingTypes";
import { ErrorLine, REPORT_NAME_DEFAULT, RetryCard, Skel, fileKind, fmtDate } from "./kit";
import { t, tn, tx } from "../../../i18n/core";

// Website viewport v1 · WC-HE.9.1 Labs and WC-HE.9.2 Imaging (WC-HE Records
// Web v3, the "labs" and "imaging" screens), taken from 1024px wide: the
// records as cards on a grid, 2 columns (1 at the rail), gap 24. Content,
// actions and copy are the mobile tabs' (LabsTab / ImagingTab); the swipe
// Edit / Delete become each card's ⋮ menu.

const MUTED = "#71685E";
const GOOD = "#357A4D";
const OUT = "#C2453F";

/** ⋮ 32 round, the 18 icon in #8C8378; hover #F5F5F6. */
const CardMenuButton = React.forwardRef<HTMLButtonElement, { label: string; open: boolean; onClick: (e: React.MouseEvent) => void }>(({ label, open, onClick }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    aria-label={label}
    aria-haspopup="menu"
    aria-expanded={open}
    className="shrink-0 grid place-items-center rounded-full hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
    style={{ width: 32, height: 32, marginTop: -4, marginInlineEnd: -8, background: open ? "#F5F5F6" : undefined }}
  >
    <MoreVertical size={18} style={{ color: MUTED }} aria-hidden />
  </button>
));
CardMenuButton.displayName = "CardMenuButton";

/** Empty tab: #F5F5F6 r20 pad 40 24, a 64 r16 #F0EDF9 tile with the 30 icon in #7D6BB5, title 17/24 700 (m-top 14), body 15/24 #8C8378 (max 360, m-top 4). */
const EmptyWeb: React.FC<{ icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>; title: string; body: string }> = ({ icon: Icon, title, body }) => (
  <div className="flex flex-col items-center justify-center text-center" style={{ borderRadius: 20, background: "#F5F5F6", padding: "40px 24px" }} data-web-records-empty>
    <span className="grid place-items-center" style={{ width: 64, height: 64, borderRadius: 16, background: "#F0EDF9" }} aria-hidden>
      <Icon size={30} strokeWidth={1.5} style={{ color: "#7D6BB5" }} />
    </span>
    <p style={{ margin: "14px 0 0", fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{title}</p>
    <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: "24px", color: MUTED, maxWidth: 360 }}>{body}</p>
  </div>
);

const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { rail } = useWebLayout();
  return (
    <div className="grid content-start" style={{ gridTemplateColumns: `repeat(${rail ? 1 : 2}, minmax(0, 1fr))`, gap: 24 }} data-web-records-grid>
      {children}
    </div>
  );
};

/** The report's page drawing: 150 wide, r10 #FBFAF8, 0.5px hairline, shadow 0 4 14 #241F1B@8%, pad 14; 12 lines 4 tall r3, gap 9 (the first 52% at 28%, then 84 / 84 / 62% at 10%). */
const Paper: React.FC = () => (
  <div aria-hidden className="shrink-0 flex flex-col overflow-hidden" style={{ width: 150, alignSelf: "stretch", borderRadius: 10, background: "#FBFAF8", border: "0.5px solid rgba(36,31,27,0.08)", boxShadow: "0 4px 14px rgba(36,31,27,0.08)", padding: 14, boxSizing: "border-box", gap: 9 }}>
    {Array.from({ length: 12 }, (_, i) => (
      <span key={i} className="shrink-0" style={{ height: 4, borderRadius: 3, width: `${i ? (i % 3 === 2 ? 62 : 84) : 52}%`, background: i ? "rgba(36,31,27,0.10)" : "rgba(36,31,27,0.28)" }} />
    ))}
  </div>
);

/** A card's skeleton while the tab loads. */
const CardSkeleton: React.FC<{ height: number }> = ({ height }) => (
  <div style={{ height, borderRadius: 18, border: "0.5px solid rgba(36,31,27,0.1)", padding: 18, boxSizing: "border-box" }} className="flex flex-col" aria-hidden>
    <Skel w="45%" h={14} />
    <span style={{ height: 8 }} />
    <Skel w="30%" h={11} />
  </div>
);

/**
 * WC-HE.9.1 · a report card: min 176, r18, 0.5px #241F1B@10%, pad 18, gap 18,
 * hover #FAF9FD; the paper, then the name 17/24 700, the date and file kind
 * 13/20 #8C8378, ⋮; at the foot the in / out of range chips (pad 3 10 r999 13
 * 600: #E7F2F0 / #357A4D, #FBEDEC / #C2453F; gap 6) and the result count
 * 13/20 600 #5F5093 (m-top 10). Click opens the report.
 */
export const LabsTabWeb: React.FC<{
  reports: LabReport[];
  results: LabResult[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onView: (r: LabReport) => void;
  onEdit: (r: LabReport) => void;
  onDelete: (r: LabReport) => void;
}> = ({ reports, results, loading, error, onRetry, onView, onEdit, onDelete }) => {
  const [menu, setMenu] = useState<{ r: LabReport; el: HTMLElement } | null>(null);
  if (loading && reports.length === 0)
    return (
      <Grid>
        {[0, 1].map((i) => (
          <CardSkeleton key={i} height={176} />
        ))}
      </Grid>
    );
  if (error && reports.length === 0) return <RetryCard message={t("Couldn't load your reports.")} onRetry={onRetry} />;
  if (reports.length === 0) return <EmptyWeb icon={FileText} title={t("No lab reports yet.")} body={t("Upload a report and its results appear under Biomarkers.")} />;
  return (
    <>
      <Grid>
        {reports.map((r) => {
          const mine = results.filter((x) => x.panelId === r.id);
          const inRange = mine.filter((x) => x.status === "normal").length;
          const outRange = mine.filter((x) => x.status === "low" || x.status === "high").length;
          const kindOf = fileKind(r.filePath);
          const name = r.name ?? t(REPORT_NAME_DEFAULT);
          const meta = [fmtDate(r.date), kindOf === "Photo" ? t("Photo") : kindOf].filter(Boolean).join(" · ");
          const open = menu?.r.id === r.id;
          return (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => onView(r)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && (e.preventDefault(), onView(r))}
              aria-label={`${name}, ${fmtDate(r.date)}`}
              className="min-w-0 flex cursor-pointer hover:bg-[#FAF9FD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
              style={{ minHeight: 176, borderRadius: 18, border: "0.5px solid rgba(36,31,27,0.1)", padding: 18, boxSizing: "border-box", gap: 18 }}
              data-web-lab-card
            >
              <Paper />
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-start" style={{ gap: 8 }}>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
                      {name}
                    </span>
                    <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: MUTED }}>
                      {meta}
                    </span>
                  </span>
                  <CardMenuButton label={t("More options for {name}, {date}", { name, date: fmtDate(r.date) })} open={open} onClick={(e) => setMenu({ r, el: e.currentTarget as HTMLElement })} />
                </div>
                {(inRange > 0 || outRange > 0) && (
                  <div className="flex flex-wrap" style={{ marginTop: "auto", paddingTop: 12, gap: 6 }}>
                    {inRange > 0 && (
                      <span className="whitespace-nowrap" style={{ borderRadius: 999, padding: "3px 10px", fontSize: 13, fontWeight: 600, background: "#E7F2F0", color: GOOD }}>
                        {t("{n} in range", { n: inRange })}
                      </span>
                    )}
                    {outRange > 0 && (
                      <span className="whitespace-nowrap" style={{ borderRadius: 999, padding: "3px 10px", fontSize: 13, fontWeight: 600, background: "#FBEDEC", color: OUT }}>
                        {t("{n} out of range", { n: outRange })}
                      </span>
                    )}
                  </div>
                )}
                <p style={{ margin: inRange > 0 || outRange > 0 ? "10px 0 0" : "auto 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#5F5093" }}>{tn(mine.length, "{n} result", "{n} results")}</p>
              </div>
            </div>
          );
        })}
      </Grid>
      <PopupMenu
        open={menu !== null}
        onClose={() => setMenu(null)}
        anchor={menu?.el ?? null}
        options={[
          { value: "edit", label: t("Edit"), icon: <Pencil size={16} /> },
          { value: "delete", label: t("Delete"), icon: <Trash2 size={16} />, destructive: true },
        ]}
        onSelect={(v) => {
          const r = menu?.r;
          setMenu(null);
          if (!r) return;
          if (v === "edit") onEdit(r);
          else onDelete(r);
        }}
        width={160}
        align="right"
        variant="health"
      />
    </>
  );
};

/**
 * WC-HE.9.2 · an imaging card: r18, 0.5px #241F1B@10%, clipped, hover #FAF9FD;
 * a 168 #1C1F28 panel with the 40 icon (sw 1.2, #8A8698) centred and the type
 * chip top-left at 12 (pad 3 10 r999 #FFFFFF@14%, 13 700 white); under it, pad
 * 12 16 gap 10: the type and note 17/24 700 (one line), the date and Scan /
 * Typed 13/20 #8C8378, ⋮ with View file · Share · Edit · Delete.
 */
export const ImagingTabWeb: React.FC<{
  records: ImagingRecord[];
  loading: boolean;
  error: string | null;
  writeError: string | null;
  onRetry: () => void;
  onView: (r: ImagingRecord) => void;
  onShare: (r: ImagingRecord) => void;
  onEdit: (r: ImagingRecord) => void;
  onDelete: (r: ImagingRecord) => void;
}> = ({ records, loading, error, writeError, onRetry, onView, onShare, onEdit, onDelete }) => {
  const [menu, setMenu] = useState<{ r: ImagingRecord; el: HTMLElement } | null>(null);
  const menuFor = menu?.r ?? null;
  if (loading && records.length === 0)
    return (
      <Grid>
        {[0, 1].map((i) => (
          <CardSkeleton key={i} height={236} />
        ))}
      </Grid>
    );
  if (error && records.length === 0) return <RetryCard message={t("Couldn't load your imaging.")} onRetry={onRetry} />;
  if (records.length === 0) return <EmptyWeb icon={ScanLine} title={t("No imaging yet.")} body={t("Add a scan or test result to keep it with your records.")} />;
  const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return (
    <>
      <Grid>
        {sorted.map((r) => {
          const type = imagingTypeLabel(r.type);
          const Icon = /ecg/i.test(r.type) ? Activity : ScanLine;
          const open = () => (r.filePath ? onView(r) : onEdit(r));
          return (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={open}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && (e.preventDefault(), open())}
              aria-label={`${type}, ${fmtDate(r.date)}`}
              className="min-w-0 flex flex-col overflow-hidden cursor-pointer hover:bg-[#FAF9FD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
              style={{ borderRadius: 18, border: "0.5px solid rgba(36,31,27,0.1)" }}
              data-web-imaging-card
            >
              <div className="relative shrink-0 grid place-items-center" style={{ height: 168, background: "#1C1F28" }} aria-hidden>
                <Icon size={40} strokeWidth={1.2} style={{ color: "#8A8698" }} />
                <span className="absolute whitespace-nowrap" style={{ insetInlineStart: 12, top: 12, borderRadius: 999, padding: "3px 10px", background: "rgba(255,255,255,0.14)", color: "#FFFFFF", fontSize: 13, fontWeight: 700 }}>
                  {type}
                </span>
              </div>
              <div className="shrink-0 flex items-center" style={{ gap: 10, padding: "12px 16px" }}>
                <span className="flex-1 min-w-0">
                  <span className="block truncate" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
                    {r.note ? `${type} · ${r.note}` : type}
                  </span>
                  <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: MUTED }}>
                    {fmtDate(r.date)} · {r.filePath ? tx("Scan", "imaging record") : t("Typed")}
                  </span>
                </span>
                <CardMenuButton
                  label={t("More options for {name}, {date}", { name: type, date: fmtDate(r.date) })}
                  open={menuFor?.id === r.id}
                  onClick={(e) => setMenu({ r, el: e.currentTarget as HTMLElement })}
                />
              </div>
            </div>
          );
        })}
      </Grid>
      {writeError && <ErrorLine style={{ marginTop: 8 }}>{writeError}</ErrorLine>}
      <PopupMenu
        open={menuFor !== null}
        onClose={() => setMenu(null)}
        anchor={menu?.el ?? null}
        options={[
          ...(menuFor?.filePath ? [{ value: "view", label: t("View file"), icon: <Eye size={16} /> }] : []),
          { value: "share", label: t("Share"), icon: <Share2 size={16} /> },
          { value: "edit", label: t("Edit"), icon: <Pencil size={16} /> },
          { value: "delete", label: t("Delete"), icon: <Trash2 size={16} />, destructive: true },
        ]}
        onSelect={(v) => {
          const r = menuFor;
          setMenu(null);
          if (!r) return;
          if (v === "view") onView(r);
          else if (v === "share") onShare(r);
          else if (v === "edit") onEdit(r);
          else onDelete(r);
        }}
        width={176}
        align="right"
        variant="health"
      />
    </>
  );
};
