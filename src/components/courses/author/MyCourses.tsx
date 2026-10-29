import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../../../context/AppContext";
import { GraduationCap, Plus, Star, Users } from "lucide-react";
import { fetchCourseCards, type CourseCard } from "../../../services/pro/courses";
import { fetchCourseCategories, type CourseCategory } from "../../../services/courses";
import { formatPrice } from "../../../services/courses/rules";
import { completeLine } from "../../../services/courses/authorRules";
import { coverUrl, fetchAuthorSummaries, fetchCourseExtras, type AuthorSummary, type CourseExtras } from "../../../services/courses/extras";
import { useBack } from "../../../hooks/useBack";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { CtaButton } from "../../ui/PinnedCta";
import { Toast } from "../../ui/Toast";
import { INK } from "../../pro/proInk";
import { EmptyState } from "../../pro/EmptyState";
import { OfflineLine, ProCardSkeleton, ProError } from "../../pro/states";
import { Fab } from "../../pro/library/libraryUi";
import { fmtDay } from "../../pro/client/clientFormat";
import { coverBackground } from "../courseCover";
import { PageHead } from "../../pro/courses/courseUi";
import { COURSE_TABS, sizeLine, statusLabel, tabOf, type CourseTab } from "../../pro/courses/courseModel";
import { CourseSheet } from "../../pro/courses/CourseSheet";
import { CourseStats } from "../../pro/courses/CourseStats";

/**
 * Release 3 · W6 MO18 v3 "Community › Courses › Your courses" (Published,
 * Drafts, Archived, empty), replacing design screen 9's list. Literal values
 * from r18.js courses18 / crsCard18:
 * - head (cHead15): "Your courses" 24 / 700, "In Community › Courses, under
 *   your name"; tabs 40 high, 13, 12 under;
 * - card: r20, card fill and border, m-bottom 10; cover 96 with the 6 pt
 *   edge on the left and the price tag (11 / 800, r8, pad 3 8, right 10 top
 *   10); body pad 12 14 13; title 15 / 800 line 1.3; size line 12
 *   text.faint m-top 3; meta 12 text.soft, gap 12, m-top 10;
 * - Published: enrolled (users 13) and the rating (star 12 #D9A441, bold);
 *   Round D: "{n}% complete" and its bar (course_author_summaries);
 * - Drafts: a 6 pt dot (gold In review, text.tertiary Draft) and "Submitted
 *   {date}"; a sent-back course shows the reviewer's reason;
 * - Archived: "{n} took it", Round D "Unpublished {date}", and the note;
 * - empty: EmptyState graduation-cap + "Create a course" (secondary, sm);
 * - "+" (fab10): 56, 20 from the right, 104 up, "Create course".
 * The cover is the approved cover image (Round D, course-covers) over the
 * course's own colour, never the frame's stripes.
 *
 * ONLY A PROFESSIONAL GETS THE AUTHOR SIDE (Community gates it); create_course
 * then refuses anyone without a verified licence (ATX66), and the sheet says so.
 * A published or archived course opens its stats (MO28); any other opens the
 * Create course sheet over this list.
 */
export function MyCourses({ userId, canAuthor, openCourseId }: { userId: string; canAuthor: boolean; openCourseId?: string }) {
  const navigate = useNavigate();
  const back = useBack();
  const { user } = useApp();
  const location = useLocation();
  const initialStep = (location.state as { step?: number } | null)?.step;
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const [cards, setCards] = useState<CourseCard[] | null>(null);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [failed, setFailed] = useState<{ offline: boolean } | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Map<string, AuthorSummary>>(() => new Map());
  const [extras, setExtras] = useState<Map<string, CourseExtras>>(() => new Map());

  const load = useCallback(async () => {
    const [r, cats, sums] = await Promise.all([fetchCourseCards(userId), fetchCourseCategories(), fetchAuthorSummaries()]);
    if (cats.ok) setCategories(cats.value);
    setSummaries(sums);
    if (!r.ok) {
      setFailed({ offline: r.offline });
      return;
    }
    setFailed(null);
    setCards(r.data);
    setExtras(await fetchCourseExtras(r.data.map((c) => c.id)));
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = openCourseId ? cards?.find((c) => c.id === openCourseId) ?? null : null;
  const openTab = open ? tabOf(open.status) : null;
  const tab: CourseTab = COURSE_TABS.includes(tabParam as CourseTab) ? (tabParam as CourseTab) : openTab ?? "Published";

  if (!canAuthor) {
    return (
      <div>
        <PageHead title="Your courses" sub="In Community › Courses, under your name" onBack={back} />
        <EmptyState icon={GraduationCap} title="Courses are written by verified professionals" line="Add your licence in Profile and we'll verify it. Once it's verified you can write and publish courses here.">
          <CtaButton size="base" variant="secondary" label="Go to Profile" onClick={() => navigate("/app/profile")} />
        </EmptyState>
      </div>
    );
  }

  // A published or archived course is opened as its stats page (MO28).
  if (open && (open.status === "published" || open.status === "unpublished")) {
    return <CourseStats key={open.id} card={open} categories={categories} onChanged={() => void load()} />;
  }

  const shown = (cards ?? []).filter((c) => tabOf(c.status) === tab);
  const openCard = (c: CourseCard) => navigate(`/app/forum/courses/mine/${c.id}`);
  const closeSheet = () => {
    setCreating(false);
    if (openCourseId) navigate(`/app/forum/courses/mine?tab=Drafts`, { replace: true });
  };

  return (
    <div className="flex flex-col pb-28">
      <PageHead title="Your courses" sub="In Community › Courses, under your name" onBack={back} />
      <SegmentedTabs
        items={COURSE_TABS.map((t) => ({ key: t, label: t }))}
        activeKey={tab}
        onChange={(k) => setParams({ tab: k }, { replace: true })}
        tabHeight={40}
        labelSize={13}
        darkTone="partB"
        className="mb-3"
      />

      {failed && cards && failed.offline && <OfflineLine />}
      {failed && !cards ? (
        <ProError onRetry={() => void load()} />
      ) : !cards ? (
        <div role="status" aria-label="Loading" className="flex flex-col" style={{ gap: 10 }}>
          <ProCardSkeleton lines={3} height={190} />
          <ProCardSkeleton lines={3} height={190} />
        </div>
      ) : cards.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No courses yet" line="A course is weeks of lessons: videos, readings, PDFs and quizzes. It stays a draft until you publish it.">
          <CtaButton size="base" variant="secondary" icon={<Plus size={15} strokeWidth={2} aria-hidden />} label="Create a course" onClick={() => setCreating(true)} />
        </EmptyState>
      ) : (
        <>
          {shown.length === 0 && <EmptyState icon={GraduationCap} title={`No ${tab.toLowerCase()} courses`} />}
          {shown.map((c) => (
            <CourseCardView key={c.id} card={c} summary={summaries.get(c.id) ?? null} cover={coverUrl(extras.get(c.id)?.coverPath)} onOpen={() => openCard(c)} />
          ))}
          {tab === "Archived" && shown.length > 0 && (
            <p style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.5 }}>Archived courses are hidden from new clients. Anyone enrolled keeps access.</p>
          )}
        </>
      )}

      {cards && cards.length > 0 && <Fab label="Create course" icon={Plus} onClick={() => setCreating(true)} />}

      {(creating || (open && !!openCourseId)) && (
        <CourseSheet
          key={creating ? "new" : open?.id}
          courseId={creating ? null : open?.id ?? null}
          categories={categories}
          initialStep={initialStep}
          authorName={user.firstName}
          onClose={closeSheet}
          onChanged={() => void load()}
          onCreated={(id) => {
            setCreating(false);
            navigate(`/app/forum/courses/mine/${id}`, { replace: true, state: { step: 1 } });
          }}
          onSubmitted={(title) => {
            setToast(`${title} is with Centium for review.`);
            closeSheet();
            void load();
          }}
          onSavedDraft={() => {
            setToast("Saved as a draft.");
            closeSheet();
            void load();
          }}
        />
      )}

      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
}

function CourseCardView({ card: c, summary, cover, onOpen }: { card: CourseCard; summary: AuthorSummary | null; cover: string | null; onOpen: () => void }) {
  const dark = useIsDark();
  const tab = tabOf(c.status);
  const pub = tab === "Published";
  const dot = c.status === "submitted" ? INK.gold : c.status === "changes_requested" ? INK.hi : c.status === "draft" ? INK.chT : INK.chF;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="tap w-full text-left overflow-hidden"
      style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, marginBottom: 10 }}
      aria-label={`${c.title}, ${pub ? "published" : statusLabel(c.status).toLowerCase()}`}
    >
      <div className="relative overflow-hidden" style={{ height: 96, background: coverBackground(c.coverColour, dark) }}>
        {cover && <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <span aria-hidden className="absolute" style={{ left: 0, top: 0, bottom: 0, width: 6, background: tab === "Archived" ? INK.chF : tab === "Drafts" ? dot : INK.prAccent }} />
        <span className="absolute" style={{ right: 10, top: 10, fontSize: textPx(11), fontWeight: 800, borderRadius: 8, padding: "3px 8px", background: INK.card, color: INK.ch }}>
          {formatPrice(c.priceCents)}
        </span>
      </div>
      <div style={{ padding: "12px 14px 13px" }}>
        <p style={{ fontSize: textPx(15), fontWeight: 800, color: INK.ch, lineHeight: 1.3, overflowWrap: "anywhere" }}>{c.title}</p>
        <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 3 }}>{sizeLine(c.weeks, c.lessons)}</p>
        <div className="flex items-center flex-wrap" style={{ gap: "4px 12px", marginTop: 10, fontSize: textPx(12), color: INK.chS }}>
          {pub ? (
            <>
              <span className="inline-flex items-center" style={{ gap: 4 }}>
                <Users size={13} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
                {c.enrolled} enrolled
              </span>
              {c.ratings > 0 && c.averageRating !== null && (
                <span className="inline-flex items-center ml-auto" style={{ gap: 4 }}>
                  <Star size={12} strokeWidth={1.5} aria-hidden fill="#D9A441" style={{ color: "#D9A441" }} />
                  <b style={{ color: INK.ch }}>{c.averageRating.toFixed(1)}</b>
                </span>
              )}
            </>
          ) : tab === "Archived" ? (
            <span className="inline-flex items-center" style={{ gap: 5 }}>
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: 9999, background: INK.chF }} />
              {c.enrolled} took it
              {summary?.unpublishedAt && <span style={{ color: INK.chF, marginLeft: 7 }}>Unpublished {fmtDay(summary.unpublishedAt)}</span>}
            </span>
          ) : (
            <>
              <span className="inline-flex items-center" style={{ gap: 5 }}>
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: 9999, background: dot }} />
                {statusLabel(c.status)}
              </span>
              {c.status === "submitted" && c.submittedAt && <span style={{ color: INK.chF }}>Submitted {fmtDay(c.submittedAt)}</span>}
            </>
          )}
        </div>
        {pub && summary && completeLine(summary.completionPct) && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: textPx(12), color: INK.chS }}>{completeLine(summary.completionPct)}</p>
            <span className="block" style={{ height: 6, borderRadius: 9999, background: INK.soft, overflow: "hidden", marginTop: 4 }}>
              <span className="block h-full" style={{ width: `${summary.completionPct ?? 0}%`, background: INK.prDeep }} />
            </span>
          </div>
        )}
        {c.status === "changes_requested" && c.reviewReason && (
          <p style={{ marginTop: 8, fontSize: textPx(12), color: INK.goldInk, lineHeight: 1.45, overflowWrap: "anywhere" }}>{c.reviewReason}</p>
        )}
      </div>
    </button>
  );
}
