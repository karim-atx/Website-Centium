import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Camera, Download, Pencil, Plus, Scissors, Search, Share2, Stethoscope, Trash2, Pill, PenLine } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useBack } from "../../hooks/useBack";
import { useOnline } from "../../hooks/useOnline";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { Toast } from "../../components/ui/Toast";
import { HealthDisclaimer } from "../../components/ui/HealthDisclaimer";
import { BiomarkerCaptureFlow, type ScanSaved } from "../../components/health/BiomarkerCaptureFlow";
import { BiomarkerDetailSheet } from "../../components/health/BiomarkerDetailSheet";
import { ShareBiomarkerSheet } from "../../components/health/ShareBiomarkerSheet";
import { ShareImagingSheet, exportStoredFile } from "../../components/health/ShareImagingSheet";
import { ImagingCaptureFlow } from "../../components/health/ImagingCaptureFlow";
import { FileViewerScreen, type ViewerMenuItem } from "../../components/health/FileViewerSheet";
import { useLabCatalogue } from "../../components/health/useLabCatalogue";
import { RecordsHeader, type HeaderMenuItem } from "../../components/health/records/RecordsHeader";
import { BiomarkersTab } from "../../components/health/records/BiomarkersTab";
import { LabsTab, LabReportEditSheet, RemoveReportPopup } from "../../components/health/records/LabsTab";
import { ImagingTab, ImagingShareNotice } from "../../components/health/records/ImagingTab";
import { HistoryTab, ConditionPopup, SurgerySheet, MedicationSheet } from "../../components/health/records/HistoryTab";
import { MarkerPage } from "../../components/health/records/MarkerPage";
import { UploadChoiceSheet } from "../../components/health/records/UploadChoiceSheet";
import { useLabResults } from "../../components/health/records/useLabResults";
import { useHealthMode, hairline, fieldFill, fmtDate, ConfirmPopup, PINNED_FILL, REPORT_NAME_DEFAULT, INK, INK_FAINT } from "../../components/health/records/kit";
import { resultKey } from "../../services/labs/results";
import { fetchLinkedProfessionals, fetchMyGrants } from "../../services/consent";
import { ShareResultSheet } from "../../components/health/ShareResultSheet";
import { getMyResultShares, getShareTargets, sharedWithLabel, sharesCovering, type ResultShare, type ShareTarget } from "../../services/result-shares";
import { localIsoDay, shortDay } from "../../services/care-plan/logic";
import type { LabResult } from "../../services/labs/results";
import { textPx, linePx } from "../../theme/textSize";
import type { BloodMarker, ImagingRecord, LabReport, Medication, Surgery } from "../../types";

// HE1.9 · Biomarkers & imaging (docs/health-b-handover.md 614-2863): one full
// page in place of the Records bottom sheet the two HE1 rows used to open.
// Route /app/health/records; the tab lives in the URL hash only (#biomarkers,
// #labs, #imaging, #history; no data in the URL). Fixed header + tabs (+ the
// marker search on Biomarkers), the tab's list, the disclaimer, and the
// tab's pinned CTA 96 above the navbar on fill.pinned (#9A8CD6, V6-01).
//
// What the frames name but do not draw is ours (OURS-* checklists): the ⋮
// menus, the upload choice, the empty states, the history forms, the
// report edit and the marker picker. Backend stages not landed (B2: report
// name, file metadata, upload progress, per-file grants; B4: medication
// reminder sweep) show their pending states in place.

type Tab = "biomarkers" | "labs" | "imaging" | "history";
const TABS: { key: Tab; label: string }[] = [
  { key: "biomarkers", label: "Biomarkers" },
  { key: "labs", label: "Labs" },
  { key: "imaging", label: "Imaging" },
  { key: "history", label: "History" },
];
const tabFromHash = (hash: string): Tab => {
  const h = hash.replace(/^#/, "");
  return (TABS.find((t) => t.key === h)?.key ?? "biomarkers") as Tab;
};

/** "12 Aug 2026 · PDF, 4 pages" (pages from B2 file_pages when known). */
const fileSubtitle = (f: { date: string; filePath?: string | null; filePages?: number | null }) => {
  const pdf = !!f.filePath?.toLowerCase().endsWith(".pdf");
  const pages = pdf && f.filePages ? `, ${f.filePages} page${f.filePages === 1 ? "" : "s"}` : "";
  return `${fmtDate(f.date)} · ${pdf ? "PDF" : "Photo"}${pages}`;
};

type Viewing =
  | { kind: "report"; report: LabReport }
  | { kind: "imaging"; record: ImagingRecord };

export default function HealthRecords() {
  const {
    authUserId,
    bloodMarkers,
    labReports,
    imagingRecords,
    removeImagingRecord,
    labsError,
    imagingError,
    medicalError,
    reloadHealthRecords,
    noteFeatureMilestone,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const back = useBack();
  const online = useOnline();
  const { dark, hc } = useHealthMode();
  const lab = useLabCatalogue();
  const labResults = useLabResults();
  const tab = tabFromHash(location.hash);
  const setTab = (t: Tab) => navigate({ hash: t }, { replace: true });

  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    noteFeatureMilestone("health_records");
    void reloadHealthRecords().then(() => setFresh(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [popupKey, setPopupKey] = useState<string | null>(null);
  const [markerKey, setMarkerKey] = useState<string | null>(null);
  const [scan, setScan] = useState<{ file: File | null } | null>(null);
  const [choice, setChoice] = useState<"report" | "imaging" | null>(null);
  const [imagingForm, setImagingForm] = useState<{ record: ImagingRecord | null; file: File | null } | null>(null);
  const [shareImaging, setShareImaging] = useState<ImagingRecord | null>(null);
  const [deleteImaging, setDeleteImaging] = useState<ImagingRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [editReport, setEditReport] = useState<LabReport | null>(null);
  const [removeReport, setRemoveReport] = useState<LabReport | null>(null);
  const [shareMarkers, setShareMarkers] = useState<{ marker: BloodMarker | null } | null>(null);
  const [historyMenu, setHistoryMenu] = useState<HTMLElement | null>(null);
  const [conditionOpen, setConditionOpen] = useState(false);
  const [surgeryForm, setSurgeryForm] = useState<{ surgery: Surgery | null } | null>(null);
  const [medForm, setMedForm] = useState<{ medication: Medication | null } | null>(null);
  const [confirmation, setConfirmation] = useState<{ count: number; name: string } | null>(null);
  const [highlight, setHighlight] = useState<Set<string>>(new Set());

  // HE1.9.2.3: the confirmation line stays until the page scrolls; the new
  // rows are highlighted for 2 s.
  useEffect(() => {
    if (!confirmation) return;
    const start = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - start) > 8) setConfirmation(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [confirmation]);
  useEffect(() => {
    if (!highlight.size) return;
    const id = window.setTimeout(() => setHighlight(new Set()), 2000);
    return () => window.clearTimeout(id);
  }, [highlight]);

  // Sharing line (HE1.9 #14): who holds lab_results, read from the grants.
  const [sharingNames, setSharingNames] = useState<string[] | null>(null);
  // Release 3 (CU17-CU21): the connected professionals with their role line,
  // the client's single-result shares, and who can see records at all.
  const [shareTargets, setShareTargets] = useState<ShareTarget[]>([]);
  const [resultShares, setResultShares] = useState<ResultShare[]>([]);
  const [recordsGrantees, setRecordsGrantees] = useState<Set<string>>(new Set());
  const [sharesTick, setSharesTick] = useState(0);
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void Promise.all([fetchLinkedProfessionals(), fetchMyGrants(authUserId)]).then(([linked, grants]) => {
      if (cancelled) return;
      if (linked.status !== "ok" || grants.status !== "ok") return setSharingNames(null);
      setSharingNames(linked.professionals.filter((p) => grants.grants[p.professionalId]?.lab_results).map((p) => p.name));
      setRecordsGrantees(
        new Set(
          linked.professionals
            .filter((p) => grants.grants[p.professionalId]?.lab_results || grants.grants[p.professionalId]?.medical_history)
            .map((p) => p.professionalId)
        )
      );
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void Promise.all([getShareTargets(), getMyResultShares()]).then(([tg, sh]) => {
      if (cancelled) return;
      if (tg.ok) setShareTargets(tg.targets);
      if (sh.ok) setResultShares(sh.shares);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, sharesTick]);
  // CU17: who can see these records (Lab results or Medical history on, or a
  // result shared one at a time). Nobody: no banner, as before.
  const recordsShared = (() => {
    const ids = new Set([...recordsGrantees, ...resultShares.map((s) => s.professionalId)]);
    const people = shareTargets.filter((p) => ids.has(p.professionalId));
    const label = sharedWithLabel(people);
    return label ? { label, onManage: () => navigate("/app/profile") } : null;
  })();
  const [shareResultFor, setShareResultFor] = useState<LabResult | null>(null);
  const panelCountOf = (r: LabResult | null) => (r?.panelId ? labResults.results.filter((x) => x.panelId === r.panelId).length : 0);
  /** CU18: "Shared with {line} since {date}" for a marker's latest result. */
  const sharedLineFor = (latest: LabResult | undefined): string | null => {
    if (!latest) return null;
    const s = sharesCovering(resultShares, { resultId: latest.id, panelId: latest.panelId })
      .slice()
      .sort((a, b) => a.sharedAt.localeCompare(b.sharedAt))[0];
    const p = s && shareTargets.find((x) => x.professionalId === s.professionalId);
    return s && p ? `Shared with ${p.line} since ${shortDay(localIsoDay(s.sharedAt))}` : null;
  };

  const resultsByKey = useMemo(() => {
    const map = new Map<string, typeof labResults.results>();
    for (const r of labResults.results) map.set(resultKey(r), [...(map.get(resultKey(r)) ?? []), r]);
    return map;
  }, [labResults.results]);
  const latestOf = (key: string | null) => {
    const list = key ? resultsByKey.get(key) : undefined;
    return list?.[list.length - 1];
  };
  // Release 3 CU18: only offered when someone is connected (Health looks as before otherwise).
  const canShareWithPro = shareTargets.length > 0;
  const latestDate = useMemo(
    () => bloodMarkers.reduce<string | null>((a, m) => m.history.reduce<string | null>((b, h) => (!b || h.date > b ? h.date : b), a), null),
    [bloodMarkers]
  );
  const markerFor = (key: string | null) => (key ? bloodMarkers.find((m) => resultKey(m) === key) ?? null : null);
  const matches = useCallback(
    (m: BloodMarker, q: string) => {
      const lq = q.toLowerCase();
      if (m.name.toLowerCase().includes(lq)) return true;
      const e = lab.entryFor(m);
      return !!e && (e.displayName.toLowerCase().includes(lq) || e.aliases.some((a) => a.includes(lq)));
    },
    [lab]
  );

  const refresh = () => {
    void reloadHealthRecords();
    labResults.retry();
  };

  // ⋮ menus (OURS-biomarkers-menu).
  const exportAll = async () => {
    const files = imagingRecords.filter((r) => r.filePath);
    let failed = false;
    for (const r of files) if (!(await exportStoredFile("medical-imaging", r.filePath!)).ok) failed = true;
    if (failed) setToast("Couldn't share. Try again.");
  };
  const menu: HeaderMenuItem[] | undefined =
    tab === "biomarkers" || tab === "labs"
      ? [
          { key: "share", label: "Share all", icon: <Share2 size={15} />, onSelect: () => setShareMarkers({ marker: null }) },
          { key: "manual", label: "Add manually", icon: <PenLine size={15} />, onSelect: () => setScan({ file: null }) },
        ]
      : tab === "imaging" && imagingRecords.some((r) => r.filePath)
        ? [{ key: "export", label: "Export all", icon: <Download size={15} />, onSelect: () => void exportAll() }]
        : undefined;

  const marker = markerFor(markerKey);
  const popupMarker = markerFor(popupKey);

  const viewerMenu: ViewerMenuItem[] | undefined = !viewing
    ? undefined
    : viewing.kind === "imaging"
      ? [
          { key: "share", label: "Share", icon: <Share2 size={15} />, onSelect: () => { const r = viewing.record; setViewing(null); setShareImaging(r); } },
          { key: "edit", label: "Edit", icon: <Pencil size={15} />, onSelect: () => { const r = viewing.record; setViewing(null); setImagingForm({ record: r, file: null }); } },
          { key: "delete", label: "Delete", icon: <Trash2 size={15} />, destructive: true, onSelect: () => { const r = viewing.record; setViewing(null); setDeleteImaging(r); } },
        ]
      : [
          { key: "edit", label: "Edit", icon: <Pencil size={15} />, onSelect: () => { const r = viewing.report; setViewing(null); setEditReport(r); } },
          { key: "delete", label: "Delete", icon: <Trash2 size={15} />, destructive: true, onSelect: () => { const r = viewing.report; setViewing(null); setRemoveReport(r); } },
        ];

  const cta =
    tab === "biomarkers"
      ? { label: "Scan a report", icon: <Camera size={16} />, onClick: () => setChoice("report") }
      : tab === "labs"
        ? { label: "Upload a report", icon: <Camera size={16} />, onClick: () => setChoice("report") }
        : tab === "imaging"
          ? { label: "Add imaging", icon: <Camera size={16} />, onClick: () => setChoice("imaging") }
          : { label: "Add to history", icon: <Plus size={16} />, onClick: (e: React.MouseEvent<HTMLButtonElement>) => setHistoryMenu(e.currentTarget) };

  const scanSaved = (s: ScanSaved) => {
    setConfirmation({ count: s.count, name: s.name });
    setHighlight(new Set(s.keys));
    if (tab !== "biomarkers") setTab("biomarkers");
    window.scrollTo({ top: 0 });
  };

  const overlays = (
    <>
      <BiomarkerDetailSheet
        open={!!popupMarker}
        onClose={() => setPopupKey(null)}
        marker={popupMarker}
        results={popupKey ? resultsByKey.get(popupKey) : undefined}
        onViewHistory={() => {
          setMarkerKey(popupKey);
          setPopupKey(null);
          window.scrollTo({ top: 0 });
        }}
        onShareWithProfessional={
          canShareWithPro
            ? () => {
                const latest = latestOf(popupKey);
                setPopupKey(null);
                if (latest) setShareResultFor(latest);
              }
            : undefined
        }
        sharedLine={sharedLineFor(latestOf(popupKey))}
      />
      <ShareResultSheet
        open={!!shareResultFor}
        onClose={() => setShareResultFor(null)}
        result={shareResultFor}
        panelCount={panelCountOf(shareResultFor)}
        onToast={setToast}
        onChanged={() => setSharesTick((x) => x + 1)}
      />
      <ShareBiomarkerSheet open={!!shareMarkers} onClose={() => setShareMarkers(null)} marker={shareMarkers?.marker ?? null} markers={shareMarkers?.marker ? undefined : bloodMarkers} />
      <BiomarkerCaptureFlow open={!!scan} file={scan?.file ?? null} onClose={() => setScan(null)} onSaved={scanSaved} />
      <UploadChoiceSheet
        open={choice !== null}
        onClose={() => setChoice(null)}
        title={choice === "imaging" ? "Add imaging" : "Add a report"}
        bucket={choice === "imaging" ? "medical-imaging" : "lab-reports"}
        onFile={(file) => {
          const c = choice;
          setChoice(null);
          if (c === "imaging") setImagingForm({ record: null, file });
          else setScan({ file });
        }}
        onTypeIt={() => {
          const c = choice;
          setChoice(null);
          if (c === "imaging") setImagingForm({ record: null, file: null });
          else setScan({ file: null });
        }}
      />
      <ImagingCaptureFlow open={!!imagingForm} onClose={() => setImagingForm(null)} record={imagingForm?.record ?? null} file={imagingForm?.file ?? null} onSaved={setToast} />
      <ShareImagingSheet open={!!shareImaging} onClose={() => setShareImaging(null)} record={shareImaging} onToast={setToast} />
      <ConfirmPopup
        open={!!deleteImaging}
        title="Delete this record?"
        body={
          deleteImaging
            ? deleteImaging.filePath
              ? `${deleteImaging.type}, ${fmtDate(deleteImaging.date)}. The attached file is removed too. This can't be undone.`
              : `${deleteImaging.type}, ${fmtDate(deleteImaging.date)}. This can't be undone.`
            : ""
        }
        confirmLabel="Delete"
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => {
          setDeleteImaging(null);
          setDeleteError(null);
        }}
        onConfirm={() => {
          const r = deleteImaging;
          if (!r) return;
          if (!online) return setDeleteError("You're offline. Try again when you're connected.");
          setDeleteBusy(true);
          setDeleteError(null);
          void removeImagingRecord(r.id).then((res) => {
            setDeleteBusy(false);
            if (!res.ok) return setDeleteError("Couldn't delete. Try again.");
            setDeleteImaging(null);
            setToast("Record deleted.");
          });
        }}
      />
      <FileViewerScreen
        open={!!viewing}
        onClose={() => setViewing(null)}
        path={viewing?.kind === "imaging" ? viewing.record.filePath : viewing?.report.filePath}
        bucket={viewing?.kind === "report" ? "lab-reports" : "medical-imaging"}
        title={
          viewing?.kind === "imaging"
            ? viewing.record.note
              ? `${viewing.record.type} · ${viewing.record.note}`
              : viewing.record.type
            : viewing?.report.name ?? REPORT_NAME_DEFAULT
        }
        subtitle={
          viewing
            ? fileSubtitle(viewing.kind === "imaging" ? viewing.record : viewing.report)
            : undefined
        }
        menu={viewerMenu}
      />
      <LabReportEditSheet report={editReport} onClose={() => setEditReport(null)} onSaved={setToast} />
      <RemoveReportPopup report={removeReport} onClose={() => setRemoveReport(null)} onRemoved={() => setToast("Lab report removed.")} />
      <PopupMenu
        open={!!historyMenu}
        onClose={() => setHistoryMenu(null)}
        anchor={historyMenu}
        options={[
          { value: "condition", label: "Condition", icon: <Stethoscope size={15} /> },
          { value: "surgery", label: "Surgery", icon: <Scissors size={15} /> },
          { value: "medication", label: "Medication", icon: <Pill size={15} /> },
        ]}
        onSelect={(v) => {
          if (v === "condition") setConditionOpen(true);
          else if (v === "surgery") setSurgeryForm({ surgery: null });
          else setMedForm({ medication: null });
        }}
        width={155}
        align="left"
        hairline
        rowLineHeight={18}
      />
      <ConditionPopup open={conditionOpen} onClose={() => setConditionOpen(false)} onSaved={setToast} />
      <SurgerySheet open={!!surgeryForm} surgery={surgeryForm?.surgery ?? null} onClose={() => setSurgeryForm(null)} onSaved={setToast} />
      <MedicationSheet open={!!medForm} medication={medForm?.medication ?? null} onClose={() => setMedForm(null)} onSaved={setToast} />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </>
  );

  if (marker && markerKey) {
    return (
      <>
        <MarkerPage
          marker={marker}
          results={resultsByKey.get(markerKey) ?? []}
          allResults={labResults.results}
          catalogue={lab.catalogue}
          isThreshold={lab.isThreshold(marker)}
          remark={lab.remarkFor(marker)}
          onBack={() => setMarkerKey(null)}
          onShare={() => setShareMarkers({ marker })}
          onToast={setToast}
          onShareWithProfessional={
            canShareWithPro
              ? () => {
                  const latest = latestOf(markerKey);
                  if (latest) setShareResultFor(latest);
                }
              : undefined
          }
        />
        {overlays}
      </>
    );
  }

  const showSearch = tab === "biomarkers" && bloodMarkers.length > 0;

  return (
    <div style={{ paddingBottom: 176 }}>
      <RecordsHeader title="Biomarkers & imaging" onBack={back} menu={menu} shared={recordsShared}>
        <SegmentedTabs
          className="mt-3"
          items={TABS}
          activeKey={tab}
          onChange={(k) => setTab(k as Tab)}
          size="compact"
          darkTone="partB"
          idleInk="rgb(var(--c-charcoal-soft))"
        />
        {showSearch && (
          <label
            className="flex items-center"
            style={{ marginTop: 10, height: 42, borderRadius: 12, padding: "0 12px", gap: 8, background: fieldFill(dark), border: `0.5px solid ${hairline(dark, hc, 0.06)}` }}
          >
            <Search size={16} style={{ color: INK_FAINT }} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search markers"
              aria-label="Search markers"
              className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-charcoal-faint"
              style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3), color: INK }}
            />
          </label>
        )}
      </RecordsHeader>

      {tab === "biomarkers" && (
        <BiomarkersTab
          markers={bloodMarkers}
          query={query}
          latestDate={latestDate}
          loading={labResults.loading && !fresh}
          error={labsError ?? labResults.error}
          onRetry={refresh}
          isThreshold={lab.isThreshold}
          remarkFor={lab.remarkFor}
          matches={matches}
          sharing={{ names: sharingNames, singleShares: resultShares.length }}
          onChangeSharing={() => navigate("/app/profile")}
          onOpen={(m) => setPopupKey(resultKey(m))}
          confirmation={confirmation}
          highlight={highlight}
        />
      )}
      {tab === "labs" && (
        <LabsTab
          reports={labReports}
          results={labResults.results}
          loading={labResults.loading && !fresh}
          error={labsError}
          onRetry={refresh}
          onView={(report) => setViewing({ kind: "report", report })}
          onEdit={setEditReport}
          onDelete={setRemoveReport}
        />
      )}
      {tab === "imaging" && <ImagingShareNotice userId={authUserId} hasImaging={imagingRecords.length > 0} />}
      {tab === "imaging" && (
        <ImagingTab
          records={imagingRecords}
          loading={!fresh}
          error={imagingError}
          writeError={null}
          onRetry={refresh}
          onView={(record) => setViewing({ kind: "imaging", record })}
          onShare={setShareImaging}
          onEdit={(record) => setImagingForm({ record, file: null })}
          onDelete={setDeleteImaging}
        />
      )}
      {tab === "history" && (
        <HistoryTab
          loading={!fresh}
          error={medicalError}
          onRetry={refresh}
          onAddCondition={() => setConditionOpen(true)}
          onEditSurgery={(surgery) => setSurgeryForm({ surgery })}
          onEditMedication={(medication) => setMedForm({ medication })}
        />
      )}

      <HealthDisclaimer className="mt-[18px]" />

      <PinnedCta primary={{ label: cta.label, icon: cta.icon, onClick: cta.onClick, style: PINNED_FILL }} />
      {overlays}
    </div>
  );
}

