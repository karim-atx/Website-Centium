import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";
import { mockGyms, mockClasses, mockMarketplaceListings } from "../../data/mockProfessionals";
import { Briefcase, Building2, Check, LogOut, MapPin, Calendar, MessageCircle, BadgeCheck, Send } from "lucide-react";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { CertificationSheet } from "../../components/profile/CertificationSheet";

// V7 (QA 7.0): the professional's own Explore tab is not a consumer
// marketplace — it's a set of job postings from businesses hiring, gated
// behind a unique-ID affiliation (a professional can only be affiliated
// with one business at a time, and hides the postings while affiliated).
const jobCategories = [
  { id: "gyms", label: "Gyms" },
  { id: "classes", label: "Classes" },
  { id: "wellness", label: "Wellness Services" },
  { id: "meal_prep", label: "Meal Prepping" },
] as const;

function hash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

const TODAY = "2026-08-20";
const deadlineFor = (h: number) => {
  const d = new Date(`${TODAY}T00:00:00`);
  d.setDate(d.getDate() + (7 + (h % 21)));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function ProfessionalExplore() {
  const { user, affiliateWithBusiness, removeAffiliation, businessDirectory } = useApp();
  const [category, setCategory] = useState<(typeof jobCategories)[number]["id"]>("gyms");
  const [idDraft, setIdDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  // V10 (QA 10.0): "Pressing on a job listing in the Job hiring, would go
  // into the detail of that listing."
  const [detailPosting, setDetailPosting] = useState<{
    id: string;
    name: string;
    location: string;
    type: string;
    hiring: boolean;
    deadline: string;
  } | null>(null);
  // QA 12.0: "When accessing a specific gym, you should be able to access
  // the business without any ID. Upon entering... have the professional
  // request messaging to the business as well as being able to submit
  // credentials if not already submitted. If submitted he can just share
  // them directly."
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [credentialsShared, setCredentialsShared] = useState(false);

  const affiliated = !!user.affiliatedBusinessId;

  const submitId = () => {
    if (!idDraft.trim()) return;
    const ok = affiliateWithBusiness(idDraft.trim());
    if (!ok) {
      const exists = businessDirectory.some((b) => b.id.toUpperCase() === idDraft.trim().toUpperCase());
      setError(exists ? "That business has reached its professional headcount limit." : "No business found with that ID.");
      return;
    }
    setError(null);
    setIdDraft("");
  };

  const postingsFor = (id: (typeof jobCategories)[number]["id"]) => {
    if (id === "gyms") return mockGyms.map((g) => ({ id: g.id, name: g.name, location: g.location }));
    if (id === "classes") return mockClasses.map((c) => ({ id: c.id, name: c.gymName, location: c.location }));
    return mockMarketplaceListings[id].map((l) => ({ id: l.id, name: l.name, location: l.location }));
  };

  return (
    <div>
      <PageHeader title="Explore" subtitle={affiliated ? "Your affiliation" : "Job postings hiring professionals"} showBack />

      {/* QA 12.0: "you should be able to access the business without any
          ID" — browsing and opening a listing's detail (message/submit
          credentials) no longer depends on having entered a business's
          affiliate ID first; that ID only remains what it always was, the
          mechanism for formally joining a business's team. */}
      {affiliated && (
        <Card className="bg-gradient-to-br from-primary to-primary-dark !text-white mb-6 animate-fade-slide-up">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Building2 size={22} className="text-white" />
            </span>
            <div>
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Affiliated with</p>
              <p className="font-display font-semibold text-lg">{user.affiliatedBusinessName}</p>
            </div>
          </div>
          <p className="text-xs text-white/80 mb-4">
            You can still browse and reach out to other listings below — affiliating with a new business
            replaces this one.
          </p>
          <Button variant="secondary" size="sm" onClick={removeAffiliation} className="!bg-white/15 !text-white">
            <LogOut size={13} /> Remove affiliation
          </Button>
        </Card>
      )}

      {!affiliated && (
        <Card className="mb-6 animate-fade-slide-up">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            Affiliate with a business
          </p>
          <p className="text-[11px] text-charcoal-faint mb-3">
            Enter the unique ID a business shared with you to formally join them.
          </p>
          <div className="flex items-center gap-2">
            <input
              value={idDraft}
              onChange={(e) => {
                setIdDraft(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="BIZ-XXXX"
              className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm font-semibold text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={submitId}
              aria-label="Confirm affiliation ID"
              className="tap w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0"
            >
              <Check size={16} strokeWidth={3} />
            </button>
          </div>
          {error && <p className="text-xs font-semibold text-[#C0392B] mt-2">{error}</p>}
        </Card>
      )}

      {/* V8 (QA 8.0): "add a 'for job hiring' title above the filters" */}
      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
        For job hiring
      </p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-5">
        {jobCategories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`tap shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              category === c.id ? "bg-primary text-white" : "bg-cream-soft text-charcoal-faint"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {postingsFor(category).map((p) => {
          const h = hash(p.id + category);
          const type = h % 2 === 0 ? "Part-time" : "Full-time";
          // V8 (QA 8.0): "show establishment name + green 'hiring'/red
          // 'not hiring' text above the part-time/full-time badge + a
          // job-listing deadline line under location."
          const hiring = h % 3 !== 0;
          return (
            <Card
              key={p.id}
              interactive
              onClick={() => {
                setMessageSent(false);
                setCredentialsShared(false);
                setDetailPosting({ id: p.id, name: p.name, location: p.location, type, hiring, deadline: deadlineFor(h) });
              }}
              className="flex items-start gap-3 animate-fade-slide-up"
            >
              <span className="w-11 h-11 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
                <Briefcase size={18} className="text-primary-dark" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-charcoal truncate">{p.name}</p>
                <p className="flex items-center gap-1 text-xs text-charcoal-faint mt-0.5">
                  <MapPin size={11} /> {p.location}
                </p>
                <p className="text-[11px] text-charcoal-faint mt-0.5">Apply by {deadlineFor(h)}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className="text-[10px] font-bold"
                  style={{ color: hiring ? "#3F9165" : "#C0392B" }}
                >
                  {hiring ? "Hiring" : "Not hiring"}
                </span>
                <span className="text-xs font-bold text-primary-dark bg-primary-pale rounded-full px-2.5 py-1.5">
                  {type}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <BottomSheet open={!!detailPosting} onClose={() => setDetailPosting(null)} title={detailPosting?.name}>
        {detailPosting && (
          <div className="space-y-4 animate-fade-slide-up">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
                <Briefcase size={20} className="text-primary-dark" />
              </span>
              <div>
                <p className="flex items-center gap-1 text-sm text-charcoal-soft">
                  <MapPin size={13} /> {detailPosting.location}
                </p>
                <p className="flex items-center gap-1 text-xs text-charcoal-faint mt-0.5">
                  <Calendar size={11} /> Apply by {detailPosting.deadline}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold rounded-full px-2.5 py-1.5"
                style={{
                  color: detailPosting.hiring ? "#3F9165" : "#C0392B",
                  background: detailPosting.hiring ? "#E3F3E9" : "#FBE7E4",
                }}
              >
                {detailPosting.hiring ? "Hiring" : "Not hiring"}
              </span>
              <span className="text-xs font-bold text-primary-dark bg-primary-pale rounded-full px-2.5 py-1.5">
                {detailPosting.type}
              </span>
            </div>
            <p className="text-sm text-charcoal-soft leading-relaxed">
              This business is looking for an affiliated professional to run sessions/classes for their
              members. Formally joining still uses their unique ID below — but you can reach out and share
              your credentials right away.
            </p>

            <div className="space-y-2.5">
              <Button
                fullWidth
                variant={messageSent ? "secondary" : "primary"}
                onClick={() => setMessageOpen(true)}
                disabled={messageSent}
              >
                <MessageCircle size={15} /> {messageSent ? "Message sent ✓" : "Message business"}
              </Button>

              {user.certificationUrl ? (
                <Button
                  fullWidth
                  variant={credentialsShared ? "secondary" : "outline"}
                  onClick={() => setCredentialsShared(true)}
                  disabled={credentialsShared}
                >
                  <BadgeCheck size={15} /> {credentialsShared ? "Credentials shared ✓" : "Share credentials directly"}
                </Button>
              ) : (
                <Button fullWidth variant="outline" onClick={() => setCertOpen(true)}>
                  <BadgeCheck size={15} /> Submit credentials
                </Button>
              )}
            </div>

            {!detailPosting.hiring && (
              <p className="text-xs text-charcoal-faint text-center">
                Not currently hiring, but you can still introduce yourself for when they are.
              </p>
            )}
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={messageOpen} onClose={() => setMessageOpen(false)} title={`Message ${detailPosting?.name ?? ""}`}>
        <div className="space-y-4 animate-fade-slide-up">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={`Hi, I'm interested in the opening at ${detailPosting?.name ?? "your business"}...`}
            rows={4}
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <Button
            fullWidth
            size="lg"
            disabled={!messageText.trim()}
            onClick={() => {
              setMessageSent(true);
              setMessageText("");
              setMessageOpen(false);
            }}
          >
            <Send size={14} /> Send
          </Button>
        </div>
      </BottomSheet>

      <CertificationSheet open={certOpen} onClose={() => setCertOpen(false)} />
    </div>
  );
}
