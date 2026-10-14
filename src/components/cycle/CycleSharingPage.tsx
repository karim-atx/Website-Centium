import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleAlert } from "lucide-react";
import { FixedHeader } from "../ui/FixedHeader";
import { useSharingGrants } from "../professionals/useSharingGrants";
import { initials } from "../professionals/typeColour";
import { fetchProfessionalRoles, roleColours, type ProRole } from "../../services/cycle/sharing";
import type { AccessCategory } from "../../services/consent";
import * as G from "../../services/cycle/guidance";
import { CycleHelp, CycleRow, CycleSection, CycleTitleRow, Skeleton, type, useCycleMode } from "./cycleUi";

// HE1.10.b.3 "Who can see your cycle": the two cycle sharing categories, one
// section each, one row per connected professional. A SECOND VIEW OF THE SAME
// GRANTS as Profile › Connected professionals: the same hook
// (useSharingGrants), so the same write path, the same pending-grant record
// and the same "didn't save" notice (K1). Changing a switch here changes it
// there.

const CATEGORIES: { category: AccessCategory; label: string; description: string }[] = [
  { category: "cycle_phase", label: G.SHARE_PHASE_LABEL, description: G.SHARE_PHASE_DESCRIPTION },
  { category: "pregnancy", label: G.SHARE_PREGNANCY_LABEL, description: G.SHARE_PREGNANCY_DESCRIPTION },
];

export const CycleSharingPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const navigate = useNavigate();
  const { dark } = useCycleMode();
  const { professionals, grants, loading, error, saving, savedKey, unsaved, toggle } = useSharingGrants();
  const [roles, setRoles] = useState<Record<string, ProRole>>({});
  const ids = professionals.map((p) => p.professionalId).join(",");

  useEffect(() => {
    if (!ids) return;
    let live = true;
    void fetchProfessionalRoles(ids.split(",")).then((r) => {
      if (live) setRoles(r);
    });
    return () => {
      live = false;
    };
  }, [ids]);

  const unsavedHere = unsaved.filter((u) => u.category === "cycle_phase" || u.category === "pregnancy");
  const nameOf = (id: string) => professionals.find((p) => p.professionalId === id)?.name ?? "your professional";

  return (
    <div className="animate-fade-slide-up" style={{ paddingBottom: 96 }} data-cycle-page="sharing">
      <FixedHeader paddingBottom={10}>
        <CycleTitleRow title={G.SHARING_TITLE} onBack={onBack} sub />
      </FixedHeader>
      <p className="text-charcoal-soft" style={type(12.5, 19.4, 400, { marginTop: 4 })}>
        {G.SHARING_INTRO}
      </p>

      {error && (
        <p role="alert" className="flex items-start text-status-high" style={{ gap: 6, marginTop: 12, ...type(12, 16, 600) }}>
          <CircleAlert size={13} className="shrink-0" style={{ marginTop: 1.5 }} aria-hidden />
          {error}
        </p>
      )}
      {unsavedHere.length > 0 && (
        <div role="alert" style={{ marginTop: 12 }}>
          {unsavedHere.map((u) => (
            <p key={`${u.professionalId}:${u.category}`} className="flex items-start text-status-high" style={{ gap: 6, ...type(12, 16, 600) }}>
              <CircleAlert size={13} className="shrink-0" style={{ marginTop: 1.5 }} aria-hidden />
              <span>
                {CATEGORIES.find((c) => c.category === u.category)?.label} is still {u.requested ? "not " : ""}shared with {nameOf(u.professionalId)}.
                Set it again to retry.
              </span>
            </p>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ marginTop: 20 }} aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center" style={{ gap: 14, padding: "12px 0" }}>
              <Skeleton width={36} height={36} radius={18} />
              <span className="flex-1">
                <Skeleton width="55%" height={12} />
                <Skeleton width="30%" height={10} style={{ marginTop: 6 }} />
              </span>
            </div>
          ))}
        </div>
      ) : professionals.length === 0 && !error ? (
        // OURS-cycle-empty-states #8.
        <div className="text-center" style={{ marginTop: 40 }}>
          <p className="text-charcoal-soft" style={type(13, 19.5, 400)}>
            {G.SHARING_NONE}
          </p>
          <button
            type="button"
            onClick={() => navigate("/app/professionals")}
            className="tap text-primary-dark"
            style={{ marginTop: 6, minHeight: 44, ...type(13, 19.5, 700) }}
          >
            {G.SHARING_FIND}
          </button>
        </div>
      ) : (
        CATEGORIES.map(({ category, label, description }, ci) => (
          <CycleSection key={category} label={label} style={{ marginTop: ci === 0 ? 20 : 32 }}>
            <CycleHelp style={{ marginTop: 2 }}>{description}</CycleHelp>
            {professionals.map((pro, i) => {
              const role = roles[pro.professionalId];
              const c = roleColours(role?.subtype ?? null, dark);
              const on = grants[pro.professionalId]?.[category] === true;
              const key = `${pro.professionalId}:${category}`;
              return (
                <CycleRow
                  key={pro.professionalId}
                  last={i === professionals.length - 1}
                  leading={
                    <span
                      aria-hidden
                      className="shrink-0 grid place-items-center rounded-full overflow-hidden"
                      style={{ width: 36, height: 36, background: c.tint, color: c.ink, ...type(12, 18, 800) }}
                    >
                      {pro.avatarUrl ? <img src={pro.avatarUrl} alt="" className="w-full h-full object-cover" /> : initials(pro.name)}
                    </span>
                  }
                  title={
                    <>
                      {pro.name}
                      {savedKey === key && <span className="sr-only"> saved</span>}
                    </>
                  }
                  subtitle={role?.role ?? undefined}
                  subtitleColor={c.ink}
                  toggle={{
                    checked: on,
                    onChange: (v) => {
                      if (saving === key) return;
                      void toggle(pro.professionalId, category, v);
                    },
                    label: `Share ${label.toLowerCase()} with ${pro.name}`,
                  }}
                  className="[&>span:nth-child(2)>span:first-child]:truncate"
                />
              );
            })}
          </CycleSection>
        ))
      )}

      {!loading && professionals.length > 0 && (
        <p className="text-center text-charcoal-faint" style={type(11, 16, 400, { marginTop: 24 })}>
          {G.SHARING_MIRRORED}
        </p>
      )}
    </div>
  );
};
