import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Mail, MessageCircle, Search } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsBody, SettingsRow, SettingsSection } from "../../components/ui/SettingsRows";
import { SearchBox } from "../../components/business-more/kit";
import { useApp } from "../../context/AppContext";
import { fetchHelpCenter, helpContext, noteViewed, searchHelp, startSupportThreadFromHelp, voteHelpful, type HelpCenter, type HelpQuestion, type HelpTopic, type Viewed } from "../../services/help";
import { startSupportThread } from "../../services/support";
import { getLanguage, t, tn } from "../../i18n/core";

// Round I · FH (Karim 2026-11-05, decisions 8–11; Database 20261226480000):
// Help for members and professionals, from the database, in the app's
// language. Frequently asked questions first, by topic and searchable on the
// device; each answer opens in place, with "Was this helpful?". Then "Still
// need help?": the support chat, or email through the contact form. The topic
// and the questions opened go with either as data (start_support_thread_from_
// help; submit-contact's helpTopic / helpQuestions), never as text in the
// chat. The business Help centre (business-more/help) is unchanged.
//
// Designed here (no handover frame), in Settings' own sections and rows.
// Support hours and reply times (decision 9, Karim 2026-11-05) sit above the
// two options; the same for every plan.

export default function HelpPage() {
  const { user } = useApp();
  const navigate = useNavigate();
  const audience = user.accountType === "professional" ? "professional" : "member";
  const language = getLanguage() === "ar" ? "ar" : "en";
  const [center, setCenter] = useState<HelpCenter | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [viewed, setViewed] = useState<Viewed[]>([]);
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void fetchHelpCenter(audience, language).then((r) => {
      if (!live) return;
      if (r.ok) setCenter(r.value);
      else {
        setCenter(null);
        setError(r.message);
      }
    });
    return () => {
      live = false;
    };
  }, [audience, language, attempt]);

  const toggle = (topic: HelpTopic, question: HelpQuestion) => {
    if (open === question.id) return setOpen(null);
    setOpen(question.id);
    setViewed((v) => noteViewed(v, { topicId: topic.id, topicKey: topic.key, questionId: question.id, questionKey: question.key }));
  };

  const vote = (id: string, helpful: boolean) => {
    setVotes((v) => ({ ...v, [id]: helpful }));
    void voteHelpful(id, helpful);
  };

  const ctx = helpContext(viewed);
  const openChat = async () => {
    if (chatBusy) return;
    setChatBusy(true);
    setChatError(null);
    // With nothing opened there is nothing to record: the plain support chat.
    const r = ctx ? await startSupportThreadFromHelp(ctx.topicId, ctx.questionIds) : await startSupportThread();
    setChatBusy(false);
    if (!r.ok) return setChatError(r.message);
    navigate("/app/messages", { state: { threadId: r.threadId } });
  };
  // Email: the contact form, which takes the topic and question keys as data.
  const openEmail = () => navigate("/contact", { state: ctx ? { helpTopic: ctx.topicKey, helpQuestions: ctx.questionKeys } : null });

  const results = center ? searchHelp(center.topics, q) : [];
  const row = (topic: HelpTopic, question: HelpQuestion, sub?: string) => (
    <QuestionRow key={question.id} question={question} sub={sub} open={open === question.id} onToggle={() => toggle(topic, question)} vote={votes[question.id]} onVote={(h) => vote(question.id, h)} />
  );

  return (
    <div>
      <PageHeader title={t("Help")} showBack sub tightBack />
      <SettingsBody className="-mt-2">
        <SearchBox value={q} onChange={setQ} onClear={() => setQ("")} placeholder={t("Search help")} label={t("Search help")} icon={Search} />
        {center === undefined ? (
          <p role="status" className="mt-6 text-[13px] text-charcoal-soft">
            {t("Loading Help…")}
          </p>
        ) : center === null ? (
          <div className="mt-6">
            <p role="alert" className="text-[13px] font-semibold text-status-high">
              {error ? t(error) : t("Couldn't load Help. Try again.")}
            </p>
            <button
              type="button"
              onClick={() => {
                setCenter(undefined);
                setError(null);
                setAttempt((n) => n + 1);
              }}
              className="tap mt-2 text-[13px] font-bold text-primary-accent"
            >
              {t("Try again")}
            </button>
          </div>
        ) : q.trim() ? (
          <div className="mt-6">
            {results.length > 0 ? (
              <SettingsSection label={tn(results.length, "{n} result", "{n} results")}>{results.map(({ topic, question }) => row(topic, question, topic.title))}</SettingsSection>
            ) : (
              <p className="text-[13px] leading-5 text-charcoal-soft">{t("Nothing matches \"{query}\". Try another word, or contact us.", { query: q.trim() })}</p>
            )}
          </div>
        ) : (
          <div className="mt-6">
            {center.topics.map((topic) => (
              <SettingsSection key={topic.id} label={topic.title}>
                {topic.questions.map((question) => row(topic, question))}
              </SettingsSection>
            ))}
          </div>
        )}
      </SettingsBody>
      <SettingsSection label={t("Still need help?")} className="mt-8">
        <p className="pb-2 text-[12px] leading-[17px] text-charcoal-soft">
          {t("We're here Monday to Friday, 9:00–18:00 Beirut time, and reply within 1 working day, in English or Arabic.")}
        </p>
        <SettingsRow icon={MessageCircle} title={t("Live chat")} subtitle={t("Chat with the Centium team")} value={chatBusy ? t("Opening…") : undefined} onClick={() => void openChat()} />
        {chatError && (
          <p role="alert" className="ps-[50px] pb-2 -mt-1 text-[12px] font-semibold text-status-high">
            {t(chatError)}
          </p>
        )}
        <SettingsRow icon={Mail} title={t("Email")} subtitle={t("Write to us with the contact form")} onClick={openEmail} />
      </SettingsSection>
    </div>
  );
}

/** One question: a button that opens its answer in place, then "Was this helpful?". */
function QuestionRow({
  question,
  sub,
  open,
  onToggle,
  vote,
  onVote,
}: {
  question: HelpQuestion;
  sub?: string;
  open: boolean;
  onToggle: () => void;
  vote: boolean | undefined;
  onVote: (helpful: boolean) => void;
}) {
  const answerId = useId();
  return (
    <div className="relative border-b border-[var(--border-row)] last:border-b-0">
      <button type="button" aria-expanded={open} aria-controls={answerId} onClick={onToggle} className="tap w-full flex items-start gap-3 py-3 text-start">
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] leading-5 font-semibold text-charcoal">{question.question}</span>
          {sub && <span className="block mt-0.5 text-[12px] leading-4 text-charcoal-faint">{sub}</span>}
        </span>
        {/* `rotate`, not a transform class: an icon in a button already carries a transform (its press scale). */}
        <ChevronDown size={16} strokeWidth={1.75} aria-hidden className="shrink-0 mt-0.5 text-charcoal-faint" style={{ rotate: open ? "180deg" : "0deg", transition: "rotate 150ms" }} />
      </button>
      <div id={answerId} hidden={!open} className="pb-3.5">
        <p className="text-[13.5px] leading-[21px] text-charcoal-soft" style={{ textWrap: "pretty" } as React.CSSProperties}>
          {question.answer}
        </p>
        {vote === undefined ? (
          <div className="mt-2.5 flex items-center gap-2 text-[12px] text-charcoal-faint">
            <span>{t("Was this helpful?")}</span>
            {([true, false] as const).map((h) => (
              <button key={String(h)} type="button" onClick={() => onVote(h)} className="tap h-7 rounded-full px-3 text-[12px] font-bold bg-primary-pale text-primary-accent">
                {h ? t("Yes") : t("No")}
              </button>
            ))}
          </div>
        ) : (
          <p role="status" className="mt-2.5 text-[12px] text-charcoal-faint">
            {t("Thanks for telling us.")}
          </p>
        )}
      </div>
    </div>
  );
}
