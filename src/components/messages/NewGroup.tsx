import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { ClientPicker, type PickableClient } from "./ClientPicker";
import { createGroup, GROUP_NAME_MAX, inviteToGroup } from "../../services/messaging/groups";

/**
 * New group (phase 2B), professional only: name it, pick connected clients,
 * send invitations. Nobody is added directly — each person sees an invitation
 * and joins only if they choose to.
 *
 * The design shows the client's side of a group (screen 4) and the broadcast
 * form (screen 5) but no "new group" screen, so this uses the broadcast form's
 * fields, type and spacing.
 *
 * Invitations go one person at a time, so somebody the database refuses (under
 * 18, no longer a client) is named and the rest still go.
 */
export const NewGroup: React.FC<{
  clients: PickableClient[];
  onBack: () => void;
  /** Called with the new group's thread id once it exists and invitations went. */
  onCreated: (threadId: string) => void;
}> = ({ clients, onBack, onCreated }) => {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refused, setRefused] = useState<{ name: string; reason: string }[] | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const trimmed = name.trim();
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const create = async () => {
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    const made = await createGroup(trimmed);
    if (!made.ok) {
      setBusy(false);
      setError(made.message);
      return;
    }
    const people = clients.filter((c) => picked.has(c.userId)).map((c) => ({ userId: c.userId, name: c.name }));
    const result = people.length > 0 ? await inviteToGroup(made.threadId, people) : { sent: 0, refused: [] };
    setBusy(false);
    if (result.refused.length > 0) {
      // Show who was not invited before moving on; the group exists either way.
      setRefused(result.refused);
      setCreatedId(made.threadId);
      return;
    }
    onCreated(made.threadId);
  };

  const field = "h-12 rounded-[14px] border border-charcoal/10 bg-cream-card px-3.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20";
  const label = "text-[12.5px] font-bold text-charcoal-soft";

  if (refused && createdId) {
    return (
      <div className="flex flex-col gap-3.5">
        <Header title="Group created" onBack={() => onCreated(createdId)} />
        <p className="text-sm text-charcoal">
          These people weren't invited. Everyone else has an invitation.
        </p>
        <ul className="flex flex-col gap-2">
          {refused.map((r, i) => (
            <li key={i} className="rounded-[14px] bg-cream-card border border-charcoal/10 px-3.5 py-2.5">
              <p className="text-sm font-semibold text-charcoal">{r.name}</p>
              <p className="text-xs text-charcoal-soft">{r.reason}</p>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => onCreated(createdId)}
          className="tap h-[52px] rounded-2xl bg-primary text-white dark:text-[#0D0B1A] text-[15px] font-bold"
        >
          Open the group
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 pb-6">
      <Header title="New group" onBack={onBack} />
      <div className="rounded-[14px] bg-teal-pale px-3.5 py-3 text-[13px] leading-[1.5] text-charcoal-soft dark:text-teal-deep-text">
        Each person you pick gets an invitation and joins only if they accept. Members see each other's first
        names and messages in the group, never health data or other chats.
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="gname" className={label}>
          Group name
        </label>
        <input
          id="gname"
          value={name}
          maxLength={GROUP_NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Spring Strength Group"
          className={field}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={label}>
          Invite · {picked.size} {picked.size === 1 ? "client" : "clients"}
        </span>
        <ClientPicker clients={clients} selected={picked} onToggle={toggle} />
        <p className="text-xs text-charcoal-soft">Only your connected clients can be invited. Accounts under 18 can't join groups.</p>
      </div>
      {error && <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">{error}</p>}
      <button
        type="button"
        onClick={() => void create()}
        disabled={!trimmed || busy}
        className="tap h-[52px] rounded-2xl bg-primary text-white dark:text-[#0D0B1A] text-[15px] font-bold disabled:opacity-40 sticky bottom-[calc(env(safe-area-inset-bottom)+72px)] lg:bottom-4"
      >
        {busy
          ? "Creating…"
          : picked.size > 0
            ? `Create and invite ${picked.size} ${picked.size === 1 ? "client" : "clients"}`
            : "Create group"}
      </button>
    </div>
  );
};

export const Header: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={onBack}
      aria-label="Back"
      className="tap w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-charcoal"
    >
      <ChevronLeft size={20} />
    </button>
    <h1 className="text-[22px] font-extrabold text-charcoal">{title}</h1>
  </div>
);
