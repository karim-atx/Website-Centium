import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  beginToggleAttempt,
  elapsedSince,
  logToggle,
  markSharingOpened,
} from "../../services/consent/diagnostics";
import {
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

// The client's sharing grants, their write path and its safety states, in
// one place so every screen that shows these switches runs the same code:
// Profile › Connected professionals (DataSharingSection) and Cycle tracking ›
// Who can see your cycle (HE1.10.b.3, the same client_access_grants rows
// shown by category). Moved here unchanged from DataSharingSection: the
// optimistic write reconciled against its outcome, the pending-grant record
// written before the request and cleared only on success, the unanswered
// categories and their decline, the toggle diagnostics and the Saved tick.
export function useSharingGrants() {
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

  return {
    authUserId,
    professionals,
    grants,
    unanswered,
    loading,
    error,
    setError,
    saving,
    savedKey,
    unsaved,
    toggle,
    declineAll,
  };
}
