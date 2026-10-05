import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  askQuestion,
  enrol,
  fetchAccessLevel,
  fetchAuthorNames,
  fetchCompleted,
  fetchCourse,
  fetchMyCertificate,
  setCertificateSharing,
  fetchMyEnrolments,
  fetchMyRating,
  fetchPaidOpen,
  fetchQuestions,
  fetchCourseStats,
  fetchTrees,
  orderedLessons,
  rateCourse,
  type Certificate,
  type Course,
  type CourseStats,
  type CourseModule,
  type CourseQuestion,
  type Enrolment,
  type Lesson,
} from "../../services/courses";
import {
  coursePill,
  enrolledLabel,
  formatPrice,
  minutesLabel,
  nextLesson,
  PAID_OPEN_SOON,
  weekContents,
  type AccessLevel,
} from "../../services/courses/rules";
import { ForumPlaceholder } from "../forum/parts";
import { fv } from "../forum/forumColor";
import { CheckIcon, CoverPill, Instructor, StarIcon } from "./courseParts";

// Design screen 7: the course page. What you'll learn, the syllabus by week,
// ratings, and the choice between watching free and the full course.
//
// THE ENROLLED COUNT COMES FROM course_stats. It could not be shown before:
// course_enrolments is readable only for your own rows, so no client could
// count everyone's. The function counts server-side and is scoped by
// course_is_readable, so it cannot be used to watch a course you cannot see.
//
// BUYING IS BEHIND THE PAYMENTS SWITCH. While paid_enrolment_is_open() is
// false, "Get the full course" says "Paid courses open soon." and calls
// nothing; the server refuses a paid enrolment then anyway (ATX68).

type Loaded = {
  course: Course;
  authorName: string;
  stats: CourseStats;
  modules: CourseModule[];
  lessons: Lesson[];
  access: AccessLevel;
  paidOpen: boolean;
  enrolment: Enrolment | null;
  completed: Set<string>;
  myRating: { stars: number; body: string | null } | null;
  questions: CourseQuestion[];
  certificate: Certificate | null;
};

async function loadCourse(courseId: string, userId: string): Promise<Loaded | null | { error: string }> {
  const c = await fetchCourse(courseId);
  if (!c.ok) return { error: c.message };
  if (!c.value) return null;
  const course = c.value;
  const [names, statMap, tree, access, paidOpen, enrolments] = await Promise.all([
    fetchAuthorNames(course.authorId ? [course.authorId] : []),
    fetchCourseStats([course.id]),
    fetchTrees([course.id]),
    fetchAccessLevel(course.id),
    fetchPaidOpen(),
    fetchMyEnrolments(userId),
  ]);
  const enrolment = enrolments.find((e) => e.courseId === course.id) ?? null;
  const [completed, myRating, questions, certificate] = await Promise.all([
    enrolment ? fetchCompleted([enrolment.id]).then((m) => m.get(enrolment.id) ?? new Set<string>()) : Promise.resolve(new Set<string>()),
    enrolment ? fetchMyRating(course.id, userId) : Promise.resolve(null),
    access === "paid" ? fetchQuestions(course.id) : Promise.resolve([]),
    enrolment ? fetchMyCertificate(enrolment.id) : Promise.resolve(null),
  ]);
  return {
    course,
    authorName: names.get(course.authorId ?? "") ?? "Professional",
    stats: statMap.get(course.id) ?? { averageRating: null, ratings: 0, enrolled: 0 },
    modules: tree.modules.sort((a, b) => a.position - b.position),
    lessons: tree.lessons,
    access,
    paidOpen,
    enrolment,
    completed,
    myRating,
    questions,
    certificate,
  };
}

export function CourseDetailView({ courseId, userId }: { courseId: string; userId: string }) {
  const navigate = useNavigate();
  const [state, setState] = useState<Loaded | null | { error: string } | undefined>(undefined);
  const [busy, setBusy] = useState<"free" | "paid" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [allWeeks, setAllWeeks] = useState(false);

  const reload = useCallback(() => loadCourse(courseId, userId).then(setState), [courseId, userId]);

  useEffect(() => {
    let live = true;
    void loadCourse(courseId, userId).then((s) => live && setState(s));
    return () => {
      live = false;
    };
  }, [courseId, userId]);

  const back = (
    <button
      type="button"
      onClick={() => navigate("/app/forum?tab=courses")}
      aria-label="Back"
      className="tap w-11 h-11 rounded-full flex items-center justify-center"
      style={{ background: "#FFFFFF" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#241F1B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );

  if (state === undefined) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <ForumPlaceholder height={180} />
        <ForumPlaceholder height={120} />
        <ForumPlaceholder height={160} />
      </div>
    );
  }
  if (state === null || "error" in state) {
    return (
      <div className="flex flex-col gap-3" style={{ color: fv("text") }}>
        <div className="-mx-1">{back}</div>
        <p className="text-sm text-center py-8" style={{ color: fv("muted") }}>
          {state && "error" in state ? state.error : "This course isn't available."}
        </p>
      </div>
    );
  }

  const { course, authorName, modules, access, enrolment } = state;
  const lessons = orderedLessons(modules, state.lessons, course.id);
  const stats = state.stats;
  const isAuthor = course.authorId === userId;
  const paidCourse = course.priceCents > 0;
  const hasPaid = access === "paid";
  const price = formatPrice(course.priceCents);
  const next = nextLesson(lessons, state.completed, enrolment?.lastLessonId ?? null, hasPaid ? "paid" : "free");
  const goNext = () => next && navigate(`/app/forum/courses/${course.id}/lessons/${next.id}`);

  const start = async (tier: "free" | "paid") => {
    if (busy) return;
    setNotice(null);
    if (tier === "paid" && !state.paidOpen) {
      setNotice(PAID_OPEN_SOON);
      return;
    }
    if (enrolment && tier === "free") return goNext();
    setBusy(tier);
    const r = await enrol(course.id, tier);
    setBusy(null);
    if (!r.ok) {
      setNotice(r.message);
      return;
    }
    if (tier === "free") return goNext();
    // A paid enrolment that did not take (enrol_in_course keeps an existing
    // free enrolment's tier) must say so rather than look like nothing happened.
    if ((await fetchAccessLevel(course.id)) !== "paid") {
      setNotice("Your free start couldn't be switched to the full course yet. Try again later.");
      return;
    }
    await reload();
  };

  const minutesByWeek = (moduleId: string) =>
    minutesLabel(lessons.filter((l) => l.moduleId === moduleId).reduce((s, l) => s + (l.minutes ?? 0), 0));
  const weeksShown = allWeeks ? modules : modules.slice(0, 2);

  return (
    <div className="flex flex-col -mx-4" style={{ color: fv("text") }}>
      <div className="h-[180px] flex flex-col justify-between p-3" style={{ background: course.coverColour }}>
        {back}
        <span className="self-start">
          <CoverPill>{coursePill(course.level, modules.length, course.weeklyHours)}</CoverPill>
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <h1 className="m-0 text-[22px] font-extrabold leading-[1.25] [overflow-wrap:anywhere] [text-wrap:balance]">{course.title}</h1>
        <span className="flex gap-1.5 items-center text-[13px]">
          <span
            className="w-7 h-7 rounded-full inline-flex items-center justify-center font-extrabold shrink-0"
            style={{ background: fv("teal-bg"), color: fv("teal-ink") }}
            aria-hidden="true"
          >
            {authorName.charAt(0).toUpperCase()}
          </span>
          <Instructor authorId={course.authorId} name={authorName} link />
        </span>
        <span className="flex gap-1.5 items-center flex-wrap text-[13px]" style={{ color: fv("muted") }}>
          {stats.averageRating === null ? (
            "No ratings yet"
          ) : (
            <>
              <StarIcon /> {stats.averageRating.toFixed(1)} · {stats.ratings} {stats.ratings === 1 ? "rating" : "ratings"}
            </>
          )}
          {/* Hidden below three, like the card's: "1 learner" tells that one
              learner they are the only one, which is not what a count is for. */}
          {enrolledLabel(stats.enrolled) && (
            <>
              <span aria-hidden="true">·</span>
              <span>{enrolledLabel(stats.enrolled)}</span>
            </>
          )}
        </span>

        {course.learnPoints.length > 0 && (
          <div className="rounded-2xl p-[14px] flex flex-col gap-2" style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}>
            <span className="text-sm font-extrabold">What you'll learn</span>
            {course.learnPoints.map((p) => (
              <span key={p} className="flex gap-2 text-[13px] leading-[1.5] [overflow-wrap:anywhere]">
                <span className="pt-[3px]">
                  <CheckIcon />
                </span>
                {p}
              </span>
            ))}
          </div>
        )}

        {modules.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-extrabold">Syllabus</span>
            {weeksShown.map((m, i) => {
              const contents = weekContents(lessons.filter((l) => l.moduleId === m.id).map((l) => l.kind));
              const mins = minutesByWeek(m.id);
              return (
                <div
                  key={m.id}
                  className="rounded-[14px] px-[14px] py-3 flex justify-between gap-3 text-[13px]"
                  style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}
                >
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    <strong>Week {i + 1}</strong> · {m.title}
                    {contents ? `: ${contents}` : ""}
                  </span>
                  {mins && (
                    <span className="shrink-0" style={{ color: fv("muted") }}>
                      {mins}
                    </span>
                  )}
                </div>
              );
            })}
            {modules.length > 2 && (
              <div
                className="rounded-[14px] px-[14px] py-1.5 flex justify-between items-center text-[13px]"
                style={{ background: fv("card"), border: `1px solid ${fv("border")}`, color: fv("muted") }}
              >
                <span>{allWeeks ? `All ${modules.length} weeks` : `${modules.length - 2} more ${modules.length - 2 === 1 ? "week" : "weeks"}`}</span>
                <button type="button" onClick={() => setAllWeeks(!allWeeks)} className="tap font-bold py-2" style={{ color: fv("link") }}>
                  {allWeeks ? "Show fewer" : "See all"}
                </button>
              </div>
            )}
          </div>
        )}

        {paidCourse && !hasPaid && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-extrabold">Choose how to take it</span>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0 rounded-2xl p-3 flex flex-col gap-1.5" style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}>
                <span className="text-sm font-extrabold">Watch free</span>
                <span className="text-xs leading-[1.5]" style={{ color: fv("muted") }}>
                  All video lessons and readings
                </span>
              </div>
              <div className="flex-1 min-w-0 rounded-2xl p-3 flex flex-col gap-1.5" style={{ background: fv("rules-bg"), border: `2px solid ${fv("accent")}` }}>
                <span className="text-sm font-extrabold">Full course · {price}</span>
                <span className="text-xs leading-[1.5] [overflow-wrap:anywhere]" style={{ color: fv("rules-ink") }}>
                  Plus quizzes, downloadable plans, questions to {authorName} and a certificate of completion
                </span>
              </div>
            </div>
          </div>
        )}

        {notice && (
          <p role="status" className="m-0 text-sm font-bold rounded-xl px-3.5 py-3" style={{ background: fv("amber-bg"), color: fv("held-ink") }}>
            {notice}
          </p>
        )}

        {isAuthor ? (
          <PrimaryButton onClick={goNext}>Open your course</PrimaryButton>
        ) : !paidCourse || hasPaid ? (
          <PrimaryButton onClick={() => void start("free")} busy={busy === "free"}>
            {enrolment ? "Continue the course" : "Start the course"}
          </PrimaryButton>
        ) : (
          <>
            <PrimaryButton onClick={() => void start("paid")} busy={busy === "paid"}>
              Get the full course · {price}
            </PrimaryButton>
            <button
              type="button"
              onClick={() => void start("free")}
              disabled={!!busy}
              className="tap h-[50px] rounded-2xl text-[15px] font-bold disabled:opacity-60"
              style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
            >
              {busy === "free" ? "Starting…" : enrolment ? "Continue watching free" : "Start watching free"}
            </button>
          </>
        )}

        {hasPaid && !isAuthor && enrolment && (
          <CertificateCard certificate={state.certificate} />
        )}

        {hasPaid && (
          <QuestionsSection
            courseId={course.id}
            authorName={authorName}
            questions={state.questions}
            canAsk={!isAuthor && !!enrolment}
            onAsked={reload}
          />
        )}

        {enrolment && !isAuthor && <RateSection courseId={course.id} initial={state.myRating} onSaved={reload} />}

        <span className="text-[11px] leading-[1.5]" style={{ color: fv("muted") }}>
          Reviewed by Centium before publishing. Courses share general guidance, not personal medical advice. A certificate of
          completion is not a professional qualification.
        </span>
      </div>
    </div>
  );
}

function PrimaryButton({ onClick, busy, children }: { onClick: () => void; busy?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="tap h-[54px] rounded-2xl text-base font-extrabold disabled:opacity-60 px-3"
      style={{ background: fv("accent"), color: fv("on-accent") }}
    >
      {busy ? "Starting…" : children}
    </button>
  );
}

/**
 * The certificate, and the switch that makes it public.
 *
 * OFF BY DEFAULT, AND PER CERTIFICATE. The default is the database's
 * (course_certificates.shared is `not null default false`), and the switch is
 * per certificate rather than per account so that publishing one course does
 * not volunteer the rest.
 *
 * THE LINK ONLY EXISTS WHILE IT IS ON. While the switch is off,
 * course_certificate(serial) answers a stranger with nothing — so showing the
 * URL would be showing a link that leads nowhere, and the page it leads to is
 * deliberately unable to say why.
 */
function CertificateCard({ certificate }: { certificate: Certificate | null }) {
  const [shared, setShared] = useState(certificate?.shared ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const url = certificate ? `${window.location.origin}/certificate/${certificate.serial}` : "";

  const toggle = async (next: boolean) => {
    if (!certificate || busy) return;
    setBusy(true);
    setError(null);
    // Optimistic, then corrected by the write: a switch should move under the
    // finger, and a failed write puts it back and says so.
    setShared(next);
    const r = await setCertificateSharing(certificate.id, next);
    if (!r.ok) {
      setShared(!next);
      setError(r.message);
    }
    setBusy(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Couldn't copy the link. Select it and copy it by hand.");
    }
  };

  return (
    <div className="rounded-2xl p-[14px] flex flex-col gap-2" style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}>
      <span className="text-sm font-extrabold">Certificate of completion</span>
      {certificate ? (
        <>
          <span className="text-[13px] leading-[1.5]" style={{ color: fv("muted") }}>
            Earned {new Date(certificate.issuedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
            {certificate.serial}
          </span>

          <label className="flex items-center justify-between gap-3 mt-1 cursor-pointer">
            <span className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold">Share certificate</span>
              <span className="text-xs leading-[1.45]" style={{ color: fv("muted") }}>
                {shared
                  ? "Anyone with the link can see your first name, this course, the professional and the date."
                  : "Off. Only you can see it."}
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={shared}
              disabled={busy}
              onChange={(e) => void toggle(e.target.checked)}
              className="sr-only peer"
              aria-label="Share certificate"
            />
            <span
              aria-hidden="true"
              className="w-[42px] h-[25px] rounded-full shrink-0 relative transition-colors"
              style={{ background: shared ? fv("accent") : fv("track"), opacity: busy ? 0.6 : 1 }}
            >
              <span
                className="absolute top-[3px] w-[19px] h-[19px] rounded-full bg-white transition-all"
                style={{ left: shared ? 20 : 3 }}
              />
            </span>
          </label>

          {shared && (
            <div className="flex items-center gap-2 rounded-xl px-2.5 py-2" style={{ background: fv("track") }}>
              <span className="text-[11px] grow min-w-0 truncate" style={{ color: fv("muted") }}>
                {url}
              </span>
              <button
                type="button"
                onClick={() => void copy()}
                className="tap text-[11px] font-extrabold rounded-full px-2.5 py-1 shrink-0"
                style={{ background: fv("card"), color: fv("link"), border: `1px solid ${fv("border")}` }}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          )}

          {error && (
            <span role="alert" className="text-xs font-semibold" style={{ color: fv("danger") }}>
              {error}
            </span>
          )}
        </>
      ) : (
        <span className="text-[13px] leading-[1.5]" style={{ color: fv("muted") }}>
          Finish every lesson and pass every quiz to earn it.
        </span>
      )}
    </div>
  );
}

function QuestionsSection({
  courseId,
  authorName,
  questions,
  canAsk,
  onAsked,
}: {
  courseId: string;
  authorName: string;
  questions: CourseQuestion[];
  canAsk: boolean;
  onAsked: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    if (draft.trim().length < 4 || busy) {
      setError("Write at least a few words.");
      return;
    }
    setBusy(true);
    setError(null);
    const r = await askQuestion(courseId, draft);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setDraft("");
    await onAsked();
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-extrabold">Questions to {authorName}</span>
      {canAsk && (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            placeholder="Ask a question about the course"
            aria-label={`Ask ${authorName} a question`}
            className="h-[84px] rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
            style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
          />
          <span className="text-xs leading-[1.5]" style={{ color: fv("muted") }}>
            Questions and answers are shared with everyone taking the full course. Your name isn't shown.
          </span>
          {error && <p role="alert" className="m-0 text-xs font-semibold text-status-high">{error}</p>}
          <button
            type="button"
            onClick={() => void ask()}
            disabled={busy}
            className="tap self-start h-10 rounded-full px-4 text-[13px] font-extrabold disabled:opacity-60"
            style={{ background: fv("accent"), color: fv("on-accent") }}
          >
            {busy ? "Sending…" : "Ask"}
          </button>
        </>
      )}
      {questions.map((q) => (
        <div key={q.id} className="rounded-[14px] px-[14px] py-3 flex flex-col gap-1.5 text-[13px]" style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}>
          <span className="font-bold [overflow-wrap:anywhere] whitespace-pre-wrap">{q.body}</span>
          <span className="leading-[1.5] [overflow-wrap:anywhere] whitespace-pre-wrap" style={{ color: q.answer ? fv("body") : fv("muted") }}>
            {q.answer ?? "Waiting for an answer"}
          </span>
        </div>
      ))}
      {questions.length === 0 && !canAsk && (
        <span className="text-[13px]" style={{ color: fv("muted") }}>
          No questions yet.
        </span>
      )}
    </div>
  );
}

function RateSection({
  courseId,
  initial,
  onSaved,
}: {
  courseId: string;
  initial: { stars: number; body: string | null } | null;
  onSaved: () => Promise<unknown>;
}) {
  const [stars, setStars] = useState(initial?.stars ?? 0);
  const [body, setBody] = useState(initial?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    if (!stars || busy) return;
    setBusy(true);
    setMessage(null);
    const r = await rateCourse(courseId, stars, body);
    setBusy(false);
    setMessage(r.ok ? "Thanks, your rating is saved." : r.message);
    if (r.ok) await onSaved();
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-extrabold">{initial ? "Your rating" : "Rate this course"}</span>
      <div className="flex gap-1" role="radiogroup" aria-label="Stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
            onClick={() => setStars(n)}
            className="tap w-11 h-11 flex items-center justify-center"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill={n <= stars ? fv("star") : "none"} stroke={fv("star")} strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
            </svg>
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        placeholder="Add a few words (optional)"
        aria-label="Your review (optional)"
        className="h-[72px] rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
        style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
      />
      {message && (
        <p role="status" className="m-0 text-xs font-semibold" style={{ color: fv("muted") }}>
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={() => void save()}
        disabled={!stars || busy}
        className="tap self-start h-10 rounded-full px-4 text-[13px] font-extrabold disabled:opacity-50"
        style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
      >
        {busy ? "Saving…" : "Save rating"}
      </button>
    </div>
  );
}
