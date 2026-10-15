import { useMemo, useState } from "react";
import { ChevronRight, Star, UserRound } from "lucide-react";
import { clock12 } from "../../../utils/time12";
import { Accordion, Avatar, HeadCard, PageHeader, QuestionCard, Sk, Strip } from "./parts";
import { distOf, metaOf, ratedPeople, ratingsLead, shortAge } from "./ratingsModel";
import { RatingGraphic, ReviewsSheet } from "./RatingsParts";
import type { RatingsState } from "./useRatings";
import type { TeamState } from "./useTeam";

// AN5-040 Ratings (AnTeamV6 view="ratings", build("ratings") l.457-468) on
// B14 instructor_ratings + business_reviews_page (V6-85): header card, the
// rating graphic, instructor rows (highest first, New last), the Latest
// reviews accordion with "See all {n}" (AN5-055), the foot. Single
// instructor: AN5-043 (note, "Average", "{name} is rated …"). Empty and
// under-3 states: OURS-AN5-ratings-empty R1-R3. Rows open each scorecard on
// its Ratings box (S1).

export function RatingsView({
  state,
  ratings,
  onBack,
  onCard,
}: {
  state: TeamState;
  ratings: RatingsState;
  onBack: () => void;
  onCard: (id: string) => void;
}) {
  const [teamSheet, setTeamSheet] = useState(false);
  const people = useMemo(() => (state.team?.people ?? []).filter((p) => p.acceptedAt), [state.team]);
  const rows = useMemo(() => ratedPeople(people, ratings.all, ratings.last3, ratings.prev3), [people, ratings.all, ratings.last3, ratings.prev3]);
  const single = people.length === 1;
  // AN5-043 rows 2-3: with one instructor the header is that instructor's own average and count.
  const t = useMemo(() => {
    if (!single || !rows[0]) return ratings.team;
    const r = rows[0];
    const n = ratings.inRange.find((x) => x.professionalId === r.id)?.reviews ?? 0;
    return { count: r.reviews, avg: r.avg, delta: null, newInRange: n };
  }, [single, rows, ratings.team, ratings.inRange]);
  const loading = ratings.status === "loading" && !ratings.updatedAt;
  const dist = ratings.reviews ? distOf(single && rows[0] ? (ratings.byPerson.get(rows[0].id) ?? []) : ratings.reviews, t.count) : null;
  const reviews = ratings.reviews ?? [];
  const nameOf = (instructor: string | null) => instructor ?? "";

  const strip =
    ratings.status === "offline" ? (
      <Strip offline text={`You're offline. Showing reviews as of ${ratings.updatedAt ? clock12(new Date(ratings.updatedAt)) : "the last update"}.`} />
    ) : ratings.status === "error" ? (
      <Strip text="Couldn't load ratings. Check your connection and try again." onRetry={ratings.reload} />
    ) : ratings.status === "denied" ? (
      <Strip text="Ratings need the Marketing or Edit the schedule permission." />
    ) : null;

  return (
    <div>
      <PageHeader crumb="Team" title="Ratings" backLabel="Back to Team" onBack={onBack} />
      {strip}
      {single && t.count > 0 && <p className="an5-note">One instructor: there is no team average to compare with yet.</p>}
      {loading ? (
        <RatingsSkeleton />
      ) : (
        <>
          <HeadCard
            cells={[
              {
                v: t.avg === null ? "–" : t.avg.toFixed(1),
                l: single ? "Average" : "Team average",
                dash: t.avg === null,
                d: t.delta !== null && t.delta !== 0 ? `${t.delta > 0 ? "+" : "−"}${Math.abs(t.delta).toFixed(1)}` : undefined,
                dTone: t.delta !== null && t.delta > 0 ? "good" : "faint",
              },
              { v: String(t.count), l: "Reviews", d: t.newInRange > 0 && t.count > 0 ? `+${t.newInRange}` : undefined, dTone: "good" },
            ]}
            lead={ratingsLead(t, rows)}
          />
          <QuestionCard
            q="How do members rate each instructor?"
            cap="Average of members' reviews, on a 1 to 5 scale. Tap an instructor to see their reviews."
            after={
              t.count > 0 && reviews.length > 0 ? (
                <Accordion title="Latest reviews" summary="3 newest across the team.">
                  {reviews.slice(0, 3).map((r) => (
                    <div key={r.id} className="an5-pp">
                      <span className="an5-pp-av" aria-hidden>
                        <UserRound size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="an5-pp-name block">{r.label}</span>
                        <span className="an5-pp-fact block">
                          {r.redacted ? "Removed by a moderator" : `★ ${r.rating} · ${nameOf(r.instructor)} · "${r.body ?? ""}"`}
                        </span>
                      </span>
                      <span className="an5-pp-r">{shortAge(r.createdAt)}</span>
                    </div>
                  ))}
                  <button type="button" className="an5-more an5-pp-more tap" onClick={() => setTeamSheet(true)}>
                    See all {t.count}
                    <ChevronRight size={14} aria-hidden />
                  </button>
                </Accordion>
              ) : undefined
            }
          >
            {t.count === 0 ? (
              <div className="an5-emptyblock">
                <span className="an5-emptyblock-tile">
                  <Star size={20} aria-hidden />
                </span>
                <p className="an5-emptyblock-t">No reviews yet</p>
                <p className="an5-emptyblock-s">Ratings appear here once members review your instructors.</p>
              </div>
            ) : t.avg === null ? (
              <div className="an5-emptyblock">
                <span className="an5-emptyblock-tile">
                  <Star size={20} aria-hidden />
                </span>
                <p className="an5-emptyblock-t">Not enough reviews yet</p>
                <p className="an5-emptyblock-s">{t.count} so far. The average shows after 3.</p>
              </div>
            ) : (
              <RatingGraphic
                size="lg"
                avg={t.avg}
                count={t.count}
                countText={`${t.count} ${t.count === 1 ? "review" : "reviews"}${t.newInRange > 0 ? ` · +${t.newInRange} this period` : ""}`}
                dist={dist}
              />
            )}
            {rows.length > 0 && <div className="an5-divider" />}
            <div>
              {rows.map((p) => (
                <button key={p.id} type="button" className="an5-barrow tap" aria-label={`Open ${p.name}'s ratings`} onClick={() => onCard(p.id)}>
                  <Avatar name={p.name} seat={p.seat} />
                  <span className="min-w-0 block">
                    <span className="an5-barrow-head">
                      <span className="an5-name">{p.name}</span>
                      {p.avg === null ? (
                        <span className="an5-new">New</span>
                      ) : (
                        <span className="an5-rate-val">
                          <span className="an5-rate-cnt">
                            {p.reviews} {p.reviews === 1 ? "review" : "reviews"}
                          </span>
                          <span className="an5-rate-star">
                            <Star size={20} fill="currentColor" stroke="none" aria-hidden />
                          </span>
                          <span className="an5-rate-v">{p.avg.toFixed(1)}</span>
                        </span>
                      )}
                    </span>
                    <span className="an5-meta block">{metaOf(p.reviews, p.trend)}</span>
                  </span>
                </button>
              ))}
            </div>
          </QuestionCard>
        </>
      )}
      <p className="an5-foot">Instructors show as New until they have 3 reviews.</p>
      <ReviewsSheet
        open={teamSheet}
        onClose={() => setTeamSheet(false)}
        title="All team reviews"
        lead="Every instructor · all time"
        list={reviews}
        count={t.count}
        avg={t.avg}
        team
        businessName={state.businessName || "Your business"}
        emptyText="Reviews appear here after members rate your instructors."
      />
    </div>
  );
}

/** AN5-040 O4: header card skeleton + graphic skeleton (60×46 block, five 18 star outlines, five 7-tall tracks). */
function RatingsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="an5-card an5-head">
        <div className="an5-head-grid">
          <div className="an5-head-cell">
            <Sk w={40} h={24} style={{ margin: "0 auto" }} />
          </div>
          <span className="an5-head-sep" aria-hidden />
          <div className="an5-head-cell">
            <Sk w={40} h={24} style={{ margin: "0 auto" }} />
          </div>
        </div>
        <Sk w="80%" h={12} style={{ marginTop: 14 }} />
      </div>
      <div className="an5-card">
        <div className="an5-q-in">
          <div className="an5-ratg">
            <div className="flex flex-col items-start" style={{ gap: 4 }}>
              <Sk w={60} h={46} />
              <span className="flex" style={{ gap: 2 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={18} fill="none" stroke="var(--an-track)" aria-hidden />
                ))}
              </span>
            </div>
            <div className="an5-dist">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="an5-dist-track" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
