import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Card } from "../../components/ui/Card";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { SwipeActions } from "../../components/ui/SwipeActions";
import { PinnedCta, CtaButton } from "../../components/ui/PinnedCta";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { Toast } from "../../components/ui/Toast";
import { MindHeader } from "../../components/mind/MindHeader";
import { useApp } from "../../context/AppContext";
import {
  ArrowUpDown,
  BookOpen,
  CalendarDays,
  ChevronDown,
  EllipsisVertical,
  Folder,
  FolderCog,
  FolderPlus,
  Loader2,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { shiftDate } from "../../utils/date";
import type { JournalEntry, JournalFolder } from "../../types";
import { JOURNAL_LIMITS, accountCanUseFolderLock } from "../../services/journal";
import { isFolderOpen, type UnlockWindows } from "../../services/journal/lockLogic";
import { JournalPasswordPopup, LockedFolderView, type PasswordPurpose } from "../../components/mind/JournalLock";
import { entryMenuTarget } from "../../components/mind/entryMenu";
import { MusicSection } from "../../components/music/MusicSection";
import { appLocale } from "../../i18n/format";
import { getLanguage, t, tk, tn, tx } from "../../i18n/core";

type FolderOption = "rename" | "move" | "lock" | "unlock" | "delete";

// The windows map only ever holds live windows (AppContext drops each one
// when it lapses), so "now" here is the first instant that could still be
// open; the render stays pure.
const openNow = (f: JournalFolder | undefined, windows: UnlockWindows) =>
  isFolderOpen(f, windows, Number.NEGATIVE_INFINITY);

// MO1.1.2.1: the Dropdown menu's bordered rows are 36 tall on the 2x frame
// (padding 9, so a 16 line), measured. Every journal menu uses it.
const MENU_ROW_LINE = 16;

// Foundations › Inputs, focused: border 1.5 px primary.accent. The 1 px border
// turns primary.accent and a 0.5 px ring outside it makes up the 1.5, so the
// field's content doesn't shift.
const FOCUS_RING =
  "focus:outline-none focus:border-primary-accent focus:shadow-[0_0_0_0.5px_rgb(var(--c-primary-accent))]";

const FIELD_ERROR = "!border-status-high focus:!shadow-[0_0_0_0.5px_rgb(var(--c-status-high))]";

const dateLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(appLocale("en-US"), { weekday: "short", month: "short", day: "numeric" });
};

/** MO1.1.2 S9: the virtual "Recently" tab's key (never a folder id: those are uuids). */
const RECENT = "recently";
/** MO1.1.2 O3: the handover's write-failure toast copy. */
const SAVE_FAILED = tk("Couldn't save. Try again.");
/** K8: the quick first folders (a tap makes one, named in the app's language). */
const QUICK_FOLDERS = [tk("Personal"), tk("Training"), tk("Nutrition")];

/** A card tap that ends a swipe (or lands on a row left open) is not a tap. */
const rowIsShifted = (el: HTMLElement) => {
  const row = el.closest<HTMLElement>("[role='group']");
  const tf = row ? getComputedStyle(row).transform : "none";
  return tf !== "none" && !/^matrix\(1, 0, 0, 1, 0, 0\)$/.test(tf);
};

// The Journal tab, mobile v5.1 MO1.1.2 (list), MO1.1.2.1 (folder options),
// MO1.1.2.2 (locked folder) and MO1.1.2.3 (new entry).
//
// THE FOLDER LOCK (backend stage 3, Database docs/HANDOVER_API.md). Lock
// needs no password. While a folder is locked the server hides its entries
// and refuses writes to them; on the web its Face ID is the ACCOUNT PASSWORD,
// checked server-side, which opens a five-minute window (AppContext re-locks
// the screen when it lapses). Writing into, deleting, or removing the lock of
// a shut folder asks for the password first: a write would be refused, and a
// folder delete takes its hidden entries with it (the cascade isn't gated by
// the lock), so the password guards it here. Accounts with no password
// (Google-only) aren't offered Lock: they could never open it again.
//
// HANDOVER-COMPLETE PASS (7 October 2026): entries have no read sheet; Edit
// and Delete are the swipe tiles (a mouse can drag them open; the keyboard
// opens them with ArrowLeft on the focused row), and Edit shows the full
// text. RESTORE ROUND (user, 7 October 2026): the entry ⋮ and the
// long-press / right-click menu are back (D12) with the same Edit / Delete,
// in Foundations' dropdown with the folder options' 36 pt rows; only open
// folders show cards, so the menu never reaches a shut folder's entries. Move
// reorders the tabs in place: the menu closes, the active tab is held, and a
// tap on another tab (or the arrow keys) puts the folder there. Save is
// always enabled; an empty field says so under itself.
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
    reloadJournal,
    journalUnlockedUntil,
    lockJournalFolder,
    unlockJournalFolder,
    disableJournalFolderLock,
  } = useApp();
  const [activeFolder, setActiveFolder] = useState("");
  // S7: an entry confirmed for deletion is hidden at once and deleted on the
  // server when its Undo toast expires.
  const [confirmDelete, setConfirmDelete] = useState<JournalEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<JournalEntry | null>(null);
  const pendingRef = useRef<JournalEntry | null>(null);
  // O3: write failures, in the shared toast.
  const [failToast, setFailToast] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [composeFolder, setComposeFolder] = useState("");
  // Saving keeps the sheet open (spinner on Save) until the write lands; a
  // failed write leaves the text in place with the reason under Save.
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // A Save tapped with a field still empty: each empty field shows its line.
  const [tried, setTried] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  // One inline name field, for a new folder or renaming the active one.
  const [naming, setNaming] = useState<"new" | "rename" | null>(null);
  const [folderName, setFolderName] = useState("");
  const [menu, setMenu] = useState<"options" | "picker" | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  // MO1.1.2.1 Move: the tabs are being reordered in place.
  const [moving, setMoving] = useState(false);
  const stripRef = useRef<HTMLDivElement | null>(null);
  // Menu anchors, held as state (not refs) since the menus read them in render.
  const [cogEl, setCogEl] = useState<HTMLButtonElement | null>(null);
  const [pickerEl, setPickerEl] = useState<HTMLButtonElement | null>(null);
  // D12: the entry whose Edit / Delete menu is open, and what it anchors to.
  const [entryMenu, setEntryMenu] = useState<{ entry: JournalEntry; anchor: HTMLElement } | null>(null);
  // Stage 3: whether Lock is offered (an account with a password), the
  // password being asked for and what follows it, and a failed Lock's line.
  const [canLock, setCanLock] = useState(false);
  const [asking, setAsking] = useState<{ purpose: PasswordPurpose; folder: JournalFolder; then?: () => void } | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void accountCanUseFolderLock().then((can) => {
      if (live) setCanLock(can);
    });
    return () => {
      live = false;
    };
  }, []);

  // Move mode holds focus on the active tab (so the arrow keys work at once)
  // and ends on a tap anywhere outside the tabs.
  useEffect(() => {
    if (!moving) return;
    stripRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
    const onDown = (e: PointerEvent) => {
      if (!stripRef.current?.contains(e.target as Node)) setMoving(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [moving]);

  // THE SELECTION FOLLOWS THE LIST. Folders load after the first render, and
  // a folder can be deleted from another device — either way, a selection
  // pointing at nothing falls back to the first real folder rather than
  // showing an empty list that looks like an empty folder.
  // S9: "Recently" is a virtual tab after the folders (not a folder: no
  // options, and New entry writes into the first folder).
  const recent = activeFolder === RECENT && journalFolders.length > 0;
  const selected = recent
    ? RECENT
    : journalFolders.some((f) => f.id === activeFolder)
      ? activeFolder
      : journalFolders[0]?.id ?? "";
  const selectedIndex = journalFolders.findIndex((f) => f.id === selected);
  const selectedFolder = journalFolders[selectedIndex];
  // MO1.1.2.2: a locked folder with no open window shows the locked list.
  const selectedShut = !!selectedFolder && !openNow(selectedFolder, journalUnlockedUntil);
  // Where New entry writes: the selected folder, or the first one on Recently.
  const targetFolder = recent ? journalFolders[0] : selectedFolder;
  const targetShut = !!targetFolder && !openNow(targetFolder, journalUnlockedUntil);

  const fail = (message: string | null) => {
    if (message) setFailToast(Date.now());
  };

  // S7: committing a pending delete (its toast expired, another delete
  // started, or the page closed). A failure brings the entry back.
  const commitDelete = (entry: JournalEntry | null) => {
    if (!entry) return;
    pendingRef.current = null;
    setPendingDelete((p) => (p?.id === entry.id ? null : p));
    void removeJournalEntry(entry.id).then(fail);
  };
  const removeRef = useRef(removeJournalEntry);
  useEffect(() => {
    removeRef.current = removeJournalEntry;
  });
  useEffect(
    () => () => {
      // Leaving the page with an Undo still showing completes the delete.
      if (pendingRef.current) void removeRef.current(pendingRef.current.id);
    },
    []
  );
  const startDelete = (entry: JournalEntry) => {
    commitDelete(pendingRef.current);
    pendingRef.current = entry;
    setPendingDelete(entry);
  };

  // Ask for the password, then carry on with `then` once it's accepted.
  const askPassword = (purpose: PasswordPurpose, folder: JournalFolder, then?: () => void) => {
    setLockError(null);
    setAsking({ purpose, folder, then });
  };

  const onPassword = async (password: string) => {
    if (!asking) return null;
    const result =
      asking.purpose === "remove"
        ? await disableJournalFolderLock(asking.folder.id, password)
        : await unlockJournalFolder(asking.folder.id, password);
    if (!result.ok) return result.message;
    const then = asking.then;
    setAsking(null);
    then?.();
    return null;
  };

  // S9: Recently = the last 30 days across the open folders (a shut folder's
  // entries are never in journalEntries: the server hides them).
  const since = shiftDate(today, -30);
  const entries = journalEntries
    .filter((e) => (recent ? e.date >= since : e.folderId === selected))
    .filter((e) => e.id !== pendingDelete?.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  // D12 + the folder lock: the entry menu stands only while its entry is a
  // card on screen, in the selected folder with that folder open. A window
  // lapsing (or the entry going, or another tab being picked) drops it here,
  // during render, so it can't pop back over a shut folder later.
  const entryMenuEntry = entryMenuTarget(entryMenu?.entry.id, entries, selectedFolder, journalUnlockedUntil);
  const entryFolderOpen = !!entryMenuEntry;
  if (entryMenu && !entryFolderOpen) setEntryMenu(null);

  const resetCompose = () => {
    setTitle("");
    setText("");
    setComposing(false);
    setEditingEntry(null);
    setSaveError(null);
    setTried(false);
    if (menu === "picker") setMenu(null);
  };

  const openCompose = () => {
    setComposeFolder(targetFolder?.id ?? "");
    setSaveError(null);
    setTried(false);
    setComposing(true);
  };

  // A shut folder refuses writes, so New entry opens it first.
  const startNew = () => {
    if (targetShut && targetFolder) askPassword("write", targetFolder, openCompose);
    else openCompose();
  };

  const save = async (afterUnlock = false) => {
    if (saving) return;
    // The frame draws Save enabled. The database needs a title and a body
    // (1–200 / 1–20000), so an empty one is named under its own field
    // (Foundations › Inputs, error) instead of greying the button out.
    if (!title.trim() || !text.trim()) {
      setTried(true);
      return;
    }
    // The picker's folder, unless it has since been deleted elsewhere.
    const folderId = journalFolders.some((f) => f.id === composeFolder) ? composeFolder : targetFolder?.id ?? "";
    // A locked target that isn't open (picked in the sheet, or its window
    // ran out while writing) asks for the password, then saves; what was
    // written stays in the sheet meanwhile.
    const target = journalFolders.find((f) => f.id === folderId);
    if (!afterUnlock && target && !openNow(target, journalUnlockedUntil)) {
      askPassword("write", target, () => void save(true));
      return;
    }
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
    setTried(false);
    setComposing(true);
  };

  const submitName = () => {
    const name = folderName.trim();
    if (name) {
      if (naming === "rename" && selectedFolder) void renameJournalFolder(selectedFolder.id, name).then(fail);
      else void addJournalFolder(name).then(fail);
    }
    setFolderName("");
    setNaming(null);
  };

  const onFolderOption = (opt: FolderOption) => {
    if (opt === "rename" && selectedFolder) {
      setFolderName(selectedFolder.name);
      setNaming("rename");
    } else if (opt === "move") {
      // "Move reorders the tabs": the menu closes and the tabs take the move
      // (the pointerdown that picked this has already passed, so the
      // outside-tap listener starts clean).
      setMoving(true);
    } else if (opt === "lock" && selectedFolder) {
      // MO1.1.2.1 Lock: no password to turn protection on.
      setLockError(null);
      void lockJournalFolder(selectedFolder.id).then(setLockError);
    } else if (opt === "unlock" && selectedFolder) {
      // The second tap on Lock: off for good, behind the password.
      askPassword("remove", selectedFolder);
    } else if (opt === "delete" && selectedFolder) {
      // Not linked on the board: a folder's entries go with it, so this
      // asks first (data safety). A shut folder's hidden entries would go
      // too, so its password comes first (it also lets the count be read).
      if (selectedShut) askPassword("delete", selectedFolder, () => setDeletingFolder(true));
      else setDeletingFolder(true);
    }
  };

  // Move mode: a tap on another tab puts the active folder in its place; a
  // tap on the active tab itself just ends the move.
  const onTab = (key: string) => {
    if (!moving) {
      setActiveFolder(key);
      return;
    }
    // Recently is not a place a folder can go (findIndex is -1).
    const to = journalFolders.findIndex((f) => f.id === key);
    if (selectedFolder && to >= 0 && to !== selectedIndex) void moveJournalFolder(selectedFolder.id, to - selectedIndex).then(fail);
    setMoving(false);
  };

  // Move mode from the keyboard: the arrows step the folder (mirrored in
  // RTL); Enter, Space or Escape ends the move.
  const onStripKey = (e: KeyboardEvent) => {
    if (!moving || !selectedFolder) return;
    const rtl = stripRef.current ? getComputedStyle(stripRef.current).direction === "rtl" : false;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      void moveJournalFolder(selectedFolder.id, (e.key === "ArrowLeft") !== rtl ? -1 : 1).then(fail);
    } else if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setMoving(false);
    }
  };

  // MO1.1.2 O1 Loading: the header and the (empty) tab track render at once
  // in the fixed area; three skeleton blocks (full width × 96, r22,
  // surface.soft, 10 apart) pulse over 1.2 s, static under Reduce motion.
  if (journalLoading) {
    return (
      <div className="animate-fade-slide-up" aria-busy="true">
        <MindHeader section="journal">
          <div aria-hidden className="h-14 rounded-2xl bg-[rgb(var(--c-seg-track))] dark:bg-th-303141" />
        </MindHeader>
        <span className="sr-only" role="status">{t("Loading your journal…")}</span>
        <div aria-hidden className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-[22px] bg-cream-soft animate-skeleton-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // S5: a tap on a card opens the entry (MO1.1.2.3 in edit mode); the ⋮, a
  // swipe, or a row left open don't.
  const onCardClick = (ev: MouseEvent<HTMLElement>, entry: JournalEntry) => {
    const d = downAt.current;
    downAt.current = null;
    if (d && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 6) return;
    if (rowIsShifted(ev.currentTarget)) return;
    startEdit(entry);
  };

  const retry = async () => {
    setRetrying(true);
    await reloadJournal();
    setRetrying(false);
  };

  // MO1.1.2 #6 / #7: the folders (and Recently) in the segmented track,
  // inside the fixed area.
  const tabs =
    journalFolders.length > 0 ? (
      <div
        ref={stripRef}
        onKeyDown={onStripKey}
        className={moving ? "[&_[aria-selected=true]]:opacity-90" : undefined}
      >
        <SegmentedTabs
          scroll
          scrollMinWidth={0}
          // #6: track #F3F3FD / #303141; #7: idle #F5F4FE / #5B5349 (dark
          // #303141 / #B8B3C7), active #A79AD5 / white (dark #A991FE /
          // #0D0B1A), 12.5 / 18.8 700.
          darkTone="partB"
          lineHeight={18.8}
          // MO1.1.2.2 #2: Lock 12/1.75 before a locked folder's name (6
          // apart). While its window is open the padlock shows open.
          items={[
            ...journalFolders.map((f) => ({
              key: f.id,
              label: f.name,
              icon: f.locked ? (
                openNow(f, journalUnlockedUntil) ? (
                  <LockOpen size={12} strokeWidth={1.75} role="img" aria-label={t("Unlocked")} />
                ) : (
                  <Lock size={12} strokeWidth={1.75} role="img" aria-label={t("Locked")} />
                )
              ) : undefined,
            })),
            { key: RECENT, label: t("Recently") },
          ]}
          activeKey={selected}
          onChange={onTab}
          idleInk="rgb(var(--c-charcoal-soft))"
        />
      </div>
    ) : null;

  const composeFolderName = journalFolders.find((f) => f.id === composeFolder)?.name ?? selectedFolder?.name ?? "";
  // MO1.1.2.3 (2x frame, measured): label 12/600 on a 16 line, 6 above its
  // field (Foundations › Inputs); fields 44 tall, r12, surface.soft, 1 px
  // charcoal 10%. The Folder and Date fields sit 12 in (icon at 13 from the
  // outer edge, measured); the Title field keeps Inputs' 14.
  const fieldLabel = "block text-[12px] leading-4 font-semibold text-charcoal-faint mb-1.5";
  const field = "w-full h-11 rounded-xl bg-cream-soft border border-charcoal/10 text-sm text-charcoal";
  // Foundations › Inputs, error: border danger, a helper line in danger under
  // the field (11.5/500, as this screen's other error lines). The copy is
  // UNSPECIFIED in the handover.
  const titleMissing = tried && !title.trim();
  const textMissing = tried && !text.trim();
  const errorLine = "block mt-1.5 text-[11.5px] leading-4 font-medium text-status-high";

  return (
    <div className="animate-fade-slide-up">
      {/* #1: the fixed area: back, title, subtitle and the folder tabs stay
          at the top; once content passes under them it takes the page fill
          and a 1 px hairline (FixedHeader, V6-91), no shadow or blur. */}
      <MindHeader section="journal">{tabs}</MindHeader>

      {/* O3 / O4: the read failed (or the device is offline). A banner right
          under the fixed area with Retry; the loaded list stays. */}
      {journalError && (
        <div role="alert" className="mb-2.5 flex items-center gap-3 rounded-xl bg-status-high-bg p-3">
          <p className="flex-1 min-w-0 text-[12px] leading-4 font-semibold text-status-high">
            {t("Couldn't load. Check your connection.")}
          </p>
          <button
            type="button"
            onClick={() => void retry()}
            disabled={retrying}
            className="tap relative shrink-0 text-[12px] leading-4 font-bold text-status-high after:absolute after:-inset-3 after:content-['']"
          >
            {retrying ? <Loader2 size={14} className="animate-spin" aria-label={t("Retrying")} /> : t("Retry")}
          </button>
        </div>
      )}

      {/* K8: NO FOLDERS IS A REAL STARTING STATE. An entry needs a folder, so
          this asks for the first one rather than inventing it; restyled to
          the B empty pattern (BookOpen 28 in the primary without a tile,
          title 15/700, line 12/500 text.muted). The quick folder chips stay
          (restore round 2), as Foundations chips at a 44 pt target. */}
      {journalFolders.length === 0 && !journalError && (
        <div className="flex flex-col items-center text-center py-8 mb-4">
          <BookOpen size={28} strokeWidth={1.5} className="text-primary" aria-hidden />
          <p className="text-[15px] font-bold text-charcoal mt-3">{t("No folders yet")}</p>
          <p className="text-[12px] font-medium text-charcoal-faint mt-1 mb-2 leading-relaxed max-w-[260px]">
            {t("Entries live in folders. Make the first one to start writing.")}
          </p>
          <div className="flex flex-wrap gap-x-2 justify-center">
            {QUICK_FOLDERS.map((key) => t(key)).map((name) => (
              <button
                key={name}
                onClick={() => void addJournalFolder(name).then(fail)}
                className="tap min-h-11 flex items-center"
              >
                <span className="flex items-center gap-1.5 rounded-full bg-cream-soft border border-charcoal/[0.11] px-[13px] py-[7px] text-[12px] font-semibold text-charcoal-soft">
                  {name}
                  <Plus size={12} className="text-charcoal-faint" aria-hidden />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* #8 / #9: FolderPlus 18 in a 30 r9 box (m -4 -6 -4 0, so the row is
          22 tall), 16 under the tab track (the fixed area's own 16), cards 10
          below; #6B41EF / #C3B3FB. During a Move the row's left side says
          what to do (K5). */}
      <div className="flex items-center justify-end gap-2 h-[22px] mb-2.5">
        {moving && selectedFolder && (
          <p role="status" className="flex-1 min-w-0 truncate text-[11.5px] leading-4 font-medium text-charcoal-muted">
            {t("Tap where {folder} should go", { folder: selectedFolder.name })}
          </p>
        )}
        <button
          onClick={() => {
            setFolderName("");
            setNaming((v) => (v === "new" ? null : "new"));
          }}
          aria-label={t("New folder")}
          aria-expanded={naming === "new"}
          className="tap relative w-[30px] h-[30px] -my-1 -me-1.5 rounded-[9px] flex items-center justify-center text-th-6b41ef dark:text-primary-dark after:absolute after:-inset-[7px] after:content-['']"
        >
          <FolderPlus size={18} />
        </button>
      </div>

      {/* K6: the new-folder / rename field (Foundations › Inputs 44 r12,
          60-character cap) beside a 44 filled button. */}
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
            placeholder={t("Folder name…")}
            aria-label={naming === "rename" ? t("Rename folder") : t("New folder name")}
            className={`flex-1 min-w-0 h-11 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 text-sm font-semibold text-charcoal placeholder:text-charcoal-faint ${FOCUS_RING}`}
          />
          <button
            onClick={submitName}
            className="tap h-11 px-4 rounded-xl bg-primary-fill text-on-primary-fill text-[13.5px] font-bold"
          >
            {naming === "rename" ? t("Save") : t("Add")}
          </button>
        </div>
      )}

      {/* K9: a failed Lock stays an inline line. */}
      {lockError && (
        <p role="alert" className="mb-2.5 text-[11.5px] leading-4 font-medium text-status-high">
          {lockError}
        </p>
      )}

      {/* MO1.1.2.2 (K4): a locked folder with no open window shows the locked
          list. #10-#24: entry cards 358 wide, r24, pad 20, 10 apart; a tap
          opens the entry (S5), swipe left for Edit / Delete (S6). */}
      {selectedShut && selectedFolder ? (
        <LockedFolderView folderName={selectedFolder.name} onUnlock={() => askPassword("unlock", selectedFolder)} />
      ) : (
        <div className="space-y-2.5">
          {entries.map((e) => (
            <div
              key={e.id}
              // K10: Enter on a focused card opens it (S5).
              onKeyDown={(ev) => {
                if (ev.key === "Enter" && (ev.target as HTMLElement).getAttribute("role") === "group") {
                  ev.preventDefault();
                  startEdit(e);
                }
              }}
            >
              <SwipeActions
                radius={24}
                actions={[
                  { key: "edit", label: t("Edit"), icon: <Pencil size={16} />, onClick: () => startEdit(e) },
                  { key: "delete", label: t("Delete"), icon: <Trash2 size={16} />, onClick: () => setConfirmDelete(e), destructive: true },
                ]}
                keyboardLabel={t("{date}, {title}. Arrow left for Edit and Delete", { date: dateLabel(e.date), title: e.title })}
                onLongPress={(anchor) => setEntryMenu({ entry: e, anchor })}
              >
                <Card
                  // #10: 1 px #241F1B@11% / #F5F3FA@11%.
                  className="px-5 py-[19px] cursor-pointer dark:!border-charcoal/[0.11]"
                  role="button"
                  aria-label={t("{date}, {title}. Open", { date: dateLabel(e.date), title: e.title })}
                  onPointerDown={(ev) => {
                    downAt.current = { x: ev.clientX, y: ev.clientY };
                  }}
                  onClick={(ev) => onCardClick(ev, e)}
                >
                  <div className="flex items-center justify-between gap-2 h-4">
                    {/* #11: 12/16 600 #8C8378 / #B8B3C7. */}
                    <p className="text-xs leading-4 font-semibold text-charcoal-faint">{dateLabel(e.date)}</p>
                    {/* K2 (D12 restore round): the ⋮ on the date line, 44 pt
                        target; it never opens the card. */}
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setEntryMenu({ entry: e, anchor: ev.currentTarget });
                      }}
                      aria-label={t("{title}, more options", { title: e.title })}
                      aria-haspopup="menu"
                      aria-expanded={entryMenu?.entry.id === e.id}
                      className="tap relative -me-1.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-charcoal-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent after:absolute after:-inset-2.5 after:content-['']"
                    >
                      <EllipsisVertical size={16} aria-hidden />
                    </button>
                  </div>
                  {/* #12: the rule, 1 px #AEA1DC@55% / #A991FE@55%, 8 under the date. */}
                  <div aria-hidden className="mt-[9px] h-px bg-primary/[0.55]" />
                  {/* #13: 14/20 600; one line (two under Larger text), then an ellipsis. */}
                  <p className="mt-2 text-sm leading-5 font-semibold text-charcoal line-clamp-1 [.larger-text_&]:line-clamp-2 break-words">
                    {e.title}
                  </p>
                </Card>
              </SwipeActions>
            </div>
          ))}
          {/* O2: the empty folder (BookOpen 28 in the primary, no tile; title
              15/700; line 12/500 text.muted); New entry stays pinned below.
              Recently's own empty line is ours. */}
          {selected !== "" && entries.length === 0 && (
            <div className="flex flex-col items-center text-center py-8">
              <BookOpen size={28} strokeWidth={1.5} className="text-primary" aria-hidden />
              {recent ? (
                <p className="mt-3 text-[15px] font-bold text-charcoal">{t("Nothing in the last 30 days")}</p>
              ) : (
                <>
                  <p className="mt-3 text-[15px] font-bold text-charcoal">{t("No entries in {folder} yet", { folder: selectedFolder?.name ?? "" })}</p>
                  <p className="mt-1 text-[12px] font-medium text-charcoal-faint">{t("Write your first one")}</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* NOT OFFERED WITHOUT A FOLDER TO SAVE INTO. folder_id is NOT NULL, so
          composing before the first folder exists could only end in a foreign
          key error after the user had written something. */}
      {selected !== "" && (
        <>
          {/* The page's own padding covers 112 of the 168 a 44 pt pinned
              CTA needs. */}
          <div aria-hidden style={{ height: 56 }} />
          <PinnedCta
            // MO1.1.2 #10: the row is 44 tall, radius 12 (frame and
            // Foundations › Pinned CTA; C-01 no longer applies).
            size="base"
            primary={{
              label: t("New entry"),
              icon: <Plus size={15} />,
              // #25 / #26: New entry #A198DF / #A991FE, 13.5/20.3 700.
              className: "!text-[13.5px] !leading-[20.3px] !bg-[rgb(var(--c-fill-cta))]",
              onClick: startNew,
            }}
            trailing={{
              // #27 / #28: FolderCog 18 #7D67D9 / #9A8CD6 on #EFEEFD / #303141.
              // Recently is not a folder (S9): its options are off.
              icon: <FolderCog size={18} strokeWidth={1.75} />,
              className: "!bg-th-efeefd !text-primary-accent dark:!bg-primary-pale",
              label: t("Folder options"),
              onClick: () => setMenu("options"),
              onAnchor: setCogEl,
              disabled: recent,
            }}
          />
        </>
      )}

      {/* MO1.1.2.1: options for the active folder, in the frame's order
          Rename, Move, Lock, Delete. On a locked folder the third row turns
          the lock off ("Remove lock" with LockOpen: UNSPECIFIED, the frame
          draws only the unlocked menu; the API calls it the second tap on
          Lock). An account with no password isn't offered Lock (API doc:
          it could never open the folder again). */}
      <PopupMenu<FolderOption>
        open={menu === "options"}
        onClose={() => setMenu((m) => (m === "options" ? null : m))}
        anchor={cogEl}
        rowLineHeight={MENU_ROW_LINE}
        options={[
          { value: "rename", label: t("Rename"), icon: <Pencil size={15} strokeWidth={1.75} /> },
          { value: "move", label: tx("Move", "reorder"), icon: <ArrowUpDown size={15} strokeWidth={1.75} />, disabled: journalFolders.length < 2 },
          ...(selectedFolder?.locked
            ? [{ value: "unlock" as const, label: t("Remove lock"), icon: <LockOpen size={15} strokeWidth={1.75} /> }]
            : canLock
              ? [{ value: "lock" as const, label: t("Lock"), icon: <Lock size={15} strokeWidth={1.75} /> }]
              : []),
          { value: "delete", label: t("Delete"), icon: <Trash2 size={15} strokeWidth={1.75} />, destructive: true },
        ]}
        onSelect={onFolderOption}
      />
      {/* D12 (restore round): an entry's Edit / Delete without a swipe
          (long-press, right-click or ⋮), in Foundations' dropdown with
          MO1.1.2.1's 36 pt rows. The folder lock: cards only render in an
          open folder, the menu closes the moment its folder shuts (the
          five-minute window lapsing), and a pick re-checks the folder, so no
          action reads or writes a shut folder's entries. */}
      <PopupMenu<"edit" | "delete">
        open={!!entryMenu && entryFolderOpen}
        onClose={() => setEntryMenu(null)}
        anchor={entryMenu?.anchor ?? null}
        rowLineHeight={MENU_ROW_LINE}
        options={[
          { value: "edit", label: t("Edit"), icon: <Pencil size={15} strokeWidth={1.75} /> },
          { value: "delete", label: t("Delete"), icon: <Trash2 size={15} strokeWidth={1.75} />, destructive: true },
        ]}
        onSelect={(v) => {
          if (!entryMenuEntry) return;
          if (v === "edit") startEdit(entryMenuEntry);
          else setConfirmDelete(entryMenuEntry);
        }}
      />

      {/* S7: "Delete this entry?" (handover), the entry's title under it
          (ours); then the entry leaves at once with an Undo toast for 5 s,
          and the server delete runs when the toast expires. */}
      <ConfirmCard
        open={!!confirmDelete}
        title={t("Delete this entry?")}
        subtitle={confirmDelete?.title}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) startDelete(confirmDelete);
          setConfirmDelete(null);
        }}
      />
      <Toast
        key={pendingDelete?.id ?? "none"}
        open={!!pendingDelete}
        message={t("Entry deleted.")}
        icon={<Trash2 size={15} className="shrink-0 text-[#A2C8C2]" aria-hidden />}
        onUndo={() => {
          pendingRef.current = null;
          setPendingDelete(null);
        }}
        onExpire={() => commitDelete(pendingRef.current)}
      />
      {/* O3: a failed write (folder add / rename / move / delete, entry delete). */}
      <Toast
        open={!!failToast && !pendingDelete}
        message={t(SAVE_FAILED)}
        tone="error"
        onExpire={() => setFailToast(0)}
      />

      {/* Delete is not linked on the board; deleting a folder deletes its
          entries, so the shared confirmation asks first (data safety). */}
      <ConfirmCard
        open={deletingFolder && !!selectedFolder}
        title={t("Delete this folder?")}
        subtitle={
          selectedFolder
            ? tn(entries.length, "{folder} and its {n} entry", "{folder} and its {n} entries", { folder: selectedFolder.name })
            : undefined
        }
        onCancel={() => setDeletingFolder(false)}
        onConfirm={() => {
          if (selectedFolder) void removeJournalFolder(selectedFolder.id).then(fail);
          setDeletingFolder(false);
        }}
      />

      {/* MO1.1.2.3: the entry sheet. The date is set automatically (today for
          a new entry; an edit keeps the day it was written). */}
      <BottomSheet
        open={composing}
        onClose={resetCompose}
        title={editingEntry ? t("Edit entry") : t("New entry")}
        // MO1.1.2.3: Save sits 30 above the sheet's bottom (Foundations ›
        // Lavender-header sheet, footer padding 12 × 20 × 30).
        footerBottom={30}
        footer={
          <>
            {/* Saving: Pinned CTA loading (spinner for the icon, label kept). */}
            <CtaButton
              label={editingEntry ? t("Save changes") : t("Save entry")}
              onClick={() => void save()}
              loading={saving}
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
            <span className={fieldLabel}>{t("Folder")}</span>
            <button
              ref={setPickerEl}
              type="button"
              onClick={() => setMenu("picker")}
              aria-haspopup="menu"
              aria-expanded={menu === "picker"}
              className={`tap flex items-center gap-2 px-3 text-start font-semibold ${field} ${FOCUS_RING}`}
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
            <span className={fieldLabel}>{t("Date")}</span>
            {/* Read-only: the value 14/400 in #5B5349 (text.secondary),
                measured. */}
            <div className={`flex items-center gap-2 px-3 ${field} !text-charcoal-soft`}>
              <CalendarDays size={15} strokeWidth={1.75} className="flex-none text-charcoal-faint" />
              <span className="truncate">{dateLabel(editingEntry?.date ?? today)}</span>
            </div>
          </div>
        </div>

        <label className="block mt-4">
          <span className={fieldLabel}>{t("Title")}</span>
          {/* Foundations › Inputs: 14/600, placeholder text.muted (the frame's
              "Entry title…" is the 600 weight, measured). */}
          <input
            autoFocus
            value={title}
            maxLength={JOURNAL_LIMITS.titleMax}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("Entry title…")}
            aria-invalid={titleMissing || undefined}
            className={`${field} px-3.5 font-semibold placeholder:text-charcoal-faint ${FOCUS_RING} ${titleMissing ? FIELD_ERROR : ""}`}
          />
          {titleMissing && <span role="alert" className={errorLine}>{t("Add a title.")}</span>}
        </label>

        {/* The frame leaves 24 between the Entry field and Save (measured);
            the sheet's body (20) and footer (12) paddings give 32. */}
        <label className="block mt-4 -mb-2">
          <span className={fieldLabel}>{t("Entry")}</span>
          {/* The frame's two-line placeholder, the Arabic line set right-to-left.
              A native placeholder can't give one line its own direction, so
              this sits over the empty field instead. */}
          <div className="relative">
            <textarea
              value={text}
              maxLength={JOURNAL_LIMITS.bodyMax}
              onChange={(e) => setText(e.target.value)}
              aria-invalid={textMissing || undefined}
              className={`block w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3.5 text-sm text-charcoal resize-none ${FOCUS_RING} ${textMissing ? FIELD_ERROR : ""}`}
              // MO1.1.2.3 draws the Entry field 376 tall; the sheet body
              // scrolls inside on a short screen.
              style={{ height: 376 }}
            />
            {!text && (
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 px-[17px] py-[15px] text-sm text-charcoal-faint">
                <span className="block">{t("How was your day?")}</span>
                {/* The frame's second, Arabic line; in Arabic the first line already is. */}
                {getLanguage() === "en" && (
                  <span className="block mt-1.5 text-end" dir="rtl">
                    شو صار معك اليوم؟
                  </span>
                )}
              </div>
            )}
          </div>
          {textMissing && <span role="alert" className={errorLine}>{t("Write something first.")}</span>}
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

      {/* Stage 3: the password, mounted only while it's being asked for. */}
      {asking && (
        <JournalPasswordPopup
          purpose={asking.purpose}
          folderName={asking.folder.name}
          onClose={() => setAsking(null)}
          onSubmit={onPassword}
        />
      )}

      {/* Round E: Play your music while writing (the Mind favourite, or the music app). */}
      <MusicSection moment="mind" className="mt-6 mb-4" />
    </div>
  );
}
