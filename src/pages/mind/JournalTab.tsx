import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { SwipeActions } from "../../components/ui/SwipeActions";
import { PinnedCta, CtaButton } from "../../components/ui/PinnedCta";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  Folder,
  FolderCog,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { JournalEntry } from "../../types";

type FolderOption = "rename" | "move" | "delete";

const dateLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

// The Journal tab, mobile v5.1 MO1.1.2 (list), MO1.1.2.1 (folder options) and
// MO1.1.2.3 (new entry). MO1.1.2.2, the Face ID locked folder, is native-only
// and not built; so the folder menu has no Lock.
//
// LIGHT MODE KEEPS THE COLOURS OF WHAT EACH PART REPLACED (decision 15): the
// folder tabs take the old folder chips' colours, the Edit tile the old round
// button's, and the pinned New entry the old outline button's. Delete is the
// shared destructive red in both modes. Dark mode is the v5.1 dark set
// throughout.
//
// FOLDERS AND ENTRIES ARE SERVER ROWS NOW (journal_folders +
// journal_entries), which changes two things on this screen. The folder list
// arrives asynchronously, so the selected folder cannot be chosen at mount;
// and there are no longer four folders seeded into every account, so an
// account that has never journalled has none and is asked to make the first.
export default function JournalTab() {
  const {
    today,
    journalFolders,
    journalEntries,
    journalLoading,
    journalError,
    addJournalEntry,
    updateJournalEntry,
    removeJournalEntry,
    addJournalFolder,
    renameJournalFolder,
    moveJournalFolder,
    removeJournalFolder,
  } = useApp();
  const dark = useIsDark();
  const [activeFolder, setActiveFolder] = useState("");
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [composeFolder, setComposeFolder] = useState("");
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [openEntry, setOpenEntry] = useState<JournalEntry | null>(null);
  // One inline name field, for a new folder or renaming the active one.
  const [naming, setNaming] = useState<"new" | "rename" | null>(null);
  const [folderName, setFolderName] = useState("");
  const [menu, setMenu] = useState<"options" | "move" | "picker" | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  // Menu anchors, held as state (not refs) since the menus read them in render.
  const [cogEl, setCogEl] = useState<HTMLButtonElement | null>(null);
  const [pickerEl, setPickerEl] = useState<HTMLButtonElement | null>(null);

  // THE SELECTION FOLLOWS THE LIST. Folders load after the first render, and
  // a folder can be deleted from another device — either way, a selection
  // pointing at nothing falls back to the first real folder rather than
  // showing an empty list that looks like an empty folder.
  const selected = journalFolders.some((f) => f.id === activeFolder)
    ? activeFolder
    : journalFolders[0]?.id ?? "";
  const selectedIndex = journalFolders.findIndex((f) => f.id === selected);
  const selectedFolder = journalFolders[selectedIndex];

  const entries = journalEntries
    .filter((e) => e.folderId === selected)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const resetCompose = () => {
    setTitle("");
    setText("");
    setComposing(false);
    setEditingEntry(null);
    if (menu === "picker") setMenu(null);
  };

  const startNew = () => {
    setComposeFolder(selected);
    setComposing(true);
  };

  const save = () => {
    if (!title.trim() || !text.trim()) return;
    // The picker's folder, unless it has since been deleted elsewhere.
    const folderId = journalFolders.some((f) => f.id === composeFolder) ? composeFolder : selected;
    if (editingEntry) {
      updateJournalEntry(editingEntry.id, { title: title.trim(), text: text.trim(), folderId });
    } else {
      addJournalEntry(folderId, title.trim(), text.trim());
    }
    resetCompose();
  };

  const startEdit = (e: JournalEntry) => {
    setEditingEntry(e);
    setTitle(e.title);
    setText(e.text);
    setComposeFolder(e.folderId);
    setComposing(true);
  };

  const submitName = () => {
    const name = folderName.trim();
    if (name) {
      if (naming === "rename" && selectedFolder) renameJournalFolder(selectedFolder.id, name);
      else addJournalFolder(name);
    }
    setFolderName("");
    setNaming(null);
  };

  const onFolderOption = (opt: FolderOption) => {
    if (opt === "rename" && selectedFolder) {
      setFolderName(selectedFolder.name);
      setNaming("rename");
    } else if (opt === "move") {
      // The menu closes on pick; the Move choices open from the same button.
      setTimeout(() => setMenu("move"), 0);
    } else if (opt === "delete") {
      setDeletingFolder(true);
    }
  };

  if (journalLoading) {
    return (
      <div className="animate-fade-slide-up">
        <Card className="text-center py-8">
          <p className="text-sm text-charcoal-faint">Loading…</p>
        </Card>
      </div>
    );
  }

  const composeFolderName = journalFolders.find((f) => f.id === composeFolder)?.name ?? selectedFolder?.name ?? "";
  const fieldLabel = "block text-[12px] font-semibold text-charcoal-faint mb-2";
  const field = "w-full h-11 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 text-sm text-charcoal";

  return (
    <div className="animate-fade-slide-up">
      {/* A FAILED READ OR WRITE SAYS SO. An empty journal and an unreachable
          one look identical once rendered, and only one of them is true. */}
      {journalError && (
        <p className="mb-3 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {journalError}
        </p>
      )}

      {/* NO FOLDERS IS A REAL STARTING STATE NOW. Four were seeded into every
          account before — Personal, Training, Nutrition, General — as though
          somebody had made them. An entry needs a folder to live in, so this
          asks for the first one rather than inventing it. */}
      {journalFolders.length === 0 && !journalError && (
        <Card className="text-center py-7 mb-4">
          <p className="text-sm font-semibold text-charcoal mb-1">No folders yet</p>
          <p className="text-[12.5px] text-charcoal-soft leading-relaxed px-4 mb-4">
            Entries live in folders. Make the first one to start writing.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["Personal", "Training", "Nutrition"].map((name) => (
              <button
                key={name}
                onClick={() => addJournalFolder(name)}
                className="tap flex items-center gap-1.5 rounded-full bg-cream-soft px-3 py-1.5 text-[12px] font-semibold text-charcoal-soft"
              >
                {name}
                <Plus size={12} className="text-charcoal-faint" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* MO1.1.2 #2: the folders as a segmented card (358 × 56), scrolling
          sideways once they outgrow it. Light colours are the old chips'. */}
      {journalFolders.length > 0 && (
        <SegmentedTabs
          scroll
          items={journalFolders.map((f) => ({ key: f.id, label: f.name }))}
          activeKey={selected}
          onChange={setActiveFolder}
          light={{
            activeFill: "rgb(var(--c-primary-fill))",
            activeInk: "rgb(var(--c-on-primary-fill))",
            idleFill: "rgb(var(--c-cream-card))",
            idleInk: "rgb(var(--c-charcoal-soft))",
          }}
        />
      )}

      {/* MO1.1.2 #3: FolderPlus 18, right-aligned on its own 22 pt row. */}
      <div className="flex justify-end mt-[15px] mb-2.5">
        <button
          onClick={() => {
            setFolderName("");
            setNaming((v) => (v === "new" ? null : "new"));
          }}
          aria-label="New folder"
          className="tap h-[22px] flex items-center text-charcoal-faint"
        >
          <FolderPlus size={18} />
        </button>
      </div>

      {naming && (
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && folderName.trim()) submitName();
              if (e.key === "Escape") setNaming(null);
            }}
            placeholder="Folder name…"
            aria-label={naming === "rename" ? "Rename folder" : "New folder name"}
            className="flex-1 rounded-xl bg-cream-card border border-charcoal/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={submitName}
            className="tap px-3 rounded-xl bg-primary-fill text-on-primary-fill text-sm font-semibold"
          >
            {naming === "rename" ? "Save" : "Add"}
          </button>
        </div>
      )}

      {/* MO1.1.2 #4–8: entry cards, 358 × 94, radius 24, 10 apart. Swipe left
          for Edit and Delete (as in Habits); a mouse can drag them open too. */}
      <div className="space-y-2.5">
        {entries.map((e) => (
          <SwipeActions
            key={e.id}
            radius={24}
            actions={[
              {
                key: "edit",
                label: "Edit",
                icon: <Pencil size={16} />,
                onClick: () => startEdit(e),
                light: { fill: "rgb(var(--c-primary-fill))", ink: "rgb(var(--c-on-primary-fill))" },
              },
              {
                key: "delete",
                label: "Delete",
                icon: <Trash2 size={16} />,
                onClick: () => removeJournalEntry(e.id),
                // Red in light and dark, as on every swipe row: Delete
                // destroys data (the user's call, over keeping the old teal).
                destructive: true,
              },
            ]}
          >
            <Card interactive onClick={() => setOpenEntry(e)} className="px-5 py-[19px]">
              <p className="text-xs leading-4 font-semibold text-charcoal-faint">{dateLabel(e.date)}</p>
              <div
                aria-hidden
                className="mt-[9px] h-px"
                style={{ background: dark ? "var(--border-row)" : "rgb(var(--th-aea1dc) / 0.5)" }}
              />
              <p className="mt-2 text-sm leading-5 font-semibold text-charcoal truncate">{e.title}</p>
            </Card>
          </SwipeActions>
        ))}
        {selected !== "" && entries.length === 0 && (
          <p className="text-center text-sm text-charcoal-faint py-8">No entries in this folder yet.</p>
        )}
      </div>

      {/* NOT OFFERED WITHOUT A FOLDER TO SAVE INTO. folder_id is NOT NULL, so
          composing before the first folder exists could only end in a foreign
          key error after the user had written something. */}
      {selected !== "" && (
        <>
          {/* The page's own padding covers 112 of the 172 a pinned CTA needs. */}
          <div aria-hidden style={{ height: 60 }} />
          <PinnedCta
            primary={{
              label: "New entry",
              icon: <Plus size={15} />,
              // Light mode keeps the outline New entry button this replaced;
              // dark mode is the filled primary.
              className:
                "!text-[13.5px] !bg-cream-card !text-charcoal border !border-charcoal/[0.11] dark:!bg-primary-fill dark:!text-on-primary-fill dark:!border-transparent",
              onClick: startNew,
            }}
            trailing={{
              icon: <FolderCog size={18} strokeWidth={1.75} />,
              label: "Folder options",
              onClick: () => setMenu("options"),
              onAnchor: setCogEl,
            }}
          />
        </>
      )}

      {/* MO1.1.2.1: options for the active folder. Lock (Face ID) is native-only. */}
      <PopupMenu<FolderOption>
        open={menu === "options"}
        onClose={() => setMenu((m) => (m === "options" ? null : m))}
        anchor={cogEl}
        options={[
          { value: "rename", label: "Rename", icon: <Pencil size={15} strokeWidth={1.75} /> },
          { value: "move", label: "Move", icon: <ArrowUpDown size={15} strokeWidth={1.75} />, disabled: journalFolders.length < 2 },
          { value: "delete", label: "Delete", icon: <Trash2 size={15} strokeWidth={1.75} />, destructive: true },
        ]}
        onSelect={onFolderOption}
      />
      {/* "Move reorders the tabs": one place left or right per tap. */}
      <PopupMenu<"left" | "right">
        open={menu === "move"}
        onClose={() => setMenu((m) => (m === "move" ? null : m))}
        anchor={cogEl}
        heading="Move"
        options={[
          { value: "left", label: "Move left", icon: <ArrowLeft size={15} strokeWidth={1.75} />, disabled: selectedIndex <= 0 },
          { value: "right", label: "Move right", icon: <ArrowRight size={15} strokeWidth={1.75} />, disabled: selectedIndex >= journalFolders.length - 1 },
        ]}
        onSelect={(v) => selectedFolder && moveJournalFolder(selectedFolder.id, v === "left" ? -1 : 1)}
      />

      <ConfirmCard
        open={deletingFolder && !!selectedFolder}
        title="Delete this folder?"
        subtitle={
          selectedFolder
            ? `${selectedFolder.name} and its ${entries.length} ${entries.length === 1 ? "entry" : "entries"}`
            : undefined
        }
        onCancel={() => setDeletingFolder(false)}
        onConfirm={() => {
          if (selectedFolder) removeJournalFolder(selectedFolder.id);
          setDeletingFolder(false);
        }}
      />

      {/* MO1.1.2.3: the entry sheet. The date is set automatically (today for
          a new entry; an edit keeps the day it was written). */}
      <BottomSheet
        open={composing}
        onClose={resetCompose}
        title={editingEntry ? "Edit entry" : "New entry"}
        footer={
          <CtaButton
            label={editingEntry ? "Save changes" : "Save entry"}
            onClick={save}
            disabled={!title.trim() || !text.trim()}
          />
        }
      >
        <div className="flex gap-2.5">
          <div className="flex-1 min-w-0">
            <span className={fieldLabel}>Folder</span>
            <button
              ref={setPickerEl}
              type="button"
              onClick={() => setMenu("picker")}
              aria-haspopup="menu"
              className={`tap flex items-center gap-2 text-left ${field}`}
            >
              <Folder size={15} strokeWidth={1.75} className="flex-none text-charcoal-faint" />
              <span className="flex-1 min-w-0 truncate">{composeFolderName}</span>
              <ChevronDown size={15} className="flex-none text-charcoal-faint" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <span className={fieldLabel}>Date</span>
            <div className={`flex items-center gap-2 ${field}`}>
              <CalendarDays size={15} strokeWidth={1.75} className="flex-none text-charcoal-faint" />
              <span className="truncate">{dateLabel(editingEntry?.date ?? today)}</span>
            </div>
          </div>
        </div>

        <label className="block mt-4">
          <span className={fieldLabel}>Title</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Entry title…"
            className={`${field} placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/15`}
          />
        </label>

        <label className="block mt-4">
          <span className={fieldLabel}>Entry</span>
          {/* The frame's two-line placeholder, the Arabic line set right-to-left.
              A native placeholder can't give one line its own direction, so
              this sits over the empty field instead. */}
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="block w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/15 resize-none"
              style={{ height: "min(376px, 40dvh)" }}
            />
            {!text && (
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 px-[17px] py-[15px] text-sm text-charcoal-faint">
                <span className="block">How was your day?</span>
                <span className="block mt-1.5 text-right" dir="rtl">
                  شو صار معك اليوم؟
                </span>
              </div>
            )}
          </div>
        </label>
      </BottomSheet>

      <PopupMenu<string>
        open={menu === "picker" && composing}
        onClose={() => setMenu((m) => (m === "picker" ? null : m))}
        anchor={pickerEl}
        align="left"
        width={Math.max(150, (pickerEl?.offsetWidth ?? 168) - 18)}
        options={journalFolders.map((f) => ({ value: f.id, label: f.name }))}
        selected={composeFolder}
        onSelect={setComposeFolder}
      />

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
