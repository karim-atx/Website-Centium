import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  MessageCircle,
  Reply,
  Star,
} from "lucide-react";
import { SegmentedTabs } from "../../../components/ui/SegmentedTabs";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import {
  ScrubChart,
  type ScrubChartConfig,
} from "../../../components/charts/ScrubChart";
import { useBusiness } from "../../../components/business-more/useBusiness";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { useAnalytics as useShellAnalytics } from "../analyticsContext";
import type { BizKind } from "../../../components/business-more/kind";
import { useOnline } from "../../../hooks/useOnline";
import { clock12 } from "../../../utils/time12";
import {
  deleteReply,
  fetchBusinessReviews,
  fetchMyReports,
  fetchReviewMetrics,
  inFlagQueue,
  markReviewHandled,
  reputationError,
  type BizReview,
  type BizReviews,
  type MyReport,
} from "../../../services/reputation";
import {
  presetRange,
  previousOf,
  rangeLine,
  type AnalyticsRange,
  type RangeKey,
} from "../analyticsRange";
import { CustomRangeSheet } from "../CustomRangeSheet";
import { useOpsToast } from "../../business-ops/store/opsKit";
import {
  MIN_FOR_RATING,
  allReviewsLine,
  distLines,
  filterReviews,
  flagLine,
  healthLines,
  heroLead,
  instructorsOf,
  metricsOf,
  replyTimeTone,
  reviewTag,
  signed,
  starsText,
  weekSeries,
  type FilterKey,
  type ServerMetrics,
} from "./reputationModel";
import { FlagLine, INJURY_LINE, ReviewRow, Stars } from "./parts";

/**
 * The flag card's reason line (OURS-AN13-flag-queue row 4) from flag_kind
 * (B14 follow-up): injury is AN13-011 row 4a's wording verbatim
 * (KEEP-SAFETY); harassment the OURS line; otherwise our own report, or
 * "Centium is reviewing".
 */
const MESSAGED_KEY = "centium.reputation.messaged";
/** Reviews messaged privately in this tab session (OURS-AN13-flag-queue row 7's "once messaged"). */
function readMessaged(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(MESSAGED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}
function rememberMessaged(id: string): Set<string> {
  const next = readMessaged().add(id);
  try {
    sessionStorage.setItem(MESSAGED_KEY, JSON.stringify([...next]));
  } catch {
    /* the button then shows after a reply only */
  }
  return next;
}

function flagText(r: BizReview, reportedAt: string | null): string {
  if (r.flagKind === "injury") return INJURY_LINE;
  if (r.flagKind === "harassment" && !reportedAt) return "Mentions harassment or threats. Read it yourself before replying.";
  return flagLine(reportedAt);
}
import { ReportSheet, ReviewComposer, type ComposerMode } from "./ReviewSheets";
import "../shell/analytics.css";
import "./an13.css";

// AN13 · Analytics › Reputation (AnInsightsV3 page="reputation"): its own
// page with Back to Analytics (not the shell chrome), range tabs, Metrics /
// Reviews & replies, the ScrubChart, the collapsibles, the review list with
// the flag queue and the reply / report sheets. Real rows only, on B14
// (services/reputation): business_reviews_page (every review of the
// business, masked reviewer, class, instructor, reply, flag) and
// business_review_metrics (reply rate and time for the range and the period
// before). Gate: marketing (SECTION_NEED). Message privately and Mark as
// handled have no B14 call and are not shown.

const RANGE_TABS: { key: RangeKey; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "4w", label: "4 weeks" },
  { key: "12w", label: "12 weeks" },
  { key: "custom", label: "Custom" },
];
const SUBS = [
  { key: "metrics", label: "Metrics" },
  { key: "reviews", label: "Reviews & replies" },
];

type Stage<T> =
  | { status: "loading" }
  | { status: "ok"; value: T }
  | { status: "pending" }
  | { status: "denied" }
  | { status: "error"; offline: boolean };

function vocabOf(kind: BizKind) {
  if (kind === "store")
    return {
      sub: "What customers say about your business",
      people: "customers",
      rateWhat: "your products or your store",
      emptyBody:
        "Customers can rate your store after an order. Their reviews arrive here.",
      emptyLine: "Reviews show here once customers rate you.",
    };
  if (kind === "classes")
    return {
      sub: "What clients say about your business",
      people: "clients",
      rateWhat: "their classes or your business",
      emptyBody:
        "Clients can rate classes and your business after they book. Their reviews arrive here.",
      emptyLine: "Reviews show here once clients rate you.",
    };
  return {
    sub: "What members say about your business",
    people: "members",
    rateWhat: "their classes or your business",
    emptyBody:
      "Members can rate classes and your business after they book. Their reviews arrive here.",
    emptyLine: "Reviews show here once members rate you.",
  };
}

function useReputation(businessId: string | null, range: AnalyticsRange) {
  const [reviews, setReviews] = useState<Stage<BizReviews>>({
    status: "loading",
  });
  const [reports, setReports] = useState<Map<string, MyReport>>(new Map());
  const [server, setServer] = useState<ServerMetrics | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);
  const run = useRef(0);
  const load = useCallback(
    async (quiet = false) => {
      if (!businessId) return;
      const me = ++run.current;
      if (!quiet)
        setReviews((s) => (s.status === "ok" ? s : { status: "loading" }));
      const r = await fetchBusinessReviews(businessId);
      if (me !== run.current) return;
      if (r.status !== "ok") {
        setReviews((s) =>
          quiet && s.status === "ok" ? s : (r as Stage<BizReviews>),
        );
        return;
      }
      setReviews(r);
      setLoadedAt(new Date());
      setTick((t) => t + 1);
      // Our own reports name the flag line; a failed read only drops that detail.
      const flagged = r.value.reviews.filter((x) => x.flagged).map((x) => x.id);
      const rep = await fetchMyReports(flagged);
      if (me !== run.current) return;
      setReports(rep.status === "ok" ? rep.value : new Map());
    },
    [businessId],
  );
  useEffect(() => {
    void load();
  }, [load]);
  // Reply rate and time for the range and the period before (business_review_metrics), again after every change.
  useEffect(() => {
    if (!businessId || tick === 0) return;
    let alive = true;
    const prev = previousOf(range);
    void Promise.all([
      fetchReviewMetrics(businessId, range.from, range.to),
      fetchReviewMetrics(businessId, prev.from, prev.to),
    ]).then(([c, p]) => {
      if (!alive) return;
      setServer({
        cur: c.status === "ok" ? c.value : null,
        prev: p.status === "ok" ? p.value : null,
      });
    });
    return () => {
      alive = false;
    };
  }, [businessId, range, tick]);
  return {
    reviews,
    reports,
    server,
    loadedAt,
    reload: () => void load(),
    refresh: () => void load(true),
  };
}

export default function ReputationPage() {
  const navigate = useNavigate();
  const online = useOnline();
  const { business, error: bizError, reload: reloadBiz } = useBusiness();
  // The lane from the shell (it waits for the business row before mounting
  // this page); this hook's own fresh read would name "store" until it lands.
  const { kind } = useShellAnalytics();
  const vocab = vocabOf(kind);
  const [range, setRange] = useState<AnalyticsRange>(() => presetRange("4w"));
  const [customOpen, setCustomOpen] = useState(false);
  const [sub, setSub] = useState<"metrics" | "reviews">("metrics");
  const data = useReputation(business?.id ?? null, range);
  const [toast, showToast] = useOpsToast();
  // B14 follow-up: Message privately needs the messages permission (start_reviewer_thread).
  const access = useConsoleAccess();
  const canMessage = access.isOwner || (!access.isStaff && !!business) || access.can("messages");
  // mark_review_handled is gated marketing.
  const canHandle = access.isOwner || (!access.isStaff && !!business) || access.can("marketing");

  const loaded = data.reviews.status === "ok" ? data.reviews.value : null;
  const list = useMemo(() => loaded?.reviews ?? [], [loaded]);
  const venues = useMemo(() => loaded?.venues ?? [], [loaded]);
  const tagOf = useCallback(
    (r: BizReview) => reviewTag(r, venues.length > 1),
    [venues.length],
  );

  const line =
    !online && data.loadedAt
      ? `Offline. Showing what was loaded at ${clock12(data.loadedAt)}.`
      : rangeLine(range);
  const m = useMemo(
    () => metricsOf(list, range, data.server),
    [list, range, data.server],
  );
  const loading = data.reviews.status === "loading" || (!business && !bizError);
  // Pending (B14 not on this database) and denied (no marketing permission) read as a failed load.
  const failed =
    data.reviews.status === "error" ||
    data.reviews.status === "pending" ||
    data.reviews.status === "denied" ||
    (!business && !!bizError);

  return (
    <div className="rp an-scope pb-6">
      <div className="rp-back-row">
        <button
          type="button"
          className="rp-back tap"
          aria-label="Back to Analytics"
          onClick={() => navigate("/app/business/analytics/overview")}
        >
          <span className="rp-back-disc">
            <ChevronLeft size={17} strokeWidth={2.4} aria-hidden />
          </span>
        </button>
        <span className="rp-back-label" aria-hidden>
          Analytics
        </span>
      </div>
      <h1 className="rp-title">Reputation</h1>
      <p className="rp-sub">{vocab.sub}</p>
      <SegmentedTabs
        className="mt-[16px]"
        size="compact"
        items={RANGE_TABS.map((t) => ({ key: t.key, label: t.label }))}
        activeKey={range.key}
        onChange={(k) =>
          k === "custom"
            ? setCustomOpen(true)
            : setRange(presetRange(k as Exclude<RangeKey, "custom">))
        }
      />
      <SegmentedTabs
        className="mt-[10px]"
        items={SUBS}
        activeKey={sub}
        onChange={(k) => setSub(k as "metrics" | "reviews")}
      />
      <p className="rp-range-line">{line}</p>
      {!loading && !failed && m.early && sub === "metrics" && (
        <p className="rp-early">
          Your first reviews came in less than 4 weeks ago. Trends start after a
          full period.
        </p>
      )}

      {failed ? (
        <div className="rp-card" style={{ marginTop: 16 }}>
          <div className="rp-err" role="alert">
            <p>Couldn't load your reviews.</p>
            <button
              type="button"
              className="tap"
              onClick={() => (bizError ? reloadBiz() : data.reload())}
            >
              Retry
            </button>
          </div>
        </div>
      ) : loading ? (
        <Skeleton sub={sub} />
      ) : sub === "metrics" ? (
        <Metrics list={list} range={range} m={m} vocab={vocab} />
      ) : (
        <Reviews
          list={list}
          range={range}
          reports={data.reports}
          byInstructor={kind !== "store"}
          vocab={vocab}
          tagOf={tagOf}
          businessName={business?.name || "Your business"}
          canMessage={canMessage}
          canHandle={canHandle}
          onThread={(threadId) => navigate("/app/messages", { state: { threadId } })}
          onChanged={(msg) => {
            if (msg) showToast(msg, false);
            data.refresh();
          }}
        />
      )}

      <CustomRangeSheet
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        initial={range}
        onApply={(r) => {
          setRange(r);
          setCustomOpen(false);
        }}
      />
      {toast}
    </div>
  );
}

const Skeleton: React.FC<{ sub: string }> = ({ sub }) => (
  <div
    role="status"
    aria-label="Loading your reviews"
    style={{ marginTop: 16 }}
  >
    {sub === "metrics" ? (
      <>
        <div className="rp-card" style={{ padding: "20px 16px 16px" }}>
          <span
            className="rp-sk animate-skeleton-pulse"
            style={{ width: 90, height: 44, margin: "0 auto" }}
          />
          <span className="flex justify-center gap-[3px] mt-[8px]">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="rp-sk"
                style={{
                  width: 22,
                  height: 22,
                  background: "var(--rp-gold-track)",
                  borderRadius: 6,
                }}
              />
            ))}
          </span>
          <span className="flex gap-[12px] mt-[16px]">
            <span
              className="rp-sk animate-skeleton-pulse flex-1"
              style={{ height: 44 }}
            />
            <span
              className="rp-sk animate-skeleton-pulse flex-1"
              style={{ height: 44 }}
            />
          </span>
        </div>
        <div className="rp-card" style={{ marginTop: 34, padding: 16 }}>
          <span
            className="rp-sk animate-skeleton-pulse"
            style={{ height: 194, borderRadius: 14 }}
          />
        </div>
      </>
    ) : (
      <div className="rp-card" style={{ marginTop: 18 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rp-row">
            <div className="rp-row-top">
              <span
                className="rp-sk animate-skeleton-pulse"
                style={{ width: 34, height: 34, borderRadius: 999 }}
              />
              <span className="flex-1">
                <span
                  className="rp-sk animate-skeleton-pulse"
                  style={{ width: 120, height: 12 }}
                />
                <span
                  className="rp-sk animate-skeleton-pulse mt-[6px]"
                  style={{ width: 80, height: 10 }}
                />
              </span>
            </div>
            <span
              className="rp-sk animate-skeleton-pulse mt-[10px]"
              style={{ height: 30 }}
            />
          </div>
        ))}
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Metrics (AN13-001 to -008, -032 to -037)

const Metrics: React.FC<{
  list: BizReview[];
  range: AnalyticsRange;
  m: ReturnType<typeof metricsOf>;
  vocab: ReturnType<typeof vocabOf>;
}> = ({ list, range, m, vocab }) => {
  const [distOpen, setDistOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const ws = useMemo(() => weekSeries(list, range), [list, range]);
  const none = m.total === 0;
  const hasReplies = m.replied > 0;
  const gold = "rgb(var(--c-star-business))";
  const cfg: ScrubChartConfig = {
    vh: 120,
    labels: ws.labels,
    xl: ws.xl,
    aria: "Average rating and new reviews per week",
    caption:
      "Drag across either chart to read a week, tap to pin it. Markers show weeks you replied to a batch of reviews and sharp rating changes.",
    earlyText: "The trend starts after 2 weeks of reviews.",
    emptyText: "Your rating and review counts start with your first review.",
    curLabel: "Average rating",
    prevLabel: "12 weeks before",
    markers: ws.markers,
    sub: {
      label: "New reviews",
      cur: ws.count,
      prev: ws.countPrev,
      h: 56,
      col: "var(--rp-gold-bar)",
      colOn: gold,
    },
    modes: [
      {
        t: "Rating",
        unit: "out of 5",
        cur: ws.rating,
        prev: ws.ratingPrev,
        min: 1,
        max: 5,
        step: 2,
        fmt: (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)),
        tips: ws.rating.map((v, i) => [
          {
            l: "Average",
            v: v === null ? "–" : `${starsText(v)} ${v.toFixed(1)}`,
            cur: true,
          },
          { l: "New reviews", v: String(ws.count[i]), sub: true },
          { l: "5 · 4 · 3 · 2 · 1 ★", v: ws.split[i].join(" · "), sub: true },
          {
            l: "12 weeks before",
            v: `${ws.ratingPrev[i] === null ? "–" : ws.ratingPrev[i]!.toFixed(1)} · ${ws.countPrev[i]} reviews`,
            prev: true,
          },
        ]),
      },
    ],
  };
  const dl = distLines(m);
  const hl = healthLines(m);
  const maxDist = Math.max(1, ...m.dist);
  const totDist = m.dist.reduce((s, v) => s + v, 0);
  const box = (
    v: string | null,
    d: number | null,
    label: string,
    unit: string,
    lowerIsBetter = false,
  ) => (
    <div className="rp-box">
      <p className="rp-box-v">
        <span className={"rp-box-num" + (v === null ? " is-none" : "")}>
          {v ?? "–"}
        </span>
        {d !== null && d !== 0 && (
          <span
            className={
              "rp-box-d" + ((lowerIsBetter ? d > 0 : d < 0) ? " is-down" : "")
            }
          >
            {signed(d, unit)}
          </span>
        )}
      </p>
      <p className="rp-box-l">{label}</p>
    </div>
  );
  const showRating = m.rating !== null;

  return (
    <>
      <section
        className="rp-card"
        style={{ marginTop: 16 }}
        aria-label="Rating"
      >
        <div className="rp-hero-top">
          <p className="rp-hero-v">
            <span className={"rp-hero-num" + (showRating ? "" : " is-none")}>
              {showRating ? m.rating!.toFixed(1) : "–"}
            </span>
            {m.ratingDelta !== null && m.ratingDelta !== 0 && (
              <span
                className={"rp-delta" + (m.ratingDelta < 0 ? " is-down" : "")}
              >
                {signed(m.ratingDelta)}
              </span>
            )}
          </p>
          <Stars value={showRating ? m.rating! : 0} size={22} />
          <p className="rp-hero-l">
            {none
              ? "No reviews yet"
              : m.early
                ? `${m.total} ${m.total === 1 ? "review" : "reviews"}`
                : `${m.total} ${m.total === 1 ? "review" : "reviews"} · ${m.inRange} this period`}
          </p>
        </div>
        <div className="rp-boxes">
          {box(
            hasReplies && m.replyRate !== null ? `${m.replyRate}%` : null,
            hasReplies ? m.replyRateDelta : null,
            "Reply rate",
            " pts",
          )}
          <span className="rp-box-sep" aria-hidden />
          {box(
            hasReplies && m.replyHours !== null ? `${m.replyHours} h` : null,
            hasReplies ? m.replyHoursDelta : null,
            "Average reply time",
            " h",
            true,
          )}
        </div>
        <p className="rp-lead">{heroLead(m, vocab)}</p>
      </section>

      <p className="rp-label">Rating and new reviews</p>
      <section className="rp-card rp-chart" aria-label="Rating and new reviews">
        <p className="rp-chart-t">
          Is your rating going up, and how many reviews arrive?
        </p>
        <p className="rp-chart-lead">
          Line: average rating each week, on a 1 to 5 scale. Bars: new reviews
          each week. Dashed lines are the 12 weeks before.
        </p>
        <ScrubChart cfg={cfg} empty={none} early={!none && ws.early} />
      </section>

      {!none && totDist >= MIN_FOR_RATING && (
        <section className="rp-card rp-coll">
          <button
            type="button"
            className="rp-coll-head tap"
            aria-expanded={distOpen}
            onClick={() => setDistOpen(!distOpen)}
          >
            <span className="min-w-0 flex-1">
              <span className="rp-coll-t block">Rating breakdown</span>
              <span className="rp-coll-s block">{dl.insight}</span>
            </span>
            <span className={"rp-chev" + (distOpen ? " is-open" : "")}>
              <ChevronDown size={18} strokeWidth={2.2} aria-hidden />
            </span>
          </button>
          {distOpen && (
            <div className="rp-coll-body">
              <p className="rp-q">How are reviews spread across the stars?</p>
              <div className="rp-dist">
                {m.dist.map((n, i) => (
                  <div
                    key={i}
                    className="rp-dist-row"
                    aria-label={`${5 - i} stars: ${n}`}
                  >
                    <span className="rp-dist-s">
                      {5 - i}
                      <Star
                        size={11}
                        fill={"rgb(var(--c-star-business))"}
                        strokeWidth={0}
                        aria-hidden
                      />
                    </span>
                    <span className="rp-dist-track">
                      <span
                        className="rp-dist-fill block"
                        style={{
                          width: `${((n / maxDist) * 100).toFixed(1)}%`,
                        }}
                      />
                    </span>
                    <span className="rp-dist-n">{n}</span>
                    <span className="rp-dist-p">
                      {totDist ? Math.round((n / totDist) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
              <p className="rp-cap">{dl.caption}</p>
            </div>
          )}
        </section>
      )}

      {/* HANDOVER 3.10: Response health stays hidden until the business has replied. */}
      {!none && hasReplies && (
        <section className="rp-card rp-coll">
          <button
            type="button"
            className="rp-coll-head tap"
            aria-expanded={healthOpen}
            onClick={() => setHealthOpen(!healthOpen)}
          >
            <span className="min-w-0 flex-1">
              <span className="rp-coll-t block">Response health</span>
              <span className="rp-coll-s block">{hl.insight}</span>
            </span>
            <span className={"rp-chev" + (healthOpen ? " is-open" : "")}>
              <ChevronDown size={18} strokeWidth={2.2} aria-hidden />
            </span>
          </button>
          {healthOpen && (
            <div className="rp-coll-body">
              <p className="rp-q">Are you answering reviews in good time?</p>
              <div style={{ marginTop: 14 }}>
                <p className="rp-h-row">
                  <span>Reply rate</span>
                  <span>{m.replyRate ?? 0}%</span>
                </p>
                <div className="rp-h-bar">
                  <span style={{ width: `${m.replyRate ?? 0}%` }} />
                </div>
                <p className="rp-h-cap">{hl.rateCap}</p>
              </div>
              <div style={{ marginTop: 16 }}>
                <p className="rp-h-row">
                  <span>Average reply time</span>
                  <span>{m.replyHours ?? 0} h</span>
                </p>
                <div className="rp-h-time" aria-hidden>
                  <span className="rp-h-track" />
                  <span className="rp-h-band" />
                  <span
                    className="rp-h-mark"
                    style={{
                      left: `${Math.min(100, ((m.replyHours ?? 0) / 72) * 100).toFixed(1)}%`,
                      background: {
                        good: "var(--an-good)",
                        caution: "var(--an-caution)",
                        high: "var(--an-high)",
                      }[replyTimeTone(m.replyHours ?? 0)],
                    }}
                  />
                </div>
                <div className="rp-h-axis" aria-hidden>
                  <span>0 h</span>
                  <span>24 h</span>
                  <span>48 h</span>
                  <span>72 h</span>
                </div>
                <p className="rp-h-legend">
                  <span aria-hidden />
                  {hl.timeCap}
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Reviews & replies (AN13-011 to -031, OURS-AN13-flag-queue)

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All reviews" },
  { key: "unreplied", label: "Unreplied" },
  { key: "5", label: "5 stars" },
  { key: "4", label: "4 stars" },
  { key: "low", label: "3 stars or lower" },
];

const Reviews: React.FC<{
  list: BizReview[];
  range: AnalyticsRange;
  /** This account's own reports, by review (the flag line's "You reported this"). */
  reports: Map<string, MyReport>;
  /** AN13-014 row 4: Classes and Gym only (a store has no instructors). */
  byInstructor: boolean;
  vocab: ReturnType<typeof vocabOf>;
  tagOf: (r: BizReview) => string | null;
  businessName: string;
  /** The messages permission: Message privately on a flagged review (start_reviewer_thread). */
  canMessage: boolean;
  /** The marketing permission: Mark as handled (mark_review_handled). */
  canHandle: boolean;
  /** A private message was sent: open its thread. */
  onThread: (threadId: string) => void;
  onChanged: (toast: string | null) => void;
}> = ({ list, range, reports, byInstructor, vocab, tagOf, businessName, canMessage, canHandle, onThread, onChanged }) => {
  // OURS-AN13-flag-queue row 7: "Mark as handled" shows once the business has
  // replied or messaged privately. A private message opens the thread (the
  // page is left), so the reviews messaged are remembered for this tab session.
  const [messaged, setMessaged] = useState<Set<string>>(() => readMessaged());
  const [handling, setHandling] = useState<string | null>(null);
  const markHandled = async (r: BizReview) => {
    setHandling(r.id);
    const x = await markReviewHandled(r.id, true);
    setHandling(null);
    onChanged(x.ok ? "Marked as handled. It's back with your other reviews." : (reputationError(x.code) ?? "Couldn't mark it as handled. Try again."));
  };
  // Reviews whose author start_reviewer_thread refused (ATX96): Report to Centium instead (X-28).
  const [noThread, setNoThread] = useState<Set<string>>(new Set());
  const online = useOnline();
  const [fk, setFk] = useState<FilterKey>("all");
  const [fOpen, setFOpen] = useState(false);
  const [instLevel, setInstLevel] = useState(false);
  const [allOpen, setAllOpen] = useState<boolean | null>(null);
  const [allShown, setAllShown] = useState(3);
  const [needAll, setNeedAll] = useState(false);
  const [composer, setComposer] = useState<{
    mode: ComposerMode;
    review: BizReview;
  } | null>(null);
  const [report, setReport] = useState<BizReview | null>(null);
  const [menu, setMenu] = useState<{
    review: BizReview;
    el: HTMLElement;
  } | null>(null);
  const [delReply, setDelReply] = useState<BizReview | null>(null);
  const [busy, setBusy] = useState(false);

  const total = list.filter((r) => !r.redacted).length;
  const openReport = (r: BizReview) => {
    const x = reports.get(r.id);
    return x && x.status === "open" ? x : null;
  };
  // The queue is flagged and not yet handled (mark_review_handled); a handled
  // review moves into the normal lists (row 7).
  const flagged = list.filter(inFlagQueue);
  const need = list.filter(
    (r) => !r.redacted && r.rating !== null && !r.reply && !inFlagQueue(r),
  );
  const countOf = (k: FilterKey) =>
    filterReviews(list, k).filter((r) => !r.redacted).length;
  const shown = filterReviews(list, fk);
  const open = allOpen ?? fk !== "all";
  const instructors = byInstructor ? instructorsOf(list) : [];
  const filterLabel = fk.startsWith("inst:")
    ? fk.slice(5)
    : (FILTERS.find((o) => o.key === fk)?.label ?? "All reviews");
  const choose = (k: FilterKey) => {
    setFk(k);
    setFOpen(false);
    setInstLevel(false);
    setAllOpen(null);
    setAllShown(3);
  };
  const empty = total === 0;
  // A reply Centium removed can't be edited or deleted (ATX10).
  const ownReply = (r: BizReview) => !!r.reply && !r.reply.redacted;

  // The row menu holds Edit / Delete reply and Report to Centium; a flagged row reports from its own button.
  const menuFor = (r: BizReview) =>
    ownReply(r) || !r.flagged
      ? (el: HTMLElement) => setMenu({ review: r, el })
      : undefined;
  const replyAction = (r: BizReview) => ({
    label: "Reply",
    onClick: () => setComposer({ mode: "reply", review: r }),
  });

  const head = empty
    ? "No reviews yet"
    : `${total} ${total === 1 ? "review" : "reviews"} · ${need.length + flagged.filter((r) => !r.reply).length} need a reply`;

  return (
    <>
      <div className="rp-rev-head">
        <div className="min-w-0 flex-1">
          <p className="rp-rev-t">Reviews</p>
          <p className="rp-rev-s">{head}</p>
        </div>
        <button
          type="button"
          className={
            "rp-filter tap" +
            (fk !== "all" ? " is-active" : "") +
            (fOpen ? " is-open" : "")
          }
          aria-haspopup="listbox"
          aria-expanded={fOpen}
          aria-label={`Filter reviews: ${filterLabel}`}
          disabled={empty}
          onClick={() => {
            setFOpen(!fOpen);
            setInstLevel(false);
          }}
        >
          <span>{filterLabel}</span>
          <span className={"rp-chev" + (fOpen ? " is-open" : "")}>
            <ChevronDown size={15} aria-hidden />
          </span>
        </button>
      </div>
      {fOpen && (
        <div role="listbox" aria-label="Filter reviews" className="rp-list">
          {instLevel ? (
            <>
              <button
                type="button"
                className="rp-opt tap"
                onClick={() => setInstLevel(false)}
              >
                <ChevronLeft size={14} aria-hidden />
                <span className="rp-opt-t">All filters</span>
              </button>
              {instructors.map((x) => {
                const k = `inst:${x.name}` as FilterKey;
                return (
                  <button
                    key={x.name}
                    type="button"
                    role="option"
                    aria-selected={k === fk}
                    className="rp-opt tap"
                    onClick={() => choose(k)}
                  >
                    <span className="rp-opt-t">{x.name}</span>
                    <span className="rp-opt-n">{x.n}</span>
                    {k === fk && (
                      <span className="rp-opt-check">
                        <Check size={15} strokeWidth={2.6} aria-hidden />
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          ) : (
            <>
              {FILTERS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  role="option"
                  aria-selected={o.key === fk}
                  className="rp-opt tap"
                  onClick={() => choose(o.key)}
                >
                  <span className="rp-opt-t">{o.label}</span>
                  <span className="rp-opt-n">{countOf(o.key)}</span>
                  {o.key === fk && (
                    <span className="rp-opt-check">
                      <Check size={15} strokeWidth={2.6} aria-hidden />
                    </span>
                  )}
                </button>
              ))}
              {instructors.length > 0 && (
                <button
                  type="button"
                  role="option"
                  aria-selected={fk.startsWith("inst:")}
                  className="rp-opt tap"
                  onClick={() => setInstLevel(true)}
                >
                  <span className="rp-opt-t">By instructor</span>
                  <ChevronRight size={14} aria-hidden />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {fk === "all" && flagged.length > 0 && (
        <>
          <p className="rp-label">Flagged for you · {flagged.length}</p>
          <section className="rp-card rp-flag" aria-label="Flagged for you">
            {flagged.length === 1 && (
              <FlagLine
                place="top"
                text={flagText(flagged[0], openReport(flagged[0])?.reportedAt ?? null)}
              />
            )}
            {flagged.map((r) => {
              const mine = openReport(r);
              return (
                <ReviewRow
                  key={r.id}
                  review={r}
                  tag={tagOf(r)}
                  menu={menuFor(r)}
                  top={
                    flagged.length > 1 ? (
                      <FlagLine
                        place="row"
                        text={flagText(r, mine?.reportedAt ?? null)}
                      />
                    ) : undefined
                  }
                >
                  <div className="rp-acts">
                    {/* AN13-011 row 4c / AN13-018: Message privately (start_reviewer_thread,
                        messages permission); X-28: Report to Centium when the reviewer
                        isn't one of the business's people (ATX96) or without the permission. */}
                    {canMessage && !noThread.has(r.id) ? (
                      <button
                        type="button"
                        className="rp-act is-high tap"
                        disabled={!online}
                        onClick={() => setComposer({ mode: "message", review: r })}
                      >
                        <MessageCircle size={14} strokeWidth={2.4} aria-hidden />
                        Message privately
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rp-act is-high tap"
                        disabled={!online || !!reports.get(r.id)}
                        onClick={() => setReport(r)}
                      >
                        <Flag size={14} strokeWidth={2.4} aria-hidden />
                        Report to Centium
                      </button>
                    )}
                    <button
                      type="button"
                      className="rp-act is-line tap"
                      disabled={!online || (!!r.reply && r.reply.redacted)}
                      onClick={() =>
                        setComposer({
                          mode: r.reply ? "edit" : "flag-reply",
                          review: r,
                        })
                      }
                    >
                      <Reply size={14} strokeWidth={2.4} aria-hidden />
                      {r.reply ? "Edit reply" : "Post a reply"}
                    </button>
                  </div>
                  {/* OURS-AN13-flag-queue row 7: 12.5/800 #7D6BB5 text button, min-height 44, under the actions. */}
                  {canHandle && (!!r.reply || messaged.has(r.id)) && (
                    <button
                      type="button"
                      className="rp-handled tap"
                      disabled={!online || handling === r.id}
                      onClick={() => void markHandled(r)}
                    >
                      Mark as handled
                    </button>
                  )}
                </ReviewRow>
              );
            })}
          </section>
        </>
      )}

      {(fk === "all" || fk === "unreplied") && need.length > 0 && (
        <>
          <p className="rp-label">Needs a reply · {need.length}</p>
          <section className="rp-card" aria-label="Needs a reply">
            {(needAll ? need : need.slice(0, 3)).map((r) => (
              <ReviewRow
                key={r.id}
                review={r}
                tag={tagOf(r)}
                action={replyAction(r)}
                menu={menuFor(r)}
              />
            ))}
            {!needAll && need.length > 3 && (
              <button
                type="button"
                className="rp-more tap"
                onClick={() => setNeedAll(true)}
              >
                See all {need.length}
                <ChevronRight size={14} aria-hidden />
              </button>
            )}
          </section>
        </>
      )}

      <section
        className="rp-card rp-all"
        aria-label={fk === "all" ? "All reviews" : filterLabel}
      >
        <button
          type="button"
          className="rp-all-head tap"
          aria-expanded={!empty && open}
          disabled={empty}
          onClick={() => setAllOpen(!open)}
        >
          <span className="min-w-0 flex-1">
            <span className="rp-coll-t block" style={{ lineHeight: "18px" }}>
              {fk === "all"
                ? `All reviews · ${empty ? 0 : total}`
                : `${filterLabel} · ${shown.filter((r) => !r.redacted).length}`}
            </span>
            <span className="rp-coll-s block">
              {empty
                ? vocab.emptyLine
                : fk === "all"
                  ? allReviewsLine(list, range)
                  : "Showing reviews that match this filter."}
            </span>
          </span>
          <span className={"rp-chev" + (!empty && open ? " is-open" : "")}>
            <ChevronDown size={18} aria-hidden />
          </span>
        </button>
        {!empty && open && shown.length > 0 && (
          <div className="rp-all-body">
            {shown.slice(0, allShown).map((r) => (
              <ReviewRow
                key={r.id}
                review={r}
                tag={tagOf(r)}
                menu={r.redacted ? undefined : menuFor(r)}
              />
            ))}
            {shown.length > allShown && (
              <button
                type="button"
                className="rp-more tap"
                onClick={() => setAllShown(allShown === 3 ? 20 : allShown + 20)}
              >
                {allShown === 3
                  ? `See all ${shown.filter((r) => !r.redacted).length}`
                  : "Show more"}
                <ChevronRight size={14} aria-hidden />
              </button>
            )}
          </div>
        )}
        {(empty || (open && shown.length === 0)) && (
          <div className="rp-none">
            <span
              style={{
                display: "inline-flex",
                color: "rgb(var(--c-star-business))",
              }}
            >
              <Star size={22} aria-hidden />
            </span>
            <p className="rp-none-t">
              {empty ? "No reviews yet" : "No reviews match"}
            </p>
            <p className="rp-none-s">
              {empty ? vocab.emptyBody : "Try another filter."}
            </p>
          </div>
        )}
      </section>

      {menu && (
        <RowMenu
          anchor={menu.el}
          onClose={() => setMenu(null)}
          items={[
            ...(ownReply(menu.review)
              ? [
                  {
                    label: "Edit reply",
                    onClick: () =>
                      setComposer({ mode: "edit", review: menu.review }),
                  },
                  {
                    label: "Delete reply",
                    onClick: () => setDelReply(menu.review),
                  },
                ]
              : []),
            ...(!menu.review.flagged && !reports.get(menu.review.id)
              ? [
                  {
                    label: "Report to Centium",
                    onClick: () => setReport(menu.review),
                  },
                ]
              : []),
          ]}
        />
      )}

      <ReviewComposer
        open={!!composer}
        mode={composer?.mode ?? "reply"}
        review={composer?.review ?? null}
        tag={composer ? tagOf(composer.review) : null}
        injury={composer?.review.flagKind === "injury"}
        businessName={businessName}
        onClose={() => setComposer(null)}
        onDone={(msg) => {
          setComposer(null);
          onChanged(msg);
        }}
        onMessaged={(threadId) => {
          const id = composer?.review.id;
          if (id) setMessaged(rememberMessaged(id));
          setComposer(null);
          onThread(threadId);
        }}
        onNotMember={() => {
          const id = composer?.review.id;
          setComposer(null);
          if (id) setNoThread((s) => new Set(s).add(id));
          onChanged("You can only message your own members. Report it to Centium instead.");
        }}
      />
      <ReportSheet
        open={!!report}
        review={report}
        tag={report ? tagOf(report) : null}
        onClose={() => setReport(null)}
        onDone={(msg) => {
          setReport(null);
          onChanged(msg);
        }}
      />
      <ConfirmCard
        open={!!delReply}
        tone="destructive"
        title="Delete your reply?"
        subtitle="Members won't see it any more."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        busy={busy}
        onCancel={() => setDelReply(null)}
        onConfirm={async () => {
          if (!delReply) return;
          setBusy(true);
          const r = await deleteReply(delReply.id);
          setBusy(false);
          setDelReply(null);
          onChanged(
            r.ok
              ? "Reply deleted."
              : (reputationError(r.code) ??
                  "Couldn't delete your reply. Try again."),
          );
        }}
      />
    </>
  );
};

/** The row's "⋯" menu (AN13-024 O3, OURS-AN13-flag-queue row 5): PopupMenu styling, anchored under the button. */
const RowMenu: React.FC<{
  anchor: HTMLElement;
  items: { label: string; onClick: () => void }[];
  onClose: () => void;
}> = ({ anchor, items, onClose }) => {
  const r = anchor.getBoundingClientRect();
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    ref.current?.querySelector("button")?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  if (!items.length) return null;
  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="menu"
        className="rp an-scope rp-list fixed z-[61]"
        style={{
          top: r.bottom + 6,
          right: Math.max(16, window.innerWidth - r.right),
          minWidth: 190,
          marginTop: 0,
        }}
      >
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            role="menuitem"
            className="rp-opt tap"
            onClick={() => {
              onClose();
              it.onClick();
            }}
          >
            <span
              className="rp-opt-t"
              style={
                it.label.startsWith("Delete")
                  ? { color: "var(--an-high)" }
                  : undefined
              }
            >
              {it.label}
            </span>
          </button>
        ))}
      </div>
    </>
  );
};
