import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";
import { mockGyms, mockClasses, mockMarketplaceListings } from "../../data/mockProfessionals";
import { Briefcase, Building2, Check, LogOut, MapPin } from "lucide-react";

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

      {affiliated ? (
        <Card className="bg-gradient-to-br from-primary to-primary-dark !text-white animate-fade-slide-up">
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
            Job postings are hidden while you're affiliated. Remove the affiliation to browse again — the
            business can also remove you from their side.
          </p>
          <Button variant="secondary" size="sm" onClick={removeAffiliation} className="!bg-white/15 !text-white">
            <LogOut size={13} /> Remove affiliation
          </Button>
        </Card>
      ) : (
        <>
          <Card className="mb-6 animate-fade-slide-up">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              Affiliate with a business
            </p>
            <p className="text-[11px] text-charcoal-faint mb-3">
              Enter the unique ID a business shared with you to join them.
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
                <Card key={p.id} className="flex items-start gap-3 animate-fade-slide-up">
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
        </>
      )}
    </div>
  );
}
