import { useCallback, useEffect, useState } from "react";
import {
  addQuizQuestion,
  fetchQuizForAuthor,
  removeQuizQuestion,
  setQuizOptions,
  updateQuizQuestion,
  LIMITS,
  type AuthorQuizQuestion,
} from "../../../services/courses/author";
import { fv } from "../../forum/forumColor";
import { ErrorNote, FieldLabel, Hint, QuietButton, TextField } from "./authorParts";

// The quiz: questions, and the answer key.
//
// THE AUTHOR IS THE ONLY PERSON WHO EVER SEES is_correct. The two quiz tables
// carry no client grant at all and course_quiz() omits the flag for learners;
// course_quiz_for_author() exists precisely so building a quiz does not require
// loosening either. It is scoped to AUTHORSHIP rather than editability, so an
// author can still check the quiz on a published course they cannot edit.
//
// OPTIONS ARE SAVED AS A WHOLE SET, never one at a time. "Exactly one is
// correct" is a property of the set, and a per-option verb cannot hold it:
// there is always a moment between unticking one and ticking another when the
// question has none or two. Replacing the set in one statement means that
// moment never exists in the database — so this editor keeps the whole set in
// local state and sends all of it.

export function QuizEditor({ lessonId, editable }: { lessonId: string; editable: boolean }) {
  const [questions, setQuestions] = useState<AuthorQuizQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState("");
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
    if (busy || adding.trim().length === 0) return;
    setBusy(true);
    const r = await addQuizQuestion(lessonId, adding.trim());
    if (!r.ok) setError(r.message);
    else {
      setAdding("");
      await load();
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <FieldLabel hint="Only you can see which answer is correct.">Questions</FieldLabel>

      {error && <ErrorNote>{error}</ErrorNote>}

      {!questions ? (
        <Hint>Loading…</Hint>
      ) : questions.length === 0 ? (
        <Hint>No questions yet.</Hint>
      ) : (
        questions.map((q, i) => (
          <QuestionEditor key={q.id} index={i} question={q} editable={editable} onChanged={() => void load()} />
        ))
      )}

      {editable && (
        <div className="flex gap-2">
          <span className="grow">
            <TextField value={adding} onChange={setAdding} placeholder="New question" label="New question" />
          </span>
          <QuietButton onClick={() => void add()} disabled={busy || adding.trim().length === 0}>
            Add
          </QuietButton>
        </div>
      )}
    </div>
  );
}

function QuestionEditor({
  index,
  question,
  editable,
  onChanged,
}: {
  index: number;
  question: AuthorQuizQuestion;
  editable: boolean;
  onChanged: () => void;
}) {
  const [prompt, setPrompt] = useState(question.prompt);
  // The whole set, locally, so "exactly one correct" is true of what is sent.
  const [options, setOptions] = useState(
    question.options.length > 0
      ? question.options.map((o) => ({ body: o.body, isCorrect: o.isCorrect }))
      : [
          { body: "", isCorrect: true },
          { body: "", isCorrect: false },
        ]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const filled = options.filter((o) => o.body.trim().length > 0);
  const correctCount = filled.filter((o) => o.isCorrect).length;
  const countOk = filled.length >= LIMITS.quizOptions.min && filled.length <= LIMITS.quizOptions.max;
  const ready = countOk && correctCount === 1 && prompt.trim().length > 0;

  const save = async () => {
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    if (prompt.trim() !== question.prompt) {
      const r = await updateQuizQuestion(question.id, prompt.trim());
      if (!r.ok) {
        setError(r.message);
        setBusy(false);
        return;
      }
    }
    const r = await setQuizOptions(question.id, filled.map((o) => ({ body: o.body.trim(), isCorrect: o.isCorrect })));
    if (!r.ok) setError(r.message);
    else {
      setSaved(true);
      onChanged();
    }
    setBusy(false);
  };

  // TICKING ONE UNTICKS THE REST, in local state, because the set that gets
  // sent must have exactly one. A checkbox per option would let somebody build
  // a set the database will refuse and only find out on save.
  const setCorrect = (i: number) => setOptions((prev) => prev.map((o, k) => ({ ...o, isCorrect: k === i })));

  const setBody = (i: number, body: string) => setOptions((prev) => prev.map((o, k) => (k === i ? { ...o, body } : o)));

  const addOption = () => setOptions((prev) => (prev.length >= LIMITS.quizOptions.max ? prev : [...prev, { body: "", isCorrect: false }]));

  const removeOption = (i: number) =>
    setOptions((prev) => {
      const next = prev.filter((_, k) => k !== i);
      // If the correct one went, the first survivor takes it — rather than a
      // set with none, which cannot be saved.
      return next.some((o) => o.isCorrect) ? next : next.map((o, k) => ({ ...o, isCorrect: k === 0 }));
    });

  return (
    <div className="rounded-[14px] p-2.5 flex flex-col gap-2" style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}>
      <span className="text-[11px] font-extrabold tracking-[0.1em]" style={{ color: fv("muted") }}>
        QUESTION {index + 1}
      </span>
      <TextField value={prompt} onChange={setPrompt} disabled={!editable} label={`Question ${index + 1}`} />

      {options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            type="button"
            role="radio"
            aria-checked={o.isCorrect}
            aria-label={`Answer ${i + 1} is correct`}
            disabled={!editable}
            onClick={() => setCorrect(i)}
            className="tap w-[22px] h-[22px] rounded-full shrink-0 disabled:opacity-60"
            style={{
              background: o.isCorrect ? fv("good") : "transparent",
              border: `2px solid ${o.isCorrect ? fv("good") : fv("border")}`,
            }}
          >
            {o.isCorrect && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true" className="mx-auto">
                <path d="M5 12l5 5 9-10" />
              </svg>
            )}
          </button>
          <span className="grow">
            <TextField value={o.body} onChange={(v) => setBody(i, v)} placeholder={`Answer ${i + 1}`} disabled={!editable} label={`Answer ${i + 1}`} />
          </span>
          {editable && options.length > LIMITS.quizOptions.min && (
            <button
              type="button"
              aria-label={`Remove answer ${i + 1}`}
              onClick={() => removeOption(i)}
              className="tap w-8 h-8 rounded-[10px] shrink-0 text-[13px] font-bold"
              style={{ background: fv("track"), color: fv("danger") }}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {editable && (
        <>
          {options.length < LIMITS.quizOptions.max && (
            <button type="button" onClick={addOption} className="tap text-xs font-bold self-start" style={{ color: fv("link") }}>
              + Add an answer
            </button>
          )}
          {!countOk && (
            <Hint>
              A question needs between {LIMITS.quizOptions.min} and {LIMITS.quizOptions.max} answers with something written in
              them.
            </Hint>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex gap-2 items-center">
            <QuietButton onClick={() => void save()} disabled={busy || !ready}>
              {busy ? "Saving…" : "Save question"}
            </QuietButton>
            {saved && !busy && (
              <span className="text-[13px] font-bold" style={{ color: fv("good") }}>
                Saved
              </span>
            )}
            <span className="grow" />
            {confirmRemove ? (
              <QuietButton
                danger
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const r = await removeQuizQuestion(question.id);
                  if (!r.ok) setError(r.message);
                  else onChanged();
                  setBusy(false);
                }}
              >
                Confirm
              </QuietButton>
            ) : (
              <button type="button" onClick={() => setConfirmRemove(true)} className="tap text-xs font-bold" style={{ color: fv("danger") }}>
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
