import { FileText } from "lucide-react";
import type { SearchHit } from "../../services/messaging/chatFeatures";
import { snippetFor } from "../../services/messaging/searchSnippet";
import { listTime } from "./chatTime";

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
}> = ({ hits, query, titleFor, onOpen, hasMore, loadingMore, onMore }) => (
  <div className="flex flex-col">
    {hits.map((h) => {
      const s = snippetFor(h.matchedIn === "text" ? h.text ?? "" : h.attachmentName ?? "", query);
      return (
        <button
          key={h.messageId}
          type="button"
          onClick={() => onOpen(h)}
          className="tap w-full text-left min-h-[56px] py-2.5 px-1 border-b border-charcoal/[0.06] flex flex-col gap-0.5"
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold text-charcoal truncate">{titleFor(h)}</span>
            <span className="text-xs text-charcoal-soft shrink-0">{listTime(h.createdAt)}</span>
          </span>
          <span className="text-[13px] text-charcoal-soft flex items-center gap-1.5 min-w-0">
            {h.matchedIn === "attachment_name" && <FileText size={13} className="shrink-0" aria-label="In a file name" />}
            <span className="truncate">
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
