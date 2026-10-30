import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CircleCheck, ClipboardCheck, Eye, Pencil, Share2, Star, TrendingDown, Users } from "lucide-react";
import { fetchBuilderTree, fetchNetEarnings, formatCents, type BuilderLesson, type NetEarnings } from "../../../services/courses/author";
import { statsMonthLabel } from "../../../services/courses/authorRules";
import { fetchAuthorStats, fetchCheckInAnswers, fetchEnrolledClients, type AuthorStats, type CheckInAnswer } from "../../../services/courses/extras";
import type { CourseCategory } from "../../../services/courses";
import { fetchRatingStars, type CourseCard } from "../../../services/pro/courses";
import { useApp } from "../../../context/AppContext";
import { useBack } from "../../../hooks/useBack";
import { textPx } from "../../../theme/textSize";
import { formatShortDate } from "../../../utils/date";
import { Toast } from "../../ui/Toast";
import { INK } from "../proInk";
import { ProCardSkeleton, ProError } from "../states";
import { ListCard, RoundBtn } from "../client/kit";
import { Group, NumBox } from "./courseUi";
import { ratingBars, ratingsLine } from "./courseModel";
import { CourseSheet } from "./CourseSheet";
import { ShareCourseSheet } from "./ShareCourseSheet";

type Open = "en" | "co" | "dr" | "ck" | "ra" | null;

/**
 * Release 3 · W6 MO28 "Course stats" (courseStats18), the page a published
 * (or archived) course opens to:
 * - head19: back 36, eyebrow 10.5 / 600 caps 0.11em ("Course · Published"),
 *   title 19 / 700 -0.03em; Share and Edit round buttons (36, gap 8);
 * - nboxes16: Enrolled (course_stats.enrolled, "{n} from your clients"),
 *   Finished, Rating (course_stats average and count);
 * - groups (grp10), one open at a time: Enrolments, Completion, Drop-off by
 *   lesson, Check-in answers, Ratings.
 * Round D (course_author_stats, 20261223030000): enrolments by month (the
 * last 12), completion (certificates over enrolments) and "Where people
 * stop" (the last lesson an unfinished learner reached), as counts only,
 * never a learner's name. Check-in answers (course_check_in_answers_for_author)
 * are the author's only, with first names, per Check-in lesson of the live
 * course. Kept from the old builder: what the course has earned after
 * commission (course_net_earnings) and "View it as a learner".
 */
export function CourseStats({ card, categories, onChanged }: { card: CourseCard; categories: CourseCategory[]; onChanged: () => void }) {
  const navigate = useNavigate();
  const back = useBack("/app/forum/courses/mine");
  const { user } = useApp();
  const [open, setOpen] = useState<Open>(null);
  const [stars, setStars] = useState<number[] | null>(null);
  const [starsFailed, setStarsFailed] = useState(false);
  const [earnings, setEarnings] = useState<NetEarnings | null>(null);
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const published = card.status === "published";

  const loadStars = useCallback(async () => {
    const r = await fetchRatingStars(card.id);
    if (!r.ok) setStarsFailed(true);
    else {
      setStarsFailed(false);
      setStars(r.data);
    }
  }, [card.id]);

  const [stats, setStats] = useState<AuthorStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [fromClients, setFromClients] = useState<number | null>(null);
  const [checkIns, setCheckIns] = useState<BuilderLesson[]>([]);
  const [modulePositions, setModulePositions] = useState<number[]>([]);

  const loadStats = useCallback(async () => {
    const r = await fetchAuthorStats(card.id);
    if (!r.ok) setStatsError(r.message);
    else {
      setStatsError(null);
      setStats(r.value);
    }
  }, [card.id]);

  useEffect(() => {
    void loadStars();
    void loadStats();
    void fetchNetEarnings(card.id).then((r) => r.ok && setEarnings(r.value));
    void fetchEnrolledClients(card.id).then((s) => setFromClients(s.size));
    void fetchBuilderTree(card.id, null).then((r) => {
      if (!r.ok) return;
      setCheckIns(r.value.lessons.filter((l) => l.kind === "check_in"));
      setModulePositions(r.value.modules.map((m) => m.position).sort((a, b) => a - b));
    });
  }, [card.id, loadStars, loadStats]);

  const toggle = (k: Exclude<Open, null>) => setOpen((o) => (o === k ? null : k));
  const bars = ratingBars(stars ?? []);
  const total = stars?.length ?? 0;
  const authorName = user.firstName;
  const enrolled = stats?.enrolled ?? card.enrolled;
  const pct = stats?.completionPct ?? null;
  const thisYear = new Date().getFullYear();
  // Positions start at 0 and may have gaps; the week number is the order.
  const weekOf = (position: number) => (modulePositions.includes(position) ? modulePositions.indexOf(position) + 1 : position + 1);
  const monthMax = Math.max(1, ...(stats?.byMonth ?? []).map((m) => m.enrolled));
  const dropMax = Math.max(1, ...(stats?.dropOff ?? []).map((d) => d.learners));
  const topDrop = stats?.dropOff.reduce<AuthorStats["dropOff"][number] | null>((a, d) => (!a || d.learners > a.learners ? d : a), null) ?? null;
  const statsBody = (render: (s: AuthorStats) => ReactNode) =>
    statsError ? <ProError onRetry={() => void loadStats()} message={statsError} /> : stats ? render(stats) : <ProCardSkeleton lines={2} height={80} />;

  return (
    <div className="flex flex-col pb-28">
      <div className="flex items-start justify-between" style={{ gap: 12, marginBottom: 13 }}>
        <div className="flex items-start min-w-0" style={{ gap: 10 }}>
          <button type="button" onClick={back} aria-label="Back" className="tap flex items-center justify-center shrink-0 relative before:absolute before:-inset-1 before:content-['']" style={{ width: 36, height: 36, marginInlineStart: -6, marginTop: 2 }}>
            <ChevronLeft size={18} strokeWidth={2} aria-hidden style={{ color: INK.chS }} />
          </button>
          <div className="min-w-0">
            <p style={{ fontSize: textPx(10.5), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.11em", color: INK.chF, marginBottom: 2 }}>
              Course · {published ? "Published" : "Archived"}
            </p>
            <h1 style={{ fontSize: textPx(19), fontWeight: 700, letterSpacing: "-0.03em", color: INK.ch, overflowWrap: "anywhere" }}>{card.title}</h1>
          </div>
        </div>
        {published && (
          <div className="flex shrink-0" style={{ gap: 8 }}>
            <RoundBtn icon={Share2} label="Share" onClick={() => setSharing(true)} />
            <RoundBtn icon={Pencil} label="Edit" onClick={() => setEditing(true)} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center" style={{ gap: 8, marginBottom: 12 }}>
        <NumBox label="Enrolled" value={String(enrolled)} sub={fromClients ? `${fromClients} from your clients` : "In total"} />
        <NumBox label="Finished" value={pct === null ? "–" : String(pct)} unit="%" sub={stats ? `${stats.finished} of ${stats.enrolled} enrolled` : "Of those enrolled"} />
        <NumBox label="Rating" value={card.ratings && card.averageRating !== null ? card.averageRating.toFixed(1) : "–"} sub={card.ratings ? `${card.ratings} ${card.ratings === 1 ? "rating" : "ratings"}` : "No ratings yet"} />
      </div>

      <Group icon={Users} title="Enrolments" insight={`${enrolled} enrolled`} open={open === "en"} onToggle={() => toggle("en")}>
        {statsBody((s) => (
          <div style={{ paddingBottom: 8 }}>
            <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 6 }}>New enrolments by month</p>
            {s.byMonth.length === 0 && <p style={{ fontSize: textPx(12.5), color: INK.chF, paddingBottom: 2 }}>No enrolments yet.</p>}
            {s.byMonth.map((m) => (
              <BarRow key={m.month} label={statsMonthLabel(m.month, thisYear)} value={m.enrolled} max={monthMax} labelWidth={64} />
            ))}
          </div>
        ))}
      </Group>
      <Group icon={CircleCheck} title="Completion" insight={pct === null ? "No one enrolled yet" : `${pct}% finished`} open={open === "co"} onToggle={() => toggle("co")}>
        {statsBody((s) =>
          s.enrolled === 0 ? (
            <p style={{ fontSize: textPx(12.5), color: INK.chF, paddingBottom: 10 }}>Nobody has finished this course yet.</p>
          ) : (
            <div style={{ paddingBottom: 10 }}>
              <p style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.5 }}>
                {s.finished} of {s.enrolled} {s.enrolled === 1 ? "person has" : "people have"} finished and earned a certificate.
              </p>
              <span className="block" style={{ height: 8, borderRadius: 9999, background: INK.soft, overflow: "hidden", marginTop: 8 }}>
                <span className="block h-full" style={{ width: `${s.completionPct ?? 0}%`, background: INK.prDeep }} />
              </span>
            </div>
          )
        )}
      </Group>
      <Group
        icon={TrendingDown}
        title="Drop-off by lesson"
        insight={topDrop ? `Most stop at ${topDrop.title}` : "Where people stop"}
        open={open === "dr"}
        onToggle={() => toggle("dr")}
      >
        {statsBody((s) =>
          s.dropOff.length === 0 ? (
            <p style={{ fontSize: textPx(12.5), color: INK.chF, paddingBottom: 10 }}>Drop-off shows once a few people have started.</p>
          ) : (
            <div style={{ paddingBottom: 8 }}>
              <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 6 }}>The last lesson reached by people who haven't finished</p>
              {s.dropOff.map((d) => (
                <BarRow key={d.lessonId} label={`Week ${weekOf(d.modulePosition)} · ${d.title}`} value={d.learners} max={dropMax} labelWidth={0} />
              ))}
            </div>
          )
        )}
      </Group>
      {checkIns.length > 0 && (
        <Group icon={ClipboardCheck} title="Check-in answers" insight="Only you can see these" open={open === "ck"} onToggle={() => toggle("ck")}>
          <div className="flex flex-col" style={{ gap: 12, paddingBottom: 10 }}>
            {checkIns.map((l) => (
              <CheckInAnswers key={l.id} lesson={l} />
            ))}
          </div>
        </Group>
      )}
      <Group icon={Star} title="Ratings" insight={ratingsLine(card.averageRating, card.ratings)} open={open === "ra"} onToggle={() => toggle("ra")}>
        {starsFailed ? (
          <ProError onRetry={() => void loadStars()} />
        ) : total === 0 ? (
          <p style={{ fontSize: textPx(12.5), color: INK.chF, paddingBottom: 10 }}>No ratings yet</p>
        ) : (
          <div style={{ paddingBottom: 8 }}>
            <div className="flex items-center" style={{ gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: textPx(30), fontWeight: 800, color: INK.ch }}>{card.averageRating?.toFixed(1)}</span>
              <span className="inline-flex" style={{ gap: 2 }} aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={13} strokeWidth={1.5} fill={i < Math.round(card.averageRating ?? 0) ? "#D9A441" : "none"} style={{ color: i < Math.round(card.averageRating ?? 0) ? "#D9A441" : "rgba(140,131,120,0.35)" }} />
                ))}
              </span>
              <span style={{ fontSize: textPx(12), color: INK.chF }}>
                {total} {total === 1 ? "rating" : "ratings"}
              </span>
            </div>
            {bars.map((b) => (
              <div key={b.stars} className="grid items-center" style={{ gridTemplateColumns: "16px minmax(0,1fr) 24px", gap: 8, marginTop: 4, fontSize: textPx(11.5), color: INK.chS }} aria-label={`${b.stars} stars: ${b.count}`}>
                <span>{b.stars}</span>
                <span style={{ height: 7, borderRadius: 9999, background: INK.soft, overflow: "hidden" }}>
                  <span className="block h-full" style={{ width: `${total ? Math.round((b.count / total) * 100) : 0}%`, background: "#D9A441" }} />
                </span>
                <span className="text-end">{b.count}</span>
              </div>
            ))}
          </div>
        )}
      </Group>

      {(published || (earnings && earnings.sales > 0)) && (
      <div style={{ marginTop: 6 }}>
        <ListCard
          rows={[
            ...(earnings && earnings.sales > 0
              ? [{ key: "earn", title: "Earned, after commission", meta: `${earnings.sales} ${earnings.sales === 1 ? "sale" : "sales"} so far`, trailing: <b style={{ fontSize: textPx(13), color: INK.ch }}>{formatCents(earnings.netCents)}</b> }]
              : []),
            ...(published ? [{ key: "view", icon: Eye, title: "View it as a learner", onClick: () => navigate(`/app/forum/courses/${card.id}`) }] : []),
          ]}
        />
      </div>
      )}

      {editing && (
        <CourseSheet
          courseId={card.id}
          categories={categories}
          enrolled={card.enrolled}
          authorName={authorName}
          onClose={() => setEditing(false)}
          onChanged={onChanged}
          onSubmitted={() => {
            setEditing(false);
            setToast("Your changes are with Centium for review.");
            onChanged();
          }}
        />
      )}
      {sharing && <ShareCourseSheet course={card} onClose={() => setSharing(false)} onSent={(n) => setToast(`Suggested to ${n} ${n === 1 ? "client" : "clients"}.`)} />}
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
}

/** One row of a count list: the label, a bar (in the ratings' style, primary.deep) and the count. A labelWidth of 0 puts the label above. */
function BarRow({ label, value, max, labelWidth }: { label: string; value: number; max: number; labelWidth: number }) {
  const bar = (
    <span style={{ height: 7, borderRadius: 9999, background: INK.soft, overflow: "hidden" }} className="block">
      <span className="block h-full" style={{ width: `${Math.round((value / max) * 100)}%`, background: INK.prDeep }} />
    </span>
  );
  if (labelWidth === 0) {
    return (
      <div style={{ marginTop: 8, fontSize: textPx(11.5), color: INK.chS }} aria-label={`${label}: ${value}`}>
        <span className="flex justify-between" style={{ gap: 8, marginBottom: 4 }}>
          <span className="min-w-0" style={{ overflowWrap: "anywhere" }}>{label}</span>
          <span className="shrink-0" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
        </span>
        {bar}
      </div>
    );
  }
  return (
    <div className="grid items-center" style={{ gridTemplateColumns: `${labelWidth}px minmax(0,1fr) 28px`, gap: 8, marginTop: 4, fontSize: textPx(11.5), color: INK.chS }} aria-label={`${label}: ${value}`}>
      <span className="truncate">{label}</span>
      {bar}
      <span className="text-end" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

/** One Check-in lesson's answers, newest first, with first names (the author only). */
function CheckInAnswers({ lesson }: { lesson: BuilderLesson }) {
  const [answers, setAnswers] = useState<CheckInAnswer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await fetchCheckInAnswers(lesson.id);
    if (!r.ok) setError(r.message);
    else {
      setError(null);
      setAnswers(r.value);
    }
  }, [lesson.id]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div>
      <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch, overflowWrap: "anywhere" }}>{lesson.title}</p>
      {lesson.body && <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 2, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{lesson.body}</p>}
      {error ? (
        <ProError onRetry={() => void load()} message={error} />
      ) : answers === null ? (
        <ProCardSkeleton lines={1} height={48} />
      ) : answers.length === 0 ? (
        <p style={{ fontSize: textPx(12.5), color: INK.chF, marginTop: 6 }}>No answers yet.</p>
      ) : (
        <div className="flex flex-col" style={{ gap: 6, marginTop: 8 }}>
          {answers.map((a) => (
            <div key={a.id} style={{ borderRadius: 12, background: INK.soft, padding: "8px 12px" }}>
              <p className="flex justify-between" style={{ gap: 8, fontSize: textPx(12), color: INK.chF }}>
                <b style={{ color: INK.ch }}>{a.firstName}</b>
                <span>{formatShortDate(new Date(a.updatedAt), { month: "short", day: "numeric" })}</span>
              </p>
              <p style={{ fontSize: textPx(13), color: INK.chS, lineHeight: 1.5, marginTop: 2, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{a.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
