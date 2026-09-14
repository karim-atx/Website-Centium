import { Card } from "../ui/Card";
import { PERSON_ICON } from "../../utils/icons";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { useUnread } from "../../context/UnreadContext";
import { UnreadBadge } from "./UnreadBadge";
import type { MessageThread } from "../../services/messaging";

/**
 * The caller's conversations, newest activity first.
 *
 * PARTICIPANT-SYMMETRIC, WHICH IS WHY IT IS SHARED. A thread is two profile
 * ids; nothing about rendering one depends on whether the viewer is the
 * professional or the client. The mock this replaces was keyed by client id
 * with a `from: "professional" | "client"` discriminator, so it could only ever
 * have been the professional's view — and a client messaging a professional
 * had nowhere at all to read the reply.
 */
export const ThreadList: React.FC<{
  threads: MessageThread[];
  onOpen: (thread: MessageThread) => void;
}> = ({ threads, onOpen }) => {
  const unread = useUnread();
  return (
  <div>
    {threads.map((t) => {
      // OFFICIAL IS A BRANCH, NOT A MODIFIER, everywhere below. Every existing
      // thread is "peer", so each place this reads must leave the peer output
      // byte-identical to what it was -- a list the user scans daily is the
      // wrong place to discover a styling regression.
      const official = t.kind === "official_support";
      // Defined once and placed twice rather than written twice: the official
      // row needs it inside a flex row next to the badge, the peer row needs it
      // exactly where it already was, and two copies would drift.
      const name = (
        <p className="text-sm font-semibold text-charcoal truncate">{t.participantName}</p>
      );
      return (
        <Card
          key={t.id}
          interactive
          onClick={() => onOpen(t)}
          className="mb-2.5 animate-fade-slide-up"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                official ? "bg-teal-pale" : "bg-primary-pale"
              }`}
            >
              {t.participantAvatarUrl ? (
                <img src={t.participantAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : official ? (
                <ShieldCheck size={17} className="text-teal-deep-text" />
              ) : (
                <PERSON_ICON size={17} className="text-primary-dark" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              {/* THE BADGE IS THE POINT OF THIS ROW. A teal avatar alone is a
                  colour difference someone has to already know the meaning of;
                  the word says it. min-w-0 on the wrapper and shrink-0 on the
                  badge keep the name ellipsing rather than the label. */}
              {official ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  {name}
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-teal-pale text-charcoal-soft dark:text-teal-deep-text text-[10px] font-semibold px-1.5 py-0.5">
                    <ShieldCheck size={10} />
                    Official
                  </span>
                </div>
              ) : (
                name
              )}
              {/* A thread with no messages says so rather than rendering an
                  empty line, which would read as a message that failed to
                  load. Someone can open a conversation and not write in it.

                  The service decides the wording, and `null` now means the
                  thread is genuinely empty — nothing else. Falling back on a
                  falsy TEXT column, as this did, made an image-only message
                  render as "No messages yet" on a thread with five messages
                  in it. */}
              <p
                className={`text-xs truncate ${
                  // An unread conversation earns weight in the preview too, not
                  // only a number — the badge says how many, the emphasis says
                  // which row to look at when several are stacked.
                  unread.byThread[t.id] ? "text-charcoal font-semibold" : "text-charcoal-faint"
                }`}
              >
                {t.lastMessagePreview ?? "No messages yet"}
              </p>
            </div>
            <UnreadBadge count={unread.byThread[t.id] ?? 0} />
            <ChevronRight size={16} className="text-charcoal-faint shrink-0" />
          </div>
        </Card>
      );
    })}
  </div>
  );
};
