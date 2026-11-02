import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FolderPlus, FolderTree, Palette, Pencil, Plus, Trash2 } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { Button } from "../../ui/Button";
import { PopupMenu } from "../../ui/PopupMenu";
import { useApp } from "../../../context/AppContext";
import { ColorPopover, ColorSwatches, FolderHeader, InsertionLine, Placeholder } from "../../folders/FolderParts";
import { folderColorOptions, withPlaceholder } from "../../folders/folderList";
import { folderFamily, themedFamily } from "../../../data/folderColors";
import { useIsDark } from "../../../hooks/useIsDark";
import { moveId } from "../../../services/routines/order";
import { MAX_DEPTH_NOTE, canAddSubfolder, canMoveFolder } from "../../../services/routines/folderDepth";
import { useRoutineDrag, type DragItem, type DropTarget } from "../../../pages/workout/useRoutineDrag";
import type { WorkoutTemplate, WorkoutTemplateFolder } from "../../../types";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { t, tk, tn } from "../../../i18n/core";

/**
 * Release 3 · W5: the template folders, ported whole from the old
 * the old template builder tab (FINAL_PLAN W5 "folders keep Rename, Edit colour,
 * Add subfolder, Add template, Delete"). The same AppContext
 * workoutTemplateFolders functions, FolderParts, folderList and the Routines
 * tab's useRoutineDrag: folders drag above, below or inside another folder
 * (five levels at most, never into itself: folderDepth), templates are not
 * dragged (they have no stored order). The folder ⋮ greys Add subfolder with
 * MAX_DEPTH_NOTE at the depth limit.
 */
type FolderAction = "rename" | "color" | "subfolder" | "template" | "delete";
const MENU_ICON = 15;
const FOLDER_MENU: { value: FolderAction; label: string; icon: React.ReactNode; destructive?: boolean }[] = [
  { value: "rename", label: tk("Rename"), icon: <Pencil size={MENU_ICON} /> },
  { value: "color", label: tk("Edit color"), icon: <Palette size={MENU_ICON} /> },
  { value: "subfolder", label: tk("Add subfolder"), icon: <FolderTree size={MENU_ICON} /> },
  { value: "template", label: tk("Add template"), icon: <Plus size={MENU_ICON} /> },
  { value: "delete", label: tk("Delete"), icon: <Trash2 size={MENU_ICON} />, destructive: true },
];

export const TemplateFolders: React.FC<{
  templates: WorkoutTemplate[];
  renderTemplate: (t: WorkoutTemplate) => React.ReactNode;
  onAddTemplate: (folderId: string | null) => void;
  onError: (message: string | null) => void;
}> = ({ templates, renderTemplate, onAddTemplate, onError }) => {
  const {
    workoutTemplateFolders,
    addWorkoutTemplateFolder,
    deleteWorkoutTemplateFolder,
    renameWorkoutTemplateFolder,
    updateWorkoutTemplateFolder,
    reorderWorkoutTemplateFolders,
    moveWorkoutTemplateFolder,
  } = useApp();
  const dark = useIsDark();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(folderColorOptions[0]);
  const [folderMenu, setFolderMenu] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [folderRenameDraft, setFolderRenameDraft] = useState("");
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [addingSubfolderTo, setAddingSubfolderTo] = useState<string | null>(null);
  const [subfolderName, setSubfolderName] = useState("");
  const [subfolderColor, setSubfolderColor] = useState(folderColorOptions[0]);

  // Every folder write reports here, as on the Routines tab.
  const run = (action: Promise<string | undefined>) => {
    void action.then((message) => onError(message ? t(message) : null));
  };

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const saveFolder = () => {
    if (!newFolderName.trim()) return;
    run(addWorkoutTemplateFolder(newFolderName.trim(), null, newFolderColor));
    setNewFolderName("");
    setNewFolderColor(folderColorOptions[0]);
    setNewFolderOpen(false);
  };

  const onFolderAction = (folder: WorkoutTemplateFolder, action: FolderAction) => {
    if (action === "rename") {
      setRenamingFolderId(folder.id);
      setFolderRenameDraft(folder.name);
    } else if (action === "color") setEditingColorId(folder.id);
    else if (action === "subfolder") {
      setAddingSubfolderTo(folder.id);
      setSubfolderName("");
    } else if (action === "template") onAddTemplate(folder.id);
    else run(deleteWorkoutTemplateFolder(folder.id));
  };

  const commitFolderRename = (id: string) => {
    const name = folderRenameDraft.trim();
    if (name) run(renameWorkoutTemplateFolder(id, name));
    setRenamingFolderId(null);
  };

  const addSubfolder = (parentId: string) => {
    if (subfolderName.trim()) run(addWorkoutTemplateFolder(subfolderName.trim(), parentId, subfolderColor));
    setAddingSubfolderTo(null);
  };

  const listRef = useRef<HTMLDivElement>(null);
  const siblingsOf = (parentId: string | null) => workoutTemplateFolders.filter((f) => (f.parentId ?? null) === parentId);
  const onDrop = (item: DragItem, target: DropTarget) => {
    if (item.kind !== "folder") return;
    if (target.kind === "into") run(moveWorkoutTemplateFolder(item.id, target.folderId, Number.MAX_SAFE_INTEGER));
    else if (target.kind === "folders") {
      if (target.parentId === item.parentId) {
        const ids = siblingsOf(item.parentId).map((f) => f.id);
        const next = moveId(ids, item.id, target.index);
        if (next.some((id, i) => id !== ids[i])) run(reorderWorkoutTemplateFolders(item.parentId, next));
      } else run(moveWorkoutTemplateFolder(item.id, target.parentId, target.index));
    }
  };
  const canNest = (folderId: string, parentId: string | null) => canMoveFolder(folderId, parentId, workoutTemplateFolders);
  const { drag, pressProps, gripProps, onClickCapture } = useRoutineDrag(listRef, onDrop, canNest);
  const draggingFolder = drag?.item.kind === "folder" ? drag.item.id : null;
  const dragFolder = draggingFolder ? workoutTemplateFolders.find((f) => f.id === draggingFolder) : undefined;

  const templatesIn = (folderId: string | null) => templates.filter((tpl) => (tpl.folderId ?? null) === folderId);

  const renderFolders = (parentId: string | null, depth: number): React.ReactNode => {
    const siblings = siblingsOf(parentId);
    const at = drag?.item.kind === "folder" && drag.target.kind === "folders" && drag.target.parentId === parentId ? drag.target.index : null;
    const rest = siblings.filter((f) => f.id !== draggingFolder);
    return withPlaceholder(siblings, draggingFolder, at).map((entry) =>
      entry.kind === "placeholder" ? (
        <Placeholder key="placeholder" gap={parentId === null ? 14 : 6} />
      ) : (
        renderFolder(entry.item, depth, entry.hidden ? siblings.indexOf(entry.item) : rest.indexOf(entry.item), entry.hidden)
      )
    );
  };

  // A render function, not a component: a component made during render would
  // remount on every pointer move and drop the drag (see RoutinesTab).
  const renderFolder = (folder: WorkoutTemplateFolder, depth: number, index: number, hidden: boolean): React.ReactNode => {
    const inside = templatesIn(folder.id);
    const isCollapsed = collapsed.has(folder.id);
    const family = themedFamily(folderFamily(folder, workoutTemplateFolders.indexOf(folder)), dark);
    const item: DragItem = { kind: "folder", id: folder.id, parentId: folder.parentId ?? null, index };
    return (
      <div key={folder.id} data-dnd-folder-block data-flip={`f:${folder.id}`} className="flex flex-col gap-1.5" style={{ marginInlineStart: depth * 16, display: hidden ? "none" : undefined }}>
        <FolderHeader
          folder={folder}
          family={family}
          count={inside.length}
          noun={["template", "templates"]}
          countText={tn(inside.length, "{n} template", "{n} templates")}
          collapsed={isCollapsed}
          highlighted={drag?.target.kind === "into" && drag.target.folderId === folder.id}
          onToggle={() => toggle(folder.id)}
          onMenu={(anchor) => setFolderMenu({ id: folder.id, anchor })}
          renaming={renamingFolderId === folder.id}
          renameDraft={folderRenameDraft}
          onRenameDraft={setFolderRenameDraft}
          onRenameCommit={() => commitFolderRename(folder.id)}
          press={pressProps(item, renamingFolderId !== folder.id)}
          grip={gripProps(item)}
          colorEditor={
            editingColorId === folder.id && (
              <ColorPopover value={folder.color} onPick={(c) => run(updateWorkoutTemplateFolder(folder.id, { color: c }))} onDone={() => setEditingColorId(null)} />
            )
          }
        />
        {!isCollapsed && (
          <div className="flex flex-col gap-1.5">
            {inside.length > 0 && <div>{inside.map(renderTemplate)}</div>}
            {addingSubfolderTo === folder.id && (
              <div className="mb-2" style={{ marginInlineStart: 16 }}>
                <div className="flex gap-2 mb-2">
                  <input
                    autoFocus
                    value={subfolderName}
                    onChange={(e) => setSubfolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && subfolderName.trim()) addSubfolder(folder.id);
                    }}
                    placeholder={t("Subfolder name…")}
                    aria-label={t("Subfolder name")}
                    className="flex-1 rounded-xl bg-cream-card border border-charcoal/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button onClick={() => addSubfolder(folder.id)} className="tap px-3 rounded-xl bg-primary-fill text-on-primary-fill text-sm font-semibold" style={{ minHeight: 44 }}>
                    {t("Add")}
                  </button>
                </div>
                <ColorSwatches value={subfolderColor} onPick={setSubfolderColor} size={24} />
              </div>
            )}
            <div data-dnd-folders={folder.id} className="flex flex-col gap-1.5 empty:hidden">
              {renderFolders(folder.id, depth + 1)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const menuFolder = folderMenu ? workoutTemplateFolders.find((f) => f.id === folderMenu.id) : undefined;
  const unfiled = templatesIn(null);

  return (
    <div onClick={() => editingColorId && setEditingColorId(null)}>
      <div className="flex justify-end" style={{ marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => setNewFolderOpen(true)}
          className="tap flex items-center"
          style={{ gap: 6, minHeight: 44, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep }}
        >
          <FolderPlus size={15} aria-hidden /> {t("New folder")}
        </button>
      </div>
      <div ref={listRef} onClickCapture={onClickCapture} className="flex flex-col gap-3.5 mb-3.5">
        <div data-dnd-folders="" className="flex flex-col gap-3.5 empty:hidden">
          {renderFolders(null, 0)}
        </div>
      </div>
      <div>{unfiled.map(renderTemplate)}</div>

      <PopupMenu<FolderAction>
        open={!!menuFolder}
        anchor={folderMenu?.anchor ?? null}
        onClose={() => setFolderMenu(null)}
        options={(menuFolder && !canAddSubfolder(menuFolder.id, workoutTemplateFolders) ? FOLDER_MENU.map((o) => (o.value === "subfolder" ? { ...o, disabled: true, note: t(MAX_DEPTH_NOTE) } : o)) : FOLDER_MENU).map((o) => ({ ...o, label: t(o.label) }))}
        onSelect={(action) => menuFolder && onFolderAction(menuFolder, action)}
      />

      {drag && <InsertionLine listRef={listRef} />}
      {drag &&
        dragFolder &&
        createPortal(
          <div
            aria-hidden
            className="fixed pointer-events-none"
            style={{ zIndex: 55, left: drag.left, width: drag.width, top: drag.y - drag.offsetY, transform: "scale(1.03)", borderRadius: 14, boxShadow: "0 14px 30px rgba(36,31,27,0.18)" }}
          >
            <FolderHeader
              folder={dragFolder}
              family={themedFamily(folderFamily(dragFolder, workoutTemplateFolders.indexOf(dragFolder)), dark)}
              count={templatesIn(dragFolder.id).length}
              noun={["template", "templates"]}
              countText={tn(templatesIn(dragFolder.id).length, "{n} template", "{n} templates")}
              collapsed={collapsed.has(dragFolder.id)}
            />
          </div>,
          document.body
        )}

      <BottomSheet open={newFolderOpen} onClose={() => setNewFolderOpen(false)} title={t("New Folder")}>
        <div className="space-y-4 animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{t("Folder name")}</span>
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t("Folder name")}
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-2 block">{t("Color")}</span>
            <ColorSwatches value={newFolderColor} onPick={setNewFolderColor} size={28} />
          </div>
          <Button fullWidth size="lg" onClick={saveFolder} disabled={!newFolderName.trim()}>
            {t("Create folder")}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
};
