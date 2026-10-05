import { useState } from "react";
import { UserPlus } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { PERSON_ICON } from "../../utils/icons";
import { ClientPicker, type PickableClient } from "./ClientPicker";
import {
  closeGroup,
  GROUP_NAME_MAX,
  inviteToGroup,
  leaveGroup,
  removeGroupMember,
  renameGroup,
  type GroupMember,
} from "../../services/messaging/groups";

/**
 * The group part of Chat info (phase 2B): who is in it, and what the host or
 * a member can do.
 *
 * MEMBERS BY FIRST NAME ONLY, which is all group_members() gives. Pending
 * invitations are not listed (the database never shows them), and people who
 * left or were removed are not shown as members.
 *
 * The host adds people (an invitation each), removes them, renames and closes
 * the group. The host cannot leave; a member can, and afterwards keeps what
 * was said while they were in it, read-only.
 */
export const GroupInfoSection: React.FC<{
  threadId: string;
  authUserId: string;
  name: string;
  members: GroupMember[];
  isHost: boolean;
  ended: null | "closed" | "left" | "removed";
  clients: PickableClient[];
  onChanged: () => void;
}> = ({ threadId, authUserId, name, members, isHost, ended, clients, onChanged }) => {
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(name);
  const [confirm, setConfirm] = useState<null | "close" | "leave" | { remove: GroupMember }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const joined = members
    .filter((m) => m.status === "joined")
    .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.firstName.localeCompare(b.firstName)));
  const inGroup = new Set(joined.map((m) => m.userId));
  const open = !ended;

  const run = async (fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) => {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) {
      setError((r as { message: string }).message);
      return false;
    }
    after?.();
    onChanged();
    return true;
  };

  const invite = async () => {
    const people = clients.filter((c) => picked.has(c.userId)).map((c) => ({ userId: c.userId, name: c.name }));
    if (people.length === 0) return;
    setBusy(true);
    setError(null);
    const result = await inviteToGroup(threadId, people);
    setBusy(false);
    setAdding(false);
    setPicked(new Set());
    setNotice(
      [
        result.sent > 0 ? `${result.sent} ${result.sent === 1 ? "invitation" : "invitations"} sent.` : "",
        ...result.refused.map((r) => `${r.name}: ${r.reason}`),
      ]
        .filter(Boolean)
        .join(" ") || "Everyone you picked was already invited."
    );
    onChanged();
  };

  const row = "tap w-full min-h-[52px] text-left text-sm font-semibold border-b border-charcoal/[0.06] last:border-b-0";

  return (
    <>
      <section className="rounded-2xl bg-cream-card border border-charcoal/[0.08] px-3.5 py-2 flex flex-col" aria-label="Members">
        <div className="flex items-center justify-between min-h-[44px]">
          <h2 className="text-sm font-bold text-charcoal">
            {joined.length} {joined.length === 1 ? "member" : "members"}
          </h2>
          {isHost && open && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="tap flex items-center gap-1.5 min-h-[44px] text-[13px] font-bold text-primary-deep-text"
            >
              <UserPlus size={15} /> Add people
            </button>
          )}
        </div>
        {joined.map((m) => (
          <div key={m.userId} className="flex items-center gap-3 min-h-[52px] border-t border-charcoal/[0.06]">
            <span className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center shrink-0 overflow-hidden">
              {m.avatarUrl ? (
                <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <PERSON_ICON size={16} className="text-primary-dark" />
              )}
            </span>
            <span className="flex-1 min-w-0 text-sm font-semibold text-charcoal truncate">
              {m.userId === authUserId ? "You" : m.firstName}
              {m.role === "owner" && <span className="ml-1.5 text-xs font-bold text-primary-deep-text">Host</span>}
            </span>
            {isHost && open && m.role !== "owner" && (
              <button
                type="button"
                onClick={() => setConfirm({ remove: m })}
                className="tap min-h-[44px] px-2 text-[13px] font-semibold text-status-high"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <p className="text-xs text-charcoal-soft py-2">
          Members see each other's first names and messages here, never health data, profiles or other chats.
        </p>
      </section>

      {notice && <p className="text-xs text-charcoal bg-cream-soft rounded-xl px-3.5 py-2.5" role="status">{notice}</p>}
      {error && <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">{error}</p>}

      {open && (
        <section className="rounded-2xl bg-cream-card border border-charcoal/[0.08] px-3.5 py-1 flex flex-col">
          {isHost ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setNewName(name);
                  setRenaming(true);
                }}
                className={`${row} text-charcoal`}
              >
                Rename group
              </button>
              <button type="button" onClick={() => setConfirm("close")} className={`${row} text-status-high`}>
                Close group
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirm("leave")} className={`${row} text-status-high`}>
              Leave group
            </button>
          )}
        </section>
      )}

      <BottomSheet open={adding} onClose={() => setAdding(false)} title="Add people">
        <div className="animate-fade-slide-up">
          <p className="text-xs text-charcoal-soft mb-2">Each person gets an invitation and joins only if they accept.</p>
          <ClientPicker
            clients={clients}
            selected={picked}
            disabled={inGroup}
            disabledLabel="In the group"
            onToggle={(id) =>
              setPicked((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
          />
          <button
            type="button"
            onClick={() => void invite()}
            disabled={busy || picked.size === 0}
            className="tap w-full mt-3 h-12 rounded-xl bg-primary-fill text-on-primary-fill text-sm font-semibold disabled:opacity-40"
          >
            {busy ? "Inviting…" : `Invite ${picked.size} ${picked.size === 1 ? "client" : "clients"}`}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={renaming} onClose={() => setRenaming(false)} title="Rename group">
        <div className="animate-fade-slide-up flex flex-col gap-3">
          <input
            value={newName}
            maxLength={GROUP_NAME_MAX}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="Group name"
            className="h-12 rounded-[14px] border border-charcoal/10 bg-cream-card px-3.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            disabled={busy || !newName.trim() || newName.trim() === name}
            onClick={() => void run(() => renameGroup(threadId, newName.trim()), () => setRenaming(false))}
            className="tap h-12 rounded-xl bg-primary-fill text-on-primary-fill text-sm font-semibold disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === "close" ? "Close group" : confirm === "leave" ? "Leave group" : "Remove member"}
      >
        <div className="animate-fade-slide-up">
          <p className="text-sm text-charcoal-soft mb-4">
            {confirm === "close"
              ? "Nobody will be able to send messages here any more. Members keep what was already said, read-only."
              : confirm === "leave"
                ? "You'll keep what was said while you were here, read-only, and won't see anything new. The host can invite you again."
                : confirm
                  ? `${confirm.remove.firstName} will keep what was said while they were here, read-only, and won't see anything new.`
                  : ""}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const c = confirm;
              if (!c) return;
              void run(
                () =>
                  c === "close"
                    ? closeGroup(threadId)
                    : c === "leave"
                      ? leaveGroup(threadId)
                      : removeGroupMember(threadId, c.remove.userId),
                () => setConfirm(null)
              );
            }}
            className="tap w-full rounded-xl bg-status-high text-white dark:text-[#0D0B1A] font-semibold text-sm py-3 disabled:opacity-50"
          >
            {confirm === "close" ? "Close group" : confirm === "leave" ? "Leave group" : "Remove"}
          </button>
          <button type="button" onClick={() => setConfirm(null)} className="tap w-full text-sm font-medium text-charcoal-soft py-3">
            Cancel
          </button>
        </div>
      </BottomSheet>
    </>
  );
};
