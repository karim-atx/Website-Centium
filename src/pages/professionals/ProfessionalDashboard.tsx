import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import {
  acceptHireRequest,
  fetchHireInbox,
  rejectHireRequest,
  type HireRequestRow,
} from "../../services/hire-inbox";
import { AddClientSheet } from "../../components/professionals/AddClientSheet";
import { ClientDetailSheet } from "../../components/professionals/ClientDetailSheet";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { ChevronRight, Plus, Search, HeartPulse, TrendingDown, TrendingUp, Inbox, Check, X, HeartHandshake } from "lucide-react";
import { PERSON_ICON } from "../../utils/icons";
import { formatDisplayDate } from "../../utils/date";
import { HealthDataPending } from "../../components/professionals/HealthDataPending";
import { nutritionLine, nutritionLineRecoverySensitive } from "../../utils/nutritionDisplay";
import { countsTowardTrainedTally, workoutBadge } from "../../utils/workoutDisplay";
import clsx from "clsx";

const activityLevelLabel: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Lightly active",
  moderate: "Moderately active",
  very_active: "Very active",
  athlete: "Athlete",
};

export default function ProfessionalDashboard() {
  // pendingClientRequests / acceptClientRequest / rejectClientRequest are
  // deliberately NOT read here any more. They are a localStorage array that
  // nothing real ever wrote to, and answering one cleared a local row while
  // the database knew nothing about it. The inbox below now reads
  // pending_client_requests and answers through accept_client_request and
  // reject_client_request.
  //
  // They stay in AppContext because submitClientRequest still writes to that
  // array from ProfessionalDetail's mock hire flow, which is out of scope
  // here. So the array is now written by the mock path and read by nobody.
  const { user, professionalClients, authUserId, refreshRoster } = useApp();
  const [addOpen, setAddOpen] = useState(false);

  /**
   * Incoming hire requests, read on mount and after every answer.
   *
   * ON DEMAND, NOT LIVE. pending_client_requests is not in the realtime
   * publication, so a request that arrives while this page is open shows up on
   * the next load rather than immediately — the same trade the pin banner made
   * before it got a subscription.
   *
   * REFRESHED AFTER AN ANSWER AS WELL AS REMOVED LOCALLY. The optimistic
   * removal is what makes the row disappear under the finger; the refresh is
   * what catches the case where it was already resolved elsewhere, or where
   * accepting failed on the tier limit and the row is still waiting.
   */
  const [requests, setRequests] = useState<HireRequestRow[]>([]);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [answering, setAnswering] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
    // Returns rather than clearing, so there is no synchronous setState on the
    // effect's first pass. Signing out unmounts this page, so there is no
    // stale list left behind to worry about.
    if (!authUserId) return;
    const res = await fetchHireInbox(authUserId);
    if (res.status === "ok") {
      setRequests(res.requests);
      setInboxError(null);
    } else {
      setInboxError(res.message);
    }
  }, [authUserId]);

  // The mount read is its own effect rather than a call to loadInbox, for two
  // reasons: it carries a cancelled guard, so a fast unmount cannot set state
  // on a gone component; and calling a callback that closes over setState is
  // indistinguishable from a synchronous setState to the linter, which is a
  // real distinction here — the writes below happen after an await.
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void (async () => {
      const res = await fetchHireInbox(authUserId);
      if (cancelled) return;
      if (res.status === "ok") setRequests(res.requests);
      else setInboxError(res.message);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const answer = async (id: string, action: "accept" | "reject") => {
    if (answering) return;
    setAnswering(id);
    setInboxError(null);
    const res = action === "accept" ? await acceptHireRequest(id) : await rejectHireRequest(id);
    setAnswering(null);

    if (res.status === "ok") {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      // Accepting creates a roster row, so the client list behind this page is
      // now out of date as well as the inbox.
      if (action === "accept") await refreshRoster();
      await loadInbox();
      return;
    }
    if (res.status === "already_resolved") {
      // Someone answered it elsewhere. Not an error worth a red message —
      // the refresh below makes the list agree with the database.
      setRequests((prev) => prev.filter((r) => r.id !== id));
      await loadInbox();
      return;
    }
    if (res.status === "tier_limit_reached") {
      // An expected outcome, not a fault: the request is still pending and
      // still answerable once they have room, so the row stays.
      setInboxError(
        "You've reached your plan's client limit. Upgrade, or remove a client, to accept this one."
      );
      return;
    }
    setInboxError(res.message);
  };
  // Holds just the id, not a snapshot of the whole client object — a
  // snapshot would go stale the moment anything about the client (e.g.
  // the recovery-sensitive toggle) changes while the sheet is still open,
  // since updates land in `professionalClients` and never touch a copy
  // held in local state.
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const activeClient = professionalClients.find((c) => c.id === activeClientId) ?? null;
  // QA 12.0: "Between the search and plus logo should be an inbox logo
  // that shows new clients that hire the professional upon successful
  // payment... accept or reject."
  const [inboxOpen, setInboxOpen] = useState(false);
  // V9 (QA 9.0): "a grey search minimalistic logo that when pressed allows
  // you to search clients"
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleClients = professionalClients.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  // Design refinement §6.10: the hero answers "who needs me today" instead
  // of just restating the roster size, and the 3-segment track below maps
  // onto trained / not yet / not counted.
  const total = professionalClients.length;

  // THE DENOMINATOR IS TRACKED CLIENTS, NOT THE WHOLE ROSTER.
  //
  // It used to be professionalClients.length, so "1 of 5 trained" told a
  // professional that four people had not trained when three of them had
  // simply never shared their workouts. That is an absence rendered as a
  // measurement, about exactly the people who withheld consent — the same
  // error as the "0 kcal" card, and worse for being about a withholding.
  //
  // Recovery-sensitive clients are excluded too, per QA 12.0: a roster-wide
  // adherence tally is a compliance score, which is what that constraint keeps
  // off routine surfaces. Both groups still occupy the grey segment of the
  // track below, so the roster size is not misrepresented — they are just
  // never counted as having failed to do something.
  const tracked = professionalClients.filter((c) =>
    countsTowardTrainedTally(c.access, c.workout, c.recoverySensitive)
  );
  const trained = tracked.filter((c) => c.workout?.trainedToday === true).length;
  const notTrained = tracked.length - trained;
  const noData = total - tracked.length;
  const missingClient = tracked.find((c) => c.workout?.trainedToday !== true);
  // `access` is real (client_access_grants); the rest of the hero's figures
  // are not, so the hero is suppressed entirely rather than rendered against
  // absent data — see HealthDataPending.
  const sharedCount = professionalClients.filter((c) => Object.values(c.access).some(Boolean)).length;
  const programCount = professionalClients.filter((c) => c.assignedProgramName).length;
  // The hero needs at least one client it can honestly count. Without that
  // every figure collapses to zero, and "0 of 0 trained" reads as a
  // measurement rather than an absence — so it is replaced outright.
  const hasTrainingData = tracked.length > 0;

  return (
    <div>
      <PageHeader
        title="My Clients"
        subtitle={user.firstName}
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search clients"
              className="tap w-10 h-10 rounded-full bg-cream-card border border-charcoal/[0.11] text-charcoal-soft flex items-center justify-center"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => setInboxOpen(true)}
              aria-label="New client requests"
              className="tap relative w-10 h-10 rounded-full bg-cream-card border border-charcoal/[0.11] text-charcoal-soft flex items-center justify-center"
            >
              <Inbox size={16} />
              {requests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-status-high text-white text-[9px] font-bold flex items-center justify-center">
                  {requests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="tap w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center"
            >
              <Plus size={18} />
            </button>
          </div>
        }
      />

      {searchOpen && (
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients…"
          className="w-full rounded-2xl bg-cream-soft px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4 animate-fade-slide-up"
        />
      )}

      {total > 0 && !hasTrainingData && (
        <HealthDataPending label="Today's training summary" className="mb-6 animate-fade-slide-up" />
      )}

      {total > 0 && hasTrainingData && (
        // Literal #7D6BB5 (not the theme-reactive primary-dark token, which
        // in dark mode holds a light "readable text on dark ground" value
        // rather than a fill colour) — a fixed hero accent, same approach
        // as StreaksBar's gradient.
        <Card className="mb-6 !text-white animate-fade-slide-up" style={{ background: "#7D6BB5" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/70 mb-1.5">
            Today
          </p>
          <p className="text-[44px] font-extrabold leading-none tracking-[-0.03em] tabular-nums mb-1">
            {trained}{" "}
            <span className="text-base font-semibold text-white/70">of {tracked.length} trained</span>
          </p>
          <p className="text-xs text-white/80 mb-3.5">
            {trained === tracked.length
              ? "Everyone sharing has trained today"
              : missingClient
              ? `${missingClient.prefix ? `${missingClient.prefix} ` : ""}${missingClient.name} hasn't logged a workout today`
              : "No workouts logged yet today"}
          </p>
          {noData > 0 && (
            // Says plainly why the denominator is smaller than the roster,
            // instead of leaving a professional to wonder who is missing.
            <p className="text-[11px] text-white/60 -mt-2.5 mb-3">
              {noData} not shown — not sharing workouts
            </p>
          )}
          <div className="flex h-1.5 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-white" style={{ flex: trained || 0.0001 }} />
            <div className="h-full bg-white/40" style={{ flex: notTrained || 0.0001 }} />
            <div className="h-full bg-white/15" style={{ flex: noData || 0.0001 }} />
          </div>
          <div className="flex items-center gap-4 text-xs text-white/80 pt-3 border-t border-white/15">
            <span>{sharedCount} sharing data</span>
            <span>{programCount} on a program</span>
          </div>
        </Card>
      )}

      <div className="space-y-2.5 mb-6">
        {visibleClients.map((c) => {
          const shared = c.access.healthMetrics;
          return (
            <Card key={c.id} interactive onClick={() => setActiveClientId(c.id)} className="animate-fade-slide-up">
              <div className="flex items-center gap-3 min-w-0 mb-2.5">
                <span className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
                  <PERSON_ICON size={17} className="text-primary-dark" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-charcoal truncate">
                      {c.prefix ? `${c.prefix} ` : ""}
                      {c.name}
                    </p>
                    {shared && <HeartPulse size={12} className="text-primary-dark shrink-0" />}
                    {/* QA 12.0: "it should show a small status badge in the
                        professional dashboard for that specific client.
                        The badge should be informative, not diagnostic.
                        Avoid labels such as 'ED patient,' 'high-risk,' or
                        'non-compliant.'" */}
                    {c.recoverySensitive && (
                      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-primary-dark bg-primary-pale rounded-full px-1.5 py-0.5 shrink-0">
                        <HeartHandshake size={9} /> Recovery-sensitive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-charcoal-faint truncate">
                    Client since {formatDisplayDate(c.joinedAt)}
                    {c.activityLevel ? ` · ${activityLevelLabel[c.activityLevel] ?? c.activityLevel}` : ""}
                    {c.assignedProgramName ? ` · ${c.assignedProgramName}` : ""}
                  </p>
                </div>
                <ChevronRight size={16} className="text-charcoal-faint shrink-0" />
              </div>
              {/* One footer, assembled per datum, rather than three
                  whole-row branches selected by `lastWeightKg`.

                  That gating was the reason real nutrition could not surface
                  here at all: weight comes from `health_metrics`, which has
                  no client-side write path, so the row always took the
                  "nothing available" branch no matter what the food diary
                  held. Forcing the other branch was not an option either —
                  it renders weight, calories and training together, so two
                  absent figures would have been printed beside the one real
                  one. Each datum now appears only when it exists.

                  QA 12.0: "remove from the nutritionist's primary dashboard:
                  Large calorie totals... Weight-loss progress... Red/green
                  compliance colors, punitive missed-log indicators" for a
                  recovery-sensitive client — hence the wordier, numberless
                  line for them, and no weight at all. */}
              {(() => {
                const sharesNothing = !Object.values(c.access).some(Boolean);
                const showWeight = !c.recoverySensitive && c.lastWeightKg !== undefined;
                const badge = workoutBadge(c.access, c.workout, c.recoverySensitive);

                if (sharesNothing) {
                  return (
                    <div className="pt-2.5 border-t border-charcoal/[0.06] text-[11px] text-charcoal-faint">
                      Not sharing any data yet
                    </div>
                  );
                }

                return (
                  <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-charcoal/[0.06]">
                    <div className="flex items-center gap-3.5 text-[11px] text-charcoal-faint min-w-0">
                      <span className="truncate">
                        {c.recoverySensitive
                          ? nutritionLineRecoverySensitive(c.access, c.nutrition)
                          : nutritionLine(c.access, c.nutrition)}
                      </span>
                      {showWeight && (
                        <span className="flex items-center gap-1 shrink-0">
                          {c.lastWeightKg}kg
                          {(c.weightTrend ?? 0) !== 0 && (
                            <span className={clsx("flex items-center", (c.weightTrend ?? 0) <= 0 ? "text-primary-dark" : "text-teal-dark")}>
                              {(c.weightTrend ?? 0) <= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                              {Math.abs(c.weightTrend ?? 0)}kg
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    {badge && (
                      <span
                        className={clsx(
                          "text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 shrink-0",
                          badge.trained ? "bg-primary-pale text-primary-deep-text" : "bg-cream-soft text-charcoal-faint"
                        )}
                      >
                        {badge.label}
                      </span>
                    )}
                  </div>
                );
              })()}
            </Card>
          );
        })}
        {visibleClients.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">
              {professionalClients.length === 0 ? "No clients yet — add your first one." : "No clients match your search."}
            </p>
          </Card>
        )}
      </div>

      <AddClientSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <ClientDetailSheet
        open={!!activeClient}
        onClose={() => setActiveClientId(null)}
        client={activeClient}
        professionalSubtype={user.professionalSubtype}
      />

      <BottomSheet open={inboxOpen} onClose={() => setInboxOpen(false)} title="New client requests">
        <div className="space-y-3 animate-fade-slide-up">
          {requests.length === 0 && !inboxError && (
            <p className="text-sm text-charcoal-faint text-center py-6">
              {/* "after paying" is gone: nothing here involves a payment. A
                  request is someone asking, and this is where you answer. */}
              No new requests. Clients who ask to work with you will show up here.
            </p>
          )}
          {inboxError && (
            <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
              {inboxError}
            </p>
          )}
          {requests.map((req) => (
            <Card key={req.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-charcoal">{req.name}</p>
                {/* "Hired you" was never true — accepting is what starts the
                    relationship, and this row is the moment before that. */}
                <p className="text-xs text-charcoal-faint">
                  Asked to work with you · {formatDisplayDate(req.requestedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void answer(req.id, "reject")}
                  disabled={!!answering}
                  aria-label={`Reject ${req.name}`}
                  className="tap w-9 h-9 rounded-full bg-cream-soft text-charcoal-faint flex items-center justify-center disabled:opacity-40"
                >
                  <X size={15} />
                </button>
                <button
                  onClick={() => void answer(req.id, "accept")}
                  disabled={!!answering}
                  aria-label={`Accept ${req.name}`}
                  className="tap w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40"
                >
                  <Check size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
