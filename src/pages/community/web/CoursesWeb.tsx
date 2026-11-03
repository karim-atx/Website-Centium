import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GraduationCap, Search, Star } from "lucide-react";
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
} from "../../../services/courses";
import { coursePill, enrolledLabel, formatPrice, nextLesson, progressPercent } from "../../../services/courses/rules";
import { coverUrl, fetchCourseExtras, type CourseExtras } from "../../../services/courses/extras";
import { CertificatesList } from "../../../components/courses/certificates/CertificatesList";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { t, tx } from "../../../i18n/core";
import { coCaps, coCourse, coDanger, coEmptyBox, coEmptyTile } from "./communityWebStyles";

type Data = {
  categories: CourseCategory[];
  courses: Course[];
  names: Map<string, string>;
  stats: Map<string, CourseStats>;
  modules: CourseModule[];
  lessons: Lesson[];
  enrolments: Enrolment[];
  completed: Map<string, Set<string>>;
  extras: Map<string, CourseExtras>;
};

async function load(userId: string): Promise<{ data: Data } | { error: string }> {
  const [cats, cat, enrolments] = await Promise.all([fetchCourseCategories(), fetchCatalogue(), fetchMyEnrolments(userId)]);
  if (!cats.ok) return { error: cats.message };
  if (!cat.ok) return { error: cat.message };
  const ids = cat.value.map((c) => c.id);
  const [names, stats, tree, completed, extras] = await Promise.all([
    fetchAuthorNames(cat.value.map((c) => c.authorId).filter((x): x is string => !!x)),
    fetchCourseStats(ids),
    fetchTrees(ids),
    fetchCompleted(enrolments.map((e) => e.id)),
    fetchCourseExtras(ids),
  ]);
  return { data: { categories: cats.value, courses: cat.value, names, stats, modules: tree.modules, lessons: tree.lessons, enrolments, completed, extras } };
}

const COURSE_ORDER = ["workouts", "nutrition", "progress", "motivation", "general"];
const CERTIFICATES = "certificates";
const order = (key: string) => {
  const i = COURSE_ORDER.indexOf(key);
  return i < 0 ? COURSE_ORDER.length : i;
};

/**
 * Website viewport v1, WC-CO.4 Courses (WC-CO Community Web v3, "courses",
 * literal): a row of the search field (40, r14, #F5F5F6, Search 16, 15) and
 * the category chips (a 5 r14 #F4F3F9 track, 30 r10 chips padding 0 14,
 * 15/24 600; selected #A198DF white), then the cards, 3 across (2 with the
 * rail), at least 260 wide, 24 apart: r20, 0.5px rgba(36,31,27,0.1), hover
 * #FAFAFB; the 132 cover in the category colour (the approved cover image
 * over it) with the category on white 85% (13/20 700) and the cap 34; then
 * the title 17/24 700, "Author · level · weeks" 13/20 #8C8378 and the rating
 * (star 13 #D9A441, 13/700 #9A7424) with the price at the end (#5F5093).
 * Same data as mobile: Popular order (enrolments, then ratings), "Continue
 * learning" over the cards, the learner count from three, and Certificates
 * as the last chip (its list keeps its mobile layout: no web design yet).
 */
export function CoursesWeb({ userId }: { userId: string }) {
  const { rail } = useWebLayout();
  const [result, setResult] = useState<{ data: Data } | { error: string } | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const certificates = params.get("view") === CERTIFICATES;

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
      .filter((c) => !q || c.title.toLowerCase().includes(q) || (c.subtitle ?? "").toLowerCase().includes(q) || (data.names.get(c.authorId ?? "") ?? "").toLowerCase().includes(q))
      .sort((a, b) => {
        const x = data.stats.get(a.id);
        const y = data.stats.get(b.id);
        return (y?.enrolled ?? 0) - (x?.enrolled ?? 0) || (y?.ratings ?? 0) - (x?.ratings ?? 0);
      });
  }, [data, query, filter]);

  if (result && "error" in result) return <p role="alert" style={coDanger}>{result.error}</p>;

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
          const n = lessons.filter((l) => l.moduleId === full.moduleId).findIndex((l) => l.id === full.id) + 1;
          return { course, next: full, week, n, percent: progressPercent(lessons, done, access) };
        })
        .filter((x): x is NonNullable<typeof x> => !!x)
        .slice(0, 1)
    : [];

  const chipItems = data
    ? [{ key: "", label: t("All") }, ...[...data.categories].sort((a, b) => order(a.key) - order(b.key)).map((c) => ({ key: c.key, label: c.name })), { key: CERTIFICATES, label: t("Certificates") }]
    : [];
  const activeChip = certificates ? CERTIFICATES : filter ?? "";

  return (
    <>
      <div className="flex items-center" style={{ flex: "none", gap: 10 }} data-co-courses-bar>
        {!certificates && (
          <label className="flex items-center" style={{ flex: 1, minWidth: 0, height: 40, boxSizing: "border-box", borderRadius: 14, background: "#F5F5F6", padding: "0 14px", gap: 8 }}>
            <Search size={16} color="#8C8378" className="shrink-0" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search courses")}
              aria-label={t("Search courses")}
              className="placeholder:text-[#8C8378]"
              style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 15, lineHeight: "24px", color: "#241F1B" }}
            />
          </label>
        )}
        {data ? (
          <div role="group" aria-label={t("Course categories")} className="flex co-web-noscroll" style={{ gap: 5, padding: 5, borderRadius: 14, background: "#F4F3F9", overflowX: "auto", maxWidth: certificates ? undefined : "70%", flex: certificates ? 1 : "none" }}>
            {chipItems.map((c) => {
              const on = activeChip === c.key;
              return (
                <button
                  key={c.key || "all"}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    if (c.key === CERTIFICATES) return setParams({ tab: "courses", view: CERTIFICATES }, { replace: true });
                    if (certificates) setParams({ tab: "courses" }, { replace: true });
                    setFilter(c.key || null);
                  }}
                  className="co-web-chip"
                  style={{ flex: "1 0 auto", height: 30, padding: "0 14px", borderRadius: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600, whiteSpace: "nowrap", background: on ? "#A198DF" : "transparent", color: on ? "#FFFFFF" : "#5B5349" }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div aria-hidden className="animate-skeleton-pulse bg-cream-soft" style={{ width: 520, height: 40, borderRadius: 14 }} />
        )}
      </div>

      {certificates ? (
        <div style={{ width: "100%", maxWidth: 430, margin: "0 auto" }} data-co-certificates>
          <CertificatesList userId={userId} />
        </div>
      ) : !data ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${rail ? 2 : 3},minmax(260px,1fr))`, gap: 24 }} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} aria-hidden className="animate-skeleton-pulse bg-cream-soft" style={{ height: 236, borderRadius: 20 }} />
          ))}
        </div>
      ) : (
        <>
          {continuing.length > 0 && !query && !filter && (
            <div className="flex flex-col" style={{ gap: 8 }} data-co-continue>
              <p style={coCaps}>{t("Continue learning")}</p>
              {continuing.map(({ course, next, week, n, percent }) => (
                <Link
                  key={course.id}
                  to={`/app/forum/courses/${course.id}/lessons/${next.id}`}
                  className="co-web-card flex flex-col no-underline"
                  style={{ borderRadius: 20, border: "0.5px solid rgba(36,31,27,0.1)", padding: "14px 16px", gap: 8, color: "#241F1B", background: "#FFFFFF" }}
                >
                  <span className="[overflow-wrap:anywhere]" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700 }}>{course.title}</span>
                  <span className="[overflow-wrap:anywhere]" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                    {t("Week {week} · Lesson {n}: {title}", { week, n, title: next.title })}
                  </span>
                  <span aria-hidden style={{ height: 6, borderRadius: 3, background: "#F0EDF9" }}>
                    <span className="block" style={{ height: 6, borderRadius: 3, width: `${percent}%`, background: "#9A8CD6" }} />
                  </span>
                  <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#8C8378" }}>{t("{n}% complete", { n: percent })}</span>
                </Link>
              ))}
            </div>
          )}
          {shown.length === 0 ? (
            <div style={coEmptyBox} data-co-empty>
              <span style={coEmptyTile} aria-hidden>
                <GraduationCap size={26} strokeWidth={1.75} />
              </span>
              <p style={{ margin: "10px 0 0", fontSize: 17, lineHeight: "24px", fontWeight: 700 }}>{query || filter ? t("No courses match") : t("No courses yet")}</p>
              <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>{query || filter ? t("Try another category or search.") : t("Check back soon.")}</p>
            </div>
          ) : (
            <div data-co-course-grid style={{ display: "grid", gridTemplateColumns: `repeat(${rail ? 2 : 3},minmax(260px,1fr))`, gridAutoRows: "auto", alignContent: "start", gap: 24 }}>
              {shown.map((c) => {
                const col = coCourse(c.categoryKey);
                const weeks = data.modules.filter((m) => m.courseId === c.id).length;
                const s = data.stats.get(c.id);
                const cover = coverUrl(data.extras.get(c.id)?.coverPath);
                const catName = data.categories.find((k) => k.key === c.categoryKey)?.name;
                const learners = enrolledLabel(s?.enrolled ?? 0);
                return (
                  <Link
                    key={c.id}
                    to={`/app/forum/courses/${c.id}`}
                    data-co-course-card
                    className="co-web-card flex flex-col overflow-hidden no-underline"
                    style={{ minHeight: 0, borderRadius: 20, border: "0.5px solid rgba(36,31,27,0.1)", color: "#241F1B", background: "#FFFFFF" }}
                  >
                    <div className="relative flex items-end" style={{ flex: "none", height: 132, boxSizing: "border-box", background: col.strong, padding: "14px 16px" }}>
                      {cover && <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                      {catName && (
                        <span className="absolute" style={{ insetInlineStart: 14, top: 14, borderRadius: 999, padding: "3px 10px", background: "rgba(255,255,255,0.85)", color: col.ink, fontSize: 13, lineHeight: "20px", fontWeight: 700 }}>
                          {catName}
                        </span>
                      )}
                      {!cover && <GraduationCap size={34} strokeWidth={1.4} color="rgba(255,255,255,0.9)" aria-hidden />}
                    </div>
                    <div style={{ flex: "none", padding: "12px 16px" }}>
                      <p className="[overflow-wrap:anywhere]" style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 700 }}>{c.title}</p>
                      <p className="truncate" style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                        {[data.names.get(c.authorId ?? "") ?? t("Professional"), coursePill(c.level, weeks)].filter(Boolean).join(" · ")}
                      </p>
                      <p className="flex items-center" style={{ margin: "6px 0 0", gap: 6, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#9A7424" }}>
                        <Star size={13} color="#D9A441" fill="#D9A441" aria-hidden />
                        {s?.averageRating != null ? s.averageRating.toFixed(1) : tx("New", "course")}
                        {learners && <span className="truncate" style={{ fontWeight: 600, color: "#8C8378" }}>· {learners}</span>}
                        <span style={{ marginInlineStart: "auto", color: "#5F5093" }}>{formatPrice(c.priceCents)}</span>
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
