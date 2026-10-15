import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CircleCheck, Eye, Pencil, Share2, Star, TrendingDown, Users } from "lucide-react";
import { fetchNetEarnings, formatCents, type NetEarnings } from "../../../services/courses/author";
import type { CourseCategory } from "../../../services/courses";
import { fetchRatingStars, type CourseCard } from "../../../services/pro/courses";
import { useApp } from "../../../context/AppContext";
import { useBack } from "../../../hooks/useBack";
import { textPx } from "../../../theme/textSize";
import { Toast } from "../../ui/Toast";
import { INK } from "../proInk";
import { ComingSoon } from "../ComingSoon";
import { ProError } from "../states";
import { ListCard, RoundBtn } from "../client/kit";
import { Group, NumBox } from "./courseUi";
import { ratingBars, ratingsLine } from "./courseModel";
import { CourseSheet } from "./CourseSheet";
import { ShareCourseSheet } from "./ShareCourseSheet";

type Open = "en" | "co" | "dr" | "ra" | null;

/**
 * Release 3 · W6 MO28 "Course stats" (courseStats18), the page a published
 * (or archived) course opens to:
 * - head19: back 36, eyebrow 10.5 / 600 caps 0.11em ("Course · Published"),
 *   title 19 / 700 -0.03em; Share and Edit round buttons (36, gap 8);
 * - nboxes16: Enrolled (course_stats.enrolled), Finished, Rating
 *   (course_stats average and count);
 * - four groups (grp10), one open at a time: Enrolments, Completion,
 *   Drop-off by lesson, Ratings.
 * Authors have readers for the enrolled total and the ratings only:
 * course_enrolments, course_lesson_progress and course_certificates are
 * readable by the learner alone, so new enrolments by month, completion and
 * drop-off are Coming soon (never sample numbers), and Finished shows "–".
 * Kept from the old builder: what the course has earned after commission
 * (course_net_earnings) and "View it as a learner".
 */
export function CourseStats({ card, categories, onChanged }: { card: CourseCard; categories: CourseCategory[]; onChanged: () => void }) {
  const navigate = useNavigate();
  const back = useBack("/app/forum/courses/mine");
  const { user } = useApp();
  const [open, setOpen] = useState<Open>(null);
  const [stars, setStars] = useState<number[] | null>(null);
  const [starsFailed, setStarsFailed] = useState(false);
  const [earnings, setEarnings] = useState<NetEarnings | null>(null);
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const published = card.status === "published";

  const loadStars = useCallback(async () => {
    const r = await fetchRatingStars(card.id);
    if (!r.ok) setStarsFailed(true);
    else {
      setStarsFailed(false);
      setStars(r.data);
    }
  }, [card.id]);

  useEffect(() => {
    void loadStars();
    void fetchNetEarnings(card.id).then((r) => r.ok && setEarnings(r.value));
  }, [card.id, loadStars]);

  const toggle = (k: Exclude<Open, null>) => setOpen((o) => (o === k ? null : k));
  const bars = ratingBars(stars ?? []);
  const total = stars?.length ?? 0;
  const authorName = user.firstName;

  return (
    <div className="flex flex-col pb-28">
      <div className="flex items-start justify-between" style={{ gap: 12, marginBottom: 13 }}>
        <div className="flex items-start min-w-0" style={{ gap: 10 }}>
          <button type="button" onClick={back} aria-label="Back" className="tap flex items-center justify-center shrink-0 relative before:absolute before:-inset-1 before:content-['']" style={{ width: 36, height: 36, marginLeft: -6, marginTop: 2 }}>
            <ChevronLeft size={18} strokeWidth={2} aria-hidden style={{ color: INK.chS }} />
          </button>
          <div className="min-w-0">
            <p style={{ fontSize: textPx(10.5), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.11em", color: INK.chF, marginBottom: 2 }}>
              Course · {published ? "Published" : "Archived"}
            </p>
            <h1 style={{ fontSize: textPx(19), fontWeight: 700, letterSpacing: "-0.03em", color: INK.ch, overflowWrap: "anywhere" }}>{card.title}</h1>
          </div>
        </div>
        {published && (
          <div className="flex shrink-0" style={{ gap: 8 }}>
            <RoundBtn icon={Share2} label="Share" onClick={() => setSharing(true)} />
            <RoundBtn icon={Pencil} label="Edit" onClick={() => setEditing(true)} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center" style={{ gap: 8, marginBottom: 12 }}>
        <NumBox label="Enrolled" value={String(card.enrolled)} sub="In total" />
        <NumBox label="Finished" value="–" unit="%" sub="Of those enrolled · coming soon" />
        <NumBox label="Rating" value={card.ratings && card.averageRating !== null ? card.averageRating.toFixed(1) : "–"} sub={card.ratings ? `${card.ratings} ${card.ratings === 1 ? "rating" : "ratings"}` : "No ratings yet"} />
      </div>

      <Group icon={Users} title="Enrolments" insight={`${card.enrolled} enrolled`} open={open === "en"} onToggle={() => toggle("en")}>
        <ComingSoon line="New enrolments by month appear here once Centium shares them with authors." />
      </Group>
      <Group icon={CircleCheck} title="Completion" insight="Coming soon" open={open === "co"} onToggle={() => toggle("co")}>
        <ComingSoon line="How many people finish the course appears here once Centium shares lesson progress with authors." />
      </Group>
      <Group icon={TrendingDown} title="Drop-off by lesson" insight="Coming soon" open={open === "dr"} onToggle={() => toggle("dr")}>
        <ComingSoon line="Where people stop appears here once Centium shares lesson progress with authors." />
      </Group>
      <Group icon={Star} title="Ratings" insight={ratingsLine(card.averageRating, card.ratings)} open={open === "ra"} onToggle={() => toggle("ra")}>
        {starsFailed ? (
          <ProError onRetry={() => void loadStars()} />
        ) : total === 0 ? (
          <p style={{ fontSize: textPx(12.5), color: INK.chF, paddingBottom: 10 }}>No ratings yet</p>
        ) : (
          <div style={{ paddingBottom: 8 }}>
            <div className="flex items-center" style={{ gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: textPx(30), fontWeight: 800, color: INK.ch }}>{card.averageRating?.toFixed(1)}</span>
              <span className="inline-flex" style={{ gap: 2 }} aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={13} strokeWidth={1.5} fill={i < Math.round(card.averageRating ?? 0) ? "#D9A441" : "none"} style={{ color: i < Math.round(card.averageRating ?? 0) ? "#D9A441" : "rgba(140,131,120,0.35)" }} />
                ))}
              </span>
              <span style={{ fontSize: textPx(12), color: INK.chF }}>
                {total} {total === 1 ? "rating" : "ratings"}
              </span>
            </div>
            {bars.map((b) => (
              <div key={b.stars} className="grid items-center" style={{ gridTemplateColumns: "16px minmax(0,1fr) 24px", gap: 8, marginTop: 4, fontSize: textPx(11.5), color: INK.chS }} aria-label={`${b.stars} stars: ${b.count}`}>
                <span>{b.stars}</span>
                <span style={{ height: 7, borderRadius: 9999, background: INK.soft, overflow: "hidden" }}>
                  <span className="block h-full" style={{ width: `${total ? Math.round((b.count / total) * 100) : 0}%`, background: "#D9A441" }} />
                </span>
                <span className="text-right">{b.count}</span>
              </div>
            ))}
          </div>
        )}
      </Group>

      {(published || (earnings && earnings.sales > 0)) && (
      <div style={{ marginTop: 6 }}>
        <ListCard
          rows={[
            ...(earnings && earnings.sales > 0
              ? [{ key: "earn", title: "Earned, after commission", meta: `${earnings.sales} ${earnings.sales === 1 ? "sale" : "sales"} so far`, trailing: <b style={{ fontSize: textPx(13), color: INK.ch }}>{formatCents(earnings.netCents)}</b> }]
              : []),
            ...(published ? [{ key: "view", icon: Eye, title: "View it as a learner", onClick: () => navigate(`/app/forum/courses/${card.id}`) }] : []),
          ]}
        />
      </div>
      )}

      {editing && (
        <CourseSheet
          courseId={card.id}
          categories={categories}
          enrolled={card.enrolled}
          authorName={authorName}
          onClose={() => setEditing(false)}
          onChanged={onChanged}
          onSubmitted={() => {
            setEditing(false);
            setToast("Your changes are with Centium for review.");
            onChanged();
          }}
        />
      )}
      {sharing && <ShareCourseSheet course={card} onClose={() => setSharing(false)} onSent={(n) => setToast(`Suggested to ${n} ${n === 1 ? "client" : "clients"}.`)} />}
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
}
