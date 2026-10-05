import { useState } from "react";
import { ChevronRight, UserX } from "lucide-react";
import { Card } from "../ui/Card";
import { BottomSheet } from "../ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { fetchMyForumBlocks, unblockForumBlock, type ForumBlock } from "../../services/forum";
import { forumAccess } from "../../services/forum/rules";

// Settings > "Blocked in the forum": the people blocked from a forum post,
// each shown by the label that was on the post when they were blocked (a
// nickname or a first name) and nothing else, with Unblock. The app never
// holds who is behind a label; my_forum_blocks returns a reference and the
// label only, and unblock_forum_block takes the reference.
//
// Blocks made in messaging are listed there, not here (they have no forum
// label), though they hide forum posts just the same.

export function ForumBlocksSetting() {
  const { user, authUserId } = useApp();
  const shown = user.accountType !== "business" && forumAccess(user.dateOfBirth) === "adult" && !!authUserId;
  const [open, setOpen] = useState(false);
  const [blocks, setBlocks] = useState<ForumBlock[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (!shown) return null;

  // Read fresh on every opening: a block made from a post a minute ago belongs here.
  const openList = () => {
    setOpen(true);
    setBlocks(null);
    setError(null);
    void fetchMyForumBlocks().then((r) => {
      if (r.ok) setBlocks(r.value);
      else {
        setError(r.message);
        setBlocks([]);
      }
    });
  };

  const unblock = async (ref: string) => {
    setBusy(ref);
    setError(null);
    const r = await unblockForumBlock(ref);
    setBusy(null);
    if (!r.ok) setError(r.message);
    else setBlocks((prev) => (prev ?? []).filter((b) => b.ref !== ref));
  };

  return (
    <>
      <p className="section-label mb-2.5">Community</p>
      <Card padded={false} className="mb-6">
        <button
          type="button"
          onClick={openList}
          className="tap w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-3">
            <UserX size={16} className="text-charcoal-soft" />
            <span className="text-sm font-medium text-charcoal">Blocked in the forum</span>
          </div>
          <ChevronRight size={15} className="text-charcoal-faint shrink-0" />
        </button>
      </Card>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Blocked in the forum">
        <div className="flex flex-col gap-3 pb-4">
          {error && (
            <p role="alert" className="text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}
          {blocks === null ? (
            <p className="text-sm text-charcoal-soft py-4 text-center">Loading…</p>
          ) : blocks.length === 0 ? (
            <p className="text-sm text-charcoal-soft py-4 text-center">You haven't blocked anyone in the forum.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-charcoal/[0.06]">
              {blocks.map((b) => (
                <li key={b.ref} className="flex items-center justify-between gap-3 py-3">
                  <span className="text-sm font-semibold text-charcoal min-w-0 [overflow-wrap:anywhere]">{b.label}</span>
                  <button
                    type="button"
                    onClick={() => void unblock(b.ref)}
                    disabled={busy !== null}
                    className="tap h-9 px-4 rounded-full border border-charcoal/[0.15] text-[13px] font-bold text-charcoal shrink-0 disabled:opacity-60"
                  >
                    {busy === b.ref ? "Unblocking…" : "Unblock"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
