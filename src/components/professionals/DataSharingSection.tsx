import React, { useEffect, useRef, useState } from "react";
import { Card } from "../ui/Card";
import { Toggle } from "../ui/Toggle";
import { useApp } from "../../context/AppContext";
import {
  Activity,
  Baby,
  Check,
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
  TrendingUp,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { PERSON_ICON } from "../../utils/icons";
import { initials } from "./typeColour";
import { formatDisplayDate } from "../../utils/date";
import {
  beginToggleAttempt,
  elapsedSince,
  logToggle,
  markSharingOpened,
} from "../../services/consent/diagnostics";
import {
  ACCESS_CATEGORIES,
  fetchLinkedProfessionals,
  fetchMyGrants,
  setGrant,
  type AccessCategory,
  type GrantMap,
  type LinkedProfessional,
  type UnansweredMap,
} from "../../services/consent";
import {
  clearPendingGrant,
  recordPendingGrant,
  reconcilePendingGrants,
  type PendingGrantChange,
} from "../../services/consent/pending";

/** MO1.5.1.1: the board's three groups. */
const GROUPS: { label: string; categories: AccessCategory[] }[] = [
  { label: "Everyday tracking", categories: ["food_diary", "workout_activity", "weight", "progress", "health_metrics"] },
  { label: "Health records", categories: ["lab_results", "medical_history", "body_measurements", "blood_pressure"] },
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
  const { authUserId } = useApp();
  const [professionals, setProfessionals] = useState<LinkedProfessional[]>([]);
  const [grants, setGrants] = useState<Record<string, GrantMap>>({});
  // Categories a split created that this client has never answered. Drives
  // the re-consent notice; see `isUnanswered` in services/consent.
  const [unanswered, setUnanswered] = useState<UnansweredMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Which (professional, category) pair is mid-write, so a toggle can't be
  // double-fired while the round trip is in flight.
  const [saving, setSaving] = useState<string | null>(null);
  // Which switch just saved, so a successful write has a visible outcome.
  //
  // Without it the only signal is the switch staying where it was put — and
  // that looks identical whether the write landed or was reverted, since a
  // revert also leaves the switch in a plausible-looking position. Telling
  // the two apart meant noticing the error text specifically, which on a
  // control that gates PHI is too easy to miss. Deliberately says nothing on
  // failure: the error message already owns that case, and two signals for
  // one outcome is noise.
  const [savedKey, setSavedKey] = useState<string | null>(null);
  // Changes this device asked for that the database does not reflect. Filled
  // on load by comparing the record written before each write against what the
  // server actually returned, and retired per switch as soon as that switch
  // gets a direct answer — see services/consent/pending.
  //
  // Kept separate from `error`, which reports a write that failed in front of
  // the client. This reports one that failed behind their back, possibly in a
  // different session, and it is the more important of the two: nobody saw it
  // happen.
  const [unsaved, setUnsaved] = useState<PendingGrantChange[]>([]);
  const savedTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    },
    []
  );

  // Timing baseline for the toggle diagnostics — see services/consent/
  // diagnostics.ts for what this is chasing and why success is logged too.
  useEffect(markSharingOpened, []);

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
      if (myGrants.status === "ok") {
        setGrants(myGrants.grants);
        setUnanswered(myGrants.unanswered);
        // Only against a successful read. Reconciling against a failed one
        // would compare the client's intent with an empty map and report every
        // pending change as lost.
        setUnsaved(reconcilePendingGrants(authUserId, myGrants.grants));
      } else setError(myGrants.message);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const toggle = async (professionalId: string, category: AccessCategory, next: boolean) => {
    // Allocated before the first early return, so "the handler ran" is
    // recorded even when it then declines to do anything.
    const probe = beginToggleAttempt();

    if (!authUserId) {
      logToggle("skipped", { attempt: probe.id, category, reason: "no session" });
      return;
    }
    const key = `${professionalId}:${category}`;
    // Guarded here rather than by disabling the switch: a consent toggle that
    // greys out mid-write reads as "you may not change this", which is the
    // wrong message for a control the client owns outright.
    if (saving === key) {
      // Worth its own line: a suppressed attempt is what a rapid double-click
      // looks like from in here, and that was a real hypothesis once.
      logToggle("skipped", {
        attempt: probe.id,
        category,
        reason: "write already in flight",
        msSinceLastAttempt: probe.msSinceLastAttempt,
      });
      return;
    }
    setSaving(key);
    setError(null);

    // Optimistic, then reconciled against the write's outcome — a failed
    // consent change must never leave the switch showing the state the user
    // asked for but the database refused.
    const previous = grants[professionalId]?.[category];
    logToggle("attempt", {
      attempt: probe.id,
      at: new Date(probe.startedAt).toISOString(),
      category,
      requested: next,
      previous,
      msSinceOpened: probe.msSinceOpened,
      msSinceLastAttempt: probe.msSinceLastAttempt,
    });
    setGrants((g) => ({ ...g, [professionalId]: { ...g[professionalId], [category]: next } }));

    // WRITTEN BEFORE THE REQUEST, not after, and that ordering is the whole
    // point: the failure this guards against is one where nothing after the
    // request ever runs. keepalive carries the write across a page unload;
    // this carries the QUESTION across it, so the next load can ask whether
    // the answer arrived.
    recordPendingGrant(authUserId, professionalId, category, next);

    const result = await setGrant(authUserId, professionalId, category, next);
    // CLEARED ONLY ON SUCCESS, and only because testing showed what clearing
    // on failure actually does. A page unload does not leave the request
    // hanging — it REJECTS it, so the await resumes, setGrant catches the
    // abort and returns an error, and a clear-on-either-outcome deleted the
    // record microseconds before the document died. The witness was destroyed
    // by the very event it existed to survive, and the reconciliation never
    // fired once in a real run.
    //
    // Keeping the record after a visible error costs at most one extra
    // message on the next load, and only when the database genuinely still
    // disagrees. Losing it costs a silent PHI exposure.
    if (result.status === "ok") {
      clearPendingGrant(authUserId, professionalId, category);
      // The standing warning about this switch retires with it: the client has
      // just been given a direct answer about this exact category, and a
      // notice about the previous attempt beside it would contradict whichever
      // one they read second.
      setUnsaved((u) => u.filter((p) => !(p.professionalId === professionalId && p.category === category)));
    }
    // Paired with the line above by `attempt`. `checkmark` is the handler's
    // own decision rather than an observation of the rendered UI — it is the
    // only thing that sets savedKey, so a checkmark appearing when this says
    // false would mean a second code path exists, which is itself the finding.
    logToggle("outcome", {
      attempt: probe.id,
      category,
      requested: next,
      status: result.status,
      message: result.status === "error" ? result.message : undefined,
      checkmark: result.status === "ok",
      ms: elapsedSince(probe),
    });
    setSaving(null);
    if (result.status === "error") {
      setGrants((g) => ({ ...g, [professionalId]: { ...g[professionalId], [category]: previous } }));
      setError(result.message);
      return;
    }
    // The question has now been answered, so the notice retires for that
    // category. Done after the write rather than optimistically: a notice
    // that vanished on a write the database then refused would leave the
    // client believing they had answered something they had not.
    setUnanswered((u) => ({
      ...u,
      [professionalId]: (u[professionalId] ?? []).filter((c) => c !== category),
    }));

    setSavedKey(key);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSavedKey(null), 2000);
  };

  /**
   * Answers "no" to every category still awaiting a first answer.
   *
   * WHY THIS EXISTS AT ALL. The switches can only ever say yes to these. An
   * unanswered category renders off, so its onChange always fires `true` —
   * meaning that without this, declining was not something the UI could
   * express, and the client's only route to "no" would have been to grant
   * access and immediately take it back. On medications and imaging, a
   * round trip of real disclosure is not an acceptable way to say no.
   *
   * The write is issued even though `granted` is already false, and that is
   * the entire point: record_declined_consent stamps revoked_at on exactly
   * that no-op UPDATE, which is what turns "never asked" into "asked and
   * declined". Skipping the write because the value looks unchanged would
   * leave the decline unrecorded and the client asked again forever.
   */
  const declineAll = async (professionalId: string) => {
    if (!authUserId) return;
    const pending = unanswered[professionalId] ?? [];
    if (pending.length === 0 || saving === professionalId) return;
    setSaving(professionalId);
    setError(null);

    // CONCURRENT, NOT SEQUENTIAL, and that is a fix rather than a tidy-up.
    // Awaiting each write before building the next meant the later requests
    // did not exist yet when a page unload arrived — keepalive can carry a
    // request that has been sent, not one that was never made. Issuing them
    // together puts every decline in flight in the same tick, so an unload
    // catches all of them or none.
    //
    // The rows are distinct by category, so there is nothing to serialise for:
    // no two of these writes touch the same row.
    pending.forEach((category) => recordPendingGrant(authUserId, professionalId, category, false));
    const results = await Promise.all(
      pending.map(async (category) => ({
        category,
        result: await setGrant(authUserId, professionalId, category, false),
      }))
    );
    // Only the ones that actually landed, for the reason spelt out in toggle:
    // an aborted request comes back as an error, and clearing on an error
    // throws away the record that would have caught it.
    results
      .filter((r) => r.result.status === "ok")
      .forEach(({ category }) => clearPendingGrant(authUserId, professionalId, category));

    // Every category is attempted now, where the loop stopped at the first
    // failure. On a control whose whole purpose is to say no, recording four
    // of five noes beats recording one and abandoning the rest.
    const declined = results.filter((r) => r.result.status === "ok").map((r) => r.category);
    const firstFailure = results.find((r) => r.result.status === "error")?.result;
    if (firstFailure?.status === "error") setError(firstFailure.message);

    setSaving(null);
    if (declined.length > 0) {
      setUnanswered((u) => ({
        ...u,
        [professionalId]: (u[professionalId] ?? []).filter((c) => !declined.includes(c)),
      }));
    }
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

      {/* Decision 23 (item 80), in the Profile sheet only: an r16 #F0EDF9
          notice with a 12.5/400 body and a Foundations text action (13/700
          primary.accent). The Professionals tab keeps its notice. */}
      {(unanswered[pro.professionalId]?.length ?? 0) > 0 && (
        <div
          className={
            professionalId
              ? "rounded-2xl bg-primary-pale px-3.5 pt-3 pb-1 mb-3"
              : "rounded-xl bg-primary-pale border border-primary/[0.16] px-3 py-2.5 mb-3"
          }
        >
          <p className={professionalId ? "text-[12.5px] font-semibold text-charcoal mb-1" : "text-[11.5px] font-semibold text-charcoal mb-1"}>
            Two things we should have asked separately
          </p>
          <p className={professionalId ? "text-[12.5px] text-charcoal-soft leading-normal" : "text-[11px] text-charcoal-soft leading-relaxed"}>
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
            className={
              professionalId
                ? "tap min-h-11 inline-flex items-center text-[13px] font-bold text-primary-accent disabled:opacity-50"
                : "tap mt-2.5 rounded-xl bg-cream-card text-charcoal text-[11px] font-semibold px-3 py-1.5 shadow-soft disabled:opacity-50"
            }
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
                // MO1.5.1.1 (2x frame): a 32 r10 #F0EDF9 tile with a #7D6BB5
                // glyph (new tile, decision 22; x 72–135), and the rule from
                // the label's x (160) at #F4F4F3 (5%).
                <div
                  key={category}
                  className="relative flex items-center gap-3 py-3 before:content-[''] before:absolute before:bottom-0 before:start-[44px] before:end-0 before:h-px before:bg-charcoal/[0.05] last:before:hidden"
                >
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
                    onChange={(v) => void toggle(pro.professionalId, category, v)}
                    label={`Share ${label.toLowerCase()} with ${pro.name}`}
                  />
                </div>
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
      {/* Decision 23 (item 81), in the Profile sheet only: the Foundations
          inline danger line (CircleAlert 13 + 12/600 danger), with which
          switch it was under it at the text's x. */}
      {unsaved.length > 0 && professionalId && (
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
      {unsaved.length > 0 && !professionalId && (
        <div className="rounded-2xl bg-status-high-bg border border-status-high/30 px-3.5 py-3 mb-2.5">
          <p className="text-[11.5px] font-semibold text-status-high mb-1">
            {unsaved.length > 1 ? "Some changes didn't save" : "A change didn't save"}
          </p>
          {unsaved.map((u) => (
            <p key={`${u.professionalId}:${u.category}`} className="text-[11px] text-charcoal-soft leading-relaxed">
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
