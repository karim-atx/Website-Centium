import React, { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { Toggle } from "../ui/Toggle";
import { useApp } from "../../context/AppContext";
import { ShieldCheck, Info } from "lucide-react";
import { PERSON_ICON } from "../../utils/icons";
import { formatDisplayDate } from "../../utils/date";
import {
  ACCESS_CATEGORIES,
  fetchLinkedProfessionals,
  fetchMyGrants,
  setGrant,
  type AccessCategory,
  type GrantMap,
  type LinkedProfessional,
} from "../../services/consent";

// The client's data-sharing controls.
//
// Previously these toggles lived on the mock professional directory's detail
// page, keyed by ids like "pr1" that are not real accounts — so nothing they
// set could ever be written, and nothing the professional saw could ever
// reflect them. They now hang off the client's REAL relationships
// (active_professional_clients) and write real rows.
export const DataSharingSection: React.FC<{
  /**
   * Narrows the section to a single professional. Used by the Profile tab,
   * which picks one from its pill row and shows the toggles in a sheet.
   * Omitted on the Professionals tab, which lists every connected
   * professional — that call site is unchanged.
   */
  professionalId?: string;
}> = ({ professionalId }) => {
  const { authUserId } = useApp();
  const [professionals, setProfessionals] = useState<LinkedProfessional[]>([]);
  const [grants, setGrants] = useState<Record<string, GrantMap>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Which (professional, category) pair is mid-write, so a toggle can't be
  // double-fired while the round trip is in flight.
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!authUserId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [linked, myGrants] = await Promise.all([
        fetchLinkedProfessionals(),
        fetchMyGrants(authUserId),
      ]);
      if (cancelled) return;
      if (linked.status === "error") {
        setError(linked.message);
        setLoading(false);
        return;
      }
      setProfessionals(linked.professionals);
      if (myGrants.status === "ok") setGrants(myGrants.grants);
      else setError(myGrants.message);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const toggle = async (professionalId: string, category: AccessCategory, next: boolean) => {
    if (!authUserId) return;
    const key = `${professionalId}:${category}`;
    // Toggle has no disabled state, so re-entry is guarded here instead of
    // changing the shared component.
    if (saving === key) return;
    setSaving(key);
    setError(null);

    // Optimistic, then reconciled against the write's outcome — a failed
    // consent change must never leave the switch showing the state the user
    // asked for but the database refused.
    const previous = grants[professionalId]?.[category];
    setGrants((g) => ({ ...g, [professionalId]: { ...g[professionalId], [category]: next } }));

    const result = await setGrant(authUserId, professionalId, category, next);
    setSaving(null);
    if (result.status === "error") {
      setGrants((g) => ({ ...g, [professionalId]: { ...g[professionalId], [category]: previous } }));
      setError(result.message);
    }
  };

  // One fetch, filtered — not a second query or a second component.
  const visible = professionalId
    ? professionals.filter((p) => p.professionalId === professionalId)
    : professionals;

  if (!authUserId || loading) return null;
  if (visible.length === 0) return null;

  return (
    <div className={professionalId ? undefined : "mb-6"}>
      {/* The sheet that renders the single-professional variant carries its
          own title, so the section heading would just repeat it. */}
      {!professionalId && (
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <ShieldCheck size={13} /> Data sharing
        </p>
      )}

      {error && <p className="text-xs font-semibold text-status-high mb-2">{error}</p>}

      {visible.map((pro) => (
        <Card key={pro.professionalId} className="mb-2.5 animate-fade-slide-up">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center shrink-0 overflow-hidden">
              {pro.avatarUrl ? (
                <img src={pro.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <PERSON_ICON size={17} className="text-primary-dark" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-charcoal truncate">{pro.name}</p>
              <p className="text-xs text-charcoal-faint">
                Connected since {formatDisplayDate(pro.joinedAt)}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-charcoal-soft mb-3">
            Choose what {pro.name} can see. Nothing is shared unless you turn it on.
          </p>

          <div className="space-y-2.5">
            {ACCESS_CATEGORIES.map(({ category, label, description }) => {
              // Absent means denied — no default-on.
              const granted = grants[pro.professionalId]?.[category] === true;
              return (
                <div key={category} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-charcoal">{label}</p>
                    <p className="text-[11px] text-charcoal-faint">{description}</p>
                  </div>
                  <Toggle
                    checked={granted}
                    onChange={(v) => void toggle(pro.professionalId, category, v)}
                    label={`Share ${label.toLowerCase()} with ${pro.name}`}
                  />
                </div>
              );
            })}
          </div>

          {/* The grant is real and the professional can read it. What it
              unlocks is not built yet, and saying otherwise would overstate
              what turning a switch on actually does today. */}
          <p className="flex items-start gap-1.5 text-[11px] text-charcoal-faint mt-3.5 pt-3 border-t border-charcoal/[0.06]">
            <Info size={12} className="mt-0.5 shrink-0" />
            <span>
              Your choices are saved and visible to {pro.name} now. The data itself isn't connected
              yet, so turning something on doesn't reveal anything to them today.
            </span>
          </p>
        </Card>
      ))}
    </div>
  );
};
