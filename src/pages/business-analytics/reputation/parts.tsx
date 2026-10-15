import React from "react";
import {
  MoreHorizontal,
  Reply,
  ShieldAlert,
  Star,
  UserRound,
} from "lucide-react";
import type { BizReply, BizReview } from "../../../services/reputation";
import { ago } from "./reputationModel";

// AN13 parts shared by the Metrics and Reviews views and the sheets.

/** Fractional stars (AN13-001 row 7b; list rows 12, gap 1): track + clipped fill. */
export const Stars: React.FC<{
  value: number;
  size: number;
  gap?: number;
  className?: string;
}> = ({ value, size, gap = 3, className }) => (
  <span className={"rp-stars " + (className ?? "")} style={{ gap }} aria-hidden>
    {[0, 1, 2, 3, 4].map((i) => {
      const w = Math.max(0, Math.min(1, value - i)) * 100;
      return (
        <span key={i} className="rp-star" style={{ width: size, height: size }}>
          <span className="rp-star-track">
            <Star size={size} fill="currentColor" strokeWidth={0} />
          </span>
          <span className="rp-star-fill" style={{ width: `${w}%` }}>
            <Star size={size} fill="currentColor" strokeWidth={0} />
          </span>
        </span>
      );
    })}
  </span>
);

/**
 * The handover's injury wording, verbatim (KEEP-SAFETY, SW-36). B14 flags a
 * review without saying why (no injury / harassment reason), so nothing on
 * the page can pick these yet; the composer shows them the moment a reason
 * exists (ReviewComposer `injury`). Never reworded.
 */
export const INJURY_LINE =
  "Mentions an injury. Read it yourself; Centium never answers these automatically.";
export const INJURY_MESSAGE_NOTE =
  "This review mentions an injury. Centium never answers these automatically. Contact the member privately first, then reply publicly if you choose.";
export const INJURY_REPLY_NOTE =
  "This review mentions an injury. Your reply is public, so keep it short and offer to talk privately.";

/** AN13-011 row 4d. A reply Centium removed keeps its place (it can't be edited, deleted or replaced). */
export const ReplyBlock: React.FC<{ reply: BizReply }> = ({ reply }) => (
  <div className="rp-reply">
    <p className="rp-reply-h">
      Your reply · {ago(reply.at).replace("Today", "today")}
    </p>
    {reply.redacted ? (
      <p className="rp-reply-t" style={{ fontStyle: "italic" }}>
        Centium removed this reply.
      </p>
    ) : (
      <p className="rp-reply-t">{reply.body}</p>
    )}
  </div>
);

/** AN13-011 row 4b: one review row. The reviewer is always "Member #…" (Q-35). */
export const ReviewRow: React.FC<{
  review: BizReview;
  tag?: string | null;
  action?: { label: string; onClick: () => void } | null;
  menu?: (anchor: HTMLElement) => void;
  top?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ review, tag, action, menu, top, children }) => {
  if (review.redacted)
    return (
      <div className="rp-row">
        <p className="rp-removed">This review was removed by Centium.</p>
      </div>
    );
  const who = review.label;
  const rating = review.rating ?? 0;
  return (
    <div
      className="rp-row"
      aria-label={`${who}, ${rating} of 5 stars, ${ago(review.createdAt)}`}
      role="group"
    >
      {top}
      <div className="rp-row-top">
        <span className="rp-av is-masked" aria-hidden>
          <UserRound size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="rp-who">{who}</p>
          <p className="rp-meta">
            <Stars value={rating} size={12} gap={1} />
            <span className="rp-when">{ago(review.createdAt)}</span>
          </p>
        </div>
        {action && (
          <button
            type="button"
            className="rp-pill tap"
            onClick={action.onClick}
            aria-label={`${action.label} to ${who}`}
          >
            <Reply size={13} strokeWidth={2.4} aria-hidden />
            {action.label}
          </button>
        )}
        {menu && (
          <button
            type="button"
            className="rp-dots tap"
            aria-label={`More for the review by ${who}`}
            aria-haspopup="menu"
            onClick={(e) => menu(e.currentTarget)}
          >
            <MoreHorizontal size={16} aria-hidden />
          </button>
        )}
      </div>
      {tag && <p className="rp-tag">{tag}</p>}
      <p className="rp-text">{review.body}</p>
      {review.reply && <ReplyBlock reply={review.reply} />}
      {children}
    </div>
  );
};

/** The flag reason line (AN13-011 row 4a style). */
export const FlagLine: React.FC<{ text: string; place: "top" | "row" }> = ({
  text,
  place,
}) => (
  <p className={"rp-flag-line " + (place === "top" ? "is-top" : "is-row")}>
    <ShieldAlert size={15} aria-hidden />
    {text}
  </p>
);
