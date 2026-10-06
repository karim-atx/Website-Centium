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
import { DangerLine, ForumPlaceholder } from "../forum/parts";
import { fv } from "../forum/forumColor";
import { Check, ChevronRight, Star } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { StarRating } from "../ui/StarRating";
import { CoverPill, Instructor, StarIcon } from "./courseParts";
import { coverBackground, onCover } from "./courseCover";
import { useIsDark } from "../../hooks/useIsDark";
import { PinnedCta } from "../ui/PinnedCta";
import { useBack } from "../../hooks/useBack";

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
  const dark = useIsDark();
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

  // Batch E (E5): pops back to the Courses tab; opened directly, replaces with it.
  const goBack = useBack("/app/forum?tab=courses");
  const back = (
    <button
      type="button"
      onClick={goBack}
      aria-label="Back"
      // Frame check (MO1.3.5): a 36 pt disc (measured) with ChevronLeft 18
      // (the table's icon list); the tap area stays 44 through the ::before.
      className="tap relative w-9 h-9 rounded-full flex items-center justify-center before:content-[''] before:absolute before:-inset-1"
      style={{ background: onCover(dark).bg }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={onCover(dark).ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    // Frame check: the hero starts at the top edge (y 0), so the page's 24 pt
    // top padding (and the safe area, re-added inside the hero) is cancelled.
    <div className="flex flex-col -mx-4 -mt-[calc(env(safe-area-inset-top)+24px)]" style={{ color: fv("text") }}>
      {/* MO1.3.5 #1: the hero, 390 × 176; padding 14 16 (measured: the
          disc at 16,14, the pill 16 in and 14 off the bottom). */}
      <div
        className="h-[calc(env(safe-area-inset-top)+176px)] flex flex-col justify-between px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-3.5"
        style={{ background: coverBackground(course.coverColour, dark) }}
      >
        {back}
        <span className="self-start">
          <CoverPill>{coursePill(course.level, modules.length, course.weeklyHours)}</CoverPill>
        </span>
      </div>

      {/* Frame check: title 15 under the hero, 14 between the blocks (measured). */}
      <div className="px-4 pt-[15px] pb-4 flex flex-col gap-3.5">
        <h1 className="m-0 text-[22px] font-extrabold leading-[1.25] [overflow-wrap:anywhere] [text-wrap:balance]">{course.title}</h1>
        {/* MO1.3.5 #3: "By Rami" 13/400 muted and the badge, gap 6, no avatar. */}
        <span className="flex items-center text-[13px] font-normal" style={{ color: fv("muted") }}>
          <Instructor authorId={course.authorId} name={authorName} link />
        </span>
        <span className="flex gap-1.5 items-center flex-wrap text-[13px]" style={{ color: fv("muted") }}>
          {stats.averageRating === null ? (
            "No ratings yet"
          ) : (
            <>
              <StarIcon size={12} /> {stats.averageRating.toFixed(1)} · {stats.ratings} {stats.ratings === 1 ? "rating" : "ratings"}
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

        {/* MO1.3.5 #5: radius 18, padding 14, gap 10; each point's Check
            12/2.4 sits in a 20 pt tile in the primary tint (measured from the
            frame, 2x: 40 px), 10 from the text. */}
        {course.learnPoints.length > 0 && (
          <div className="rounded-[18px] p-[14px] flex flex-col gap-2.5" style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}>
            <span className="text-sm font-extrabold">What you'll learn</span>
            {course.learnPoints.map((p) => (
              <span key={p} className="flex gap-2.5 text-[13px] leading-[1.5] [overflow-wrap:anywhere]">
                <span
                  aria-hidden="true"
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                  // The forum's lavender ink, lifted in dark mode (the accent read 2.35:1 on the dark tile).
                  style={{ background: fv("rules-bg"), color: fv("link") }}
                >
                  <Check size={12} strokeWidth={2.4} />
                </span>
                {p}
              </span>
            ))}
          </div>
        )}

        {/* MO1.3.5 #6: the syllabus as one card (radius 18, as the learn
            card, measured) with hairline-divided rows, "N more weeks / See
            all" the last row. */}
        {modules.length > 0 && (
          <div className="flex flex-col gap-2">
            {/* Foundations `label.section` (decision 20), 4 in. Decision 23
                (item 13): the frame's muted grey rgb(140,131,120) in light;
                dark keeps the forum's muted. */}
            <span className="pl-1 text-[10.5px] font-bold uppercase leading-[14px] tracking-[0.12em]" style={{ color: dark ? fv("muted") : "rgb(var(--c-charcoal-faint))" }}>
              Syllabus
            </span>
            <div className="rounded-[18px] overflow-hidden flex flex-col" style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}>
              {weeksShown.map((m, i) => {
                const contents = weekContents(lessons.filter((l) => l.moduleId === m.id).map((l) => l.kind));
                const mins = minutesByWeek(m.id);
                return (
                  <div
                    key={m.id}
                    className="px-[14px] py-3 flex justify-between gap-3 text-[13px]"
                    style={i > 0 ? { borderTop: `1px solid ${fv("rule")}` } : undefined}
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
                  className="px-[14px] py-1.5 flex justify-between items-center text-[13px]"
                  style={{ borderTop: `1px solid ${fv("rule")}`, color: fv("muted") }}
                >
                  <span>{allWeeks ? `All ${modules.length} weeks` : `${modules.length - 2} more ${modules.length - 2 === 1 ? "week" : "weeks"}`}</span>
                  <button type="button" onClick={() => setAllWeeks(!allWeeks)} className="tap font-bold py-2" style={{ color: fv("link") }}>
                    {allWeeks ? "Show fewer" : "See all"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {paidCourse && !hasPaid && (
          <div className="flex flex-col gap-2">
            {/* Decision 23 (item 14): the same label in the frame's muted grey. */}
            <span className="pl-1 text-[10.5px] font-bold uppercase leading-[14px] tracking-[0.12em]" style={{ color: dark ? fv("muted") : "rgb(var(--c-charcoal-faint))" }}>
              Choose how to take it
            </span>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0 rounded-2xl p-3 flex flex-col gap-1.5" style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}>
                <span className="text-sm font-extrabold">Watch free</span>
                <span className="text-xs leading-[1.5]" style={{ color: fv("muted") }}>
                  All video lessons and readings
                </span>
              </div>
              <div className="flex-1 min-w-0 rounded-2xl p-3 flex flex-col gap-1.5" style={{ background: fv("rules-bg"), border: `1.5px solid ${fv("accent")}` }}>
                <span className="text-sm font-extrabold">Full course · {price}</span>
                <span className="text-xs leading-[1.5] [overflow-wrap:anywhere]" style={{ color: fv("rules-ink") }}>
                  Adds quizzes, PDFs and a certificate
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

        {!isAuthor && paidCourse && !hasPaid && (
          // MO1.3.5 #8: a centred text link under the choice; the main CTA is
          // pinned (below).
          <button
            type="button"
            onClick={() => void start("free")}
            disabled={!!busy}
            // 27 in the layout as drawn (padding 4 0), 44 to the finger.
            className="tap self-center h-11 -my-[8.5px] px-0 text-[13px] font-bold disabled:opacity-60"
            style={{ color: fv("link") }}
          >
            {busy === "free" ? "Starting…" : enrolment ? "Continue watching free" : "Start watching free"}
          </button>
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
        {/* The page's own padding covers 112 of the 172 a pinned CTA needs. */}
        <div aria-hidden style={{ height: 60 }} />
      </div>

      {/* MO1.3.5 #10: the main CTA pinned above the navbar after the
          disclaimer, at the page size (48 / r14, C-01). It keeps the forum's
          accent, the colour of the inline button it replaces. */}
      <PinnedCta
        primary={
          isAuthor
            ? { label: "Open your course", onClick: goNext, className: CTA_COLOURS }
            : !paidCourse || hasPaid
            ? {
                label: enrolment ? "Continue the course" : "Start the course",
                loading: busy === "free",
                onClick: () => void start("free"),
                className: CTA_COLOURS,
              }
            : { label: "Get the full course", loading: busy === "paid", onClick: () => void start("paid"), className: CTA_COLOURS }
        }
      />
    </div>
  );
}

const CTA_COLOURS = "!bg-[var(--forum-accent)] !text-[var(--forum-on-accent)]";

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
    // Decision 23 (item 261): the learn card's shape (MO1.3.5 #5: radius 18,
    // padding 14, gap 10, title 14/800).
    <div className="rounded-[18px] p-[14px] flex flex-col gap-2.5" style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}>
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
              className="w-11 h-[26px] rounded-full shrink-0 relative transition-colors"
              style={{ background: shared ? fv("accent") : fv("track"), opacity: busy ? 0.6 : 1 }}
            >
              <span
                className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-all"
                style={{ left: shared ? 21 : 3 }}
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
    // Decision 23 (item 261): one learn card (radius 18, padding 14, gap 10),
    // the questions inside it as hairline-divided rows like the syllabus's.
    <div className="rounded-[18px] p-[14px] flex flex-col gap-2.5" style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}>
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
          {error && <DangerLine>{error}</DangerLine>}
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
        <div key={q.id} className="pt-2.5 flex flex-col gap-1.5 text-[13px]" style={{ borderTop: `1px solid ${fv("rule")}` }}>
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

/**
 * Decision 23 (kept-list item 41): the course rating sits behind one row that
 * opens the shared review popup (the centred popup Rate this app uses: Star
 * tile, StarRating, an optional text box, one full-width button), so the page
 * keeps the drawn layout. The row is the learn card's shape (radius 18,
 * padding 14) and says the saved rating once there is one.
 */
function RateSection({
  courseId,
  initial,
  onSaved,
}: {
  courseId: string;
  initial: { stars: number; body: string | null } | null;
  onSaved: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  // The popup is keyed on each opening, so it always starts from what is saved.
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
        className="tap w-full min-h-11 rounded-[18px] p-[14px] flex items-center gap-2.5 text-left"
        style={{ background: fv("card"), border: `1px solid ${fv("border")}`, color: fv("text") }}
      >
        <span className="text-sm font-extrabold grow">{initial ? "Your rating" : "Rate this course"}</span>
        {initial && (
          <span className="flex items-center gap-1 text-[13px]" style={{ color: fv("muted") }}>
            <StarIcon size={12} /> {initial.stars}
          </span>
        )}
        <ChevronRight size={16} strokeWidth={1.75} style={{ color: fv("muted") }} aria-hidden />
      </button>
      <RatePopup key={opening} open={open} onClose={() => setOpen(false)} courseId={courseId} initial={initial} onSaved={onSaved} />
    </>
  );
}

function RatePopup({
  open,
  onClose,
  courseId,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  courseId: string;
  initial: { stars: number; body: string | null } | null;
  onSaved: () => Promise<unknown>;
}) {
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
    return (
      <CentredPopup
        open={open}
        onClose={onClose}
        title="Rating saved"
        icon={<Check size={22} />}
        body="Thanks, your rating is saved."
        cta={{ label: "Done", onClick: onClose }}
      />
    );
  }

  return (
    <CentredPopup
      open={open}
      onClose={onClose}
      title={initial ? "Your rating" : "Rate this course"}
      icon={<Star size={22} strokeWidth={1.75} />}
      cta={{ label: busy ? "Saving…" : "Save rating", disabled: !stars || busy, loading: busy, onClick: () => void save() }}
    >
      <StarRating value={stars} onChange={setStars} disabled={busy} />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Add a few words (optional)"
        aria-label="Your review (optional)"
        className="mt-3 h-24 w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-3.5 py-3 text-[13px] text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
      />
      {error && <DangerLine className="mt-2">{error}</DangerLine>}
    </CentredPopup>
  );
}
