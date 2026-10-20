import React, { useState } from "react";
import { ChevronDown, ChevronUp, ClipboardList, Ellipsis, FileDown, FileText, ListChecks, PlayCircle, Plus, Trash2, type LucideIcon } from "lucide-react";
import {
  removeLesson,
  removeModule,
  renameModule,
  reorderLessons,
  reorderModules,
  LIMITS,
  RENAME_RESETS_PROGRESS,
  type BuilderLesson,
  type BuilderModule,
} from "../../../services/courses/author";
import { textPx } from "../../../theme/textSize";
import { PopupMenu } from "../../ui/PopupMenu";
import { CentredPopup } from "../../ui/CentredPopup";
import { CtaButton } from "../../ui/PinnedCta";
import { INK } from "../proInk";
import { Field, Note } from "./courseUi";
import { lessonMeta } from "./courseModel";

const KIND_ICON: Record<string, LucideIcon> = { video: PlayCircle, reading: FileText, pdf: FileDown, quiz: ListChecks, check: ClipboardList };

type Run = (fn: () => Promise<{ ok: boolean; message?: string }>) => Promise<boolean>;

/**
 * Release 3 · W6 MO28 "Create course · 2 Structure" (cStructure18): a card
 * per week (r16, card fill and border, pad 10 12, m-bottom 8): "Week {n} ·
 * {title}" 14 / 800 with up / down (chevrons 16) and delete (trash 15);
 * lesson rows (pad 9 0, 1px 6% rule; tile 28 r8 primary.pale, icon 14
 * primary.deep; title 13.5 / 600; meta 11 text.faint; ⋯ 16 text.faint);
 * "Add lesson" 12.5 / 700 primary.deep; "Add week" 44 high, r14, 1.5 dashed.
 *
 * Reordering is the old builder's whole-list reorder (reorder_course_modules
 * / reorder_course_lessons): weeks by their chevrons, lessons by Move up /
 * Move down in the row's menu. Drag handles are not drawn: there is no drag.
 */
export const StructureStep: React.FC<{
  courseId: string;
  revisionId: string | null;
  modules: BuilderModule[];
  lessons: BuilderLesson[];
  quizCounts: Map<string, number>;
  editable: boolean;
  busy: boolean;
  run: Run;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (l: BuilderLesson) => void;
  onAddWeek: (title: string) => Promise<boolean>;
  footer: React.ReactNode;
}> = ({ courseId, revisionId, modules, lessons, quizCounts, editable, busy, run, onAddLesson, onEditLesson, onAddWeek, footer }) => {
  const [menu, setMenu] = useState<{ anchor: HTMLElement; lesson: BuilderLesson; index: number; count: number } | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [removeWeek, setRemoveWeek] = useState<BuilderModule | null>(null);
  const [removeL, setRemoveL] = useState<BuilderLesson | null>(null);

  const moveWeek = (i: number, by: number) => {
    const next = [...modules];
    const to = i + by;
    if (to < 0 || to >= next.length) return;
    [next[i], next[to]] = [next[to], next[i]];
    void run(() => reorderModules(courseId, next.map((m) => m.id), revisionId));
  };
  const moveLesson = (list: BuilderLesson[], i: number, by: number) => {
    const next = [...list];
    const to = i + by;
    if (to < 0 || to >= next.length) return;
    [next[i], next[to]] = [next[to], next[i]];
    void run(() => reorderLessons(list[0].moduleId, next.map((l) => l.id)));
  };

  const iconBtn = (label: string, Icon: LucideIcon, onClick: () => void, disabled: boolean, size = 16) => (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled || busy}
      className="tap relative flex items-center justify-center disabled:opacity-40 before:absolute before:-inset-3 before:content-['']"
      style={{ width: 22, height: 22, color: INK.chS }}
    >
      <Icon size={size} strokeWidth={2} aria-hidden />
    </button>
  );

  return (
    <div>
      {modules.length === 0 && <Note mt={0}>A course is organised into weeks, and each week holds its lessons. Add the first one.</Note>}
      {modules.map((m, i) => {
        const list = lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.position - b.position);
        const isRenaming = renaming?.id === m.id;
        return (
          <div key={m.id} style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 16, padding: "10px 12px", marginBottom: 8 }}>
            <div className="flex items-center" style={{ gap: 8, paddingBottom: 6 }}>
              {isRenaming ? (
                <div className="flex-1 flex items-end" style={{ gap: 8 }}>
                  <div className="flex-1">
                    <Field id={`week-${m.id}`} ariaLabel="Week title" value={renaming.title} onChange={(v) => setRenaming({ id: m.id, title: v })} maxLength={LIMITS.moduleTitle.max} />
                  </div>
                  <button
                    type="button"
                    disabled={busy || renaming.title.trim().length < LIMITS.moduleTitle.min}
                    onClick={() => void run(() => renameModule(m.id, renaming.title.trim())).then((ok) => ok && setRenaming(null))}
                    className="tap disabled:opacity-40"
                    style={{ height: 40, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => setRenaming({ id: m.id, title: m.title })}
                  aria-label={`Rename week ${i + 1}, ${m.title}`}
                  className="tap flex-1 min-w-0 text-left disabled:cursor-default"
                  style={{ fontSize: textPx(14), fontWeight: 800, color: INK.ch, overflowWrap: "anywhere" }}
                >
                  Week {i + 1} · {m.title}
                </button>
              )}
              {editable && !isRenaming && (
                <span className="flex items-center shrink-0" style={{ gap: 4 }}>
                  {iconBtn(`Move week ${i + 1} up`, ChevronUp, () => moveWeek(i, -1), i === 0)}
                  {iconBtn(`Move week ${i + 1} down`, ChevronDown, () => moveWeek(i, 1), i === modules.length - 1)}
                  {iconBtn(`Delete week ${i + 1}`, Trash2, () => setRemoveWeek(m), false, 15)}
                </span>
              )}
            </div>
            {list.map((l, k) => {
              const Icon = KIND_ICON[l.kind] ?? FileText;
              return (
                <div key={l.id} className="flex items-center" style={{ gap: 10, padding: "9px 0", borderTop: `1px solid ${INK.b06}` }}>
                  <button type="button" onClick={() => onEditLesson(l)} className="tap flex-1 min-w-0 flex items-center text-left" style={{ gap: 10 }}>
                    <span className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, borderRadius: 8, background: INK.prPale }}>
                      <Icon size={14} strokeWidth={2} aria-hidden style={{ color: INK.prDeep }} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>
                        {l.title}
                      </span>
                      <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>
                        {lessonMeta(l.kind, l.minutes, quizCounts.get(l.id))}
                      </span>
                    </span>
                  </button>
                  {editable && (
                    <button
                      type="button"
                      aria-label={`Options for ${l.title}`}
                      onClick={(e) => setMenu({ anchor: e.currentTarget, lesson: l, index: k, count: list.length })}
                      className="tap relative flex items-center justify-center shrink-0 before:absolute before:-inset-3 before:content-['']"
                      style={{ width: 22, height: 22 }}
                    >
                      <Ellipsis size={16} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
                    </button>
                  )}
                </div>
              );
            })}
            {editable && (
              <button
                type="button"
                onClick={() => onAddLesson(m.id)}
                className="tap w-full flex items-center"
                style={{ gap: 4, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep, paddingTop: 8, borderTop: `1px solid ${INK.b06}`, minHeight: 36 }}
              >
                <Plus size={13} strokeWidth={2.4} aria-hidden />
                Add lesson
              </button>
            )}
          </div>
        );
      })}

      {editable &&
        (adding === null ? (
          <button
            type="button"
            onClick={() => setAdding("")}
            className="tap w-full flex items-center justify-center"
            style={{ gap: 6, height: 44, borderRadius: 14, border: `1.5px dashed rgb(var(--c-charcoal) / 0.11)`, fontSize: textPx(13), fontWeight: 700, color: INK.prDeep }}
          >
            <Plus size={14} strokeWidth={2.4} aria-hidden />
            Add week
          </button>
        ) : (
          <div style={{ borderRadius: 14, border: `1.5px dashed rgb(var(--c-charcoal) / 0.11)`, padding: 12 }}>
            <Field id="new-week" label={`Week ${modules.length + 1} title`} value={adding} onChange={setAdding} maxLength={LIMITS.moduleTitle.max} />
            <div className="flex" style={{ gap: 8, marginTop: 10 }}>
              <CtaButton size="base" variant="secondary" label="Cancel" onClick={() => setAdding(null)} />
              <CtaButton
                size="base"
                label="Add week"
                loading={busy}
                disabled={adding.trim().length < LIMITS.moduleTitle.min}
                onClick={() => void onAddWeek(adding.trim()).then((ok) => ok && setAdding(null))}
              />
            </div>
          </div>
        ))}
      <Note>Every week needs at least one lesson before you publish.</Note>
      {revisionId && <Note mt={4}>{RENAME_RESETS_PROGRESS}</Note>}

      <PopupMenu<"edit" | "up" | "down" | "delete">
        open={!!menu}
        anchor={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        options={
          menu
            ? [
                { value: "edit", label: "Edit" },
                ...(menu.index > 0 ? [{ value: "up" as const, label: "Move up" }] : []),
                ...(menu.index < menu.count - 1 ? [{ value: "down" as const, label: "Move down" }] : []),
                { value: "delete", label: "Delete lesson", destructive: true },
              ]
            : []
        }
        onSelect={(v) => {
          const m = menu;
          setMenu(null);
          if (!m) return;
          const list = lessons.filter((l) => l.moduleId === m.lesson.moduleId).sort((a, b) => a.position - b.position);
          if (v === "edit") onEditLesson(m.lesson);
          else if (v === "up") moveLesson(list, m.index, -1);
          else if (v === "down") moveLesson(list, m.index, 1);
          else setRemoveL(m.lesson);
        }}
      />

      <CentredPopup
        open={!!removeWeek}
        onClose={() => setRemoveWeek(null)}
        title={`Delete ${removeWeek?.title ?? ""}?`}
        icon={<Trash2 size={22} strokeWidth={2} aria-hidden />}
        body={removeWeek ? weekRemovalLine(removeWeek, lessons) : ""}
      >
        <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
          <DangerCta
            label="Delete week"
            onClick={() => {
              const w = removeWeek;
              setRemoveWeek(null);
              if (w) void run(() => removeModule(w.id));
            }}
          />
          <CtaButton size="page" variant="outline" label="Keep it" onClick={() => setRemoveWeek(null)} />
        </div>
      </CentredPopup>

      <CentredPopup open={!!removeL} onClose={() => setRemoveL(null)} title={`Delete ${removeL?.title ?? ""}?`} icon={<Trash2 size={22} strokeWidth={2} aria-hidden />} body={revisionId ? RENAME_RESETS_PROGRESS : undefined}>
        <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
          <DangerCta
            label="Delete lesson"
            onClick={() => {
              const l = removeL;
              setRemoveL(null);
              if (l) void run(() => removeLesson(l.id));
            }}
          />
          <CtaButton size="page" variant="outline" label="Keep it" onClick={() => setRemoveL(null)} />
        </div>
      </CentredPopup>
      {footer}
    </div>
  );
};

const weekRemovalLine = (m: BuilderModule, lessons: BuilderLesson[]) => {
  const n = lessons.filter((l) => l.moduleId === m.id).length;
  return `Deleting "${m.title}" deletes its ${n} ${n === 1 ? "lesson" : "lessons"} too.`;
};

export const DangerCta: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="tap w-full inline-flex items-center justify-center"
    style={{ height: 48, borderRadius: 14, background: INK.hi, color: "rgb(var(--c-on-primary-fill))", fontSize: textPx(14), fontWeight: 700 }}
  >
    {label}
  </button>
);
