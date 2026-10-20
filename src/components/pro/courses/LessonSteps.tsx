import React, { useCallback, useEffect, useState } from "react";
import { Check, CheckCircle2, Circle, ClipboardCheck, FileDown, FileText, Image as ImageIcon, ListChecks, PlayCircle, Plus, X, type LucideIcon } from "lucide-react";
import {
  addPdfLesson,
  addQuizLesson,
  addQuizQuestion,
  addReadingLesson,
  addVideoLesson,
  fetchQuizForAuthor,
  removeQuizQuestion,
  replaceLessonPdf,
  setQuizOptions,
  updateLesson,
  updateQuizQuestion,
  LIMITS,
  RENAME_RESETS_PROGRESS,
  type AuthorQuizQuestion,
  type BuilderLesson,
} from "../../../services/courses/author";
import { youtubeEmbedUrl, type LessonKind } from "../../../services/courses/rules";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { CtaButton } from "../../ui/PinnedCta";
import { INK } from "../proInk";
import { ComingSoonPill } from "../ComingSoon";
import { Field, FieldError, Label, Note, TextBox } from "./courseUi";
import { fieldBox } from "./courseStyles";
import { lessonEyebrow } from "./courseModel";

const KIND_LABEL: Record<LessonKind, string> = { video: "Video", reading: "Reading", pdf: "PDF", quiz: "Quiz" };

/**
 * Release 3 · W6 MO28 "Create course · 3 Lesson type" (cLessonType18):
 * "Week {n} · {title}" 12.5 text.soft, m-bottom 10; a 2-column grid, gap 8;
 * each card r16, 1px 10% border (primary when chosen, on primary.pale), pad
 * 12; tile 34 r10 (primary.pale, card when chosen), icon 17 primary.deep;
 * name 14 / 800 m-top 8; line 11 text.faint 1.35. Image and Check-in are
 * drawn as new: course_lessons takes video, reading, pdf and quiz only, so
 * those two are Coming soon.
 */
export const LessonTypeStep: React.FC<{ weekLabel: string; kind: LessonKind | null; onPick: (k: LessonKind) => void; footer: React.ReactNode }> = ({ weekLabel, kind, onPick, footer }) => {
  const types: { key: LessonKind | null; icon: LucideIcon; name: string; line: string }[] = [
    { key: "video", icon: PlayCircle, name: "Video", line: "Upload or link a video" },
    { key: "reading", icon: FileText, name: "Reading", line: "Text with headings and images" },
    { key: "pdf", icon: FileDown, name: "PDF", line: "A plan or handout to download" },
    { key: null, icon: ImageIcon, name: "Image", line: "A photo or diagram, new" },
    { key: "quiz", icon: ListChecks, name: "Quiz", line: "Short questions with answers" },
    { key: null, icon: ClipboardCheck, name: "Check-in", line: "A few questions back to you, new" },
  ];
  return (
    <div>
      <p style={{ fontSize: textPx(12.5), color: INK.chS, marginBottom: 10 }}>{weekLabel}</p>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8 }} role="radiogroup" aria-label="Lesson type">
        {types.map((t) => {
          const on = !!t.key && t.key === kind;
          return (
            <button
              key={t.name}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!t.key}
              onClick={() => t.key && onPick(t.key)}
              className="tap text-left disabled:cursor-default"
              style={{ borderRadius: 16, border: `1px solid ${on ? INK.pr : INK.b10}`, background: on ? INK.prPale : INK.card, padding: 12, opacity: t.key ? 1 : 0.7 }}
            >
              <span className="flex items-center justify-between" style={{ gap: 6 }}>
                <span className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 10, background: on ? INK.card : INK.prPale }}>
                  <t.icon size={17} strokeWidth={2} aria-hidden style={{ color: INK.prDeep }} />
                </span>
                {!t.key && <ComingSoonPill />}
              </span>
              <p style={{ fontSize: textPx(14), fontWeight: 800, color: INK.ch, marginTop: 8 }}>{t.name}</p>
              <p style={{ fontSize: textPx(11), color: INK.chF, lineHeight: 1.35, marginTop: 2 }}>{t.line}</p>
            </button>
          );
        })}
      </div>
      {footer}
    </div>
  );
};

const minuteOptions = (current: number | null) => {
  const base = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 45, 60, 90, 120];
  return current && !base.includes(current) ? [...base, current].sort((a, b) => a - b) : base;
};

/**
 * Release 3 · W6 MO28 "3 Lesson editor" (cLessonEdit18): Edit / Preview
 * tabs (34 high, 12, 12 under); the fields by kind; footer Back + "Save
 * lesson" (check). Reading: title, the text (course_lessons.body is plain
 * text, so no formatting toolbar: the lesson page shows it as written),
 * "Reading time". Video: a single YouTube link (ATX70 otherwise) and its
 * length. PDF: the file, stripped before upload (services/courses/pdf).
 * Quiz: pass mark and "Question {n} of {n}" with its answers (the whole set
 * saved at once, exactly one correct: set_course_quiz_options), "Add
 * question". Preview (r16 card, 120 image band, eyebrow 10.5 / 800 caps,
 * title 18 / 800, body 13.5 text.soft 1.6; "This is how clients see it.").
 */
export const LessonEditor: React.FC<{
  courseId: string;
  moduleId: string;
  weekIndex: number;
  kind: LessonKind;
  lesson: BuilderLesson | null;
  editable: boolean;
  inRevision: boolean;
  onBack: () => void;
  onSaved: (createdId: string | null, stay: boolean) => void;
  toFooter: (n: React.ReactNode) => React.ReactNode;
}> = ({ courseId, moduleId, weekIndex, kind, lesson, editable, inRevision, onBack, onSaved, toFooter }) => {
  const dark = useIsDark();
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [body, setBody] = useState(lesson?.body ?? "");
  const [minutes, setMinutes] = useState<number | null>(lesson?.minutes ?? null);
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [passMark, setPassMark] = useState(String(lesson?.passMark ?? 70));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleOk = title.trim().length >= LIMITS.lessonTitle.min;
  const pass = Number(passMark);
  const passOk = Number.isInteger(pass) && pass >= LIMITS.passMark.min && pass <= LIMITS.passMark.max;
  const ready =
    editable &&
    titleOk &&
    (lesson
      ? true
      : kind === "video"
      ? url.trim().length > 0
      : kind === "reading"
      ? body.trim().length > 0
      : kind === "pdf"
      ? !!file
      : passOk);

  const save = async () => {
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    if (!lesson) {
      const r =
        kind === "video"
          ? await addVideoLesson(moduleId, title.trim(), url.trim(), minutes)
          : kind === "reading"
          ? await addReadingLesson(moduleId, title.trim(), body, minutes)
          : kind === "pdf"
          ? await addPdfLesson(courseId, moduleId, title.trim(), file!)
          : await addQuizLesson(moduleId, title.trim(), pass);
      setBusy(false);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      // A new quiz stays open so its questions can be added.
      onSaved(r.value, kind === "quiz");
      return;
    }
    // ONLY THE FIELDS THIS KIND HAS: update_course_lesson refuses the others.
    const patch: Parameters<typeof updateLesson>[1] = {};
    if (title.trim() !== lesson.title) patch.title = title.trim();
    if (kind !== "quiz" && minutes !== null && minutes !== lesson.minutes) patch.minutes = minutes;
    if (kind === "video" && url.trim()) patch.url = url.trim();
    if (kind === "reading" && body !== (lesson.body ?? "")) patch.body = body;
    if (kind === "quiz" && passOk && pass !== lesson.passMark) patch.passMark = pass;
    if (Object.keys(patch).length) {
      const r = await updateLesson(lesson.id, patch);
      if (!r.ok) {
        setBusy(false);
        setError(r.message);
        return;
      }
    }
    if (kind === "pdf" && file) {
      const r = await replaceLessonPdf(courseId, lesson.id, file);
      if (!r.ok) {
        setBusy(false);
        setError(r.message);
        return;
      }
    }
    setBusy(false);
    onSaved(null, false);
  };

  const embed = youtubeEmbedUrl(lesson?.videoId ?? null);
  const minutesField = (label: string) => (
    <div>
      <label htmlFor="lesson-minutes" className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, margin: "12px 0 6px" }}>
        {label}
      </label>
      <select
        id="lesson-minutes"
        value={minutes ?? ""}
        disabled={!editable}
        onChange={(e) => setMinutes(e.target.value ? Number(e.target.value) : null)}
        className="tap appearance-none disabled:opacity-60"
        style={{ ...fieldBox(), height: 40 }}
      >
        <option value="">Not set</option>
        {minuteOptions(minutes).map((m) => (
          <option key={m} value={m}>
            {m} min
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div>
      <SegmentedTabs
        items={[
          { key: "edit", label: "Edit" },
          { key: "preview", label: "Preview" },
        ]}
        activeKey={tab}
        onChange={(k) => setTab(k as "edit" | "preview")}
        tabHeight={34}
        labelSize={12}
        darkTone="partB"
        className="mb-3"
      />
      {tab === "preview" ? (
        <div>
          <div style={{ borderRadius: 16, border: `1px solid ${INK.b10}`, overflow: "hidden" }}>
            {kind === "video" && embed ? (
              <iframe
                src={embed}
                title={title}
                className="w-full aspect-video border-0 block"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <div style={{ height: 120, background: dark ? "rgba(174,161,220,0.14)" : "#F0EDF9" }} aria-hidden />
            )}
            <div style={{ padding: "12px 14px" }}>
              <p style={{ fontSize: textPx(10.5), fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: INK.chF }}>{lessonEyebrow(weekIndex, KIND_LABEL[kind], kind === "quiz" ? null : minutes)}</p>
              <p style={{ fontSize: textPx(18), fontWeight: 800, color: INK.ch, marginTop: 4, overflowWrap: "anywhere" }}>{title}</p>
              {kind === "reading" && body && <p style={{ fontSize: textPx(13.5), color: INK.chS, lineHeight: 1.6, marginTop: 8, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{body}</p>}
            </div>
          </div>
          <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 8 }}>This is how clients see it.</p>
        </div>
      ) : (
        <div>
          <Field id="lesson-title" label="Lesson title" value={title} onChange={setTitle} maxLength={LIMITS.lessonTitle.max} disabled={!editable} />
          {inRevision && lesson && title.trim() !== lesson.title && <Note mt={6}>{RENAME_RESETS_PROGRESS}</Note>}
          {kind === "reading" && (
            <>
              <div style={{ height: 12 }} />
              <TextBox id="lesson-body" label="Text" value={body} onChange={setBody} rows={8} maxLength={LIMITS.body.max} disabled={!editable} />
              {minutesField("Reading time")}
            </>
          )}
          {kind === "video" && (
            <>
              <div style={{ height: 12 }} />
              <Field
                id="lesson-url"
                label="YouTube link"
                value={url}
                onChange={setUrl}
                inputMode="url"
                disabled={!editable}
                placeholder="https://youtube.com/watch?v=…"
                note={lesson ? "Paste a new link to replace the video. A single video, not a playlist." : "A single video. A playlist, a channel or any other site is refused."}
              />
              {minutesField("Length")}
            </>
          )}
          {kind === "pdf" && (
            <>
              <Label mt={12}>{lesson ? "Replace the PDF" : "File"}</Label>
              <label
                className="tap flex items-center justify-center cursor-pointer"
                style={{ ...fieldBox(), height: 44, fontSize: textPx(13), fontWeight: 700, opacity: editable && !busy ? 1 : 0.6 }}
              >
                {file ? file.name : lesson ? "Choose a new file" : "Choose a PDF"}
                <input type="file" accept="application/pdf,.pdf" disabled={!editable || busy} className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <Note mt={6}>We remove the author, the title and anything else hidden in the file before it's uploaded.</Note>
            </>
          )}
          {kind === "quiz" && (
            <>
              <div style={{ height: 12 }} />
              <Field id="lesson-pass" label="Pass mark" value={passMark} onChange={setPassMark} inputMode="numeric" disabled={!editable} note="The score needed to pass, as a percentage." invalid={!passOk} />
              {lesson ? <QuizQuestions lessonId={lesson.id} editable={editable} /> : <Note>Add the questions once the quiz exists.</Note>}
            </>
          )}
        </div>
      )}
      {error && <FieldError mt={10}>{error}</FieldError>}
      {toFooter(
        <>
          <CtaButton variant="secondary" label="Back" onClick={onBack} disabled={busy} />
          {editable && <CtaButton label="Save lesson" icon={<Check size={15} strokeWidth={2} aria-hidden />} loading={busy} disabled={!ready} onClick={() => void save()} />}
        </>
      )}
    </div>
  );
};

/**
 * The quiz's questions (QuizEditor's rules, kept): the answer key is the
 * author's only (course_quiz_for_author); the options are saved as a whole
 * set with exactly one correct. Drawn as MO28 "Lesson editor, quiz":
 * "Question {n} of {n}"; answers pad 10 12, r12, soft (status.good bg when
 * correct) with circle / circle-check 16 and "Correct" 11 / 700 status.good;
 * "Add question" 12.5 / 700 primary.deep.
 */
function QuizQuestions({ lessonId, editable }: { lessonId: string; editable: boolean }) {
  const [questions, setQuestions] = useState<AuthorQuizQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetchQuizForAuthor(lessonId);
    if (!r.ok) setError(r.message);
    else {
      setQuestions(r.value);
      setError(null);
    }
  }, [lessonId]);
  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (busy || !adding?.trim()) return;
    setBusy(true);
    const r = await addQuizQuestion(lessonId, adding.trim());
    setBusy(false);
    if (!r.ok) setError(r.message);
    else {
      setAdding(null);
      await load();
    }
  };

  return (
    <div>
      {error && <FieldError mt={10}>{error}</FieldError>}
      {questions?.map((q, i) => (
        <QuestionBlock key={q.id} index={i} total={questions.length} question={q} editable={editable} onChanged={() => void load()} />
      ))}
      {editable &&
        (adding === null ? (
          <button type="button" onClick={() => setAdding("")} className="tap flex items-center" style={{ gap: 4, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep, marginTop: 10, minHeight: 36 }}>
            <Plus size={13} strokeWidth={2.4} aria-hidden />
            Add question
          </button>
        ) : (
          <div style={{ marginTop: 10 }}>
            <Field id="new-question" label={`Question ${(questions?.length ?? 0) + 1}`} value={adding} onChange={setAdding} />
            <div className="flex" style={{ gap: 8, marginTop: 8 }}>
              <CtaButton size="base" variant="secondary" label="Cancel" onClick={() => setAdding(null)} />
              <CtaButton size="base" label="Add question" loading={busy} disabled={!adding.trim()} onClick={() => void add()} />
            </div>
          </div>
        ))}
    </div>
  );
}

function QuestionBlock({ index, total, question, editable, onChanged }: { index: number; total: number; question: AuthorQuizQuestion; editable: boolean; onChanged: () => void }) {
  const [prompt, setPrompt] = useState(question.prompt);
  const [options, setOptions] = useState(
    question.options.length
      ? question.options.map((o) => ({ body: o.body, isCorrect: o.isCorrect }))
      : [
          { body: "", isCorrect: true },
          { body: "", isCorrect: false },
        ]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const filled = options.filter((o) => o.body.trim());
  const countOk = filled.length >= LIMITS.quizOptions.min && filled.length <= LIMITS.quizOptions.max;
  const ready = countOk && filled.filter((o) => o.isCorrect).length === 1 && prompt.trim().length > 0;

  const save = async () => {
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    if (prompt.trim() !== question.prompt) {
      const r = await updateQuizQuestion(question.id, prompt.trim());
      if (!r.ok) {
        setBusy(false);
        setError(r.message);
        return;
      }
    }
    const r = await setQuizOptions(question.id, filled.map((o) => ({ body: o.body.trim(), isCorrect: o.isCorrect })));
    setBusy(false);
    if (!r.ok) setError(r.message);
    else {
      setSaved(true);
      onChanged();
    }
  };
  const remove = async () => {
    setBusy(true);
    const r = await removeQuizQuestion(question.id);
    setBusy(false);
    if (!r.ok) setError(r.message);
    else onChanged();
  };

  return (
    <div style={{ marginTop: 14 }}>
      <Label mt={0} htmlFor={`q-${question.id}`}>
        Question {index + 1} of {total}
      </Label>
      <Field id={`q-${question.id}`} ariaLabel={`Question ${index + 1}`} value={prompt} onChange={setPrompt} disabled={!editable} />
      <div className="flex flex-col" style={{ gap: 6, marginTop: 8 }} role="radiogroup" aria-label={`Answers to question ${index + 1}`}>
        {options.map((o, i) => (
          <div key={i} className="flex items-center" style={{ gap: 10, padding: "4px 12px", borderRadius: 12, background: o.isCorrect ? INK.goodBg : INK.soft, minHeight: 40 }}>
            <button
              type="button"
              role="radio"
              aria-checked={o.isCorrect}
              aria-label={`Answer ${i + 1} is correct`}
              disabled={!editable}
              onClick={() => setOptions((p) => p.map((x, k) => ({ ...x, isCorrect: k === i })))}
              className="tap relative shrink-0 before:absolute before:-inset-3 before:content-['']"
            >
              {o.isCorrect ? <CheckCircle2 size={16} strokeWidth={2} aria-hidden style={{ color: INK.good }} /> : <Circle size={16} strokeWidth={2} aria-hidden style={{ color: INK.chT }} />}
            </button>
            <input
              value={o.body}
              onChange={(e) => setOptions((p) => p.map((x, k) => (k === i ? { ...x, body: e.target.value } : x)))}
              disabled={!editable}
              placeholder={`Answer ${i + 1}`}
              aria-label={`Answer ${i + 1}`}
              className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-charcoal-faint"
              style={{ fontSize: textPx(13.5), color: INK.ch, height: 32 }}
            />
            {o.isCorrect && <span style={{ fontSize: textPx(11), fontWeight: 700, color: INK.good }}>Correct</span>}
            {editable && options.length > LIMITS.quizOptions.min && (
              <button
                type="button"
                aria-label={`Remove answer ${i + 1}`}
                onClick={() =>
                  setOptions((p) => {
                    const next = p.filter((_, k) => k !== i);
                    return next.some((x) => x.isCorrect) ? next : next.map((x, k) => ({ ...x, isCorrect: k === 0 }));
                  })
                }
                className="tap relative shrink-0 before:absolute before:-inset-3 before:content-['']"
              >
                <X size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
              </button>
            )}
          </div>
        ))}
      </div>
      {editable && (
        <div className="flex items-center flex-wrap" style={{ gap: 12, marginTop: 8 }}>
          {options.length < LIMITS.quizOptions.max && (
            <button type="button" onClick={() => setOptions((p) => [...p, { body: "", isCorrect: false }])} className="tap" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep, minHeight: 32 }}>
              Add an answer
            </button>
          )}
          <button type="button" onClick={() => void save()} disabled={busy || !ready} className="tap disabled:opacity-40" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep, minHeight: 32 }}>
            {saved && !busy ? "Saved" : "Save question"}
          </button>
          <button type="button" onClick={() => void remove()} disabled={busy} className="tap ml-auto" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.hi, minHeight: 32 }}>
            Delete
          </button>
        </div>
      )}
      {editable && !countOk && <Note mt={4}>A question needs between {LIMITS.quizOptions.min} and {LIMITS.quizOptions.max} answers with something written in them.</Note>}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
