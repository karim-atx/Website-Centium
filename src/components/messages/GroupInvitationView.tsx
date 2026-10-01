import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { acceptInvitation, declineInvitation, type GroupInvitation } from "../../services/messaging/groups";

/**
 * A group invitation (phase 2B, screen 4), as the invitee sees it: what the
 * group is, who asked, and what joining means — then Decline or Join group.
 *
 * Before joining the database shows the invitee nothing of the group but this:
 * no messages and no member list. The three promises are the design's words,
 * and each is true of the database: members see first names and messages in
 * the group only (group_members returns a first name and an avatar), never
 * health data, profiles or other chats.
 */
export const GroupInvitationView: React.FC<{
  invitation: GroupInvitation;
  onBack: () => void;
  onJoined: (threadId: string) => void;
  onDeclined: () => void;
}> = ({ invitation, onBack, onJoined, onDeclined }) => {
  const [busy, setBusy] = useState<"join" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const answer = async (join: boolean) => {
    setBusy(join ? "join" : "decline");
    setError(null);
    const r = join ? await acceptInvitation(invitation.threadId) : await declineInvitation(invitation.threadId);
    setBusy(null);
    if (!r.ok) return setError(r.message);
    if (join) onJoined(invitation.threadId);
    else onDeclined();
  };

  const members = invitation.memberCount;
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5 mb-3.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="tap w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-charcoal shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="flex flex-col min-w-0">
          <span className="text-[15px] font-bold text-charcoal truncate">{invitation.groupName}</span>
          <span className="text-xs text-charcoal-soft truncate">
            {invitation.invitedByFirstName} (host) · {members} {members === 1 ? "member" : "members"}
          </span>
        </span>
      </div>

      <section
        aria-label="Group invitation"
        className="rounded-[18px] border border-primary/40 bg-cream-card p-4 flex flex-col gap-2.5"
      >
        <p className="text-xs font-extrabold uppercase tracking-[0.06em] text-primary-deep-text">Invitation</p>
        <h1 className="text-base font-extrabold text-charcoal">
          {invitation.invitedByFirstName} invited you to "{invitation.groupName}"
        </h1>
        <ul className="list-disc pl-[18px] text-[13px] leading-[1.55] text-charcoal-soft">
          <li>Other members will see your first name and messages you send here.</li>
          <li>They won't see your health data, profile or other chats.</li>
          <li>You can leave or report at any time.</li>
        </ul>
        {error && <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3 py-2">{error}</p>}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => void answer(false)}
            disabled={!!busy}
            className="tap h-[46px] rounded-[14px] border border-primary/40 bg-cream-card text-primary-deep-text text-sm font-bold disabled:opacity-50"
          >
            {busy === "decline" ? "Declining…" : "Decline"}
          </button>
          <button
            type="button"
            onClick={() => void answer(true)}
            disabled={!!busy}
            className="tap h-[46px] rounded-[14px] bg-primary text-white dark:text-[#0D0B1A] text-sm font-bold disabled:opacity-50"
          >
            {busy === "join" ? "Joining…" : "Join group"}
          </button>
        </div>
      </section>
    </div>
  );
};
