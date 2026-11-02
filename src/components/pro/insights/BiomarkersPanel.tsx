import React, { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight, ClipboardPlus, FileText, FlaskConical, Info, Layers, MessageCircle, Plus, Send, X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { isRtl, t, tk, tn, tx } from "../../../i18n/core";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { PopupMenu } from "../../ui/PopupMenu";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { FileViewerScreen } from "../../health/FileViewerSheet";
import { useLabCatalogue } from "../../health/useLabCatalogue";
import { INK } from "../proInk";
import { signedNum } from "../proRules";
import { ProChart, type ProChartSeries } from "../ProChart";
import { EmptyState } from "../EmptyState";
import { OfflineLine } from "../states";
import { Chip, ListCard, RoundBtn, SectionHead, SoftLine, type Tone } from "../client/kit";
import { BiomarkerChart } from "../client/BiomarkerChart";
import { catalogueByKey, flagFor, markerIdentity } from "./biomarkerMatch";
import { getLabResults, type LabPanel, type LabResult } from "../../../services/labs/results";
import { fetchBiomarkerFlags, fetchSharedResults, type BiomarkerFlag } from "../../../services/pro/clientPage";
import type { CatalogueMarker } from "../../../services/labs/catalogueLogic";
import type { BloodMarker } from "../../../types";
import { changeFlag, dateLong, dayLabel, daysBetween, markerPattern, markerStatus, monthShort, PATTERN_LABEL, rangePosition, roundMarker, type MarkerPattern, type MarkerStatus } from "./insightsModel";
import { AskShareSheet, ChipRow, DetailHead } from "./parts";
import { readGate, useRead } from "./reads";
import type { PanelProps } from "./panelProps";

/**
 * Release 3 · W5 Insights › Biomarkers (TR16 v3 "trends on true dates", "out
 * of range filter", "nothing shared"; TR16 v2 test cards; TR21 biomarker
 * trend, point tapped, compare against range / own scales; TR18 v2/v3 test
 * page incl. partially shared; TR17 biomarker detail = W3's CL8
 * BiomarkerChart sheet; TR19 compare two tests; TR20 ask to share or test;
 * NU14 v3 for Nutrition; source gen/r16.js bioList16, bioSum16, bioChart16,
 * bioTrend16, bioCompare16, spark16, testPage16, gen/r11.js, r12.js).
 *
 * Data: the client's results the database lets this professional read
 * (services/labs getLabResults: the Lab results switch, or results shared
 * one at a time) plus result_shares (services/pro/clientPage
 * fetchSharedResults) and client_biomarker_flags for the range when the
 * lab gave none (the reference range by sex). Every test sits on its true
 * date. W9: markers group, find their catalogue entry and their flag by
 * blood_markers.marker_key (shared results carry it too; biomarkerMatch.ts),
 * never by name. Status (HANDOVER i): out of range, borderline within 10% of a
 * limit, change flag over 50% between tests.
 * Nutrition sees lipids, glucose, HbA1c, iron, ferritin and vitamin D
 * (HANDOVER k); Full coaching doesn't get this tab.
 * No critical thresholds, medication or care-plan markers are drawn: the
 * catalogue has no critical value, and medications and care-plan targets
 * have no dated link to a marker (see the W5 report).
 */

/** English keys (tk); panelLabel() shows them in the active language. */
const PANEL_LABEL: Record<string, string> = {
  blood_count: tk("Blood count"),
  lipids: tk("Lipids"),
  liver: tk("Liver"),
  kidney: tk("Kidney"),
  hormones: tk("Hormones"),
  metabolic: tk("Metabolic"),
  vitamins_minerals: tk("Vitamins and minerals"),
  thyroid: tk("Thyroid"),
  other: tk("Other"),
};
/** A category's label in the active language; an unknown category shows as stored. */
const panelLabel = (c: string): string => (PANEL_LABEL[c] ? t(PANEL_LABEL[c]) : c);
const NUTRITION_KEYS = new Set(["glucose", "hba1c", "iron", "ferritin", "vitamin_d"]);

interface Point {
  id: string;
  date: string;
  value: number;
  low: number | null;
  high: number | null;
  panelId: string | null;
  report: string | null;
  filePath: string | null;
  note: string | null;
  sharedAt: string | null;
}

interface Marker {
  key: string;
  markerKey: string | null;
  name: string;
  unit: string;
  category: string;
  entry: CatalogueMarker | null;
  points: Point[];
  low: number | null;
  high: number | null;
  rangeSource: "lab" | "reference" | null;
  status: MarkerStatus;
  pattern: MarkerPattern;
  changing: boolean;
  flag: BiomarkerFlag | null;
}

const PATTERN_TONE: Record<MarkerPattern, Tone> = { one: "pr", returning: "done", rising_out: "att", falling_out: "att", out: "att", stable: "pau", rising: "req", falling: "req" };

function convert(v: number, from: string, to: string, entry: CatalogueMarker | null): number | null {
  if (from === to) return v;
  if (!entry) return null;
  const a = entry.units.find((u) => u.unit === from);
  const b = entry.units.find((u) => u.unit === to);
  if (!a || !b) return null;
  const canonical = v * a.factor + a.offset;
  return (canonical - b.offset) / b.factor;
}

function buildMarkers(results: (LabResult & { note?: string | null; sharedAt?: string | null })[], flags: BiomarkerFlag[], catalogue: CatalogueMarker[] | null, nutritionOnly: boolean): Marker[] {
  const groups = new Map<string, typeof results>();
  for (const r of results) {
    const k = markerIdentity(r.markerKey, r.name);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const out: Marker[] = [];
  for (const [key, list] of groups) {
    const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const last = sorted[sorted.length - 1];
    // The catalogue by blood_markers.marker_key only (shared results carry it too).
    const markerKey = last.markerKey ?? null;
    const entry = catalogueByKey(catalogue, markerKey);
    const category = entry?.category ?? "other";
    if (nutritionOnly && !(category === "lipids" || (markerKey && NUTRITION_KEYS.has(markerKey)))) continue;
    const flag = flagFor(flags, markerKey, last.name);
    const points: Point[] = [];
    for (const r of sorted) {
      const v = convert(r.value, r.unit, last.unit, entry);
      if (v == null) continue;
      const lo = r.rangeLow != null ? convert(r.rangeLow, r.unit, last.unit, entry) : null;
      const hi = r.rangeHigh != null ? convert(r.rangeHigh, r.unit, last.unit, entry) : null;
      points.push({ id: r.id, date: r.date, value: Math.round(v * 1000) / 1000, low: lo, high: hi, panelId: r.panelId, report: r.reportName, filePath: r.filePath, note: r.note ?? null, sharedAt: r.sharedAt ?? null });
    }
    const low = last.rangeLow ?? flag?.rangeLow ?? null;
    const high = last.rangeHigh ?? flag?.rangeHigh ?? null;
    const rangeSource = last.rangeLow != null || last.rangeHigh != null ? "lab" : flag?.rangeSource ?? null;
    out.push({
      key,
      markerKey,
      name: entry?.displayName ?? last.name,
      unit: last.unit,
      category,
      entry,
      points,
      low,
      high,
      rangeSource,
      status: markerStatus(last.value, low, high),
      pattern: markerPattern(points, low, high),
      changing: changeFlag(points) || !!flag?.changeFlag,
      flag,
    });
  }
  const rank: Record<MarkerStatus, number> = { out: 0, border: 1, in: 2, none: 3 };
  return out.sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name));
}

const statusInk = (s: MarkerStatus, dark: boolean) => (s === "in" ? INK.good : s === "border" ? (dark ? "#E0B360" : "#9A7424") : s === "out" ? INK.hi : INK.chS);
const statusWord = (s: MarkerStatus) => (s === "in" ? t("In range") : s === "border" ? t("Borderline") : s === "out" ? t("Out of range") : t("No range"));
/** The range as a phrase ("4 to 6 mmol/L", "under 5 mmol/L"); `start` gives the sentence-start form ("Under 5 mmol/L"). */
const rangeText = (lo: number | null, hi: number | null, unit: string, start = false) =>
  lo != null && hi != null && lo > 0 ? t("{low} to {high} {unit}", { low: lo, high: hi, unit }) : hi != null ? (start ? t("Under {high} {unit}", { high: hi, unit }) : t("under {high} {unit}", { high: hi, unit })) : lo != null ? (start ? t("Above {low} {unit}", { low: lo, unit }) : t("above {low} {unit}", { low: lo, unit })) : null;
const signed = (n: number) => signedNum(roundMarker(n));
const ago = (date: string, today: string) => {
  const d = daysBetween(date, today);
  if (d <= 0) return t("Today");
  if (d < 14) return tn(d, "{n} day ago", "{n} days ago");
  if (d < 60) return tn(Math.round(d / 7), "{n} weeks ago", "{n} weeks ago");
  const m = Math.round(d / 30.4);
  return m < 24 ? tn(m, "{n} months ago", "{n} months ago") : tn(Math.round(d / 365), "{n} years ago", "{n} years ago");
};

type View = { kind: "list" } | { kind: "trend"; key: string } | { kind: "compare"; keys: string[] } | { kind: "test"; panelId: string; date: string };

export const BiomarkersPanel: React.FC<PanelProps & { onMessage: () => void }> = (p) => {
  const { clientId, firstName, name, access, lane, today, openClient, onMessage } = p;
  const { authUserId } = useApp();
  const lab = useLabCatalogue();
  const labsOn = access.has("lab_results");
  const sharedCount = access.access?.resultSharedCount ?? 0;
  const visible = labsOn || sharedCount > 0;
  const [view, setView] = useState<View>({ kind: "list" });
  const [filter, setFilter] = useState("all");
  const [asking, setAsking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const read = useRead(
    visible,
    async () => {
      const [res, shared, flags] = await Promise.all([getLabResults(clientId), sharedCount > 0 && authUserId ? fetchSharedResults(authUserId, clientId) : Promise.resolve(null), fetchBiomarkerFlags(clientId)]);
      if (!res.ok) return { ok: false as const, offline: /connection|offline|reach/i.test(res.message) };
      const ids = new Set(res.results.map((r) => r.id));
      const extra: (LabResult & { note: string | null; sharedAt: string | null })[] = [];
      const notes = new Map<string, { note: string | null; sharedAt: string }>();
      if (shared && shared.ok)
        for (const s of shared.data) {
          if (s.markerId) notes.set(s.markerId, { note: s.note, sharedAt: s.sharedAt });
          if (s.markerId && !ids.has(s.markerId) && s.value != null)
            extra.push({ id: s.markerId, panelId: s.panelId, date: s.date, filePath: null, reportName: null, name: s.name, markerKey: s.markerKey, value: s.value, unit: s.unit, rangeLow: s.rangeLow, rangeHigh: s.rangeHigh, status: s.status, note: s.note, sharedAt: s.sharedAt });
        }
      const results = [...res.results.map((r) => ({ ...r, note: notes.get(r.id)?.note ?? null, sharedAt: notes.get(r.id)?.sharedAt ?? null })), ...extra];
      return { ok: true as const, data: { results, panels: res.panels, flags: flags.ok ? flags.data : [] } };
    },
    [clientId, sharedCount, authUserId]
  );

  const markers = useMemo(() => (read.data ? buildMarkers(read.data.results, read.data.flags, lab.catalogue, lane === "nutrition") : []), [read.data, lab.catalogue, lane]);

  const askSheet = <AskShareSheet open={asking} onClose={() => setAsking(false)} clientId={clientId} firstName={firstName} onSent={(m) => { setAsking(false); setToast(m); }} />;

  if (!visible)
    return (
      <>
        <EmptyState icon={FlaskConical} title={t("No lab results shared")} line={t("Trends appear here when {firstName} shares a test with you, or a single result.", { firstName })}>
          <CtaButton size="base" variant="secondary" icon={<Send size={15} />} label={p.asked.includes("lab_results") || toast ? t("Asked") : t("Ask {firstName} to share a test", { firstName })} disabled={p.asked.includes("lab_results") || !!toast} onClick={() => setAsking(true)} />
        </EmptyState>
        {askSheet}
      </>
    );
  const gate = readGate(read, 4);
  if (gate) return <>{gate}</>;
  if (!markers.length)
    return (
      <EmptyState icon={FlaskConical} title={t("No results shared yet.")} line={t("Results {firstName} shares appear here.", { firstName })} />
    );

  if (view.kind === "trend") {
    const m = markers.find((x) => x.key === view.key);
    if (m)
      return (
        <MarkerTrend
          m={m}
          name={name}
          firstName={firstName}
          clinical={lane === "clinical_overview"}
          onBack={() => setView({ kind: "list" })}
          onCompare={() => setView({ kind: "compare", keys: defaultCompare(markers, m.key) })}
          onNote={() => openClient("notes")}
          onCarePlan={() => openClient("care-plan")}
          onMessage={onMessage}
          today={today}
        />
      );
  }
  if (view.kind === "compare") return <Compare all={markers} keys={view.keys} name={name} today={today} onKeys={(keys) => setView({ kind: "compare", keys })} onBack={() => setView({ kind: "list" })} />;
  if (view.kind === "test") {
    const panel = read.data?.panels.find((x) => x.id === view.panelId) ?? null;
    return (
      <TestPage
        panel={panel}
        panelId={view.panelId}
        date={view.date}
        markers={markers}
        allPanels={read.data?.panels ?? []}
        labsOn={labsOn}
        name={name}
        firstName={firstName}
        clinical={lane === "clinical_overview"}
        onBack={() => setView({ kind: "list" })}
        onAsk={() => setAsking(true)}
        onMessage={onMessage}
        onNote={() => openClient("notes")}
        onCarePlan={() => openClient("care-plan")}
        askSheet={askSheet}
      />
    );
  }

  // ---- the list (TR16 v3) ----
  const cats = [...new Set(markers.map((m) => m.category))].sort((a, b) => panelLabel(a).localeCompare(panelLabel(b)));
  const shown = markers.filter((m) => (filter === "all" ? true : filter === "out" ? m.status === "out" : filter === "changing" ? m.changing || m.pattern === "rising" || m.pattern === "falling" || m.pattern === "rising_out" || m.pattern === "falling_out" : m.category === filter));
  const lastDate = markers.reduce<string | null>((a, m) => m.points.reduce<string | null>((b, x) => (!b || x.date > b ? x.date : b), a), null);
  const outNow = markers.filter((m) => m.status === "out");
  const prevDates = [...new Set(markers.flatMap((m) => m.points.map((x) => x.date)))].sort();
  const prevTest = prevDates.length > 1 ? prevDates[prevDates.length - 2] : null;
  const newOut = prevTest ? outNow.filter((m) => {
    const before = [...m.points].reverse().find((x) => x.date <= prevTest);
    return !before || markerStatus(before.value, m.low, m.high) !== "out";
  }).length : null;
  const improving = markers.filter((m) => m.pattern === "returning" || (m.pattern === "out" && m.points.length > 1));
  const testRows = [...(read.data?.panels ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      {read.offline && <OfflineLine />}
      {!labsOn && (
        <SoftLine icon={Info} action={undefined}>
          {`${sharedCount === 1 ? t("Lab results aren't shared. {firstName} shared this result with you one at a time, and can stop at any time.", { firstName }) : t("Lab results aren't shared. {firstName} shared these results with you one at a time, and can stop at any time.", { firstName })} `}
          <button type="button" onClick={() => setAsking(true)} className="tap" style={{ fontWeight: 700, color: INK.prDeep }}>
            {t("Ask {firstName} to share the whole test", { firstName })}
          </button>
        </SoftLine>
      )}
      <ChipRow
        label={t("Filter")}
        items={[{ key: "all", label: t("All") }, { key: "out", label: t("Out of range") }, { key: "changing", label: t("Changing") }, ...cats.map((c) => ({ key: c, label: panelLabel(c) }))]}
        active={filter}
        onChange={setFilter}
      />
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 12 }}>
        {[
          { l: t("Last test"), v: lastDate ? dayLabel(lastDate) : "–", s: lastDate ? ago(lastDate, today) : "", hi: false },
          { l: t("Out of range"), v: String(outNow.length), s: newOut != null && prevTest ? t("{change} since {date}", { change: signedNum(newOut), date: monthShort(prevTest) }) : t("Latest results"), hi: outNow.length > 0 },
          { l: t("Improving"), v: String(improving.length), s: improving.map((m) => m.name.replace(/ cholesterol$/i, "")).join(t(", ")) || t("None yet"), hi: false },
        ].map((x) => (
          <div key={x.l} className="min-w-0" style={{ borderRadius: 16, background: x.hi ? INK.hiBg : INK.card, border: `1px solid ${x.hi ? "transparent" : INK.bCard}`, padding: 11 }}>
            <p style={{ fontSize: textPx(11), fontWeight: 600, color: INK.chS }}>{x.l}</p>
            <p style={{ fontSize: textPx(20), fontWeight: 800, color: x.hi ? INK.hi : INK.ch, marginTop: 4, lineHeight: 1 }}>{x.v}</p>
            <p className="truncate" style={{ fontSize: textPx(10.5), color: INK.chF, marginTop: 4 }}>{x.s}</p>
          </div>
        ))}
      </div>
      <SectionHead
        label={filter === "out" ? t("Out of range or critical") : t("Trends")}
        right={
          markers.length > 1 ? (
            <span className="inline-flex items-center" style={{ gap: 4 }}>
              <Layers size={12} strokeWidth={2.2} aria-hidden />
              {t("Compare")}
            </span>
          ) : undefined
        }
        onRight={markers.length > 1 ? () => setView({ kind: "compare", keys: defaultCompare(markers, shown[0]?.key ?? markers[0].key) }) : undefined}
      />
      {shown.length === 0 ? (
        <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 12 }}>{t("No results match this filter.")}</p>
      ) : (
        shown.map((m) => <MarkerRow key={m.key} m={m} now={new Date(`${today}T23:59:59`).getTime()} onOpen={() => setView({ kind: "trend", key: m.key })} />)
      )}
      <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5, marginTop: 4, marginBottom: 14 }}>{t("Points sit on their real test dates. Ranges are the reporting lab's; where a lab gives none, Centium's reference range for {firstName}'s sex and age is used.", { firstName })}</p>
      {testRows.length > 0 && (
        <>
          <SectionHead label={t("Tests")} />
          <ListCard
            rows={testRows.map((tp) => {
              const inTest = markers.filter((m) => m.points.some((x) => x.panelId === tp.id));
              const out = inTest.filter((m) => {
                const pt = m.points.find((x) => x.panelId === tp.id);
                return pt && markerStatus(pt.value, pt.low ?? m.low, pt.high ?? m.high) === "out";
              }).length;
              return {
                key: tp.id,
                icon: FileText,
                title: dateLong(tp.date),
                meta: `${tp.name ?? t("Lab report")} · ${tn(inTest.length, "{n} result", "{n} results")}`,
                trailing: out ? <Chip label={t("{n} out of range", { n: out })} tone="att" /> : undefined,
                onClick: () => setView({ kind: "test", panelId: tp.id, date: tp.date }),
                ariaLabel: t("Open test, {date}", { date: dateLong(tp.date) }),
              };
            })}
          />
        </>
      )}
      {askSheet}
      {toast && (
        <p role="status" style={{ fontSize: textPx(12), color: INK.good, marginTop: 8 }}>
          {toast}
        </p>
      )}
    </>
  );
};

function defaultCompare(markers: Marker[], key: string): string[] {
  const m = markers.find((x) => x.key === key) ?? markers[0];
  const same = markers.filter((x) => x.category === m.category && x.key !== m.key && x.points.length > 0);
  return [m.key, ...same.slice(0, 2).map((x) => x.key)];
}

// ---------------------------------------------------------------------------
// The marker row's sparkline (spark16: 96 × 30, lab band, a 1.3 line at 50%, status points r2.4)
// ---------------------------------------------------------------------------

const Spark: React.FC<{ m: Marker; t0: number; t1: number }> = ({ m, t0, t1 }) => {
  const dark = useIsDark();
  const W = 96;
  const H = 30;
  const vals = m.points.map((x) => x.value);
  const hi = m.high ?? Math.max(...vals) * 1.4;
  const lo = m.low ?? 0;
  const mx = Math.max(...vals, hi) * 1.05;
  const mn = lo === 0 ? Math.min(...vals) * 0.6 : Math.min(...vals, lo) * 0.95;
  // Round F (F10): in right to left, time runs from right to left (every x mirrored).
  const rtl = isRtl();
  const ux = (d: string) => 3 + ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - 6);
  const X = (d: string) => (rtl ? W - ux(d) : ux(d));
  const Y = (v: number) => 3 + ((mx - Math.max(mn, Math.min(mx, v))) / (mx - mn || 1)) * (H - 6);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden style={{ flexShrink: 0, borderRadius: 6 }}>
      {(m.low != null || m.high != null) && <rect x={0} y={Y(hi)} width={W} height={Math.max(0, Y(lo) - Y(hi))} fill={INK.tealPale} />}
      {m.points.length > 1 && <path d={"M" + m.points.map((x) => `${X(x.date).toFixed(1)} ${Y(x.value).toFixed(1)}`).join(" L")} fill="none" stroke={INK.chS} strokeWidth={1.3} opacity={0.5} />}
      {m.points.map((x) => (
        <circle key={x.id} cx={X(x.date)} cy={Y(x.value)} r={2.4} fill={statusInk(markerStatus(x.value, x.low ?? m.low, x.high ?? m.high), dark)} />
      ))}
    </svg>
  );
};

const MarkerRow: React.FC<{ m: Marker; now: number; onOpen: () => void }> = ({ m, now, onOpen }) => {
  const dark = useIsDark();
  const last = m.points[m.points.length - 1];
  const t0 = new Date(m.points[0].date).getTime() - 864e5 * 30;
  const t1 = now;
  return (
    <button type="button" onClick={onOpen} className="tap w-full flex items-center text-start" style={{ gap: 10, background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, padding: "11px 12px", marginBottom: 8, minHeight: 64 }}>
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>
          {m.name}
        </span>
        <span className="flex items-center" style={{ gap: 6, marginTop: 3 }}>
          <Chip label={t(PATTERN_LABEL[m.pattern])} tone={PATTERN_TONE[m.pattern]} />
        </span>
      </span>
      <Spark m={m} t0={t0} t1={t1} />
      <span className="text-end shrink-0" style={{ minWidth: 58 }}>
        <span className="block" style={{ fontSize: textPx(16), fontWeight: 800, color: statusInk(m.status, dark), fontVariantNumeric: "tabular-nums" }}>
          {last.value}
        </span>
        <span className="block" style={{ fontSize: textPx(10.5), color: INK.chF }}>
          {m.unit}
        </span>
      </span>
    </button>
  );
};

// ---------------------------------------------------------------------------
// TR21 · one marker over time
// ---------------------------------------------------------------------------

const Track: React.FC<{ items: string[]; value: string; onChange: (v: string) => void; label: string; show?: (v: string) => string }> = ({ items, value, onChange, label, show = (v) => v }) => (
  <span role="tablist" aria-label={label} className="flex shrink-0" style={{ gap: 2, padding: 2, borderRadius: 9, background: INK.soft }}>
    {items.map((r) => {
      const on = r === value;
      return (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={on}
          onClick={() => onChange(r)}
          className="relative flex items-center justify-center whitespace-nowrap before:absolute before:inset-x-0 before:-inset-y-[10px] before:content-['']"
          style={{ height: 24, minWidth: 28, padding: "0 7px", borderRadius: 7, fontSize: textPx(10.5), fontWeight: 800, background: on ? INK.card : "transparent", color: on ? INK.ch : INK.chF, boxShadow: on ? "0 1px 2px rgba(0,0,0,0.08)" : undefined }}
        >
          {show(r)}
        </button>
      );
    })}
  </span>
);

const MarkerTrend: React.FC<{
  m: Marker;
  name: string;
  firstName: string;
  clinical: boolean;
  onBack: () => void;
  onCompare: () => void;
  onNote: () => void;
  onCarePlan: () => void;
  onMessage: () => void;
  today: string;
}> = ({ m, name, firstName, clinical, onBack, onCompare, onNote, onCarePlan, onMessage, today }) => {
  const dark = useIsDark();
  const units = m.entry && m.entry.units.some((u) => u.unit === m.unit) ? m.entry.units.map((u) => u.unit) : [m.unit];
  const [unit, setUnit] = useState(m.unit);
  const [span, setSpan] = useState("All");
  const [all, setAll] = useState(false);
  const [sheet, setSheet] = useState<Point | null>(null);
  const k = (v: number | null) => (v == null ? null : convert(v, m.unit, unit, m.entry));
  const fmtV = (v: number) => String(roundMarker(v));
  const cut = span === "1Y" ? 365 : span === "2Y" ? 730 : Infinity;
  const nowIso = today;
  const now = new Date(`${today}T23:59:59`).getTime();
  const pts = m.points.filter((x) => daysBetween(x.date, nowIso) <= cut);
  const n = m.points.length;
  const L = m.points[n - 1];
  const P = n > 1 ? m.points[n - 2] : null;
  const F = m.points[0];
  const lo = k(m.low);
  const hi = k(m.high);
  const st = m.status;
  const rng = rangeText(lo != null ? roundMarker(lo) : null, hi != null ? roundMarker(hi) : null, unit);
  const src = m.rangeSource === "reference" ? t("Centium reference range") : L.report ?? t("reported by the lab");
  const months = Math.round(daysBetween(F.date, L.date) / 30.4);
  const years = daysBetween(F.date, L.date) / 365.25;

  // chart geometry on true dates
  const t0 = pts.length ? new Date(pts[0].date).getTime() : 0;
  const t1 = Math.max(now, t0 + 864e5);
  const pad = (t1 - t0) * 0.06 || 864e5 * 15;
  const xPos = pts.map((x) => (new Date(x.date).getTime() - (t0 - pad)) / (t1 - (t0 - pad)));
  const vals = pts.map((x) => k(x.value) as number);
  const top = Math.max(...vals, hi ?? Math.max(...vals) * 1.3);
  const bottom = Math.min(...vals, lo ?? Math.min(...vals) * 0.6);
  const padV = (top - bottom) * 0.12 || 1;
  const stOf = (i: number) => markerStatus(pts[i].value, pts[i].low ?? m.low, pts[i].high ?? m.high);
  const colourOf = (s: MarkerStatus) => statusInk(s, dark);
  const only = (s: MarkerStatus[]) => vals.map((v, i) => (s.includes(stOf(i)) ? roundMarker(v) : null));
  const ticks = (() => {
    const out: { pos: number; label: string }[] = [];
    const start = new Date(t0 - pad);
    const end = new Date(t1);
    const step = (end.getTime() - start.getTime()) / 864e5 > 500 ? 6 : 3;
    const d = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    while (d <= end) {
      if (d.getMonth() % step === 0) out.push({ pos: (d.getTime() - start.getTime()) / (end.getTime() - start.getTime()), label: `${monthShort(`2000-${String(d.getMonth() + 1).padStart(2, "0")}-01`)} ${String(d.getFullYear()).slice(2)}` });
      d.setMonth(d.getMonth() + 1);
    }
    return out.slice(-5);
  })();

  const series: ProChartSeries[] = [
    { key: "line", label: t("Results"), type: "line", color: dark ? "rgba(178,173,196,0.45)" : "rgba(92,85,80,0.45)", values: vals.map(roundMarker), noPoints: true, noLegend: true, labels: n > 1 ? [vals.length - 2, vals.length - 1].filter((i) => i >= 0) : [] },
    { key: "in", label: t("In range"), type: "points", filled: true, swatch: "dot", color: colourOf("in"), values: only(["in", "none"]), pointColor: (i) => colourOf(stOf(i)) },
    { key: "border", label: t("Borderline"), type: "points", filled: true, swatch: "dot", color: colourOf("border"), values: only(["border"]) },
    { key: "out", label: t("Out of range"), type: "points", filled: true, swatch: "dot", color: colourOf("out"), values: only(["out"]) },
  ];

  return (
    <>
      <DetailHead eyebrow={`${name} · ${PANEL_LABEL[m.category] ? t(PANEL_LABEL[m.category]) : t("Other")}`} title={m.name} onBack={onBack} right={<RoundBtn icon={Layers} label={t("Compare")} onClick={onCompare} />} />
      <div className="flex items-end justify-between" style={{ gap: 10, marginBottom: 10 }}>
        <div className="min-w-0">
          <p className="flex items-baseline" style={{ gap: 6 }}>
            <span style={{ fontSize: textPx(32), fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: INK.ch, fontVariantNumeric: "tabular-nums" }}>{fmtV(k(L.value) as number)}</span>
            <span style={{ fontSize: textPx(13), fontWeight: 700, color: INK.chF }}>{unit}</span>
          </p>
          <p style={{ marginTop: 6 }}>
            {P ? (
              <span className="inline-flex items-center flex-wrap" style={{ gap: 4, fontSize: textPx(12), fontWeight: 800, color: INK.ch }}>
                {L.value >= P.value ? <ArrowUpRight size={13} strokeWidth={2.4} aria-hidden style={{ color: INK.chS }} /> : <ArrowDownRight size={13} strokeWidth={2.4} aria-hidden style={{ color: INK.chS }} />}
                {`${signed((k(L.value) as number) - (k(P.value) as number))} ${unit}`}
                <span style={{ fontWeight: 600, color: INK.chF }}>{t("({pct}%) since {date}", { pct: signedNum(P.value ? Math.round(((L.value - P.value) / P.value) * 100) : 0), date: dayLabel(P.date) })}</span>
              </span>
            ) : (
              <span style={{ fontSize: textPx(12), color: INK.chF }}>{t("First test")}</span>
            )}
          </p>
          {n > 2 && years > 0 && <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 2 }}>{tn(months, "Over {n} months: {change} · about {perYear} a year", "Over {n} months: {change} · about {perYear} a year", { change: signed((k(L.value) as number) - (k(F.value) as number)), perYear: signed(((k(L.value) as number) - (k(F.value) as number)) / years) })}</p>}
          {rng && <p style={{ fontSize: textPx(11), color: INK.chF, marginTop: 2 }}>{t("Lab range {range} · {source}", { range: rng, source: src })}</p>}
        </div>
        {st !== "none" && (
          <span className="inline-flex items-center whitespace-nowrap shrink-0" style={{ gap: 4, fontSize: textPx(11), fontWeight: 800, padding: "4px 9px", borderRadius: 9999, background: st === "in" ? INK.goodBg : st === "border" ? INK.goldPale : INK.hiBg, color: statusInk(st, dark) }}>
            {statusWord(st)}
          </span>
        )}
      </div>
      <ProChart
        title={t("Over time")}
        right={
          <span className="flex items-center" style={{ gap: 6 }}>
            {units.length > 1 && <Track label={t("Unit")} items={units.slice(0, 2)} value={unit} onChange={setUnit} />}
            <Track label={t("Range")} items={["1Y", "2Y", "All"]} value={span} onChange={setSpan} show={(v) => (v === "All" ? t("All") : tx(v, "chart range"))} />
          </span>
        }
        x={pts.map((x) => x.date)}
        xPos={xPos}
        xTicks={ticks}
        min={bottom - padV}
        max={top + padV}
        height={176}
        band={lo != null || hi != null ? { low: lo ?? bottom - padV, high: hi ?? top + padV, label: t("Lab range") } : undefined}
        refs={[...(hi != null ? [{ value: hi, label: fmtV(hi), side: "right" as const, dashed: false }] : []), ...(lo != null && lo > 0 ? [{ value: lo, label: fmtV(lo), side: "right" as const, dashed: false }] : [])]}
        series={series}
        defaultPin={n > 1 ? pts.length - 1 : null}
        tooltip={(i) => {
          const x = pts[i];
          const prev = i > 0 ? pts[i - 1] : null;
          const v = k(x.value) as number;
          return {
            title: dateLong(x.date),
            lines: [
              `${fmtV(v)} ${unit} · ${statusWord(stOf(i))}`,
              ...(prev ? [t("{change} since {date} ({pct}%)", { change: signed(v - (k(prev.value) as number)), date: dayLabel(prev.date), pct: signedNum(prev.value ? Math.round(((x.value - prev.value) / prev.value) * 100) : 0) })] : []),
              x.report ?? t("Lab report"),
            ],
          };
        }}
        scrubHint={n > 1 ? t("Drag sideways to scrub, tap a point to pin it") : undefined}
        summary={rng ? tn(n, "{name}: {n} result, latest {value} {unit}, lab range {range}.", "{name}: {n} results, latest {value} {unit}, lab range {range}.", { name: m.name, value: fmtV(k(L.value) as number), unit, range: rng }) : tn(n, "{name}: {n} result, latest {value} {unit}.", "{name}: {n} results, latest {value} {unit}.", { name: m.name, value: fmtV(k(L.value) as number), unit })}
      />
      {n === 1 && (
        <p className="flex" style={{ gap: 6, fontSize: textPx(12), color: INK.chS, lineHeight: 1.45, margin: "-4px 2px 12px" }}>
          <Info size={13} strokeWidth={2} aria-hidden style={{ color: INK.chF, flexShrink: 0, marginTop: 2 }} />
          {t("One test so far, so there is no trend yet. It draws once {firstName} shares a second result.", { firstName })}
        </p>
      )}
      <SectionHead label={t("All results")} right={tn(n, "{n} test", "{n} tests")} />
      <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "2px 14px", marginBottom: 12 }}>
        {[...m.points]
          .reverse()
          .slice(0, all ? undefined : 3)
          .map((x, i) => (
            <button key={x.id} type="button" onClick={() => setSheet(x)} className="tap w-full flex items-center text-start" style={{ gap: 10, padding: "11px 0", borderTop: i ? `1px solid ${INK.b06}` : "none", minHeight: 44 }}>
              <span style={{ width: 10, height: 10, borderRadius: 9999, background: statusInk(markerStatus(x.value, x.low ?? m.low, x.high ?? m.high), dark), flexShrink: 0 }} />
              <span className="flex-1 min-w-0">
                <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 700, color: INK.ch }}>
                  {dateLong(x.date)}
                </span>
                <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF }}>
                  {[x.report ?? (x.sharedAt ? t("Shared result") : t("Lab report")), x.note].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span style={{ fontSize: textPx(14), fontWeight: 800, color: INK.ch, fontVariantNumeric: "tabular-nums" }}>
                {`${x.value} `}
                <span style={{ fontSize: textPx(10.5), fontWeight: 600, color: INK.chF }}>{m.unit}</span>
              </span>
              <ChevronRight size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
            </button>
          ))}
        {n > 3 && !all && (
          <button type="button" onClick={() => setAll(true)} className="tap w-full text-center" style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep, padding: "10px 0 8px", borderTop: `1px solid ${INK.b06}`, minHeight: 44 }}>
            {t("See all {n}", { n })}
          </button>
        )}
      </div>
      <div className="flex" style={{ gap: 8 }}>
        <CtaButton className="flex-1" size="base" variant="secondary" icon={<FileText size={15} />} label={t("Add to note")} onClick={onNote} />
        {clinical ? (
          <CtaButton className="flex-1" size="base" variant="outline" icon={<ClipboardPlus size={15} />} label={t("Care plan")} onClick={onCarePlan} />
        ) : (
          <CtaButton className="flex-1" size="base" variant="outline" icon={<MessageCircle size={15} />} label={t("Message {name}", { name: firstName })} onClick={onMessage} />
        )}
      </div>
      <ResultSheet point={sheet} m={m} clinical={clinical} onClose={() => setSheet(null)} onNote={onNote} onCarePlan={onCarePlan} />
    </>
  );
};

const ResultSheet: React.FC<{ point: Point | null; m: Marker; clinical: boolean; onClose: () => void; onNote: () => void; onCarePlan: () => void }> = ({ point, m, clinical, onClose, onNote, onCarePlan }) => {
  const dark = useIsDark();
  const [viewing, setViewing] = useState(false);
  if (!point) return <BottomSheet open={false} onClose={onClose} title="">{null}</BottomSheet>;
  const i = m.points.findIndex((x) => x.id === point.id);
  const prev = i > 0 ? m.points[i - 1] : null;
  const lo = point.low ?? m.low;
  const hi = point.high ?? m.high;
  const st = markerStatus(point.value, lo, hi);
  const alt = m.entry?.units.find((u) => u.unit !== m.unit && m.entry?.units.some((x) => x.unit === m.unit));
  const altV = alt ? convert(point.value, m.unit, alt.unit, m.entry) : null;
  const r = rangeText(lo, hi, m.unit, true);
  const rows: [string, string][] = [
    [t("Value"), `${point.value} ${m.unit}${alt && altV != null ? ` · ${roundMarker(altV)} ${alt.unit}` : ""}`],
    [t("Status"), statusWord(st)],
    [t("Lab range"), r ? `${r} · ${point.low != null || point.high != null ? t("reported by the lab") : t("Centium reference range")}` : t("None given")],
    ...(prev ? ([[t("Change"), t("{change} {unit} ({pct}%) since {date}", { change: signed(point.value - prev.value), unit: m.unit, pct: prev.value ? Math.round(((point.value - prev.value) / prev.value) * 100) : 0, date: dateLong(prev.date) })]] as [string, string][]) : []),
    [t("Lab and date"), t("{report} · drawn {date}", { report: point.report ?? t("Lab report"), date: dateLong(point.date) })],
    ...(point.note ? ([[t("Note"), point.note]] as [string, string][]) : []),
  ];
  return (
    <>
      <BottomSheet
        open={!!point}
        onClose={onClose}
        title={`${m.name} · ${dayLabel(point.date)}`}
        footer={
          <div className="flex w-full" style={{ gap: 8 }}>
            <CtaButton className="flex-1" size="sheet" variant="secondary" icon={<FileText size={15} />} label={t("Add to note")} onClick={onNote} />
            {clinical && <CtaButton className="flex-1" size="sheet" icon={<ClipboardPlus size={15} />} label={t("Care plan")} onClick={onCarePlan} />}
          </div>
        }
      >
        <div className="flex flex-col">
          {rows.map(([l, v], j) => (
            <div key={l} className="flex justify-between" style={{ gap: 12, padding: "10px 0", borderTop: j ? `1px solid ${INK.b06}` : "none" }}>
              <span style={{ fontSize: textPx(12.5), color: INK.chF, flexShrink: 0 }}>{l}</span>
              <span className="text-end" style={{ fontSize: textPx(13), fontWeight: 700, color: j === 1 ? statusInk(st, dark) : INK.ch }}>
                {v}
              </span>
            </div>
          ))}
        </div>
        {point.filePath && (
          <button type="button" onClick={() => setViewing(true)} className="tap w-full flex items-center text-start" style={{ gap: 12, borderRadius: 14, background: INK.soft, padding: "10px 12px", marginTop: 8, minHeight: 44 }}>
            <FileText size={18} strokeWidth={1.75} aria-hidden style={{ color: INK.chS }} />
            <span className="flex-1">
              <span className="block" style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>
                {t("Source document")}
              </span>
              <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF }}>
                {t("Lab report")}
              </span>
            </span>
            <ChevronRight size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
          </button>
        )}
      </BottomSheet>
      <FileViewerScreen open={viewing} onClose={() => setViewing(false)} path={point.filePath} bucket="lab-reports" title={point.report ?? t("Lab report")} />
    </>
  );
};

// ---------------------------------------------------------------------------
// TR21 · compare (against range / own scales)
// ---------------------------------------------------------------------------

const Compare: React.FC<{ all: Marker[]; keys: string[]; name: string; today: string; onKeys: (k: string[]) => void; onBack: () => void }> = ({ all, keys, name, today, onKeys, onBack }) => {
  const dark = useIsDark();
  const [mode, setMode] = useState<"range" | "own">("range");
  const [addEl, setAddEl] = useState<HTMLElement | null>(null);
  const [pinDate, setPinDate] = useState<string | null>(null);
  const cols = [dark ? "#C3B3FB" : "#5F5093", INK.tealDark, dark ? "#E0B360" : "#9A7424", INK.sky];
  const chosen = keys.map((k) => all.find((m) => m.key === k)).filter((m): m is Marker => !!m);
  const cat = chosen.length && chosen.every((m) => m.category === chosen[0].category) ? panelLabel(chosen[0].category) : null;
  const dates = [...new Set(chosen.flatMap((m) => m.points.map((x) => x.date)))].sort();
  const t0 = dates.length ? new Date(dates[0]).getTime() : 0;
  const t1 = Math.max(new Date(`${today}T23:59:59`).getTime(), t0 + 864e5);
  const pad = (t1 - t0) * 0.06 || 864e5 * 15;
  const pos = (d: string) => (new Date(d).getTime() - (t0 - pad)) / (t1 - (t0 - pad));
  const topOf = (m: Marker) => m.high ?? (m.low && m.low > 0 ? m.low * 3 : Math.max(...m.points.map((x) => x.value)) * 1.4);
  const noTop = chosen.filter((m) => m.high == null);
  const short = (m: Marker) => m.name.replace(/ cholesterol$/i, "");

  const dir = (m: Marker) => {
    if (m.points.length < 2) return null;
    const a = m.points[0].value;
    const b = m.points[m.points.length - 1].value;
    const d = (b - a) / (a || 1);
    return Math.abs(d) <= 0.05 ? "same" : d < 0 ? "fell" : "rose";
  };
  const fell = chosen.filter((m) => dir(m) === "fell").map(short);
  const rose = chosen.filter((m) => dir(m) === "rose").map(short);
  const same = chosen.filter((m) => dir(m) === "same").map(short);
  const join = (a: string[]) => (a.length <= 1 ? a.join("") : t("{list} and {last}", { list: a.slice(0, -1).join(t(", ")), last: a[a.length - 1] }));
  const since = dates.length ? monthShort(dates[0]) : "";
  const insight = [fell.length ? t("{names} fell since {date}", { names: join(fell), date: since }) : null, rose.length ? t("{names} rose since {date}", { names: join(rose), date: since }) : null, same.length ? t("{names} did not change", { names: join(same) }) : null].filter(Boolean).join(t("; "));
  const ticks = (() => {
    const out: { pos: number; label: string }[] = [];
    const start = new Date(t0 - pad);
    const end = new Date(t1);
    const d = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    while (d <= end) {
      if (d.getMonth() % 6 === 0) out.push({ pos: (d.getTime() - start.getTime()) / (end.getTime() - start.getTime()), label: `${monthShort(`2000-${String(d.getMonth() + 1).padStart(2, "0")}-01`)} ${String(d.getFullYear()).slice(2)}` });
      d.setMonth(d.getMonth() + 1);
    }
    return out.slice(-5);
  })();
  const numberWord = ["", t("One chart"), t("Two charts"), t("Three charts"), t("Four charts")][chosen.length] ?? tn(chosen.length, "{n} charts", "{n} charts");

  return (
    <>
      <DetailHead eyebrow={name} title={cat ? t("Compare {category}", { category: cat.toLowerCase() }) : t("Compare results")} onBack={onBack} />
      <SegmentedTabs
        className="mb-[10px]"
        items={[
          { key: "range", label: t("Against range") },
          { key: "own", label: t("Own scales") },
        ]}
        activeKey={mode}
        onChange={(k) => setMode(k as "range" | "own")}
        tabHeight={36}
        labelSize={12}
      />
      <div className="flex flex-wrap" style={{ gap: 6, marginBottom: 10 }}>
        {chosen.map((m, i) => (
          <span key={m.key} className="inline-flex items-center" style={{ gap: 6, height: 30, paddingBlock: "0", paddingInline: "10px 4px", borderRadius: 10, background: INK.card, border: `1.5px solid ${cols[i]}`, fontSize: textPx(12), fontWeight: 700, color: INK.ch }}>
            <span style={{ width: 8, height: 8, borderRadius: 9999, background: cols[i] }} />
            {short(m)}
            {chosen.length > 1 && (
              <button type="button" aria-label={t("Remove {name}", { name: m.name })} onClick={() => onKeys(keys.filter((k) => k !== m.key))} className="tap flex items-center justify-center relative before:absolute before:-inset-2 before:content-['']" style={{ width: 22, height: 22 }}>
                <X size={11} strokeWidth={2.4} aria-hidden style={{ color: INK.chF }} />
              </button>
            )}
          </span>
        ))}
        {chosen.length < 4 && all.length > chosen.length && (
          <button type="button" onClick={(e) => setAddEl(e.currentTarget)} className="tap inline-flex items-center" style={{ gap: 4, height: 30, padding: "0 10px", borderRadius: 10, background: INK.soft, fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
            <Plus size={12} strokeWidth={2.4} aria-hidden />
            {t("Add")}
          </button>
        )}
      </div>
      <PopupMenu
        open={!!addEl}
        onClose={() => setAddEl(null)}
        anchor={addEl}
        options={all.filter((m) => !keys.includes(m.key)).map((m) => ({ value: m.key, label: m.name }))}
        onSelect={(v) => {
          setAddEl(null);
          onKeys([...keys, v]);
        }}
        width={240}
        align="left"
      />
      {mode === "range" ? (
        <>
          <ProChart
            title={t("Position in each lab range")}
            question={cat ? t("Are the {category} moving together?", { category: cat.toLowerCase() }) : t("Are these results moving together?")}
            questionIcon
            x={dates}
            xPos={dates.map(pos)}
            xTicks={ticks}
            min={-20}
            max={170}
            height={180}
            band={{ low: 0, high: 100, label: t("Inside each lab range") }}
            refs={[
              { value: 100, label: t("Upper limit"), side: "right", dashed: false },
              { value: 0, label: t("Lower limit"), side: "right", dashed: false },
            ]}
            series={chosen.map((m, i) => ({
              key: m.key,
              label: short(m),
              type: "line" as const,
              color: cols[i],
              values: dates.map((d) => {
                const pt = m.points.find((x) => x.date === d);
                return pt ? Math.round(rangePosition(pt.value, m.low, topOf(m))) : null;
              }),
              pointColor: (j: number) => {
                const pt = m.points.find((x) => x.date === dates[j]);
                const s = pt ? markerStatus(pt.value, m.low, m.high) : "in";
                return s === "in" || s === "none" ? cols[i] : statusInk(s, dark);
              },
            }))}
            tooltip={(j) => ({
              title: dateLong(dates[j]),
              lines: chosen
                .map((m) => {
                  const pt = m.points.find((x) => x.date === dates[j]);
                  return pt ? t("{name} {value} {unit} · {pct}% of range", { name: short(m), value: pt.value, unit: m.unit, pct: Math.round(rangePosition(pt.value, m.low, topOf(m))) }) : null;
                })
                .filter((l): l is string => !!l),
            })}
            defaultPin={dates.length - 1}
            insight={insight ? t("{insight}. Filled points are outside their range.", { insight }) : undefined}
            scrubHint={t("Drag sideways to scrub, tap a point to pin it")}
          />
          <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5 }}>
            {`${t("Each line is placed against its own lab range: 0 is the lower limit, 100 the upper.")}${noTop.map((m) => ` ${t("{name} has no upper limit, so {value} {unit} is used as its top.", { name: m.name, value: roundMarker(topOf(m)), unit: m.unit })}`).join("")}`}
          </p>
        </>
      ) : (
        <>
          {chosen.map((m, i) => {
            const idx = pinDate ? m.points.findIndex((x) => x.date === pinDate) : -1;
            const vals = m.points.map((x) => x.value);
            const top = Math.max(...vals, m.high ?? 0);
            const bottom = Math.min(...vals, m.low ?? Math.min(...vals));
            const padV = (top - bottom) * 0.15 || 1;
            return (
              <ProChart
                key={m.key}
                title={`${m.name} · ${m.unit}`}
                x={m.points.map((x) => x.date)}
                xPos={m.points.map((x) => pos(x.date))}
                xTicks={ticks}
                min={bottom - padV}
                max={top + padV}
                height={96}
                band={m.low != null || m.high != null ? { low: m.low ?? bottom - padV, high: m.high ?? top + padV, label: t("Lab range") } : undefined}
                series={[{ key: "v", label: short(m), type: "line", color: cols[i], values: vals, noLegend: true, pointColor: (j: number) => statusInk(markerStatus(vals[j], m.points[j].low ?? m.low, m.points[j].high ?? m.high), dark) }]}
                pinned={idx >= 0 ? idx : null}
                onPinnedChange={(j) => setPinDate(j == null ? null : m.points[j].date)}
                tooltip={(j) => ({ title: dateLong(m.points[j].date), lines: [`${m.points[j].value} ${m.unit} · ${statusWord(markerStatus(m.points[j].value, m.points[j].low ?? m.low, m.points[j].high ?? m.high))}`] })}
              />
            );
          })}
          <p className="flex" style={{ gap: 6, fontSize: textPx(12), color: INK.chS, lineHeight: 1.45 }}>
            {`${t("{charts} on one time axis, each on its own scale.", { charts: numberWord })}${chosen.length > 1 ? ` ${chosen.length === 2 ? t("Scrubbing one moves the pin on both.") : chosen.length === 3 ? t("Scrubbing one moves the pin on all three.") : t("Scrubbing one moves the pin on all four.")}` : ""}`}
          </p>
        </>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// TR18 · test page, TR19 · compare two tests, TR17 · biomarker detail (W3's CL8 sheet)
// ---------------------------------------------------------------------------

const TestPage: React.FC<{
  panel: LabPanel | null;
  panelId: string;
  date: string;
  markers: Marker[];
  allPanels: LabPanel[];
  labsOn: boolean;
  name: string;
  firstName: string;
  clinical: boolean;
  onBack: () => void;
  onAsk: () => void;
  onMessage: () => void;
  onNote: () => void;
  onCarePlan: () => void;
  askSheet: React.ReactNode;
}> = ({ panel, panelId, date, markers, allPanels, labsOn, name, firstName, clinical, onBack, onAsk, onMessage, onNote, onCarePlan, askSheet }) => {
  const dark = useIsDark();
  const [other, setOther] = useState<string | null>(null);
  const [open, setOpen] = useState<Marker | null>(null);
  const [viewing, setViewing] = useState(false);
  const inTest = markers.map((m) => ({ m, pt: m.points.find((x) => x.panelId === panelId) ?? null })).filter((x): x is { m: Marker; pt: Point } => !!x.pt);
  const byCat = new Map<string, typeof inTest>();
  for (const r of inTest) byCat.set(r.m.category, [...(byCat.get(r.m.category) ?? []), r]);
  const sharedAt = inTest.map((r) => r.pt.sharedAt).find(Boolean) ?? null;
  const others = allPanels.filter((x) => x.id !== panelId).sort((a, b) => (a.date < b.date ? 1 : -1));
  const otherPanel = others.find((x) => x.id === other) ?? null;

  const statusLine = (m: Marker, pt: Point) => {
    const lo = pt.low ?? m.low;
    const hi = pt.high ?? m.high;
    const s = markerStatus(pt.value, lo, hi);
    if (s === "out") return hi != null && pt.value > hi ? t("Above {low} {unit}", { low: hi, unit: m.unit }) : t("Below {low} {unit}", { low: lo ?? "", unit: m.unit });
    if (s === "border") return hi != null && pt.value > hi - (lo != null ? (hi - lo) * 0.1 : hi * 0.1) ? t("Within 10% of the upper limit") : t("Within 10% of the lower limit");
    return null;
  };
  const toBlood = (m: Marker): BloodMarker => {
    const last = m.points[m.points.length - 1];
    return { id: last.id, name: m.name, value: last.value, unit: m.unit, range: rangeText(m.low, m.high, m.unit) ?? "–", status: m.status === "out" ? (m.high != null && last.value > m.high ? "high" : "low") : m.status === "none" ? null : "normal", history: m.points.map((x) => ({ date: x.date, value: x.value })), markerKey: m.markerKey, rangeLow: m.low, rangeHigh: m.high, previous: null };
  };

  return (
    <>
      <DetailHead eyebrow={`${name} · ${t("Biomarkers")}`} title={t("Test · {date}", { date: dateLong(date) })} onBack={onBack} />
      <p style={{ fontSize: textPx(12), color: INK.chS, marginBottom: 10 }}>
        {labsOn ? t("Shared as part of {firstName}'s lab history", { firstName }) : sharedAt ? tn(inTest.length, "{n} result shared individually by {firstName} on {date}", "{n} results shared individually by {firstName} on {date}", { firstName, date: dateLong(sharedAt.slice(0, 10)) }) : t("Shared by {firstName}", { firstName })}
      </p>
      {!labsOn && (
        <SoftLine icon={Info}>
          {`${t("Only the results shared one at a time show here.")} `}
          <button type="button" onClick={onAsk} className="tap" style={{ fontWeight: 700, color: INK.prDeep }}>
            {t("Ask {firstName} to share the whole test", { firstName })}
          </button>
        </SoftLine>
      )}
      {others.length > 0 && (
        <>
          <p style={{ fontSize: textPx(11), fontWeight: 600, color: INK.chF, marginBottom: 6 }}>{t("Compare with")}</p>
          <ChipRow label={t("Compare with")} items={[{ key: "", label: t("None") }, ...others.map((o) => ({ key: o.id, label: dayLabel(o.date) }))]} active={other ?? ""} onChange={(k) => setOther(k || null)} />
        </>
      )}
      {otherPanel && <CompareTests a={otherPanel} b={{ id: panelId, date }} markers={markers} />}
      {panel?.filePath && (
        <ListCard rows={[{ key: "rep", icon: FileText, title: t("Lab report"), meta: t("{kind} · opens in the viewer", { kind: panel.fileType === "pdf" ? (panel.filePages ? tn(panel.filePages, "PDF · {n} pages", "PDF · {n} pages") : "PDF") : t("Image") }), onClick: () => setViewing(true) }]} />
      )}
      {[...byCat.entries()].map(([cat, rows]) => {
        const flagged = rows.filter((r) => markerStatus(r.pt.value, r.pt.low ?? r.m.low, r.pt.high ?? r.m.high) !== "in").length;
        return (
          <div key={cat} style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "12px 14px 4px", marginBottom: 10 }}>
            <p className="flex justify-between" style={{ gap: 8 }}>
              <span style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>{panelLabel(cat)}</span>
              <span style={{ fontSize: textPx(11.5), color: INK.chF }}>{`${tn(rows.length, "{n} result", "{n} results")}${flagged ? ` · ${t("{n} flagged", { n: flagged })}` : ""}`}</span>
            </p>
            {rows.map(({ m, pt }, i) => {
              const s = markerStatus(pt.value, pt.low ?? m.low, pt.high ?? m.high);
              const idx = m.points.indexOf(pt);
              const prev = idx > 0 ? m.points[idx - 1] : null;
              const line = statusLine(m, pt);
              return (
                <button key={m.key} type="button" onClick={() => setOpen(m)} className="tap w-full flex items-center text-start" style={{ gap: 10, padding: "10px 0", borderTop: i ? `1px solid ${INK.b06}` : "none", marginTop: i ? 0 : 6, minHeight: 44 }}>
                  <span className="flex-1 min-w-0">
                    <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 700, color: INK.ch }}>
                      {m.name}
                    </span>
                    {(line || prev) && (
                      <span className="block" style={{ fontSize: textPx(11.5), color: line ? statusInk(s, dark) : INK.chF }}>
                        {[line, prev ? t("Was {value} · {change}", { value: prev.value, change: signed(pt.value - prev.value) }) : null].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: textPx(14), fontWeight: 800, color: statusInk(s, dark), fontVariantNumeric: "tabular-nums" }}>
                    {`${pt.value} `}
                    <span style={{ fontSize: textPx(10.5), fontWeight: 600, color: INK.chF }}>{m.unit}</span>
                  </span>
                  <ChevronRight size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
                </button>
              );
            })}
          </div>
        );
      })}
      <div className="flex" style={{ gap: 8, marginTop: 4 }}>
        <CtaButton className="flex-1" size="base" variant="secondary" icon={<MessageCircle size={15} />} label={t("Message {name}", { name: firstName })} onClick={onMessage} aria-label={t("Message {name}", { name: firstName })} />
      </div>
      <BiomarkerChart
        open={!!open}
        onClose={() => setOpen(null)}
        marker={open ? toBlood(open) : null}
        flag={open?.flag ?? null}
        panel={open ? (PANEL_LABEL[open.category] ? t(PANEL_LABEL[open.category]) : null) : null}
        sharedNote={open ? open.points.find((x) => x.note)?.note ?? null : null}
        firstName={firstName}
        onNote={() => {
          setOpen(null);
          onNote();
        }}
        onCarePlan={
          clinical
            ? () => {
                setOpen(null);
                onCarePlan();
              }
            : undefined
        }
      />
      <FileViewerScreen open={viewing} onClose={() => setViewing(false)} path={panel?.filePath ?? null} bucket="lab-reports" title={panel?.name ?? t("Lab report")} />
      {askSheet}
    </>
  );
};

const CompareTests: React.FC<{ a: LabPanel; b: { id: string; date: string }; markers: Marker[] }> = ({ a, b, markers }) => {
  const rows = markers
    .map((m) => ({ m, pa: m.points.find((x) => x.panelId === a.id), pb: m.points.find((x) => x.panelId === b.id) }))
    .filter((r) => r.pa || r.pb);
  const both = rows.filter((r) => r.pa && r.pb);
  const onlyB = rows.filter((r) => !r.pa && r.pb).length;
  const dist = (m: Marker, v: number) => (m.high != null && v > m.high ? v - m.high : m.low != null && v < m.low ? m.low - v : 0);
  return (
    <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "12px 14px", marginBottom: 12 }}>
      <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch, marginBottom: 6 }}>{t("{a} vs {b}", { a: dayLabel(a.date), b: dayLabel(b.date) })}</p>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) auto auto auto", gap: "6px 10px", fontSize: textPx(12) }}>
        <span style={{ color: INK.chF, fontWeight: 600 }}>{t("Result")}</span>
        <span style={{ color: INK.chF, fontWeight: 600, textAlign: "end" }}>{dayLabel(a.date)}</span>
        <span style={{ color: INK.chF, fontWeight: 600, textAlign: "end" }}>{dayLabel(b.date)}</span>
        <span />
        {both.map(({ m, pa, pb }) => {
          const d = (pb as Point).value - (pa as Point).value;
          const toward = dist(m, (pb as Point).value) < dist(m, (pa as Point).value);
          const away = dist(m, (pb as Point).value) > dist(m, (pa as Point).value);
          return (
            <React.Fragment key={m.key}>
              <span className="truncate" style={{ color: INK.ch, fontWeight: 600 }}>{m.name}</span>
              <span style={{ textAlign: "end", color: INK.chS }}>{(pa as Point).value}</span>
              <span style={{ textAlign: "end", color: INK.ch, fontWeight: 700 }}>{(pb as Point).value}</span>
              <span style={{ textAlign: "end", fontWeight: 800, color: toward ? INK.good : away ? INK.hi : INK.chF }}>{d === 0 ? "0" : signed(d)}</span>
            </React.Fragment>
          );
        })}
      </div>
      <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 8, lineHeight: 1.5 }}>{`${t("Green: moved toward range. Red: moved away.")}${onlyB ? ` ${tn(onlyB, "{n} result from {date} were not in the {month} test.", "{n} results from {date} were not in the {month} test.", { date: dayLabel(b.date), month: monthShort(a.date) })}` : ""}`}</p>
    </div>
  );
};
