import React, { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Users } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { forumAccess, ADULTS_ONLY_TEXT, NEEDS_DOB_TEXT, type ForumCategory } from "../../services/forum/rules";
import { ADULTS_ONLY_COURSES_TEXT, NEEDS_DOB_COURSES_TEXT } from "../../services/courses/rules";
import { useForumMe } from "../../components/forum/useForumMe";
import { useBack } from "../../hooks/useBack";
import { t } from "../../i18n/core";
import CommunityMobile, { CoursePage as CoursePageMobile, ForumNicknamePage as ForumNicknamePageMobile, ForumPostPage as ForumPostPageMobile } from "./Community";
import { CenteredNote, CommunityFrameWeb } from "./web/CommunityFrameWeb";
import { ForumWeb } from "./web/ForumWeb";
import { ForumComposeWeb } from "./web/ForumComposeWeb";
import { ForumPostWeb } from "./web/ForumPostWeb";
import { NicknameWeb } from "./web/NicknameWeb";
import { CoursesWeb } from "./web/CoursesWeb";
import { CourseWeb } from "./web/CourseWeb";
import { coDanger } from "./web/communityWebStyles";

type Section = "forum" | "courses";
type Ctx = { userId: string; firstName: string; categories: ForumCategory[]; nickname: string | null; recoveryOn: boolean; recoveryPending: boolean };
type Gate =
  | { state: "redirect" }
  | { state: "refused"; text: string }
  | { state: "loading" }
  | { state: "error"; retry: () => void }
  | { state: "ready"; ctx: Ctx };

/** The mobile gate's rules, unchanged: adults only, a date of birth needed, the server's answer wins (no categories = not confirmed 18+). */
function useGate(section: Section): Gate {
  const { user, authUserId, recoverySensitive, recoveryModePending } = useApp();
  const access = forumAccess(user.dateOfBirth);
  const allowed = user.accountType !== "business" && access === "adult" && !!authUserId;
  const me = useForumMe(allowed ? authUserId : null);
  if (user.accountType === "business" || !authUserId) return { state: "redirect" };
  if (access === "minor") return { state: "refused", text: section === "courses" ? ADULTS_ONLY_COURSES_TEXT : ADULTS_ONLY_TEXT };
  if (access === "unknown-age") return { state: "refused", text: section === "courses" ? NEEDS_DOB_COURSES_TEXT : NEEDS_DOB_TEXT };
  if (me.error && (!me.categories || me.nickname === undefined)) return { state: "error", retry: me.retry };
  if (!me.categories || me.nickname === undefined) return { state: "loading" };
  if (me.categories.length === 0) return { state: "refused", text: section === "courses" ? NEEDS_DOB_COURSES_TEXT : NEEDS_DOB_TEXT };
  return {
    state: "ready",
    ctx: { userId: authUserId, firstName: user.firstName, categories: me.categories, nickname: me.nickname, recoveryOn: recoverySensitive, recoveryPending: recoveryModePending },
  };
}

/** What the gate shows before the page itself: the refusal, the error with Retry, or the loading blocks. */
function GateBody({ gate, render }: { gate: Gate; render: (ctx: Ctx) => React.ReactNode }) {
  if (gate.state === "redirect") return <Navigate to="/app" replace />;
  if (gate.state === "refused")
    return (
      <CenteredNote icon={<Users size={26} strokeWidth={1.75} />}>
        <p style={{ margin: 0 }}>{t(gate.text)}</p>
      </CenteredNote>
    );
  if (gate.state === "error")
    return (
      <p role="alert" className="flex flex-wrap items-center" style={{ ...coDanger, columnGap: 8 }}>
        <span>{typeof navigator !== "undefined" && navigator.onLine === false ? t("You're offline. Try again when you're connected.") : t("Couldn't load the forum.")}</span>
        <button type="button" onClick={gate.retry} className="co-web-focus" style={{ fontWeight: 700, color: "#7D6BB5" }}>
          {t("Retry")}
        </button>
      </p>
    );
  if (gate.state === "loading")
    return (
      <div className="flex flex-col" style={{ gap: 12 }} aria-busy="true">
        {[44, 180, 180].map((h, i) => (
          <div key={i} aria-hidden className="animate-skeleton-pulse bg-cream-soft" style={{ height: h, borderRadius: 20 }} />
        ))}
      </div>
    );
  return <>{render(gate.ctx)}</>;
}

const SUB = () => t("Discuss with other clients, or learn from a course");

/** Professionals keep their mobile Community at every width (they have no web shell). */
const isPro = (accountType: string) => accountType === "professional";

/**
 * Website viewport v1, WC-CO Community at /app/forum (WC-CO Community Web
 * v3): the frame's header with New post (the Forum tab), the Forum · Courses
 * tabs, then the forum, the nickname screen on a first visit, the
 * adults-only and date-of-birth answers, or the courses; /app/forum/new opens
 * the New post side sheet over it.
 */
export default function CommunityWeb({ compose = false }: { compose?: boolean }) {
  const { user } = useApp();
  if (isPro(user.accountType)) return <CommunityMobile compose={compose} />;
  return <CommunityWebPage compose={compose} />;
}

function CommunityWebPage({ compose }: { compose: boolean }) {
  const [params, setParams] = useSearchParams();
  const tab: Section = params.get("tab") === "courses" ? "courses" : "forum";
  const navigate = useNavigate();
  const location = useLocation();
  const gate = useGate(tab);
  const ready = gate.state === "ready";
  // Closing New post replaces /app/forum/new with /app/forum, which remounts the page: focus goes back to its New post button.
  useEffect(() => {
    if (ready && (location.state as { coFocusCta?: boolean } | null)?.coFocusCta) document.querySelector<HTMLElement>("[data-co-cta]")?.focus({ preventScroll: true });
  }, [ready, location.state]);
  const nicknameFirst = tab === "forum" && gate.state === "ready" && gate.ctx.nickname === null;
  const showCta = tab === "forum" && gate.state === "ready" && !nicknameFirst;
  const centred = gate.state === "refused" || nicknameFirst;
  return (
    <CommunityFrameWeb
      title={t("Community")}
      sub={SUB()}
      cta={showCta ? { label: t("New post"), onClick: () => navigate("/app/forum/new") } : undefined}
      tabs={{ active: tab, onChange: (k) => setParams(k === "courses" ? { tab: "courses" } : {}, { replace: true }) }}
      fill={centred}
    >
      <GateBody
        gate={gate}
        render={(ctx) => {
          if (tab === "courses") return <CoursesWeb userId={ctx.userId} />;
          if (ctx.nickname === null) return <NicknameWeb firstName={ctx.firstName} initial={null} editing={false} onDone={() => navigate("/app/forum", { replace: true })} />;
          return (
            <>
              <ForumWeb userId={ctx.userId} categories={ctx.categories} nickname={ctx.nickname} recoveryOn={ctx.recoveryOn} recoveryPending={ctx.recoveryPending} />
              {compose && (
                <ForumComposeWeb
                  onClose={() => navigate("/app/forum", { replace: true, state: { coFocusCta: true } })}
                  userId={ctx.userId}
                  firstName={ctx.firstName}
                  nickname={ctx.nickname}
                  categories={ctx.categories}
                  recoveryOn={ctx.recoveryOn}
                  recoveryPending={ctx.recoveryPending}
                />
              )}
            </>
          );
        }}
      />
    </CommunityFrameWeb>
  );
}

/** /app/forum/new: the forum with the New post side sheet open (WC-CO.2). */
export function ForumNewPageWeb() {
  return <CommunityWeb compose />;
}

/** /app/forum/post/:id (WC-CO.1): the header names the post's category, "Post" beside it. */
export function ForumPostPageWeb() {
  const { user } = useApp();
  if (isPro(user.accountType)) return <ForumPostPageMobile />;
  return <ForumPostWebPage />;
}

function ForumPostWebPage() {
  const { id } = useParams();
  const gate = useGate("forum");
  const back = useBack("/app/forum");
  const [title, setTitle] = useState<string | null>(null);
  const onTitle = useCallback((x: string | null) => setTitle(x), []);
  if (gate.state === "ready" && gate.ctx.nickname === null) return <Navigate to="/app/forum" replace />;
  return (
    <CommunityFrameWeb title={title ?? t("Community")} sub={t("Post")} onBack={back} fill={gate.state === "refused"}>
      <GateBody
        gate={gate}
        render={(ctx) => (
          <ForumPostWeb
            key={id}
            threadId={id ?? ""}
            userId={ctx.userId}
            firstName={ctx.firstName}
            nickname={ctx.nickname}
            categories={ctx.categories}
            recoveryOn={ctx.recoveryOn}
            recoveryPending={ctx.recoveryPending}
            onGone={back}
            onTitle={onTitle}
          />
        )}
      />
    </CommunityFrameWeb>
  );
}

/** /app/forum/nickname: changing the nickname, from the forum's Edit or from Profile (the WC-CO.3 screen, with Back). */
export function ForumNicknamePageWeb() {
  const { user } = useApp();
  if (isPro(user.accountType)) return <ForumNicknamePageMobile />;
  return <ForumNicknameWebPage />;
}

function ForumNicknameWebPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const back = useBack("/app/forum");
  const from = (location.state as { from?: string } | null)?.from ?? "/app/forum";
  const gate = useGate("forum");
  return (
    <CommunityFrameWeb title={t("Community")} sub={SUB()} onBack={back} fill>
      <GateBody
        gate={gate}
        render={(ctx) => <NicknameWeb firstName={ctx.firstName} initial={ctx.nickname} editing={ctx.nickname !== null} onDone={() => navigate(from, { replace: true })} />}
      />
    </CommunityFrameWeb>
  );
}

/** /app/forum/courses/:courseId (WC-CO.4, a course): the course's title in the header, "Course" beside it. */
export function CoursePageWeb() {
  const { user } = useApp();
  if (isPro(user.accountType)) return <CoursePageMobile />;
  return <CourseWebPage />;
}

function CourseWebPage() {
  const { courseId } = useParams();
  const gate = useGate("courses");
  const back = useBack("/app/forum?tab=courses");
  const [title, setTitle] = useState<string | null>(null);
  const onTitle = useCallback((x: string | null) => setTitle(x), []);
  return (
    <CommunityFrameWeb title={title ?? t("Community")} sub={t("Course")} onBack={back} fill={gate.state === "refused"}>
      <GateBody gate={gate} render={(ctx) => <CourseWeb key={courseId} courseId={courseId ?? ""} userId={ctx.userId} onTitle={onTitle} />} />
    </CommunityFrameWeb>
  );
}
