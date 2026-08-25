import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { professionalTypeIcon } from "../../utils/icons";
import { Copy, Check, UserMinus, UserCheck } from "lucide-react";
import { useState } from "react";

// V7 (QA 7.0): "Employees tab (affiliate/remove professionals via a unique
// ID, mirroring the Professional UI's own ID system)" — the business's
// unique ID (generated at onboarding) is shown here for a professional to
// enter from their own Explore tab; this view lists who has, and lets the
// business remove them.
export default function BusinessEmployeesTab() {
  const { user, businessEmployees, removeBusinessEmployee } = useApp();
  const [copied, setCopied] = useState(false);
  const employees = user.businessId ? businessEmployees[user.businessId] ?? [] : [];

  const copyId = () => {
    if (!user.businessId) return;
    navigator.clipboard?.writeText(user.businessId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <PageHeader title="Employees" subtitle="Affiliate professionals with your business" />

      <Card className="mb-6">
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
          Your business ID
        </p>
        <p className="text-[11px] text-charcoal-faint mb-3">
          Share this with a professional — they enter it from their own Explore tab to affiliate.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-sohati-pale rounded-2xl py-3 text-center">
            <p className="text-lg font-bold tracking-widest text-sohati-dark">{user.businessId ?? "—"}</p>
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
            e.professionalSubtype && e.professionalSubtype in professionalTypeIcon
              ? professionalTypeIcon[e.professionalSubtype as keyof typeof professionalTypeIcon]
              : UserCheck;
          return (
            <Card key={e.professionalId} className="flex items-center gap-3 animate-fade-slide-up">
              <span className="w-11 h-11 rounded-full bg-sohati-pale flex items-center justify-center shrink-0">
                <Icon size={18} className="text-sohati-dark" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-charcoal truncate">{e.professionalName}</p>
                {e.professionalSubtype && (
                  <p className="text-xs text-charcoal-faint capitalize">{e.professionalSubtype}</p>
                )}
              </div>
              <button
                onClick={() => user.businessId && removeBusinessEmployee(user.businessId, e.professionalId)}
                aria-label={`Remove ${e.professionalName}`}
                className="tap text-charcoal-faint shrink-0"
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
