import React, { useEffect, useState } from "react";
import { Check, CircleAlert, Info } from "lucide-react";
import { useSharingGrants } from "../../../components/professionals/useSharingGrants";
import { AccessRequestNotice } from "../../../components/professionals/AccessRequestNotice";
import { ProfessionalSharedFiles } from "../../../components/health/records/ProfessionalSharedFiles";
import { ACCESS_CATEGORIES, type AccessCategory } from "../../../services/consent";
import { answerAccessRequest, firstNameOf, getMyAccessRequests, type AccessRequest } from "../../../services/access-requests";
import { HAIR, prCaps } from "./prWebStyles";
import { t, tk } from "../../../i18n/core";

/** The sharing screen's three groups (DataSharingSection's GROUPS, MO1.5.1.1), in the same order. */
const GROUPS: { label: string; categories: AccessCategory[] }[] = [
  { label: tk("Everyday tracking"), categories: ["food_diary", "workout_activity", "weight", "progress", "health_metrics", "habits"] },
  { label: tk("Health records"), categories: ["lab_results", "medical_history", "allergies_dietary", "body_measurements", "blood_pressure"] },
  { label: tk("Personal"), categories: ["cycle_phase", "pregnancy"] },
];

/** As DataSharingSection: a category not yet placed in a group goes in the last one, so no switch goes missing. */
const groupsOf = () => {
  const placed = new Set(GROUPS.flatMap((g) => g.categories));
  return GROUPS.map((g, i) => ({
    label: g.label,
    items: ACCESS_CATEGORIES.filter((c) => g.categories.includes(c.category) || (i === GROUPS.length - 1 && !placed.has(c.category))),
  }));
};

const labelFor = (category: AccessCategory): string => ACCESS_CATEGORIES.find((c) => c.category === category)?.label ?? tk("This setting");

/**
 * Website viewport v1, WC-PR.1 "Data sharing" (WC-PR Professionals Web v3,
 * `linkedShare`): the caps label, then one r16 card per group (0.5px border,
 * 10 apart): its name on #FAF9FD (padding 10 16, 13 700 #5B5349) and 52 rows
 * (the label 15 500, the 44 × 26 switch: #9A8CD6 on, #E5E5EA off, its 20 knob
 * at 21 / 3).
 *
 * The switches are the client's real grants for this professional
 * (useSharingGrants, the hook DataSharingSection runs: the optimistic write
 * reconciled against its outcome, the pending-grant record, Saved), and every
 * notice of the mobile section is kept: the professional's pending requests
 * (AccessRequestNotice; a switch turned on answers its request "yes"), the
 * split categories still waiting for an answer with their decline, the changes
 * that did not save, the "take effect straight away" line, the Vaccinations
 * row and the scans shared with them (ProfessionalSharedFiles).
 */
export const DataSharingWeb: React.FC<{ professionalId: string; onRequestsChanged?: () => void }> = ({ professionalId, onRequestsChanged }) => {
  const { authUserId, professionals, grants, unanswered, loading, error, saving, savedKey, unsaved, toggle, declineAll } = useSharingGrants();

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    // A failed read draws no notice: the switches still work (as on mobile).
    void getMyAccessRequests().then((r) => {
      if (!cancelled && r.ok) setRequests(r.requests);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const onSwitch = async (category: AccessCategory, next: boolean) => {
    const ok = await toggle(professionalId, category, next);
    if (!ok || !next) return;
    const asked = requests.find((r) => r.professionalId === professionalId && r.category === category);
    if (!asked) return;
    const answered = await answerAccessRequest(asked.id, true);
    if (answered.ok) {
      setRequests((rs) => rs.filter((r) => r.id !== asked.id));
      onRequestsChanged?.();
    }
  };

  const pro = professionals.find((p) => p.professionalId === professionalId);
  if (!authUserId || loading || !pro) return null;
  const waiting = unanswered[professionalId] ?? [];
  const mine = unsaved.filter((u) => u.professionalId === professionalId);

  return (
    <section aria-label={t("Data sharing")} data-pr-sharing>
      <p style={{ ...prCaps, margin: "0 0 8px", color: "#7D6BB5" }}>{t("Data sharing")}</p>
      {error && (
        <p role="alert" style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#C0392B" }}>
          {t(error)}
        </p>
      )}
      {mine.length > 0 && (
        <div role="alert" style={{ marginBottom: 10 }}>
          <p className="flex items-start" style={{ margin: 0, gap: 8, fontSize: 13, fontWeight: 600, color: "#C0392B" }}>
            <CircleAlert size={14} strokeWidth={2} aria-hidden style={{ flex: "none", marginTop: 3 }} />
            {mine.length > 1 ? t("Some changes didn't save") : t("A change didn't save")}
          </p>
          {mine.map((u) => (
            <p key={u.category} style={{ margin: "2px 0 0", paddingInlineStart: 22, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
              {u.requested
                ? t("{label} is still not shared with {name}. Set it again to retry.", { label: t(labelFor(u.category)), name: pro.name })
                : t("{label} is still shared with {name}. Set it again to retry.", { label: t(labelFor(u.category)), name: pro.name })}
            </p>
          ))}
        </div>
      )}
      <AccessRequestNotice
        requests={requests.filter((r) => r.professionalId === professionalId)}
        firstName={firstNameOf(pro.name)}
        labelFor={labelFor}
        onAnswered={(ids) => {
          setRequests((rs) => rs.filter((r) => !ids.includes(r.id)));
          onRequestsChanged?.();
        }}
      />
      {waiting.length > 0 && (
        <div style={{ borderRadius: 16, background: "#F0EDF9", padding: "12px 16px 4px", marginBottom: 10 }}>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#241F1B" }}>{t("Two things we should have asked separately")}</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
            {t("When you agreed to share health metrics with {name}, that one switch also covered your lab results and your medical history. That was too much to bundle into a single question. We've split it out below. Your activity and vitals are still shared exactly as before, and", { name: pro.name })}{" "}
            {waiting.length > 1
              ? t("these two are waiting on your answer. Until you answer, they can't see either one.")
              : t("{label} is waiting on your answer. Until you answer, they can't see it.", { label: t(labelFor(waiting[0])) })}{" "}
            {t("Either answer is fine.")}
          </p>
          <button
            type="button"
            onClick={() => void declineAll(professionalId)}
            disabled={saving === professionalId}
            className="pr-web-link"
            style={{ minHeight: 40, fontSize: 13, fontWeight: 700, color: "#7D6BB5", opacity: saving === professionalId ? 0.5 : 1 }}
          >
            {saving === professionalId ? t("Saving…") : waiting.length > 1 ? t("Don't share these") : t("Don't share this")}
          </button>
        </div>
      )}
      {groupsOf().map((g) => (
        <div key={g.label} data-pr-share-group style={{ borderRadius: 16, border: HAIR, overflow: "hidden", marginBottom: 10 }}>
          <p style={{ margin: 0, padding: "10px 16px", background: "#FAF9FD", fontSize: 13, fontWeight: 700, color: "#5B5349" }}>{t(g.label)}</p>
          {g.items.map(({ category, label }) => {
            const on = grants[professionalId]?.[category] === true;
            const name = t(label);
            return (
              <React.Fragment key={category}>
                <div className="flex items-center" style={{ gap: 12, minHeight: 52, padding: "0 16px", borderTop: "0.5px solid rgba(36,31,27,0.06)" }}>
                  <span className="flex items-center" style={{ flex: 1, minWidth: 0, gap: 6, fontSize: 15, fontWeight: 500, color: "#241F1B" }}>
                    {name}
                    {savedKey === `${professionalId}:${category}` && (
                      <span className="inline-flex items-center" style={{ gap: 2, fontSize: 13, fontWeight: 600, color: "#3F9165" }}>
                        <Check size={12} aria-hidden /> {t("Saved")}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={t("Share {data} with {name}", { data: name.toLowerCase(), name: pro.name })}
                    onClick={() => void onSwitch(category, !on)}
                    className="pr-web-focus"
                    style={{ width: 44, height: 26, borderRadius: 999, position: "relative", flex: "none", background: on ? "#9A8CD6" : "#E5E5EA", transition: "background-color .15s" }}
                  >
                    <span
                      aria-hidden
                      style={{ position: "absolute", top: 3, insetInlineStart: on ? 21 : 3, width: 20, height: 20, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "inset-inline-start .15s" }}
                    />
                  </button>
                </div>
                {category === "allergies_dietary" && (
                  <div data-row="vaccinations" className="flex items-center" style={{ gap: 12, minHeight: 52, padding: "0 16px", borderTop: "0.5px solid rgba(36,31,27,0.06)" }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500, color: "#241F1B" }}>{t("Vaccinations")}</span>
                    <span style={{ fontSize: 13, color: "#8C8378" }}>{t("Not recorded in Centium yet")}</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      ))}
      <p className="flex items-start" style={{ margin: "4px 0 0", gap: 6, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
        <Info size={14} aria-hidden style={{ flex: "none", marginTop: 3 }} />
        <span>{t("These take effect straight away. Turning one on lets them see that data from that moment; turning it off stops them just as quickly.")}</span>
      </p>
      <div style={{ marginTop: 16 }}>
        <ProfessionalSharedFiles professionalId={professionalId} name={pro.name} />
      </div>
    </section>
  );
};
