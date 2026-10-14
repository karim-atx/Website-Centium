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
  const openContact = () => (online ? setOpen(true) : showToast("You're offline. Try again when you're connected."));
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
    <BizPage title="Help centre" sub={q ? undefined : "Guides for running your business on Centium."} offline={false}>
      <SearchBox value={q} onChange={setQ} onClear={() => setQ("")} placeholder="Search help articles" label="Search help articles" icon={Search} />
      {!laneSettled ? (
        // The topics differ per lane: held on the skeleton until it is known.
        <>
          <BizLabel>Topics</BizLabel>
          <RowsSkeleton rows={5} label="Loading help topics" />
        </>
      ) : q.trim() ? (
        results.length > 0 ? (
          <BizSection label={`${results.length} ${results.length === 1 ? "result" : "results"}`}>
            {results.map(({ topic, article }) => (
              <BizRow key={`${topic.id}-${article.id}`} icon={FileText} title={article.title} desc={topic.title} onClick={() => navigate(`/app/business/more/help/${topic.id}/${article.id}`)} />
            ))}
          </BizSection>
        ) : (
          <>
            <BizLabel>No results</BizLabel>
            <BizCard>
              <p className="text-center text-[12.5px] leading-[18px] text-charcoal-soft" style={{ padding: 24 }}>
                Nothing matches "{q.trim()}". Try another word, or contact us.
              </p>
            </BizCard>
            <BizSection>
              <BizRow icon={MessageSquare} title="Contact us" desc="Chat with the Centium team" onClick={openContact} />
            </BizSection>
          </>
        )
      ) : (
        <>
          <BizSection label="Topics">
            {topics.map((t) => (
              <BizRow
                key={t.id}
                icon={ICONS[t.icon]}
                title={t.title}
                desc={t.articles
                  .slice(0, 2)
                  .map((x) => x.title)
                  .join(", ")}
                onClick={() => navigate(`/app/business/more/help/${t.id}`)}
              />
            ))}
          </BizSection>
          <BizSection>
            <BizRow icon={MessageSquare} title="Contact us" desc="Chat with the Centium team" onClick={openContact} />
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
    <BizPage title="Help centre" offline={false}>
      <RowsSkeleton rows={4} label="Loading help" />
    </BizPage>
  );
}

export function HelpTopicPage() {
  const navigate = useNavigate();
  const { topic: topicId } = useParams();
  const { kind, laneSettled } = useBusiness();
  const topic = helpTopics(kind).find((t) => t.id === topicId);
  if (!laneSettled) return <HelpLoading />;
  if (!topic) return <HelpCentrePage />;
  return (
    <BizPage title={topic.title} sub={`${topic.articles.length} ${topic.articles.length === 1 ? "article" : "articles"}`} offline={false}>
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
  const topic = helpTopics(kind).find((t) => t.id === topicId);
  const article = topic?.articles.find((x) => x.id === articleId);
  const [answered, setAnswered] = useState(false);
  const { openContact, node } = useContact();
  if (!laneSettled) return <HelpLoading />;
  if (!topic || !article) return <HelpCentrePage />;
  return (
    <BizPage title={article.title} sub={`${topic.title} · ${readMinutes(article)} min read`} offline={false}>
      <p className="text-[15px] font-extrabold text-charcoal" style={{ margin: "0 0 8px" }}>
        Steps
      </p>
      <ol>
        {article.steps.map((s, i) => (
          <li key={i} className="text-[13.5px] leading-[20px] text-charcoal" style={{ margin: "0 0 10px", textWrap: "pretty" } as React.CSSProperties}>
            {i + 1}.&nbsp; {s}
          </li>
        ))}
      </ol>
      <p className="text-[12.5px] font-extrabold text-charcoal" style={{ margin: "14px 0 8px" }}>
        Was this helpful?
      </p>
      {answered ? (
        <p role="status" className="text-[12.5px] leading-[19px] text-charcoal-soft" style={{ margin: "0 0 13px" }}>
          Thanks for telling us.
        </p>
      ) : (
        <BizSection>
          <BizRow icon={ThumbsUp} title="Yes" onClick={() => setAnswered(true)} />
          <BizRow icon={ThumbsDown} title="No" onClick={() => setAnswered(true)} />
        </BizSection>
      )}
      <BizSection label="Still need help?">
        <BizRow icon={MessageSquare} title="Contact us" desc="Chat with the Centium team" onClick={openContact} />
      </BizSection>
      {node}
    </BizPage>
  );
}
