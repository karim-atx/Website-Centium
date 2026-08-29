import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import type { ForumCategory, ForumPost } from "../../types";
import { Plus, Heart, MessageCircle, ChevronLeft, Send } from "lucide-react";
import clsx from "clsx";

const categories: ForumCategory[] = ["Nutrition", "Workouts", "Progress", "Motivation", "General"];

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

// V9 (QA 9.0): "Make a new button, under professionals in more called forum
// that acts like a hub for all clients to share information publicly...
// take inspiration for other fitness forums" — a flat, categorized post
// feed with likes and a comment thread per post, the same core shape as
// r/Fitness or a MyFitnessPal community board.
export default function ForumTab() {
  const { forumPosts, addForumPost, toggleForumLike, addForumComment } = useApp();
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
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-wide rounded-full px-2.5 py-1 mb-2.5"
            style={{ color: categoryColor[post.category], background: `${categoryColor[post.category]}20` }}
          >
            {post.category}
          </span>
          <p className="font-display text-lg font-semibold text-charcoal mb-1.5">{post.title}</p>
          <p className="text-sm text-charcoal-soft leading-relaxed mb-3">{post.body}</p>
          <div className="flex items-center gap-3 text-xs text-charcoal-faint">
            <span>{post.authorName}</span>
            <span>·</span>
            <span>{timeAgo(post.at)}</span>
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-charcoal/[0.06]">
            <button
              onClick={() => toggleForumLike(post.id)}
              className={clsx("tap flex items-center gap-1.5 text-xs font-semibold", post.likedByMe ? "text-teal-dark" : "text-charcoal-faint")}
            >
              <Heart size={15} className={post.likedByMe ? "fill-teal-dark" : ""} /> {post.likes}
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
      <PageHeader
        title="Forum"
        subtitle="Share & learn from other Centium clients"
        showBack
        right={
          <button
            onClick={() => setComposeOpen(true)}
            className="tap w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-soft"
            aria-label="New post"
          >
            <Plus size={18} />
          </button>
        }
      />

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

      <div className="space-y-2.5">
        {visiblePosts.map((post) => (
          <Card key={post.id} interactive onClick={() => setActivePost(post)} className="animate-fade-slide-up">
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-wide rounded-full px-2.5 py-1 mb-2"
              style={{ color: categoryColor[post.category], background: `${categoryColor[post.category]}20` }}
            >
              {post.category}
            </span>
            <p className="text-sm font-semibold text-charcoal mb-1">{post.title}</p>
            <p className="text-xs text-charcoal-soft leading-relaxed line-clamp-2 mb-2.5">{post.body}</p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-charcoal-faint">
                {post.authorName} · {timeAgo(post.at)}
              </span>
              <div className="flex items-center gap-3">
                <span className={clsx("flex items-center gap-1 text-xs font-semibold", post.likedByMe ? "text-teal-dark" : "text-charcoal-faint")}>
                  <Heart size={13} className={post.likedByMe ? "fill-teal-dark" : ""} /> {post.likes}
                </span>
                <span className="flex items-center gap-1 text-xs text-charcoal-faint">
                  <MessageCircle size={13} /> {post.comments.length}
                </span>
              </div>
            </div>
          </Card>
        ))}
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
    </div>
  );
}
