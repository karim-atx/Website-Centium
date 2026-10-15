import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, Banknote, CalendarCheck, ChartLine, Filter, Info, Sprout, Star, TrendingUp, UserPlus, Users } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useIsDark } from "../../../../hooks/useIsDark";
import { useBack } from "../../../../hooks/useBack";
import { textPx } from "../../../../theme/textSize";
import { CtaButton } from "../../../ui/PinnedCta";
import { INK } from "../../proInk";
import { ProChart } from "../../ProChart";
import { EmptyState } from "../../EmptyState";
import { ComingSoon } from "../../ComingSoon";
import { OfflineLine, ProCardSkeleton, ProError } from "../../states";
import { Group, RangeTabs } from "../parts";
import type { PageRange } from "../panelProps";
import { CHead, NumBoxes, RangeTrack, type NumBoxData } from "../../forms/moKit";
import { PRO_ROUTES } from "../../subtypeLanes";
import { fetchSessions, localIso, shiftIso } from "../../../../services/pro/home";
import { fetchEventOutcomes } from "../../../../services/pro/clientPage";
import { fetchEnquiries, fetchMyReviews, fetchPracticeStart, fetchPracticeTotals, fetchStageHistory, type Enquiry, type PracticeTotals } from "../../../../services/pro/practiceInsights";
import {
  OUTCOME_MIN_CLIENTS,
  SESSION_TREND_WEEKS,
  activeAt,
  funnel,
  noShowShare,
  ratingsByMonth,
  retentionCurve,
  rosterByMonth,
  rosterInsight,
  sessionsByWeek,
  weeksSince,
  type Outcome,
  type StageChange,
} from "./practiceModel";

interface Session {
  date: string;
  outcome: Outcome;
}

const RANGE_START: Record<PageRange, (today: string) => string> = {
  today: (t) => t,
  week: (t) => {
    const d = new Date(`${t}T00:00:00`);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return localIso(d);
  },
  month: (t) => `${t.slice(0, 8)}01`,
};
const RANGE_WORD: Record<PageRange, string> = { today: "Today", week: "This week", month: "This month" };
const fmtShort = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/**
 * Release 3 · MO19 v3 Practice insights (gen/r16.js practice16, nboxes16,
 * grp10, retention16, sessions16, pipeline16, money16; r15.js practice15
 * empty): CHead "Practice insights" / "How your practice is doing"; the
 * Today / Week / Month track at the right (range5); three number boxes
 * (Active clients, Sessions, Still active after 3 months); the early-data
 * note; the five groups, all collapsed: Retention, Client outcomes,
 * Sessions, Enquiries to clients, Earnings and ratings.
 *
 * What each shows comes from a reader (services/pro/practiceInsights):
 * retention and the outcome group stay hidden below 5 clients (HANDOVER i);
 * outcomes have no per-client goal reader (Coming soon); income needs
 * payments, which are out of scope (state only). Insight lines state
 * measured facts only (FINAL_PLAN 3 §1.8 templates): no causes, no advice.
 */
export const PracticeInsightsScreen: React.FC = () => {
  const { authUserId, professionalClients } = useApp();
  const dark = useIsDark();
  const navigate = useNavigate();
  const back = useBack(PRO_ROUTES.more);
  const today = localIso(new Date());
  const nowIso = new Date().toISOString();
  const [range, setRange] = useState<PageRange>("month");
  const [open, setOpen] = useState<string | null>(null);
  const [totals, setTotals] = useState<PracticeTotals | null | undefined>(undefined);
  const [history, setHistory] = useState<StageChange[] | null>(null);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [enquiries, setEnquiries] = useState<Enquiry[] | null>(null);
  const [reviews, setReviews] = useState<{ rating: number; createdAt: string }[] | null>(null);
  const [started, setStarted] = useState<string | null>(null);
  const [state, setState] = useState<"ok" | "error" | "offline">("ok");
  const [nonce, setNonce] = useState(0);
  const [rosterRange, setRosterRange] = useState<"6M" | "1Y">("6M");
  const [sessRange, setSessRange] = useState<"4W" | "12W" | "6M">("12W");
  const [pipeRange, setPipeRange] = useState<"3M" | "6M" | "1Y">("6M");
  const [rateRange, setRateRange] = useState<"6M" | "1Y">("6M");

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    const yearAgo = shiftIso(today, -366);
    void fetchPracticeTotals().then((r) => {
      if (!live) return;
      if (!r.ok) {
        setState(r.offline ? "offline" : "error");
        return;
      }
      setState("ok");
      setTotals(r.data);
    });
    void fetchStageHistory(authUserId).then((r) => live && setHistory(r.ok ? r.data : []));
    void fetchEnquiries(authUserId, new Date(`${yearAgo}T00:00:00`).toISOString()).then((r) => live && setEnquiries(r.ok ? r.data : []));
    void fetchMyReviews(authUserId, new Date(`${yearAgo}T00:00:00`).toISOString()).then((r) => live && setReviews(r.ok ? r.data : []));
    void fetchPracticeStart(authUserId).then((s) => live && setStarted(s));
    void fetchSessions(authUserId, shiftIso(today, -190), today).then(async (r) => {
      if (!live) return;
      if (!r.ok) return setSessions([]);
      const withClient = r.data.filter((s) => s.client);
      const outcomes = await fetchEventOutcomes([...new Set(withClient.map((s) => s.id))]);
      if (live) setSessions(withClient.map((s) => ({ date: s.date, outcome: (outcomes[s.id] ?? null) as Outcome })));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, nonce]);

  const weeksIn = started ? weeksSince(started, nowIso) : null;
  const early = weeksIn != null && weeksIn < 13;
  const months = rosterRange === "1Y" ? 12 : 6;
  const roster = useMemo(() => (history ? rosterByMonth(history, today, months, nowIso) : null), [history, today, months, nowIso]);
  const curve = useMemo(() => (history ? retentionCurve(history, nowIso) : null), [history, nowIso]);
  const weeks = sessRange === "4W" ? 4 : sessRange === "12W" ? 12 : 26;
  const perWeek = useMemo(() => (sessions ? sessionsByWeek(sessions, today, weeks) : null), [sessions, today, weeks]);
  const pipeDays = pipeRange === "3M" ? 91 : pipeRange === "6M" ? 182 : 365;
  const pipe = useMemo(() => (enquiries && history ? funnel(enquiries.filter((e) => e.requestedAt >= new Date(`${shiftIso(today, -pipeDays)}T00:00:00`).toISOString()), history, nowIso) : null), [enquiries, history, today, pipeDays, nowIso]);
  const ratings = useMemo(() => (reviews ? ratingsByMonth(reviews, today, rateRange === "1Y" ? 12 : 6) : null), [reviews, today, rateRange]);

  if (state !== "ok" && totals === undefined) return <ProError onRetry={reload} />;
  if (totals === undefined || history === null)
    return (
      <div>
        <CHead title="Practice insights" sub="How your practice is doing" onBack={back} />
        <div className="flex flex-col" style={{ gap: 10 }}>
          <ProCardSkeleton lines={2} height={96} />
          <ProCardSkeleton lines={2} height={64} />
          <ProCardSkeleton lines={2} height={64} />
        </div>
      </div>
    );

  const empty = (totals?.clientsCoached ?? 0) === 0 && history.length === 0 && professionalClients.length === 0;
  if (empty)
    return (
      <div>
        <CHead title="Practice insights" sub="How your practice is doing" onBack={back} />
        <EmptyState icon={ChartLine} title="Insights appear with your first clients" line="Active clients, sessions, retention and reviews fill in as you work.">
          <CtaButton size="base" variant="secondary" icon={<UserPlus size={15} />} label="Add a client" onClick={() => navigate(PRO_ROUTES.clients)} />
        </EmptyState>
      </div>
    );

  // ------------------------------------------------------------ the boxes
  const start = RANGE_START[range](today);
  const startIso = new Date(`${start}T00:00:00`).toISOString();
  const activeNow = totals?.activeClients ?? activeAt(history, nowIso);
  const activeThen = activeAt(history, startIso);
  const inRange = (sessions ?? []).filter((s) => s.date >= start && s.date <= today);
  const delivered = inRange.filter((s) => s.outcome !== "no_show" && s.outcome !== "late_cancel").length;
  const span = Math.round((Date.parse(`${today}T00:00:00`) - Date.parse(`${start}T00:00:00`)) / 86400000) + 1;
  const prevStart = shiftIso(start, -span);
  const prev = (sessions ?? []).filter((s) => s.date >= prevStart && s.date < start && s.outcome !== "no_show" && s.outcome !== "late_cancel").length;
  const ret = totals?.retention90 ?? null;
  const boxes: NumBoxData[] = [
    { label: "Active clients", value: String(activeNow), delta: !early && activeNow !== activeThen ? signed(activeNow - activeThen) : null, dir: !early && activeNow !== activeThen ? (activeNow > activeThen ? "up" : "down") : null, line: `Since ${fmtShort(start)}`, spark: roster && !early ? roster.map((m) => m.active) : null },
    { label: "Sessions", value: sessions ? String(delivered) : "–", delta: sessions && !early && delivered !== prev ? signed(delivered - prev) : null, dir: sessions && !early && delivered !== prev ? (delivered > prev ? "up" : "down") : null, line: RANGE_WORD[range] },
    { label: "Still active after 3 months", value: ret == null ? "–" : String(ret), unit: ret == null ? undefined : "%", line: ret == null ? "After 3 months of data" : "Of clients who started 3 months ago or more" },
  ];

  // ------------------------------------------------------------ the groups
  const monthSessions = (sessions ?? []).filter((s) => s.date >= `${today.slice(0, 8)}01` && s.date <= today);
  const monthDelivered = monthSessions.filter((s) => s.outcome !== "no_show" && s.outcome !== "late_cancel").length;
  const ns = noShowShare(monthSessions);
  const sessEarly = weeksIn != null && weeksIn < SESSION_TREND_WEEKS;
  const activeCount = activeNow;
  const avg = totals?.averageRating ?? null;
  const reviewCount = totals?.reviewCount ?? 0;

  const lines = {
    ret: ret != null ? `${ret}% still active after 3 months` : "Appears after 3 months",
    out: activeCount < OUTCOME_MIN_CLIENTS ? `${activeCount} client${activeCount === 1 ? "" : "s"} · appears with ${OUTCOME_MIN_CLIENTS}` : "Coming soon",
    ses: sessions == null ? "Loading…" : sessEarly ? `${monthDelivered} session${monthDelivered === 1 ? "" : "s"} · trend after 4 weeks` : `${monthDelivered} this month${ns != null ? ` · ${ns}% no-shows` : ""}`,
    pip: !pipe ? "Loading…" : pipe.hirePct == null ? "No enquiries yet" : early ? `${pipe.enquiries} enquir${pipe.enquiries === 1 ? "y" : "ies"}, ${pipe.hired} hired` : `${pipe.hirePct}% of enquiries hire you`,
    mon: reviewCount ? `${avg != null ? `${avg.toFixed(1)} stars · ` : ""}${reviewCount} review${reviewCount === 1 ? "" : "s"}` : "No reviews yet",
  };

  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));
  const rCol = dark ? "#C3B3FB" : "#5F5093";

  return (
    <div style={{ paddingBottom: 120 }}>
      <CHead title="Practice insights" sub="How your practice is doing" onBack={back} />
      <div className="flex justify-end" style={{ marginBottom: 10 }}>
        <RangeTabs value={range} onChange={setRange} />
      </div>
      {state === "offline" && <OfflineLine />}
      <NumBoxes boxes={boxes} />
      {early && weeksIn != null && (
        <div className="flex" style={{ borderRadius: 16, background: INK.soft, padding: "12px 14px", marginBottom: 12, gap: 10 }}>
          <Sprout size={16} strokeWidth={2} aria-hidden style={{ color: "#4F8F8A", flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.5 }}>{`You started ${weeksIn === 0 ? "this week" : weeksIn === 1 ? "1 week ago" : `${weeksIn} weeks ago`}. Trends fill in as you work: sessions after 4 weeks, retention after 3 months.`}</span>
        </div>
      )}

      <Group id="ret" icon={Users} title="Retention" line={lines.ret} open={open === "ret"} onToggle={() => toggle("ret")}>
        {curve && curve.some((p) => p.pct != null) ? (
          <ProChart
            flat
            title="Still active after"
            question="How long do clients stay with you?"
            questionIcon
            x={["Start", ...curve.map((p) => `${p.months} mo`)]}
            min={0}
            max={100}
            series={[{ key: "ret", label: "Clients who started", type: "line", color: rCol, values: [100, ...curve.map((p) => p.pct)] }]}
            tooltip={(i) => (i === 0 ? null : curve[i - 1].pct == null ? null : { title: `${curve[i - 1].months} months`, lines: [`${curve[i - 1].pct}% still active`, `${curve[i - 1].kept} of ${curve[i - 1].of} who started`] })}
            summary={`Still active after: ${curve.filter((p) => p.pct != null).map((p) => `${p.months} months ${p.pct}%`).join(", ")}.`}
            scrubHint="Drag sideways to scrub, tap a point to pin it"
          />
        ) : (
          <p style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.5, marginBottom: 10 }}>Still active after shows once 5 clients have been with you for a month.</p>
        )}
        <div style={{ height: 12 }} />
        {roster && (
          <ProChart
            flat
            title="Active clients"
            question="Is the roster growing faster than clients finish?"
            questionIcon
            right={<RangeTrack label="Active clients range" items={["6M", "1Y"] as const} value={rosterRange} onChange={setRosterRange} />}
            x={roster.map((m) => m.label)}
            min={0}
            max={Math.max(1, ...roster.map((m) => Math.max(m.active, m.added, m.completed)))}
            series={[
              { key: "new", label: "New", type: "bar", color: INK.pr, values: roster.map((m) => m.added) },
              { key: "done", label: "Completed", type: "bar", color: INK.teal, values: roster.map((m) => m.completed) },
              { key: "act", label: "Active", type: "line", color: rCol, values: roster.map((m) => m.active) },
            ]}
            tooltip={(i) => ({ title: roster[i].long, lines: [`${roster[i].active} active`, `${roster[i].added} new · ${roster[i].completed} completed`] })}
            insight={rosterInsight(roster) ?? undefined}
            summary={`Active clients by month: ${roster.map((m) => `${m.label} ${m.active}`).join(", ")}.`}
            scrubHint="Drag sideways to scrub, tap a point to pin it"
          />
        )}
      </Group>

      <Group id="out" icon={TrendingUp} title="Client outcomes" line={lines.out} open={open === "out"} onToggle={() => toggle("out")}>
        <ComingSoon line={activeCount < OUTCOME_MIN_CLIENTS ? `Client progress shows once you have ${OUTCOME_MIN_CLIENTS} active clients.` : "Client progress needs each client's goal measure, which Centium doesn't keep yet."} />
      </Group>

      <Group id="ses" icon={CalendarCheck} title="Sessions" line={lines.ses} open={open === "ses"} onToggle={() => toggle("ses")}>
        {perWeek ? (
          <ProChart
            flat
            title="Sessions per week"
            question="Are clients turning up?"
            questionIcon
            right={<RangeTrack label="Sessions range" items={["4W", "12W", "6M"] as const} value={sessRange} onChange={setSessRange} />}
            x={perWeek.map((w) => fmtShort(w.start))}
            min={0}
            max={Math.max(1, ...perWeek.map((w) => w.delivered))}
            series={[{ key: "del", label: "Delivered", type: "bar", color: INK.pr, values: perWeek.map((w) => w.delivered) }]}
            tooltip={(i) => ({
              title: `Week of ${fmtShort(perWeek[i].start)}`,
              lines: [`${perWeek[i].delivered} delivered`, perWeek[i].noShowPct == null ? "No sessions booked" : `No-show ${perWeek[i].noShowPct}% · late cancel ${perWeek[i].lateCancelPct}%`],
            })}
            insight={(() => {
              const all = (sessions ?? []).filter((s) => s.date >= perWeek[0].start && s.date <= today);
              const p = noShowShare(all);
              return p == null ? undefined : `No-shows: ${p}% of sessions.`;
            })()}
            summary={`Sessions delivered per week: ${perWeek.map((w) => w.delivered).join(", ")}.`}
            scrubHint="Drag sideways to scrub, tap a point to pin it"
          />
        ) : (
          <ProCardSkeleton lines={3} />
        )}
      </Group>

      <Group id="pip" icon={Filter} title="Enquiries to clients" line={lines.pip} open={open === "pip"} onToggle={() => toggle("pip")}>
        <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 14, marginBottom: 12 }}>
          <div className="flex items-center justify-between" style={{ gap: 8 }}>
            <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>From enquiry to active client</p>
            <RangeTrack label="Enquiries range" items={["3M", "6M", "1Y"] as const} value={pipeRange} onChange={setPipeRange} />
          </div>
          <p className="flex" style={{ gap: 5, fontSize: textPx(11.5), color: INK.chF, margin: "4px 0 12px" }}>Where do people drop off?</p>
          {pipe ? <FunnelBars pipe={pipe} dark={dark} /> : <ProCardSkeleton lines={3} />}
        </div>
      </Group>

      <Group id="mon" icon={Banknote} title="Earnings and ratings" line={lines.mon} open={open === "mon"} onToggle={() => toggle("mon")}>
        <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>Payments confirmed</p>
          <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 1 }}>Is income growing month to month?</p>
          <p className="flex" style={{ gap: 6, fontSize: textPx(11), color: INK.chF, lineHeight: 1.45, marginTop: 10, padding: "8px 10px", borderRadius: 10, background: INK.soft }}>
            <Info size={12} strokeWidth={2} aria-hidden className="shrink-0" style={{ marginTop: 2 }} />
            Payments in the app are coming soon, so there's no income to show yet.
          </p>
        </div>
        {reviewCount === 0 && <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 12 }}>Ratings show here after your first review.</p>}
        {ratings && reviewCount > 0 && (
          <ProChart
            flat
            title="Ratings"
            question="Are clients happier over time?"
            questionIcon
            right={
              <span className="inline-flex items-center" style={{ gap: 8 }}>
                {avg != null && (
                  <span className="inline-flex items-center" style={{ gap: 3, fontSize: textPx(13), fontWeight: 800, color: INK.ch }}>
                    <Star size={12} strokeWidth={2} aria-hidden fill="#D9A441" style={{ color: "#D9A441" }} />
                    {avg.toFixed(1)}
                  </span>
                )}
                <RangeTrack label="Ratings range" items={["6M", "1Y"] as const} value={rateRange} onChange={setRateRange} />
              </span>
            }
            x={ratings.map((m) => m.label)}
            min={0}
            max={5}
            series={[
              { key: "n", label: "Reviews", type: "bar", color: INK.soft, values: ratings.map((m) => m.count) },
              { key: "avg", label: "Average rating", type: "line", color: "#D9A441", values: ratings.map((m) => m.average) },
            ]}
            tooltip={(i) => ({ title: ratings[i].long, lines: ratings[i].average == null ? ["No reviews"] : [`${ratings[i].average} average`, `${ratings[i].count} review${ratings[i].count === 1 ? "" : "s"}`] })}
            summary={reviewCount ? `Average rating ${avg?.toFixed(1)} from ${reviewCount} reviews.` : "No reviews yet."}
            scrubHint="Drag sideways to scrub, tap a point to pin it"
          />
        )}
      </Group>
    </div>
  );
};

/** pipeline16: bars 34 high r10 sized by the share of enquiries (28% minimum), 14 / 800; the drop lines 11.5 / 800 with the arrow 12. */
const FunnelBars: React.FC<{ pipe: ReturnType<typeof funnel>; dark: boolean }> = ({ pipe, dark }) => {
  if (!pipe.enquiries) return <p style={{ fontSize: textPx(12), color: INK.chF }}>No enquiries in this range.</p>;
  const steps: { label: string; sub: string; n: number | null }[] = [
    { label: "Enquiries", sub: "From your profile, Explore and the care network", n: pipe.enquiries },
    { label: "Hired", sub: "Chose a plan", n: pipe.hired },
    { label: "Still active after 30 days", sub: pipe.stayed == null ? "Shows 30 days after a hire" : `Of ${pipe.stayedOf} hired 30 days ago or more`, n: pipe.stayed },
  ];
  const fills = [INK.prPale, INK.pr, dark ? "#C3B3FB" : "#5F5093"];
  return (
    <div>
      {steps.map((s, i) => {
        const w = s.n == null ? 28 : Math.max(28, (s.n / pipe.enquiries) * 62);
        const prev = i ? steps[i - 1].n : null;
        const pct = i && s.n != null && prev ? Math.round((100 * s.n) / (i === 2 ? pipe.stayedOf || prev : prev)) : null;
        return (
          <React.Fragment key={s.label}>
            {i > 0 && (
              <div className="flex items-center" style={{ gap: 6, padding: "4px 0 4px 10px" }}>
                <ArrowDown size={12} strokeWidth={2.4} aria-hidden style={{ color: INK.chF }} />
                <span style={{ fontSize: textPx(11.5), fontWeight: 800, color: INK.ch }}>{pct == null ? "–" : `${pct}%`}</span>
                <span style={{ fontSize: textPx(11), color: INK.chF }}>{i === 1 ? "hire you" : "stay past the first month"}</span>
              </div>
            )}
            <div className="flex items-center" style={{ gap: 10 }}>
              <span className="flex items-center shrink-0" style={{ width: `${w}%`, height: 34, borderRadius: 10, background: fills[i], padding: "0 10px", fontSize: textPx(14), fontWeight: 800, color: i ? (dark ? "#0D0B1A" : "#FFFFFF") : INK.prDeep, fontVariantNumeric: "tabular-nums" }}>
                {s.n == null ? "–" : s.n}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block" style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.ch }}>
                  {s.label}
                </span>
                <span className="block truncate" style={{ fontSize: textPx(10.5), color: INK.chF }}>
                  {s.sub}
                </span>
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
