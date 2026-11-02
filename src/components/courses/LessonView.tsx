import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  completeLesson,
  enrol,
  fetchAccessLevel,
  fetchAuthorNames,
  fetchBestAttempts,
  fetchCompleted,
  fetchCourse,
  fetchMyEnrolments,
  fetchQuiz,
  fetchTrees,
  orderedLessons,
  pdfLink,
  submitQuiz,
  type Course,
  type CourseModule,
  type Enrolment,
  type Lesson,
  type QuizQuestion,
} from "../../services/courses";
import { formatPrice, lessonOpenTo, minutesLabel, youtubeEmbedUrl, type AccessLevel } from "../../services/courses/rules";
import { ForumPlaceholder } from "../forum/parts";
import { fv } from "../forum/forumColor";
import { CheckIcon, LockIcon } from "./courseParts";
import { useBack } from "../../hooks/useBack";
import { CalendarClock } from "lucide-react";
import { fetchDripSchedule, fetchLessonIsOpen } from "../../services/courses/drip";
import { lessonDripLine, nextLocked, type DripRow } from "./drip";
import { LessonMarkdown } from "./LessonMarkdown";
import { fetchLessonImagePaths, fetchMyCheckIn, lessonImageUrl, submitCheckIn } from "../../services/courses/extras";
import { CHECK_IN_ANSWER_MAX } from "../../services/courses/authorRules";
import { appLocale } from "../../i18n/format";
import { t } from "../../i18n/core";

// Design screen 8: a lesson. The video is YouTube's official embedded player
// on the privacy-enhanced domain (youtube-nocookie.com), with no autoplay and
// nothing in front of it: every video and reading is free to watch, so
// playback is never gated, whoever is watching. Quizzes and PDFs are the
// full course's, shown locked with the gentle upgrade card to a free learner.

type Loaded = {
  course: Course;
  authorName: string;
  modules: CourseModule[];
  lessons: Lesson[];
  access: AccessLevel;
  enrolment: Enrolment | null;
  completed: Set<string>;
  attempts: Map<string, { score: number; passed: boolean }>;
  /** CU25: the modules' opening days for this learner (empty = all at once). */
  drip: DripRow[];
};

async function loadLesson(courseId: string, userId: string): Promise<Loaded | null> {
  const c = await fetchCourse(courseId);
  if (!c.ok || !c.value) return null;
  const course = c.value;
  const [tree, access, enrolments, names] = await Promise.all([
    fetchTrees([course.id]),
    fetchAccessLevel(course.id),
    fetchMyEnrolments(userId),
    fetchAuthorNames(course.authorId ? [course.authorId] : []),
  ]);
  const enrolment = enrolments.find((e) => e.courseId === course.id) ?? null;
  const [completed, attempts, drip] = await Promise.all([
    enrolment ? fetchCompleted([enrolment.id]).then((m) => m.get(enrolment.id) ?? new Set<string>()) : Promise.resolve(new Set<string>()),
    enrolment && access === "paid" ? fetchBestAttempts(enrolment.id) : Promise.resolve(new Map()),
    enrolment ? fetchDripSchedule(course.id) : Promise.resolve([]),
  ]);
  return {
    course,
    authorName: names.get(course.authorId ?? "") ?? t("the professional"),
    modules: tree.modules.sort((a, b) => a.position - b.position),
    lessons: tree.lessons,
    access,
    enrolment,
    completed,
    attempts,
    drip,
  };
}

export function LessonView({ courseId, lessonId, userId }: { courseId: string; lessonId: string; userId: string }) {
  const navigate = useNavigate();
  const [state, setState] = useState<Loaded | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void loadLesson(courseId, userId).then((s) => live && setState(s));
    return () => {
      live = false;
    };
  }, [courseId, userId]);

  // CU25: a lesson in a week that hasn't opened is hidden from the learner
  // (course_lessons RLS), so its page asks course_lesson_is_open to say "not
  // open yet" rather than "not available". Only when the lesson isn't loaded.
  const missing = !!state && !orderedLessons(state.modules, state.lessons, state.course.id).some((l) => l.id === lessonId);
  const [lockedLesson, setLockedLesson] = useState<string | null>(null);
  useEffect(() => {
    if (!missing) return;
    let live = true;
    void fetchLessonIsOpen(lessonId).then((isOpen) => live && setLockedLesson(isOpen ? null : lessonId));
    return () => {
      live = false;
    };
  }, [missing, lessonId]);

  const toCourse = `/app/forum/courses/${courseId}`;
  // Batch E (E5): pops back to the course (no loop through a pushed copy of
  // it); opened directly, replaces with the course.
  const goBack = useBack(toCourse);
  const backButton = (
    <button type="button" onClick={goBack} aria-label={t("Back to course")} className="tap w-11 h-11 flex items-center justify-center shrink-0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={fv("text")} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="rtl:-scale-x-100">
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );

  if (state === undefined) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <ForumPlaceholder height={44} />
        <ForumPlaceholder height={219} />
        <ForumPlaceholder height={160} />
      </div>
    );
  }

  const all = state ? orderedLessons(state.modules, state.lessons, state.course.id) : [];
  const lesson = all.find((l) => l.id === lessonId);
  if (!state || !lesson) {
    return (
      <div className="flex flex-col gap-3" style={{ color: fv("text") }}>
        <div className="-mx-1">{backButton}</div>
        <p className="text-sm text-center py-8" style={{ color: fv("muted") }}>
          {lockedLesson === lessonId ? t("This lesson isn't open yet.") : t("This lesson isn't available.")}
        </p>
        {state && lockedLesson === lessonId && <DripLine author={state.authorName} modules={state.modules} drip={state.drip} />}
      </div>
    );
  }

  const { course, access, enrolment, completed } = state;
  const weekIndex = state.modules.findIndex((m) => m.id === lesson.moduleId);
  const week = all.filter((l) => l.moduleId === lesson.moduleId);
  const n = week.findIndex((l) => l.id === lesson.id) + 1;
  const open = lessonOpenTo(lesson.kind, access);
  const done = completed.has(lesson.id);
  const embed = lesson.kind === "video" ? youtubeEmbedUrl(lesson.videoId) : null;
  const showUpgrade = access === "free" && course.priceCents > 0;

  const markComplete = async () => {
    if (busy || done) return;
    setBusy(true);
    setError(null);
    // Not started yet: marking a free lesson done starts the course for free.
    if (!enrolment) {
      const e = await enrol(course.id, "free");
      if (!e.ok) {
        setBusy(false);
        return setError(e.message);
      }
    }
    const r = await completeLesson(lesson.id);
    if (!r.ok) {
      setBusy(false);
      return setError(r.message);
    }
    const fresh = await loadLesson(courseId, userId);
    setBusy(false);
    setState(fresh);
  };

  return (
    <div className="flex flex-col" style={{ color: fv("text") }}>
      <div className="flex items-center gap-1 -mx-1 pb-3">
        {backButton}
        <div className="flex flex-col min-w-0">
          <span className="text-xs" style={{ color: fv("muted") }}>
            {t("Week {week} · Lesson {n} of {total}", { week: weekIndex + 1, n, total: week.length })}
          </span>
          <span className="text-[15px] font-extrabold [overflow-wrap:anywhere]">{lesson.title}</span>
        </div>
      </div>

      {lesson.kind === "video" && (
        <div className="-mx-4 aspect-video" style={{ background: fv("video-bg") }}>
          {embed && (
            <iframe
              key={lesson.id}
              src={embed}
              title={lesson.title}
              className="w-full h-full border-0 block"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          )}
        </div>
      )}

      <div className="pt-[14px] flex flex-col gap-3">
        {/* Round D: lesson text is limited Markdown, rendered without HTML. */}
        {lesson.kind === "reading" && (
          <div className="rounded-2xl p-[14px] text-sm leading-[1.6]" style={{ background: fv("card"), border: `1px solid ${fv("border")}`, color: fv("body") }}>
            <LessonMarkdown text={lesson.body} linkColour={fv("link")} />
          </div>
        )}

        {lesson.kind === "image" && <ImageBlock lesson={lesson} enrolled={!!enrolment} />}

        {lesson.kind === "check_in" && (
          <CheckInBlock
            lesson={lesson}
            authorName={state.authorName}
            canAnswer={!!enrolment}
            onAnswered={async () => setState(await loadLesson(courseId, userId))}
          />
        )}

        {lesson.kind === "quiz" &&
          (open ? (
            <QuizBlock
              lesson={lesson}
              best={state.attempts.get(lesson.id) ?? null}
              onPassed={async () => setState(await loadLesson(courseId, userId))}
            />
          ) : (
            <LockedNote>{t("Quizzes are part of the full course.")}</LockedNote>
          ))}

        {lesson.kind === "pdf" && (open ? <PdfBlock lessonId={lesson.id} /> : <LockedNote>{t("Downloadable plans are part of the full course.")}</LockedNote>)}

        {open && lesson.kind !== "quiz" && lesson.kind !== "check_in" && (
          <button
            type="button"
            onClick={() => void markComplete()}
            disabled={busy || done}
            aria-pressed={done}
            className="tap h-12 rounded-[14px] text-sm font-extrabold flex items-center justify-center gap-2 disabled:cursor-default"
            style={{ background: fv("teal-bg"), color: fv("done-ink"), opacity: busy ? 0.6 : 1 }}
          >
            <CheckIcon />
            {done ? t("Completed") : busy ? t("Saving…") : t("Mark as complete")}
          </button>
        )}
        {error && (
          <p role="alert" className="m-0 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-extrabold">{t("This week")}</span>
          {week.map((l, i) => {
            const lOpen = lessonOpenTo(l.kind, access);
            const current = l.id === lesson.id;
            const mins = minutesLabel(l.minutes ?? 0);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => navigate(`${toCourse}/lessons/${l.id}`)}
                aria-current={current ? "page" : undefined}
                className="tap flex justify-between items-center gap-3 text-[13px] py-2.5 text-start"
                style={{
                  borderBottom: i < week.length - 1 ? `1px solid ${fv("rule")}` : undefined,
                  color: lOpen ? fv("text") : fv("muted"),
                  fontWeight: current ? 800 : undefined,
                }}
              >
                <span className="flex gap-2 items-center min-w-0 [overflow-wrap:anywhere]">
                  {!lOpen ? <LockIcon /> : completed.has(l.id) ? <CheckIcon /> : current ? <span aria-hidden="true">▶</span> : <span className="w-[14px] shrink-0" />}
                  {l.title}
                </span>
                <span className="shrink-0" style={{ color: fv("muted"), fontWeight: 600 }}>
                  {!lOpen ? t("Full course") : mins ?? ""}
                </span>
              </button>
            );
          })}
        </div>

        {/* CU25 (Release 3): when the next week opens, under This week
            (r29: 12.5 muted, CalendarClock 13 / 2, gap 6, padding 2 0). */}
        <DripLine author={state.authorName} modules={state.modules} drip={state.drip} />

        {showUpgrade && (
          <div className="rounded-2xl p-[14px] flex flex-col gap-2" style={{ background: fv("rules-bg") }}>
            <span className="text-sm font-extrabold" style={{ color: fv("rules-ink") }}>
              {t("Get more from this course")}
            </span>
            <span className="text-[13px] leading-[1.5]" style={{ color: fv("rules-ink") }}>
              {t("Quizzes, printable plans, questions answered by {name} and a certificate when you finish.", { name: state.authorName })}
            </span>
            <Link
              to={toCourse}
              className="h-[46px] rounded-[14px] flex items-center justify-center text-sm font-extrabold no-underline"
              style={{ background: fv("accent"), color: fv("on-accent") }}
            >
              {t("Get the full course · {price}", { price: formatPrice(course.priceCents) })}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/** CU25: "Week 2 opens Thursday 15 Oct. Alex opens a week at a time." Nothing when every week is open. */
function DripLine({ author, modules, drip }: { author: string; modules: CourseModule[]; drip: DripRow[] }) {
  const next = nextLocked(drip);
  const week = next ? modules.findIndex((m) => m.id === next.moduleId) + 1 : 0;
  if (!next?.opensAt || week < 1) return null;
  return (
    <p className="m-0 flex items-center gap-1.5 text-[12.5px] py-0.5" style={{ color: fv("muted") }}>
      <CalendarClock size={13} strokeWidth={2} className="shrink-0" aria-hidden />
      {lessonDripLine(author, week, next.opensAt)}
    </p>
  );
}

function LockedNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-[14px] flex gap-2 items-center text-[13px]" style={{ background: fv("card"), border: `1px solid ${fv("border")}`, color: fv("muted") }}>
      <LockIcon />
      {children}
    </div>
  );
}

function PdfBlock({ lessonId }: { lessonId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = async () => {
    setBusy(true);
    setError(null);
    const r = await pdfLink(lessonId);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    window.open(r.value, "_blank", "noopener");
  };
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void open()}
        disabled={busy}
        className="tap h-12 rounded-[14px] text-sm font-extrabold disabled:opacity-60"
        style={{ background: fv("accent"), color: fv("on-accent") }}
      >
        {busy ? t("Opening…") : t("Download the PDF")}
      </button>
      {error && <p role="alert" className="m-0 text-xs font-semibold text-status-high">{error}</p>}
    </div>
  );
}

function QuizBlock({
  lesson,
  best,
  onPassed,
}: {
  lesson: Lesson;
  best: { score: number; passed: boolean } | null;
  onPassed: () => Promise<void>;
}) {
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void fetchQuiz(lesson.id).then((r) => {
      if (!live) return;
      if (r.ok) setQuestions(r.value);
      else setError(r.message);
    });
    return () => {
      live = false;
    };
  }, [lesson.id]);

  const submit = async () => {
    if (!questions || busy) return;
    if (questions.some((q) => !answers[q.id])) return setError(t("Answer every question first."));
    setBusy(true);
    setError(null);
    const r = await submitQuiz(lesson.id, answers);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setResult(r.value);
    if (r.value.passed) await onPassed();
  };

  const shownBest = result ?? best;

  return (
    <div className="flex flex-col gap-3">
      {lesson.passMark !== null && (
        <span className="text-[13px]" style={{ color: fv("muted") }}>
          {t("Pass mark {n}%", { n: lesson.passMark })}
          {shownBest ? ` · ${shownBest.passed ? t("your best {score}%, passed", { score: shownBest.score }) : t("your best {score}%", { score: shownBest.score })}` : ""}
        </span>
      )}
      {questions === null && !error && <ForumPlaceholder height={140} />}
      {questions?.map((q, i) => (
        <fieldset key={q.id} className="border-none m-0 p-[14px] rounded-2xl flex flex-col gap-1" style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}>
          <legend className="sr-only">{t("Question {n}", { n: i + 1 })}</legend>
          <span className="text-sm font-bold mb-1 [overflow-wrap:anywhere]">
            {i + 1}. {q.prompt}
          </span>
          {q.options.map((o) => (
            <label key={o.id} className="flex items-center gap-2.5 min-h-[44px] text-sm cursor-pointer [overflow-wrap:anywhere]">
              <input
                type="radio"
                name={`q-${q.id}`}
                checked={answers[q.id] === o.id}
                onChange={() => setAnswers({ ...answers, [q.id]: o.id })}
                style={{ accentColor: fv("accent") }}
              />
              {o.body}
            </label>
          ))}
        </fieldset>
      ))}
      {result && (
        <p role="status" className="m-0 text-sm font-bold rounded-xl px-3.5 py-3" style={result.passed ? { background: fv("teal-bg"), color: fv("done-ink") } : { background: fv("amber-bg"), color: fv("held-ink") }}>
          {result.passed ? t("Passed with {score}%.", { score: result.score }) : t("{score}%. You need {n}% to pass. Have another go.", { score: result.score, n: lesson.passMark ?? 0 })}
        </p>
      )}
      {error && <p role="alert" className="m-0 text-xs font-semibold text-status-high">{error}</p>}
      {questions && questions.length > 0 && (
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="tap h-12 rounded-[14px] text-sm font-extrabold disabled:opacity-60"
          style={{ background: fv("accent"), color: fv("on-accent") }}
        >
          {busy ? t("Checking…") : t("Check my answers")}
        </button>
      )}
    </div>
  );
}

/** Round D: an Image lesson. The image is private (course-images), read with a short-lived link by an enrolled learner; the caption is limited Markdown. */
function ImageBlock({ lesson, enrolled }: { lesson: Lesson; enrolled: boolean }) {
  const [src, setSrc] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void fetchLessonImagePaths([lesson.id])
      .then((m) => lessonImageUrl(m.get(lesson.id)))
      .then((u) => live && setSrc(u));
    return () => {
      live = false;
    };
  }, [lesson.id]);
  return (
    <div className="flex flex-col gap-2.5">
      {src === undefined ? (
        <ForumPlaceholder height={200} />
      ) : src ? (
        <img src={src} alt={lesson.title} className="block w-full rounded-2xl" style={{ background: fv("card"), border: `1px solid ${fv("border")}` }} />
      ) : (
        <div className="rounded-2xl p-[14px] text-[13px]" style={{ background: fv("card"), border: `1px solid ${fv("border")}`, color: fv("muted") }}>
          {enrolled ? t("The image isn't ready yet.") : t("Start the course to see this image.")}
        </div>
      )}
      {lesson.body && (
        <div className="text-[13.5px] leading-[1.6]" style={{ color: fv("body") }}>
          <LessonMarkdown text={lesson.body} linkColour={fv("link")} />
        </div>
      )}
    </div>
  );
}

/**
 * Round D: a Check-in lesson. The learner answers the author's question
 * (1 to 4,000 characters); answering again replaces the answer, and sending
 * it completes the lesson. Only the author reads the answers.
 */
function CheckInBlock({ lesson, authorName, canAnswer, onAnswered }: { lesson: Lesson; authorName: string; canAnswer: boolean; onAnswered: () => Promise<void> }) {
  const [saved, setSaved] = useState<{ answer: string; updatedAt: string } | null | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    // Not enrolled: there's no answer to read (the block says to start the course).
    if (!canAnswer) return;
    let live = true;
    void fetchMyCheckIn(lesson.id).then((r) => {
      if (!live) return;
      setSaved(r);
      setDraft(r?.answer ?? "");
    });
    return () => {
      live = false;
    };
  }, [lesson.id, canAnswer]);

  const send = async () => {
    const answer = draft.trim();
    if (busy || !answer) return;
    if (answer.length > CHECK_IN_ANSWER_MAX) return setError(t("Keep your answer to {n} characters.", { n: CHECK_IN_ANSWER_MAX.toLocaleString(appLocale("en-US")) }));
    setBusy(true);
    setError(null);
    const r = await submitCheckIn(lesson.id, answer);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setSaved({ answer, updatedAt: new Date().toISOString() });
    setEditing(false);
    setSent(true);
    await onAnswered();
  };

  const showForm = canAnswer && (saved === null || editing);
  return (
    <div className="rounded-2xl p-[14px] flex flex-col gap-2.5" style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}>
      {lesson.body && (
        <div className="text-sm leading-[1.6] font-semibold" style={{ color: fv("text") }}>
          <LessonMarkdown text={lesson.body} linkColour={fv("link")} />
        </div>
      )}
      {!canAnswer ? (
        <span className="text-[13px]" style={{ color: fv("muted") }}>
          {t("Start the course to answer.")}
        </span>
      ) : saved === undefined ? (
        <ForumPlaceholder height={80} />
      ) : showForm ? (
        <>
          <label htmlFor={`check-in-${lesson.id}`} className="sr-only">
            {t("Your answer")}
          </label>
          <textarea
            id={`check-in-${lesson.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            maxLength={CHECK_IN_ANSWER_MAX}
            placeholder={t("Your answer")}
            className="block w-full rounded-xl p-3 text-sm leading-[1.5] outline-none resize-y"
            style={{ background: "transparent", border: `1px solid ${fv("border")}`, color: fv("text") }}
          />
          <span className="text-xs" style={{ color: fv("muted") }}>
            {t("Only {name} sees your answer.", { name: authorName })}
          </span>
          <div className="flex gap-2">
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft(saved?.answer ?? "");
                  setError(null);
                }}
                className="tap h-12 px-4 rounded-[14px] text-sm font-bold"
                style={{ background: fv("rules-bg"), color: fv("rules-ink") }}
              >
                {t("Cancel")}
              </button>
            )}
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !draft.trim()}
              className="tap flex-1 h-12 rounded-[14px] text-sm font-extrabold disabled:opacity-60"
              style={{ background: fv("accent"), color: fv("on-accent") }}
            >
              {busy ? t("Sending…") : t("Send to {name}", { name: authorName })}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="m-0 text-sm leading-[1.5] whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ color: fv("body") }}>
            {saved?.answer}
          </p>
          <span role="status" className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: fv("done-ink") }}>
            <CheckIcon />
            {sent ? t("Sent to {name}", { name: authorName }) : t("You answered. Only {name} sees it.", { name: authorName })}
          </span>
          <button type="button" onClick={() => setEditing(true)} className="tap self-start text-[13px] font-bold min-h-[44px]" style={{ color: fv("link") }}>
            {t("Change my answer")}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="m-0 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {error}
        </p>
      )}
    </div>
  );
}
