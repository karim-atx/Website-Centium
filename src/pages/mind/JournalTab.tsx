import { useRef, useState } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { Plus, FolderPlus, Pencil, Trash2 } from "lucide-react";
import type { JournalEntry } from "../../types";

const SWIPE_THRESHOLD = 50;

export default function JournalTab() {
  const { journalFolders, journalEntries, addJournalEntry, updateJournalEntry, removeJournalEntry, addJournalFolder } =
    useApp();
  const [activeFolder, setActiveFolder] = useState(journalFolders[0]?.id ?? "");
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [openEntry, setOpenEntry] = useState<JournalEntry | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const entries = journalEntries
    .filter((e) => e.folderId === activeFolder)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const resetCompose = () => {
    setTitle("");
    setText("");
    setComposing(false);
    setEditingEntry(null);
  };

  const save = () => {
    if (!title.trim() || !text.trim()) return;
    if (editingEntry) {
      updateJournalEntry(editingEntry.id, { title: title.trim(), text: text.trim() });
    } else {
      addJournalEntry(activeFolder, title.trim(), text.trim());
    }
    resetCompose();
  };

  const startEdit = (e: JournalEntry) => {
    setEditingEntry(e);
    setTitle(e.title);
    setText(e.text);
    setComposing(true);
    setRevealedId(null);
  };

  const dateLabel = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  // Swipe-right on an entry reveals Edit/Delete (threshold-based, same
  // pattern as the Food diary's copy-yesterday gesture) instead of a
  // live-following drag.
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent, entryId: string) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (dx > SWIPE_THRESHOLD && Math.abs(dy) < 40) {
      setRevealedId(entryId);
    }
  };

  return (
    <div className="animate-fade-slide-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {journalFolders.map((f) => (
            <Chip key={f.id} active={activeFolder === f.id} onClick={() => setActiveFolder(f.id)}>
              {f.name}
            </Chip>
          ))}
        </div>
        <button
          onClick={() => setNewFolderOpen((v) => !v)}
          className="tap shrink-0 ml-2 text-charcoal-faint"
        >
          <FolderPlus size={17} />
        </button>
      </div>

      {newFolderOpen && (
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newFolderName.trim()) {
                addJournalFolder(newFolderName.trim());
                setNewFolderName("");
                setNewFolderOpen(false);
              }
            }}
            placeholder="Folder name…"
            className="flex-1 rounded-xl bg-cream-card border border-charcoal/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={() => {
              if (newFolderName.trim()) addJournalFolder(newFolderName.trim());
              setNewFolderName("");
              setNewFolderOpen(false);
            }}
            className="tap px-3 rounded-xl bg-primary text-white text-sm font-semibold"
          >
            Add
          </button>
        </div>
      )}

      {composing ? (
        <Card className="mb-4">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Entry title…"
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm font-semibold text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/15 mb-3"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="شو صار معك اليوم؟ How was your day?"
            rows={5}
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/15 resize-none mb-3"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetCompose}>
              Cancel
            </Button>
            <Button fullWidth onClick={save} disabled={!title.trim() || !text.trim()}>
              {editingEntry ? "Save changes" : "Save entry"}
            </Button>
          </div>
        </Card>
      ) : (
        <Button variant="outline" fullWidth onClick={() => setComposing(true)} className="mb-4">
          <Plus size={15} /> New entry
        </Button>
      )}

      <div className="space-y-2.5">
        {entries.map((e) => {
          const revealed = revealedId === e.id;
          return (
            <div key={e.id} className="relative overflow-hidden rounded-3xl">
              {revealed && (
                <div className="absolute inset-y-0 left-0 flex items-center gap-1.5 pl-3 z-0">
                  <button
                    onClick={() => startEdit(e)}
                    aria-label="Edit entry"
                    className="tap w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      removeJournalEntry(e.id);
                      setRevealedId(null);
                    }}
                    aria-label="Delete entry"
                    className="tap w-9 h-9 rounded-full bg-teal text-white flex items-center justify-center"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
              <Card
                interactive
                onClick={() => (revealed ? setRevealedId(null) : setOpenEntry(e))}
                onTouchStart={onTouchStart}
                onTouchEnd={(ev) => onTouchEnd(ev, e.id)}
                className="relative z-10 transition-transform duration-200"
                style={{ transform: revealed ? "translateX(96px)" : "translateX(0)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-charcoal-faint">{dateLabel(e.date)}</span>
                </div>
                <p className="text-sm font-semibold text-charcoal truncate mt-0.5">{e.title}</p>
              </Card>
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="text-center text-sm text-charcoal-faint py-8">No entries in this folder yet.</p>
        )}
      </div>

      <BottomSheet open={!!openEntry} onClose={() => setOpenEntry(null)} title={openEntry?.title}>
        {openEntry && (
          <div className="animate-fade-slide-up">
            <p className="text-xs font-semibold text-charcoal-faint mb-3">{dateLabel(openEntry.date)}</p>
            <p className="text-sm text-charcoal whitespace-pre-wrap leading-relaxed">{openEntry.text}</p>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
