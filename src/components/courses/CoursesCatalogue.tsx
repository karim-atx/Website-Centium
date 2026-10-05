import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchAuthorNames,
  fetchCatalogue,
  fetchCompleted,
  fetchCourseCategories,
  fetchCourseStats,
  fetchMyEnrolments,
  fetchTrees,
  orderedLessons,
  type Course,
  type CourseCategory,
  type CourseModule,
  type CourseStats,
  type Enrolment,
  type Lesson,
} from "../../services/courses";
import { coursePill, enrolledLabel, formatPrice, nextLesson, progressPercent } from "../../services/courses/rules";
import { ForumChip, ForumPlaceholder } from "../forum/parts";
import { fv } from "../forum/forumColor";
import { CoverPill, Instructor, RatingShort } from "./courseParts";
import { coverBackground } from "./courseCover";
import { useIsDark } from "../../hooks/useIsDark";

// Design screen 6: the Courses tab. Search, category chips, "Continue
// learning" with progress, then the course cards.

type Data = {
  categories: CourseCategory[];
  courses: Course[];
  names: Map<string, string>;
  stats: Map<string, CourseStats>;
  modules: CourseModule[];
  lessons: Lesson[];
  enrolments: Enrolment[];
  completed: Map<string, Set<string>>;
};

async function load(userId: string): Promise<{ data: Data } | { error: string }> {
  const [cats, cat, enrolments] = await Promise.all([fetchCourseCategories(), fetchCatalogue(), fetchMyEnrolments(userId)]);
  if (!cats.ok) return { error: cats.message };
  if (!cat.ok) return { error: cat.message };
  const ids = cat.value.map((c) => c.id);
  const [names, stats, tree, completed] = await Promise.all([
    fetchAuthorNames(cat.value.map((c) => c.authorId).filter((x): x is string => !!x)),
    fetchCourseStats(ids),
    fetchTrees(ids),
    fetchCompleted(enrolments.map((e) => e.id)),
  ]);
  return {
    data: {
      categories: cats.value,
      courses: cat.value,
      names,
      stats,
      modules: tree.modules,
      lessons: tree.lessons,
      enrolments,
      completed,
    },
  };
}

/** MO1.3.1's filter order; anything else sorts last. */
const COURSE_ORDER = ["workouts", "nutrition", "progress", "motivation", "general"];

export function CoursesCatalogue({ userId }: { userId: string }) {
  const dark = useIsDark();
  const [result, setResult] = useState<{ data: Data } | { error: string } | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void load(userId).then((r) => live && setResult(r));
    return () => {
      live = false;
    };
  }, [userId]);

  const data = result && "data" in result ? result.data : null;

  const shown = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.courses
      .filter((c) => !filter || c.categoryKey === filter)
      .filter(
        (c) =>
          !q ||
          c.title.toLowerCase().includes(q) ||
          (c.subtitle ?? "").toLowerCase().includes(q) ||
          (data.names.get(c.authorId ?? "") ?? "").toLowerCase().includes(q)
      )
      // POPULAR MEANS ENROLMENTS NOW, which is what the word means and what the
      // client could not see before course_stats: course_enrolments is readable
      // only for your own rows, so the old sort used the rating COUNT as a
      // stand-in. Ratings break the tie, because a course everybody finished and
      // rated is ahead of one nobody came back to.
      .sort((a, b) => {
        const x = data.stats.get(a.id);
        const y = data.stats.get(b.id);
        return (y?.enrolled ?? 0) - (x?.enrolled ?? 0) || (y?.ratings ?? 0) - (x?.ratings ?? 0);
      });
  }, [data, query, filter]);

  if (result && "error" in result) {
    return (
      <p role="alert" className="text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
        {result.error}
      </p>
    );
  }

  const continuing = data
    ? data.enrolments
        .map((e) => {
          const course = data.courses.find((c) => c.id === e.courseId);
          if (!course) return null;
          const access = e.tier === "paid" ? "paid" : "free";
          const lessons = orderedLessons(data.modules, data.lessons, course.id);
          const done = data.completed.get(e.id) ?? new Set<string>();
          const next = nextLesson(lessons, done, e.lastLessonId, access);
          if (!next) return null;
          const full = lessons.find((l) => l.id === next.id)!;
          const mods = data.modules.filter((m) => m.courseId === course.id).sort((a, b) => a.position - b.position);
          const week = mods.findIndex((m) => m.id === full.moduleId) + 1;
          const inWeek = lessons.filter((l) => l.moduleId === full.moduleId);
          const n = inWeek.findIndex((l) => l.id === full.id) + 1;
          return { course, next: full, week, n, percent: progressPercent(lessons, done, access) };
        })
        .filter((x): x is NonNullable<typeof x> => !!x)
        // MO1.3.1 draws one "Continue learning" course (A24).
        .slice(0, 1)
    : [];

  return (
    <div className="flex flex-col gap-3 pb-6" style={{ color: fv("text") }}>
      <label
        className="flex items-center gap-2 h-11 rounded-[14px] px-3"
        style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fv("muted")} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses"
          aria-label="Search courses"
          className="border-none outline-none text-sm grow min-w-0 bg-transparent"
          style={{ color: fv("text") }}
        />
      </label>

      {data ? (
        // MO1.3.1: the filters as one strip running off the right edge, in
        // the frame's order (All · Workouts · Nutrition · Progress · Motivation).
        <div
          className="flex gap-1 overflow-x-auto no-scrollbar -mr-4 p-1 pr-4"
          style={{ background: fv("track"), borderRadius: "16px 0 0 16px" }}
          role="group"
          aria-label="Course categories"
        >
          <ForumChip inStrip active={filter === null} onClick={() => setFilter(null)}>
            All
          </ForumChip>
          {[...data.categories]
            .sort((a, b) => COURSE_ORDER.indexOf(a.key) - COURSE_ORDER.indexOf(b.key))
            .map((c) => (
              <ForumChip inStrip key={c.key} active={filter === c.key} onClick={() => setFilter(c.key)}>
                {c.name}
              </ForumChip>
            ))}
        </div>
      ) : (
        <div className="flex gap-1.5" aria-hidden="true">
          {[44, 86, 92, 84].map((w, i) => (
            <div key={i} className="h-[34px] rounded-full animate-pulse shrink-0" style={{ width: w, background: fv("track") }} />
          ))}
        </div>
      )}

      {!data ? (
        <div className="flex flex-col gap-2.5" aria-busy="true">
          <ForumPlaceholder height={110} />
          <ForumPlaceholder height={190} />
          <ForumPlaceholder height={190} />
        </div>
      ) : (
        <>
          {continuing.length > 0 && !query && !filter && (
            <div className="flex flex-col gap-2.5">
              <span className="text-[13px] font-extrabold tracking-[0.04em]" style={{ color: fv("muted") }}>
                CONTINUE LEARNING
              </span>
              {continuing.map(({ course, next, week, n, percent }) => (
                <Link
                  key={course.id}
                  to={`/app/forum/courses/${course.id}/lessons/${next.id}`}
                  className="rounded-[20px] px-4 py-3.5 flex flex-col gap-2 no-underline"
                  style={{ background: fv("card"), border: `1px solid ${fv("border")}`, color: fv("text") }}
                >
                  <span className="text-[15px] font-extrabold [overflow-wrap:anywhere]">{course.title}</span>
                  <span className="text-xs [overflow-wrap:anywhere]" style={{ color: fv("muted") }}>
                    Week {week} · Lesson {n}: {next.title}
                  </span>
                  <div className="h-1.5 rounded-[3px]" style={{ background: fv("track") }} aria-hidden="true">
                    <div className="h-1.5 rounded-[3px]" style={{ width: `${percent}%`, background: fv("accent") }} />
                  </div>
                  <span className="text-xs" style={{ color: fv("muted") }}>
                    {percent}% complete
                  </span>
                </Link>
              ))}
            </div>
          )}

          <span className="text-[13px] font-extrabold tracking-[0.04em] mt-1.5" style={{ color: fv("muted") }}>
            {query || filter ? "RESULTS" : "POPULAR"}
          </span>
          <div className="flex flex-col gap-2.5">
            {shown.map((c) => {
              const weeks = data.modules.filter((m) => m.courseId === c.id).length;
              const s = data.stats.get(c.id);
              return (
                <Link
                  key={c.id}
                  to={`/app/forum/courses/${c.id}`}
                  className="rounded-[20px] overflow-hidden flex flex-col no-underline"
                  style={{ background: fv("card"), border: `1px solid ${fv("border")}`, color: fv("text") }}
                >
                  <div className="h-[104px] flex items-end p-2.5" style={{ background: coverBackground(c.coverColour, dark) }}>
                    <CoverPill>{coursePill(c.level, weeks)}</CoverPill>
                  </div>
                  <div className="px-[14px] py-3 flex flex-col gap-[5px]">
                    <span className="text-[15px] font-extrabold leading-[1.3] [overflow-wrap:anywhere]">{c.title}</span>
                    <span className="text-xs" style={{ color: fv("muted") }}>
                      <Instructor authorId={c.authorId} name={data.names.get(c.authorId ?? "") ?? "Professional"} link={false} />
                    </span>
                    <span className="flex justify-between items-center gap-2 text-xs" style={{ color: fv("muted") }}>
                      <span className="flex items-center gap-1.5 min-w-0">
                        <RatingShort average={s?.averageRating ?? null} count={s?.ratings ?? 0} />
                        {/* THE ENROLLED COUNT, which no client could compute
                            before course_stats. Hidden entirely at zero rather
                            than shown as "0 learners", which reads as a verdict
                            on a course nobody has found yet. */}
                        {enrolledLabel(s?.enrolled ?? 0) && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{enrolledLabel(s?.enrolled ?? 0)}</span>
                          </>
                        )}
                      </span>
                      <strong className="text-[13px] shrink-0" style={{ color: fv("text") }}>
                        {formatPrice(c.priceCents)}
                      </strong>
                    </span>
                  </div>
                </Link>
              );
            })}
            {shown.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: fv("muted") }}>
                {query || filter ? "No courses match that." : "No courses yet. Check back soon."}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
