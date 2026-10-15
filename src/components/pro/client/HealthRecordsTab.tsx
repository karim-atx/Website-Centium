import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Info, Lock, Send, ShieldCheck } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { useApp } from "../../../context/AppContext";
import { textPx } from "../../../theme/textSize";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { CtaButton } from "../../ui/PinnedCta";
import { FileViewerScreen } from "../../health/FileViewerSheet";
import { useLabCatalogue } from "../../health/useLabCatalogue";
import { BiomarkersTab } from "../../health/records/BiomarkersTab";
import { LabsTab } from "../../health/records/LabsTab";
import { ImagingTab } from "../../health/records/ImagingTab";
import { HistoryTab } from "../../health/records/HistoryTab";
import { REPORT_NAME_DEFAULT } from "../../health/records/kit";
import { HealthDataPending } from "../../professionals/HealthDataPending";
import { INK } from "../proInk";
import { BiomarkerChart } from "./BiomarkerChart";
import type { ClientPageData } from "./useClientPage";
import { getBloodMarkers } from "../../../services/labs";
import { getLabResults, type LabResult } from "../../../services/labs/results";
import { fetchClientImaging, fetchClientMedicalHistory } from "../../../services/professional-client";
import { fetchBiomarkerFlags, fetchSharedResults, type BiomarkerFlag, type SharedResult } from "../../../services/pro/clientPage";
import { formatRange } from "../../../services/labs";
import type { AccessCategory } from "../../../services/pro/access";
import type { BloodMarker, ImagingRecord, LabReport, Medication, Surgery } from "../../../types";

/**
 * Release 3 · CL2 v4 Tab 3 Health records (Clinical overview; source
 * gen/r8.js recordsBody8 and sharedBar8), mirroring the client's v6 Health ›
 * Records (pages/health/HealthRecords.tsx) read only: the same four tabs
 * (Biomarkers, Labs, Imaging, History; HANDOVER f "must align with the new
 * client Health design" — the frame's separate Medications tab is inside
 * History there) through the v6 components' optional professional props.
 *
 * - "Shared by {name}": soft r16, pad 10 12; caps 11 / 700 0.08em; chips 24
 *   high, pad 0 8, r8, 11 / 700, teal pale with the shield when shared, card
 *   with the lock when not; "Read only. You see records from the moment
 *   {name} turns sharing on, and lose access as soon as it's turned off."
 * - Gates per category (useClientAccess): Lab results opens Biomarkers and
 *   Labs; a single result the client shared (result_shares, Karim's answer
 *   3) shows under Biomarkers even with the switch off, and a shared panel's
 *   report under Labs; Imaging shows only the records the client shared one
 *   by one (imaging_shares, decision 6) and opens them in the file viewer;
 *   History needs Medical history. Locked: the frame's centred card (lock
 *   tile 44 r14, 14 / 700 title, 12 text.soft body, "Ask {name} to share").
 * - Panels (lab_marker_category) filter the markers; a marker opens the CL8
 *   BiomarkerChart with client_biomarker_flags.
 * - Nothing shared at all: HealthDataPending (HANDOVER m).
 */

type Sub = "biomarkers" | "labs" | "imaging" | "history";

const PANEL_LABEL: Record<string, string> = {
  blood_count: "Blood count",
  lipids: "Lipids",
  liver: "Liver",
  kidney: "Kidney",
  hormones: "Hormones",
  metabolic: "Metabolic",
  vitamins_minerals: "Vitamins and minerals",
  thyroid: "Thyroid",
  other: "Other",
};

function sharedToMarker(s: SharedResult): BloodMarker {
  return {
    id: s.markerId ?? s.shareId,
    name: s.name,
    value: s.value ?? 0,
    unit: s.unit,
    range: formatRange(s.rangeLow, s.rangeHigh),
    status: s.status,
    history: [{ date: s.date, value: s.value ?? 0 }],
    markerKey: null,
    rangeLow: s.rangeLow,
    rangeHigh: s.rangeHigh,
    previous: null,
  };
}

export const HealthRecordsTab: React.FC<{
  data: ClientPageData;
  onAsk: (c: AccessCategory) => void;
  asked: AccessCategory[];
  onNote: () => void;
  onCarePlan: () => void;
}> = ({ data, onAsk, asked, onNote, onCarePlan }) => {
  const dark = useIsDark();
  const { authUserId } = useApp();
  const { access, clientId, firstName } = data;
  const lab = useLabCatalogue();
  const [sub, setSub] = useState<Sub>("biomarkers");
  const labsOn = access.has("lab_results");
  const sharedCount = access.access?.resultSharedCount ?? 0;
  const labsVisible = labsOn || sharedCount > 0;
  const historyOn = access.has("medical_history");
  const imagingCount = access.access?.imagingSharedCount ?? 0;

  const [labs, setLabs] = useState<{ markers: BloodMarker[]; results: LabResult[]; reports: LabReport[]; shared: SharedResult[]; error: string | null } | null>(null);
  const [flags, setFlags] = useState<BiomarkerFlag[]>([]);
  const [imaging, setImaging] = useState<{ list: ImagingRecord[]; error: string | null } | null>(null);
  const [history, setHistory] = useState<{ comorbidities: string[]; surgeries: Surgery[]; medications: Medication[]; error: string | null } | null>(null);
  const [nonce, setNonce] = useState(0);
  const [panel, setPanel] = useState<string | null>(null);
  const [open, setOpen] = useState<BloodMarker | null>(null);
  const [viewing, setViewing] = useState<{ bucket: "lab-reports" | "medical-imaging"; path: string; title: string } | null>(null);
  const retry = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!labsVisible) return;
    let live = true;
    void (async () => {
      const [markers, results, shared, f] = await Promise.all([getBloodMarkers(clientId), getLabResults(clientId), sharedCount > 0 ? fetchSharedResults(authUserId ?? "", clientId) : Promise.resolve(null), fetchBiomarkerFlags(clientId)]);
      if (!live) return;
      const sharedList = shared && shared.ok ? shared.data : [];
      const base = markers.ok ? markers.markers : [];
      const ids = new Set(base.map((m) => m.id));
      const merged = [...base, ...sharedList.filter((s) => s.markerId && !ids.has(s.markerId)).map(sharedToMarker)];
      setLabs({
        markers: merged,
        results: results.ok ? results.results : [],
        reports: results.ok ? results.panels.filter((p) => !!p.filePath).map((p) => ({ id: p.id, date: p.date, filePath: p.filePath as string, name: p.name, fileName: p.fileName, fileType: p.fileType, filePages: p.filePages, fileBytes: p.fileBytes })).reverse() : [],
        shared: sharedList,
        error: !markers.ok && !merged.length ? "Couldn't load the results." : null,
      });
      setFlags(f.ok ? f.data : []);
    })();
    return () => {
      live = false;
    };
  }, [clientId, labsVisible, sharedCount, nonce, authUserId]);

  useEffect(() => {
    if (!historyOn) return;
    let live = true;
    void fetchClientImaging([clientId]).then((r) => live && setImaging(r.ok ? { list: r.byClient[clientId] ?? [], error: null } : { list: [], error: r.message }));
    void fetchClientMedicalHistory([clientId]).then((r) => {
      if (!live) return;
      const h = r.ok ? r.byClient[clientId] : null;
      setHistory({
        comorbidities: h?.comorbidities ?? [],
        surgeries: (h?.surgeries ?? []).map((s) => ({ id: s.id, name: s.name, date: s.date })) as Surgery[],
        medications: (h?.medications ?? []) as Medication[],
        error: r.ok ? null : r.message,
      });
    });
    return () => {
      live = false;
    };
  }, [clientId, historyOn, nonce]);

  const entryOf = (m: BloodMarker) => (m.markerKey && lab.catalogue ? lab.catalogue.find((c) => c.key === m.markerKey) ?? null : null);
  const panels = useMemo(() => {
    const m = new Map<string, number>();
    for (const mk of labs?.markers ?? []) {
      const c = entryOf(mk)?.category ?? "other";
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => (PANEL_LABEL[a[0]] ?? a[0]).localeCompare(PANEL_LABEL[b[0]] ?? b[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labs, lab.catalogue]);
  const shownMarkers = (labs?.markers ?? []).filter((m) => !panel || (entryOf(m)?.category ?? "other") === panel);
  const latestDate = (labs?.markers ?? []).reduce<string | null>((a, m) => m.history.reduce<string | null>((b, h) => (!b || h.date > b ? h.date : b), a), null);
  const flagFor = (m: BloodMarker) => flags.find((f) => (m.markerKey && f.markerKey === m.markerKey) || f.name.toLowerCase() === m.name.toLowerCase()) ?? null;

  const nothing = !access.loading && !labsVisible && !historyOn && imagingCount === 0;
  const onInk = dark ? "#B2D4CF" : "#3C6B65";
  const chips: { label: string; on: boolean }[] = [
    { label: "Lab results", on: labsOn },
    { label: "Medical history", on: historyOn },
    { label: imagingCount ? `Imaging, ${imagingCount} shared` : "Imaging", on: imagingCount > 0 },
    { label: "Blood pressure", on: access.has("blood_pressure") },
    { label: "Activity & vitals", on: access.has("health_metrics") },
    { label: "Body measurements", on: access.has("body_measurements") },
  ];

  const locked = (kind: "labs" | "history") => (
    <div className="text-center" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "18px 16px", marginBottom: 12 }}>
      <span className="inline-flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 14, background: INK.soft }}>
        <Lock size={20} strokeWidth={1.75} aria-hidden style={{ color: INK.chF }} />
      </span>
      <p style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch, marginTop: 10 }}>{kind === "labs" ? "Lab results aren't shared" : "Medical history isn't shared"}</p>
      <p style={{ fontSize: textPx(12), color: INK.chS, marginTop: 4, lineHeight: 1.5 }}>
        {kind === "labs"
          ? `Blood panels, markers and lab report documents stay private until ${firstName} turns on Lab results for you.`
          : `Medications, surgeries, conditions and imaging stay private until ${firstName} turns on Medical history for you.`}
      </p>
      <div className="flex justify-center" style={{ marginTop: 12 }}>
        {(() => {
          const c: AccessCategory = kind === "labs" ? "lab_results" : "medical_history";
          const done = asked.includes(c);
          return <CtaButton size="base" variant="secondary" icon={<Send size={15} />} label={done ? "Asked" : `Ask ${firstName} to share`} disabled={done} onClick={() => onAsk(c)} />;
        })()}
      </div>
    </div>
  );

  if (nothing) return <HealthDataPending label="Health records" />;

  return (
    <>
      <div style={{ borderRadius: 16, background: INK.soft, padding: "10px 12px", marginBottom: 12 }}>
        <p style={{ fontSize: textPx(11), fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: INK.chF, marginBottom: 6 }}>{`Shared by ${firstName}`}</p>
        <div className="flex flex-wrap" style={{ gap: 5 }}>
          {chips.map((s) => (
            <span key={s.label} className="inline-flex items-center whitespace-nowrap" style={{ gap: 4, height: 24, padding: "0 8px", borderRadius: 8, fontSize: textPx(11), fontWeight: 700, background: s.on ? INK.tealPale : INK.card, color: s.on ? onInk : INK.chF }}>
              {s.on ? <ShieldCheck size={11} strokeWidth={2.2} aria-hidden /> : <Lock size={11} strokeWidth={2.2} aria-hidden />}
              {s.label}
              <span className="sr-only">{s.on ? ", shared" : ", not shared"}</span>
            </span>
          ))}
        </div>
        <p style={{ fontSize: textPx(11), color: INK.chF, marginTop: 6, lineHeight: 1.45 }}>{`Read only. You see records from the moment ${firstName} turns sharing on, and lose access as soon as it's turned off.`}</p>
      </div>

      <SegmentedTabs
        className="mb-3"
        items={[
          { key: "biomarkers", label: "Biomarkers" },
          { key: "labs", label: "Labs" },
          { key: "imaging", label: "Imaging" },
          { key: "history", label: "History" },
        ]}
        activeKey={sub}
        onChange={(k) => setSub(k as Sub)}
        tabHeight={36}
        labelSize={12}
      />

      {sub === "biomarkers" &&
        (!labsVisible ? (
          locked("labs")
        ) : (
          <>
            {!labsOn && (
              <div className="flex items-start" style={{ gap: 8, borderRadius: 14, background: INK.soft, padding: "10px 12px", marginBottom: 12 }}>
                <Info size={13} strokeWidth={2} aria-hidden style={{ color: INK.chF, flexShrink: 0, marginTop: 3 }} />
                <p style={{ fontSize: textPx(11.5), lineHeight: 1.5, color: INK.chS }}>{`Lab results aren't shared. ${firstName} shared ${sharedCount === 1 ? "this result" : "these results"} with you one at a time, and can stop at any time.`}</p>
              </div>
            )}
            {panels.length > 1 && (
              <div className="flex flex-wrap" style={{ gap: 6, marginBottom: 10 }} role="group" aria-label="Panels">
                {[["", labs?.markers.length ?? 0] as [string, number], ...panels].map(([key, n]) => {
                  const on = (panel ?? "") === key;
                  return (
                    <button
                      key={key || "all"}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setPanel(key || null)}
                      className="tap whitespace-nowrap relative before:absolute before:inset-x-0 before:-inset-y-[7px] before:content-['']"
                      style={{ borderRadius: 10, padding: "6px 12px", fontSize: textPx(12), border: `1px solid ${on ? INK.fill : "rgb(var(--c-charcoal) / 0.11)"}`, background: on ? INK.fill : INK.card, color: on ? INK.onFill : INK.chS, fontWeight: on ? 700 : 600 }}
                    >
                      {`${key ? PANEL_LABEL[key] ?? key : "All panels"} ${n}`}
                    </button>
                  );
                })}
              </div>
            )}
            <BiomarkersTab
              markers={shownMarkers}
              query=""
              latestDate={latestDate}
              loading={!labs}
              error={labs?.error ?? null}
              onRetry={retry}
              isThreshold={lab.isThreshold}
              remarkFor={lab.remarkFor}
              matches={() => true}
              sharing={{ names: null }}
              onChangeSharing={() => undefined}
              onOpen={setOpen}
              confirmation={null}
              highlight={new Set()}
              professional={{ emptyTitle: "No results shared yet.", emptyBody: `Results ${firstName} shares appear here.` }}
            />
          </>
        ))}

      {sub === "labs" &&
        (!labsVisible ? (
          locked("labs")
        ) : (
          <LabsTab
            reports={labs?.reports ?? []}
            results={labs?.results ?? []}
            loading={!labs}
            error={labs?.error ?? null}
            onRetry={retry}
            onView={(r) => setViewing({ bucket: "lab-reports", path: r.filePath, title: r.name ?? REPORT_NAME_DEFAULT })}
            onEdit={() => undefined}
            onDelete={() => undefined}
            readOnly={{
              emptyTitle: "No lab reports shared.",
              emptyBody: labsOn ? `Reports ${firstName} uploads appear here.` : `A single result never opens its report. ${firstName} can share a whole report or turn on Lab results.`,
            }}
          />
        ))}

      {sub === "imaging" &&
        (!historyOn ? (
          locked("history")
        ) : (
          <ImagingTab
            records={imaging?.list ?? []}
            loading={!imaging}
            error={imaging?.error ?? null}
            writeError={null}
            onRetry={retry}
            onView={(r) => r.filePath && setViewing({ bucket: "medical-imaging", path: r.filePath, title: r.note ? `${r.type} · ${r.note}` : r.type })}
            onShare={() => undefined}
            onEdit={() => undefined}
            onDelete={() => undefined}
            readOnly={{ emptyTitle: "No scans shared yet.", emptyBody: `${firstName} shares each scan from their own Imaging tab.` }}
          />
        ))}

      {sub === "history" &&
        (!historyOn ? (
          locked("history")
        ) : (
          <HistoryTab
            loading={!history}
            error={history?.error ?? null}
            onRetry={retry}
            onAddCondition={() => undefined}
            onEditSurgery={() => undefined}
            onEditMedication={() => undefined}
            records={history ?? { comorbidities: [], surgeries: [], medications: [] }}
          />
        ))}

      <BiomarkerChart
        open={!!open}
        onClose={() => setOpen(null)}
        marker={open}
        flag={open ? flagFor(open) : null}
        panel={open ? PANEL_LABEL[entryOf(open)?.category ?? ""] ?? null : null}
        sharedNote={open ? labs?.shared.find((s) => s.markerId === open.id)?.note ?? null : null}
        firstName={firstName}
        onNote={() => {
          setOpen(null);
          onNote();
        }}
        onCarePlan={() => {
          setOpen(null);
          onCarePlan();
        }}
      />
      <FileViewerScreen open={!!viewing} onClose={() => setViewing(null)} path={viewing?.path ?? null} bucket={viewing?.bucket ?? "medical-imaging"} title={viewing?.title ?? ""} />
    </>
  );
};
