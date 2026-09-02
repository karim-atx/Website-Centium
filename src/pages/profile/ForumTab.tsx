import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import type { ForumCategory, ForumPost } from "../../types";
import { Plus, Heart, MessageCircle, ChevronLeft, Send, Pin, GraduationCap, Clock, BarChart2 } from "lucide-react";
import clsx from "clsx";

const categories: ForumCategory[] = ["Nutrition", "Workouts", "Progress", "Motivation", "General"];

// QA 11.0: "Rename the forum into something that includes forum in one
// tab while the other tab has courses related to fitness. Please
// populate the courses tab as you see fit." A small curated set, in the
// same spirit as the rest of this prototype's mocked content.
type CourseLevel = "Beginner" | "Intermediate" | "Advanced";
interface Course {
  id: string;
  title: string;
  category: ForumCategory;
  level: CourseLevel;
  durationMin: number;
  summary: string;
}
const courses: Course[] = [
  { id: "c1", title: "Strength Training Fundamentals", category: "Workouts", level: "Beginner", durationMin: 45, summary: "Bar path, bracing, and the big three lifts — build a foundation before you chase numbers." },
  { id: "c2", title: "Macros Made Simple", category: "Nutrition", level: "Beginner", durationMin: 30, summary: "What protein, carbs and fat actually do, and how to hit your targets without obsessing." },
  { id: "c3", title: "Progressive Overload Explained", category: "Workouts", level: "Intermediate", durationMin: 35, summary: "Why your lifts stall, and the handful of levers that reliably get you unstuck." },
  { id: "c4", title: "Eating Out in Lebanon, Made Easy", category: "Nutrition", level: "Beginner", durationMin: 25, summary: "Reading a mezze table, portioning manoushe, and ordering shawarma without guesswork." },
  { id: "c5", title: "Recovery & Sleep for Athletes", category: "Progress", level: "Intermediate", durationMin: 40, summary: "Why recovery is where the adaptation actually happens, and how to protect it." },
  { id: "c6", title: "Building a Sustainable Habit Loop", category: "Motivation", level: "Beginner", durationMin: 20, summary: "The mechanics behind habits that stick, applied to training and logging food." },
];
const levelColor: Record<CourseLevel, string> = {
  Beginner: "#3F9165",
  Intermediate: "#D9A441",
  Advanced: "#C0392B",
};

const categoryColor: Record<ForumCategory, string> = {
  Nutrition: "#D9A441",
  Workouts: "#7D6BB5",
  Progress: "#3F9165",
  Motivation: "#9C4F7C",
  General: "#4C8FD1",
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Design refinement §6.9: author identity leads every post now — a 30px
// initial avatar in place of a real photo, since the app has no user
// image assets to draw from.
const Avatar = ({ name, size = 30 }: { name: string; size?: number }) => (
  <div
    className="rounded-full bg-cream-soft text-charcoal-soft font-bold flex items-center justify-center shrink-0"
    style={{ width: size, height: size, fontSize: size * 0.4 }}
  >
    {name.charAt(0).toUpperCase()}
  </div>
);

// V9 (QA 9.0): "Make a new button, under professionals in more called forum
// that acts like a hub for all clients to share information publicly...
// take inspiration for other fitness forums" — a flat, categorized post
// feed with likes and a comment thread per post, the same core shape as
// r/Fitness or a MyFitnessPal community board.
export default function ForumTab() {
  const { forumPosts, addForumPost, toggleForumLike, addForumComment } = useApp();
  const [tab, setTab] = useState<"forum" | "courses">("forum");
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [filter, setFilter] = useState<ForumCategory | null>(null);
  const [activePost, setActivePost] = useState<ForumPost | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState<ForumCategory>("General");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [commentDraft, setCommentDraft] = useState("");

  const visiblePosts = filter ? forumPosts.filter((p) => p.category === filter) : forumPosts;
  // Keep the open post's own data live as the underlying store updates
  // (likes/comments), instead of a stale snapshot from when it was opened.
  const liveActivePost = activePost ? forumPosts.find((p) => p.id === activePost.id) ?? null : null;

  const save = () => {
    if (!draftTitle.trim() || !draftBody.trim()) return;
    addForumPost(draftCategory, draftTitle.trim(), draftBody.trim());
    setDraftTitle("");
    setDraftBody("");
    setDraftCategory("General");
    setComposeOpen(false);
  };

  const sendComment = () => {
    if (!commentDraft.trim() || !liveActivePost) return;
    addForumComment(liveActivePost.id, commentDraft.trim());
    setCommentDraft("");
  };

  if (liveActivePost) {
    const post = liveActivePost;
    return (
      <div>
        <button
          onClick={() => setActivePost(null)}
          className="tap flex items-center gap-1.5 text-sm font-semibold text-primary mb-4"
        >
          <ChevronLeft size={16} /> Forum
        </button>

        <Card className="mb-5 animate-fade-slide-up">
          <div className="flex items-center gap-2.5 mb-3">
            <Avatar name={post.authorName} />
            <div>
              <p className="text-sm font-bold text-charcoal">{post.authorName}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-charcoal-faint">
                <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: categoryColor[post.category] }} />
                <span>{post.category}</span>
                <span>·</span>
                <span>{timeAgo(post.at)}</span>
              </div>
            </div>
          </div>
          <p className="font-display text-lg font-semibold text-charcoal mb-1.5">{post.title}</p>
          <p className="text-sm text-charcoal-soft leading-relaxed mb-3">{post.body}</p>
          <div className="flex items-center gap-4 pt-3 border-t border-charcoal/[0.06]">
            <button
              onClick={() => toggleForumLike(post.id)}
              className={clsx("tap flex items-center gap-1.5 text-xs font-semibold", post.likedByMe ? "text-status-high" : "text-charcoal-faint")}
            >
              <Heart size={15} className={post.likedByMe ? "fill-status-high" : ""} /> {post.likes}
            </button>
            <span className="flex items-center gap-1.5 text-xs text-charcoal-faint">
              <MessageCircle size={15} /> {post.comments.length}
            </span>
          </div>
        </Card>

        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
          Comments
        </p>
        <div className="space-y-2.5 mb-4">
          {post.comments.length === 0 ? (
            <p className="text-sm text-charcoal-faint text-center py-6">No comments yet — be the first to reply.</p>
          ) : (
            post.comments.map((c) => (
              <Card key={c.id} padded={false} className="px-4 py-3">
                <p className="text-xs font-semibold text-charcoal mb-0.5">{c.authorName}</p>
                <p className="text-sm text-charcoal-soft">{c.text}</p>
              </Card>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 sticky bottom-0 bg-cream pt-2">
          <input
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendComment()}
            placeholder="Add a comment…"
            className="flex-1 rounded-full bg-cream-card border border-charcoal/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
          <button onClick={sendComment} className="tap w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0" aria-label="Send">
            <Send size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* QA 11.0: "Rename the forum into something that includes forum in
          one tab while the other tab has courses related to fitness." */}
      <PageHeader
        title="Community"
        subtitle="Discuss with other clients, or learn from a course"
        showBack
        right={
          tab === "forum" ? (
            <button
              onClick={() => setComposeOpen(true)}
              className="tap w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-soft"
              aria-label="New post"
            >
              <Plus size={18} />
            </button>
          ) : undefined
        }
      />

      <div className="flex gap-2 mb-5">
        <Chip active={tab === "forum"} onClick={() => setTab("forum")}>
          Forum
        </Chip>
        <Chip active={tab === "courses"} onClick={() => setTab("courses")}>
          Courses
        </Chip>
      </div>

      {tab === "courses" ? (
        <div className="space-y-2.5 animate-fade-slide-up">
          {courses.map((c) => (
            <Card key={c.id} interactive onClick={() => setActiveCourse(c)}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
                  <GraduationCap size={17} className="text-primary-dark" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-charcoal mb-1">{c.title}</p>
                  <p className="text-xs text-charcoal-soft leading-relaxed line-clamp-2 mb-2">{c.summary}</p>
                  <div className="flex items-center gap-3 text-[11px] text-charcoal-faint">
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {c.durationMin} min
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart2 size={11} style={{ color: levelColor[c.level] }} /> {c.level}
                    </span>
                    <span>{c.category}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          <BottomSheet open={!!activeCourse} onClose={() => setActiveCourse(null)} title={activeCourse?.title}>
            {activeCourse && (
              <div className="animate-fade-slide-up">
                <div className="flex items-center gap-3 text-xs text-charcoal-faint mb-4">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {activeCourse.durationMin} min
                  </span>
                  <span className="flex items-center gap-1 font-semibold" style={{ color: levelColor[activeCourse.level] }}>
                    <BarChart2 size={12} /> {activeCourse.level}
                  </span>
                  <span>{activeCourse.category}</span>
                </div>
                <p className="text-sm text-charcoal-soft leading-relaxed mb-5">{activeCourse.summary}</p>
                <Button fullWidth size="lg" disabled>
                  Start course — coming soon
                </Button>
              </div>
            )}
          </BottomSheet>
        </div>
      ) : (
      <>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-5">
        <Chip active={filter === null} onClick={() => setFilter(null)}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {/* Design refinement §6.9: pinned community-rule band — the one
          static, unlikeable row that always leads the feed. */}
      <Card className="mb-2.5 !bg-cream-soft flex items-start gap-2.5">
        <Pin size={14} className="text-charcoal-faint shrink-0 mt-0.5" />
        <p className="text-xs text-charcoal-soft leading-relaxed">
          <span className="font-bold text-charcoal">Community rules —</span> be kind, no medical advice, and keep
          it about health & fitness.
        </p>
      </Card>

      <div className="space-y-2.5">
        {visiblePosts.map((post) => {
          const topReply = post.comments[0];
          return (
            <Card key={post.id} interactive onClick={() => setActivePost(post)} className="animate-fade-slide-up">
              <div className="flex items-center gap-2.5 mb-2.5">
                <Avatar name={post.authorName} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-charcoal truncate">{post.authorName}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-charcoal-faint">
                    <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: categoryColor[post.category] }} />
                    <span>{post.category}</span>
                    <span>·</span>
                    <span>{timeAgo(post.at)}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm font-semibold text-charcoal mb-1">{post.title}</p>
              <p className="text-xs text-charcoal-soft leading-relaxed line-clamp-2 mb-2.5">{post.body}</p>
              {topReply && (
                <div className="border-l-2 pl-2.5 mb-2.5" style={{ borderColor: "#E4DFF3" }}>
                  <p className="text-[11px] text-charcoal-faint line-clamp-1">
                    <span className="font-semibold text-charcoal-soft">{topReply.authorName}</span> {topReply.text}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3">
                {/* QA 13.0: "I cant press the heart button from the outside
                    and could only do so when i go inside the post." This
                    was a plain `<span>` with no handler — the card's own
                    onClick just took over. Now a real button, wired to
                    `toggleForumLike` like the post-detail view already is,
                    with `stopPropagation` since it sits inside the card's
                    clickable area. */}
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    toggleForumLike(post.id);
                  }}
                  className={clsx("tap flex items-center gap-1 text-xs font-semibold", post.likedByMe ? "text-status-high" : "text-charcoal-faint")}
                >
                  <Heart size={13} className={post.likedByMe ? "fill-status-high" : ""} /> {post.likes}
                </button>
                <span className="flex items-center gap-1 text-xs text-charcoal-faint">
                  <MessageCircle size={13} /> {post.comments.length}
                </span>
              </div>
            </Card>
          );
        })}
        {visiblePosts.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">No posts in this category yet.</p>
          </Card>
        )}
      </div>

      <BottomSheet open={composeOpen} onClose={() => setComposeOpen(false)} title="New Post">
        <div className="space-y-4 animate-fade-slide-up">
          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Category</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setDraftCategory(c)}
                  className={clsx(
                    "tap rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors",
                    draftCategory === c ? "bg-primary text-white border-primary" : "bg-cream-soft border-transparent text-charcoal-soft"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Title</span>
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Details</span>
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={5}
              placeholder="Share your tip, question, or win with the community…"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </label>

          <Button fullWidth size="lg" onClick={save} disabled={!draftTitle.trim() || !draftBody.trim()}>
            Post to forum
          </Button>
        </div>
      </BottomSheet>
      </>
      )}
    </div>
  );
}
