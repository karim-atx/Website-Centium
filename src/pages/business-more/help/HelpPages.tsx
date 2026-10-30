import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  FileText,
  IdCard,
  MessageSquare,
  Package,
  Rocket,
  Search,
  ShieldCheck,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { BizCard, BizLabel, BizPage, BizRow, BizSection, RowsSkeleton, SearchBox } from "../../../components/business-more/kit";
import { useBizToast } from "../../../components/business-more/useBizToast";
import { useBusiness } from "../../../components/business-more/useBusiness";
import { ContactUsPopup } from "../../../components/profile/ContactUsPopup";
import { useOnline } from "../../../hooks/useOnline";
import { helpTopics, readMinutes, searchHelp, type HelpTopic } from "./helpContent";
import { t, tn } from "../../../i18n/core";

// MO1B-050 to -070 · Help centre (BizMoreV8 screen="helpc" / "article").
// Entry: Settings › General › Help centre (V6-152: no separate Help and legal
// hub; Settings' General rows are the entry). Contact us is the live support
// chat (A5, ContactUsPopup → start_support_thread).

const ICONS: Record<HelpTopic["icon"], LucideIcon> = {
  rocket: Rocket,
  calendar: CalendarDays,
  users: Users,
  wallet: Wallet,
  team: IdCard,
  tag: Tag,
  chart: BarChart3,
  shield: ShieldCheck,
  package: Package,
};

function useContact() {
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [toast, showToast] = useBizToast();
  const openContact = () => (online ? setOpen(true) : showToast(t("You're offline. Try again when you're connected.")));
  const node = (
    <>
      <ContactUsPopup open={open} onClose={() => setOpen(false)} />
      {toast}
    </>
  );
  return { openContact, node };
}

export function HelpCentrePage() {
  const navigate = useNavigate();
  const { kind, laneSettled } = useBusiness();
  const topics = helpTopics(kind);
  const [q, setQ] = useState("");
  const results = searchHelp(topics, q);
  const { openContact, node } = useContact();

  return (
    <BizPage title={t("Help centre")} sub={q ? undefined : t("Guides for running your business on Centium.")} offline={false}>
      <SearchBox value={q} onChange={setQ} onClear={() => setQ("")} placeholder={t("Search help articles")} label={t("Search help articles")} icon={Search} />
      {!laneSettled ? (
        // The topics differ per lane: held on the skeleton until it is known.
        <>
          <BizLabel>{t("Topics")}</BizLabel>
          <RowsSkeleton rows={5} label={t("Loading help topics")} />
        </>
      ) : q.trim() ? (
        results.length > 0 ? (
          <BizSection label={tn(results.length, "{n} result", "{n} results")}>
            {results.map(({ topic, article }) => (
              <BizRow key={`${topic.id}-${article.id}`} icon={FileText} title={article.title} desc={topic.title} onClick={() => navigate(`/app/business/more/help/${topic.id}/${article.id}`)} />
            ))}
          </BizSection>
        ) : (
          <>
            <BizLabel>{t("No results")}</BizLabel>
            <BizCard>
              <p className="text-center text-[12.5px] leading-[18px] text-charcoal-soft" style={{ padding: 24 }}>
                {t("Nothing matches \"{query}\". Try another word, or contact us.", { query: q.trim() })}
              </p>
            </BizCard>
            <BizSection>
              <BizRow icon={MessageSquare} title={t("Contact us")} desc={t("Chat with the Centium team")} onClick={openContact} />
            </BizSection>
          </>
        )
      ) : (
        <>
          <BizSection label={t("Topics")}>
            {topics.map((tp) => (
              <BizRow
                key={tp.id}
                icon={ICONS[tp.icon]}
                title={tp.title}
                desc={tp.articles
                  .slice(0, 2)
                  .map((x) => x.title)
                  .join(t(", "))}
                onClick={() => navigate(`/app/business/more/help/${tp.id}`)}
              />
            ))}
          </BizSection>
          <BizSection>
            <BizRow icon={MessageSquare} title={t("Contact us")} desc={t("Chat with the Centium team")} onClick={openContact} />
          </BizSection>
        </>
      )}
      {node}
    </BizPage>
  );
}

/** A topic or article opened directly: its text is per lane, so it waits for the lane. */
function HelpLoading() {
  return (
    <BizPage title={t("Help centre")} offline={false}>
      <RowsSkeleton rows={4} label={t("Loading help")} />
    </BizPage>
  );
}

export function HelpTopicPage() {
  const navigate = useNavigate();
  const { topic: topicId } = useParams();
  const { kind, laneSettled } = useBusiness();
  const topic = helpTopics(kind).find((tp) => tp.id === topicId);
  if (!laneSettled) return <HelpLoading />;
  if (!topic) return <HelpCentrePage />;
  return (
    <BizPage title={topic.title} sub={tn(topic.articles.length, "{n} article", "{n} articles")} offline={false}>
      <BizSection>
        {topic.articles.map((ar) => (
          <BizRow key={ar.id} icon={FileText} title={ar.title} onClick={() => navigate(`/app/business/more/help/${topic.id}/${ar.id}`)} />
        ))}
      </BizSection>
    </BizPage>
  );
}

export function HelpArticlePage() {
  const { topic: topicId, article: articleId } = useParams();
  const { kind, laneSettled } = useBusiness();
  const topic = helpTopics(kind).find((tp) => tp.id === topicId);
  const article = topic?.articles.find((x) => x.id === articleId);
  const [answered, setAnswered] = useState(false);
  const { openContact, node } = useContact();
  if (!laneSettled) return <HelpLoading />;
  if (!topic || !article) return <HelpCentrePage />;
  return (
    <BizPage title={article.title} sub={tn(readMinutes(article), "{topic} · {n} min read", "{topic} · {n} min read", { topic: topic.title })} offline={false}>
      <p className="text-[15px] font-extrabold text-charcoal" style={{ margin: "0 0 8px" }}>
        {t("Steps")}
      </p>
      <ol>
        {article.steps.map((s, i) => (
          <li key={i} className="text-[13.5px] leading-[20px] text-charcoal" style={{ margin: "0 0 10px", textWrap: "pretty" } as React.CSSProperties}>
            {/* i18n-ignore (the step number) */}
            {i + 1}.&nbsp; {s}
          </li>
        ))}
      </ol>
      <p className="text-[12.5px] font-extrabold text-charcoal" style={{ margin: "14px 0 8px" }}>
        {t("Was this helpful?")}
      </p>
      {answered ? (
        <p role="status" className="text-[12.5px] leading-[19px] text-charcoal-soft" style={{ margin: "0 0 13px" }}>
          {t("Thanks for telling us.")}
        </p>
      ) : (
        <BizSection>
          <BizRow icon={ThumbsUp} title={t("Yes")} onClick={() => setAnswered(true)} />
          <BizRow icon={ThumbsDown} title={t("No")} onClick={() => setAnswered(true)} />
        </BizSection>
      )}
      <BizSection label={t("Still need help?")}>
        <BizRow icon={MessageSquare} title={t("Contact us")} desc={t("Chat with the Centium team")} onClick={openContact} />
      </BizSection>
      {node}
    </BizPage>
  );
}
