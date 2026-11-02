import React, { useEffect, useState } from "react";
import { Activity, UserRound } from "lucide-react";
import { Toggle } from "../ui/Toggle";
import { t } from "../../i18n/core";
import { useApp } from "../../context/AppContext";
import {
  fetchMyNameSharing,
  fetchMyOutcomeShares,
  shareMyNameWithBusiness,
  shareMyOutcomesWithBusiness,
} from "../../services/business-members";

// OURS (B7, HANDOVER §4): the member's own switches, one row per business
// that has given them a member number, in MO1.5's card language (radius 18,
// 14 padding, the section's 15/600 row titles). Both start off.
//
// TWO CARDS, TWO SWITCHES, NEVER ONE. "Your name" (MB-01,
// share_my_profile_with_business) decides whether the business sees a first
// name or "Member #0042". "Your progress" (DI-07,
// share_my_outcomes_with_business) decides whether the member's health
// figures count towards the business's group reports. Neither implies the
// other: the Database refuses a migration that links them, and the UI keeps
// them in separate cards so one tap can never change both.
//
// Names come from the rows the Memberships card already holds; `names` maps
// business id to the best one. A business with none reads "A gym or studio".

interface Row {
  businessId: string;
  memberNumber: number;
  on: boolean;
}

const SharingCard: React.FC<{
  names: Map<string, string>;
  title: string;
  body: string;
  icon: React.ReactNode;
  rows: Row[];
  sub: (row: Row) => string;
  switchLabel: (name: string) => string;
  save: (businessId: string, next: boolean) => Promise<{ ok: true; shared: boolean } | { ok: false; message: string }>;
  onSaved: (businessId: string, on: boolean) => void;
}> = ({ names, title, body, icon, rows, sub, switchLabel, save, onSaved }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flip = async (row: Row, next: boolean) => {
    setBusy(row.businessId);
    setError(null);
    const r = await save(row.businessId, next);
    setBusy(null);
    if (!r.ok) return setError(r.message);
    onSaved(row.businessId, r.shared);
  };

  return (
    <div className="mt-2 rounded-[18px] border border-charcoal/[0.08] bg-cream-card p-3.5">
      <p className="text-[15px] font-semibold text-charcoal">{title}</p>
      <p className="mt-0.5 text-xs text-charcoal-faint leading-[1.4]">{body}</p>
      {error && <p className="mt-2 text-xs font-semibold text-status-high">{error}</p>}
      <div className="mt-2 divide-y divide-charcoal/[0.06]">
        {rows.map((row) => {
          const name = names.get(row.businessId) ?? t("A gym or studio");
          return (
            <div key={row.businessId} className="flex items-center gap-3 min-h-[56px] py-2">
              <span className="w-8 h-8 rounded-[10px] bg-primary-pale flex items-center justify-center shrink-0 text-primary-dark" aria-hidden>
                {icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate text-[14px] font-semibold text-charcoal">{name}</span>
                <span className="block text-xs text-charcoal-faint">{sub(row)}</span>
              </span>
              <Toggle checked={row.on} disabled={busy === row.businessId} onChange={(next) => void flip(row, next)} label={switchLabel(name)} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const NameSharingCard: React.FC<{ names: Map<string, string> }> = ({ names }) => {
  const { authUserId, profileReady } = useApp();
  const [nameRows, setNameRows] = useState<Row[] | null>(null);
  const [progressRows, setProgressRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void Promise.all([fetchMyNameSharing(authUserId), fetchMyOutcomeShares(authUserId)]).then(([n, o]) => {
      if (cancelled || !n.ok) return;
      setNameRows(n.rows.map((r) => ({ businessId: r.businessId, memberNumber: r.memberNumber, on: r.shared })));
      // DI-07 missing on this database: no progress card rather than a switch that cannot save.
      if (o.ok) setProgressRows(n.rows.map((r) => ({ businessId: r.businessId, memberNumber: r.memberNumber, on: o.businessIds.has(r.businessId) })));
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady]);

  if (!nameRows || nameRows.length === 0) return null;
  const set = (setter: typeof setNameRows) => (businessId: string, on: boolean) =>
    setter((rs) => (rs ?? []).map((x) => (x.businessId === businessId ? { ...x, on } : x)));

  return (
    <>
      <SharingCard
        names={names}
        title={t("Your name")}
        body={t("Gyms and studios see your member number unless you choose to show your first name.")}
        icon={<UserRound size={16} strokeWidth={1.75} />}
        rows={nameRows}
        sub={(r) => (r.on ? t("Sees your first name") : t("Sees you as Member #{number}", { number: String(r.memberNumber).padStart(4, "0") }))}
        switchLabel={(name) => t("Show my first name to {name}", { name })}
        save={shareMyNameWithBusiness}
        onSaved={set(setNameRows)}
      />
      {progressRows && (
        <SharingCard
          names={names}
          title={t("Your progress")}
          body={t("Let a gym or studio count your progress in its group reports. It only sees totals for groups of 5 or more, never your own figures or whether you're included.")}
          icon={<Activity size={16} strokeWidth={1.75} />}
          rows={progressRows}
          sub={(r) => (r.on ? t("Counted in their group reports") : t("Not shared"))}
          switchLabel={(name) => t("Count my progress in {name}'s group reports", { name })}
          save={shareMyOutcomesWithBusiness}
          onSaved={set(setProgressRows)}
        />
      )}
    </>
  );
};
