import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { useApp } from "../../context/AppContext";
import { Plus, FolderPlus, ChevronDown, ChevronUp } from "lucide-react";

export default function JournalTab() {
  const { journalFolders, journalEntries, addJournalEntry, addJournalFolder } = useApp();
  const [activeFolder, setActiveFolder] = useState(journalFolders[0]?.id ?? "");
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const entries = journalEntries
    .filter((e) => e.folderId === activeFolder)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const save = () => {
    if (!text.trim()) return;
    addJournalEntry(activeFolder, text.trim());
    setText("");
    setComposing(false);
  };

  const dateLabel = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
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
            className="flex-1 rounded-xl bg-cream-card border border-charcoal/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
          <button
            onClick={() => {
              if (newFolderName.trim()) addJournalFolder(newFolderName.trim());
              setNewFolderName("");
              setNewFolderOpen(false);
            }}
            className="tap px-3 rounded-xl bg-sohati text-white text-sm font-semibold"
          >
            Add
          </button>
        </div>
      )}

      {composing ? (
        <Card className="mb-4">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="شو صار معك اليوم؟ How was your day?"
            rows={5}
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/15 resize-none mb-3"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setComposing(false)}>
              Cancel
            </Button>
            <Button fullWidth onClick={save} disabled={!text.trim()}>
              Save entry
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
          const expanded = expandedId === e.id;
          return (
            <Card
              key={e.id}
              interactive
              onClick={() => setExpandedId(expanded ? null : e.id)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-charcoal-faint">{dateLabel(e.date)}</span>
                {expanded ? <ChevronUp size={14} className="text-charcoal-faint" /> : <ChevronDown size={14} className="text-charcoal-faint" />}
              </div>
              <p className={expanded ? "text-sm text-charcoal whitespace-pre-wrap" : "text-sm text-charcoal truncate"}>
                {e.text}
              </p>
            </Card>
          );
        })}
        {entries.length === 0 && (
          <p className="text-center text-sm text-charcoal-faint py-8">No entries in this folder yet.</p>
        )}
      </div>
    </div>
  );
}
