import { FileText } from "lucide-react";
import type { SearchHit } from "../../services/messaging/chatFeatures";
import { snippetFor } from "../../services/messaging/searchSnippet";
import { dayAndTime, listTime } from "./chatTime";

/**
 * Message search results (phase 2A). One row per matching message: who and
 * when, then the words around the match with the match marked. A hit in a
 * document's file name says so rather than marking words the message does not
 * contain.
 *
 * The design shows the search box but not its results; these rows follow the
 * chat list's own type sizes and spacing.
 */
export const SearchResults: React.FC<{
  hits: SearchHit[];
  query: string;
  /** The line above each hit: the chat's name, or "You" / their name in one chat. */
  titleFor: (hit: SearchHit) => string;
  onOpen: (hit: SearchHit) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
  /**
   * MO1.2.1.3.2 (search in one chat): the results in a card. Each row's title
   * is 12.5/700, in the deep primary ink for the other person (`isOther`);
   * the time is 11/400 faint "Today · 08:14"; the words run to two lines.
   */
  card?: boolean;
  isOther?: (hit: SearchHit) => boolean;
}> = ({ hits, query, titleFor, onOpen, hasMore, loadingMore, onMore, card, isOther }) => (
  // Card mode (measured on MO1.2.1.3.2): rows 14 in from the card's edges,
  // dividers running the card's full width, 10 above the title, 4 between the
  // title and the words, 12 under them.
  <div className={card ? "flex flex-col rounded-[18px] bg-cream-card border border-charcoal/[0.08] overflow-hidden" : "flex flex-col"}>
    {hits.map((h) => {
      const s = snippetFor(h.matchedIn === "text" ? h.text ?? "" : h.attachmentName ?? "", query);
      return (
        <button
          key={h.messageId}
          type="button"
          onClick={() => onOpen(h)}
          className={`tap w-full text-left min-h-[56px] border-b border-charcoal/[0.06] flex flex-col ${
            card ? "pt-2.5 pb-3 px-3.5 gap-1 last-of-type:border-b-0" : "py-2.5 px-1 gap-0.5"
          }`}
        >
          <span className="flex items-baseline justify-between gap-2">
            {card ? (
              <>
                <span className={`text-[12.5px] font-bold truncate ${isOther?.(h) ? "text-primary-deep-text" : "text-charcoal"}`}>{titleFor(h)}</span>
                <span className="text-[11px] font-normal text-charcoal-faint shrink-0">{dayAndTime(h.createdAt)}</span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-charcoal truncate">{titleFor(h)}</span>
                <span className="text-xs text-charcoal-soft shrink-0">{listTime(h.createdAt)}</span>
              </>
            )}
          </span>
          <span className={`text-[13px] text-charcoal-soft flex gap-1.5 min-w-0 ${card ? "items-start" : "items-center"}`}>
            {h.matchedIn === "attachment_name" && <FileText size={13} className={`shrink-0 ${card ? "mt-[3px]" : ""}`} aria-label="In a file name" />}
            <span className={card ? "line-clamp-2 break-words" : "truncate"}>
              {s.before}
              {s.match && (
                <mark className="bg-primary-pale text-primary-deep-text font-bold rounded-[3px] px-px">{s.match}</mark>
              )}
              {s.after}
            </span>
          </span>
        </button>
      );
    })}
    {hasMore && (
      <button
        type="button"
        onClick={onMore}
        disabled={loadingMore}
        className="tap min-h-[44px] text-[13px] font-semibold text-primary-deep-text disabled:opacity-50"
      >
        {loadingMore ? "Loading…" : "More results"}
      </button>
    )}
  </div>
);
