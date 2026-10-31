import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { forumAccess, ADULTS_ONLY_TEXT, NEEDS_DOB_TEXT, type ForumCategory } from "../../services/forum/rules";
import { useForumMe } from "../../components/forum/useForumMe";
import { ForumHome } from "../../components/forum/ForumHome";
import { ForumPostView } from "../../components/forum/ForumPostView";
import { ForumCompose } from "../../components/forum/ForumCompose";
import { NicknameScreen } from "../../components/forum/NicknameScreen";
import { CoursesCatalogue } from "../../components/courses/CoursesCatalogue";
import { MyCourses } from "../../components/courses/author/MyCourses";
import { CourseBuilder } from "../../components/courses/author/CourseBuilder";
import { CourseDetailView } from "../../components/courses/CourseDetailView";
import { LessonView } from "../../components/courses/LessonView";
import { CertificateView } from "../../components/courses/certificates/CertificateView";
import { ADULTS_ONLY_COURSES_TEXT, NEEDS_DOB_COURSES_TEXT } from "../../services/courses/rules";
import { ForumPlaceholder } from "../../components/forum/parts";
import { useBack } from "../../hooks/useBack";
import { useState } from "react";
import { Users } from "lucide-react";
import { FixedHeader } from "../../components/ui/FixedHeader";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { textPx } from "../../theme/textSize";
import { SUBTYPE_SINGULAR } from "../../components/professionals/subtypeLabels";

// The Community page: Forum and Courses (design PgYuBboDr8DEL2bk7EJKtU,
// screen 1), and the forum's own screens behind it.
//
// ADULTS ONLY. The database refuses everything here to anyone it cannot
// confirm is 18 or over (ATX55, and every read policy). The app matches it:
// no More tile or sidebar entry for an under-18, and this gate for anyone who
// opens the link anyway. Businesses have no Community, as before.

type Ctx = {
  userId: string;
  firstName: string;
  isProfessional: boolean;
  /** A professional's title for "Posting as" (MO18 v2), from their type. */
  proTitle: string;
  categories: ForumCategory[];
  nickname: string | null;
  recoveryOn: boolean;
  recoveryPending: boolean;
};

type Section = "forum" | "courses";

/** "Personal trainer", "Dietitian" (the type as one noun, capitalised). */
function proTitleOf(type: string | undefined): string {
  const noun = SUBTYPE_SINGULAR[(type ?? "other") as keyof typeof SUBTYPE_SINGULAR] ?? SUBTYPE_SINGULAR.other;
  return noun.charAt(0).toUpperCase() + noun.slice(1);
}

function useForumGate(section: Section):
  | { state: "redirect" }
  | { state: "refused"; text: string }
  | { state: "loading" }
  | { state: "error"; message: string; retry: () => void }
  | { state: "ready"; ctx: Ctx } {
  const { user, authUserId, recoverySensitive, recoveryModePending } = useApp();
  const access = forumAccess(user.dateOfBirth);
  const allowed = user.accountType !== "business" && access === "adult" && !!authUserId;
  const me = useForumMe(allowed ? authUserId : null);
  if (user.accountType === "business" || !authUserId) return { state: "redirect" };
  if (access === "minor") {
    return { state: "refused", text: section === "courses" ? ADULTS_ONLY_COURSES_TEXT : ADULTS_ONLY_TEXT };
  }
  // Never an empty page: an older account with no date of birth is told what
  // would let them in, in the words of the part they opened.
  if (access === "unknown-age") {
    return { state: "refused", text: section === "courses" ? NEEDS_DOB_COURSES_TEXT : NEEDS_DOB_TEXT };
  }
  if (me.error && (!me.categories || me.nickname === undefined)) {
    return { state: "error", message: me.error, retry: me.retry };
  }
  if (!me.categories || me.nickname === undefined) return { state: "loading" };
  // THE SERVER'S ANSWER WINS. The forum's categories are always seeded and
  // are readable only by someone the server confirms is 18 or over, so none
  // coming back means it does not (a date of birth removed or changed since
  // this device last saw the profile). Say what would let them in rather than
  // show an empty forum or catalogue.
  if (me.categories.length === 0) {
    return { state: "refused", text: section === "courses" ? NEEDS_DOB_COURSES_TEXT : NEEDS_DOB_TEXT };
  }
  return {
    state: "ready",
    ctx: {
      userId: authUserId,
      firstName: user.firstName,
      isProfessional: user.accountType === "professional",
      proTitle: proTitleOf(user.professionalSubtype),
      categories: me.categories,
      nickname: me.nickname,
      recoveryOn: recoverySensitive,
      recoveryPending: recoveryModePending,
    },
  };
}

/// v6 MO1.3 #2-#5: the back button and the title block. Title 27/40.5 700
// ls -0.6 in charcoal (#241F1B / #F5F3FA), subtitle 13/19.5 500 #8C8378 /
// #B8B3C7 6 under it; 16 to the tabs (the caller's).
function Heading({ className = "mb-4" }: { className?: string }) {
  const back = useBack();
  const { user } = useApp();
  // Release 3 · W6 MO18 v2 (r15 cHead15 with size 27), professionals only:
  // back 36 (ml -7), gap 6; title 27 / 700 -0.03em line 1.25, 3 down;
  // subtitle 13 text.faint, 4 under; 16 to the tabs.
  if (user.accountType === "professional") {
    return (
      <div className={`flex items-start ${className}`} style={{ gap: 6 }}>
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="tap w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-charcoal-soft relative before:absolute before:-inset-1 before:content-['']"
          style={{ marginInlineStart: -7 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="min-w-0" style={{ marginTop: 3 }}>
          <h1 className="m-0 font-bold text-charcoal" style={{ fontSize: textPx(27), letterSpacing: "-0.03em", lineHeight: 1.25 }}>
            Community
          </h1>
          <p className="m-0 text-charcoal-faint" style={{ marginTop: 4, fontSize: textPx(13) }}>
            Answer questions from clients and colleagues, or teach a course
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      <button
        type="button"
        onClick={back}
        aria-label="Back"
        className="tap w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-charcoal-soft"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div className="min-w-0">
        <h1 className="m-0 text-[27px] font-bold leading-[40.5px] tracking-[-0.6px] text-charcoal">Community</h1>
        <p className="m-0 mt-1.5 text-[13px] leading-[19.5px] font-medium text-charcoal-faint">
          Discuss with other clients, or learn from a course
        </p>
      </div>
    </div>
  );
}

// K6 (KEEP-SAFETY): the adults-only / date-of-birth answer, restyled as the
// MO1.7.e empty pattern (no box): a 56 r16 #F0EDF9 / #303141 tile with the
// icon 26 #7D6BB5 / #C3B3FB and the line 12.5/18.8 #5B5349 / #B8B3C7, 260
// wide, centred. The words are unchanged.
function Refused({ text }: { text: string }) {
  return (
    <div className="flex flex-col">
      <Heading className="mb-0" />
      <div className="flex flex-col items-center text-center gap-2.5 pt-16 mx-auto max-w-[260px]">
        <span className="w-14 h-14 rounded-2xl bg-primary-pale flex items-center justify-center text-th-7d6bb5 dark:text-th-c3b3fb" aria-hidden="true">
          <Users size={26} strokeWidth={1.75} />
        </span>
        <p className="m-0 text-[12.5px] leading-[18.8px] text-charcoal-soft">{text}</p>
      </div>
    </div>
  );
}

function Gated({ render, section = "forum" }: { render: (ctx: Ctx) => React.ReactNode; section?: Section }) {
  const gate = useForumGate(section);
  if (gate.state === "redirect") return <Navigate to="/app" replace />;
  if (gate.state === "refused") return <Refused text={gate.text} />;
  if (gate.state === "error") {
    return (
      <div className="flex flex-col">
        <Heading />
        {/* K8 / O2 (OURS): "Couldn't load the forum." and a Retry text
            button, 12.5/18.8 500 #C0392B / #F09A8E; Retry #7D6BB5 / #C3B3FB. */}
        <p role="alert" className="m-0 flex flex-wrap items-center gap-x-2 text-[12.5px] leading-[18.8px] font-medium text-status-high">
          <span>
            {typeof navigator !== "undefined" && navigator.onLine === false
              ? "You're offline. Try again when you're connected."
              : "Couldn't load the forum."}
          </span>
          <button type="button" onClick={gate.retry} className="tap font-bold text-th-7d6bb5 dark:text-th-c3b3fb">
            Retry
          </button>
        </p>
      </div>
    );
  }
  if (gate.state === "loading") {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Heading className="mb-1" />
        <ForumPlaceholder height={56} />
        <ForumPlaceholder height={150} />
        <ForumPlaceholder height={150} />
      </div>
    );
  }
  return <>{render(gate.ctx)}</>;
}

/** /app/forum: the Community page. With `compose` (/app/forum/new) the New
 *  post sheet is open over the forum (MO1.3.2, A22). */
export default function Community({ compose = false }: { compose?: boolean }) {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "courses" ? "courses" : "forum";
  const navigate = useNavigate();
  // MO1.3 #1: the slot in the fixed area that ForumHome draws its category
  // strip into (the strip's state stays ForumHome's).
  const [stripSlot, setStripSlot] = useState<HTMLDivElement | null>(null);

  return (
    <Gated
      section={tab}
      render={(ctx) => {
        // First visit: a member chooses a nickname before seeing the forum.
        // Professionals post under their name only, so they have none to choose.
        if (tab === "forum" && !ctx.isProfessional && ctx.nickname === null) {
          return <NicknameScreen firstName={ctx.firstName} initial={null} editing={false} onDone={() => navigate("/app/forum", { replace: true })} />;
        }
        return (
          <div className="flex flex-col">
            {/* v6 MO1.3 #1 / S8: header, Forum · Courses and (on Forum) the
                category strip stay fixed (shared FixedHeader: fill + 1px
                hairline once content passes under; V6-91 dark #121317); the
                nickname line and the rules card scroll away. Pad 16 under. */}
            <FixedHeader paddingBottom={16}>
              <Heading />
              {/* #6-#8: SegmentedTabs, 15/22.5 700. Active #A79AD5 white
                  (High contrast #5B48B8; dark #A991FE with #0D0B1A); idle
                  #F5F4FE with #5B5349; dark track and idle #303141 with
                  #B8B3C7. */}
              <SegmentedTabs
                items={[
                  { key: "forum", label: "Forum" },
                  { key: "courses", label: "Courses" },
                ]}
                activeKey={tab}
                onChange={(t) => setParams(t === "courses" ? { tab: "courses" } : {}, { replace: true })}
                labelSize={15}
                // Release 3 · W6 MO18 v2 (professionals): segTabs 56 high, 15,
                // 12 under, the board's idle ink; clients keep 44 and #5B5349.
                {...(ctx.isProfessional ? { tabHeight: 56 } : { idleInk: "rgb(var(--c-charcoal-soft))" })}
                darkTone="partB"
                className={tab === "forum" ? (ctx.isProfessional ? "mb-3" : "mb-2.5") : undefined}
              />
              {/* #9: 10 under the tabs. */}
              {tab === "forum" && <div ref={setStripSlot} data-forum-strip-slot="" />}
            </FixedHeader>
            {tab === "courses" ? (
              // THE WAY INTO THE BUILDER, for the people who can use it: only
              // a professional sees it, because create_course refuses everybody
              // else. Since decision 23 (item 65) it is a "Write a course" text
              // action on the catalogue's Popular row, not a row of its own.
              <CoursesCatalogue userId={ctx.userId} isProfessional={ctx.isProfessional} />
            ) : (
              <>
              {compose && (
                <ForumCompose
                  onClose={() => navigate("/app/forum", { replace: true })}
                  userId={ctx.userId}
                  firstName={ctx.firstName}
                  nickname={ctx.nickname}
                  isProfessional={ctx.isProfessional}
                  categories={ctx.categories}
                  recoveryOn={ctx.recoveryOn}
                  recoveryPending={ctx.recoveryPending}
                  postingAs={ctx.isProfessional ? { name: ctx.firstName, title: ctx.proTitle } : undefined}
                />
              )}
              <ForumHome
                userId={ctx.userId}
                categories={ctx.categories}
                nickname={ctx.nickname}
                isProfessional={ctx.isProfessional}
                recoveryOn={ctx.recoveryOn}
                recoveryPending={ctx.recoveryPending}
                stripSlot={stripSlot}
                proLook={ctx.isProfessional}
              />
              </>
            )}
          </div>
        );
      }}
    />
  );
}

/** /app/forum/post/:id */
export function ForumPostPage() {
  const { id } = useParams();
  return (
    <Gated
      render={(ctx) =>
        !ctx.isProfessional && ctx.nickname === null ? (
          <Navigate to="/app/forum" replace />
        ) : (
          <ForumPostView
            key={id}
            threadId={id ?? ""}
            userId={ctx.userId}
            firstName={ctx.firstName}
            nickname={ctx.nickname}
            isProfessional={ctx.isProfessional}
            categories={ctx.categories}
            recoveryOn={ctx.recoveryOn}
            recoveryPending={ctx.recoveryPending}
          />
        )
      }
    />
  );
}

/** /app/forum/new: the forum with the New post sheet open. */
export function ForumNewPage() {
  return <Community compose />;
}

/** /app/forum/nickname: changing it, from the forum's Edit link or from Profile. */
export function ForumNicknamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/app/forum";
  return (
    <Gated
      render={(ctx) =>
        ctx.isProfessional ? (
          <Navigate to="/app/forum" replace />
        ) : (
          <NicknameScreen
            firstName={ctx.firstName}
            initial={ctx.nickname}
            editing={ctx.nickname !== null}
            onDone={() => navigate(from, { replace: true })}
          />
        )
      }
    />
  );
}

/** /app/forum/courses/:courseId: a course page (design screen 7). */
export function CoursePage() {
  const { courseId } = useParams();
  return <Gated section="courses" render={(ctx) => <CourseDetailView key={courseId} courseId={courseId ?? ""} userId={ctx.userId} />} />;
}

/** /app/forum/courses/certificates/:certificateId: one of the learner's certificates (Round F · 3). */
export function CertificatePage() {
  const { certificateId } = useParams();
  return <Gated section="courses" render={() => <CertificateView key={certificateId} certificateId={certificateId ?? ""} />} />;
}

/**
 * /app/forum/courses/mine: a professional's own courses (design screen 9).
 *
 * BEHIND THE SAME GATE AS EVERY OTHER COURSE SCREEN. Courses are adults-only
 * and businesses have no Community, so the author side inherits both rather
 * than restating them. The licence check is separate and is the screen's own:
 * create_course refuses anyone unverified, so MyCourses says what is missing
 * instead of offering a button that cannot work.
 */
export function MyCoursesPage() {
  return <Gated section="courses" render={(ctx) => <MyCourses userId={ctx.userId} canAuthor={ctx.isProfessional} />} />;
}

/** /app/forum/courses/mine/:courseId: the builder (design screen 9). */
export function CourseBuilderPage() {
  const { courseId } = useParams();
  return (
    <Gated
      section="courses"
      render={(ctx) =>
        ctx.isProfessional ? <CourseBuilder key={courseId} courseId={courseId ?? ""} userId={ctx.userId} /> : <Navigate to="/app/forum?tab=courses" replace />
      }
    />
  );
}

/** /app/forum/courses/:courseId/lessons/:lessonId: a lesson (design screen 8). */
export function LessonPage() {
  const { courseId, lessonId } = useParams();
  return (
    <Gated
      section="courses"
      render={(ctx) => <LessonView key={lessonId} courseId={courseId ?? ""} lessonId={lessonId ?? ""} userId={ctx.userId} />}
    />
  );
}
