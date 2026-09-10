import { Card } from "../ui/Card";
import { PERSON_ICON } from "../../utils/icons";
import { ChevronRight } from "lucide-react";
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
}> = ({ threads, onOpen }) => (
  <div>
    {threads.map((t) => (
      <Card
        key={t.id}
        interactive
        onClick={() => onOpen(t)}
        className="mb-2.5 animate-fade-slide-up"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center shrink-0 overflow-hidden">
            {t.participantAvatarUrl ? (
              <img src={t.participantAvatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <PERSON_ICON size={17} className="text-primary-dark" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-charcoal truncate">{t.participantName}</p>
            {/* A thread with no messages says so rather than rendering an
                empty line, which would read as a message that failed to
                load. Someone can open a conversation and not write in it.

                The service decides the wording, and `null` now means the
                thread is genuinely empty — nothing else. Falling back on a
                falsy TEXT column, as this did, made an image-only message
                render as "No messages yet" on a thread with five messages
                in it. */}
            <p className="text-xs text-charcoal-faint truncate">
              {t.lastMessagePreview ?? "No messages yet"}
            </p>
          </div>
          <ChevronRight size={16} className="text-charcoal-faint shrink-0" />
        </div>
      </Card>
    ))}
  </div>
);
