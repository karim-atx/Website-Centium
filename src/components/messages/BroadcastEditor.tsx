import { useEffect, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { ClientPicker, type PickableClient } from "./ClientPicker";
import { Header } from "./NewGroup";
import { listTime } from "./chatTime";
import { GROUP_NAME_MAX } from "../../services/messaging/groups";
import {
  createList,
  deleteList,
  fetchBroadcasts,
  fetchListPeople,
  renameList,
  sendBroadcast,
  setListPeople,
  type Broadcast,
  type BroadcastList,
} from "../../services/messaging/broadcasts";

/**
 * New broadcast / a broadcast list (phase 2B, screen 5), professional only.
 *
 * The list's name is the professional's own label; recipients never see it,
 * the list, or each other. Each client receives an ordinary message in their
 * direct chat with the professional, and replies arrive there.
 *
 * For an existing list the same screen shows what was sent before as
 * "Sent to N" lines (the database records counts, not the text), and offers
 * deleting the list, which does not unsend anything.
 */
export const BroadcastEditor: React.FC<{
  list: BroadcastList | null;
  clients: PickableClient[];
  onBack: () => void;
  /** After a send, delete or rename, so the chat list can re-read. */
  onChanged: () => void;
}> = ({ list, clients, onBack, onChanged }) => {
  const [listId, setListId] = useState<string | null>(list?.id ?? null);
  const [name, setName] = useState(list?.name ?? "");
  const [savedName, setSavedName] = useState(list?.name ?? "");
  const [recipients, setRecipients] = useState<Set<string>>(new Set());
  const [savedRecipients, setSavedRecipients] = useState<string[]>([]);
  const [peopleNames, setPeopleNames] = useState<Record<string, string>>({});
  const [loadingPeople, setLoadingPeople] = useState(!!list);
  const [message, setMessage] = useState("");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Broadcast | null>(null);
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!list) return;
    let cancelled = false;
    void Promise.all([fetchListPeople(list.id), fetchBroadcasts()]).then(([people, all]) => {
      if (cancelled) return;
      const ids = people.map((p) => p.userId);
      setRecipients(new Set(ids));
      setSavedRecipients(ids);
      setPeopleNames(Object.fromEntries(people.map((p) => [p.userId, p.firstName])));
      setHistory(all.filter((b) => b.listId === list.id));
      setLoadingPeople(false);
    });
    return () => {
      cancelled = true;
    };
  }, [list]);

  // Names for chips: the roster's, or the list's own for anybody no longer on the roster.
  const nameOf = (id: string) => clients.find((c) => c.userId === id)?.name ?? peopleNames[id] ?? "Client";
  const firstName = (id: string) => nameOf(id).split(" ")[0];
  const chosen = [...recipients];
  const trimmedName = name.trim();
  const body = message.trim();
  const count = chosen.length;

  const toggle = (id: string) =>
    setRecipients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const send = async () => {
    if (!trimmedName || !body || count === 0 || busy) return;
    setBusy(true);
    setError(null);
    setSent(null);
    let id = listId;
    if (!id) {
      const made = await createList(trimmedName);
      if (!made.ok) {
        setBusy(false);
        return setError(made.message);
      }
      id = made.listId;
      setListId(id);
      setSavedName(trimmedName);
    } else if (trimmedName !== savedName) {
      const renamed = await renameList(id, trimmedName);
      if (!renamed.ok) {
        setBusy(false);
        return setError(renamed.message);
      }
      setSavedName(trimmedName);
    }
    const synced = await setListPeople(id, savedRecipients, chosen);
    if (!synced.ok) {
      setBusy(false);
      return setError(synced.message);
    }
    setSavedRecipients(chosen);
    const result = await sendBroadcast(id, body);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setSent(result.broadcast);
    setHistory((prev) => [result.broadcast, ...prev]);
    setMessage("");
    onChanged();
  };

  const remove = async () => {
    if (!listId) return;
    setBusy(true);
    const r = await deleteList(listId);
    setBusy(false);
    setConfirmDelete(false);
    if (!r.ok) return setError(r.message);
    onChanged();
    onBack();
  };

  const field = "rounded-[14px] border border-charcoal/10 bg-cream-card px-3.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20";
  const label = "text-[12.5px] font-bold text-charcoal-soft";

  return (
    <div className="flex flex-col gap-3.5 pb-6">
      <Header title={list ? savedName || "Broadcast" : "New broadcast"} onBack={onBack} />

      {/* The privacy note, verbatim from the design. */}
      <div
        className="rounded-[14px] bg-[#FBF1DC] dark:bg-gold-pale px-3.5 py-3 text-[13px] leading-[1.5] dark:!text-gold"
        style={{ color: "#5C3F0E" }}
      >
        Each client receives this as a private message from you. Recipients can't see each other, and their
        replies come only to you.
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bname" className={label}>
          List name (only you see this)
        </label>
        <input
          id="bname"
          value={name}
          maxLength={GROUP_NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Weekly tips"
          className={`h-12 ${field}`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className={label}>
            Recipients · {loadingPeople ? "…" : count === 0 ? "none yet" : `${count} ${count === 1 ? "client" : "clients"}`}
          </span>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="tap min-h-[44px] text-[13px] font-bold text-primary-deep-text"
          >
            {count === 0 ? "Choose" : "Edit"}
          </button>
        </div>
        {count > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chosen.slice(0, 4).map((id) => (
              <span key={id} className="text-[12.5px] font-semibold bg-primary-pale text-primary-deep-text rounded-full px-[11px] py-1.5">
                {firstName(id)}
              </span>
            ))}
            {count > 4 && (
              <span className="text-[12.5px] font-semibold bg-cream-soft text-charcoal-soft rounded-full px-[11px] py-1.5">
                + {count - 4} more
              </span>
            )}
          </div>
        )}
        <p className="text-xs text-charcoal-soft">Only your connected clients can be added.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bmsg" className={label}>
          Message
        </label>
        <textarea
          id="bmsg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className={`min-h-[140px] max-h-[220px] py-3 leading-[1.5] resize-none ${field}`}
        />
      </div>

      {error && <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">{error}</p>}
      {sent && (
        <p className="flex items-center gap-2 text-sm text-charcoal bg-status-good-bg rounded-xl px-3.5 py-2.5" role="status">
          <Check size={16} className="text-status-good shrink-0" />
          Sent to {sent.sentCount} {sent.sentCount === 1 ? "client" : "clients"}
          {sent.skippedCount > 0 ? ` · ${sent.skippedCount} couldn't receive it` : ""}
        </p>
      )}

      <button
        type="button"
        onClick={() => void send()}
        disabled={!trimmedName || !body || count === 0 || busy}
        className="tap h-[52px] rounded-2xl bg-primary-fill text-on-primary-fill text-[15px] font-bold disabled:opacity-40"
      >
        {busy ? "Sending…" : `Send to ${count} ${count === 1 ? "client" : "clients"}`}
      </button>

      {history.length > 0 && (
        <section className="flex flex-col gap-1 mt-2" aria-label="Sent before">
          <h2 className="text-xs font-bold uppercase tracking-wide text-charcoal-soft">Sent before</h2>
          {history.map((b) => (
            <div key={b.id} className="flex items-center justify-between min-h-[44px] border-b border-charcoal/[0.06] text-sm">
              <span className="text-charcoal">
                Sent to {b.sentCount} {b.sentCount === 1 ? "client" : "clients"}
                {b.skippedCount > 0 && <span className="text-charcoal-soft"> · {b.skippedCount} skipped</span>}
              </span>
              <span className="text-xs text-charcoal-soft">{listTime(b.sentAt)}</span>
            </div>
          ))}
          <p className="text-xs text-charcoal-soft mt-1">Replies arrive in each client's chat with you.</p>
        </section>
      )}

      {listId && (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="tap self-start flex items-center gap-2 min-h-[44px] text-sm font-semibold text-status-high"
        >
          <Trash2 size={15} /> Delete list
        </button>
      )}

      <BottomSheet open={picking} onClose={() => setPicking(false)} title="Recipients">
        <div className="animate-fade-slide-up">
          <ClientPicker clients={clients} selected={recipients} onToggle={toggle} />
          <button
            type="button"
            onClick={() => setPicking(false)}
            className="tap w-full mt-3 h-12 rounded-xl bg-primary-fill text-on-primary-fill text-sm font-semibold"
          >
            Done · {count} {count === 1 ? "client" : "clients"}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete list">
        <div className="animate-fade-slide-up">
          <p className="text-sm text-charcoal-soft mb-4">
            This deletes the list. Messages already sent stay in each client's chat with you.
          </p>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            className="tap w-full rounded-xl bg-status-high text-white dark:text-[#0D0B1A] font-semibold text-sm py-3 disabled:opacity-50"
          >
            Delete list
          </button>
          <button type="button" onClick={() => setConfirmDelete(false)} className="tap w-full text-sm font-medium text-charcoal-soft py-3">
            Cancel
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};
