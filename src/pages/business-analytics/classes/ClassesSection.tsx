import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarX2, ChevronDown, ChevronRight, ChevronUp, Info, Lock, Plus } from "lucide-react";
import { SegmentedTabs } from "../../../components/ui/SegmentedTabs";
import { useBusiness } from "../../../components/business-more/useBusiness";
import { useOnline } from "../../../hooks/useOnline";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { DAY_LETTERS, DAY_LONG, DAY_SHORT } from "../../../utils/week";
import { useAnalytics } from "../shell/AnalyticsContext";
import { fetchClassesRaw } from "./classesData";
import {
  computeModel,
  dayDate,
  exportRows,
  fullDayRows,
  inPeriod,
  pctInk,
  pctTone,
  periodWords,
  previousLabel,
  sameSlotHistory,
  slotLabel,
  slotLong,
  span12,
  theBefore,
  timeLabel,
  type ClassesModel,
  type RangeIn,
  type RawData,
  type Session,
  type Slot,
} from "./classesModel";
import { Bar, Coll, ErrorBody, LabelRow, ListingRow, LoadingBody, SkeletonRow } from "./parts";
import { INK, TONE, cap } from "./tones";
import "./classes.css";

// v6 Analytics › Classes (AN3-001, -003, -006, -008, -062, -074, -082;
// source AnClassesV6.dc.html imported by BizAnalyticsV43 with anim "live").
// Registered in the Analytics shell (AnalyticsPage.tsx) for the Classes and
// Gym types. Numbers are computed on the device from the owner's own rows
// (classesData.ts) until the B15 class readers exist; nothing is sampled.

type Raw = { status: "loading" } | { status: "error" } | { status: "ready"; raw: RawData };
type CsKey = "dist" | "nvr" | "lead" | "top" | "ds";

const EMPTY_RAW: RawData = { sessions: [], bookings: [], bookingDates: {}, firstEver: null, names: {} };
const ease = (x: number) => 1 - Math.pow(1 - x, 3);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const fmtAvg = (n: number) => (n >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10));

export default function ClassesSection() {
  // The lane from the shell (known before this mounts), not this hook's own
  // fresh read, whose fallback names "store" until the row arrives.
  const { range, kind, setExport } = useAnalytics();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const online = useOnline();
  const reduced = useReducedMotion();
  const { business, loading: bizLoading, error: bizError } = useBusiness();
  const people = kind === "gym" ? "members" : "clients";

  const [data, setData] = useState<Raw>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const bizId = business?.id ?? null;
  const r: RangeIn = range;

  useEffect(() => {
    if (!bizId) return;
    let cancelled = false;
    setData((d) => (d.status === "ready" ? d : { status: "loading" }));
    void fetchClassesRaw(bizId, r).then((res) => {
      if (cancelled) return;
      // Offline keeps the last loaded numbers (AN3-001 O3).
      setData((d) => (res.ok ? { status: "ready", raw: res.raw } : d.status === "ready" ? d : { status: "error" }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the range object identity changes with its values
  }, [bizId, r.from, r.to, r.compare, tick]);

  // A business with no business_profiles row yet has no classes: the empty state.
  const noBusiness = !bizLoading && !bizError && !bizId;
  const raw = noBusiness ? EMPTY_RAW : data.status === "ready" ? data.raw : null;
  const m = useMemo(() => (raw ? computeModel(raw, r) : null), [raw, r]);

  // Export CSV (AN3-001 S3): by type, by session, by instructor.
  useEffect(() => {
    if (!m) return;
    setExport({ filename: `centium-classes-${r.from}-to-${r.to}.csv`, rows: exportRows(m, r) });
  }, [m, r, setExport]);
  useEffect(() => () => setExport(null), [setExport]);

  // UI state (source state l.272): breakdown tab "type", sort "low", every
  // collapsible closed (DEF), bookings view "time", heatmap cell per data.
  const [frTab, setFrTab] = useState<"type" | "session" | "inst">("type");
  const [sort, setSort] = useState<"low" | "high">("low");
  const [all, setAll] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [cs, setCs] = useState<Record<CsKey, boolean>>({ dist: false, nvr: false, lead: false, top: false, ds: false });
  const [band, setBand] = useState(-1);
  const [bkView, setBkView] = useState<"time" | "dow">("time");
  const [cell, setCell] = useState<string | null>(null);
  const [fullDay, setFullDay] = useState(false);
  const toggle = (k: CsKey) => setCs((s) => ({ ...s, [k]: !s[k] }));

  useEffect(() => {
    setOpenRow(null);
    setCell(null);
    setBand(-1);
    setAll(false);
  }, [r.from, r.to]);

  // Fill bar count-up (AN3-001 S5): 0 → value over 850 ms, ease-out cubic.
  const [t, setT] = useState<number | null>(null);
  const target = m && m.state !== "empty" ? m.pct : null;
  useLayoutEffect(() => {
    if (target === null || reduced) {
      setT(null);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const e = now - t0;
      setT(Math.min(e, 850));
      if (e < 850) raf = requestAnimationFrame(step);
    };
    setT(0);
    raf = requestAnimationFrame(step);
    // A hidden tab pauses animation frames: land on the value regardless.
    const done = window.setTimeout(() => setT(850), 900);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [target, reduced, r.from, r.to]);

  // Deep link to a block (AN3-001 S7): ?focus=fill|dist|bk|nvr|peak|ds.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const focus = params.get("focus");
  useEffect(() => {
    if (!focus || !m) return;
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-sec="${focus}"]`);
    if (!el) return;
    if (focus === "dist" || focus === "nvr" || focus === "ds") setCs((s) => ({ ...s, [focus]: true }));
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 16 });
  }, [focus, m]);

  const goListing = useCallback(() => navigate("/app/business/profile?from=analytics"), [navigate]);
  const goCreate = useCallback(() => navigate("/app/business/classes?create=1"), [navigate]);
  const retry = () => {
    setData({ status: "loading" });
    setTick((n) => n + 1);
  };

  // ---------------------------------------------------------------------
  if (kind === "store") {
    return (
      <div className="an3">
        <div className="an3-card an3-empty">
          <span className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 16, background: "var(--k-pale)", color: "var(--k-pdark)" }}>
            <CalendarX2 size={20} aria-hidden />
          </span>
          <p className="an3-empty-title" style={{ fontSize: 15, lineHeight: "20px" }}>
            Classes aren't part of a store account
          </p>
          <p className="an3-empty-body" style={{ maxWidth: 280 }}>
            Fill rate, bookings and peak times appear for gym and studio businesses that schedule classes. Your listings and discounts are under Overview.
          </p>
        </div>
      </div>
    );
  }

  const listingKnown = !!business && !bizError;
  const listing = listingKnown ? (
    <ListingRow listed={!!business?.active} people={people} disabled={!online} onClick={goListing} />
  ) : null;
  const loading = !m && (data.status === "loading" || bizLoading);
  const failed = !m && (data.status === "error" || !!bizError);

  return (
    <div className="an3" ref={rootRef}>
      {/* ---------------- Class fill rate ---------------- */}
      <span data-sec="fill" className="an3-anchor" />
      <div className="an3-block">
        <LabelRow label="Class fill rate" caption="Booked spots ÷ spots offered" />
        <div className="an3-card">
          {loading ? (
            <LoadingBody />
          ) : failed || !m ? (
            <ErrorBody onRetry={retry} disabled={!online} />
          ) : m.state === "empty" ? (
            <div className="an3-empty">
              <div className="an3-placeholder-track">
                <span />
              </div>
              <p className="an3-empty-title" style={{ marginTop: 6 }}>
                No classes in this range
              </p>
              <p className="an3-empty-body">
                {m.upcomingFirst
                  ? `Your first class is on ${dayDate(m.upcomingFirst)}. Its fill rate shows here after it runs.`
                  : "Schedule a class and its fill rate shows here against the 70% target."}
              </p>
              {!m.firstEver && (
                <button type="button" className="an3-create tap" onClick={goCreate}>
                  <Plus size={15} aria-hidden />
                  Create your first class
                </button>
              )}
            </div>
          ) : (
            <FillBody m={m} r={r} t={t} frTab={frTab} setFrTab={setFrTab} sort={sort} setSort={setSort} all={all} setAll={setAll} openRow={openRow} setOpenRow={setOpenRow} raw={raw!} cs={cs} toggle={toggle} band={band} setBand={setBand} onOpenClass={(id) => navigate(`/app/business/classes/${id}`)} />
          )}
        </div>
      </div>

      {/* ---------------- Bookings ---------------- */}
      <span data-sec="bk" className="an3-anchor" />
      <div className="an3-block">
        <LabelRow label="Bookings" caption="Spots booked, by class day" />
        <div className="an3-card">
          {loading ? (
            <div className="an3-empty">
              <SkeletonRow />
            </div>
          ) : failed || !m ? (
            <ErrorBody onRetry={retry} disabled={!online} />
          ) : m.state === "empty" ? (
            <div className="an3-empty">
              <p className="an3-empty-title">No bookings yet</p>
              <p className="an3-empty-body">{`${cap(people)} book your classes from Explore once your listing is on.`}</p>
              {listing && <div style={{ marginTop: 8, alignSelf: "stretch", display: "flex" }}>{listing}</div>}
            </div>
          ) : (
            <BookingsBody m={m} r={r} people={people} listing={listing} bkView={bkView} setBkView={setBkView} cs={cs} toggle={toggle} />
          )}
        </div>
      </div>

      {/* ---------------- Peak times ---------------- */}
      <span data-sec="peak" className="an3-anchor" />
      <div className="an3-block">
        <LabelRow label="Peak times" caption="Booked ÷ capacity by slot" />
        <div className="an3-card">
          {loading ? (
            <div className="an3-empty">
              <SkeletonRow />
            </div>
          ) : failed || !m ? (
            <ErrorBody onRetry={retry} disabled={!online} />
          ) : (
            <PeakBody m={m} people={people} cell={cell} setCell={setCell} fullDay={fullDay} setFullDay={setFullDay} cs={cs} toggle={toggle} />
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Fill rate card

function FillBody(props: {
  m: ClassesModel;
  r: RangeIn;
  t: number | null;
  frTab: "type" | "session" | "inst";
  setFrTab: (k: "type" | "session" | "inst") => void;
  sort: "low" | "high";
  setSort: (k: "low" | "high") => void;
  all: boolean;
  setAll: (v: boolean) => void;
  openRow: string | null;
  setOpenRow: (v: string | null) => void;
  raw: RawData;
  cs: Record<CsKey, boolean>;
  toggle: (k: CsKey) => void;
  band: number;
  setBand: (n: number) => void;
  onOpenClass: (id: string) => void;
}) {
  const { m, r, t, frTab, setFrTab } = props;
  const early = m.state === "early";
  const eK = t === null ? 1 : ease(Math.min(1, t / 850));
  const cur = m.pct * eK;
  const labTx = cur < 10 ? "0%" : cur > 90 ? "-100%" : "-50%";

  let dShort = "";
  let dCol = "var(--k-faint)";
  if (!early && m.deltaPts !== null) {
    if (m.deltaPts > 0) {
      dShort = `↑ +${m.deltaPts} pts`;
      dCol = "var(--k-good)";
    } else if (m.deltaPts < 0) {
      dShort = `↓ −${Math.abs(m.deltaPts)} pts`;
      dCol = "var(--k-high)";
    } else dShort = "No change";
  }
  const prevLine = early
    ? m.prevExists && r.compare
      ? "No comparison yet"
      : "No previous period yet"
    : m.prevPct !== null
      ? `${previousLabel(r)}: ${m.prevPct}%`
      : r.compare
        ? "No previous period yet"
        : "";
  const sessionsWord = plural(m.sessions.length, "session", "sessions");

  return (
    <>
      <div className="an3-fr">
        <p className="an3-sub">{`${m.booked} of ${m.offered} spots booked · ${sessionsWord}`}</p>
        <div className="an3-hero">
          <span className="an3-hero-num" style={{ left: `${cur.toFixed(1)}%`, transform: `translateX(${labTx})` }} aria-label={`${m.pct}% of spots booked`}>
            <span aria-hidden>{Math.round(cur)}%</span>
            {dShort && (
              <span className="an3-delta" style={{ color: dCol }}>
                {dShort}
              </span>
            )}
          </span>
          <div className="an3-ticks" aria-hidden>
            {Array.from({ length: 11 }, (_, i) => (
              <span key={i} style={{ left: `${i * 10}%`, height: i % 5 === 0 ? 6 : 4 }} />
            ))}
          </div>
          <div className="an3-track" aria-hidden>
            <div style={{ width: `${cur.toFixed(1)}%` }} />
          </div>
          {m.prevPct !== null && <span className="an3-ghost" style={{ left: `${m.prevPct}%` }} aria-hidden />}
          <span className="an3-target" aria-hidden />
          <span className="an3-target-label">Target 70%</span>
        </div>
        <div className="an3-legend">
          {prevLine && (
            <>
              <span className="an3-legend-mk" aria-hidden />
              <span>{prevLine}</span>
            </>
          )}
          <span style={{ marginLeft: "auto" }}>Ticks every 10%</span>
        </div>
        {early && (
          <p className="an3-note" style={{ marginTop: 12 }}>
            {m.sessions.length === 1
              ? "Early data: one session so far. Comparisons and rankings appear after 2 weeks of classes."
              : `Early data: ${m.sessions.length} sessions so far. Comparisons and rankings appear after 2 weeks of classes.`}
          </p>
        )}
      </div>
      <div className="an3-tabs-wrap">
        <SegmentedTabs
          size="compact"
          labelSize={12}
          items={[
            { key: "type", label: "By type" },
            { key: "session", label: "By session" },
            { key: "inst", label: "By instructor" },
          ]}
          activeKey={frTab}
          onChange={(k) => setFrTab(k as "type" | "session" | "inst")}
        />
      </div>
      {frTab === "type" && (
        <div className="an3-rows-wrap">
          <p className="an3-small">Average fill per class type, highest first. Dashed line: 70%.</p>
          <div className="an3-rows">
            {m.byType.map((row) => (
              <RowCells key={row.key} label={row.label} sub={row.sub} pct={row.pct} />
            ))}
          </div>
        </div>
      )}
      {frTab === "inst" && (
        <div className="an3-rows-wrap">
          <p className="an3-small">Average fill of the sessions each instructor runs.</p>
          {m.byInstructor.length ? (
            <div className="an3-rows">
              {m.byInstructor.map((row) => (
                <RowCells key={row.key} label={row.label} sub={row.sub} pct={row.pct} initial={row.initial} />
              ))}
            </div>
          ) : (
            <p className="an3-note" style={{ marginTop: 8 }}>
              No sessions in this range have an instructor from your team.
            </p>
          )}
        </div>
      )}
      {frTab === "session" && <SessionList {...props} />}
      {m.state === "data" && <DistColl {...props} />}
    </>
  );
}

function RowCells({ label, sub, pct, initial }: { label: string; sub: string; pct: number; initial?: string }) {
  return (
    <>
      {initial !== undefined ? (
        <div className="flex items-center min-w-0" style={{ gap: 7 }}>
          <span className="an3-avatar" aria-hidden>
            {initial}
          </span>
          <span className="min-w-0">
            <span className="an3-row-name block">{label}</span>
            <span className="an3-row-sub block">{sub}</span>
          </span>
        </div>
      ) : (
        <div className="min-w-0">
          <p className="an3-row-name">{label}</p>
          <p className="an3-row-sub">{sub}</p>
        </div>
      )}
      <Bar pct={pct} color={TONE[pctTone(pct)]} />
      <span className="an3-val" style={{ color: INK[pctInk(pct)] }}>
        {pct}%
      </span>
    </>
  );
}

function SessionList({ m, sort, setSort, all, setAll, openRow, setOpenRow, raw, onOpenClass }: Parameters<typeof FillBody>[0]) {
  const per = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of raw.bookings) map.set(b.classId, (map.get(b.classId) ?? 0) + 1);
    return (id: string) => map.get(id) ?? 0;
  }, [raw]);
  const sorted = [...m.sessions].sort((a, b) => (sort === "low" ? a.pct - b.pct : b.pct - a.pct) || a.date.localeCompare(b.date));
  const shown = all ? sorted : sorted.slice(0, 5);
  const n = m.sessions.length;
  return (
    <div className="an3-rows-wrap" style={{ paddingBottom: 4 }}>
      <div className="flex items-center justify-between" style={{ gap: 10, marginBottom: 6 }}>
        <p className="an3-small">Each session in the range.</p>
        <SegmentedTabs
          className="shrink-0"
          scroll
          scrollTabPadding="0 10px"
          scrollMinWidth={0}
          tabHeight={28}
          tabRadius={9}
          labelSize={11}
          trackStyle={{ borderRadius: 12, padding: 4, gap: 4 }}
          items={[
            { key: "low", label: "Lowest" },
            { key: "high", label: "Highest" },
          ]}
          activeKey={sort}
          onChange={(k) => setSort(k as "low" | "high")}
        />
      </div>
      {shown.map((s, i) => {
        const op = openRow === s.id;
        return (
          <div key={s.id} style={{ borderTop: i ? "1px solid var(--k-divider)" : "none" }}>
            <button type="button" className="an3-sess" aria-expanded={op} onClick={() => setOpenRow(op ? null : s.id)}>
              <div>
                <p className="an3-sess-day">{dayDate(s.date)}</p>
                <p className="an3-sess-time">{timeLabel(s.start)}</p>
              </div>
              <div className="min-w-0">
                <p className="an3-sess-title">{s.title}</p>
                <p className="an3-sess-who">{whoOf(s)}</p>
                <div className="an3-sess-bar">
                  <div style={{ width: `${Math.max(s.pct, 1.5)}%`, background: TONE[pctTone(s.pct)] }} />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p className="an3-val" style={{ color: INK[pctInk(s.pct)] }}>{`${s.booked}/${s.cap}`}</p>
                <p className="an3-sess-time">{s.full ? "Full" : `${s.pct}%`}</p>
              </div>
              <span className="an3-chev" style={{ transform: op ? "rotate(180deg)" : "none" }} aria-hidden>
                <ChevronDown size={14} />
              </span>
            </button>
            {op && (
              <div className="an3-detail">
                <div className="an3-detail-row">
                  <span>Time</span>
                  <span>{span12(s)}</span>
                </div>
                <div className="an3-detail-row">
                  <span>Instructor</span>
                  <span>{whoOf(s)}</span>
                </div>
                <div className="an3-detail-row">
                  <span>Booked</span>
                  <span>{`${s.booked} of ${s.cap} spots`}</span>
                </div>
                <div className="an3-detail-row">
                  <span>Same slot, last 4 weeks</span>
                  <span>{sameSlotHistory(s, raw, per)}</span>
                </div>
                <button type="button" className="an3-link tap self-start" style={{ marginTop: 4, marginLeft: -4 }} onClick={() => onOpenClass(s.id)}>
                  Open in Classes
                  <ChevronRight size={13} aria-hidden />
                </button>
              </div>
            )}
          </div>
        );
      })}
      {n > 5 ? (
        <button type="button" className="an3-seeall tap" onClick={() => setAll(!all)}>
          {all ? "Show fewer" : `See all ${n} sessions`}
          {all ? <ChevronUp size={13} aria-hidden /> : <ChevronRight size={13} aria-hidden />}
        </button>
      ) : (
        <p className="an3-seeall" style={{ color: "var(--k-faint)" }}>
          {`${plural(n, "session", "sessions")} in this range`}
        </p>
      )}
    </div>
  );
}

const whoOf = (s: Session) => s.who ?? (s.proId ? "Instructor" : "No instructor");

function DistColl({ m, cs, toggle, band, setBand, setFrTab }: Parameters<typeof FillBody>[0]) {
  const n = m.sessions.length;
  const over90 = m.bands[3].sessions.length + m.bands[4].sessions.length;
  const under40 = m.bands[0].sessions.length;
  const line = `${over90} of ${n} sessions were 90% booked or more. ${under40 === 0 ? "None fell under 40%." : under40 === 1 ? "Only 1 fell under 40%." : `Only ${under40} fell under 40%.`}`;
  const sel = band >= 0 ? m.bands[band] : null;
  const chipLabel = (s: Session) => `${dayDate(s.date).replace(/ \w+$/, "")}, ${timeLabel(s.start)}`;
  const toSessions = () => setFrTab("session");

  // Full and in demand / Underfilled (AnClassesV6 hiA / hiB), from the rows.
  const full = m.sessions.filter((s) => s.full);
  const fullSlots = groupSlots(full);
  const under = m.slots.filter((sl) => sl.pct < 40).sort((a, b) => a.pct - b.pct);

  return (
    <>
      <span data-sec="dist" className="an3-anchor" />
      <Coll id="dist" title="How sessions are filled" count={plural(n, "session", "sessions")} line={line} open={cs.dist} onToggle={() => toggle("dist")}>
        <p className="an3-small" style={{ margin: "10px 0 0" }}>{`Your ${plural(n, "session", "sessions")}, by how full they were.`}</p>
        <div className="flex" style={{ height: 8, gap: 2, marginTop: 8 }} aria-hidden>
          {m.bands.map((b, i) =>
            b.sessions.length ? (
              <span
                key={i}
                style={{
                  flex: b.sessions.length,
                  background: TONE[b.tone],
                  borderRadius: i === 0 ? "999px 0 0 999px" : i === 4 ? "0 999px 999px 0" : 0,
                  opacity: band >= 0 && band !== i ? 0.4 : 1,
                }}
              />
            ) : null
          )}
        </div>
        <div className="an3-tiles5">
          {m.bands.map((b, i) => (
            <button
              key={i}
              type="button"
              className="an3-tile tap"
              aria-pressed={band === i}
              onClick={() => setBand(band === i ? -1 : i)}
              style={{ background: band === i ? "var(--k-pale)" : "var(--k-soft)" }}
            >
              <span className="flex items-center" style={{ gap: 4 }}>
                <span style={{ width: 8, height: 3, borderRadius: 999, background: TONE[b.tone] }} aria-hidden />
                <span className="an3-tile-n">{b.sessions.length}</span>
              </span>
              <span className="an3-tile-t">{b.short}</span>
            </button>
          ))}
        </div>
        <div className="an3-note" style={{ marginTop: 8 }}>
          <p>
            {sel ? (
              <>
                <span style={{ fontWeight: 800, color: "var(--k-ink)" }}>{`${sel.long} · ${plural(sel.sessions.length, "session", "sessions")}. `}</span>
                {`${Math.round((sel.sessions.length / Math.max(1, n)) * 100)}% of your sessions.`}
              </>
            ) : (
              "Tap a band for its sessions."
            )}
          </p>
          {sel && sel.sessions.length > 0 && (
            <div className="flex flex-wrap" style={{ gap: 6, marginTop: 8 }}>
              {sel.sessions.slice(0, 3).map((s) => (
                <button key={s.id} type="button" className="an3-chip tap" style={{ background: "var(--k-card)" }} onClick={toSessions}>
                  <span>{chipLabel(s)}</span>
                  <span style={{ color: INK[pctInk(s.pct)] }}>{s.full ? "Full" : `${s.pct}%`}</span>
                </button>
              ))}
              {sel.sessions.length > 3 && (
                <button type="button" className="an3-chip tap" style={{ background: "var(--k-card)" }} onClick={toSessions}>
                  <span>{`+${sel.sessions.length - 3} more`}</span>
                </button>
              )}
            </div>
          )}
        </div>
        <div style={{ marginTop: 6 }}>
          {full.length > 0 && (
            <HiRow
              color="var(--k-good)"
              n={full.length}
              title="Full and in demand"
              line={`${slotLong(fullSlots[0])} ${titlesOf(fullSlots[0].sessions)} was full ${plural(fullSlots[0].sessions.length, "time", "times")} in this range.`}
              chips={fullSlots.slice(0, 2).map((sl) => ({ t: `${DAY_SHORT[sl.col]}, ${timeLabel(sl.start)}`, v: "Full" }))}
              more={fullSlots.length > 2 ? fullSlots.length - 2 : 0}
              ink="var(--k-good)"
              onPick={toSessions}
            />
          )}
          {under.length > 0 && (
            <HiRow
              color="var(--k-caution)"
              n={under.length}
              title="Underfilled"
              line={`${slotLong(under[0])} ${titlesOf(under[0].sessions)} averaged ${under[0].pct}% across ${plural(under[0].sessions.length, "session", "sessions")}. Consider moving it, merging it, or rethinking the format.`}
              chips={under.slice(0, 2).map((sl) => ({ t: `${DAY_SHORT[sl.col]}, ${timeLabel(sl.start)}`, v: `${sl.pct}%` }))}
              more={under.length > 2 ? under.length - 2 : 0}
              ink="var(--k-caution)"
              onPick={toSessions}
            />
          )}
        </div>
        <div style={{ height: 2 }} />
      </Coll>
    </>
  );
}

function groupSlots(xs: Session[]): Slot[] {
  const map = new Map<string, Session[]>();
  for (const s of xs) {
    const col = (new Date(`${s.date}T00:00:00`).getDay() + 6) % 7;
    const k = `${col}|${s.start.slice(0, 5)}`;
    map.set(k, [...(map.get(k) ?? []), s]);
  }
  return [...map.entries()]
    .map(([key, ss]) => {
      const [c, st] = key.split("|");
      return { key, col: Number(c), start: st, label: "", sessions: ss, pct: 100 };
    })
    .sort((a, b) => b.sessions.length - a.sessions.length);
}
const titlesOf = (xs: Session[]) => [...new Set(xs.map((s) => s.title))].join(", ");

function HiRow({ color, n, title, line, chips, more, ink, onPick }: { color: string; n: number; title: string; line: string; chips: { t: string; v: string }[]; more: number; ink: string; onPick: () => void }) {
  return (
    <div className="an3-hi">
      <span className="an3-hi-bar" style={{ background: color }} aria-hidden />
      <span className="an3-hi-n">{n}</span>
      <div className="min-w-0">
        <p className="an3-hi-t">{title}</p>
        <p className="an3-coll-line" style={{ marginTop: 2 }}>
          {line}
        </p>
        <div className="flex flex-wrap" style={{ gap: 6, marginTop: 8 }}>
          {chips.map((c) => (
            <button key={c.t} type="button" className="an3-chip tap" style={{ background: "var(--k-soft)" }} onClick={onPick}>
              <span>{c.t}</span>
              <span style={{ color: ink }}>{c.v}</span>
            </button>
          ))}
          {more > 0 && (
            <button type="button" className="an3-chip tap" style={{ background: "var(--k-soft)" }} onClick={onPick}>
              <span>{`+${more} more`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Bookings card

function BookingsBody({
  m,
  r,
  people,
  listing,
  bkView,
  setBkView,
  cs,
  toggle,
}: {
  m: ClassesModel;
  r: RangeIn;
  people: string;
  listing: React.ReactNode;
  bkView: "time" | "dow";
  setBkView: (v: "time" | "dow") => void;
  cs: Record<CsKey, boolean>;
  toggle: (k: CsKey) => void;
}) {
  const early = m.state === "early";
  let delta = "";
  let dCol = "var(--k-faint)";
  if (early) delta = "No comparison yet";
  else if (m.bookingsDeltaPct !== null) {
    if (m.bookingsDeltaPct > 0) {
      delta = `↑ +${m.bookingsDeltaPct}%`;
      dCol = "var(--k-good)";
    } else if (m.bookingsDeltaPct < 0) {
      delta = `↓ −${Math.abs(m.bookingsDeltaPct)}%`;
      dCol = "var(--k-high)";
    } else delta = "No change";
  }
  const sub = early
    ? m.firstEver
      ? `Spots booked · first class on ${dayDate(m.firstEver)}`
      : "Spots booked"
    : m.prevBookingsN !== null
      ? `Spots booked ${inPeriod(r)} · ${m.prevBookingsN} ${theBefore(r)}`
      : `Spots booked ${inPeriod(r)}`;

  return (
    <>
      <div className="an3-bk-head">
        <p className="flex items-center" style={{ gap: 8 }}>
          <span className="an3-bk-n">{m.bookingsN}</span>
          {delta && (
            <span className="an3-delta" style={{ color: dCol, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
              {delta}
            </span>
          )}
        </p>
        <p className="an3-sub" style={{ marginTop: 6 }}>
          {sub}
        </p>
      </div>
      {early ? (
        <>
          <p className="an3-note" style={{ margin: "8px 20px 16px" }}>
            {m.bookingsN === 0 && m.totalSessionsEver === 1
              ? "Early data: no bookings on your first class yet. Trends, popular days and booking habits appear after 2 weeks."
              : `Early data: ${plural(m.bookingsN, "booking", "bookings")} so far. Trends, popular days and booking habits appear after 2 weeks.`}
          </p>
          {listing && <div style={{ margin: "-6px 20px 16px", display: "flex" }}>{listing}</div>}
        </>
      ) : (
        <BookingsData m={m} r={r} people={people} bkView={bkView} setBkView={setBkView} cs={cs} toggle={toggle} />
      )}
    </>
  );
}

function BookingsData({ m, r, people, bkView, setBkView, cs, toggle }: { m: ClassesModel; r: RangeIn; people: string; bkView: "time" | "dow"; setBkView: (v: "time" | "dow") => void; cs: Record<CsKey, boolean>; toggle: (k: CsKey) => void }) {
  const mx = Math.max(1, ...m.weeks.map((w) => Math.max(w.n, w.ghost ?? 0)));
  const nW = m.weeks.length;
  const hasGhost = m.weeks.some((w) => w.ghost !== null);
  const ghost = m.weeks
    .map((w, i) => (w.ghost === null ? null : `${(((i + 0.5) / nW) * 100).toFixed(1)},${(100 - (w.ghost / mx) * 74).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");
  const dowMax = Math.max(0, ...m.dow.map((d) => d.avg));
  const dowTop = dowMax > 0 ? m.dow.findIndex((d) => d.avg === dowMax) : -1;
  const over = r.key === "week" ? "this week" : r.key === "custom" ? "in this range" : `over ${periodWords(r)}`;
  const cap2 = bkView === "dow" ? `Average bookings per weekday ${over}.${dowTop >= 0 ? ` ${DAY_LONG[dowTop]} fills fastest.` : ""}` : hasGhost ? `Bookings per week. Dashed line: ${theBefore(r)}.` : "Bookings per week.";
  const fA = bkView === "time" ? 1 : 0;
  const fB = bkView === "dow" ? 1 : 0;
  const gap = nW <= 6 ? 14 : 6;

  const total = m.newCount + m.returningCount;
  const retPct = total ? Math.round((m.returningCount / total) * 100) : 0;
  const leadTop = m.lead.reduce((a, b, i) => (b.pct > m.lead[a].pct ? i : a), 0);
  const LEAD_LINE = ["Most people book the same day.", "Most people book 1 to 2 days ahead.", "Most people book 3 to 7 days ahead.", "Most people book over a week ahead."];

  return (
    <>
      <div style={{ padding: "6px 20px 14px" }}>
        <div role="tablist" aria-label="Bookings view" className="an3-pill">
          <span className="an3-pill-track" aria-hidden />
          <span className="an3-pill-thumb" aria-hidden style={{ transform: `translateX(${bkView === "dow" ? 72 : 0}px)` }} />
          {(
            [
              ["time", "Over time"],
              ["dow", "By day"],
            ] as const
          ).map(([k, label], i) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={bkView === k}
              className="an3-pill-tab"
              style={{ left: i ? 74 : 0, color: bkView === k ? "var(--k-pill-on)" : "var(--k-faint)" }}
              onClick={() => setBkView(k)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="an3-small" style={{ margin: "4px 0 8px" }}>
          {cap2}
        </p>
        <div className="an3-chart">
          <div className="an3-chart-layer" style={{ opacity: fA }} aria-hidden={bkView !== "time"}>
            <div className="an3-chart-bars" style={{ gridTemplateColumns: `repeat(${nW}, minmax(0, 1fr))`, gap }}>
              {m.weeks.map((w, i) => (
                <div key={i} className="an3-chart-col" style={{ gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{w.n}</span>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 42,
                      height: Math.round((w.n / mx) * 74 * fA),
                      borderRadius: "8px 8px 4px 4px",
                      background: i === nW - 1 ? "var(--k-pdark)" : "var(--k-primary)",
                      transition: `height 0.45s cubic-bezier(0.22,1,0.36,1) ${i * 30}ms`,
                    }}
                  />
                </div>
              ))}
            </div>
            {ghost && (
              <svg width="100%" height="100" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", left: 0, right: 0, top: 0, overflow: "visible" }}>
                <polyline points={ghost} fill="none" stroke="var(--k-ghost)" strokeWidth={2} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              </svg>
            )}
            <div className="an3-chart-axis" style={{ gridTemplateColumns: `repeat(${nW}, minmax(0, 1fr))`, gap }}>
              {m.weeks.map((w, i) => (
                <span key={i} style={{ fontSize: 10, textAlign: "center", color: "var(--k-faint)", whiteSpace: "nowrap" }}>
                  {nW > 6 && i % 2 === 1 ? "" : w.label}
                </span>
              ))}
            </div>
          </div>
          <div className="an3-chart-layer" style={{ opacity: fB }} aria-hidden={bkView !== "dow"}>
            <div className="an3-chart-bars" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
              {m.dow.map((d, i) => (
                <div key={i} className="an3-chart-col" style={{ gap: 3 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: i === dowTop ? "var(--k-pdark)" : "var(--k-faint)" }}>{fmtAvg(d.avg)}</span>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 26,
                      height: dowMax ? Math.round((d.avg / dowMax) * 74 * fB) : 0,
                      borderRadius: "7px 7px 3px 3px",
                      background: i === dowTop ? "var(--k-pdark)" : "var(--k-primary)",
                      transition: `height 0.45s cubic-bezier(0.22,1,0.36,1) ${i * 30}ms`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="an3-chart-axis" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
              {DAY_SHORT.map((d) => (
                <span key={d} style={{ fontSize: 9.5, textAlign: "center", color: "var(--k-faint)" }}>
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <span data-sec="nvr" className="an3-anchor" />
      <Coll id="nvr" title="New vs returning" line={total ? `${retPct}% of bookings come from returning ${people}.` : undefined} open={cs.nvr} onToggle={() => toggle("nvr")}>
        <p className="an3-small" style={{ margin: "10px 0 0" }}>
          {`Bookings ${inPeriod(r)}, by whether the person had booked with you before.`}
        </p>
        <div className="flex" style={{ height: 8, gap: 2, marginTop: 8 }} aria-hidden>
          {m.newCount > 0 && <span style={{ flex: m.newCount, background: "var(--k-primary)", borderRadius: m.returningCount ? "999px 0 0 999px" : 999 }} />}
          {m.returningCount > 0 && <span style={{ flex: m.returningCount, background: "var(--k-deep)", borderRadius: m.newCount ? "0 999px 999px 0" : 999 }} />}
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 8 }}>
          {(
            [
              ["New", m.newCount, "var(--k-primary)"],
              ["Returning", m.returningCount, "var(--k-deep)"],
            ] as const
          ).map(([t, n, c]) => (
            <div key={t} className="an3-tile" style={{ background: "var(--k-soft)" }}>
              <span className="flex items-center" style={{ gap: 4 }}>
                <span style={{ width: 8, height: 3, borderRadius: 999, background: c }} aria-hidden />
                <span className="an3-tile-n">{n}</span>
              </span>
              <span className="an3-tile-t">{t}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 2 }} />
      </Coll>

      <Coll id="lead" title="How far ahead people book" line={total ? LEAD_LINE[leadTop] : undefined} open={cs.lead} onToggle={() => toggle("lead")}>
        <p className="an3-small" style={{ margin: "10px 0 10px" }}>
          Time between booking and class start.
        </p>
        <div className="an3-lead">
          {m.lead.map((l) => (
            <div key={l.label}>
              <p style={{ fontSize: 15, fontWeight: 800, lineHeight: "18px", fontVariantNumeric: "tabular-nums" }}>{`${l.pct}%`}</p>
              <p style={{ fontSize: 9.5, lineHeight: "12px", color: "var(--k-faint)", marginTop: 3 }}>{l.label}</p>
              <div style={{ height: 3, borderRadius: 999, background: "var(--k-track)", marginTop: 7, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${l.pct}%`, background: "var(--k-primary)" }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 2 }} />
      </Coll>

      <Coll
        id="top"
        title="Top classes by bookings"
        line={m.top[0] ? `${m.top[0].title} leads with ${plural(m.top[0].n, "booking", "bookings")} ${inPeriod(r)}.` : undefined}
        open={cs.top}
        onToggle={() => toggle("top")}
        padding="14px 20px 6px"
      >
        <div style={{ height: 4 }} />
        {m.top.map((tc, i) => (
          <div key={tc.title} className="an3-top" style={{ borderTop: i ? "1px solid var(--k-divider)" : "none" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--k-faint)" }}>{i + 1}</span>
            <span className="min-w-0">
              <span className="block" style={{ fontSize: 12.5, fontWeight: 700, lineHeight: "16px" }}>
                {tc.title}
              </span>
              <span className="block" style={{ fontSize: 10.5, lineHeight: "14px", color: "var(--k-faint)" }}>
                {tc.sub}
              </span>
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 800, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{tc.n}</span>
          </div>
        ))}
        <div style={{ height: 6 }} />
      </Coll>
      <div className="flex items-start" style={{ margin: "4px 20px 16px", gap: 8, fontSize: 10.5, lineHeight: "14px", color: "var(--k-faint)" }}>
        <Info size={13} aria-hidden className="shrink-0" />
        <span>Cancelled bookings aren't counted here yet.</span>
      </div>
    </>
  );
}

// ===========================================================================
// Peak times card

function PeakBody({
  m,
  people,
  cell,
  setCell,
  fullDay,
  setFullDay,
  cs,
  toggle,
}: {
  m: ClassesModel;
  people: string;
  cell: string | null;
  setCell: (k: string) => void;
  fullDay: boolean;
  setFullDay: (v: boolean) => void;
  cs: Record<CsKey, boolean>;
  toggle: (k: CsKey) => void;
}) {
  const data = m.state === "data";
  const rows = fullDay ? fullDayRows(m.heat) : m.heat;
  const bySlot = new Map(m.slots.map((s) => [s.key, s]));
  const busiest = [...m.slots].sort((a, b) => b.pct - a.pct || a.col - b.col);
  const defaultCell = m.state === "empty" ? null : data ? busiest[0]?.key ?? null : [...m.slots].sort((a, b) => a.sessions[0].date.localeCompare(b.sessions[0].date))[0]?.key ?? null;
  const selKey = cell && bySlot.has(cell) ? cell : defaultCell;
  const sel = selKey ? bySlot.get(selKey) ?? null : null;

  const shade = (p: number) => `rgb(var(--k-shade) / ${(0.12 + (p / 100) * 0.88).toFixed(2)})`;

  return (
    <>
      <div style={{ padding: "12px 12px 10px" }}>
        <p className="an3-small" style={{ margin: "0 2px 8px" }}>
          Weekday by start time. Tap a slot for its sessions.
        </p>
        <div className="an3-heat">
          <span />
          {DAY_LETTERS.map((d, i) => (
            <span key={i} className="an3-heat-day" aria-hidden>
              {d}
            </span>
          ))}
          {rows.map((row) => (
            <HeatRowCells key={row.start} label={row.label} filler={!!row.filler} cells={row.cells} selKey={selKey} shade={shade} onPick={setCell} />
          ))}
        </div>
        <div className="an3-heat-legend">
          <span className="flex items-center" style={{ gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, border: "1px dashed var(--k-tert)", boxSizing: "border-box" }} aria-hidden />
            None
          </span>
          <span className="flex items-center" style={{ gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--k-card)", border: "1.5px solid var(--k-primary)", boxSizing: "border-box" }} aria-hidden />
            0%
          </span>
          <span className="flex items-center" style={{ gap: 4 }}>
            <span style={{ width: 40, height: 6, borderRadius: 999, background: `linear-gradient(90deg,${shade(5)},${shade(100)})` }} aria-hidden />
            Full
          </span>
          <button type="button" className="tap flex items-center" aria-expanded={fullDay} onClick={() => setFullDay(!fullDay)} style={{ marginLeft: "auto", gap: 2, minHeight: 32, fontWeight: 800, color: "var(--k-pdark)" }}>
            {fullDay ? "Scheduled hours" : "Full day"}
            <span className="flex" style={{ transform: fullDay ? "rotate(180deg)" : "none" }} aria-hidden>
              <ChevronDown size={12} />
            </span>
          </button>
        </div>
      </div>
      {sel && <CellDetail sl={sel} m={m} people={people} />}
      {!data && (
        <p className="an3-note" style={{ margin: "0 16px 16px" }}>
          {m.state === "empty"
            ? `Fills in as ${people} book. Nothing to show yet.`
            : m.slots.length === 1
              ? "Early data: one slot so far. Strong and weak windows appear after 2 weeks."
              : `Early data: ${m.slots.length} slots so far. Strong and weak windows appear after 2 weeks.`}
        </p>
      )}
      {data && <PeakData m={m} busiest={busiest} setCell={setCell} selKey={selKey} cs={cs} toggle={toggle} />}
    </>
  );
}

function HeatRowCells({ label, filler, cells, selKey, shade, onPick }: { label: string; filler: boolean; cells: { key: string; pct: number | null }[]; selKey: string | null; shade: (p: number) => string; onPick: (k: string) => void }) {
  return (
    <>
      <span className="an3-heat-row">{label}</span>
      {cells.map((c, col) =>
        c.pct === null ? (
          <span key={c.key} className="an3-cell" aria-hidden style={{ border: `1px dashed ${filler ? "var(--k-dash-empty)" : "var(--k-dash-cell)"}` }} />
        ) : (
          <button
            key={c.key}
            type="button"
            className="an3-cell tap"
            aria-pressed={selKey === c.key}
            aria-label={`${DAY_LONG[col]} ${label}, ${c.pct}% booked`}
            onClick={() => onPick(c.key)}
            style={{
              background: c.pct === 0 ? "var(--k-card)" : shade(c.pct),
              border: c.pct === 0 ? "1.5px solid var(--k-primary)" : "1px solid transparent",
              boxShadow: selKey === c.key ? "0 0 0 2px var(--k-ink)" : "none",
              color: c.pct >= 60 ? "var(--k-heat-on)" : "var(--k-ink)",
            }}
          >
            {c.pct}
          </button>
        )
      )}
    </>
  );
}

function CellDetail({ sl, m, people }: { sl: Slot; m: ClassesModel; people: string }) {
  const k = sl.sessions.length;
  const who = [...new Set(sl.sessions.map((s) => s.who).filter(Boolean))].join(", ");
  const spots = Math.max(...sl.sessions.map((s) => s.cap));
  const sub = [k === 1 ? "1 session" : `${k} sessions in this range`, who, `${spots} spots`].filter(Boolean).join(" · ");
  const ps = sl.sessions.map((s) => s.pct);
  let trend: string;
  if (k === 1) trend = m.totalSessionsEver === 1 ? `Your first class. Bookings show here as ${people} book.` : "New slot. Too early to read a trend.";
  else if (sl.sessions.every((s) => s.full)) trend = "Full every session in this range.";
  else if (sl.pct >= 70) trend = "Steady: at or above the 70% target.";
  else if (ps[ps.length - 1] > ps[0] + 5) trend = "Edging up, still under 70%.";
  else if (ps[ps.length - 1] < ps[0] - 5) trend = "Slipping, and under the 70% target.";
  else trend = "Steady, but under the 70% target.";
  return (
    <div className="an3-cell-d" aria-live="polite">
      <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 800 }}>{`${slotLong(sl)} · ${titlesOf(sl.sessions)}`}</p>
        <p style={{ fontSize: 12, fontWeight: 800, color: INK[pctInk(sl.pct)], whiteSpace: "nowrap" }}>{`${sl.pct}% avg`}</p>
      </div>
      <p className="an3-small" style={{ marginTop: 2 }}>
        {sub}
      </p>
      <div className="flex items-end" style={{ gap: 6, height: 28, marginTop: 8 }} aria-hidden>
        {sl.sessions.map((s, i) => (
          <div key={s.id} className="flex flex-col items-center justify-end" style={{ flex: 1, height: "100%", gap: 2 }}>
            <div style={{ width: "100%", height: Math.max(3, Math.round((s.pct / 100) * 28)), borderRadius: "5px 5px 2px 2px", background: s.pct === 0 ? "var(--k-track)" : TONE[pctTone(s.pct)] }} />
            <span style={{ fontSize: 9, color: "var(--k-faint)" }}>{`W${i + 1}`}</span>
          </div>
        ))}
      </div>
      <p className="an3-coll-line" style={{ fontSize: 11, lineHeight: "15px", marginTop: 6 }}>
        {trend}
      </p>
    </div>
  );
}

function PeakData({ m, busiest, setCell, selKey, cs, toggle }: { m: ClassesModel; busiest: Slot[]; setCell: (k: string) => void; selKey: string | null; cs: Record<CsKey, boolean>; toggle: (k: CsKey) => void }) {
  const n = busiest.length;
  const hi = busiest.slice(0, Math.min(3, Math.ceil(n / 2)));
  const lo = [...busiest].reverse().slice(0, Math.min(3, Math.floor(n / 2)));
  const note = (sl: Slot) => `${titlesOf(sl.sessions)}, ${plural(sl.sessions.length, "session", "sessions")}`;
  const label = (sl: Slot) => `${DAY_SHORT[sl.col]} ${timeLabel(sl.start)}`;

  const high = m.slots.filter((s) => s.pct >= 90);
  const low = m.slots.filter((s) => s.pct < 60).sort((a, b) => a.pct - b.pct);
  const mid = m.slots.filter((s) => s.pct >= 60 && s.pct < 90);
  const groups = [
    { n: high.length, col: "var(--k-full)", t: "High demand, few sessions", s: "Full or close to full in this range. A second session nearby could meet demand you're turning away.", slots: high },
    { n: mid.length, col: "var(--k-primary)", t: "Balanced", s: "Average fill between 60% and 90%. Keep these as they are.", slots: [] as Slot[] },
    { n: low.length, col: "var(--k-caution-bar)", t: "Many sessions, low fill", s: "Average fill under 60%. Fewer or later sessions could lift fill without losing bookings.", slots: low },
  ];
  const highNames = high.slice(0, 2).map((s) => s.label);
  const dsLine = [
    highNames.length ? `${highNames.join(" and ")} ${highNames.length === 1 ? "needs" : "need"} more sessions.` : "",
    low.length ? `${plural(low.length, "slot runs", "slots run")} under 60%.` : "",
  ]
    .filter(Boolean)
    .join(" ") || "Every slot runs between 60% and 90%.";

  return (
    <>
      <div className="an3-peaks">
        {(
          [
            ["Busiest times", hi, "var(--k-good)"],
            ["Quietest times", lo, "var(--k-caution)"],
          ] as const
        ).map(([title, list, col]) => (
          <div key={title} className="min-w-0">
            <p className="an3-peaks-h" style={{ color: col }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: col }} aria-hidden />
              {title}
            </p>
            <div className="flex flex-col" style={{ gap: 8 }}>
              {list.map((sl) => (
                <div key={sl.key}>
                  <p className="flex items-baseline justify-between" style={{ gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, lineHeight: "16px", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{label(sl)}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 800, lineHeight: "16px", color: col, fontVariantNumeric: "tabular-nums" }}>{`${sl.pct}%`}</span>
                  </p>
                  <p style={{ fontSize: 10.5, lineHeight: "14px", color: "var(--k-faint)" }}>{note(sl)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="an3-rev">
        <span className="flex" style={{ color: "var(--k-tert)" }} aria-hidden>
          <Lock size={13} />
        </span>
        <p className="flex-1 min-w-0" style={{ fontSize: 11.5, lineHeight: "15px", fontWeight: 800, whiteSpace: "nowrap" }}>
          Revenue per slot
        </p>
        <span className="an3-soon">Arrives with payments</span>
      </div>
      <span data-sec="ds" className="an3-anchor" />
      <Coll id="ds" title="Demand vs supply" line={dsLine} open={cs.ds} onToggle={() => toggle("ds")}>
        <p className="an3-small" style={{ margin: "10px 0 12px" }}>
          {`Your ${plural(m.slots.length, "weekly slot", "weekly slots")}, by how demand matches the sessions offered. Tap a slot to open it on the heatmap.`}
        </p>
        <div className="flex" style={{ height: 12, gap: 2 }} aria-hidden>
          {groups.map((g, i) =>
            g.n ? <span key={i} style={{ flex: g.n, background: g.col, borderRadius: i === 0 ? "999px 0 0 999px" : i === 2 ? "0 999px 999px 0" : 0 }} /> : null
          )}
        </div>
        <div style={{ marginTop: 6 }}>
          {groups.map((g, i) => (
            <div key={g.t} className="an3-hi" style={{ borderTop: i ? "1px solid var(--k-divider)" : "none" }}>
              <span className="an3-hi-bar" style={{ background: g.col }} aria-hidden />
              <span className="an3-hi-n">{g.n}</span>
              <div className="min-w-0">
                <p className="an3-hi-t">{g.t}</p>
                <p className="an3-coll-line" style={{ marginTop: 2 }}>
                  {g.s}
                </p>
                {g.slots.length > 0 && (
                  <div className="flex flex-wrap" style={{ gap: 6, marginTop: 8 }}>
                    {g.slots.map((sl) => {
                      const on = selKey === sl.key;
                      return (
                        <button
                          key={sl.key}
                          type="button"
                          className="an3-chip tap"
                          aria-pressed={on}
                          onClick={() => setCell(sl.key)}
                          style={{ background: on ? "var(--k-pale)" : "var(--k-soft)", border: `1px solid ${on ? "var(--k-primary)" : "transparent"}` }}
                        >
                          <span>{`${DAY_SHORT[sl.col]} ${slotLabel(sl.start)}`}</span>
                          <span style={{ color: INK[pctInk(sl.pct)] }}>{`${sl.pct}%`}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 4 }} />
      </Coll>
    </>
  );
}
