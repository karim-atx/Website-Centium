import React, { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { Toggle } from "../ui/Toggle";
import { useApp } from "../../context/AppContext";
import { fetchMyNameSharing, memberNumberLabel, shareMyNameWithBusiness, type MyNameSharing } from "../../services/business-members";

// OURS (B7 MB-01, HANDOVER §4 "members shown by name only if they shared
// their profile, otherwise Member #code"): the member's own switch, one row
// per business that has given them a member number. Off by default; the
// business sees "Member #0042" until it is on. Turning it off keeps the
// number, and turning it on again works. Drawn in MO1.5's card language
// (radius 18, 14 padding, the section's 15/600 row titles).
//
// Names come from the rows the card already holds (my_business_memberships'
// business name, a gym membership's venue name); `names` maps business id to
// the best one. A business with none reads "A gym or studio".

export const NameSharingCard: React.FC<{ names: Map<string, string> }> = ({ names }) => {
  const { authUserId, profileReady } = useApp();
  const [rows, setRows] = useState<MyNameSharing[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void fetchMyNameSharing(authUserId).then((r) => {
      if (!cancelled && r.ok) setRows(r.rows);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady]);

  if (!rows || rows.length === 0) return null;

  const flip = async (row: MyNameSharing, next: boolean) => {
    setBusy(row.businessId);
    setError(null);
    const r = await shareMyNameWithBusiness(row.businessId, next);
    setBusy(null);
    if (!r.ok) return setError(r.message);
    setRows((rs) => (rs ?? []).map((x) => (x.businessId === row.businessId ? { ...x, shared: r.shared } : x)));
  };

  return (
    <div className="mt-2 rounded-[18px] border border-charcoal/[0.08] bg-cream-card p-3.5">
      <p className="text-[15px] font-semibold text-charcoal">Your name</p>
      <p className="mt-0.5 text-xs text-charcoal-faint leading-[1.4]">
        Gyms and studios see your member number unless you choose to show your first name.
      </p>
      {error && <p className="mt-2 text-xs font-semibold text-status-high">{error}</p>}
      <div className="mt-2 divide-y divide-charcoal/[0.06]">
        {rows.map((row) => {
          const name = names.get(row.businessId) ?? "A gym or studio";
          return (
            <div key={row.businessId} className="flex items-center gap-3 min-h-[56px] py-2">
              <span className="w-8 h-8 rounded-[10px] bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
                <UserRound size={16} strokeWidth={1.75} className="text-primary-dark" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate text-[14px] font-semibold text-charcoal">{name}</span>
                <span className="block text-xs text-charcoal-faint">
                  {row.shared ? "Sees your first name" : `Sees you as ${memberNumberLabel(row.memberNumber)}`}
                </span>
              </span>
              <Toggle
                checked={row.shared}
                disabled={busy === row.businessId}
                onChange={(next) => void flip(row, next)}
                label={`Show my first name to ${name}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
