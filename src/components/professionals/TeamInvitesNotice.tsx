import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight } from "lucide-react";
import { Card } from "../ui/Card";
import { fetchMyEmployments, type MyEmployment } from "../../services/business-team/employment";

/**
 * v6 Batch 4 · B0 consent: the professional's dashboard notice for business
 * invitations they haven't answered (accepted_at null in
 * my_business_employments). Opens Your businesses, where they accept or
 * decline. Shows nothing while loading, on a failed read, or with none.
 */
export function TeamInvitesNotice({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [pending, setPending] = useState<MyEmployment[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchMyEmployments().then((r) => {
      if (!cancelled && r.ok) setPending(r.value.filter((e) => !e.acceptedAt));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (pending.length === 0) return null;
  const n = pending.length;
  return (
    <Card interactive onClick={() => navigate("/app/businesses")} className={`flex items-center gap-3 ${className ?? ""}`}>
      <span className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
        <Building2 size={17} className="text-primary-dark" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-charcoal">{n === 1 ? "A business invited you to their team" : `${n} businesses invited you to their teams`}</p>
        <p className="text-xs text-charcoal-faint truncate">
          {n === 1 ? `${pending[0].businessName} · accept or decline` : pending.map((e) => e.businessName).join(", ")}
        </p>
      </div>
      <ChevronRight size={16} className="text-charcoal-faint shrink-0" />
    </Card>
  );
}
