import { Star } from "lucide-react";
import { Avatar, HeadCard, PageHeader, QuestionCard, Strip } from "./parts";
import type { TeamState } from "./useTeam";

// AN5-040 Ratings page in its empty state (OURS-AN5-ratings-empty R1, R2):
// instructor reviews are V6-85's new tagged model, Database stage B14, which
// is not on the local stack. Until it is, there are no reviews to show: the
// header reads "–" / "0", the graphic is the empty block, instructors are
// listed as New with "No reviews yet", the Latest reviews accordion is hidden
// and the foot stays. Rows still open each scorecard (S1).

export function RatingsView({ state, onBack, onCard }: { state: TeamState; onBack: () => void; onCard: (id: string) => void }) {
  const people = (state.team?.people ?? []).filter((p) => p.acceptedAt);
  return (
    <div>
      <PageHeader crumb="Team" title="Ratings" backLabel="Back to Team" onBack={onBack} />
      {state.error && (
        <Strip
          offline={state.error === "offline"}
          text={state.error === "offline" ? "You're offline. Showing reviews as of the last update." : "Couldn't load ratings. Check your connection and try again."}
          onRetry={state.reload}
        />
      )}
      <HeadCard
        cells={[
          { v: "–", l: "Team average", dash: true },
          { v: "0", l: "Reviews" },
        ]}
        lead="No reviews yet. Members can review an instructor after a class."
      />
      <QuestionCard q="How do members rate each instructor?" cap="Average of members' reviews, on a 1 to 5 scale. Tap an instructor to see their reviews.">
        <div className="an5-emptyblock">
          <span className="an5-emptyblock-tile">
            <Star size={20} aria-hidden />
          </span>
          <p className="an5-emptyblock-t">No reviews yet</p>
          <p className="an5-emptyblock-s">Ratings appear here once members review your instructors.</p>
        </div>
        {people.length > 0 && <div className="an5-divider" />}
        <div>
          {people.map((p) => (
            <button key={p.id} type="button" className="an5-barrow tap" aria-label={`Open ${p.name}'s ratings`} onClick={() => onCard(p.id)}>
              <Avatar name={p.name} seat={p.seat} />
              <span className="min-w-0 block">
                <span className="an5-barrow-head">
                  <span className="an5-name">{p.name}</span>
                  <span className="an5-new">New</span>
                </span>
                <span className="an5-meta block">No reviews yet</span>
              </span>
            </button>
          ))}
        </div>
      </QuestionCard>
      <p className="an5-foot">Instructors show as New until they have 3 reviews.</p>
    </div>
  );
}
