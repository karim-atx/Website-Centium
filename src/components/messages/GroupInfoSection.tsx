import { useState } from "react";
import { ChevronRight, Pencil, UserPlus, Users } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { CentredPopup } from "../ui/CentredPopup";
import { CtaButton } from "../ui/PinnedCta";
import { INK } from "../pro/proInk";
import { Avatar } from "../pro/client/kit";
import { GroupDetailsSheet } from "./GroupDetailsSheet";
import { GroupPicker } from "./NewGroup";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";
import { AvatarPlaceholder } from "../icons/PartBIcons";
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
  /**
   * Release 3 MO27 "Group info" for a professional viewer (the group's
   * admin): drawn as gen/r16.js groupInfo16. Unset keeps the client look.
   */
  pro?: boolean;
  /** Round D: the group's description and approved photo, for the owner's edit sheet. */
  description?: string | null;
  photoPath?: string | null;
}> = ({ threadId, authUserId, name, members, isHost, ended, clients, onChanged, pro, description = null, photoPath = null }) => {
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(name);
  const [confirm, setConfirm] = useState<Confirm>(null);
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

  const runConfirm = () => {
    const c = confirm;
    if (!c) return;
    void run(
      () => (c === "close" ? closeGroup(threadId) : c === "leave" ? leaveGroup(threadId) : removeGroupMember(threadId, c.remove.userId)),
      () => setConfirm(null)
    );
  };

  if (pro) {
    return (
      <ProGroupInfo
        threadId={threadId}
        description={description}
        photoPath={photoPath}
        onChanged={onChanged}
        name={name}
        joined={joined}
        authUserId={authUserId}
        isHost={isHost}
        open={open}
        clients={clients}
        inGroup={inGroup}
        busy={busy}
        error={error}
        notice={notice}
        adding={adding}
        setAdding={setAdding}
        picked={picked}
        setPicked={setPicked}
        invite={() => void invite()}
        renaming={renaming}
        startRename={() => setRenaming(true)}
        stopRename={() => setRenaming(false)}
        confirm={confirm}
        setConfirm={setConfirm}
        runConfirm={runConfirm}
      />
    );
  }

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
                // v6 (V6-170, asset map): initials when a name exists, else the placeholder figure.
                m.firstName?.trim() ? (
                  <span className="text-[14px] font-bold text-primary-deep-text">{m.firstName.trim().charAt(0).toUpperCase()}</span>
                ) : (
                  <AvatarPlaceholder size={36} />
                )
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

type Confirm = null | "close" | "leave" | { remove: GroupMember };

/**
 * MO27 Group info for the professional (gen/r16.js groupInfo16), below Chat
 * info's own header, tiles and gallery:
 * - members card (card fill, 1px 8% border, r16, pad 4 14): "{n} members"
 *   14 / 700 and "Add people" 13 / 700 primary.deep with UserPlus 15 / 2 on a
 *   44 row; member rows 52 tall with a 6% top rule, gap 12, the 36 avatar,
 *   the first name 14 / 600, "Admin" 12 / 700 primary.deep 6 after it,
 *   "Remove" 13 / 600 status.high; the note 12 text.soft 1.45, pad 8 0;
 * - "Rename or edit description" (pencil 17 / 1.75 text.soft, 14 / 600,
 *   chevron 15 / 2 text.faint) in its own card (pad 2 14, 10 under). Mute,
 *   Pinned messages and Media and files are Chat info's tiles and gallery
 *   above, not drawn twice;
 * - "End group" (14 / 700 status.high, 52) in its own card, then 11.5
 *   text.faint 1.5, 8 above: the admin can't leave, no calls in groups;
 * - Add people: the bottom sheet with the line (12 text.soft, 8 under), the
 *   picker (people in the group at 55%, "In the group") and the footer CTA
 *   "Invite {n} client(s)";
 * - End group: the popup (users tile, "End {name}?", the body, End group 48
 *   r14 status.high with white / #0D0B1A ink, 14 / 700, and Keep group as
 *   the secondary CTA). Remove uses the same popup (not drawn: own pick).
 * Round D: the rename sheet is GroupDetailsSheet (photo through image
 * approval, name, description).
 */
const ProGroupInfo: React.FC<{
  threadId: string;
  description: string | null;
  photoPath: string | null;
  onChanged: () => void;
  name: string;
  joined: GroupMember[];
  authUserId: string;
  isHost: boolean;
  open: boolean;
  clients: PickableClient[];
  inGroup: Set<string>;
  busy: boolean;
  error: string | null;
  notice: string | null;
  adding: boolean;
  setAdding: (v: boolean) => void;
  picked: Set<string>;
  setPicked: React.Dispatch<React.SetStateAction<Set<string>>>;
  invite: () => void;
  renaming: boolean;
  startRename: () => void;
  stopRename: () => void;
  confirm: Confirm;
  setConfirm: (c: Confirm) => void;
  runConfirm: () => void;
}> = (p) => {
  const dark = useIsDark();
  const admin = p.isHost && p.open;
  const card: React.CSSProperties = { borderRadius: 16, background: INK.card, border: "1px solid rgb(var(--c-charcoal) / 0.08)" };
  const n = p.picked.size;
  const c = p.confirm;
  const first = (s: string) => s.trim().split(/\s+/)[0] ?? s;
  return (
    <>
      <section aria-label="Members" style={{ ...card, padding: "4px 14px" }}>
        <div className="flex items-center justify-between" style={{ minHeight: 44 }}>
          <h2 style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>
            {p.joined.length} {p.joined.length === 1 ? "member" : "members"}
          </h2>
          {admin && (
            <button type="button" onClick={() => p.setAdding(true)} className="tap inline-flex items-center" style={{ gap: 6, minHeight: 44, fontSize: textPx(13), fontWeight: 700, color: INK.prDeep }}>
              <UserPlus size={15} strokeWidth={2} aria-hidden /> Add people
            </button>
          )}
        </div>
        {p.joined.map((m) => (
          <div key={m.userId} className="flex items-center" style={{ gap: 12, minHeight: 52, borderTop: `1px solid ${INK.b06}` }}>
            <Avatar name={m.firstName?.trim() || "?"} url={m.avatarUrl} size={36} />
            <span className="flex-1 min-w-0" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>
              {m.userId === p.authUserId ? "You" : m.firstName}
              {m.role === "owner" && <span style={{ marginLeft: 6, fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>Admin</span>}
            </span>
            {admin && m.role !== "owner" && (
              <button type="button" onClick={() => p.setConfirm({ remove: m })} className="tap shrink-0" style={{ minHeight: 44, paddingLeft: 8, fontSize: textPx(13), fontWeight: 600, color: INK.hi }}>
                Remove
              </button>
            )}
          </div>
        ))}
        <p style={{ fontSize: textPx(12), color: INK.chS, padding: "8px 0", lineHeight: 1.45 }}>Members see each other's first names, photos and messages here, never health data, profiles or other chats.</p>
      </section>

      {p.notice && (
        <p role="status" className="rounded-xl" style={{ fontSize: textPx(12), color: INK.ch, background: INK.soft, padding: "10px 14px" }}>
          {p.notice}
        </p>
      )}
      {p.error && (
        <p role="alert" className="rounded-xl" style={{ fontSize: textPx(12), color: INK.hi, background: INK.hiBg, padding: "10px 14px" }}>
          {p.error}
        </p>
      )}

      {p.open && (
        <div>
          {p.isHost && (
            <section style={{ ...card, padding: "2px 14px", marginBottom: 10 }}>
              <button type="button" onClick={p.startRename} className="tap w-full flex items-center text-left" style={{ gap: 12, minHeight: 52 }}>
                <Pencil size={17} strokeWidth={1.75} aria-hidden style={{ color: INK.chS }} />
                <span className="flex-1" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>
                  Rename or edit description
                </span>
                <ChevronRight size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
              </button>
            </section>
          )}
          <section style={{ ...card, padding: "2px 14px" }}>
            <button type="button" onClick={() => p.setConfirm(p.isHost ? "close" : "leave")} className="tap w-full flex items-center text-left" style={{ minHeight: 52, fontSize: textPx(14), fontWeight: 700, color: INK.hi }}>
              {p.isHost ? "End group" : "Leave group"}
            </button>
          </section>
          {p.isHost && (
            <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5, marginTop: 8 }}>As the admin you can't leave; ending the group closes it for everyone. Calls aren't available in groups.</p>
          )}
        </div>
      )}

      <BottomSheet
        open={p.adding}
        onClose={() => p.setAdding(false)}
        title="Add people"
        footer={<CtaButton className="w-full" size="sheet" label={`Invite ${n} ${n === 1 ? "client" : "clients"}`} disabled={n === 0} loading={p.busy} onClick={p.invite} />}
      >
        <p style={{ fontSize: textPx(12), color: INK.chS, marginBottom: 8 }}>Each person gets an invitation and joins only if they accept.</p>
        <GroupPicker
          clients={p.clients}
          selected={p.picked}
          disabled={p.inGroup}
          onToggle={(id) =>
            p.setPicked((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
        />
      </BottomSheet>

      {p.isHost && (
        <GroupDetailsSheet
          open={p.renaming}
          onClose={p.stopRename}
          threadId={p.threadId}
          authUserId={p.authUserId}
          name={p.name}
          description={p.description}
          photoPath={p.photoPath}
          onChanged={p.onChanged}
        />
      )}

      <CentredPopup
        open={!!c}
        onClose={() => p.setConfirm(null)}
        alert
        icon={<Users size={22} strokeWidth={2} aria-hidden />}
        title={c === "close" ? `End ${p.name}?` : c === "leave" ? "Leave group?" : c ? `Remove ${first(c.remove.firstName)}?` : ""}
        body={
          c === "close"
            ? "Nobody will be able to send messages here any more. Members keep what was already said, read-only."
            : c === "leave"
              ? "You'll keep what was said while you were here, read-only, and won't see anything new. The host can invite you again."
              : c
                ? `${first(c.remove.firstName)} will keep what was said while they were here, read-only, and won't see anything new.`
                : undefined
        }
      >
        <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
          <button
            type="button"
            disabled={p.busy}
            onClick={p.runConfirm}
            className="tap w-full inline-flex items-center justify-center disabled:opacity-40"
            style={{ height: 48, borderRadius: 14, background: INK.hi, color: dark ? "#0D0B1A" : "#FFFFFF", fontSize: textPx(14), fontWeight: 700 }}
          >
            {c === "close" ? "End group" : c === "leave" ? "Leave group" : "Remove"}
          </button>
          <CtaButton size="page" variant="secondary" label={c === "close" ? "Keep group" : "Cancel"} onClick={() => p.setConfirm(null)} disabled={p.busy} />
        </div>
      </CentredPopup>
    </>
  );
};
