import React, { useEffect, useRef, useState } from "react";
import { Card } from "../ui/Card";
import { Toggle } from "../ui/Toggle";
import { useApp } from "../../context/AppContext";
import { ShieldCheck, Info, Check } from "lucide-react";
import { PERSON_ICON } from "../../utils/icons";
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

    const result = await setGrant(authUserId, professionalId, category, next);
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

    const declined: AccessCategory[] = [];
    for (const category of pending) {
      const result = await setGrant(authUserId, professionalId, category, false);
      if (result.status === "error") {
        setError(result.message);
        break;
      }
      declined.push(category);
    }

    setSaving(null);
    if (declined.length > 0) {
      setUnanswered((u) => ({
        ...u,
        [professionalId]: (u[professionalId] ?? []).filter((c) => !declined.includes(c)),
      }));
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

          {(unanswered[pro.professionalId]?.length ?? 0) > 0 && (
            <div className="rounded-xl bg-primary-pale border border-primary/[0.16] px-3 py-2.5 mb-3">
              <p className="text-[11.5px] font-semibold text-charcoal mb-1">
                Two things we should have asked separately
              </p>
              <p className="text-[11px] text-charcoal-soft leading-relaxed">
                When you agreed to share health metrics with {pro.name}, that one switch also
                covered your lab results and your medical history. That was too much to bundle
                into a single question. We've split it out below — your activity and vitals are
                still shared exactly as before, and{" "}
                {unanswered[pro.professionalId]!.length > 1 ? (
                  <>
                    these two are waiting on your answer. Until you answer, {pro.name} can't see
                    either one.
                  </>
                ) : (
                  <>
                    {labelFor(unanswered[pro.professionalId]![0])} is waiting on your answer.
                    Until you answer, {pro.name} can't see it.
                  </>
                )}{" "}
                Either answer is fine.
              </p>
              {/* The switches below are the "yes". This is the "no" — without
                  it the only way to decline would be to grant access and take
                  it straight back, which on medications and imaging means a
                  real disclosure in order to refuse one. */}
              <button
                onClick={() => void declineAll(pro.professionalId)}
                disabled={saving === pro.professionalId}
                className="tap mt-2.5 rounded-xl bg-white text-charcoal text-[11px] font-semibold px-3 py-1.5 shadow-soft disabled:opacity-50"
              >
                {saving === pro.professionalId
                  ? "Saving…"
                  : unanswered[pro.professionalId]!.length > 1
                  ? "Don't share these"
                  : "Don't share this"}
              </button>
            </div>
          )}

          <div className="space-y-2.5">
            {ACCESS_CATEGORIES.map(({ category, label, description }) => {
              // Absent means denied — no default-on.
              const granted = grants[pro.professionalId]?.[category] === true;
              return (
                <div key={category} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
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
