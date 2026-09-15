import { PageHeader } from "../../components/ui/PageHeader";
import { BusinessPrototypeNotice } from "../../components/marketplace/BusinessPrototypeNotice";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { fetchMyTeam, removeTeamMember, type TeamMember } from "../../services/business-team";
import { professionalTypeIcon } from "../../utils/icons";
import { Copy, Check, UserMinus, UserCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// V7 (QA 7.0): "Employees tab (affiliate/remove professionals via a unique
// ID, mirroring the Professional UI's own ID system)" — the business's
// unique ID (generated at onboarding) is shown here for a professional to
// enter from their own Explore tab; this view lists who has, and lets the
// business remove them.
//
// REAL ROWS NOW. The list was a Record<businessId, BusinessEmployee[]> in
// localStorage that nothing ever wrote to, so it was permanently empty, and
// its remove action deleted from a map no row had ever entered.
//
// AND THE ID CARD'S INSTRUCTION WAS ALREADY FALSE. It told a business owner
// to share the code so a professional could "enter it from their own Explore
// tab" — but that form was deliberately removed when ProfessionalExplore was
// wired to real data, because business_employees_insert_business_owner
// requires auth.uid() to be the BUSINESS's profile_id. A professional cannot
// add themselves to a team however the id is collected. The copy now says
// what is actually true.
export default function BusinessEmployeesTab() {
  const { user, authUserId, profileReady } = useApp();
  const [copied, setCopied] = useState(false);
  const [employees, setEmployees] = useState<TeamMember[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  // Populate on launch; a failed read keeps whatever is on screen rather than
  // blanking the list, which would be indistinguishable from "everybody left".
  const load = useCallback(async () => {
    if (!authUserId) return;
    const result = await fetchMyTeam(authUserId);
    if (!result.ok) {
      setLoadError(result.message);
      return;
    }
    setLoadError(null);
    setBusinessId(result.businessId);
    setEmployees(result.members);
  }, [authUserId]);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [profileReady, authUserId, load]);

  const remove = async (professionalId: string) => {
    if (!businessId || removing) return;
    setRemoving(professionalId);
    const result = await removeTeamMember(businessId, professionalId);
    setRemoving(null);
    if (!result.ok) {
      setLoadError(result.message ?? "Couldn't remove them. Try again.");
      return;
    }
    setLoadError(null);
    setEmployees((prev) => prev.filter((e) => e.professionalId !== professionalId));
  };

  const copyId = () => {
    if (!user.businessId) return;
    navigator.clipboard?.writeText(user.businessId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <PageHeader title="Employees" subtitle="Affiliate professionals with your business" showBack />
      <BusinessPrototypeNotice />

      {loadError && (
        <p className="mb-3 rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-status-high">
          {loadError}
        </p>
      )}

      <Card className="mb-6">
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
          Your business ID
        </p>
        <p className="text-[11px] text-charcoal-faint mb-3">
          A reference for your own records — share it when a professional asks which business you
          are. Adding someone to the team is done from your account, not theirs.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-primary-pale rounded-2xl py-3 text-center">
            <p className="text-lg font-bold tracking-widest text-primary-dark">{user.businessId ?? "—"}</p>
          </div>
          <button
            onClick={copyId}
            aria-label="Copy business ID"
            className="tap w-11 h-11 rounded-2xl bg-cream-soft flex items-center justify-center text-charcoal-soft shrink-0"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </Card>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        Affiliated professionals
      </p>
      <div className="space-y-2.5">
        {employees.map((e) => {
          const Icon =
            e.subtype && e.subtype in professionalTypeIcon
              ? professionalTypeIcon[e.subtype as keyof typeof professionalTypeIcon]
              : UserCheck;
          return (
            <Card key={e.professionalId} className="flex items-center gap-3 animate-fade-slide-up">
              <span className="w-11 h-11 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
                <Icon size={18} className="text-primary-dark" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-charcoal truncate">{e.name}</p>
                {e.subtype && <p className="text-xs text-charcoal-faint capitalize">{e.subtype}</p>}
              </div>
              <button
                onClick={() => void remove(e.professionalId)}
                disabled={removing === e.professionalId}
                aria-label={`Remove ${e.name}`}
                className="tap text-charcoal-faint shrink-0 disabled:opacity-40"
              >
                <UserMinus size={15} />
              </button>
            </Card>
          );
        })}
        {employees.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">No professionals affiliated yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
