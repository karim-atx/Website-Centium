import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, CalendarClock, Check, ChevronRight, ClipboardCheck, ClipboardList, FileText, Image as ImageIcon, Loader2, Lock, Star, Video } from "lucide-react";
import {
  askQuestion,
  enrol,
  fetchAccessLevel,
  fetchAuthorNames,
  fetchCompleted,
  fetchCourse,
  fetchCourseCategories,
  fetchCourseStats,
  fetchMyCertificate,
  fetchMyEnrolments,
  fetchMyRating,
  fetchPaidOpen,
  fetchQuestions,
  fetchTrees,
  orderedLessons,
  rateCourse,
  type Certificate,
  type Course,
  type CourseModule,
  type CourseQuestion,
  type CourseStats,
  type Enrolment,
  type Lesson,
} from "../../../services/courses";
import { enrolledLabel, formatPrice, levelLabel, lessonOpenTo, minutesLabel, nextLesson, PAID_OPEN_SOON, weeklyHoursLabel, type AccessLevel, type LessonKind } from "../../../services/courses/rules";
import { fetchDripSchedule } from "../../../services/courses/drip";
import { courseDripLine, courseLessonTotal, hasDrip, lockedWeekContents, lockedWeekSize, nextLocked, type DripRow } from "../../../components/courses/drip";
import { CertificateCard } from "../../../components/courses/certificates/CertificateCard";
import { coverUrl, fetchCourseExtras, type CourseExtras } from "../../../services/courses/extras";
import { CentredPopup } from "../../../components/ui/CentredPopup";
import { StarRating } from "../../../components/ui/StarRating";
import { GuidelinesLink } from "../../../components/moderation/GuidelinesLink";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { t, tk, tn } from "../../../i18n/core";
import { coCaps, coCourse, coDanger, coPrimary } from "./communityWebStyles";

type Loaded = {
  course: Course;
  categoryName: string | null;
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
  drip: DripRow[];
  extras: CourseExtras | null;
};

async function loadCourse(courseId: string, userId: string): Promise<Loaded | null | { error: string }> {
  const c = await fetchCourse(courseId);
  if (!c.ok) return { error: c.message };
  if (!c.value) return null;
  const course = c.value;
  const [names, statMap, tree, access, paidOpen, enrolments, extras, cats] = await Promise.all([
    fetchAuthorNames(course.authorId ? [course.authorId] : []),
    fetchCourseStats([course.id]),
    fetchTrees([course.id]),
    fetchAccessLevel(course.id),
    fetchPaidOpen(),
    fetchMyEnrolments(userId),
    fetchCourseExtras([course.id]),
    fetchCourseCategories(),
  ]);
  const enrolment = enrolments.find((e) => e.courseId === course.id) ?? null;
  const [completed, myRating, questions, certificate, drip] = await Promise.all([
    enrolment ? fetchCompleted([enrolment.id]).then((m) => m.get(enrolment.id) ?? new Set<string>()) : Promise.resolve(new Set<string>()),
    enrolment ? fetchMyRating(course.id, userId) : Promise.resolve(null),
    access === "paid" ? fetchQuestions(course.id) : Promise.resolve([]),
    enrolment ? fetchMyCertificate(enrolment.id) : Promise.resolve(null),
    enrolment ? fetchDripSchedule(course.id) : Promise.resolve([]),
  ]);
  return {
    course,
    categoryName: cats.ok ? cats.value.find((k) => k.key === course.categoryKey)?.name ?? null : null,
    authorName: names.get(course.authorId ?? "") ?? t("Professional"),
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
    drip,
    extras: extras.get(course.id) ?? null,
  };
}

const KIND: Record<LessonKind, { label: string; Icon: typeof Video }> = {
  video: { label: tk("Video"), Icon: Video },
  reading: { label: tk("Reading"), Icon: BookOpen },
  quiz: { label: tk("Quiz"), Icon: ClipboardList },
  pdf: { label: tk("PDF"), Icon: FileText },
  image: { label: tk("Image"), Icon: ImageIcon },
  check_in: { label: tk("Check-in"), Icon: ClipboardCheck },
};

const card = { borderRadius: 20, border: "0.5px solid rgba(36,31,27,0.1)", padding: 18, display: "flex", flexDirection: "column", gap: 10 } as const;
const Danger = ({ children }: { children: string }) => (
  <p role="alert" style={coDanger}>
    {children}
    <GuidelinesLink message={children} />
  </p>
);

/**
 * Website viewport v1, WC-CO.4 a course (WC-CO Community Web v3, "course" /
 * "course-enrolled", literal): an 8 : 4 grid (1 : 1 with the rail). Left: the
 * hero (r22, padding 22 24, the category colour with the approved cover over
 * it; the caps line "Category · level · weeks · hours" 13/20 at 80%, the
 * title 28/36 700, the subtitle 15/24 at 88%, "By … · ★ … · … enrolled"
 * 13/700) and the weeks, 10 apart (r16 cards, the header 15/700 on #FAF9FD,
 * 52 lesson rows: the 28 r8 kind tile (#F0EDF9 #5F5093; #F5F5F6 #8C8378 and
 * a 14 lock when not open to you), the title 15/500 and "Kind · minutes"
 * 13 #8C8378). Right: What you'll learn (caps, 16 checks #3C6B65, the 44
 * CTA #9A8CD6) and Questions. Same data and rules as mobile: free and paid
 * enrolment (paid behind the payments switch), drip weeks, the progress
 * line, the certificate, questions on the full course, the rating popup and
 * the disclaimer.
 */
export function CourseWeb({ courseId, userId, onTitle }: { courseId: string; userId: string; onTitle: (title: string | null) => void }) {
  const navigate = useNavigate();
  const { rail } = useWebLayout();
  const [state, setState] = useState<Loaded | null | { error: string } | undefined>(undefined);
  const [busy, setBusy] = useState<"free" | "paid" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(() => loadCourse(courseId, userId).then(setState), [courseId, userId]);
  useEffect(() => {
    let live = true;
    void loadCourse(courseId, userId).then((s) => live && setState(s));
    return () => {
      live = false;
    };
  }, [courseId, userId]);
  const title = state && !("error" in state) ? state.course.title : null;
  useEffect(() => {
    onTitle(title);
  }, [title, onTitle]);

  const grid = { display: "grid", gridTemplateColumns: rail ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,8fr) minmax(0,4fr)", gap: 24, alignItems: "start" } as const;

  if (state === undefined) {
    return (
      <div style={grid} aria-busy="true">
        <div className="flex flex-col" style={{ gap: 16 }}>
          {[176, 200, 200].map((h, i) => (
            <div key={i} aria-hidden className="animate-skeleton-pulse bg-cream-soft" style={{ height: h, borderRadius: 20 }} />
          ))}
        </div>
        <div aria-hidden className="animate-skeleton-pulse bg-cream-soft" style={{ height: 220, borderRadius: 20 }} />
      </div>
    );
  }
  if (state === null || "error" in state) {
    return (
      <p data-co-unavailable style={{ margin: 0, padding: "32px 0", textAlign: "center", fontSize: 15, lineHeight: "24px", color: "#71685E" }}>
        {state && "error" in state ? state.error : t("This course isn't available.")}
      </p>
    );
  }

  const { course, authorName, modules, access, enrolment, stats } = state;
  const col = coCourse(course.categoryKey);
  const cover = coverUrl(state.extras?.coverPath);
  const lessons = orderedLessons(modules, state.lessons, course.id);
  const isAuthor = course.authorId === userId;
  const paidCourse = course.priceCents > 0;
  const hasPaid = access === "paid";
  const price = formatPrice(course.priceCents);
  const next = nextLesson(lessons, state.completed, enrolment?.lastLessonId ?? null, hasPaid ? "paid" : "free");
  const goNext = () => next && navigate(`/app/forum/courses/${course.id}/lessons/${next.id}`);
  // Which lessons are open to you: what your enrolment opens, or (not yet enrolled) what starting free would.
  const openAs: AccessLevel = access === "none" ? "free" : access;

  const start = async (tier: "free" | "paid") => {
    if (busy) return;
    setNotice(null);
    if (tier === "paid" && !state.paidOpen) {
      setNotice(t(PAID_OPEN_SOON));
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
    if ((await fetchAccessLevel(course.id)) !== "paid") {
      setNotice(t("Your free start couldn't be switched to the full course yet. Try again later."));
      return;
    }
    await reload();
  };

  const cta = isAuthor
    ? { label: t("Open your course"), onClick: goNext, loading: false }
    : !paidCourse || hasPaid
    ? { label: enrolment ? t("Continue the course") : t("Start the course"), onClick: () => void start("free"), loading: busy === "free" }
    : { label: t("Get the full course"), onClick: () => void start("paid"), loading: busy === "paid" };

  const kicker = [state.categoryName, levelLabel(course.level), modules.length > 0 ? tn(modules.length, "{n} week", "{n} weeks") : null, weeklyHoursLabel(course.weeklyHours)].filter(Boolean).join(" · ");
  const byline = [
    t("By {name}", { name: authorName }),
    stats.averageRating === null ? t("No ratings yet") : `★ ${stats.averageRating.toFixed(1)}`,
    enrolledLabel(stats.enrolled),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div style={grid} data-co-course>
      <div className="flex flex-col" style={{ minWidth: 0, gap: 16 }}>
        <div data-co-course-hero className="relative overflow-hidden" style={{ flex: "none", borderRadius: 22, background: col.strong, color: "#FFFFFF", padding: "22px 24px" }}>
          {cover && (
            <>
              <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <span aria-hidden className="absolute inset-0" style={{ background: "rgba(36,31,27,0.45)" }} />
            </>
          )}
          <div className="relative">
            <p style={{ ...coCaps, color: "rgba(255,255,255,0.8)" }}>{kicker}</p>
            <h2 className="[overflow-wrap:anywhere]" style={{ margin: "6px 0 0", fontSize: 28, lineHeight: "36px", fontWeight: 700 }}>{course.title}</h2>
            {course.subtitle && <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: "24px", color: "rgba(255,255,255,0.88)" }}>{course.subtitle}</p>}
            <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
              {course.authorId ? (
                <Link to={`/app/professionals/${course.authorId}`} className="no-underline" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {byline}
                </Link>
              ) : (
                byline
              )}
            </p>
          </div>
        </div>

        {enrolment && !isAuthor && hasDrip(state.drip) && <DripProgress author={authorName} modules={modules} drip={state.drip} lessons={lessons} completed={state.completed} />}

        {(state.extras?.focus || state.extras?.description) && (
          <div className="flex flex-col" style={{ gap: 6 }}>
            {state.extras?.focus && <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#71685E" }}>{t("Focus: {focus}", { focus: t(state.extras.focus) })}</span>}
            {state.extras?.description && (
              <p className="whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#5B5349" }}>{state.extras.description}</p>
            )}
          </div>
        )}

        <div className="flex flex-col" style={{ gap: 10 }} data-co-weeks>
          {modules.map((m, i) => {
            const locked = enrolment && !isAuthor ? lockedWeekSize(state.drip, m.id) : null;
            const weekLessons = lessons.filter((l) => l.moduleId === m.id);
            return (
              <div key={m.id} data-co-week className="overflow-hidden" style={{ borderRadius: 16, border: "0.5px solid rgba(36,31,27,0.1)" }}>
                <p className="[overflow-wrap:anywhere]" style={{ margin: 0, padding: "12px 16px", background: "#FAF9FD", fontSize: 15, lineHeight: "22px", fontWeight: 700 }}>
                  {t("Week {n}", { n: i + 1 })} · {m.title}
                </p>
                {locked ? (
                  <LessonRow title={locked.lessons > 0 ? lockedWeekContents(locked.lessons) : t("Week {n}", { n: i + 1 })} meta={minutesLabel(locked.minutes) ?? ""} Icon={Lock} lock />
                ) : (
                  weekLessons.map((l) => {
                    const k = KIND[l.kind] ?? KIND.reading;
                    const mins = l.minutes ? minutesLabel(l.minutes) : null;
                    return <LessonRow key={l.id} title={l.title} meta={[t(k.label), mins].filter(Boolean).join(" · ")} Icon={k.Icon} lock={!isAuthor && !lessonOpenTo(l.kind, openAs)} />;
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>

      <aside className="flex flex-col" style={{ minWidth: 0, gap: 12, position: "sticky", top: 88 }}>
        <div style={card} data-co-learn>
          {course.learnPoints.length > 0 && <p style={coCaps}>{t("What you'll learn")}</p>}
          {course.learnPoints.map((x) => (
            <p key={x} className="flex" style={{ margin: 0, gap: 8, fontSize: 15, lineHeight: "22px" }}>
              <span className="flex" style={{ flex: "none", marginTop: 3 }}>
                <Check size={16} strokeWidth={2.6} color="#3C6B65" aria-hidden />
              </span>
              <span className="[overflow-wrap:anywhere]" style={{ flex: 1, minWidth: 0 }}>{x}</span>
            </p>
          ))}
          {paidCourse && !hasPaid && (
            <div className="flex" style={{ gap: 8, marginTop: 4 }}>
              <div className="flex flex-col" style={{ flex: 1, minWidth: 0, borderRadius: 12, border: "0.5px solid rgba(36,31,27,0.1)", padding: 12, gap: 2 }}>
                <span style={{ fontSize: 15, lineHeight: "22px", fontWeight: 700 }}>{t("Watch free")}</span>
                <span style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{t("All video lessons and readings")}</span>
              </div>
              <div className="flex flex-col" style={{ flex: 1, minWidth: 0, borderRadius: 12, border: "1.5px solid #9A8CD6", background: "#F0EDF9", padding: 12, gap: 2 }}>
                <span style={{ fontSize: 15, lineHeight: "22px", fontWeight: 700 }}>{t("Full course · {price}", { price })}</span>
                <span className="[overflow-wrap:anywhere]" style={{ fontSize: 13, lineHeight: "20px", color: "#5F5093" }}>{t("Adds quizzes, PDFs and a certificate")}</span>
              </div>
            </div>
          )}
          {notice && <Danger>{notice}</Danger>}
          <button type="button" data-co-course-cta onClick={cta.onClick} disabled={cta.loading} className="co-web-press" style={{ ...coPrimary, marginTop: 6, gap: 8 }}>
            {cta.loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {cta.loading ? t("Starting…") : cta.label}
          </button>
          {!isAuthor && paidCourse && !hasPaid && (
            <button type="button" onClick={() => void start("free")} disabled={!!busy} className="co-web-focus self-center" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#7D6BB5", borderRadius: 6, opacity: busy ? 0.6 : 1 }}>
              {busy === "free" ? t("Starting…") : enrolment ? t("Continue watching free") : t("Start watching free")}
            </button>
          )}
        </div>

        {hasPaid && !isAuthor && enrolment && <CertificateCard certificate={state.certificate} />}

        {hasPaid && <QuestionsCard courseId={course.id} authorName={authorName} questions={state.questions} canAsk={!isAuthor && !!enrolment} onAsked={reload} />}

        {enrolment && !isAuthor && <RateRow courseId={course.id} initial={state.myRating} onSaved={reload} />}

        <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
          {t("Reviewed by Centium before publishing. Courses share general guidance, not personal medical advice. A certificate of completion is not a professional qualification.")}
        </p>
      </aside>
    </div>
  );
}

function LessonRow({ title, meta, Icon, lock }: { title: string; meta: string; Icon: typeof Video; lock: boolean }) {
  return (
    <div data-co-lesson className="flex items-center" style={{ gap: 10, minHeight: 52, padding: "0 16px", borderTop: "0.5px solid rgba(36,31,27,0.06)" }}>
      <span className="grid place-items-center" style={{ width: 28, height: 28, borderRadius: 8, flex: "none", background: lock ? "#F5F5F6" : "#F0EDF9" }}>
        <Icon size={15} color={lock ? "#71685E" : "#5F5093"} aria-hidden />
      </span>
      <span className="[overflow-wrap:anywhere]" style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: "22px", fontWeight: 500 }}>{title}</span>
      {meta && <span style={{ fontSize: 13, lineHeight: "20px", color: "#71685E", whiteSpace: "nowrap" }}>{meta}</span>}
      {lock && <Lock size={14} color="#71685E" aria-label={t("Locked")} className="shrink-0" />}
    </div>
  );
}

function DripProgress({ author, modules, drip, lessons, completed }: { author: string; modules: CourseModule[]; drip: DripRow[]; lessons: Lesson[]; completed: Set<string> }) {
  const nextOpen = nextLocked(drip);
  const week = nextOpen ? modules.findIndex((m) => m.id === nextOpen.moduleId) + 1 : 0;
  const total = courseLessonTotal(drip, lessons.length);
  const done = Math.min(lessons.filter((l) => completed.has(l.id)).length, total);
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div data-co-drip className="flex flex-col" style={{ borderRadius: 16, padding: "14px 16px", gap: 8, background: "#F0EDF9", color: "#5F5093" }}>
      <div className="flex justify-between" style={{ gap: 12, fontSize: 15, lineHeight: "22px" }}>
        <strong>{t("Your progress")}</strong>
        {total > 0 && <span style={{ fontSize: 13 }}>{tn(total, "{done} of {n} lesson", "{done} of {n} lessons", { done })}</span>}
      </div>
      {total > 0 && (
        <span role="progressbar" aria-label={t("Your progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="overflow-hidden" style={{ height: 8, borderRadius: 999, background: "#FFFFFF" }}>
          <span className="block h-full" style={{ width: `${pct}%`, background: "#9A8CD6" }} />
        </span>
      )}
      {nextOpen?.opensAt && week > 0 && (
        <span className="flex items-center" style={{ gap: 6, fontSize: 13, lineHeight: "20px" }}>
          <CalendarClock size={14} strokeWidth={2} className="shrink-0" aria-hidden />
          {courseDripLine(author, week, nextOpen.opensAt)}
        </span>
      )}
    </div>
  );
}

function QuestionsCard({ courseId, authorName, questions, canAsk, onAsked }: { courseId: string; authorName: string; questions: CourseQuestion[]; canAsk: boolean; onAsked: () => Promise<unknown> }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ask = async () => {
    if (draft.trim().length < 4 || busy) {
      setError(t("Write at least a few words."));
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
    <div style={{ ...card, flex: "0 1 auto" }} data-co-questions>
      <p style={coCaps}>{t("Questions to {name}", { name: authorName })}</p>
      {canAsk && (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder={t("Ask a question about the course")}
            aria-label={t("Ask {name} a question", { name: authorName })}
            className="placeholder:text-[#71685E]"
            style={{ minHeight: 44, boxSizing: "border-box", borderRadius: 12, background: "#F5F5F6", padding: "10px 14px", fontSize: 15, lineHeight: "24px", border: "none", outline: "none", resize: "vertical", color: "#241F1B" }}
          />
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{t("Questions and answers are shared with everyone taking the full course. Your name isn't shown.")}</p>
          {error && <Danger>{error}</Danger>}
          <button type="button" onClick={() => void ask()} disabled={busy} className="co-web-press self-start" style={{ height: 40, padding: "0 16px", borderRadius: 12, background: "#9A8CD6", color: "#FFFFFF", fontSize: 15, lineHeight: "24px", fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
            {busy ? t("Sending…") : t("Ask")}
          </button>
        </>
      )}
      {questions.map((q) => (
        <div key={q.id} style={{ borderRadius: 12, background: "#F0EDF9", padding: "10px 12px" }}>
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#5F5093" }}>{q.body}</p>
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", color: q.answer ? "#5B5349" : "#71685E" }}>
            {q.answer ? `${q.answer} — ${authorName}` : t("Waiting for an answer")}
          </p>
        </div>
      ))}
      {questions.length === 0 && !canAsk && <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{t("No questions yet.")}</p>}
    </div>
  );
}

function RateRow({ courseId, initial, onSaved }: { courseId: string; initial: { stars: number; body: string | null } | null; onSaved: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(0);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpening((n) => n + 1);
          setOpen(true);
        }}
        aria-haspopup="dialog"
        className="co-web-card flex items-center text-start"
        style={{ borderRadius: 20, border: "0.5px solid rgba(36,31,27,0.1)", padding: "14px 18px", gap: 10, minHeight: 52, background: "#FFFFFF" }}
        data-co-rate
      >
        <span style={{ flex: 1, fontSize: 15, lineHeight: "22px", fontWeight: 700 }}>{initial ? t("Your rating") : t("Rate this course")}</span>
        {initial && (
          <span className="flex items-center" style={{ gap: 4, fontSize: 13, color: "#71685E" }}>
            <Star size={13} color="#D9A441" fill="#D9A441" aria-hidden /> {initial.stars}
          </span>
        )}
        <ChevronRight size={16} color="#71685E" aria-hidden />
      </button>
      <RatePopup key={opening} open={open} onClose={() => setOpen(false)} courseId={courseId} initial={initial} onSaved={onSaved} />
    </>
  );
}

function RatePopup({ open, onClose, courseId, initial, onSaved }: { open: boolean; onClose: () => void; courseId: string; initial: { stars: number; body: string | null } | null; onSaved: () => Promise<unknown> }) {
  const [stars, setStars] = useState(initial?.stars ?? 0);
  const [body, setBody] = useState(initial?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    if (!stars || busy) return;
    setBusy(true);
    setError(null);
    const r = await rateCourse(courseId, stars, body);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setSaved(true);
    await onSaved();
  };
  if (saved) {
    return <CentredPopup open={open} onClose={onClose} title={t("Rating saved")} icon={<Check size={22} />} body={t("Thanks, your rating is saved.")} cta={{ label: t("Done"), onClick: onClose }} />;
  }
  return (
    <CentredPopup
      open={open}
      onClose={onClose}
      title={initial ? t("Your rating") : t("Rate this course")}
      icon={<Star size={22} strokeWidth={1.75} />}
      cta={{ label: busy ? t("Saving…") : t("Save rating"), disabled: !stars || busy, loading: busy, onClick: () => void save() }}
    >
      <StarRating value={stars} onChange={setStars} disabled={busy} />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder={t("Add a few words (optional)")}
        aria-label={t("Your review (optional)")}
        className="mt-3 h-24 w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-3.5 py-3 text-[13px] text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
      />
      {error && <div className="mt-2"><Danger>{error}</Danger></div>}
    </CentredPopup>
  );
}
