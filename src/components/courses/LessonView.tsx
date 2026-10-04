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
  const [completed, attempts] = await Promise.all([
    enrolment ? fetchCompleted([enrolment.id]).then((m) => m.get(enrolment.id) ?? new Set<string>()) : Promise.resolve(new Set<string>()),
    enrolment && access === "paid" ? fetchBestAttempts(enrolment.id) : Promise.resolve(new Map()),
  ]);
  return {
    course,
    authorName: names.get(course.authorId ?? "") ?? "the professional",
    modules: tree.modules.sort((a, b) => a.position - b.position),
    lessons: tree.lessons,
    access,
    enrolment,
    completed,
    attempts,
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

  const toCourse = `/app/forum/courses/${courseId}`;
  const backButton = (
    <Link to={toCourse} aria-label="Back to course" className="tap w-11 h-11 flex items-center justify-center shrink-0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={fv("text")} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </Link>
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
          This lesson isn't available.
        </p>
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
            Week {weekIndex + 1} · Lesson {n} of {week.length}
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
        {lesson.kind === "reading" && (
          <div
            className="rounded-2xl p-[14px] text-sm leading-[1.6] whitespace-pre-wrap [overflow-wrap:anywhere]"
            style={{ background: fv("card"), border: `1px solid ${fv("border")}`, color: fv("body") }}
          >
            {lesson.body}
          </div>
        )}

        {lesson.kind === "quiz" &&
          (open ? (
            <QuizBlock
              lesson={lesson}
              best={state.attempts.get(lesson.id) ?? null}
              onPassed={async () => setState(await loadLesson(courseId, userId))}
            />
          ) : (
            <LockedNote>Quizzes are part of the full course.</LockedNote>
          ))}

        {lesson.kind === "pdf" && (open ? <PdfBlock lessonId={lesson.id} /> : <LockedNote>Downloadable plans are part of the full course.</LockedNote>)}

        {open && lesson.kind !== "quiz" && (
          <button
            type="button"
            onClick={() => void markComplete()}
            disabled={busy || done}
            aria-pressed={done}
            className="tap h-12 rounded-[14px] text-sm font-extrabold flex items-center justify-center gap-2 disabled:cursor-default"
            style={{ background: fv("teal-bg"), color: fv("done-ink"), opacity: busy ? 0.6 : 1 }}
          >
            <CheckIcon />
            {done ? "Completed" : busy ? "Saving…" : "Mark as complete"}
          </button>
        )}
        {error && (
          <p role="alert" className="m-0 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-extrabold">This week</span>
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
                className="tap flex justify-between items-center gap-3 text-[13px] py-2.5 text-left"
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
                  {!lOpen ? "Full course" : mins ?? ""}
                </span>
              </button>
            );
          })}
        </div>

        {showUpgrade && (
          <div className="rounded-2xl p-[14px] flex flex-col gap-2" style={{ background: fv("rules-bg") }}>
            <span className="text-sm font-extrabold" style={{ color: fv("rules-ink") }}>
              Get more from this course
            </span>
            <span className="text-[13px] leading-[1.5]" style={{ color: fv("rules-ink") }}>
              Quizzes, printable plans, questions answered by {state.authorName} and a certificate when you finish.
            </span>
            <Link
              to={toCourse}
              className="h-[46px] rounded-[14px] flex items-center justify-center text-sm font-extrabold no-underline"
              style={{ background: fv("accent"), color: fv("on-accent") }}
            >
              Get the full course · {formatPrice(course.priceCents)}
            </Link>
          </div>
        )}
      </div>
    </div>
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
        {busy ? "Opening…" : "Download the PDF"}
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
    if (questions.some((q) => !answers[q.id])) return setError("Answer every question first.");
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
          Pass mark {lesson.passMark}%{shownBest ? ` · your best ${shownBest.score}%${shownBest.passed ? ", passed" : ""}` : ""}
        </span>
      )}
      {questions === null && !error && <ForumPlaceholder height={140} />}
      {questions?.map((q, i) => (
        <fieldset key={q.id} className="border-none m-0 p-[14px] rounded-2xl flex flex-col gap-1" style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}>
          <legend className="sr-only">Question {i + 1}</legend>
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
          {result.passed ? `Passed with ${result.score}%.` : `${result.score}%. You need ${lesson.passMark}% to pass. Have another go.`}
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
          {busy ? "Checking…" : "Check my answers"}
        </button>
      )}
    </div>
  );
}
