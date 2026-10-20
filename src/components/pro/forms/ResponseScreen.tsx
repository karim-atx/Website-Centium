import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Check, CircleCheck, MessageCircle, ShieldAlert } from "lucide-react";
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
import { numberBoxes, photoAnswers, textQuestions, weekNumber, type PositionedQuestion } from "./reviewModel";
import { fetchResponse, fetchResponses, markResponseRead, photoUrls, reviewResponse, type FormResponse } from "../../../services/pro/forms";
import { startThread } from "../../../services/messaging";
import { time12 } from "../../../utils/time12";
import { FORMS_PATH } from "./FormsHome";

const OFFLINE = "You're offline. Try again when you're connected.";
/** HO20 quick replies (COPY HO20). */
const QUICK = ["Great work", "Let's talk", "Adjusting your plan"];

function dayWord(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "today";
  if (d.toDateString() === y.toDateString()) return "yesterday";
  return fmtDay(iso);
}
const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/**
 * Release 3 · /app/more/forms/responses/:responseId: a submitted response
 * opens as HO20 Check-in review (check-ins) or CL10 Intake answers (intake).
 * It's reached from the hub's To review (pro.form.submitted / flagged), the
 * client page (Progress › Check-ins, Files › Intake form) and the next
 * check-in link. Opening it marks its To review notification read.
 */
export const ResponseScreen: React.FC = () => {
  const { responseId = "" } = useParams<{ responseId: string }>();
  const { authUserId, professionalClients } = useApp();
  const [data, setData] = useState<{ response: FormResponse; questions: PositionedQuestion[] } | null | undefined>(undefined);
  const [history, setHistory] = useState<FormResponse[] | null>(null);
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
  if (data === null) return <ComingSoon line="This response isn't available any more." />;
  const rel = professionalClients.find((c) => c.clientId === data.response.clientId);
  const name = rel?.name ?? "A client";
  return data.response.formKind === "check_in" ? (
    <CheckInReview key={data.response.id} response={data.response} questions={data.questions} history={history} name={name} onReviewed={() => setNonce((n) => n + 1)} />
  ) : (
    <IntakeAnswers response={data.response} questions={data.questions} name={name} />
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
          {urls[p] && <img src={urls[p]} alt={`${label}, photo ${i + 1}`} className="w-full h-full object-cover" />}
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
            <p style={{ fontSize: textPx(12), color: INK.chF }}>{q.prompt}</p>
            <p style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch, marginTop: 2, lineHeight: 1.45, overflowWrap: "anywhere" }}>{answerText(q, v)}</p>
          </div>
        );
      })}
    </div>
  ) : null;

/** The flag banner (FINAL_PLAN 3 §6.2, professional side): r14, status.high pale, the shield 15, 12.5 text. */
export const SafetyBanner: React.FC<{ topics: string[]; firstName: string }> = ({ topics, firstName }) => (
  <div role="note" className="flex items-start" style={{ gap: 8, borderRadius: 14, background: INK.hiBg, padding: "10px 12px", marginBottom: 12 }}>
    <ShieldAlert size={15} strokeWidth={2} aria-hidden style={{ color: INK.hi, flexShrink: 0, marginTop: 1 }} />
    <span style={{ fontSize: textPx(12.5), color: INK.ch, lineHeight: 1.45 }}>{safetyBanner(topics, firstName)}</span>
  </div>
);

/**
 * HO20 Check-in review (gen/r18.js checkReview18): head19 with "To review ·
 * Week {n}" and "{client_name} · {form_title}"; "Submitted {day}, {time} ·
 * compared with the last check-in" (FINAL_PLAN 3 §1.4) 12 text.faint at -6 0
 * 12; the number boxes (nboxes16); the photos card; the answers card (12
 * text.faint label, 14 / 600 answer, 1.45); "Reply to {first}" with the
 * quick replies (30 high r10 soft, 12 / 600) and the pinned "Mark as
 * reviewed"; reviewed: the good-pale line "Reviewed. {first} got your reply:
 * "…"" and "Next check-in · {client_name}" (secondary) when another waits.
 * A flagged response opens with the safety banner. Deltas carry their sign
 * only: whether up is good depends on the question, so no colour judges it.
 */
const CheckInReview: React.FC<{ response: FormResponse; questions: PositionedQuestion[]; history: FormResponse[] | null; name: string; onReviewed: () => void }> = ({ response, questions, history, name, onReviewed }) => {
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
    if (!online) return setErr(OFFLINE);
    setBusy(true);
    setErr(null);
    const r = await reviewResponse(response.id, reply);
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    onReviewed();
  };
  const nextName = next ? professionalClients.find((c) => c.clientId === next.clientId)?.name ?? "A client" : null;

  return (
    <div style={{ paddingBottom: 172 }}>
      <DetailHead eyebrow={`${response.reviewedAt ? "" : "To review · "}Week ${week}`} title={`${name} · ${response.formTitle}`} onBack={back} />
      <p style={{ fontSize: textPx(12), color: INK.chF, margin: "-6px 0 12px" }}>
        {`Submitted ${dayWord(response.submittedAt)}, ${time12(hhmm(response.submittedAt))}${hasPrev ? " · compared with the last check-in" : ""}`}
      </p>
      {response.safetyFlag && <SafetyBanner topics={response.safetyTopics} firstName={first} />}
      {boxes.length > 0 && <NumBoxes boxes={boxes.map((b) => ({ label: b.label, value: b.value, unit: b.unit, delta: b.delta, dir: null, line: b.was == null ? "First answer" : `Was ${b.was}`, spark: b.spark }))} />}
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
          <span style={{ fontSize: textPx(12.5), color: INK.ch, lineHeight: 1.45 }}>{response.reply ? `Reviewed. ${first} got your reply: "${response.reply}"` : `Reviewed. ${first} was told you reviewed it.`}</span>
        </div>
      ) : (
        <>
          <label htmlFor="ho20-reply" className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
            {`Reply to ${first}`}
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
              <button key={x} type="button" onClick={() => setReply(x)} className="tap inline-flex items-center relative before:absolute before:inset-x-0 before:-inset-y-[7px] before:content-['']" style={{ height: 30, padding: "0 10px", borderRadius: 10, background: INK.soft, fontSize: textPx(12), fontWeight: 600, color: INK.chS }}>
                {x}
              </button>
            ))}
          </div>
        </>
      )}
      {err && <div style={{ marginTop: 10 }}><ErrorLine>{err}</ErrorLine></div>}
      {!response.reviewedAt ? (
        <PinnedCta primary={{ label: "Mark as reviewed", icon: <Check size={15} />, loading: busy, onClick: () => void mark() }} />
      ) : next && nextName ? (
        <PinnedCta primary={{ label: `Next check-in · ${nextName}`, icon: <ArrowRight size={15} />, onClick: () => navigate(`${FORMS_PATH}/responses/${next.id}`, { replace: true }) }} />
      ) : null}
    </div>
  );
};

/**
 * CL10 Intake answers (gen/r18.js intakeAnswers18): head19 with the form as
 * the eyebrow, the client's name and the Message round button; "Submitted
 * {date} · {n} of {n} answered" 12 text.faint; the answers card (r18, pad 4
 * 14, rows 9 0 with the 6% rule, label 12 text.faint, answer 14 / 600).
 * Answers aren't carried into the profile (no backend: the "Added to
 * {first}'s profile" box is left out) and the form has no sections, so the
 * answers are one card.
 */
const IntakeAnswers: React.FC<{ response: FormResponse; questions: PositionedQuestion[]; name: string }> = ({ response, questions, name }) => {
  const navigate = useNavigate();
  const online = useOnline();
  const back = useBack(FORMS_PATH);
  const [err, setErr] = useState<string | null>(null);
  const first = name.split(" ")[0] || name;
  const photos = photoAnswers(questions, response);
  const rows = questions.filter((q) => q.type !== "photo" || !photos.some((p) => p.q.id === q.id));
  const message = async () => {
    if (!online) return setErr(OFFLINE);
    const r = await startThread(response.clientId);
    if (r.ok) navigate("/app/messages", { state: { threadId: r.threadId } });
    else setErr(r.message);
  };
  return (
    <div style={{ paddingBottom: 120 }}>
      <DetailHead eyebrow={response.formTitle} title={name} onBack={back} right={<RoundBtn icon={MessageCircle} label={`Message ${first}`} onClick={() => void message()} />} />
      <p style={{ fontSize: textPx(12), color: INK.chF, margin: "-6px 0 12px" }}>{`Submitted ${fmtDay(response.submittedAt, true)} · ${answeredCount(questions, response.answers)} of ${questions.length} answered`}</p>
      {response.safetyFlag && <SafetyBanner topics={response.safetyTopics} firstName={first} />}
      {err && <ErrorLine>{err}</ErrorLine>}
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
