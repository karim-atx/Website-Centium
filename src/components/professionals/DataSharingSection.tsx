import React, { useCallback, useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { Toggle } from "../ui/Toggle";
import { useSharingGrants } from "./useSharingGrants";
import { ProfessionalSharedFiles } from "../health/records/ProfessionalSharedFiles";
import {
  Activity,
  Baby,
  Check,
  CircleCheck,
  CircleAlert,
  ClipboardList,
  Droplet,
  Dumbbell,
  FlaskConical,
  HeartPulse,
  Info,
  Ruler,
  Scale,
  ShieldCheck,
  Syringe,
  TrendingUp,
  TriangleAlert,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { PERSON_ICON } from "../../utils/icons";
import { initials } from "./typeColour";
import { formatDisplayDate } from "../../utils/date";
import { ACCESS_CATEGORIES, type AccessCategory, type LinkedProfessional } from "../../services/consent";
import { answerAccessRequest, firstNameOf, getMyAccessRequests, type AccessRequest } from "../../services/access-requests";
import { AccessRequestNotice } from "./AccessRequestNotice";

/** MO1.5.1.1: the board's three groups. */
const GROUPS: { label: string; categories: AccessCategory[] }[] = [
  { label: "Everyday tracking", categories: ["food_diary", "workout_activity", "weight", "progress", "health_metrics", "habits"] },
  { label: "Health records", categories: ["lab_results", "medical_history", "allergies_dietary", "body_measurements", "blood_pressure"] },
  { label: "Personal", categories: ["cycle_phase", "pregnancy"] },
];

/**
 * The groups with their categories, in ACCESS_CATEGORIES order. A category
 * added later and not yet placed in a group goes in the last one, so a new
 * switch can never silently go missing from this screen.
 */
const groupsOf = () => {
  const placed = new Set(GROUPS.flatMap((g) => g.categories));
  return GROUPS.map((g, i) => ({
    label: g.label,
    items: ACCESS_CATEGORIES.filter(
      (c) => g.categories.includes(c.category) || (i === GROUPS.length - 1 && !placed.has(c.category))
    ),
  }));
};

const CATEGORY_ICON: Partial<Record<AccessCategory, LucideIcon>> = {
  // MO1.5.1.1 icon list: Utensils 16/1.75.
  food_diary: Utensils,
  workout_activity: Dumbbell,
  weight: Scale,
  progress: TrendingUp,
  health_metrics: Activity,
  // Release 3 CU8 v4 (r25.js SHARE25): circle-check, triangle-alert.
  habits: CircleCheck,
  allergies_dietary: TriangleAlert,
  lab_results: FlaskConical,
  medical_history: ClipboardList,
  body_measurements: Ruler,
  blood_pressure: HeartPulse,
  cycle_phase: Droplet,
  pregnancy: Baby,
};

/** The display label for a category, for use inside prose. */
const labelFor = (category: AccessCategory): string =>
  ACCESS_CATEGORIES.find((c) => c.category === category)?.label ?? "This setting";

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
  const {
    authUserId,
    professionals,
    grants,
    unanswered,
    loading,
    error,
    saving,
    savedKey,
    unsaved,
    toggle,
    declineAll,
  } = useSharingGrants();

  // Release 3 CU8 v4: professionals' pending requests to see a data type
  // (DB-2 access_requests). The switches are the "yes", AccessRequestNotice's
  // "Don't share this" the "no".
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const loadRequests = useCallback(async () => {
    const r = await getMyAccessRequests();
    // A failed read draws no notice: the switches still work, and the request
    // is shown again on the next open.
    if (r.ok) setRequests(r.requests);
  }, []);
  useEffect(() => {
    if (authUserId) void loadRequests();
  }, [authUserId, loadRequests]);

  /**
   * A switch turned on for a category a professional asked for also answers
   * that request "yes" (answer_access_request), so it stops being pending and
   * the professional is told. Only after the switch's own write landed.
   */
  const onSwitch = async (professionalId: string, category: AccessCategory, next: boolean) => {
    const ok = await toggle(professionalId, category, next);
    if (!ok || !next) return;
    const asked = requests.find((r) => r.professionalId === professionalId && r.category === category);
    if (!asked) return;
    const answered = await answerAccessRequest(asked.id, true);
    if (answered.ok) setRequests((rs) => rs.filter((r) => r.id !== asked.id));
  };

  /** Who a pending-change warning is about, for the message that names them. */
  const nameFor = (id: string) =>
    professionals.find((p) => p.professionalId === id)?.name ?? "your professional";

  // One fetch, filtered — not a second query or a second component.
  const visible = professionalId
    ? professionals.filter((p) => p.professionalId === professionalId)
    : professionals;

  if (!authUserId || loading) return null;
  if (visible.length === 0) return null;

  // MO1.5.1.1 (R15, batch C): the switches in three quiet groups, each row
  // with an icon tile, and they/them copy after the header (BR-15). In the
  // Profile sheet (one professional) the header is centred: avatar, name,
  // "Connected since". Every notice below is kept although the board does not
  // draw it: the unanswered-categories question with its decline, the Saved
  // ticks, and the changes that did not save.
  const header = (pro: LinkedProfessional) =>
    professionalId ? (
      // MO1.5.1.1 anatomy row 11: padding 4 8 2; the avatar is 60 (2x frame:
      // y 1258–1377).
      <div className="flex flex-col items-center text-center mb-4 pt-1 px-2 pb-0.5">
        <span className="w-[60px] h-[60px] rounded-full bg-primary-pale flex items-center justify-center overflow-hidden text-[20px] font-bold text-primary-dark">
          {pro.avatarUrl ? <img src={pro.avatarUrl} alt="" className="w-full h-full object-cover" /> : initials(pro.name)}
        </span>
        {/* MO1.5.1.1 anatomy row 11: name 18/700. */}
        <p className="mt-2.5 text-[18px] font-bold text-charcoal">{pro.name}</p>
        <p className="text-xs text-charcoal-faint">Connected since {formatDisplayDate(pro.joinedAt)}</p>
        <p className="mt-2.5 text-[12.5px] text-charcoal-soft max-w-[300px]">
          Choose what they can see. Nothing is shared unless you turn it on.
        </p>
      </div>
    ) : (
      <>
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
            <p className="text-xs text-charcoal-faint">Connected since {formatDisplayDate(pro.joinedAt)}</p>
          </div>
        </div>
        <p className="text-[11px] text-charcoal-soft mb-3">Choose what they can see. Nothing is shared unless you turn it on.</p>
      </>
    );

  const body = (pro: LinkedProfessional) => (
    <>
      {header(pro)}

      {/* Release 3 CU8 v4 "Alex asks to see lab results": the request, in this
          section's existing notice style (r25.js l.30). */}
      <AccessRequestNotice
        requests={requests.filter((r) => r.professionalId === pro.professionalId)}
        firstName={firstNameOf(pro.name)}
        labelFor={labelFor}
        onAnswered={(ids) => setRequests((rs) => rs.filter((r) => !ids.includes(r.id)))}
      />

      {/* Decision 23 (item 80): an r16 #F0EDF9 notice with a 12.5/400 body
          and a Foundations text action (13/700 primary.accent). */}
      {(unanswered[pro.professionalId]?.length ?? 0) > 0 && (
        <div
          className="rounded-2xl bg-primary-pale px-3.5 pt-3 pb-1 mb-3"
        >
          <p className="text-[12.5px] font-semibold text-charcoal mb-1">
            Two things we should have asked separately
          </p>
          <p className="text-[12.5px] text-charcoal-soft leading-normal">
            When you agreed to share health metrics with {pro.name}, that one switch also covered your lab results and
            your medical history. That was too much to bundle into a single question. We've split it out below. Your
            activity and vitals are still shared exactly as before, and{" "}
            {unanswered[pro.professionalId]!.length > 1 ? (
              <>these two are waiting on your answer. Until you answer, they can't see either one.</>
            ) : (
              <>
                {labelFor(unanswered[pro.professionalId]![0])} is waiting on your answer. Until you answer, they can't
                see it.
              </>
            )}{" "}
            Either answer is fine.
          </p>
          {/* The switches below are the "yes". This is the "no": without it the
              only way to decline would be to grant access and take it straight
              back, which on medications and imaging means a real disclosure in
              order to refuse one. */}
          <button
            onClick={() => void declineAll(pro.professionalId)}
            disabled={saving === pro.professionalId}
            className="tap min-h-11 inline-flex items-center text-[13px] font-bold text-primary-accent disabled:opacity-50"
          >
            {saving === pro.professionalId
              ? "Saving…"
              : unanswered[pro.professionalId]!.length > 1
              ? "Don't share these"
              : "Don't share this"}
          </button>
        </div>
      )}

      {groupsOf().map((g) => (
        // MO1.5.1.1 rows 12–13 are section labels: the one section-label
        // style (decision 20). Group cards radius 18 (2x frame).
        <div key={g.label} className="mt-6 first:mt-0">
          <p className="section-label text-charcoal-faint mb-2.5">{g.label}</p>
          <div className="rounded-[18px] border border-charcoal/[0.08] px-3.5">
            {g.items.map(({ category, label, description }) => {
              // Absent means denied: no default-on.
              const granted = grants[pro.professionalId]?.[category] === true;
              const Icon = CATEGORY_ICON[category] ?? ShieldCheck;
              return (
                <React.Fragment key={category}>
                  {/* MO1.5.1.1 (2x frame): a 32 r10 #F0EDF9 tile with a #7D6BB5
                      glyph (new tile, decision 22; x 72–135), and the rule from
                      the label's x (160) at #F4F4F3 (5%). */}
                  <div className="relative flex items-center gap-3 py-3 before:content-[''] before:absolute before:bottom-0 before:start-[44px] before:end-0 before:h-px before:bg-charcoal/[0.05] last:before:hidden">
                    <span className="w-8 h-8 rounded-[10px] bg-primary-pale text-primary-dark flex items-center justify-center shrink-0" aria-hidden>
                      {/* MO1.5.1.1: category icons 16/1.75. */}
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-charcoal flex items-center gap-1.5">
                        {label}
                        {savedKey === `${pro.professionalId}:${category}` && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-status-good">
                            <Check size={11} /> Saved
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-charcoal-faint">{description}</p>
                    </div>
                    <Toggle
                      checked={granted}
                      onChange={(v) => void onSwitch(pro.professionalId, category, v)}
                      label={`Share ${label.toLowerCase()} with ${pro.name}`}
                    />
                  </div>
                  {/* Release 3 CU8 v4 (r25.js SHARE25: syringe, "Vaccinations",
                      "Not recorded in Centium yet"), right after Allergies and
                      dietary needs. Informational only (FINAL_PLAN W7): there is
                      no vaccination data and no category, so no switch. */}
                  {category === "allergies_dietary" && (
                    <div
                      data-row="vaccinations"
                      className="relative flex items-center gap-3 py-3 before:content-[''] before:absolute before:bottom-0 before:start-[44px] before:end-0 before:h-px before:bg-charcoal/[0.05] last:before:hidden"
                    >
                      <span className="w-8 h-8 rounded-[10px] bg-primary-pale text-primary-dark flex items-center justify-center shrink-0" aria-hidden>
                        <Syringe size={16} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-charcoal">Vaccinations</p>
                        <p className="text-[11px] text-charcoal-faint">Not recorded in Centium yet</p>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}

      {/* THIS USED TO SAY THE OPPOSITE ("turning something on doesn't reveal
          anything to them today"), which was wrong in the most dangerous
          direction: eighteen RLS policies and two Storage policies gate
          professional access on these switches. Turning one on discloses real
          clinical data to a real person, immediately. */}
      <p className="flex items-start gap-1.5 text-[11px] text-charcoal-faint mt-3.5 pt-3 border-t border-charcoal/[0.06]">
        <Info size={12} className="mt-0.5 shrink-0" />
        <span>
          These take effect straight away. Turning one on lets them see that data from that moment; turning it off
          stops them just as quickly.
        </span>
      </p>
    </>
  );

  return (
    <div className={professionalId ? undefined : "mb-6"}>
      {/* The sheet that renders the single-professional variant carries its
          own title, so the section heading would just repeat it. */}
      {!professionalId && (
        <p className="section-label text-charcoal-faint mb-2 flex items-center gap-1.5">
          <ShieldCheck size={13} /> Data sharing
        </p>
      )}

      {error && <p className="text-xs font-semibold text-status-high mb-2">{error}</p>}

      {/* SAID IN WORDS, not left as a switch that quietly sprang back: the
          database came back disagreeing with what this device asked for, so
          the change is not in effect. Named per professional even inside the
          single-professional sheet. */}
      {/* Decision 23 (item 81): the Foundations
          inline danger line (CircleAlert 13 + 12/600 danger), with which
          switch it was under it at the text's x. */}
      {unsaved.length > 0 && (
        <div role="alert" className="mb-3">
          <p className="flex items-start gap-2 text-xs font-semibold text-status-high">
            <CircleAlert size={13} strokeWidth={2} className="shrink-0 mt-px" aria-hidden />
            {unsaved.length > 1 ? "Some changes didn't save" : "A change didn't save"}
          </p>
          {unsaved.map((u) => (
            <p key={`${u.professionalId}:${u.category}`} className="ps-[21px] mt-0.5 text-xs text-charcoal-soft leading-normal">
              {labelFor(u.category)} is still {u.requested ? "not " : ""}shared with {nameFor(u.professionalId)}. Set it
              again to retry.
            </p>
          ))}
        </div>
      )}

      {visible.map((pro) =>
        professionalId ? (
          <div key={pro.professionalId} className="animate-fade-slide-up">
            {body(pro)}
            {/* OURS-imaging-revoke #3-#4 (Database B2, imaging_shares): the
                scans shared with this professional, one by one, each with
                Stop sharing (Health B component). */}
            <div className="mt-6">
              <ProfessionalSharedFiles professionalId={pro.professionalId} name={pro.name} />
            </div>
          </div>
        ) : (
          <Card key={pro.professionalId} className="mb-2.5 animate-fade-slide-up">
            {body(pro)}
          </Card>
        )
      )}
    </div>
  );
};
