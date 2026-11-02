import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowDownToLine, ArrowRight, Bandage, Check, CircleCheck, MessageCircle, Pill, Scale, ShieldAlert, StickyNote, Wheat, type LucideIcon } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { useBack } from "../../../hooks/useBack";
import { textPx } from "../../../theme/textSize";
import { PinnedCta } from "../../ui/PinnedCta";
import { INK } from "../proInk";
import { RoundBtn } from "../client/kit";
import { fmtDay } from "../client/clientFormat";
import { ComingSoon } from "../ComingSoon";
import { ProCardSkeleton, ProError } from "../states";
import { DetailHead } from "../insights/parts";
import { ErrorLine } from "../library/libraryUi";
import { NumBoxes, fieldStyle } from "./moKit";
import { answerFor, answerText, answeredCount, REPLY_MAX, safetyBanner } from "./formModel";
import { askedQuestions, numberBoxes, photoAnswers, responseWarning, textQuestions, weekNumber, type PositionedQuestion, type ResponseNote } from "./reviewModel";
import { fetchConfirmedAnswers, fetchResponse, fetchResponseNotes, fetchResponses, markResponseRead, photoUrls, reviewResponse, type FormResponse } from "../../../services/pro/forms";
import { confirmedAnswerRow, type ConfirmedAnswer, type ProposalField } from "../../../services/client-forms/proposals";
import { startThread } from "../../../services/messaging";
import { time12 } from "../../../utils/time12";
import { FORMS_PATH } from "./FormsHome";
import { t, tk } from "../../../i18n/core";

const OFFLINE = tk("You're offline. Try again when you're connected.");
/** HO20 quick replies (COPY HO20). English keys (tk): shown and written in the app's language with t(). */
const QUICK = [tk("Great work"), tk("Let's talk"), tk("Adjusting your plan")];

function dayWord(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return t("today");
  if (d.toDateString() === y.toDateString()) return t("yesterday");
  return fmtDay(iso);
}
const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/**
 * Release 3 · /app/more/forms/responses/:responseId: a submitted response
 * opens as HO20 Check-in review (check-ins) or CL10 Intake answers (intake).
 * It's reached from the hub's To review (pro.form.submitted / flagged /
 * urgent), the client page (Progress › Check-ins, Files › Intake form) and
 * the next check-in link. Opening it marks its To review notification read.
 * 20261222080000: an urgent response opens with the urgent warning, and the
 * notes its answers trigger (form_response_notes) are listed for the
 * professional under it.
 */
export const ResponseScreen: React.FC = () => {
  const { responseId = "" } = useParams<{ responseId: string }>();
  const { authUserId, professionalClients } = useApp();
  const [data, setData] = useState<{ response: FormResponse; questions: PositionedQuestion[] } | null | undefined>(undefined);
  const [history, setHistory] = useState<FormResponse[] | null>(null);
  const [notes, setNotes] = useState<{ id: string; list: ResponseNote[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!authUserId || !responseId) return;
    let live = true;
    setFailed(false);
    void fetchResponse(responseId).then((r) => {
      if (!live) return;
      if (!r.ok) return setFailed(true);
      setData(r.data);
      if (r.data) {
        void markResponseRead(responseId);
        void fetchResponses(authUserId, { clientId: r.data.response.clientId, formId: r.data.response.formId }).then((h) => live && setHistory(h.ok ? h.data : []));
        void fetchResponseNotes(responseId).then((list) => live && setNotes({ id: responseId, list }));
      }
    });
    return () => {
      live = false;
    };
  }, [authUserId, responseId, nonce]);

  if (failed) return <ProError onRetry={() => setNonce((n) => n + 1)} />;
  if (data === undefined)
    return (
      <div className="flex flex-col" style={{ gap: 12 }}>
        <ProCardSkeleton lines={2} height={70} />
        <ProCardSkeleton lines={3} height={140} />
        <ProCardSkeleton lines={4} height={200} />
      </div>
    );
  if (data === null) return <ComingSoon line={t("This response isn't available any more.")} />;
  const rel = professionalClients.find((c) => c.clientId === data.response.clientId);
  const name = rel?.name ?? t("A client");
  const asked = askedQuestions(data.questions, data.response.answers);
  const noteList = notes?.id === data.response.id ? notes.list : [];
  return data.response.formKind === "check_in" ? (
    <CheckInReview key={data.response.id} response={data.response} questions={asked} history={history} notes={noteList} name={name} onReviewed={() => setNonce((n) => n + 1)} />
  ) : (
    <IntakeAnswers response={data.response} questions={asked} notes={noteList} name={name} />
  );
};

/** Photo tiles (checkReview18): three a row, gap 6, 96 high, r12, the soft hatch while loading. */
const Photos: React.FC<{ paths: string[]; label: string }> = ({ paths, label }) => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = paths.join("|");
  useEffect(() => {
    let live = true;
    void photoUrls(key.split("|")).then((u) => live && setUrls(u));
    return () => {
      live = false;
    };
  }, [key]);
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, marginTop: 8 }}>
      {paths.map((p, i) => (
        <span key={p} className="block overflow-hidden" style={{ height: 96, borderRadius: 12, background: `repeating-linear-gradient(45deg, ${INK.soft} 0 6px, ${INK.card} 6px 12px)` }}>
          {urls[p] && <img src={urls[p]} alt={t("{label}, photo {n}", { label, n: i + 1 })} className="w-full h-full object-cover" />}
        </span>
      ))}
    </div>
  );
};

const AnswerRows: React.FC<{ questions: PositionedQuestion[]; answers: Record<string, unknown>; pad?: string }> = ({ questions, answers, pad = "10px 0" }) =>
  questions.length ? (
    <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, padding: "4px 14px", marginBottom: 10 }}>
      {questions.map((q, i) => {
        const v = answerFor(answers, q);
        return (
          <div key={q.id} style={{ padding: pad, borderTop: i ? `1px solid ${INK.b06}` : "none" }}>
            {q.sectionTitle?.trim() && (
              <p style={{ fontSize: textPx(10.5), fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: INK.prDeep, marginBottom: 4, overflowWrap: "anywhere" }}>{q.sectionTitle.trim()}</p>
            )}
            <p style={{ fontSize: textPx(12), color: INK.chF }}>{q.prompt}</p>
            <p style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch, marginTop: 2, lineHeight: 1.45, overflowWrap: "anywhere" }}>{answerText(q, v)}</p>
          </div>
        );
      })}
    </div>
  ) : null;

const AboutLine: React.FC<{ prompt: string }> = ({ prompt }) =>
  prompt.trim() ? (
    <span className="block" style={{ fontSize: textPx(11.5), color: INK.chS, marginTop: 2, overflowWrap: "anywhere" }}>
      {t("About: {question}", { question: prompt.trim() })}
    </span>
  ) : null;

/**
 * The one warning at the top of a response: the flag banner (FINAL_PLAN 3
 * §6.2, professional side: r14, status.high pale, the shield 15, 12.5 text)
 * and, since 20261222080000, urgent in the same box: "Urgent" (12.5 / 800
 * status.high) first, then the urgent answers' notes with the question each
 * is about, then the safety sentence when the answers mention topics. An
 * urgent response sets safety_flag without topics, so the sentence is left
 * out then rather than drawn empty (responseWarning). Nothing to warn about:
 * no box.
 */
export const SafetyBanner: React.FC<{ response: Pick<FormResponse, "urgent" | "safetyFlag" | "safetyTopics">; firstName: string; notes?: ResponseNote[] }> = ({ response, firstName, notes = [] }) => {
  const w = responseWarning(response);
  if (!w) return null;
  const urgentNotes = notes.filter((n) => n.urgent);
  return (
    <div role="note" className="flex items-start" style={{ gap: 8, borderRadius: 14, background: INK.hiBg, padding: "10px 12px", marginBottom: 12 }}>
      <ShieldAlert size={15} strokeWidth={2} aria-hidden style={{ color: INK.hi, flexShrink: 0, marginTop: 1 }} />
      <div className="min-w-0 flex flex-col" style={{ gap: 6, fontSize: textPx(12.5), color: INK.ch, lineHeight: 1.45 }}>
        {w.urgent && (
          <>
            <span style={{ fontWeight: 800, color: INK.hi }}>{t("Urgent")}</span>
            {urgentNotes.length ? (
              urgentNotes.map((n) => (
                <span key={n.questionId} className="block">
                  {n.note}
                  <AboutLine prompt={n.prompt} />
                </span>
              ))
            ) : (
              <span className="block">{t("{name} gave an answer this form marks urgent.", { name: firstName })}</span>
            )}
          </>
        )}
        {w.topics.length > 0 && <span className="block">{safetyBanner(w.topics, firstName)}</span>}
      </div>
    </div>
  );
};

/**
 * The notes a response's answers trigger (form_response_notes,
 * 20261222080000) that aren't urgent (those are in the warning above): the
 * answers card's look (r18, card, 1px card border), "Notes for you" 13 / 800
 * with the note icon and "Only you see these." 11.5 text.faint, then each
 * note 13 / 600 with the question it's about. None: no card.
 */
const NotesForYou: React.FC<{ notes: ResponseNote[] }> = ({ notes }) => {
  const list = notes.filter((n) => !n.urgent);
  if (!list.length) return null;
  return (
    <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, padding: "12px 14px", marginBottom: 12 }}>
      <p className="flex items-center" style={{ gap: 6, fontSize: textPx(13), fontWeight: 800, color: INK.ch }}>
        <StickyNote size={14} strokeWidth={2} aria-hidden style={{ color: INK.prDeep }} />
        {t("Notes for you")}
      </p>
      <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 2 }}>{t("Only you see these.")}</p>
      {list.map((n, i) => (
        <p key={n.questionId} style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch, lineHeight: 1.45, padding: "8px 0 0", marginTop: i ? 8 : 6, borderTop: i ? `1px solid ${INK.b06}` : "none", overflowWrap: "anywhere" }}>
          {n.note}
          <AboutLine prompt={n.prompt} />
        </p>
      ))}
    </div>
  );
};

/**
 * HO20 Check-in review (gen/r18.js checkReview18): head19 with "To review ·
 * Week {n}" and "{client_name} · {form_title}"; "Submitted {day}, {time} ·
 * compared with the last check-in" (FINAL_PLAN 3 §1.4) 12 text.faint at -6 0
 * 12; the number boxes (nboxes16); the photos card; the answers card (12
 * text.faint label, 14 / 600 answer, 1.45); "Reply to {first}" with the
 * quick replies (30 high r10 soft, 12 / 600) and the pinned "Mark as
 * reviewed"; reviewed: the good-pale line "Reviewed. {first} got your reply:
 * "…"" and "Next check-in · {client_name}" (secondary) when another waits.
 * A flagged or urgent response opens with the one warning (SafetyBanner),
 * and the notes for the professional follow it (NotesForYou). Deltas carry their sign
 * only: whether up is good depends on the question, so no colour judges it.
 */
const CheckInReview: React.FC<{ response: FormResponse; questions: PositionedQuestion[]; history: FormResponse[] | null; notes: ResponseNote[]; name: string; onReviewed: () => void }> = ({ response, questions, history, notes, name, onReviewed }) => {
  const { authUserId, professionalClients } = useApp();
  const online = useOnline();
  const navigate = useNavigate();
  const back = useBack(FORMS_PATH);
  const first = name.split(" ")[0] || name;
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [next, setNext] = useState<FormResponse | null>(null);
  const hist = useMemo(() => history ?? [response], [history, response]);
  const week = weekNumber(response, hist);
  const boxes = numberBoxes(questions, response, hist);
  const photos = photoAnswers(questions, response);
  const rest = textQuestions(questions, response);
  const hasPrev = hist.some((h) => h.submittedAt < response.submittedAt);

  useEffect(() => {
    if (!authUserId || !response.reviewedAt) return;
    let live = true;
    void fetchResponses(authUserId, { unreviewed: true, limit: 20 }).then((r) => live && r.ok && setNext(r.data.find((x) => x.id !== response.id && x.formKind === "check_in") ?? null));
    return () => {
      live = false;
    };
  }, [authUserId, response.id, response.reviewedAt]);

  const mark = async () => {
    if (busy) return;
    if (!online) return setErr(t(OFFLINE));
    setBusy(true);
    setErr(null);
    const r = await reviewResponse(response.id, reply);
    setBusy(false);
    if (!r.ok) return setErr(t(r.message));
    onReviewed();
  };
  const nextName = next ? professionalClients.find((c) => c.clientId === next.clientId)?.name ?? t("A client") : null;

  return (
    <div style={{ paddingBottom: 172 }}>
      <DetailHead eyebrow={response.reviewedAt ? t("Week {n}", { n: week }) : t("To review · Week {n}", { n: week })} title={`${name} · ${response.formTitle}`} onBack={back} />
      <p style={{ fontSize: textPx(12), color: INK.chF, margin: "-6px 0 12px" }}>
        {(hasPrev ? t("Submitted {day}, {time} · compared with the last check-in", { day: dayWord(response.submittedAt), time: time12(hhmm(response.submittedAt)) }) : t("Submitted {day}, {time}", { day: dayWord(response.submittedAt), time: time12(hhmm(response.submittedAt)) }))}
      </p>
      <SafetyBanner response={response} firstName={first} notes={notes} />
      <NotesForYou notes={notes} />
      <AddedToProfile responseId={response.id} firstName={first} />
      {boxes.length > 0 && <NumBoxes boxes={boxes.map((b) => ({ label: b.label, value: b.value, unit: b.unit, delta: b.delta, dir: null, line: b.was == null ? t("First answer") : t("Was {value}", { value: b.was }), spark: b.spark }))} />}
      {photos.map((p) => (
        <div key={p.q.id} style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, padding: "12px 14px", marginBottom: 10 }}>
          <p style={{ fontSize: textPx(12), color: INK.chF }}>{p.q.prompt}</p>
          <Photos paths={p.paths} label={p.q.prompt} />
        </div>
      ))}
      <AnswerRows questions={rest} answers={response.answers} />
      {response.reviewedAt ? (
        <div className="flex items-start" style={{ gap: 8, borderRadius: 14, background: INK.goodBg, padding: "10px 12px" }}>
          <CircleCheck size={15} strokeWidth={2} aria-hidden style={{ color: INK.good, flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: textPx(12.5), color: INK.ch, lineHeight: 1.45 }}>{response.reply ? t("Reviewed. {name} got your reply: \"{reply}\"", { name: first, reply: response.reply }) : t("Reviewed. {name} was told you reviewed it.", { name: first })}</span>
        </div>
      ) : (
        <>
          <label htmlFor="ho20-reply" className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
            {t("Reply to {name}", { name: first })}
          </label>
          <textarea
            id="ho20-reply"
            value={reply}
            maxLength={REPLY_MAX}
            rows={2}
            onChange={(e) => setReply(e.target.value)}
            className="block w-full outline-none resize-none focus:border-primary"
            style={{ ...fieldStyle(!!reply), padding: "10px 12px", lineHeight: 1.45 }}
          />
          <div className="flex flex-wrap" style={{ gap: 6, marginTop: 8 }}>
            {QUICK.map((x) => (
              <button key={x} type="button" onClick={() => setReply(t(x))} className="tap inline-flex items-center relative before:absolute before:inset-x-0 before:-inset-y-[7px] before:content-['']" style={{ height: 30, padding: "0 10px", borderRadius: 10, background: INK.soft, fontSize: textPx(12), fontWeight: 600, color: INK.chS }}>
                {t(x)}
              </button>
            ))}
          </div>
        </>
      )}
      {err && <div style={{ marginTop: 10 }}><ErrorLine>{err}</ErrorLine></div>}
      {!response.reviewedAt ? (
        <PinnedCta primary={{ label: t("Mark as reviewed"), icon: <Check size={15} />, loading: busy, onClick: () => void mark() }} />
      ) : next && nextName ? (
        <PinnedCta primary={{ label: t("Next check-in · {name}", { name: nextName }), icon: <ArrowRight size={15} className="rtl:-scale-x-100" />, onClick: () => navigate(`${FORMS_PATH}/responses/${next.id}`, { replace: true }) }} />
      ) : null}
    </div>
  );
};

const FIELD_ICON: Record<ProposalField, LucideIcon> = { allergies: Wheat, dietary_restrictions: Wheat, medications: Pill, injuries: Bandage, weight: Scale };

/**
 * CL10 "Added to {first}'s profile" (gen/r18.js intakeAnswers18): the
 * tealPale box (r16, pad 12 14, 12 below); arrow-down-to-line 14 and the
 * title 13 / 800 in teal ink; rows 6 apart, 8 under the title: the field's
 * icon 14 in teal ink, the answer as confirmed in bold 12.5 (line 1.4) and
 * where it went 11.5 in text.soft. Only the answers the client confirmed
 * (form_response_confirmed_answers); none, or no consent for them, and the
 * box isn't drawn. Also on a check-in's review: a carried question can be
 * in any form (undrawn there; the same box).
 */
const AddedToProfile: React.FC<{ responseId: string; firstName: string }> = ({ responseId, firstName }) => {
  const [answers, setAnswers] = useState<{ id: string; list: ConfirmedAnswer[] } | null>(null);
  useEffect(() => {
    let live = true;
    void fetchConfirmedAnswers(responseId).then((list) => {
      if (live) setAnswers({ id: responseId, list });
    });
    return () => {
      live = false;
    };
  }, [responseId]);
  const list = answers?.id === responseId ? answers.list : [];
  if (list.length === 0) return null;
  const ink = "rgb(var(--c-team-teal-ink))";
  return (
    <div style={{ borderRadius: 16, background: INK.tealPale, padding: "12px 14px", marginBottom: 12 }}>
      <p className="flex items-center" style={{ gap: 6, fontSize: textPx(13), fontWeight: 800, color: ink }}>
        <ArrowDownToLine size={14} strokeWidth={2} color={ink} aria-hidden />
        {t("Added to {name}’s profile", { name: firstName })}
      </p>
      <div className="flex flex-col" style={{ gap: 6, marginTop: 8 }}>
        {list.map((a) => {
          const row = confirmedAnswerRow(a);
          const Icon = FIELD_ICON[a.field];
          return (
            <span key={a.proposalId} className="flex" style={{ gap: 8, fontSize: textPx(12.5), color: INK.ch, lineHeight: 1.4 }}>
              <Icon size={14} strokeWidth={2} color={ink} className="shrink-0" aria-hidden />
              <span className="min-w-0">
                <b>{row.title}</b>
                <span className="block" style={{ fontSize: textPx(11.5), color: INK.chS }}>
                  {row.where}
                </span>
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

/**
 * CL10 Intake answers (gen/r18.js intakeAnswers18): head19 with the form as
 * the eyebrow, the client's name and the Message round button; "Submitted
 * {date} · {n} of {n} answered" 12 text.faint; the answers card (r18, pad 4
 * 14, rows 9 0 with the 6% rule, label 12 text.faint, answer 14 / 600).
 * Round D (Database 20261222070000): the "Added to {first}'s profile" box
 * lists the carried answers the client confirmed (AddedToProfile).
 * 20261222080000: the warning and the notes, as on the check-in review. The form
 * has no sections, so the answers are one card.
 */
const IntakeAnswers: React.FC<{ response: FormResponse; questions: PositionedQuestion[]; notes: ResponseNote[]; name: string }> = ({ response, questions, notes, name }) => {
  const navigate = useNavigate();
  const online = useOnline();
  const back = useBack(FORMS_PATH);
  const [err, setErr] = useState<string | null>(null);
  const first = name.split(" ")[0] || name;
  const photos = photoAnswers(questions, response);
  const rows = questions.filter((q) => q.type !== "photo" || !photos.some((p) => p.q.id === q.id));
  const message = async () => {
    if (!online) return setErr(t(OFFLINE));
    const r = await startThread(response.clientId);
    if (r.ok) navigate("/app/messages", { state: { threadId: r.threadId } });
    else setErr(t(r.message));
  };
  return (
    <div style={{ paddingBottom: 120 }}>
      <DetailHead eyebrow={response.formTitle} title={name} onBack={back} right={<RoundBtn icon={MessageCircle} label={t("Message {name}", { name: first })} onClick={() => void message()} />} />
      <p style={{ fontSize: textPx(12), color: INK.chF, margin: "-6px 0 12px" }}>{t("Submitted {date} · {answered} of {total} answered", { date: fmtDay(response.submittedAt, true), answered: answeredCount(questions, response.answers), total: questions.length })}</p>
      <SafetyBanner response={response} firstName={first} notes={notes} />
      {err && <ErrorLine>{err}</ErrorLine>}
      <NotesForYou notes={notes} />
      <AddedToProfile responseId={response.id} firstName={first} />
      <AnswerRows questions={rows} answers={response.answers} pad="9px 0" />
      {photos.map((p) => (
        <div key={p.q.id} style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, padding: "12px 14px", marginBottom: 10 }}>
          <p style={{ fontSize: textPx(12), color: INK.chF }}>{p.q.prompt}</p>
          <Photos paths={p.paths} label={p.q.prompt} />
        </div>
      ))}
    </div>
  );
};
