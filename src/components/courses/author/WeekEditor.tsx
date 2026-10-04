import { useState } from "react";
import {
  addPdfLesson,
  addQuizLesson,
  addReadingLesson,
  addVideoLesson,
  removeLesson,
  reorderLessons,
  replaceLessonPdf,
  updateLesson,
  LIMITS,
  RENAME_RESETS_PROGRESS,
  type BuilderLesson,
  type BuilderModule,
} from "../../../services/courses/author";
import { minutesLabel, youtubeEmbedUrl, type LessonKind } from "../../../services/courses/rules";
import { fv } from "../../forum/forumColor";
import { AuthorCard, ErrorNote, FieldLabel, Hint, LessonKindIcon, PrimaryButton, QuietButton, TextArea, TextField } from "./authorParts";
import { QuizEditor } from "./QuizEditor";

// One week, and its lessons.
//
// THE FOUR KINDS ARE FOUR DIFFERENT ADD VERBS, not one with a type field,
// because each takes different arguments and the database refuses a field that
// does not belong to a kind rather than ignoring it. Changing a lesson's kind
// is remove-and-add, which is also what the schema says.

const KIND_LABEL: Record<LessonKind, string> = {
  video: "Video",
  reading: "Reading",
  quiz: "Quiz",
  pdf: "PDF",
};

export function WeekEditor({
  index,
  module,
  lessons,
  courseId,
  editable,
  busy,
  canMoveUp,
  canMoveDown,
  onMove,
  onRename,
  onRemove,
  onChanged,
}: {
  index: number;
  module: BuilderModule;
  lessons: BuilderLesson[];
  courseId: string;
  editable: boolean;
  busy: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (by: number) => void;
  onRename: (title: string) => void;
  onRemove: () => void;
  onChanged: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(module.title);
  const [adding, setAdding] = useState<LessonKind | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const moveLesson = async (i: number, by: number) => {
    const next = [...lessons];
    const to = i + by;
    if (to < 0 || to >= next.length) return;
    [next[i], next[to]] = [next[to], next[i]];
    const r = await reorderLessons(module.id, next.map((l) => l.id));
    if (r.ok) onChanged();
  };

  return (
    <AuthorCard>
      <div className="flex items-start justify-between gap-2">
        {renaming ? (
          <span className="grow flex flex-col gap-2">
            <TextField
              value={draftTitle}
              onChange={setDraftTitle}
              maxLength={LIMITS.moduleTitle.max}
              label="Week title"
            />
            <span className="flex gap-2">
              <QuietButton
                disabled={busy || draftTitle.trim().length < LIMITS.moduleTitle.min}
                onClick={() => {
                  onRename(draftTitle.trim());
                  setRenaming(false);
                }}
              >
                Save
              </QuietButton>
              <QuietButton
                onClick={() => {
                  setDraftTitle(module.title);
                  setRenaming(false);
                }}
              >
                Cancel
              </QuietButton>
            </span>
          </span>
        ) : (
          <>
            <span className="flex flex-col min-w-0">
              <span className="text-[11px] font-extrabold tracking-[0.1em]" style={{ color: fv("muted") }}>
                WEEK {index + 1}
              </span>
              <span className="text-sm font-extrabold [overflow-wrap:anywhere]">{module.title}</span>
            </span>
            {editable && (
              <span className="flex gap-1 shrink-0">
                <IconButton label="Move week up" disabled={!canMoveUp || busy} onClick={() => onMove(-1)}>
                  ↑
                </IconButton>
                <IconButton label="Move week down" disabled={!canMoveDown || busy} onClick={() => onMove(1)}>
                  ↓
                </IconButton>
                <IconButton label="Rename week" disabled={busy} onClick={() => setRenaming(true)}>
                  ✎
                </IconButton>
              </span>
            )}
          </>
        )}
      </div>

      {/* ---- lessons ----------------------------------------------------- */}
      {lessons.length === 0 ? (
        <Hint>No lessons in this week yet.</Hint>
      ) : (
        <div className="flex flex-col gap-1.5">
          {lessons.map((l, i) => (
            <LessonRow
              key={l.id}
              lesson={l}
              courseId={courseId}
              editable={editable}
              canMoveUp={i > 0}
              canMoveDown={i < lessons.length - 1}
              onMove={(by) => void moveLesson(i, by)}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}

      {/* ---- add a lesson ------------------------------------------------ */}
      {editable && (
        <>
          {adding ? (
            <AddLesson
              kind={adding}
              courseId={courseId}
              moduleId={module.id}
              onCancel={() => setAdding(null)}
              onAdded={() => {
                setAdding(null);
                onChanged();
              }}
            />
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              {(Object.keys(KIND_LABEL) as LessonKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setAdding(k)}
                  className="tap flex items-center gap-1.5 text-[13px] font-bold rounded-full px-3 py-1.5"
                  style={{ background: fv("track"), color: fv("text") }}
                >
                  <LessonKindIcon kind={k} /> {KIND_LABEL[k]}
                </button>
              ))}
            </div>
          )}

          {/* Removing a week takes its lessons with it, so it asks first. */}
          {confirmRemove ? (
            <div className="flex flex-col gap-2">
              <Hint>
                Deleting “{module.title}” deletes its {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"} too.
              </Hint>
              <span className="flex gap-2">
                <QuietButton danger disabled={busy} onClick={onRemove}>
                  Delete week
                </QuietButton>
                <QuietButton onClick={() => setConfirmRemove(false)}>Keep it</QuietButton>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="tap text-xs font-bold self-start"
              style={{ color: fv("danger") }}
            >
              Delete week
            </button>
          )}
        </>
      )}
    </AuthorCard>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="tap w-8 h-8 rounded-[10px] text-[13px] font-bold disabled:opacity-40"
      style={{ background: fv("track"), color: fv("muted") }}
    >
      {children}
    </button>
  );
}

/** One lesson in the list, expandable into its own editor. */
function LessonRow({
  lesson,
  courseId,
  editable,
  canMoveUp,
  canMoveDown,
  onMove,
  onChanged,
}: {
  lesson: BuilderLesson;
  courseId: string;
  editable: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (by: number) => void;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[14px] overflow-hidden" style={{ background: fv("track") }}>
      <div className="flex items-center gap-2 px-2.5 py-2">
        <LessonKindIcon kind={lesson.kind} />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="tap grow min-w-0 text-left text-[13px] font-bold [overflow-wrap:anywhere]"
          style={{ color: fv("text") }}
          aria-expanded={open}
        >
          {lesson.title}
          {lesson.minutes ? (
            <span className="ml-1.5 font-semibold" style={{ color: fv("muted") }}>
              {minutesLabel(lesson.minutes)}
            </span>
          ) : null}
        </button>
        {editable && (
          <span className="flex gap-1 shrink-0">
            <IconButton label="Move lesson up" disabled={!canMoveUp} onClick={() => onMove(-1)}>
              ↑
            </IconButton>
            <IconButton label="Move lesson down" disabled={!canMoveDown} onClick={() => onMove(1)}>
              ↓
            </IconButton>
          </span>
        )}
      </div>
      {open && <LessonEditor lesson={lesson} courseId={courseId} editable={editable} onChanged={onChanged} />}
    </div>
  );
}

/** Editing one lesson, by kind. */
function LessonEditor({
  lesson,
  courseId,
  editable,
  onChanged,
}: {
  lesson: BuilderLesson;
  courseId: string;
  editable: boolean;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [minutes, setMinutes] = useState(lesson.minutes === null ? "" : String(lesson.minutes));
  const [url, setUrl] = useState("");
  const [body, setBody] = useState(lesson.body ?? "");
  const [passMark, setPassMark] = useState(String(lesson.passMark ?? 70));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    // ONLY THE FIELDS THIS KIND HAS. update_course_lesson refuses a body on a
    // video rather than ignoring it, which is right — a builder sending one has
    // a bug — so the caller must not send one.
    const patch: Parameters<typeof updateLesson>[1] = {};
    if (title.trim() !== lesson.title) patch.title = title.trim();
    const m = minutes.trim() === "" ? null : Number(minutes);
    if (m !== null && Number.isFinite(m) && m !== lesson.minutes) patch.minutes = m;
    if (lesson.kind === "video" && url.trim()) patch.url = url.trim();
    if (lesson.kind === "reading" && body !== (lesson.body ?? "")) patch.body = body;
    if (lesson.kind === "quiz" && Number(passMark) !== lesson.passMark) patch.passMark = Number(passMark);

    if (Object.keys(patch).length === 0) {
      setBusy(false);
      setSaved(true);
      return;
    }
    const r = await updateLesson(lesson.id, patch);
    if (!r.ok) setError(r.message);
    else {
      setSaved(true);
      setUrl("");
      onChanged();
    }
    setBusy(false);
  };

  const embed = youtubeEmbedUrl(lesson.videoId);

  return (
    <div className="px-2.5 pb-2.5 flex flex-col gap-2.5">
      <FieldLabel>Lesson title</FieldLabel>
      <TextField value={title} onChange={setTitle} maxLength={LIMITS.lessonTitle.max} disabled={!editable} label="Lesson title" />
      {/* SAID WHERE THE TITLE IS EDITED, which is the only place it matters. */}
      {editable && title.trim() !== lesson.title && <Hint>{RENAME_RESETS_PROGRESS}</Hint>}

      {lesson.kind !== "quiz" && (
        <>
          <FieldLabel hint="Roughly how long it takes. Optional.">Minutes</FieldLabel>
          <TextField value={minutes} onChange={setMinutes} placeholder="8" disabled={!editable} inputMode="numeric" label="Minutes" />
        </>
      )}

      {lesson.kind === "video" && (
        <>
          {embed && (
            <div className="rounded-xl overflow-hidden" style={{ background: fv("video-bg") }}>
              <iframe
                src={embed}
                title={lesson.title}
                className="w-full aspect-video border-0"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          )}
          <FieldLabel hint="Paste a new link to replace the video. A single video, not a playlist.">YouTube link</FieldLabel>
          <TextField
            value={url}
            onChange={setUrl}
            placeholder="https://youtube.com/watch?v=…"
            disabled={!editable}
            inputMode="url"
            label="YouTube link"
          />
        </>
      )}

      {lesson.kind === "reading" && (
        <>
          <FieldLabel>Text</FieldLabel>
          <TextArea value={body} onChange={setBody} rows={8} maxLength={LIMITS.body.max} disabled={!editable} label="Reading text" />
        </>
      )}

      {lesson.kind === "pdf" && (
        // A PDF lesson always has a file — course_lessons_shape_check requires
        // one — so there is nothing to ask about. The path itself is never read
        // here: it is the key to a private bucket and is outside the grant.
        <PdfField courseId={courseId} lessonId={lesson.id} editable={editable} onChanged={onChanged} />
      )}

      {lesson.kind === "quiz" && (
        <>
          <FieldLabel hint="The score needed to pass, as a percentage.">Pass mark</FieldLabel>
          <TextField value={passMark} onChange={setPassMark} disabled={!editable} inputMode="numeric" label="Pass mark" />
          <QuizEditor lessonId={lesson.id} editable={editable} />
        </>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      {editable && (
        <>
          <div className="flex gap-2 items-center">
            <span className="grow">
              <PrimaryButton onClick={() => void save()} disabled={busy}>
                {busy ? "Saving…" : "Save lesson"}
              </PrimaryButton>
            </span>
            {saved && !busy && (
              <span className="text-[13px] font-bold" style={{ color: fv("good") }}>
                Saved
              </span>
            )}
          </div>

          {confirmRemove ? (
            <span className="flex gap-2">
              <QuietButton
                danger
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const r = await removeLesson(lesson.id);
                  if (!r.ok) setError(r.message);
                  else onChanged();
                  setBusy(false);
                }}
              >
                Delete lesson
              </QuietButton>
              <QuietButton onClick={() => setConfirmRemove(false)}>Keep it</QuietButton>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="tap text-xs font-bold self-start"
              style={{ color: fv("danger") }}
            >
              Delete lesson
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** Replacing a PDF lesson's file. */
function PdfField({
  courseId,
  lessonId,
  editable,
  onChanged,
}: {
  courseId: string;
  lessonId: string;
  editable: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setDone(false);
    const r = await replaceLessonPdf(courseId, lessonId, file);
    if (!r.ok) setError(r.message);
    else {
      setDone(true);
      onChanged();
    }
    setBusy(false);
  };

  return (
    <>
      <FieldLabel hint="We remove the author, the title and anything else hidden in the file before it's uploaded.">
        Replace the PDF
      </FieldLabel>
      <label
        className="tap h-11 rounded-[14px] px-3 inline-flex items-center justify-center text-[13px] font-bold cursor-pointer"
        style={{ background: fv("track"), color: fv("text"), opacity: editable && !busy ? 1 : 0.6 }}
      >
        {busy ? "Preparing…" : done ? "Uploaded" : "Choose a new file"}
        <input
          type="file"
          accept="application/pdf,.pdf"
          disabled={!editable || busy}
          className="sr-only"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </label>
      {error && <ErrorNote>{error}</ErrorNote>}
    </>
  );
}

/** Adding one lesson of a chosen kind. */
function AddLesson({
  kind,
  courseId,
  moduleId,
  onCancel,
  onAdded,
}: {
  kind: LessonKind;
  courseId: string;
  moduleId: string;
  onCancel: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [passMark, setPassMark] = useState("70");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleOk = title.trim().length >= LIMITS.lessonTitle.min;
  const ready =
    titleOk &&
    (kind === "video" ? url.trim().length > 0 : kind === "reading" ? body.trim().length > 0 : kind === "pdf" ? !!file : true);

  const add = async () => {
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    const m = minutes.trim() === "" ? null : Number(minutes);
    const r =
      kind === "video"
        ? await addVideoLesson(moduleId, title.trim(), url.trim(), Number.isFinite(m) ? m : null)
        : kind === "reading"
        ? await addReadingLesson(moduleId, title.trim(), body, Number.isFinite(m) ? m : null)
        : kind === "pdf"
        ? await addPdfLesson(courseId, moduleId, title.trim(), file!)
        : await addQuizLesson(moduleId, title.trim(), Number(passMark) || 70);
    if (!r.ok) {
      setError(r.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    onAdded();
  };

  return (
    <div className="rounded-[14px] p-2.5 flex flex-col gap-2.5" style={{ background: fv("track") }}>
      <span className="text-[13px] font-extrabold">New {KIND_LABEL[kind].toLowerCase()} lesson</span>

      <TextField value={title} onChange={setTitle} placeholder="Lesson title" maxLength={LIMITS.lessonTitle.max} label="Lesson title" />

      {kind === "video" && (
        <>
          <TextField value={url} onChange={setUrl} placeholder="https://youtube.com/watch?v=…" inputMode="url" label="YouTube link" />
          <Hint>A single video. A playlist, a channel or any other site is refused.</Hint>
        </>
      )}

      {kind === "reading" && <TextArea value={body} onChange={setBody} rows={6} maxLength={LIMITS.body.max} placeholder="The lesson text" label="Reading text" />}

      {kind === "pdf" && (
        <>
          <label
            className="tap h-11 rounded-[14px] px-3 inline-flex items-center justify-center text-[13px] font-bold cursor-pointer"
            style={{ background: fv("card"), border: `1px solid ${fv("border")}`, color: fv("text") }}
          >
            {file ? file.name : "Choose a PDF"}
            <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <Hint>We remove the author, the title and anything else hidden in the file before it's uploaded.</Hint>
        </>
      )}

      {kind === "quiz" && (
        <>
          <TextField value={passMark} onChange={setPassMark} inputMode="numeric" label="Pass mark" />
          <Hint>Add the questions once the quiz exists.</Hint>
        </>
      )}

      {kind !== "quiz" && <TextField value={minutes} onChange={setMinutes} placeholder="Minutes (optional)" inputMode="numeric" label="Minutes" />}

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex gap-2">
        <span className="grow">
          <PrimaryButton onClick={() => void add()} disabled={busy || !ready}>
            {busy ? (kind === "pdf" ? "Preparing…" : "Adding…") : "Add lesson"}
          </PrimaryButton>
        </span>
        <QuietButton onClick={onCancel} disabled={busy}>
          Cancel
        </QuietButton>
      </div>
    </div>
  );
}
