import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { forumAccess, ADULTS_ONLY_TEXT, NEEDS_DOB_TEXT, type ForumCategory } from "../../services/forum/rules";
import { useForumMe } from "../../components/forum/useForumMe";
import { ForumHome } from "../../components/forum/ForumHome";
import { ForumPostView } from "../../components/forum/ForumPostView";
import { ForumCompose } from "../../components/forum/ForumCompose";
import { NicknameScreen } from "../../components/forum/NicknameScreen";
import { CoursesCatalogue } from "../../components/courses/CoursesCatalogue";
import { CourseDetailView } from "../../components/courses/CourseDetailView";
import { LessonView } from "../../components/courses/LessonView";
import { ADULTS_ONLY_COURSES_TEXT, NEEDS_DOB_COURSES_TEXT } from "../../services/courses/rules";
import { ForumPlaceholder } from "../../components/forum/parts";
import { fv } from "../../components/forum/forumColor";

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
  categories: ForumCategory[];
  nickname: string | null;
  recoveryOn: boolean;
  recoveryPending: boolean;
};

type Section = "forum" | "courses";

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
      categories: me.categories,
      nickname: me.nickname,
      recoveryOn: recoverySensitive,
      recoveryPending: recoveryModePending,
    },
  };
}

function Heading() {
  return <h1 className="m-0 text-[26px] font-extrabold" style={{ color: fv("text") }}>Community</h1>;
}

function Refused({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3">
      <Heading />
      <p className="text-[15px] leading-[1.6] rounded-2xl px-4 py-3.5" style={{ background: fv("rules-bg"), color: fv("rules-ink") }}>
        {text}
      </p>
    </div>
  );
}

function Gated({ render, section = "forum" }: { render: (ctx: Ctx) => React.ReactNode; section?: Section }) {
  const gate = useForumGate(section);
  if (gate.state === "redirect") return <Navigate to="/app" replace />;
  if (gate.state === "refused") return <Refused text={gate.text} />;
  if (gate.state === "error") {
    return (
      <div className="flex flex-col gap-3">
        <Heading />
        <p role="alert" className="text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {gate.message}
        </p>
        <button
          type="button"
          onClick={gate.retry}
          className="tap self-start h-11 rounded-full px-5 text-sm font-bold"
          style={{ background: fv("accent"), color: fv("on-accent") }}
        >
          Try again
        </button>
      </div>
    );
  }
  if (gate.state === "loading") {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Heading />
        <ForumPlaceholder height={48} />
        <ForumPlaceholder height={150} />
        <ForumPlaceholder height={150} />
      </div>
    );
  }
  return <>{render(gate.ctx)}</>;
}

/** /app/forum: the Community page. */
export default function Community() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "courses" ? "courses" : "forum";
  const navigate = useNavigate();

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
          <div className="flex flex-col gap-3" style={{ color: fv("text") }}>
            <Heading />
            <div className="flex gap-1 rounded-[14px] p-1" style={{ background: fv("track") }} role="tablist" aria-label="Community">
              {(["forum", "courses"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setParams(t === "courses" ? { tab: "courses" } : {}, { replace: true })}
                  className="tap grow basis-0 h-10 rounded-[11px] text-sm"
                  style={
                    tab === t
                      ? { background: fv("track-active"), color: fv("text"), fontWeight: 800 }
                      : { background: "transparent", color: fv("muted"), fontWeight: 600 }
                  }
                >
                  {t === "forum" ? "Forum" : "Courses"}
                </button>
              ))}
            </div>
            {tab === "courses" ? (
              <CoursesCatalogue userId={ctx.userId} />
            ) : (
              <ForumHome
                categories={ctx.categories}
                nickname={ctx.nickname}
                isProfessional={ctx.isProfessional}
                recoveryOn={ctx.recoveryOn}
                recoveryPending={ctx.recoveryPending}
              />
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

/** /app/forum/new */
export function ForumNewPage() {
  return (
    <Gated
      render={(ctx) =>
        !ctx.isProfessional && ctx.nickname === null ? (
          <Navigate to="/app/forum" replace />
        ) : (
          <ForumCompose
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
