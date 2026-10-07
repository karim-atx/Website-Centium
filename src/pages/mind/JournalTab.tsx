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
  EllipsisVertical,
  Folder,
  FolderCog,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { JournalEntry } from "../../types";
import { JOURNAL_LIMITS } from "../../services/journal";

type FolderOption = "rename" | "move" | "delete";

// MO1.1.2.1: the Dropdown menu's bordered rows are 36 tall on the 2x frame
// (padding 9, so a 16 line), measured. Every journal menu uses it.
const MENU_ROW_LINE = 16;

// Foundations › Inputs, focused: border 1.5 px primary.accent. The 1 px border
// turns primary.accent and a 0.5 px ring outside it makes up the 1.5, so the
// field's content doesn't shift.
const FOCUS_RING =
  "focus:outline-none focus:border-primary-accent focus:shadow-[0_0_0_0.5px_rgb(var(--c-primary-accent))]";

const dateLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

// The Journal tab, mobile v5.1 MO1.1.2 (list), MO1.1.2.1 (folder options) and
// MO1.1.2.3 (new entry). MO1.1.2.2, the Face ID locked folder, is native-only
// and not built; so the folder menu has no Lock.
//
// LIGHT MODE (decision 23, journal pass): every colour is the handover's own,
// the FolderPlus toggle (#6B41EF) included. Delete is the shared destructive
// red in both modes. Dark mode is the v5.1 dark set throughout.
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
  // Saving keeps the sheet open (spinner on Save) until the write lands; a
  // failed write leaves the text in place with the reason under Save.
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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
  // D12: the entry whose Edit / Delete menu is open, and what it anchors to.
  const [entryMenu, setEntryMenu] = useState<{ entry: JournalEntry; anchor: HTMLElement } | null>(null);

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
    setSaveError(null);
    if (menu === "picker") setMenu(null);
  };

  const startNew = () => {
    setComposeFolder(selected);
    setSaveError(null);
    setComposing(true);
  };

  const save = async () => {
    if (!title.trim() || !text.trim() || saving) return;
    // The picker's folder, unless it has since been deleted elsewhere.
    const folderId = journalFolders.some((f) => f.id === composeFolder) ? composeFolder : selected;
    setSaving(true);
    setSaveError(null);
    const failed = editingEntry
      ? await updateJournalEntry(editingEntry.id, { title: title.trim(), text: text.trim(), folderId })
      : await addJournalEntry(folderId, title.trim(), text.trim());
    setSaving(false);
    if (failed) setSaveError(failed);
    else resetCompose();
  };

  const startEdit = (e: JournalEntry) => {
    setEditingEntry(e);
    setTitle(e.title);
    setText(e.text);
    setComposeFolder(e.folderId);
    setSaveError(null);
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

  // MO1.1.2 Loading: skeleton blocks at the anatomy positions, fill
  // surface.soft, each block's own radius: the folder card (56, r16), the
  // FolderPlus row (22) and the entry cards (94, r24, 10 apart).
  if (journalLoading) {
    return (
      <div className="animate-fade-slide-up" aria-busy="true">
        <span className="sr-only" role="status">Loading your journal…</span>
        <div aria-hidden>
          <div className="h-14 rounded-2xl bg-cream-soft" />
          <div className="flex justify-end mt-[15px] mb-2.5">
            <div className="w-[18px] h-[22px] rounded-md bg-cream-soft" />
          </div>
          <div className="space-y-2.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[94px] rounded-3xl bg-cream-soft" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const composeFolderName = journalFolders.find((f) => f.id === composeFolder)?.name ?? selectedFolder?.name ?? "";
  // MO1.1.2.3 (2x frame, measured): label 12/600 on a 16 line, 6 above its
  // field (Foundations › Inputs); fields 44 tall, r12, surface.soft, 1 px
  // charcoal 10%. The Folder and Date fields sit 12 in (icon at 13 from the
  // outer edge, measured); the Title field keeps Inputs' 14.
  const fieldLabel = "block text-[12px] leading-4 font-semibold text-charcoal-faint mb-1.5";
  const field = "w-full h-11 rounded-xl bg-cream-soft border border-charcoal/10 text-sm text-charcoal";

  return (
    <div className="animate-fade-slide-up">
      {/* NO FOLDERS IS A REAL STARTING STATE NOW. Four were seeded into every
          account before — Personal, Training, Nutrition, General — as though
          somebody had made them. An entry needs a folder to live in, so this
          asks for the first one rather than inventing it. Decision 23 (kept
          list 52): styled as Foundations › Empty state — a 56 primary.tint
          tile with a 26 thin-stroke icon in primary.accent, title 15/700, one
          line 12.5/500 muted, max width 260 — with the quick folder chips
          kept under it. */}
      {journalFolders.length === 0 && !journalError && (
        <div className="flex flex-col items-center text-center py-8 mb-4">
          <span className="w-14 h-14 rounded-2xl bg-primary-pale flex items-center justify-center text-primary-accent">
            <Folder size={26} strokeWidth={1.5} aria-hidden />
          </span>
          <p className="text-[15px] font-bold text-charcoal mt-3">No folders yet</p>
          <p className="text-[12.5px] font-medium text-charcoal-muted mt-1 mb-4 leading-relaxed max-w-[260px]">
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
        </div>
      )}

      {/* MO1.1.2 #2: the folders as a segmented card (358 × 56), scrolling
          sideways once they outgrow it. Decision 23: the handover's colours,
          active #A79AD5 / white, idle #F5F4FE / #5B5349 (SegmentedTabs'
          defaults plus the #5B5349 idle ink). Tabs keep their natural width,
          16 each side (2x frame: Personal 84, Training 80). */}
      {journalFolders.length > 0 && (
        <SegmentedTabs
          scroll
          scrollMinWidth={0}
          items={journalFolders.map((f) => ({ key: f.id, label: f.name }))}
          activeKey={selected}
          onChange={setActiveFolder}
          idleInk="rgb(var(--c-charcoal-soft))"
        />
      )}

      {/* MO1.1.2 #3: FolderPlus 18, right-aligned on its own 22 pt row, in
          #6B41EF (2x frame; dark: primary, as Workout's New folder). */}
      <div className="flex justify-end mt-[15px] mb-2.5">
        <button
          onClick={() => {
            setFolderName("");
            setNaming((v) => (v === "new" ? null : "new"));
          }}
          aria-label="New folder"
          aria-expanded={naming === "new"}
          className="tap h-[22px] flex items-center text-th-6b41ef dark:text-th-9a8cd6"
        >
          <FolderPlus size={18} />
        </button>
      </div>

      {/* Not drawn: the new-folder / rename field, built from Foundations ›
          Inputs (44, r12, surface.soft, 14/600, placeholder text.muted,
          focused border 1.5 primary.accent) beside a 44 filled button. */}
      {naming && (
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            value={folderName}
            maxLength={JOURNAL_LIMITS.folderMax}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && folderName.trim()) submitName();
              if (e.key === "Escape") setNaming(null);
            }}
            placeholder="Folder name…"
            aria-label={naming === "rename" ? "Rename folder" : "New folder name"}
            className={`flex-1 min-w-0 h-11 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 text-sm font-semibold text-charcoal placeholder:text-charcoal-faint ${FOCUS_RING}`}
          />
          <button
            onClick={submitName}
            className="tap h-11 px-4 rounded-xl bg-primary-fill text-on-primary-fill text-[13.5px] font-bold"
          >
            {naming === "rename" ? "Save" : "Add"}
          </button>
        </div>
      )}

      {/* MO1.1.2 Error: an inline line in danger under the affected element
          (the list it failed to load or change). An empty journal and an
          unreachable one look identical once rendered, and only one is true. */}
      {journalError && (
        <p role="alert" className="mb-2.5 text-[11.5px] leading-4 font-medium text-status-high">
          {journalError}
        </p>
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
                // The swipe tile is new since the redesign: the frame's
                // #F0EEF9 tile with a #7D67D9 pencil, SwipeActions' default.
                onClick: () => startEdit(e),
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
            onLongPress={(anchor) => setEntryMenu({ entry: e, anchor })}
          >
            <Card interactive onClick={() => setOpenEntry(e)} className="px-5 py-[19px]">
              <div className="flex items-center justify-between gap-2 h-4">
                <p className="text-xs leading-4 font-semibold text-charcoal-faint">{dateLabel(e.date)}</p>
                {/* D12: the keyboard and mouse path to Edit / Delete. */}
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setEntryMenu({ entry: e, anchor: ev.currentTarget });
                  }}
                  aria-label={`${e.title}, more options`}
                  aria-haspopup="menu"
                  aria-expanded={entryMenu?.entry.id === e.id}
                  className="tap -mr-1.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-charcoal-faint"
                >
                  <EllipsisVertical size={16} />
                </button>
              </div>
              <div
                aria-hidden
                className="mt-[9px] h-px"
                // #D3CBEC on the 2x frame: #AEA1DC at 55%.
                style={{ background: dark ? "var(--border-row)" : "rgb(var(--th-aea1dc) / 0.55)" }}
              />
              <p className="mt-2 text-sm leading-5 font-semibold text-charcoal truncate">{e.title}</p>
            </Card>
          </SwipeActions>
        ))}
        {/* MO1.1.2 Empty: the board note's line, "No entries in this folder
            yet.", set as Foundations › Empty state (56 primary.tint tile, 26
            thin-stroke icon in primary.accent, line 12.5/500 text.muted, max
            width 260); the pinned New entry stays below. The board names no
            icon or title for it: Folder, as on the no-folders state. */}
        {selected !== "" && entries.length === 0 && (
          <div className="flex flex-col items-center text-center py-8">
            <span className="w-14 h-14 rounded-2xl bg-primary-pale flex items-center justify-center text-primary-accent">
              <Folder size={26} strokeWidth={1.5} aria-hidden />
            </span>
            <p className="text-[12.5px] font-medium text-charcoal-muted mt-3 leading-relaxed max-w-[260px]">
              No entries in this folder yet.
            </p>
          </div>
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
              // MO1.1.2 #10 (decision 23): New entry filled #A198DF
              // (--c-fill-cta), 13.5/700 white; FolderCog on #EFEEFD with a
              // #7D67D9 icon. 48/r14 per C-01.
              className: "!text-[13.5px] !bg-[rgb(var(--c-fill-cta))]",
              onClick: startNew,
            }}
            trailing={{
              icon: <FolderCog size={18} strokeWidth={1.75} />,
              className: "!bg-th-efeefd !text-primary-accent dark:!bg-primary-pale dark:!text-primary-deep-text",
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
        rowLineHeight={MENU_ROW_LINE}
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
        rowLineHeight={MENU_ROW_LINE}
        heading="Move"
        options={[
          { value: "left", label: "Move left", icon: <ArrowLeft size={15} strokeWidth={1.75} />, disabled: selectedIndex <= 0 },
          { value: "right", label: "Move right", icon: <ArrowRight size={15} strokeWidth={1.75} />, disabled: selectedIndex >= journalFolders.length - 1 },
        ]}
        onSelect={(v) => selectedFolder && moveJournalFolder(selectedFolder.id, v === "left" ? -1 : 1)}
      />

      {/* D12: an entry's Edit / Delete without a swipe (long-press or ⋮). */}
      <PopupMenu<"edit" | "delete">
        open={!!entryMenu}
        onClose={() => setEntryMenu(null)}
        anchor={entryMenu?.anchor ?? null}
        rowLineHeight={MENU_ROW_LINE}
        options={[
          { value: "edit", label: "Edit", icon: <Pencil size={15} strokeWidth={1.75} /> },
          { value: "delete", label: "Delete", icon: <Trash2 size={15} strokeWidth={1.75} />, destructive: true },
        ]}
        onSelect={(v) => {
          if (!entryMenu) return;
          if (v === "edit") startEdit(entryMenu.entry);
          else removeJournalEntry(entryMenu.entry.id);
        }}
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
          <>
            {/* Saving: Pinned CTA loading (spinner for the icon, label kept). */}
            <CtaButton
              label={editingEntry ? "Save changes" : "Save entry"}
              onClick={save}
              loading={saving}
              disabled={!title.trim() || !text.trim()}
            />
            {/* Error: an inline line in danger under the affected element. */}
            {saveError && (
              <p role="alert" className="mt-2 text-center text-[11.5px] leading-4 font-medium text-status-high">
                {saveError}
              </p>
            )}
          </>
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
              aria-expanded={menu === "picker"}
              className={`tap flex items-center gap-2 px-3 text-left font-semibold ${field} ${FOCUS_RING}`}
            >
              {/* MO1.1.2.3 (2x frame, measured): Folder in #7D6BB5
                  (primary.deep), the value 14/600 #241F1B (Inputs'
                  body.strong); the Date field's CalendarDays stays grey. */}
              <Folder size={15} strokeWidth={1.75} className="flex-none text-th-7d6bb5 dark:text-primary-deep-text" />
              <span className="flex-1 min-w-0 truncate">{composeFolderName}</span>
              <ChevronDown size={15} className="flex-none text-charcoal-faint" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <span className={fieldLabel}>Date</span>
            {/* Read-only: the value 14/400 in #5B5349 (text.secondary),
                measured. */}
            <div className={`flex items-center gap-2 px-3 ${field} !text-charcoal-soft`}>
              <CalendarDays size={15} strokeWidth={1.75} className="flex-none text-charcoal-faint" />
              <span className="truncate">{dateLabel(editingEntry?.date ?? today)}</span>
            </div>
          </div>
        </div>

        <label className="block mt-4">
          <span className={fieldLabel}>Title</span>
          {/* Foundations › Inputs: 14/600, placeholder text.muted (the frame's
              "Entry title…" is the 600 weight, measured). */}
          <input
            autoFocus
            value={title}
            maxLength={JOURNAL_LIMITS.titleMax}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Entry title…"
            className={`${field} px-3.5 font-semibold placeholder:text-charcoal-faint ${FOCUS_RING}`}
          />
        </label>

        {/* The frame leaves 24 between the Entry field and Save (measured);
            the sheet's body (20) and footer (12) paddings give 32. */}
        <label className="block mt-4 -mb-2">
          <span className={fieldLabel}>Entry</span>
          {/* The frame's two-line placeholder, the Arabic line set right-to-left.
              A native placeholder can't give one line its own direction, so
              this sits over the empty field instead. */}
          <div className="relative">
            <textarea
              value={text}
              maxLength={JOURNAL_LIMITS.bodyMax}
              onChange={(e) => setText(e.target.value)}
              className={`block w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3.5 text-sm text-charcoal resize-none ${FOCUS_RING}`}
              // MO1.1.2.3 draws the Entry field 376 tall; the sheet body
              // scrolls inside on a short screen.
              style={{ height: 376 }}
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
        rowLineHeight={MENU_ROW_LINE}
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
