import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ArrowUpDown, BookOpen, Check, ChevronDown, Clock, EllipsisVertical, Folder, FolderCog, FolderPlus, Loader2, Lock, LockOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { useFreeLimit } from "../../../components/premium/useFreeLimit";
import { lockedFolderCount } from "../../../services/premium/g2";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { Toast } from "../../../components/ui/Toast";
import { MusicSection } from "../../../components/music/MusicSection";
import { JournalPasswordPopup, LockedFolderView, type PasswordPurpose } from "../../../components/mind/JournalLock";
import { entryMenuTarget } from "../../../components/mind/entryMenu";
import { JOURNAL_LIMITS, folderLockAuth, type FolderLockAuth } from "../../../services/journal";
import { isFolderOpen, type UnlockWindows } from "../../../services/journal/lockLogic";
import { shiftDate } from "../../../utils/date";
import type { JournalEntry, JournalFolder } from "../../../types";
import { appLocale } from "../../../i18n/format";
import { t, tk, tn, tx } from "../../../i18n/core";
import { JournalPrompts } from "../journal/JournalPrompts";
import { MindSectionWeb } from "./MindSectionWeb";
import { mindCaps } from "./mindWebStyles";
import { useEscCancel } from "./useEscCancel";

type FolderOption = "rename" | "move" | "lock" | "unlock" | "delete";
/** What the editor pane shows: a new entry (into a folder, maybe with a prompt's heading) or an entry being edited. */
type Open = { mode: "new"; folderId: string; title?: string } | { mode: "edit"; id: string };

// As JournalTab: the windows map only holds live windows, so render stays pure.
const openNow = (f: JournalFolder | undefined, windows: UnlockWindows) => isFolderOpen(f, windows, Number.NEGATIVE_INFINITY);
const RECENT = "recently";
const SAVE_FAILED = tk("Couldn't save. Try again.");
const QUICK_FOLDERS = [tk("Personal"), tk("Training"), tk("Nutrition")];
const MENU_ROW_LINE = 16;
const rule = "rgba(36,31,27,0.08)";

const dateLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(appLocale("en-US"), { weekday: "short", month: "short", day: "numeric" });
const timeLabel = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString(appLocale("en-US"), { hour: "numeric", minute: "2-digit" });
};

const CSS = `
.jr-web-row:hover { background: #F5F5F6; }
.jr-web-row[aria-current="true"]:hover { background: #F0EDF9; }
.jr-web-card { transition: background-color .15s, border-color .15s; }
.jr-web-card:hover { border-color: rgba(174,161,220,0.6) !important; }
.jr-web-icon:hover:not(:disabled) { background: #F5F5F6; }
.jr-web-row:focus-visible, .jr-web-card:focus-visible, .jr-web-icon:focus-visible, .jr-web-btn:focus-visible { outline: 2px solid #AEA1DC; outline-offset: 2px; }
.jr-web-title::placeholder, .jr-web-body::placeholder { color: #B8B2AB; opacity: 1; }
.jr-web-title:focus, .jr-web-body:focus { outline: none; }
`;

/**
 * Website viewport v1, WC-MI.2 Journal (WC-MI Mind Web v5, screen "journal",
 * literal values; REPO CHANGED, so built from today's mobile Journal with the
 * global rules, Play your music included). Header CTA New entry. A 20 : 25 :
 * 55 grid filling the window under the header (100dvh less 64 + 24 + 24;
 * at least 640, 560 with the rail), 24 apart, each column scrolling inside:
 *
 * - Folders: the caps label on a 36 row with New folder (FolderPlus 18
 *   #6B41EF in a 36 r10 box, #F0EDF9 while the field is open) and Folder
 *   options (the mobile FolderCog menu: Rename, Move, Lock / Remove lock,
 *   Delete; off on Recently); the new-folder field (44 r12 #F5F5F6); 48 rows
 *   r12 (Clock / Folder 18, the name 15, the lock 13, the count 13/600
 *   #8C8378; the current one #F0EDF9 with #5F5093 700), Recently first as the
 *   reference draws it.
 * - Entries: the folder's caps label, then cards (r14, pad 12 14, 8 apart:
 *   the title 15/22 700 and its ⋮, two lines 13/20 #5B5349, the date line
 *   13/20 600 #8C8378; the open one #FAF9FD with a 1px #AEA1DC border, else
 *   white with #241F1B at 8%). Empty: the #F5F5F6 r20 note. A locked folder
 *   shows the mobile locked view.
 * - The editor (r20, 0.5px border, pad 24, 12 apart): the folder pill (r999
 *   #F0EDF9 #5F5093 13/700, opens the folder picker), Saved (#3C6B65) or
 *   Save at the end, the title 28/36 700 (-0.5px), the date 13/600 and the
 *   body 17/28, both at most 68ch; placeholders #B8B2AB. Save follows the
 *   mobile rules (title and body needed, a shut folder asks the password).
 *   Play your music at the foot of the pane, at most 420 wide.
 *
 * Same data and actions as mobile: the entry ⋮ (or right-click) has Edit /
 * Delete, Delete asks first then offers Undo for 5 s; folders and the lock
 * work as on mobile (Move: click where the folder should go, or the arrow
 * keys).
 */
export default function JournalWeb() {
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
  const { blocked } = useFreeLimit();
  const { rail } = useWebLayout();
  const [activeFolder, setActiveFolder] = useState(RECENT);
  const [open, setOpen] = useState<Open | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<JournalEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<JournalEntry | null>(null);
  const pendingRef = useRef<JournalEntry | null>(null);
  const [failToast, setFailToast] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [naming, setNaming] = useState<"new" | "rename" | null>(null);
  const [folderName, setFolderName] = useState("");
  const [menu, setMenu] = useState<"options" | null>(null);
  const [cogEl, setCogEl] = useState<HTMLButtonElement | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [moving, setMoving] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [entryMenu, setEntryMenu] = useState<{ entry: JournalEntry; anchor: HTMLElement } | null>(null);
  // Round K: how this account opens a lock (its password, or an emailed code
  // when it has none); null hides Lock.
  const [lockAuth, setLockAuth] = useState<FolderLockAuth | null>(null);
  const canLock = !!lockAuth;
  // Set when the server says the account has a password after all (ATXB2).
  const [lockNotice, setLockNotice] = useState<string | undefined>(undefined);
  const [asking, setAsking] = useState<{ purpose: PasswordPurpose; folder: JournalFolder; then?: () => void } | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  // Where focus goes back when a confirmation closes: the ⋮ (or the folder options) that led to it.
  const returnEl = useRef<HTMLElement | null>(null);
  useEscCancel(!!confirmDelete, () => setConfirmDelete(null), () => returnEl.current);
  useEscCancel(deletingFolder, () => setDeletingFolder(false), () => returnEl.current);

  useEffect(() => {
    let live = true;
    void folderLockAuth().then((auth) => {
      if (live) setLockAuth(auth);
    });
    return () => {
      live = false;
    };
  }, []);

  // Move: focus stays on the folder list (the arrow keys move at once); a click outside the list ends it.
  useEffect(() => {
    if (!moving) return;
    listRef.current?.querySelector<HTMLElement>('[aria-current="true"]')?.focus();
    const onDown = (e: PointerEvent) => {
      if (!listRef.current?.contains(e.target as Node)) setMoving(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [moving]);

  // The selection follows the list (as mobile): a folder that's gone falls back to Recently.
  const recent = activeFolder === RECENT || !journalFolders.some((f) => f.id === activeFolder);
  const selected = recent ? RECENT : activeFolder;
  const selectedIndex = journalFolders.findIndex((f) => f.id === selected);
  const selectedFolder = journalFolders[selectedIndex];
  const selectedShut = !!selectedFolder && !openNow(selectedFolder, journalUnlockedUntil);
  const targetFolder = recent ? journalFolders[0] : selectedFolder;
  const targetShut = !!targetFolder && !openNow(targetFolder, journalUnlockedUntil);

  const fail = (message: string | null) => {
    if (message) setFailToast((n) => n + 1);
  };

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
      if (pendingRef.current) void removeRef.current(pendingRef.current.id);
    },
    []
  );
  const startDelete = (entry: JournalEntry) => {
    commitDelete(pendingRef.current);
    pendingRef.current = entry;
    setPendingDelete(entry);
    setOpen((o) => (o?.mode === "edit" && o.id === entry.id ? null : o));
  };

  const askPassword = (purpose: PasswordPurpose, folder: JournalFolder, then?: () => void) => {
    setLockError(null);
    setAsking({ purpose, folder, then });
  };
  const onPassword = async (secret: string) => {
    if (!asking) return null;
    const via = lockAuth?.method ?? "password";
    const result = asking.purpose === "remove" ? await disableJournalFolderLock(asking.folder.id, secret, via) : await unlockJournalFolder(asking.folder.id, secret, via);
    if (!result.ok && result.code === "ATXB2" && lockAuth) {
      setLockNotice(result.message);
      setLockAuth({ ...lockAuth, method: "password" });
      return null;
    }
    if (!result.ok) return result.message;
    const then = asking.then;
    setAsking(null);
    then?.();
    return null;
  };

  const since = shiftDate(today, -30);
  const visible = journalEntries.filter((e) => e.id !== pendingDelete?.id);
  const entries = visible.filter((e) => (recent ? e.date >= since : e.folderId === selected)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const folderOf = (id: string) => journalFolders.find((f) => f.id === id);

  const entryMenuEntry = entryMenuTarget(entryMenu?.entry.id, entries, selectedFolder, journalUnlockedUntil);
  if (entryMenu && !entryMenuEntry) setEntryMenu(null);

  // The editor: the open entry, else the folder's newest, else a new one (when there's a folder to write into).
  const openEntry = open?.mode === "edit" ? visible.find((e) => e.id === open.id) : undefined;
  const shown: Open | null =
    open?.mode === "new"
      ? open
      : openEntry
        ? { mode: "edit", id: openEntry.id }
        : !selectedShut && entries[0]
          ? { mode: "edit", id: entries[0].id }
          : targetFolder && !selectedShut
            ? { mode: "new", folderId: targetFolder.id }
            : null;
  const shownEntry = shown?.mode === "edit" ? visible.find((e) => e.id === shown.id) : undefined;

  const openNew = (title?: string) => {
    if (!targetFolder) return;
    const go = () => setOpen({ mode: "new", folderId: targetFolder.id, title });
    if (targetShut) askPassword("write", targetFolder, go);
    else go();
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
      setMoving(true);
    } else if (opt === "lock" && selectedFolder) {
      if (blocked("locked_journal_folders", lockedFolderCount(journalFolders))) return;
      setLockError(null);
      void lockJournalFolder(selectedFolder.id).then(setLockError);
    } else if (opt === "unlock" && selectedFolder) {
      askPassword("remove", selectedFolder);
    } else if (opt === "delete" && selectedFolder) {
      returnEl.current = cogEl;
      if (selectedShut) askPassword("delete", selectedFolder, () => setDeletingFolder(true));
      else setDeletingFolder(true);
    }
  };

  const pickFolder = (key: string) => {
    if (!moving) {
      setActiveFolder(key);
      setOpen(null);
      return;
    }
    const to = journalFolders.findIndex((f) => f.id === key);
    if (selectedFolder && to >= 0 && to !== selectedIndex) void moveJournalFolder(selectedFolder.id, to - selectedIndex).then(fail);
    setMoving(false);
  };

  // Move from the keyboard: Up / Down step the folder; Enter, Space or Escape ends the move.
  const onListKey = (e: KeyboardEvent) => {
    if (!moving || !selectedFolder) return;
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      void moveJournalFolder(selectedFolder.id, e.key === "ArrowUp" ? -1 : 1).then(fail);
    } else if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setMoving(false);
    }
  };

  const retry = async () => {
    setRetrying(true);
    await reloadJournal();
    setRetrying(false);
  };

  const iconBtn = (on: boolean): CSSProperties => ({ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", flex: "none", background: on ? "#F0EDF9" : "transparent", color: "#6B41EF" });

  const folderRow = (key: string, name: string, Icon: typeof Folder, count: number | null, f?: JournalFolder) => {
    const on = key === selected;
    const ink = on ? "#5F5093" : "#241F1B";
    const shut = !!f && !openNow(f, journalUnlockedUntil);
    return (
      <button
        key={key}
        type="button"
        data-jr-folder
        aria-current={on ? "true" : undefined}
        onClick={() => pickFolder(key)}
        className="jr-web-row flex items-center text-start"
        style={{ height: 48, flex: "none", gap: 10, padding: "0 12px", borderRadius: 12, background: on ? "#F0EDF9" : "transparent", opacity: moving && key === RECENT ? 0.5 : 1 }}
      >
        <Icon size={18} color={ink} aria-hidden />
        <span className="truncate" style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: "24px", fontWeight: on ? 700 : 500, color: ink }}>
          {name}
        </span>
        {f?.locked &&
          (shut ? <Lock size={13} color="#8C8378" role="img" aria-label={t("Locked")} /> : <LockOpen size={13} color="#8C8378" role="img" aria-label={t("Unlocked")} />)}
        {count !== null && <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#8C8378", fontVariantNumeric: "tabular-nums" }}>{count}</span>}
      </button>
    );
  };

  const recentCount = visible.filter((e) => e.date >= since).length;

  return (
    <MindSectionWeb
      title={t("Journal")}
      sub={t("Your thoughts, logged")}
      cta={{ label: t("New entry"), onClick: () => openNew(), disabled: !targetFolder }}
      fill
    >
      <style href="jr-web" precedence="default">{CSS}</style>
      {journalError && (
        <div role="alert" className="flex items-center" style={{ flex: "none", gap: 12, padding: "10px 16px", borderRadius: 12, background: "#FCEDEC" }}>
          <p style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#B4372C" }}>{t("Couldn't load. Check your connection.")}</p>
          <button type="button" onClick={() => void retry()} disabled={retrying} className="jr-web-btn" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#B4372C", borderRadius: 6 }}>
            {retrying ? <Loader2 size={14} className="animate-spin" aria-label={t("Retrying")} /> : t("Retry")}
          </button>
        </div>
      )}

      <div data-jr-grid style={{ flex: "none", height: "calc(100dvh - 112px)", minHeight: rail ? 560 : 640, display: "grid", gridTemplateColumns: "minmax(0,20fr) minmax(0,25fr) minmax(0,55fr)", gridTemplateRows: "minmax(0,1fr)", gap: 24 }}>
        {/* Folders */}
        <aside data-jr-folders className="flex flex-col" style={{ minWidth: 0, minHeight: 0, gap: 10 }}>
          <div className="flex items-center" style={{ flex: "none", height: 36, gap: 4 }}>
            <p style={{ ...mindCaps, flex: 1, minWidth: 0 }}>{t("Folders")}</p>
            <button
              type="button"
              ref={setCogEl}
              onClick={() => setMenu("options")}
              disabled={recent || journalLoading}
              aria-label={t("Folder options")}
              title={t("Folder options")}
              aria-haspopup="menu"
              aria-expanded={menu === "options"}
              className="jr-web-icon"
              style={{ ...iconBtn(menu === "options"), opacity: recent ? 0.4 : 1 }}
            >
              <FolderCog size={18} strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => {
                setFolderName("");
                setNaming((v) => (v === "new" ? null : "new"));
              }}
              disabled={journalLoading}
              aria-label={t("New folder")}
              title={t("New folder")}
              aria-expanded={naming === "new"}
              className="jr-web-icon"
              style={iconBtn(naming === "new")}
            >
              <FolderPlus size={18} aria-hidden />
            </button>
          </div>
          {naming && (
            <div className="flex" style={{ flex: "none", gap: 6 }}>
              <input
                autoFocus
                value={folderName}
                maxLength={JOURNAL_LIMITS.folderMax}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && folderName.trim()) submitName();
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setNaming(null);
                  }
                }}
                placeholder={t("Folder name…")}
                aria-label={naming === "rename" ? t("Rename folder") : t("New folder name")}
                style={{ flex: 1, minWidth: 0, height: 44, borderRadius: 12, background: "#F5F5F6", padding: "0 12px", fontSize: 15, color: "#241F1B", border: "1px solid transparent" }}
                className="focus:outline-none focus:!border-[#AEA1DC]"
              />
              <button type="button" onClick={submitName} className="jr-web-btn" style={{ height: 44, padding: "0 12px", borderRadius: 12, background: "#9A8CD6", color: "#FFFFFF", fontSize: 15, fontWeight: 600, flex: "none" }}>
                {naming === "rename" ? t("Save") : t("Add")}
              </button>
            </div>
          )}
          {moving && selectedFolder && (
            <p role="status" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
              {t("Click where {folder} should go", { folder: selectedFolder.name })}
            </p>
          )}
          {journalLoading ? (
            <div aria-hidden className="flex flex-col" style={{ gap: 4 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-cream-soft animate-skeleton-pulse" style={{ height: 48, borderRadius: 12 }} />
              ))}
            </div>
          ) : (
            journalFolders.length > 0 && (
              <div ref={listRef} onKeyDown={onListKey} className="flex flex-col mind-web-noscroll" style={{ minHeight: 0, overflowY: "auto", flex: "0 1 auto" }}>
                {folderRow(RECENT, t("Recently"), Clock, recentCount)}
                {journalFolders.map((f) => folderRow(f.id, f.name, Folder, openNow(f, journalUnlockedUntil) ? visible.filter((e) => e.folderId === f.id).length : null, f))}
              </div>
            )
          )}
        </aside>

        {/* Entries */}
        <div data-jr-entries className="flex flex-col" style={{ minWidth: 0, minHeight: 0, gap: 10 }}>
          <div className="flex items-center" style={{ flex: "none", height: 36 }}>
            {journalFolders.length > 0 && <p className="truncate" style={mindCaps}>{recent ? t("Recently") : selectedFolder?.name}</p>}
          </div>
          {journalFolders.length > 0 && <JournalPrompts onWrite={(heading) => openNew(heading)} />}
          {lockError && (
            <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#B4372C" }}>
              {lockError}
            </p>
          )}
          {journalLoading ? (
            <div aria-busy="true" className="flex flex-col" style={{ gap: 8 }}>
              <span className="sr-only" role="status">{t("Loading your journal…")}</span>
              {[0, 1, 2].map((i) => (
                <div key={i} aria-hidden className="bg-cream-soft animate-skeleton-pulse" style={{ height: 96, borderRadius: 14 }} />
              ))}
            </div>
          ) : journalFolders.length === 0 ? (
            !journalError && (
              <div data-jr-nofolders className="flex flex-col items-center text-center" style={{ borderRadius: 20, background: "#F5F5F6", padding: "32px 20px", gap: 6 }}>
                <BookOpen size={28} strokeWidth={1.5} color="#AEA1DC" aria-hidden />
                <p style={{ margin: "6px 0 0", fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{t("No folders yet")}</p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{t("Entries live in folders. Make the first one to start writing.")}</p>
                <div className="flex flex-wrap justify-center" style={{ gap: 8, marginTop: 8 }}>
                  {QUICK_FOLDERS.map((key) => t(key)).map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => void addJournalFolder(name).then(fail)}
                      className="jr-web-btn flex items-center"
                      style={{ height: 36, gap: 6, padding: "0 14px", borderRadius: 999, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.11)", fontSize: 13, fontWeight: 600, color: "#5B5349" }}
                    >
                      {name}
                      <Plus size={13} color="#8C8378" aria-hidden />
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : selectedShut && selectedFolder ? (
            <LockedFolderView folderName={selectedFolder.name} onUnlock={() => askPassword("unlock", selectedFolder)} />
          ) : entries.length > 0 ? (
            <div className="flex flex-col mind-web-noscroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", gap: 8 }}>
              {entries.map((e) => {
                const on = shown?.mode === "edit" && shown.id === e.id;
                const folder = recent ? folderOf(e.folderId)?.name : undefined;
                const when = [dateLabel(e.date), timeLabel(e.createdAt), folder].filter(Boolean).join(" · ");
                return (
                  <div
                    key={e.id}
                    role="button"
                    tabIndex={0}
                    data-jr-entry
                    aria-current={on ? "true" : undefined}
                    aria-label={t("{date}, {title}. Open", { date: dateLabel(e.date), title: e.title })}
                    onClick={() => setOpen({ mode: "edit", id: e.id })}
                    onKeyDown={(ev) => {
                      if ((ev.key === "Enter" || ev.key === " ") && ev.target === ev.currentTarget) {
                        ev.preventDefault();
                        setOpen({ mode: "edit", id: e.id });
                      }
                    }}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      setEntryMenu({ entry: e, anchor: ev.currentTarget });
                    }}
                    className="jr-web-card"
                    style={{ flex: "none", borderRadius: 14, padding: "12px 14px", cursor: "pointer", background: on ? "#FAF9FD" : "#FFFFFF", border: `1px solid ${on ? "#AEA1DC" : rule}` }}
                  >
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <span className="truncate" style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: "22px", fontWeight: 700, color: "#241F1B" }}>
                        {e.title}
                      </span>
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setEntryMenu({ entry: e, anchor: ev.currentTarget });
                        }}
                        aria-label={t("{title}, more options", { title: e.title })}
                        aria-haspopup="menu"
                        aria-expanded={entryMenu?.entry.id === e.id}
                        className="jr-web-icon grid place-items-center"
                        style={{ width: 24, height: 24, borderRadius: 6, flex: "none", marginInlineEnd: -4 }}
                      >
                        <EllipsisVertical size={16} color="#8C8378" aria-hidden />
                      </button>
                    </div>
                    <p
                      style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", color: "#5B5349", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                    >
                      {e.text}
                    </p>
                    <p className="truncate" style={{ margin: "6px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#8C8378" }}>
                      {when}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div data-jr-empty className="grid place-items-center text-center" style={{ flex: "none", borderRadius: 20, background: "#F5F5F6", padding: "40px 24px" }}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>
                {recent ? t("Nothing in the last 30 days") : `${t("No entries in {folder} yet", { folder: selectedFolder?.name ?? "" })}. ${t("Write your first one")}`}
              </p>
            </div>
          )}
        </div>

        {/* Editor */}
        <section data-jr-editor className="flex flex-col" style={{ minWidth: 0, minHeight: 0, borderRadius: 20, border: "0.5px solid rgba(36,31,27,0.1)", padding: 24, boxSizing: "border-box", gap: 12 }}>
          {shown && !journalLoading ? (
            <EditorPane
              key={shown.mode === "edit" ? shown.id : `new-${shown.folderId}-${shown.title ?? ""}`}
              entry={shownEntry}
              initialFolderId={shown.mode === "edit" ? shownEntry?.folderId ?? "" : shown.folderId}
              initialTitle={shown.mode === "new" ? shown.title ?? "" : shownEntry?.title ?? ""}
              today={today}
              folders={journalFolders}
              isOpen={(id) => openNow(folderOf(id), journalUnlockedUntil)}
              askWrite={(folder, then) => askPassword("write", folder, then)}
              onSave={async (folderId, title, text) =>
                shownEntry ? updateJournalEntry(shownEntry.id, { title, text, folderId }) : addJournalEntry(folderId, title, text)
              }
              onSaved={() => setOpen(null)}
            />
          ) : (
            // No folder to write into yet: the entries column asks for the first one.
            <span aria-hidden style={{ flex: 1 }} />
          )}
          {/* Round E: Play your music while writing (the Mind favourite, or the music app), under the editor. */}
          <MusicSection moment="mind" style={{ flex: "none", maxWidth: 420, width: "100%" }} />
        </section>
      </div>

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
      <PopupMenu<"edit" | "delete">
        open={!!entryMenu && !!entryMenuEntry}
        onClose={() => setEntryMenu(null)}
        anchor={entryMenu?.anchor ?? null}
        rowLineHeight={MENU_ROW_LINE}
        options={[
          { value: "edit", label: t("Edit"), icon: <Pencil size={15} strokeWidth={1.75} /> },
          { value: "delete", label: t("Delete"), icon: <Trash2 size={15} strokeWidth={1.75} />, destructive: true },
        ]}
        onSelect={(v) => {
          if (!entryMenuEntry) return;
          if (v === "edit") setOpen({ mode: "edit", id: entryMenuEntry.id });
          else {
            returnEl.current = entryMenu?.anchor ?? null;
            setConfirmDelete(entryMenuEntry);
          }
        }}
      />
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
      <Toast open={!!failToast && !pendingDelete} message={t(SAVE_FAILED)} tone="error" onExpire={() => setFailToast(0)} />
      <ConfirmCard
        open={deletingFolder && !!selectedFolder}
        title={t("Delete this folder?")}
        subtitle={selectedFolder ? tn(entries.length, "{folder} and its {n} entry", "{folder} and its {n} entries", { folder: selectedFolder.name }) : undefined}
        onCancel={() => setDeletingFolder(false)}
        onConfirm={() => {
          if (selectedFolder) void removeJournalFolder(selectedFolder.id).then(fail);
          setDeletingFolder(false);
          setOpen(null);
        }}
      />
      {asking && (
        <JournalPasswordPopup
          key={lockAuth?.method ?? "password"}
          purpose={asking.purpose}
          folderName={asking.folder.name}
          onClose={() => {
            setAsking(null);
            setLockNotice(undefined);
          }}
          onSubmit={onPassword}
          method={lockAuth?.method}
          email={lockAuth?.email}
          notice={lockNotice}
        />
      )}
    </MindSectionWeb>
  );
}

/** The editor pane's content (keyed by the entry, so its fields start from it). */
function EditorPane({
  entry,
  initialFolderId,
  initialTitle,
  today,
  folders,
  isOpen,
  askWrite,
  onSave,
  onSaved,
}: {
  entry: JournalEntry | undefined;
  initialFolderId: string;
  initialTitle: string;
  today: string;
  folders: JournalFolder[];
  isOpen: (folderId: string) => boolean;
  askWrite: (folder: JournalFolder, then: () => void) => void;
  onSave: (folderId: string, title: string, text: string) => Promise<string | null>;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(entry?.text ?? "");
  const [folderId, setFolderId] = useState(initialFolderId);
  const [picker, setPicker] = useState(false);
  const [pickerEl, setPickerEl] = useState<HTMLButtonElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [savedNow, setSavedNow] = useState(false);
  const dirty = title !== (entry?.title ?? "") || text !== (entry?.text ?? "") || folderId !== (entry?.folderId ?? initialFolderId);
  const folder = folders.find((f) => f.id === folderId) ?? folders.find((f) => f.id === initialFolderId);

  const save = async (afterUnlock = false) => {
    if (saving) return;
    if (!title.trim() || !text.trim()) {
      setTried(true);
      return;
    }
    const target = folders.find((f) => f.id === folderId) ?? folders[0];
    if (!target) return;
    if (!afterUnlock && !isOpen(target.id)) {
      askWrite(target, () => void save(true));
      return;
    }
    setSaving(true);
    setSaveError(null);
    const failed = await onSave(target.id, title.trim(), text.trim());
    setSaving(false);
    if (failed) setSaveError(failed);
    else if (entry) {
      setTitle(title.trim());
      setText(text.trim());
      setSavedNow(true);
    }
    else onSaved();
  };

  const titleMissing = tried && !title.trim();
  const textMissing = tried && !text.trim();
  const errorLine: CSSProperties = { margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#B4372C" };

  return (
    <div
      className="flex flex-col"
      style={{ flex: 1, minHeight: 0, gap: 12 }}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          void save();
        }
      }}
    >
      <div className="flex items-center" style={{ flex: "none", gap: 8, minHeight: 32 }}>
        <button
          type="button"
          ref={setPickerEl}
          data-jr-folder-pill
          onClick={() => setPicker(true)}
          aria-haspopup="menu"
          aria-expanded={picker}
          aria-label={`${t("Folder")}: ${folder?.name ?? ""}`}
          className="jr-web-btn flex items-center"
          style={{ maxWidth: "60%", gap: 4, borderRadius: 999, padding: "3px 8px 3px 10px", background: "#F0EDF9", color: "#5F5093", fontSize: 13, lineHeight: "20px", fontWeight: 700 }}
        >
          <span className="truncate">{folder?.name}</span>
          <ChevronDown size={13} aria-hidden />
        </button>
        <span style={{ marginInlineStart: "auto" }} />
        {dirty || !entry ? (
          <button
            type="button"
            data-jr-save
            onClick={() => void save()}
            disabled={saving}
            className="jr-web-btn flex items-center"
            style={{ height: 32, gap: 6, padding: "0 14px", borderRadius: 10, background: "#9A8CD6", color: "#FFFFFF", fontSize: 13, lineHeight: "20px", fontWeight: 700, whiteSpace: "nowrap" }}
          >
            {saving && <Loader2 size={13} className="animate-spin" aria-hidden />}
            {entry ? t("Save changes") : t("Save entry")}
          </button>
        ) : (
          <span role={savedNow ? "status" : undefined} className="flex items-center whitespace-nowrap" style={{ gap: 5, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#3C6B65" }}>
            <Check size={13} strokeWidth={2.6} aria-hidden />
            {t("Saved")}
          </span>
        )}
      </div>
      <input
        value={title}
        maxLength={JOURNAL_LIMITS.titleMax}
        onChange={(e) => {
          setTitle(e.target.value);
          setSavedNow(false);
        }}
        placeholder={t("Entry title…")}
        aria-label={t("Title")}
        aria-invalid={titleMissing || undefined}
        className="jr-web-title"
        style={{ flex: "none", width: "100%", maxWidth: "68ch", margin: 0, padding: 0, border: "none", background: "transparent", fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.5px", color: "#241F1B" }}
      />
      {titleMissing && <p role="alert" style={errorLine}>{t("Add a title.")}</p>}
      <p style={{ margin: 0, flex: "none", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#8C8378" }}>
        {dateLabel(entry?.date ?? today)}
        {entry ? ` · ${timeLabel(entry.createdAt)}` : ""}
      </p>
      <textarea
        value={text}
        maxLength={JOURNAL_LIMITS.bodyMax}
        onChange={(e) => {
          setText(e.target.value);
          setSavedNow(false);
        }}
        placeholder={t("How was your day?")}
        aria-label={t("Entry")}
        aria-invalid={textMissing || undefined}
        className="jr-web-body mind-web-noscroll"
        style={{ flex: 1, minHeight: 160, width: "100%", maxWidth: "68ch", margin: 0, padding: 0, border: "none", background: "transparent", resize: "none", fontSize: 17, lineHeight: "28px", color: "#241F1B" }}
      />
      {textMissing && <p role="alert" style={errorLine}>{t("Write something first.")}</p>}
      {saveError && <p role="alert" style={errorLine}>{saveError}</p>}
      <PopupMenu<string>
        open={picker}
        onClose={() => setPicker(false)}
        anchor={pickerEl}
        rowLineHeight={MENU_ROW_LINE}
        align="left"
        width={200}
        options={folders.map((f) => ({ value: f.id, label: f.name }))}
        selected={folderId}
        onSelect={(id) => {
          setFolderId(id);
          setSavedNow(false);
        }}
      />
    </div>
  );
}
